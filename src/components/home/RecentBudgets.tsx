import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "Enviado ao atendimento":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "Rascunho":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

export const RecentBudgets = () => {
  if (recentBudgets.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Nenhum orçamento ainda</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Comece criando seu primeiro orçamento usando os cards acima.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recentes & Em andamento</h2>
        <Button variant="outline" size="sm">
          Ver todos
        </Button>
      </div>
      
      <div className="grid gap-4">
        {recentBudgets.map((budget) => (
          <Card key={budget.id} className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium font-mono">
                    {budget.id}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {budget.client}
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {budget.product}
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(budget.status)}>
                  {budget.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">{budget.type}</span>
                  <span className="text-muted-foreground">{budget.version}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {budget.updatedAt}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-lg">{budget.total}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="h-3 w-3" />
                      Ver
                    </Button>
                    <Button size="sm" className="gap-1">
                      Continuar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};