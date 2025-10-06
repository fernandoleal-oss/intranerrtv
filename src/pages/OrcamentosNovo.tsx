import { useState, useCallback } from "react";
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
    setCampanhas([
      ...campanhas,
      {
        id: crypto.randomUUID(),
        nome: `Campanha ${campanhas.length + 1}`,
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
    if (campanhas.length === 1) {
      toast({ title: "É necessário pelo menos uma campanha", variant: "destructive" });
      return;
    }
    setCampanhas(campanhas.filter((c) => c.id !== id));
  };

  const atualizarNomeCampanha = (id: string, nome: string) => {
    setCampanhas(campanhas.map((c) => (c.id === id ? { ...c, nome } : c)));
  };

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

  const adicionarFornecedor = (campanhaId: string, categoriaId: string) => {
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
                        { id: crypto.randomUUID(), nome: "", descricao: "", valor: 0, desconto: 0 },
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
                      fornecedores: c.fornecedores.map((f) =>
                        f.id === fornecedorId ? { ...f, ...updates } : f
                      ),
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

  const adicionarItem = (campanhaId: string, categoriaId: string) => {
    setCampanhas(
      campanhas.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
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
              ),
            }
          : camp
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

  const calcularSubtotalCampanha = useCallback(
    (campanha: Campanha) => {
      return campanha.categorias
        .filter((c) => c.visivel)
        .reduce((sum, c) => sum + calcularSubtotalCategoria(c), 0);
    },
    [calcularSubtotalCategoria]
  );

  const totalGeral = campanhas.reduce((sum, camp) => sum + calcularSubtotalCampanha(camp), 0);

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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-8 font-semibold">Novo Orçamento</h1>
              <p className="text-muted-foreground">Preencha os dados e gerencie categorias</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast({ title: "Em breve" })} className="gap-2">
              <Copy className="h-4 w-4" />
              Duplicar
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/orcamentos/tabela")}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Exportar p/ BYD
            </Button>
            <Button onClick={handleSalvar} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Cliente & Produto */}
        <Card className="mb-6">
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

        {/* Gerenciador de Campanhas */}
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
                <div key={camp.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-primary/10 border-primary/30">
                  <Input
                    value={camp.nome}
                    onChange={(e) => atualizarNomeCampanha(camp.id, e.target.value)}
                    className="h-7 w-32 text-sm font-medium"
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

        {/* Layout em 2 colunas */}
        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Campanhas e Categorias - Esquerda */}
          <div className="space-y-8">
            {campanhas.map((campanha) => {
              const categoriasVisiveis = campanha.categorias.filter((c) => c.visivel);
              
              return (
                <div key={campanha.id} className="space-y-4">
                  {/* Cabeçalho da Campanha */}
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border-2 border-primary/20">
                    <h2 className="text-xl font-semibold text-primary">{campanha.nome}</h2>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(calcularSubtotalCampanha(campanha))}
                    </div>
                  </div>

                  {/* Gerenciador de Categorias da Campanha */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Gerenciador de Categorias</CardTitle>
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

                  {/* Categorias da Campanha */}
                  <div className="space-y-4">
                    {categoriasVisiveis.map((cat) => (
                      <Card key={cat.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>{cat.nome}</CardTitle>
                            <Select
                              value={cat.modoPreco}
                              onValueChange={(v: any) => atualizarCategoria(campanha.id, cat.id, { modoPreco: v })}
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
                              onChange={(e) => atualizarCategoria(campanha.id, cat.id, { observacao: e.target.value })}
                              rows={2}
                            />
                          </div>

                          {cat.modoPreco === "fechado" ? (
                            <>
                              <div className="flex items-center justify-between">
                                <Label>Fornecedores/Cotações</Label>
                                <Button size="sm" variant="outline" onClick={() => adicionarFornecedor(campanha.id, cat.id)}>
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
                                        <div className="text-xs font-semibold text-success mb-2">
                                          ⭐ MAIS BARATA
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-2">
                                        <Input
                                          placeholder="Fornecedor"
                                          value={forn.nome}
                                          onChange={(e) =>
                                            atualizarFornecedor(campanha.id, cat.id, forn.id, { nome: e.target.value })
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
                                        placeholder="Descrição/Escopo"
                                        value={forn.descricao}
                                        onChange={(e) =>
                                          atualizarFornecedor(campanha.id, cat.id, forn.id, { descricao: e.target.value })
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
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <Label>Itens</Label>
                                <Button size="sm" variant="outline" onClick={() => adicionarItem(campanha.id, cat.id)}>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Adicionar
                                </Button>
                              </div>

                              <div className="text-xs text-muted-foreground">
                                Total = Σ(Qtd × Valor unit.) − Descontos
                              </div>

                              {cat.itens.map((item) => (
                                <div key={item.id} className="border rounded-xl p-3 space-y-2">
                                  <div className="grid grid-cols-4 gap-2">
                                    <Input placeholder="Unidade" value={item.unidade} />
                                    <Input placeholder="Qtd" type="number" value={item.quantidade} />
                                    <Input placeholder="Valor unit." type="number" value={item.valorUnitario} />
                                    <Input placeholder="Desconto" type="number" value={item.desconto} />
                                  </div>
                                </div>
                              ))}
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
                    ))}
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
                />
              </CardContent>
            </Card>
          </div>

          {/* Resumo - Direita (sticky) */}
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
                      <div className="font-semibold text-primary pb-2 border-b">
                        {campanha.nome}
                      </div>
                      {categoriasVisiveis.map((cat) => (
                        <div key={cat.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{cat.nome}</span>
                          <span className="font-medium">
                            {formatCurrency(calcularSubtotalCategoria(cat))}
                          </span>
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
                  <p>• Melhor combinação de cada campanha</p>
                  <p>• {campanhas.length} campanha(s)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
