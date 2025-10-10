import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { HeaderBar } from "@/components/HeaderBar";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

type BudgetType = "filme" | "audio" | "imagem" | "cc";

interface FilmOption {
  id: string;
  nome: string;
  escopo: string;
  valor: number;
  desconto: number;
  selecionada?: boolean; // opcional para marcar seleção
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
  selecionado?: boolean; // opcional para marcar seleção
}

interface QuoteAudio {
  id: string;
  produtora: string;
  descricao: string;
  valor: number;
  desconto: number;
  selecionado?: boolean;
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
  subtotal: number; // filme + áudio
}

interface BudgetRow {
  id: string;
  display_id: string;
  type: BudgetType;
  status: string;
}

interface VersionRow {
  id: string;
  payload: any | null;
  versao: number;
  budgets: BudgetRow | null;
}

interface BudgetData {
  id: string;
  display_id: string;
  type: BudgetType;
  status: string;
  version_id: string;
  versao: number;
  payload: any;
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

const defaultCampaign = (): Campaign => ({
  id: crypto.randomUUID(),
  nome: "Campanha 1",
  inclui_audio: false,
  quotes_film: [],
  quotes_audio: [],
});

const defaultPayload = () => ({
  type: "filme" as BudgetType,
  produtor: "",
  email: "",
  cliente: "",
  produto: "",
  job: "",
  midias: "",
  territorio: "",
  periodo: "",
  entregaveis: "",
  adaptacoes: "",
  exclusividade_elenco: "nao_aplica" as "orcado" | "nao_orcado" | "nao_aplica",
  // novo modelo:
  campanhas: [defaultCampaign()],
  totais_campanhas: [] as TotaisCampanha[],
  // compat:
  quotes_film: [] as QuoteFilm[],
  quotes_audio: [] as QuoteAudio[],
  inclui_audio: false,
  total: 0,
  pendente_faturamento: false,
  observacoes: "",
});

const getCheapest = <T extends { valor: number; desconto?: number; tem_opcoes?: boolean; opcoes?: FilmOption[] }>(
  arr: T[],
) =>
  arr.reduce((min, q) => {
    let qVal = q.valor - (q.desconto || 0);
    if (q.tem_opcoes && q.opcoes && q.opcoes.length > 0) {
      const minOptionVal = Math.min(...q.opcoes.map((opt) => opt.valor - (opt.desconto || 0)));
      qVal = minOptionVal;
    }
    let minVal = min.valor - (min.desconto || 0);
    if (min.tem_opcoes && (min as any).opcoes && (min as any).opcoes.length > 0) {
      const minOptionVal = Math.min(...(min as any).opcoes.map((opt: FilmOption) => opt.valor - (opt.desconto || 0)));
      minVal = minOptionVal;
    }
    return qVal < minVal ? q : min;
  });

const calcCampanhaPartes = (camp: Campaign) => {
  const cheapestFilm = camp.quotes_film.length ? getCheapest(camp.quotes_film) : null;
  const cheapestAudio = camp.inclui_audio && camp.quotes_audio.length ? getCheapest(camp.quotes_audio) : null;

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

// Normaliza payload vindo do banco para o formato esperado pelo editor
const normalizePayload = (raw: any) => {
  const base = defaultPayload();

  if (!raw || typeof raw !== "object") return base;

  const merged = { ...base, ...raw };

  // migração: se não houver campanhas, cria com dados legados
  if (!Array.isArray(merged.campanhas) || merged.campanhas.length === 0) {
    merged.campanhas = [
      {
        ...defaultCampaign(),
        nome: "Campanha 1",
        inclui_audio: merged.inclui_audio || false,
        quotes_film: Array.isArray(merged.quotes_film) ? merged.quotes_film : [],
        quotes_audio: Array.isArray(merged.quotes_audio) ? merged.quotes_audio : [],
      },
    ];
  }

  // garante estruturas internas
  merged.campanhas = merged.campanhas.map((c: any) => ({
    id: c.id || crypto.randomUUID(),
    nome: c.nome || "Campanha",
    inclui_audio: !!c.inclui_audio,
    quotes_film: (Array.isArray(c.quotes_film) ? c.quotes_film : []).map((q: any) => ({
      id: q.id || crypto.randomUUID(),
      produtora: q.produtora || q.nome || "",
      escopo: q.escopo || "",
      valor: Number.isFinite(q.valor) ? q.valor : 0,
      diretor: q.diretor || "",
      tratamento: q.tratamento || "",
      desconto: Number.isFinite(q.desconto) ? q.desconto : 0,
      selecionado: !!q.selecionado,
      tem_opcoes: !!q.tem_opcoes,
      opcoes: (Array.isArray(q.opcoes) ? q.opcoes : []).map((op: any) => ({
        id: op.id || crypto.randomUUID(),
        nome: op.nome || "",
        escopo: op.escopo || "",
        valor: Number.isFinite(op.valor) ? op.valor : 0,
        desconto: Number.isFinite(op.desconto) ? op.desconto : 0,
        selecionada: !!op.selecionada,
      })),
    })),
    quotes_audio: (Array.isArray(c.quotes_audio) ? c.quotes_audio : []).map((qa: any) => ({
      id: qa.id || crypto.randomUUID(),
      produtora: qa.produtora || qa.nome || "",
      descricao: qa.descricao || qa.escopo || "",
      valor: Number.isFinite(qa.valor) ? qa.valor : 0,
      desconto: Number.isFinite(qa.desconto) ? qa.desconto : 0,
      selecionado: !!qa.selecionado,
    })),
  }));

  return merged;
};

export default function BudgetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<{ display_id: string; status: string; type: BudgetType } | null>(null);
  const [versao, setVersao] = useState<number>(1);
  const [payload, setPayload] = useState<any>(defaultPayload());

  const title = useMemo(() => {
    if (!meta) return "Editar Orçamento";
    return `Editar Orçamento — ${meta.display_id} • ${String(meta.type).toUpperCase()}`;
  }, [meta]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  // Carrega última versão do orçamento
  const fetchBudget = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data: row, error } = await supabase
        .from("versions")
        .select(
          `
          id,
          payload,
          versao,
          budgets!inner(
            id,
            display_id,
            type,
            status
          )
        `,
        )
        .eq("budget_id", id)
        .order("versao", { ascending: false })
        .limit(1)
        .maybeSingle<VersionRow>();

      if (error) throw error;
      if (!row || !row.budgets) {
        throw new Error("Orçamento não encontrado");
      }

      setMeta({
        display_id: row.budgets.display_id,
        status: row.budgets.status as string,
        type: row.budgets.type as BudgetType,
      });
      setVersao(row.versao || 1);

      const norm = normalizePayload(row.payload || {});
      setPayload(norm);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
      navigate("/orcamentos");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  // Atualizadores simples
  const updatePayload = useCallback((updates: Partial<any>) => {
    setPayload((prev: any) => ({ ...prev, ...updates }));
  }, []);

  const addCampaign = () => {
    setPayload((prev: any) => ({
      ...prev,
      campanhas: [
        ...(prev.campanhas || []),
        { ...defaultCampaign(), nome: `Campanha ${(prev.campanhas?.length || 0) + 1}` },
      ],
    }));
  };
  const updateCampaign = (campId: string, updates: Partial<Campaign>) => {
    setPayload((prev: any) => ({
      ...prev,
      campanhas: prev.campanhas.map((c: Campaign) => (c.id === campId ? { ...c, ...updates } : c)),
    }));
  };

  const addQuoteFilmTo = (campId: string) => {
    setPayload((prev: any) => ({
      ...prev,
      campanhas: prev.campanhas.map((c: Campaign) =>
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
                } as QuoteFilm,
              ],
            }
          : c,
      ),
    }));
  };
  const updateQuoteFilmIn = (campId: string, quoteId: string, updates: Partial<QuoteFilm>) => {
    setPayload((prev: any) => ({
      ...prev,
      campanhas: prev.campanhas.map((c: Campaign) =>
        c.id === campId
          ? { ...c, quotes_film: c.quotes_film.map((q) => (q.id === quoteId ? { ...q, ...updates } : q)) }
          : c,
      ),
    }));
  };
  const removeQuoteFilmFrom = (campId: string, quoteId: string) => {
    setPayload((prev: any) => ({
      ...prev,
      campanhas: prev.campanhas.map((c: Campaign) =>
        c.id === campId ? { ...c, quotes_film: c.quotes_film.filter((q) => q.id !== quoteId) } : c,
      ),
    }));
  };
  const addOptionToQuote = (campId: string, quoteId: string) => {
    setPayload((prev: any) => ({
      ...prev,
      campanhas: prev.campanhas.map((c: Campaign) =>
        c.id === campId
          ? {
              ...c,
              quotes_film: c.quotes_film.map((q) =>
                q.id === quoteId
                  ? {
                      ...q,
                      tem_opcoes: true,
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
  const updateOptionInQuote = (campId: string, quoteId: string, optionId: string, updates: Partial<FilmOption>) => {
    setPayload((prev: any) => ({
      ...prev,
      campanhas: prev.campanhas.map((c: Campaign) =>
        c.id === campId
          ? {
              ...c,
              quotes_film: c.quotes_film.map((q) =>
                q.id === quoteId
                  ? { ...q, opcoes: q.opcoes?.map((op) => (op.id === optionId ? { ...op, ...updates } : op)) }
                  : q,
              ),
            }
          : c,
      ),
    }));
  };
  const removeOptionFromQuote = (campId: string, quoteId: string, optionId: string) => {
    setPayload((prev: any) => ({
      ...prev,
      campanhas: prev.campanhas.map((c: Campaign) =>
        c.id === campId
          ? {
              ...c,
              quotes_film: c.quotes_film.map((q) =>
                q.id === quoteId ? { ...q, opcoes: q.opcoes?.filter((op) => op.id !== optionId) } : q,
              ),
            }
          : c,
      ),
    }));
  };

  const addQuoteAudioTo = (campId: string) => {
    setPayload((prev: any) => ({
      ...prev,
      campanhas: prev.campanhas.map((c: Campaign) =>
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
    setPayload((prev: any) => ({
      ...prev,
      campanhas: prev.campanhas.map((c: Campaign) =>
        c.id === campId
          ? { ...c, quotes_audio: c.quotes_audio.map((q) => (q.id === quoteId ? { ...q, ...updates } : q)) }
          : c,
      ),
    }));
  };
  const removeQuoteAudioFrom = (campId: string, quoteId: string) => {
    setPayload((prev: any) => ({
      ...prev,
      campanhas: prev.campanhas.map((c: Campaign) =>
        c.id === campId ? { ...c, quotes_audio: c.quotes_audio.filter((q) => q.id !== quoteId) } : c,
      ),
    }));
  };

  // Totais por campanha (sem somatório geral)
  const totaisCamp = useMemo(() => {
    const camps: Campaign[] = payload.campanhas || [];
    return camps.map((c) => {
      const { filmVal, audioVal, subtotal } = calcCampanhaPartes(c);
      return { campId: c.id, nome: c.nome, filmVal, audioVal, subtotal } as TotaisCampanha;
    });
  }, [payload.campanhas]);

  const handleSave = async () => {
    if (!payload.cliente || !payload.produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // pega última versão para incrementar
      const { data: last, error: lastErr } = await supabase
        .from("versions")
        .select("versao")
        .eq("budget_id", id)
        .order("versao", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastErr) throw lastErr;
      const nextVersao = (last?.versao || versao || 0) + 1;

      const { error: vErr } = await supabase.from("versions").insert([
        {
          budget_id: id,
          versao: nextVersao,
          payload: { ...payload, totais_campanhas: totaisCamp, total: 0 },
          total_geral: 0,
        },
      ]);

      if (vErr) throw vErr;

      toast({ title: "Salvo com sucesso!", description: `Versão ${nextVersao} criada.` });
      navigate(`/budget/${id}/pdf`);
    } catch (err: any) {
      console.error("[edit/save] err:", err);
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <LoadingState message="Carregando orçamento..." />
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <EmptyState
            icon={AlertCircle}
            title="Orçamento não encontrado"
            description="O orçamento pode ter sido removido."
            action={{ label: "Voltar", onClick: () => navigate("/orcamentos") }}
          />
        </div>
      </div>
    );
  }

  const totalQuotesFilme = (payload.campanhas || []).reduce(
    (acc: number, c: Campaign) => acc + c.quotes_film.length,
    0,
  );

  return (
    <div className="min-h-screen bg-background">
      <HeaderBar
        title="Editar Orçamento"
        subtitle={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{meta.display_id}</span>
            <StatusBadge status={meta.status} />
            <span className="text-sm opacity-70">• {String(meta.type)}</span>
          </div>
        }
        backTo="/orcamentos"
        actions={
          <div className="flex gap-2">
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
            <Button variant="outline" onClick={() => navigate(`/budget/${id}/pdf`)} className="gap-2">
              <FileText className="h-4 w-4" /> Ver PDF
            </Button>
          </div>
        }
      />

      <div className="container-page">
        {/* Instruções */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
              <AlertCircle className="h-5 w-5" />
              Instruções
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-900/70 space-y-1">
            <p>Campos e layout idênticos ao “Novo Orçamento”, mas já preenchidos com os dados salvos.</p>
            <p>
              Ao salvar, criamos uma <b>nova versão</b> e abrimos o PDF.
            </p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Formulário (igual do Novo) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={payload.type} onValueChange={(v) => updatePayload({ type: v as BudgetType })}>
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
                    <Input value={payload.produtor} onChange={(e) => updatePayload({ produtor: e.target.value })} />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={payload.email}
                      onChange={(e) => updatePayload({ email: e.target.value })}
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
                      value={payload.cliente}
                      onChange={(e) => updatePayload({ cliente: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Produto *</Label>
                    <Input
                      value={payload.produto}
                      onChange={(e) => updatePayload({ produto: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Job</Label>
                    <Input value={payload.job} onChange={(e) => updatePayload({ job: e.target.value })} />
                  </div>
                  <div>
                    <Label>Mídias</Label>
                    <Input value={payload.midias} onChange={(e) => updatePayload({ midias: e.target.value })} />
                  </div>
                  <div>
                    <Label>Território</Label>
                    <Input value={payload.territorio} onChange={(e) => updatePayload({ territorio: e.target.value })} />
                  </div>
                  <div>
                    <Label>Período</Label>
                    <Input value={payload.periodo} onChange={(e) => updatePayload({ periodo: e.target.value })} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label>Entregáveis</Label>
                    <Input
                      value={payload.entregaveis}
                      onChange={(e) => updatePayload({ entregaveis: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Adaptações</Label>
                    <Input value={payload.adaptacoes} onChange={(e) => updatePayload({ adaptacoes: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exclusividade">Exclusividade de Elenco</Label>
                    <Select
                      value={payload.exclusividade_elenco}
                      onValueChange={(v: any) => updatePayload({ exclusividade_elenco: v })}
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
                <Plus className="h-4 w-4" /> Adicionar Campanha
              </Button>
            </div>

            {(payload.campanhas || []).map((camp: Campaign) => {
              // marcador opcional de mais barata no preview local do card
              const cheapestFilm = camp.quotes_film.length ? getCheapest(camp.quotes_film) : null;
              const cheapestAudio =
                camp.inclui_audio && camp.quotes_audio.length ? getCheapest(camp.quotes_audio) : null;

              return (
                <Card key={camp.id} className="border-2 border-border/50">
                  <CardHeader className="flex flex-col gap-2">
                    <div className="grid md:grid-cols-3 gap-3 items-end">
                      <div className="md:col-span-2">
                        <Label>Nome da Campanha</Label>
                        <Input value={camp.nome} onChange={(e) => updateCampaign(camp.id, { nome: e.target.value })} />
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
                        <Plus className="h-4 w-4" /> Adicionar Cotação (Filme)
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {camp.quotes_film.length === 0 && (
                        <div className="text-sm text-muted-foreground">Nenhuma cotação de filme.</div>
                      )}

                      {camp.quotes_film.map((q) => {
                        const isCheapest = cheapestFilm?.id === q.id;
                        return (
                          <div
                            key={q.id}
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
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Escopo Detalhado</Label>
                              <textarea
                                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                                value={q.escopo}
                                onChange={(e) => updateQuoteFilmIn(camp.id, q.id, { escopo: e.target.value })}
                              />
                            </div>

                            {/* Toggle múltiplas opções */}
                            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border">
                              <div className="flex items-center gap-2 flex-1">
                                <Switch
                                  checked={q.tem_opcoes || false}
                                  onCheckedChange={(v) =>
                                    updateQuoteFilmIn(camp.id, q.id, {
                                      tem_opcoes: v,
                                      opcoes: v ? q.opcoes || [] : [],
                                    })
                                  }
                                />
                                <div>
                                  <Label className="text-sm font-medium">Múltiplas Opções</Label>
                                  <p className="text-xs text-muted-foreground">
                                    Adicione diferentes opções com valores distintos
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
                                  <Plus className="h-3 w-3" /> Nova Opção
                                </Button>
                              )}
                            </div>

                            {/* Opções */}
                            {q.tem_opcoes && q.opcoes && q.opcoes.length > 0 && (
                              <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                                {q.opcoes.map((opt) => (
                                  <div
                                    key={opt.id}
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
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs">Valor (R$)</Label>
                                        <Input
                                          inputMode="decimal"
                                          value={String(opt.valor ?? "")}
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
                                          value={String(opt.desconto ?? "")}
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
                                        {money((opt.valor || 0) - (opt.desconto || 0))}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Valores simples (sem opções) */}
                            {!q.tem_opcoes && (
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <Label>Valor (R$)</Label>
                                  <Input
                                    inputMode="decimal"
                                    value={String(q.valor ?? "")}
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
                                    value={String(q.desconto ?? "")}
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
                                    ? money(Math.min(...q.opcoes.map((o) => (o.valor || 0) - (o.desconto || 0))))
                                    : money((q.valor || 0) - (q.desconto || 0))}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeQuoteFilmFrom(camp.id, q.id)}
                                className="text-destructive gap-1"
                              >
                                <Trash2 className="h-3 w-3" /> Remover
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Áudio */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Produtora de Áudio</h4>
                          <p className="text-sm text-muted-foreground">
                            {camp.inclui_audio ? "Adicione cotações de áudio" : "Ative o áudio para incluir cotações"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => addQuoteAudioTo(camp.id)}
                          className="gap-2"
                          disabled={!camp.inclui_audio}
                        >
                          <Plus className="h-4 w-4" /> Adicionar Áudio
                        </Button>
                      </div>

                      {camp.inclui_audio && (
                        <div className="space-y-4 mt-4">
                          {camp.quotes_audio.length === 0 && (
                            <div className="text-sm text-muted-foreground">Nenhuma cotação de áudio.</div>
                          )}
                          {camp.quotes_audio.map((qa) => (
                            <div key={qa.id} className="border rounded-lg p-4 space-y-3 border-border bg-blue-50/30">
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <Label>Produtora</Label>
                                  <Input
                                    value={qa.produtora}
                                    onChange={(e) => updateQuoteAudioIn(camp.id, qa.id, { produtora: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Descrição/Escopo</Label>
                                  <textarea
                                    className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                                    value={qa.descricao}
                                    onChange={(e) => updateQuoteAudioIn(camp.id, qa.id, { descricao: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <Label>Valor (R$)</Label>
                                  <Input
                                    inputMode="decimal"
                                    value={String(qa.valor ?? "")}
                                    onChange={(e) =>
                                      updateQuoteAudioIn(camp.id, qa.id, { valor: parseCurrency(e.target.value) })
                                    }
                                    placeholder="0,00"
                                  />
                                </div>
                                <div>
                                  <Label>Desconto (R$)</Label>
                                  <Input
                                    inputMode="decimal"
                                    value={String(qa.desconto ?? "")}
                                    onChange={(e) =>
                                      updateQuoteAudioIn(camp.id, qa.id, { desconto: parseCurrency(e.target.value) })
                                    }
                                    placeholder="0,00"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t">
                                <div className="text-sm">
                                  <span className="font-semibold">Valor Final: </span>
                                  <span className="text-lg font-bold text-blue-600">
                                    {money((qa.valor || 0) - (qa.desconto || 0))}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeQuoteAudioFrom(camp.id, qa.id)}
                                  className="text-destructive gap-1"
                                >
                                  <Trash2 className="h-3 w-3" /> Remover
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Faturamento / Obs */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Faturamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="pendente"
                      checked={!!payload.pendente_faturamento}
                      onCheckedChange={(checked) => updatePayload({ pendente_faturamento: Boolean(checked) })}
                    />
                    <div>
                      <Label htmlFor="pendente" className="cursor-pointer">
                        Pendente de faturamento
                      </Label>
                      <p className="text-xs text-muted-foreground">Marcador será exibido no PDF</p>
                    </div>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input
                      value={payload.observacoes}
                      onChange={(e) => updatePayload({ observacoes: e.target.value })}
                      placeholder="Ex.: incluir em outubro"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Preview (igual) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {payload.pendente_faturamento && (
                    <div className="rounded-md border border-yellow-600 bg-yellow-50 text-yellow-800 text-xs px-3 py-2">
                      <strong>PENDENTE DE FATURAMENTO</strong>
                    </div>
                  )}

                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{payload.cliente || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Produto:</span>
                      <span className="font-medium">{payload.produto || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cotações (Filme):</span>
                      <span className="font-medium">{totalQuotesFilme}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campanhas:</span>
                      <span className="font-medium">{payload.campanhas?.length || 0}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3 text-sm">
                    <div className="text-xs font-semibold mb-2 text-primary">💡 Totais por Campanha</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                      {(totaisCamp || []).map((t) => (
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
                    {/* sem total geral */}
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
