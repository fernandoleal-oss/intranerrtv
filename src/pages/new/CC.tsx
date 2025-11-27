import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Stepper } from '@/components/Stepper'
import { PreviewSidebar } from '@/components/PreviewSidebar'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAutosave } from '@/hooks/useAutosave'
import { ArrowLeft, Plus, Minus, FileText } from 'lucide-react'

const steps = ['Identificação', 'Cliente & Produto', 'Detalhes', 'Revisão', 'Exportar']

interface CCData {
  produtor?: string
  email?: string
  cliente?: string
  produto?: string
  campanha?: string
  qtd_versoes: number
  valor_unitario: number
  cc: { qtd: number, total: number }
  total: number
}

export default function NovoCC() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  
  // Check if we're editing an existing budget
  const editData = location.state?.editData as CCData | undefined
  const existingBudgetId = location.state?.budgetId as string | undefined
  
  const [step, setStep] = useState(existingBudgetId ? 2 : 1)
  const [budgetId, setBudgetId] = useState<string | undefined>(existingBudgetId)
  const [data, setData] = useState<CCData>({
    qtd_versoes: 1,
    valor_unitario: 900,
    cc: { qtd: 1, total: 900 },
    total: 900
  })

  // Load edit data on mount
  useEffect(() => {
    if (editData) {
      const qtdVersoes = editData.qtd_versoes || editData.cc?.qtd || 1
      const valorUnitario = editData.valor_unitario || 900
      const total = qtdVersoes * valorUnitario
      setData({
        ...editData,
        qtd_versoes: qtdVersoes,
        valor_unitario: valorUnitario,
        cc: { qtd: qtdVersoes, total },
        total
      })
    }
  }, [editData])

  // Auto-save with debounce hook
  useAutosave([data], () => {
    if (budgetId && Object.keys(data).length > 0) {
      supabase.from('versions').update({ 
        payload: data as any 
      }).eq('budget_id', budgetId).order('versao', { ascending: false }).limit(1)
    }
  })

  const updateData = (updates: Partial<CCData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates }
      const total = newData.qtd_versoes * newData.valor_unitario
      return {
        ...newData,
        cc: { qtd: newData.qtd_versoes, total },
        total
      }
    })
  }

  const handleCreateBudget = async () => {
    // If we're editing, just move to next step
    if (budgetId) {
      setStep(2)
      return
    }
    
    try {
      const { data: budget, error } = await supabase.rpc('create_budget_full_rpc', { 
        p_type_text: 'cc',
        p_payload: {},
        p_total: 0
      }) as { data: { id: string; display_id: string; version_id: string } | null; error: any }
      
      if (error) throw error
      setBudgetId(budget.id)
      setStep(2)
      toast({ title: 'Orçamento criado', description: `ID: ${budget.display_id}` })
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar o orçamento', variant: 'destructive' })
    }
  }

  const handleSaveAndGeneratePDF = async () => {
    if (!data.cliente?.trim() || !data.produto?.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha cliente e produto.",
        variant: "destructive",
      })
      return
    }

    try {
      const payload = JSON.parse(JSON.stringify({
        ...data,
        type: 'cc'
      }))

      if (budgetId) {
        // Update existing budget
        const { data: versions } = await supabase
          .from('versions')
          .select('versao')
          .eq('budget_id', budgetId)
          .order('versao', { ascending: false })
          .limit(1)

        const nextVersao = versions && versions.length > 0 ? versions[0].versao + 1 : 1

        const { error } = await supabase.from('versions').insert({
          budget_id: budgetId,
          versao: nextVersao,
          payload,
          total_geral: data.total
        })

        if (error) throw error
        navigate(`/budget/${budgetId}/pdf`)
      } else {
        // Create new budget
        const { data: result, error } = await supabase.rpc('create_budget_full_rpc', {
          p_type_text: 'cc',
          p_payload: payload,
          p_total: data.total
        })

        if (error) throw error
        if (!result || result.length === 0) throw new Error('Falha ao criar orçamento')
        
        navigate(`/budget/${result[0].id}/pdf`)
      }

      toast({ title: "Sucesso!", description: "Orçamento salvo com sucesso." })
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o orçamento.",
        variant: "destructive",
      })
    }
  }

  const adjustQuantity = (delta: number) => {
    const newQtd = Math.max(1, data.qtd_versoes + delta)
    updateData({ qtd_versoes: newQtd })
  }

  const isEditing = !!existingBudgetId

  const StepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="produtor" className="dark-label">Nome do Produtor</Label>
                <Input
                  id="produtor"
                  key="cc-produtor-input"
                  value={data.produtor || ''}
                  onChange={(e) => updateData({ produtor: e.target.value })}
                  className="dark-input"
                  placeholder="Nome completo do produtor"
                />
              </div>
              <div>
                <Label htmlFor="email" className="dark-label">E-mail</Label>
                <Input
                  id="email"
                  key="cc-email-input"
                  type="email"
                  value={data.email || ''}
                  onChange={(e) => updateData({ email: e.target.value })}
                  className="dark-input"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            <Button onClick={handleCreateBudget} size="lg" className="w-full">
              Continuar
            </Button>
          </motion.div>
        )

      case 2:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={data.cliente || ''}
                  onChange={(e) => updateData({ cliente: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="produto">Produto</Label>
                <Input
                  id="produto"
                  value={data.produto || ''}
                  onChange={(e) => updateData({ produto: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={() => setStep(3)} size="lg" className="w-full">
              Salvar e Continuar
            </Button>
          </motion.div>
        )

      case 3:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="space-y-6">
              <div>
                <Label htmlFor="campanha">Campanha</Label>
                <Input
                  id="campanha"
                  value={data.campanha || ''}
                  onChange={(e) => updateData({ campanha: e.target.value })}
                  className="mt-1"
                  placeholder="Nome da campanha ou peça"
                />
              </div>

              <div className="space-y-4">
                <Label>Quantidade de Versões de Closed Caption</Label>
                <div className="p-6 border border-white/20 rounded-lg bg-white/5">
                  <div className="flex items-center justify-center space-x-8">
                    <Button
                      onClick={() => adjustQuantity(-1)}
                      variant="outline"
                      size="icon"
                      disabled={data.qtd_versoes <= 1}
                      className="h-12 w-12 rounded-full"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white mb-2">
                        {data.qtd_versoes}
                      </div>
                      <div className="text-sm text-white/70">
                        {data.qtd_versoes === 1 ? 'versão' : 'versões'}
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => adjustQuantity(1)}
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-6 text-center space-y-2">
                    <div className="text-white/70">
                      Valor por versão: <span className="font-semibold text-white">R$ 900,00</span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                      Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.total)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-white/60 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p><strong>Sobre Closed Caption:</strong></p>
                <p>Cada versão inclui a criação de legendas sincronizadas para pessoas com deficiência auditiva, seguindo as diretrizes de acessibilidade.</p>
              </div>
            </div>
            
            <Button onClick={() => setStep(4)} size="lg" className="w-full">
              Revisar Orçamento
            </Button>
          </motion.div>
        )

      case 4:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-6 border border-white/20 rounded-lg bg-white/5 space-y-4">
              <h3 className="text-lg font-semibold text-white">Resumo do Orçamento</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/70">Cliente:</span>
                  <span className="font-medium text-white">{data.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Produto:</span>
                  <span className="font-medium text-white">{data.produto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Campanha:</span>
                  <span className="font-medium text-white">{data.campanha}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Versões de CC:</span>
                  <span className="font-medium text-white">{data.qtd_versoes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Valor unitário:</span>
                  <span className="font-medium text-white">R$ 900,00</span>
                </div>
                <hr className="border-white/20" />
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-white/70">Total:</span>
                  <span className="text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.total)}
                  </span>
                </div>
              </div>
            </div>
            
            <Button onClick={() => setStep(5)} size="lg" className="w-full">
              Ir para Exportar
            </Button>
          </motion.div>
        )

      case 5:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-white">
                {isEditing ? 'Orçamento de Closed Caption Atualizado!' : 'Orçamento de Closed Caption Finalizado!'}
              </h3>
              <p className="text-white/70">Escolha uma das opções abaixo:</p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleSaveAndGeneratePDF} 
                size="lg" 
                className="w-full gap-2"
              >
                <FileText className="h-4 w-4" />
                Salvar e Gerar PDF
              </Button>
              {budgetId && (
                <Button 
                  onClick={() => navigate(`/budget/${budgetId}`)} 
                  variant="outline"
                  size="lg" 
                  className="w-full"
                >
                  Visualizar Orçamento
                </Button>
              )}
              <Button 
                onClick={() => navigate('/')} 
                variant="ghost"
                size="lg" 
                className="w-full"
              >
                Voltar ao Início
              </Button>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step > 1 ? 'Voltar' : 'Início'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? 'Editar Orçamento - Closed Caption' : 'Closed Caption'}
            </h1>
            <p className="text-white/70">
              {isEditing ? 'Modifique os dados e salve as alterações' : 'Calcular versões de CC (R$ 900/versão)'}
            </p>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <Stepper step={step} steps={steps} />
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <StepContent />
            </div>
          </div>

          {/* Preview Sidebar */}
          <PreviewSidebar data={{ 
            cc: { qtd: data.qtd_versoes || 0, total: data.total || 0 }, 
            total: data.total || 0 
          }} />
        </div>
      </div>
    </div>
  )
}