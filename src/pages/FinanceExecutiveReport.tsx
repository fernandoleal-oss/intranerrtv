import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, DollarSign, Package, Building2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

// Dados consolidados do PDF
const consolidatedData = [
  { name: 'MONALISA STUDIO LTDA', total: 97639478 },
  { name: 'SUBSOUND AUDIO PRODUÇÕES LTDA', total: 59100000 },
  { name: 'O2 FILMES PUBLICITARIOS LTDA', total: 76116600 },
  { name: 'STINK SP PRODUCAO DE FILMES LTDA', total: 41495000 },
  { name: 'TRUST DESIGN MULTIMIDIA S/S LTDA', total: 29980000 },
  { name: 'MELLODIA FILMES E PRODUÇÕES EIRELLI', total: 27500000 },
  { name: 'CINE CINEMATOGRÁFICA LTDA', total: 19273200 },
  { name: 'PALMA EVENTOS E PRODUÇÕES CULTURAIS', total: 6600000 },
  { name: 'CANJA PRODUÇÕES MUSICAIS LTDA-ME', total: 7300000 },
  { name: 'ANTFOOD PRODUÇÕES LTDA', total: 6500000 },
  { name: '555 STUDIOS LTDA', total: 6000000 },
  { name: 'MARCOS LOPES STUDIO E PHOTO LTDA', total: 5000000 },
  { name: 'BUMBLEBEAT AUDIO LTDA', total: 5000000 },
  { name: 'CAIO SOARES DIRECAO DE ARTE LTDA', total: 4500000 },
  { name: 'EVIL TWIN', total: 4500000 },
  { name: 'MELANINA FILMES LTDA', total: 3471902 },
  { name: 'PICTURE HOUSE PRODUÇÕES LTDA', total: 1763152 },
  { name: 'LOC LACADORA DE EQUIPAMENTOS CINEMA', total: 1800000 },
  { name: 'CUSTO INTERNO / ANCINE', total: 1110044 },
  { name: 'FM MORAES FILMES', total: 960500 },
  { name: 'G&S IMAGENS DO BRASIL LTDA.', total: 680000 },
  { name: 'GETTY IMAGE', total: 236113 },
]

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#8DD1E1', '#D084D0', '#FF6B6B',
  '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471',
  '#AED6F1', '#A3E4D7'
]

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

  const handlePrint = () => {
    window.print()
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

  // Calcular métricas principais usando dados consolidados
  const totalInvestido = consolidatedData.reduce((sum, item) => sum + item.total, 0)
  const totalFornecedores = consolidatedData.length

  // Agrupar por mês dos eventos
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

  // Preparar dados dos fornecedores com porcentagens
  const allSuppliers = consolidatedData
    .sort((a, b) => b.total - a.total)
    .map(s => ({
      ...s,
      percentage: totalInvestido > 0 ? (s.total / totalInvestido) * 100 : 0,
      count: 1 // Placeholder, você pode ajustar conforme seus dados
    }))

  // Dados para gráfico de pizza (top 10)
  const pieChartData = allSuppliers.slice(0, 10).map(item => ({
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    value: item.total,
    percentage: item.percentage
  }))

  return (
    <AppLayout>
      <div className="p-6 space-y-8 max-w-[1600px] mx-auto print:p-4 print:max-w-none print:space-y-4">
        {/* Header com botão de impressão */}
        <div className="flex justify-between items-start print:flex-col print:space-y-2">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary to-chart-2 bg-clip-text text-transparent print:text-4xl print:text-black">
              📊 Relatório Executivo Financeiro
            </h1>
            <p className="text-lg text-muted-foreground print:text-sm">Análise completa de investimentos e desempenho - Dados Consolidados</p>
          </div>
          <Button 
            onClick={handlePrint}
            className="print:hidden"
            size="lg"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Relatório
          </Button>
        </div>

        {/* MÉTRICAS PRINCIPAIS - Cards Grandes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4 print:scale-90">
          <Card className="border-2 border-primary/30 shadow-2xl bg-gradient-to-br from-primary/10 via-background to-background print:border print:shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold">Total Investido</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-primary mb-2 print:text-4xl">{formatCurrency(totalInvestido)}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>Período completo analisado</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-chart-2/30 shadow-2xl bg-gradient-to-br from-chart-2/10 via-background to-background print:border print:shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-chart-2/20">
                  <Building2 className="w-8 h-8 text-chart-2" />
                </div>
                <CardTitle className="text-lg font-semibold">Fornecedores Ativos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-chart-2 mb-2 print:text-4xl">{totalFornecedores}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>Parceiros estratégicos</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-chart-3/30 shadow-2xl bg-gradient-to-br from-chart-3/10 via-background to-background print:border print:shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-chart-3/20">
                  <TrendingUp className="w-8 h-8 text-chart-3" />
                </div>
                <CardTitle className="text-lg font-semibold">Crescimento Médio</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-5xl font-bold mb-2 print:text-4xl ${avgGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {avgGrowth >= 0 ? '+' : ''}{avgGrowth.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Por mês • Pico: {formatMonth(maxMonth.month)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VISÃO GERAL CONSOLIDADA */}
        <Card className="border-2 border-primary/30 shadow-2xl print:border print:shadow-none">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-3 print:text-2xl">
              📋 Visão Geral Consolidada
            </CardTitle>
            <p className="text-muted-foreground">Total geral: {formatCurrency(totalInvestido)}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:gap-4">
              {/* Gráfico de Pizza */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold print:text-lg">Distribuição por Fornecedor (Top 10)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Lista de Fornecedores */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold print:text-lg">Ranking de Fornecedores</h3>
                <div className="max-h-80 overflow-y-auto print:max-h-none">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-semibold">Fornecedor</th>
                        <th className="text-right py-2 font-semibold">Valor</th>
                        <th className="text-right py-2 font-semibold">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSuppliers.map((supplier, index) => (
                        <tr key={supplier.name} className="border-b hover:bg-muted/50">
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-yellow-500 text-yellow-950' :
                                index === 1 ? 'bg-gray-400 text-gray-950' :
                                index === 2 ? 'bg-amber-600 text-amber-950' :
                                'bg-muted'
                              }`}>
                                {index + 1}
                              </span>
                              <span className="font-medium">{supplier.name}</span>
                            </div>
                          </td>
                          <td className="text-right py-2 font-semibold">
                            {formatCurrency(supplier.total)}
                          </td>
                          <td className="text-right py-2 text-muted-foreground">
                            {supplier.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GRÁFICO DE FATURAMENTO TOTAL */}
        <Card className="border-2 border-primary/30 shadow-2xl print:break-inside-avoid print:border print:shadow-none">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-3 print:text-2xl">
              📈 Faturamento Total Acumulado
            </CardTitle>
            <p className="text-muted-foreground">Evolução do investimento ao longo do tempo</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400} className="print:h-64">
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
                  className="text-sm font-medium print:text-xs"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  className="text-sm font-medium print:text-xs"
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
        <div className="space-y-4 print:break-inside-avoid">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold flex items-center gap-3 print:text-2xl">
              🏢 Faturamento por Fornecedor
            </h2>
            <div className="text-sm text-muted-foreground print:text-xs">
              Total: {allSuppliers.length} fornecedores
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-3 print:scale-90">
            {allSuppliers.map((supplier, idx) => {
              const isTop3 = idx < 3
              const borderColor = isTop3 ? 'border-primary/40' : 'border-border'
              const bgGradient = isTop3 
                ? 'bg-gradient-to-br from-primary/5 via-background to-background' 
                : 'bg-background'
              
              return (
                <Card key={supplier.name} className={`${borderColor} shadow-lg ${bgGradient} transition-all hover:shadow-xl hover:scale-[1.02] print:shadow-none print:border print:hover:scale-100`}>
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
                        <CardTitle className="text-base font-semibold leading-tight print:text-sm">
                          {supplier.name}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="text-3xl font-bold text-primary print:text-2xl">
                        {formatCurrency(supplier.total)}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Participação:</span>
                        <span className="font-semibold text-foreground">{supplier.percentage.toFixed(2)}%</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-sm">
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

        {/* RESUMO MENSAL */}
        <Card className="shadow-xl print:break-inside-avoid print:shadow-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold print:text-xl">📅 Resumo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 print:grid-cols-4 print:gap-2">
              {monthlyData.map(m => (
                <div 
                  key={m.month} 
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg print:shadow-none print:p-3 ${
                    m.month === maxMonth.month 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="text-xs font-semibold text-muted-foreground mb-1">
                    {formatMonth(m.month)}
                  </div>
                  <div className="text-xl font-bold text-primary mb-1 print:text-lg">
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

      {/* Estilos para impressão */}
      <style>
        {`
          @media print {
            @page {
              margin: 1cm;
              size: A4;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print\\:break-inside-avoid {
              break-inside: avoid;
            }
            .print\\:scale-90 {
              transform: scale(0.9);
              transform-origin: top left;
            }
          }
        `}
      </style>
    </AppLayout>
  )
}