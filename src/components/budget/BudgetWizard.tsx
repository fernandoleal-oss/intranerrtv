import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BudgetPreview } from "./BudgetPreview";

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

const filmSteps: WizardStep[] = [
  { id: "identification", title: "Identificação", description: "Dados básicos do produtor" },
  { id: "client-product", title: "Cliente & Produto", description: "Seleção do cliente e produto" },
  { id: "details", title: "Detalhes", description: "Job, mídias, território e período" },
  { id: "quotes", title: "Cotações", description: "Produtoras de filme e áudio" },
  { id: "review", title: "Revisão", description: "Comparador e preview final" },
  { id: "export", title: "Exportar", description: "Gerar PDF e enviar" },
];

export function BudgetWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [budgetType] = useState<"filme" | "audio" | "cc" | "imagem">("filme");
  
  // Mock preview data
  const mockPreviewData = {
    client: "SBT",
    product: "Campanha Institucional",
    type: budgetType,
    filmItems: [
      { name: "Produtora A - Direção + Produção", value: 45000 },
      { name: "Produtora B - Pós-produção", value: 25000 },
    ],
    audioItems: [
      { name: "Estúdio X - Trilha Original", value: 8000 },
    ],
    honorarioPercent: 12,
    honorarioValue: 9360,
    total: 87360,
  };

  const progress = ((currentStep + 1) / filmSteps.length) * 100;

  const nextStep = () => {
    if (currentStep < filmSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="flex gap-8">
      {/* Wizard Content */}
      <div className="flex-1 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Novo Orçamento</h1>
              <p className="text-muted-foreground">
                Produção de Filme • Passo {currentStep + 1} de {filmSteps.length}
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              ID: ORC-SBT-INST-20250928-03
            </Badge>
          </div>

          <Progress value={progress} className="w-full" />

          <div className="flex items-center gap-2 overflow-x-auto py-2">
            {filmSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border min-w-fit ${
                  index === currentStep
                    ? "bg-primary text-primary-foreground border-primary"
                    : index < currentStep
                    ? "bg-success-subtle text-success border-success/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <span className="text-sm font-medium">{index + 1}</span>
                <span className="text-sm">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{filmSteps[currentStep].title}</CardTitle>
            <p className="text-muted-foreground">
              {filmSteps[currentStep].description}
            </p>
          </CardHeader>
          <CardContent className="min-h-[400px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <h3 className="text-lg font-medium mb-2">
                Conteúdo do passo "{filmSteps[currentStep].title}"
              </h3>
              <p className="text-sm">
                Aqui serão implementados os formulários específicos para cada etapa do wizard
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex gap-2">
            <Button variant="outline">
              Salvar Rascunho
            </Button>
            
            {currentStep === filmSteps.length - 1 ? (
              <Button>
                Finalizar Orçamento
              </Button>
            ) : (
              <Button onClick={nextStep}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Lateral */}
      <BudgetPreview data={mockPreviewData} />
    </div>
  );
}