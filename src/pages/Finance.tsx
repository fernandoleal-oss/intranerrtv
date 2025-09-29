import { useEffect, useMemo, useState } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, FileText, Users,
  ChevronLeft, ChevronRight, Printer, Download,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

/* =============================================================================
   DADOS DE AGOSTO (conforme planilha)
   - Total geral: 262.074,26
   - Honorários (agência): 64.335,00
   - Valor fornecedor (repasse): 197.739,26  (= Total - Honorários)
   - Eventos: 15
   - Clientes ativos: 3 (BYD, Bridgstones, Shopee)
   - Totais por cliente (R$):
       BYD .......... 164.734,26
       Bridgstones .. 92.840,00
       Shopee ....... 4.500,00
   Substitua/expanda quando tiver novos meses.
============================================================================= */
type MonthPoint = {
  key: string          // "2025-08"
  label: string        // "Ago/2025"
  fornecedor: number
  honorario: number
  total: number
  eventos: number
  clientesAtivos: number
}

// Agosto/2025 (pode adicionar mais meses aqui)
const monthlyRaw: MonthPoint[] = [
  {
    key: "2025-08",
    label: "Ago/2025",
    fornecedor: 197_739.26,
    honorario: 64_335.0,
    total: 262_074.26,
    eventos: 15,
    clientesAtivos: 3,
  },
]

// Totais por cliente no mês de agosto (Top clientes)
const clientsAugust = [
  { cliente: "BYD", total: 164_734.26, honorario: 51_395.0, eventos: 9 }, // eventos simulados
  { cliente: "Bridgstones", total: 92_840.0, honorario: 8_440.0, eventos: 5 },
  { cliente: "Shopee", total: 4_500.0, honorario: 4_500.0, eventos: 1 },
]

// Para o “pizza”, aproveitamos a distribuição por cliente
const pieFromClients = clientsAugust.map((c, i) => ({
  name: c.cliente,
  value: c.total,
  color:
    [
      "hsl(var(--primary))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ][i % 5],
}))

/* =============================================================================
   HELPERS
============================================================================= */
type Granularity = "monthly" | "quarterly" | "semiannual" | "annual"
type PeriodPoint = {
  label: string
  keySpan: string[]      // chaves dos meses cobertos (p/ buscar eventos/clientes)
  fornecedor: number
  honorario: number
  total: number
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0)

const pctDelta = (curr?: number, prev?: number) => {
  if (prev == null || prev === 0 || curr == null) return null
  return ((curr - prev) / prev) * 100
}

const monthIdx = (key: string) => {
  // key: "YYYY-MM"
  const m = Number(key.slice(5, 7))
  return m - 1 // 0..11
}

const monthShort = (i: number) =>
  ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i]

