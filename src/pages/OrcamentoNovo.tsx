// src/pages/OrcamentoNovo.tsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, FileText, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

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
  quotes_film?: QuoteFilm[];
  honorario_perc?: number;
  total: number;

  // NOVO: status de pagamento e observações de faturamento
  pendente_pagamento?: boolean;
  observacoes_faturamento?: string;
}

const parseCurrency = (val: string): number => {
  if (!val) return 0;
  const clean = val.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function OrcamentoNovo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<BudgetData>({
    type: "filme",
    quotes_film: [],
    honorario_perc: 0,
    total: 0,
    pendente_pagamento: false,
    observacoes_faturamento: "",
  });

  const updateData = useCallback((updates: Partial<BudgetData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Recalcular totais
  useEffect(() => {
    const filmSubtotal = (data.quotes_film || []).reduce(
      (s, q) => s + (Number(q.valor) - (Number(q.desconto) || 0)),
      0
    );
    const honorario = filmSubtotal * ((data.honorario_perc || 0) / 100);
    const total = filmSubtotal + honorario;
    setData((prev) => ({ ...prev, total }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data.quotes_film), data.honorario_perc]);

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
      // Normaliza payload numérico
      const normalized: BudgetData = {
        ...data,
        quotes_film: (data.quotes_film || []).map((q) => ({
          ...q,
          valor: Number.isFinite(q.valor as number) ? Number(q.valor) : 0,
          desconto: Number.isFinite(q.desconto as number) ? Number(q.desconto) : 0,
        })),
        honorario_perc: Number.isFinite(data.honorario_perc as number) ? Number(data.honorario_perc) : 0,
        total: Number.isFinite(data.total) ? Number(data.total) : 0,
        pendente_pagamento: !!data.pendente_pagamento,
      };

      // 1) Cria orçamento
      const { data: createdRes, error: budgetError } = await supabase.rpc("create_simple_budget", {
        p_type: normalized.type,
      });

      if (budgetError) throw budgetError;
      const created = Array.isArray(createdRes) ? createdRes[0] : createdRes;
      if (!created?.version_id || !created?.id) {
        throw new Error("create_simple_budget não retornou { id, version_id }");
      }

      // 2) Atualiza a versão com o payload
      const { data: upd, error: versionError } = await supabase
        .from("versions")
        .update({
          payload: normalized as any,
          // ajuste o nome da coluna se necessário: total_geral vs total
          total_geral: normalized.total,
        })
        .eq("id", created.version_id)
        .select("id")
        .single();

      if (versionError) throw versionError;
      if (!upd?.id) throw new Error("Falha ao atualizar a versão");

      toast({ title: "Orçamento salvo com sucesso!" });
      navigate(`/budget/${created.id}/pdf`);
    } catch (e: any) {
      console.error("SAVE_BUDGET_ERROR", {
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
      });
      toast({
        title: "Erro ao salvar orçamento",
        description: e?.message || "Veja o console para detalhes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/orcamentos")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Novo Orçamento</h1>
              <p className="text-neutral-600">Preencha os dados e visualize em tempo real</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? "Salvando..." : (<><Save className="h-4 w-4" />Salvar e Gerar PDF</>)}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Identificação</CardTitle>
                {data.pendente_pagamento ? (
                  <Badge variant="destructive" className="flex items-center gap-1 text-[12px]">
                    <AlertTriangle className="h-3 w-3" />
                    Pendente de pagamento
                  </Badge>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cotações</CardTitle>
                <Button size="sm" variant="outline" onClick={addQuote} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data.quotes_film || []).map((q) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <Label>Produtora</Label>
                        <Input
                          value={q.produtora}
                          onChange={(e) => updateQuote(q.id, { produtora: e.target.value })}
                          placeholder="Nome"
                        />
                      </div>
                      <div>
                        <Label>Escopo</Label>
                        <Input
                          value={q.escopo}
                          onChange={(e) => updateQuote(q.id, { escopo: e.target.value })}
                          placeholder="Descrição"
                        />
                      </div>
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          inputMode="decimal"
                          value={Number.isFinite(q.valor) ? String(q.valor) : ""}
                          onChange={(e) => updateQuote(q.id, { valor: parseCurrency(e.target.value) })}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label>Diretor</Label>
                        <Input
                          value={q.diretor}
                          onChange={(e) => updateQuote(q.id, { diretor: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Tratamento</Label>
                        <Input
                          value={q.tratamento}
                          onChange={(e) => updateQuote(q.id, { tratamento: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Desconto (R$)</Label>
                        <Input
                          inputMode="decimal"
                          value={Number.isFinite(q.desconto) ? String(q.desconto) : ""}
                          onChange={(e) => updateQuote(q.id, { desconto: parseCurrency(e.target.value) })}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => removeQuote(q.id)} className="text-red-500 gap-1">
                        <Trash2 className="h-3 w-3" />
                        Remover
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Honorário & Faturamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <Label>Percentual de Honorário (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={data.honorario_perc || 0}
                      onChange={(e) => updateData({ honorario_perc: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        Pendente de pagamento
                      </Label>
                      <Switch
                        checked={!!data.pendente_pagamento}
                        onCheckedChange={(v) => updateData({ pendente_pagamento: v })}
                      />
                    </div>
                    <p className="text-xs text-neutral-500">
                      Quando marcado, este orçamento será destacado como “precisa ser incluso em algum faturamento”.
                    </p>
                    <div>
                      <Label>Observações de faturamento (opcional)</Label>
                      <Input
                        placeholder="ex.: incluir no faturamento de abril / PO em emissão / ratear com KV..."
                        value={data.observacoes_faturamento || ""}
                        onChange={(e) => updateData({ observacoes_faturamento: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.pendente_pagamento ? (
                    <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <div>
                        <div className="font-semibold">Pendente de pagamento</div>
                        <div>Precisa ser incluso em algum faturamento.</div>
                        {data.observacoes_faturamento ? (
                          <div className="mt-1 text-red-800/80">
                            Obs.: {data.observacoes_faturamento}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Cliente:</span>
                      <span className="font-medium">{data.cliente || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Produto:</span>
                      <span className="font-medium">{data.produto || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Cotações:</span>
                      <span className="font-medium">{data.quotes_film?.length || 0}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="text-sm font-semibold mb-2">Resumo Financeiro</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Subtotal Cotações:</span>
                        <span>
                          {formatBRL(
                            (data.quotes_film || []).reduce(
                              (s, q) => s + (Number(q.valor) - (Number(q.desconto) || 0)),
                              0
                            )
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Honorário ({data.honorario_perc || 0}%):</span>
                        <span>
                          {formatBRL(
                            ((data.quotes_film || []).reduce(
                              (s, q) => s + (Number(q.valor) - (Number(q.desconto) || 0)),
                              0
                            ) *
                              (data.honorario_perc || 0)) /
                              100
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-2 border-t">
                        <span>Total:</span>
                        <span className="text-primary">
                          {formatBRL(data.total)}
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
