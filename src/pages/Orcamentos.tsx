// src/pages/Orcamentos.tsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileSpreadsheet, Film, Music, Image as ImageIcon, FileText, Eye, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type BudgetType = "FILME" | "AUDIO" | "IMAGEM" | "CLOSED_CAPTION";

interface Budget {
  id: string;
  display_id: string;
  type: BudgetType;
  status: string;
  cliente?: string;
  produto?: string;
  total?: number;
  created_at: string;
}

export default function Orcamentos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<BudgetType | "TODOS">("TODOS");
  const [search, setSearch] = useState("");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from("versions")
        .select(`
          id,
          payload,
          total_geral,
          budgets!inner(
            id,
            display_id,
            type,
            status,
            created_at
          )
        `)
        .order("created_at", { ascending: false, foreignTable: "budgets" });

      if (error) throw error;

      const formatted: Budget[] = (data || []).map((v: any) => ({
        id: v.budgets.id,
        display_id: v.budgets.display_id,
        type: v.budgets.type?.toUpperCase() || "FILME",
        status: v.budgets.status || "RASCUNHO",
        cliente: v.payload?.cliente,
        produto: v.payload?.produto,
        total: v.total_geral,
        created_at: v.budgets.created_at,
      }));

      setBudgets(formatted);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao carregar orçamentos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este orçamento?")) return;
    try {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Orçamento excluído" });
      loadBudgets();
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const filtered = budgets.filter((b) => {
    const matchType = selectedType === "TODOS" || b.type === selectedType;
    const matchSearch =
      !search ||
      b.display_id.toLowerCase().includes(search.toLowerCase()) ||
      b.cliente?.toLowerCase().includes(search.toLowerCase()) ||
      b.produto?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const getTypeIcon = (type: BudgetType) => {
    switch (type) {
      case "FILME": return <Film className="h-4 w-4" />;
      case "AUDIO": return <Music className="h-4 w-4" />;
      case "IMAGEM": return <ImageIcon className="h-4 w-4" />;
      case "CLOSED_CAPTION": return <FileText className="h-4 w-4" />;
      default: return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APROVADO": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "ENVIADO": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "REPROVADO": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "ARQUIVADO": return "bg-neutral-500/10 text-neutral-600 border-neutral-500/20";
      default: return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    }
  };

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Orçamentos</h1>
        <p className="text-neutral-600 mt-1">Gerenciar e criar novos orçamentos</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedType === "TODOS" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("TODOS")}
          >
            Todos
          </Button>
          {(["FILME", "AUDIO", "IMAGEM", "CLOSED_CAPTION"] as BudgetType[]).map((t) => (
            <Button
              key={t}
              variant={selectedType === t ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(t)}
              className="gap-2"
            >
              {getTypeIcon(t)}
              {t === "CLOSED_CAPTION" ? "CC" : t.charAt(0) + t.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 sm:ml-auto">
          <Input
            placeholder="Buscar orçamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button onClick={() => navigate("/orcamentos/novo")} className="whitespace-nowrap gap-2">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-neutral-500">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileSpreadsheet className="h-16 w-16 mx-auto text-neutral-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
          <p className="text-neutral-600 mb-4">Crie seu primeiro orçamento para começar</p>
          <Button onClick={() => navigate("/orcamentos/novo")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Orçamento
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(b.type)}
                      <CardTitle className="text-base">{b.display_id}</CardTitle>
                    </div>
                    <Badge variant="outline" className={getStatusColor(b.status)}>
                      {b.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {b.cliente && (
                    <div className="text-sm">
                      <span className="text-neutral-500">Cliente:</span>{" "}
                      <span className="font-medium">{b.cliente}</span>
                    </div>
                  )}
                  {b.produto && (
                    <div className="text-sm">
                      <span className="text-neutral-500">Produto:</span>{" "}
                      <span className="font-medium">{b.produto}</span>
                    </div>
                  )}
                  {b.total && b.total > 0 && (
                    <div className="text-sm">
                      <span className="text-neutral-500">Total:</span>{" "}
                      <span className="font-semibold text-primary">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(b.total)}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/budget/${b.id}/pdf`)} className="flex-1 gap-1">
                      <Eye className="h-3 w-3" />
                      Ver
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/budget/${b.id}`)} className="flex-1 gap-1">
                      <Edit className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
