import React, { useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { useAutosaveWithStatus } from '@/hooks/useAutosaveWithStatus'
import { AutosaveIndicator } from '@/components/AutosaveIndicator'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

/** =========================
 *  Config / Helpers
 *  ========================= */
const steps = ['Identificação', 'Cliente & Produto', 'Detalhes', 'Cotações', 'Revisão', 'Exportar']

const MEDIA_OPTIONS = [
  { value: 'todas', label: 'Todas as mídias' },
  { value: 'tv_aberta', label: 'TV aberta' },
  { value: 'tv_fechada', label: 'TV fechada' },
  { value: 'sociais', label: 'Redes sociais' },
]
const TERRITORIO_OPTIONS = [
  { value: 'nacional', label: 'Nacional' },
  { value: 'sao_paulo', label: 'São Paulo' },
  { value: 'regional', label: 'Regional' },
]
const PERIODO_OPTIONS = [
  { value: '12_meses', label: '12 meses' },
  { value: '6_meses', label: '6 meses' },
  { value: '3_meses', label: '3 meses' },
]

// Sugestões rápidas (pode trocar por fetch do Supabase depois)
const CLIENT_HINTS = ['BYD', 'Ambev', 'Nestlé', 'Unilever', 'P&G', 'Coca-Cola']
const PRODUTO_HINTS = ['Campanha Black Friday', 'Lançamento Verão', 'Linha Premium', 'Conteúdo Social']

const genId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))
const parseCurrencyLoose = (raw: string): number => {
  if (!raw) return 0
  const s = raw.replace(/\s/g, '').replace(/[R$]/gi, '').replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** =========================
 *  Tipagens
 *  ========================= */
type QuoteFilm = {
  id: string
  produtora: string
  escopo: string
  valor: number
  diretor: string
  tratamento: string
  desconto: number
}
type QuoteAudio = {
  id: string
  produtora: string
  descritivo: string
  valor: number
  desconto: number
}
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
  quotes_film?: QuoteFilm[]
  quotes_audio?: QuoteAudio[]
  honorario_perc?: number
  filme?: { subtotal: number }
  audio?: { subtotal: number }
  total?: number
}

