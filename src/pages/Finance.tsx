import { useMemo, useState } from "react"
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

/* ============================================================
   MOCK DATA (mesmos seus dados). Cada item representa UM MÊS.
   Índices 0..5 => Jan..Jun. Se depois vier Jul..Dez, agregação já funciona.
============================================================ */
const monthlyData = [
  { month: "Jan", fornecedor: 145000, honorario: 21750, total: 166750 },
  { month: "Fev", fornecedor: 178000, honorario: 26700, total: 204700 },
  { month: "Mar", fornecedor: 162000, honorario: 24300, total: 186300 },
  { month: "Abr", fornecedor: 198000, honorario: 29700, total: 227700 },
  { month: "Mai", fornecedor: 185000, honorario: 27750, total: 212750 },
  { month: "Jun", fornecedor: 205000, honorario: 30750, total: 235750 },
]

const clientData = [
  { cliente: "Ambev", total: 380000, honorario: 57000, eventos: 12 },
  { cliente: "Coca-Cola", total: 295000, honorario: 44250, eventos: 8 },
  { cliente: "Nestlé", total: 215000, honorario: 32250, eventos: 6 },
  { cliente: "Unilever", total: 178000, honorario: 26700, eventos: 5 },
  { cliente: "P&G", total: 142000, honorario: 21300, eventos: 4 },
]

const supplierData = [
  { fornecedor: "Produtora Alpha", total: 285000, eventos: 8 },
  { fornecedor: "Estúdio Beta", total: 245000, eventos: 6 },
  { fornecedor: "Locação Gamma", total: 198000, eventos: 12 },
  { fornecedor: "Áudio Delta", total: 165000, eventos: 7 },
  { fornecedor: "Pós Epsilon", total: 142000, eventos: 5 },
]

const pieData = [
  { name: "Produção", value: 45, color: "hsl(var(--primary))" },
  { name: "Pós-produção", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Locação", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Outros", value: 10, color: "hsl(var(--chart-4))" },
]

/* ============================================================
   HELPERS
============================================================ */
type Granularity = "monthly" | "quarterly" | "semiannual" | "annual"
type PeriodPoint = { label: string; fornecedor: number; honorario: number; total: number; startIdx: number; endIdx: number }

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0)

const pctDelta = (curr?: number, prev?: number) => {
  if (prev == null || prev === 0 || curr == null) return null
  return ((curr - prev) / prev) * 100
}

/** Divide o ano em grupos conforme granularidade e soma os meses disponíveis. */
function aggregateByGranularity(data: typeof monthlyData, granularity: Granularity): PeriodPoint[] {
  if (!data?.length) return []

  const lastIndex = data.length - 1
  const pushSum = (label: string, startIdx: number, endIdx: number, list: PeriodPoint[]) => {
    const slice = data.slice(startIdx, Math.min(endIdx, lastIndex) + 1)
    if (!slice.length) return
    const fornecedor = slice.reduce((a, b) => a + (b.fornecedor || 0), 0)
    const honorario = slice.reduce((a, b) => a + (b.honorario || 0), 0)
    const total = slice.reduce((a, b) => a + (b.total || 0), 0)
    list.push({ label, fornecedor, honorario, total, startIdx, endIdx: Math.min(endIdx, lastIndex) })
  }

  const result: PeriodPoint[] = []

  if (granularity === "monthly") {
    data.forEach((m, i) =>
      result.push({ label: m.month, fornecedor: m.fornecedor, honorario: m.honorario, total: m.total, startIdx: i, endIdx: i })
    )
    return result
  }

  if (granularity === "quarterly") {
    // T1: 0-2, T2: 3-5, T3: 6-8, T4: 9-11  (usamos apenas o que existir)
    pushSum("T1", 0, 2, result)
    pushSum("T2", 3, 5, result)
    pushSum("T3", 6, 8, result)
    pushSum("T4", 9, 11, result)
    return result
  }

  if (granularity === "semiannual") {
    // S1: 0-5, S2: 6-11
    pushSum("S1", 0, 5, result)
    pushSum("S2", 6, 11, result)
    return result
  }

  // annual
  pushSum("Anual", 0, 11, result)
  return result
}

