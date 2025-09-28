import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, Calendar, Building2, Package } from "lucide-react";

// Mock data for demonstration
const recentBudgets = [
  {
    id: "ORC-SBT-KV30-20240928-01",
    client: "SBT",
    product: "KV30",
    type: "Produção de filme",
    version: "v2",
    status: "Enviado ao atendimento",
    total: "R$ 45.000,00",
    updatedAt: "Há 2 horas",
  },
  {
    id: "ORC-IBJR-BODE-20240927-01",
    client: "IBJR",
    product: "Chega de Bode na Sala",
    type: "Produção de áudio", 
    version: "v1",
    status: "Aprovado",
    total: "R$ 12.500,00",
    updatedAt: "Ontem",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Aprovado":
      return "bg-success/10 text-success border border-success/20";
    case "Enviado ao atendimento":
      return "bg-info/10 text-info border border-info/20";
    case "Rascunho":
      return "bg-muted text-muted-foreground border border-border";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
};

export const RecentBudgets = () => {
  if (recentBudgets.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border/50 card-gradient">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Nenhum orçamento ainda</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Comece criando seu primeiro orçamento usando um dos tipos disponíveis acima
          </p>
          <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
            Criar primeiro orçamento
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground">Orçamentos recentes</h2>
          <p className="text-muted-foreground">Acesse rapidamente seus últimos orçamentos</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="border-border/50 hover:border-primary/50 hover:bg-primary/5"
        >
          Ver todos
        </Button>
      </div>
      
      <div className="grid gap-6 animate-fade-up">
        {recentBudgets.map((budget, index) => (
          <Card 
            key={budget.id} 
            className="group hover-lift border-border/50 hover:border-primary/30 card-gradient shadow-elegant"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg font-bold font-mono group-hover:text-primary transition-colors">
                    {budget.id}
                  </CardTitle>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">{budget.client}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">{budget.product}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{budget.updatedAt}</span>
                    </div>
                  </div>
                </div>
                <Badge className={`${getStatusColor(budget.status)} font-semibold`}>
                  {budget.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo: </span>
                    <span className="font-medium">{budget.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Versão: </span>
                    <span className="font-medium">{budget.version}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground block">Total</span>
                  <span className="font-bold text-2xl text-primary">{budget.total}</span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-0">
              <div className="flex gap-3 w-full">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5"
                >
                  <Eye className="h-4 w-4" />
                  Ver PDF
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                >
                  Continuar
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};