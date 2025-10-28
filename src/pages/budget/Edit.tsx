import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Home, AlertCircle, RefreshCw, Save, Download } from "lucide-react";
import OrcamentoNovo from "./OrcamentoNovo";

type BudgetType = "filme" | "audio" | "imagem" | "cc" | string;

interface VersionRow {
  id: string;
  versao: number;
  payload: Record<string, any> | null;
  budgets: {
    id: string;
    display_id: string;
    type: BudgetType;
    status: string;
    budget_number: string;
  } | null;
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

/** util */
function isUUID(v?: string) {
  return !!v?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
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

  const mapRowToData = (row: VersionRow): BudgetData | null => {
    if (!row?.budgets) return null;
    return {
      id: row.budgets.id,
      display_id: row.budgets.display_id,
      type: row.budgets.type,
      status: row.budgets.status,
      payload: row.payload || {},
      version_id: row.id,
      versao: row.versao ?? 1,
      budget_number: row.budgets.budget_number || "000",
    };
  };

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
        const { data: row, error } = await supabase
          .from("versions")
          .select(
            `
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
          `,
          )
          .eq("budget_id", id)
          .order("versao", { ascending: false })
          .limit(1)
          .maybeSingle<VersionRow>();

        if (error) throw error;
        if (!row) throw new Error("not_found");

        const mapped = mapRowToData(row);
        if (!mapped) throw new Error("not_found");

        setData(mapped);

        if (silent) {
          toast({ title: "Atualizado", description: "Dados recarregados." });
        }
      } catch (err: any) {
        const code = err?.code || err?.message;
        const notFound = code === "not_found" || err?.details?.includes("No rows");
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
    // Recarrega os dados para garantir que estamos vendo a versão mais recente
    await fetchBudget(true);
    navigate(`/budget/${budgetId}/pdf`);
  };

  // ---------------- Renders condicionais ----------------

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

  // Se for orçamento de imagem, redirecionar para o editor específico
  if (data.type === "imagem") {
    navigate(`/budget/${data.id}/edit-image`);
    return null;
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
              <Button
                onClick={() => fetchBudget(true)}
                variant="outline"
                className="gap-2"
                disabled={refetching}
              >
                <RefreshCw className={`h-4 w-4 ${refetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>

              <Button 
                onClick={() => navigate(`/budget/${data.id}/pdf`)} 
                variant="outline" 
                className="gap-2"
              >
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

      {/* Conteúdo Principal - Usando o OrcamentoNovo com modo de edição */}
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BudgetEditForm 
            budgetData={data}
            onSaveSuccess={handleSaveSuccess}
            onRefresh={fetchBudget}
          />
        </motion.div>
      </div>
    </div>
  );
}

// Componente interno para edição que estende o OrcamentoNovo
interface BudgetEditFormProps {
  budgetData: BudgetData;
  onSaveSuccess: (budgetId: string) => void;
  onRefresh: (silent?: boolean) => void;
}

function BudgetEditForm({ budgetData, onSaveSuccess, onRefresh }: BudgetEditFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Preparar os dados para o formulário de edição
  const initialData = useMemo(() => {
    const payload = budgetData.payload || {};
    
    return {
      ...payload,
      // Garantir que campos obrigatórios estejam presentes
      type: payload.type || budgetData.type,
      cliente: payload.cliente || "",
      produto: payload.produto || "",
      // Garantir que arrays existam
      campanhas: Array.isArray(payload.campanhas) ? payload.campanhas : [],
      fornecedores: Array.isArray(payload.fornecedores) ? payload.fornecedores : [],
      totais_campanhas: Array.isArray(payload.totais_campanhas) ? payload.totais_campanhas : [],
    };
  }, [budgetData]);

  const handleSave = async (formData: any) => {
    setSaving(true);
    try {
      // Preparar payload para atualização
      const payload = {
        ...formData,
        // Manter campos importantes
        id: budgetData.id,
        display_id: budgetData.display_id,
        budget_number: budgetData.budget_number,
      };

      // Criar nova versão
      const { error: versionError } = await supabase.from("versions").insert([
        {
          budget_id: budgetData.id,
          versao: budgetData.versao + 1,
          payload: payload as any,
          total_geral: formData.total || 0,
        },
      ]);

      if (versionError) throw versionError;

      // Atualizar status do budget se necessário
      const { error: budgetError } = await supabase
        .from("budgets")
        .update({ 
          updated_at: new Date().toISOString(),
          status: formData.status || budgetData.status
        })
        .eq("id", budgetData.id);

      if (budgetError) throw budgetError;

      toast({
        title: "✅ Orçamento atualizado!",
        description: `Versão ${budgetData.versao + 1} salva com sucesso.`,
      });

      onSaveSuccess(budgetData.id);
      
    } catch (err: any) {
      console.error("[edit-budget] error:", err);
      toast({
        title: "Erro ao atualizar orçamento",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Se não temos dados suficientes, mostrar loading
  if (!initialData.cliente || !initialData.produto) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-8 text-center">
          <LoadingState message="Preparando formulário de edição..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Informação de Edição */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-900 text-lg">Editando Orçamento</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm text-blue-800">
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span>
                    <strong>Nº {budgetData.budget_number}</strong> • {budgetData.display_id}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span>
                    Versão atual: <strong>{budgetData.versao}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span>As alterações criarão uma nova versão do orçamento</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span>Status atual: <StatusBadge status={budgetData.status} /></span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Edição - Usando lógica similar ao OrcamentoNovo */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Save className="h-6 w-6 text-green-600" />
            Formulário de Edição
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <EditFormContent 
            initialData={initialData}
            onSave={handleSave}
            saving={saving}
            budgetNumber={budgetData.budget_number}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Componente do formulário de edição
interface EditFormContentProps {
  initialData: any;
  onSave: (data: any) => void;
  saving: boolean;
  budgetNumber: string;
}

function EditFormContent({ initialData, onSave, saving, budgetNumber }: EditFormContentProps) {
  const [formData, setFormData] = useState(initialData);

  // Atualizar dados do formulário
  const updateFormData = (updates: any) => {
    setFormData((prev: any) => ({ ...prev, ...updates }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campos básicos */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label htmlFor="cliente" className="flex items-center gap-1 text-sm font-semibold">
            Cliente <span className="text-red-500">*</span>
          </Label>
          <Input
            id="cliente"
            value={formData.cliente || ""}
            onChange={(e) => updateFormData({ cliente: e.target.value })}
            placeholder="Nome do cliente"
            className="h-12"
            required
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="produto" className="flex items-center gap-1 text-sm font-semibold">
            Produto <span className="text-red-500">*</span>
          </Label>
          <Input
            id="produto"
            value={formData.produto || ""}
            onChange={(e) => updateFormData({ produto: e.target.value })}
            placeholder="Nome do produto"
            className="h-12"
            required
          />
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-6 border-t">
        <Button
          type="submit"
          disabled={saving}
          className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Salvando...
            </div>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações (Nova Versão)
            </>
          )}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancelar
        </Button>
      </div>

      {/* Informação da versão */}
      <div className="text-sm text-gray-500 text-center">
        Esta ação criará a versão {initialData.versao ? initialData.versao + 1 : 1} do orçamento {budgetNumber}
      </div>
    </form>
  );
}