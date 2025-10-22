import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export default function BudgetPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [data, setData] = useState<any>(location.state?.data || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Se não tem data no state, buscar do banco (caso de reload)
    if (!data && id) {
      loadBudget();
    }
    
    // Recarrega dados quando a aba ganha foco
    const handleFocus = () => {
      if (id) loadBudget();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);

  const loadBudget = async () => {
    if (!id) return;
    
    try {
      // Busca a versão mais recente
      const { data: row, error } = await supabase
        .from('versions')
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
        .eq('budget_id', id)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (row?.payload) {
        setData(row.payload);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao carregar orçamento", variant: "destructive" });
    }
  };

  const handleEdit = () => {
    // Volta para o formulário com os dados
    navigate(location.state?.returnPath || `/orcamentos/novo/filme`, { 
      state: { editData: data, budgetId: id } 
    });
  };

  const handleGeneratePDF = async () => {
    if (!data) return;

    setSaving(true);
    try {
      let budgetId = id;

      // Se não tem ID ainda, criar o orçamento
      if (!budgetId) {
        const { data: created, error } = await supabase.rpc("create_budget_full_rpc", {
          p_type_text: data.type || "filme",
          p_payload: data,
          p_total: data.total || 0
        }) as { data: any; error: any };

        if (error) throw error;
        budgetId = created.id;
      } else {
        // Se já existe, criar nova versão
        const { data: versions, error: versionError } = await supabase
          .from('versions')
          .select('versao')
          .eq('budget_id', budgetId)
          .order('versao', { ascending: false })
          .limit(1);

        if (versionError) throw versionError;

        const nextVersion = (versions?.[0]?.versao || 0) + 1;

        const { error: insertError } = await supabase
          .from('versions')
          .insert({
            budget_id: budgetId,
            versao: nextVersion,
            payload: data,
            total_geral: data.total || 0
          });

        if (insertError) throw insertError;

        toast({ title: `Versão ${nextVersion} criada!` });
      }

      toast({ title: "Orçamento salvo com sucesso!" });
      navigate(`/budget/${budgetId}/pdf`);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando preview...</p>
      </div>
    );
  }

  // Suporte a múltiplas campanhas
  const campanhas = data.campanhas || [{ nome: "Campanha Única", categorias: [] }];
  const combinarModo = data.combinarModo || "separado";
  const honorarioPerc = data.honorarioPerc || 15;
  
  // Detectar se é orçamento de imagem
  const isImageBudget = data.assets && Array.isArray(data.assets);

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
      (sum: number, item: any) => sum + (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0),
      0,
    );
  };

  const calcularTotalCampanha = (campanha: any) => {
    return (campanha.categorias || [])
      .filter((c: any) => c.visivel !== false)
      .reduce((sum: number, c: any) => sum + calcularSubtotal(c), 0);
  };

  const totalGeralCampanhas = campanhas.reduce((sum: number, camp: any) => sum + calcularTotalCampanha(camp), 0);

  // Modo "somar": honorário aplicado no consolidado
  // Modo "separado": honorário aplicado por campanha
  let totalComHonorario = 0;
  if (combinarModo === "somar") {
    const honorarioValor = totalGeralCampanhas * (honorarioPerc / 100);
    totalComHonorario = totalGeralCampanhas + honorarioValor;
  } else {
    // "separado"
    totalComHonorario = campanhas.reduce((sum: number, camp: any) => {
      const subtotal = calcularTotalCampanha(camp);
      const honorario = subtotal * (honorarioPerc / 100);
      return sum + subtotal + honorario;
    }, 0);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/orcamentos")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Preview do Orçamento</h1>
              <p className="text-muted-foreground">Revise as informações antes de gerar o PDF</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button onClick={handleGeneratePDF} disabled={saving} className="gap-2">
              {saving ? "Salvando..." : (
                <>
                  <FileText className="h-4 w-4" />
                  Gerar Orçamento
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Identificação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Cliente:</span>
                <p className="font-medium">{data.cliente || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Produto:</span>
                <p className="font-medium">{data.produto || "—"}</p>
              </div>
              {data.job && (
                <div>
                  <span className="text-sm text-muted-foreground">Job:</span>
                  <p className="font-medium">{data.job}</p>
                </div>
              )}
              {data.producer && (
                <>
                  <div>
                    <span className="text-sm text-muted-foreground">Produtor:</span>
                    <p className="font-medium">{data.producer.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">E-mail do Produtor:</span>
                    <p className="font-medium">{data.producer.email}</p>
                  </div>
                </>
              )}
              {isImageBudget && data.banco && (
                <div>
                  <span className="text-sm text-muted-foreground">Banco de Imagens:</span>
                  <p className="font-medium">
                    {data.banco === 'shutterstock' ? 'Shutterstock' : data.banco === 'getty' ? 'Getty Images' : 'Personalizado'}
                  </p>
                </div>
              )}
              {isImageBudget && data.midias && (
                <div>
                  <span className="text-sm text-muted-foreground">Mídias:</span>
                  <p className="font-medium">{data.midias}</p>
                </div>
              )}
              {campanhas.length > 1 && !isImageBudget && (
                <div>
                  <span className="text-sm text-muted-foreground">Modo de Apresentação:</span>
                  <p className="font-medium">
                    {combinarModo === "somar" ? "Consolidado (Somado)" : "Separado (Individual)"}
                  </p>
                </div>
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
              <CardContent>
                <div className="space-y-4">
                  {data.assets.map((asset: any, idx: number) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{asset.type === 'video' ? '🎥' : '📷'}</span>
                            <h4 className="font-semibold">{asset.title || `Asset ${idx + 1}`}</h4>
                          </div>
                          {asset.id && (
                            <p className="text-sm text-muted-foreground">ID: {asset.id}</p>
                          )}
                          {asset.customDescription && (
                            <p className="text-sm text-muted-foreground mt-1">{asset.customDescription}</p>
                          )}
                          {asset.chosenLicense && (
                            <Badge variant="secondary" className="mt-2">
                              {asset.chosenLicense}
                            </Badge>
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
                          <p className="text-sm text-muted-foreground">Valor</p>
                          <p className="font-bold text-lg">{BRL(asset.price || 0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Total Geral para Imagem */}
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle>Total Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                  <span className="font-bold text-lg">Total Geral</span>
                  <span className="font-bold text-2xl text-primary">
                    {BRL(data.assets.reduce((sum: number, a: any) => sum + (a.price || 0), 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Campanhas - Apenas para orçamentos não-imagem */}
        {!isImageBudget && campanhas.map((campanha: any, campIdx: number) => {
          const categoriasVisiveis = (campanha.categorias || []).filter((c: any) => c.visivel !== false);
          const subtotalCampanha = calcularTotalCampanha(campanha);
          const honorarioCampanha = subtotalCampanha * (honorarioPerc / 100);
          const totalCampanha = subtotalCampanha + honorarioCampanha;

          return (
            <Card key={campIdx} className="mb-6 border-2 border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center justify-between">
                  <span>{campanha.nome}</span>
                  {combinarModo === "separado" && campanhas.length > 1 && (
                    <span className="text-lg font-bold">{BRL(totalCampanha)}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {categoriasVisiveis.map((cat: any, catIdx: number) => {
                  const maisBarato = getMaisBarato(cat);
                  const subtotal = calcularSubtotal(cat);

                  if (cat.modoPreco === "fechado" && (!cat.fornecedores || cat.fornecedores.length === 0)) {
                    return null;
                  }

                  return (
                    <div key={catIdx} className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 border-b pb-2">{cat.nome}</h3>

                      {cat.modoPreco === "fechado" && cat.fornecedores?.length > 0 && (
                        <div className="space-y-3">
                          {cat.fornecedores.map((f: any, fIdx: number) => {
                            const valorFinal = (f.valor || 0) - (f.desconto || 0);
                            const isCheapest = maisBarato?.id === f.id;

                            return (
                              <div
                                key={fIdx}
                                className={`p-4 rounded-lg border ${
                                  isCheapest ? "border-green-500 bg-green-50/50" : "border-border bg-secondary/20"
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-semibold">{f.nome}</h4>
                                    {f.escopo && <p className="text-sm text-muted-foreground">{f.escopo}</p>}
                                  </div>
                                  {isCheapest && (
                                    <Badge variant="default" className="bg-green-600">
                                      Mais barato
                                    </Badge>
                                  )}
                                </div>
                                {f.diretor && <p className="text-sm text-muted-foreground">Diretor: {f.diretor}</p>}
                                <div className="mt-2 flex justify-between items-center">
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Valor: {BRL(f.valor || 0)}</span>
                                    {(f.desconto || 0) > 0 && (
                                      <span className="text-muted-foreground ml-2">| Desconto: {BRL(f.desconto)}</span>
                                    )}
                                  </div>
                                  <span className="font-bold text-lg">{BRL(valorFinal)}</span>
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg font-semibold">
                            <span>Subtotal {cat.nome}</span>
                            <span>{BRL(subtotal)}</span>
                          </div>
                        </div>
                      )}

                      {cat.modoPreco === "itens" && cat.itens?.length > 0 && (
                        <div className="space-y-2">
                          {cat.itens.map((item: any, iIdx: number) => {
                            const itemSubtotal = (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0);
                            return (
                              <div key={iIdx} className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                                <div>
                                  <span className="font-medium">{item.unidade}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {item.quantidade} x {BRL(item.valorUnitario)}
                                  </span>
                                  {item.observacao && (
                                    <p className="text-xs text-muted-foreground">{item.observacao}</p>
                                  )}
                                </div>
                                <span className="font-semibold">{BRL(itemSubtotal)}</span>
                              </div>
                            );
                          })}
                          <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg font-semibold">
                            <span>Subtotal {cat.nome}</span>
                            <span>{BRL(subtotal)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Subtotais da campanha */}
                {combinarModo === "separado" && campanhas.length > 1 && (
                  <div className="mt-6 space-y-2 border-t pt-4">
                    <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                      <span className="font-medium">Subtotal {campanha.nome}</span>
                      <span className="font-bold">{BRL(subtotalCampanha)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                      <span className="font-medium">Honorário ({honorarioPerc}%)</span>
                      <span className="font-bold">{BRL(honorarioCampanha)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                      <span className="font-bold text-lg">Total {campanha.nome}</span>
                      <span className="font-bold text-2xl text-primary">{BRL(totalCampanha)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Total Geral - Apenas para orçamentos não-imagem */}
        {!isImageBudget && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle>
                {combinarModo === "somar" && campanhas.length > 1 ? "Consolidado Final" : "Total Geral"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {combinarModo === "somar" && campanhas.length > 1 && (
                  <>
                    {campanhas.map((camp: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                        <span className="font-medium">{camp.nome}</span>
                        <span className="font-bold">{BRL(calcularTotalCampanha(camp))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                      <span className="font-medium">Subtotal Consolidado</span>
                      <span className="font-bold">{BRL(totalGeralCampanhas)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/40 rounded-lg">
                      <span className="font-medium">Honorário ({honorarioPerc}%)</span>
                      <span className="font-bold">{BRL(totalGeralCampanhas * (honorarioPerc / 100))}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                  <span className="font-bold text-lg">Total Geral</span>
                  <span className="font-bold text-2xl text-primary">{BRL(totalComHonorario)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {data.observacoes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{data.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
