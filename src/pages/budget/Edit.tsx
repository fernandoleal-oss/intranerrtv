// src/pages/budget/Edit.tsx - ORÇAMENTO EMS MULTIMIX COMPLETO

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Home, AlertCircle, RefreshCw, Save, Download, Building2, Users, Calendar, User } from "lucide-react";

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

interface FornecedorItem {
  id: string;
  descricao: string;
  valor: number;
  prazo: string;
  observacoes?: string;
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
  contato?: string;
  cnpj?: string;
}

interface BudgetEditFormProps {
  budgetData: BudgetData;
  onSaveSuccess: (budgetId: string) => void;
  onRefresh: (silent?: boolean) => void;
}

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

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <EmsMultimixBudgetEditForm 
            budgetData={data}
            onSaveSuccess={handleSaveSuccess}
            onRefresh={fetchBudget}
          />
        </motion.div>
      </div>
    </div>
  );
}

// Componente específico para o orçamento EMS MULTIMIX
function EmsMultimixBudgetEditForm({ budgetData, onSaveSuccess, onRefresh }: BudgetEditFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    cliente: "EMS",
    produto: "MULTIMIX",
    job: "ASSETS 3D",
    solicitante: "Luana Rodrigues | WE - luana.rodrigues@we.com.br",
    data_orcamento: new Date().toISOString().split('T')[0],
    observacoes_gerais: "Orçamento apresenta propostas de diferentes fornecedores de forma independente. Cliente pode escolher a melhor opção por fornecedor.",
    fornecedores: [] as Fornecedor[]
  });

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => {
    const payload = budgetData.payload || {};
    
    if (payload.fornecedores && Array.isArray(payload.fornecedores)) {
      return payload.fornecedores;
    }

    // Dados ORIGINAIS do EMS MULTIMIX - VALORES SEPARADOS
    return [
      {
        id: "1",
        nome: "ESTÚDIO PÉ GRANDE",
        total_fornecedor: 236320.00,
        contato: "Contato a definir",
        cnpj: "CNPJ a definir",
        fases: [
          {
            id: "1-1",
            nome: "Multimix Assets 3D - Fase 1",
            total_fase: 82560.00,
            itens: [
              {
                id: "1-1-1",
                descricao: "PACOTE (MODELAGEM + 6 STILLS)",
                valor: 49200.00,
                prazo: "30 dias",
                observacoes: "Inclui modelagem 3D completa + 6 stills profissionais"
              },
              {
                id: "1-1-2",
                descricao: "5 STILLS EXTRAS",
                valor: 27500.00,
                prazo: "18 dias",
                observacoes: "Stills adicionais para ampliação do projeto"
              },
              {
                id: "1-1-3",
                descricao: "1 STILL EXTRA",
                valor: 5860.00,
                prazo: "18 dias",
                observacoes: "Still individual adicional"
              }
            ]
          },
          {
            id: "1-2",
            nome: "Multimix Assets 3D - Fase 2",
            total_fase: 153760.00,
            itens: [
              {
                id: "1-2-1",
                descricao: "PACOTE 1 (MODELAGEM + 9 STILLS)",
                valor: 63700.00,
                prazo: "35 dias",
                observacoes: "Pacote completo com 9 stills"
              },
              {
                id: "1-2-2",
                descricao: "PACOTE 2 (MODELAGEM + 8 STILLS)",
                valor: 56700.00,
                prazo: "35 dias",
                observacoes: "Pacote alternativo com 8 stills"
              },
              {
                id: "1-2-3",
                descricao: "5 STILLS EXTRAS",
                valor: 27500.00,
                prazo: "18 dias",
                observacoes: "Stills adicionais para fase 2"
              },
              {
                id: "1-2-4",
                descricao: "1 STILL EXTRA",
                valor: 5860.00,
                prazo: "18 dias",
                observacoes: "Still individual para fase 2"
              }
            ]
          }
        ]
      },
      {
        id: "2",
        nome: "DIRTY WORD",
        total_fornecedor: 695000.00,
        contato: "Contato a definir", 
        cnpj: "CNPJ a definir",
        fases: [
          {
            id: "2-1",
            nome: "Shooting e Renders",
            total_fase: 695000.00,
            itens: [
              {
                id: "2-1-1",
                descricao: "Embalagens",
                valor: 55000.00,
                prazo: "A combinar",
                observacoes: "Produção de embalagens"
              },
              {
                id: "2-1-2",
                descricao: "Balas",
                valor: 60000.00,
                prazo: "A combinar",
                observacoes: "Produção de assets de balas"
              },
              {
                id: "2-1-3",
                descricao: "Pacote",
                valor: 110000.00,
                prazo: "A combinar",
                observacoes: "Pacote completo de serviços"
              },
              {
                id: "2-1-4",
                descricao: "Ervas Unitario",
                valor: 30000.00,
                prazo: "A combinar",
                observacoes: "Serviços unitários de ervas"
              },
              {
                id: "2-1-5",
                descricao: "Pacote Ervas",
                valor: 270000.00,
                prazo: "A combinar",
                observacoes: "Pacote completo de ervas"
              },
              {
                id: "2-1-6",
                descricao: "Renders unitário",
                valor: 20000.00,
                prazo: "A combinar",
                observacoes: "Renders individuais"
              },
              {
                id: "2-1-7",
                descricao: "Shooting até 10 fotos",
                valor: 150000.00,
                prazo: "A combinar",
                observacoes: "Sessão de shooting fotográfico"
              }
            ]
          }
        ]
      },
      {
        id: "3",
        nome: "MIAGUI IMAGVERTISING",
        total_fornecedor: 247933.27,
        contato: "Natalia Monteiro - natalia.monteiro@miagui.cc",
        cnpj: "19.207.788/0001-30",
        fases: [
          {
            id: "3-1",
            nome: "1. Embalagens (3D / modelagem / beneficiamento)",
            total_fase: 37286.84,
            itens: [
              {
                id: "3-1-1",
                descricao: "Embalagem Adulto (preparação do asset digital)",
                valor: 3717.42,
                prazo: "A combinar",
                observacoes: "Preparação individual do asset digital"
              },
              {
                id: "3-1-2",
                descricao: "Embalagem Kids (preparação do asset digital)",
                valor: 3717.42,
                prazo: "A combinar",
                observacoes: "Preparação individual do asset digital"
              },
              {
                id: "3-1-3",
                descricao: "Bala individual EMBALADA (preparação do asset digital)",
                valor: 3717.42,
                prazo: "A combinar",
                observacoes: "Preparação individual do asset digital"
              },
              {
                id: "3-1-4",
                descricao: "Bala individual SEM EMBALAGEM (preparação do asset digital)",
                valor: 3717.42,
                prazo: "A combinar",
                observacoes: "Preparação individual do asset digital"
              },
              {
                id: "3-1-5",
                descricao: "Imagem individual - Embalagem",
                valor: 2801.68,
                prazo: "A combinar",
                observacoes: "Imagem em fundo neutro (custo unitário)"
              },
              {
                id: "3-1-6",
                descricao: "Imagem individual - Bala embalada",
                valor: 2801.68,
                prazo: "A combinar",
                observacoes: "Imagem em fundo neutro (custo unitário)"
              },
              {
                id: "3-1-7",
                descricao: "Imagem individual - Bala sem embalagem (x2)",
                valor: 5603.36,
                prazo: "A combinar",
                observacoes: "2 imagens em fundo neutro (custo unitário cada)"
              },
              {
                id: "3-1-8",
                descricao: "Combo '1 Adulto + 1 Kids + Pastilha com e sem embalagem' (PACOTE com 5% desconto)",
                valor: 24880.00,
                prazo: "A combinar",
                observacoes: "Pacote: 4 assets + 4 imagens finais. Economia de R$ 1.310,44"
              }
            ]
          },
          {
            id: "3-2",
            nome: "2. Sabores (rótulos) - Cotar por sabor",
            total_fase: 7076.48,
            itens: [
              {
                id: "3-2-1",
                descricao: "Troca de rótulo mantendo o mesmo ângulo/render base (unitário por sabor)",
                valor: 3538.24,
                prazo: "A combinar",
                observacoes: "Alteração de rótulo sem modificar ângulo"
              },
              {
                id: "3-2-2",
                descricao: "Render Adicional (novo ângulo)",
                valor: 3538.24,
                prazo: "A combinar",
                observacoes: "Novo ângulo de visualização"
              }
            ]
          },
          {
            id: "3-3",
            nome: "3. Ervas (3D) - Unitário + Set (10)",
            total_fase: 24473.11,
            itens: [
              {
                id: "3-3-1",
                descricao: "Erva (unitária) - Adicional para novos sabores / ervas",
                valor: 3553.21,
                prazo: "A combinar",
                observacoes: "1 imagem de erva adicional"
              },
              {
                id: "3-3-2",
                descricao: "Pacote com 10 ervas",
                valor: 20919.90,
                prazo: "A combinar",
                observacoes: "10 entregas individuais = 10 imagens finais em fundo neutro. Economia de R$ 14.612,20"
              }
            ]
          },
          {
            id: "3-4",
            nome: "4. Pack ambientado (considerar mockups)",
            total_fase: 42547.82,
            itens: [
              {
                id: "3-4-1",
                descricao: "1 Pack com 2 sabores (asset já desenvolvido)",
                valor: 13583.58,
                prazo: "A combinar",
                observacoes: "Considerando que o asset da embalagem já foi desenvolvido"
              },
              {
                id: "3-4-2",
                descricao: "2 Packs com 5 sabores (asset já desenvolvido)",
                valor: 25426.00,
                prazo: "A combinar",
                observacoes: "Considerando que o asset da embalagem já foi desenvolvido"
              },
              {
                id: "3-4-3",
                descricao: "Atualização de imagem (troca de rótulo no mesmo ângulo) 9:16 | 16:9, 4:5",
                valor: 3538.24,
                prazo: "A combinar",
                observacoes: "Atualização simples de rótulo em diferentes formatos"
              }
            ]
          },
          {
            id: "3-5",
            nome: "5. Humanizada (pessoas/IA)",
            total_fase: 136549.02,
            itens: [
              {
                id: "3-5-1",
                descricao: "Foto humanizada - unitário",
                valor: 12992.11,
                prazo: "A combinar",
                observacoes: "Inclui direção/arte, setup de IA, 1 rodada de ajustes, recorte/tratamento"
              },
              {
                id: "3-5-2",
                descricao: "Pacote 5 fotos humanizadas - ângulos/poses diferentes",
                valor: 61105.00,
                prazo: "A combinar",
                observacoes: "5% de desconto no pacote. Economia de R$ 3.855,55"
              },
              {
                id: "3-5-3",
                descricao: "Pacote 10 fotos humanizadas - ângulos/poses diferentes",
                valor: 115920.00,
                prazo: "A combinar",
                observacoes: "10% de desconto no pacote. Economia de R$ 13.001,10"
              }
            ]
          }
        ]
      }
    ];
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateItemValor = (fornecedorId: string, faseId: string, itemId: string, field: string, value: any) => {
    setFornecedores(prev => 
      prev.map(fornecedor => 
        fornecedor.id === fornecedorId 
          ? {
              ...fornecedor,
              fases: fornecedor.fases.map(fase =>
                fase.id === faseId
                  ? {
                      ...fase,
                      itens: fase.itens.map(item =>
                        item.id === itemId
                          ? { ...item, [field]: value }
                          : item
                      )
                    }
                  : fase
              )
            }
          : fornecedor
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...budgetData.payload,
        type: "imagem",
        cliente: formData.cliente,
        produto: formData.produto,
        job: formData.job,
        solicitante: formData.solicitante,
        data_orcamento: formData.data_orcamento,
        observacoes_gerais: formData.observacoes_gerais,
        fornecedores,
        especificacoes: {
          formatos: ["9:16", "16:9", "4:5"],
          veiculacao: "Internet e mídias alternativas",
          alcance: "Nacional", 
          vigencia: "1 ano"
        },
        observacoes: [
          "Todo material apresentado é considerado produção e propriedade intelectual dos fornecedores, salvo negociação especial.",
          "Os encargos financeiros incidentes sobre o não pagamento dos boletos em data prevista decorrerá de acréscimo de 1% de juros ao mês, acrescidos de 5% de multa.",
          "Em caso de cancelamento deste orçamento após a aprovação, será cobrado custo mínimo de 50% do custo total."
        ]
      };

      const { error: versionError } = await supabase.from("versions").insert([
        {
          budget_id: budgetData.id,
          versao: budgetData.versao + 1,
          payload: payload as any,
          total_geral: 0,
        },
      ]);

      if (versionError) throw versionError;

      const { error: budgetError } = await supabase
        .from("budgets")
        .update({ 
          updated_at: new Date().toISOString(),
          status: budgetData.status
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

  return (
    <div className="space-y-6">
      {/* Banner de Informação */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-900 text-lg">Orçamento EMS MULTIMIX - ASSETS 3D</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm text-blue-800">
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Solicitante: {formData.solicitante}</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>Data: {formData.data_orcamento}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Básicas */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                value={formData.cliente}
                onChange={(e) => updateFormData("cliente", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Input
                value={formData.produto}
                onChange={(e) => updateFormData("produto", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Job</Label>
              <Input
                value={formData.job}
                onChange={(e) => updateFormData("job", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações Gerais</Label>
            <Textarea
              value={formData.observacoes_gerais}
              onChange={(e) => updateFormData("observacoes_gerais", e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Fornecedores */}
      <div className="space-y-6">
        {fornecedores.map((fornecedor) => (
          <Card key={fornecedor.id} className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-xl font-bold">{fornecedor.nome}</div>
                    {fornecedor.contato && (
                      <div className="text-sm text-gray-600">{fornecedor.contato}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    R$ {fornecedor.total_fornecedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-gray-500">Total do Fornecedor</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {fornecedor.fases.map((fase) => (
                  <div key={fase.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-800 text-lg">{fase.nome}</h4>
                      <div className="text-right">
                        <span className="font-bold text-blue-600 text-lg">
                          R$ {fase.total_fase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="text-sm text-gray-500">Total da Fase</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {fase.itens.map((item) => (
                        <div key={item.id} className="grid md:grid-cols-12 gap-4 p-4 border rounded-lg bg-white">
                          <div className="md:col-span-5">
                            <Label>Descrição</Label>
                            <Input
                              value={item.descricao}
                              onChange={(e) => updateItemValor(fornecedor.id, fase.id, item.id, "descricao", e.target.value)}
                              className="mt-1"
                            />
                            {item.observacoes && (
                              <div className="mt-2">
                                <Label>Observações</Label>
                                <Textarea
                                  value={item.observacoes}
                                  onChange={(e) => updateItemValor(fornecedor.id, fase.id, item.id, "observacoes", e.target.value)}
                                  rows={2}
                                  className="mt-1 text-sm"
                                />
                              </div>
                            )}
                          </div>
                          <div className="md:col-span-2">
                            <Label>Valor (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.valor}
                              onChange={(e) => updateItemValor(fornecedor.id, fase.id, item.id, "valor", parseFloat(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Label>Prazo</Label>
                            <Input
                              value={item.prazo}
                              onChange={(e) => updateItemValor(fornecedor.id, fase.id, item.id, "prazo", e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div className="md:col-span-2 flex items-end">
                            <div className="text-right w-full">
                              <div className="font-semibold text-gray-900">
                                R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-sm text-gray-500">Valor Item</div>
                            </div>
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

      {/* Botões de Ação */}
      <div className="flex gap-3 justify-end pt-6 border-t">
        <Button
          onClick={handleSave}
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
              Salvar Orçamento (Nova Versão)
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
    </div>
  );
}