import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Calendar, DollarSign } from "lucide-react";

type Event = {
  id: string;
  ref_month: string;
  ap: string | null;
  descricao: string | null;
  fornecedor: string | null;
  valor_fornecedor_cents: number;
  honorario_agencia_cents: number;
  total_cents: number;
  honorario_percent: number | null;
};

type MonthSummary = {
  month: string;
  total: number;
  events: Event[];
};

export default function FinanceClient() {
  const { clientId } = useParams();
  const clientName = decodeURIComponent(clientId || "");
  const [data, setData] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [clientName]);

  async function loadClientData() {
    try {
      const { data: events } = await supabase
        .from("finance_events")
        .select("*")
        .eq("cliente", clientName)
        .order("ref_month", { ascending: false });

      setData(events || []);
    } catch (e) {
      console.error("Erro ao carregar dados do cliente:", e);
    } finally {
      setLoading(false);
    }
  }

  const totalAnual = data.reduce((sum, e) => sum + e.total_cents / 100, 0);
  
  const byMonth = data.reduce((acc, event) => {
    const month = event.ref_month;
    if (!acc[month]) {
      acc[month] = { month, total: 0, events: [] };
    }
    acc[month].total += event.total_cents / 100;
    acc[month].events.push(event);
    return acc;
  }, {} as Record<string, MonthSummary>);

  const months = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));
  const bestMonth = months.length > 0 ? months.reduce((max, m) => (m.total > max.total ? m : max)) : null;

  const BRL = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  return (
    <div className="min-h-screen bg-white">
      <HeaderBar title={clientName} subtitle="Drill-down financeiro" backTo="/financeiro" />

      <div className="container-page py-6">
        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <>
            {/* Cards resumo */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Anual</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">{BRL(totalAnual)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.length} lançamento{data.length > 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Melhor Mês</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  {bestMonth ? (
                    <>
                      <div className="text-2xl font-bold text-blue-700">{BRL(bestMonth.total)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(bestMonth.month).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                      </p>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sem dados</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Por mês */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Faturamento Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                {months.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum lançamento encontrado
                  </div>
                ) : (
                  <div className="space-y-4">
                    {months.map((m) => (
                      <div key={m.month} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold">
                            {new Date(m.month).toLocaleDateString("pt-BR", {
                              month: "long",
                              year: "numeric",
                            })}
                          </div>
                          <Badge variant="outline" className="text-sm">
                            {BRL(m.total)}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {m.events.map((ev) => (
                            <div key={ev.id} className="text-xs border-t pt-2 grid grid-cols-2 gap-2">
                              <div>
                                <div className="font-medium">{ev.ap || "—"}</div>
                                <div className="text-muted-foreground">{ev.descricao || "—"}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono">{BRL(ev.total_cents / 100)}</div>
                                {ev.fornecedor && (
                                  <div className="text-muted-foreground">{ev.fornecedor}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
