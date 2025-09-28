import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, Clock, CheckCircle } from "lucide-react";

export function DashboardStats() {
  const stats = [
    {
      title: "Total de Orçamentos",
      value: "127",
      description: "Últimos 30 dias",
      icon: FileText,
      trend: "+12%"
    },
    {
      title: "Valor Total",
      value: "R$ 2.4M",
      description: "Orçamentos aprovados",
      icon: DollarSign,
      trend: "+8%"
    },
    {
      title: "Pendentes",
      value: "23",
      description: "Aguardando aprovação",
      icon: Clock,
      trend: "-2%"
    },
    {
      title: "Taxa de Aprovação",
      value: "87%",
      description: "Últimos 30 dias",
      icon: CheckCircle,
      trend: "+5%"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
            <div className="flex items-center mt-2">
              <span className={`text-xs font-medium ${
                stat.trend.startsWith('+') 
                  ? 'text-success' 
                  : stat.trend.startsWith('-') 
                  ? 'text-destructive' 
                  : 'text-muted-foreground'
              }`}>
                {stat.trend} em relação ao mês anterior
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}