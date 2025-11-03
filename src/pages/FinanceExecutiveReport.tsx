import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Lightbulb } from 'lucide-react'

interface FinanceEvent {
  id: string
  ref_month: string
  cliente: string
  fornecedor: string | null
  total_cents: number
  valor_fornecedor_cents: number
  honorario_agencia_cents: number
}

interface MonthlyData {
  month: string
  total: number
  count: number
  monalisaTotal: number
}

interface SupplierData {
  name: string
  total: number
  percentage: number
  count: number
}

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

const formatMonth = (dateStr: string) => {
  const [year, month] = dateStr.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[parseInt(month) - 1]}/${year.slice(-2)}`
}

export default function FinanceExecutiveReport() {
  const [events, setEvents] = useState<FinanceEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('finance_events')
        .select('*')
        .order('ref_month', { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Carregando dados financeiros...</div>
        </div>
      </AppLayout>
    )
  }

  // Calcular métricas principais
  const totalInvestido = events.reduce((sum, e) => sum + e.total_cents, 0)
  const suppliersSet = new Set(events.filter(e => e.fornecedor).map(e => e.fornecedor))
  const totalFornecedores = suppliersSet.size

  // Agrupar por mês
  const monthlyMap = new Map<string, MonthlyData>()
  events.forEach(e => {
    const month = e.ref_month
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { month, total: 0, count: 0, monalisaTotal: 0 })
    }
    const data = monthlyMap.get(month)!
    data.total += e.total_cents
    data.count += 1
    if (e.fornecedor?.toUpperCase().includes('MONALISA') || e.fornecedor?.toUpperCase().includes('MONA LISA')) {
      data.monalisaTotal += e.total_cents
    }
  })

  const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))
  
  const maxMonth = monthlyData.reduce((max, curr) => curr.total > max.total ? curr : max, monthlyData[0])
  
  // Calcular crescimento médio
  const growthRates: number[] = []
  for (let i = 1; i < monthlyData.length; i++) {
    const prev = monthlyData[i - 1].total
    const curr = monthlyData[i].total
    if (prev > 0) {
      growthRates.push(((curr - prev) / prev) * 100)
    }
  }
  const avgGrowth = growthRates.length > 0 ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0

  // Dados MONALISA STUDIO
  const monalisaEvents = events.filter(e => 
    e.fornecedor?.toUpperCase().includes('MONALISA') || 
    e.fornecedor?.toUpperCase().includes('MONA LISA')
  )
  const monalisaTotal = monalisaEvents.reduce((sum, e) => sum + e.total_cents, 0)
  const monalisaPercentage = totalInvestido > 0 ? (monalisaTotal / totalInvestido) * 100 : 0
  const monalisaCount = monalisaEvents.length
  const monalisaTicket = monalisaCount > 0 ? monalisaTotal / monalisaCount : 0

  // Evolução mensal Monalisa
  const monalisaMonthlyData = monthlyData.map(m => ({
    month: formatMonth(m.month),
    valor: m.monalisaTotal / 100
  })).filter(m => m.valor > 0)

  // Top 5 fornecedores
  const supplierMap = new Map<string, SupplierData>()
  events.forEach(e => {
    if (!e.fornecedor) return
    const name = e.fornecedor
    if (!supplierMap.has(name)) {
      supplierMap.set(name, { name, total: 0, percentage: 0, count: 0 })
    }
    const data = supplierMap.get(name)!
    data.total += e.total_cents
    data.count += 1
  })

  const topSuppliers = Array.from(supplierMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(s => ({
      ...s,
      percentage: totalInvestido > 0 ? (s.total / totalInvestido) * 100 : 0
    }))

  const pieData = topSuppliers.map(s => ({
    name: s.name,
    value: s.total / 100
  }))

  // Insights estratégicos
  const insights = [
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: 'Crescimento Sustentável',
      text: avgGrowth > 0 
        ? `Crescimento médio mensal de ${avgGrowth.toFixed(1)}% indica tendência positiva ↗`
        : 'Diversificação de fornecedores recomendada para mitigar riscos'
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      title: 'Concentração de Investimento',
      text: monalisaPercentage > 20
        ? `Monalisa Studio representa ${monalisaPercentage.toFixed(1)}% do investimento - considere diversificação 🎯`
        : 'Boa distribuição de investimentos entre fornecedores'
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      title: 'Sazonalidade',
      text: `${formatMonth(maxMonth.month)} foi o mês de maior investimento (${formatCurrency(maxMonth.total)}) - planeje recursos com antecedência 📊`
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Relacionamento com Fornecedores',
      text: `${totalFornecedores} fornecedores ativos - mantenha relacionamentos estratégicos com top performers 🤝`
    }
  ]

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            📊 Relatório Executivo Financeiro
          </h1>
          <p className="text-muted-foreground">Análise completa de investimentos e desempenho</p>
        </div>

        {/* 1. MÉTRICAS PRINCIPAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{formatCurrency(totalInvestido)}</div>
              <p className="text-xs text-muted-foreground mt-1">Período completo</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fornecedores Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{totalFornecedores}</div>
              <p className="text-xs text-muted-foreground mt-1">Parceiros estratégicos</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mês de Maior Investimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatMonth(maxMonth.month)}</div>
              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(maxMonth.total)}</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Crescimento Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold flex items-center gap-2 ${avgGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {avgGrowth >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                {avgGrowth >= 0 ? '+' : ''}{avgGrowth.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Por mês</p>
            </CardContent>
          </Card>
        </div>

        {/* 2. DESTAQUE MONALISA STUDIO */}
        <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              🎬 Destaque: Monalisa Studio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-background/80 p-4 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Total Investido</div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(monalisaTotal)}</div>
                <div className="text-xs text-muted-foreground mt-1">{monalisaPercentage.toFixed(1)}% do total</div>
              </div>
              <div className="bg-background/80 p-4 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Projetos/Notas</div>
                <div className="text-2xl font-bold text-primary">{monalisaCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Transações</div>
              </div>
              <div className="bg-background/80 p-4 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Ticket Médio</div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(monalisaTicket)}</div>
                <div className="text-xs text-muted-foreground mt-1">Por projeto</div>
              </div>
              <div className="bg-background/80 p-4 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Participação</div>
                <div className="text-2xl font-bold text-primary">{monalisaPercentage.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground mt-1">Do investimento</div>
              </div>
            </div>

            {monalisaMonthlyData.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">📈 Evolução Mês a Mês</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monalisaMonthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis 
                      className="text-xs"
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="valor" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. COMPARATIVO FORNECEDORES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">🏆 Top 5 Fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topSuppliers.map((supplier, idx) => (
                  <div key={supplier.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        idx === 0 ? 'bg-yellow-500 text-yellow-950' :
                        idx === 1 ? 'bg-gray-400 text-gray-950' :
                        idx === 2 ? 'bg-amber-600 text-amber-950' :
                        'bg-primary/20 text-primary'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{supplier.name}</div>
                        <div className="text-xs text-muted-foreground">{supplier.count} projetos</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{formatCurrency(supplier.total)}</div>
                      <div className="text-xs text-muted-foreground">{supplier.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">📊 Distribuição de Investimento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name.split(' ')[0]} (${((entry.value / pieData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 4. EVOLUÇÃO MENSAL */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">📅 Evolução Mensal do Investimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData.map(m => ({
                month: formatMonth(m.month),
                valor: m.total / 100,
                projetos: m.count
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis 
                  className="text-xs"
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'valor' ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : value,
                    name === 'valor' ? 'Valor Total' : 'Projetos'
                  ]}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                <Bar dataKey="projetos" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {monthlyData.slice(-4).map(m => (
                <div key={m.month} className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">{formatMonth(m.month)}</div>
                  <div className="text-lg font-bold text-primary">{formatCurrency(m.total)}</div>
                  <div className="text-xs text-muted-foreground">{m.count} projetos</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 5. INSIGHTS ESTRATÉGICOS */}
        <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-primary" />
              Insights Estratégicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, idx) => (
                <div key={idx} className="p-4 bg-background border border-primary/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    {insight.icon}
                    <h3 className="font-semibold">{insight.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
