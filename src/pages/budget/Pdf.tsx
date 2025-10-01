// src/pages/budget/Pdf.tsx
import { useEffect, useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, Printer } from "lucide-react"

type Payload = {
  type?: "filme" | "audio" | "imagem" | "cc"
  cliente?: string
  produto?: string
  job?: string
  midias?: string
  territorio?: string
  periodo?: string
  honorario_perc?: number
  total?: number
  entregaveis?: string[] | string
  formatos?: string[] | string
  audio_descr?: string
  pendente_faturamento?: boolean
  quotes_film?: Array<{
    id: string
    produtora: string
    escopo: string
    valor: number
    desconto: number
    diretor?: string
    tratamento?: string
  }>
} & Record<string, any>

type View = {
  budgetId: string
  displayId: string
  type: string
  status: string
  createdAt: string
  versionId: string
  versao: number
  payload: Payload
  totalGeral: number
}

const fmt = (v?: any) => (v == null || v === "" ? "—" : String(v))
const money = (n: number | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0)

export default function PdfView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [view, setView] = useState<View | null>(null)
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setErrMsg(null)
      try {
        const { data, error } = await supabase.rpc("get_budget_view_rpc", {
          p_budget_id: id,
        })
        if (error) throw error
        if (!data) throw new Error("Orçamento não encontrado.")

        const row = Array.isArray(data) ? data[0] : data
        const payload: Payload = (row.payload as Payload) || {}

        if (mounted) {
          setView({
            budgetId: row.budget_id,
            displayId: row.display_id,
            type: row.type,
            status: row.status,
            createdAt: row.created_at,
            versionId: row.version_id,
            versao: row.versao,
            payload,
            totalGeral: Number(row.total_geral || payload.total || 0),
          })
        }
      } catch (e: any) {
        console.error("[pdf] load error:", e)
        if (mounted) setErrMsg(e?.message || e?.details || "Falha ao carregar orçamento")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white grid place-items-center">
        <div className="text-neutral-500">Gerando PDF…</div>
      </div>
    )
  }

  if (errMsg || !view) {
    return (
      <div className="min-h-screen bg-white grid place-items-center p-6">
        <div className="space-y-4 text-center max-w-md">
          <div className="text-xl font-semibold">Não foi possível abrir o orçamento</div>
          <div className="text-sm text-neutral-600">{errMsg || "Tente novamente."}</div>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <Button onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" /> Início
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const p = view.payload
  const isAudio = (p.type || view.type) === "audio"
  const quotes = Array.isArray(p.quotes_film) ? p.quotes_film : []
  const subtotal = quotes.reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0)
  const honorPerc = Number(p.honorario_perc || 0)
  const honor = subtotal * (honorPerc / 100)
  const total = p.total ?? view.totalGeral ?? subtotal + honor

  // Estilo de impressão para caber 1 página
  // (margens reduzidas, tabelas compactas, watermark)
  const printStyle = useMemo(
    () => `
      @page { size: A4; margin: 10mm; }
      @media print {
        .no-print { display: none !important; }
        .card { break-inside: avoid; }
        .watermark {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-25deg);
          font-size: 68px; font-weight: 700;
          color: rgba(0,0,0,0.06); z-index: 0; pointer-events: none;
          white-space: nowrap;
        }
      }
    `,
    []
  )

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <style>{printStyle}</style>

      {/* Barra de ações */}
      <div className="sticky top-0 z-10 bg-white border-b p-3 flex items-center gap-2 no-print">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button variant="outline" onClick={() => navigate("/")}>
          <Home className="w-4 h-4 mr-2" /> Início
        </Button>
        <div className="ml-auto text-sm text-neutral-600">
          {view.displayId} • {view.type?.toUpperCase()} • {view.status}
        </div>
        <Button className="ml-3" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir / PDF
        </Button>
      </div>

      {/* Watermark */}
      {p.pendente_faturamento && (
        <div className="watermark select-none">CONFIDENCIAL – PENDENTE</div>
      )}

      {/* Cabeçalho corporativo com faixa preta */}
      <div className="px-8 pt-8">
        <div className="rounded-2xl overflow-hidden border card">
          <div className="bg-black text-white p-6 flex items-center justify-between">
            <div>
              <div className="font-bold text-lg">
                WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA
              </div>
              <div className="text-xs opacity-90 mt-1">
                Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP: 04552-030
              </div>
            </div>
            {/* Se tiver um arquivo /logo_we.png no public/, mostramos */}
            <img
              src="/logo_we.png"
              alt="WE"
              className="h-10 w-auto"
              onError={(e) => ((e.currentTarget.style.display = "none"))}
            />
          </div>

          {/* Título + identificação */}
          <div className="p-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-neutral-500">Cliente</div>
              <div className="font-medium">{fmt(p.cliente)}</div>
            </div>
            <div>
              <div className="text-neutral-500">Produto</div>
              <div className="font-medium">{fmt(p.produto)}</div>
            </div>
            <div>
              <div className="text-neutral-500">Mídias</div>
              <div className="font-medium">{fmt(p.midias)}</div>
            </div>
            <div>
              <div className="text-neutral-500">Período</div>
              <div className="font-medium">{fmt(p.periodo)}</div>
            </div>
            <div>
              <div className="text-neutral-500">Território</div>
              <div className="font-medium">{fmt(p.territorio)}</div>
            </div>
            <div>
              <div className="text-neutral-500">Job</div>
              <div className="font-medium">{fmt(p.job)}</div>
            </div>
            {!isAudio && (
              <>
                <div className="col-span-2">
                  <div className="text-neutral-500">Entregáveis</div>
                  <div className="font-medium">
                    {Array.isArray(p.entregaveis) ? p.entregaveis.join(", ") : fmt(p.entregaveis)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-neutral-500">Adaptações de Formatos</div>
                  <div className="font-medium">
                    {Array.isArray(p.formatos) ? p.formatos.join(", ") : fmt(p.formatos)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cotações (maior área para escopo legível) */}
      <div className="px-8 pt-4">
        <div className="rounded-2xl border card overflow-hidden">
          <div className="p-4 font-semibold">Cotações</div>
          <div className="px-4 pb-4">
            <div className="rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr className="[&>th]:text-left [&>th]:py-2 [&>th]:px-3 [&>th]:font-medium text-neutral-600">
                    <th className="w-[18%]">Produtora</th>
                    <th className="w-[52%]">Escopo</th>
                    <th className="w-[15%]" style={{ textAlign: "right" }}>Valor unitário</th>
                    <th className="w-[15%]" style={{ textAlign: "right" }}>Desconto</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.length === 0 ? (
                    <tr>
                      <td className="py-3 px-3 text-neutral-500" colSpan={4}>Sem cotações.</td>
                    </tr>
                  ) : (
                    quotes.map((q) => (
                      <tr key={q.id} className="border-t">
                        <td className="py-3 px-3 align-top">{fmt(q.produtora)}</td>
                        <td className="py-3 px-3 align-top whitespace-pre-line">{fmt(q.escopo)}</td>
                        <td className="py-3 px-3 align-top text-right tabular-nums">{money(q.valor)}</td>
                        <td className="py-3 px-3 align-top text-right tabular-nums">{money(q.desconto || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-neutral-50">
                    <td className="py-2 px-3 font-medium" colSpan={2}>Subtotal</td>
                    <td className="py-2 px-3 text-right tabular-nums" colSpan={2}>{money(subtotal)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 px-3" colSpan={2}>
                      Honorário ({isFinite(honorPerc) ? `${honorPerc}%` : "—"})
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums" colSpan={2}>{money(honor)}</td>
                  </tr>
                  <tr className="border-t bg-neutral-100">
                    <td className="py-2 px-3 font-semibold" colSpan={2}>Total</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold" colSpan={2}>
                      {money(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Destaque de faturamento */}
            {p.pendente_faturamento && (
              <div className="mt-3 inline-flex items-center rounded-md border border-amber-400/50 bg-amber-50 text-amber-700 text-xs px-2 py-1">
                Este orçamento está <b className="mx-1">PENDENTE DE FATURAMENTO</b> e deve ser incluído no próximo faturamento.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Observações / Termos + Rodapé */}
      <div className="px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-4 card">
            <div className="font-semibold mb-2">Observações</div>
            <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">
              <li>Validade do orçamento: 7 dias a partir da emissão.</li>
              <li>Usos e prazos condicionados à aprovação e disponibilidade.</li>
            </ul>
          </div>
          <div className="rounded-2xl border p-4 card">
            <div className="font-semibold mb-2">Termos e Condições</div>
            <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">
              <li>Alterações de escopo podem gerar nova versão.</li>
              <li>Conforme mídias, território e período informados neste orçamento.</li>
            </ul>
          </div>
        </div>

        {/* Rodapé fixo (curto para caber 1 página) */}
        <div className="text-[11px] text-neutral-500 mt-4">
          Documento confidencial da WF/MOTTA. Proibida a divulgação ou reprodução sem autorização. Em caso de dúvida,
          contate o financeiro.
        </div>
      </div>
    </div>
  )
}
