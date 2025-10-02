// src/pages/Direitos.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefreshCcw, Download, Settings, ArrowLeft, Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Direitos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rights, setRights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sheetId, setSheetId] = useState("1UF-P79wkW3HMs9zMFgICtepX1bEL8Q5T_avZngeMGhw");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newRight, setNewRight] = useState({
    client: "",
    product: "",
    title: "",
    contract_signed_production: "",
    first_air: "",
    link_drive: "",
  });

  useEffect(() => {
    loadRights();
  }, []);

  const loadRights = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('rights')
        .select('*')
        .order('expire_date', { ascending: true });
      
      setRights(data || []);
    } catch (error) {
      console.error("Erro ao carregar direitos:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncFromSheets = async () => {
    if (!sheetId.trim()) {
      toast({ title: "Sheet ID obrigatório", variant: "destructive" });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('rights_sync', {
        body: { sheetId: sheetId.trim() }
      });

      if (error) throw error;

      toast({
        title: "Sincronização concluída!",
        description: `${data.records || 0} registros sincronizados`
      });
      
      await loadRights();
    } catch (error: any) {
      console.error("Erro na sincronização:", error);
      toast({
        title: "Erro ao sincronizar",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const addRight = async () => {
    if (!newRight.client || !newRight.product || !newRight.title) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from('rights').insert([{
        client: newRight.client,
        product: newRight.product,
        title: newRight.title,
        contract_signed_production: newRight.contract_signed_production || null,
        first_air: newRight.first_air || null,
        link_drive: newRight.link_drive || null,
      }]);

      if (error) throw error;

      toast({ title: "Direito adicionado com sucesso!" });
      setAddDialogOpen(false);
      setNewRight({
        client: "",
        product: "",
        title: "",
        contract_signed_production: "",
        first_air: "",
        link_drive: "",
      });
      await loadRights();
    } catch (error: any) {
      console.error("Erro ao adicionar direito:", error);
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exportToCSV = () => {
    const headers = ["Cliente", "Produto", "Título", "Status", "Vencimento"];
    const rows = rights.map(r => [
      r.client,
      r.product,
      r.title,
      r.status_label || "—",
      r.expire_date || "—"
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `direitos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-gray-100 text-gray-700";
    const s = status.toLowerCase();
    if (s.includes("vencido")) return "bg-red-100 text-red-700";
    if (s.includes("vencer")) return "bg-amber-100 text-amber-700";
    if (s.includes("renovado")) return "bg-blue-100 text-blue-700";
    return "bg-green-100 text-green-700";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Gestão de Direitos</h1>
              <p className="text-muted-foreground">Controle de direitos de uso e renovações</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Direito
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Direito</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente *</Label>
                    <Input
                      id="client"
                      value={newRight.client}
                      onChange={(e) => setNewRight({ ...newRight, client: e.target.value })}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product">Produto *</Label>
                    <Input
                      id="product"
                      value={newRight.product}
                      onChange={(e) => setNewRight({ ...newRight, product: e.target.value })}
                      placeholder="Nome do produto"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="title">Título do Filme *</Label>
                    <Input
                      id="title"
                      value={newRight.title}
                      onChange={(e) => setNewRight({ ...newRight, title: e.target.value })}
                      placeholder="Nome do filme"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_date">Data de Assinatura</Label>
                    <Input
                      id="contract_date"
                      type="date"
                      value={newRight.contract_signed_production}
                      onChange={(e) => setNewRight({ ...newRight, contract_signed_production: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_air">Data de Primeira Veiculação</Label>
                    <Input
                      id="first_air"
                      type="date"
                      value={newRight.first_air}
                      onChange={(e) => setNewRight({ ...newRight, first_air: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="link_drive">Link do Drive (opcional)</Label>
                    <Input
                      id="link_drive"
                      value={newRight.link_drive}
                      onChange={(e) => setNewRight({ ...newRight, link_drive: e.target.value })}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={addRight}>
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Sincronizar Google Sheets
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sincronizar com Google Sheets</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Sheet ID</label>
                    <Input
                      value={sheetId}
                      onChange={(e) => setSheetId(e.target.value)}
                      placeholder="1UF-P79wkW3HMs9zMFgICtepX1bEL8Q5T_avZngeMGhw"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cada aba da planilha representa um cliente
                    </p>
                  </div>
                  <Button
                    onClick={syncFromSheets}
                    disabled={syncing}
                    className="w-full gap-2"
                  >
                    {syncing ? (
                      <>
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="h-4 w-4" />
                        Sincronizar Agora
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={loadRights} variant="outline" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Direitos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rights.length}</div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/30">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vencidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {rights.filter(r => r.status_label?.includes("VENCIDO")).length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                A Vencer (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">
                {rights.filter(r => r.status_label?.includes("VENCER")).length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {rights.filter(r => r.status_label === "EM USO").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Produto</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Título</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Vencimento</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Carregando...
                      </td>
                    </tr>
                  ) : rights.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum direito cadastrado. Clique em "Adicionar Direito" para começar.
                      </td>
                    </tr>
                  ) : (
                    rights.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm">{r.client}</td>
                        <td className="px-4 py-3 text-sm">{r.product}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            {r.title}
                            {r.link_drive && (
                              <a
                                href={r.link_drive}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {r.expire_date ? new Date(r.expire_date).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              r.status_label
                            )}`}
                          >
                            {r.status_label || "—"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}