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

interface FilmOption {
  id: string;
  nome: string;
  escopo: string;
  valor: number;
  desconto: number;
}

interface QuoteFilm {
  id: string;
  produtora: string;
  escopo: string;
  valor: number;
  diretor: string;
  tratamento: string;
  desconto: number;
  tem_opcoes?: boolean;
  opcoes?: FilmOption[];
}

interface QuoteAudio {
  id: string;
  produtora: string;
  descricao: string;
  valor: number;
  desconto: number;
}

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
  subtotal: number; // = filme + áudio (sem honorário)
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
  totais_campanhas?: TotaisCampanha[];

  // total geral desativado para multi-campanhas (mantemos como 0 p/ persistência)
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
const getCheapest = <T extends { valor: number; desconto?: number; tem_opcoes?: boolean; opcoes?: FilmOption[] }>(
  arr: T[],
) => {
  return arr.reduce((min, q) => {
    // Se tem opções, pega o menor valor entre as opções
    let qVal = q.valor - (q.desconto || 0);
    if (q.tem_opcoes && q.opcoes && q.opcoes.length > 0) {
      const minOptionVal = Math.min(...q.opcoes.map((opt) => opt.valor - (opt.desconto || 0)));
      qVal = minOptionVal;
    }

    let minVal = min.valor - (min.desconto || 0);
    if (min.tem_opcoes && min.opcoes && min.opcoes.length > 0) {
      const minOptionVal = Math.min(...min.opcoes.map((opt) => opt.valor - (opt.desconto || 0)));
      minVal = minOptionVal;
    }

    return qVal < minVal ? q : min;
  });
};

