import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Trash2, Save, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ZeroWelcomeDialog } from "@/components/budget/ZeroWelcomeDialog";
import { HonorarioWarningDialog } from "@/components/budget/HonorarioWarningDialog";
import { supabase } from "@/integrations/supabase/client";
import { CampaignModeDialog } from "@/components/budget/CampaignModeDialog";

interface Item {
  id: string;
  tipo: "filme" | "audio" | "imagem" | "cc" | "outro";
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
  observacao?: string;
}

interface Categoria {
  id: string;
  nome: string;
  visivel: boolean;
  modoPreco: "fechado" | "itens";
  itens: Item[];
}

interface Campanha {
  id: string;
  nome: string;
  inclui_audio: boolean;
  categorias: Categoria[];
}

export default function OrcamentoZero() {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCampaignModeDialog, setShowCampaignModeDialog] = useState(false);
  const [showHonorarioWarning, setShowHonorarioWarning] = useState(false);
  const [combinarModo, setCombinarModo] = useState<"somar" | "separado">("separado");
  
  // Dados básicos
  const [briefText, setBriefText] = useState("");
  const [cliente, setCliente] = useState("");
  const [clienteHonorario, setClienteHonorario] = useState<number>(0);
  const [produto, setProduto] = useState("");
  const [job, setJob] = useState("");
  const [midias, setMidias] = useState("");
  const [territorio, setTerritorio] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [entregaveis, setEntregaveis] = useState("");
  const [adaptacoes, setAdaptacoes] = useState("");
  const [exclusividadeElenco, setExclusividadeElenco] = useState<"orcado" | "nao_orcado" | "nao_aplica">("nao_aplica");
  const [pendenteFaturamento, setPendenteFaturamento] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [produtor, setProdutor] = useState("");
  const [email, setEmail] = useState("");
  const [clientesComHonorario, setClientesComHonorario] = useState<Record<string, number>>({});

  // Campanhas
  const [campanhas, setCampanhas] = useState<Campanha[]>([
    {
      id: crypto.randomUUID(),
      nome: "Campanha 1",
      inclui_audio: false,
      categorias: []
    }
  ]);

  // Carregar clientes com honorário
  useEffect(() => {
    const loadClientesHonorario = async () => {
      try {
        const { data, error } = await supabase
          .from("client_honorarios")
          .select("client_name, honorario_percent");

        if (error) throw error;

        const honorarios: Record<string, number> = {};
        data?.forEach((item) => {
          honorarios[item.client_name.toLowerCase()] = item.honorario_percent;
        });
        setClientesComHonorario(honorarios);
      } catch (err) {
        console.error("Erro ao carregar honorários:", err);
      }
    };

    loadClientesHonorario();
  }, []);

  // Verifica se há 2+ campanhas para mostrar o dialog
  useEffect(() => {
    if (campanhas.length >= 2 && !combinarModo) {
      setShowCampaignModeDialog(true);
    }
  }, [campanhas.length]);

  // Verifica se cliente tem honorário
  useEffect(() => {
    const clienteLower = cliente.toLowerCase().trim();
    const honorario = clientesComHonorario[clienteLower];
    
    if (honorario && honorario > 0) {
      setClienteHonorario(honorario);
      setShowHonorarioWarning(true);
    } else {
      setClienteHonorario(0);
    }
  }, [cliente, clientesComHonorario]);

  const handleWelcomeConfirm = () => {
    setShowWelcome(false);
  };

  const handleWelcomeCancel = () => {
    navigate("/orcamentos");
  };

  const addCampanha = () => {
    setCampanhas([
      ...campanhas,
      {
        id: crypto.randomUUID(),
        nome: `Campanha ${campanhas.length + 1}`,
        inclui_audio: false,
        categorias: []
      }
    ]);
  };

  const removeCampanha = (id: string) => {
    if (campanhas.length === 1) {
      toast({ title: "Deve haver pelo menos uma campanha", variant: "destructive" });
      return;
    }
    setCampanhas(campanhas.filter(c => c.id !== id));
  };

  const addCategoria = (campanhaId: string) => {
    setCampanhas(campanhas.map(c => {
      if (c.id === campanhaId) {
        return {
          ...c,
          categorias: [
            ...c.categorias,
            {
              id: crypto.randomUUID(),
              nome: `Categoria ${c.categorias.length + 1}`,
              visivel: true,
              modoPreco: "itens",
              itens: []
            }
          ]
        };
      }
      return c;
    }));
  };

  const addItem = (campanhaId: string, categoriaId: string) => {
    setCampanhas(campanhas.map(c => {
      if (c.id === campanhaId) {
        return {
          ...c,
          categorias: c.categorias.map(cat => {
            if (cat.id === categoriaId) {
              return {
                ...cat,
                itens: [
                  ...cat.itens,
                  {
                    id: crypto.randomUUID(),
                    tipo: "filme",
                    descricao: "",
                    quantidade: 1,
                    valorUnitario: 0,
                    desconto: 0
                  }
                ]
              };
            }
            return cat;
          })
        };
      }
      return c;
    }));
  };

  const updateItem = (campanhaId: string, categoriaId: string, itemId: string, field: keyof Item, value: any) => {
    setCampanhas(campanhas.map(c => {
      if (c.id === campanhaId) {
        return {
          ...c,
          categorias: c.categorias.map(cat => {
            if (cat.id === categoriaId) {
              return {
                ...cat,
                itens: cat.itens.map(item => {
                  if (item.id === itemId) {
                    return { ...item, [field]: value };
                  }
                  return item;
                })
              };
            }
            return cat;
          })
        };
      }
      return c;
    }));
  };

  const removeItem = (campanhaId: string, categoriaId: string, itemId: string) => {
    setCampanhas(campanhas.map(c => {
      if (c.id === campanhaId) {
        return {
          ...c,
          categorias: c.categorias.map(cat => {
            if (cat.id === categoriaId) {
              return {
                ...cat,
                itens: cat.itens.filter(item => item.id !== itemId)
              };
            }
            return cat;
          })
        };
      }
      return c;
    }));
  };

  const calcularTotal = () => {
    let subtotalGeral = 0;

    campanhas.forEach(campanha => {
      campanha.categorias.forEach(categoria => {
        if (categoria.visivel) {
          categoria.itens.forEach(item => {
            const subtotal = (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0);
            subtotalGeral += subtotal;
          });
        }
      });
    });

    // Apenas aplica honorário se cliente tiver honorário configurado
    if (clienteHonorario > 0) {
      if (combinarModo === "somar") {
        // Honorário aplicado uma única vez no consolidado
        const honorario = subtotalGeral * (clienteHonorario / 100);
        return subtotalGeral + honorario;
      } else {
        // Modo separado: não mostra total geral, apenas subtotais
        return subtotalGeral;
      }
    }

    // Sem honorário, retorna apenas o subtotal
    return subtotalGeral;
  };

  const handleSalvar = async () => {
    if (!briefText.trim()) {
      toast({ title: "Brief obrigatório", description: "Preencha o brief antes de salvar", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        type: "filme",
        produtor,
        email,
        cliente,
        produto,
        job,
        midias,
        territorio,
        periodo,
        entregaveis,
        adaptacoes,
        exclusividade_elenco: exclusividadeElenco,
        brief_text: briefText,
        combinarModo,
        honorario_perc: clienteHonorario,
        pendente_faturamento: pendenteFaturamento,
        observacoes,
        campanhas: campanhas.map(c => ({
          id: c.id,
          nome: c.nome,
          inclui_audio: c.inclui_audio,
          categorias: c.categorias
        }))
      };

      const totalGeral = calcularTotal();

      // Criar budget
      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .insert({
          type: "filme",
          status: "rascunho"
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Criar versão
      const { error: versionError } = await supabase
        .from("versions")
        .insert([{
          budget_id: budgetData.id,
          versao: 1,
          payload: payload as any,
          total_geral: totalGeral
        }]);

      if (versionError) throw versionError;

      toast({ title: "Orçamento salvo com sucesso!" });
      navigate(`/budget/${budgetData.id}`);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  if (showWelcome) {
    return (
      <>
        <ZeroWelcomeDialog
          open={showWelcome}
          onOpenChange={(open) => {
            if (!open) handleWelcomeCancel();
          }}
          onConfirm={handleWelcomeConfirm}
        />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </>
    );
  }

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
              <h1 className="text-[28px] leading-8 font-semibold">Orçamento do Zero</h1>
              <p className="text-muted-foreground">Crie um orçamento personalizado linha por linha</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSalvar} className="gap-2">
              <Save className="h-4 w-4" />
              Salvar
            </Button>
            <Button onClick={() => toast({ title: "Preview em breve" })} className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </div>
        </div>

        {/* Brief Obrigatório */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Brief / Contexto <span className="text-destructive">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Descreva o contexto, objetivos, entregáveis, mídias, prazos, território e referências necessárias…"
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Identificação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Produtor</Label>
                <Input value={produtor} onChange={(e) => setProdutor(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <Input value={cliente} onChange={(e) => setCliente(e.target.value)} />
              </div>
              <div>
                <Label>Produto</Label>
                <Input value={produto} onChange={(e) => setProduto(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Job</Label>
              <Input value={job} onChange={(e) => setJob(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Detalhes */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Mídias</Label>
                <Input value={midias} onChange={(e) => setMidias(e.target.value)} />
              </div>
              <div>
                <Label>Território</Label>
                <Input value={territorio} onChange={(e) => setTerritorio(e.target.value)} />
              </div>
              <div>
                <Label>Período</Label>
                <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Entregáveis</Label>
                <Input value={entregaveis} onChange={(e) => setEntregaveis(e.target.value)} />
              </div>
              <div>
                <Label>Adaptações</Label>
                <Input value={adaptacoes} onChange={(e) => setAdaptacoes(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Exclusividade de Elenco</Label>
              <Select value={exclusividadeElenco} onValueChange={(v: any) => setExclusividadeElenco(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orcado">Orçado</SelectItem>
                  <SelectItem value="nao_orcado">Não Orçado</SelectItem>
                  <SelectItem value="nao_aplica">Não se aplica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Modo de Combinação (visível quando 2+ campanhas) */}
        {campanhas.length >= 2 && (
          <Card className="border-primary/50 bg-primary/5 mb-6">
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

        {/* Campanhas */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Campanhas</span>
              <Button size="sm" onClick={addCampanha} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Campanha
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {campanhas.map((campanha, idx) => (
              <Card key={campanha.id} className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Input
                      value={campanha.nome}
                      onChange={(e) => {
                        setCampanhas(campanhas.map(c => c.id === campanha.id ? { ...c, nome: e.target.value } : c));
                      }}
                      className="max-w-xs"
                    />
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={campanha.inclui_audio}
                          onCheckedChange={(checked) => {
                            setCampanhas(campanhas.map(c => c.id === campanha.id ? { ...c, inclui_audio: checked } : c));
                          }}
                        />
                        <Label>Incluir Áudio</Label>
                      </div>
                      {campanhas.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => removeCampanha(campanha.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button size="sm" variant="outline" onClick={() => addCategoria(campanha.id)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Categoria
                  </Button>

                  {campanha.categorias.map((categoria) => (
                    <Card key={categoria.id} className="border-muted">
                      <CardHeader>
                        <Input
                          value={categoria.nome}
                          onChange={(e) => {
                            setCampanhas(campanhas.map(c => {
                              if (c.id === campanha.id) {
                                return {
                                  ...c,
                                  categorias: c.categorias.map(cat => cat.id === categoria.id ? { ...cat, nome: e.target.value } : cat)
                                };
                              }
                              return c;
                            }));
                          }}
                          className="max-w-xs"
                        />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button size="sm" variant="outline" onClick={() => addItem(campanha.id, categoria.id)} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Adicionar Item
                        </Button>

                        {categoria.itens.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 p-3 border rounded-lg">
                            <Select
                              value={item.tipo}
                              onValueChange={(v: any) => updateItem(campanha.id, categoria.id, item.id, "tipo", v)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="filme">Filme</SelectItem>
                                <SelectItem value="audio">Áudio</SelectItem>
                                <SelectItem value="imagem">Imagem</SelectItem>
                                <SelectItem value="cc">CC</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Descrição"
                              value={item.descricao}
                              onChange={(e) => updateItem(campanha.id, categoria.id, item.id, "descricao", e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              placeholder="Qtd"
                              value={item.quantidade}
                              onChange={(e) => updateItem(campanha.id, categoria.id, item.id, "quantidade", Number(e.target.value))}
                              className="w-20"
                            />
                            <Input
                              type="number"
                              placeholder="Valor"
                              value={item.valorUnitario}
                              onChange={(e) => updateItem(campanha.id, categoria.id, item.id, "valorUnitario", Number(e.target.value))}
                              className="w-32"
                            />
                            <Input
                              type="number"
                              placeholder="Desconto"
                              value={item.desconto}
                              onChange={(e) => updateItem(campanha.id, categoria.id, item.id, "desconto", Number(e.target.value))}
                              className="w-32"
                            />
                            <Button size="sm" variant="ghost" onClick={() => removeItem(campanha.id, categoria.id, item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Honorário e Observações */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Honorário e Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clienteHonorario > 0 && (
              <div className="p-4 border border-primary/50 bg-primary/5 rounded-lg">
                <Label className="text-sm font-semibold">Honorário Automático</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Cliente com honorário de <strong>{clienteHonorario}%</strong> configurado
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={pendenteFaturamento}
                onCheckedChange={setPendenteFaturamento}
              />
              <Label>Pendente de Faturamento</Label>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Total */}
        {(combinarModo === "somar" || clienteHonorario > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>
                {combinarModo === "somar" && clienteHonorario > 0
                  ? "Total Geral (com honorário)"
                  : combinarModo === "somar"
                  ? "Total Consolidado"
                  : "Subtotal das Campanhas"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(calcularTotal())}
              </div>
              {clienteHonorario > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Honorário de {clienteHonorario}% {combinarModo === "somar" ? "aplicado no consolidado" : "será aplicado"}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <CampaignModeDialog
        open={showCampaignModeDialog}
        onOpenChange={setShowCampaignModeDialog}
        onConfirm={(mode) => setCombinarModo(mode)}
        currentMode={combinarModo}
      />

      <HonorarioWarningDialog
        open={showHonorarioWarning}
        onOpenChange={setShowHonorarioWarning}
        clientName={cliente}
        honorarioPercent={clienteHonorario}
      />
    </AppLayout>
  );
}
