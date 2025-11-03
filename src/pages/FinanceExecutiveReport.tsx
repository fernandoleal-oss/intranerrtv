import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, DollarSign, Package, Building2 } from 'lucide-react'

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

  // Todos os fornecedores
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

  // Top 10 fornecedores (não apenas top 5)
  const allSuppliers = Array.from(supplierMap.values())
    .sort((a, b) => b.total - a.total)
    .map(s => ({
      ...s,
      percentage: totalInvestido > 0 ? (s.total / totalInvestido) * 100 : 0
    }))

  return (
    <AppLayout>
      <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary to-chart-2 bg-clip-text text-transparent">
            📊 Relatório Executivo Financeiro
          </h1>
          <p className="text-lg text-muted-foreground">Análise completa de investimentos e desempenho</p>
        </div>

        {/* MÉTRICAS PRINCIPAIS - Cards Grandes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 border-primary/30 shadow-2xl bg-gradient-to-br from-primary/10 via-background to-background">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold">Total Investido</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-primary mb-2">{formatCurrency(totalInvestido)}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>Período completo analisado</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-chart-2/30 shadow-2xl bg-gradient-to-br from-chart-2/10 via-background to-background">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-chart-2/20">
                  <Building2 className="w-8 h-8 text-chart-2" />
                </div>
                <CardTitle className="text-lg font-semibold">Fornecedores Ativos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-chart-2 mb-2">{totalFornecedores}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>Parceiros estratégicos</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-chart-3/30 shadow-2xl bg-gradient-to-br from-chart-3/10 via-background to-background">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-chart-3/20">
                  <TrendingUp className="w-8 h-8 text-chart-3" />
                </div>
                <CardTitle className="text-lg font-semibold">Crescimento Médio</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-5xl font-bold mb-2 ${avgGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {avgGrowth >= 0 ? '+' : ''}{avgGrowth.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Por mês • Pico: {formatMonth(maxMonth.month)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GRÁFICO DE FATURAMENTO TOTAL - Grande e Destacado */}
        <Card className="border-2 border-primary/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-3">
              📈 Faturamento Total Acumulado
            </CardTitle>
            <p className="text-muted-foreground">Evolução do investimento ao longo do tempo</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={monthlyData.map((m, idx) => {
                const accumulated = monthlyData.slice(0, idx + 1).reduce((sum, month) => sum + month.total, 0)
                return {
                  month: formatMonth(m.month),
                  acumulado: accumulated / 100,
                  mensal: m.total / 100
                }
              })}>
                <defs>
                  <linearGradient id="colorAccumulated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis 
                  dataKey="month" 
                  className="text-sm font-medium"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  className="text-sm font-medium"
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '2px solid hsl(var(--primary))',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="acumulado" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAccumulated)"
                  name="Total Acumulado"
                />
                <Line 
                  type="monotone" 
                  dataKey="mensal" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Mensal"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* FORNECEDORES - Cards Individuais */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              🏢 Faturamento por Fornecedor
            </h2>
            <div className="text-sm text-muted-foreground">
              Total: {allSuppliers.length} fornecedores
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allSuppliers.map((supplier, idx) => {
              const isTop3 = idx < 3
              const borderColor = isTop3 ? 'border-primary/40' : 'border-border'
              const bgGradient = isTop3 
                ? 'bg-gradient-to-br from-primary/5 via-background to-background' 
                : 'bg-background'
              
              return (
                <Card key={supplier.name} className={`${borderColor} shadow-lg ${bgGradient} transition-all hover:shadow-xl hover:scale-[1.02]`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isTop3 && (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            idx === 0 ? 'bg-yellow-500 text-yellow-950' :
                            idx === 1 ? 'bg-gray-400 text-gray-950' :
                            'bg-amber-600 text-amber-950'
                          }`}>
                            {idx + 1}
                          </div>
                        )}
                        <CardTitle className="text-base font-semibold leading-tight">
                          {supplier.name}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="text-3xl font-bold text-primary">
                        {formatCurrency(supplier.total)}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Participação:</span>
                        <span className="font-semibold text-foreground">{supplier.percentage.toFixed(2)}%</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Projetos</span>
                        <span className="font-semibold">{supplier.count}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Ticket Médio</span>
                        <span className="font-semibold">{formatCurrency(supplier.total / supplier.count)}</span>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="space-y-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(supplier.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* GRÁFICO DE BARRAS - Comparativo por Fornecedor */}
        <Card className="border-2 border-chart-2/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-3">
              📊 Comparativo de Fornecedores
            </CardTitle>
            <p className="text-muted-foreground">Top 15 fornecedores por volume investido</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={600}>
              <BarChart 
                data={allSuppliers.slice(0, 15).map(s => ({
                  name: s.name.length > 30 ? s.name.substring(0, 30) + '...' : s.name,
                  valor: s.total / 100,
                  projetos: s.count
                }))}
                layout="vertical"
                margin={{ left: 200, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis 
                  type="number"
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  type="category"
                  dataKey="name" 
                  width={190}
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'valor' 
                      ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                      : `${value} projetos`,
                    name === 'valor' ? 'Valor Total' : 'Projetos'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '2px solid hsl(var(--primary))',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* EVOLUÇÃO MENSAL - Resumo */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">📅 Resumo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {monthlyData.map(m => (
                <div 
                  key={m.month} 
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                    m.month === maxMonth.month 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="text-xs font-semibold text-muted-foreground mb-1">
                    {formatMonth(m.month)}
                  </div>
                  <div className="text-xl font-bold text-primary mb-1">
                    {formatCurrency(m.total)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.count} projetos
                  </div>
                  {m.month === maxMonth.month && (
                    <div className="text-xs font-semibold text-primary mt-1">
                      🏆 Maior mês
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
