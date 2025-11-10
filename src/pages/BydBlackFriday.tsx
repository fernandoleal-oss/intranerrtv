import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HeaderBar } from "@/components/HeaderBar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BRLCurrencyInput } from "@/components/form/BRLCurrencyInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProjectInfo {
  cliente: string;
  campanha: string;
  produto: string;
  titulo: string;
  duracao: string;
  versoes: string;
  territorio: string;
  midias: string;
  prazoVeiculacao: string;
  diretor: string;
  captacao: string;
  diariasFilmagem: string;
  finalizacao: string;
  exclusividadeElenco: string;
  validadeOrcamento: string;
  condicaoPagamento: string;
}

interface ItemProducao {
  id: string;
  descricao: string;
  observacao?: string;
}

interface CustoAdicional {
  id: string;
  descricao: string;
  valor: number;
}

interface BudgetData {
  projectInfo: ProjectInfo;
  valorProducao: number;
  itensInclusos: ItemProducao[];
  itensNaoInclusos: ItemProducao[];
  custosAdicionais: CustoAdicional[];
  observacoes: string;
}

const defaultProjectInfo: ProjectInfo = {
  cliente: "BYD",
  campanha: "Black Friday",
  produto: "Sona Pro, Song Plus",
  titulo: "Black Friday",
  duracao: "1x30\"",
  versoes: "reduções 15\" 6\" 5\" + 3 pílulas de 30\"",
  territorio: "Brasil",
  midias: "Toda as mídias eletrônicas: TV, merchans, internet, mídias digitais, eventos BYD",
  prazoVeiculacao: "3 meses",
  diretor: "Pedro Moscalcoff",
  captacao: "Full HD",
  diariasFilmagem: "1 diária",
  finalizacao: "16:9 (horizontal) com adaptação para outros formatos",
  exclusividadeElenco: "N/A",
  validadeOrcamento: "10 dias do envio da Carta-Orçamento",
  condicaoPagamento: "Liberação da PO em até 10 dias da aprovação do orçamento e pagamento em 45 dias após emissão da NF.",
};

const defaultItensInclusos: ItemProducao[] = [
  { id: "1", descricao: "Storyboard" },
  { id: "2", descricao: "Diária de filmagem (cidade de São Paulo)" },
  { id: "3", descricao: "Elenco: 1 coadjuvante" },
  { id: "4", descricao: "Estúdio" },
  { id: "5", descricao: "Equipe de Direção" },
  { id: "6", descricao: "Equipe de direção de fotografia" },
  { id: "7", descricao: "Equipe de produção" },
  { id: "8", descricao: "Produtor de elenco" },
  { id: "9", descricao: "Produtor de objeto" },
  { id: "10", descricao: "Figurinista" },
  { id: "11", descricao: "Makeup" },
  { id: "12", descricao: "Equipe de elétrica" },
  { id: "13", descricao: "Equipe de maquinaria" },
  { id: "14", descricao: "Contra regra para os cuidados do carro" },
  { id: "15", descricao: "Câmera (Alexa Mini), lentes, acessórios e movimento" },
  { id: "16", descricao: "Equipamento de iluminação" },
  { id: "17", descricao: "Equipamento de maquinaria" },
  { id: "18", descricao: "Gerador" },
  { id: "19", descricao: "Se necessário, Insulfilm" },
  { id: "20", descricao: "Produção de placas com artes da agência para 1 carro" },
  { id: "21", descricao: "Estacionamento para guardar os carros" },
  { id: "22", descricao: "Alimentação, transporte e seguro de equipe, de equipamento e dos carros" },
  { id: "23", descricao: "PÓS: Montagem, Correção de cor, Motion simples, Limpezas" },
  { id: "24", descricao: "Finalização em 16:9, com adaptação para outros formatos" },
  { id: "25", descricao: "Resolução em HD 1920x1080 Widescreen Prores HQ. Extensão .MOV" },
  { id: "26", descricao: "1 cópia (master), de cada versão do filme" },
  { id: "27", descricao: "Entrega de 1 cópia digital para cada peça finalizada" },
  { id: "28", descricao: "Envio de 1 base limpa para cada peça finalizada" },
];

