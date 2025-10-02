// src/pages/Finance.tsx
import { useEffect, useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Percent, Download } from "lucide-react";
import { ExcelImportDialog } from "@/components/finance/ExcelImportDialog";
import { TopClientsCard } from "@/components/finance/TopClientsCard";
import { TopSuppliersCard } from "@/components/finance/TopSuppliersCard";
import { MonthlyReportDialog } from "@/components/finance/MonthlyReportDialog";
import { AnnualTotalsDialog } from "@/components/finance/AnnualTotalsDialog";
import { useAuth } from "@/components/AuthProvider";
import { canEditFinance } from "@/utils/permissions";
import { supabase } from "@/integrations/supabase/client";

type ClientSummary = {
  client: string;
  total: number;
  count: number;
};

type SupplierSummary = {
  supplier: string;
  total: number;
  count: number;
};

type Event = {
  id: string;
  cliente: string | null;
  fornecedor: string | null;
  ref_month: string;
  total_cents: number;
  valor_fornecedor_cents: number;
};


/* ------------------------- Página ------------------------- */
export default function Finance() {
  const { user } = useAuth();
  const canEdit = canEditFinance(user?.email);

  const [topClients, setTopClients] = useState<ClientSummary[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<SupplierSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("finance_events")
        .select("cliente, fornecedor, total_cents, valor_fornecedor_cents")
        .order("ref_month", { ascending: false });

      if (data) {
        // Group by clients
        const clientsGrouped = (data as Event[]).reduce((acc, row) => {
          const client = row.cliente || "Sem cliente";
          if (!acc[client]) acc[client] = { client, total: 0, count: 0 };
          acc[client].total += row.total_cents / 100;
          acc[client].count += 1;
          return acc;
        }, {} as Record<string, ClientSummary>);

        const clientsSorted = Object.values(clientsGrouped).sort((a, b) => b.total - a.total);
        setTopClients(clientsSorted);

        // Group by suppliers
        const suppliersGrouped = (data as Event[]).reduce((acc, row) => {
          const supplier = row.fornecedor || "Sem fornecedor";
          if (supplier === "Sem fornecedor") return acc;
          if (!acc[supplier]) acc[supplier] = { supplier, total: 0, count: 0 };
          acc[supplier].total += row.valor_fornecedor_cents / 100;
          acc[supplier].count += 1;
          return acc;
        }, {} as Record<string, SupplierSummary>);

        const suppliersSorted = Object.values(suppliersGrouped).sort((a, b) => b.total - a.total);
        setTopSuppliers(suppliersSorted);
      }
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <HeaderBar
        title="Financeiro"
        subtitle="Visão geral e análise financeira"
        backTo="/"
        actions={
          <div className="flex gap-2 flex-wrap">
            <MonthlyReportDialog />
            <AnnualTotalsDialog />
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            {canEdit && <ExcelImportDialog onImportComplete={loadData} />}
          </div>
        }
      />

      <div className="container-page py-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas do Mês
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">R$ 0,00</div>
              <p className="text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1 text-green-600" />
                +0% vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas do Mês
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">R$ 0,00</div>
              <p className="text-xs text-muted-foreground mt-1">vs mês anterior</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resultado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">R$ 0,00</div>
              <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Margem
              </CardTitle>
              <Percent className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">0%</div>
              <p className="text-xs text-muted-foreground mt-1">% de lucro</p>
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
    </div>
  );
}