/** Agrega os meses conforme granularidade. Funciona mesmo com 1 mês apenas. */
function aggregateByGranularity(data: MonthPoint[], granularity: Granularity): PeriodPoint[] {
  if (!data?.length) return []

  // agrupar por ano
  const byYear: Record<string, MonthPoint[]> = {}
  data.forEach((m) => {
    const y = m.key.slice(0, 4)
    byYear[y] = byYear[y] || []
    byYear[y].push(m)
  })
  // ordena por mês dentro do ano
  Object.values(byYear).forEach((arr) =>
    arr.sort((a, b) => monthIdx(a.key) - monthIdx(b.key))
  )

  const res: PeriodPoint[] = []

  Object.entries(byYear).forEach(([year, arr]) => {
    const firstIdx = monthIdx(arr[0].key)
    const lastIdx = monthIdx(arr[arr.length - 1].key)

    const pushSlice = (label: string, keys: string[]) => {
      const slice = arr.filter((m) => keys.includes(m.key))
      if (!slice.length) return
      res.push({
        label,
        keySpan: slice.map((s) => s.key),
        fornecedor: slice.reduce((a, b) => a + b.fornecedor, 0),
        honorario: slice.reduce((a, b) => a + b.honorario, 0),
        total: slice.reduce((a, b) => a + b.total, 0),
      })
    }

    if (granularity === "monthly") {
      arr.forEach((m) =>
        pushSlice(`${monthShort(monthIdx(m.key))}/${year}`, [m.key])
      )
      return
    }

    if (granularity === "quarterly") {
      // T1 (Jan–Mar) ... T4 (Out–Dez)
      const quarters = [
        { label: `T1/${year} (Jan–Mar)`, months: [0, 1, 2] },
        { label: `T2/${year} (Abr–Jun)`, months: [3, 4, 5] },
        { label: `T3/${year} (Jul–Set)`, months: [6, 7, 8] },
        { label: `T4/${year} (Out–Dez)`, months: [9, 10, 11] },
      ]
      quarters.forEach((q) =>
        pushSlice(
          q.label,
          arr.filter((m) => q.months.includes(monthIdx(m.key))).map((m) => m.key)
        )
      )
      return
    }

    if (granularity === "semiannual") {
      const semis = [
        { label: `S1/${year} (Jan–Jun)`, months: [0, 1, 2, 3, 4, 5] },
        { label: `S2/${year} (Jul–Dez)`, months: [6, 7, 8, 9, 10, 11] },
      ]
      semis.forEach((s) =>
        pushSlice(
          s.label,
          arr.filter((m) => s.months.includes(monthIdx(m.key))).map((m) => m.key)
        )
      )
      return
    }

    // annual
    pushSlice(`Ano ${year}`, arr.map((m) => m.key))
  })

  return res
}

