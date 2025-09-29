import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Stepper } from '@/components/Stepper'
import { PreviewSidebar } from '@/components/PreviewSidebar'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
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

  // Auto-save
  useEffect(() => {
    if (!budgetId) return
    const timer = setTimeout(() => {
      supabase.from('versions').update({ payload: data }).eq('budget_id', budgetId).eq('versao', 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [data, budgetId])

  const updateData = (updates: Partial<FilmeData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates }
      // Recalculate totals
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
  }

  const handleCreateBudget = async () => {
   // try {
    //  const { data: budget, error } = await supabase.rpc('create_budget_with_version', { p_tipo: 'filme' })
    //  if (error) throw error
     // setBudgetId(budget.id)
      setStep(2)
     // toast({ title: 'Orçamento criado', description: `ID: ${budget.display_id}` })
    //} catch (error) {
     // toast({ title: 'Erro', description: 'Não foi possível criar o orçamento', variant: 'destructive' })
    //}
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

  const updateFilmeQuote = (index: number, updates: Partial<typeof data.quotes_film[0]>) => {
    const quotes = [...(data.quotes_film || [])]
    quotes[index] = { ...quotes[index], ...updates }
    updateData({ quotes_film: quotes })
  }

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
              <div>
                <Label htmlFor="produtor">Nome do Produtor</Label>
                <Input
                  id="produtor"
                  value={data.produtor || ''}
                  onChange={(e) => updateData({ produtor: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email || ''}
                  onChange={(e) => updateData({ email: e.target.value })}
                  className="mt-1"
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
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="job">Job</Label>
                <Input
                  id="job"
                  value={data.job || ''}
                  onChange={(e) => updateData({ job: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="midias">Mídias</Label>
                <Select value={data.midias} onValueChange={(value) => updateData({ midias: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione as mídias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as mídias</SelectItem>
                    <SelectItem value="tv_aberta">TV aberta</SelectItem>
                    <SelectItem value="tv_fechada">TV fechada</SelectItem>
                    <SelectItem value="sociais">Redes sociais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="territorio">Território</Label>
                <Select value={data.territorio} onValueChange={(value) => updateData({ territorio: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o território" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="sao_paulo">São Paulo</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="periodo">Período</Label>
                <Select value={data.periodo} onValueChange={(value) => updateData({ periodo: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12_meses">12 meses</SelectItem>
                    <SelectItem value="6_meses">6 meses</SelectItem>
                    <SelectItem value="3_meses">3 meses</SelectItem>
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
                      <Label>Produtora</Label>
                      <Input
                        value={quote.produtora}
                        onChange={(e) => updateFilmeQuote(index, { produtora: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Escopo</Label>
                      <Input
                        value={quote.escopo}
                        onChange={(e) => updateFilmeQuote(index, { escopo: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={quote.valor}
                        onChange={(e) => updateFilmeQuote(index, { valor: Number(e.target.value) })}
                        className="mt-1"
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
                onClick={() => navigate(`/budget/${budgetId}/pdf`)} 
                size="lg" 
                className="w-full"
              >
                Visualizar PDF
              </Button>
              <Button 
                onClick={() => navigate(`/budget/${budgetId}`)} 
                variant="outline"
                size="lg" 
                className="w-full"
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
          <PreviewSidebar data={data} />
        </div>
      </div>
    </div>
  )
}