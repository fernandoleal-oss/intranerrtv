import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
import { ArrowLeft, Plus, Trash2, FileText } from 'lucide-react'

const steps = ['Identificação', 'Cliente & Produto', 'Detalhes', 'Cotações', 'Revisão', 'Exportar']

interface AudioQuote {
  produtora: string
  descritivo: string
  valor: number
  opcoes: string
  desconto: number
}

interface AudioData {
  produtor?: string
  email?: string
  cliente?: string
  produto?: string
  tipo_audio?: string
  duracao?: string
  meio_uso?: string
  praca?: string
  periodo?: string
  quotes_audio: AudioQuote[]
  audio: { subtotal: number }
  total: number
}

export default function NovoAudio() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  
  // Check if we're editing an existing budget
  const editData = location.state?.editData as AudioData | undefined
  const existingBudgetId = location.state?.budgetId as string | undefined
  const currentVersao = location.state?.versao as number | undefined
  
  const [step, setStep] = useState(existingBudgetId ? 2 : 1)
  const [budgetId, setBudgetId] = useState<string | undefined>(existingBudgetId)
  const [data, setData] = useState<AudioData>({
    quotes_audio: [],
    audio: { subtotal: 0 },
    total: 0
  })

  // Load edit data on mount
  useEffect(() => {
    if (editData) {
      const audioSubtotal = (editData.quotes_audio || []).reduce((sum, q) => sum + (q.valor - q.desconto), 0)
      setData({
        ...editData,
        quotes_audio: editData.quotes_audio || [],
        audio: { subtotal: audioSubtotal },
        total: audioSubtotal
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

  const updateData = useCallback((updates: Partial<AudioData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates }
      const audioSubtotal = (newData.quotes_audio || []).reduce((sum, q) => sum + (q.valor - q.desconto), 0)
      return {
        ...newData,
        audio: { subtotal: audioSubtotal },
        total: audioSubtotal
      }
    })
  }, [])

  const handleCreateBudget = async () => {
    // If we're editing, just move to next step
    if (budgetId) {
      setStep(2)
      return
    }
    
    try {
      const { data: budget, error } = await supabase.rpc('create_budget_full_rpc', { 
        p_type_text: 'audio',
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
        type: 'audio'
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
          p_type_text: 'audio',
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

  const addAudioQuote = () => {
    const newQuote: AudioQuote = {
      produtora: `Produtora ${data.quotes_audio.length + 1}`,
      descritivo: '',
      valor: 0,
      opcoes: '',
      desconto: 0
    }
    updateData({ quotes_audio: [...data.quotes_audio, newQuote] })
  }

  const updateAudioQuote = useCallback((index: number, updates: Partial<AudioQuote>) => {
    setData(prev => {
      const quotes = [...prev.quotes_audio]
      quotes[index] = { ...quotes[index], ...updates }
      const audioSubtotal = quotes.reduce((sum, q) => sum + (q.valor - q.desconto), 0)
      return {
        ...prev,
        quotes_audio: quotes,
        audio: { subtotal: audioSubtotal },
        total: audioSubtotal
      }
    })
  }, [])

  const removeAudioQuote = (index: number) => {
    const quotes = data.quotes_audio.filter((_, i) => i !== index)
    updateData({ quotes_audio: quotes })
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
                  key="audio-produtor-input"
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
                  key="audio-email-input"
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
                <Label htmlFor="cliente" className="dark-label">Cliente</Label>
                <Input
                  id="cliente"
                  key="audio-cliente-input"
                  value={data.cliente || ''}
                  onChange={(e) => updateData({ cliente: e.target.value })}
                  className="dark-input"
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <Label htmlFor="produto" className="dark-label">Produto</Label>
                <Input
                  id="produto"
                  key="audio-produto-input"
                  value={data.produto || ''}
                  onChange={(e) => updateData({ produto: e.target.value })}
                  className="dark-input"
                  placeholder="Nome do produto"
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
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo_audio" className="dark-label">Tipo de Áudio</Label>
                <Select value={data.tipo_audio} onValueChange={(value) => updateData({ tipo_audio: value })}>
                  <SelectTrigger className="dark-input">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="locucao">Locução</SelectItem>
                    <SelectItem value="jingle">Jingle</SelectItem>
                    <SelectItem value="trilha">Trilha Sonora</SelectItem>
                    <SelectItem value="sound_design">Sound Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duracao" className="dark-label">Duração</Label>
                <Select value={data.duracao} onValueChange={(value) => updateData({ duracao: value })}>
                  <SelectTrigger className="dark-input">
                    <SelectValue placeholder="Selecione a duração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15s">15 segundos</SelectItem>
                    <SelectItem value="30s">30 segundos</SelectItem>
                    <SelectItem value="45s">45 segundos</SelectItem>
                    <SelectItem value="60s">60 segundos</SelectItem>
                    <SelectItem value="customizada">Customizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="meio_uso" className="dark-label">Meio de Uso</Label>
                <Select value={data.meio_uso} onValueChange={(value) => updateData({ meio_uso: value })}>
                  <SelectTrigger className="dark-input">
                    <SelectValue placeholder="Selecione o meio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radio">Rádio</SelectItem>
                    <SelectItem value="tv">TV</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="todos">Todos os meios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="praca" className="dark-label">Praça</Label>
                <Select value={data.praca} onValueChange={(value) => updateData({ praca: value })}>
                  <SelectTrigger className="dark-input">
                    <SelectValue placeholder="Selecione a praça" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="sao_paulo">São Paulo</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <h3 className="text-lg font-semibold text-white">Cotações de Áudio</h3>
                <Button onClick={addAudioQuote} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produtora
                </Button>
              </div>
              
              {data.quotes_audio.map((quote, index) => (
                <div key={index} className="p-4 border border-white/20 rounded-lg bg-white/5 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                     <div>
                        <Label className="dark-label">Produtora</Label>
                         <Input
                           key={`audio-produtora-${index}`}
                           value={quote.produtora}
                           onChange={(e) => updateAudioQuote(index, { produtora: e.target.value })}
                           className="dark-input"
                           placeholder="Digite o nome da produtora"
                         />
                     </div>
                     <div>
                        <Label className="dark-label">Valor (R$)</Label>
                         <Input
                           key={`audio-valor-${index}`}
                           type="number"
                           min="0"
                           step="0.01"
                           value={quote.valor}
                           onChange={(e) => updateAudioQuote(index, { valor: Number(e.target.value) })}
                           className="dark-input"
                           placeholder="0,00"
                         />
                     </div>
                  </div>
                   <div>
                      <Label className="dark-label">Descritivo do Serviço</Label>
                       <Input
                         key={`audio-descritivo-${index}`}
                         value={quote.descritivo}
                         onChange={(e) => updateAudioQuote(index, { descritivo: e.target.value })}
                         className="dark-input"
                         placeholder="Ex.: Locução masculina, trilha sonora original..."
                       />
                   </div>
                   <div>
                      <Label className="dark-label">Opções/Observações</Label>
                       <Input
                         key={`audio-opcoes-${index}`}
                         value={quote.opcoes}
                         onChange={(e) => updateAudioQuote(index, { opcoes: e.target.value })}
                         className="dark-input"
                         placeholder="Ex.: 3 opções de locutores, revisões incluídas..."
                       />
                   </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => removeAudioQuote(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
                  <span className="text-white/70">Tipo de áudio:</span>
                  <span className="font-medium text-white">{data.tipo_audio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Cotações:</span>
                  <span className="font-medium text-white">{data.quotes_audio.length}</span>
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
              <h3 className="text-lg font-semibold text-white">
                {isEditing ? 'Orçamento de Áudio Atualizado!' : 'Orçamento de Áudio Finalizado!'}
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
                {isEditing ? `Salvar v${(currentVersao || 0) + 1}` : 'Salvar e Gerar PDF'}
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                {isEditing ? 'Editar Orçamento - Áudio' : 'Produção de Áudio'}
              </h1>
              {isEditing && currentVersao && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-white/20 text-white">
                  v{currentVersao}
                </span>
              )}
            </div>
            <p className="text-white/70">
              {isEditing ? `Modifique os dados e salve como versão ${(currentVersao || 0) + 1}` : 'Criar orçamento de áudio com opções da produtora'}
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
            audio: { subtotal: data.total }, 
            total: data.total 
          }} />
        </div>
      </div>
    </div>
  )
}