// src/pages/budget/Pdf.tsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowLeft, Home, Printer } from 'lucide-react'

type Quote = {
  id: string
  produtora: string
  escopo: string
  valor: number
  desconto?: number
  diretor?: string
  tratamento?: string
  quantidade?: number
  qtd?: number
}

type Payload = {
  // identificação
  cliente?: string
  produto?: string
  job?: string
  midias?: string
  territorio?: string
  periodo?: string

  // blocos complementares
  entregaveis?: string[] | string
  formatos?: string[] | string
  data_orcamento?: string
  exclusividade_elenco?: string
  audio_descr?: string

  // financeiro
  quotes_film?: Quote[]
  honorario_perc?: number
  total?: number

  // faturamento
  pendente_pagamento?: boolean
  observacoes_faturamento?: string
}

type View = {
  budgetId: string
  displayId: string
  type: 'filme' | 'audio' | 'imagem' | 'cc' | string
  status: string
  createdAt: string
  payload: Payload
}

const fmt = (v?: any) => (v == null || v === '' ? '—' : String(v))
const BRL = (n: number | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0))

export default function PdfView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [view, setView] = useState<View | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logoOk, setLogoOk] = useState<boolean | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        // pega a última versão desse orçamento (ordem por created_at é mais segura)
        const { data, error } = await supabase
          .from('versions')
          .select(`
            id,
            payload,
            created_at,
            budget_id,
            budgets!inner(
              id,
              display_id,
              type,
              status,
              created_at
            )
          `)
          .eq('budget_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error || !data) throw error || new Error('Orçamento não encontrado')

        const payload: Payload = (data.payload as Payload) || {}
        setView({
          budgetId: data.budgets.id,
          displayId: data.budgets.display_id,
          type: data.budgets.type,
          status: data.budgets.status,
          createdAt: data.budgets.created_at,
          payload,
        })
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Erro ao carregar orçamento.')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  // ----- cálculos -----
  const p = view?.payload || {}
  const linhas: Quote[] = useMemo(() => p.quotes_film ?? [], [p.quotes_film])

  const subtotal = useMemo(() => {
    return linhas.reduce((s, q) => {
      const qty = Number(q.quantidade ?? q.qtd ?? 1)
      const unit = Number(q.valor || 0)
      const desc = Number(q.desconto || 0)
      return s + (unit * qty - desc)
    }, 0)
  }, [linhas])

  const honorario = useMemo(
    () => subtotal * ((p.honorario_perc || 0) / 100),
    [subtotal, p.honorario_perc]
  )

  // respeita 'total' salvo no payload; se não existir, calcula
  const totalGeral = useMemo(
    () => (typeof p.total === 'number' ? p.total : subtotal + honorario),
    [p.total, subtotal, honorario]
  )

  const isAudio = (view?.type || '').toLowerCase() === 'audio'

  // ----- estados -----
  if (loading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="text-muted-foreground">Gerando PDF…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="space-y-4 text-center">
          <div className="text-xl font-semibold">Erro ao carregar</div>
          <div className="text-sm text-muted-foreground">{error}</div>
          <Button onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" /> Início
          </Button>
        </div>
      </div>
    )
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="space-y-4 text-center">
          <div className="text-xl font-semibold">Orçamento não encontrado</div>
          <Button onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" /> Início
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Barra de ações (não imprime) */}
      <div className="sticky top-0 z-10 bg-white border-b p-3 flex items-center gap-2 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button variant="outline" onClick={() => navigate('/')}>
          <Home className="w-4 h-4 mr-2" /> Início
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {view.displayId} • {String(view.type).toUpperCase()} • {view.status}
        </div>
        {logoOk === false && <span className="ml-3 text-xs text-amber-600">Logo não encontrado</span>}
        {logoOk === true && <span className="ml-3 text-xs text-emerald-600">Logo ok</span>}
        <Button className="ml-3" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF
        </Button>
      </div>

      {/* Cabeçalho corporativo (preto com logo WE + dados da WE) */}
      <div className="px-10 pt-10">
        <div className="rounded-2xl overflow-hidden border">
          <div className="bg-black text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/brand/we-white.png"
                alt="WE"
                className="h-10 w-auto"
                onLoad={() => setLogoOk(true)}
                onError={(e) => { setLogoOk(false); (e.currentTarget.style.display = 'none') }}
              />
              <span className="text-xl font-bold">WE</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">Orçamento #{view.displayId}</div>
              <div className="text-xs opacity-80">
                {new Date(view.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
          <div className="p-6 text-sm leading-relaxed">
            <div className="font-semibold">
              WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA
            </div>
            <div>
              Endereço: Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP: 04552-030
            </div>
          </div>
        </div>
      </div>

      {/* Selo de NÃO FATURADO / pendente */}
      {(p.pendente_pagamento === true) && (
        <div className="px-10 pt-4">
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 flex gap-2">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div>
              <div className="font-semibold uppercase">Não faturado</div>
              <div>Este orçamento está pendente de pagamento e precisa ser incluso em algum faturamento.</div>
              {p.observacoes_faturamento && (
                <div className="mt-1 opacity-90">Obs.: {p.observacoes_faturamento}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sumário de identificação */}
      <div className="px-10 pt-6">
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="border rounded-xl p-4">
            <div className="text-muted-foreground">Cliente</div>
            <div className="font-medium">{fmt(p.cliente)}</div>
          </div>
          <div className="border rounded-xl p-4">
            <div className="text-muted-foreground">Produto</div>
            <div className="font-medium">{fmt(p.produto)}</div>
          </div>
          <div className="border rounded-xl p-4">
            <div className="text-muted-foreground">Job</div>
            <div className="font-medium">{fmt(p.job)}</div>
          </div>

          <div className="border rounded-xl p-4">
            <div className="text-muted-foreground">Mídias</div>
            <div className="font-medium">{fmt(p.midias)}</div>
          </div>
          <div className="border rounded-xl p-4">
            <div className="text-muted-foreground">Território</div>
            <div className="font-medium">{fmt(p.territorio)}</div>
          </div>
          <div className="border rounded-xl p-4">
            <div className="text-muted-foreground">Período</div>
            <div className="font-medium">{fmt(p.periodo)}</div>
          </div>

          {/* Esses blocos somem quando for ÁUDIO */}
          {String(view.type).toLowerCase() !== 'audio' && (
            <>
              <div className="border rounded-xl p-4 md:col-span-3">
                <div className="text-muted-foreground">Entregáveis</div>
                <div className="font-medium">
                  {Array.isArray(p.entregaveis) ? p.entregaveis.join(', ') : fmt(p.entregaveis)}
                </div>
              </div>

              <div className="border rounded-xl p-4">
                <div className="text-muted-foreground">Adaptações de Formatos</div>
                <div className="font-medium">
                  {Array.isArray(p.formatos) ? p.formatos.join(', ') : fmt(p.formatos)}
                </div>
              </div>
              <div className="border rounded-xl p-4">
                <div className="text-muted-foreground">Data do Orçamento</div>
                <div className="font-medium">{fmt(p.data_orcamento)}</div>
              </div>
              <div className="border rounded-xl p-4">
                <div className="text-muted-foreground">Exclusividade de Elenco</div>
                <div className="font-medium">{fmt(p.exclusividade_elenco)}</div>
              </div>
              <div className="border rounded-xl p-4">
                <div className="text-muted-foreground">Áudio</div>
                <div className="font-medium">{fmt(p.audio_descr)}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cotações */}
      <div className="px-10 pt-6">
        <div className="rounded-2xl border p-6">
          <div className="text-lg font-semibold mb-4">Cotações</div>

          {/* Se não houver linhas, avisa claramente */}
          {linhas.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma cotação informada.</div>
          )}

          {/* ÁUDIO: Produtora / Escopo / Valor Unitário / Qtd / Desconto / Valor Total */}
          {isAudio && linhas.length > 0 && (
            <div className="w-full border rounded-md overflow-hidden">
              <div className="grid grid-cols-6 bg-neutral-100 text-xs font-medium px-3 py-2">
                <div>Produtora</div>
                <div>Escopo</div>
                <div className="text-right">Valor unitário</div>
                <div className="text-right">Qtd</div>
                <div className="text-right">Desconto</div>
                <div className="text-right">Valor total</div>
              </div>
              {linhas.map((q) => {
                const qty = Number(q.quantidade ?? q.qtd ?? 1)
                const unit = Number(q.valor || 0)
                const desc = Number(q.desconto || 0)
                const totalLinha = unit * qty - desc
                return (
                  <div key={q.id} className="grid grid-cols-6 px-3 py-2 text-sm border-t">
                    <div>{fmt(q.produtora)}</div>
                    <div>{fmt(q.escopo)}</div>
                    <div className="text-right">{BRL(unit)}</div>
                    <div className="text-right">{qty}</div>
                    <div className="text-right">{BRL(desc)}</div>
                    <div className="text-right">{BRL(totalLinha)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Outros tipos: Produtora / Escopo / Diretor / Tratamento / Valor */}
          {!isAudio && linhas.length > 0 && (
            <div className="w-full border rounded-md overflow-hidden">
              <div className="grid grid-cols-5 bg-neutral-100 text-xs font-medium px-3 py-2">
                <div>Produtora</div>
                <div>Escopo</div>
                <div>Diretor</div>
                <div>Tratamento</div>
                <div className="text-right">Valor</div>
              </div>
              {linhas.map((q) => (
                <div key={q.id} className="grid grid-cols-5 px-3 py-2 text-sm border-t">
                  <div>{fmt(q.produtora)}</div>
                  <div>{fmt(q.escopo)}</div>
                  <div>{fmt(q.diretor)}</div>
                  <div>{fmt(q.tratamento)}</div>
                  <div className="text-right">{BRL(Number(q.valor) || 0)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="px-10 pt-6">
        <div className="rounded-2xl border p-6">
          <div className="text-lg font-semibold mb-4">Resumo Financeiro</div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="border rounded-xl p-4">
              <div className="text-muted-foreground">Subtotal cotações</div>
              <div className="font-medium">{BRL(subtotal)}</div>
            </div>
            <div className="border rounded-xl p-4">
              <div className="text-muted-foreground">Honorário ({p.honorario_perc || 0}%)</div>
              <div className="font-medium">{BRL(honorario)}</div>
            </div>
            <div className="border rounded-xl p-4">
              <div className="text-muted-foreground">Total Geral</div>
              <div className="font-semibold text-primary">{BRL(totalGeral)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Observações / Termos */}
      <div className="px-10 py-8">
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div className="rounded-2xl border p-6">
            <div className="font-semibold mb-2">Observações</div>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {p.pendente_pagamento && <li>NÃO FATURADO — incluir no próximo faturamento.</li>}
              {p.observacoes_faturamento && <li>{p.observacoes_faturamento}</li>}
              <li>Validade do orçamento: 7 dias a partir da emissão.</li>
              <li>Usos e prazos condicionados à aprovação e disponibilidade.</li>
            </ul>
          </div>

          <div className="rounded-2xl border p-6">
            <div className="font-semibold mb-2">Termos e Condições</div>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Alterações de escopo podem gerar nova versão.</li>
              <li>Conforme mídias, território e período informados neste orçamento.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Estilos de impressão A4 */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  )
}
