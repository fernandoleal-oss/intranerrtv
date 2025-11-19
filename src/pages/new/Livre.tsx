import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, ArrowUpDown } from "lucide-react";
import { SupplierOptionsManager } from "@/components/budget/SupplierOptionsManager";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FornecedorItem {
  id: string;
  nome: string;
  valor: number;
  prazo: string;
  observacao: string;
  desconto?: number;
}

interface FornecedorFase {
  id: string;
  nome: string;
  itens: FornecedorItem[];
}

interface FornecedorOpcao {
  id: string;
  nome: string;
  fases: FornecedorFase[];
}

interface Fornecedor {
  id: string;
  nome: string;
  contato: string;
  cnpj?: string;
  opcoes: FornecedorOpcao[];
}

export default function OrcamentoLivre() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  
  // Configurações de visualização
  const [somarTodasOpcoes, setSomarTodasOpcoes] = useState(false);
  const [mostrarValores, setMostrarValores] = useState(true);
  const [ordenacao, setOrdenacao] = useState<"original" | "barato" | "caro">("original");
  
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([
    {
      id: crypto.randomUUID(),
      nome: "Nome do Fornecedor",
      contato: "Contato do fornecedor",
      cnpj: "",
      opcoes: [
        {
          id: crypto.randomUUID(),
          nome: "Opção 1",
          fases: [
            {
              id: crypto.randomUUID(),
              nome: "Itens Inclusos",
              itens: [
                {
                  id: crypto.randomUUID(),
                  nome: "Item 1",
                  valor: 0,
                  prazo: "",
                  observacao: "",
                  desconto: 0,
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  const adicionarFornecedor = () => {
    setFornecedores([
      ...fornecedores,
      {
        id: crypto.randomUUID(),
        nome: "Novo Fornecedor",
        contato: "",
        cnpj: "",
        opcoes: [
          {
            id: crypto.randomUUID(),
            nome: "Opção 1",
            fases: [
              {
                id: crypto.randomUUID(),
                nome: "Itens Inclusos",
                itens: [],
              },
            ],
          },
        ],
      },
    ]);
  };

  const removerFornecedor = (id: string) => {
    if (fornecedores.length > 1) {
      setFornecedores(fornecedores.filter((f) => f.id !== id));
    }
  };

  const calcularTotalOpcao = (opcao: FornecedorOpcao) => {
    return opcao.fases.reduce((total, fase) => {
      return total + fase.itens.reduce((itemTotal, item) => {
        return itemTotal + (item.valor * (1 - (item.desconto || 0) / 100));
      }, 0);
    }, 0);
  };

  const calcularTotalFornecedor = (fornecedor: Fornecedor) => {
    if (somarTodasOpcoes) {
      // Soma todas as opções
      return fornecedor.opcoes.reduce((total, opcao) => {
        return total + calcularTotalOpcao(opcao);
      }, 0);
    } else {
      // Pega apenas a opção mais barata
      const valores = fornecedor.opcoes.map(calcularTotalOpcao);
      return valores.length > 0 ? Math.min(...valores) : 0;
    }
  };

  const calcularTotal = () => {
    return fornecedores.reduce((total, fornecedor) => {
      return total + calcularTotalFornecedor(fornecedor);
    }, 0);
  };

  const getFornecedoresOrdenados = () => {
    const fornecedoresComValor = fornecedores.map((f) => ({
      ...f,
      valorTotal: calcularTotalFornecedor(f),
    }));

    if (ordenacao === "barato") {
      return fornecedoresComValor.sort((a, b) => a.valorTotal - b.valorTotal);
    } else if (ordenacao === "caro") {
      return fornecedoresComValor.sort((a, b) => b.valorTotal - a.valorTotal);
    }
    return fornecedoresComValor;
  };

  const handleSave = async () => {
    if (!cliente.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!produto.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o produto/projeto.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const total_geral = calcularTotal();

      const payload = {
        tipo: "livre",
        cliente,
        projeto: produto,
        fornecedores,
        configuracoes: {
          somarTodasOpcoes,
          mostrarValores,
          ordenacao,
        },
      };

      const { data, error } = await supabase.rpc("create_budget_full_rpc", {
        p_type_text: "livre",
        p_payload: payload as any,
        p_total: total_geral,
      });

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Falha ao criar orçamento");

      const budgetId = data[0].id;

      toast({
        title: "Sucesso!",
        description: "Orçamento livre criado com sucesso.",
      });

      navigate(`/orcamentos/editar/${budgetId}`);
    } catch (error: any) {
      console.error("Erro ao salvar orçamento:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o orçamento.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/orcamentos/novo")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Novo Orçamento Livre</h1>
              <p className="text-sm text-muted-foreground">
                Crie um orçamento personalizado com múltiplas opções por fornecedor
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="produto">Produto/Projeto *</Label>
                <Input
                  id="produto"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  placeholder="Nome do produto ou projeto"
                />
              </div>
            </CardContent>
          </Card>

          {/* Controles de Visualização */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Opções de Visualização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="somar-opcoes">Somar todas as opções</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, soma os valores de todas as opções de cada fornecedor
                  </p>
                </div>
                <Switch
                  id="somar-opcoes"
                  checked={somarTodasOpcoes}
                  onCheckedChange={setSomarTodasOpcoes}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mostrar-valores">Mostrar valores</Label>
                  <p className="text-sm text-muted-foreground">
                    Ocultar ou exibir os valores totais dos fornecedores
                  </p>
                </div>
                <Switch
                  id="mostrar-valores"
                  checked={mostrarValores}
                  onCheckedChange={setMostrarValores}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ordenacao">Ordenar fornecedores</Label>
                <Select value={ordenacao} onValueChange={(value: any) => setOrdenacao(value)}>
                  <SelectTrigger id="ordenacao">
                    <SelectValue placeholder="Selecione a ordenação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Ordem original</SelectItem>
                    <SelectItem value="barato">Mais barato primeiro</SelectItem>
                    <SelectItem value="caro">Mais caro primeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Fornecedores</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarFornecedor}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Fornecedor
              </Button>
            </div>

            {getFornecedoresOrdenados().map((fornecedor, index) => (
              <Card key={fornecedor.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">Fornecedor {index + 1}</CardTitle>
                      {mostrarValores && (
                        <p className="text-sm text-muted-foreground">
                          Total: {formatCurrency(fornecedor.valorTotal)}
                        </p>
                      )}
                    </div>
                    {fornecedores.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerFornecedor(fornecedor.id)}
                        className="text-destructive"
                      >
                        Remover Fornecedor
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <SupplierOptionsManager
                    fornecedor={fornecedor}
                    onUpdate={(updated) => {
                      setFornecedores(
                        fornecedores.map((f) => (f.id === fornecedor.id ? updated : f))
                      );
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Geral</p>
                  <p className="text-3xl font-bold">{formatCurrency(calcularTotal())}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/orcamentos/novo")}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar Orçamento"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
