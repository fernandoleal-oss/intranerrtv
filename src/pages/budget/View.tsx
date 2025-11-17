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
      
      setLoading(true);

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
    
    // Recarrega dados quando a aba ganha foco
    const handleFocus = () => {
      fetchBudget();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
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
  
  // Detectar se é orçamento de imagem
  const isImageBudget = data.type === 'imagem' && payload.assets && Array.isArray(payload.assets);

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

  const calcularTotalFornecedores = () => {
    if (!payload.fornecedores || !Array.isArray(payload.fornecedores)) return 0;
    
    return payload.fornecedores.reduce((sum: number, fornecedor: any) => {
      const totalFornecedor = (fornecedor.fases || []).reduce((faseSum: number, fase: any) => {
        return faseSum + (fase.itens || []).reduce(
          (itemSum: number, item: any) => itemSum + (item.valor - (item.desconto || 0)),
          0
        );
      }, 0) - (fornecedor.desconto || 0);
      return sum + totalFornecedor;
    }, 0);
  };

  const totalGeral = campanhas.reduce(
    (sum: number, camp: any) => sum + calcularTotalCampanha(camp),
    0
  ) + calcularTotalFornecedores();

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
              {!isImageBudget && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Job</p>
                  <p className="font-medium">{payload.job || "-"}</p>
                </div>
              )}
              {isImageBudget && payload.producer && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Produtor</p>
                    <p className="font-medium">{payload.producer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Banco de Imagens</p>
                    <p className="font-medium">
                      {payload.banco === 'shutterstock' ? 'Shutterstock' : 
                       payload.banco === 'getty' ? 'Getty Images' : 'Personalizado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Mídias</p>
                    <p className="font-medium">{payload.midias || "-"}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orçamento de Imagem */}
        {isImageBudget && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Assets de Imagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {payload.assets.map((asset: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{asset.type === 'video' ? '🎥' : '📷'}</span>
                          <h4 className="font-bold text-lg">{asset.title || `Asset ${idx + 1}`}</h4>
                        </div>
                        {asset.id && (
                          <p className="text-sm text-muted-foreground mb-1">ID: {asset.id}</p>
                        )}
                        {asset.customDescription && (
                          <p className="text-sm text-muted-foreground mb-2">{asset.customDescription}</p>
                        )}
                        {asset.chosenLicense && (
                          <div className="inline-block px-3 py-1 bg-secondary rounded-md text-sm font-medium mt-2">
                            {asset.chosenLicense}
                          </div>
                        )}
                        {asset.pageUrl && (
                          <a 
                            href={asset.pageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-2 inline-block"
                          >
                            Ver no banco de imagens →
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Valor</p>
                        <span className="font-bold text-xl">{formatCurrency(asset.price || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Total para Imagem */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total Geral:</span>
                  <span className="text-primary">
                    {formatCurrency(payload.assets.reduce((sum: number, a: any) => sum + (a.price || 0), 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Campanhas - Apenas para orçamentos não-imagem */}
        {!isImageBudget && campanhas.map((campanha: any, campIdx: number) => {
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
                                     className={`border rounded-xl p-4 space-y-3 ${
                                       isMaisBarato
                                         ? "border-[#48bb78] bg-[#48bb78]/5 ring-2 ring-[#48bb78]/20"
                                         : "border-border bg-card"
                                     }`}
                                   >
                                     {isMaisBarato && (
                                       <div className="flex items-center gap-2 text-sm font-bold text-[#48bb78]">
                                         <Star className="h-5 w-5 fill-current" />
                                         ★ OPÇÃO MAIS BARATA
                                       </div>
                                     )}
                                     <div className="flex justify-between items-start">
                                       <div className="space-y-1 flex-1 pr-4">
                                         <p className={`font-bold ${isMaisBarato ? "text-lg" : "text-base"}`}>{f.nome}</p>
                                         {f.diretor && (
                                           <p className="text-sm text-muted-foreground">
                                             <span className="font-semibold">Diretor:</span> {f.diretor}
                                           </p>
                                         )}
                                       </div>
                                       <span className={`font-bold ${isMaisBarato ? "text-xl text-[#48bb78]" : "text-lg"} flex-shrink-0`}>
                                         {formatCurrency(valorFinal)}
                                       </span>
                                     </div>
                                     {f.escopo && (
                                       <div className="pt-3 border-t">
                                         <p className="text-sm font-semibold mb-2 text-foreground">Escopo:</p>
                                         <div className="text-sm text-muted-foreground leading-relaxed">
                                           {(() => {
                                             const elencoMatch = f.escopo.match(/elenco:([^\.]+)/i);
                                             if (elencoMatch) {
                                               const elenco = elencoMatch[1].trim();
                                               const resto = f.escopo.replace(/elenco:[^\.]+\.?/i, '').trim();
                                               return (
                                                 <>
                                                   {resto && <p className="mb-2">{resto}</p>}
                                                   <div className="bg-muted border-l-2 border-muted-foreground px-3 py-2 rounded">
                                                     <p className="font-semibold text-foreground italic">
                                                       <span className="text-primary">Elenco:</span> {elenco}
                                                     </p>
                                                   </div>
                                                 </>
                                               );
                                             }
                                             return <p>{f.escopo}</p>;
                                           })()}
                                         </div>
                                       </div>
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

        {/* Estrutura de Fornecedores - Se existir */}
        {!isImageBudget && payload.fornecedores && Array.isArray(payload.fornecedores) && payload.fornecedores.length > 0 && (
          <div className="space-y-4 mb-6">
            <h2 className="text-xl font-semibold mb-4">Fornecedores</h2>
            {payload.fornecedores.map((fornecedor: any) => (
              <Card key={fornecedor.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{fornecedor.nome}</span>
                    {fornecedor.desconto > 0 && (
                      <span className="text-sm text-muted-foreground font-normal">
                        Desconto: {formatCurrency(fornecedor.desconto)}
                      </span>
                    )}
                  </CardTitle>
                  {(fornecedor.contato || fornecedor.cnpj) && (
                    <p className="text-sm text-muted-foreground">
                      {fornecedor.contato} {fornecedor.cnpj && `• CNPJ: ${fornecedor.cnpj}`}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {(fornecedor.fases || []).map((fase: any) => (
                    <Card key={fase.id} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <CardTitle className="text-base">{fase.nome}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(fase.itens || []).map((item: any) => (
                            <div key={item.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                              <div className="flex-1">
                                <p className="font-medium">{item.nome}</p>
                                {item.prazo && <p className="text-sm text-muted-foreground">Prazo: {item.prazo}</p>}
                                {item.observacao && <p className="text-sm text-muted-foreground italic">{item.observacao}</p>}
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold">{formatCurrency(item.valor)}</p>
                                {item.desconto > 0 && (
                                  <p className="text-sm text-green-600">-{formatCurrency(item.desconto)}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-3 mt-3 border-t flex justify-between font-semibold">
                          <span>Subtotal Fase:</span>
                          <span>
                            {formatCurrency(
                              (fase.itens || []).reduce(
                                (sum: number, item: any) => sum + (item.valor - (item.desconto || 0)),
                                0
                              )
                            )}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="pt-3 border-t-2 flex justify-between text-lg font-bold">
                    <span>Total Fornecedor:</span>
                    <span className="text-primary">
                      {formatCurrency(
                        (fornecedor.fases || []).reduce((sum: number, fase: any) => {
                          return sum + (fase.itens || []).reduce(
                            (faseSum: number, item: any) => faseSum + (item.valor - (item.desconto || 0)),
                            0
                          );
                        }, 0) - (fornecedor.desconto || 0)
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Total Geral - Apenas para orçamentos não-imagem */}
        {!isImageBudget && (
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
        )}

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
