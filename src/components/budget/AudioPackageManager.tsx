import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SERVICOS_PADRAO = [
  "Casting de Voz",
  "Direção de Interpretação",
  "Sound Effects",
  "Gravação",
  "Edição",
  "Mixagem",
  "Masterização",
  "Locução",
  "Trilha Pesquisada",
  "Trilha Original",
  "Jingle",
  "Composição Musical",
];

export interface AudioPacote {
  id: string;
  nome: string;
  servicos: string[];
  servicosCustom: string[];
  valorTotal: number;
  valoresDecupados: string;
  observacao: string;
}

export interface AudioFornecedor {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  pacotes: AudioPacote[];
}

interface AudioPackageManagerProps {
  fornecedor: AudioFornecedor;
  onUpdate: (fornecedor: AudioFornecedor) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function AudioPackageManager({
  fornecedor,
  onUpdate,
}: AudioPackageManagerProps) {
  const [activePacote, setActivePacote] = useState(
    fornecedor.pacotes[0]?.id || ""
  );
  const [novoServicoCustom, setNovoServicoCustom] = useState("");

  const adicionarPacote = () => {
    const novoPacote: AudioPacote = {
      id: `pacote-${Date.now()}`,
      nome: `Pacote ${fornecedor.pacotes.length + 1}`,
      servicos: [],
      servicosCustom: [],
      valorTotal: 0,
      valoresDecupados: "",
      observacao: "",
    };
    onUpdate({
      ...fornecedor,
      pacotes: [...fornecedor.pacotes, novoPacote],
    });
    setActivePacote(novoPacote.id);
  };

  const duplicarPacote = (pacoteId: string) => {
    const pacoteOriginal = fornecedor.pacotes.find((p) => p.id === pacoteId);
    if (!pacoteOriginal) return;

    const novoPacote: AudioPacote = {
      id: `pacote-${Date.now()}`,
      nome: `${pacoteOriginal.nome} (cópia)`,
      servicos: [...pacoteOriginal.servicos],
      servicosCustom: [...pacoteOriginal.servicosCustom],
      valorTotal: pacoteOriginal.valorTotal,
      valoresDecupados: pacoteOriginal.valoresDecupados,
      observacao: pacoteOriginal.observacao,
    };
    onUpdate({
      ...fornecedor,
      pacotes: [...fornecedor.pacotes, novoPacote],
    });
    setActivePacote(novoPacote.id);
  };

  const removerPacote = (pacoteId: string) => {
    if (fornecedor.pacotes.length <= 1) {
      alert("Deve haver pelo menos um pacote");
      return;
    }
    if (confirm("Deseja realmente remover este pacote?")) {
      const novosPacotes = fornecedor.pacotes.filter((p) => p.id !== pacoteId);
      onUpdate({
        ...fornecedor,
        pacotes: novosPacotes,
      });
      if (activePacote === pacoteId) {
        setActivePacote(novosPacotes[0]?.id || "");
      }
    }
  };

  const atualizarPacote = (
    pacoteId: string,
    campo: keyof AudioPacote,
    valor: any
  ) => {
    onUpdate({
      ...fornecedor,
      pacotes: fornecedor.pacotes.map((p) =>
        p.id === pacoteId ? { ...p, [campo]: valor } : p
      ),
    });
  };

  const toggleServico = (pacoteId: string, servico: string) => {
    const pacote = fornecedor.pacotes.find((p) => p.id === pacoteId);
    if (!pacote) return;

    const novosServicos = pacote.servicos.includes(servico)
      ? pacote.servicos.filter((s) => s !== servico)
      : [...pacote.servicos, servico];

    atualizarPacote(pacoteId, "servicos", novosServicos);
  };

  const adicionarServicoCustom = (pacoteId: string) => {
    if (!novoServicoCustom.trim()) return;

    const pacote = fornecedor.pacotes.find((p) => p.id === pacoteId);
    if (!pacote) return;

    atualizarPacote(pacoteId, "servicosCustom", [
      ...pacote.servicosCustom,
      novoServicoCustom.trim(),
    ]);
    setNovoServicoCustom("");
  };

  const removerServicoCustom = (pacoteId: string, servico: string) => {
    const pacote = fornecedor.pacotes.find((p) => p.id === pacoteId);
    if (!pacote) return;

    atualizarPacote(
      pacoteId,
      "servicosCustom",
      pacote.servicosCustom.filter((s) => s !== servico)
    );
  };

  const pacoteAtivo = fornecedor.pacotes.find((p) => p.id === activePacote);

  return (
    <div className="space-y-4">
      {/* Tabs de Pacotes */}
      <div className="flex items-center gap-2 flex-wrap">
        <Tabs
          value={activePacote}
          onValueChange={setActivePacote}
          className="flex-1"
        >
          <TabsList className="bg-white/10">
            {fornecedor.pacotes.map((pacote) => (
              <TabsTrigger
                key={pacote.id}
                value={pacote.id}
                className="data-[state=active]:bg-white/20"
              >
                {pacote.nome}
                {pacote.valorTotal > 0 && (
                  <span className="ml-2 text-xs opacity-70">
                    {formatCurrency(pacote.valorTotal)}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          onClick={adicionarPacote}
          size="sm"
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Pacote
        </Button>
      </div>

      {/* Edição do Pacote Ativo */}
      {pacoteAtivo && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex items-center gap-3">
                <Input
                  value={pacoteAtivo.nome}
                  onChange={(e) =>
                    atualizarPacote(pacoteAtivo.id, "nome", e.target.value)
                  }
                  className="max-w-xs font-semibold bg-white/5 border-white/20 text-white"
                  placeholder="Nome do Pacote"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => duplicarPacote(pacoteAtivo.id)}
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => removerPacote(pacoteAtivo.id)}
                  size="sm"
                  variant="destructive"
                  disabled={fornecedor.pacotes.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Serviços */}
            <div>
              <Label className="text-white/80 mb-3 block">Serviços Inclusos</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SERVICOS_PADRAO.map((servico) => (
                  <div key={servico} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${pacoteAtivo.id}-${servico}`}
                      checked={pacoteAtivo.servicos.includes(servico)}
                      onCheckedChange={() =>
                        toggleServico(pacoteAtivo.id, servico)
                      }
                      className="border-white/30 data-[state=checked]:bg-primary"
                    />
                    <label
                      htmlFor={`${pacoteAtivo.id}-${servico}`}
                      className="text-sm text-white/70 cursor-pointer"
                    >
                      {servico}
                    </label>
                  </div>
                ))}
              </div>

              {/* Serviços Customizados */}
              {pacoteAtivo.servicosCustom.length > 0 && (
                <div className="mt-4">
                  <Label className="text-white/60 text-sm mb-2 block">
                    Serviços Adicionais
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {pacoteAtivo.servicosCustom.map((servico) => (
                      <div
                        key={servico}
                        className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded text-sm text-white"
                      >
                        <span>{servico}</span>
                        <button
                          onClick={() =>
                            removerServicoCustom(pacoteAtivo.id, servico)
                          }
                          className="text-red-400 hover:text-red-300 ml-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adicionar Serviço Custom */}
              <div className="mt-4 flex gap-2">
                <Input
                  value={novoServicoCustom}
                  onChange={(e) => setNovoServicoCustom(e.target.value)}
                  placeholder="Adicionar outro serviço..."
                  className="bg-white/5 border-white/20 text-white flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarServicoCustom(pacoteAtivo.id);
                    }
                  }}
                />
                <Button
                  onClick={() => adicionarServicoCustom(pacoteAtivo.id)}
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Valor Total */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white/80">Valor Total do Pacote *</Label>
                <Input
                  type="number"
                  value={pacoteAtivo.valorTotal || ""}
                  onChange={(e) =>
                    atualizarPacote(
                      pacoteAtivo.id,
                      "valorTotal",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0,00"
                  className="bg-white/5 border-white/20 text-white text-lg font-semibold"
                />
              </div>
              <div>
                <Label className="text-white/80">Valores Decupados</Label>
                <Input
                  value={pacoteAtivo.valoresDecupados}
                  onChange={(e) =>
                    atualizarPacote(
                      pacoteAtivo.id,
                      "valoresDecupados",
                      e.target.value
                    )
                  }
                  placeholder="Ex: VO = R$ 5.500 | Trilha = R$ 4.000"
                  className="bg-white/5 border-white/20 text-white"
                />
                <p className="text-xs text-white/40 mt-1">
                  Opcional: detalhe o breakdown dos valores
                </p>
              </div>
            </div>

            {/* Observação */}
            <div>
              <Label className="text-white/80">Observações do Pacote</Label>
              <Textarea
                value={pacoteAtivo.observacao}
                onChange={(e) =>
                  atualizarPacote(pacoteAtivo.id, "observacao", e.target.value)
                }
                placeholder="Informações adicionais sobre este pacote..."
                className="bg-white/5 border-white/20 text-white min-h-[80px]"
              />
            </div>

            {/* Resumo do Pacote */}
            <div className="bg-white/10 rounded-lg p-4 mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white/60 text-sm">
                    {pacoteAtivo.servicos.length +
                      pacoteAtivo.servicosCustom.length}{" "}
                    serviço(s) selecionado(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-sm">Valor</p>
                  <p className="text-white text-xl font-bold">
                    {formatCurrency(pacoteAtivo.valorTotal)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
