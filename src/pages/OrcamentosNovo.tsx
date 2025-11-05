import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  FileText,
  Home,
  AlertCircle,
  RefreshCw,
  Save,
  Download,
  Plus,
  Trash2,
  Building2,
  Users,
} from "lucide-react";

type BudgetType = "filme" | "audio" | "imagem" | "cc" | string;

interface VersionRow {
  id: string;
  versao: number;
  payload: Record<string, any> | null;
  budget_id: string;
  budgets?: {
    id: string;
    display_id: string;
    type: BudgetType;
    status: string;
    budget_number: string;
  };
}

interface BudgetData {
  id: string;
  display_id: string;
  type: BudgetType;
  status: string;
  payload: Record<string, any>;
  version_id: string;
  versao: number;
  budget_number: string;
}

interface FornecedorItem {
  id: string;
  descricao: string;
  valor: number;
  prazo: string;
  categoria?: string;
}

interface FornecedorFase {
  id: string;
  nome: string;
  itens: FornecedorItem[];
  total_fase: number;
}

interface Fornecedor {
  id: string;
  nome: string;
  fases: FornecedorFase[];
  total_fornecedor: number;
}

interface CCBudgetData {
  cliente: string;
  produto: string;
  pecas: Array<{
    descricao: string;
    quantidade: number;
  }>;
  valor_total: number;
}

interface BudgetEditFormProps {
  budgetData: BudgetData;
  onSaveSuccess: (budgetId: string) => void;
  onRefresh: (silent?: boolean) => void;
}

