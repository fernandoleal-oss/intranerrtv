// src/pages/budget/Pdf.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
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

  // ref do conteúdo imprimível (usado para "caber em 1 página")
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        // última versão desse orçamento
        const { data, error } = await supabase
          .from('versions')
          .select(`
            id, payload, created_at, budget_id,
            budgets!inner(id, display_id, type, status, created_at)
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

  // ----- fit-to-one-page (calcula escala antes de imprimir) -----
  useEffect(() => {
    const handleBeforePrint = () => {
      const el = printRef.current
      if (!el) return

      // Tamanho útil da página A4 com margem de 10mm (ver @page abaixo)
      // A4 = 297mm x 210mm → em px (~96dpi): 1123(h) x 794(w)
      // margem vertical total ≈ 20mm ≈ 76px → alvo de ~1047px de altura
      const TARGET_HEIGHT_PX = 1047

      // primeiro, reseta escala
      el.style.setProperty('--print-scale', '1')
      // mede a altura atual
      const actual = el.scrollHeight
      if (actual <= TARGET_HEIGHT_PX) {
        return // já cabe
      }
      // escala mínima para não ficar ilegível
      const MIN_SCALE = 0.7
      // margem de segurança
      const scale = Math.max(MIN_SCALE, Math.min(1, (TARGET_HEIGHT_PX / actual) * 0.98))
      el.style.setProperty('--print-scale', String(scale))
    }

    const handleAfterPrint = () => {
      const el = printRef.current
      if (!el) return
      el.style.setProperty('--print-scale', '1')
    }

    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  // ----- estados de tela -----
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

      {/* CONTEÚDO IMPRESSO */}
      <div className="px-6 py-6 print:px-0 print:py-0 flex justify-center">
        {/* Contêiner com largura A4 útil no print; escalado se necessário */}
        <div
          ref={printRef}
          id="print-root"
          className="w-full max-w-4xl print:w-[190mm]"
          style={{
            // em tela, largura fluida; no print, transform/escala aplicada via CSS
            transformOrigin: 'top left',
          }}
        >
          {/* Cabeçalho preto + dados da WE */}
          <div className="rounded-xl overflow-hidden border print:rounded-none print:border-0">
            <div className="bg-black text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/brand/we-white.png"
                  alt="WE"
                  className="h-8 w-auto"
                  onLoad={() => setLogoOk(true)}
                  onError={(e) => { setLogoOk(false); (e.currentTarget.style.display = 'none') }}
                />
                <span className="text-lg font-bold leading-none">WE</span>
              </div>
              <div className="text-right">
                <div className="text-base font-semibold leading-none">Orçamento #{view.displayId}</div>
                <div className="text-[10px] opacity-80 mt-1 leading-none">
                  {new Date(view.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 text-xs leading-snug">
              <div className="font-semibold">
                WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA
              </div>
              <div>
                Endereço: Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP: 04552-030
              </div>
            </div>
          </div>

          {/* ALERTA NÃO FATURADO */}
          {p.pendente_pagamento && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-2.5 flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold uppercase leading-none">Não faturado</div>
                <div>Este orçamento está pendente e precisa ser incluso em algum faturamento.</div>
                {p.observacoes_faturamento && (
                  <div className="mt-1 opacity-90">Obs.: {p.observacoes_faturamento}</div>
                )}
              </div>
            </div>
          )}

          {/* GRID PRINCIPAL (compacto) */}
          <div className="mt-3 grid grid-cols-12 gap-3">
            {/* COLUNA ESQUERDA */}
            <div className="col-span-12 md:col-span-7">
              {/* Identificação */}
              <section className="rounded-lg border px-4 py-3">
                <h2 className="text-sm font-semibold mb-2">Identificação</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-neutral-500">Cliente:</span> {fmt(p.cliente)}</div>
                  <div><span className="text-neutral-500">Produto:</span> {fmt(p.produto)}</div>
                  <div><span className="text-neutral-500">Job:</span> {fmt(p.job)}</div>
                  <div><span className="text-neutral-500">Mídias:</span> {fmt(p.midias)}</div>
                  <div><span className="text-neutral-500">Território:</span> {fmt(p.territorio)}</div>
                  <div><span className="text-neutral-500">Período:</span> {fmt(p.periodo)}</div>
                </div>
              </section>

              {/* Cotações */}
              <section className="rounded-lg border px-4 py-3 mt-3">
                <h2 className="text-sm font-semibold mb-2">Cotações</h2>

                {linhas.length === 0 ? (
                  <div className="text-xs text-neutral-600">Nenhuma cotação informada.</div>
                ) : isAudio ? (
                  // ÁUDIO
                  <div className="w-full border rounded-md overflow-hidden">
                    <div className="grid grid-cols-6 bg-neutral-100 text-[11px] font-medium px-2 py-1.5">
                      <div>Produtora</div>
                      <div>Escopo</div>
                      <div className="text-right">Unit.</div>
                      <div className="text-right">Qtd</div>
                      <div className="text-right">Desc.</div>
                      <div className="text-right">Total</div>
                    </div>
                    {linhas.map((q) => {
                      const qty = Number(q.quantidade ?? q.qtd ?? 1)
                      const unit = Number(q.valor || 0)
                      const desc = Number(q.desconto || 0)
                      const totalLinha = unit * qty - desc
                      return (
                        <div key={q.id} className="grid grid-cols-6 px-2 py-1.5 text-[11px] border-t leading-tight">
                          <div className="truncate" title={q.produtora}>{fmt(q.produtora)}</div>
                          <div className="truncate" title={q.escopo}>{fmt(q.escopo)}</div>
                          <div className="text-right">{BRL(unit)}</div>
                          <div className="text-right">{qty}</div>
                          <div className="text-right">{BRL(desc)}</div>
                          <div className="text-right">{BRL(totalLinha)}</div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  // OUTROS TIPOS
                  <div className="w-full border rounded-md overflow-hidden">
                    <div className="grid grid-cols-5 bg-neutral-100 text-[11px] font-medium px-2 py-1.5">
                      <div>Produtora</div>
                      <div>Escopo</div>
                      <div>Diretor</div>
                      <div>Tratamento</div>
                      <div className="text-right">Valor</div>
                    </div>
                    {linhas.map((q) => (
                      <div key={q.id} className="grid grid-cols-5 px-2 py-1.5 text-[11px] border-t leading-tight">
                        <div className="truncate" title={q.produtora}>{fmt(q.produtora)}</div>
                        <div className="truncate" title={q.escopo}>{fmt(q.escopo)}</div>
                        <div className="truncate" title={q.diretor}>{fmt(q.diretor)}</div>
                        <div className="truncate" title={q.tratamento}>{fmt(q.tratamento)}</div>
                        <div className="text-right">{BRL(Number(q.valor) || 0)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Blocos complementares – ocultos em ÁUDIO */}
                {String(view.type).toLowerCase() !== 'audio' && (
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                    <div className="border rounded-md p-2">
                      <div className="text-neutral-500">Entregáveis</div>
                      <div className="font-medium">
                        {Array.isArray(p.entregaveis) ? p.entregaveis.join(', ') : fmt(p.entregaveis)}
                      </div>
                    </div>
                    <div className="border rounded-md p-2">
                      <div className="text-neutral-500">Adaptações</div>
                      <div className="font-medium">
                        {Array.isArray(p.formatos) ? p.formatos.join(', ') : fmt(p.formatos)}
                      </div>
                    </div>
                    <div className="border rounded-md p-2">
                      <div className="text-neutral-500">Exclusividade</div>
                      <div className="font-medium">{fmt(p.exclusividade_elenco)}</div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* COLUNA DIREITA */}
            <div className="col-span-12 md:col-span-5">
              {/* Resumo Financeiro */}
              <section className="rounded-lg border px-4 py-3">
                <h2 className="text-sm font-semibold mb-2">Resumo Financeiro</h2>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-600">Subtotal cotações</span>
                    <span>{BRL(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-600">Honorário ({p.honorario_perc || 0}%)</span>
                    <span>{BRL(honorario)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-2 border-t">
                    <span>Total</span>
                    <span className="text-black">{BRL(totalGeral)}</span>
                  </div>
                </div>
              </section>

              {/* Observações / Termos */}
              <section className="rounded-lg border px-4 py-3 mt-3">
                <h2 className="text-sm font-semibold mb-2">Observações</h2>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-neutral-700">
                  {p.pendente_pagamento && <li>NÃO FATURADO — incluir no próximo faturamento.</li>}
                  {p.observacoes_faturamento && <li>{p.observacoes_faturamento}</li>}
                  <li>Validade do orçamento: 7 dias a partir da emissão.</li>
                  <li>Usos e prazos condicionados à aprovação e disponibilidade.</li>
                </ul>
              </section>

              <section className="rounded-lg border px-4 py-3 mt-3">
                <h2 className="text-sm font-semibold mb-2">Termos e Condições</h2>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-neutral-700">
                  <li>Alterações de escopo podem gerar nova versão.</li>
                  <li>Conforme mídias, território e período informados neste orçamento.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de impressão A4 + "fit to page" */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-root { transform: scale(var(--print-scale, 1)); }
          .no-print { display: none !important; }
        }

        /* Evitar quebras feias */
        #print-root, #print-root * {
          page-break-inside: avoid;
        }
      `}</style>
    </div>
  )
}
