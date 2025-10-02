import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ClientSummary = {
  client: string;
  total: number;
  count: number;
};

interface TopClientsCardProps {
  clients: ClientSummary[];
  loading: boolean;
}

export function TopClientsCard({ clients, loading }: TopClientsCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Top 5 Clientes</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Carregando...
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Nenhum dado encontrado
          </div>
        ) : (
          <div className="space-y-2">
            {clients.slice(0, 5).map((client, idx) => (
              <button
                key={idx}
                onClick={() =>
                  navigate(`/financeiro/cliente/${encodeURIComponent(client.client)}`)
                }
                className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors group"
              >
                <div className="text-left">
                  <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {idx + 1}. {client.client}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {client.count} lançamento{client.count > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-base text-primary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(client.total)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