const defaultItensNaoInclusos: ItemProducao[] = [
  { id: "1", descricao: "Carros fornecidos pelo cliente" },
  { id: "2", descricao: "Produção Pack shot" },
  { id: "3", descricao: "Audio: trilha, locução standard e mix" },
  { id: "4", descricao: "Artes, cartelas e letterings" },
  { id: "5", descricao: ".SRT, Audiodescrição, closed caption e versão em libras" },
  { id: "6", descricao: "Cópias de veiculação, links e ou novas versões" },
  { id: "7", descricao: "Taxas condecine" },
];

const defaultCustosAdicionais: CustoAdicional[] = [
  { id: "1", descricao: "Weather Day/Contingency Day", valor: 165000 },
  { id: "2", descricao: "Adiamento até antes da PPM", valor: 89500 },
  { id: "3", descricao: "Adiamento pós PPM – até 72hs da filmagem", valor: 125000 },
  { id: "4", descricao: "Troca de claquete", valor: 2500 },
  { id: "5", descricao: "Legendagem simples", valor: 1500 },
  { id: "6", descricao: "Closed caption", valor: 2300 },
  { id: "7", descricao: "Libras", valor: 4500 },
  { id: "8", descricao: "Audiodescrição", valor: 1400 },
  { id: "9", descricao: "Legenda .SRT", valor: 800 },
];

