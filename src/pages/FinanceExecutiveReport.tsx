import React, { useMemo } from "react";
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
  LabelList,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  Building2,
  Printer,
  Calendar,
  AlertTriangle,
  Target,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

/* ================== Utils ================== */
const BRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const BRL_COMPACT = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[m - 1]}/${y}`;
};

type MonthlyRow = { month: string; total: number; count: number };
type SupplierRow = { name: string; total: number; percentage: number };

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

/* ================== Dados (iguais aos seus) ================== */
const SUPPLIER_TOTALS_CENTS: Record<string, number> = {
  "MONALISA STUDIO LTDA": 97639478,
  "SUBSOUND AUDIO PRODUÇÕES LTDA": 59100000,
  "O2 FILMES PUBLICITARIOS LTDA": 76116600,
  "STINK SP PRODUCAO DE FILMES LTDA": 41495000,
  "TRUST DESIGN MULTIMIDIA S/S LTDA": 29980000,
  "MELLODIA FILMES E PRODUÇÕES EIRELLI": 27500000,
  "CINE CINEMATOGRÁFICA LTDA": 19273200,
  "PALMA EVENTOS E PRODUÇÕES CULTURAIS LTDA": 6600000,
  "CANJA PRODUCOES MUSICAIS LTDA-ME": 7300000,
  "ANTFOOD PRODUÇÕES LTDA": 6500000,
  "555 STUDIOS LTDA": 6000000,
  "MARCOS LOPES STUDIO E PHOTO LTDA": 5000000,
  "BUMBLEBEAT AUDIO LTDA": 5000000,
  "CAIO SOARES DIRECAO DE ARTE LTDA": 4500000,
  "EVIL TWIN": 4500000,
  "MELANINA FILMES LTDA": 3471902,
  "PICTURE HOUSE PRODUÇÕES LTDA": 1763152,
  "GETTY IMAGE": 236113,
  "G&S IMAGENS DO BRASIL LTDA.": 680000,
  "LOC LACADORA DE EQUIPAMENTOS CINEMATOGRÁFICOS LTDA": 1800000,
  "CUSTO INTERNO / ANCINE": 1110044,
  "FM MORAES FILMES": 960500,
};

const MONTH_TOTALS_CENTS: Record<string, number> = {
  "2025-01": 24901200,
  "2025-02": 52980000,
  "2025-03": 57558600,
  "2025-04": 5252,
  "2025-05": 38328951,
  "2025-06": 103329113,
  "2025-07": 11000000,
  "2025-08": 11442322,
  "2025-09": 43339251,
  "2025-10": 63641300,
};

const SUPPLIER_MONTHLY_CENTS: Record<string, Record<string, number>> = {
  "MONALISA STUDIO LTDA": {
    "2025-01": 12800000,
    "2025-02": 7800000,
    "2025-03": 9500000,
    "2025-05": 22200000,
    "2025-06": 5200000,
    "2025-07": 5200000,
    "2025-08": 5139500,
    "2025-09": 21349978,
    "2025-10": 8450000,
  },
  "SUBSOUND AUDIO PRODUÇÕES LTDA": {
    "2025-01": 8400000,
    "2025-02": 4200000,
    "2025-03": 7000000,
    "2025-05": 12000000,
    "2025-06": 2800000,
    "2025-07": 2800000,
    "2025-08": 3900000,
    "2025-09": 11950000,
    "2025-10": 6050000,
  },
  "O2 FILMES PUBLICITARIOS LTDA": { "2025-06": 75000000, "2025-09": 558300, "2025-10": 558300 },
  "STINK SP PRODUCAO DE FILMES LTDA": { "2025-10": 41495000 },
  "TRUST DESIGN MULTIMIDIA S/S LTDA": { "2025-02": 29980000 },
  "MELLODIA FILMES E PRODUÇÕES EIRELLI": { "2025-03": 27500000 },
  "CINE CINEMATOGRÁFICA LTDA": {
    "2025-01": 2401200,
    "2025-03": 593000,
    "2025-05": 593000,
    "2025-06": 15093000,
    "2025-10": 593000,
  },
  "PALMA EVENTOS E PRODUÇÕES CULTURAIS LTDA": { "2025-01": 1300000, "2025-03": 3500000, "2025-05": 1800000 },
  "CANJA PRODUCOES MUSICAIS LTDA-ME": { "2025-02": 6000000, "2025-03": 1300000 },
  "ANTFOOD PRODUÇÕES LTDA": { "2025-09": 6500000 },
  "555 STUDIOS LTDA": { "2025-03": 6000000 },
  "MARCOS LOPES STUDIO E PHOTO LTDA": { "2025-02": 5000000 },
  "BUMBLEBEAT AUDIO LTDA": { "2025-06": 5000000 },
  "CAIO SOARES DIRECAO DE ARTE LTDA": { "2025-07": 3000000, "2025-10": 1500000 },
  "EVIL TWIN": { "2025-10": 4500000 },
  "MELANINA FILMES LTDA": { "2025-05": 1735951, "2025-09": 1735951 },
  "PICTURE HOUSE PRODUÇÕES LTDA": {
    "2025-03": 365600,
    "2025-04": 5252,
    "2025-08": 587300,
    "2025-09": 690000,
    "2025-10": 115000,
  },
  "GETTY IMAGE": { "2025-06": 236113 },
  "G&S IMAGENS DO BRASIL LTDA.": { "2025-08": 300000, "2025-10": 380000 },
  "LOC LACADORA DE EQUIPAMENTOS CINEMATOGRÁFICOS LTDA": { "2025-03": 1800000 },
  "CUSTO INTERNO / ANCINE": { "2025-08": 555022, "2025-09": 555022 },
  "FM MORAES FILMES": { "2025-08": 960500 },
};

/* ================== Header ================== */
const CompanyHeader = ({ title, subtitle }: { title?: string; subtitle?: string }) => (
  <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6 rounded-xl mb-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow">
          <div className="text-xl font-bold text-gray-800">WE/MOTTA</div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">WE/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA</h1>
          <p className="opacity-80">{title || "Relatório Financeiro Executivo — BYD"}</p>
          {subtitle && <p className="opacity-60 text-sm mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="text-right text-sm">
        <p>CNPJ: 05.265.118/0001-65</p>
        <p>Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
      </div>
    </div>
    <div className="mt-3 text-sm opacity-90">Rua Chilon, 381 • Vila Olímpia • São Paulo – SP • 04552-030</div>
  </div>
);

/* ================== Blocos ================== */
const TopSummary = ({ total, meses, fornecedores }: { total: number; meses: number; fornecedores: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card className="md:col-span-2 rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Faturamento total até hoje</div>
            <div className="text-3xl font-bold tabular-nums">{BRL(total)}</div>
            <div className="text-xs text-muted-foreground mt-1">Período: Jan–Out/2025 (apurado)</div>
          </div>
          <DollarSign className="w-10 h-10 text-primary" />
        </div>
      </CardContent>
    </Card>
    <Card className="rounded-xl">
      <CardContent className="p-5 text-center">
        <Building2 className="w-6 h-6 mx-auto mb-1" />
        <div className="text-xs">Fornecedores</div>
        <div className="text-xl font-bold">{fornecedores}</div>
      </CardContent>
    </Card>
    <Card className="rounded-xl">
      <CardContent className="p-5 text-center">
        <Calendar className="w-6 h-6 mx-auto mb-1" />
        <div className="text-xs">Meses analisados</div>
        <div className="text-xl font-bold">{meses}</div>
      </CardContent>
    </Card>
  </div>
);

const ExecutiveInsights = ({ suppliers, monthly }: { suppliers: SupplierRow[]; monthly: MonthlyRow[] }) => {
  const top = suppliers[0];
  const lastGrowth =
    monthly.length > 1 ? ((monthly.at(-1)!.total - monthly.at(-2)!.total) / monthly.at(-2)!.total) * 100 : 0;
  const top3 = suppliers.slice(0, 3).reduce((s, v) => s + v.percentage, 0);
  return (
    <Card className="mb-6 rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Insights executivos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50/70">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4" />
              <b>Fornecedor destaque</b>
            </div>
            <div className="text-sm">
              {top?.name ?? "—"} representa {top ? top.percentage.toFixed(1) : "0"}% do total
            </div>
          </div>
          <div
            className={`p-4 rounded-lg border-l-4 ${lastGrowth >= 0 ? "border-green-500 bg-green-50/70" : "border-yellow-500 bg-yellow-50/70"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {lastGrowth >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              <b>Último mês</b>
            </div>
            <div className="text-sm">
              {lastGrowth >= 0 ? "+" : ""}
              {lastGrowth.toFixed(1)}%
            </div>
          </div>
          <div
            className={`p-4 rounded-lg border-l-4 ${top3 > 60 ? "border-yellow-500 bg-yellow-50/70" : "border-blue-500 bg-blue-50/70"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <b>Concentração</b>
            </div>
            <div className="text-sm">Top 3 concentram {top3.toFixed(1)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* Tooltip de moeda consistente */
const CurrencyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number; // valor em "reais" (não centavos)
  return (
    <div className="rounded-md border bg-background p-2 text-xs shadow">
      <div className="font-semibold">{label}</div>
      <div className="mt-1">{BRL(v * 100)}</div>
    </div>
  );
};

const MonthlyTable = ({ monthly }: { monthly: MonthlyRow[] }) => (
  <Card className="mb-6 rounded-xl">
    <CardHeader>
      <CardTitle>Faturamento por mês</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-3">Mês</th>
                <th className="text-right py-2 px-3">Valor</th>
                <th className="text-right py-2 px-3"># Registros</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month} className="border-b odd:bg-muted/30">
                  <td className="py-2 px-3">{monthLabel(m.month)}</td>
                  <td className="py-2 px-3 text-right font-semibold tabular-nums font-mono">{BRL(m.total)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">{m.count}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary/10 font-bold">
                <td className="py-2 px-3">TOTAL</td>
                <td className="py-2 px-3 text-right tabular-nums">{BRL(monthly.reduce((s, m) => s + m.total, 0))}</td>
                <td className="py-2 px-3 text-right tabular-nums">{monthly.reduce((s, m) => s + m.count, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={monthly.map((m) => ({ mes: monthLabel(m.month), total: m.total / 100 }))}
              margin={{ top: 10, right: 20, bottom: 30, left: 10 }}
              barSize={28}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" angle={-20} textAnchor="end" height={40} />
              <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend />
              <Bar dataKey="total" fill="#3B82F6" radius={[6, 6, 0, 0]}>
                <LabelList position="top" formatter={(v: number) => BRL_COMPACT(v * 100)} className="text-[10px]" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-muted-foreground">Rótulos usam valor compacto para leitura rápida.</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const SuppliersBlock = ({ suppliers }: { suppliers: SupplierRow[] }) => {
  const top = suppliers.slice(0, 8);
  const bars = top.map((s) => ({
    name: s.name.length > 24 ? s.name.slice(0, 24) + "…" : s.name,
    valor: s.total / 100,
  }));
  const pies = top.map((s, i) => ({ name: bars[i].name, value: s.total, pct: s.percentage }));
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Top fornecedores por valor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={bars} layout="vertical" margin={{ left: 160, right: 16, top: 8, bottom: 8 }} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={150} />
                <Tooltip content={<CurrencyTooltip />} />
                <Bar dataKey="valor" fill="#3B82F6" radius={[0, 6, 6, 0]}>
                  <LabelList position="right" formatter={(v: number) => BRL_COMPACT(v * 100)} className="text-[10px]" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Distribuição por fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={pies}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={110}
                  labelLine={false}
                  label={(e: any) => `${e.name}: ${e.pct.toFixed(1)}%`}
                >
                  {pies.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => BRL(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-muted-foreground">Mostrando top 8 fornecedores por participação.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 rounded-xl">
        <CardHeader>
          <CardTitle>Faturamento por fornecedor (ranking)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Fornecedor</th>
                  <th className="text-right py-2 px-3">Total</th>
                  <th className="text-right py-2 px-3">% do total</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s, i) => (
                  <tr key={s.name} className="border-b odd:bg-muted/30">
                    <td className="py-2 px-3">{i + 1}</td>
                    <td className="py-2 px-3">{s.name}</td>
                    <td className="py-2 px-3 text-right font-semibold tabular-nums font-mono">{BRL(s.total)}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                      {s.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary/10 font-bold">
                  <td className="py-2 px-3" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {BRL(suppliers.reduce((s, v) => s + v.total, 0))}
                  </td>
                  <td className="py-2 px-3 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

/* ====== Matriz histórico com cabeçalho/1ª coluna colantes e zebra rows ====== */
const HistoricalMatrix = ({
  suppliers,
  months,
  matrix,
}: {
  suppliers: string[];
  months: string[];
  matrix: Record<string, Record<string, number>>;
}) => {
  const colTotals = months.map((m) => suppliers.reduce((s, sup) => s + (matrix[sup]?.[m] || 0), 0));
  const grandTotal = colTotals.reduce((a, b) => a + b, 0);

  return (
    <Card className="mb-6 rounded-xl">
      <CardHeader>
        <CardTitle>Histórico por fornecedor × mês</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2 px-3 sticky left-0 bg-muted/50">Fornecedor</th>
              {months.map((m) => (
                <th key={m} className="text-right py-2 px-3 whitespace-nowrap">
                  {monthLabel(m)}
                </th>
              ))}
              <th className="text-right py-2 px-3">Total</th>
              <th className="text-right py-2 px-3">% do total</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((name, idx) => {
              const rowTotal = months.reduce((s, m) => s + (matrix[name]?.[m] || 0), 0);
              const pct = grandTotal > 0 ? (rowTotal / grandTotal) * 100 : 0;
              return (
                <tr key={name} className={`border-b ${idx % 2 === 0 ? "bg-muted/20" : ""}`}>
                  <td className="py-2 px-3 sticky left-0 bg-background">{name}</td>
                  {months.map((m) => (
                    <td key={`${name}-${m}`} className="py-2 px-3 text-right tabular-nums font-mono">
                      {matrix[name]?.[m] ? BRL(matrix[name][m]) : "—"}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right font-semibold tabular-nums font-mono">{BRL(rowTotal)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">{pct.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0">
            <tr className="bg-primary/10 font-bold">
              <td className="py-2 px-3 sticky left-0 bg-primary/10">TOTAL</td>
              {colTotals.map((v, i) => (
                <td key={i} className="py-2 px-3 text-right tabular-nums">
                  {BRL(v)}
                </td>
              ))}
              <td className="py-2 px-3 text-right tabular-nums">{BRL(grandTotal)}</td>
              <td className="py-2 px-3 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
};

/* ====== Páginas detalhadas por fornecedor (gráfico com rótulo) ====== */
const SupplierDetailPages = ({
  suppliers,
  months,
  matrix,
}: {
  suppliers: SupplierRow[];
  months: string[];
  matrix: Record<string, Record<string, number>>;
}) => (
  <div>
    {suppliers.map((s) => {
      const series = months.map((m) => ({ mes: monthLabel(m), valor: (matrix[s.name]?.[m] || 0) / 100 }));
      const rowTotal = months.reduce((sum, m) => sum + (matrix[s.name]?.[m] || 0), 0);
      const count = months.reduce((sum, m) => sum + ((matrix[s.name]?.[m] || 0) > 0 ? 1 : 0), 0);
      return (
        <div key={s.name} className="mb-8">
          <Card className="mb-4 rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">Relatório detalhado — {s.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="rounded-lg">
                  <CardContent className="p-4 text-center">
                    <div className="text-sm text-muted-foreground">Total faturado</div>
                    <div className="text-xl font-bold tabular-nums">{BRL(rowTotal)}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-lg">
                  <CardContent className="p-4 text-center">
                    <div className="text-sm text-muted-foreground">Meses com faturamento</div>
                    <div className="text-xl font-bold">{count}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-lg">
                  <CardContent className="p-4 text-center">
                    <div className="text-sm text-muted-foreground">% do total</div>
                    <div className="text-xl font-bold">{s.percentage.toFixed(1)}%</div>
                  </CardContent>
                </Card>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={series} margin={{ top: 10, right: 20, bottom: 10, left: 10 }} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend />
                  <Bar dataKey="valor" fill="#10B981" radius={[6, 6, 0, 0]}>
                    <LabelList position="top" formatter={(v: number) => BRL_COMPACT(v * 100)} className="text-[10px]" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      );
    })}
  </div>
);

/* ================== Página ================== */
export default function FinanceExecutiveReport() {
  const months = useMemo(() => Object.keys(MONTH_TOTALS_CENTS).sort(), []);
  const monthly: MonthlyRow[] = useMemo(
    () =>
      months.map((m) => ({
        month: m,
        total: MONTH_TOTALS_CENTS[m],
        count: Object.values(SUPPLIER_MONTHLY_CENTS).reduce((s, row) => s + ((row[m] || 0) > 0 ? 1 : 0), 0),
      })),
    [months],
  );

  const totalAteHoje = monthly.reduce((s, m) => s + m.total, 0);

  const suppliers: SupplierRow[] = useMemo(() => {
    const grand = Object.values(SUPPLIER_TOTALS_CENTS).reduce((s, v) => s + v, 0);
    return Object.entries(SUPPLIER_TOTALS_CENTS)
      .map(([name, total]) => ({ name, total, percentage: grand > 0 ? (total / grand) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, []);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Relatório Financeiro — BYD</h2>
        <Button onClick={handlePrint} size="lg">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <CompanyHeader title="Relatório Executivo para Sócios" subtitle="BYD — 2025 (Jan–Out)" />

      <TopSummary total={totalAteHoje} meses={months.length} fornecedores={suppliers.length} />
      <MonthlyTable monthly={monthly} />
      <ExecutiveInsights suppliers={suppliers} monthly={monthly} />
      <SuppliersBlock suppliers={suppliers} />
      <HistoricalMatrix suppliers={suppliers.map((s) => s.name)} months={months} matrix={SUPPLIER_MONTHLY_CENTS} />
      <SupplierDetailPages suppliers={suppliers} months={months} matrix={SUPPLIER_MONTHLY_CENTS} />

      <style>{`
        .tabular-nums { font-variant-numeric: tabular-nums; }
        @media print {
          @page { margin: 1.5cm; size: A4 portrait; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          thead { position: static !important; }
          td.sticky, th.sticky { position: static !important; }
        }
      `}</style>
    </div>
  );
}
