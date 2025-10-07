import { useState, useCallback, useEffect, useMemo } from "react";
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

type CombineMode = "individual" | "somar" | "pacote";

interface Campaign {
  id: string;
  nome: string;
  inclui_audio?: boolean;
  quotes_film: QuoteFilm[];
  quotes_audio: QuoteAudio[];
}

interface TotaisCampanha {
  campId: string;
  nome: string;
  filmVal: number;
  audioVal: number;
  subtotal: number;
  honor: number;
  total: number;
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

  // legado (mantido por compatibilidade/possível migração)
  inclui_audio?: boolean;
  quotes_film?: QuoteFilm[];
  quotes_audio?: QuoteAudio[];

  // novo modelo com campanhas
  campanhas?: Campaign[];
  combinar_modo?: CombineMode;
  desconto_pacote_perc?: number;
  totais_campanhas?: TotaisCampanha[];

  honorario_perc?: number;
  total: number;
  pendente_faturamento?: boolean;
  observacoes?: string;
}

const parseCurrency = (val: string): number => {
  if (!val) return 0;
  const clean = val
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(clean) || 0;
};

const money = (n: number | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

// ---- helpers de cálculo ----
const getCheapest = <T extends { valor: number; desconto?: number }>(arr: T[]) => {
  return arr.reduce((min, q) => {
    const qVal = q.valor - (q.desconto || 0);
    const minVal = min.valor - (min.desconto || 0);
    return qVal < minVal ? q : min;
  });
};

const calcCampanhaPartes = (camp: Campaign) => {
  const cheapestFilm = camp.quotes_film.length ? getCheapest(camp.quotes_film) : null;
  const cheapestAudio = camp.inclui_audio && camp.quotes_audio.length ? getCheapest(camp.quotes_audio) : null;

  const filmVal = cheapestFilm ? cheapestFilm.valor - (cheapestFilm.desconto || 0) : 0;
  const audioVal = cheapestAudio ? cheapestAudio.valor - (cheapestAudio.desconto || 0) : 0;
  const subtotal = filmVal + audioVal;

  return { filmVal, audioVal, subtotal };
};

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
    campanhas: [
      {
        id: crypto.randomUUID(),
        nome: "Campanha 1",
        inclui_audio: false,
        quotes_film: [],
        quotes_audio: [],
      },
    ],
    combinar_modo: "individual",
    desconto_pacote_perc: 0,
    totais_campanhas: [],
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

  // Migração única: trazer cotações antigas para a primeira campanha
  useEffect(() => {
    setData((prev) => {
      const hasLegacy =
        (prev.quotes_film && prev.quotes_film.length > 0) || (prev.quotes_audio && prev.quotes_audio.length > 0);

      if (!prev.campanhas || prev.campanhas.length === 0) {
        return {
          ...prev,
          campanhas: [
            {
              id: crypto.randomUUID(),
              nome: "Campanha 1",
              inclui_audio: prev.inclui_audio,
              quotes_film: prev.quotes_film || [],
              quotes_audio: prev.quotes_audio || [],
            },
          ],
        };
      }

      if (
        hasLegacy &&
        prev.campanhas?.[0] &&
        prev.campanhas[0].quotes_film.length === 0 &&
        prev.campanhas[0].quotes_audio.length === 0
      ) {
        const clone = structuredClone(prev);
        clone.campanhas![0].inclui_audio = prev.inclui_audio;
        clone.campanhas![0].quotes_film = prev.quotes_film || [];
        clone.campanhas![0].quotes_audio = prev.quotes_audio || [];
        return clone;
      }
      return prev;
    });
    // rodar só 1x
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers de campanhas e cotações
  const addCampaign = () => {
    setData((prev) => ({
      ...prev,
      campanhas: [
        ...(prev.campanhas || []),
        {
          id: crypto.randomUUID(),
          nome: `Campanha ${(prev.campanhas?.length || 0) + 1}`,
          inclui_audio: false,
          quotes_film: [],
          quotes_audio: [],
        },
      ],
    }));
  };

  const updateCampaign = (id: string, updates: Partial<Campaign>) => {
    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const addQuoteFilmTo = (campId: string) => {
    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.map((c) =>
        c.id === campId
          ? {
              ...c,
              quotes_film: [
                ...c.quotes_film,
                {
                  id: crypto.randomUUID(),
                  produtora: "",
                  escopo: "",
                  valor: 0,
                  diretor: "",
                  tratamento: "",
                  desconto: 0,
                },
              ],
            }
          : c,
      ),
    }));
  };

  const updateQuoteFilmIn = (campId: string, quoteId: string, updates: Partial<QuoteFilm>) => {
    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.map((c) =>
        c.id === campId
          ? {
              ...c,
              quotes_film: c.quotes_film.map((q) => (q.id === quoteId ? { ...q, ...updates } : q)),
            }
          : c,
      ),
    }));
  };

  const removeQuoteFilmFrom = (campId: string, quoteId: string) => {
    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.map((c) =>
        c.id === campId ? { ...c, quotes_film: c.quotes_film.filter((q) => q.id !== quoteId) } : c,
      ),
    }));
  };

  const addQuoteAudioTo = (campId: string) => {
    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.map((c) =>
        c.id === campId
          ? {
              ...c,
              quotes_audio: [
                ...c.quotes_audio,
                { id: crypto.randomUUID(), produtora: "", descricao: "", valor: 0, desconto: 0 },
              ],
            }
          : c,
      ),
    }));
  };

  const updateQuoteAudioIn = (campId: string, quoteId: string, updates: Partial<QuoteAudio>) => {
    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.map((c) =>
        c.id === campId
          ? {
              ...c,
              quotes_audio: c.quotes_audio.map((q) => (q.id === quoteId ? { ...q, ...updates } : q)),
            }
          : c,
      ),
    }));
  };

  const removeQuoteAudioFrom = (campId: string, quoteId: string) => {
    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.map((c) =>
        c.id === campId ? { ...c, quotes_audio: c.quotes_audio.filter((q) => q.id !== quoteId) } : c,
      ),
    }));
  };

  // Cálculo dos totais (por campanha e total geral) conforme modo
  useEffect(() => {
    const camps = data.campanhas || [];
    if (camps.length === 0) return;

    const honorPerc = (data.honorario_perc || 0) / 100;

    // base por campanha (sempre calculamos)
    const baseCampanhas: TotaisCampanha[] = camps.map((c) => {
      const { filmVal, audioVal, subtotal } = calcCampanhaPartes(c);
      return {
        campId: c.id,
        nome: c.nome,
        filmVal,
        audioVal,
        subtotal,
        honor: 0,
        total: 0,
      };
    });

    let totalGeral = 0;

    if (data.combinar_modo === "individual") {
      const preenchido = baseCampanhas.map((t) => {
        const honor = t.subtotal * honorPerc;
        const total = t.subtotal + honor;
        return { ...t, honor, total };
      });
      totalGeral = preenchido.reduce((acc, t) => acc + t.total, 0);

      setData((prev) => ({
        ...prev,
        totais_campanhas: preenchido,
        total: totalGeral,
      }));
      return;
    }

    // somar ou pacote
    const sumSubtotal = baseCampanhas.reduce((acc, t) => acc + t.subtotal, 0);
    const descontoPacotePerc = data.combinar_modo === "pacote" ? (data.desconto_pacote_perc || 0) / 100 : 0;
    const subtotalComDesconto = sumSubtotal * (1 - descontoPacotePerc);
    const honorConsolidado = subtotalComDesconto * honorPerc;
    totalGeral = subtotalComDesconto + honorConsolidado;

    setData((prev) => ({
      ...prev,
      totais_campanhas: baseCampanhas, // aqui mantemos apenas os subtotais por referência
      total: totalGeral,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.campanhas, data.honorario_perc, data.combinar_modo, data.desconto_pacote_perc]);

  const handleSave = async () => {
    if (!data.cliente || !data.produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = { ...data };

      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .insert({
          type: data.type,
          status: "rascunho",
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      const { error: versionError } = await supabase.from("versions").insert([
        {
          budget_id: budgetData.id,
          versao: 1,
          payload: payload as any,
          total_geral: data.total,
        },
      ]);

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

  // ---- Derivados para o Preview ----
  const resumoPreview = useMemo(() => {
    const camps = data.totais_campanhas || [];
    const honorPerc = (data.honorario_perc || 0) / 100;

    const subtotalCombinado = camps.reduce((acc, t) => acc + t.subtotal, 0);
    const isPacote = data.combinar_modo === "pacote";
    const descontoPacotePerc = isPacote ? (data.desconto_pacote_perc || 0) / 100 : 0;
    const subtotalComDesconto = subtotalCombinado * (1 - descontoPacotePerc);
    const honorConsolidado = subtotalComDesconto * honorPerc;
    const totalConsolidado = subtotalComDesconto + honorConsolidado;

    return {
      subtotalCombinado,
      descontoPacotePerc,
      subtotalComDesconto,
      honorConsolidado,
      totalConsolidado,
    };
  }, [data.totais_campanhas, data.honorario_perc, data.combinar_modo, data.desconto_pacote_perc]);

  // Contagem rápida para header do Preview
  const totalQuotesFilme = useMemo(
    () => (data.campanhas || []).reduce((acc, c) => acc + c.quotes_film.length, 0),
    [data.campanhas],
  );

  return (
    <div className="min-h-screen bg-background">
      <HeaderBar
        title="Novo Orçamento"
        subtitle="Preencha os dados e visualize em tempo real"
        backTo="/orcamentos"
        actions={
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              "Salvando..."
            ) : (
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
            <p>
              • <b>Cliente</b> e <b>Produto</b>: Campos obrigatórios para identificação.
            </p>
            <p>
              • <b>Campanhas</b>: Adicione 1+ campanhas. Cada campanha pode ter cotações de filme e áudio.
            </p>
            <p>
              • <b>Mais Barata</b>: Em cada campanha, o sistema usa a produtora mais barata (filme e áudio).
            </p>
            <p>
              • <b>Apresentação</b>: Com 2+ campanhas, escolha “Individual”, “Somar” ou “Pacote (% de desconto)”.
            </p>
            <p>
              • <b>Honorário</b>: Percentual aplicado no subtotal (por campanha no modo “Individual” ou no consolidado).
            </p>
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

            {/* Apresentação/Combinação (quando houver 2+ campanhas) */}
            {(data.campanhas?.length || 0) > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Como apresentar</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Modo</Label>
                    <Select
                      value={data.combinar_modo || "individual"}
                      onValueChange={(v: CombineMode) => updateData({ combinar_modo: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual (separado)</SelectItem>
                        <SelectItem value="somar">Somar (consolidado)</SelectItem>
                        <SelectItem value="pacote">Pacote (desconto %)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {data.combinar_modo === "pacote" && (
                    <div>
                      <Label>Desconto do Pacote (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={data.desconto_pacote_perc || 0}
                        onChange={(e) =>
                          updateData({ desconto_pacote_perc: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })
                        }
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Campanhas */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-muted-foreground">Campanhas</h3>
              <Button size="sm" variant="outline" className="gap-2" onClick={addCampaign}>
                <Plus className="h-4 w-4" />
                Adicionar Campanha
              </Button>
            </div>

            {(data.campanhas || []).map((camp) => {
              const cheapestFilm = camp.quotes_film.length ? getCheapest(camp.quotes_film) : null;
              const cheapestAudio =
                camp.inclui_audio && camp.quotes_audio.length ? getCheapest(camp.quotes_audio) : null;

              return (
                <Card key={camp.id} className="border-2 border-border/50">
                  <CardHeader className="flex flex-col gap-2">
                    <div className="grid md:grid-cols-3 gap-3 items-end">
                      <div className="md:col-span-2">
                        <Label>Nome da Campanha</Label>
                        <Input
                          value={camp.nome}
                          onChange={(e) => updateCampaign(camp.id, { nome: e.target.value })}
                          placeholder="Ex.: Lançamento Q4"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <Label className="mb-1">Incluir Áudio</Label>
                          <Switch
                            checked={camp.inclui_audio || false}
                            onCheckedChange={(v) => updateCampaign(camp.id, { inclui_audio: v })}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {camp.inclui_audio ? "Com áudio" : "Sem áudio"}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Cotações Filme */}
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Cotações de Produtoras - Filme</h4>
                      <Button size="sm" variant="outline" onClick={() => addQuoteFilmTo(camp.id)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar Cotação (Filme)
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {camp.quotes_film.length === 0 && (
                        <div className="text-sm text-muted-foreground">Nenhuma cotação de filme.</div>
                      )}
                      {camp.quotes_film.map((q) => {
                        const isCheapest = cheapestFilm?.id === q.id;
                        return (
                          <motion.div
                            key={q.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`border rounded-lg p-4 space-y-3 ${
                              isCheapest ? "border-green-500 bg-green-50/50 border-2" : "border-border bg-secondary/20"
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
                                  onChange={(e) => updateQuoteFilmIn(camp.id, q.id, { produtora: e.target.value })}
                                  placeholder="Nome da produtora"
                                />
                              </div>
                              <div>
                                <Label>Diretor (opcional)</Label>
                                <Input
                                  value={q.diretor}
                                  onChange={(e) => updateQuoteFilmIn(camp.id, q.id, { diretor: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Tratamento (opcional)</Label>
                                <Input
                                  value={q.tratamento}
                                  onChange={(e) => updateQuoteFilmIn(camp.id, q.id, { tratamento: e.target.value })}
                                  placeholder="Link ou descrição"
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Escopo Detalhado</Label>
                              <textarea
                                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                                value={q.escopo}
                                onChange={(e) => updateQuoteFilmIn(camp.id, q.id, { escopo: e.target.value })}
                                placeholder="Descreva o escopo completo da produtora..."
                              />
                            </div>
                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <Label>Valor (R$)</Label>
                                <Input
                                  inputMode="decimal"
                                  value={q.valor ? String(q.valor) : ""}
                                  onChange={(e) =>
                                    updateQuoteFilmIn(camp.id, q.id, { valor: parseCurrency(e.target.value) })
                                  }
                                  placeholder="0,00"
                                />
                              </div>
                              <div>
                                <Label>Desconto (R$)</Label>
                                <Input
                                  inputMode="decimal"
                                  value={q.desconto ? String(q.desconto) : ""}
                                  onChange={(e) =>
                                    updateQuoteFilmIn(camp.id, q.id, { desconto: parseCurrency(e.target.value) })
                                  }
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
                                onClick={() => removeQuoteFilmFrom(camp.id, q.id)}
                                className="text-destructive gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                Remover
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Cotações Áudio */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Produtora de Áudio</h4>
                          <p className="text-sm text-muted-foreground">
                            {camp.inclui_audio
                              ? "Adicione cotações de produtoras de áudio"
                              : "Ative o áudio para incluir cotações"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => addQuoteAudioTo(camp.id)}
                          className="gap-2"
                          disabled={!camp.inclui_audio}
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar Áudio
                        </Button>
                      </div>

                      {camp.inclui_audio && (
                        <div className="space-y-4 mt-4">
                          {camp.quotes_audio.length === 0 && (
                            <div className="text-sm text-muted-foreground">Nenhuma cotação de áudio.</div>
                          )}
                          {camp.quotes_audio.map((q) => {
                            const isCheapest = cheapestAudio?.id === q.id;
                            return (
                              <motion.div
                                key={q.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`border rounded-lg p-4 space-y-3 ${
                                  isCheapest ? "border-blue-500 bg-blue-50/50 border-2" : "border-border bg-blue-50/30"
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
                                      onChange={(e) => updateQuoteAudioIn(camp.id, q.id, { produtora: e.target.value })}
                                      placeholder="Nome"
                                    />
                                  </div>
                                  <div>
                                    <Label>Descrição/Escopo</Label>
                                    <textarea
                                      className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                                      value={q.descricao}
                                      onChange={(e) => updateQuoteAudioIn(camp.id, q.id, { descricao: e.target.value })}
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
                                      onChange={(e) =>
                                        updateQuoteAudioIn(camp.id, q.id, { valor: parseCurrency(e.target.value) })
                                      }
                                      placeholder="0,00"
                                    />
                                  </div>
                                  <div>
                                    <Label>Desconto (R$)</Label>
                                    <Input
                                      inputMode="decimal"
                                      value={q.desconto ? String(q.desconto) : ""}
                                      onChange={(e) =>
                                        updateQuoteAudioIn(camp.id, q.id, { desconto: parseCurrency(e.target.value) })
                                      }
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
                                    onClick={() => removeQuoteAudioFrom(camp.id, q.id)}
                                    className="text-destructive gap-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Remover
                                  </Button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

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
                      <p className="text-xs text-muted-foreground">Marcará visualmente no PDF</p>
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
                      <span className="text-muted-foreground">Cotações (Filme):</span>
                      <span className="font-medium">{totalQuotesFilme}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campanhas:</span>
                      <span className="font-medium">{data.campanhas?.length || 0}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3 text-sm">
                    {data.combinar_modo === "individual" ? (
                      <>
                        <div className="text-xs font-semibold mb-2 text-primary">💡 Totais por Campanha</div>
                        {(data.totais_campanhas || []).map((t) => (
                          <div key={t.campId} className="rounded-lg border p-3 space-y-2">
                            <div className="flex justify-between">
                              <span className="font-medium">{t.nome}</span>
                              <span className="font-mono">{money(t.total)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>Filme:</span>
                                <span className="font-mono">{money(t.filmVal)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Áudio:</span>
                                <span className="font-mono">{money(t.audioVal)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Honorário ({data.honorario_perc || 0}%):</span>
                                <span className="font-mono">{money(t.honor)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between font-semibold text-base border-t pt-2">
                          <span>Total Geral:</span>
                          <span className="font-mono text-primary">{money(data.total)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs font-semibold mb-2 text-primary">
                          💡 Consolidação {data.combinar_modo === "pacote" ? "(Pacote)" : "(Somar)"}
                        </div>

                        <div className="space-y-1">
                          {(data.totais_campanhas || []).map((t) => (
                            <div key={t.campId} className="flex justify-between text-xs">
                              <span>{t.nome}</span>
                              <span className="font-mono">{money(t.subtotal)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between pt-2">
                          <span>Subtotal combinado:</span>
                          <span className="font-mono">{money(resumoPreview.subtotalCombinado)}</span>
                        </div>

                        {data.combinar_modo === "pacote" && (
                          <>
                            <div className="flex justify-between">
                              <span>Desconto do pacote ({data.desconto_pacote_perc || 0}%):</span>
                              <span className="font-mono">
                                {money(resumoPreview.subtotalCombinado - resumoPreview.subtotalComDesconto)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Subtotal com desconto:</span>
                              <span className="font-mono">{money(resumoPreview.subtotalComDesconto)}</span>
                            </div>
                          </>
                        )}

                        <div className="flex justify-between">
                          <span>Honorário ({data.honorario_perc || 0}%):</span>
                          <span className="font-mono">
                            {money(
                              data.combinar_modo === "pacote"
                                ? resumoPreview.honorConsolidado
                                : (resumoPreview.subtotalCombinado * (data.honorario_perc || 0)) / 100,
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between font-semibold text-base border-t pt-2">
                          <span>Total:</span>
                          <span className="font-mono text-primary">{money(data.total)}</span>
                        </div>
                      </>
                    )}
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
