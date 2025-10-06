import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, FileText, Star } from "lucide-react";
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
  const campanhas = payload.campanhas || [{ nome: "Campanha Única", categorias: payload.categorias || [] }];

  const getMaisBarato = (cat: any) => {
    if (!cat.fornecedores || cat.fornecedores.length === 0) return null;
    return cat.fornecedores.reduce((min: any, f: any) => {
      const valor = (f.valor || 0) - (f.desconto || 0);
      const minValor = (min.valor || 0) - (min.desconto || 0);
      return valor < minValor ? f : min;
    });
  };

  const calcularSubtotal = (cat: any) => {
    if (cat.modoPreco === "fechado") {
      const maisBarato = getMaisBarato(cat);
      if (!maisBarato) return 0;
      return (maisBarato.valor || 0) - (maisBarato.desconto || 0);
    }
    return (cat.itens || []).reduce(
      (sum: number, item: any) =>
        sum + (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0),
      0
    );
  };

  const calcularTotalCampanha = (campanha: any) => {
    return (campanha.categorias || [])
      .filter((c: any) => c.visivel !== false)
      .filter((c: any) => {
        if (c.modoPreco === "fechado") {
          return c.fornecedores && c.fornecedores.length > 0;
        }
        return c.itens && c.itens.length > 0;
      })
      .reduce((sum: number, c: any) => sum + calcularSubtotal(c), 0);
  };

  const totalGeral = campanhas.reduce(
    (sum: number, camp: any) => sum + calcularTotalCampanha(camp),
    0
  );

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

        {/* Campanhas */}
        {campanhas.map((campanha: any, campIdx: number) => {
          const categoriasVisiveis = (campanha.categorias || [])
            .filter((c: any) => c.visivel !== false)
            .filter((c: any) => {
              if (c.modoPreco === "fechado") {
                return c.fornecedores && c.fornecedores.length > 0;
              }
              return c.itens && c.itens.length > 0;
            });

          if (categoriasVisiveis.length === 0) return null;

          return (
            <div key={campIdx} className="mb-8">
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-primary/5">
                  <div className="flex justify-between items-center">
                    <CardTitle>{campanha.nome}</CardTitle>
                    <span className="text-lg font-semibold text-primary">
                      {formatCurrency(calcularTotalCampanha(campanha))}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {categoriasVisiveis.map((cat: any, idx: number) => {
                    const maisBarato = getMaisBarato(cat);
                    const subtotal = calcularSubtotal(cat);

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
                              {cat.fornecedores.map((f: any, fIdx: number) => {
                                const isMaisBarato = maisBarato?.id === f.id || maisBarato === f;
                                const valorFinal = (f.valor || 0) - (f.desconto || 0);

                                return (
                                  <div
                                    key={fIdx}
                                    className={`border rounded-xl p-3 space-y-2 ${
                                      isMaisBarato
                                        ? "border-success bg-success/5 ring-2 ring-success/20"
                                        : "border-border"
                                    }`}
                                  >
                                    {isMaisBarato && (
                                      <div className="flex items-center gap-2 text-xs font-semibold text-success mb-2">
                                        <Star className="h-4 w-4 fill-current" />
                                        SUGESTÃO - MAIS BARATO
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="font-medium">{f.nome}</span>
                                      <span className="font-semibold">{formatCurrency(valorFinal)}</span>
                                    </div>
                                    {f.descricao && (
                                      <p className="text-sm text-muted-foreground">{f.descricao}</p>
                                    )}
                                  </div>
                                );
                              })}
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
                </CardContent>
              </Card>
            </div>
          );
        })}

        {/* Total Geral */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {campanhas.map((camp: any, idx: number) => (
                <div key={idx} className="flex justify-between text-lg">
                  <span className="font-medium">{camp.nome}:</span>
                  <span className="font-semibold">{formatCurrency(calcularTotalCampanha(camp))}</span>
                </div>
              ))}
              <div className="pt-3 border-t-2 flex justify-between items-center text-xl font-bold">
                <span>Total Geral Sugerido:</span>
                <span className="text-primary">{formatCurrency(totalGeral)}</span>
              </div>
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
