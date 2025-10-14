// components/OrcamentoNovoGlass.tsx
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Save, FileText, Plus, Trash2, AlertCircle, Sparkles, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { HeaderBar } from "@/components/HeaderBar";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";
import { useBudgetData } from "@/hooks/useBudgetData";
import { BudgetData, Campaign, QuoteFilm, QuoteAudio, FilmOption } from "@/types/budget";

// Utils (mantidos do código original)
const parseCurrency = (val: string): number => {
  if (val == null || val === "") return 0;
  const clean = String(val)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

const toNum = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") return parseCurrency(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (n: number | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const lowestQuoteValue = (q: QuoteFilm): number => {
  const base = toNum(q.valor) - toNum(q.desconto);
  if (q.tem_opcoes && Array.isArray(q.opcoes)) {
    const candidateVals = q.opcoes
      .map((opt) => toNum(opt.valor) - toNum(opt.desconto))
      .filter((v) => Number.isFinite(v));
    if (candidateVals.length > 0) {
      return Math.min(base, Math.min(...candidateVals));
    }
  }
  return base;
};

const finalAudioValue = (a: QuoteAudio): number => {
  return toNum(a.valor) - toNum(a.desconto);
};

const getCheapest = <
  T extends { valor: number | string; desconto?: number | string; tem_opcoes?: boolean; opcoes?: FilmOption[] },
>(
  arr: T[],
) => {
  if (!arr || arr.length === 0) return null as any;
  return arr.reduce((min, q) => {
    const qVal = "opcoes" in q ? lowestQuoteValue(q as unknown as QuoteFilm) : toNum(q.valor) - toNum(q.desconto);
    const minVal =
      "opcoes" in min ? lowestQuoteValue(min as unknown as QuoteFilm) : toNum(min.valor) - toNum(min.desconto);
    return qVal < minVal ? q : min;
  });
};

const calcCampanhaPartes = (camp: Campaign) => {
  const cheapestFilm = camp.quotes_film.length ? (getCheapest(camp.quotes_film) as QuoteFilm | null) : null;
  const cheapestAudio =
    camp.inclui_audio && camp.quotes_audio.length ? (getCheapest(camp.quotes_audio) as QuoteAudio | null) : null;

  const filmVal = cheapestFilm ? lowestQuoteValue(cheapestFilm) : 0;
  const audioVal = cheapestAudio ? finalAudioValue(cheapestAudio) : 0;
  const subtotal = filmVal + audioVal;

  return { filmVal, audioVal, subtotal };
};

// Componente para Quote de Filme
const QuoteFilmCard = ({
  quote,
  isCheapest,
  campId,
  onUpdate,
  onRemove,
}: {
  quote: QuoteFilm;
  isCheapest: boolean;
  campId: string;
  onUpdate: (campId: string, quoteId: string, updates: Partial<QuoteFilm>) => void;
  onRemove: (campId: string, quoteId: string) => void;
}) => {
  const finalForCard = lowestQuoteValue(quote);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`rounded-2xl p-6 space-y-4 backdrop-blur-md ${
        isCheapest
          ? "bg-gradient-to-br from-emerald-500/20 to-green-400/20 border-2 border-emerald-400/50 shadow-2xl shadow-emerald-500/20"
          : "bg-white/10 border border-white/20 shadow-lg"
      }`}
    >
      {isCheapest && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
          <Zap className="h-4 w-4 text-emerald-300" />
          <span className="text-sm font-semibold text-emerald-200">MELHOR OPÇÃO - FILME</span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label className="text-white/80 text-sm">Produtora</Label>
          <GlassInput
            value={quote.produtora}
            onChange={(e) => onUpdate(campId, quote.id, { produtora: e.target.value })}
            placeholder="Nome da produtora"
          />
        </div>
        <div>
          <Label className="text-white/80 text-sm">Diretor</Label>
          <GlassInput
            value={quote.diretor}
            onChange={(e) => onUpdate(campId, quote.id, { diretor: e.target.value })}
            placeholder="Opcional"
          />
        </div>
        <div>
          <Label className="text-white/80 text-sm">Tratamento</Label>
          <GlassInput
            value={quote.tratamento}
            onChange={(e) => onUpdate(campId, quote.id, { tratamento: e.target.value })}
            placeholder="Link ou descrição"
          />
        </div>
      </div>

      <div>
        <Label className="text-white/80 text-sm">Escopo Detalhado</Label>
        <textarea
          className="w-full min-h-[100px] px-4 py-3 text-sm rounded-xl border border-white/30 bg-white/5 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-2 focus:ring-white/20 transition-all duration-300"
          value={quote.escopo}
          onChange={(e) => onUpdate(campId, quote.id, { escopo: e.target.value })}
          placeholder="Descreva o escopo completo da produtora..."
        />
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-white/20">
        <div className="text-sm">
          <span className="text-white/70 font-semibold">Valor Final: </span>
          <span className="text-lg font-bold text-white">{money(finalForCard)}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRemove(campId, quote.id)}
          className="text-red-300/80 hover:text-red-200 hover:bg-red-500/20 gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Remover
        </Button>
      </div>
    </motion.div>
  );
};

