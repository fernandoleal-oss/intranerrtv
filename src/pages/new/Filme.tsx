// src/pages/new/Filme.tsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye, Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FormInput } from "@/components/FormInput";
import { FormTextarea } from "@/components/FormTextarea";
import { motion, AnimatePresence } from "framer-motion";

interface QuoteFilm {
  id: string;
  produtora: string;
  escopo: string;
  valor: number;
  diretor: string;
  tratamento: string;
  desconto: number;
}

interface BudgetData {
  type: "filme";
  produtor?: string;
  email?: string;
  cliente?: string;
  produto?: string;
  job?: string;
  midias?: string;
  territorio?: string;
  periodo?: string;
  entregaveis?: string[];
  formatos?: string[];
  data_orcamento?: string;
  exclusividade_elenco?: string;
  audio_descr?: string;
  quotes_film?: QuoteFilm[];
  honorario_perc?: number;
  observacoes?: string;
  total: number;
}

const parseCurrency = (val: string): number => {
  if (!val) return 0;
  const clean = val.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
};

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
};

export default function FilmeBudget() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [data, setData] = useState<BudgetData>({
    type: "filme",
    quotes_film: [],
    honorario_perc: 0,
    total: 0,
    entregaveis: [],
    formatos: [],
  });

  const updateData = useCallback((updates: Partial<BudgetData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Recalcular totais
  useEffect(() => {
    const filmSubtotal = (data.quotes_film || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0);
    const honorario = filmSubtotal * ((data.honorario_perc || 0) / 100);
    const total = filmSubtotal + honorario;
    setData((prev) => ({ ...prev, total }));
  }, [data.quotes_film, data.honorario_perc]);

  const addQuote = () => {
    const newQuote: QuoteFilm = {
      id: crypto.randomUUID(),
      produtora: "",
      escopo: "",
      valor: 0,
      diretor: "",
      tratamento: "",
      desconto: 0,
    };
    updateData({ quotes_film: [...(data.quotes_film || []), newQuote] });
  };

  const updateQuote = (id: string, updates: Partial<QuoteFilm>) => {
    const updated = (data.quotes_film || []).map((q) => (q.id === id ? { ...q, ...updates } : q));
    updateData({ quotes_film: updated });
  };

  const removeQuote = (id: string) => {
    updateData({ quotes_film: (data.quotes_film || []).filter((q) => q.id !== id) });
  };

  const handleSave = async () => {
    if (!data.cliente || !data.produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: created, error: budgetError } = await supabase.rpc("create_simple_budget", {
        p_type: data.type,
      }) as { data: { id: string; display_id: string; version_id: string } | null; error: any };

      if (budgetError || !created) throw budgetError || new Error("Falha ao criar orçamento");

      const { error: versionError } = await supabase
        .from("versions")
        .update({
          payload: data as any,
          total_geral: data.total,
        })
        .eq("id", created.version_id);

      if (versionError) throw versionError;

      toast({ title: "Orçamento salvo com sucesso!" });
      navigate(`/budget/${created.id}/pdf`);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar orçamento", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/orcamentos")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Novo Orçamento - Filme</h1>
              <p className="text-muted-foreground">Preencha os dados e visualize em tempo real</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowPreview(!showPreview)} className="gap-2">
              <Eye className="h-4 w-4" />
              {showPreview ? "Ocultar" : "Visualizar"} Preview
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? "Salvando..." : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar e Gerar PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Instruções */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Info className="h-5 w-5" />
              Instruções de Preenchimento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>Cliente e Produto:</strong> Campos obrigatórios para identificação do orçamento</p>
            <p>• <strong>Cotações:</strong> Adicione todas as produtoras cotadas com valores e descontos</p>
            <p>• <strong>Honorário:</strong> Percentual aplicado sobre o subtotal das cotações</p>
            <p>• <strong>Preview:</strong> Visualize como ficará o PDF antes de salvar</p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormInput
                    id="produtor"
                    label="Produtor"
                    value={data.produtor || ""}
                    onChange={(v) => updateData({ produtor: v })}
                    placeholder="Nome do produtor"
                  />
                  <FormInput
                    id="email"
                    label="E-mail"
                    type="email"
                    value={data.email || ""}
                    onChange={(v) => updateData({ email: v })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cliente & Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormInput
                    id="cliente"
                    label="Cliente"
                    value={data.cliente || ""}
                    onChange={(v) => updateData({ cliente: v })}
                    placeholder="Nome do cliente"
                    required
                  />
                  <FormInput
                    id="produto"
                    label="Produto"
                    value={data.produto || ""}
                    onChange={(v) => updateData({ produto: v })}
                    placeholder="Nome do produto"
                    required
                  />
                  <FormInput
                    id="job"
                    label="Job"
                    value={data.job || ""}
                    onChange={(v) => updateData({ job: v })}
                    placeholder="Número do job"
                  />
                  <FormInput
                    id="midias"
                    label="Mídias"
                    value={data.midias || ""}
                    onChange={(v) => updateData({ midias: v })}
                    placeholder="TV, Digital, OOH..."
                  />
                  <FormInput
                    id="territorio"
                    label="Território"
                    value={data.territorio || ""}
                    onChange={(v) => updateData({ territorio: v })}
                    placeholder="Nacional, Regional..."
                  />
                  <FormInput
                    id="periodo"
                    label="Período"
                    value={data.periodo || ""}
                    onChange={(v) => updateData({ periodo: v })}
                    placeholder="12 meses, 24 meses..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cotações de Produtoras</CardTitle>
                <Button size="sm" variant="secondary" onClick={addQuote} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Cotação
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <AnimatePresence>
                  {(data.quotes_film || []).map((q) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-border rounded-2xl p-4 space-y-3 bg-secondary/20"
                    >
                      <div className="grid md:grid-cols-3 gap-3">
                        <FormInput
                          id={`prod-${q.id}`}
                          label="Produtora"
                          value={q.produtora}
                          onChange={(v) => updateQuote(q.id, { produtora: v })}
                          placeholder="Nome"
                        />
                        <FormInput
                          id={`escopo-${q.id}`}
                          label="Escopo"
                          value={q.escopo}
                          onChange={(v) => updateQuote(q.id, { escopo: v })}
                          placeholder="Descrição"
                        />
                        <FormInput
                          id={`valor-${q.id}`}
                          label="Valor (R$)"
                          value={String(q.valor || "")}
                          onChange={(v) => updateQuote(q.id, { valor: parseCurrency(v) })}
                          placeholder="0,00"
                        />
                        <FormInput
                          id={`diretor-${q.id}`}
                          label="Diretor"
                          value={q.diretor}
                          onChange={(v) => updateQuote(q.id, { diretor: v })}
                          placeholder="Nome do diretor"
                        />
                        <FormInput
                          id={`tratamento-${q.id}`}
                          label="Tratamento"
                          value={q.tratamento}
                          onChange={(v) => updateQuote(q.id, { tratamento: v })}
                          placeholder="Descrição"
                        />
                        <FormInput
                          id={`desconto-${q.id}`}
                          label="Desconto (R$)"
                          value={String(q.desconto || "")}
                          onChange={(v) => updateQuote(q.id, { desconto: parseCurrency(v) })}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => removeQuote(q.id)} 
                          className="text-destructive hover:text-destructive gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remover
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Honorário e Observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormInput
                  id="honorario"
                  label="Percentual de Honorário (%)"
                  type="number"
                  value={String(data.honorario_perc || 0)}
                  onChange={(v) => updateData({ honorario_perc: parseFloat(v) || 0 })}
                  placeholder="0"
                />
                <FormTextarea
                  id="observacoes"
                  label="Observações"
                  value={data.observacoes || ""}
                  onChange={(v) => updateData({ observacoes: v })}
                  placeholder="Observações adicionais..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Preview Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card className={showPreview ? "border-primary shadow-lg shadow-primary/20" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview do Orçamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-3">
                    <div className="p-3 rounded-xl bg-secondary/30">
                      <div className="text-muted-foreground text-xs mb-1">Cliente</div>
                      <div className="font-medium">{data.cliente || "—"}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/30">
                      <div className="text-muted-foreground text-xs mb-1">Produto</div>
                      <div className="font-medium">{data.produto || "—"}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/30">
                      <div className="text-muted-foreground text-xs mb-1">Cotações</div>
                      <div className="font-medium">{data.quotes_film?.length || 0}</div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="text-sm font-semibold mb-3">Resumo Financeiro</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 rounded-lg bg-secondary/20">
                        <span className="text-muted-foreground">Subtotal Cotações:</span>
                        <span className="font-medium">
                          {formatCurrency((data.quotes_film || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0))}
                        </span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-secondary/20">
                        <span className="text-muted-foreground">Honorário ({data.honorario_perc || 0}%):</span>
                        <span className="font-medium">
                          {formatCurrency(
                            ((data.quotes_film || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0) *
                              (data.honorario_perc || 0)) / 100
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-2 border-t border-border p-2 rounded-lg bg-primary/10">
                        <span>Total:</span>
                        <span className="text-primary">
                          {formatCurrency(data.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
