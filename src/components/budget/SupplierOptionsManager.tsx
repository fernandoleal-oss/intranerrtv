import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface FornecedorItem {
  id: string;
  nome: string;
  valor: number;
  prazo: string;
  observacao: string;
  desconto?: number;
}

export interface FornecedorFase {
  id: string;
  nome: string;
  itens: FornecedorItem[];
}

export interface FornecedorOpcao {
  id: string;
  nome: string;
  fases: FornecedorFase[];
}

export interface Fornecedor {
  id: string;
  nome: string;
  contato: string;
  cnpj?: string;
  opcoes: FornecedorOpcao[];
  desconto?: number;
}

interface SupplierOptionsManagerProps {
  fornecedor: Fornecedor;
  onUpdate: (fornecedor: Fornecedor) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function SupplierOptionsManager({ fornecedor, onUpdate }: SupplierOptionsManagerProps) {
  const [activeOption, setActiveOption] = useState(fornecedor.opcoes[0]?.id || "");

  const adicionarOpcao = () => {
    const novaOpcao: FornecedorOpcao = {
      id: `opcao-${Date.now()}`,
      nome: `Opção ${fornecedor.opcoes.length + 1}`,
      fases: []
    };
    onUpdate({
      ...fornecedor,
      opcoes: [...fornecedor.opcoes, novaOpcao]
    });
    setActiveOption(novaOpcao.id);
  };

  const duplicarOpcao = (opcaoId: string) => {
    const opcaoOriginal = fornecedor.opcoes.find(o => o.id === opcaoId);
    if (!opcaoOriginal) return;

    const novaOpcao: FornecedorOpcao = {
      id: `opcao-${Date.now()}`,
      nome: `${opcaoOriginal.nome} (cópia)`,
      fases: JSON.parse(JSON.stringify(opcaoOriginal.fases)) // deep clone
    };
    onUpdate({
      ...fornecedor,
      opcoes: [...fornecedor.opcoes, novaOpcao]
    });
    setActiveOption(novaOpcao.id);
  };

  const removerOpcao = (opcaoId: string) => {
    if (fornecedor.opcoes.length <= 1) {
      alert("Deve haver pelo menos uma opção");
      return;
    }
    if (confirm("Deseja realmente remover esta opção?")) {
      const novasOpcoes = fornecedor.opcoes.filter(o => o.id !== opcaoId);
      onUpdate({
        ...fornecedor,
        opcoes: novasOpcoes
      });
      if (activeOption === opcaoId) {
        setActiveOption(novasOpcoes[0]?.id || "");
      }
    }
  };

  const atualizarOpcao = (opcaoId: string, campo: string, valor: any) => {
    onUpdate({
      ...fornecedor,
      opcoes: fornecedor.opcoes.map(o =>
        o.id === opcaoId ? { ...o, [campo]: valor } : o
      )
    });
  };

  const adicionarFase = (opcaoId: string) => {
    const novaFase: FornecedorFase = {
      id: `fase-${Date.now()}`,
      nome: "Nova Fase",
      itens: []
    };
    onUpdate({
      ...fornecedor,
      opcoes: fornecedor.opcoes.map(o =>
        o.id === opcaoId ? { ...o, fases: [...o.fases, novaFase] } : o
      )
    });
  };

  const removerFase = (opcaoId: string, faseId: string) => {
    if (confirm("Deseja realmente remover esta fase?")) {
      onUpdate({
        ...fornecedor,
        opcoes: fornecedor.opcoes.map(o =>
          o.id === opcaoId ? { ...o, fases: o.fases.filter(f => f.id !== faseId) } : o
        )
      });
    }
  };

  const atualizarFase = (opcaoId: string, faseId: string, campo: string, valor: any) => {
    onUpdate({
      ...fornecedor,
      opcoes: fornecedor.opcoes.map(o =>
        o.id === opcaoId ? {
          ...o,
          fases: o.fases.map(f =>
            f.id === faseId ? { ...f, [campo]: valor } : f
          )
        } : o
      )
    });
  };

  const adicionarItem = (opcaoId: string, faseId: string) => {
    const novoItem: FornecedorItem = {
      id: `item-${Date.now()}`,
      nome: "Novo Item",
      valor: 0,
      prazo: "A combinar",
      observacao: "",
      desconto: 0
    };
    onUpdate({
      ...fornecedor,
      opcoes: fornecedor.opcoes.map(o =>
        o.id === opcaoId ? {
          ...o,
          fases: o.fases.map(f =>
            f.id === faseId ? { ...f, itens: [...f.itens, novoItem] } : f
          )
        } : o
      )
    });
  };

  const removerItem = (opcaoId: string, faseId: string, itemId: string) => {
    if (confirm("Deseja realmente remover este item?")) {
      onUpdate({
        ...fornecedor,
        opcoes: fornecedor.opcoes.map(o =>
          o.id === opcaoId ? {
            ...o,
            fases: o.fases.map(f =>
              f.id === faseId ? { ...f, itens: f.itens.filter(i => i.id !== itemId) } : f
            )
          } : o
        )
      });
    }
  };

  const atualizarItem = (opcaoId: string, faseId: string, itemId: string, campo: string, valor: any) => {
    onUpdate({
      ...fornecedor,
      opcoes: fornecedor.opcoes.map(o =>
        o.id === opcaoId ? {
          ...o,
          fases: o.fases.map(f =>
            f.id === faseId ? {
              ...f,
              itens: f.itens.map(i =>
                i.id === itemId ? { ...i, [campo]: valor } : i
              )
            } : f
          )
        } : o
      )
    });
  };

  const calcularTotalOpcao = (opcao: FornecedorOpcao) => {
    return opcao.fases.reduce((total, fase) => {
      return total + fase.itens.reduce((sum, item) => sum + (item.valor - (item.desconto || 0)), 0);
    }, 0);
  };

  const opcaoAtiva = fornecedor.opcoes.find(o => o.id === activeOption);

  return (
    <div className="space-y-4">
      {/* Gerenciamento de Opções */}
      <div className="flex items-center gap-2 flex-wrap">
        <Tabs value={activeOption} onValueChange={setActiveOption} className="flex-1">
          <TabsList>
            {fornecedor.opcoes.map((opcao) => (
              <TabsTrigger key={opcao.id} value={opcao.id}>
                {opcao.nome}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button onClick={adicionarOpcao} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Nova Opção
        </Button>
      </div>

      {/* Edição da Opção Ativa */}
      {opcaoAtiva && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={opcaoAtiva.nome}
                  onChange={(e) => atualizarOpcao(opcaoAtiva.id, "nome", e.target.value)}
                  className="max-w-xs font-semibold"
                />
                <span className="text-sm text-muted-foreground">
                  Total: {formatCurrency(calcularTotalOpcao(opcaoAtiva))}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => duplicarOpcao(opcaoAtiva.id)}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => removerOpcao(opcaoAtiva.id)}
                  size="sm"
                  variant="destructive"
                  disabled={fornecedor.opcoes.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fases */}
            {opcaoAtiva.fases.map((fase) => (
              <Card key={fase.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={fase.nome}
                      onChange={(e) => atualizarFase(opcaoAtiva.id, fase.id, "nome", e.target.value)}
                      className="max-w-xs font-semibold"
                    />
                    <Button
                      onClick={() => removerFase(opcaoAtiva.id, fase.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Itens */}
                  {fase.itens.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/50 rounded">
                      <div className="col-span-3">
                        <Label className="text-xs">Nome do Item</Label>
                        <Input
                          value={item.nome}
                          onChange={(e) => atualizarItem(opcaoAtiva.id, fase.id, item.id, "nome", e.target.value)}
                          placeholder="Nome"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Valor</Label>
                        <Input
                          type="number"
                          value={item.valor}
                          onChange={(e) => atualizarItem(opcaoAtiva.id, fase.id, item.id, "valor", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Desconto</Label>
                        <Input
                          type="number"
                          value={item.desconto || 0}
                          onChange={(e) => atualizarItem(opcaoAtiva.id, fase.id, item.id, "desconto", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Prazo</Label>
                        <Input
                          value={item.prazo}
                          onChange={(e) => atualizarItem(opcaoAtiva.id, fase.id, item.id, "prazo", e.target.value)}
                          placeholder="Prazo"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Observação</Label>
                        <Input
                          value={item.observacao}
                          onChange={(e) => atualizarItem(opcaoAtiva.id, fase.id, item.id, "observacao", e.target.value)}
                          placeholder="Obs"
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          onClick={() => removerItem(opcaoAtiva.id, fase.id, item.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => adicionarItem(opcaoAtiva.id, fase.id)}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button
              onClick={() => adicionarFase(opcaoAtiva.id)}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Fase
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
