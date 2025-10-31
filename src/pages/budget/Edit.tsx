import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Save, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-spinner";
import { UpdateEmsButton } from "@/components/budget/UpdateEmsButton";

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

interface Fornecedor {
  id: string;
  nome: string;
  contato: string;
  cnpj?: string;
  fases: FornecedorFase[];
  desconto?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function BudgetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [budgetData, setBudgetData] = useState<any>(null);

  // Carregar orçamento
  useEffect(() => {
    const fetchBudget = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const { data: row, error } = await supabase
          .from("versions")
          .select(`
            id,
            payload,
            versao,
            budgets!inner(
              id,
              display_id,
              type,
              status,
              budget_number
            )
          `)
          .eq("budget_id", id)
          .order("versao", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!row) throw new Error("Orçamento não encontrado");

        setBudgetData({
          id: row.budgets!.id,
          version_id: row.id,
          payload: row.payload || {},
        });

        // Carregar fornecedores do payload
        const payload = row.payload as any;
        if (payload?.fornecedores) {
          setFornecedores(payload.fornecedores);
        }
      } catch (err: any) {
        toast({
          title: "Erro ao carregar orçamento",
          description: err.message,
          variant: "destructive",
        });
        navigate("/orcamentos");
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, [id, navigate]);

  // Calcular totais
  const calcularTotalFase = (fase: FornecedorFase) => {
    return fase.itens.reduce((sum, item) => sum + (item.valor - (item.desconto || 0)), 0);
  };

  const calcularTotalFornecedor = (fornecedor: Fornecedor) => {
    const subtotal = fornecedor.fases.reduce((sum, fase) => sum + calcularTotalFase(fase), 0);
    return subtotal - (fornecedor.desconto || 0);
  };

  const calcularTotalGeral = () => {
    return fornecedores.reduce((sum, f) => sum + calcularTotalFornecedor(f), 0);
  };

  // Handlers para Fornecedor
  const adicionarFornecedor = () => {
    const novoFornecedor: Fornecedor = {
      id: `fornecedor-${Date.now()}`,
      nome: "Novo Fornecedor",
      contato: "",
      cnpj: "",
      desconto: 0,
      fases: []
    };
    setFornecedores([...fornecedores, novoFornecedor]);
  };

  const removerFornecedor = (fornecedorId: string) => {
    if (confirm("Deseja realmente remover este fornecedor?")) {
      setFornecedores(fornecedores.filter(f => f.id !== fornecedorId));
    }
  };

  const atualizarFornecedor = (fornecedorId: string, campo: string, valor: any) => {
    setFornecedores(fornecedores.map(f => 
      f.id === fornecedorId ? { ...f, [campo]: valor } : f
    ));
  };

  // Handlers para Fase
  const adicionarFase = (fornecedorId: string) => {
    const novaFase: FornecedorFase = {
      id: `fase-${Date.now()}`,
      nome: "Nova Fase",
      itens: []
    };
    setFornecedores(fornecedores.map(f => 
      f.id === fornecedorId ? { ...f, fases: [...f.fases, novaFase] } : f
    ));
  };

  const removerFase = (fornecedorId: string, faseId: string) => {
    if (confirm("Deseja realmente remover esta fase?")) {
      setFornecedores(fornecedores.map(f => 
        f.id === fornecedorId ? { ...f, fases: f.fases.filter(fase => fase.id !== faseId) } : f
      ));
    }
  };

  const atualizarFase = (fornecedorId: string, faseId: string, campo: string, valor: any) => {
    setFornecedores(fornecedores.map(f => 
      f.id === fornecedorId ? {
        ...f,
        fases: f.fases.map(fase => 
          fase.id === faseId ? { ...fase, [campo]: valor } : fase
        )
      } : f
    ));
  };

  // Handlers para Item
  const adicionarItem = (fornecedorId: string, faseId: string) => {
    const novoItem: FornecedorItem = {
      id: `item-${Date.now()}`,
      nome: "Novo Item",
      valor: 0,
      prazo: "A combinar",
      observacao: "",
      desconto: 0
    };
    setFornecedores(fornecedores.map(f => 
      f.id === fornecedorId ? {
        ...f,
        fases: f.fases.map(fase => 
          fase.id === faseId ? { ...fase, itens: [...fase.itens, novoItem] } : fase
        )
      } : f
    ));
  };

  const removerItem = (fornecedorId: string, faseId: string, itemId: string) => {
    if (confirm("Deseja realmente remover este item?")) {
      setFornecedores(fornecedores.map(f => 
        f.id === fornecedorId ? {
          ...f,
          fases: f.fases.map(fase => 
            fase.id === faseId ? { ...fase, itens: fase.itens.filter(item => item.id !== itemId) } : fase
          )
        } : f
      ));
    }
  };

  const atualizarItem = (fornecedorId: string, faseId: string, itemId: string, campo: string, valor: any) => {
    setFornecedores(fornecedores.map(f => 
      f.id === fornecedorId ? {
        ...f,
        fases: f.fases.map(fase => 
          fase.id === faseId ? {
            ...fase,
            itens: fase.itens.map(item => 
              item.id === itemId ? { ...item, [campo]: valor } : item
            )
          } : fase
        )
      } : f
    ));
  };

  // Salvar alterações
  const handleSave = async () => {
    setSaving(true);
    try {
      if (!budgetData) throw new Error("Dados do orçamento não encontrados");

      const payload = {
        ...budgetData.payload,
        fornecedores: fornecedores,
        estrutura: 'fornecedores_fases'
      };

      // Atualizar versão existente
      const { error: updateError } = await supabase
        .from("versions")
        .update({
          payload: payload,
          updated_at: new Date().toISOString()
        })
        .eq("id", budgetData.version_id);

      if (updateError) throw updateError;

      toast({
        title: "Orçamento salvo!",
        description: "As alterações foram salvas com sucesso.",
      });

      // Recarregar dados
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Carregando orçamento..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Editar Orçamento</h1>
              <p className="text-muted-foreground">EMS Multimix - 4 Fornecedores</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {id === '56213599-35e3-4192-896c-57e78148fc22' && <UpdateEmsButton />}
            <Button variant="outline" onClick={() => navigate(`/budget/${id}/pdf`)} className="gap-2">
              <FileText className="h-4 w-4" />
              Ver PDF
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Resumo Geral */}
        <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Fornecedores</p>
                <p className="text-2xl font-bold">{fornecedores.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Fases</p>
                <p className="text-2xl font-bold">
                  {fornecedores.reduce((sum, f) => sum + f.fases.length, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">
                  {fornecedores.reduce((sum, f) => 
                    sum + f.fases.reduce((s, fase) => s + fase.itens.length, 0), 0
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(calcularTotalGeral())}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fornecedores */}
        <div className="space-y-6">
          {fornecedores.map((fornecedor) => (
            <Card key={fornecedor.id} className="border-2">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Nome do Fornecedor</Label>
                        <Input
                          value={fornecedor.nome}
                          onChange={(e) => atualizarFornecedor(fornecedor.id, 'nome', e.target.value)}
                          className="font-bold"
                        />
                      </div>
                      <div>
                        <Label>Contato</Label>
                        <Input
                          value={fornecedor.contato}
                          onChange={(e) => atualizarFornecedor(fornecedor.id, 'contato', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>CNPJ</Label>
                        <Input
                          value={fornecedor.cnpj || ""}
                          onChange={(e) => atualizarFornecedor(fornecedor.id, 'cnpj', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="w-48">
                        <Label>Desconto do Fornecedor</Label>
                        <Input
                          type="number"
                          value={fornecedor.desconto || 0}
                          onChange={(e) => atualizarFornecedor(fornecedor.id, 'desconto', Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Total do Fornecedor</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(calcularTotalFornecedor(fornecedor))}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removerFornecedor(fornecedor.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-6 space-y-4">
                {/* Fases */}
                {fornecedor.fases.map((fase) => (
                  <Card key={fase.id} className="border border-slate-200">
                    <CardHeader className="bg-slate-50/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex-1">
                              <Label>Nome da Fase</Label>
                              <Input
                                value={fase.nome}
                                onChange={(e) => atualizarFase(fornecedor.id, fase.id, 'nome', e.target.value)}
                              />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total da Fase</p>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(calcularTotalFase(fase))}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerFase(fornecedor.id, fase.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-4 space-y-3">
                      {/* Itens */}
                      {fase.itens.map((item) => (
                        <div key={item.id} className="p-4 border rounded-lg bg-white space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="md:col-span-2">
                                <Label>Descrição</Label>
                                <Input
                                  value={item.nome}
                                  onChange={(e) => atualizarItem(fornecedor.id, fase.id, item.id, 'nome', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Valor</Label>
                                <Input
                                  type="number"
                                  value={item.valor}
                                  onChange={(e) => atualizarItem(fornecedor.id, fase.id, item.id, 'valor', Number(e.target.value))}
                                />
                              </div>
                              <div>
                                <Label>Desconto</Label>
                                <Input
                                  type="number"
                                  value={item.desconto || 0}
                                  onChange={(e) => atualizarItem(fornecedor.id, fase.id, item.id, 'desconto', Number(e.target.value))}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Label>Prazo</Label>
                                <Input
                                  value={item.prazo}
                                  onChange={(e) => atualizarItem(fornecedor.id, fase.id, item.id, 'prazo', e.target.value)}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Label>Observações</Label>
                                <Textarea
                                  value={item.observacao}
                                  onChange={(e) => atualizarItem(fornecedor.id, fase.id, item.id, 'observacao', e.target.value)}
                                  rows={2}
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerItem(fornecedor.id, fase.id, item.id)}
                              className="text-destructive hover:text-destructive ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Valor Final</p>
                            <p className="text-lg font-bold">
                              {formatCurrency(item.valor - (item.desconto || 0))}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      <Button
                        variant="outline"
                        onClick={() => adicionarItem(fornecedor.id, fase.id)}
                        className="w-full gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Item
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                <Button
                  variant="outline"
                  onClick={() => adicionarFase(fornecedor.id)}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Fase
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Adicionar Fornecedor */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <Button
              variant="outline"
              onClick={adicionarFornecedor}
              className="w-full gap-2"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Adicionar Fornecedor
            </Button>
          </CardContent>
        </Card>

        {/* Footer com total */}
        <Card className="mt-6 sticky bottom-4 shadow-lg bg-gradient-to-r from-primary to-primary/90 text-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Valor Total do Orçamento</p>
                <p className="text-3xl font-bold">{formatCurrency(calcularTotalGeral())}</p>
              </div>
              <Button onClick={handleSave} disabled={saving} size="lg" variant="secondary">
                <Save className="h-5 w-5 mr-2" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
