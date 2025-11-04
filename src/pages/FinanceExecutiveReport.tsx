import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// =====================================================
// Utils
// =====================================================
const BRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[m - 1]}/${y}`;
};

// Detecta modo de impressão para reduzir rótulos e elementos que estouram página
const usePrintMode = () => {
  const [isPrint, setIsPrint] = useState(false);
  useEffect(() => {
    const before = () => setIsPrint(true);
    const after = () => setIsPrint(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  return isPrint;
};

// =====================================================
// Types
// =====================================================
type MonthlyRow = { month: string; total: number; count: number };
type SupplierRow = { name: string; total: number; percentage: number };

// =====================================================
// Paleta consistente e legível
// =====================================================
const COLORS = [
  "#2563EB", // blue-600
  "#059669", // emerald-600
  "#D97706", // amber-600
  "#DC2626", // red-600
  "#7C3AED", // violet-600
  "#0EA5E9", // sky-500
  "#65A30D", // lime-600
  "#EA580C", // orange-600
  "#4F46E5", // indigo-600
  "#DB2777", // pink-600
  "#0891B2", // cyan-600
  "#1D4ED8", // blue-700
];

// =====================================================
// Dados (consolidados do PDF)
// =====================================================
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

// =====================================================
// Blocos de layout
// =====================================================
const CompanyHeader = ({ title, subtitle }: { title?: string; subtitle?: string }) => (
  <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6 rounded-lg mb-6 avoid-break">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
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

const OnePageHeader = ({ title, subtitle }: { title?: string; subtitle?: string }) => (
  <div className="border rounded-lg p-4 mb-4 text-gray-900 bg-white avoid-break">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm">WE/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA • CNPJ 05.265.118/0001-65</div>
        <div className="font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
      <div className="text-xs text-right">
        <div>Gerado em {new Date().toLocaleDateString("pt-BR")}</div>
        <div>Rua Chilon, 381 – SP</div>
      </div>
    </div>
  </div>
);

const TopSummary = ({ total, meses, fornecedores }: { total: number; meses: number; fornecedores: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card className="md:col-span-2 avoid-break">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Faturamento total até hoje</div>
            <div className="text-3xl font-bold">{BRL(total)}</div>
            <div className="text-xs text-muted-foreground mt-1">Período: Jan–Out/2025 (apurado)</div>
          </div>
          <DollarSign className="w-10 h-10 text-primary" />
        </div>
      </CardContent>
    </Card>
    <Card className="avoid-break">
      <CardContent className="p-5 text-center">
        <Building2 className="w-6 h-6 mx-auto mb-1" />
        <div className="text-xs">Fornecedores</div>
        <div className="text-xl font-bold">{fornecedores}</div>
      </CardContent>
    </Card>
    <Card className="avoid-break">
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
    <Card className="mb-6 avoid-break">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Insights executivos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border-l-4 border-blue-600 bg-blue-50">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4" />
              <b>Fornecedor destaque</b>
            </div>
            <div className="text-sm">
              {top?.name ?? "—"} representa {top ? top.percentage.toFixed(1) : "0"}% do total
            </div>
          </div>
          <div
            className={`p-4 rounded-lg border-l-4 ${lastGrowth >= 0 ? "border-green-600 bg-green-50" : "border-yellow-600 bg-yellow-50"}`}
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
            className={`p-4 rounded-lg border-l-4 ${top3 > 60 ? "border-yellow-600 bg-yellow-50" : "border-blue-600 bg-blue-50"}`}
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

const MonthlyTable = ({ monthly }: { monthly: MonthlyRow[] }) => (
  <Card className="mb-6 avoid-break">
    <CardHeader>
      <CardTitle>Faturamento por mês</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm compact-table">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-3">Mês</th>
                <th className="text-right py-2 px-3">Valor</th>
                <th className="text-right py-2 px-3"># Registros</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month} className="border-b">
                  <td className="py-2 px-3">{monthLabel(m.month)}</td>
                  <td className="py-2 px-3 text-right font-semibold">{BRL(m.total)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{m.count}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary/10 font-bold">
                <td className="py-2 px-3">TOTAL</td>
                <td className="py-2 px-3 text-right">{BRL(monthly.reduce((s, m) => s + m.total, 0))}</td>
                <td className="py-2 px-3 text-right">{monthly.reduce((s, m) => s + m.count, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="print:break-inside-avoid avoid-break">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthly.map((m) => ({ mes: monthLabel(m.month), total: m.total / 100 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Faturamento"]} />
              <Legend className="print:hidden" />
              <Bar dataKey="total" fill="#2563EB">
                <LabelList
                  className="print:hidden"
                  dataKey="total"
                  position="right"
                  formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </CardContent>
  </Card>
);

// =====================================================
// Suppliers Charts (UX melhor + impressão segura)
// =====================================================
const SuppliersCharts = ({ suppliers }: { suppliers: SupplierRow[] }) => {
  const [topN, setTopN] = useState(8);
  const isPrint = usePrintMode();

  const { bars, pies, totalAll, longestLabel } = useMemo(() => {
    const totalAll = suppliers.reduce((s, v) => s + v.total, 0);
    const top = suppliers.slice(0, topN);
    const sumTop = top.reduce((s, v) => s + v.total, 0);
    const others = totalAll - sumTop;

    const bars = top.map((s) => ({
      full: s.name,
      name: s.name.length > 26 ? s.name.slice(0, 26) + "…" : s.name,
      valor: s.total / 100,
      pct: s.percentage,
    }));

    const piesBase = top.map((s) => ({ name: s.name, value: s.total, pct: s.percentage }));
    const pies =
      others > 0 ? [...piesBase, { name: "Outros", value: others, pct: (others / totalAll) * 100 }] : piesBase;

    const longestLabel = top.reduce((m, s) => Math.max(m, s.name.length), 0);
    return { bars, pies, totalAll, longestLabel };
  }, [suppliers, topN]);

  const yAxisWidth = Math.min(280, Math.max(160, Math.round(longestLabel * 7.2)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h3 className="text-lg font-semibold">Análise por fornecedor</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Top</span>
          <Select value={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 8, 10, 12, 15].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ranking - FULL WIDTH */}
      <Card className="print:break-inside-avoid avoid-break">
        <CardHeader>
          <CardTitle>Top fornecedores por valor</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={isPrint ? 320 : 440}>
            <BarChart data={bars} layout="vertical" margin={{ left: yAxisWidth, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `R$ ${(Number(v) / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={yAxisWidth} />
              <Tooltip
                formatter={(v: number, key: string, p: any) => {
                  if (key === "valor") return [`R$ ${v.toLocaleString("pt-BR")}`, p.payload.full];
                  return [String(v), key];
                }}
              />
              <Legend className="print:hidden" />
              <Bar dataKey="valor" name="Valor" fill="#2563EB" radius={[0, 6, 6, 0]}>
                {!isPrint && (
                  <LabelList
                    dataKey="valor"
                    position="right"
                    formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição - FULL WIDTH com legenda ao lado (oculta em print) */}
      <Card className="print:break-inside-avoid avoid-break">
        <CardHeader>
          <CardTitle>Distribuição por fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-center">
            <div className="w-full">
              <ResponsiveContainer width="100%" height={isPrint ? 360 : 420}>
                <PieChart>
                  <Pie
                    data={pies}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={isPrint ? 140 : 160}
                    paddingAngle={2}
                    label={(e) => `${e.name.length > 20 ? e.name.slice(0, 20) + "…" : e.name} • ${e.pct.toFixed(1)}%`}
                  >
                    {pies.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, _n, p: any) => [`${BRL(v)}`, p?.payload?.name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full max-h-[420px] overflow-auto pr-2 print:hidden">
              <ul className="space-y-2 text-sm">
                {pies.map((p, i) => (
                  <li key={p.name} className="flex items-center justify-between border-b py-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span title={p.name} className="truncate max-w-[24ch]">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right text-muted-foreground">
                      <span className="mr-3 font-medium">{p.pct.toFixed(1)}%</span>
                      <span>{BRL(p.value)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3">Total considerado: {BRL(totalAll)}</div>
        </CardContent>
      </Card>
    </div>
  );
};

// =====================================================
// Matriz histórica
// =====================================================
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
    <Card className="mb-6 print:break-inside-avoid avoid-break">
      <CardHeader>
        <CardTitle>Histórico por fornecedor × mês</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs compact-table">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2 px-3">Fornecedor</th>
              {months.map((m) => (
                <th key={m} className="text-right py-2 px-3">
                  {monthLabel(m)}
                </th>
              ))}
              <th className="text-right py-2 px-3">Total</th>
              <th className="text-right py-2 px-3">% do total</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((name) => {
              const rowTotal = months.reduce((s, m) => s + (matrix[name]?.[m] || 0), 0);
              const pct = grandTotal > 0 ? (rowTotal / grandTotal) * 100 : 0;
              return (
                <tr key={name} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3">{name}</td>
                  {months.map((m) => (
                    <td key={`${name}-${m}`} className="py-2 px-3 text-right">
                      {matrix[name]?.[m] ? BRL(matrix[name][m]) : "—"}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right font-semibold">{BRL(rowTotal)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{pct.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-primary/10 font-bold">
              <td className="py-2 px-3">TOTAL</td>
              {colTotals.map((v, i) => (
                <td key={i} className="py-2 px-3 text-right">
                  {BRL(v)}
                </td>
              ))}
              <td className="py-2 px-3 text-right">{BRL(grandTotal)}</td>
              <td className="py-2 px-3 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
};

// =====================================================
// Páginas detalhadas por fornecedor
// =====================================================
const SupplierDetailPages = ({
  suppliers,
  months,
  matrix,
}: {
  suppliers: SupplierRow[];
  months: string[];
  matrix: Record<string, Record<string, number>>;
}) => {
  const isPrint = usePrintMode();
  return (
    <div>
      {suppliers.map((s) => {
        const series = months.map((m) => ({ mes: monthLabel(m), valor: (matrix[s.name]?.[m] || 0) / 100 }));
        const rowTotal = months.reduce((sum, m) => sum + (matrix[s.name]?.[m] || 0), 0);
        const count = months.reduce((sum, m) => sum + ((matrix[s.name]?.[m] || 0) > 0 ? 1 : 0), 0);
        return (
          <div key={s.name} className="mb-8">
            <Card className="mb-4 print:break-inside-avoid avoid-break">
              <CardHeader>
                <CardTitle className="text-lg">Relatório detalhado — {s.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="avoid-break">
                    <CardContent className="p-4 text-center">
                      <div className="text-sm text-muted-foreground">Total faturado</div>
                      <div className="text-xl font-bold">{BRL(rowTotal)}</div>
                    </CardContent>
                  </Card>
                  <Card className="avoid-break">
                    <CardContent className="p-4 text-center">
                      <div className="text-sm text-muted-foreground">Meses com faturamento</div>
                      <div className="text-xl font-bold">{count}</div>
                    </CardContent>
                  </Card>
                  <Card className="avoid-break">
                    <CardContent className="p-4 text-center">
                      <div className="text-sm text-muted-foreground">% do total</div>
                      <div className="text-xl font-bold">{s.percentage.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                </div>
                <div className="print:break-inside-avoid avoid-break">
                  <ResponsiveContainer width="100%" height={isPrint ? 300 : 320}>
                    <BarChart data={series}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Faturamento"]} />
                      <Legend className="print:hidden" />
                      <Bar dataKey="valor" fill="#059669">
                        {!isPrint && (
                          <LabelList
                            dataKey="valor"
                            position="top"
                            formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
                          />
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

// =====================================================
// Resumo 1 página (total + fornecedores)
// =====================================================
const OnePageSummary = ({ total, suppliers }: { total: number; suppliers: SupplierRow[] }) => {
  return (
    <div className="onepage print:break-inside-avoid">
      <OnePageHeader title="Resumo Executivo — BYD (1 página)" subtitle="Total faturado e ranking de fornecedores" />

      <Card className="mb-4 avoid-break">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Faturamento total apurado</div>
            <div className="text-2xl font-bold">{BRL(total)}</div>
          </div>
          <DollarSign className="w-8 h-8 text-primary" />
        </CardContent>
      </Card>

      <Card className="avoid-break">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Fornecedores — valor total</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <table className="w-full text-[12px] compact-table">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left py-2 px-2 w-8">#</th>
                <th className="text-left py-2 px-2">Fornecedor</th>
                <th className="text-right py-2 px-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={s.name} className={cn("border-b", i % 2 === 0 ? "bg-white" : "bg-muted/20")}>
                  <td className="py-1.5 px-2 text-xs">{i + 1}</td>
                  <td className="py-1.5 px-2">{s.name}</td>
                  <td className="py-1.5 px-2 text-right font-medium">{BRL(s.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary/10 font-semibold">
                <td className="py-2 px-2" colSpan={2}>
                  TOTAL
                </td>
                <td className="py-2 px-2 text-right">{BRL(suppliers.reduce((sum, v) => sum + v.total, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Regras para garantir que tudo caiba em 1 página ao imprimir */}
      <style>{`
        @media print {
          .onepage { font-size: 11px; }
          .onepage table.compact-table { font-size: 11px; }
          .onepage .p-4 { padding: 12px !important; }
          .onepage .py-2 { padding-top: 6px !important; padding-bottom: 6px !important; }
          .onepage .py-1\\.5 { padding-top: 4px !important; padding-bottom: 4px !important; }
          @page { size: A4 portrait; margin: 1.2cm; }
        }
      `}</style>
    </div>
  );
};

// =====================================================
// Página
// =====================================================
export default function FinanceExecutiveReport() {
  const [mode, setMode] = useState<"full" | "summary">("full");

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold">Relatório Financeiro — BYD</h2>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant={mode === "full" ? "default" : "secondary"} onClick={() => setMode("full")}>
            Visão completa
          </Button>
          <Button variant={mode === "summary" ? "default" : "secondary"} onClick={() => setMode("summary")}>
            Resumo (1 página)
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {mode === "summary" ? (
        <>
          <OnePageSummary total={suppliers.reduce((s, v) => s + v.total, 0)} suppliers={suppliers} />
        </>
      ) : (
        <>
          <CompanyHeader title="Relatório Executivo para Sócios" subtitle="BYD — 2025 (Jan–Out)" />
          <TopSummary total={totalAteHoje} meses={months.length} fornecedores={suppliers.length} />
          <MonthlyTable monthly={monthly} />
          <ExecutiveInsights suppliers={suppliers} monthly={monthly} />
          <SuppliersCharts suppliers={suppliers} />
          <HistoricalMatrix suppliers={suppliers.map((s) => s.name)} months={months} matrix={SUPPLIER_MONTHLY_CENTS} />
          <SupplierDetailPages suppliers={suppliers} months={months} matrix={SUPPLIER_MONTHLY_CENTS} />
        </>
      )}

      {/* Estilos de impressão e anti-quebra */}
      <style>{`
        @media print {
          @page { margin: 1.2cm; size: A4 portrait; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #fff !important; }

          /* Esconde elementos de UI desnecessários na impressão */
          .print\\:hidden { display: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }

          /* Tabelas com cabeçalho e rodapé persistentes */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }

          /* Compactação para caber sem cortar */
          .compact-table { font-size: 11px; table-layout: fixed; }
          .compact-table th, .compact-table td { padding: 4px 6px !important; word-wrap: break-word; }

          /* Reduz margens internas dos cards para caber melhor */
          .p-6 { padding: 16px !important; }
          .p-5 { padding: 14px !important; }
          .p-4 { padding: 12px !important; }
        }
      `}</style>
    </div>
  );
}