function isUUID(v?: string) {
  return !!v?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

// Componente específico para o orçamento EMS MULTIMIX unificado
function EmsMultimixBudgetEditForm({ budgetData, onSaveSuccess, onRefresh }: BudgetEditFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => {
    const payload = budgetData.payload || {};

    if (payload.fornecedores && Array.isArray(payload.fornecedores)) {
      return payload.fornecedores;
    }

    return [
      {
        id: "1",
        nome: "ESTÚDIO PÉ GRANDE",
        total_fornecedor: 236320.0,
        fases: [
          {
            id: "1-1",
            nome: "Multimix Assets 3D - Fase 1",
            total_fase: 82560.0,
            itens: [
              {
                id: "1-1-1",
                descricao: "PACOTE (MODELAGEM + 6 STILLS)",
                valor: 49200.0,
                prazo: "30 dias",
              },
              {
                id: "1-1-2",
                descricao: "5 STILLS EXTRAS",
                valor: 27500.0,
                prazo: "18 dias",
              },
              {
                id: "1-1-3",
                descricao: "1 STILL EXTRA",
                valor: 5860.0,
                prazo: "18 dias",
              },
            ],
          },
        ],
      },
    ];
  });

  const updateItemValor = (fornecedorId: string, faseId: string, itemId: string, valor: number) => {
    setFornecedores((prev) =>
      prev.map((fornecedor) =>
        fornecedor.id === fornecedorId
          ? {
              ...fornecedor,
              fases: fornecedor.fases.map((fase) =>
                fase.id === faseId
                  ? {
                      ...fase,
                      itens: fase.itens.map((item) => (item.id === itemId ? { ...item, valor } : item)),
                      total_fase: fase.itens.reduce(
                        (total, item) => (item.id === itemId ? total - item.valor + valor : total + item.valor),
                        0,
                      ),
                    }
                  : fase,
              ),
              total_fornecedor: fornecedor.fases.reduce(
                (total, fase) =>
                  total +
                  fase.itens.reduce(
                    (faseTotal, item) =>
                      item.id === itemId && fase.id === faseId
                        ? faseTotal - item.valor + valor
                        : faseTotal + item.valor,
                    0,
                  ),
                0,
              ),
            }
          : fornecedor,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const total_geral = fornecedores.reduce((total, fornecedor) => total + fornecedor.total_fornecedor, 0);

      const payload = {
        ...budgetData.payload,
        type: "imagem",
        cliente: "EMS",
        produto: "MULTIMIX",
        job: "ASSETS 3D",
        fornecedores,
        total_geral,
        solicitante: "Luana Rodrigues | WE - luana.rodrigues@we.com.br",
        data_orcamento: new Date().toISOString().split("T")[0],
        observacoes: [
          "Todo material apresentado é considerado produção e propriedade intelectual dos fornecedores, salvo negociação especial.",
          "Os encargos financeiros incidentes sobre o não pagamento dos boletos em data prevista decorrerá de acréscimo de 1% de juros ao mês, acrescidos de 5% de multa.",
          "Em caso de cancelamento deste orçamento após a aprovação, será cobrado custo mínimo de 50% do custo total.",
        ],
      };

      const { error: versionError } = await supabase.from("versions").insert([
        {
          budget_id: budgetData.id,
          versao: budgetData.versao + 1,
          payload: payload as any,
          total_geral,
        },
      ]);

      if (versionError) throw versionError;

      const { error: budgetError } = await supabase
        .from("budgets")
        .update({
          updated_at: new Date().toISOString(),
          status: budgetData.status,
        })
        .eq("id", budgetData.id);

      if (budgetError) throw budgetError;

      toast({
        title: "✅ Orçamento EMS MULTIMIX atualizado!",
        description: `Versão ${budgetData.versao + 1} salva com sucesso.`,
      });

      onSaveSuccess(budgetData.id);
    } catch (err: any) {
      console.error("[edit-ems-budget] error:", err);
      toast({
        title: "Erro ao atualizar orçamento",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalGeral = fornecedores.reduce((total, fornecedor) => total + fornecedor.total_fornecedor, 0);

  return (
    <div className="space-y-6">
      {/* Fornecedores */}
      <div className="space-y-6">
        {fornecedores.map((fornecedor) => (
          <Card key={fornecedor.id} className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-xl">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-600" />
                  <span>{fornecedor.nome}</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  R$ {fornecedor.total_fornecedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {fornecedor.fases.map((fase) => (
                  <div key={fase.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-800">{fase.nome}</h4>
                      <span className="font-bold text-blue-600">
                        R$ {fase.total_fase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {fase.itens.map((item) => (
                        <div key={item.id} className="grid md:grid-cols-12 gap-4 p-3 border rounded">
                          <div className="md:col-span-6">
                            <Label>Descrição</Label>
                            <div className="mt-1 p-2 bg-gray-50 rounded text-sm">{item.descricao}</div>
                          </div>
                          <div className="md:col-span-2">
                            <Label>Valor (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.valor}
                              onChange={(e) =>
                                updateItemValor(fornecedor.id, fase.id, item.id, parseFloat(e.target.value) || 0)
                              }
                              className="mt-1"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Label>Prazo</Label>
                            <div className="mt-1 p-2 bg-gray-50 rounded text-sm">{item.prazo}</div>
                          </div>
                          <div className="md:col-span-1 flex items-end">
                            <span className="text-sm font-semibold text-gray-700">
                              R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Geral */}
      <Card className="shadow-lg border-green-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">TOTAL GERAL DO PROJETO</h3>
              <p className="text-sm text-gray-600">EMS MULTIMIX - ASSETS 3D</p>
            </div>
            <span className="text-3xl font-bold text-green-600">
              R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-3 justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg">
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Salvando...
            </div>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Orçamento (Nova Versão)
            </>
          )}
        </Button>

        <Button type="button" variant="outline" onClick={() => window.history.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// Componente específico para orçamentos CC
function CCBudgetEditForm({ budgetData, onSaveSuccess, onRefresh }: BudgetEditFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [ccData, setCCData] = useState<CCBudgetData>(() => {
    const payload = budgetData.payload || {};

    if (payload.cliente && payload.produto && payload.pecas) {
      return {
        cliente: payload.cliente || "",
        produto: payload.produto || "",
        pecas: payload.pecas || [],
        valor_total: payload.valor_total || 0,
      };
    }

    return {
      cliente: "",
      produto: "",
      pecas: [
        {
          descricao: "",
          quantidade: 1,
        },
      ],
      valor_total: 900,
    };
  });

  const updateCCField = (field: keyof CCBudgetData, value: any) => {
    setCCData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updatePeca = (index: number, field: keyof CCBudgetData["pecas"][0], value: any) => {
    setCCData((prev) => ({
      ...prev,
      pecas: prev.pecas.map((peca, i) => (i === index ? { ...peca, [field]: value } : peca)),
    }));
  };

  const addPeca = () => {
    setCCData((prev) => ({
      ...prev,
      pecas: [
        ...prev.pecas,
        {
          descricao: "",
          quantidade: 1,
        },
      ],
    }));
  };

  const removePeca = (index: number) => {
    if (ccData.pecas.length > 1) {
      setCCData((prev) => ({
        ...prev,
        pecas: prev.pecas.filter((_, i) => i !== index),
      }));
    }
  };

  const calcularValorTotal = () => {
    const totalPecas = ccData.pecas.reduce((total, peca) => total + peca.quantidade, 0);
    return totalPecas * 900;
  };

  const handleSave = async () => {
    if (!ccData.cliente.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!ccData.produto.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o produto.",
        variant: "destructive",
      });
      return;
    }

    for (let i = 0; i < ccData.pecas.length; i++) {
      if (!ccData.pecas[i].descricao.trim()) {
        toast({
          title: "Campo obrigatório",
          description: `Por favor, informe a descrição da peça ${i + 1}.`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const valor_total = calcularValorTotal();
      const total_pecas = ccData.pecas.reduce((total, peca) => total + peca.quantidade, 0);

      const payload = {
        ...budgetData.payload,
        type: "cc",
        cliente: ccData.cliente,
        produto: ccData.produto,
        pecas: ccData.pecas,
        valor_total,
        total_pecas,
        valor_por_cc: 900,
        solicitante: "Solicitante não informado",
        data_orcamento: new Date().toISOString().split("T")[0],
        observacoes: [
          "Valor unitário por CC: R$ 900,00",
          `Total de peças: ${total_pecas}`,
          "Prazo a combinar conforme complexidade das peças",
        ],
      };

      const { error: versionError } = await supabase.from("versions").insert([
        {
          budget_id: budgetData.id,
          versao: budgetData.versao + 1,
          payload: payload as any,
          total_geral: valor_total,
        },
      ]);

      if (versionError) throw versionError;

      const { error: budgetError } = await supabase
        .from("budgets")
        .update({
          updated_at: new Date().toISOString(),
          status: budgetData.status,
        })
        .eq("id", budgetData.id);

      if (budgetError) throw budgetError;

      toast({
        title: "✅ Orçamento CC atualizado!",
        description: `Versão ${budgetData.versao + 1} salva com sucesso. Total: R$ ${valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      });

      onSaveSuccess(budgetData.id);
    } catch (err: any) {
      console.error("[edit-cc-budget] error:", err);
      toast({
        title: "Erro ao atualizar orçamento",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const valorTotal = calcularValorTotal();
  const totalPecas = ccData.pecas.reduce((total, peca) => total + peca.quantidade, 0);

  return (
    <div className="space-y-6">
      {/* Informações Básicas */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Building2 className="h-5 w-5 text-gray-600" />
            Informações do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cliente" className="text-sm font-medium">
                Cliente *
              </Label>
              <Input
                id="cliente"
                value={ccData.cliente}
                onChange={(e) => updateCCField("cliente", e.target.value)}
                placeholder="Nome do cliente"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="produto" className="text-sm font-medium">
                Produto *
              </Label>
              <Input
                id="produto"
                value={ccData.produto}
                onChange={(e) => updateCCField("produto", e.target.value)}
                placeholder="Nome do produto"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peças Produzidas */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-600" />
              Peças Produzidas
            </div>
            <Button onClick={addPeca} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Peça
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {ccData.pecas.map((peca, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800">Peça {index + 1}</h4>
                  {ccData.pecas.length > 1 && (
                    <Button
                      onClick={() => removePeca(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid md:grid-cols-12 gap-4">
                  <div className="md:col-span-8">
                    <Label>Descrição da Peça *</Label>
                    <Input
                      value={peca.descricao}
                      onChange={(e) => updatePeca(index, "descricao", e.target.value)}
                      placeholder="Descreva a peça produzida..."
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={peca.quantidade}
                      onChange={(e) => updatePeca(index, "quantidade", parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <span className="text-sm font-semibold text-gray-700">
                      R$ {(peca.quantidade * 900).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo e Total */}
      <Card className="shadow-lg border-green-200">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">Resumo</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total de Peças:</span>
                  <span className="font-semibold">{totalPecas}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor por CC:</span>
                  <span className="font-semibold">R$ 900,00</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">TOTAL DO PROJETO</h3>
                  <p className="text-sm text-gray-600">
                    {ccData.cliente && ccData.produto
                      ? `${ccData.cliente} - ${ccData.produto}`
                      : "Cliente e Produto não informados"}
                  </p>
                </div>
                <span className="text-3xl font-bold text-green-600">
                  R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-3 justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg">
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Salvando...
            </div>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Orçamento CC
            </>
          )}
        </Button>

        <Button type="button" variant="outline" onClick={() => window.history.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export default function BudgetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [data, setData] = useState<BudgetData | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const title = useMemo(
    () => (data ? `Editar Orçamento — ${data.display_id} • ${String(data.type).toUpperCase()}` : "Editar Orçamento"),
    [data],
  );

  useEffect(() => {
    document.title = title;
  }, [title]);

  const fetchBudget = useCallback(
    async (silent = false) => {
      if (!id) return;

      if (!isUUID(id)) {
        toast({
          title: "ID inválido",
          description: "O identificador do orçamento é inválido.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (!silent) setLoading(true);
      else setRefetching(true);

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        // Primeiro, buscar o budget para verificar se existe
        const { data: budget, error: budgetError } = await supabase.from("budgets").select("*").eq("id", id).single();

        if (budgetError) throw budgetError;
        if (!budget) throw new Error("not_found");

        // Depois, buscar a última versão
        const { data: versions, error: versionsError } = await supabase
          .from("versions")
          .select("*")
          .eq("budget_id", id)
          .order("versao", { ascending: false })
          .limit(1)
          .single();

        if (versionsError) throw versionsError;
        if (!versions) throw new Error("no_versions");

        const budgetData: BudgetData = {
          id: budget.id,
          display_id: budget.display_id,
          type: budget.type,
          status: budget.status,
          payload: versions.payload || {},
          version_id: versions.id,
          versao: versions.versao ?? 1,
          budget_number: budget.budget_number || "000",
        };

        setData(budgetData);

        if (silent) {
          toast({ title: "Atualizado", description: "Dados recarregados." });
        }
      } catch (err: any) {
        const code = err?.code || err?.message;
        const notFound =
          code === "not_found" ||
          err?.details?.includes("No rows") ||
          err?.message === "not_found" ||
          err?.message === "no_versions";
        toast({
          title: notFound ? "Orçamento não encontrado" : "Erro ao carregar",
          description: notFound
            ? "Verifique o link ou se o orçamento foi removido."
            : (err?.message ?? "Tente novamente em instantes."),
          variant: "destructive",
        });
        if (!silent) navigate("/");
      } finally {
        if (!silent) setLoading(false);
        setRefetching(false);
      }
    },
    [id, navigate, toast],
  );

  useEffect(() => {
    if (id) fetchBudget(false);
    return () => abortRef.current?.abort();
  }, [id, fetchBudget]);

  const handleSaveSuccess = async (budgetId: string) => {
    toast({
      title: "✅ Orçamento atualizado!",
      description: "Redirecionando para visualização...",
    });
    await fetchBudget(true);
    navigate(`/budget/${budgetId}/pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-6 py-8">
          <LoadingState message="Carregando orçamento..." />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-6 py-8">
          <EmptyState
            icon={AlertCircle}
            title="Orçamento não encontrado"
            description="O orçamento que você está procurando não existe ou foi removido."
            action={{
              label: "Voltar para Início",
              onClick: () => navigate("/"),
            }}
            secondaryAction={{
              label: "Tentar novamente",
              onClick: () => fetchBudget(false),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Editar Orçamento</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <p className="text-gray-600">{data.display_id}</p>
                  <StatusBadge status={data.status} />
                  <span className="text-gray-500 text-sm capitalize">• {String(data.type)}</span>
                  <span className="text-gray-500 text-sm">• Nº {data.budget_number}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => fetchBudget(true)} variant="outline" className="gap-2" disabled={refetching}>
                <RefreshCw className={`h-4 w-4 ${refetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>

              <Button onClick={() => navigate(`/budget/${data.id}/pdf`)} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Ver PDF
              </Button>

              <Button onClick={() => navigate("/orcamentos")} variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Orçamentos
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {data.type === "imagem" ? (
            <EmsMultimixBudgetEditForm budgetData={data} onSaveSuccess={handleSaveSuccess} onRefresh={fetchBudget} />
          ) : data.type === "cc" ? (
            <CCBudgetEditForm budgetData={data} onSaveSuccess={handleSaveSuccess} onRefresh={fetchBudget} />
          ) : (
            <div className="text-center p-8">
              <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Editor não disponível para este tipo</h2>
              <p className="text-gray-500 mb-4">
                O editor específico para orçamentos do tipo "{data.type}" ainda não foi implementado.
              </p>
              <Button onClick={() => navigate(`/budget/${data.id}/pdf`)}>Ver PDF do Orçamento</Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
