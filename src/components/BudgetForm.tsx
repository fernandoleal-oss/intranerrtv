import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
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
  const [categorias, setCategorias] = useState<Categoria[]>(
    CATEGORIAS_BASE.map((c, idx) => ({
      id: crypto.randomUUID(),
      nome: c.nome,
      ordem: idx,
      visivel: true,
      podeExcluir: c.podeExcluir,
      modoPreco: "fechado" as const,
      fornecedores: [],
      itens: [],
    }))
  );

  // Load initial data
  useEffect(() => {
    if (initialPayload) {
      const payload = typeof initialPayload === "string" ? JSON.parse(initialPayload) : initialPayload;
      setCliente(payload.cliente || "");
      setProduto(payload.produto || "");
      setJob(payload.job || "");
      setObservacoes(payload.observacoes || "");
      
      if (payload.categorias && Array.isArray(payload.categorias)) {
        setCategorias(
          payload.categorias.map((c: any, idx: number) => ({
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
          }))
        );
      }
    }
  }, [initialPayload]);

  const adicionarCategoria = (nome: string) => {
    setCategorias([
      ...categorias,
      {
        id: crypto.randomUUID(),
        nome,
        ordem: categorias.length,
        visivel: true,
        podeExcluir: true,
        modoPreco: "fechado",
        fornecedores: [],
        itens: [],
      },
    ]);
    toast({ title: `Categoria "${nome}" adicionada` });
  };

  const removerCategoria = (id: string) => {
    setCategorias(categorias.filter((c) => c.id !== id));
  };

  const alternarVisibilidade = (id: string) => {
    setCategorias(categorias.map((c) => (c.id === id ? { ...c, visivel: !c.visivel } : c)));
  };

  const atualizarCategoria = (id: string, updates: Partial<Categoria>) => {
    setCategorias(categorias.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const adicionarFornecedor = (categoriaId: string) => {
    setCategorias(
      categorias.map((c) =>
        c.id === categoriaId
          ? {
              ...c,
              fornecedores: [
                ...c.fornecedores,
                { id: crypto.randomUUID(), nome: "", descricao: "", valor: 0, desconto: 0 },
              ],
            }
          : c
      )
    );
  };

  const atualizarFornecedor = (categoriaId: string, fornecedorId: string, updates: Partial<Fornecedor>) => {
    setCategorias(
      categorias.map((c) =>
        c.id === categoriaId
          ? {
              ...c,
              fornecedores: c.fornecedores.map((f) => (f.id === fornecedorId ? { ...f, ...updates } : f)),
            }
          : c
      )
    );
  };

  const removerFornecedor = (categoriaId: string, fornecedorId: string) => {
    setCategorias(
      categorias.map((c) =>
        c.id === categoriaId
          ? { ...c, fornecedores: c.fornecedores.filter((f) => f.id !== fornecedorId) }
          : c
      )
    );
  };

  const adicionarItem = (categoriaId: string) => {
    setCategorias(
      categorias.map((c) =>
        c.id === categoriaId
          ? {
              ...c,
              itens: [
                ...c.itens,
                {
                  id: crypto.randomUUID(),
                  unidade: "",
                  quantidade: 1,
                  valorUnitario: 0,
                  desconto: 0,
                },
              ],
            }
          : c
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

  const totalGeral = categorias
    .filter((c) => c.visivel)
    .reduce((sum, c) => sum + calcularSubtotalCategoria(c), 0);

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
        categorias: categorias.map((c) => ({
          nome: c.nome,
          visivel: c.visivel,
          modoPreco: c.modoPreco,
          observacao: c.observacao,
          fornecedores: c.fornecedores,
          itens: c.itens,
        })),
      };

      if (budgetId && versionId) {
        // Update existing
        const { error } = await supabase
          .from("versions")
          .update({ payload: payload as any, total_geral: totalGeral })
          .eq("id", versionId);

        if (error) throw error;
        toast({ title: "Orçamento atualizado!" });
      } else {
        // Create new
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
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const categoriasVisiveis = categorias.filter((c) => c.visivel);

  return (
    <div className="space-y-6">
      {/* Cliente & Produto */}
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
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

      {/* Gerenciador de Categorias */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gerenciador de Categorias</CardTitle>
            <div className="flex gap-2">
              <Select onValueChange={(v) => v && adicionarCategoria(v)}>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categorias.map((cat) => (
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
                  onClick={() => alternarVisibilidade(cat.id)}
                >
                  {cat.visivel ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
                {cat.podeExcluir && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removerCategoria(cat.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Layout em 2 colunas */}
      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* Categorias - Esquerda */}
        <div className="space-y-6">
          {categoriasVisiveis.map((cat) => (
            <Card key={cat.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{cat.nome}</CardTitle>
                  <Select
                    value={cat.modoPreco}
                    onValueChange={(v: any) => atualizarCategoria(cat.id, { modoPreco: v })}
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
                    onChange={(e) => atualizarCategoria(cat.id, { observacao: e.target.value })}
                    rows={2}
                  />
                </div>

                {cat.modoPreco === "fechado" ? (
                  <>
                    <div className="flex items-center justify-between">
                      <Label>Fornecedores/Cotações</Label>
                      <Button size="sm" variant="outline" onClick={() => adicionarFornecedor(cat.id)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {cat.fornecedores.map((forn) => {
                        const valorFinal = forn.valor - forn.desconto;
                        const maisBarato =
                          cat.fornecedores.length > 0 &&
                          cat.fornecedores.reduce((min, f) => {
                            const v = f.valor - f.desconto;
                            const minV = min.valor - min.desconto;
                            return v < minV ? f : min;
                          }).id === forn.id;

                        return (
                          <div
                            key={forn.id}
                            className={`border rounded-xl p-3 space-y-2 ${
                              maisBarato ? "border-success bg-success/5" : "border-border"
                            }`}
                          >
                            {maisBarato && (
                              <div className="text-xs font-semibold text-success mb-2">⭐ MAIS BARATA</div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Fornecedor"
                                value={forn.nome}
                                onChange={(e) =>
                                  atualizarFornecedor(cat.id, forn.id, { nome: e.target.value })
                                }
                              />
                              <Input
                                placeholder="Valor (R$)"
                                type="number"
                                value={forn.valor || ""}
                                onChange={(e) =>
                                  atualizarFornecedor(cat.id, forn.id, {
                                    valor: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                            <Textarea
                              placeholder="Descrição/Escopo"
                              value={forn.descricao}
                              onChange={(e) =>
                                atualizarFornecedor(cat.id, forn.id, { descricao: e.target.value })
                              }
                              rows={2}
                            />
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Desconto (R$)"
                                type="number"
                                value={forn.desconto || ""}
                                onChange={(e) =>
                                  atualizarFornecedor(cat.id, forn.id, {
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
                                onClick={() => removerFornecedor(cat.id, forn.id)}
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
                ) : null}

                <div className="pt-2 border-t">
                  <div className="flex justify-between font-semibold">
                    <span>Subtotal {cat.nome}:</span>
                    <span>{formatCurrency(calcularSubtotalCategoria(cat))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resumo - Direita (sticky) */}
        <div className="sticky top-6 h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoriasVisiveis.map((cat) => (
                <div key={cat.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{cat.nome}:</span>
                  <span className="font-medium">{formatCurrency(calcularSubtotalCategoria(cat))}</span>
                </div>
              ))}
              <div className="pt-3 border-t">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Sugerido:</span>
                  <span className="text-primary">{formatCurrency(totalGeral)}</span>
                </div>
              </div>
              <Button onClick={handleSalvar} disabled={saving} className="w-full mt-4">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

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
    </div>
  );
}
