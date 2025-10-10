import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BudgetForm } from "@/components/BudgetForm";
import { BudgetProvider } from "@/contexts/BudgetContext";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Home, AlertCircle, RefreshCw, Save } from "lucide-react";

type BudgetType = "filme" | "audio" | "imagem" | "cc" | string;

interface VersionRow {
  id: string;
  payload: Record<string, any> | null;
  budgets: {
    id: string;
    display_id: string;
    type: BudgetType;
    status: string;
  } | null;
}

interface BudgetData {
  id: string;
  display_id: string;
  type: BudgetType;
  status: string;
  payload: Record<string, any>;
  version_id: string;
}

function isUUID(v?: string) {
  return !!v?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

// checksum baratinho pra usar em "key"
function checksum(obj: any) {
  try {
    const s = JSON.stringify(obj ?? {});
    let h = 0,
      i = 0,
      len = s.length;
    while (i < len) {
      h = (h << 5) - h + s.charCodeAt(i++) /*|0*/;
      h |= 0;
    }
    return String(h);
  } catch {
    return "0";
  }
}

export default function BudgetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [data, setData] = useState<BudgetData | null>(null);

  // abort entre trocas de rota
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
    };
    // OBS: se o seu BudgetForm exige outro formato, adapte aqui.
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

      // cancela requisições anteriores
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
              status
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
    // cleanup abort ao desmontar
    return () => abortRef.current?.abort();
  }, [id, fetchBudget]);

  const handleSaveClick = () => {
    if (data?.id) {
      window.dispatchEvent(
        new CustomEvent("budget:save", {
          detail: { budgetId: data.id, versionId: data.version_id },
        }),
      );
      toast({
        title: "Solicitado",
        description: "Salvando alterações…",
      });
    }
  };

  // ✅ chave que força o remount do BudgetForm quando o payload/versão mudarem
  const formKey = useMemo(() => (data ? `${data.version_id}:${checksum(data.payload)}` : "initial"), [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-8">
          <LoadingState message="Carregando orçamento..." />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
    <BudgetProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="nav-button gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Editar Orçamento</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <p className="text-white/70">{data.display_id}</p>
                  <StatusBadge status={data.status} />
                  <span className="text-white/50 text-sm capitalize">• {String(data.type)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => fetchBudget(true)}
                variant="outline"
                className="nav-button gap-2"
                disabled={refetching}
              >
                <RefreshCw className={`h-4 w-4 ${refetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>

              <Button
                onClick={handleSaveClick}
                variant="secondary"
                className="nav-button gap-2"
                title="Salvar alterações do formulário (atalho: Ctrl/Cmd+S)"
              >
                <Save className="h-4 w-4" />
                Salvar
              </Button>

              <Button onClick={() => navigate("/")} variant="outline" className="nav-button gap-2">
                <Home className="h-4 w-4" />
                Início
              </Button>

              <Button onClick={() => navigate(`/budget/${data.id}/pdf`)} className="btn-gradient gap-2">
                <FileText className="h-4 w-4" />
                Ver PDF
              </Button>
            </div>
          </motion.div>

          {/* Form Content */}
          <motion.div
            key={data.version_id} // re-render de animação quando muda versão
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <BudgetForm
              key={formKey} // 🔑 força remontagem ao chegar/alterar payload
              budgetId={data.id}
              versionId={data.version_id}
              initialPayload={data.payload || {}} // passa exatamente o que foi salvo
            />
          </motion.div>
        </div>
      </div>
    </BudgetProvider>
  );
}
