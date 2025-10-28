import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Save,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  Star,
  Zap,
  TrendingUp,
  Calculator,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { HeaderBar } from "@/components/HeaderBar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type BudgetType = "filme" | "audio" | "imagem" | "cc";
type BudgetStructure = "categorias" | "fornecedores_fases";

interface FilmOption {
  id: string;
  nome: string;
  escopo: string;
  valor: number | string;
  desconto: number | string;
}

interface QuoteFilm {
  id: string;
  produtora: string;
  escopo: string;
  valor: number | string;
  diretor: string;
  tratamento: string;
  desconto: number | string;
  tem_opcoes?: boolean;
  opcoes?: FilmOption[];
  opcoes_expandidas?: boolean;
}

interface QuoteAudio {
  id: string;
  produtora: string;
  descricao: string;
  valor: number | string;
  desconto: number | string;
}

interface Campaign {
  id: string;
  nome: string;
  inclui_audio?: boolean;
  quotes_film: QuoteFilm[];
  quotes_audio: QuoteAudio[];
}

// NOVA ESTRUTURA: Fornecedores → Fases → Itens
interface FornecedorItem {
  id: string;
  nome: string;
  valor: number;
  prazo: string;
  observacao: string;
}

interface FornecedorFase {
  id: string;
  nome: string;
  itens: FornecedorItem[];
}

interface Fornecedor {
  id: string;
  nome: string;
  contato: string;
  fases: FornecedorFase[];
}

interface TotaisCampanha {
  campId: string;
  nome: string;
  filmVal: number;
  audioVal: number;
  subtotal: number;
}

interface BudgetData {
  type: BudgetType;
  estrutura: BudgetStructure;
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
  campanhas?: Campaign[];
  fornecedores?: Fornecedor[];
  totais_campanhas?: TotaisCampanha[];
  total: number;
  pendente_faturamento?: boolean;
  observacoes?: string;
}

// Utils
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

const formatCurrencyInput = (value: number | string): string => {
  const num = toNum(value);
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

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

// Componente para Input Monetário
const CurrencyInput = ({ value, onChange, placeholder = "0,00", ...props }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseCurrency(rawValue);
    onChange(numericValue);
  };

  return (
    <Input
      value={formatCurrencyInput(value)}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode="decimal"
      {...props}
    />
  );
};

