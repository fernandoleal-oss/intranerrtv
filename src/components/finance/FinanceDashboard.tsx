import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, FileText, Users } from "lucide-react";

type ClientSummary = { client: string; total: number; count: number };

type DashboardProps = {
  receita: number;
  varReceitaPct: number;
  registros: number;
  ticketMedio: number;
  topClients: ClientSummary[];
  monthLabel: string;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const formatBRL = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

export function FinanceDashboard({ receita, varReceitaPct, registros, ticketMedio, topClients, monthLabel }: DashboardProps) {
  const isPositiveVar = varReceitaPct >= 0;

  // Dados para o gráfico de barras
  const barData = topClients.slice(0, 5).map((c) => ({
    name: c.client.length > 15 ? c.client.slice(0, 15) + "..." : c.client,
    receita: c.total,
  }));

  // Dados para o gráfico de pizza
  const pieData = topClients.slice(0, 5).map((c, idx) => ({
    name: c.client.length > 20 ? c.client.slice(0, 20) + "..." : c.client,
    value: c.total,
    color: COLORS[idx % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Receita Total</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{formatBRL(receita)}</div>
            <div className={`flex items-center gap-1 text-xs mt-2 ${isPositiveVar ? "text-green-700" : "text-red-700"}`}>
              {isPositiveVar ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>
                {isPositiveVar ? "+" : ""}
                {varReceitaPct.toFixed(1)}% vs mês anterior
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Registros</CardTitle>
            <FileText className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{registros}</div>
            <p className="text-xs text-green-700 mt-2">Lançamentos no período</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Ticket Médio</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{formatBRL(ticketMedio)}</div>
            <p className="text-xs text-purple-700 mt-2">Receita / registro</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Top Clientes</CardTitle>
            <Users className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{topClients.length}</div>
            <p className="text-xs text-orange-700 mt-2">Clientes ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Top 5 Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Clientes por Receita</CardTitle>
            <p className="text-sm text-muted-foreground">{monthLabel}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatBRL(value)} />
                <Tooltip formatter={(value: number) => formatBRL(value)} />
                <Bar dataKey="receita" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Receita</CardTitle>
            <p className="text-sm text-muted-foreground">Top 5 clientes</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatBRL(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos os Clientes</CardTitle>
          <p className="text-sm text-muted-foreground">Detalhamento completo por cliente</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-semibold">Cliente</th>
                  <th className="pb-3 font-semibold text-right">Receita</th>
                  <th className="pb-3 font-semibold text-right">Registros</th>
                  <th className="pb-3 font-semibold text-right">Ticket Médio</th>
                  <th className="pb-3 font-semibold text-right">% Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topClients.map((c, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="py-3">{c.client}</td>
                    <td className="py-3 text-right font-medium">{formatBRL(c.total)}</td>
                    <td className="py-3 text-right">{c.count}</td>
                    <td className="py-3 text-right">{formatBRL(c.total / c.count)}</td>
                    <td className="py-3 text-right text-muted-foreground">
                      {((c.total / receita) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