export default function BydBlackFriday() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<BudgetData>({
    projectInfo: defaultProjectInfo,
    valorProducao: 326000,
    itensInclusos: defaultItensInclusos,
    itensNaoInclusos: defaultItensNaoInclusos,
    custosAdicionais: defaultCustosAdicionais,
    observacoes: "",
  });

  const updateProjectInfo = useCallback((field: keyof ProjectInfo, value: string) => {
    setData((prev) => ({
      ...prev,
      projectInfo: { ...prev.projectInfo, [field]: value },
    }));
  }, []);

  const addItemIncluso = useCallback(() => {
    const newItem: ItemProducao = {
      id: Date.now().toString(),
      descricao: "",
      observacao: "",
    };
    setData((prev) => ({
      ...prev,
      itensInclusos: [...prev.itensInclusos, newItem],
    }));
  }, []);

  const removeItemIncluso = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      itensInclusos: prev.itensInclusos.filter((item) => item.id !== id),
    }));
  }, []);

  const updateItemIncluso = useCallback((id: string, field: keyof ItemProducao, value: string) => {
    setData((prev) => ({
      ...prev,
      itensInclusos: prev.itensInclusos.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }, []);

  const addItemNaoIncluso = useCallback(() => {
    const newItem: ItemProducao = {
      id: Date.now().toString(),
      descricao: "",
    };
    setData((prev) => ({
      ...prev,
      itensNaoInclusos: [...prev.itensNaoInclusos, newItem],
    }));
  }, []);

  const removeItemNaoIncluso = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      itensNaoInclusos: prev.itensNaoInclusos.filter((item) => item.id !== id),
    }));
  }, []);

  const updateItemNaoIncluso = useCallback((id: string, value: string) => {
    setData((prev) => ({
      ...prev,
      itensNaoInclusos: prev.itensNaoInclusos.map((item) =>
        item.id === id ? { ...item, descricao: value } : item
      ),
    }));
  }, []);

  const addCustoAdicional = useCallback(() => {
    const newCusto: CustoAdicional = {
      id: Date.now().toString(),
      descricao: "",
      valor: 0,
    };
    setData((prev) => ({
      ...prev,
      custosAdicionais: [...prev.custosAdicionais, newCusto],
    }));
  }, []);

  const removeCustoAdicional = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      custosAdicionais: prev.custosAdicionais.filter((custo) => custo.id !== id),
    }));
  }, []);

  const updateCustoAdicional = useCallback(
    (id: string, field: keyof CustoAdicional, value: string | number) => {
      setData((prev) => ({
        ...prev,
        custosAdicionais: prev.custosAdicionais.map((custo) =>
          custo.id === id ? { ...custo, [field]: value } : custo
        ),
      }));
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to database
      const { data: budget, error } = await supabase
        .from("budgets")
        .insert([{
          type: "filme",
          status: "Rascunho",
        }])
        .select()
        .single();

      if (error) throw error;

      // Save version with payload
      const { error: versionError } = await supabase.from("versions").insert([{
        budget_id: budget.id,
        versao: 1,
        payload: data as any,
        total_geral: data.valorProducao,
      }]);

      if (versionError) throw versionError;

      toast({
        title: "Sucesso",
        description: "Orçamento salvo com sucesso!",
      });

      navigate("/orcamentos");
    } catch (error) {
      console.error("Error saving budget:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar orçamento",
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
      <HeaderBar
        title="Orçamento BYD Black Friday"
        subtitle="Orçamento editável horizontal"
        backTo="/orcamentos"
        actions={
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        }
      />

      <div className="container-page py-6 space-y-6">
        {/* Informações do Projeto */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-1/4">Cliente</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.cliente}
                        onChange={(e) => updateProjectInfo("cliente", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Campanha</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.campanha}
                        onChange={(e) => updateProjectInfo("campanha", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Produto</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.produto}
                        onChange={(e) => updateProjectInfo("produto", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Título</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.titulo}
                        onChange={(e) => updateProjectInfo("titulo", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Duração</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.duracao}
                        onChange={(e) => updateProjectInfo("duracao", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Versões / Reduções</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.versoes}
                        onChange={(e) => updateProjectInfo("versoes", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Território</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.territorio}
                        onChange={(e) => updateProjectInfo("territorio", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Mídias / Veículos</TableCell>
                    <TableCell>
                      <Textarea
                        value={data.projectInfo.midias}
                        onChange={(e) => updateProjectInfo("midias", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Prazo de Veiculação</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.prazoVeiculacao}
                        onChange={(e) => updateProjectInfo("prazoVeiculacao", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Diretor</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.diretor}
                        onChange={(e) => updateProjectInfo("diretor", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Captação</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.captacao}
                        onChange={(e) => updateProjectInfo("captacao", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Diárias de Filmagem</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.diariasFilmagem}
                        onChange={(e) => updateProjectInfo("diariasFilmagem", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Finalização e Cópias</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.finalizacao}
                        onChange={(e) => updateProjectInfo("finalizacao", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Exclusividade Elenco</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.exclusividadeElenco}
                        onChange={(e) => updateProjectInfo("exclusividadeElenco", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Validade do Orçamento</TableCell>
                    <TableCell>
                      <Input
                        value={data.projectInfo.validadeOrcamento}
                        onChange={(e) => updateProjectInfo("validadeOrcamento", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Condição de Pagamento</TableCell>
                    <TableCell>
                      <Textarea
                        value={data.projectInfo.condicaoPagamento}
                        onChange={(e) => updateProjectInfo("condicaoPagamento", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Valor de Produção */}
        <Card>
          <CardHeader>
            <CardTitle>Valor de Produção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <BRLCurrencyInput
                value={data.valorProducao}
                onChange={(value) => setData((prev) => ({ ...prev, valorProducao: value }))}
              />
              <p className="text-lg font-semibold text-primary mt-2">
                {formatCurrency(data.valorProducao)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Itens Inclusos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Itens Inclusos no Valor da Produção</CardTitle>
              <Button onClick={addItemIncluso} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.itensInclusos.map((item) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Descrição do item"
                      value={item.descricao}
                      onChange={(e) => updateItemIncluso(item.id, "descricao", e.target.value)}
                    />
                    <Input
                      placeholder="Observação (opcional)"
                      value={item.observacao || ""}
                      onChange={(e) => updateItemIncluso(item.id, "observacao", e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItemIncluso(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Itens Não Inclusos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Não Inclusos no Valor da Produção</CardTitle>
              <Button onClick={addItemNaoIncluso} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.itensNaoInclusos.map((item) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <Input
                    placeholder="Descrição do item"
                    value={item.descricao}
                    onChange={(e) => updateItemNaoIncluso(item.id, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItemNaoIncluso(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custos Adicionais */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Custos Adicionais (Se Necessários)</CardTitle>
              <Button onClick={addCustoAdicional} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Custo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-1/3">Valor</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.custosAdicionais.map((custo) => (
                    <TableRow key={custo.id}>
                      <TableCell>
                        <Input
                          placeholder="Descrição"
                          value={custo.descricao}
                          onChange={(e) =>
                            updateCustoAdicional(custo.id, "descricao", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <BRLCurrencyInput
                          value={custo.valor}
                          onChange={(value) => updateCustoAdicional(custo.id, "valor", value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustoAdicional(custo.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Observações gerais sobre o orçamento..."
              value={data.observacoes}
              onChange={(e) => setData((prev) => ({ ...prev, observacoes: e.target.value }))}
              rows={6}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
