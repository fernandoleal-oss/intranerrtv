// src/pages/new/Filme.tsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save, Eye, Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FormInput } from "@/components/FormInput";
import { FormTextarea } from "@/components/FormTextarea";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuoteFilm {
  id: string;
  produtora: string;
  escopo: string;
  valor: number;
  diretor?: string;
  tratamento?: string;
  desconto: number;
}

interface QuoteAudio {
  id: string;
  produtora: string;
  descricao: string;
  valor: number;
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
  entregaveis?: string;
  adaptacoes?: string;
  exclusividade_elenco?: "orcado" | "nao_orcado" | "nao_aplica";
  inclui_audio?: boolean;
  quotes_film?: QuoteFilm[];
  quotes_audio?: QuoteAudio[];
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
  const location = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Carregar dados de edição se existir
  const editData = location.state?.editData;
  const budgetId = location.state?.budgetId;

  const [data, setData] = useState<BudgetData>(editData || {
    type: "filme",
    quotes_film: [],
    quotes_audio: [],
    honorario_perc: 0,
    total: 0,
    inclui_audio: false,
    exclusividade_elenco: "nao_aplica",
  });

  const updateData = useCallback((updates: Partial<BudgetData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Recalcular totais
  useEffect(() => {
    const filmSubtotal = (data.quotes_film || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0);
    const audioSubtotal = data.inclui_audio 
      ? (data.quotes_audio || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0)
      : 0;
    const subtotalGeral = filmSubtotal + audioSubtotal;
    const honorario = subtotalGeral * ((data.honorario_perc || 0) / 100);
    const total = subtotalGeral + honorario;
    setData((prev) => ({ ...prev, total }));
  }, [data.quotes_film, data.quotes_audio, data.honorario_perc, data.inclui_audio]);

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

  const addAudioQuote = () => {
    const newQuote: QuoteAudio = {
      id: crypto.randomUUID(),
      produtora: "",
      descricao: "",
      valor: 0,
      desconto: 0,
    };
    updateData({ quotes_audio: [...(data.quotes_audio || []), newQuote] });
  };

  const updateAudioQuote = (id: string, updates: Partial<QuoteAudio>) => {
    const updated = (data.quotes_audio || []).map((q) => (q.id === id ? { ...q, ...updates } : q));
    updateData({ quotes_audio: updated });
  };

  const removeAudioQuote = (id: string) => {
    updateData({ quotes_audio: (data.quotes_audio || []).filter((q) => q.id !== id) });
  };

  const handlePreview = () => {
    if (!data.cliente || !data.produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" });
      return;
    }

    if ((data.quotes_film || []).length === 0) {
      toast({ title: "Adicione pelo menos uma cotação", variant: "destructive" });
      return;
    }

    // Navegar para o preview com os dados
    navigate(`/budget/preview${budgetId ? `/${budgetId}` : ''}`, {
      state: { 
        data, 
        returnPath: '/orcamentos/novo/filme',
        budgetId 
      }
    });
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
              {showPreview ? "Ocultar" : "Visualizar"} Resumo
            </Button>
            <Button onClick={handlePreview} className="gap-2">
              <Eye className="h-4 w-4" />
              Visualizar Preview
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

                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                  <FormInput
                    id="entregaveis"
                    label="Entregáveis"
                    value={data.entregaveis || ""}
                    onChange={(v) => updateData({ entregaveis: v })}
                    placeholder="Ex: 1 filme 30s, 1 filme 15s..."
                  />
                  <FormInput
                    id="adaptacoes"
                    label="Adaptações"
                    value={data.adaptacoes || ""}
                    onChange={(v) => updateData({ adaptacoes: v })}
                    placeholder="Ex: 2 adaptações..."
                  />
                  <div className="space-y-2">
                    <Label htmlFor="exclusividade">Exclusividade de Elenco</Label>
                    <Select
                      value={data.exclusividade_elenco || "nao_aplica"}
                      onValueChange={(v: any) => updateData({ exclusividade_elenco: v })}
                    >
                      <SelectTrigger id="exclusividade">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="orcado">Orçado</SelectItem>
                        <SelectItem value="nao_orcado">Não Orçado</SelectItem>
                        <SelectItem value="nao_aplica">Não se Aplica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cotações de Produtoras - Filme</CardTitle>
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
                          label="Diretor (opcional)"
                          value={q.diretor || ""}
                          onChange={(v) => updateQuote(q.id, { diretor: v })}
                          placeholder="Nome do diretor"
                        />
                        <FormInput
                          id={`tratamento-${q.id}`}
                          label="Tratamento (opcional)"
                          value={q.tratamento || ""}
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

            {/* Seção de Áudio Opcional */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Incluir Produtora de Áudio?</CardTitle>
                  <Switch
                    checked={data.inclui_audio || false}
                    onCheckedChange={(v) => updateData({ inclui_audio: v })}
                  />
                </div>
              </CardHeader>
              {data.inclui_audio && (
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      Adicione cotações de produtoras de áudio
                    </p>
                    <Button size="sm" variant="secondary" onClick={addAudioQuote} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Áudio
                    </Button>
                  </div>
                  <AnimatePresence>
                    {(data.quotes_audio || []).map((q) => (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border border-border rounded-2xl p-4 space-y-3 bg-blue-50/50"
                      >
                        <div className="grid md:grid-cols-4 gap-3">
                          <FormInput
                            id={`audio-prod-${q.id}`}
                            label="Produtora"
                            value={q.produtora}
                            onChange={(v) => updateAudioQuote(q.id, { produtora: v })}
                            placeholder="Nome"
                          />
                          <FormInput
                            id={`audio-desc-${q.id}`}
                            label="Descrição"
                            value={q.descricao}
                            onChange={(v) => updateAudioQuote(q.id, { descricao: v })}
                            placeholder="Descrição"
                          />
                          <FormInput
                            id={`audio-valor-${q.id}`}
                            label="Valor (R$)"
                            value={String(q.valor || "")}
                            onChange={(v) => updateAudioQuote(q.id, { valor: parseCurrency(v) })}
                            placeholder="0,00"
                          />
                          <FormInput
                            id={`audio-desconto-${q.id}`}
                            label="Desconto (R$)"
                            value={String(q.desconto || "")}
                            onChange={(v) => updateAudioQuote(q.id, { desconto: parseCurrency(v) })}
                            placeholder="0,00"
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeAudioQuote(q.id)} 
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
              )}
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
                      <div className="text-muted-foreground text-xs mb-1">Cotações Filme</div>
                      <div className="font-medium">{data.quotes_film?.length || 0}</div>
                    </div>
                    {data.inclui_audio && (
                      <div className="p-3 rounded-xl bg-blue-50">
                        <div className="text-muted-foreground text-xs mb-1">Cotações Áudio</div>
                        <div className="font-medium">{data.quotes_audio?.length || 0}</div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="text-sm font-semibold mb-3">Resumo Financeiro</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 rounded-lg bg-secondary/20">
                        <span className="text-muted-foreground">Filme:</span>
                        <span className="font-medium">
                          {formatCurrency((data.quotes_film || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0))}
                        </span>
                      </div>
                      {data.inclui_audio && (
                        <div className="flex justify-between p-2 rounded-lg bg-blue-50">
                          <span className="text-muted-foreground">Áudio:</span>
                          <span className="font-medium">
                            {formatCurrency((data.quotes_audio || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0))}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between p-2 rounded-lg bg-secondary/20">
                        <span className="text-muted-foreground">Honorário ({data.honorario_perc || 0}%):</span>
                        <span className="font-medium">
                          {formatCurrency(
                            (((data.quotes_film || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0) +
                              (data.inclui_audio ? (data.quotes_audio || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0) : 0)) *
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
