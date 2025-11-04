import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Package,
  Building2,
  Printer,
  Calendar,
  Users,
  FileText,
  AlertTriangle,
  Target,
  Zap,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinanceEvent {
  id: string;
  ref_month: string;
  cliente: string;
  fornecedor: string | null;
  total_cents: number;
  valor_fornecedor_cents: number;
  honorario_agencia_cents: number;
  emissao?: string;
  created_at?: string;
}

interface MonthlyData {
  month: string;
  total: number;
  count: number;
}

interface SupplierData {
  name: string;
  total: number;
  percentage: number;
  count: number;
}

const consolidatedData: SupplierData[] = [
  { name: "MONALISA STUDIO LTDA", total: 97639478, percentage: 0, count: 0 },
  { name: "SUBSOUND AUDIO PRODUÇÕES LTDA", total: 59100000, percentage: 0, count: 0 },
  { name: "O2 FILMES PUBLICITARIOS LTDA", total: 76116600, percentage: 0, count: 0 },
  { name: "STINK SP PRODUCAO DE FILMES LTDA", total: 41495000, percentage: 0, count: 0 },
  { name: "TRUST DESIGN MULTIMIDIA S/S LTDA", total: 29980000, percentage: 0, count: 0 },
  { name: "MELLODIA FILMES E PRODUÇÕES EIRELLI", total: 27500000, percentage: 0, count: 0 },
  { name: "CINE CINEMATOGRÁFICA LTDA", total: 19273200, percentage: 0, count: 0 },
  { name: "PALMA EVENTOS E PRODUÇÕES CULTURAIS", total: 13800000, percentage: 0, count: 0 },
  { name: "CANJA PRODUÇÕES MUSICAIS LTDA-ME", total: 7300000, percentage: 0, count: 0 },
  { name: "ANTFOOD PRODUÇÕES LTDA", total: 6500000, percentage: 0, count: 0 },
  { name: "555 STUDIOS LTDA", total: 6000000, percentage: 0, count: 0 },
  { name: "MARCOS LOPES STUDIO E PHOTO LTDA", total: 5000000, percentage: 0, count: 0 },
  { name: "BUMBLEBEAT AUDIO LTDA", total: 5000000, percentage: 0, count: 0 },
  { name: "CAIO SOARES DIRECAO DE ARTE LTDA", total: 4500000, percentage: 0, count: 0 },
  { name: "EVIL TWIN", total: 4500000, percentage: 0, count: 0 },
  { name: "MELANINA FILMES LTDA", total: 3471902, percentage: 0, count: 0 },
  { name: "PICTURE HOUSE PRODUÇÕES LTDA", total: 1763152, percentage: 0, count: 0 },
  { name: "LOC LACADORA DE EQUIPAMENTOS CINEMA", total: 1800000, percentage: 0, count: 0 },
  { name: "CUSTO INTERNO / ANCINE", total: 1110044, percentage: 0, count: 0 },
  { name: "FM MORAES FILMES", total: 960500, percentage: 0, count: 0 },
  { name: "G&S IMAGENS DO BRASIL LTDA.", total: 680000, percentage: 0, count: 0 },
  { name: "GETTY IMAGE", total: 236113, percentage: 0, count: 0 },
];

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
  "#EC4899",
];

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

