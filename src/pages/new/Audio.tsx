import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, Eye, Trash2 } from "lucide-react";
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
  AudioPackageManager,
  AudioFornecedor,
  AudioPacote,
} from "@/components/budget/AudioPackageManager";

interface AudioData {
  estrutura?: string;
  // Identificação
  np?: string;
  agencia?: string;
  cliente?: string;
  data?: string;
  campanha?: string;
  ac?: string;
  // Solicitação
  duracao?: string;
  duracaoCustom?: string;
  meioUso?: string;
  meioUsoCustom?: string;
  praca?: string;
  pracaCustom?: string;
  periodo?: string;
  // Fornecedores
  fornecedores?: AudioFornecedor[];
  // Condições
  formaPagamento?: string;
  validadeProposta?: string;
  prazoProducao?: string;
  // Termo
  termoAceite?: string;
  // Honorário
  honorario?: {
    aplicar: boolean;
    percentual: number;
    valorBase: number;
    valorHonorario: number;
    totalComHonorario: number;
    exibirDetalhes: boolean;
  };
}

const TERMO_PADRAO = `GENTILEZA ENVIAR O **DE ACORDO** PARA INICIARMOS OS SERVIÇOS. O PRAZO DE ENTREGA DO ÁUDIO FINAL É NEGOCIÁVEL, CONTANDO A PARTIR DO RECEBIMENTO DA APROVAÇÃO.

ESTE DE ACORDO IMPLICA EM UM **CONTRATO DE COMPROMISSO** ENTRE AS PARTES, COM AS OBRIGAÇÕES E DEVERES DE ENTREGA E DE PAGAMENTO EXPLÍCITOS NESTE ORÇAMENTO.`;

