import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  createComparativeBudget,
  gluckliveTemplate,
  digitalPepperTemplate,
  blankTemplate,
  type ComparativeBudgetTemplate,
} from "@/utils/createComparativeBudget";

export default function OrcamentoComparativo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");

  const handleCreateFromTemplate = async (template: ComparativeBudgetTemplate) => {
    if (!clientName.trim() || !projectName.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome do cliente e do projeto",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await createComparativeBudget(template, clientName, projectName);
      
      toast({
        title: "Orçamento criado!",
        description: `Orçamento ${result.displayId} criado com sucesso`,
      });

      navigate(`/orcamentos/${result.budgetId}/editar`);
    } catch (error) {
      console.error("Erro ao criar orçamento:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar orçamento comparativo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Criar Orçamento Comparativo</h1>
            <p className="text-muted-foreground">
              Crie orçamentos com múltiplas opções de fornecedores
            </p>
          </div>
        </div>

        {/* Informações do projeto */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Projeto</CardTitle>
            <CardDescription>
              Preencha as informações básicas do orçamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Input
                id="client"
                placeholder="Nome do cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Projeto *</Label>
              <Input
                id="project"
                placeholder="Nome do projeto"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Template em Branco - Destaque */}
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Template em Branco
            </CardTitle>
            <CardDescription>
              Crie um orçamento comparativo do zero para editar livremente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleCreateFromTemplate(blankTemplate)}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <FileText className="mr-2 h-4 w-4" />
              Criar Template em Branco
            </Button>
          </CardContent>
        </Card>

        {/* Templates disponíveis */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Templates Pré-configurados</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gluck Live */}
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Gluck Live
                </CardTitle>
                <CardDescription>
                  Transmissão ao vivo - Setup 1 ou 2 câmeras
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Opção 1:</span>
                    <span className="font-medium">R$ 5.580,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Opção 2:</span>
                    <span className="font-medium">R$ 6.990,00</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleCreateFromTemplate(gluckliveTemplate)}
                  disabled={loading}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Usar este Template
                </Button>
              </CardContent>
            </Card>

            {/* Digital Pepper */}
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Digital Pepper
                </CardTitle>
                <CardDescription>
                  Captação/Transmissão - 1 ou 2 câmeras
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Opção 1:</span>
                    <span className="font-medium">R$ 16.682,16</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Opção 2:</span>
                    <span className="font-medium">R$ 23.730,96</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleCreateFromTemplate(digitalPepperTemplate)}
                  disabled={loading}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Usar este Template
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Informações adicionais */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Como funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Escolha um template pré-configurado com fornecedor e opções
            </p>
            <p>
              • O orçamento será criado com a estrutura comparativa
            </p>
            <p>
              • Você poderá editar todos os campos: valores, itens, descrições
            </p>
            <p>
              • O PDF gerado mostrará uma tabela comparativa entre as opções
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