// Componente Principal
export default function OrcamentoNovoGlass() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const { data, updateData, addCampaign, updateCampaign, setData } = useBudgetData();

  // Redirecionar para página específica quando tipo for imagem
  useEffect(() => {
    if (data.type === "imagem") {
      navigate("/new/imagem");
    }
  }, [data.type, navigate]);

  // Handlers para cotações
  const addQuoteFilmTo = useCallback(
    (campId: string) => {
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
    },
    [setData],
  );

  const updateQuoteFilmIn = useCallback(
    (campId: string, quoteId: string, updates: Partial<QuoteFilm>) => {
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
                        ...updates,
                        valor: toNum((updates as any)?.valor ?? q.valor),
                        desconto: toNum((updates as any)?.desconto ?? q.desconto),
                      }
                    : q,
                ),
              }
            : c,
        ),
      }));
    },
    [setData],
  );

  const removeQuoteFilmFrom = useCallback(
    (campId: string, quoteId: string) => {
      setData((prev) => ({
        ...prev,
        campanhas: prev.campanhas?.map((c) =>
          c.id === campId ? { ...c, quotes_film: c.quotes_film.filter((q) => q.id !== quoteId) } : c,
        ),
      }));
    },
    [setData],
  );

  const addQuoteAudioTo = useCallback(
    (campId: string) => {
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
    },
    [setData],
  );

  const updateQuoteAudioIn = useCallback(
    (campId: string, quoteId: string, updates: Partial<QuoteAudio>) => {
      setData((prev) => ({
        ...prev,
        campanhas: prev.campanhas?.map((c) =>
          c.id === campId
            ? {
                ...c,
                quotes_audio: c.quotes_audio.map((q) =>
                  q.id === quoteId
                    ? {
                        ...q,
                        ...updates,
                        valor: toNum((updates as any)?.valor ?? q.valor),
                        desconto: toNum((updates as any)?.desconto ?? q.desconto),
                      }
                    : q,
                ),
              }
            : c,
        ),
      }));
    },
    [setData],
  );

  const removeQuoteAudioFrom = useCallback(
    (campId: string, quoteId: string) => {
      setData((prev) => ({
        ...prev,
        campanhas: prev.campanhas?.map((c) =>
          c.id === campId ? { ...c, quotes_audio: c.quotes_audio.filter((q) => q.id !== quoteId) } : c,
        ),
      }));
    },
    [setData],
  );

  // Cálculo dos totais
  useEffect(() => {
    const camps = data.campanhas || [];
    if (camps.length === 0) return;

    const baseCampanhas = camps.map((c) => {
      const { filmVal, audioVal, subtotal } = calcCampanhaPartes(c);
      return {
        campId: c.id,
        nome: c.nome,
        filmVal,
        audioVal,
        subtotal,
      };
    });

    setData((prev) => ({
      ...prev,
      totais_campanhas: baseCampanhas,
      total: 0,
    }));
  }, [data.campanhas, setData]);

  const handleSave = async () => {
    if (!data.cliente || !data.produto) {
      toast({
        title: "Dados incompletos",
        description: "Preencha cliente e produto para continuar",
        variant: "destructive",
      });
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
          total_geral: 0,
        },
      ]);

      if (versionError) throw versionError;

      toast({
        title: "✅ Orçamento salvo!",
        description: "Redirecionando para visualização...",
      });
      navigate(`/budget/${budgetData.id}/pdf`);
    } catch (err: any) {
      console.error("[save-budget] error:", err);
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalQuotesFilme = useMemo(
    () => (data.campanhas || []).reduce((acc, c) => acc + c.quotes_film.length, 0),
    [data.campanhas],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <HeaderBar
        title={
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-purple-300" />
            <span className="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Novo Orçamento
            </span>
          </div>
        }
        subtitle="Preencha os dados e visualize em tempo real"
        backTo="/orcamentos"
        actions={
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white shadow-lg shadow-purple-500/25"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Salvando...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar e Gerar PDF
              </>
            )}
          </Button>
        }
      />

      <div className="container-page py-8">
        {/* Instruções com Glass */}
        <GlassCard className="mb-8 border-blue-400/30" variant="elevated">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-blue-300" />
              <h3 className="text-lg font-semibold text-white">Instruções de Preenchimento</h3>
            </div>
            <div className="grid gap-3 text-blue-100/90 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <p>
                  <b>Cliente</b> e <b>Produto</b>: Campos obrigatórios para identificação.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <p>
                  <b>Campanhas</b>: Adicione 1+ campanhas. Cada campanha pode ter cotações de filme e áudio.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <p>
                  <b>Mais Barata</b>: Sistema destaca automaticamente a opção mais econômica.
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulário Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Identificação */}
            <GlassCard variant="elevated">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-purple-300" />
                  Identificação
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-white/80">Tipo</Label>
                    <Select value={data.type} onValueChange={(v) => updateData({ type: v as any })}>
                      <SelectTrigger className="backdrop-blur-md bg-white/5 border-white/30 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-md bg-slate-800/95 border-white/20">
                        <SelectItem value="filme">Filme</SelectItem>
                        <SelectItem value="audio">Áudio</SelectItem>
                        <SelectItem value="imagem">Imagem</SelectItem>
                        <SelectItem value="cc">Closed Caption</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white/80">Produtor</Label>
                    <GlassInput
                      value={data.produtor || ""}
                      onChange={(e) => updateData({ produtor: e.target.value })}
                      placeholder="Nome do produtor"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">E-mail</Label>
                    <GlassInput
                      type="email"
                      value={data.email || ""}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Cliente & Produto */}
            <GlassCard variant="elevated">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-6">Cliente & Produto</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Cliente *</Label>
                    <GlassInput
                      value={data.cliente || ""}
                      onChange={(e) => updateData({ cliente: e.target.value })}
                      placeholder="Nome do cliente"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Produto *</Label>
                    <GlassInput
                      value={data.produto || ""}
                      onChange={(e) => updateData({ produto: e.target.value })}
                      placeholder="Nome do produto"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Job</Label>
                    <GlassInput value={data.job || ""} onChange={(e) => updateData({ job: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-white/80">Mídias</Label>
                    <GlassInput value={data.midias || ""} onChange={(e) => updateData({ midias: e.target.value })} />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Campanhas */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Campanhas</h3>
              <Button
                size="sm"
                onClick={addCampaign}
                className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0"
              >
                <Plus className="h-4 w-4" />
                Nova Campanha
              </Button>
            </div>

            <AnimatePresence>
              {(data.campanhas || []).map((camp) => {
                const cheapestFilm = camp.quotes_film.length
                  ? (getCheapest(camp.quotes_film) as QuoteFilm | null)
                  : null;
                const cheapestAudio =
                  camp.inclui_audio && camp.quotes_audio.length
                    ? (getCheapest(camp.quotes_audio) as QuoteAudio | null)
                    : null;

                return (
                  <motion.div
                    key={camp.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <GlassCard variant="elevated" className="border-purple-400/30">
                      <div className="p-6">
                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                          <div className="md:col-span-2">
                            <Label className="text-white/80">Nome da Campanha</Label>
                            <GlassInput
                              value={camp.nome}
                              onChange={(e) => updateCampaign(camp.id, { nome: e.target.value })}
                              placeholder="Ex.: Lançamento Q4"
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={camp.inclui_audio || false}
                                onCheckedChange={(v) => updateCampaign(camp.id, { inclui_audio: v })}
                                className="data-[state=checked]:bg-green-500"
                              />
                              <Label className="text-white/80 text-sm">Incluir Áudio</Label>
                            </div>
                          </div>
                        </div>

                        {/* Cotações Filme */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-white">Cotações de Filme</h4>
                            <Button
                              size="sm"
                              onClick={() => addQuoteFilmTo(camp.id)}
                              className="gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-200"
                            >
                              <Plus className="h-4 w-4" />
                              Adicionar Cotação
                            </Button>
                          </div>

                          <div className="space-y-4">
                            {camp.quotes_film.map((q) => (
                              <QuoteFilmCard
                                key={q.id}
                                quote={q}
                                isCheapest={cheapestFilm?.id === q.id}
                                campId={camp.id}
                                onUpdate={updateQuoteFilmIn}
                                onRemove={removeQuoteFilmFrom}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <GlassCard variant="elevated">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <FileText className="h-6 w-6 text-purple-300" />
                    <h3 className="text-xl font-semibold text-white">Preview</h3>
                  </div>

                  {data.pendente_faturamento && (
                    <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/20 text-yellow-200 text-sm px-4 py-3 mb-4 backdrop-blur-md">
                      <strong>⏳ PENDENTE DE FATURAMENTO</strong>
                    </div>
                  )}

                  <div className="space-y-4 text-white/80">
                    <div className="flex justify-between">
                      <span>Cliente:</span>
                      <span className="font-semibold text-white">{data.cliente || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Produto:</span>
                      <span className="font-semibold text-white">{data.produto || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cotações Filme:</span>
                      <span className="font-semibold text-white">{totalQuotesFilme}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Campanhas:</span>
                      <span className="font-semibold text-white">{data.campanhas?.length || 0}</span>
                    </div>
                  </div>

                  {/* Totais por Campanha */}
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <h4 className="text-sm font-semibold text-white mb-4">📊 Totais por Campanha</h4>
                    <div className="space-y-3">
                      {(data.totais_campanhas || []).map((t) => (
                        <div key={t.campId} className="rounded-xl bg-white/5 p-4 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-white text-sm">{t.nome}</span>
                            <span className="font-bold text-green-300">{money(t.subtotal)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
                            <div>Filme: {money(t.filmVal)}</div>
                            <div>Áudio: {money(t.audioVal)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
