// src/pages/new/Filme.tsx
import { useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react'
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
import React from 'react'

const steps = ['Identificação', 'Cliente & Produto', 'Detalhes', 'Cotações', 'Revisão', 'Exportar']

// Helpers
const genId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))
const parseCurrencyLoose = (raw: string): number => {
  if (!raw) return 0
  const s = raw.replace(/\s/g, '').replace(/[R$]/gi, '').replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

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
  // campos adicionais úteis ao PDF
  data_orcamento?: string
  exclusividade_elenco?: string
  audio_descr?: string
}

export default function NovoFilme() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [budgetId, setBudgetId] = useState<string>()
  const [versionId, setVersionId] = useState<string>()        // << NOVO: vamos salvar por versão
  const [data, setData] = useState<FilmeData>({
    quotes_film: [],
    quotes_audio: [],
    entregaveis: [],
    formatos: [],
    filme: { subtotal: 0 },
    audio: { subtotal: 0 },
    total: 0,
    data_orcamento: new Date().toISOString().slice(0,10)
  })

  // === AUTOSAVE (POR ID DA VERSÃO) ===
  const { status: saveStatus } = useAutosaveWithStatus([data, versionId], async () => {
    if (versionId && Object.keys(data).length > 0) {
      await supabase
        .from('versions')
        .update({
          payload: data as any,
          total_geral: data.total ?? 0,
        })
        .eq('id', versionId)       // << grava na linha exata da versão
    }
  })

  // Evita travar preview durante digitação
  const deferredData = useDeferredValue(data)

  const recalcTotals = useCallback((d: FilmeData) => {
    const filmeSubtotal = (d.quotes_film || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0)
    const audioSubtotal = (d.quotes_audio || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0)
    const honorario = filmeSubtotal * ((d.honorario_perc || 0) / 100)
    const total = filmeSubtotal + audioSubtotal + honorario
    return {
      ...d,
      filme: { subtotal: filmeSubtotal },
      audio: { subtotal: audioSubtotal },
      total
    }
  }, [])

  const updateData = useCallback((updates: Partial<FilmeData>) => {
    setData(prev => recalcTotals({ ...prev, ...updates }))
  }, [recalcTotals])

  const handleCreateBudget = async () => {
    try {
      const { data: created, error } = await supabase.rpc('create_simple_budget', { p_type: 'filme' }) as {
        data: { id: string; display_id: string; version_id: string } | null; error: any
      }
      if (error || !created) throw error || new Error('Falha ao criar')

      setBudgetId(created.id)
      setVersionId(created.version_id)           // << guardar a versão criada no banco
      setStep(2)

      toast({ title: 'Orçamento criado', description: `ID: ${created.display_id}` })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível criar o orçamento', variant: 'destructive' })
    }
  }

  // === COTAÇÕES (IDs estáveis; inputs controlados sem perder foco) ===
  const addFilmeQuote = () => {
    const q: QuoteFilm = {
      id: genId(),
      produtora: '',
      escopo: '',
      valor: 0,
      diretor: '',
      tratamento: '',
      desconto: 0
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

  const QuoteRow = useMemo(() => {
    type RowProps = { q: QuoteFilm; onChange: (patch: Partial<QuoteFilm>) => void; onRemove: () => void }
    const Row: React.FC<RowProps> = React.memo(({ q, onChange, onRemove }) => {
      const [valorStr, setValorStr] = useState(() => (q.valor ? String(q.valor).replace('.', ',') : ''))
      const [descStr, setDescStr]   = useState(() => (q.desconto ? String(q.desconto).replace('.', ',') : ''))

      useEffect(() => { setValorStr(q.valor ? String(q.valor).replace('.', ',') : '') }, [q.valor])
      useEffect(() => { setDescStr(q.desconto ? String(q.desconto).replace('.', ',') : '') }, [q.desconto])

      return (
        <div className="p-4 border rounded-lg space-y-3 bg-white/5 border-white/10">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="dark-label">Produtora</Label>
              <Input value={q.produtora} onChange={(e) => onChange({ produtora: e.target.value })} className="dark-input" placeholder="Nome da produtora" autoComplete="organization" />
            </div>
            <div>
              <Label className="dark-label">Escopo</Label>
              <Input value={q.escopo} onChange={(e) => onChange({ escopo: e.target.value })} className="dark-input" placeholder="Ex: Filme 30s com elenco" />
            </div>
            <div>
              <Label className="dark-label">Valor (R$)</Label>
              <Input inputMode="decimal" pattern="[0-9.,]*" value={valorStr} onChange={(e) => setValorStr(e.target.value)} onBlur={() => onChange({ valor: parseCurrencyLoose(valorStr) })} className="dark-input" placeholder="0,00" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="dark-label">Diretor</Label>
              <Input value={q.diretor} onChange={(e) => onChange({ diretor: e.target.value })} className="dark-input" placeholder="Nome do diretor" />
            </div>
            <div>
              <Label className="dark-label">Tratamento</Label>
              <Input value={q.tratamento} onChange={(e) => onChange({ tratamento: e.target.value })} className="dark-input" placeholder="Link/observações" autoComplete="off" />
            </div>
            <div>
              <Label className="dark-label">Desconto (R$)</Label>
              <Input inputMode="decimal" pattern="[0-9.,]*" value={descStr} onChange={(e) => setDescStr(e.target.value)} onBlur={() => onChange({ desconto: parseCurrencyLoose(descStr) })} className="dark-input" placeholder="0,00" />
            </div>
          </div>

          <div className="flex justify-end">
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

  // ====== STEP CONTENT (igual ao seu com botões e labels claros) ======
  const StepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="space-y-4">
              <FormInput id="produtor" label="Nome do Produtor" value={data.produtor || ''} onChange={(value) => updateData({ produtor: value })} placeholder="Nome completo do produtor" required autoComplete="name" />
              <FormInput id="email" label="E-mail" type="email" value={data.email || ''} onChange={(value) => updateData({ email: value })} placeholder="email@exemplo.com" required autoComplete="email" />
            </div>
            <div className="flex gap-3 justify-end">
              <Button onClick={handleCreateBudget} size="lg" className="btn-gradient px-6">Continuar</Button>
            </div>
          </motion.div>
        )
      case 2:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="space-y-6">
              <FormInput id="cliente" label="Cliente" value={data.cliente || ''} onChange={(value) => updateData({ cliente: value })} placeholder="Razão social ou nome fantasia" required autoComplete="organization" />
              <FormInput id="produto" label="Produto/Serviço" value={data.produto || ''} onChange={(value) => updateData({ produto: value })} placeholder="Nome do produto ou serviço" required />
            </div>
            <div className="flex gap-3 justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)} className="btn-gradient px-6">Salvar e Continuar</Button>
            </div>
          </motion.div>
        )
      case 3:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <FormInput id="job" label="Job" value={data.job || ''} onChange={(value) => updateData({ job: value })} placeholder="Descrição do job" autoComplete="off" />
              <FormSelect id="midias" label="Mídias" value={data.midias || ''} onChange={(value) => updateData({ midias: value })} options={[
                { value: 'todas', label: 'Todas as mídias' },
                { value: 'tv_aberta', label: 'TV aberta' },
                { value: 'tv_fechada', label: 'TV fechada' },
                { value: 'sociais', label: 'Redes sociais' },
              ]} placeholder="Selecione as mídias" />
              <FormSelect id="territorio" label="Território" value={data.territorio || ''} onChange={(value) => updateData({ territorio: value })} options={[
                { value: 'nacional', label: 'Nacional' },
                { value: 'sao_paulo', label: 'São Paulo' },
                { value: 'regional', label: 'Regional' },
              ]} placeholder="Selecione o território" />
              <FormSelect id="periodo" label="Período" value={data.periodo || ''} onChange={(value) => updateData({ periodo: value })} options={[
                { value: '12_meses', label: '12 meses' },
                { value: '6_meses', label: '6 meses' },
                { value: '3_meses', label: '3 meses' },
              ]} placeholder="Selecione o período" />
            </div>
            <div className="flex gap-3 justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={() => setStep(4)} className="btn-gradient px-6">Salvar e Continuar</Button>
            </div>
          </motion.div>
        )
      case 4:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cotações de Filme</h3>
              <Button onClick={addFilmeQuote} variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Adicionar Produtora</Button>
            </div>
            <div className="space-y-4">
              {(data.quotes_film || []).map(q => (
                <QuoteRow key={q.id} q={q} onChange={(patch) => updateFilmeQuoteById(q.id, patch)} onRemove={() => removeFilmeQuoteById(q.id)} />
              ))}
            </div>
            <div className="flex gap-3 justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}>Voltar</Button>
              <Button onClick={() => setStep(5)} className="btn-gradient px-6">Revisar Orçamento</Button>
            </div>
          </motion.div>
        )
      case 5:
        return (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-6 border rounded-lg space-y-4 bg-white/5 border-white/10">
              <h3 className="text-lg font-semibold">Resumo do Orçamento</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Cliente:</span><span className="font-medium">{data.cliente || '-'}</span></div>
                <div className="flex justify-between"><span>Produto:</span><span className="font-medium">{data.produto || '-'}</span></div>
                <div className="flex justify-between"><span>Cotações de filme:</span><span className="font-medium">{data.quotes_film?.length || 0}</span></div>
              </div>
            </div>
            <div className="flex gap-3 justify-between">
              <Button variant="ghost" onClick={() => setStep(4)}>Voltar</Button>
              <Button onClick={() => setStep(6)} className="btn-gradient px-6">Ir para Exportar</Button>
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
              <Button onClick={() => budgetId && navigate(`/budget/${budgetId}/pdf`)} size="lg" className="w-full btn-gradient" disabled={!budgetId}>Visualizar PDF</Button>
              <Button onClick={() => budgetId && navigate(`/budget/${budgetId}`)} variant="outline" size="lg" className="w-full nav-button" disabled={!budgetId}>Visualizar Orçamento</Button>
              <Button onClick={() => navigate('/')} variant="ghost" size="lg" className="w-full">Voltar ao Início</Button>
            </div>
          </motion.div>
        )
      default:
        return null
    }
  }

  // ====== LAYOUT ======
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="fixed top-4 right-4 z-50"><AutosaveIndicator status={saveStatus} /></div>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => (step > 1 ? setStep(step - 1) : navigate('/'))} variant="ghost" size="sm" className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />{step > 1 ? 'Voltar' : 'Início'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Produção de Filme</h1>
            <p className="text-white/70">Criar orçamento de filme com cotações e comparador</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="flex-1 space-y-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6"><Stepper step={step} steps={steps} /></div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6"><StepContent /></div>
          </div>
          <PreviewSidebar data={{ filme: deferredData.filme, audio: deferredData.audio, total: deferredData.total }} />
        </div>
      </div>
    </div>
  )
}
