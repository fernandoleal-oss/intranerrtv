import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TrendingUp, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type FinanceEvent = {
  id: string;
  ref_month: string;
  cliente: string | null;
  fornecedor: string | null;
  ap: string | null;
  descricao: string | null;
  total_cents: number;
};

type MonthlyData = {
  month: string;
  monthLabel: string;
  total: number;
  count: number;
};

export function AnnualTotalsDialog() {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [filterClient, setFilterClient] = useState<string>("todos");
  const [filterSupplier, setFilterSupplier] = useState<string>("todos");
  const [events, setEvents] = useState<FinanceEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const availableYears = ["2024", "2025", "2026"];
  
  useEffect(() => {
    if (open) {
      loadEvents();
    }
  }, [open, year]);

  async function loadEvents() {
    setLoading(true);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      const { data, error } = await supabase
        .from("finance_events")
        .select("id, ref_month, cliente, fornecedor, ap, descricao, total_cents")
        .gte("ref_month", startDate)
        .lte("ref_month", endDate)
        .order("ref_month", { ascending: true });

      if (error) throw error;
      setEvents((data || []) as FinanceEvent[]);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filtros únicos
  const uniqueClients = useMemo(() => {
    const clients = Array.from(new Set(events.map(e => e.cliente).filter(Boolean))).sort();
    return ["todos", ...clients];
  }, [events]);

  const uniqueSuppliers = useMemo(() => {
    const suppliers = Array.from(new Set(events.map(e => e.fornecedor).filter(Boolean))).sort();
    return ["todos", ...suppliers];
  }, [events]);

  // Eventos filtrados
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchClient = filterClient === "todos" || e.cliente === filterClient;
      const matchSupplier = filterSupplier === "todos" || e.fornecedor === filterSupplier;
      return matchClient && matchSupplier;
    });
  }, [events, filterClient, filterSupplier]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredEvents.reduce((sum, e) => sum + e.total_cents, 0) / 100;
    const count = filteredEvents.length;
    const avgTicket = count > 0 ? total / count : 0;
    
    return { total, count, avgTicket };
  }, [filteredEvents]);

  // Dados mensais para gráfico
  const monthlyData = useMemo(() => {
    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    const data: MonthlyData[] = months.map((m, idx) => {
      const monthEvents = filteredEvents.filter(e => e.ref_month.substring(5, 7) === m);
      return {
        month: m,
        monthLabel: monthNames[idx],
        total: monthEvents.reduce((sum, e) => sum + e.total_cents, 0) / 100,
        count: monthEvents.length,
      };
    });
    
    return data;
  }, [filteredEvents, year]);

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleExport = () => {
    const header = ["Mês", "Cliente", "AP", "Fornecedor", "Descrição", "Total"].join(",");
    const rows = filteredEvents.map(e => [
      e.ref_month.substring(0, 7),
      `"${(e.cliente || "").replace(/"/g, '""')}"`,
      `"${(e.ap || "").replace(/"/g, '""')}"`,
      `"${(e.fornecedor || "").replace(/"/g, '""')}"`,
      `"${(e.descricao || "").replace(/"/g, '""')}"`,
      (e.total_cents / 100).toFixed(2),
    ].join(","));
    
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_anual_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Totais Anuais
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Relatório Detalhado Anual</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filtros */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={filterClient} onValueChange={setFilterClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueClients.map(c => (
                        <SelectItem key={c} value={c}>
                          {c === "todos" ? "Todos" : c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueSuppliers.map(s => (
                        <SelectItem key={s} value={s}>
                          {s === "todos" ? "Todos" : s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Receita Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{formatBRL(kpis.total)}</div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total de Registros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{kpis.count}</div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Ticket Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">{formatBRL(kpis.avgTicket)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita Mensal - {year}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatBRL(value)}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabela Detalhada */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Registros Detalhados ({filteredEvents.length})</CardTitle>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg max-h-96 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>AP</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-mono text-xs">
                            {event.ref_month.substring(5, 7)}/{event.ref_month.substring(0, 4)}
                          </TableCell>
                          <TableCell className="font-medium">{event.cliente || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{event.ap || "—"}</TableCell>
                          <TableCell className="text-sm">{event.fornecedor || "—"}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate" title={event.descricao || ""}>
                            {event.descricao || "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatBRL(event.total_cents / 100)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
