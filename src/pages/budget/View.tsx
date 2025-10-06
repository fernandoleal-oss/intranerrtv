import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-spinner";

interface BudgetData {
  id: string;
  display_id: string;
  type: string;
  status: string;
  payload: any;
  version_id: string;
}

export default function BudgetView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BudgetData | null>(null);

  useEffect(() => {
    const fetchBudget = async () => {
      if (!id) return;

      try {
        const { data: row, error } = await supabase
          .from("versions")
          .select(`
            id,
            payload,
            versao,
            budgets!inner(
              id,
              display_id,
              type,
              status
            )
          `)
          .eq("budget_id", id)
          .order("versao", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!row) throw new Error("Orçamento não encontrado");

        setData({
          id: row.budgets!.id,
          display_id: row.budgets!.display_id,
          type: row.budgets!.type,
          status: row.budgets!.status,
          payload: row.payload || {},
          version_id: row.id,
        });
      } catch (err: any) {
        toast({
          title: "Erro ao carregar orçamento",
          description: err.message,
          variant: "destructive",
        });
        navigate("/orcamentos");
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, [id, navigate]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Carregando orçamento..." />
      </AppLayout>
    );
  }

  if (!data) return null;

  const payload = data.payload;
  const categorias = payload.categorias || [];

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-8 font-semibold">{data.display_id}</h1>
              <p className="text-muted-foreground">Visualização do orçamento</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/budget/${id}/edit`)} className="gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button onClick={() => navigate(`/budget/${id}/pdf`)} className="gap-2">
              <FileText className="h-4 w-4" />
              Gerar PDF
            </Button>
          </div>
        </div>

        {/* Identificação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Cliente</p>
                <p className="font-medium">{payload.cliente || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Produto</p>
                <p className="font-medium">{payload.produto || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Job</p>
                <p className="font-medium">{payload.job || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categorias */}
        <div className="space-y-6">
          {categorias
            .filter((c: any) => c.visivel !== false)
            .map((cat: any, idx: number) => {
              const subtotal =
                cat.modoPreco === "fechado"
                  ? cat.fornecedores?.reduce((min: number, f: any) => {
                      const valor = (f.valor || 0) - (f.desconto || 0);
                      return Math.min(min, valor);
                    }, Infinity) || 0
                  : cat.itens?.reduce(
                      (sum: number, item: any) =>
                        sum + (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0),
                      0
                    ) || 0;

              return (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{cat.nome}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {cat.modoPreco === "fechado" ? "Valor Fechado" : "Por Itens"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cat.observacao && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Observação</p>
                        <p className="text-sm">{cat.observacao}</p>
                      </div>
                    )}

                    {cat.modoPreco === "fechado" && cat.fornecedores?.length > 0 && (
                      <div className="space-y-3">
                        <p className="font-medium">Fornecedores</p>
                        {cat.fornecedores.map((f: any, fIdx: number) => (
                          <div key={fIdx} className="border rounded-xl p-3 space-y-2">
                            <div className="flex justify-between">
                              <span className="font-medium">{f.nome}</span>
                              <span>{formatCurrency((f.valor || 0) - (f.desconto || 0))}</span>
                            </div>
                            {f.descricao && <p className="text-sm text-muted-foreground">{f.descricao}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t flex justify-between font-semibold">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* Total */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Geral:</span>
              <span className="text-primary">
                {formatCurrency(
                  categorias
                    .filter((c: any) => c.visivel !== false)
                    .reduce((sum: number, cat: any) => {
                      const subtotal =
                        cat.modoPreco === "fechado"
                          ? cat.fornecedores?.reduce((min: number, f: any) => {
                              const valor = (f.valor || 0) - (f.desconto || 0);
                              return Math.min(min, valor);
                            }, Infinity) || 0
                          : cat.itens?.reduce(
                              (sum: number, item: any) =>
                                sum + (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0),
                              0
                            ) || 0;
                      return sum + subtotal;
                    }, 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        {payload.observacoes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{payload.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
