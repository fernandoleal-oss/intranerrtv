import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea"; // se não tiver, troque por <textarea>
import { BudgetForm } from "@/components/BudgetForm";
import { BudgetProvider } from "@/contexts/BudgetContext";
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
  Plus,
  Trash2,
} from "lucide-react";

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
}

/** util */
function isUUID(v?: string) {
  return !!v?.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
}

/** formata número pt-BR */
const money = (n: number | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n || 0
  );

/** parse simples: aceita "1.234,56" e "1234.56" */
const parseCurrency = (val: string | number | undefined): number => {
  if (typeof val === "number") return isFinite(val) ? val : 0;
  if (!val) return 0;
  const clean = String(val).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return isFinite(n) ? n : 0;
};

/** Draft local apenas com o que vamos editar: tem_opcoes/opcoes */
type OptionDraft = {
  id: string;
  nome: string;
  escopo?: string;
  valor?: number;
  desconto?: number;
};
type FornecedorDraft = {
  id?: string;              // opcional — muitos payloads não têm id por fornecedor
  nome?: string;            // usado só para referência visual
  tem_opcoes: boolean;
  opcoes: OptionDraft[];
};
type CategoriaDraft = {
  id?: string;
  nome?: string;
  modoPreco?: string;
  fornecedores: FornecedorDraft[];
};
type CampanhaDraft = {
  id?: string;
  nome?: string;
  categorias: CategoriaDraft[];
};
type OptionsDraft = CampanhaDraft[];

/** extrai campanhas/categorias/fornecedores do payload para nosso draft */
function extractOptionsDraft(payload: any): OptionsDraft {
  if (!payload) return [];
  const baseCampanhas = Array.isArray(payload.campanhas)
    ? payload.campanhas
    : [{ nome: "Campanha Única", categorias: payload.categorias || [] }];

  return baseCampanhas.map((camp: any) => ({
    id: camp.id,
    nome: camp.nome,
    categorias: (camp.categorias || []).map((cat: any) => ({
      id: cat.id,
      nome: cat.nome,
      modoPreco: cat.modoPreco,
      fornecedores: (cat.fornecedores || []).map((f: any, idx: number) => ({
        id: f.id ?? String(idx),
        nome: f.nome,
        tem_opcoes: Boolean(f.tem_opcoes),
        opcoes: Array.isArray(f.opcoes)
          ? f.opcoes.map((o: any, j: number) => ({
              id: o.id ?? `${idx}-${j}`,
              nome: o.nome ?? `Opção ${j + 1}`,
              escopo: o.escopo ?? "",
              valor: parseCurrency(o.valor),
              desconto: parseCurrency(o.desconto),
            }))
          : [],
      })),
    })),
  }));
}

/** aplica o draft de volta no payload original (merge não destrutivo) */
function applyOptionsDraftOnPayload(payload: any, draft: OptionsDraft): any {
  if (!payload) return payload;
  const hasCampanhas = Array.isArray(payload.campanhas);
  const baseCampanhas = hasCampanhas
    ? payload.campanhas
    : [{ nome: "Campanha Única", categorias: payload.categorias || [] }];

  const merged = baseCampanhas.map((camp: any, campIdx: number) => {
    const draftCamp = draft[campIdx];
    const categorias = (camp.categorias || []).map((cat: any, catIdx: number) => {
      const draftCat = draftCamp?.categorias?.[catIdx];

      if (cat.modoPreco !== "fechado") {
        return cat; // só alteramos fornecedores em modo fechado
      }

      const fornecedores = (cat.fornecedores || []).map((f: any, fIdx: number) => {
        const draftF = draftCat?.fornecedores?.[fIdx];
        if (!draftF) return f;

        // aplica tem_opcoes/opcoes preservando o resto do fornecedor
        const nextF = { ...f, tem_opcoes: draftF.tem_opcoes };

        if (draftF.tem_opcoes) {
          nextF.opcoes = (draftF.opcoes || []).map((o: OptionDraft) => ({
            id: o.id,
            nome: o.nome,
            escopo: o.escopo ?? "",
            valor: parseCurrency(o.valor ?? 0),
            desconto: parseCurrency(o.desconto ?? 0),
          }));
        } else {
          // desliga completamente
          delete nextF.opcoes;
        }

        return nextF;
      });

      return { ...cat, fornecedores };
    });

    return { ...camp, categorias };
  });

  // devolve no mesmo formato (com campanhas ou com categorias na raiz)
  if (hasCampanhas) {
    return { ...payload, campanhas: merged };
  }
  return { ...payload, categorias: merged[0]?.categorias || [] };
}

export default function BudgetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [data, setData] = useState<BudgetData | null>(null);
  const [optionsDraft, setOptionsDraft] = useState<OptionsDraft>([]);
  const [savingOptions, setSavingOptions] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const title = useMemo(
    () =>
      data
        ? `Editar Orçamento — ${data.display_id} • ${String(data.type).toUpperCase()}`
        : "Editar Orçamento",
    [data]
  );

  // só informativo; mantemos antes de qualquer return
  const totalQuotesFilme = useMemo(
    () => (data?.payload?.campanhas || []).reduce((acc: number, c: any) => acc + (c?.quotes_film?.length || 0), 0),
    [data]
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
          .select(`
            id,
            payload,
            versao,
            budgets!inner(
              id,
              display_id,
              type,
              status
            )
          `)
          .eq("budget_id", id)
          .order("versao", { ascending: false })
          .limit(1)
          .maybeSingle<VersionRow>();

        if (error) throw error;
        if (!row) throw new Error("not_found");

        const mapped = mapRowToData(row);
        if (!mapped) throw new Error("not_found");

        setData(mapped);
        // inicializa draft das opções com base no payload carregado
        setOptionsDraft(extractOptionsDraft(mapped.payload));

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
