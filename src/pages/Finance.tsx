import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileText, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Dados fictícios
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

export default function Finance() {
  const [period, setPeriod] = useState("2024")
  const [view, setView] = useState<"monthly" | "annual">("monthly")

  const kpis = {
    totalFornecedor: 1073000,
    totalHonorario: 160950,
    totalGeral: 1233950,
    avgHonorario: 15,
    eventosCount: 35,
    clientesAtivos: 12,
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios Financeiros</h1>
          <p className="text-muted-foreground">Análise de faturamento e honorários</p>
        </div>
        <div className="flex gap-3">
          <Select value={view} onValueChange={(v) => setView(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Valor Fornecedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalFornecedor)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +12.5% vs. período anterior
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Honorários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalHonorario)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Badge variant="secondary" className="text-xs">{kpis.avgHonorario}% média</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(kpis.totalGeral)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +15.2% vs. período anterior
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.eventosCount}</div>
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
            <div className="text-2xl font-bold">{kpis.clientesAtivos}</div>
            <div className="text-xs text-muted-foreground mt-1">neste período</div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalGeral / kpis.eventosCount)}</div>
            <div className="text-xs text-muted-foreground mt-1">por evento</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência Mensal */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
            <CardDescription>Faturamento e honorários por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Total"
                />
                <Line
                  type="monotone"
                  dataKey="fornecedor"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Fornecedor"
                />
                <Line
                  type="monotone"
                  dataKey="honorario"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  name="Honorário"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Categoria */}
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
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
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
                      <div className="text-sm text-muted-foreground">
                        Hon: {formatCurrency(item.honorario)}
                      </div>
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
                        Ticket: {formatCurrency(item.total / item.eventos)}
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