const calcCampanhaPartes = (camp: Campaign) => {
  const cheapestFilm = camp.quotes_film.length ? getCheapest(camp.quotes_film) : null;
  const cheapestAudio = camp.inclui_audio && camp.quotes_audio.length ? getCheapest(camp.quotes_audio) : null;

  // Calcular valor do filme (considerando opções se houver)
  let filmVal = 0;
  if (cheapestFilm) {
    if (cheapestFilm.tem_opcoes && cheapestFilm.opcoes && cheapestFilm.opcoes.length > 0) {
      filmVal = Math.min(...cheapestFilm.opcoes.map((opt) => opt.valor - (opt.desconto || 0)));
    } else {
      filmVal = cheapestFilm.valor - (cheapestFilm.desconto || 0);
    }
  }

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
                  tem_opcoes: false,
                  opcoes: [],
                },
              ],
            }
          : c,
      ),
    }));
  };

  const addOptionToQuote = (campId: string, quoteId: string) => {
    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.map((c) =>
        c.id === campId
          ? {
              ...c,
              quotes_film: c.quotes_film.map((q) =>
                q.id === quoteId
                  ? {
                      ...q,
                      opcoes: [
                        ...(q.opcoes || []),
                        {
                          id: crypto.randomUUID(),
                          nome: `Opção ${(q.opcoes?.length || 0) + 1}`,
                          escopo: "",
                          valor: 0,
                          desconto: 0,
                        },
                      ],
                    }
                  : q,
              ),
            }
          : c,
      ),
    }));
  };

  const updateOptionInQuote = (
    campId: string,
    quoteId: string,
    optionId: string,
    updates: Partial<FilmOption>,
  ) => {
    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.map((c) =>
        c.id === campId
          ? {
              ...c,
              quotes_film: c.quotes_film.map((q) =>
                q.id === quoteId
                  ? {
                      ...q,
                      opcoes: q.opcoes?.map((opt) => (opt.id === optionId ? { ...opt, ...updates } : opt)),
                    }
                  : q,
              ),
            }
          : c,
      ),
    }));
  };

  const removeOptionFromQuote = (campId: string, quoteId: string, optionId: string) => {
    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.map((c) =>
        c.id === campId
          ? {
              ...c,
              quotes_film: c.quotes_film.map((q) =>
                q.id === quoteId ? { ...q, opcoes: q.opcoes?.filter((opt) => opt.id !== optionId) } : q,
              ),
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

  // Cálculo dos totais (por campanha). NUNCA somamos entre campanhas.
  useEffect(() => {
    const camps = data.campanhas || [];
    if (camps.length === 0) return;

    // base por campanha (sempre calculamos)
    const baseCampanhas: TotaisCampanha[] = camps.map((c) => {
      const { filmVal, audioVal, subtotal } = calcCampanhaPartes(c);
      return {
        campId: c.id,
        nome: c.nome,
        filmVal,
        audioVal,
        subtotal,
      };
    });

    // total geral desativado (mantemos 0 apenas para persistência)
    setData((prev) => ({
      ...prev,
      totais_campanhas: baseCampanhas,
      total: 0,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.campanhas]);

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
          total_geral: 0, // sem somatório
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
              • <b>Múltiplas Opções</b>: Ative para adicionar diferentes opções de filmagem por fornecedor (ex: "Opção
              A: 2 dias", "Opção B: 3 dias"). O sistema considera a opção mais barata.
            </p>
            <p>
              • <b>Mais Barata</b>: Em cada campanha, o sistema usa a produtora mais barata (filme e áudio).
            </p>
            <p>
              • <b>Apresentação</b>: Quando houver 2+ campanhas, elas serão exibidas <b>lado a lado</b>, cada uma com
              seu <b>subtotal</b> (filme + áudio). <u>Não há somatório geral</u>.
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
                        <SelectValue placeholder="Selecione" />
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

                            {/* Toggle para múltiplas opções */}
                            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border">
                              <div className="flex items-center gap-2 flex-1">
                                <Switch
                                  checked={q.tem_opcoes || false}
                                  onCheckedChange={(v) => updateQuoteFilmIn(camp.id, q.id, { tem_opcoes: v })}
                                />
                                <div>
                                  <Label className="text-sm font-medium">Múltiplas Opções</Label>
                                  <p className="text-xs text-muted-foreground">
                                    Adicione diferentes opções de filmagem com valores distintos
                                  </p>
                                </div>
                              </div>
                              {q.tem_opcoes && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addOptionToQuote(camp.id, q.id)}
                                  className="gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  Nova Opção
                                </Button>
                              )}
                            </div>

                            {/* Opções múltiplas */}
                            {q.tem_opcoes && q.opcoes && q.opcoes.length > 0 && (
                              <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                                {q.opcoes.map((opt, idx) => (
                                  <motion.div
                                    key={opt.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 rounded-md bg-background border border-border space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <Input
                                        value={opt.nome}
                                        onChange={(e) =>
                                          updateOptionInQuote(camp.id, q.id, opt.id, { nome: e.target.value })
                                        }
                                        placeholder="Nome da opção"
                                        className="font-medium"
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeOptionFromQuote(camp.id, q.id, opt.id)}
                                        className="text-destructive ml-2"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Escopo da Opção</Label>
                                      <textarea
                                        className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                                        value={opt.escopo}
                                        onChange={(e) =>
                                          updateOptionInQuote(camp.id, q.id, opt.id, { escopo: e.target.value })
                                        }
                                        placeholder="Descreva essa opção específica..."
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs">Valor (R$)</Label>
                                        <Input
                                          inputMode="decimal"
                                          value={opt.valor ? String(opt.valor) : ""}
                                          onChange={(e) =>
                                            updateOptionInQuote(camp.id, q.id, opt.id, {
                                              valor: parseCurrency(e.target.value),
                                            })
                                          }
                                          placeholder="0,00"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Desconto (R$)</Label>
                                        <Input
                                          inputMode="decimal"
                                          value={opt.desconto ? String(opt.desconto) : ""}
                                          onChange={(e) =>
                                            updateOptionInQuote(camp.id, q.id, opt.id, {
                                              desconto: parseCurrency(e.target.value),
                                            })
                                          }
                                          placeholder="0,00"
                                        />
                                      </div>
                                    </div>
                                    <div className="text-xs text-right">
                                      <span className="font-semibold">Valor Final: </span>
                                      <span className="font-bold text-primary">
                                        {money(opt.valor - (opt.desconto || 0))}
                                      </span>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            )}

                            {/* Valores principais (quando não tem opções) */}
                            {!q.tem_opcoes && (
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
                            )}
                            <div className="flex justify-between items-center pt-2 border-t">
                              <div className="text-sm">
                                <span className="font-semibold">Valor Final: </span>
                                <span className="text-lg font-bold text-primary">
                                  {q.tem_opcoes && q.opcoes && q.opcoes.length > 0
                                    ? money(Math.min(...q.opcoes.map((opt) => opt.valor - (opt.desconto || 0))))
                                    : money(q.valor - (q.desconto || 0))}
                                </span>
                                {q.tem_opcoes && q.opcoes && q.opcoes.length > 0 && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (menor opção de {q.opcoes.length})
                                  </span>
                                )}
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

            {/* bloco de faturamento / observações */}
            <div className="grid md:grid-cols-2 gap-6">
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

                  {/* Lado a lado (grid) — sem somatório geral */}
                  <div className="border-t pt-4 space-y-3 text-sm">
                    <div className="text-xs font-semibold mb-2 text-primary">💡 Totais por Campanha</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                      {(data.totais_campanhas || []).map((t) => (
                        <div key={t.campId} className="rounded-lg border p-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium">{t.nome}</span>
                            <span className="font-mono">{money(t.subtotal)}</span>
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
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* intentionally no "Total Geral" */}
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
