import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Copy, FileText, Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* ============================ Types ============================ */

interface Fornecedor {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  desconto: number;
  link?: string;
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

/* ============================ Consts ============================ */

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

/* ============================ Component ============================ */

export default function OrcamentosNovo() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Dados do orçamento
  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [job, setJob] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Campanhas (começa vazio; o wizard cria)
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);

  /* ============================ Wizard state ============================ */
  const [wizardOpen, setWizardOpen] = useState(true);
  const [wizardTotalStr, setWizardTotalStr] = useState<string>("");
  const [wizardStep, setWizardStep] = useState<"total" | "campanha">("total");

  // campos da campanha atual no wizard
  const [wizNome, setWizNome] = useState<string>("Campanha 1");
  const [wizQtdFilme, setWizQtdFilme] = useState<string>("2");
  const [wizQtdAudio, setWizQtdAudio] = useState<string>("2");

  const [wizardTotal, setWizardTotal] = useState<number>(0);
  const [wizardIndex, setWizardIndex] = useState<number>(0);

  useEffect(() => {
    // ao entrar, foca no wizard
    setWizardOpen(true);
    setWizardStep("total");
  }, []);

  const parseIntSafe = (s: string) => {
    const n = Math.max(0, Math.floor(Number(s || "0")));
    return Number.isFinite(n) ? n : 0;
  };

  const startWizard = () => {
    const total = parseIntSafe(wizardTotalStr);
    if (!total || total < 1) {
      toast({ title: "Informe um número válido de campanhas (>=1)", variant: "destructive" });
      return;
    }
    setWizardTotal(total);
    setWizardIndex(0);
    setWizNome(`Campanha 1`);
    setWizQtdFilme(total > 1 ? "2" : "1"); // sugestão
    setWizQtdAudio(total > 1 ? "2" : "1"); // sugestão
    setWizardStep("campanha");
  };

  const addCampaignFromWizard = (nome: string, qtdFilme: number, qtdAudio: number) => {
    const nova: Campanha = {
      id: crypto.randomUUID(),
      nome,
      categorias: CATEGORIAS_BASE.map((c, idx) => {
        let fornecedores: Fornecedor[] = [];
        if (c.nome === "Filme") {
          fornecedores = Array.from({ length: Math.max(0, qtdFilme) }).map(() => ({
            id: crypto.randomUUID(),
            nome: "",
            descricao: "",
            valor: 0,
            desconto: 0,
          }));
        }
        if (c.nome === "Áudio") {
          fornecedores = Array.from({ length: Math.max(0, qtdAudio) }).map(() => ({
            id: crypto.randomUUID(),
            nome: "",
            descricao: "",
            valor: 0,
            desconto: 0,
          }));
        }
        return {
          id: crypto.randomUUID(),
          nome: c.nome,
          ordem: idx,
          visivel: true,
          podeExcluir: c.podeExcluir,
          modoPreco: "fechado",
          fornecedores,
          itens: [],
        };
      }),
    };
    setCampanhas((prev) => [...prev, nova]);
  };

  const nextCampaignInWizard = () => {
    const qtdF = parseIntSafe(wizQtdFilme);
    const qtdA = parseIntSafe(wizQtdAudio);
    const nome = (wizNome || "").trim() || `Campanha ${wizardIndex + 1}`;

    addCampaignFromWizard(nome, qtdF, qtdA);

    const nextIndex = wizardIndex + 1;
    if (nextIndex >= wizardTotal) {
      setWizardOpen(false);
      return;
    }

    setWizardIndex(nextIndex);
    setWizNome(`Campanha ${nextIndex + 1}`);
    setWizQtdFilme("2");
    setWizQtdAudio("2");
  };

  /* ============================ Mutators padrão ============================ */
  const atualizarNomeCampanha = (id: string, nome: string) => {
    setCampanhas((prev) => prev.map((c) => (c.id === id ? { ...c, nome } : c)));
  };

  const adicionarCampanha = () => {
    const nome = `Campanha ${campanhas.length + 1}`;
    const nova: Campanha = {
      id: crypto.randomUUID(),
      nome,
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
    };
    setCampanhas((prev) => [...prev, nova]);
    toast({ title: `Nova campanha adicionada` });
  };

  const removerCampanha = (id: string) => {
    setCampanhas((prev) => {
      if (prev.length === 1) {
        toast({ title: "É necessário pelo menos uma campanha", variant: "destructive" });
        return prev;
      }
      return prev.filter((c) => c.id !== id);
    });
  };

  const adicionarCategoria = (campanhaId: string, nome: string) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
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
          : camp,
      ),
    );
    toast({ title: `Categoria "${nome}" adicionada` });
  };

  const removerCategoria = (campanhaId: string, categoriaId: string) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId ? { ...camp, categorias: camp.categorias.filter((c) => c.id !== categoriaId) } : camp,
      ),
    );
  };

  const alternarVisibilidade = (campanhaId: string, categoriaId: string) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) => (c.id === categoriaId ? { ...c, visivel: !c.visivel } : c)),
            }
          : camp,
      ),
    );
  };

  const atualizarCategoria = (campanhaId: string, categoriaId: string, updates: Partial<Categoria>) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) => (c.id === categoriaId ? { ...c, ...updates } : c)),
            }
          : camp,
      ),
    );
  };

  const adicionarFornecedor = (campanhaId: string, categoriaId: string) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      fornecedores: [
                        ...c.fornecedores,
                        { id: crypto.randomUUID(), nome: "", descricao: "", valor: 0, desconto: 0 },
                      ],
                    }
                  : c,
              ),
            }
          : camp,
      ),
    );
  };

  const atualizarFornecedor = (
    campanhaId: string,
    categoriaId: string,
    fornecedorId: string,
    updates: Partial<Fornecedor>,
  ) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      fornecedores: c.fornecedores.map((f) => (f.id === fornecedorId ? { ...f, ...updates } : f)),
                    }
                  : c,
              ),
            }
          : camp,
      ),
    );
  };

  const removerFornecedor = (campanhaId: string, categoriaId: string, fornecedorId: string) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId ? { ...c, fornecedores: c.fornecedores.filter((f) => f.id !== fornecedorId) } : c,
              ),
            }
          : camp,
      ),
    );
  };

  const adicionarItem = (campanhaId: string, categoriaId: string) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      itens: [
                        ...c.itens,
                        { id: crypto.randomUUID(), unidade: "", quantidade: 1, valorUnitario: 0, desconto: 0 },
                      ],
                    }
                  : c,
              ),
            }
          : camp,
      ),
    );
  };

  const atualizarItem = (campanhaId: string, categoriaId: string, itemId: string, updates: Partial<ItemPreco>) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? { ...c, itens: c.itens.map((it) => (it.id === itemId ? { ...it, ...updates } : it)) }
                  : c,
              ),
            }
          : camp,
      ),
    );
  };

  const removerItem = (campanhaId: string, categoriaId: string, itemId: string) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId ? { ...c, itens: c.itens.filter((it) => it.id !== itemId) } : c,
              ),
            }
          : camp,
      ),
    );
  };

  /* ============================ Cálculo / Combinações ============================ */

  const finalDe = (f: Fornecedor) => (Number(f.valor) || 0) - (Number(f.desconto) || 0);

  const getCategoriaByName = (camp: Campanha, nome: string) =>
    camp.categorias.find((c) => c.nome.toLowerCase() === nome.toLowerCase()) || null;

  const cheapestFornecedor = (categoria: Categoria | null) => {
    if (!categoria || categoria.modoPreco !== "fechado" || categoria.fornecedores.length === 0) return null;
    const f = categoria.fornecedores.reduce((min, cur) => (finalDe(cur) < finalDe(min) ? cur : min));
    return f;
  };

  const bestFilmAudioCombo = (camp: Campanha) => {
    const catFilme = getCategoriaByName(camp, "Filme");
    const catAudio = getCategoriaByName(camp, "Áudio");
    const fFilm = cheapestFornecedor(catFilme);
    const fAudio = cheapestFornecedor(catAudio);
    if (!fFilm || !fAudio) {
      return { film: fFilm || null, audio: fAudio || null, sum: null as number | null };
    }
    return { film: fFilm, audio: fAudio, sum: finalDe(fFilm) + finalDe(fAudio) };
  };

  const calcularSubtotalCategoria = useCallback((categoria: Categoria) => {
    if (categoria.modoPreco === "fechado") {
      const cheap = cheapestFornecedor(categoria);
      return cheap ? finalDe(cheap) : 0;
    } else {
      return categoria.itens.reduce((sum, item) => {
        const subtotal =
          (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0) - (Number(item.desconto) || 0);
        return sum + subtotal;
      }, 0);
    }
  }, []);

  const calcularSubtotalCampanha = useCallback(
    (campanha: Campanha) =>
      campanha.categorias.filter((c) => c.visivel).reduce((sum, c) => sum + calcularSubtotalCategoria(c), 0),
    [calcularSubtotalCategoria],
  );

  const totalGeral = useMemo(
    () => campanhas.reduce((sum, camp) => sum + calcularSubtotalCampanha(camp), 0),
    [campanhas, calcularSubtotalCampanha],
  );

  const combosOrdenados = useMemo(() => {
    const combos = campanhas.map((camp) => {
      const combo = bestFilmAudioCombo(camp);
      return {
        campId: camp.id,
        campNome: camp.nome,
        combo,
      };
    });
    // Ordena por soma (nulos vão ao fim)
    return combos.sort((a, b) => {
      if (a.combo.sum == null && b.combo.sum == null) return 0;
      if (a.combo.sum == null) return 1;
      if (b.combo.sum == null) return -1;
      return a.combo.sum - b.combo.sum;
    });
  }, [campanhas]);

  /* ============================ Save ============================ */

  const handleSalvar = async () => {
    if (!cliente || !produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" });
      return;
    }

    if (campanhas.length === 0) {
      toast({ title: "Finalize o lançamento das campanhas no assistente", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cliente,
        produto,
        job,
        observacoes,
        campanhas: campanhas.map((camp) => ({
          nome: camp.nome,
          categorias: camp.categorias.map((c) => ({
            nome: c.nome,
            visivel: c.visivel,
            modoPreco: c.modoPreco,
            observacao: c.observacao,
            fornecedores: c.fornecedores,
            itens: c.itens,
          })),
        })),
      };

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
      navigate(`/budget/${budgetData.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ============================ Helpers ============================ */

  const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

  /* ============================ Render ============================ */

  return (
    <AppLayout>
      {/* WIZARD OVERLAY */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-6">
            {wizardStep === "total" && (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Lançar campanhas</h2>
                  <p className="text-sm text-muted-foreground">Quantas campanhas você deseja lançar agora?</p>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label>Quantidade de campanhas</Label>
                    <Input
                      inputMode="numeric"
                      value={wizardTotalStr}
                      onChange={(e) => setWizardTotalStr(e.target.value)}
                      placeholder="Ex.: 2"
                    />
                  </div>
                  <Button className="mt-6" onClick={startWizard}>
                    Continuar
                  </Button>
                </div>
              </>
            )}

            {wizardStep === "campanha" && (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">
                    Campanha {wizardIndex + 1} de {wizardTotal}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Informe o nome e quantas produtoras deseja para <span className="font-medium">Filme</span> e{" "}
                    <span className="font-medium">Áudio</span>. Abrirei os campos automaticamente.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Nome da campanha</Label>
                    <Input value={wizNome} onChange={(e) => setWizNome(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>
                        Produtoras de <strong>Filme</strong>
                      </Label>
                      <Input inputMode="numeric" value={wizQtdFilme} onChange={(e) => setWizQtdFilme(e.target.value)} />
                    </div>
                    <div>
                      <Label>
                        Produtoras de <strong>Áudio</strong>
                      </Label>
                      <Input inputMode="numeric" value={wizQtdAudio} onChange={(e) => setWizQtdAudio(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <div className="text-xs text-muted-foreground">
                    Os campos aparecerão na tela de orçamento logo abaixo.
                  </div>
                  <Button onClick={nextCampaignInWizard}>
                    {wizardIndex + 1 === wizardTotal ? "Concluir" : "Adicionar e continuar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-8 font-semibold">Novo Orçamento</h1>
              <p className="text-muted-foreground">
                Preencha os dados. Use o assistente para lançar campanhas e produtoras.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast({ title: "Em breve" })} className="gap-2">
              <Copy className="h-4 w-4" />
              Duplicar
            </Button>
            <Button variant="outline" onClick={() => navigate("/orcamentos/tabela")} className="gap-2">
              <FileText className="h-4 w-4" />
              Exportar p/ BYD
            </Button>
            <Button onClick={handleSalvar} disabled={saving || campanhas.length === 0} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Identificação */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Identificação</CardTitle>
              <span className="text-xs text-muted-foreground">Use nomes completos e período em mm/aaaa</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Campanhas */}
        {campanhas.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Campanhas</CardTitle>
                <Button onClick={adicionarCampanha} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Campanha
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {campanhas.map((camp) => (
                  <div
                    key={camp.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-primary/10 border-primary/30"
                  >
                    <Input
                      value={camp.nome}
                      onChange={(e) => atualizarNomeCampanha(camp.id, e.target.value)}
                      className="h-7 w-44 text-sm font-medium"
                    />
                    {campanhas.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removerCampanha(camp.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Colunas */}
        <div className="grid grid-cols-[1fr_320px] gap-6">
          <div className="space-y-8">
            {campanhas.map((campanha) => {
              const categoriasVisiveis = campanha.categorias.filter((c) => c.visivel);
              const idCamp = campanha.id;

              const combo = bestFilmAudioCombo(campanha);
              const comboTexto =
                combo.sum == null
                  ? "Aguardando cotações de Filme e Áudio"
                  : `${combo.film?.nome || "Filme"} + ${combo.audio?.nome || "Áudio"} = ${brl(combo.sum)}`;

              return (
                <div key={idCamp} className="space-y-4">
                  {/* Cabeçalho da Campanha */}
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border-2 border-primary/20">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">{campanha.nome}</h2>
                      <div className="text-xs text-muted-foreground">
                        Melhor combinação (Filme + Áudio): {comboTexto}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">{brl(calcularSubtotalCampanha(campanha))}</div>
                  </div>

                  {/* Gerenciador de Categorias */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Gerenciador de Categorias</CardTitle>
                        <Select
                          onValueChange={(v) => {
                            if (!v) return;
                            if (v === "__custom__") {
                              const nome = window.prompt("Nome da categoria personalizada:");
                              if (nome && nome.trim()) adicionarCategoria(idCamp, nome.trim());
                              return;
                            }
                            adicionarCategoria(idCamp, v);
                          }}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="+ Adicionar categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIAS_SUGERIDAS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__">✏️ Personalizada...</SelectItem>
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
                            title={cat.visivel ? "Visível" : "Oculta"}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{cat.nome}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => alternarVisibilidade(idCamp, cat.id)}
                            >
                              {cat.visivel ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                            {cat.podeExcluir && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removerCategoria(idCamp, cat.id)}
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
                  <div className="space-y-4">
                    {categoriasVisiveis.map((cat) => {
                      const idMaisBarata =
                        cat.modoPreco === "fechado" && cat.fornecedores.length
                          ? cat.fornecedores.reduce((min, f) => (finalDe(f) < finalDe(min) ? f : min)).id
                          : null;

                      return (
                        <Card key={cat.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>{cat.nome}</CardTitle>
                              <Select
                                value={cat.modoPreco}
                                onValueChange={(v: any) => atualizarCategoria(idCamp, cat.id, { modoPreco: v })}
                              >
                                <SelectTrigger className="w-[170px]">
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
                                onChange={(e) => atualizarCategoria(idCamp, cat.id, { observacao: e.target.value })}
                                rows={2}
                                placeholder="Ex.: período, premissas, limitações..."
                              />
                            </div>

                            {cat.modoPreco === "fechado" ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <Label>Fornecedores/Cotações</Label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => adicionarFornecedor(idCamp, cat.id)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar
                                  </Button>
                                </div>

                                <div className="space-y-3">
                                  {cat.fornecedores.map((forn) => {
                                    const valorFinal = finalDe(forn);
                                    const isCheapest = idMaisBarata === forn.id;

                                    return (
                                      <div
                                        key={forn.id}
                                        className={`border rounded-xl p-3 space-y-2 ${
                                          isCheapest ? "border-green-500 bg-green-500/5" : "border-border"
                                        }`}
                                      >
                                        {isCheapest && (
                                          <div className="text-xs font-semibold text-green-600 mb-2">
                                            ⭐ Mais barata considerada no subtotal
                                          </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                          <Input
                                            placeholder="Fornecedor"
                                            value={forn.nome}
                                            onChange={(e) =>
                                              atualizarFornecedor(idCamp, cat.id, forn.id, { nome: e.target.value })
                                            }
                                          />
                                          <Input
                                            placeholder="Valor (R$)"
                                            type="number"
                                            value={forn.valor ?? 0}
                                            onChange={(e) =>
                                              atualizarFornecedor(idCamp, cat.id, forn.id, {
                                                valor: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                        </div>
                                        <Textarea
                                          placeholder="Descrição/Escopo"
                                          value={forn.descricao}
                                          onChange={(e) =>
                                            atualizarFornecedor(idCamp, cat.id, forn.id, { descricao: e.target.value })
                                          }
                                          rows={2}
                                        />
                                        <div className="flex items-center gap-2">
                                          <Input
                                            placeholder="Desconto (R$)"
                                            type="number"
                                            value={forn.desconto ?? 0}
                                            onChange={(e) =>
                                              atualizarFornecedor(idCamp, cat.id, forn.id, {
                                                desconto: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <span className="text-sm font-medium whitespace-nowrap">
                                            = {brl(valorFinal)}
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removerFornecedor(idCamp, cat.id, forn.id)}
                                            className="text-destructive"
                                            title="Remover fornecedor"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <Label>Itens</Label>
                                  <Button size="sm" variant="outline" onClick={() => adicionarItem(idCamp, cat.id)}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar
                                  </Button>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                  Total = Σ(Qtd × Valor unit.) − Descontos
                                </div>

                                <div className="space-y-3">
                                  {cat.itens.map((item) => {
                                    const subtotal =
                                      (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0) -
                                      (Number(item.desconto) || 0);

                                    return (
                                      <div key={item.id} className="border rounded-xl p-3 space-y-2">
                                        <div className="grid grid-cols-5 gap-2">
                                          <Input
                                            placeholder="Unidade"
                                            value={item.unidade}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, { unidade: e.target.value })
                                            }
                                          />
                                          <Input
                                            placeholder="Qtd"
                                            type="number"
                                            value={item.quantidade}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, {
                                                quantidade: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <Input
                                            placeholder="Valor unit."
                                            type="number"
                                            value={item.valorUnitario}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, {
                                                valorUnitario: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <Input
                                            placeholder="Desconto"
                                            type="number"
                                            value={item.desconto}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, {
                                                desconto: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <div className="flex items-center justify-end">
                                            <span className="text-sm">Subtotal: {brl(subtotal)}</span>
                                          </div>
                                        </div>
                                        <Textarea
                                          placeholder="Observação do item (opcional)"
                                          value={item.observacao || ""}
                                          onChange={(e) =>
                                            atualizarItem(idCamp, cat.id, item.id, {
                                              observacao: e.target.value,
                                            })
                                          }
                                          rows={2}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}

                            <div className="pt-3 border-t flex justify-between items-center">
                              <span className="font-semibold">Subtotal</span>
                              <span className="text-lg font-bold text-primary">
                                {brl(calcularSubtotalCategoria(cat))}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Observações gerais */}
            {campanhas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={4}
                    placeholder="Adicione observações gerais do orçamento..."
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resumo (Direita) */}
          <div className="sticky top-8 h-fit space-y-4">
            {campanhas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumo por Campanha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {campanhas.map((campanha) => {
                    const categoriasVisiveis = campanha.categorias.filter((c) => c.visivel);
                    const subtotalCampanha = calcularSubtotalCampanha(campanha);
                    const combo = bestFilmAudioCombo(campanha);

                    return (
                      <div key={campanha.id} className="space-y-2">
                        <div className="font-semibold text-primary pb-2 border-b">{campanha.nome}</div>
                        {categoriasVisiveis.map((cat) => (
                          <div key={cat.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{cat.nome}</span>
                            <span className="font-medium">{brl(calcularSubtotalCategoria(cat))}</span>
                          </div>
                        ))}

                        {/* Melhor combinação Filme + Áudio */}
                        <div className="text-xs mt-1">
                          <span className="font-medium">Melhor Combinação: </span>
                          {combo.sum == null ? (
                            <span className="text-muted-foreground">Aguardando cotações</span>
                          ) : (
                            <span>
                              {combo.film?.nome || "Filme"} + {combo.audio?.nome || "Áudio"} ={" "}
                              <span className="font-semibold">{brl(combo.sum)}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                          <span>Subtotal {campanha.nome}</span>
                          <span className="text-primary">{brl(subtotalCampanha)}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Geral</span>
                      <span className="text-2xl font-bold text-primary">{brl(totalGeral)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ranking das campanhas por combinação Filme+Áudio */}
            {campanhas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Campanhas — Soma das mais baratas (Filme + Áudio)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {combosOrdenados.map(({ campId, campNome, combo }, idx) => (
                    <div
                      key={campId}
                      className={`flex justify-between items-center text-sm px-2 py-1.5 rounded ${
                        idx === 0 && combo.sum != null ? "bg-green-500/10" : "bg-muted/40"
                      }`}
                      title={
                        combo.sum == null
                          ? "Complete as cotações de Filme e Áudio para calcular"
                          : "Soma do mais barato de Filme com o mais barato de Áudio"
                      }
                    >
                      <span className="font-medium">{campNome}</span>
                      <span className="font-semibold">{combo.sum == null ? "—" : brl(combo.sum)}</span>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground">
                    Critério: melhor soma = (menor Filme) + (menor Áudio).
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