/* =============================================================================
   KPI CARD
============================================================================= */
function KpiCard({
  label, value, prevValue, icon, currency = true, highlight = false,
}: {
  label: string
  value: number | string
  prevValue?: number
  icon: React.ReactNode
  currency?: boolean
  highlight?: boolean
}) {
  const delta = typeof value === "number" ? pctDelta(value, prevValue) : null
  const positive = (delta ?? 0) >= 0

  return (
    <Card className={highlight ? "border-primary/30" : "glass-effect"}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${highlight ? "text-primary" : ""}`}>
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>
          {typeof value === "number" && currency ? formatCurrency(value) : value}
        </div>
        {delta !== null ? (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {positive ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            {`${positive ? "+" : ""}${Math.abs(delta).toFixed(1)}% vs período anterior`}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-1">—</div>
        )}
      </CardContent>
    </Card>
  )
}

/* =============================================================================
   PÁGINA
============================================================================= */
export default function Finance() {
  const [year, setYear] = useState("2025")
  const [granularity, setGranularity] = useState<Granularity>("monthly")
  const [periodIdx, setPeriodIdx] = useState(0)
  const [comparePrev, setComparePrev] = useState(true)

  // Série agregada conforme granularidade
  const series = useMemo(
    () => aggregateByGranularity(monthlyRaw, granularity),
    [granularity]
  )

  // Clamp seguro do índice quando a granularidade muda
  useEffect(() => {
    setPeriodIdx((i) => Math.min(Math.max(0, i), Math.max(0, series.length - 1)))
  }, [series.length])

  const period = series[periodIdx]        // período atual
  const prev = series[periodIdx - 1]      // período anterior (pode não existir)

  // KPIs (eventos/clientes: somatório dos meses do span)
  const spanMonths = monthlyRaw.filter((m) => period?.keySpan.includes(m.key))
  const eventosCount = spanMonths.reduce((a, b) => a + (b.eventos || 0), 0)
  const clientesAtivos = Math.max(
    ...spanMonths.map((m) => m.clientesAtivos || 0),
    0
  )
  const ticketMedio = period ? (period.total || 0) / Math.max(1, eventosCount) : 0
  const margemPct = period?.total ? Math.round(((period.honorario || 0) / period.total) * 100) : 0

  // Dataset comparativo (gráfico de barras)
  const compareData = useMemo(
    () => [
      { metric: "Total", atual: period?.total || 0, anterior: prev?.total || 0 },
      { metric: "Fornecedor", atual: period?.fornecedor || 0, anterior: prev?.fornecedor || 0 },
      { metric: "Honorário", atual: period?.honorario || 0, anterior: prev?.honorario || 0 },
    ],
    [period, prev]
  )

  const periodLabels = series.map((s) => s.label)
  const goPrev = () => setPeriodIdx((i) => Math.max(0, i - 1))
  const goNext = () => setPeriodIdx((i) => Math.min(series.length - 1, i + 1))

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Barra de filtros (sticky) */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-3 mb-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Relatórios Financeiros</h1>
            <p className="text-muted-foreground">Análise de faturamento e honorários</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Granularidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="semiannual">Semestral</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goPrev} disabled={periodIdx === 0} aria-label="Período anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Select value={period?.label} onValueChange={(v) => setPeriodIdx(Math.max(0, periodLabels.indexOf(v)))}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {periodLabels.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={goNext} disabled={periodIdx === series.length - 1} aria-label="Próximo período">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 pl-2">
              <Switch id="comparePrev" checked={comparePrev} onCheckedChange={setComparePrev} />
              <label htmlFor="comparePrev" className="text-sm">Comparar com período anterior</label>
            </div>

            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const rows = [
                  ["Período", period?.label ?? "-"],
                  ["Total", period?.total ?? 0],
                  ["Fornecedor", period?.fornecedor ?? 0],
                  ["Honorários", period?.honorario ?? 0],
                  ["Margem (%)", margemPct],
                  ["Eventos", eventosCount],
                  ["Clientes ativos", clientesAtivos],
                ]
                const csv = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(";")).join("\n")
                const a = document.createElement("a")
                a.href = encodeURI(csv)
                a.download = `relatorio_${period?.label}_${year}.csv`
                a.click()
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Valor Fornecedor"
          value={period?.fornecedor || 0}
          prevValue={prev?.fornecedor}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Honorários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(period?.honorario || 0)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
              <Badge variant="secondary" className="text-xs">{margemPct}% média</Badge>
              {prev ? (
                pctDelta(period?.honorario, prev.honorario)! >= 0 ? (
                  <span className="flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    {`${pctDelta(period?.honorario, prev.honorario)!.toFixed(1)}%`}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                    {`${Math.abs(pctDelta(period?.honorario, prev.honorario)!).toFixed(1)}%`}
                  </span>
                )
              ) : <span>—</span>}
            </div>
          </CardContent>
        </Card>

        <KpiCard
          label="Total Geral"
          value={period?.total || 0}
          prevValue={prev?.total}
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          highlight
        />

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventosCount}</div>
            <div className="text-xs text-muted-foreground mt-1">no período</div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Clientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientesAtivos}</div>
            <div className="text-xs text-muted-foreground mt-1">neste período</div>
          </CardContent>
        </Card>

        <KpiCard
          label="Ticket Médio"
          value={ticketMedio}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Tendência (mostra todos os períodos disponíveis) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>
              Evolução por {granularity === "monthly" ? "mês" : granularity === "quarterly" ? "trimestre" : granularity === "semiannual" ? "semestre" : "ano"}
            </CardTitle>
            <CardDescription>Faturamento e honorários agregados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="fornecedor" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Fornecedor" />
                <Line type="monotone" dataKey="honorario" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Honorário" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparativo período atual x anterior */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Comparativo {period?.label}{prev ? ` × ${prev.label}` : ""}</CardTitle>
            <CardDescription>Total, fornecedor e honorários</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="atual" name="Período atual" fill="hsl(var(--primary))" />
                {comparePrev && <Bar dataKey="anterior" name="Período anterior" fill="hsl(var(--chart-2))" />}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Cliente (pizza) */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Distribuição por Cliente</CardTitle>
          <CardDescription>Participação no faturamento do período</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieFromClients}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={110}
                dataKey="value"
              >
                {pieFromClients.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Listas */}
      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Por Cliente</TabsTrigger>
          <TabsTrigger value="suppliers" disabled>Por Fornecedor (em breve)</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Clientes do período</CardTitle>
              <CardDescription>Totais e honorários</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientsAugust.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{item.cliente}</div>
                        <div className="text-sm text-muted-foreground">{item.eventos} eventos</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(item.total)}</div>
                      <div className="text-sm text-muted-foreground">Hon: {formatCurrency(item.honorario)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
