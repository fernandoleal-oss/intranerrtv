import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea"; // se não tiver, troque por <textarea>
import { BudgetForm } from "@/components/BudgetForm";
import { BudgetProvider } from "@/contexts/BudgetContext";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Home, AlertCircle, RefreshCw, Save, Plus, Trash2 } from "lucide-react";

type BudgetType = "filme" | "audio" | "imagem" | "cc" | string;

interface VersionRow {
  id: string;
  versao: number;
  payload: Record<string, any> | null;
  budgets: {
    id: string;
    display_id: string;
    type: BudgetType;
    status: string;
  } | null;
}

interface BudgetData {
  id: string;
  display_id: string;
  type: BudgetType;
  status: string;
  payload: Record<string, any>;
  version_id: string;
  versao: number;
}

/** util */
function isUUID(v?: string) {
  return !!v?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

/** formata número pt-BR */
const money = (n: number | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

/** parse simples: aceita "1.234,56" e "1234.56" */
const parseCurrency = (val: string | number | undefined): number => {
  if (typeof val === "number") return isFinite(val) ? val : 0;
  if (!val) return 0;
  const clean = String(val)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(clean);
  return isFinite(n) ? n : 0;
};

/** Draft local apenas com o que vamos editar: tem_opcoes/opcoes */
type OptionDraft = {
  id: string;
  nome: string;
  escopo?: string;
  valor?: number;
  desconto?: number;
};
type FornecedorDraft = {
  id?: string; // opcional — muitos payloads não têm id por fornecedor
  nome?: string; // usado só para referência visual
  tem_opcoes: boolean;
  opcoes: OptionDraft[];
};
type CategoriaDraft = {
  id?: string;
  nome?: string;
  modoPreco?: string;
  fornecedores: FornecedorDraft[];
};
type CampanhaDraft = {
  id?: string;
  nome?: string;
  categorias: CategoriaDraft[];
};
type OptionsDraft = CampanhaDraft[];

/** extrai campanhas/categorias/fornecedores do payload para nosso draft */
function extractOptionsDraft(payload: any): OptionsDraft {
  if (!payload) return [];
  const baseCampanhas = Array.isArray(payload.campanhas)
    ? payload.campanhas
    : [{ nome: "Campanha Única", categorias: payload.categorias || [] }];

  return baseCampanhas.map((camp: any) => ({
    id: camp.id,
    nome: camp.nome,
    categorias: (camp.categorias || []).map((cat: any) => ({
      id: cat.id,
      nome: cat.nome,
      modoPreco: cat.modoPreco,
      fornecedores: (cat.fornecedores || []).map((f: any, idx: number) => ({
        id: f.id ?? String(idx),
        nome: f.nome,
        tem_opcoes: Boolean(f.tem_opcoes),
        opcoes: Array.isArray(f.opcoes)
          ? f.opcoes.map((o: any, j: number) => ({
              id: o.id ?? `${idx}-${j}`,
              nome: o.nome ?? `Opção ${j + 1}`,
              escopo: o.escopo ?? "",
              valor: parseCurrency(o.valor),
              desconto: parseCurrency(o.desconto),
            }))
          : [],
      })),
    })),
  }));
}

/** aplica o draft de volta no payload original (merge não destrutivo) */
function applyOptionsDraftOnPayload(payload: any, draft: OptionsDraft): any {
  if (!payload) return payload;
  const hasCampanhas = Array.isArray(payload.campanhas);
  const baseCampanhas = hasCampanhas
    ? payload.campanhas
    : [{ nome: "Campanha Única", categorias: payload.categorias || [] }];

  const merged = baseCampanhas.map((camp: any, campIdx: number) => {
    const draftCamp = draft[campIdx];
    const categorias = (camp.categorias || []).map((cat: any, catIdx: number) => {
      const draftCat = draftCamp?.categorias?.[catIdx];

      if (cat.modoPreco !== "fechado") {
        return cat; // só alteramos fornecedores em modo fechado
      }

      const fornecedores = (cat.fornecedores || []).map((f: any, fIdx: number) => {
        const draftF = draftCat?.fornecedores?.[fIdx];
        if (!draftF) return f;

        // aplica tem_opcoes/opcoes preservando o resto do fornecedor
        const nextF = { ...f, tem_opcoes: draftF.tem_opcoes };

        if (draftF.tem_opcoes) {
          nextF.opcoes = (draftF.opcoes || []).map((o: OptionDraft) => ({
            id: o.id,
            nome: o.nome,
            escopo: o.escopo ?? "",
            valor: parseCurrency(o.valor ?? 0),
            desconto: parseCurrency(o.desconto ?? 0),
          }));
        } else {
          // desliga completamente
          delete nextF.opcoes;
        }

        return nextF;
      });

      return { ...cat, fornecedores };
    });

    return { ...camp, categorias };
  });

  // devolve no mesmo formato (com campanhas ou com categorias na raiz)
  if (hasCampanhas) {
    return { ...payload, campanhas: merged };
  }
  return { ...payload, categorias: merged[0]?.categorias || [] };
}

export default function BudgetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [data, setData] = useState<BudgetData | null>(null);
  const [optionsDraft, setOptionsDraft] = useState<OptionsDraft>([]);
  const [savingOptions, setSavingOptions] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const title = useMemo(
    () => (data ? `Editar Orçamento — ${data.display_id} • ${String(data.type).toUpperCase()}` : "Editar Orçamento"),
    [data],
  );

  // só informativo; mantemos antes de qualquer return
  const totalQuotesFilme = useMemo(
    () => (data?.payload?.campanhas || []).reduce((acc: number, c: any) => acc + (c?.quotes_film?.length || 0), 0),
    [data],
  );

  useEffect(() => {
    document.title = title;
  }, [title]);

  const mapRowToData = (row: VersionRow): BudgetData | null => {
    if (!row?.budgets) return null;
    return {
      id: row.budgets.id,
      display_id: row.budgets.display_id,
      type: row.budgets.type,
      status: row.budgets.status,
      payload: row.payload || {},
      version_id: row.id,
      versao: row.versao ?? 1,
    };
  };

  const fetchBudget = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!isUUID(id)) {
        toast({
          title: "ID inválido",
          description: "O identificador do orçamento é inválido.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (!silent) setLoading(true);
      else setRefetching(true);

      abortRef.current?.abort();
      abortRef.current = new AbortController();

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
        if (!row) throw new Error("not_found");

        const mapped = mapRowToData(row);
        if (!mapped) throw new Error("not_found");

        setData(mapped);
        // inicializa draft das opções com base no payload carregado
        setOptionsDraft(extractOptionsDraft(mapped.payload));

        if (silent) {
          toast({ title: "Atualizado", description: "Dados recarregados." });
        }
      } catch (err: any) {
        const code = err?.code || err?.message;
        const notFound = code === "not_found" || err?.details?.includes("No rows");
        toast({
          title: notFound ? "Orçamento não encontrado" : "Erro ao carregar",
          description: notFound
            ? "Verifique o link ou se o orçamento foi removido."
            : (err?.message ?? "Tente novamente em instantes."),
          variant: "destructive",
        });
        if (!silent) navigate("/");
      } finally {
        if (!silent) setLoading(false);
        setRefetching(false);
      }
    },
    [id, navigate, toast],
  );

  useEffect(() => {
    if (id) fetchBudget(false);
    return () => abortRef.current?.abort();
  }, [id, fetchBudget]);

  /** Salva APENAS as mudanças de opções (tem_opcoes/opcoes) criando uma nova versão */
  const saveSupplierOptions = async () => {
    if (!data) return;
    setSavingOptions(true);
    try {
      // revalida versão atual
      const { data: row, error } = await supabase
        .from("versions")
        .select("versao, payload")
        .eq("budget_id", data.id)
        .order("versao", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const currentPayload = row?.payload ?? data.payload;
      const nextPayload = applyOptionsDraftOnPayload(currentPayload, optionsDraft);
      const nextVersao = (row?.versao ?? data.versao ?? 1) + 1;

      const { error: insertErr } = await supabase.from("versions").insert([
        {
          budget_id: data.id,
          versao: nextVersao,
          payload: nextPayload as any,
          total_geral: 0, // se existir a coluna
        },
      ]);

      if (insertErr) throw insertErr;

      toast({ title: "Opções salvas!", description: `Nova versão #${nextVersao} criada.` });
      // recarrega dados para manter tela coerente
      await fetchBudget(true);
    } catch (err: any) {
      toast({
        title: "Erro ao salvar opções",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingOptions(false);
    }
  };

  const handleSaveClick = () => {
    // segue usando o BudgetForm para salvar “o resto”
    if (data?.id) {
      window.dispatchEvent(
        new CustomEvent("budget:save", {
          detail: { budgetId: data.id, versionId: data.version_id },
        }),
      );
      toast({
        title: "Solicitado",
        description: "Salvando alterações do formulário…",
      });
    }
  };

  // ------------- UI helpers para o draft ----------------
  const toggleFornecedorOpcoes = (campIdx: number, catIdx: number, fornIdx: number, value: boolean) => {
    setOptionsDraft((prev) => {
      const clone = structuredClone(prev);
      const f = clone?.[campIdx]?.categorias?.[catIdx]?.fornecedores?.[fornIdx];
      if (!f) return prev;
      f.tem_opcoes = value;
      if (value && (!Array.isArray(f.opcoes) || f.opcoes.length === 0)) {
        f.opcoes = [
          {
            id: crypto.randomUUID(),
            nome: "Opção 1",
            escopo: "",
            valor: 0,
            desconto: 0,
          },
        ];
      }
      if (!value) {
        f.opcoes = [];
      }
      return clone;
    });
  };

  const addOpcao = (campIdx: number, catIdx: number, fornIdx: number) => {
    setOptionsDraft((prev) => {
      const clone = structuredClone(prev);
      const f = clone?.[campIdx]?.categorias?.[catIdx]?.fornecedores?.[fornIdx];
      if (!f) return prev;
      const nextIndex = (f.opcoes?.length || 0) + 1;
      f.opcoes = [
        ...(f.opcoes || []),
        {
          id: crypto.randomUUID(),
          nome: `Opção ${nextIndex}`,
          escopo: "",
          valor: 0,
          desconto: 0,
        },
      ];
      f.tem_opcoes = true;
      return clone;
    });
  };

  const removeOpcao = (campIdx: number, catIdx: number, fornIdx: number, opcId: string) => {
    setOptionsDraft((prev) => {
      const clone = structuredClone(prev);
      const f = clone?.[campIdx]?.categorias?.[catIdx]?.fornecedores?.[fornIdx];
      if (!f) return prev;
      f.opcoes = (f.opcoes || []).filter((o: OptionDraft) => o.id !== opcId);
      return clone;
    });
  };

  const updateOpcao = (
    campIdx: number,
    catIdx: number,
    fornIdx: number,
    opcId: string,
    updates: Partial<OptionDraft>,
  ) => {
    setOptionsDraft((prev) => {
      const clone = structuredClone(prev);
      const f = clone?.[campIdx]?.categorias?.[catIdx]?.fornecedores?.[fornIdx];
      if (!f) return prev;
      f.opcoes = (f.opcoes || []).map((o: OptionDraft) =>
        o.id === opcId
          ? {
              ...o,
              ...updates,
              valor: parseCurrency(updates.valor ?? o.valor ?? 0),
              desconto: parseCurrency(updates.desconto ?? o.desconto ?? 0),
            }
          : o,
      );
      return clone;
    });
  };

  // ---------------- Renders condicionais ----------------

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-8">
          <LoadingState message="Carregando orçamento..." />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-8">
          <EmptyState
            icon={AlertCircle}
            title="Orçamento não encontrado"
            description="O orçamento que você está procurando não existe ou foi removido."
            action={{
              label: "Voltar para Início",
              onClick: () => navigate("/"),
            }}
            secondaryAction={{
              label: "Tentar novamente",
              onClick: () => fetchBudget(false),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <BudgetProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="nav-button gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Editar Orçamento</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <p className="text-white/70">{data.display_id}</p>
                  <StatusBadge status={data.status} />
                  <span className="text-white/50 text-sm capitalize">• {String(data.type)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => fetchBudget(true)}
                variant="outline"
                className="nav-button gap-2"
                disabled={refetching}
              >
                <RefreshCw className={`h-4 w-4 ${refetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>

              <Button
                onClick={handleSaveClick}
                variant="secondary"
                className="nav-button gap-2"
                title="Salvar alterações do formulário (atalho: Ctrl/Cmd+S)"
              >
                <Save className="h-4 w-4" />
                Salvar (Form)
              </Button>

              <Button onClick={() => navigate(`/budget/${data.id}/pdf`)} className="btn-gradient gap-2">
                <FileText className="h-4 w-4" />
                Ver PDF
              </Button>

              <Button onClick={() => navigate("/")} variant="outline" className="nav-button gap-2">
                <Home className="h-4 w-4" />
                Início
              </Button>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Coluna principal com BudgetForm */}
            <motion.div
              key={data.version_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="lg:col-span-2"
            >
              <BudgetForm budgetId={data.id} versionId={data.version_id} initialPayload={data.payload} />
              {/* info extra opcional */}
              <div className="mt-4 text-white/70 text-sm">
                Cotações (Filme) no payload: <b>{totalQuotesFilme}</b>
              </div>
            </motion.div>

            {/* Painel lateral: Opções de Fornecedores */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <Card className="border-2 border-emerald-200/60">
                  <CardHeader>
                    <CardTitle className="text-emerald-700">Opções de Fornecedores (modo fechado)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {optionsDraft.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        Nenhuma campanha/categoria modo fechado encontrada no payload.
                      </div>
                    )}

                    {optionsDraft.map((camp, campIdx) => (
                      <div key={campIdx} className="space-y-3">
                        <div className="text-sm font-semibold text-emerald-800">
                          {camp.nome || `Campanha ${campIdx + 1}`}
                        </div>

                        {camp.categorias.map((cat, catIdx) => {
                          if (cat.modoPreco !== "fechado") return null;
                          return (
                            <div key={catIdx} className="rounded-md border p-3 bg-emerald-50/40 space-y-3">
                              <div className="text-sm font-medium">
                                Categoria:{" "}
                                <span className="font-semibold">{cat.nome || `Categoria ${catIdx + 1}`}</span>
                              </div>

                              {cat.fornecedores.length === 0 && (
                                <div className="text-xs text-muted-foreground">Sem fornecedores.</div>
                              )}

                              {cat.fornecedores.map((f, fornIdx) => (
                                <div key={fornIdx} className="rounded-md border bg-white p-3 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold">{f.nome || `Fornecedor ${fornIdx + 1}`}</div>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={!!f.tem_opcoes}
                                        onCheckedChange={(v) => toggleFornecedorOpcoes(campIdx, catIdx, fornIdx, v)}
                                      />
                                      <span className="text-xs text-muted-foreground">Múltiplas opções</span>
                                    </div>
                                  </div>

                                  {!!f.tem_opcoes && (
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <div className="text-xs font-medium text-muted-foreground">
                                          Opções ({f.opcoes.length})
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1"
                                          onClick={() => addOpcao(campIdx, catIdx, fornIdx)}
                                        >
                                          <Plus className="h-3 w-3" />
                                          Adicionar opção
                                        </Button>
                                      </div>

                                      {f.opcoes.length === 0 && (
                                        <div className="text-xs text-muted-foreground">Nenhuma opção adicionada.</div>
                                      )}

                                      <div className="space-y-3">
                                        {f.opcoes.map((o) => (
                                          <div key={o.id} className="rounded border p-3">
                                            <div className="flex items-center gap-2">
                                              <Input
                                                value={o.nome}
                                                onChange={(e) =>
                                                  updateOpcao(campIdx, catIdx, fornIdx, o.id, {
                                                    nome: e.target.value,
                                                  })
                                                }
                                                placeholder="Nome da opção"
                                              />
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => removeOpcao(campIdx, catIdx, fornIdx, o.id)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>

                                            <div className="mt-2">
                                              <Label className="text-xs">Escopo</Label>
                                              {/* se não tiver Textarea, troque por <textarea className="w-full" .../> */}
                                              <Textarea
                                                value={o.escopo || ""}
                                                onChange={(e) =>
                                                  updateOpcao(campIdx, catIdx, fornIdx, o.id, {
                                                    escopo: e.target.value,
                                                  })
                                                }
                                                placeholder="Descreva o escopo dessa opção"
                                                className="min-h-[70px] text-sm"
                                              />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                              <div>
                                                <Label className="text-xs">Valor (R$)</Label>
                                                <Input
                                                  inputMode="decimal"
                                                  value={o.valor ?? ""}
                                                  onChange={(e) =>
                                                    updateOpcao(campIdx, catIdx, fornIdx, o.id, {
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
                                                  value={o.desconto ?? ""}
                                                  onChange={(e) =>
                                                    updateOpcao(campIdx, catIdx, fornIdx, o.id, {
                                                      desconto: parseCurrency(e.target.value),
                                                    })
                                                  }
                                                  placeholder="0,00"
                                                />
                                              </div>
                                            </div>

                                            <div className="text-right mt-2 text-xs">
                                              <span className="font-semibold">Valor final: </span>
                                              <span className="font-bold">
                                                {money((o.valor || 0) - (o.desconto || 0))}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    <Button onClick={saveSupplierOptions} disabled={savingOptions} className="w-full">
                      {savingOptions ? "Salvando opções..." : "Salvar Opções (cria nova versão)"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BudgetProvider>
  );
}
