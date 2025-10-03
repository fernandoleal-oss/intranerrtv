import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, FileText, Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { HeaderBar } from "@/components/HeaderBar";

type BudgetType = "filme" | "audio" | "imagem" | "cc";

interface QuoteFilm {
  id: string;
  produtora: string;
  escopo: string;
  valor: number;
  diretor: string;
  tratamento: string;
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
  type: BudgetType;
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
  total: number;
  pendente_faturamento?: boolean;
  observacoes?: string;
}

const parseCurrency = (val: string): number => {
  if (!val) return 0;
  const clean = val.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
};

const money = (n: number | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export default function OrcamentoNovo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<BudgetData>({
    type: "filme",
    quotes_film: [],
    quotes_audio: [],
    honorario_perc: 0,
    total: 0,
    pendente_faturamento: false,
    inclui_audio: false,
    exclusividade_elenco: "nao_aplica",
  });

  // Redirecionar para página específica quando tipo for imagem
  useEffect(() => {
    if (data.type === "imagem") {
      navigate("/new/imagem");
    }
  }, [data.type, navigate]);

  const updateData = useCallback((updates: Partial<BudgetData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Recalcular totais usando APENAS as mais baratas
  useEffect(() => {
    // Encontrar a produtora de filme mais barata
    const cheapestFilm = (data.quotes_film || []).length > 0
      ? (data.quotes_film || []).reduce((min, q) => {
          const qVal = q.valor - (q.desconto || 0);
          const minVal = min.valor - (min.desconto || 0);
          return qVal < minVal ? q : min;
        })
      : null;

    // Encontrar a produtora de áudio mais barata
    const cheapestAudio = data.inclui_audio && (data.quotes_audio || []).length > 0
      ? (data.quotes_audio || []).reduce((min, q) => {
          const qVal = q.valor - (q.desconto || 0);
          const minVal = min.valor - (min.desconto || 0);
          return qVal < minVal ? q : min;
        })
      : null;

    const filmSubtotal = cheapestFilm ? (cheapestFilm.valor - (cheapestFilm.desconto || 0)) : 0;
    const audioSubtotal = cheapestAudio ? (cheapestAudio.valor - (cheapestAudio.desconto || 0)) : 0;
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

  const handleSave = async () => {
    if (!data.cliente || !data.produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = { ...data };
      
      // Usar create_budget_with_version que existe no DB
      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .insert({
          type: data.type,
          status: "rascunho",
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Criar versão inicial
      const { data: versionData, error: versionError } = await supabase
        .from("versions")
        .insert([{
          budget_id: budgetData.id,
          versao: 1,
          payload: payload as any,
          total_geral: data.total,
        }])
        .select()
        .single();

      if (versionError) throw versionError;

      toast({ title: "Orçamento salvo com sucesso!" });
      navigate(`/budget/${budgetData.id}/pdf`);
    } catch (err: any) {
      console.error("[save-budget] error:", err);
      toast({
        title: "Erro ao salvar orçamento",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const cheapestFilm = (data.quotes_film || []).length > 0
    ? (data.quotes_film || []).reduce((min, q) => {
        const qVal = q.valor - (q.desconto || 0);
        const minVal = min.valor - (min.desconto || 0);
        return qVal < minVal ? q : min;
      })
    : null;

  const cheapestAudio = data.inclui_audio && (data.quotes_audio || []).length > 0
    ? (data.quotes_audio || []).reduce((min, q) => {
        const qVal = q.valor - (q.desconto || 0);
        const minVal = min.valor - (min.desconto || 0);
        return qVal < minVal ? q : min;
      })
    : null;

  const filmVal = cheapestFilm ? (cheapestFilm.valor - (cheapestFilm.desconto || 0)) : 0;
  const audioVal = cheapestAudio ? (cheapestAudio.valor - (cheapestAudio.desconto || 0)) : 0;
  const subtotal = filmVal + audioVal;
  const honorValue = subtotal * ((data.honorario_perc || 0) / 100);

  return (
    <div className="min-h-screen bg-background">
      <HeaderBar
        title="Novo Orçamento"
        subtitle="Preencha os dados e visualize em tempo real"
        backTo="/orcamentos"
        actions={
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? "Salvando..." : (
              <>
                <Save className="h-4 w-4" />
                Salvar e Gerar PDF
              </>
            )}
          </Button>
        }
      />

      <div className="container-page">
        {/* Instruções */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
              <AlertCircle className="h-5 w-5" />
              Instruções de Preenchimento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-900/70 space-y-1">
            <p>• <b>Cliente</b> e <b>Produto</b>: Campos obrigatórios para identificação.</p>
            <p>• <b>Cotações</b>: Adicione múltiplas produtoras para comparação lado a lado.</p>
            <p>• <b>Mais Barata</b>: O sistema destaca automaticamente a opção mais econômica.</p>
            <p>• <b>Total Sugerido</b>: Calcula usando APENAS as produtoras mais baratas (1 filme + 1 áudio).</p>
            <p>• <b>Honorário</b>: Percentual aplicado sobre o subtotal das produtoras selecionadas.</p>
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
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={data.type} onValueChange={(v) => updateData({ type: v as BudgetType })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filme">Filme</SelectItem>
                        <SelectItem value="audio">Áudio</SelectItem>
                        <SelectItem value="imagem">Imagem</SelectItem>
                        <SelectItem value="cc">Closed Caption</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Produtor</Label>
                    <Input
                      value={data.produtor || ""}
                      onChange={(e) => updateData({ produtor: e.target.value })}
                      placeholder="Nome do produtor"
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={data.email || ""}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cliente & Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente *</Label>
                    <Input
                      value={data.cliente || ""}
                      onChange={(e) => updateData({ cliente: e.target.value })}
                      placeholder="Nome do cliente"
                      required
                    />
                  </div>
                  <div>
                    <Label>Produto *</Label>
                    <Input
                      value={data.produto || ""}
                      onChange={(e) => updateData({ produto: e.target.value })}
                      placeholder="Nome do produto"
                      required
                    />
                  </div>
                  <div>
                    <Label>Job</Label>
                    <Input value={data.job || ""} onChange={(e) => updateData({ job: e.target.value })} />
                  </div>
                  <div>
                    <Label>Mídias</Label>
                    <Input value={data.midias || ""} onChange={(e) => updateData({ midias: e.target.value })} />
                  </div>
                  <div>
                    <Label>Território</Label>
                    <Input value={data.territorio || ""} onChange={(e) => updateData({ territorio: e.target.value })} />
                  </div>
                  <div>
                    <Label>Período</Label>
                    <Input value={data.periodo || ""} onChange={(e) => updateData({ periodo: e.target.value })} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label>Entregáveis</Label>
                    <Input
                      value={data.entregaveis || ""}
                      onChange={(e) => updateData({ entregaveis: e.target.value })}
                      placeholder="Ex: 1 filme 30s, 1 filme 15s..."
                    />
                  </div>
                  <div>
                    <Label>Adaptações</Label>
                    <Input
                      value={data.adaptacoes || ""}
                      onChange={(e) => updateData({ adaptacoes: e.target.value })}
                      placeholder="Ex: 2 adaptações..."
                    />
                  </div>
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
                <Button size="sm" variant="outline" onClick={addQuote} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Cotação
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data.quotes_film || []).map((q) => {
                  const isCheapest = cheapestFilm?.id === q.id;
                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border rounded-lg p-4 space-y-3 ${
                        isCheapest 
                          ? 'border-green-500 bg-green-50/50 border-2' 
                          : 'border-border bg-secondary/20'
                      }`}
                    >
                      {isCheapest && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-600 text-white">
                            ⭐ MAIS BARATA - FILME
                          </span>
                        </div>
                      )}
                      <div className="grid md:grid-cols-3 gap-3">
                        <div>
                          <Label>Produtora</Label>
                          <Input
                            value={q.produtora}
                            onChange={(e) => updateQuote(q.id, { produtora: e.target.value })}
                            placeholder="Nome da produtora"
                          />
                        </div>
                        <div>
                          <Label>Diretor (opcional)</Label>
                          <Input value={q.diretor} onChange={(e) => updateQuote(q.id, { diretor: e.target.value })} />
                        </div>
                        <div>
                          <Label>Tratamento (opcional)</Label>
                          <Input
                            value={q.tratamento}
                            onChange={(e) => updateQuote(q.id, { tratamento: e.target.value })}
                            placeholder="Link ou descrição"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Escopo Detalhado</Label>
                        <textarea
                          className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                          value={q.escopo}
                          onChange={(e) => updateQuote(q.id, { escopo: e.target.value })}
                          placeholder="Descreva o escopo completo da produtora..."
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <Label>Valor (R$)</Label>
                          <Input
                            inputMode="decimal"
                            value={q.valor ? String(q.valor) : ""}
                            onChange={(e) => updateQuote(q.id, { valor: parseCurrency(e.target.value) })}
                            placeholder="0,00"
                          />
                        </div>
                        <div>
                          <Label>Desconto (R$)</Label>
                          <Input
                            inputMode="decimal"
                            value={q.desconto ? String(q.desconto) : ""}
                            onChange={(e) => updateQuote(q.id, { desconto: parseCurrency(e.target.value) })}
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="text-sm">
                          <span className="font-semibold">Valor Final: </span>
                          <span className="text-lg font-bold text-primary">
                            {money(q.valor - (q.desconto || 0))}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeQuote(q.id)}
                          className="text-destructive gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remover
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
                {(!data.quotes_film || data.quotes_film.length === 0) && (
                  <div className="text-sm text-muted-foreground">Nenhuma cotação adicionada.</div>
                )}
              </CardContent>
            </Card>

            {/* Seção de Áudio Opcional */}
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Produtora de Áudio
                      {!data.inclui_audio && (
                        <span className="text-sm font-normal text-blue-600">💡 Adicionar cotação de áudio?</span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {data.inclui_audio 
                        ? "Adicione cotações de produtoras de áudio para comparação" 
                        : "Ative para incluir cotações de produtoras de áudio"}
                    </p>
                  </div>
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
                  {(data.quotes_audio || []).map((q) => {
                    const isCheapest = cheapestAudio?.id === q.id;
                    return (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-lg p-4 space-y-3 ${
                          isCheapest 
                            ? 'border-blue-500 bg-blue-50/50 border-2' 
                            : 'border-border bg-blue-50/30'
                        }`}
                      >
                        {isCheapest && (
                          <div className="mb-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                              ⭐ MAIS BARATA - ÁUDIO
                            </span>
                          </div>
                        )}
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <Label>Produtora</Label>
                            <Input
                              value={q.produtora}
                              onChange={(e) => updateAudioQuote(q.id, { produtora: e.target.value })}
                              placeholder="Nome"
                            />
                          </div>
                          <div>
                            <Label>Descrição/Escopo</Label>
                            <textarea
                              className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                              value={q.descricao}
                              onChange={(e) => updateAudioQuote(q.id, { descricao: e.target.value })}
                              placeholder="Descreva o escopo de áudio..."
                            />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <Label>Valor (R$)</Label>
                            <Input
                              inputMode="decimal"
                              value={q.valor ? String(q.valor) : ""}
                              onChange={(e) => updateAudioQuote(q.id, { valor: parseCurrency(e.target.value) })}
                              placeholder="0,00"
                            />
                          </div>
                          <div>
                            <Label>Desconto (R$)</Label>
                            <Input
                              inputMode="decimal"
                              value={q.desconto ? String(q.desconto) : ""}
                              onChange={(e) => updateAudioQuote(q.id, { desconto: parseCurrency(e.target.value) })}
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="text-sm">
                            <span className="font-semibold">Valor Final: </span>
                            <span className="text-lg font-bold text-blue-600">
                              {money(q.valor - (q.desconto || 0))}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAudioQuote(q.id)}
                            className="text-destructive gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remover
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                  {(!data.quotes_audio || data.quotes_audio.length === 0) && (
                    <div className="text-sm text-blue-700/70">Nenhuma cotação de áudio adicionada.</div>
                  )}
                </CardContent>
              )}
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Honorário</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label>Percentual (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={data.honorario_perc || 0}
                    onChange={(e) => updateData({ honorario_perc: parseFloat(e.target.value) || 0 })}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Faturamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="pendente"
                      checked={!!data.pendente_faturamento}
                      onCheckedChange={(checked) => updateData({ pendente_faturamento: Boolean(checked) })}
                    />
                    <div>
                      <Label htmlFor="pendente" className="cursor-pointer">
                        Pendente de faturamento
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Marcará visualmente no PDF
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input
                      value={data.observacoes || ""}
                      onChange={(e) => updateData({ observacoes: e.target.value })}
                      placeholder="Ex.: incluir em outubro"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.pendente_faturamento && (
                    <div className="rounded-md border border-yellow-600 bg-yellow-50 text-yellow-800 text-xs px-3 py-2">
                      <strong>PENDENTE DE FATURAMENTO</strong>
                    </div>
                  )}

                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{data.cliente || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Produto:</span>
                      <span className="font-medium">{data.produto || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cotações:</span>
                      <span className="font-medium">{data.quotes_film?.length || 0}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="text-xs font-semibold mb-2 text-primary">💡 Melhor Combinação</div>
                    {cheapestFilm && (
                      <div className="flex justify-between p-2 rounded-lg bg-green-50 border border-green-200">
                        <span className="text-xs text-green-700">Filme - {cheapestFilm.produtora}</span>
                        <span className="font-mono text-green-700">{money(filmVal)}</span>
                      </div>
                    )}
                    {cheapestAudio && (
                      <div className="flex justify-between p-2 rounded-lg bg-blue-50 border border-blue-200">
                        <span className="text-xs text-blue-700">Áudio - {cheapestAudio.produtora}</span>
                        <span className="font-mono text-blue-700">{money(audioVal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Honorário ({data.honorario_perc || 0}%):</span>
                      <span className="font-mono">{money(honorValue)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base border-t pt-2">
                      <span>Total:</span>
                      <span className="font-mono text-primary">{money(data.total)}</span>
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