/** =========================
 *  Componente principal
 *  ========================= */
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
    total: 0,
  })

  // Título da aba contextual
  useEffect(() => {
    document.title = `Produção de Filme — Etapa ${step} · WE Proposals`
  }, [step])

  /** ========== Autosave (sem reidratar o formulário) ========== */
  const { status: saveStatus } = useAutosaveWithStatus([data], async () => {
    if (budgetId && Object.keys(data).length > 0) {
      await supabase.from('versions').update({ payload: data as any }).eq('budget_id', budgetId).eq('versao', 1)
    }
  })

  // Evita travadas no preview
  const deferredData = useDeferredValue(data)

  /** ========== Recalcular totais ========== */
  const recalcTotals = useCallback((d: FilmeData) => {
    const filmeSubtotal = (d.quotes_film || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0)
    const audioSubtotal = (d.quotes_audio || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0)
    const honorario = filmeSubtotal * ((d.honorario_perc || 0) / 100)
    const total = filmeSubtotal + audioSubtotal + honorario
    return { ...d, filme: { subtotal: filmeSubtotal }, audio: { subtotal: audioSubtotal }, total }
  }, [])

  const updateData = useCallback((updates: Partial<FilmeData>) => {
    setData(prev => recalcTotals({ ...prev, ...updates }))
  }, [recalcTotals])

  /** ========== Criar orçamento ========== */
  const handleCreateBudget = async () => {
    try {
      const { data: budget, error } = await supabase.rpc('create_simple_budget', { p_type: 'filme' }) as {
        data: { id: string; display_id: string; version_id: string } | null; error: any
      }
      if (error) throw error
      setBudgetId(budget!.id)
      setStep(2)
      toast({ title: 'Orçamento criado', description: `ID: ${budget!.display_id}` })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível criar o orçamento', variant: 'destructive' })
    }
  }

  /** ========== Cotações (IDs estáveis) ========== */
  const addFilmeQuote = (preset?: Partial<QuoteFilm>) => {
    const q: QuoteFilm = {
      id: genId(),
      produtora: preset?.produtora ?? '',
      escopo: preset?.escopo ?? '',
      valor: preset?.valor ?? 0,
      diretor: preset?.diretor ?? '',
      tratamento: preset?.tratamento ?? '',
      desconto: preset?.desconto ?? 0,
    }
    updateData({ quotes_film: [...(data.quotes_film || []), q] })
  }

  const updateFilmeQuoteById = useCallback((id: string, updates: Partial<QuoteFilm>) => {
    setData(prev => {
      const list = (prev.quotes_film || []).map(q => (q.id === id ? { ...q, ...updates } : q))
      return recalcTotals({ ...prev, quotes_film: list })
    })
  }, [recalcTotals])

  const removeFilmeQuoteById = (id: string) => {
    setData(prev => recalcTotals({ ...prev, quotes_film: (prev.quotes_film || []).filter(q => q.id !== id) }))
  }

  /** ========== Linha de cotação memoizada (mantém foco) ========== */
  const QuoteRow = useMemo(() => {
    type RowProps = { q: QuoteFilm; onChange: (patch: Partial<QuoteFilm>) => void; onRemove: () => void }
    const Row: React.FC<RowProps> = React.memo(({ q, onChange, onRemove }) => {
      const [valorStr, setValorStr] = useState(() => (q.valor ? String(q.valor).replace('.', ',') : ''))
      const [descStr, setDescStr] = useState(() => (q.desconto ? String(q.desconto).replace('.', ',') : ''))

      useEffect(() => { setValorStr(q.valor ? String(q.valor).replace('.', ',') : '') }, [q.valor])
      useEffect(() => { setDescStr(q.desconto ? String(q.desconto).replace('.', ',') : '') }, [q.desconto])

      return (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="dark-label">Produtora</Label>
              <Input
                value={q.produtora}
                onChange={(e) => onChange({ produtora: e.target.value })}
                className="dark-input"
                placeholder="Nome da produtora"
                autoComplete="organization"
              />
            </div>
            <div>
              <Label className="dark-label">Escopo</Label>
              <Input
                value={q.escopo}
                onChange={(e) => onChange({ escopo: e.target.value })}
                className="dark-input"
                placeholder="Ex.: Filme 30s com elenco"
              />
            </div>
            <div>
              <Label className="dark-label">Valor (R$)</Label>
              <Input
                inputMode="decimal"
                pattern="[0-9.,]*"
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
                onBlur={() => onChange({ valor: parseCurrencyLoose(valorStr) })}
                className="dark-input"
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="dark-label">Diretor</Label>
              <Input
                value={q.diretor}
                onChange={(e) => onChange({ diretor: e.target.value })}
                className="dark-input"
                placeholder="Nome do diretor"
              />
            </div>
            <div>
              <Label className="dark-label">Tratamento</Label>
              <Input
                value={q.tratamento}
                onChange={(e) => onChange({ tratamento: e.target.value })}
                className="dark-input"
                placeholder="Link/observações"
                autoComplete="off"
              />
            </div>
            <div>
              <Label className="dark-label">Desconto (R$)</Label>
              <Input
                inputMode="decimal"
                pattern="[0-9.,]*"
                value={descStr}
                onChange={(e) => setDescStr(e.target.value)}
                onBlur={() => onChange({ desconto: parseCurrencyLoose(descStr) })}
                className="dark-input"
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="flex justify-between pt-1">
            <div className="text-xs text-white/60">
              Dica: preencha valor/desconto e saia do campo para aplicar no total.
            </div>
            <Button onClick={onRemove} variant="ghost" size="sm" className="text-red-400 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )
    })
    Row.displayName = 'QuoteRow'
    return Row
  }, [])

  /** ========== Validações simples por etapa (habilita botões) ========== */
  const canStep1 = !!data.produtor && !!data.email
  const canStep2 = !!data.cliente && !!data.produto
  const canStep3 = !!data.periodo && !!data.territorio && !!data.midias

  /** ========== Navegação com Enter / Shift+Enter ========== */
  const goNext = () => setStep(s => Math.min(6, s + 1))
  const goPrev = () => setStep(s => Math.max(1, s - 1))
  const keyNav: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if ((step === 1 && canStep1) || (step === 2 && canStep2) || (step === 3 && canStep3) || step >= 4) goNext()
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      goPrev()
    }
  }

  /** ========== Conteúdo das etapas ========== */
  const StepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="space-y-4">
              <FormInput
                id="produtor"
                label="Nome do Produtor"
                description="Usamos para identificar o responsável por este orçamento."
                value={data.produtor || ''}
                onChange={(value) => updateData({ produtor: value })}
                placeholder="Nome completo do produtor"
                required
                autoComplete="name"
              />
              <FormInput
                id="email"
                label="E-mail"
                description="Enviaremos o PDF e os avisos de atualização."
                type="email"
                value={data.email || ''}
                onChange={(value) => updateData({ email: value })}
                placeholder="email@exemplo.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Pressione <kbd className="px-1 py-0.5 rounded bg-white/10">Enter</kbd> para continuar</span>
              <Button onClick={handleCreateBudget} size="lg" className="btn-gradient px-6" disabled={!canStep1}>
                Continuar
              </Button>
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="space-y-6">
              {/* Cliente com datalist para busca rápida */}
              <div>
                <Label className="dark-label">Cliente</Label>
                <input
                  className="dark-input w-full"
                  list="clientes-sug"
                  value={data.cliente || ''}
                  onChange={(e) => updateData({ cliente: e.target.value })}
                  placeholder="Digite ou selecione"
                  autoComplete="organization"
                />
                <datalist id="clientes-sug">
                  {CLIENT_HINTS.map(c => <option key={c} value={c} />)}
                </datalist>
                <p className="mt-1 text-xs text-white/60">Você pode digitar livremente ou escolher uma sugestão.</p>
              </div>

              <div>
                <Label className="dark-label">Produto/Serviço</Label>
                <input
                  className="dark-input w-full"
                  list="produtos-sug"
                  value={data.produto || ''}
                  onChange={(e) => updateData({ produto: e.target.value })}
                  placeholder="Nome do produto/serviço"
                />
                <datalist id="produtos-sug">
                  {PRODUTO_HINTS.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
            </div>

            <div className="flex gap-3 justify-between">
              <Button variant="ghost" onClick={goPrev}>Voltar</Button>
              <Button onClick={goNext} className="btn-gradient px-6" disabled={!canStep2}>Salvar e Continuar</Button>
            </div>
          </motion.div>
        )

      case 3:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <FormInput
                id="job"
                label="Job"
                description="Ex.: campanha, peça, ação"
                value={data.job || ''}
                onChange={(value) => updateData({ job: value })}
                placeholder="Descrição do job"
                autoComplete="off"
              />
              <FormSelect
                id="midias"
                label="Mídias"
                value={data.midias || ''}
                onChange={(value) => updateData({ midias: value })}
                options={MEDIA_OPTIONS}
                placeholder="Selecione as mídias"
              />
              <FormSelect
                id="territorio"
                label="Território"
                value={data.territorio || ''}
                onChange={(value) => updateData({ territorio: value })}
                options={TERRITORIO_OPTIONS}
                placeholder="Selecione o território"
              />
              <FormSelect
                id="periodo"
                label="Período"
                value={data.periodo || ''}
                onChange={(value) => updateData({ periodo: value })}
                options={PERIODO_OPTIONS}
                placeholder="Selecione o período"
              />
            </div>

            <div className="flex gap-3 justify-between">
              <Button variant="ghost" onClick={goPrev}>Voltar</Button>
              <Button onClick={goNext} className="btn-gradient px-6" disabled={!canStep3}>Salvar e Continuar</Button>
            </div>
          </motion.div>
        )

      case 4:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Cotações de Filme</h3>
                <p className="text-xs text-white/60">Adicione pelo menos 1 produtora para comparar valores.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => addFilmeQuote()} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produtora
                </Button>
                {/* Atalhos de presets para agilizar */}
                <Button onClick={() => addFilmeQuote({ escopo: 'Filme 30s', valor: 0 })} variant="ghost" size="sm">
                  + 30s
                </Button>
                <Button onClick={() => addFilmeQuote({ escopo: 'Reduções 15/6s', valor: 0 })} variant="ghost" size="sm">
                  + Reduções
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {(data.quotes_film || []).map(q => (
                <QuoteRow
                  key={q.id}
                  q={q}
                  onChange={(patch) => updateFilmeQuoteById(q.id, patch)}
                  onRemove={() => removeFilmeQuoteById(q.id)}
                />
              ))}
              {(data.quotes_film || []).length === 0 && (
                <div className="text-sm text-white/60">Nenhuma cotação adicionada ainda.</div>
              )}
            </div>

            <div className="flex gap-3 justify-between">
              <Button variant="ghost" onClick={goPrev}>Voltar</Button>
              <Button onClick={goNext} className="btn-gradient px-6" disabled={(data.quotes_film?.length || 0) === 0}>
                Revisar Orçamento
              </Button>
            </div>
          </motion.div>
        )

      case 5:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 space-y-4">
              <h3 className="text-lg font-semibold">Resumo do Orçamento</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Cliente:</span><span className="font-medium">{data.cliente || '-'}</span></div>
                <div className="flex justify-between"><span>Produto:</span><span className="font-medium">{data.produto || '-'}</span></div>
                <div className="flex justify-between"><span>Mídias:</span><span className="font-medium capitalize">{data.midias || '-'}</span></div>
                <div className="flex justify-between"><span>Território:</span><span className="font-medium capitalize">{data.territorio || '-'}</span></div>
                <div className="flex justify-between"><span>Período:</span><span className="font-medium">{data.periodo || '-'}</span></div>
                <div className="flex justify-between"><span>Cotações:</span><span className="font-medium">{data.quotes_film?.length || 0}</span></div>
              </div>
            </div>

            <div className="flex gap-3 justify-between">
              <Button variant="ghost" onClick={goPrev}>Voltar</Button>
              <Button onClick={goNext} className="btn-gradient px-6">Ir para Exportar</Button>
            </div>
          </motion.div>
        )

      case 6:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Orçamento Finalizado!</h3>
              <p className="text-muted-foreground">Escolha uma das opções abaixo:</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => budgetId && navigate(`/budget/${budgetId}/pdf`)} size="lg" className="w-full btn-gradient" disabled={!budgetId}>
                Visualizar PDF
              </Button>
              <Button onClick={() => budgetId && navigate(`/budget/${budgetId}`)} variant="outline" size="lg" className="w-full nav-button" disabled={!budgetId}>
                Visualizar Orçamento
              </Button>
              <Button onClick={() => navigate('/')} variant="ghost" size="lg" className="w-full">
                Voltar ao Início
              </Button>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  /** ========== Layout ========== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" onKeyDown={keyNav}>
      <div className="fixed top-4 right-4 z-50">
        <AutosaveIndicator status={saveStatus} />
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate('/'))}
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
          {/* Main */}
          <div className="flex-1 space-y-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <Stepper step={step} steps={steps} />
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <StepContent />
              {/* Rodapé fixo da etapa para navegação rápida em telas longas */}
              <div className="mt-8 sticky bottom-4 z-40 flex justify-between bg-slate-900/60 backdrop-blur rounded-lg p-3 border border-white/10">
                <span className="text-xs text-white/60">Use Enter para avançar • Shift+Enter para voltar</span>
                <span className="text-xs text-white/60">Autosave ativo</span>
              </div>
            </div>
          </div>

          {/* Preview (desacoplado) */}
          <PreviewSidebar data={{ filme: deferredData.filme, audio: deferredData.audio, total: deferredData.total }} />
        </div>
      </div>
    </div>
  )
}
