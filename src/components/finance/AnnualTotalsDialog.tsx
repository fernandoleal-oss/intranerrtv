import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type AnnualTotal = {
  name: string;
  total: number;
  count: number;
};

export function AnnualTotalsDialog() {
  const [open, setOpen] = useState(false);
  const [viewType, setViewType] = useState<"client" | "supplier">("client");
  const [selectedItem, setSelectedItem] = useState("");
  const [items, setItems] = useState<AnnualTotal[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalData, setTotalData] = useState<AnnualTotal | null>(null);

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open, viewType]);

  useEffect(() => {
    if (selectedItem) {
      loadTotal();
    }
  }, [selectedItem, viewType]);

  async function loadItems() {
    setLoading(true);
    try {
      const column = viewType === "client" ? "cliente" : "fornecedor";
      const { data } = await supabase
        .from("finance_events")
        .select(column)
        .order(column);

      if (data) {
        const uniqueItems = Array.from(
          new Set(data.map(row => (row as any)[column]).filter(Boolean))
        ).sort();
        
        setItems(uniqueItems.map(name => ({ name: name as string, total: 0, count: 0 })));
      }
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTotal() {
    setLoading(true);
    try {
      const column = viewType === "client" ? "cliente" : "fornecedor";
      const { data } = await supabase
        .from("finance_events")
        .select("total_cents")
        .eq(column, selectedItem);

      if (data) {
        const total = data.reduce((sum, row) => sum + (row.total_cents / 100), 0);
        setTotalData({
          name: selectedItem,
          total,
          count: data.length,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar total:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Totais Anuais
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Totais Anuais por {viewType === "client" ? "Cliente" : "Fornecedor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Visualizar por</Label>
              <Select value={viewType} onValueChange={(v) => setViewType(v as "client" | "supplier")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="supplier">Fornecedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Selecione {viewType === "client" ? "o Cliente" : "o Fornecedor"}</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.name} value={item.name}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalData && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {viewType === "client" ? "Cliente" : "Fornecedor"}
                    </p>
                    <p className="text-xl font-bold">{totalData.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Anual</p>
                      <p className="text-2xl font-bold text-primary">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(totalData.total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Lançamentos</p>
                      <p className="text-2xl font-bold">{totalData.count}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
