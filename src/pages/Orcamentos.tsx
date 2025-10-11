import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Film, Music, Image as ImageIcon, FileText, Eye, Edit, Trash2, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { HeaderBar } from "@/components/HeaderBar";
import { NavBarDemo } from "@/components/NavBarDemo";

type BudgetType = "filme" | "audio" | "imagem" | "cc";

interface Budget {
  id: string;
  display_id: string;
  type: BudgetType;
  status: string;
  cliente?: string;
  produto?: string;
  produtor?: string;
  total?: number;
  created_at: string;
}

export default function Orcamentos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<BudgetType | "todos">("todos");
  const [search, setSearch] = useState("");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select(`
          id,
          display_id,
          type,
          status,
          created_at,
          versions!inner(payload, total_geral)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: Budget[] = (data || []).map((b: any) => {
        const latestVersion = b.versions?.[0];
        const produtor = latestVersion?.payload?.produtor || "—";
        return {
          id: b.id,
          display_id: b.display_id || "—",
          type: b.type,
          status: b.status || "rascunho",
          cliente: latestVersion?.payload?.cliente,
          produto: latestVersion?.payload?.produto,
          produtor,
          total: latestVersion?.total_geral,
          created_at: b.created_at,
        };
      });

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
    const matchType = selectedType === "todos" || b.type === selectedType;
    const matchSearch =
      !search ||
      b.display_id.toLowerCase().includes(search.toLowerCase()) ||
      b.cliente?.toLowerCase().includes(search.toLowerCase()) ||
      b.produto?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const getTypeIcon = (type: BudgetType) => {
    switch (type) {
      case "filme": return <Film className="h-4 w-4" />;
      case "audio": return <Music className="h-4 w-4" />;
      case "imagem": return <ImageIcon className="h-4 w-4" />;
      case "cc": return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      rascunho: "secondary",
      enviado_atendimento: "default",
      aprovado: "success",
      reprovado: "destructive",
    };
    return variants[status] || "secondary";
  };

  // Pricing cards summary
  type BudgetSummary = {
    plano: "Startup" | "Growth" | "Enterprise";
    headline: string;
    sub: string;
    priceLabel: string;
    bullets: string[];
    cta: { label: string; action?: () => void };
  };

  const dados = useMemo(() => {
    if (filtered.length === 0) return null;
    const total = filtered.reduce((sum, b) => sum + (b.total || 0), 0);
    return {
      total,
      count: filtered.length,
      rascunhos: filtered.filter(b => b.status === "rascunho").length,
      aprovados: filtered.filter(b => b.status === "aprovado").length,
    };
  }, [filtered]);

  const fmtBRL = (n?: number) =>
    typeof n === "number"
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "—";

  const cards: BudgetSummary[] = useMemo(() => {
    return [
      {
        plano: "Startup",
        headline: dados ? `${dados.count} Orçamentos` : "Nenhum orçamento",
        sub: dados 
          ? `${dados.rascunhos} rascunhos • ${dados.aprovados} aprovados`
          : "Crie seu primeiro orçamento para começar",
        priceLabel: dados ? `${fmtBRL(dados.total)} / total` : "Aguardando valores",
        bullets: [
          `Total de orçamentos: ${dados?.count || 0}`,
          `Status rascunho: ${dados?.rascunhos || 0}`,
          `Status aprovado: ${dados?.aprovados || 0}`,
          "Filtros por tipo e busca",
        ],
        cta: { label: "Ver todos", action: () => {} },
      },
      {
        plano: "Growth",
        headline: "Criar novo orçamento",
        sub: "Escolha entre orçamento do zero ou com template",
        priceLabel: "Rápido e organizado",
        bullets: [
          "Importe da planilha (idempotente)",
          "Adicione fornecedores e versões",
          "Calcule honorários automaticamente",
          "Validação por campos obrigatórios",
        ],
        cta: { label: "Novo orçamento", action: () => navigate("/orcamentos/novo") },
      },
      {
        plano: "Enterprise",
        headline: "Relatórios & Exportação",
        sub: "Pronto para envio ao atendimento/cliente",
        priceLabel: "Gere PDF a qualquer momento",
        bullets: [
          "PDF de faturamento bonito",
          "Quebras de página automáticas",
          "Sumário por cliente/fornecedor",
          "Status e timeline do orçamento",
        ],
        cta: { label: "Ver orçamentos", action: () => {} },
      },
    ];
  }, [dados, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <NavBarDemo />
      <HeaderBar
        title="Orçamentos"
        subtitle="Gerenciar e criar novos orçamentos"
        backTo="/"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => navigate("/orcamentos/novo/zero")} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Orçamento do Zero
            </Button>
            <Button onClick={() => navigate("/orcamentos/novo")} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Orçamento
            </Button>
          </div>
        }
      />

      <div className="container-page">
        {/* Pricing Cards Summary */}
        <section className="mb-8">
          <div className="text-center mb-8">
            <span className="inline-flex items-center px-3 py-1 text-xs rounded-full border">Orçamentos</span>
            <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
              Gerencie seus orçamentos
            </h1>
            <p className="mt-3 text-muted-foreground">
              Visualize, crie e exporte orçamentos de produção
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {cards.map((c, i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader>
                  <CardTitle>{c.headline}</CardTitle>
                  <CardDescription>{c.sub}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold mb-4">{c.priceLabel}</div>
                  <ul className="space-y-2">
                    {c.bullets.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={c.cta.action}>{c.cta.label}</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* Filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedType === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("todos")}
            >
              Todos
            </Button>
            {(["filme", "audio", "imagem", "cc"] as BudgetType[]).map((t) => (
              <Button
                key={t}
                variant={selectedType === t ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(t)}
                className="gap-2"
              >
                {getTypeIcon(t)}
                {t === "cc" ? "CC" : t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>

          <div className="sm:ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar orçamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
              <p className="text-muted-foreground mb-4">Crie seu primeiro orçamento para começar</p>
              <Button onClick={() => navigate("/orcamentos/novo")} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Orçamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(b.type)}
                        <div>
                          <CardTitle className="text-base">{b.display_id}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            Prod.: {b.produtor || "—"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusBadge(b.status) as any}>
                        {b.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {b.cliente && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Cliente:</span>{" "}
                        <span className="font-medium">{b.cliente}</span>
                      </div>
                    )}
                    {b.produto && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Produto:</span>{" "}
                        <span className="font-medium">{b.produto}</span>
                      </div>
                    )}
                    {b.total && b.total > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Total:</span>{" "}
                        <span className="font-semibold text-primary">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(b.total)}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/budget/${b.id}`)} className="flex-1 gap-1">
                        <Eye className="h-3 w-3" />
                        Ver
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/budget/${b.id}/edit`)} className="flex-1 gap-1">
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
      </div>
    </div>
  );
}
