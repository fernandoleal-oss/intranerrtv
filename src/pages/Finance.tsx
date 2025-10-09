// src/pages/Finance.tsx
import { useEffect, useMemo, useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Percent, Download, FileSpreadsheet } from "lucide-react";
import { ExcelImportDialog } from "@/components/finance/ExcelImportDialog";
import { GoogleSheetsSync } from "@/components/finance/GoogleSheetsSync";
import { TopClientsCard } from "@/components/finance/TopClientsCard";
import { TopSuppliersCard } from "@/components/finance/TopSuppliersCard";
import { FinancialReport } from "@/components/finance/FinancialReport";
import { AnnualTotalsDialog } from "@/components/finance/AnnualTotalsDialog";
import { ImportSpreadsheetModal } from "@/components/finance/ImportSpreadsheetModal";
import { useAuth } from "@/components/AuthProvider";
import { canEditFinance } from "@/utils/permissions";
import { supabase } from "@/integrations/supabase/client";

type ClientSummary = { client: string; total: number; count: number };
type SupplierSummary = { supplier: string; total: number; count: number };

type Event = {
  id?: string;
  cliente: string | null;
  fornecedor: string | null;
  ref_month: string; // "YYYY-MM" ou "YYYY-MM-DD"
  total_cents: number | null;
  valor_fornecedor_cents: number | null;
};

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(v);
}

function ym(ref: string | null | undefined) {
  if (!ref) return "";
  return ref.slice(0, 7); // pega YYYY-MM mesmo que venha YYYY-MM-DD
}

export default function Finance() {
  const { user } = useAuth();
  const canEdit = canEditFinance(user?.email);

  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [topClients, setTopClients] = useState<ClientSummary[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<SupplierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_events")
        .select("cliente, fornecedor, ref_month, total_cents, valor_fornecedor_cents")
        .order("ref_month", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as Event[];
      setAllEvents(rows);

      // Top Clients
      const clientsGrouped = rows.reduce(
        (acc, row) => {
          const client = row.cliente || "Sem cliente";
          if (!acc[client]) acc[client] = { client, total: 0, count: 0 };
          acc[client].total += (row.total_cents ?? 0) / 100;
          acc[client].count += 1;
          return acc;
        },
        {} as Record<string, ClientSummary>,
      );
      setTopClients(Object.values(clientsGrouped).sort((a, b) => b.total - a.total));

      // Top Suppliers (ignora “Sem fornecedor”)
      const suppliersGrouped = rows.reduce(
        (acc, row) => {
          const supplier = row.fornecedor || "Sem fornecedor";
          if (supplier === "Sem fornecedor") return acc;
          if (!acc[supplier]) acc[supplier] = { supplier, total: 0, count: 0 };
          acc[supplier].total += (row.valor_fornecedor_cents ?? 0) / 100;
          acc[supplier].count += 1;
          return acc;
        },
        {} as Record<string, SupplierSummary>,
      );
      setTopSuppliers(Object.values(suppliersGrouped).sort((a, b) => b.total - a.total));
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  }

  const { receitaMes, despesaMes, resultadoMes, margemMes, varReceitaPct, varDespesaPct } = useMemo(() => {
    if (allEvents.length === 0) {
      return {
        receitaMes: 0,
        despesaMes: 0,
        resultadoMes: 0,
        margemMes: 0,
        varReceitaPct: 0,
        varDespesaPct: 0,
      };
    }

    const now = new Date();
    const curYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYM = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

    const curRows = allEvents.filter((r) => ym(r.ref_month) === curYM);
    const prevRows = allEvents.filter((r) => ym(r.ref_month) === prevYM);

    const sum = (xs: Event[], sel: (e: Event) => number) => xs.reduce((acc, e) => acc + sel(e), 0);

    const receita = sum(curRows, (e) => (e.total_cents ?? 0) / 100);
    const despesa = sum(curRows, (e) => (e.valor_fornecedor_cents ?? 0) / 100);
    const receitaPrev = sum(prevRows, (e) => (e.total_cents ?? 0) / 100);
    const despesaPrev = sum(prevRows, (e) => (e.valor_fornecedor_cents ?? 0) / 100);

    const resultado = receita - despesa;
    const margem = receita > 0 ? (resultado / receita) * 100 : 0;

    const varR = receitaPrev > 0 ? ((receita - receitaPrev) / receitaPrev) * 100 : 0;
    const varD = despesaPrev > 0 ? ((despesa - despesaPrev) / despesaPrev) * 100 : 0;

    return {
      receitaMes: receita,
      despesaMes: despesa,
      resultadoMes: resultado,
      margemMes: margem,
      varReceitaPct: varR,
      varDespesaPct: varD,
    };
  }, [allEvents]);

  function handleExportCSV() {
    const header = ["ref_month", "cliente", "fornecedor", "total", "valor_fornecedor"].join(",");

    const lines = allEvents.map((e) =>
      [
        ym(e.ref_month),
        `"${(e.cliente ?? "").replaceAll('"', '""')}"`,
        `"${(e.fornecedor ?? "").replaceAll('"', '""')}"`,
        (e.total_cents ?? 0) / 100,
        (e.valor_fornecedor_cents ?? 0) / 100,
      ].join(","),
    );

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_events_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-white">
      <HeaderBar
        title="Financeiro"
        subtitle="Visão geral e análise financeira"
        backTo="/"
        actions={
          <div className="flex gap-2 flex-wrap">
            <FinancialReport />
            <AnnualTotalsDialog />
            <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setShowImportModal(true)}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar/Colar Planilha
                </Button>
                <GoogleSheetsSync onSyncComplete={loadData} />
                <ExcelImportDialog onImportComplete={loadData} />
              </>
            )}
          </div>
        }
      />

      <div className="container-page py-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receitas do Mês</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{formatBRL(receitaMes)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                {varReceitaPct >= 0 ? "+" : ""}
                {varReceitaPct.toFixed(1)}% vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Despesas do Mês</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{formatBRL(despesaMes)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {varDespesaPct >= 0 ? "+" : ""}
                {varDespesaPct.toFixed(1)}% vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatBRL(resultadoMes)}</div>
              <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Margem</CardTitle>
              <Percent className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">{margemMes.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">% de lucro do mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Aviso de permissão */}
        {!canEdit && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-800">
                <strong>Visualização apenas.</strong> Apenas fernando.leal@we.com.br pode editar dados financeiros.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopClientsCard clients={topClients} loading={loading} />
          <TopSuppliersCard suppliers={topSuppliers} loading={loading} />
        </div>
      </div>

      <ImportSpreadsheetModal open={showImportModal} onOpenChange={setShowImportModal} onImportComplete={loadData} />
    </div>
  );
}
