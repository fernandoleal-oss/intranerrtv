import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, ArrowUpDown, Eye, Trash2, Image, X } from "lucide-react";
import { SupplierOptionsManager } from "@/components/budget/SupplierOptionsManager";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CampoPersonalizado {
  id: string;
  nome: string;
  valor: string;
}

interface ImagemOrcamento {
  id: string;
  nome: string;
  url: string;
  descricao?: string;
}

interface FornecedorItem {
  id: string;
  nome: string;
  valor: number;
  prazo: string;
  observacao: string;
  desconto?: number;
}

interface FornecedorFase {
  id: string;
  nome: string;
  itens: FornecedorItem[];
}

interface FornecedorOpcao {
  id: string;
  nome: string;
  fases: FornecedorFase[];
}

interface Fornecedor {
  id: string;
  nome: string;
  contato: string;
  cnpj?: string;
  opcoes: FornecedorOpcao[];
  camposPersonalizados?: CampoPersonalizado[];
}

interface LivreData {
  tipo?: string;
  cliente?: string;
  projeto?: string;
  fornecedores?: Fornecedor[];
  camposPersonalizados?: CampoPersonalizado[];
  imagens?: ImagemOrcamento[];
  configuracoes?: {
    somarTodasOpcoes?: boolean;
    mostrarValores?: boolean;
    ordenacao?: "original" | "barato" | "caro";
  };
}

