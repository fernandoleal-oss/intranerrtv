import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CampaignModeDialog } from "@/components/budget/CampaignModeDialog";

// Estrutura antiga (categorias)
interface Fornecedor {
  id: string;
  nome: string;
  diretor?: string;
  escopo: string;
  valor: number;
  desconto: number;
  link?: string;
  tem_opcoes?: boolean;
  opcoes?: OpcaoFornecedor[];
}

interface OpcaoFornecedor {
  id: string;
  nome: string;
  escopo?: string;
  valor: number;
  desconto: number;
}

interface ItemPreco {
  id: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
  observacao?: string;
}

interface Categoria {
  id: string;
  nome: string;
  ordem: number;
  visivel: boolean;
  podeExcluir: boolean;
  observacao?: string;
  modoPreco: "fechado" | "itens";
  fornecedores: Fornecedor[];
  itens: ItemPreco[];
}

interface Campanha {
  id: string;
  nome: string;
  categorias: Categoria[];
}

// Nova estrutura (fornecedores > fases)
interface ItemFase {
  id: string;
  nome: string;
  valor: number;
  prazo?: string;
  observacao?: string;
}

interface Fase {
  id: string;
  nome: string;
  itens: ItemFase[];
}

interface FornecedorComFases {
  id: string;
  nome: string;
  contato?: string;
  fases: Fase[];
}

const CATEGORIAS_BASE = [
  { nome: "Filme", podeExcluir: false },
  { nome: "Áudio", podeExcluir: false },
  { nome: "Imagem", podeExcluir: false },
  { nome: "CC", podeExcluir: false },
];

const CATEGORIAS_SUGERIDAS = [
  "Tradução/Legendagem",
  "Produção de KV (Key Visual)",
  "Locução",
  "Trilha/Música",
  "Motion/Animação",
  "Edição/Finalização",
  "Captação/Filmagem/Still",
];

interface BudgetFormProps {
  budgetId?: string;
  versionId?: string;
  initialPayload?: any;
  onSaveSuccess?: (budgetId: string) => void;
}