/* ============================================================
   KPI Card (reutilizável)
============================================================ */
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
        <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""} leading-tight`}>
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

/* ============================================================
   PAGE
============================================================ */
export default function Finance() {
  const [year, setYear] = useState("2024")
  const [granularity, setGranularity] = useState<Granularity>("monthly")
  const [periodIdx, setPeriodIdx] = useState(aggregateByGranularity(monthlyData, "monthly").length - 1)
  const [comparePrev, setComparePrev] = useState(true)

  // Série agregada conforme granularidade
  const series = useMemo(() => aggregateByGranularity(monthlyData, granularity), [granularity])
  const period = series[periodIdx] // atual
  const prev = series[periodIdx - 1] // anterior (pode ser undefined)

  // Garantir que o índice sempre é válido ao trocar granularidade
  if (periodIdx > series.length - 1) setPeriodIdx(series.length - 1)

  // KPIs do período selecionado (notar que eventos/cliente são mocks)
  const eventosCount = clientData.reduce((a, b) => a + (b.eventos || 0), 0)
  const clientesAtivos = clientData.length
  const ticketMedio = period ? (period.total || 0) / Math.max(1, eventosCount) : 0
  const margemPct = period?.total ? Math.round(((period.honorario || 0) / period.total) * 100) : 0

  // Dataset comparativo para o gráfico de barras
  const compareData = useMemo(
    () => [
      { metric: "Total", atual: period?.total || 0, anterior: prev?.total || 0 },
      { metric: "Fornecedor", atual: period?.fornecedor || 0, anterior: prev?.fornecedor || 0 },
      { metric: "Honorário", atual: period?.honorario || 0, anterior: prev?.honorario || 0 },
    ],
    [period, prev]
  )

  const goPrev = () => setPeriodIdx((i) => Math.max(0, i - 1))
  const goNext = () => setPeriodIdx((i) => Math.min(series.length - 1, i + 1))

  // Labels de período para o select central
  const periodLabels = series.map((s) => s.label)

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Barra de filtros */}
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
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>

            {/* Navegação de período (adapta o label) */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goPrev} disabled={periodIdx === 0} aria-label="Período anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Select value={period?.label} onValueChange={(v) => setPeriodIdx(Math.max(0, periodLabels.indexOf(v)))}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {periodLabels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={goNext}
                disabled={periodIdx === series.length - 1}
                aria-label="Próximo período"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 pl-2">
              <Switch id="comparePrev" checked={comparePrev} onCheckedChange={setComparePrev} />
              <label htmlFor="comparePrev" className="text-sm">
                Comparar com período anterior
              </label>
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

      {/* KPIs do período selecionado */}
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
              ) : (
                <span>—</span>
              )}
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
            <div className="text-xs text-muted-foreground mt-1">no período (mock)</div>
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
            <div className="text-xs text-muted-foreground mt-1">neste período (mock)</div>
          </CardContent>
        </Card>

        <KpiCard
          label="Ticket Médio"
          value={ticketMedio}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Gráficos de tendência (sempre mostramos a série do ano conforme granularidade) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Evolução por {granularity === "monthly" ? "mês" : granularity === "quarterly" ? "trimestre" : granularity === "semiannual" ? "semestre" : "ano"}</CardTitle>
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

      {/* Distribuição por categoria */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Distribuição por Categoria</CardTitle>
          <CardDescription>Gastos por tipo de serviço</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={110}
                dataKey="value"
              >
                {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
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
          <TabsTrigger value="suppliers">Por Fornecedor</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Top 5 Clientes</CardTitle>
              <CardDescription>Maiores faturamentos do período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientData.map((item, idx) => (
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

        <TabsContent value="suppliers">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Top 5 Fornecedores</CardTitle>
              <CardDescription>Maiores valores pagos no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{item.fornecedor}</div>
                        <div className="text-sm text-muted-foreground">{item.eventos} eventos</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(item.total)}</div>
                      <div className="text-sm text-muted-foreground">
                        Ticket: {formatCurrency(item.total / Math.max(1, item.eventos))}
                      </div>
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
