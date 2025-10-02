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
  }, [id]);

  const loadBudget = async () => {
    if (!id) return;
    
    try {
      const { data: budget, error } = await supabase
        .from('budgets')
        .select('*, versions(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (budget?.versions?.[0]?.payload) {
        setData(budget.versions[0].payload);
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

  const filmSubtotal = (data.quotes_film || []).reduce((s: number, q: any) => s + (q.valor - (q.desconto || 0)), 0);
  const audioSubtotal = data.inclui_audio 
    ? (data.quotes_audio || []).reduce((s: number, q: any) => s + (q.valor - (q.desconto || 0)), 0)
    : 0;
  const subtotal = filmSubtotal + audioSubtotal;
  const honorario = subtotal * ((data.honorario_perc || 0) / 100);
  const total = subtotal + honorario;

  const cheapestFilm = data.quotes_film?.length 
    ? data.quotes_film.reduce((min: any, q: any) => {
        const qVal = q.valor - (q.desconto || 0);
        const minVal = min.valor - (min.desconto || 0);
        return qVal < minVal ? q : min;
      })
    : null;

  const cheapestAudio = data.inclui_audio && data.quotes_audio?.length
    ? data.quotes_audio.reduce((min: any, q: any) => {
        const qVal = q.valor - (q.desconto || 0);
        const minVal = min.valor - (min.desconto || 0);
        return qVal < minVal ? q : min;
      })
    : null;

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
              {data.midias && (
                <div>
                  <span className="text-sm text-muted-foreground">Mídias:</span>
                  <p className="font-medium">{data.midias}</p>
                </div>
              )}
              {data.territorio && (
                <div>
                  <span className="text-sm text-muted-foreground">Território:</span>
                  <p className="font-medium">{data.territorio}</p>
                </div>
              )}
              {data.periodo && (
                <div>
                  <span className="text-sm text-muted-foreground">Período:</span>
                  <p className="font-medium">{data.periodo}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detalhes do Projeto */}
        {(data.entregaveis || data.adaptacoes || data.exclusividade_elenco !== "nao_aplica") && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Detalhes do Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {data.entregaveis && (
                  <div>
                    <span className="text-sm text-muted-foreground">Entregáveis:</span>
                    <p className="font-medium">{data.entregaveis}</p>
                  </div>
                )}
                {data.adaptacoes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Adaptações:</span>
                    <p className="font-medium">{data.adaptacoes}</p>
                  </div>
                )}
                {data.exclusividade_elenco && data.exclusividade_elenco !== "nao_aplica" && (
                  <div>
                    <span className="text-sm text-muted-foreground">Exclusividade de Elenco:</span>
                    <p className="font-medium">
                      {data.exclusividade_elenco === "orcado" ? "Orçado" : "Não Orçado"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparativo de Produtoras - Filme */}
        {data.quotes_film?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Comparativo de Produtoras - Filme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.quotes_film.map((q: any) => {
                  const valorFinal = q.valor - (q.desconto || 0);
                  const isCheapest = cheapestFilm?.id === q.id;
                  
                  return (
                    <div 
                      key={q.id} 
                      className={`p-4 rounded-lg border ${
                        isCheapest ? 'border-green-500 bg-green-50/50' : 'border-border bg-secondary/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{q.produtora}</h4>
                          <p className="text-sm text-muted-foreground">{q.escopo}</p>
                        </div>
                        {isCheapest && (
                          <Badge variant="default" className="bg-green-600">
                            Mais barato
                          </Badge>
                        )}
                      </div>
                      {q.diretor && (
                        <p className="text-sm text-muted-foreground">Diretor: {q.diretor}</p>
                      )}
                      {q.tratamento && (
                        <p className="text-sm text-muted-foreground">Tratamento: {q.tratamento}</p>
                      )}
                      <div className="mt-2 flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Valor: {BRL(q.valor)}</span>
                          {q.desconto > 0 && (
                            <span className="text-muted-foreground ml-2">| Desconto: {BRL(q.desconto)}</span>
                          )}
                        </div>
                        <span className="font-bold text-lg">{BRL(valorFinal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparativo de Produtoras - Áudio */}
        {data.inclui_audio && data.quotes_audio?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Comparativo de Produtoras - Áudio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.quotes_audio.map((q: any) => {
                  const valorFinal = q.valor - (q.desconto || 0);
                  const isCheapest = cheapestAudio?.id === q.id;
                  
                  return (
                    <div 
                      key={q.id} 
                      className={`p-4 rounded-lg border ${
                        isCheapest ? 'border-blue-500 bg-blue-50/50' : 'border-border bg-secondary/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{q.produtora}</h4>
                          <p className="text-sm text-muted-foreground">{q.descricao}</p>
                        </div>
                        {isCheapest && (
                          <Badge variant="default" className="bg-blue-600">
                            Mais barato
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Valor: {BRL(q.valor)}</span>
                          {q.desconto > 0 && (
                            <span className="text-muted-foreground ml-2">| Desconto: {BRL(q.desconto)}</span>
                          )}
                        </div>
                        <span className="font-bold text-lg">{BRL(valorFinal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Melhor Combinação */}
        {cheapestFilm && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle>Melhor Combinação Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Filme - {cheapestFilm.produtora}</span>
                  <span className="font-bold">{BRL(cheapestFilm.valor - (cheapestFilm.desconto || 0))}</span>
                </div>
                {cheapestAudio && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Áudio - {cheapestAudio.produtora}</span>
                    <span className="font-bold">{BRL(cheapestAudio.valor - (cheapestAudio.desconto || 0))}</span>
                  </div>
                )}
                <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                  <span className="font-medium">Honorário ({data.honorario_perc || 0}%)</span>
                  <span className="font-bold">{BRL(honorario)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                  <span className="font-bold text-lg">Total Geral</span>
                  <span className="font-bold text-2xl text-primary">{BRL(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {data.observacoes && (
          <Card>
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
