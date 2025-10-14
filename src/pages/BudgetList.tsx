import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Edit,
  FileText,
  Calendar,
  DollarSign,
  Search,
  Plus,
  Filter,
  Building2,
  Package,
  TrendingUp,
  MoreVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Budget {
  id: string;
  display_id: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  total_value?: number;
  client_name?: string;
  product_name?: string;
}

type BudgetStatus = "rascunho" | "enviado" | "aprovado" | "rejeitado" | "cancelado";
type BudgetType = "filme" | "audio" | "imagem" | "cc";

export default function BudgetList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BudgetStatus | "todos">("todos");
  const [typeFilter, setTypeFilter] = useState<BudgetType | "todos">("todos");

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
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
          updated_at,
          versions!inner(total_geral),
          campaigns(
            clients(name),
            products(name)
          )
        `,
        )
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formattedBudgets =
        data?.map((budget) => ({
          id: budget.id,
          display_id: budget.display_id,
          type: budget.type,
          status: budget.status,
          created_at: budget.created_at,
          updated_at: budget.updated_at,
          total_value: budget.versions?.[0]?.total_geral || 0,
          client_name: budget.campaigns?.[0]?.clients?.name,
          product_name: budget.campaigns?.[0]?.products?.name,
        })) || [];

      setBudgets(formattedBudgets);
    } catch (error: any) {
      console.error("Error fetching budgets:", error);
      toast({
        title: "Erro ao carregar orçamentos",
        description: error.message || "Não foi possível carregar os orçamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "rascunho":
        return {
          color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
          label: "Rascunho",
        };
      case "enviado":
        return {
          color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
          label: "Enviado",
        };
      case "aprovado":
        return {
          color: "bg-green-500/20 text-green-300 border-green-500/30",
          label: "Aprovado",
        };
      case "rejeitado":
        return {
          color: "bg-red-500/20 text-red-300 border-red-500/30",
          label: "Rejeitado",
        };
      case "cancelado":
        return {
          color: "bg-gray-500/20 text-gray-300 border-gray-500/30",
          label: "Cancelado",
        };
      default:
        return {
          color: "bg-gray-500/20 text-gray-300 border-gray-500/30",
          label: status || "Desconhecido",
        };
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "filme":
        return {
          icon: "🎬",
          label: "Filme",
          color: "text-purple-400",
        };
      case "audio":
        return {
          icon: "🎵",
          label: "Áudio",
          color: "text-blue-400",
        };
      case "imagem":
        return {
          icon: "🖼️",
          label: "Imagem",
          color: "text-green-400",
        };
      case "cc":
        return {
          icon: "📝",
          label: "Closed Caption",
          color: "text-orange-400",
        };
      default:
        return {
          icon: "📄",
          label: type || "Outro",
          color: "text-gray-400",
        };
    }
  };

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

  const filteredBudgets = budgets.filter((budget) => {
    const matchesSearch =
      budget.display_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.product_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "todos" || budget.status === statusFilter;
    const matchesType = typeFilter === "todos" || budget.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const statusOptions: { value: BudgetStatus | "todos"; label: string }[] = [
    { value: "todos", label: "Todos os Status" },
    { value: "rascunho", label: "Rascunho" },
    { value: "enviado", label: "Enviado" },
    { value: "aprovado", label: "Aprovado" },
    { value: "rejeitado", label: "Rejeitado" },
    { value: "cancelado", label: "Cancelado" },
  ];

  const typeOptions: { value: BudgetType | "todos"; label: string }[] = [
    { value: "todos", label: "Todos os Tipos" },
    { value: "filme", label: "Filme" },
    { value: "audio", label: "Áudio" },
    { value: "imagem", label: "Imagem" },
    { value: "cc", label: "Closed Caption" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-8">
          <LoadingState message="Carregando orçamentos..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-8 w-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">Meus Orçamentos</h1>
            </div>
            <p className="text-white/70 text-lg">Gerencie e acompanhe todos os seus orçamentos</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                <Input
                  placeholder="Buscar orçamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white/5 border-white/10 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-800 border-white/10">
                  <div className="p-2">
                    <label className="text-xs font-medium text-white/70 mb-2 block">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as BudgetStatus | "todos")}
                      className="w-full p-2 rounded bg-slate-700 border border-white/10 text-white text-sm"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-2">
                    <label className="text-xs font-medium text-white/70 mb-2 block">Tipo</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as BudgetType | "todos")}
                      className="w-full p-2 rounded bg-slate-700 border border-white/10 text-white text-sm"
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              onClick={() => navigate("/orcamento-novo")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Orçamento
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm font-medium">Total</p>
                  <p className="text-white text-2xl font-bold">{budgets.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm font-medium">Aprovados</p>
                  <p className="text-white text-2xl font-bold">
                    {budgets.filter((b) => b.status === "aprovado").length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-300 text-sm font-medium">Rascunhos</p>
                  <p className="text-white text-2xl font-bold">
                    {budgets.filter((b) => b.status === "rascunho").length}
                  </p>
                </div>
                <Edit className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm font-medium">Valor Total</p>
                  <p className="text-white text-lg font-bold">
                    {formatCurrency(budgets.reduce((sum, b) => sum + (b.total_value || 0), 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budgets List */}
        {filteredBudgets.length === 0 ? (
          <EmptyState
            emoji="📋"
            title={
              searchTerm || statusFilter !== "todos" || typeFilter !== "todos"
                ? "Nenhum resultado encontrado"
                : "Nenhum orçamento encontrado"
            }
            description={
              searchTerm || statusFilter !== "todos" || typeFilter !== "todos"
                ? "Tente ajustar os filtros ou termos de busca"
                : "Crie seu primeiro orçamento para começar"
            }
            action={{
              label:
                searchTerm || statusFilter !== "todos" || typeFilter !== "todos"
                  ? "Limpar filtros"
                  : "Criar Primeiro Orçamento",
              onClick: () => {
                setSearchTerm("");
                setStatusFilter("todos");
                setTypeFilter("todos");
                if (!searchTerm && statusFilter === "todos" && typeFilter === "todos") {
                  navigate("/orcamento-novo");
                }
              },
            }}
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBudgets.map((budget, index) => {
              const statusConfig = getStatusConfig(budget.status);
              const typeConfig = getTypeConfig(budget.type);

              return (
                <motion.div
                  key={budget.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="group"
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 group-hover:border-white/20 h-full">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{typeConfig.icon}</div>
                          <div className="min-w-0">
                            <CardTitle className="text-white text-lg truncate">{budget.display_id}</CardTitle>
                            <p className={`text-sm font-medium capitalize ${typeConfig.color}`}>{typeConfig.label}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/60 hover:text-white">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-800 border-white/10 w-48">
                              <DropdownMenuItem
                                onClick={() => navigate(`/budget/${budget.id}`)}
                                className="text-white hover:bg-white/10 cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/budget/${budget.id}/edit`)}
                                className="text-white hover:bg-white/10 cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/budget/${budget.id}/pdf`)}
                                className="text-white hover:bg-white/10 cursor-pointer"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Gerar PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Client and Product Info */}
                      <div className="space-y-3">
                        {budget.client_name && (
                          <div className="flex items-center gap-2 text-white/80">
                            <Building2 className="h-4 w-4 text-blue-400" />
                            <span className="text-sm truncate">{budget.client_name}</span>
                          </div>
                        )}
                        {budget.product_name && (
                          <div className="flex items-center gap-2 text-white/80">
                            <Package className="h-4 w-4 text-green-400" />
                            <span className="text-sm truncate">{budget.product_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-white/60 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(budget.created_at)}</span>
                        </div>
                        {budget.total_value && budget.total_value > 0 && (
                          <div className="flex items-center gap-1 font-semibold text-green-400">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(budget.total_value)}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/budget/${budget.id}`)}
                          className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/budget/${budget.id}/edit`)}
                          className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/30"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/budget/${budget.id}/pdf`)}
                          className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border-green-500/30"
                          title="Gerar PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
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
