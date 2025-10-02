import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Percent, Users, Download } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { canEditFinance } from "@/utils/permissions";
import { supabase } from "@/integrations/supabase/client";

type ClientSummary = {
  client: string;
  total: number;
  count: number;
};

export default function Finance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = canEditFinance(user?.email);
  const [topClients, setTopClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopClients();
  }, []);

  async function loadTopClients() {
    try {
      const { data } = await supabase
        .from("finance_events")
        .select("cliente, total_cents")
        .order("ref_month", { ascending: false })
        .limit(500);

      if (data) {
        const grouped = data.reduce((acc, row) => {
          const client = row.cliente || "Sem cliente";
          if (!acc[client]) {
            acc[client] = { client, total: 0, count: 0 };
          }
          acc[client].total += row.total_cents / 100;
          acc[client].count += 1;
          return acc;
        }, {} as Record<string, ClientSummary>);

        const sorted = Object.values(grouped).sort((a, b) => b.total - a.total);
        setTopClients(sorted.slice(0, 10));
      }
    } catch (e) {
      console.error("Erro ao carregar clientes:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <HeaderBar
        const [importOpen, setImportOpen] = useState(false);

        title="Financeiro"
        subtitle="Visão geral e análise financeira"
        backTo="/"
        actions={
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
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
              <p className="text-xs text-muted-foreground mt-1">
                vs mês anterior
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">
                Receitas - Despesas
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">
                % de lucro
              </p>
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

        {/* Top Clientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Top 10 Clientes</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Carregando...
              </div>
            ) : topClients.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhum dado financeiro encontrado
              </div>
            ) : (
              <div className="space-y-2">
                {topClients.map((client, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(`/financeiro/cliente/${encodeURIComponent(client.client)}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm">{client.client}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.count} lançamento{client.count > 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(client.total)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
