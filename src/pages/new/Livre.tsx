import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, Trash2, FileText } from "lucide-react";

interface ItemOrcamento {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export default function OrcamentoLivre() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [tipoServico, setTipoServico] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemOrcamento[]>([
    {
      id: "1",
      descricao: "",
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
    },
  ]);

  const addItem = () => {
    setItens([
      ...itens,
      {
        id: Date.now().toString(),
        descricao: "",
        quantidade: 1,
        valor_unitario: 0,
        valor_total: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (itens.length > 1) {
      setItens(itens.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ItemOrcamento, value: any) => {
    setItens(
      itens.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantidade" || field === "valor_unitario") {
            updated.valor_total = updated.quantidade * updated.valor_unitario;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const calcularTotal = () => {
    return itens.reduce((total, item) => total + item.valor_total, 0);
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

    if (!tipoServico.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o tipo de serviço.",
        variant: "destructive",
      });
      return;
    }

    const hasEmptyItems = itens.some((item) => !item.descricao.trim());
    if (hasEmptyItems) {
      toast({
        title: "Itens incompletos",
        description: "Por favor, preencha a descrição de todos os itens.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const total_geral = calcularTotal();

      // Criar o budget (usando tipo 'imagem' como base, mas com payload diferenciado)
      const { data: budget, error: budgetError } = await supabase
        .from("budgets")
        .insert({
          type: "imagem",
          status: "rascunho",
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Criar a versão
      const payload = {
        type: "livre",
        cliente,
        produto,
        tipo_servico: tipoServico,
        itens: itens.map((item) => ({
          descricao: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
        })),
        observacoes: observacoes.trim() ? observacoes.split("\n").filter((obs) => obs.trim()) : [],
        total_geral,
        data_orcamento: new Date().toISOString().split("T")[0],
      };

      const { error: versionError } = await supabase.from("versions").insert({
        budget_id: budget.id,
        versao: 1,
        payload: payload as any,
        total_geral,
      });

      if (versionError) throw versionError;

      toast({
        title: "✅ Orçamento criado!",
        description: `Orçamento ${budget.display_id} criado com sucesso.`,
      });

      navigate(`/budget/${budget.id}/pdf`);
    } catch (err: any) {
      console.error("[create-livre-budget] error:", err);
      toast({
        title: "Erro ao criar orçamento",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orçamento Livre</h1>
              <p className="text-gray-600 text-sm">Crie um orçamento customizado para qualquer tipo de serviço</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Input
                    id="cliente"
                    placeholder="Ex: Coca-Cola"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="produto">Produto/Projeto *</Label>
                  <Input
                    id="produto"
                    placeholder="Ex: Evento de Lançamento"
                    value={produto}
                    onChange={(e) => setProduto(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tipo_servico">Tipo de Serviço *</Label>
                <Input
                  id="tipo_servico"
                  placeholder="Ex: Tradução Simultânea, Intérprete, Consultoria, etc."
                  value={tipoServico}
                  onChange={(e) => setTipoServico(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Itens do Orçamento */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Itens do Orçamento</CardTitle>
                <Button onClick={addItem} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {itens.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700">Item {index + 1}</span>
                    {itens.length > 1 && (
                      <Button
                        onClick={() => removeItem(item.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label>Descrição *</Label>
                      <Textarea
                        placeholder="Descreva o item/serviço"
                        value={item.descricao}
                        onChange={(e) => updateItem(item.id, "descricao", e.target.value)}
                        className="mt-1"
                        rows={2}
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantidade}
                          onChange={(e) => updateItem(item.id, "quantidade", parseFloat(e.target.value) || 1)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Valor Unitário (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valor_unitario}
                          onChange={(e) => updateItem(item.id, "valor_unitario", parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Valor Total</Label>
                        <div className="mt-1 p-2 bg-gray-50 rounded font-semibold text-green-600">
                          R$ {item.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Total */}
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">TOTAL GERAL</span>
                <span className="text-3xl font-bold text-green-600">
                  R$ {calcularTotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Observações adicionais (opcional)</Label>
              <Textarea
                placeholder="Digite cada observação em uma linha separada"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="mt-1"
                rows={4}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Cada linha será uma observação separada no orçamento
              </p>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-3 justify-end">
            <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Criar Orçamento
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