const formatMonth = (dateStr: string) => {
  const [year, month] = dateStr.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(month) - 1]}/${year}`;
};

const CompanyHeader = ({ title, subtitle, pageNumber }: { title?: string; subtitle?: string; pageNumber?: number }) => {
  return (
    <>
      <div className="hidden print:flex print:justify-between print:items-start print:border-b print:border-gray-300 print:pb-3 print:mb-6">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 uppercase">
            WE/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA
          </h1>
          <div className="text-xs text-gray-600 mt-1">
            <div>CNPJ: 05.265.118/0001-65</div>
            <div>Rua Chilon, 381, Vila Olimpia, São Paulo – SP, CEP: 04552-030</div>
          </div>
        </div>
        <div className="text-right text-xs text-gray-600">
          <div className="font-semibold">{new Date().toLocaleDateString("pt-BR")}</div>
          {pageNumber && <div>Página {pageNumber}</div>}
        </div>
      </div>

      {(title || subtitle) && (
        <div className="hidden print:block print:mb-6">
          {title && <h2 className="text-xl font-bold text-gray-900 text-center uppercase">{title}</h2>}
          {subtitle && <p className="text-sm text-gray-600 text-center mt-1">{subtitle}</p>}
        </div>
      )}

      <div className="print:hidden bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
              <div className="text-xl font-bold text-gray-800">WE/MOTTA</div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">WE/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA</h1>
              <p className="text-white/80">{title || "Relatório Financeiro Executivo"}</p>
              {subtitle && <p className="text-white/60 text-sm mt-1">{subtitle}</p>}
            </div>
          </div>
          <div className="text-right text-sm">
            <p>CNPJ: 05.265.118/0001-65</p>
            <p>Relatório gerado em {new Date().toLocaleDateString("pt-BR")}</p>
            {pageNumber && <p>Página {pageNumber}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <span>Rua Chilon, 381, Vila Olimpia, São Paulo – SP, CEP: 04552-030</span>
          </div>
        </div>
      </div>
    </>
  );
};

const ReportPage = ({
  children,
  title,
  subtitle,
  pageNumber,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  pageNumber?: number;
}) => {
  return (
    <div className="print:page print:break-after-always print:min-h-[27.7cm] print:my-4">
      <CompanyHeader title={title} subtitle={subtitle} pageNumber={pageNumber} />
      {children}
    </div>
  );
};

const ExecutiveSummary = ({
  suppliers,
  totalInvestido,
  monthlyData,
}: {
  suppliers: SupplierData[];
  totalInvestido: number;
  monthlyData: MonthlyData[];
}) => {
  const topSupplier = suppliers[0];
  const growthLastMonth =
    monthlyData.length > 1
      ? ((monthlyData[monthlyData.length - 1].total - monthlyData[monthlyData.length - 2].total) /
          monthlyData[monthlyData.length - 2].total) *
        100
      : 0;

  const insights = [
    {
      title: "Fornecedor Destaque",
      content: `${topSupplier?.name || "N/A"} representa ${topSupplier?.percentage.toFixed(1) || "0"}% do total`,
      type: "info",
      icon: <Zap className="w-4 h-4" />,
    },
    {
      title: "Crescimento Mensal",
      content: `Último mês: ${growthLastMonth >= 0 ? "+" : ""}${growthLastMonth.toFixed(1)}%`,
      type: growthLastMonth >= 0 ? "success" : "warning",
      icon: growthLastMonth >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />,
    },
    {
      title: "Concentração",
      content: `Top 3: ${suppliers
        .slice(0, 3)
        .reduce((sum, s) => sum + s.percentage, 0)
        .toFixed(1)}% do total`,
      type: suppliers.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0) > 60 ? "warning" : "info",
      icon: <Target className="w-4 h-4" />,
    },
  ];

  return (
    <Card className="print:shadow-none print:border mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Insights Executivos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                insight.type === "success"
                  ? "border-green-500 bg-green-50"
                  : insight.type === "warning"
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-blue-500 bg-blue-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {insight.icon}
                <h4 className="font-semibold text-sm">{insight.title}</h4>
              </div>
              <p className="text-sm">{insight.content}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const MonthlyComparison = ({ monthlyData }: { monthlyData: MonthlyData[] }) => {
  const comparisonData = monthlyData.map((month, index) => {
    const previousMonth = monthlyData[index - 1];
    const growth = previousMonth ? ((month.total - previousMonth.total) / previousMonth.total) * 100 : 0;

    return {
      month: formatMonth(month.month),
      valor: month.total / 100,
      crescimento: growth,
      transacoes: month.count,
    };
  });

  return (
    <Card className="print:shadow-none print:border mb-6">
      <CardHeader>
        <CardTitle>Evolução Mensal com Comparativo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value.toFixed(0)}%`} />
            <Tooltip
              formatter={(value: any, name: string) =>
                name === "crescimento"
                  ? [`${Number(value).toFixed(1)}%`, "Crescimento"]
                  : [`R$ ${Number(value).toLocaleString("pt-BR")}`, "Faturamento"]
              }
            />
            <Legend />
            <Bar yAxisId="left" dataKey="valor" fill="#3B82F6" name="Faturamento" />
            <Line yAxisId="right" type="monotone" dataKey="crescimento" stroke="#EF4444" name="Crescimento %" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const RiskConcentrationAnalysis = ({ suppliers }: { suppliers: SupplierData[] }) => {
  const concentrationData = [
    { name: "Top 1", value: suppliers[0]?.percentage || 0 },
    { name: "Top 3", value: suppliers.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0) },
    { name: "Top 5", value: suppliers.slice(0, 5).reduce((sum, s) => sum + s.percentage, 0) },
    { name: "Demais", value: suppliers.slice(5).reduce((sum, s) => sum + s.percentage, 0) },
  ];

  const riskLevel = concentrationData[1].value > 70 ? "ALTO" : concentrationData[1].value > 50 ? "MÉDIO" : "BAIXO";

  return (
    <Card className="print:shadow-none print:border mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Análise de Concentração de Risco
          </span>
          <span
            className={`text-sm px-2 py-1 rounded ${
              riskLevel === "ALTO"
                ? "bg-red-100 text-red-800"
                : riskLevel === "MÉDIO"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
            }`}
          >
            Risco {riskLevel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={concentrationData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
              >
                {concentrationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${Number(value).toFixed(1)}%`, "Participação"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            <div className="text-sm">
              <strong>Recomendações:</strong>
              {riskLevel === "ALTO" && (
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                  <li>Diversificar base de fornecedores</li>
                  <li>Estabelecer contratos de longo prazo</li>
                  <li>Criar plano de contingência</li>
                </ul>
              )}
              {riskLevel === "MÉDIO" && (
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                  <li>Monitorar fornecedores estratégicos</li>
                  <li>Desenvolver fornecedores secundários</li>
                </ul>
              )}
              {riskLevel === "BAIXO" && (
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                  <li>Manter diversificação atual</li>
                  <li>Focar em eficiência operacional</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AdvancedKPIs = ({
  suppliers,
  monthlyData,
  events,
}: {
  suppliers: SupplierData[];
  monthlyData: MonthlyData[];
  events: FinanceEvent[];
}) => {
  const avgTransactionValue = events.length > 0 ? events.reduce((sum, e) => sum + e.total_cents, 0) / events.length : 0;
  const monthlyTransactionCount = monthlyData.length > 0 ? events.length / monthlyData.length : 0;
  const supplierRetentionRate =
    suppliers.length > 0 ? (suppliers.filter((s) => s.count > 1).length / suppliers.length) * 100 : 0;

  const kpis = [
    {
      title: "Ticket Médio",
      value: formatCurrency(avgTransactionValue),
      description: "Valor médio por transação",
      icon: <DollarSign className="w-4 h-4" />,
    },
    {
      title: "Transações/Mês",
      value: monthlyTransactionCount.toFixed(0),
      description: "Média mensal de transações",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      title: "Fornecedores Ativos",
      value: `${supplierRetentionRate.toFixed(0)}%`,
      description: "Taxa de atividade mensal",
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <Card className="print:shadow-none print:border mb-6">
      <CardHeader>
        <CardTitle>Indicadores de Performance Avançados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpis.map((kpi, index) => (
            <div key={index} className="text-center p-4 border rounded-lg">
              <div className="flex justify-center items-center gap-2 mb-2">
                {kpi.icon}
                <div className="text-2xl font-bold text-primary">{kpi.value}</div>
              </div>
              <div className="text-sm font-semibold">{kpi.title}</div>
              <div className="text-xs text-muted-foreground">{kpi.description}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function FinanceExecutiveReport() {
  const [events, setEvents] = useState<FinanceEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data, error } = await supabase.from("finance_events").select("*").order("ref_month", { ascending: true });

      if (error) throw error;

      const eventsData: FinanceEvent[] = (data || []).map((event) => ({
        ...event,
        emissao: event.emissao || event.created_at || new Date().toISOString(),
      }));

      setEvents(eventsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Carregando dados financeiros...</div>
      </div>
    );
  }

  const totalInvestido = consolidatedData.reduce((sum, item) => sum + item.total, 0);
  const totalFornecedores = consolidatedData.length;
  const totalMeses = new Set(events.map((e) => e.ref_month)).size;

  const monthlyMap = new Map<string, MonthlyData>();
  events.forEach((e) => {
    const month = e.ref_month;
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { month, total: 0, count: 0 });
    }
    const data = monthlyMap.get(month)!;
    data.total += e.total_cents;
    data.count += 1;
  });

  const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  const allSuppliers = consolidatedData
    .sort((a, b) => b.total - a.total)
    .map((s) => ({
      ...s,
      percentage: totalInvestido > 0 ? (s.total / totalInvestido) * 100 : 0,
      count: Math.ceil(s.total / 1000000),
    }));

  const topSuppliers = allSuppliers.slice(0, 8);
  const barChartData = topSuppliers.map((item) => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
    valor: item.total / 100,
    percentage: item.percentage,
  }));

  const pieChartData = topSuppliers.map((item) => ({
    name: item.name.length > 12 ? item.name.substring(0, 12) + "..." : item.name,
    value: item.total,
    percentage: item.percentage,
  }));

  const growthRates: number[] = [];
  for (let i = 1; i < monthlyData.length; i++) {
    const prev = monthlyData[i - 1].total;
    const curr = monthlyData[i].total;
    if (prev > 0) {
      growthRates.push(((curr - prev) / prev) * 100);
    }
  }
  const avgGrowth = growthRates.length > 0 ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:max-w-none">
        <div className="flex justify-between items-center print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Relatório Financeiro Executivo</h2>
            <p className="text-muted-foreground mt-1">Análise completa do faturamento BYD</p>
          </div>
          <Button onClick={handlePrint} size="lg">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Relatório Completo
          </Button>
        </div>

        <div id="print-area" className="print:block">
          <ReportPage
            title="RELATÓRIO EXECUTIVO - RESUMO GERAL"
            subtitle="Visão consolidada do faturamento BYD"
            pageNumber={1}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:grid-cols-4 print:gap-3">
              <Card className="print:shadow-none print:border print:border-gray-300">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 text-primary mx-auto mb-2 print:text-gray-700" />
                  <div className="text-2xl font-bold text-primary print:text-gray-900 print:text-xl">
                    {formatCurrency(totalInvestido)}
                  </div>
                  <div className="text-sm text-muted-foreground print:text-gray-600">Total Faturado</div>
                </CardContent>
              </Card>

              <Card className="print:shadow-none print:border print:border-gray-300">
                <CardContent className="p-4 text-center">
                  <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2 print:text-gray-700" />
                  <div className="text-2xl font-bold text-blue-600 print:text-gray-900 print:text-xl">
                    {totalFornecedores}
                  </div>
                  <div className="text-sm text-muted-foreground print:text-gray-600">Fornecedores</div>
                </CardContent>
              </Card>

              <Card className="print:shadow-none print:border print:border-gray-300">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2 print:text-gray-700" />
                  <div className="text-2xl font-bold text-green-600 print:text-gray-900 print:text-xl">
                    {totalMeses}
                  </div>
                  <div className="text-sm text-muted-foreground print:text-gray-600">Meses Analisados</div>
                </CardContent>
              </Card>

              <Card className="print:shadow-none print:border print:border-gray-300">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2 print:text-gray-700" />
                  <div
                    className={`text-2xl font-bold print:text-xl ${avgGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {avgGrowth >= 0 ? "+" : ""}
                    {avgGrowth.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground print:text-gray-600">Crescimento Médio</div>
                </CardContent>
              </Card>
            </div>

            <ExecutiveSummary suppliers={allSuppliers} totalInvestido={totalInvestido} monthlyData={monthlyData} />

            <AdvancedKPIs suppliers={allSuppliers} monthlyData={monthlyData} events={events} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-2 print:gap-4">
              <Card className="print:shadow-none print:border print:border-gray-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg print:text-base print:font-semibold">
                    Top Fornecedores por Valor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300} className="print:h-64">
                    <BarChart data={barChartData} layout="vertical" margin={{ left: 120, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        fontSize={12}
                      />
                      <YAxis type="category" dataKey="name" width={110} fontSize={12} />
                      <Tooltip formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Valor"]} />
                      <Bar dataKey="valor" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="print:shadow-none print:border print:border-gray-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg print:text-base print:font-semibold">
                    Distribuição por Fornecedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300} className="print:h-64">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ percentage }) => `${percentage.toFixed(1)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <RiskConcentrationAnalysis suppliers={allSuppliers} />

            <MonthlyComparison monthlyData={monthlyData} />

            <Card className="mb-6 print:shadow-none print:border print:border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg print:text-base print:font-semibold">
                  Evolução do Faturamento Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300} className="print:h-64">
                  <LineChart
                    data={monthlyData.map((m) => ({
                      month: formatMonth(m.month),
                      valor: m.total / 100,
                      transacoes: m.count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} fontSize={12} />
                    <Tooltip formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Valor"]} />
                    <Legend />
                    <Line type="monotone" dataKey="valor" stroke="#3B82F6" strokeWidth={2} name="Faturamento" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border print:border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg print:text-base print:font-semibold">Resumo por Fornecedor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 print:bg-gray-100">
                        <th className="text-left py-3 px-4 font-semibold print:font-bold">#</th>
                        <th className="text-left py-3 px-4 font-semibold print:font-bold">Fornecedor</th>
                        <th className="text-right py-3 px-4 font-semibold print:font-bold">Valor Total</th>
                        <th className="text-right py-3 px-4 font-semibold print:font-bold">Participação</th>
                        <th className="text-right py-3 px-4 font-semibold print:font-bold">Transações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSuppliers.map((supplier, index) => (
                        <tr key={supplier.name} className="border-b hover:bg-muted/30 print:hover:bg-transparent">
                          <td className="py-2 px-4">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index < 3
                                  ? "bg-primary text-primary-foreground print:bg-gray-800 print:text-white"
                                  : "bg-muted print:bg-gray-200"
                              }`}
                            >
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-2 px-4 font-medium print:font-normal">{supplier.name}</td>
                          <td className="py-2 px-4 text-right font-semibold print:font-bold">
                            {formatCurrency(supplier.total)}
                          </td>
                          <td className="py-2 px-4 text-right text-muted-foreground print:text-gray-600">
                            {supplier.percentage.toFixed(1)}%
                          </td>
                          <td className="py-2 px-4 text-right text-muted-foreground print:text-gray-600">
                            {supplier.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-primary/10 font-bold print:bg-gray-800 print:text-white">
                        <td colSpan={2} className="py-3 px-4">
                          TOTAL GERAL
                        </td>
                        <td className="py-3 px-4 text-right">{formatCurrency(totalInvestido)}</td>
                        <td className="py-3 px-4 text-right">100%</td>
                        <td className="py-3 px-4 text-right">{events.length}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </ReportPage>

          {allSuppliers.map((supplier, index) => (
            <ReportPage
              key={supplier.name}
              title={`RELATÓRIO DETALHADO - ${supplier.name.toUpperCase()}`}
              subtitle={`Faturamento detalhado - ${supplier.percentage.toFixed(2)}% do total`}
              pageNumber={index + 2}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:grid-cols-3 print:gap-3">
                <Card className="print:shadow-none print:border print:border-gray-300">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-8 h-8 text-primary mx-auto mb-2 print:text-gray-700" />
                    <div className="text-2xl font-bold text-primary print:text-gray-900 print:text-xl">
                      {formatCurrency(supplier.total)}
                    </div>
                    <div className="text-sm text-muted-foreground print:text-gray-600">Total Faturado</div>
                  </CardContent>
                </Card>

                <Card className="print:shadow-none print:border print:border-gray-300">
                  <CardContent className="p-4 text-center">
                    <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2 print:text-gray-700" />
                    <div className="text-2xl font-bold text-blue-600 print:text-gray-900 print:text-xl">
                      {supplier.count}
                    </div>
                    <div className="text-sm text-muted-foreground print:text-gray-600">Transações Estimadas</div>
                  </CardContent>
                </Card>

                <Card className="print:shadow-none print:border print:border-gray-300">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2 print:text-gray-700" />
                    <div className="text-2xl font-bold text-green-600 print:text-gray-900 print:text-xl">
                      {supplier.percentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground print:text-gray-600">Participação Total</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="print:shadow-none print:border print:border-gray-300">
                <CardHeader>
                  <CardTitle className="text-lg print:text-base print:font-semibold">
                    Informações do Fornecedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Fornecedor:</span>
                        <div className="mt-1">{supplier.name}</div>
                      </div>
                      <div>
                        <span className="font-semibold">Valor Total:</span>
                        <div className="mt-1 font-bold">{formatCurrency(supplier.total)}</div>
                      </div>
                      <div>
                        <span className="font-semibold">Participação:</span>
                        <div className="mt-1">{supplier.percentage.toFixed(2)}%</div>
                      </div>
                      <div>
                        <span className="font-semibold">Transações Estimadas:</span>
                        <div className="mt-1">{supplier.count}</div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Posição no Ranking:</h4>
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-800"
                            : index === 1
                              ? "bg-gray-100 text-gray-800"
                              : index === 2
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {index === 0
                          ? "🥇 1º Lugar"
                          : index === 1
                            ? "🥈 2º Lugar"
                            : index === 2
                              ? "🥉 3º Lugar"
                              : `${index + 1}º Lugar`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6 print:shadow-none print:border print:border-gray-300">
                <CardHeader>
                  <CardTitle className="text-lg print:text-base print:font-semibold">Análise de Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Ticket Médio Estimado</span>
                      <span className="font-bold text-primary">{formatCurrency(supplier.total / supplier.count)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Impacto no Faturamento Total</span>
                      <span className="font-bold text-green-600">{supplier.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Classificação Estratégica</span>
                      <span
                        className={`font-bold ${
                          supplier.percentage > 10
                            ? "text-red-600"
                            : supplier.percentage > 5
                              ? "text-orange-600"
                              : "text-green-600"
                        }`}
                      >
                        {supplier.percentage > 10
                          ? "Estratégico"
                          : supplier.percentage > 5
                            ? "Importante"
                            : "Complementar"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ReportPage>
          ))}
        </div>
      </div>

      <div className="print:hidden fixed bottom-6 right-6">
        <Button onClick={handlePrint} size="lg" className="shadow-lg">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Relatório
        </Button>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4 portrait;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            font-size: 12px !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:page {
            page-break-after: always;
            min-height: 25.7cm !important;
          }
          
          #print-area {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </div>
  );
}
