import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Save,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  Star,
  Zap,
  TrendingUp,
  Calculator,
  ChevronDown,
  ChevronUp,
  Sum,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { HeaderBar } from "@/components/HeaderBar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type BudgetType = "filme" | "audio" | "imagem" | "cc";
type BudgetStructure = "categorias" | "fornecedores_fases";
type TotalDisplayMode = "somar_total" | "valores_individuais";

// ... (interfaces existentes permanecem iguais)

interface BudgetData {
  type: BudgetType;
  estrutura: BudgetStructure;
  totalDisplayMode: TotalDisplayMode; // NOVO CAMPO
  // ... (resto das propriedades existentes)
}

export default function OrcamentoNovo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<BudgetData>({
    type: "filme",
    estrutura: "categorias",
    totalDisplayMode: "somar_total", // VALOR PADRÃO
    // ... (resto do estado inicial)
  });

  // ... (funções existentes)

  // NOVA FUNÇÃO: Alternar modo de exibição do total
  const toggleTotalDisplayMode = () => {
    setData(prev => ({
      ...prev,
      totalDisplayMode: prev.totalDisplayMode === "somar_total" ? "valores_individuais" : "somar_total"
    }));
  };

  // MODIFICAR: Cálculo dos totais considerando o modo de exibição
  useEffect(() => {
    if (data.estrutura === "categorias") {
      const camps = data.campanhas || [];
      if (camps.length === 0) return;

      const baseCampanhas: TotaisCampanha[] = camps.map((c) => {
        const { filmVal, audioVal, subtotal } = calcCampanhaPartes(c);
        return {
          campId: c.id,
          nome: c.nome,
          filmVal,
          audioVal,
          subtotal,
        };
      });

      const total = data.totalDisplayMode === "somar_total" 
        ? baseCampanhas.reduce((sum, camp) => sum + camp.subtotal, 0)
        : 0;

      setData((prev) => ({
        ...prev,
        totais_campanhas: baseCampanhas,
        total,
      }));
    } else if (data.estrutura === "fornecedores_fases") {
      const fornecedores = data.fornecedores || [];
      let total = 0;

      if (data.totalDisplayMode === "somar_total") {
        fornecedores.forEach(fornecedor => {
          fornecedor.fases.forEach(fase => {
            fase.itens.forEach(item => {
              total += item.valor;
            });
          });
        });
      }

      setData(prev => ({
        ...prev,
        total
      }));
    }
  }, [data.campanhas, data.fornecedores, data.estrutura, data.totalDisplayMode]); // ADICIONAR DEPENDÊNCIA

  // ... (resto do código existente)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <HeaderBar
        title={
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6 text-blue-600" />
            <span>Novo Orçamento</span>
          </div>
        }
        subtitle="Preencha os dados e visualize em tempo real"
        backTo="/orcamentos"
        actions={
          <div className="flex items-center gap-3">
            {/* NOVO BOTÃO: Alternar modo de total */}
            <Button
              onClick={toggleTotalDisplayMode}
              variant="outline"
              className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              {data.totalDisplayMode === "somar_total" ? (
                <>
                  <Sum className="h-4 w-4" />
                  Modo Total
                </>
              ) : (
                <>
                  <List className="h-4 w-4" />
                  Modo Individual
                </>
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Salvando...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar e Gerar PDF
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="container-page py-6">
        {/* Banner Informativo Atualizado */}
        <Card className="mb-8 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-900 text-lg">Como preencher o orçamento</h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm text-blue-800">
                  <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>
                      <strong>Cliente e Produto</strong> são obrigatórios
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>
                      Use o botão <strong>Modo Total/Individual</strong> para controlar a soma
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>
                      <strong>Modo Total</strong>: Soma automática de todos os valores
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>
                      <strong>Modo Individual</strong>: Mostra apenas valores por item/campanha
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulário Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Identificação - ATUALIZADO COM MODO DE EXIBIÇÃO */}
            <Card className="shadow-lg border-blue-100">
              <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  Identificação do Orçamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="type" className="text-sm font-semibold">
                      Tipo *
                    </Label>
                    <Select value={data.type} onValueChange={(v) => updateData({ type: v as BudgetType })}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filme">Filme</SelectItem>
                        <SelectItem value="audio">Áudio</SelectItem>
                        <SelectItem value="imagem">Imagem</SelectItem>
                        <SelectItem value="cc">Closed Caption</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="estrutura" className="text-sm font-semibold">
                      Estrutura *
                    </Label>
                    <Select 
                      value={data.estrutura} 
                      onValueChange={(v) => updateData({ estrutura: v as BudgetStructure })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecione a estrutura" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="categorias">Categorias (padrão)</SelectItem>
                        <SelectItem value="fornecedores_fases">Fornecedores → Fases</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="totalDisplayMode" className="text-sm font-semibold">
                      Exibição de Valores *
                    </Label>
                    <Select 
                      value={data.totalDisplayMode} 
                      onValueChange={(v) => updateData({ totalDisplayMode: v as TotalDisplayMode })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecione o modo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="somar_total">
                          <div className="flex items-center gap-2">
                            <Sum className="h-4 w-4" />
                            <span>Mostrar Total Geral</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="valores_individuais">
                          <div className="flex items-center gap-2">
                            <List className="h-4 w-4" />
                            <span>Apenas Valores Individuais</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Indicador Visual do Modo Selecionado */}
                <div className={`p-4 rounded-lg border ${
                  data.totalDisplayMode === "somar_total" 
                    ? "bg-green-50 border-green-200" 
                    : "bg-blue-50 border-blue-200"
                }`}>
                  <div className="flex items-center gap-3">
                    {data.totalDisplayMode === "somar_total" ? (
                      <>
                        <Sum className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800">Modo Total Ativo</p>
                          <p className="text-sm text-green-600">
                            O sistema irá somar automaticamente todos os valores e mostrar o total geral no PDF.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <List className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-blue-800">Modo Individual Ativo</p>
                          <p className="text-sm text-blue-600">
                            O PDF mostrará apenas os valores individuais por item/campanha, sem total geral.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="produtor" className="text-sm font-semibold">
                      Produtor
                    </Label>
                    <Input
                      id="produtor"
                      value={data.produtor || ""}
                      onChange={(e) => updateData({ produtor: e.target.value })}
                      placeholder="Nome do produtor"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-semibold">
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={data.email || ""}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="h-12"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ... (resto dos componentes de Cliente & Produto permanecem iguais) */}

          </div>

          {/* Preview - ATUALIZADO */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <Card className="shadow-xl border-blue-200">
                <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <FileText className="h-6 w-6 text-blue-600" />
                    Resumo do Orçamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Indicador do Modo no Preview */}
                  <div className={`rounded-lg p-3 border ${
                    data.totalDisplayMode === "somar_total" 
                      ? "bg-green-50 border-green-200" 
                      : "bg-blue-50 border-blue-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      {data.totalDisplayMode === "somar_total" ? (
                        <>
                          <Sum className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-700">Modo Total</span>
                        </>
                      ) : (
                        <>
                          <List className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-700">Modo Individual</span>
                        </>
                      )}
                    </div>
                  </div>

                  {data.pendente_faturamento && (
                    <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 text-yellow-800 px-4 py-3">
                      <div className="flex items-center gap-3 font-semibold">
                        <AlertCircle className="h-5 w-5" />
                        PENDENTE DE FATURAMENTO
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-sm font-semibold text-gray-600">Cliente:</span>
                      <span className="font-bold text-gray-900 text-lg">{data.cliente || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-sm font-semibold text-gray-600">Produto:</span>
                      <span className="font-bold text-gray-900 text-lg">{data.produto || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-sm font-semibold text-gray-600">Estrutura:</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-3 py-1">
                        {data.estrutura === "fornecedores_fases" ? "Fornecedores → Fases" : "Categorias"}
                      </Badge>
                    </div>
                    
                    {/* ... (resto do preview) */}

                  {/* Total Geral - CONDICIONAL */}
                  {data.totalDisplayMode === "somar_total" && data.total > 0 && (
                    <div className="pt-6 border-t">
                      <h4 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Total Geral
                      </h4>
                      <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl border border-green-200">
                        <div className="text-4xl font-bold text-green-700 mb-2">
                          {money(data.total)}
                        </div>
                        <p className="text-sm text-green-600">
                          Valor total do orçamento
                        </p>
                      </div>
                    </div>
                  )}

                  {data.totalDisplayMode === "valores_individuais" && (
                    <div className="pt-6 border-t">
                      <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-sky-100 rounded-xl border border-blue-200">
                        <List className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-blue-700">Modo Individual Ativo</p>
                        <p className="text-xs text-blue-600 mt-1">
                          O PDF mostrará apenas valores por item/campanha
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ... (Dicas Rápidas atualizadas) */}
              <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-white shadow-lg">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-orange-900 text-lg mb-4 flex items-center gap-3">
                    <Zap className="h-5 w-5 text-orange-600" />
                    Dicas Rápidas
                  </h4>
                  <ul className="text-sm text-orange-800 space-y-3">
                    <li className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <span>
                        <strong>Modo Total</strong>: Ideal para propostas com valor fechado
                      </span>
                    </li>
                    <li className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <span>
                        <strong>Modo Individual</strong>: Perfeito para breakdown detalhado
                      </span>
                    </li>
                    <li className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <span>Altere o modo a qualquer momento</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}