export default function OrcamentoNovo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<BudgetData>({
    type: "filme",
    estrutura: "categorias",
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
    fornecedores: [],
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
  }, []);

  // Carregar exemplo dos PDFs
  const loadExampleData = () => {
    const exemploFornecedores: Fornecedor[] = [
      {
        id: crypto.randomUUID(),
        nome: "ESTÚDIO PÉ GRANDE",
        contato: "",
        fases: [
          {
            id: crypto.randomUUID(),
            nome: "Multimix Assets 3D - Fase 1",
            itens: [
              {
                id: crypto.randomUUID(),
                nome: "PACOTE (MODELAGEM + 6 STILLS)",
                valor: 49200,
                prazo: "30 dias",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "5 STILLS EXTRAS",
                valor: 27500,
                prazo: "18 dias",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "1 STILL EXTRA",
                valor: 5860,
                prazo: "18 dias",
                observacao: ""
              }
            ]
          },
          {
            id: crypto.randomUUID(),
            nome: "Multimix Assets 3D - Fase 2",
            itens: [
              {
                id: crypto.randomUUID(),
                nome: "PACOTE 1 (MODELAGEM + 9 STILLS)",
                valor: 63700,
                prazo: "35 dias",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "PACOTE 2 (MODELAGEM + 8 STILLS)",
                valor: 56700,
                prazo: "35 dias",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "5 STILLS EXTRAS",
                valor: 27500,
                prazo: "18 dias",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "1 STILL EXTRA",
                valor: 5860,
                prazo: "18 dias",
                observacao: ""
              }
            ]
          }
        ]
      },
      {
        id: crypto.randomUUID(),
        nome: "DIRTY WORD",
        contato: "",
        fases: [
          {
            id: crypto.randomUUID(),
            nome: "Shooting e Renders",
            itens: [
              {
                id: crypto.randomUUID(),
                nome: "Embalagens",
                valor: 55000,
                prazo: "",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "Balas",
                valor: 60000,
                prazo: "",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "Pacote",
                valor: 110000,
                prazo: "",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "Ervas Unitario",
                valor: 30000,
                prazo: "",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "Pacote Ervas",
                valor: 270000,
                prazo: "",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "Renders unitário",
                valor: 20000,
                prazo: "",
                observacao: ""
              },
              {
                id: crypto.randomUUID(),
                nome: "Shooting até 10 fotos",
                valor: 150000,
                prazo: "",
                observacao: ""
              }
            ]
          }
        ]
      }
    ];

    setData(prev => ({
      ...prev,
      estrutura: "fornecedores_fases",
      fornecedores: exemploFornecedores
    }));

    toast({
      title: "Exemplo carregado!",
      description: "Dados do Estúdio Pé Grande e Dirty Word foram pré-preenchidos.",
    });
  };

  // Handlers para estrutura de Fornecedores → Fases
  const addFornecedor = () => {
    setData((prev) => ({
      ...prev,
      fornecedores: [
        ...(prev.fornecedores || []),
        {
          id: crypto.randomUUID(),
          nome: "",
          contato: "",
          fases: []
        }
      ]
    }));
  };

  const updateFornecedor = (id: string, updates: Partial<Fornecedor>) => {
    setData((prev) => ({
      ...prev,
      fornecedores: prev.fornecedores?.map(f => 
        f.id === id ? { ...f, ...updates } : f
      )
    }));
  };

  const removeFornecedor = (id: string) => {
    setData((prev) => ({
      ...prev,
      fornecedores: prev.fornecedores?.filter(f => f.id !== id)
    }));
  };

  const addFaseToFornecedor = (fornecedorId: string) => {
    setData((prev) => ({
      ...prev,
      fornecedores: prev.fornecedores?.map(f =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: [
                ...f.fases,
                {
                  id: crypto.randomUUID(),
                  nome: "",
                  itens: []
                }
              ]
            }
          : f
      )
    }));
  };

  const updateFaseInFornecedor = (fornecedorId: string, faseId: string, updates: Partial<FornecedorFase>) => {
    setData((prev) => ({
      ...prev,
      fornecedores: prev.fornecedores?.map(f =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: f.fases.map(fase =>
                fase.id === faseId ? { ...fase, ...updates } : fase
              )
            }
          : f
      )
    }));
  };

  const removeFaseFromFornecedor = (fornecedorId: string, faseId: string) => {
    setData((prev) => ({
      ...prev,
      fornecedores: prev.fornecedores?.map(f =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: f.fases.filter(fase => fase.id !== faseId)
            }
          : f
      )
    }));
  };

  const addItemToFase = (fornecedorId: string, faseId: string) => {
    setData((prev) => ({
      ...prev,
      fornecedores: prev.fornecedores?.map(f =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: f.fases.map(fase =>
                fase.id === faseId
                  ? {
                      ...fase,
                      itens: [
                        ...fase.itens,
                        {
                          id: crypto.randomUUID(),
                          nome: "",
                          valor: 0,
                          prazo: "",
                          observacao: ""
                        }
                      ]
                    }
                  : fase
              )
            }
          : f
      )
    }));
  };

  const updateItemInFase = (fornecedorId: string, faseId: string, itemId: string, updates: Partial<FornecedorItem>) => {
    setData((prev) => ({
      ...prev,
      fornecedores: prev.fornecedores?.map(f =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: f.fases.map(fase =>
                fase.id === faseId
                  ? {
                      ...fase,
                      itens: fase.itens.map(item =>
                        item.id === itemId ? { ...item, ...updates } : item
                      )
                    }
                  : fase
              )
            }
          : f
      )
    }));
  };

  const removeItemFromFase = (fornecedorId: string, faseId: string, itemId: string) => {
    setData((prev) => ({
      ...prev,
      fornecedores: prev.fornecedores?.map(f =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: f.fases.map(fase =>
                fase.id === faseId
                  ? {
                      ...fase,
                      itens: fase.itens.filter(item => item.id !== itemId)
                    }
                  : fase
              )
            }
          : f
      )
    }));
  };

  // Handlers de campanhas e cotações (estrutura antiga)
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

  const removeCampaign = (campId: string) => {
    if (data.campanhas && data.campanhas.length <= 1) {
      toast({
        title: "Não é possível remover",
        description: "É necessário ter pelo menos uma campanha",
        variant: "destructive",
      });
      return;
    }

    setData((prev) => ({
      ...prev,
      campanhas: prev.campanhas?.filter((c) => c.id !== campId),
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
                  opcoes_expandidas: false,
                },
              ],
            }
          : c,
      ),
    }));
  };

  const toggleOpcoesExpandidas = (campId: string, quoteId: string) => {
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
                      opcoes_expandidas: !q.opcoes_expandidas,
                    }
                  : q,
              ),
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
                      opcoes: (q.opcoes || []).map((opt) =>
                        opt.id === optionId
                          ? {
                              ...opt,
                              ...updates,
                            }
                          : opt,
                      ),
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
                q.id === quoteId
                  ? {
                      ...q,
                      opcoes: (q.opcoes || []).filter((opt) => opt.id !== optionId),
                      tem_opcoes: (q.opcoes?.length || 0) > 1,
                    }
                  : q,
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
              quotes_film: c.quotes_film.map((q) =>
                q.id === quoteId
                  ? {
                      ...q,
                      ...updates,
                    }
                  : q,
              ),
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
              quotes_audio: c.quotes_audio.map((q) =>
                q.id === quoteId
                  ? {
                      ...q,
                      ...updates,
                    }
                  : q,
              ),
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

  // Cálculo dos totais
  useEffect(() => {
    if (data.estrutura === "categorias") {
      const camps = data.campanhas || [];
      if (camps.length === 0) return;

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

      const total = baseCampanhas.reduce((sum, camp) => sum + camp.subtotal, 0);

      setData((prev) => ({
        ...prev,
        totais_campanhas: baseCampanhas,
        total,
      }));
    } else if (data.estrutura === "fornecedores_fases") {
      const fornecedores = data.fornecedores || [];
      let total = 0;

      fornecedores.forEach(fornecedor => {
        fornecedor.fases.forEach(fase => {
          fase.itens.forEach(item => {
            total += item.valor;
          });
        });
      });

      setData(prev => ({
        ...prev,
        total
      }));
    }
  }, [data.campanhas, data.fornecedores, data.estrutura]);

  const handleSave = async () => {
    if (!data.cliente?.trim()) {
      toast({ title: "Cliente é obrigatório", variant: "destructive" });
      return;
    }
    if (!data.produto?.trim()) {
      toast({ title: "Produto é obrigatório", variant: "destructive" });
      return;
    }

    // Validações baseadas na estrutura
    if (data.estrutura === "categorias") {
      const campanhasSemFilme = data.campanhas?.filter((camp) => camp.quotes_film.length === 0);
      if (campanhasSemFilme && campanhasSemFilme.length > 0) {
        toast({
          title: "Cotações incompletas",
          description: `A campanha "${campanhasSemFilme[0].nome}" precisa de pelo menos uma cotação de filme`,
          variant: "destructive",
        });
        return;
      }
    } else if (data.estrutura === "fornecedores_fases") {
      const fornecedoresSemItens = data.fornecedores?.filter(f => 
        f.fases.length === 0 || f.fases.every(fase => fase.itens.length === 0)
      );
      if (fornecedoresSemItens && fornecedoresSemItens.length > 0) {
        toast({
          title: "Fornecedores incompletos",
          description: `Todos os fornecedores precisam ter pelo menos um item`,
          variant: "destructive",
        });
        return;
      }
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

      toast({
        title: "✅ Orçamento salvo!",
        description: "Redirecionando para visualização...",
      });
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

  const totalQuotesFilme = useMemo(
    () => (data.campanhas || []).reduce((acc, c) => acc + c.quotes_film.length, 0),
    [data.campanhas],
  );

  const totalQuotesAudio = useMemo(
    () => (data.campanhas || []).reduce((acc, c) => acc + c.quotes_audio.length, 0),
    [data.campanhas],
  );

  // Renderização da estrutura de Fornecedores → Fases
  const renderFornecedoresFases = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Fornecedores e Fases</h3>
            <p className="text-sm text-muted-foreground">Estruture por fornecedor → fase → itens</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={loadExampleData} 
              variant="outline" 
              className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              📄 Carregar Exemplo (Pé Grande + Dirty Word)
            </Button>
            <Button onClick={addFornecedor} className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg">
              <Plus className="h-5 w-5" />
              Novo Fornecedor
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {(data.fornecedores || []).map((fornecedor, index) => {
            const totalFornecedor = fornecedor.fases.reduce((totalFase, fase) => 
              totalFase + fase.itens.reduce((totalItem, item) => totalItem + item.valor, 0), 0
            );

            return (
              <motion.div
                key={fornecedor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border-l-4 border-l-green-500 shadow-xl">
                  <CardHeader className="pb-4 bg-gradient-to-r from-green-50 to-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant="default" className="bg-green-600 text-white px-3 py-1 text-sm">
                          Fornecedor {index + 1}
                        </Badge>
                        <CardTitle className="text-xl">{fornecedor.nome || "Novo Fornecedor"}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFornecedor(fornecedor.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-6">
                    {/* Dados do Fornecedor */}
                    <div className="grid md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-xl border">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Nome do Fornecedor *</Label>
                        <Input
                          value={fornecedor.nome}
                          onChange={(e) => updateFornecedor(fornecedor.id, { nome: e.target.value })}
                          placeholder="Ex.: ESTÚDIO PÉ GRANDE"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Contato</Label>
                        <Input
                          value={fornecedor.contato}
                          onChange={(e) => updateFornecedor(fornecedor.id, { contato: e.target.value })}
                          placeholder="E-mail ou telefone"
                          className="h-12"
                        />
                      </div>
                    </div>

                    {/* Fases */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-xl text-gray-900">Fases</h4>
                          <p className="text-sm text-muted-foreground">
                            {fornecedor.fases.length === 0
                              ? "Adicione fases para este fornecedor"
                              : `${fornecedor.fases.length} fase(s) cadastrada(s)`}
                          </p>
                        </div>
                        <Button
                          size="lg"
                          onClick={() => addFaseToFornecedor(fornecedor.id)}
                          className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg"
                        >
                          <Plus className="h-5 w-5" />
                          Nova Fase
                        </Button>
                      </div>

                      <div className="space-y-6">
                        {fornecedor.fases.map((fase, faseIndex) => {
                          const totalFase = fase.itens.reduce((total, item) => total + item.valor, 0);

                          return (
                            <motion.div
                              key={fase.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="border-2 border-gray-200 rounded-xl p-6 space-y-6 bg-white shadow-md"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline" className="bg-blue-100 text-blue-700">
                                    Fase {faseIndex + 1}
                                  </Badge>
                                  <h5 className="font-semibold text-lg text-gray-900">
                                    {fase.nome || "Nova Fase"}
                                  </h5>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeFaseFromFornecedor(fornecedor.id, fase.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="space-y-3">
                                <Label className="text-sm font-semibold">Nome da Fase *</Label>
                                <Input
                                  value={fase.nome}
                                  onChange={(e) => updateFaseInFornecedor(fornecedor.id, fase.id, { nome: e.target.value })}
                                  placeholder="Ex.: Multimix Assets 3D - Fase 1"
                                  className="h-12"
                                />
                              </div>

                              {/* Itens da Fase */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h6 className="font-semibold text-gray-900">Itens da Fase</h6>
                                    <p className="text-sm text-muted-foreground">
                                      {fase.itens.length === 0
                                        ? "Adicione itens a esta fase"
                                        : `${fase.itens.length} item(ns) cadastrado(s)`}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => addItemToFase(fornecedor.id, fase.id)}
                                    className="gap-2 bg-orange-600 hover:bg-orange-700"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Novo Item
                                  </Button>
                                </div>

                                <div className="space-y-4">
                                  {fase.itens.map((item, itemIndex) => (
                                    <motion.div
                                      key={item.id}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="p-4 border-2 border-dashed border-orange-200 rounded-lg bg-orange-50 space-y-4"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <Badge variant="outline" className="bg-orange-100 text-orange-700">
                                            Item {itemIndex + 1}
                                          </Badge>
                                          <h6 className="font-semibold text-orange-900">{item.nome || "Novo Item"}</h6>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeItemFromFase(fornecedor.id, fase.id, item.id)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>

                                      <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label className="text-sm font-semibold">Nome do Item *</Label>
                                          <Input
                                            value={item.nome}
                                            onChange={(e) => updateItemInFase(fornecedor.id, fase.id, item.id, { nome: e.target.value })}
                                            placeholder="Ex.: PACOTE (MODELAGEM + 6 STILLS)"
                                            className="h-10"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-sm font-semibold">Valor (R$) *</Label>
                                          <CurrencyInput
                                            value={item.valor}
                                            onChange={(value: number) => updateItemInFase(fornecedor.id, fase.id, item.id, { valor: value })}
                                            className="h-10"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label className="text-sm font-semibold">Prazo</Label>
                                          <Input
                                            value={item.prazo}
                                            onChange={(e) => updateItemInFase(fornecedor.id, fase.id, item.id, { prazo: e.target.value })}
                                            placeholder="Ex.: 30 dias"
                                            className="h-10"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-sm font-semibold">Observação</Label>
                                          <Input
                                            value={item.observacao}
                                            onChange={(e) => updateItemInFase(fornecedor.id, fase.id, item.id, { observacao: e.target.value })}
                                            placeholder="Observações adicionais"
                                            className="h-10"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                                        <div className="space-y-1">
                                          <div className="text-sm font-semibold text-gray-700">Valor do Item</div>
                                          <div className="text-xl font-bold text-orange-600">
                                            {money(item.valor)}
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>

                                {fase.itens.length > 0 && (
                                  <div className="flex justify-between items-center pt-4 border-t">
                                    <div className="space-y-2">
                                      <div className="text-sm font-semibold text-gray-700">Total da Fase</div>
                                      <div className="text-2xl font-bold text-blue-600">{money(totalFase)}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {fornecedor.fases.length > 0 && (
                      <div className="flex justify-between items-center pt-6 border-t">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-gray-700">Total do Fornecedor</div>
                          <div className="text-3xl font-bold text-green-600">{money(totalFornecedor)}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  // Renderização da estrutura de Categorias (antiga)
  const renderCategorias = () => {
    return (
      <div className="space-y-6">
        {/* ... (código existente da estrutura de categorias) */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Campanhas</h3>
            <p className="text-sm text-muted-foreground">Gerencie as campanhas e suas cotações</p>
          </div>
          <Button onClick={addCampaign} className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg">
            <Plus className="h-5 w-5" />
            Nova Campanha
          </Button>
        </div>

        <AnimatePresence>
          {(data.campanhas || []).map((camp, campIndex) => {
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
                <Card className="border-l-4 border-l-blue-500 shadow-xl">
                  <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant="default" className="bg-blue-600 text-white px-3 py-1 text-sm">
                          Campanha {campIndex + 1}
                        </Badge>
                        <CardTitle className="text-xl">{camp.nome}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeCampaign(camp.id)}
                          disabled={data.campanhas && data.campanhas.length <= 1}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-8 pt-6">
                    {/* Configuração da Campanha */}
                    <div className="grid md:grid-cols-3 gap-6 p-6 bg-gray-50 rounded-xl border">
                      <div className="md:col-span-2 space-y-3">
                        <Label className="text-sm font-semibold">Nome da Campanha</Label>
                        <Input
                          value={camp.nome}
                          onChange={(e) => updateCampaign(camp.id, { nome: e.target.value })}
                          placeholder="Ex.: Lançamento Q4"
                          className="h-12"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={camp.inclui_audio || false}
                            onCheckedChange={(v) => updateCampaign(camp.id, { inclui_audio: v })}
                            className="data-[state=checked]:bg-green-600"
                          />
                          <Label className="text-sm font-semibold">Incluir Áudio</Label>
                        </div>
                      </div>
                    </div>

                    {/* Cotações Filme */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-xl text-gray-900">Cotações de Filme</h4>
                          <p className="text-sm text-muted-foreground">
                            {camp.quotes_film.length === 0
                              ? "Adicione pelo menos uma cotação de filme"
                              : `${camp.quotes_film.length} cotação(ões) cadastrada(s)`}
                          </p>
                        </div>
                        <Button
                          size="lg"
                          onClick={() => addQuoteFilmTo(camp.id)}
                          className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg"
                        >
                          <Plus className="h-5 w-5" />
                          Adicionar Cotação
                        </Button>
                      </div>

                      <div className="space-y-6">
                        {camp.quotes_film.length === 0 && (
                          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg mb-2">Nenhuma cotação de filme adicionada</p>
                            <p className="text-gray-400 text-sm mb-4">Comece adicionando a primeira cotação</p>
                            <Button
                              onClick={() => addQuoteFilmTo(camp.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Adicionar Primeira Cotação
                            </Button>
                          </div>
                        )}

                        {camp.quotes_film.map((q) => {
                          const isCheapest = cheapestFilm?.id === q.id;
                          const finalForCard = lowestQuoteValue(q);

                          return (
                            <motion.div
                              key={q.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`border-2 rounded-xl p-6 space-y-6 ${
                                isCheapest
                                  ? "border-green-500 bg-green-50 shadow-lg"
                                  : "border-gray-200 bg-white shadow-md"
                              }`}
                            >
                              {isCheapest && (
                                <div className="flex items-center gap-3 p-3 bg-green-100 rounded-lg border border-green-200">
                                  <Star className="h-5 w-5 text-green-600 fill-current" />
                                  <span className="text-sm font-semibold text-green-700">
                                    🏆 MELHOR OPÇÃO - FILME
                                  </span>
                                </div>
                              )}

                              <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                  <Label className="text-sm font-semibold">Produtora</Label>
                                  <Input
                                    value={q.produtora}
                                    onChange={(e) =>
                                      updateQuoteFilmIn(camp.id, q.id, { produtora: e.target.value })
                                    }
                                    placeholder="Nome da produtora"
                                    className="h-12"
                                  />
                                </div>
                                <div className="space-y-3">
                                  <Label className="text-sm font-semibold">Diretor</Label>
                                  <Input
                                    value={q.diretor}
                                    onChange={(e) => updateQuoteFilmIn(camp.id, q.id, { diretor: e.target.value })}
                                    placeholder="Opcional"
                                    className="h-12"
                                  />
                                </div>
                                <div className="space-y-3">
                                  <Label className="text-sm font-semibold">Tratamento</Label>
                                  <Input
                                    value={q.tratamento}
                                    onChange={(e) =>
                                      updateQuoteFilmIn(camp.id, q.id, { tratamento: e.target.value })
                                    }
                                    placeholder="Link ou descrição"
                                    className="h-12"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3">
                                <Label className="text-sm font-semibold">Escopo Detalhado</Label>
                                <textarea
                                  className="w-full min-h-[120px] px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                                  value={q.escopo}
                                  onChange={(e) => updateQuoteFilmIn(camp.id, q.id, { escopo: e.target.value })}
                                  placeholder="Descreva o escopo completo da produtora..."
                                />
                              </div>

                              {/* Valores principais */}
                              <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <Label className="text-sm font-semibold">Valor (R$)</Label>
                                  <CurrencyInput
                                    value={q.valor}
                                    onChange={(value: number) => updateQuoteFilmIn(camp.id, q.id, { valor: value })}
                                    className="h-12"
                                  />
                                </div>
                                <div className="space-y-3">
                                  <Label className="text-sm font-semibold">Desconto (R$)</Label>
                                  <CurrencyInput
                                    value={q.desconto}
                                    onChange={(value: number) =>
                                      updateQuoteFilmIn(camp.id, q.id, { desconto: value })
                                    }
                                    className="h-12"
                                  />
                                </div>
                              </div>

                              {/* Seção de Opções */}
                              <div className="border-t pt-6">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <h5 className="font-semibold text-lg text-gray-900">Opções da Cotação</h5>
                                    <p className="text-sm text-gray-600">
                                      Adicione diferentes versões ou alternativas para esta cotação
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => toggleOpcoesExpandidas(camp.id, q.id)}
                                      className="gap-2"
                                    >
                                      {q.opcoes_expandidas ? (
                                        <>
                                          <ChevronUp className="h-4 w-4" />
                                          Ocultar Opções
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-4 w-4" />
                                          Ver Opções
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => addOptionToQuote(camp.id, q.id)}
                                      className="gap-2 bg-orange-600 hover:bg-orange-700"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Nova Opção
                                    </Button>
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {q.opcoes_expandidas && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="space-y-4"
                                    >
                                      {q.opcoes && q.opcoes.length > 0 ? (
                                        q.opcoes.map((option, optionIndex) => {
                                          const optionFinal = toNum(option.valor) - toNum(option.desconto);
                                          return (
                                            <motion.div
                                              key={option.id}
                                              initial={{ opacity: 0, y: 10 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              exit={{ opacity: 0, y: -10 }}
                                              className="p-4 border-2 border-dashed border-orange-200 rounded-lg bg-orange-50 space-y-4"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                  <Badge
                                                    variant="outline"
                                                    className="bg-orange-100 text-orange-700"
                                                  >
                                                    Opção {optionIndex + 1}
                                                  </Badge>
                                                  <h6 className="font-semibold text-orange-900">{option.nome}</h6>
                                                </div>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeOptionFromQuote(camp.id, q.id, option.id)}
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>

                                              <div className="grid md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                  <Label className="text-sm font-semibold">Nome da Opção</Label>
                                                  <Input
                                                    value={option.nome}
                                                    onChange={(e) =>
                                                      updateOptionInQuote(camp.id, q.id, option.id, {
                                                        nome: e.target.value,
                                                      })
                                                    }
                                                    placeholder="Ex.: Versão reduzida, Com locução, etc."
                                                    className="h-10"
                                                  />
                                                </div>
                                                <div className="space-y-2">
                                                  <Label className="text-sm font-semibold">Escopo da Opção</Label>
                                                  <Input
                                                    value={option.escopo}
                                                    onChange={(e) =>
                                                      updateOptionInQuote(camp.id, q.id, option.id, {
                                                        escopo: e.target.value,
                                                      })
                                                    }
                                                    placeholder="Descreva o escopo específico desta opção"
                                                    className="h-10"
                                                  />
                                                </div>
                                              </div>

                                              <div className="grid md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                  <Label className="text-sm font-semibold">Valor (R$)</Label>
                                                  <CurrencyInput
                                                    value={option.valor}
                                                    onChange={(value: number) =>
                                                      updateOptionInQuote(camp.id, q.id, option.id, {
                                                        valor: value,
                                                      })
                                                    }
                                                    className="h-10"
                                                  />
                                                </div>
                                                <div className="space-y-2">
                                                  <Label className="text-sm font-semibold">Desconto (R$)</Label>
                                                  <CurrencyInput
                                                    value={option.desconto}
                                                    onChange={(value: number) =>
                                                      updateOptionInQuote(camp.id, q.id, option.id, {
                                                        desconto: value,
                                                      })
                                                    }
                                                    className="h-10"
                                                  />
                                                </div>
                                              </div>

                                              <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                                                <div className="space-y-1">
                                                  <div className="text-sm font-semibold text-gray-700">
                                                    Valor Final da Opção
                                                  </div>
                                                  <div className="text-xl font-bold text-orange-600">
                                                    {money(optionFinal)}
                                                  </div>
                                                </div>
                                                {optionFinal < finalForCard && (
                                                  <Badge className="bg-green-600 text-white">💰 Melhor Valor</Badge>
                                                )}
                                              </div>
                                            </motion.div>
                                          );
                                        })
                                      ) : (
                                        <div className="text-center py-8 border-2 border-dashed border-orange-200 rounded-lg bg-orange-50">
                                          <FileText className="h-12 w-12 text-orange-400 mx-auto mb-3" />
                                          <p className="text-orange-600 font-medium mb-2">
                                            Nenhuma opção adicionada
                                          </p>
                                          <p className="text-orange-500 text-sm mb-4">
                                            Adicione opções para diferentes versões desta cotação
                                          </p>
                                          <Button
                                            onClick={() => addOptionToQuote(camp.id, q.id)}
                                            className="bg-orange-600 hover:bg-orange-700"
                                          >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Adicionar Primeira Opção
                                          </Button>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              <div className="flex justify-between items-center pt-6 border-t">
                                <div className="space-y-2">
                                  <div className="text-sm font-semibold text-gray-700">Valor Final da Cotação</div>
                                  <div className="text-3xl font-bold text-green-600">{money(finalForCard)}</div>
                                  {q.tem_opcoes && q.opcoes && q.opcoes.length > 0 && (
                                    <div className="text-xs text-gray-500">
                                      Considerando a opção mais barata entre {q.opcoes.length + 1} alternativas
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => removeQuoteFilmFrom(camp.id, q.id)}
                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="h-5 w-5 mr-2" />
                                    Remover Cotação
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cotações Áudio */}
                    {camp.inclui_audio && (
                      <div className="space-y-6 pt-6 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-xl text-gray-900">Cotações de Áudio</h4>
                            <p className="text-sm text-muted-foreground">
                              {camp.quotes_audio.length === 0
                                ? "Adicione cotações de produtoras de áudio"
                                : `${camp.quotes_audio.length} cotação(ões) de áudio`}
                            </p>
                          </div>
                          <Button
                            size="lg"
                            onClick={() => addQuoteAudioTo(camp.id)}
                            className="gap-2 bg-purple-600 hover:bg-purple-700 shadow-lg"
                          >
                            <Plus className="h-5 w-5" />
                            Adicionar Áudio
                          </Button>
                        </div>

                        <div className="space-y-6">
                          {camp.quotes_audio.map((q) => {
                            const isCheapest = cheapestAudio?.id === q.id;
                            const audioFinal = finalAudioValue(q);

                            return (
                              <motion.div
                                key={q.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`border-2 rounded-xl p-6 space-y-6 ${
                                  isCheapest
                                    ? "border-purple-500 bg-purple-50 shadow-lg"
                                    : "border-gray-200 bg-white shadow-md"
                                }`}
                              >
                                {isCheapest && (
                                  <div className="flex items-center gap-3 p-3 bg-purple-100 rounded-lg border border-purple-200">
                                    <Zap className="h-5 w-5 text-purple-600" />
                                    <span className="text-sm font-semibold text-purple-700">
                                      🏆 MELHOR OPÇÃO - ÁUDIO
                                    </span>
                                  </div>
                                )}

                                <div className="grid md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Produtora</Label>
                                    <Input
                                      value={q.produtora}
                                      onChange={(e) =>
                                        updateQuoteAudioIn(camp.id, q.id, { produtora: e.target.value })
                                      }
                                      placeholder="Nome da produtora"
                                      className="h-12"
                                    />
                                  </div>
                                  <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Descrição/Escopo</Label>
                                    <textarea
                                      className="w-full min-h-[100px] px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                                      value={q.descricao}
                                      onChange={(e) =>
                                        updateQuoteAudioIn(camp.id, q.id, { descricao: e.target.value })
                                      }
                                      placeholder="Descreva o escopo de áudio..."
                                    />
                                  </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Valor (R$)</Label>
                                    <CurrencyInput
                                      value={q.valor}
                                      onChange={(value: number) =>
                                        updateQuoteAudioIn(camp.id, q.id, { valor: value })
                                      }
                                      className="h-12"
                                    />
                                  </div>
                                  <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Desconto (R$)</Label>
                                    <CurrencyInput
                                      value={q.desconto}
                                      onChange={(value: number) =>
                                        updateQuoteAudioIn(camp.id, q.id, { desconto: value })
                                      }
                                      className="h-12"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t">
                                  <div className="space-y-2">
                                    <div className="text-sm font-semibold text-gray-700">Valor Final</div>
                                    <div className="text-3xl font-bold text-purple-600">{money(audioFinal)}</div>
                                  </div>
                                  <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => removeQuoteAudioFrom(camp.id, q.id)}
                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="h-5 w-5 mr-2" />
                                    Remover Cotação
                                  </Button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <HeaderBar
        title={
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6 text-blue-600" />
            <span>Novo Orçamento</span>
          </div>
        }
        subtitle="Preencha os dados e visualize em tempo real"
        backTo="/orcamentos"
        actions={
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
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

      <div className="container-page py-6">
        {/* Banner Informativo */}
        <Card className="mb-8 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-900 text-lg">Como preencher o orçamento</h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm text-blue-800">
                  <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>
                      <strong>Cliente e Produto</strong> são obrigatórios
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>
                      Cada campanha precisa de <strong>pelo menos 1 cotação</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>
                      Sistema destaca a <strong>opção mais barata</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>Adicione opções para diferentes versões da mesma cotação</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulário Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Identificação */}
            <Card className="shadow-lg border-blue-100">
              <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  Identificação do Orçamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="type" className="text-sm font-semibold">
                      Tipo *
                    </Label>
                    <Select value={data.type} onValueChange={(v) => updateData({ type: v as BudgetType })}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filme">Filme</SelectItem>
                        <SelectItem value="audio">Áudio</SelectItem>
                        <SelectItem value="imagem">Imagem</SelectItem>
                        <SelectItem value="cc">Closed Caption</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="estrutura" className="text-sm font-semibold">
                      Estrutura *
                    </Label>
                    <Select 
                      value={data.estrutura} 
                      onValueChange={(v) => updateData({ estrutura: v as BudgetStructure })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecione a estrutura" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="categorias">Categorias (padrão)</SelectItem>
                        <SelectItem value="fornecedores_fases">Fornecedores → Fases</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="produtor" className="text-sm font-semibold">
                      Produtor
                    </Label>
                    <Input
                      id="produtor"
                      value={data.produtor || ""}
                      onChange={(e) => updateData({ produtor: e.target.value })}
                      placeholder="Nome do produtor"
                      className="h-12"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-semibold">
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={data.email || ""}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="h-12"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cliente & Produto */}
            <Card className="shadow-lg border-green-100">
              <CardHeader className="pb-4 bg-gradient-to-r from-green-50 to-white rounded-t-lg">
                <CardTitle className="text-xl">Cliente & Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="cliente" className="flex items-center gap-1 text-sm font-semibold">
                      Cliente <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cliente"
                      value={data.cliente || ""}
                      onChange={(e) => updateData({ cliente: e.target.value })}
                      placeholder="Nome do cliente"
                      className={`h-12 ${!data.cliente ? "border-red-300 focus:border-red-500" : ""}`}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="produto" className="flex items-center gap-1 text-sm font-semibold">
                      Produto <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="produto"
                      value={data.produto || ""}
                      onChange={(e) => updateData({ produto: e.target.value })}
                      placeholder="Nome do produto"
                      className={`h-12 ${!data.produto ? "border-red-300 focus:border-red-500" : ""}`}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="job" className="text-sm font-semibold">
                      Job
                    </Label>
                    <Input
                      id="job"
                      value={data.job || ""}
                      onChange={(e) => updateData({ job: e.target.value })}
                      placeholder="Descrição do job"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="midias" className="text-sm font-semibold">
                      Mídias
                    </Label>
                    <Input
                      id="midias"
                      value={data.midias || ""}
                      onChange={(e) => updateData({ midias: e.target.value })}
                      placeholder="Mídias planejadas"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-6 border-t">
                  <div className="space-y-3">
                    <Label htmlFor="entregaveis" className="text-sm font-semibold">
                      Entregáveis
                    </Label>
                    <Input
                      id="entregaveis"
                      value={data.entregaveis || ""}
                      onChange={(e) => updateData({ entregaveis: e.target.value })}
                      placeholder="Ex: 1 filme 30s, 1 filme 15s..."
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="adaptacoes" className="text-sm font-semibold">
                      Adaptações
                    </Label>
                    <Input
                      id="adaptacoes"
                      value={data.adaptacoes || ""}
                      onChange={(e) => updateData({ adaptacoes: e.target.value })}
                      placeholder="Ex: 2 adaptações..."
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="exclusividade" className="text-sm font-semibold">
                      Exclusividade de Elenco
                    </Label>
                    <Select
                      value={data.exclusividade_elenco || "nao_aplica"}
                      onValueChange={(v: any) => updateData({ exclusividade_elenco: v })}
                    >
                      <SelectTrigger id="exclusividade" className="h-12">
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

            {/* Renderização condicional baseada na estrutura */}
            {data.estrutura === "fornecedores_fases" 
              ? renderFornecedoresFases()
              : renderCategorias()
            }

            {/* Faturamento e Observações */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-lg border-yellow-200">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-white rounded-t-lg">
                  <CardTitle className="text-xl">Faturamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <Checkbox
                      id="pendente"
                      checked={!!data.pendente_faturamento}
                      onCheckedChange={(checked) => updateData({ pendente_faturamento: Boolean(checked) })}
                      className="mt-1 data-[state=checked]:bg-yellow-600"
                    />
                    <div className="space-y-2">
                      <Label htmlFor="pendente" className="cursor-pointer font-semibold text-yellow-800 text-lg">
                        ⏳ Pendente de faturamento
                      </Label>
                      <p className="text-sm text-yellow-700">Marcará visualmente no PDF como pendente de faturamento</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="observacoes" className="text-sm font-semibold">
                      Observações
                    </Label>
                    <Textarea
                      id="observacoes"
                      value={data.observacoes || ""}
                      onChange={(e) => updateData({ observacoes: e.target.value })}
                      placeholder="Ex.: incluir em outubro, aguardando aprovação..."
                      className="min-h-[100px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <Card className="shadow-xl border-blue-200">
                <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <FileText className="h-6 w-6 text-blue-600" />
                    Resumo do Orçamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {data.pendente_faturamento && (
                    <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 text-yellow-800 px-4 py-3">
                      <div className="flex items-center gap-3 font-semibold">
                        <AlertCircle className="h-5 w-5" />
                        PENDENTE DE FATURAMENTO
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-sm font-semibold text-gray-600">Cliente:</span>
                      <span className="font-bold text-gray-900 text-lg">{data.cliente || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-sm font-semibold text-gray-600">Produto:</span>
                      <span className="font-bold text-gray-900 text-lg">{data.produto || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-sm font-semibold text-gray-600">Estrutura:</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-3 py-1">
                        {data.estrutura === "fornecedores_fases" ? "Fornecedores → Fases" : "Categorias"}
                      </Badge>
                    </div>
                    
                    {data.estrutura === "categorias" && (
                      <>
                        <div className="flex justify-between items-center py-3 border-b">
                          <span className="text-sm font-semibold text-gray-600">Cotações Filme:</span>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-3 py-1">
                            {totalQuotesFilme}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b">
                          <span className="text-sm font-semibold text-gray-600">Cotações Áudio:</span>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 px-3 py-1">
                            {totalQuotesAudio}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b">
                          <span className="text-sm font-semibold text-gray-600">Campanhas:</span>
                          <Badge variant="default" className="bg-green-600 px-3 py-1">
                            {data.campanhas?.length || 0}
                          </Badge>
                        </div>
                      </>
                    )}

                    {data.estrutura === "fornecedores_fases" && (
                      <>
                        <div className="flex justify-between items-center py-3 border-b">
                          <span className="text-sm font-semibold text-gray-600">Fornecedores:</span>
                          <Badge variant="default" className="bg-green-600 px-3 py-1">
                            {data.fornecedores?.length || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b">
                          <span className="text-sm font-semibold text-gray-600">Total de Itens:</span>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 px-3 py-1">
                            {data.fornecedores?.reduce((total, f) => 
                              total + f.fases.reduce((totalFase, fase) => totalFase + fase.itens.length, 0), 0) || 0}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Totais */}
                  <div className="pt-6 border-t">
                    <h4 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Total Geral
                    </h4>
                    <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl border border-green-200">
                      <div className="text-4xl font-bold text-green-700 mb-2">
                        {money(data.total)}
                      </div>
                      <p className="text-sm text-green-600">
                        Valor total do orçamento
                      </p>
                    </div>
                  </div>

                  {data.estrutura === "categorias" && (
                    <div className="pt-6 border-t">
                      <h4 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Totais por Campanha
                      </h4>
                      <div className="space-y-4">
                        {(data.totais_campanhas || []).map((t) => (
                          <div key={t.campId} className="rounded-xl border border-gray-300 p-4 bg-white shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-semibold text-gray-900">{t.nome}</span>
                              <span className="font-bold text-2xl text-green-600">{money(t.subtotal)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                              <div className="flex justify-between">
                                <span>Filme:</span>
                                <span className="font-semibold">{money(t.filmVal)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Áudio:</span>
                                <span className="font-semibold">{money(t.audioVal)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.estrutura === "fornecedores_fases" && (
                    <div className="pt-6 border-t">
                      <h4 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Totais por Fornecedor
                      </h4>
                      <div className="space-y-4">
                        {(data.fornecedores || []).map((fornecedor) => {
                          const totalFornecedor = fornecedor.fases.reduce((totalFase, fase) => 
                            totalFase + fase.itens.reduce((totalItem, item) => totalItem + item.valor, 0), 0
                          );
                          
                          return (
                            <div key={fornecedor.id} className="rounded-xl border border-gray-300 p-4 bg-white shadow-sm">
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-semibold text-gray-900">{fornecedor.nome || "Fornecedor"}</span>
                                <span className="font-bold text-2xl text-green-600">{money(totalFornecedor)}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {fornecedor.fases.length} fase(s)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dicas Rápidas */}
              <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-white shadow-lg">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-orange-900 text-lg mb-4 flex items-center gap-3">
                    <Zap className="h-5 w-5 text-orange-600" />
                    Dicas Rápidas
                  </h4>
                  <ul className="text-sm text-orange-800 space-y-3">
                    <li className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <span>Preencha todos os campos obrigatórios</span>
                    </li>
                    {data.estrutura === "categorias" && (
                      <>
                        <li className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                          <span>Adicione pelo menos 1 cotação por campanha</span>
                        </li>
                        <li className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                          <span>Use opções para diferentes versões da mesma cotação</span>
                        </li>
                      </>
                    )}
                    {data.estrutura === "fornecedores_fases" && (
                      <>
                        <li className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                          <span>Adicione fornecedores, fases e itens</span>
                        </li>
                        <li className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                          <span>Cada fase pode ter múltiplos itens com valores</span>
                        </li>
                      </>
                    )}
                    <li className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <span>Sistema calcula automaticamente os totais</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}