export function BudgetForm({ budgetId, versionId, initialPayload, onSaveSuccess }: BudgetFormProps) {
  const [saving, setSaving] = useState(false);
  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [job, setJob] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [estrutura, setEstrutura] = useState<"categorias" | "fornecedores">("categorias");
  const [numCampanhas, setNumCampanhas] = useState(1);
  const [combinarModo, setCombinarModo] = useState<"somar" | "separado">("separado");
  const [showCampaignModeDialog, setShowCampaignModeDialog] = useState(false);
  
  // Estrutura antiga (categorias)
  const [campanhas, setCampanhas] = useState<Campanha[]>([
    {
      id: crypto.randomUUID(),
      nome: "Campanha 1",
      categorias: CATEGORIAS_BASE.map((c, idx) => ({
        id: crypto.randomUUID(),
        nome: c.nome,
        ordem: idx,
        visivel: true,
        podeExcluir: c.podeExcluir,
        modoPreco: "fechado" as const,
        fornecedores: [],
        itens: [],
      })),
    },
  ]);

  // Nova estrutura (fornecedores com fases)
  const [fornecedores, setFornecedores] = useState<FornecedorComFases[]>([]);

  // Load initial data
  useEffect(() => {
    if (initialPayload) {
      const payload = typeof initialPayload === "string" ? JSON.parse(initialPayload) : initialPayload;
      setCliente(payload.cliente || "");
      setProduto(payload.produto || "");
      setJob(payload.job || "");
      setObservacoes(payload.observacoes || "");
      setNumCampanhas(payload.numCampanhas || 1);
      setCombinarModo(payload.combinarModo || "separado");
      setEstrutura(payload.estrutura || "categorias");

      // Carregar estrutura antiga (categorias)
      if (payload.campanhas && Array.isArray(payload.campanhas)) {
        setCampanhas(
          payload.campanhas.map((camp: any) => ({
            id: crypto.randomUUID(),
            nome: camp.nome || "Campanha",
            categorias: (camp.categorias || []).map((c: any, idx: number) => ({
              id: crypto.randomUUID(),
              nome: c.nome || "",
              ordem: idx,
              visivel: c.visivel !== false,
              podeExcluir: !CATEGORIAS_BASE.find((base) => base.nome === c.nome),
              observacao: c.observacao || "",
              modoPreco: c.modoPreco || "fechado",
              fornecedores: (c.fornecedores || []).map((f: any) => ({
                id: crypto.randomUUID(),
                ...f,
              })),
              itens: (c.itens || []).map((i: any) => ({
                id: crypto.randomUUID(),
                ...i,
              })),
            })),
          }))
        );
      }

      // Carregar nova estrutura (fornecedores com fases)
      if (payload.fornecedores && Array.isArray(payload.fornecedores)) {
        setFornecedores(
          payload.fornecedores.map((forn: any) => ({
            id: forn.id || crypto.randomUUID(),
            nome: forn.nome || "",
            contato: forn.contato || "",
            fases: (forn.fases || []).map((fase: any) => ({
              id: fase.id || crypto.randomUUID(),
              nome: fase.nome || "",
              itens: (fase.itens || []).map((item: any) => ({
                id: item.id || crypto.randomUUID(),
                nome: item.nome || "",
                valor: item.valor || 0,
                prazo: item.prazo || "",
                observacao: item.observacao || "",
              })),
            })),
          }))
        );
      }
    }
  }, [initialPayload]);

  useEffect(() => {
    const currentCount = campanhas.length;
    if (numCampanhas > currentCount) {
      const newCampanhas = [...campanhas];
      for (let i = currentCount; i < numCampanhas; i++) {
        newCampanhas.push({
          id: crypto.randomUUID(),
          nome: `Campanha ${i + 1}`,
          categorias: CATEGORIAS_BASE.map((c, idx) => ({
            id: crypto.randomUUID(),
            nome: c.nome,
            ordem: idx,
            visivel: true,
            podeExcluir: c.podeExcluir,
            modoPreco: "fechado" as const,
            fornecedores: [],
            itens: [],
          })),
        });
      }
      setCampanhas(newCampanhas);
    } else if (numCampanhas < currentCount) {
      setCampanhas(campanhas.slice(0, numCampanhas));
    }
    
    // Show dialog when user selects 2+ campaigns and mode is not set
    if (numCampanhas >= 2 && currentCount < 2 && !combinarModo) {
      setShowCampaignModeDialog(true);
    }
  }, [numCampanhas]);

  // Auto-open dialog when loading existing budget with 2+ campaigns and no mode
  useEffect(() => {
    if (campanhas.length >= 2 && !combinarModo && initialPayload) {
      setShowCampaignModeDialog(true);
    }
  }, [campanhas.length, combinarModo, initialPayload]);

  const adicionarCategoria = (campanhaId: string, nome: string) => {
    setCampanhas(
      campanhas.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: [
                ...camp.categorias,
                {
                  id: crypto.randomUUID(),
                  nome,
                  ordem: camp.categorias.length,
                  visivel: true,
                  podeExcluir: true,
                  modoPreco: "fechado",
                  fornecedores: [],
                  itens: [],
                },
              ],
            }
          : camp
      )
    );
    toast({ title: `Categoria "${nome}" adicionada` });
  };

  const removerCategoria = (campanhaId: string, categoriaId: string) => {
    setCampanhas(
      campanhas.map((camp) =>
        camp.id === campanhaId
          ? { ...camp, categorias: camp.categorias.filter((c) => c.id !== categoriaId) }
          : camp
      )
    );
  };

  const alternarVisibilidade = (campanhaId: string, categoriaId: string) => {
    setCampanhas(
      campanhas.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId ? { ...c, visivel: !c.visivel } : c
              ),
            }
          : camp
      )
    );
  };

  const atualizarCategoria = (campanhaId: string, categoriaId: string, updates: Partial<Categoria>) => {
    setCampanhas(
      campanhas.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) => (c.id === categoriaId ? { ...c, ...updates } : c)),
            }
          : camp
      )
    );
  };

  const adicionarFornecedorCategoria = (campanhaId: string, categoriaId: string) => {
    setCampanhas(
      campanhas.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      fornecedores: [
                        ...c.fornecedores,
                        { id: crypto.randomUUID(), nome: "", diretor: "", escopo: "", valor: 0, desconto: 0 },
                      ],
                    }
                  : c
              ),
            }
          : camp
      )
    );
  };

  const atualizarFornecedor = (
    campanhaId: string,
    categoriaId: string,
    fornecedorId: string,
    updates: Partial<Fornecedor>
  ) => {
    setCampanhas(
      campanhas.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      fornecedores: c.fornecedores.map((f) => (f.id === fornecedorId ? { ...f, ...updates } : f)),
                    }
                  : c
              ),
            }
          : camp
      )
    );
  };

  const removerFornecedor = (campanhaId: string, categoriaId: string, fornecedorId: string) => {
    setCampanhas(
      campanhas.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? { ...c, fornecedores: c.fornecedores.filter((f) => f.id !== fornecedorId) }
                  : c
              ),
            }
          : camp
      )
    );
  };

  // Funções para nova estrutura (fornecedores com fases)
  const adicionarFornecedor = () => {
    setFornecedores([
      ...fornecedores,
      {
        id: crypto.randomUUID(),
        nome: "",
        contato: "",
        fases: [],
      },
    ]);
  };

  const removerFornecedorPorFases = (fornecedorId: string) => {
    setFornecedores(fornecedores.filter((f) => f.id !== fornecedorId));
  };

  const atualizarFornecedorPorFases = (fornecedorId: string, updates: Partial<FornecedorComFases>) => {
    setFornecedores(
      fornecedores.map((f) => (f.id === fornecedorId ? { ...f, ...updates } : f))
    );
  };

  const adicionarFase = (fornecedorId: string) => {
    setFornecedores(
      fornecedores.map((f) =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: [
                ...f.fases,
                {
                  id: crypto.randomUUID(),
                  nome: `Fase ${f.fases.length + 1}`,
                  itens: [],
                },
              ],
            }
          : f
      )
    );
  };

  const removerFase = (fornecedorId: string, faseId: string) => {
    setFornecedores(
      fornecedores.map((f) =>
        f.id === fornecedorId
          ? { ...f, fases: f.fases.filter((fase) => fase.id !== faseId) }
          : f
      )
    );
  };

  const atualizarFase = (fornecedorId: string, faseId: string, updates: Partial<Fase>) => {
    setFornecedores(
      fornecedores.map((f) =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: f.fases.map((fase) => (fase.id === faseId ? { ...fase, ...updates } : fase)),
            }
          : f
      )
    );
  };

  const adicionarItemFase = (fornecedorId: string, faseId: string) => {
    setFornecedores(
      fornecedores.map((f) =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: f.fases.map((fase) =>
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
                          observacao: "",
                        },
                      ],
                    }
                  : fase
              ),
            }
          : f
      )
    );
  };

  const removerItemFase = (fornecedorId: string, faseId: string, itemId: string) => {
    setFornecedores(
      fornecedores.map((f) =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: f.fases.map((fase) =>
                fase.id === faseId
                  ? { ...fase, itens: fase.itens.filter((item) => item.id !== itemId) }
                  : fase
              ),
            }
          : f
      )
    );
  };

  const atualizarItemFase = (
    fornecedorId: string,
    faseId: string,
    itemId: string,
    updates: Partial<ItemFase>
  ) => {
    setFornecedores(
      fornecedores.map((f) =>
        f.id === fornecedorId
          ? {
              ...f,
              fases: f.fases.map((fase) =>
                fase.id === faseId
                  ? {
                      ...fase,
                      itens: fase.itens.map((item) =>
                        item.id === itemId ? { ...item, ...updates } : item
                      ),
                    }
                  : fase
              ),
            }
          : f
      )
    );
  };

  const calcularSubtotalCategoria = useCallback((categoria: Categoria) => {
    if (categoria.modoPreco === "fechado") {
      if (categoria.fornecedores.length === 0) return 0;
      const maisBarato = categoria.fornecedores.reduce((min, f) => {
        const valor = f.valor - f.desconto;
        const minValor = min.valor - min.desconto;
        return valor < minValor ? f : min;
      });
      return maisBarato.valor - maisBarato.desconto;
    } else {
      return categoria.itens.reduce((sum, item) => {
        const subtotal = item.quantidade * item.valorUnitario - item.desconto;
        return sum + subtotal;
      }, 0);
    }
  }, []);

  const getMaisBarato = (categoria: Categoria): Fornecedor | null => {
    if (categoria.fornecedores.length === 0) return null;
    return categoria.fornecedores.reduce((min, f) => {
      const valor = f.valor - f.desconto;
      const minValor = min.valor - min.desconto;
      return valor < minValor ? f : min;
    });
  };

  const calcularTotalCampanha = useCallback(
    (campanha: Campanha) => {
      return campanha.categorias
        .filter((c) => c.visivel)
        .reduce((sum, c) => sum + calcularSubtotalCategoria(c), 0);
    },
    [calcularSubtotalCategoria]
  );

  const totalGeral = estrutura === "categorias"
    ? campanhas.reduce((sum, camp) => sum + calcularTotalCampanha(camp), 0)
    : fornecedores.reduce((sum, forn) => {
        const totalFornecedor = forn.fases.reduce((faseSum, fase) => {
          return faseSum + fase.itens.reduce((itemSum, item) => itemSum + item.valor, 0);
        }, 0);
        return sum + totalFornecedor;
      }, 0);

  const handleSalvar = useCallback(async () => {
    if (!cliente || !produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cliente,
        produto,
        job,
        observacoes,
        numCampanhas,
        combinarModo,
        estrutura,
        campanhas: estrutura === "categorias" ? campanhas.map((camp) => ({
          nome: camp.nome,
          categorias: camp.categorias.map((c) => ({
            nome: c.nome,
            visivel: c.visivel,
            modoPreco: c.modoPreco,
            observacao: c.observacao,
            fornecedores: c.fornecedores,
            itens: c.itens,
          })),
        })) : [],
        fornecedores: estrutura === "fornecedores" ? fornecedores.map((f) => ({
          id: f.id,
          nome: f.nome,
          contato: f.contato,
          fases: f.fases.map((fase) => ({
            id: fase.id,
            nome: fase.nome,
            itens: fase.itens.map((item) => ({
              id: item.id,
              nome: item.nome,
              valor: item.valor,
              prazo: item.prazo,
              observacao: item.observacao,
            })),
          })),
        })) : [],
      };

      if (budgetId && versionId) {
        const { error } = await supabase
          .from("versions")
          .update({ payload: payload as any, total_geral: totalGeral })
          .eq("id", versionId);

        if (error) throw error;
        toast({ title: "Orçamento atualizado!" });
      } else {
        const { data: budgetData, error: budgetError } = await supabase
          .from("budgets")
          .insert({ type: "filme", status: "rascunho" })
          .select()
          .single();

        if (budgetError) throw budgetError;

        const { error: versionError } = await supabase
          .from("versions")
          .insert([{ budget_id: budgetData.id, versao: 1, payload: payload as any, total_geral: totalGeral }])
          .select()
          .single();

        if (versionError) throw versionError;

        toast({ title: "Orçamento salvo com sucesso!" });
        if (onSaveSuccess) onSaveSuccess(budgetData.id);
      }
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [cliente, produto, job, observacoes, numCampanhas, combinarModo, estrutura, campanhas, fornecedores, budgetId, versionId, totalGeral, onSaveSuccess]);

  // Listen for save event from Edit page
  useEffect(() => {
    const handleSaveEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { budgetId: eventBudgetId, versionId: eventVersionId } = customEvent.detail || {};
      
      // Only save if the event is for this budget
      if (budgetId && eventBudgetId === budgetId && versionId === eventVersionId) {
        handleSalvar();
      }
    };

    window.addEventListener("budget:save", handleSaveEvent);
    return () => window.removeEventListener("budget:save", handleSaveEvent);
  }, [budgetId, versionId, handleSalvar]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="space-y-6">
      <CampaignModeDialog
        open={showCampaignModeDialog}
        onOpenChange={setShowCampaignModeDialog}
        onConfirm={(mode) => setCombinarModo(mode)}
        currentMode={combinarModo}
      />
      {/* Cliente & Produto */}
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <Label>Cliente *</Label>
              <Input value={cliente} onChange={(e) => setCliente(e.target.value)} required />
            </div>
            <div>
              <Label>Produto *</Label>
              <Input value={produto} onChange={(e) => setProduto(e.target.value)} required />
            </div>
            <div>
              <Label>Job</Label>
              <Input value={job} onChange={(e) => setJob(e.target.value)} />
            </div>
            <div>
              <Label>Estrutura</Label>
              <Select value={estrutura} onValueChange={(v: any) => setEstrutura(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="categorias">Categorias (padrão)</SelectItem>
                  <SelectItem value="fornecedores">Fornecedores → Fases</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {estrutura === "categorias" && (
              <div>
                <Label>Nº de Campanhas</Label>
                <Select value={numCampanhas.toString()} onValueChange={(v) => setNumCampanhas(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n === 1 ? "Campanha" : "Campanhas"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modo de Combinação (visível quando 2+ campanhas e estrutura de categorias) */}
      {estrutura === "categorias" && numCampanhas >= 2 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Como apresentar as campanhas?</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCampaignModeDialog(true)}
              >
                Alterar Modo
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${combinarModo === "somar" ? "bg-primary" : "bg-muted"}`} />
                <span className={combinarModo === "somar" ? "font-semibold" : "text-muted-foreground"}>
                  Somar (consolidado)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${combinarModo === "separado" ? "bg-primary" : "bg-muted"}`} />
                <span className={combinarModo === "separado" ? "font-semibold" : "text-muted-foreground"}>
                  Separado (individual)
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {combinarModo === "somar"
                ? "Subtotais por campanha + honorário aplicado no consolidado"
                : "Cada campanha com seu total individual + honorário por campanha"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Campanhas (estrutura antiga) */}
      {estrutura === "categorias" && campanhas.map((campanha, campIdx) => (
        <Card key={campanha.id} className="border-2 border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center justify-between">
              <Input
                value={campanha.nome}
                onChange={(e) =>
                  setCampanhas(
                    campanhas.map((c) => (c.id === campanha.id ? { ...c, nome: e.target.value } : c))
                  )
                }
                className="text-lg font-semibold bg-transparent border-0 focus-visible:ring-0 px-0"
              />
              <span className="text-sm text-muted-foreground">
                Total: {formatCurrency(calcularTotalCampanha(campanha))}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Gerenciador de Categorias */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gerenciador de Categorias</CardTitle>
                  <Select onValueChange={(v) => v && adicionarCategoria(campanha.id, v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="+ Adicionar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_SUGERIDAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {campanha.categorias.map((cat) => (
                    <div
                      key={cat.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                        cat.visivel ? "bg-primary/10 border-primary/30" : "bg-muted border-border"
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{cat.nome}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => alternarVisibilidade(campanha.id, cat.id)}
                      >
                        {cat.visivel ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </Button>
                      {cat.podeExcluir && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removerCategoria(campanha.id, cat.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Categorias */}
            <div className="space-y-6">
              {campanha.categorias
                .filter((c) => c.visivel)
                .map((cat) => {
                  const maisBarato = getMaisBarato(cat);
                  return (
                    <Card key={cat.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{cat.nome}</CardTitle>
                          <Select
                            value={cat.modoPreco}
                            onValueChange={(v: any) =>
                              atualizarCategoria(campanha.id, cat.id, { modoPreco: v })
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fechado">Valor Fechado</SelectItem>
                              <SelectItem value="itens">Por Itens</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Observação da Categoria (opcional)</Label>
                          <Textarea
                            value={cat.observacao || ""}
                            onChange={(e) =>
                              atualizarCategoria(campanha.id, cat.id, { observacao: e.target.value })
                            }
                            rows={2}
                          />
                        </div>

                        {cat.modoPreco === "fechado" && (
                          <>
                            <div className="flex items-center justify-between">
                              <Label>Fornecedores/Cotações</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => adicionarFornecedorCategoria(campanha.id, cat.id)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {cat.fornecedores.map((forn) => {
                                const valorFinal = forn.valor - forn.desconto;
                                const isMaisBarato = maisBarato?.id === forn.id;

                                return (
                                  <div
                                    key={forn.id}
                                    className={`border rounded-xl p-3 space-y-2 ${
                                      isMaisBarato ? "border-success bg-success/5 ring-2 ring-success/20" : "border-border"
                                    }`}
                                  >
                                    {isMaisBarato && (
                                      <div className="flex items-center gap-2 text-xs font-semibold text-success mb-2">
                                        <Star className="h-4 w-4 fill-current" />
                                        SUGESTÃO - MAIS BARATO
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        placeholder="Fornecedor"
                                        value={forn.nome}
                                        onChange={(e) =>
                                          atualizarFornecedor(campanha.id, cat.id, forn.id, {
                                            nome: e.target.value,
                                          })
                                        }
                                      />
                                      <Input
                                        placeholder="Valor (R$)"
                                        type="number"
                                        value={forn.valor || ""}
                                        onChange={(e) =>
                                          atualizarFornecedor(campanha.id, cat.id, forn.id, {
                                            valor: parseFloat(e.target.value) || 0,
                                          })
                                        }
                                      />
                                    </div>
                                    <Textarea
                                      placeholder="Escopo"
                                      value={forn.escopo}
                                      onChange={(e) =>
                                        atualizarFornecedor(campanha.id, cat.id, forn.id, {
                                          escopo: e.target.value,
                                        })
                                      }
                                      rows={2}
                                    />
                                    <div className="flex items-center gap-2">
                                      <Input
                                        placeholder="Desconto (R$)"
                                        type="number"
                                        value={forn.desconto || ""}
                                        onChange={(e) =>
                                          atualizarFornecedor(campanha.id, cat.id, forn.id, {
                                            desconto: parseFloat(e.target.value) || 0,
                                          })
                                        }
                                      />
                                      <span className="text-sm font-medium whitespace-nowrap">
                                        = {formatCurrency(valorFinal)}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removerFornecedor(campanha.id, cat.id, forn.id)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        <div className="pt-2 border-t">
                          <div className="flex justify-between font-semibold">
                            <span>Subtotal {cat.nome}:</span>
                            <span>{formatCurrency(calcularSubtotalCategoria(cat))}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Fornecedores com Fases (nova estrutura) */}
      {estrutura === "fornecedores" && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-primary/5">
            <div className="flex items-center justify-between">
              <CardTitle>Fornecedores e Fases</CardTitle>
              <Button onClick={adicionarFornecedor} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Fornecedor
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {fornecedores.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">Nenhum fornecedor adicionado</p>
                <p className="text-sm">Clique em "Adicionar Fornecedor" para começar</p>
              </div>
            )}

            {fornecedores.map((fornecedor) => (
              <Card key={fornecedor.id} className="border-2">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Nome do Fornecedor *</Label>
                        <Input
                          value={fornecedor.nome}
                          onChange={(e) =>
                            atualizarFornecedorPorFases(fornecedor.id, { nome: e.target.value })
                          }
                          placeholder="Ex: ESTÚDIO PÉ GRANDE"
                          className="font-semibold"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Contato (opcional)</Label>
                        <Input
                          value={fornecedor.contato || ""}
                          onChange={(e) =>
                            atualizarFornecedorPorFases(fornecedor.id, { contato: e.target.value })
                          }
                          placeholder="Email ou telefone"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive ml-4"
                      onClick={() => removerFornecedorPorFases(fornecedor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Fases</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => adicionarFase(fornecedor.id)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Fase
                    </Button>
                  </div>

                  {fornecedor.fases.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <p>Nenhuma fase adicionada. Clique em "Adicionar Fase" para começar.</p>
                    </div>
                  )}

                  {fornecedor.fases.map((fase) => (
                    <Card key={fase.id} className="bg-background/50">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Input
                            value={fase.nome}
                            onChange={(e) =>
                              atualizarFase(fornecedor.id, fase.id, { nome: e.target.value })
                            }
                            placeholder="Nome da Fase"
                            className="font-medium text-base border-0 bg-transparent focus-visible:ring-0 px-0"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adicionarItemFase(fornecedor.id, fase.id)}
                              className="gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Item
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive h-8 w-8"
                              onClick={() => removerFase(fornecedor.id, fase.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {fase.itens.length === 0 && (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            Nenhum item. Clique em "+ Item" para adicionar.
                          </div>
                        )}

                        <div className="space-y-3">
                          {fase.itens.map((item) => (
                            <div key={item.id} className="border rounded-lg p-3 bg-card">
                              <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-4">
                                  <Label className="text-xs">Nome do Item *</Label>
                                  <Input
                                    value={item.nome}
                                    onChange={(e) =>
                                      atualizarItemFase(fornecedor.id, fase.id, item.id, {
                                        nome: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: PACOTE (MODELAGEM + 6 STILLS)"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <Label className="text-xs">Valor (R$) *</Label>
                                  <Input
                                    type="number"
                                    value={item.valor || ""}
                                    onChange={(e) =>
                                      atualizarItemFase(fornecedor.id, fase.id, item.id, {
                                        valor: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    placeholder="0,00"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-xs">Prazo</Label>
                                  <Input
                                    value={item.prazo || ""}
                                    onChange={(e) =>
                                      atualizarItemFase(fornecedor.id, fase.id, item.id, {
                                        prazo: e.target.value,
                                      })
                                    }
                                    placeholder="30 dias"
                                  />
                                </div>
                                <div className="col-span-2 flex items-end">
                                  <div className="text-sm font-semibold text-primary">
                                    {formatCurrency(item.valor)}
                                  </div>
                                </div>
                                <div className="col-span-1 flex items-end justify-end">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive h-8 w-8"
                                    onClick={() => removerItemFase(fornecedor.id, fase.id, item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-2">
                                <Label className="text-xs">Observação (opcional)</Label>
                                <Textarea
                                  value={item.observacao || ""}
                                  onChange={(e) =>
                                    atualizarItemFase(fornecedor.id, fase.id, item.id, {
                                      observacao: e.target.value,
                                    })
                                  }
                                  placeholder="Detalhes adicionais sobre este item..."
                                  rows={2}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 mt-3 border-t">
                          <div className="flex justify-between font-semibold">
                            <span>Subtotal {fase.nome}:</span>
                            <span className="text-primary">
                              {formatCurrency(
                                fase.itens.reduce((sum, item) => sum + item.valor, 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="pt-3 mt-3 border-t-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total {fornecedor.nome || "Fornecedor"}:</span>
                      <span className="text-primary">
                        {formatCurrency(
                          fornecedor.fases.reduce(
                            (sum, fase) =>
                              sum + fase.itens.reduce((itemSum, item) => itemSum + item.valor, 0),
                            0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Resumo Geral */}
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle>Resumo Geral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {estrutura === "categorias" && campanhas.map((camp, idx) => (
            <div key={camp.id} className="flex justify-between text-sm pb-2 border-b last:border-0">
              <span className="font-medium">{camp.nome}:</span>
              <span className="font-semibold">{formatCurrency(calcularTotalCampanha(camp))}</span>
            </div>
          ))}
          <div className="pt-3 border-t-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Total Geral Sugerido:</span>
              <span className="text-primary">{formatCurrency(totalGeral)}</span>
            </div>
          </div>
          <Button onClick={handleSalvar} disabled={saving} className="w-full mt-4">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      {/* Observações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Observações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
            placeholder="Observações gerais do orçamento..."
          />
        </CardContent>
      </Card>

      <CampaignModeDialog
        open={showCampaignModeDialog}
        onOpenChange={setShowCampaignModeDialog}
        onConfirm={(mode) => setCombinarModo(mode)}
        currentMode={combinarModo}
      />
    </div>
  );
}
