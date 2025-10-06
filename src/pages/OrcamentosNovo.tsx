import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Copy, FileText, Plus, Trash2, GripVertical, Eye, EyeOff, Printer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

export default function OrcamentosNovo() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Dados do orçamento
  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [job, setJob] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Prévia/PDF
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Campanhas
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

  const adicionarCampanha = () => {
    setCampanhas((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: `Campanha ${prev.length + 1}`,
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
  const atualizarNomeCampanha = (id: string, nome: string) => {
    setCampanhas((prev) => prev.map((c) => (c.id === id ? { ...c, nome } : c)));
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

  const finalDe = (f: Fornecedor) => (f.valor || 0) - (f.desconto || 0);
  const fornecedorMaisBaratoId = (fornecedores: Fornecedor[]) => {
    if (fornecedores.length === 0) return null;
    return fornecedores.reduce((min, f) => (finalDe(f) < finalDe(min) ? f : min)).id;
  };

  const calcularSubtotalCategoria = useCallback((categoria: Categoria) => {
    if (categoria.modoPreco === "fechado") {
      if (categoria.fornecedores.length === 0) return 0;
      const idMaisBarata = fornecedorMaisBaratoId(categoria.fornecedores);
      const escolhida = categoria.fornecedores.find((f) => f.id === idMaisBarata)!;
      return finalDe(escolhida);
    }
    return categoria.itens.reduce((sum, item) => {
      const subtotal =
        (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0) - (Number(item.desconto) || 0);
      return sum + subtotal;
    }, 0);
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

  // ---------- Salvar ----------
  const handleSalvar = async () => {
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

  // ---------- Prévia / Print ----------
  const handleAbrirPreview = () => {
    if (!cliente || !produto) {
      toast({ title: "Preencha cliente e produto antes de gerar PDF", variant: "destructive" });
      return;
    }
    setMostrarPreview(true);
  };
  useEffect(() => {
    const onAfterPrint = () => setMostrarPreview(false);
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  // compactadores
  const collapseLongText = (rootEl: HTMLElement, selectors: string[], maxChars: number) => {
    selectors.forEach((sel) => {
      rootEl.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        const t = el.innerText.trim();
        if (t.length > maxChars) el.innerText = t.slice(0, maxChars - 1) + "…";
      });
    });
  };
  const limitRows = (rootEl: HTMLElement, selector: string, max: number) => {
    const nodes = Array.from(rootEl.querySelectorAll<HTMLElement>(selector));
    nodes.forEach((el, idx) => {
      if (idx >= max) el.style.display = "none";
    });
  };
  const fitToTwoPages = (rootEl: HTMLElement) => {
    // Considera preview ~A4 (794x1123 @96dpi)
    const PAGE = 1122; // px
    const limit = 2 * PAGE;

    const steps: Array<() => void> = [
      () => rootEl.classList.add("tight", "table-compact"),
      () => collapseLongText(rootEl, [".js-escopo", ".js-tratamento", ".js-obs"], 180),
      () => limitRows(rootEl, ".js-lista-fornecedores > .js-forn", 3),
      () => limitRows(rootEl, ".js-lista-itens > .js-item", 5),
      () => rootEl.classList.add("smaller-font"), // 9.5px
    ];
    let i = 0;
    while (rootEl.scrollHeight > limit && i < steps.length) steps[i++]();

    // fallback final: escala proporcional para caber em 2 páginas
    if (rootEl.scrollHeight > limit) {
      const scale = Math.max(0.8, limit / rootEl.scrollHeight); // não reduzir mais que 80%
      (rootEl.style as any).transformOrigin = "top left";
      (rootEl.style as any).transform = `scale(${scale})`;
      // Ajusta largura para manter 794px visuais
      (rootEl.style as any).width = `${794 / scale}px`;
    }
  };

  const handleImprimir = () => {
    const el = printRef.current;
    if (!el) return;
    fitToTwoPages(el);
    window.print();
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  const dataFormatada = useMemo(() => new Intl.DateTimeFormat("pt-BR").format(new Date()), []);

  return (
    <AppLayout>
      {/* PRINT STYLES — isola só o #print-root na impressão */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          /* Esconde toda a app e mostra só o print-root */
          body * { visibility: hidden !important; }
          #print-root, #print-root * { visibility: visible !important; }
          #print-root { position: absolute; left: 0; top: 0; }

          /* Remove quaisquer elementos técnicos, se existirem */
          .debug, .meta, .built-with, .version-meta, .history, .external-url { display: none !important; }

          /* Paginação e quebras */
          .orcamento { break-before: page; page-break-before: always; }
          .orcamento:first-child { break-before: auto; page-break-before: auto; }
          h2, h3, .section-title { break-after: avoid; page-break-after: avoid; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }

          /* Compactações */
          .tight p { margin: 2mm 0; }
          .table-compact td, .table-compact th { padding: 2mm 3mm; }
          .smaller-font { font-size: 9.5px; }
        }

        /* Preview visual */
        .print-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 60; }
        .print-canvas { background: white; width: 794px; max-height: 90vh; overflow: auto; border-radius: 16px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,.3); }
        .print-only { display: none; }
      `}</style>

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-8 font-semibold">Novo Orçamento</h1>
              <p className="text-muted-foreground">Preencha os dados e gere o PDF padronizado (máx. 2 páginas)</p>
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
            <Button variant="outline" onClick={handleAbrirPreview} className="gap-2">
              <Printer className="h-4 w-4" />
              Prévia / PDF
            </Button>
            <Button onClick={handleSalvar} disabled={saving} className="gap-2">
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
                    className="h-7 w-40 text-sm font-medium"
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

        {/* Colunas */}
        <div className="grid grid-cols-[1fr_320px] gap-6">
          <div className="space-y-8">
            {campanhas.map((campanha) => {
              const categoriasVisiveis = campanha.categorias.filter((c) => c.visivel);
              const idCamp = campanha.id;
              return (
                <div key={idCamp} className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border-2 border-primary/20">
                    <h2 className="text-xl font-semibold text-primary">{campanha.nome}</h2>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(calcularSubtotalCampanha(campanha))}
                    </div>
                  </div>

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
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cat.visivel ? "bg-primary/10 border-primary/30" : "bg-muted border-border"}`}
                            title={cat.visivel ? "Visível na prévia/PDF" : "Oculta na prévia/PDF"}
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
                      const idMaisBarata = fornecedorMaisBaratoId(cat.fornecedores || []);
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

                                <div className="space-y-3 js-lista-fornecedores">
                                  {cat.fornecedores.map((forn) => {
                                    const valorFinal = finalDe(forn);
                                    const isCheapest = idMaisBarata === forn.id;
                                    return (
                                      <div
                                        key={forn.id}
                                        className={`js-forn border rounded-xl p-3 space-y-2 ${isCheapest ? "border-green-500 bg-green-500/5" : "border-border"}`}
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
                                          className="js-escopo"
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
                                            = {formatCurrency(valorFinal)}
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

                                <div className="space-y-3 js-lista-itens">
                                  {cat.itens.map((item) => {
                                    const subtotal =
                                      (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0) -
                                      (Number(item.desconto) || 0);
                                    return (
                                      <div key={item.id} className="js-item border rounded-xl p-3 space-y-2">
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
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm">Subtotal: {formatCurrency(subtotal)}</span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="text-destructive"
                                              onClick={() => removerItem(idCamp, cat.id, item.id)}
                                              title="Remover item"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                        <Textarea
                                          placeholder="Observação do item (opcional)"
                                          value={item.observacao || ""}
                                          onChange={(e) =>
                                            atualizarItem(idCamp, cat.id, item.id, { observacao: e.target.value })
                                          }
                                          rows={2}
                                          className="js-obs"
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
                                {formatCurrency(calcularSubtotalCategoria(cat))}
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
                  className="js-obs"
                />
              </CardContent>
            </Card>
          </div>

          {/* Resumo */}
          <div className="sticky top-8 h-fit space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo por Campanha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {campanhas.map((campanha) => {
                  const categoriasVisiveis = campanha.categorias.filter((c) => c.visivel);
                  const subtotalCampanha = calcularSubtotalCampanha(campanha);
                  return (
                    <div key={campanha.id} className="space-y-2">
                      <div className="font-semibold text-primary pb-2 border-b">{campanha.nome}</div>
                      {categoriasVisiveis.map((cat) => (
                        <div key={cat.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{cat.nome}</span>
                          <span className="font-medium">{formatCurrency(calcularSubtotalCategoria(cat))}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                        <span>Subtotal {campanha.nome}</span>
                        <span className="text-primary">{formatCurrency(subtotalCampanha)}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Geral</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</span>
                  </div>
                </div>
                <div className="pt-4 border-t text-xs text-muted-foreground">
                  <p>• Melhor combinação por campanha</p>
                  <p>• {campanhas.length} campanha(s)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* PREVIEW / PRINT ROOT (isolado na impressão) */}
      {mostrarPreview && (
        <div className="print-overlay">
          <div className="print-canvas">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xl font-semibold">Prévia do PDF</div>
                <div className="text-xs text-muted-foreground">A4 • Máximo 2 páginas • Cabeçalho/rodapé padrão</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMostrarPreview(false)}>
                  Fechar
                </Button>
                <Button onClick={handleImprimir} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir / Salvar PDF
                </Button>
              </div>
            </div>

            {/* SÓ este nó irá para o print */}
            <div
              id="print-root"
              ref={printRef}
              className="print-only text-[10.5px] leading-[1.32]"
              style={{ width: 794 }}
            >
              <div className="orcamento">
                {/* Cabeçalho */}
                <div className="avoid-break pb-2 mb-2 border-b">
                  <div className="flex justify-between">
                    <div className="font-semibold text-[14px]">ORÇAMENTO • CONFIDENCIAL</div>
                    <div className="text-right text-[10px]">
                      <div>Data: {dataFormatada}</div>
                      <div>Validade: 7 dias</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {cliente && (
                      <>
                        Cliente: <span className="font-medium">{cliente}</span> •{" "}
                      </>
                    )}
                    {produto && (
                      <>
                        Produto: <span className="font-medium">{produto}</span> •{" "}
                      </>
                    )}
                    {job && (
                      <>
                        Job: <span className="font-medium">{job}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Corpo */}
                <div className="space-y-10">
                  {campanhas.map((campanha) => {
                    const categoriasVisiveis = campanha.categorias.filter((c) => c.visivel);
                    return (
                      <div key={campanha.id} className="avoid-break">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-[12.5px] font-semibold">{campanha.nome}</h3>
                          <div className="text-[11px] font-semibold">
                            {formatCurrency(calcularSubtotalCampanha(campanha))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {categoriasVisiveis.map((cat) => {
                            const idMaisBarata = fornecedorMaisBaratoId(cat.fornecedores || []);
                            const fornecedoresOrdenados = [...(cat.fornecedores || [])].sort(
                              (a, b) => finalDe(a) - finalDe(b),
                            );
                            const topFornecedores = fornecedoresOrdenados.slice(0, 3);

                            return (
                              <div key={cat.id} className="avoid-break">
                                <div className="flex justify-between items-center">
                                  <div className="font-medium text-[11.5px]">{cat.nome}</div>
                                  <div className="text-[11px]">{formatCurrency(calcularSubtotalCategoria(cat))}</div>
                                </div>
                                {cat.observacao && (
                                  <div className="js-tratamento text-[10px] text-muted-foreground">
                                    {cat.observacao}
                                  </div>
                                )}

                                {cat.modoPreco === "fechado" ? (
                                  <div className="mt-1 js-lista-fornecedores">
                                    {topFornecedores.length > 0 ? (
                                      <>
                                        {topFornecedores.map((f) => (
                                          <div key={f.id} className="js-forn flex justify-between text-[10.5px]">
                                            <div>
                                              <span className="font-medium">{f.nome || "Cotação"}</span>
                                              {f.descricao && (
                                                <span className="js-escopo text-muted-foreground">
                                                  {" "}
                                                  — {f.descricao}
                                                </span>
                                              )}
                                              {f.id === idMaisBarata && <span> • ⭐</span>}
                                            </div>
                                            <div className="font-medium">{formatCurrency(finalDe(f))}</div>
                                          </div>
                                        ))}
                                        {cat.fornecedores.length > 3 && (
                                          <div className="text-[10px] text-muted-foreground">
                                            +{cat.fornecedores.length - 3} no orçamento online
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-[10px] text-muted-foreground">Sem cotações adicionadas.</div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mt-1 js-lista-itens">
                                    {cat.itens.slice(0, 5).map((it) => {
                                      const subtotal =
                                        (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0) -
                                        (Number(it.desconto) || 0);
                                      return (
                                        <div key={it.id} className="js-item flex justify-between text-[10.5px]">
                                          <div>
                                            <span className="font-medium">{it.unidade || "Item"}</span>{" "}
                                            <span className="text-muted-foreground">
                                              {Number(it.quantidade) || 0} ×{" "}
                                              {formatCurrency(Number(it.valorUnitario) || 0)}
                                              {it.observacao ? ` — ${it.observacao}` : ""}
                                            </span>
                                          </div>
                                          <div className="font-medium">{formatCurrency(subtotal)}</div>
                                        </div>
                                      );
                                    })}
                                    {cat.itens.length > 5 && (
                                      <div className="text-[10px] text-muted-foreground">
                                        +{cat.itens.length - 5} no orçamento online
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {observacoes && (
                    <div className="avoid-break">
                      <div className="text-[11.5px] font-semibold mb-1">Observações</div>
                      <div className="js-obs text-[10.5px]">{observacoes}</div>
                    </div>
                  )}

                  <div className="avoid-break pt-2 border-t flex justify-between items-center">
                    <span className="text-[12px] font-semibold">Total Geral</span>
                    <span className="text-[16px] font-bold">{formatCurrency(totalGeral)}</span>
                  </div>
                </div>

                {/* Rodapé enxuto */}
                <div className="mt-4 pt-2 border-t text-[9.5px] text-muted-foreground">WF/MOTTA • CNPJ • p. 1/2*</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
