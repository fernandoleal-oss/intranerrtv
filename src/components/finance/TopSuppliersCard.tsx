import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

type SupplierSummary = {
  supplier: string;
  total: number;
  count: number;
};

interface TopSuppliersCardProps {
  suppliers: SupplierSummary[];
  loading: boolean;
}

export function TopSuppliersCard({ suppliers, loading }: TopSuppliersCardProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Top 5 Fornecedores</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Carregando...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Nenhum dado encontrado
          </div>
        ) : (
          <div className="space-y-2">
            {suppliers.slice(0, 5).map((supplier, idx) => (
              <div
                key={idx}
                className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="text-left">
                  <div className="font-semibold text-sm">
                    {idx + 1}. {supplier.supplier}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {supplier.count} transaç{supplier.count > 1 ? "ões" : "ão"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-base text-primary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(supplier.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
