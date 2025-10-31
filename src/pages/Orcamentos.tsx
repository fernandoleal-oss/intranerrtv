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
  Upload,
  FileUp,
  Brain,
  Sparkles,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface ExtractedBudgetData {
  fornecedor: string;
  fases: Array<{
    nome: string;
    itens: Array<{
      descricao: string;
      valor: number;
      prazo?: string;
    }>;
    total: number;
  }>;
  total_geral: number;
  prazos_entregas: string[];
  observacoes: string[];
}

export default function Orcamentos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<BudgetType | "todos">("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para o upload de PDF
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedBudgetData | null>(null);
  const [processing, setProcessing] = useState(false);

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
        `
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

  // Função para processar upload de PDF
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "Arquivo muito grande",
        description: "O PDF deve ter menos de 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setExtractedData(null);

    try {
      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Criar FormData para upload
      const formData = new FormData();
      formData.append("pdf", file);

      // Fazer upload para o endpoint de processamento
      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error("Falha no processamento do PDF");
      }

      const result = await response.json();
      
      setUploadProgress(100);
      setExtractedData(result.data);
      
      toast({
        title: "PDF processado com sucesso!",
        description: `Orçamento extraído de ${result.data.fornecedor}`,
      });

    } catch (error) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro ao processar PDF",
        description: "Não foi possível extrair os dados do orçamento",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Função para criar orçamento a partir dos dados extraídos
  const createBudgetFromExtractedData = async () => {
    if (!extractedData) return;

    setProcessing(true);
    try {
      // Gerar ID de exibição
      const timestamp = new Date().getTime();
      const displayId = `ORC-${timestamp.toString().slice(-6)}`;

      // Criar estrutura do payload
      const payload = {
        cliente: "Cliente a definir",
        produto: "Produto a definir",
        produtor: "Produtor a definir",
        fornecedor: extractedData.fornecedor,
        fases: extractedData.fases.map(fase => ({
          nome: fase.nome,
          itens: fase.itens.map(item => ({
            descricao: item.descricao,
            quantidade: 1,
            unidade: "un",
            valor_unitario: item.valor,
            valor_total: item.valor,
            prazo: item.prazo || ""
          })),
          total: fase.total
        })),
        observacoes: extractedData.observacoes,
        prazos_entregas: extractedData.prazos_entregas
      };

      // Inserir no banco de dados
      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .insert({
          display_id: displayId,
          type: "filme", // Tipo padrão, pode ser ajustado depois
          status: "rascunho"
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Criar versão do orçamento
      const { error: versionError } = await supabase
        .from("versions")
        .insert({
          budget_id: budgetData.id,
          payload: payload,
          total_geral: extractedData.total_geral,
          version_number: 1
        });

      if (versionError) throw versionError;

      toast({
        title: "Orçamento criado!",
        description: `Orçamento ${displayId} criado a partir do PDF`,
      });

      setUploadDialogOpen(false);
      setExtractedData(null);
      loadBudgets(); // Recarregar lista

    } catch (error) {
      console.error("Erro ao criar orçamento:", error);
      toast({
        title: "Erro ao criar orçamento",
        description: "Não foi possível salvar os dados extraídos",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
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
            {/* Botão de Upload de PDF com IA */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 border-green-500 text-green-700 hover:bg-green-50 hover:text-green-800"
                >
                  <Brain className="h-4 w-4" />
                  Extrair de PDF
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-600" />
                    Extrair Orçamento de PDF
                  </DialogTitle>
                  <DialogDescription>
                    Faça upload de PDFs de fornecedores e a IA extrairá automaticamente as informações do orçamento
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload de PDF</TabsTrigger>
                    <TabsTrigger value="preview" disabled={!extractedData}>
                      Pré-visualização
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-4">
                    <Card className="border-2 border-dashed border-green-300 bg-green-50/50">
                      <CardContent className="p-6 text-center">
                        <FileUp className="h-12 w-12 mx-auto text-green-600 mb-4" />
                        <h3 className="text-lg font-semibold text-green-900 mb-2">
                          Upload de PDF do Fornecedor
                        </h3>
                        <p className="text-green-700 mb-4">
                          A IA vai extrair automaticamente: fornecedor, fases, itens, valores e prazos
                        </p>
                        
                        <div className="space-y-4">
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={handlePdfUpload}
                            disabled={uploading}
                            className="cursor-pointer"
                          />
                          
                          {uploading && (
                            <div className="space-y-2">
                              <Progress value={uploadProgress} className="h-2" />
                              <p className="text-sm text-green-700">
                                Processando PDF... {uploadProgress}%
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
                          <h4 className="font-semibold text-blue-900 mb-2">📋 Formatos suportados:</h4>
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>• PDFs de fornecedores de produção</li>
                            <li>• Orçamentos de pós-produção</li>
                            <li>• Propostas comerciais</li>
                            <li>• Cotações de serviços</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="preview">
                    {extractedData && (
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              Dados Extraídos - {extractedData.fornecedor}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Fornecedor */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Fornecedor</h4>
                              <p className="text-gray-700">{extractedData.fornecedor}</p>
                            </div>

                            {/* Fases e Itens */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Estrutura do Orçamento</h4>
                              <div className="space-y-3">
                                {extractedData.fases.map((fase, index) => (
                                  <Card key={index} className="bg-gray-50">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-sm flex justify-between">
                                        <span>{fase.nome}</span>
                                        <span className="text-green-600">{formatCurrency(fase.total)}</span>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                      <div className="space-y-2">
                                        {fase.itens.map((item, itemIndex) => (
                                          <div key={itemIndex} className="flex justify-between text-sm py-1 border-b border-gray-200">
                                            <span className="text-gray-700">{item.descricao}</span>
                                            <span className="font-medium">{formatCurrency(item.valor)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>

                            {/* Total Geral */}
                            <div className="bg-green-50 p-4 rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-green-900">Total Geral</span>
                                <span className="text-xl font-bold text-green-700">
                                  {formatCurrency(extractedData.total_geral)}
                                </span>
                              </div>
                            </div>

                            {/* Observações */}
                            {extractedData.observacoes.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Observações</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                  {extractedData.observacoes.map((obs, idx) => (
                                    <li key={idx}>• {obs}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <div className="flex gap-3 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => setExtractedData(null)}
                            disabled={processing}
                          >
                            Voltar
                          </Button>
                          <Button
                            onClick={createBudgetFromExtractedData}
                            disabled={processing}
                            className="gap-2 bg-green-600 hover:bg-green-700"
                          >
                            {processing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Criando...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                Criar Orçamento
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>

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
              <div className="flex gap-3 justify-center">
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2 border-green-500 text-green-700 hover:bg-green-50"
                    >
                      <Brain className="h-4 w-4" />
                      Extrair de PDF
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Button
                  onClick={() => navigate("/orcamento-novo")}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Orçamento
                </Button>
              </div>
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