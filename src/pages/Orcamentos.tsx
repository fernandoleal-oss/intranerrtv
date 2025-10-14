import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Film,
  Music,
  Image as ImageIcon,
  FileText,
  Eye,
  Edit,
  Trash2,
  Search,
  Download,
  Filter,
  BarChart3,
  Calendar,
  User,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { HeaderBar } from "@/components/HeaderBar";
import { NavBarDemo } from "@/components/NavBarDemo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
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
        .select(
          `
          id,
          display_id,
          type,
          status,
          created_at,
          versions!inner(payload, total_geral)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: Budget[] = (data || []).map((b: any) => {
        const latestVersion = b.versions?.[0];
        const payload = latestVersion?.payload || {};
        return {
          id: b.id,
          display_id: b.display_id || "—",
          type: b.type,
          status: b.status || "rascunho",
          cliente: payload?.cliente,
          produto: payload?.produto,
          produtor: payload?.produtor,
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
      toast({ title: "Orçamento excluído com sucesso" });
      loadBudgets();
    } catch {
      toast({ title: "Erro ao excluir orçamento", variant: "destructive" });
    }
  };

  const filtered = budgets.filter((b) => {
    const matchType = selectedType === "todos" || b.type === selectedType;
    const matchStatus = selectedStatus === "todos" || b.status === selectedStatus;
    const matchSearch =
      !search ||
      b.display_id.toLowerCase().includes(search.toLowerCase()) ||
      b.cliente?.toLowerCase().includes(search.toLowerCase()) ||
      b.produto?.toLowerCase().includes(search.toLowerCase()) ||
      b.produtor?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const getTypeIcon = (type: BudgetType) => {
    switch (type) {
      case "filme":
        return <Film className="h-4 w-4" />;
      case "audio":
        return <Music className="h-4 w-4" />;
      case "imagem":
        return <ImageIcon className="h-4 w-4" />;
      case "cc":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusConfig = (status: string) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "rascunho":
        return {
          color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
          label: "Rascunho",
        };
      case "enviado":
      case "enviado_atendimento":
        return {
          color: "bg-blue-500/20 text-blue-700 border-blue-500/30",
          label: "Enviado",
        };
      case "aprovado":
        return {
          color: "bg-green-500/20 text-green-700 border-green-500/30",
          label: "Aprovado",
        };
      case "reprovado":
        return {
          color: "bg-red-500/20 text-red-700 border-red-500/30",
          label: "Reprovado",
        };
      default:
        return {
          color: "bg-gray-500/20 text-gray-700 border-gray-500/30",
          label: status || "Desconhecido",
        };
    }
  };

  const stats = useMemo(() => {
    return {
      total: budgets.length,
      rascunhos: budgets.filter((b) => b.status === "rascunho").length,
      aprovados: budgets.filter((b) => b.status === "aprovado").length,
      enviados: budgets.filter((b) => b.status === "enviado" || b.status === "enviado_atendimento").length,
      valorTotal: budgets.reduce((sum, b) => sum + (b.total || 0), 0),
    };
  }, [budgets]);

  const statusOptions = [
    { value: "todos", label: "Todos os Status" },
    { value: "rascunho", label: "Rascunho" },
    { value: "enviado", label: "Enviado" },
    { value: "enviado_atendimento", label: "Enviado Atendimento" },
    { value: "aprovado", label: "Aprovado" },
    { value: "reprovado", label: "Reprovado" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <NavBarDemo />
      <HeaderBar
        title="Orçamentos"
        subtitle="Gerencie e acompanhe todos os seus orçamentos"
        backTo="/"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/orcamento-novo")}
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4" />
              Novo Orçamento
            </Button>
          </div>
        }
      />

      <div className="container-page py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Aprovados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.aprovados}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium">Rascunhos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rascunhos}</p>
                </div>
                <Edit className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Valor Total</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.valorTotal)}</p>
                </div>
                <Download className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6 border-blue-100 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Tipo */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedType === "todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType("todos")}
                  className="bg-blue-600 text-white hover:bg-blue-700"
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

              {/* Status */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {statusOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSelectedStatus(option.value)}
                      className={selectedStatus === option.value ? "bg-blue-50" : ""}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Busca */}
              <div className="relative lg:ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar orçamentos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full lg:w-80 bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Orçamentos */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Carregando orçamentos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-12 border-dashed border-2 border-gray-300 bg-white/50">
            <CardContent>
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {search || selectedType !== "todos" || selectedStatus !== "todos"
                  ? "Nenhum orçamento encontrado"
                  : "Nenhum orçamento criado"}
              </h3>
              <p className="text-gray-600 mb-6">
                {search || selectedType !== "todos" || selectedStatus !== "todos"
                  ? "Tente ajustar os filtros ou termos de busca"
                  : "Comece criando seu primeiro orçamento"}
              </p>
              <Button
                onClick={() => navigate("/orcamento-novo")}
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Orçamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((budget, index) => {
              const statusConfig = getStatusConfig(budget.status);

              return (
                <motion.div
                  key={budget.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Informações principais */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(budget.type)}
                              <h3 className="font-semibold text-gray-900 text-lg">{budget.display_id}</h3>
                            </div>
                            <Badge variant="outline" className={`text-xs font-medium ${statusConfig.color}`}>
                              {statusConfig.label}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            {budget.cliente && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <User className="h-4 w-4 text-blue-600" />
                                <span className="truncate">{budget.cliente}</span>
                              </div>
                            )}
                            {budget.produto && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <Package className="h-4 w-4 text-green-600" />
                                <span className="truncate">{budget.produto}</span>
                              </div>
                            )}
                            {budget.produtor && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <span className="font-medium">Produtor:</span>
                                <span className="truncate">{budget.produtor}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(budget.created_at)}
                            </div>
                            {budget.total && budget.total > 0 && (
                              <div className="flex items-center gap-1 font-semibold text-green-600">
                                <span>{formatCurrency(budget.total)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/budget/${budget.id}`)}
                            className="gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/budget/${budget.id}/edit`)}
                            className="gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/budget/${budget.id}/pdf`)}
                            className="gap-1 border-green-200 text-green-700 hover:bg-green-50"
                            title="Gerar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(budget.id)}
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
