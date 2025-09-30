import { useMemo, useState } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts"
import { ChevronLeft, ChevronRight, Printer, Download, CalendarDays } from "lucide-react"

/** =============================================================================
 *  DADOS FIXOS (extraídos dos anexos enviados)
 *  Agosto/2025: total, jobs e clientes (e totais por cliente) -> anexo Agosto
 *  Setembro/2025: total, jobs e clientes -> anexo Setembro
 *  (Quando não houver detalhamento por cliente em um mês, a seção fica oculta)
 *  ========================================================================== */

// Série mensal mínima para os gráficos e comparação
type MonthRow = {
  key: string       // "YYYY-MM"
  label: string     // "Ago/2025"
  total: number     // Valor total de faturamento
  jobs: number      // Total de jobs faturados
  clientes: number  // Clientes atendidos
  // detalhamento por cliente (opcional por mês)
  clientsBreakdown?: Array<{ cliente: string; total: number }>
}

// Agosto/2025 (valores do anexo)
const AUG_2025: MonthRow = {
  key: "2025-08",
  label: "Ago/2025",
  total: 262_074.26,
  jobs: 15,
  clientes: 3,
  clientsBreakdown: [
    { cliente: "BYD",         total: 164_734.26 },
    { cliente: "Bridgestones", total: 92_840.00 },
    { cliente: "Shopee",       total:   4_500.00 },
  ],
}

// Setembro/2025 (valores do anexo)
const SEP_2025: MonthRow = {
  key: "2025-09",
  label: "Set/2025",
  total: 2_053_792.51,
  jobs: 42,
  clientes: 8,
  // (sem quadro consolidado por cliente no anexo fornecido)
}

const MONTHS: MonthRow[] = [AUG_2025, SEP_2025]

/** =============================================================================
 *  HELPERS
 *  ========================================================================== */
const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0)

const pctDelta = (curr?: number, prev?: number) => {
  if (prev == null || prev === 0 || curr == null) return null
  return ((curr - prev) / prev) * 100
}

/** =============================================================================
 *  COMPONENTE
 *  ========================================================================== */
