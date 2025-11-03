import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
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
  return `${months[parseInt(month) - 1]}/${year}`
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
  { name: 'PALMA EVENTOS E PRODUÇÕES CULTURAIS', total: 13800000 },
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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#EC4899']

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
    const printContent = document.getElementById('print-area')
    const originalContent = document.body.innerHTML
    
    if (printContent) {
      document.body.innerHTML = printContent.innerHTML
      window.print()
      document.body.innerHTML = originalContent
      window.location.reload()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Carregando dados financeiros...</div>
      </div>
    )
  }

  // Calcular métricas principais
  const totalInvestido = consolidatedData.reduce((sum, item) => sum + item.total, 0)
  const totalFornecedores = consolidatedData.length

  // Agrupar por mês
  const monthlyMap = new Map<string, MonthlyData>()
  events.forEach(e => {
    const month = e.ref_month
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { month, total: 0, count: 0 })
    }
    const data = monthlyMap.get(month)!
    data.total += e.total_cents
    data.count += 1
  })

  const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))
  const maxMonth = monthlyData.reduce((max, curr) => curr.total > max.total ? curr : max, monthlyData[0])

  // Preparar dados dos fornecedores
  const allSuppliers = consolidatedData
    .sort((a, b) => b.total - a.total)
    .map(s => ({
      ...s,
      percentage: totalInvestido > 0 ? (s.total / totalInvestido) * 100 : 0,
      count: Math.ceil(s.total / 1000000) // Estimativa baseada no valor
    }))

  // Dados para gráficos
  const topSuppliers = allSuppliers.slice(0, 8)
  const barChartData = topSuppliers.map(item => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    valor: item.total / 100,
    percentage: item.percentage
  }))

  const pieChartData = topSuppliers.map(item => ({
    name: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
    value: item.total,
    percentage: item.percentage
  }))

  return (
    <div className="min-h-screen bg-background">
      {/* Área principal */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho com botão de impressão */}
        <div className="flex justify-between items-center print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatório Financeiro Executivo</h1>
            <p className="text-muted-foreground mt-1">Análise consolidada de investimentos</p>
          </div>
          <Button onClick={handlePrint} size="lg">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Relatório
          </Button>
        </div>

        {/* Área de impressão */}
        <div id="print-area" className="print:block">
          {/* Cabeçalho da impressão */}
          <div className="hidden print:flex print:justify-between print:items-center print:mb-6 print:border-b print:pb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Relatório Financeiro Executivo</h1>
              <p className="text-muted-foreground text-sm">BYD Brasil - {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-primary">{formatCurrency(totalInvestido)}</div>
              <div className="text-sm text-muted-foreground">Total Investido</div>
            </div>
          </div>

          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:grid-cols-3 print:gap-3">
            <Card className="print:shadow-none print:border">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary print:text-xl">{formatCurrency(totalInvestido)}</div>
                <div className="text-sm text-muted-foreground">Total Investido</div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardContent className="p-4 text-center">
                <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600 print:text-xl">{totalFornecedores}</div>
                <div className="text-sm text-muted-foreground">Fornecedores</div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardContent className="p-4 text-center">
                <Package className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600 print:text-xl">{events.length}</div>
                <div className="text-sm text-muted-foreground">Transações</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-2 print:gap-4">
            {/* Gráfico de Barras */}
            <Card className="print:shadow-none print:border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg print:text-base">Top Fornecedores por Valor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250} className="print:h-48">
                  <BarChart data={barChartData} layout="vertical" margin={{ left: 100, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      type="number"
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      fontSize={12}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name" 
                      width={90}
                      fontSize={12}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${(value).toLocaleString('pt-BR')}`, 'Valor']}
                    />
                    <Bar dataKey="valor" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Pizza */}
            <Card className="print:shadow-none print:border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg print:text-base">Distribuição por Fornecedor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250} className="print:h-48">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ percentage }) => `${percentage.toFixed(1)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Fornecedores */}
          <Card className="mb-6 print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="text-lg print:text-base">Relatório Consolidado de Fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold">#</th>
                      <th className="text-left py-3 px-4 font-semibold">Fornecedor</th>
                      <th className="text-right py-3 px-4 font-semibold">Valor Total</th>
                      <th className="text-right py-3 px-4 font-semibold">Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSuppliers.map((supplier, index) => (
                      <tr key={supplier.name} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-4">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-2 px-4 font-medium">{supplier.name}</td>
                        <td className="py-2 px-4 text-right font-semibold">
                          {formatCurrency(supplier.total)}
                        </td>
                        <td className="py-2 px-4 text-right text-muted-foreground">
                          {supplier.percentage.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/10 font-bold">
                      <td colSpan={2} className="py-3 px-4">TOTAL GERAL</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(totalInvestido)}</td>
                      <td className="py-3 px-4 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Resumo Mensal */}
          <Card className="print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="text-lg print:text-base">Resumo por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 print:grid-cols-6 print:gap-2">
                {monthlyData.map(m => (
                  <div 
                    key={m.month} 
                    className={`p-3 rounded-lg border text-center ${
                      m.month === maxMonth.month 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border bg-background'
                    }`}
                  >
                    <div className="text-sm font-semibold text-muted-foreground mb-1">
                      {formatMonth(m.month)}
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(m.total)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.count} transações
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rodapé da impressão */}
          <div className="hidden print:block print:mt-8 print:pt-4 print:border-t print:text-center print:text-sm print:text-muted-foreground">
            <p>Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
            <p>BYD Brasil - Departamento Financeiro</p>
          </div>
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4 portrait;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          #print-area {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .break-before {
            page-break-before: always;
          }
          
          .break-after {
            page-break-after: always;
          }
          
          .break-inside-avoid {
            page-break-inside: avoid;
          }
        }
        
        @media screen {
          .print\\:flex {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}