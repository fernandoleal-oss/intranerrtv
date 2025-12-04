import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, Eye, Trash2 } from "lucide-react";
import { SupplierOptionsManager } from "@/components/budget/SupplierOptionsManager";
import { Switch } from "@/components/ui/switch";
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

import {
  Fornecedor,
  FornecedorOpcao,
  FornecedorFase,
  FornecedorItem,
} from "@/components/budget/SupplierOptionsManager";

interface AudioData {
  tipo?: string;
  cliente?: string;
  produto?: string;
  tipo_audio?: string;
  duracao?: string;
  meio_uso?: string;
  praca?: string;
  periodo?: string;
  fornecedores?: Fornecedor[];
  honorario?: {
    aplicar: boolean;
    percentual: number;
    valorBase: number;
    valorHonorario: number;
    totalComHonorario: number;
    exibirDetalhes: boolean;
  };
}

export default function NovoAudio() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Check if we're editing an existing budget
  const editData = location.state?.editData as AudioData | undefined;
  const existingBudgetId = location.state?.budgetId as string | undefined;
  const currentVersao = location.state?.versao as number | undefined;
  
  const [saving, setSaving] = useState(false);
  const [budgetId, setBudgetId] = useState<string | undefined>(existingBudgetId);
  const [isLoadingEditData, setIsLoadingEditData] = useState(!!editData);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [tipoAudio, setTipoAudio] = useState("");
  const [duracao, setDuracao] = useState("");
  const [meioUso, setMeioUso] = useState("");
  const [praca, setPraca] = useState("");
  
  // Honorário
  const [honorarioPercent, setHonorarioPercent] = useState<number | null>(null);
  const [aplicarHonorario, setAplicarHonorario] = useState(false);
  const [exibirDetalhesHonorario, setExibirDetalhesHonorario] = useState(true);
  
  // Preview
  const [showPreview, setShowPreview] = useState(false);
  
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([
    {
      id: crypto.randomUUID(),
      nome: "Produtora 1",
      contato: "",
      cnpj: "",
      opcoes: [
        {
          id: crypto.randomUUID(),
          nome: "Opção 1",
          fases: [
            {
              id: crypto.randomUUID(),
              nome: "Serviços",
              itens: [
                {
                  id: crypto.randomUUID(),
                  nome: "Locução / Jingle / Trilha",
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

  const isEditing = !!existingBudgetId;

  // Load edit data
  useEffect(() => {
    if (editData) {
      setCliente(editData.cliente || "");
      setProduto(editData.produto || "");
      setTipoAudio(editData.tipo_audio || "");
      setDuracao(editData.duracao || "");
      setMeioUso(editData.meio_uso || "");
      setPraca(editData.praca || "");
      
      if (editData.fornecedores && editData.fornecedores.length > 0) {
        setFornecedores(editData.fornecedores);
      }
      
      if (editData.honorario) {
        setAplicarHonorario(editData.honorario.aplicar || false);
        setHonorarioPercent(editData.honorario.percentual || null);
        setExibirDetalhesHonorario(editData.honorario.exibirDetalhes ?? true);
      }
      
      setIsLoadingEditData(false);
    }
  }, [editData]);

  // Load client honorario when client changes
  useEffect(() => {
    const loadClientHonorario = async () => {
      if (!cliente.trim()) {
        setHonorarioPercent(null);
        return;
      }
      
      const { data } = await supabase
        .from('client_honorarios')
        .select('honorario_percent')
        .ilike('client_name', cliente.trim())
        .maybeSingle();
      
      if (data) {
        setHonorarioPercent(Number(data.honorario_percent));
      } else {
        setHonorarioPercent(null);
      }
    };
    
    loadClientHonorario();
  }, [cliente]);

  // Calculate totals
  const calcularTotalFornecedor = (fornecedor: Fornecedor): number => {
    return (fornecedor.opcoes || []).reduce((total, opcao) => {
      return total + (opcao.fases || []).reduce((faseTotal, fase) => {
        return faseTotal + (fase.itens || []).reduce((itemTotal, item) => {
          return itemTotal + (item.valor || 0) - (item.desconto || 0);
        }, 0);
      }, 0);
    }, 0);
  };

  const calcularTotalGeral = (): number => {
    return fornecedores.reduce((total, fornecedor) => {
      return total + calcularTotalFornecedor(fornecedor);
    }, 0);
  };

  const getHonorarioData = () => {
    const subtotal = calcularTotalGeral();
    const percent = honorarioPercent || 0;
    const valorHonorario = aplicarHonorario ? (subtotal * percent) / 100 : 0;
    const totalComHonorario = subtotal + valorHonorario;
    
    return {
      aplicar: aplicarHonorario,
      percentual: percent,
      valorBase: subtotal,
      valorHonorario,
      totalComHonorario,
      exibirDetalhes: exibirDetalhesHonorario,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const addFornecedor = () => {
    const newFornecedor: Fornecedor = {
      id: crypto.randomUUID(),
      nome: `Produtora ${fornecedores.length + 1}`,
      contato: "",
      cnpj: "",
      opcoes: [
        {
          id: crypto.randomUUID(),
          nome: "Opção 1",
          fases: [
            {
              id: crypto.randomUUID(),
              nome: "Serviços",
              itens: [
                {
                  id: crypto.randomUUID(),
                  nome: "Locução / Jingle / Trilha",
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
    };
    setFornecedores([...fornecedores, newFornecedor]);
  };

  const removeFornecedor = (id: string) => {
    if (fornecedores.length > 1) {
      setFornecedores(fornecedores.filter((f) => f.id !== id));
    }
  };

  const updateFornecedor = (id: string, updates: Partial<Fornecedor>) => {
    setFornecedores(
      fornecedores.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleSave = async () => {
    if (!cliente.trim() || !produto.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha cliente e produto.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const honorarioData = getHonorarioData();
      const payload = {
        type: "audio",
        estrutura: "fornecedores_fases",
        cliente,
        produto,
        tipo_audio: tipoAudio,
        duracao,
        meio_uso: meioUso,
        praca,
        fornecedores,
        honorario: honorarioData,
      };

      const totalGeral = honorarioData.aplicar
        ? honorarioData.totalComHonorario
        : honorarioData.valorBase;

      if (budgetId) {
        // Update existing budget with new version
        const { data: versions } = await supabase
          .from("versions")
          .select("versao")
          .eq("budget_id", budgetId)
          .order("versao", { ascending: false })
          .limit(1);

        const nextVersao =
          versions && versions.length > 0 ? versions[0].versao + 1 : 1;

        const { error } = await supabase.from("versions").insert({
          budget_id: budgetId,
          versao: nextVersao,
          payload: payload as any,
          total_geral: totalGeral,
        });

        if (error) throw error;

        toast({
          title: "Orçamento atualizado!",
          description: `Versão ${nextVersao} salva com sucesso.`,
        });

        navigate(`/budget/${budgetId}/pdf`);
      } else {
        // Create new budget
        const { data: result, error } = await supabase.rpc(
          "create_budget_full_rpc",
          {
            p_type_text: "audio",
            p_payload: payload as any,
            p_total: totalGeral,
          }
        );

        if (error) throw error;
        if (!result || result.length === 0)
          throw new Error("Falha ao criar orçamento");

        toast({
          title: "Orçamento criado!",
          description: `ID: ${result[0].display_id}`,
        });

        navigate(`/budget/${result[0].id}/pdf`);
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o orçamento.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalGeral = calcularTotalGeral();
  const honorarioData = getHonorarioData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">
                  {isEditing ? "Editar Orçamento - Áudio" : "Orçamento de Áudio"}
                </h1>
                {isEditing && currentVersao && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-white/20 text-white">
                    v{currentVersao}
                  </span>
                )}
              </div>
              <p className="text-white/70 text-sm">
                {isEditing
                  ? `Modifique os dados e salve como nova versão`
                  : "Compare cotações de múltiplas produtoras"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Prévia
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Prévia do Orçamento</DialogTitle>
                  <DialogDescription>
                    Visualize como o orçamento será apresentado
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 p-4 bg-white rounded-lg text-black">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-bold">
                      {cliente || "Cliente"} - {produto || "Produto"}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Tipo: {tipoAudio} | Duração: {duracao} | Meio: {meioUso} | Praça: {praca}
                    </p>
                  </div>
                  {fornecedores.map((fornecedor) => (
                    <div key={fornecedor.id} className="border rounded-lg p-4">
                      <h3 className="font-bold text-lg">{fornecedor.nome}</h3>
                      <p className="text-sm text-gray-600">{fornecedor.contato}</p>
                      <div className="mt-2">
                        <p className="font-semibold">
                          Total: {formatCurrency(calcularTotalFornecedor(fornecedor))}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    {aplicarHonorario && exibirDetalhesHonorario ? (
                      <>
                        <p className="text-right">
                          Subtotal: {formatCurrency(honorarioData.valorBase)}
                        </p>
                        <p className="text-right">
                          Honorário ({honorarioData.percentual}%):{" "}
                          {formatCurrency(honorarioData.valorHonorario)}
                        </p>
                        <p className="text-right font-bold text-lg">
                          Total: {formatCurrency(honorarioData.totalComHonorario)}
                        </p>
                      </>
                    ) : (
                      <p className="text-right font-bold text-lg">
                        Total:{" "}
                        {formatCurrency(
                          aplicarHonorario
                            ? honorarioData.totalComHonorario
                            : totalGeral
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving
                ? "Salvando..."
                : isEditing
                ? `Salvar v${(currentVersao || 0) + 1}`
                : "Salvar e Gerar PDF"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client & Product Info */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Cliente *</Label>
                    <Input
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      placeholder="Nome do cliente"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Produto *</Label>
                    <Input
                      value={produto}
                      onChange={(e) => setProduto(e.target.value)}
                      placeholder="Nome do produto"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Tipo de Áudio</Label>
                    <Select value={tipoAudio} onValueChange={setTipoAudio}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="locucao">Locução</SelectItem>
                        <SelectItem value="jingle">Jingle</SelectItem>
                        <SelectItem value="trilha">Trilha Sonora</SelectItem>
                        <SelectItem value="sound_design">Sound Design</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white/80">Duração</Label>
                    <Select value={duracao} onValueChange={setDuracao}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Selecione a duração" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15s">15 segundos</SelectItem>
                        <SelectItem value="30s">30 segundos</SelectItem>
                        <SelectItem value="45s">45 segundos</SelectItem>
                        <SelectItem value="60s">60 segundos</SelectItem>
                        <SelectItem value="customizada">Customizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Meio de Uso</Label>
                    <Select value={meioUso} onValueChange={setMeioUso}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Selecione o meio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="radio">Rádio</SelectItem>
                        <SelectItem value="tv">TV</SelectItem>
                        <SelectItem value="digital">Digital</SelectItem>
                        <SelectItem value="todos">Todos os meios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white/80">Praça</Label>
                    <Select value={praca} onValueChange={setPraca}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Selecione a praça" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacional">Nacional</SelectItem>
                        <SelectItem value="sao_paulo">São Paulo</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Honorário */}
            {honorarioPercent !== null && honorarioPercent > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Honorário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white/80">
                        Aplicar honorário de {honorarioPercent}%
                      </Label>
                      <p className="text-sm text-white/50">
                        Cliente cadastrado com honorário
                      </p>
                    </div>
                    <Switch
                      checked={aplicarHonorario}
                      onCheckedChange={setAplicarHonorario}
                    />
                  </div>
                  {aplicarHonorario && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white/80">
                          Exibir detalhes do honorário
                        </Label>
                        <p className="text-sm text-white/50">
                          Mostrar subtotal + honorário ou apenas total final
                        </p>
                      </div>
                      <Switch
                        checked={exibirDetalhesHonorario}
                        onCheckedChange={setExibirDetalhesHonorario}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fornecedores */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Produtoras</h2>
                <Button onClick={addFornecedor} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produtora
                </Button>
              </div>

              {fornecedores.map((fornecedor, index) => (
                <Card
                  key={fornecedor.id}
                  className="bg-white/5 border-white/10"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-white/80">Nome da Produtora</Label>
                          <Input
                            value={fornecedor.nome}
                            onChange={(e) =>
                              updateFornecedor(fornecedor.id, {
                                nome: e.target.value,
                              })
                            }
                            placeholder="Nome da produtora"
                            className="bg-white/5 border-white/20 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-white/80">Contato</Label>
                          <Input
                            value={fornecedor.contato}
                            onChange={(e) =>
                              updateFornecedor(fornecedor.id, {
                                contato: e.target.value,
                              })
                            }
                            placeholder="Nome do contato"
                            className="bg-white/5 border-white/20 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-white/80">CNPJ</Label>
                          <Input
                            value={fornecedor.cnpj || ""}
                            onChange={(e) =>
                              updateFornecedor(fornecedor.id, {
                                cnpj: e.target.value,
                              })
                            }
                            placeholder="00.000.000/0000-00"
                            className="bg-white/5 border-white/20 text-white"
                          />
                        </div>
                      </div>
                      {fornecedores.length > 1 && (
                        <Button
                          onClick={() => removeFornecedor(fornecedor.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SupplierOptionsManager
                      fornecedor={fornecedor}
                      onUpdate={(updated) =>
                        updateFornecedor(fornecedor.id, updated)
                      }
                    />
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                      <span className="text-lg font-bold text-white">
                        Total Produtora: {formatCurrency(calcularTotalFornecedor(fornecedor))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white/5 border-white/10 sticky top-6">
              <CardHeader>
                <CardTitle className="text-white">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-white/70">
                    <span>Cliente:</span>
                    <span className="font-medium text-white">
                      {cliente || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Produto:</span>
                    <span className="font-medium text-white">
                      {produto || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Produtoras:</span>
                    <span className="font-medium text-white">
                      {fornecedores.length}
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  {fornecedores.map((f) => (
                    <div key={f.id} className="flex justify-between text-sm">
                      <span className="text-white/60 truncate max-w-[60%]">
                        {f.nome}:
                      </span>
                      <span className="text-white font-medium">
                        {formatCurrency(calcularTotalFornecedor(f))}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  {aplicarHonorario && exibirDetalhesHonorario ? (
                    <>
                      <div className="flex justify-between text-white/70">
                        <span>Subtotal:</span>
                        <span className="font-medium text-white">
                          {formatCurrency(honorarioData.valorBase)}
                        </span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Honorário ({honorarioData.percentual}%):</span>
                        <span className="font-medium text-white">
                          {formatCurrency(honorarioData.valorHonorario)}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-white">
                        <span>Total:</span>
                        <span>
                          {formatCurrency(honorarioData.totalComHonorario)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-lg font-bold text-white">
                      <span>Total Geral:</span>
                      <span>
                        {formatCurrency(
                          aplicarHonorario
                            ? honorarioData.totalComHonorario
                            : totalGeral
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
