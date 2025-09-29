import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Stepper } from '@/components/Stepper'
import { PreviewSidebar } from '@/components/PreviewSidebar'
import { supabase } from '@/integrations/supabase/client'
import { parseImageLink, ParsedImage } from '@/lib/parseImageLink'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAutosave } from '@/hooks/useAutosave'
import { ArrowLeft, Plus, Trash2, Link, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const steps = ['Identificação', 'Banco', 'Itens', 'Revisão', 'Exportar']

interface ImageItem {
  link: string
  provider: string
  image_id: string
  resumo: string
  uso: string
  valor: number
  thumb?: string
}

interface ImagemData {
  produtor?: string
  email?: string
  bank?: 'getty' | 'shutterstock' | 'personalizado' | ''
  items: ImageItem[]
  total: number
}

export default function NovaImagem() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [budgetId, setBudgetId] = useState<string>()
  const [linkInput, setLinkInput] = useState('')
  const [isParsingLink, setIsParsingLink] = useState(false)
  const [data, setData] = useState<ImagemData>({
    items: [],
    total: 0
  })

  // Auto-save with debounce hook (increased delay to prevent frequent calls)
  useAutosave([data], () => {
    if (budgetId) {
      supabase.from('versions').update({ payload: data as any }).eq('budget_id', budgetId).eq('versao', 1)
    }
  }, 5000)

  const updateData = (updates: Partial<ImagemData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates }
      const total = newData.items.reduce((sum, item) => sum + (item.valor || 0), 0)
      return { ...newData, total }
    })
  }

  const handleCreateBudget = async () => {
    try {
      const { data: budget, error } = await supabase.rpc('create_simple_budget', { p_type: 'imagem' }) as { data: { id: string; display_id: string; version_id: string } | null; error: any }
      if (error) throw error
      setBudgetId(budget.id)
      setStep(2)
      toast({ title: 'Orçamento criado', description: `ID: ${budget.display_id}` })
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar o orçamento', variant: 'destructive' })
    }
  }

  const handleAddByLink = async () => {
    if (!linkInput.trim()) return
    
    setIsParsingLink(true)
    try {
      const parsed = await parseImageLink(linkInput)
      
      if (parsed.requiresAssetLink) {
        toast({
          title: 'Link de coleção detectado',
          description: 'Este link parece ser de uma coleção. Abra a imagem específica e copie o link do asset.',
          variant: 'destructive'
        })
        setIsParsingLink(false)
        return
      }

      const newItem: ImageItem = {
        link: linkInput,
        provider: parsed.provider,
        image_id: parsed.id || '',
        resumo: parsed.title || parsed.description || '',
        uso: '',
        valor: 0,
        thumb: parsed.thumb
      }

      updateData({ items: [...data.items, newItem] })
      setLinkInput('')
      toast({ title: 'Imagem adicionada', description: 'Preencha os detalhes e o valor' })
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível analisar o link', variant: 'destructive' })
    }
    setIsParsingLink(false)
  }

  const updateItem = (index: number, updates: Partial<ImageItem>) => {
    const items = [...data.items]
    items[index] = { ...items[index], ...updates }
    updateData({ items })
  }

  const removeItem = (index: number) => {
    const items = data.items.filter((_, i) => i !== index)
    updateData({ items })
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
              <h3 className="text-lg font-semibold text-white">Selecione o banco de imagens</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['shutterstock', 'getty', 'personalizado'] as const).map((bank) => (
                  <Button
                    key={bank}
                    onClick={() => updateData({ bank })}
                    variant={data.bank === bank ? 'default' : 'outline'}
                    className="h-20 flex flex-col gap-2"
                  >
                    <span className="font-semibold">
                      {bank === 'shutterstock' && 'Shutterstock'}
                      {bank === 'getty' && 'Getty Images'}
                      {bank === 'personalizado' && 'Personalizado'}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep(3)} size="lg" className="w-full" disabled={!data.bank}>
              Salvar e Continuar
            </Button>
          </motion.div>
        )

      case 3:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Add by Link */}
            <div className="p-4 border border-white/20 rounded-lg bg-white/5">
              <h3 className="text-lg font-semibold text-white mb-4">Adicionar por link</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Cole o link da imagem (ex.: https://www.shutterstock.com/...)"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddByLink}
                  disabled={!linkInput.trim() || isParsingLink}
                >
                  {isParsingLink ? (
                    <>Analisando...</>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </>
                  )}
                </Button>
              </div>
              <Alert className="mt-3 border-blue-500/20 bg-blue-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm text-blue-200">
                  Dica: Links de <strong>coleção</strong> não funcionam. Abra a imagem específica e copie o link do <strong>asset</strong>.
                </AlertDescription>
              </Alert>
            </div>

            {/* Items List */}
            <div className="space-y-4">
              {data.items.map((item, index) => (
                <div key={index} className="p-4 border border-white/20 rounded-lg bg-white/5">
                  <div className="flex gap-4">
                    {item.thumb && (
                      <img 
                        src={item.thumb} 
                        alt="Preview"
                        className="w-16 h-16 rounded-lg object-cover bg-white/10"
                      />
                    )}
                    <div className="flex-1 grid md:grid-cols-2 gap-3">
                       <div>
                          <Label className="dark-label">ID da Imagem</Label>
                           <Input
                             key={`imagem-id-${index}`}
                             value={item.image_id}
                             onChange={(e) => updateItem(index, { image_id: e.target.value })}
                             className="dark-input"
                             placeholder="Ex: 123456789"
                           />
                       </div>
                       <div>
                          <Label className="dark-label">Resumo/Descrição</Label>
                           <Input
                             key={`imagem-resumo-${index}`}
                             value={item.resumo}
                             onChange={(e) => updateItem(index, { resumo: e.target.value })}
                             className="dark-input"
                             placeholder="Descreva a imagem"
                           />
                       </div>
                       <div>
                          <Label className="dark-label">Uso (mídias/território/período)</Label>
                           <Input
                             key={`imagem-uso-${index}`}
                             value={item.uso}
                             onChange={(e) => updateItem(index, { uso: e.target.value })}
                             className="dark-input"
                             placeholder="Ex.: TV Nacional 12 meses"
                           />
                       </div>
                      <div>
                         <Label className="dark-label">Valor (R$)</Label>
                         <div className="flex gap-2">
                             <Input
                               key={`imagem-valor-${index}`}
                               type="number"
                               min="0"
                               step="0.01"
                               value={item.valor}
                               onChange={(e) => updateItem(index, { valor: Number(e.target.value) })}
                               className="dark-input flex-1"
                               placeholder="0,00"
                             />
                          <Button
                            onClick={() => removeItem(index)}
                            variant="ghost"
                            size="sm"
                            className="mt-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-white/60 flex items-center gap-2">
                    <Link className="h-3 w-3" />
                    <span className="truncate">{item.link}</span>
                  </div>
                </div>
              ))}
            </div>

            {data.items.length === 0 && (
              <div className="text-center py-8 text-white/60">
                <p>Nenhuma imagem adicionada ainda.</p>
                <p className="text-sm">Use o campo acima para adicionar imagens por link.</p>
              </div>
            )}

            <Button 
              onClick={() => setStep(4)} 
              size="lg" 
              className="w-full"
              disabled={data.items.length === 0}
            >
              Revisar ({data.items.length} {data.items.length === 1 ? 'item' : 'itens'})
            </Button>
          </motion.div>
        )

      case 4:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-6 border border-white/20 rounded-lg bg-white/5">
              <h3 className="text-lg font-semibold text-white mb-4">Resumo do Orçamento</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/70">Banco:</span>
                  <span className="font-medium text-white capitalize">{data.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Total de itens:</span>
                  <span className="font-medium text-white">{data.items.length}</span>
                </div>
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
              <h3 className="text-lg font-semibold text-white">Orçamento de Imagens Finalizado!</h3>
              <p className="text-white/70">Escolha uma das opções abaixo:</p>
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
            <h1 className="text-2xl font-bold text-white">Compra de Imagem</h1>
            <p className="text-white/70">Cadastrar imagens Getty/Shutterstock/Personalizado</p>
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
          <PreviewSidebar data={{ imagens: { qtd: data.items.length, total: data.total }, total: data.total }} />
        </div>
      </div>
    </div>
  )
}