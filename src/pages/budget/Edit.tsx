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
import { SupplierOptionsManager } from "@/components/budget/SupplierOptionsManager";

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
      console.log("🔵 Carregando orçamento para edição:", id);
      
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

        console.log("📦 Dados carregados:", row);

        if (error) throw error;
        if (!row) throw new Error("Orçamento não encontrado");

        const payload = row.payload as any;
        console.log("📋 Payload:", payload);

        setBudgetData({
          id: row.budgets!.id,
          version_id: row.id,
          payload: payload,
        });

  // Detectar estrutura e converter se necessário
  if (payload?.fornecedores && Array.isArray(payload.fornecedores)) {
    console.log("✅ Formato com fornecedores detectado");
    // Migrar para nova estrutura com opções se necessário
    const fornecedoresMigrados = payload.fornecedores.map((f: any) => {
      // Se já tem opções, manter
      if (f.opcoes && Array.isArray(f.opcoes)) {
        return f;
      }
      // Se tem fases diretamente, migrar para opções
      if (f.fases && Array.isArray(f.fases)) {
        return {
          ...f,
          opcoes: [{
            id: crypto.randomUUID(),
            nome: "Opção 1",
            fases: f.fases
          }]
        };
      }
      // Fornecedor vazio
      return {
        ...f,
        opcoes: [{
          id: crypto.randomUUID(),
          nome: "Opção 1",
          fases: []
        }]
      };
    });
    setFornecedores(fornecedoresMigrados);
  } else if (payload?.campanhas && Array.isArray(payload.campanhas)) {
          // Formato novo com campanhas/categorias - converter para fornecedores
          console.log("✅ Formato com campanhas detectado, convertendo...");
          const fornecedoresConvertidos = convertCampanhasToFornecedores(payload);
          setFornecedores(fornecedoresConvertidos);
        } else if (payload?.type === "livre" && payload?.itens && Array.isArray(payload.itens)) {
          // Formato livre do OrcamentoZero - converter para fornecedores
          console.log("✅ Formato livre detectado, convertendo...");
          const fornecedoresConvertidos = convertLivreToFornecedores(payload);
          setFornecedores(fornecedoresConvertidos);
        } else {
          console.log("⚠️ Estrutura não reconhecida, iniciando vazio");
          setFornecedores([]);
        }
      } catch (err: any) {
        console.error("❌ Erro ao carregar:", err);
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

  // Converter formato livre (OrcamentoZero) em fornecedores
  const convertLivreToFornecedores = (payload: any): Fornecedor[] => {
    const itens = payload.itens || [];
    
    // Criar um fornecedor único com todos os itens em uma opção
    const fornecedor: Fornecedor = {
      id: crypto.randomUUID(),
      nome: payload.tipo_servico || "Itens do Orçamento",
      contato: "",
      opcoes: [{
        id: crypto.randomUUID(),
        nome: "Opção 1",
        fases: [{
          id: crypto.randomUUID(),
          nome: "Itens",
          itens: itens.map((item: any) => ({
            id: crypto.randomUUID(),
            nome: item.descricao || "",
            valor: item.valor || 0,
            prazo: "",
            observacao: "",
            desconto: 0
          }))
        }]
      }]
    };

    return [fornecedor];
  };

  // Converter formato campanhas/categorias em fornecedores
  const convertCampanhasToFornecedores = (payload: any): Fornecedor[] => {
    const campanhas = payload.campanhas || [];
    const fornecedoresMap = new Map<string, Fornecedor>();

    campanhas.forEach((campanha: any) => {
      const categorias = campanha.categorias || [];
      
      categorias.forEach((categoria: any) => {
        const fornecedoresCat = categoria.fornecedores || [];
        
        fornecedoresCat.forEach((forn: any) => {
          const fornecedorId = forn.id || forn.nome || crypto.randomUUID();
          
          if (!fornecedoresMap.has(fornecedorId)) {
            fornecedoresMap.set(fornecedorId, {
              id: fornecedorId,
              nome: forn.nome || "Fornecedor Sem Nome",
              contato: forn.contato || "",
              cnpj: forn.cnpj || "",
              desconto: forn.desconto || 0,
              opcoes: [{
                id: crypto.randomUUID(),
                nome: "Opção 1",
                fases: []
              }]
            });
          }

          const fornecedor = fornecedoresMap.get(fornecedorId)!;
          const primeiraOpcao = fornecedor.opcoes[0];
          
          let fase = primeiraOpcao.fases.find(f => f.nome === campanha.nome);
          if (!fase) {
            fase = {
              id: crypto.randomUUID(),
              nome: campanha.nome,
              itens: []
            };
            primeiraOpcao.fases.push(fase);
          }

          const item = {
            id: crypto.randomUUID(),
            nome: categoria.nome,
            valor: forn.valor || 0,
            prazo: "",
            observacao: categoria.observacao || "",
            desconto: forn.desconto || 0
          };
          fase.itens.push(item);
        });
      });
    });

    return Array.from(fornecedoresMap.values());
  };

  // Calcular totais
  const calcularTotalOpcao = (opcao: FornecedorOpcao) => {
    return opcao.fases.reduce((sum, fase) => {
      return sum + fase.itens.reduce((itemSum, item) => itemSum + (item.valor - (item.desconto || 0)), 0);
    }, 0);
  };

  const calcularTotalFornecedor = (fornecedor: Fornecedor) => {
    // Somar todas as opções
    const subtotal = fornecedor.opcoes.reduce((sum, opcao) => sum + calcularTotalOpcao(opcao), 0);
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
      opcoes: [{
        id: crypto.randomUUID(),
        nome: "Opção 1",
        fases: []
      }]
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

  const atualizarFornecedorCompleto = (fornecedor: Fornecedor) => {
    setFornecedores(fornecedores.map(f => 
      f.id === fornecedor.id ? fornecedor : f
    ));
  };

  // Removemos os handlers antigos de Fase e Item, pois agora são gerenciados pelo SupplierOptionsManager

  // Salvar alterações
  const handleSave = async () => {
    setSaving(true);
    console.log("💾 Salvando orçamento...");
    
    try {
      if (!budgetData) throw new Error("Dados do orçamento não encontrados");

      const totalGeral = calcularTotalGeral();
      
      // Remove estruturas antigas para evitar duplicação no PDF
      const { itens, campanhas, categorias, type, ...cleanPayload } = budgetData.payload;
      
      const payload = {
        ...cleanPayload,
        fornecedores: fornecedores,
        estrutura: 'fornecedores_fases'
      };

      console.log("📦 Payload a salvar:", payload);
      console.log("💰 Total geral:", totalGeral);

      // Atualizar versão existente
      const { error: updateError } = await supabase
        .from("versions")
        .update({
          payload: payload,
          total_geral: totalGeral,
          updated_at: new Date().toISOString()
        })
        .eq("id", budgetData.version_id);

      if (updateError) {
        console.error("❌ Erro ao atualizar:", updateError);
        throw updateError;
      }

      console.log("✅ Orçamento salvo com sucesso!");
      
      toast({
        title: "Orçamento salvo!",
        description: "As alterações foram salvas com sucesso.",
      });

      // Navegar de volta para visualização
      setTimeout(() => {
        navigate(`/budget/${budgetData.id}`);
      }, 500);
    } catch (err: any) {
      console.error("❌ Erro ao salvar:", err);
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
                <p className="text-sm text-muted-foreground">Total de Opções</p>
                <p className="text-2xl font-bold">
                  {fornecedores.reduce((sum, f) => sum + f.opcoes.length, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Fases</p>
                <p className="text-2xl font-bold">
                  {fornecedores.reduce((sum, f) => 
                    sum + f.opcoes.reduce((s, op) => s + op.fases.length, 0), 0
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
              
              <CardContent className="pt-6">
                <SupplierOptionsManager
                  fornecedor={fornecedor}
                  onUpdate={atualizarFornecedorCompleto}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Adicionar Fornecedor */}
        <Button
          onClick={adicionarFornecedor}
          className="w-full"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Fornecedor
        </Button>
      </div>
    </AppLayout>
  );
}
