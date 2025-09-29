import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Stepper } from '@/components/Stepper'
import { PreviewSidebar } from '@/components/PreviewSidebar'
import { FormInput } from '@/components/FormInput'
import { FormSelect } from '@/components/FormSelect'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAutosave } from '@/hooks/useAutosave'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

const steps = ['Identificação', 'Cliente & Produto', 'Detalhes', 'Cotações', 'Revisão', 'Exportar']

interface FilmeData {
  produtor?: string
  email?: string
  cliente?: string
  produto?: string
  job?: string
  midias?: string
  territorio?: string
  periodo?: string
  entregaveis?: string[]
  formatos?: string[]
  quotes_film?: Array<{
    produtora: string
    escopo: string
    valor: number
    diretor: string
    tratamento: string
    desconto: number
  }>
  quotes_audio?: Array<{
    produtora: string
    descritivo: string
    valor: number
    desconto: number
  }>
  honorario_perc?: number
  filme?: { subtotal: number }
  audio?: { subtotal: number }
  total?: number
}

export default function NovoFilme() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [budgetId, setBudgetId] = useState<string>()
  const [data, setData] = useState<FilmeData>({
    quotes_film: [],
    quotes_audio: [],
    entregaveis: [],
    formatos: [],
    filme: { subtotal: 0 },
    audio: { subtotal: 0 },
    total: 0
  })

  // Auto-save with debounce hook
  useAutosave([data], () => {
    if (budgetId && Object.keys(data).length > 0) {
      supabase.from('versions').update({ 
        payload: data as any 
      }).eq('budget_id', budgetId).eq('versao', 1)
    }
  })

  const updateData = useCallback((updates: Partial<FilmeData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates }
      // Recalculate totals only when needed
      const filmeSubtotal = (newData.quotes_film || []).reduce((sum, q) => sum + (q.valor - q.desconto), 0)
      const audioSubtotal = (newData.quotes_audio || []).reduce((sum, q) => sum + (q.valor - q.desconto), 0)
      const honorario = filmeSubtotal * ((newData.honorario_perc || 0) / 100)
      const total = filmeSubtotal + audioSubtotal + honorario
      
      return {
        ...newData,
        filme: { subtotal: filmeSubtotal },
        audio: { subtotal: audioSubtotal },
        total
      }
    })
  }, [])

  const handleCreateBudget = async () => {
    try {
      const { data: budget, error } = await supabase.rpc('create_simple_budget', { p_type: 'filme' }) as { data: { id: string; display_id: string; version_id: string } | null; error: any }
      if (error) throw error
      setBudgetId(budget.id)
      setStep(2)
      toast({ title: 'Orçamento criado', description: `ID: ${budget.display_id}` })
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar o orçamento', variant: 'destructive' })
    }
  }

  const addFilmeQuote = () => {
    const newQuote = {
      produtora: `Produtora ${(data.quotes_film?.length || 0) + 1}`,
      escopo: '',
      valor: 0,
      diretor: '',
      tratamento: '',
      desconto: 0
    }
    updateData({ quotes_film: [...(data.quotes_film || []), newQuote] })
  }

  const updateFilmeQuote = useCallback((index: number, updates: Partial<typeof data.quotes_film[0]>) => {
    setData(prev => {
      const quotes = [...(prev.quotes_film || [])]
      quotes[index] = { ...quotes[index], ...updates }
      
      // Recalculate totals
      const filmeSubtotal = quotes.reduce((sum, q) => sum + (q.valor - q.desconto), 0)
      const honorario = filmeSubtotal * ((prev.honorario_perc || 0) / 100)
      const audioSubtotal = (prev.quotes_audio || []).reduce((sum, q) => sum + (q.valor - q.desconto), 0)
      const total = filmeSubtotal + audioSubtotal + honorario
      
      return {
        ...prev,
        quotes_film: quotes,
        filme: { subtotal: filmeSubtotal },
        total
      }
    })
  }, [])

  const removeFilmeQuote = (index: number) => {
    const quotes = data.quotes_film?.filter((_, i) => i !== index) || []
    updateData({ quotes_film: quotes })
  }

  const StepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="space-y-4">
              <FormInput
                id="produtor"
                label="Nome do Produtor"
                value={data.produtor || ''}
                onChange={(value) => updateData({ produtor: value })}
                placeholder="Nome completo do produtor"
                required
              />
              
              <FormInput
                id="email"
                label="E-mail"
                type="email"
                value={data.email || ''}
                onChange={(value) => updateData({ email: value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <Button onClick={handleCreateBudget} size="lg" className="w-full">
              Continuar
            </Button>
          </motion.div>
        )

      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Cliente & Produto</h2>
              <p className="text-muted-foreground">Identifique o cliente e produto para este orçamento</p>
            </div>
            
            <div className="space-y-6">
              <FormInput
                id="cliente"
                label="Nome do Cliente"
                value={data.cliente || ''}
                onChange={(value) => updateData({ cliente: value })}
                placeholder="Razão social ou nome fantasia"
                required
              />
              
              <FormInput
                id="produto"
                label="Produto/Serviço"
                value={data.produto || ''}
                onChange={(value) => updateData({ produto: value })}
                placeholder="Nome do produto ou serviço"
                required
              />
            </div>
            
            <Button 
              onClick={() => setStep(3)} 
              size="lg" 
              className="w-full btn-gradient text-lg py-6"
            >
              Salvar e Continuar
            </Button>
          </motion.div>
        )

      case 3:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <FormInput
                id="job"
                label="Job"
                value={data.job || ''}
                onChange={(value) => updateData({ job: value })}
                placeholder="Descrição do job"
              />
              
              <FormSelect
                id="midias"
                label="Mídias"
                value={data.midias || ''}
                onChange={(value) => updateData({ midias: value })}
                options={[
                  { value: 'todas', label: 'Todas as mídias' },
                  { value: 'tv_aberta', label: 'TV aberta' },
                  { value: 'tv_fechada', label: 'TV fechada' },
                  { value: 'sociais', label: 'Redes sociais' }
                ]}
                placeholder="Selecione as mídias"
              />
              
              <FormSelect
                id="territorio"
                label="Território"
                value={data.territorio || ''}
                onChange={(value) => updateData({ territorio: value })}
                options={[
                  { value: 'nacional', label: 'Nacional' },
                  { value: 'sao_paulo', label: 'São Paulo' },
                  { value: 'regional', label: 'Regional' }
                ]}
                placeholder="Selecione o território"
              />
              
              <FormSelect
                id="periodo"
                label="Período"
                value={data.periodo || ''}
                onChange={(value) => updateData({ periodo: value })}
                options={[
                  { value: '12_meses', label: '12 meses' },
                  { value: '6_meses', label: '6 meses' },
                  { value: '3_meses', label: '3 meses' }
                ]}
                placeholder="Selecione o período"
              />
            </div>
            <Button onClick={() => setStep(4)} size="lg" className="w-full">
              Salvar e Continuar
            </Button>
          </motion.div>
        )

      case 4:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Cotações de Filme</h3>
                <Button onClick={addFilmeQuote} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produtora
                </Button>
              </div>
              
              {data.quotes_film?.map((quote, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="grid md:grid-cols-3 gap-3">
                     <div>
                        <Label className="dark-label">Produtora</Label>
                         <Input
                           key={`filme-produtora-${index}`}
                           value={quote.produtora}
                           onChange={(e) => updateFilmeQuote(index, { produtora: e.target.value })}
                           className="dark-input"
                           placeholder="Digite o nome da produtora"
                         />
                     </div>
                     <div>
                        <Label className="dark-label">Escopo</Label>
                         <Input
                           key={`filme-escopo-${index}`}
                           value={quote.escopo}
                           onChange={(e) => updateFilmeQuote(index, { escopo: e.target.value })}
                           className="dark-input"
                           placeholder="Ex: Filme 30s com elenco"
                         />
                     </div>
                     <div>
                        <Label className="dark-label">Valor (R$)</Label>
                         <Input
                           key={`filme-valor-${index}`}
                           type="number"
                           min="0"
                           step="0.01"
                           value={quote.valor}
                           onChange={(e) => updateFilmeQuote(index, { valor: Number(e.target.value) })}
                           className="dark-input"
                           placeholder="0,00"
                         />
                     </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => removeFilmeQuote(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Button onClick={() => setStep(5)} size="lg" className="w-full">
              Revisar Orçamento
            </Button>
          </motion.div>
        )

      case 5:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-6 border rounded-lg space-y-4">
              <h3 className="text-lg font-semibold">Resumo do Orçamento</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-medium">{data.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span>Produto:</span>
                  <span className="font-medium">{data.produto}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cotações de filme:</span>
                  <span className="font-medium">{data.quotes_film?.length || 0}</span>
                </div>
              </div>
            </div>
            
            <Button onClick={() => setStep(6)} size="lg" className="w-full">
              Ir para Exportar
            </Button>
          </motion.div>
        )

      case 6:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Orçamento Finalizado!</h3>
              <p className="text-muted-foreground">Escolha uma das opções abaixo:</p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  if (budgetId) {
                    navigate(`/budget/${budgetId}/pdf`)
                  }
                }} 
                size="lg" 
                className="w-full btn-gradient"
                disabled={!budgetId}
              >
                Visualizar PDF
              </Button>
              <Button 
                onClick={() => {
                  if (budgetId) {
                    navigate(`/budget/${budgetId}`)
                  }
                }} 
                variant="outline"
                size="lg" 
                className="w-full nav-button"
                disabled={!budgetId}
              >
                Visualizar Orçamento
              </Button>
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
            <h1 className="text-2xl font-bold text-white">Produção de Filme</h1>
            <p className="text-white/70">Criar orçamento de filme com cotações e comparador</p>
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
            filme: data.filme, 
            audio: data.audio, 
            total: data.total 
          }} />
        </div>
      </div>
    </div>
  )
}