export default function OrcamentoLivre() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if we're editing an existing budget
  const editData = location.state?.editData as LivreData | undefined;
  const existingBudgetId = location.state?.budgetId as string | undefined;
  
  const [saving, setSaving] = useState(false);
  const [budgetId, setBudgetId] = useState<string | undefined>(existingBudgetId);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  
  // Campos personalizados do projeto
  const [camposPersonalizados, setCamposPersonalizados] = useState<CampoPersonalizado[]>([]);
  
  // Imagens do orçamento
  const [imagens, setImagens] = useState<ImagemOrcamento[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Configurações de visualização
  const [somarTodasOpcoes, setSomarTodasOpcoes] = useState(false);
  const [mostrarValores, setMostrarValores] = useState(true);
  const [ordenacao, setOrdenacao] = useState<"original" | "barato" | "caro">("original");
  
  // Preview
  const [showPreview, setShowPreview] = useState(false);
  
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([
    {
      id: crypto.randomUUID(),
      nome: "Nome do Fornecedor",
      contato: "Contato do fornecedor",
      cnpj: "",
      opcoes: [
        {
          id: crypto.randomUUID(),
          nome: "Opção 1",
          fases: [
            {
              id: crypto.randomUUID(),
              nome: "Itens Inclusos",
              itens: [
                {
                  id: crypto.randomUUID(),
                  nome: "Item 1",
                  valor: 0,
                  prazo: "",
                  observacao: "",
                  desconto: 0,
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  // Load edit data on mount
  useEffect(() => {
    if (editData) {
      console.log("📋 Carregando dados para edição:", editData);
      
      // Carregar cliente
      if (editData.cliente) {
        setCliente(editData.cliente);
      }
      
      // Carregar projeto/produto
      if (editData.projeto) {
        setProduto(editData.projeto);
      }
      
      // Carregar configurações
      if (editData.configuracoes) {
        setSomarTodasOpcoes(editData.configuracoes.somarTodasOpcoes || false);
        setMostrarValores(editData.configuracoes.mostrarValores !== false);
        setOrdenacao(editData.configuracoes.ordenacao || "original");
      }
      
      // Carregar campos personalizados
      if (editData.camposPersonalizados && editData.camposPersonalizados.length > 0) {
        setCamposPersonalizados(editData.camposPersonalizados);
      }
      
      // Carregar imagens
      if (editData.imagens && editData.imagens.length > 0) {
        setImagens(editData.imagens);
      }
      
      // Carregar fornecedores - garantir que as opções tenham a estrutura correta
      if (editData.fornecedores && editData.fornecedores.length > 0) {
        const fornecedoresMigrados = editData.fornecedores.map((f: any) => {
          // Garantir que cada fornecedor tenha a estrutura correta de opções
          if (f.opcoes && Array.isArray(f.opcoes)) {
            return {
              ...f,
              opcoes: f.opcoes.map((opcao: any) => ({
                ...opcao,
                fases: opcao.fases || []
              }))
            };
          }
          // Se não tem opções, criar estrutura básica
          return {
            ...f,
            opcoes: [{
              id: crypto.randomUUID(),
              nome: "Opção 1",
              fases: f.fases || []
            }]
          };
        });
        setFornecedores(fornecedoresMigrados);
      }
    }
  }, [editData]);

  const isEditing = !!existingBudgetId;

  const adicionarFornecedor = () => {
    setFornecedores([
      ...fornecedores,
      {
        id: crypto.randomUUID(),
        nome: "Novo Fornecedor",
        contato: "",
        cnpj: "",
        opcoes: [
          {
            id: crypto.randomUUID(),
            nome: "Opção 1",
            fases: [
              {
                id: crypto.randomUUID(),
                nome: "Itens Inclusos",
                itens: [],
              },
            ],
          },
        ],
      },
    ]);
  };

  const removerFornecedor = (id: string) => {
    if (fornecedores.length > 1) {
      setFornecedores(fornecedores.filter((f) => f.id !== id));
    }
  };

  // Funções para campos personalizados
  const adicionarCampoPersonalizado = () => {
    setCamposPersonalizados([
      ...camposPersonalizados,
      {
        id: crypto.randomUUID(),
        nome: "",
        valor: ""
      }
    ]);
  };

  const atualizarCampoPersonalizado = (id: string, campo: "nome" | "valor", valor: string) => {
    setCamposPersonalizados(
      camposPersonalizados.map(c => 
        c.id === id ? { ...c, [campo]: valor } : c
      )
    );
  };

  const removerCampoPersonalizado = (id: string) => {
    setCamposPersonalizados(camposPersonalizados.filter(c => c.id !== id));
  };

  // Funções para imagens
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas imagens.",
          variant: "destructive",
        });
        continue;
      }

      // Convert to base64 for storage in payload
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImagens(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            nome: file.name,
            url: base64,
            descricao: ""
          }
        ]);
      };
      reader.readAsDataURL(file);
    }

    setUploadingImage(false);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const atualizarImagemDescricao = (id: string, descricao: string) => {
    setImagens(
      imagens.map(img => 
        img.id === id ? { ...img, descricao } : img
      )
    );
  };

  const removerImagem = (id: string) => {
    setImagens(imagens.filter(img => img.id !== id));
  };

  const calcularTotalOpcao = (opcao: FornecedorOpcao) => {
    return opcao.fases.reduce((total, fase) => {
      return total + fase.itens.reduce((itemTotal, item) => {
        return itemTotal + (item.valor * (1 - (item.desconto || 0) / 100));
      }, 0);
    }, 0);
  };

  const calcularTotalFornecedor = (fornecedor: Fornecedor) => {
    if (somarTodasOpcoes) {
      // Soma todas as opções
      return fornecedor.opcoes.reduce((total, opcao) => {
        return total + calcularTotalOpcao(opcao);
      }, 0);
    } else {
      // Pega apenas a opção mais barata
      const valores = fornecedor.opcoes.map(calcularTotalOpcao);
      return valores.length > 0 ? Math.min(...valores) : 0;
    }
  };

  const calcularTotal = () => {
    return fornecedores.reduce((total, fornecedor) => {
      return total + calcularTotalFornecedor(fornecedor);
    }, 0);
  };

  const getFornecedoresOrdenados = () => {
    const fornecedoresComValor = fornecedores.map((f) => ({
      ...f,
      valorTotal: calcularTotalFornecedor(f),
    }));

    if (ordenacao === "barato") {
      return fornecedoresComValor.sort((a, b) => a.valorTotal - b.valorTotal);
    } else if (ordenacao === "caro") {
      return fornecedoresComValor.sort((a, b) => b.valorTotal - a.valorTotal);
    }
    return fornecedoresComValor;
  };

  const handleSave = async () => {
    if (!cliente.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!produto.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o produto/projeto.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const total_geral = calcularTotal();

      const payload = {
        tipo: "livre",
        type: "livre",
        cliente,
        projeto: produto,
        fornecedores,
        camposPersonalizados,
        imagens,
        configuracoes: {
          somarTodasOpcoes,
          mostrarValores,
          ordenacao,
        },
      };

      if (isEditing && budgetId) {
        // Update existing budget - create new version
        const { data: versions } = await supabase
          .from('versions')
          .select('versao')
          .eq('budget_id', budgetId)
          .order('versao', { ascending: false })
          .limit(1);

        const nextVersao = versions && versions.length > 0 ? versions[0].versao + 1 : 1;

        const { error } = await supabase.from('versions').insert({
          budget_id: budgetId,
          versao: nextVersao,
          payload: payload as any,
          total_geral
        });

        if (error) throw error;

        toast({
          title: "Sucesso!",
          description: `Orçamento atualizado. Nova versão ${nextVersao} criada.`,
        });

        navigate(`/budget/${budgetId}/pdf`);
      } else {
        // Create new budget
        const { data, error } = await supabase.rpc("create_budget_full_rpc", {
          p_type_text: "livre",
          p_payload: payload as any,
          p_total: total_geral,
        });

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Falha ao criar orçamento");

        const newBudgetId = data[0].id;
        setBudgetId(newBudgetId);

        toast({
          title: "Sucesso!",
          description: "Orçamento livre criado com sucesso.",
        });

        navigate(`/budget/${newBudgetId}/pdf`);
      }
    } catch (error: any) {
      console.error("Erro ao salvar orçamento:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o orçamento.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/orcamentos/novo")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditing ? "Editar Orçamento Livre" : "Novo Orçamento Livre"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEditing 
                  ? "Modifique os dados e salve as alterações" 
                  : "Crie um orçamento personalizado com múltiplas opções por fornecedor"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="produto">Produto/Projeto *</Label>
                <Input
                  id="produto"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  placeholder="Nome do produto ou projeto"
                />
              </div>
            </CardContent>
          </Card>

          {/* Campos Personalizados */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Campos Personalizados</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarCampoPersonalizado}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Campo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {camposPersonalizados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum campo personalizado. Clique em "Adicionar Campo" para criar.
                </p>
              ) : (
                camposPersonalizados.map((campo) => (
                  <div key={campo.id} className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={campo.nome}
                        onChange={(e) => atualizarCampoPersonalizado(campo.id, "nome", e.target.value)}
                        placeholder="Nome do campo"
                        className="font-medium"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        value={campo.valor}
                        onChange={(e) => atualizarCampoPersonalizado(campo.id, "valor", e.target.value)}
                        placeholder="Valor/Conteúdo"
                        rows={2}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removerCampoPersonalizado(campo.id)}
                      className="text-destructive mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Imagens */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Imagens
                </CardTitle>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {uploadingImage ? "Carregando..." : "Adicionar Imagem"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {imagens.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma imagem adicionada. Clique em "Adicionar Imagem" para fazer upload.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {imagens.map((img) => (
                    <div key={img.id} className="relative border rounded-lg overflow-hidden bg-muted/30">
                      <div className="aspect-video relative">
                        <img
                          src={img.url}
                          alt={img.nome}
                          className="w-full h-full object-contain"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={() => removerImagem(img.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-sm font-medium truncate">{img.nome}</p>
                        <Input
                          value={img.descricao || ""}
                          onChange={(e) => atualizarImagemDescricao(img.id, e.target.value)}
                          placeholder="Descrição da imagem (opcional)"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Controles de Visualização */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Opções de Visualização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="somar-opcoes">Somar todas as opções</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, soma os valores de todas as opções de cada fornecedor
                  </p>
                </div>
                <Switch
                  id="somar-opcoes"
                  checked={somarTodasOpcoes}
                  onCheckedChange={setSomarTodasOpcoes}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mostrar-valores">Mostrar valores</Label>
                  <p className="text-sm text-muted-foreground">
                    Ocultar ou exibir os valores totais dos fornecedores
                  </p>
                </div>
                <Switch
                  id="mostrar-valores"
                  checked={mostrarValores}
                  onCheckedChange={setMostrarValores}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ordenacao">Ordenar fornecedores</Label>
                <Select value={ordenacao} onValueChange={(value: any) => setOrdenacao(value)}>
                  <SelectTrigger id="ordenacao">
                    <SelectValue placeholder="Selecione a ordenação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Ordem original</SelectItem>
                    <SelectItem value="barato">Mais barato primeiro</SelectItem>
                    <SelectItem value="caro">Mais caro primeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Fornecedores</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarFornecedor}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Fornecedor
              </Button>
            </div>

            {getFornecedoresOrdenados().map((fornecedor, index) => (
              <Card key={fornecedor.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">Fornecedor {index + 1}</CardTitle>
                      {mostrarValores && (
                        <p className="text-sm text-muted-foreground">
                          Total: {formatCurrency(fornecedor.valorTotal)}
                        </p>
                      )}
                    </div>
                    {fornecedores.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerFornecedor(fornecedor.id)}
                        className="text-destructive"
                      >
                        Remover Fornecedor
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <SupplierOptionsManager
                    fornecedor={fornecedor}
                    onUpdate={(updated) => {
                      setFornecedores(
                        fornecedores.map((f) => (f.id === fornecedor.id ? updated : f))
                      );
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Geral</p>
                  <p className="text-3xl font-bold">{formatCurrency(calcularTotal())}</p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Preview PDF
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Preview do Orçamento</DialogTitle>
                        <DialogDescription>
                          Visualização prévia do orçamento livre
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 p-4 border rounded-lg bg-white text-black">
                        <div className="text-center border-b pb-4">
                          <h2 className="text-2xl font-bold">ORÇAMENTO LIVRE</h2>
                          <p className="text-sm text-gray-600 mt-2">Cliente: {cliente || "Não informado"}</p>
                          <p className="text-sm text-gray-600">Projeto: {produto || "Não informado"}</p>
                        </div>

                        {/* Campos Personalizados no Preview */}
                        {camposPersonalizados.length > 0 && (
                          <div className="border rounded p-4 bg-gray-50">
                            <h3 className="font-bold text-lg mb-3">Informações Adicionais</h3>
                            <div className="space-y-2">
                              {camposPersonalizados.map((campo) => (
                                <div key={campo.id} className="flex">
                                  <span className="font-medium min-w-[150px]">{campo.nome}:</span>
                                  <span className="text-gray-700 whitespace-pre-wrap">{campo.valor}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Imagens no Preview */}
                        {imagens.length > 0 && (
                          <div className="border rounded p-4">
                            <h3 className="font-bold text-lg mb-3">Referências Visuais</h3>
                            <div className="grid grid-cols-2 gap-4">
                              {imagens.map((img) => (
                                <div key={img.id} className="text-center">
                                  <img
                                    src={img.url}
                                    alt={img.nome}
                                    className="w-full max-h-40 object-contain rounded border"
                                  />
                                  {img.descricao && (
                                    <p className="text-xs text-gray-600 mt-1">{img.descricao}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {getFornecedoresOrdenados().map((fornecedor, index) => (
                          <div key={fornecedor.id} className="border rounded p-4">
                            <h3 className="font-bold text-lg mb-2">
                              Fornecedor {index + 1}: {fornecedor.nome}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">Contato: {fornecedor.contato}</p>
                            {mostrarValores && (
                              <p className="text-lg font-semibold text-blue-600 mb-3">
                                Total: {formatCurrency(fornecedor.valorTotal)}
                              </p>
                            )}
                            
                            {fornecedor.opcoes.map((opcao) => (
                              <div key={opcao.id} className="mb-4">
                                <h4 className="font-semibold text-md mb-2 bg-gray-100 p-2 rounded">
                                  {opcao.nome}
                                </h4>
                                {opcao.fases.map((fase) => (
                                  <div key={fase.id} className="ml-4 mb-2">
                                    <p className="font-medium text-sm mb-1">{fase.nome}</p>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                      {fase.itens.map((item) => (
                                        <li key={item.id} className="text-gray-700">
                                          {item.nome}
                                          {mostrarValores && ` - ${formatCurrency(item.valor * (1 - (item.desconto || 0) / 100))}`}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}

                        <div className="border-t pt-4 text-right">
                          <p className="text-xl font-bold">
                            Total Geral: {formatCurrency(calcularTotal())}
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    onClick={() => navigate("/orcamentos/novo")}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Salvando..." : isEditing ? "Salvar e Gerar PDF" : "Salvar Orçamento"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}