export default function NovoAudio() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const editData = location.state?.editData as AudioData | undefined;
  const existingBudgetId = location.state?.budgetId as string | undefined;
  const currentVersao = location.state?.versao as number | undefined;

  const [saving, setSaving] = useState(false);
  const [budgetId, setBudgetId] = useState<string | undefined>(existingBudgetId);
  const [showPreview, setShowPreview] = useState(false);

  // Identificação
  const [np, setNp] = useState("");
  const [agencia, setAgencia] = useState("We");
  const [cliente, setCliente] = useState("");
  const [data, setData] = useState(
    new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  );
  const [campanha, setCampanha] = useState("");
  const [ac, setAc] = useState("");

  // Solicitação
  const [duracao, setDuracao] = useState("");
  const [duracaoCustom, setDuracaoCustom] = useState("");
  const [meioUso, setMeioUso] = useState("");
  const [meioUsoCustom, setMeioUsoCustom] = useState("");
  const [praca, setPraca] = useState("");
  const [pracaCustom, setPracaCustom] = useState("");
  const [periodo, setPeriodo] = useState("");

  // Condições
  const [formaPagamento, setFormaPagamento] = useState("à combinar");
  const [validadeProposta, setValidadeProposta] = useState("10 dias");
  const [prazoProducao, setPrazoProducao] = useState("2 dias");

  // Termo
  const [termoAceite, setTermoAceite] = useState(TERMO_PADRAO);

  // Honorário
  const [honorarioPercent, setHonorarioPercent] = useState<number | null>(null);
  const [aplicarHonorario, setAplicarHonorario] = useState(false);
  const [exibirDetalhesHonorario, setExibirDetalhesHonorario] = useState(true);

  // Fornecedores
  const [fornecedores, setFornecedores] = useState<AudioFornecedor[]>([
    {
      id: crypto.randomUUID(),
      nome: "Produtora 1",
      cnpj: "",
      contato: "",
      pacotes: [
        {
          id: crypto.randomUUID(),
          nome: "Pacote 1",
          servicos: [],
          servicosCustom: [],
          valorTotal: 0,
          valoresDecupados: "",
          observacao: "",
        },
      ],
    },
  ]);

  const isEditing = !!existingBudgetId;

  // Load edit data
  useEffect(() => {
    if (editData) {
      if (editData.np) setNp(editData.np);
      if (editData.agencia) setAgencia(editData.agencia);
      if (editData.cliente) setCliente(editData.cliente);
      if (editData.data) setData(editData.data);
      if (editData.campanha) setCampanha(editData.campanha);
      if (editData.ac) setAc(editData.ac);

      if (editData.duracao) setDuracao(editData.duracao);
      if (editData.duracaoCustom) setDuracaoCustom(editData.duracaoCustom);
      if (editData.meioUso) setMeioUso(editData.meioUso);
      if (editData.meioUsoCustom) setMeioUsoCustom(editData.meioUsoCustom);
      if (editData.praca) setPraca(editData.praca);
      if (editData.pracaCustom) setPracaCustom(editData.pracaCustom);
      if (editData.periodo) setPeriodo(editData.periodo);

      if (editData.formaPagamento) setFormaPagamento(editData.formaPagamento);
      if (editData.validadeProposta) setValidadeProposta(editData.validadeProposta);
      if (editData.prazoProducao) setPrazoProducao(editData.prazoProducao);

      if (editData.termoAceite) setTermoAceite(editData.termoAceite);

      if (editData.fornecedores && editData.fornecedores.length > 0) {
        setFornecedores(editData.fornecedores);
      }

      if (editData.honorario) {
        setAplicarHonorario(editData.honorario.aplicar || false);
        setHonorarioPercent(editData.honorario.percentual || null);
        setExibirDetalhesHonorario(editData.honorario.exibirDetalhes ?? true);
      }
    }
  }, [editData]);

  // Load client honorario
  useEffect(() => {
    const loadClientHonorario = async () => {
      if (!cliente.trim()) {
        setHonorarioPercent(null);
        return;
      }

      const { data } = await supabase
        .from("client_honorarios")
        .select("honorario_percent")
        .ilike("client_name", cliente.trim())
        .maybeSingle();

      if (data) {
        setHonorarioPercent(Number(data.honorario_percent));
      } else {
        setHonorarioPercent(null);
      }
    };

    loadClientHonorario();
  }, [cliente]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Pacotes NÃO são somados - cada fornecedor pode ter múltiplos pacotes independentes
  const calcularTotalFornecedor = (fornecedor: AudioFornecedor): number => {
    // Retorna apenas o valor do primeiro pacote para resumo, 
    // mas no PDF mostra todos os pacotes separadamente
    return fornecedor.pacotes.reduce((sum, p) => sum + p.valorTotal, 0);
  };

  const calcularTotalGeral = (): number => {
    return fornecedores.reduce((total, f) => total + calcularTotalFornecedor(f), 0);
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

  const addFornecedor = () => {
    const newFornecedor: AudioFornecedor = {
      id: crypto.randomUUID(),
      nome: `Produtora ${fornecedores.length + 1}`,
      cnpj: "",
      contato: "",
      pacotes: [
        {
          id: crypto.randomUUID(),
          nome: "Pacote 1",
          servicos: [],
          servicosCustom: [],
          valorTotal: 0,
          valoresDecupados: "",
          observacao: "",
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

  const updateFornecedor = (id: string, updates: Partial<AudioFornecedor>) => {
    setFornecedores(
      fornecedores.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const getDuracaoDisplay = () => {
    if (duracao === "customizada") return duracaoCustom;
    return duracao;
  };

  const getMeioDisplay = () => {
    if (meioUso === "customizado") return meioUsoCustom;
    return meioUso;
  };

  const getPracaDisplay = () => {
    if (praca === "customizada") return pracaCustom;
    return praca;
  };

  const handleSave = async () => {
    if (!cliente.trim() || !campanha.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha cliente e campanha.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const honorarioData = getHonorarioData();
      const payload = {
        type: "audio",
        estrutura: "audio_carta",
        np,
        agencia,
        cliente,
        data,
        campanha,
        ac,
        duracao: getDuracaoDisplay(),
        duracaoCustom,
        meioUso: getMeioDisplay(),
        meioUsoCustom,
        praca: getPracaDisplay(),
        pracaCustom,
        periodo,
        fornecedores,
        formaPagamento,
        validadeProposta,
        prazoProducao,
        termoAceite,
        honorario: honorarioData,
      };

      const totalGeral = honorarioData.aplicar
        ? honorarioData.totalComHonorario
        : honorarioData.valorBase;

      if (budgetId) {
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
                  {isEditing ? "Editar Orçamento - Áudio" : "Carta Orçamento de Áudio"}
                </h1>
                {isEditing && currentVersao && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-white/20 text-white">
                    v{currentVersao}
                  </span>
                )}
              </div>
              <p className="text-white/70 text-sm">
                {isEditing
                  ? "Modifique os dados e salve como nova versão"
                  : "Formato carta orçamento com múltiplos pacotes"}
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
                <div className="space-y-4 p-6 bg-white rounded-lg text-black">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-bold">ORÇAMENTO</h2>
                    <p className="text-sm text-gray-600 mt-2">
                      NP {np || "---"} | {agencia} | {cliente || "Cliente"} | {data}
                    </p>
                    <p className="text-sm mt-1">Campanha: {campanha || "---"}</p>
                    {ac && <p className="text-sm">A/C: {ac}</p>}
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-bold mb-2">Solicitação</h3>
                    <p className="text-sm">
                      {cliente} | {campanha}
                    </p>
                    <p className="text-sm">Duração: {getDuracaoDisplay() || "---"}</p>
                    <p className="text-sm">Meio: {getMeioDisplay() || "---"}</p>
                    <p className="text-sm">Praça: {getPracaDisplay() || "---"}</p>
                    <p className="text-sm">Período: {periodo || "---"}</p>
                  </div>

                  {fornecedores.map((fornecedor) => (
                    <div key={fornecedor.id} className="border rounded-lg p-4 mb-4">
                      <h3 className="font-bold text-lg">{fornecedor.nome}</h3>
                      {fornecedor.cnpj && (
                        <p className="text-sm text-gray-600">CNPJ: {fornecedor.cnpj}</p>
                      )}
                      {fornecedor.contato && (
                        <p className="text-sm text-gray-600">Contato: {fornecedor.contato}</p>
                      )}

                      {fornecedor.pacotes.map((pacote) => (
                        <div key={pacote.id} className="mt-4 p-3 bg-gray-50 rounded">
                          <h4 className="font-semibold">{pacote.nome}</h4>
                          {pacote.servicos.length > 0 && (
                            <ul className="list-disc list-inside text-sm mt-2">
                              {[...pacote.servicos, ...pacote.servicosCustom].map(
                                (s, i) => (
                                  <li key={i}>{s}</li>
                                )
                              )}
                            </ul>
                          )}
                          <p className="font-bold text-lg mt-2">
                            {formatCurrency(pacote.valorTotal)}
                          </p>
                          {pacote.valoresDecupados && (
                            <p className="text-sm text-gray-600">
                              {pacote.valoresDecupados}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="border-t pt-4 text-sm space-y-1">
                    <p>Forma de Pagamento: {formaPagamento}</p>
                    <p>Validade da proposta: {validadeProposta}</p>
                    <p>Prazo mínimo para produção: {prazoProducao}</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold mb-2">DE ACORDO</h3>
                    <p className="text-sm whitespace-pre-line">{termoAceite}</p>
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
            {/* Identificação */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-white/80">NP (Número Proposta)</Label>
                    <Input
                      value={np}
                      onChange={(e) => setNp(e.target.value)}
                      placeholder="Ex: 7801"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Agência</Label>
                    <Input
                      value={agencia}
                      onChange={(e) => setAgencia(e.target.value)}
                      placeholder="Nome da agência"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Data</Label>
                    <Input
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>
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
                    <Label className="text-white/80">Campanha/Projeto *</Label>
                    <Input
                      value={campanha}
                      onChange={(e) => setCampanha(e.target.value)}
                      placeholder="Nome da campanha"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white/80">A/C (Atenção a)</Label>
                  <Input
                    value={ac}
                    onChange={(e) => setAc(e.target.value)}
                    placeholder="Nome do responsável"
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Solicitação */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Solicitação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Duração</Label>
                    <Select value={duracao} onValueChange={setDuracao}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Selecione a duração" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1 x 15&quot;">1 x 15"</SelectItem>
                        <SelectItem value="1 x 30&quot;">1 x 30"</SelectItem>
                        <SelectItem value="1 x 45&quot;">1 x 45"</SelectItem>
                        <SelectItem value="1 x 60&quot;">1 x 60"</SelectItem>
                        <SelectItem value="1 x 90&quot;">1 x 90"</SelectItem>
                        <SelectItem value="1 x 120&quot;">1 x 120"</SelectItem>
                        <SelectItem value="1 x 180&quot;">1 x 180"</SelectItem>
                        <SelectItem value="customizada">Customizada</SelectItem>
                      </SelectContent>
                    </Select>
                    {duracao === "customizada" && (
                      <Input
                        value={duracaoCustom}
                        onChange={(e) => setDuracaoCustom(e.target.value)}
                        placeholder='Ex: 2 x 30" + 1 x 15"'
                        className="bg-white/5 border-white/20 text-white mt-2"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-white/80">Meio de Uso</Label>
                    <Select value={meioUso} onValueChange={setMeioUso}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Selecione o meio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rádio">Rádio</SelectItem>
                        <SelectItem value="TV">TV</SelectItem>
                        <SelectItem value="Digital">Digital</SelectItem>
                        <SelectItem value="Interno">Interno</SelectItem>
                        <SelectItem value="Todos">Todos os meios</SelectItem>
                        <SelectItem value="customizado">Customizado</SelectItem>
                      </SelectContent>
                    </Select>
                    {meioUso === "customizado" && (
                      <Input
                        value={meioUsoCustom}
                        onChange={(e) => setMeioUsoCustom(e.target.value)}
                        placeholder="Especifique o meio"
                        className="bg-white/5 border-white/20 text-white mt-2"
                      />
                    )}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Praça</Label>
                    <Select value={praca} onValueChange={setPraca}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Selecione a praça" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nacional">Nacional</SelectItem>
                        <SelectItem value="São Paulo">São Paulo</SelectItem>
                        <SelectItem value="Regional">Regional</SelectItem>
                        <SelectItem value="Interno">Interno</SelectItem>
                        <SelectItem value="customizada">Customizada</SelectItem>
                      </SelectContent>
                    </Select>
                    {praca === "customizada" && (
                      <Input
                        value={pracaCustom}
                        onChange={(e) => setPracaCustom(e.target.value)}
                        placeholder="Especifique a praça"
                        className="bg-white/5 border-white/20 text-white mt-2"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-white/80">Período</Label>
                    <Input
                      value={periodo}
                      onChange={(e) => setPeriodo(e.target.value)}
                      placeholder="Ex: Interno, 6 meses, 1 ano"
                      className="bg-white/5 border-white/20 text-white"
                    />
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
                <Button
                  onClick={addFornecedor}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produtora
                </Button>
              </div>

              {fornecedores.map((fornecedor, index) => (
                <Card key={fornecedor.id} className="bg-white/5 border-white/10">
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
                          <Label className="text-white/80">CNPJ</Label>
                          <Input
                            value={fornecedor.cnpj}
                            onChange={(e) =>
                              updateFornecedor(fornecedor.id, {
                                cnpj: e.target.value,
                              })
                            }
                            placeholder="00.000.000/0000-00"
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
                            placeholder="@contato"
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
                    <AudioPackageManager
                      fornecedor={fornecedor}
                      onUpdate={(updated) =>
                        updateFornecedor(fornecedor.id, updated)
                      }
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Condições Gerais */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Condições Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-white/80">Forma de Pagamento</Label>
                    <Input
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      placeholder="Ex: à combinar"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Validade da Proposta</Label>
                    <Input
                      value={validadeProposta}
                      onChange={(e) => setValidadeProposta(e.target.value)}
                      placeholder="Ex: 10 dias"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Prazo Mínimo Produção</Label>
                    <Input
                      value={prazoProducao}
                      onChange={(e) => setPrazoProducao(e.target.value)}
                      placeholder="Ex: 2 dias"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Termo de Aceite */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">
                  Termo de Aceite (DE ACORDO)
                </CardTitle>
                <p className="text-sm text-white/50">
                  Use **texto** para negrito e *texto* para itálico
                </p>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={termoAceite}
                  onChange={(e) => setTermoAceite(e.target.value)}
                  placeholder="Texto do termo de aceite..."
                  className="bg-white/5 border-white/20 text-white min-h-[150px]"
                />
              </CardContent>
            </Card>
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
                    <span>Campanha:</span>
                    <span className="font-medium text-white truncate max-w-[150px]">
                      {campanha || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Produtoras:</span>
                    <span className="font-medium text-white">
                      {fornecedores.length}
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  {fornecedores.map((f) => (
                    <div key={f.id} className="space-y-1">
                      <p className="text-white/60 text-sm font-medium">{f.nome}</p>
                      {f.pacotes.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between text-sm pl-2"
                        >
                          <span className="text-white/50">{p.nome}:</span>
                          <span className="text-white font-medium">
                            {formatCurrency(p.valorTotal)}
                          </span>
                        </div>
                      ))}
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