export default function Finance() {
  const [selectedKey, setSelectedKey] = useState<string>(MONTHS[MONTHS.length - 1].key) // começa no último mês (Set/2025)

  const idx = MONTHS.findIndex(m => m.key === selectedKey)
  const current = MONTHS[idx]
  const prev = idx > 0 ? MONTHS[idx - 1] : undefined

  // dataset para evolução mensal (linha) – só "total" porque é o que há nos anexos
  const trendData = useMemo(
    () => MONTHS.map(m => ({ label: m.label, total: m.total })),
    []
  )

  // dataset para comparativo atual x anterior (barras)
  const compareData = useMemo(() => ([
    { metric: "Total faturado", atual: current?.total ?? 0, anterior: prev?.total ?? 0 },
    { metric: "Jobs",           atual: current?.jobs ?? 0,  anterior: prev?.jobs ?? 0  },
    { metric: "Clientes",       atual: current?.clientes ?? 0, anterior: prev?.clientes ?? 0 },
  ]), [current, prev])

  const deltaTotal = pctDelta(current?.total, prev?.total)
  const deltaJobs = pctDelta(current?.jobs, prev?.jobs)
  const deltaClientes = pctDelta(current?.clientes, prev?.clientes)

  const goPrev = () => setSelectedKey(MONTHS[Math.max(0, idx - 1)].key)
  const goNext = () => setSelectedKey(MONTHS[Math.min(MONTHS.length - 1, idx + 1)].key)

  const handleExportCsv = () => {
    const rows: Array<[string, string]> = [
      ["Período", current?.label ?? "-"],
      ["Total faturado", formatBRL(current?.total ?? 0)],
      ["Total de jobs", String(current?.jobs ?? 0)],
      ["Clientes atendidos", String(current?.clientes ?? 0)],
    ]
    if (current?.clientsBreakdown?.length) {
      rows.push(["", ""])
      rows.push(["Clientes (quadro do anexo)", ""])
      current.clientsBreakdown.forEach(c => rows.push([c.cliente, formatBRL(c.total)]))
    }

    const csv = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(";")).join("\n")
    const a = document.createElement("a")
    a.href = encodeURI(csv)
    a.download = `relatorio_financeiro_${current?.key}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Cabeçalho corporativo (igual ao do orçamento) */}
      <div className="w-full bg-black text-white print:text-black print:bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5 print:px-0">
          <div className="flex items-center gap-4">
            {/* Ajuste o caminho do logo conforme o seu projeto */}
            <div className="h-10 w-32 bg-white flex items-center justify-center">
              <img
                src="/Logo_WE.png"
                alt="WE"
                className="h-8 object-contain"
              />
            </div>
            <div className="text-sm leading-tight">
              <div className="font-semibold">WF/MOTTA COMUNICACAO, MARKETING E PUBLICIDADE LTDA</div>
              <div>CNPJ: 05.265.118/0001-65</div>
              <div>R. Chilon, 381 - Vila Olímpia — São Paulo - SP, 04552-030</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
            </Button>
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Barra de controle */}
      <div className="max-w-6xl mx-auto px-6 py-6 print:px-0">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 md:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Relatório de Faturamento</h1>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="icon" onClick={goPrev} disabled={idx === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={goNext} disabled={idx === MONTHS.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPIs – somente os itens do anexo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Valor total de faturamento</CardTitle>
              <CardDescription>{current?.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatBRL(current?.total ?? 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {deltaTotal == null ? "—" : `${deltaTotal >= 0 ? "+" : ""}${deltaTotal.toFixed(1)}% vs mês anterior`}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de jobs faturados</CardTitle>
              <CardDescription>{current?.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{current?.jobs ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {deltaJobs == null ? "—" : `${deltaJobs >= 0 ? "+" : ""}${deltaJobs.toFixed(1)}% vs mês anterior`}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clientes atendidos</CardTitle>
              <CardDescription>{current?.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{current?.clientes ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {deltaClientes == null ? "—" : `${deltaClientes >= 0 ? "+" : ""}${deltaClientes.toFixed(1)}% vs mês anterior`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evolução mensal (somente Total, porque é o que existe nos anexos) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Evolução mensal (Total faturado)</CardTitle>
              <CardDescription>Valores consolidados por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => formatBRL(v)}
                  />
                  <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Comparativo mês atual x anterior */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Comparativo {current?.label}{prev ? ` × ${prev.label}` : ""}</CardTitle>
              <CardDescription>Total, Jobs e Clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={compareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v: number, n: string) =>
                      n === "atual" || n === "anterior"
                        ? typeof v === "number"
                          ? v > 999 ? formatBRL(v) : String(v)
                          : String(v)
                        : String(v)
                    }
                  />
                  <Legend />
                  <Bar dataKey="atual" name="Período atual" fill="hsl(var(--primary))" />
                  <Bar dataKey="anterior" name="Período anterior" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quadro por cliente (aparece somente quando o mês tem esse dado no anexo) */}
        {current?.clientsBreakdown?.length ? (
          <Card className="glass-effect mt-6">
            <CardHeader>
              <CardTitle>Por cliente — {current.label}</CardTitle>
              <CardDescription>Totais exatamente como no anexo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border rounded-lg border">
                {current.clientsBreakdown.map((c) => (
                  <div key={c.cliente} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 hover:bg-muted/40 transition">
                    <div className="font-medium">{c.cliente}</div>
                    <div className="text-right">{formatBRL(c.total)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-effect mt-6">
            <CardHeader>
              <CardTitle>Por cliente</CardTitle>
              <CardDescription>O anexo deste mês não trouxe a tabela consolidada por cliente.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Rodapé de impressão: data de emissão e referência */}
        <div className="text-xs text-muted-foreground mt-6 pb-8 print:pb-0">
          Relatório gerado para uso interno. Fonte: planilhas/fluxos enviados (valores tomados exatamente dos anexos).
        </div>
      </div>
    </div>
  )
}
