import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface ClientHonorario {
  id: string;
  client_name: string;
  honorario_percent: number;
}

/** Toggle rápido para ativar/desativar o módulo de Honorários */
const HONORARIOS_ENABLED = false;

export default function HonorariosConfig() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [honorarios, setHonorarios] = useState<ClientHonorario[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState("");
  const [newHonorarioPercent, setNewHonorarioPercent] = useState<number>(20);

  useEffect(() => {
    // Se desativado, não faz nada (nem checagem de admin, nem chamada ao banco)
    if (!HONORARIOS_ENABLED) {
      setLoading(false);
      return;
    }

    if (profile?.role !== "admin") {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem acessar esta página",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    loadHonorarios();
  }, [profile]);

  const loadHonorarios = async () => {
    try {
      const { data, error } = await supabase.from("client_honorarios").select("*").order("client_name");

      if (error) throw error;
      setHonorarios(data || []);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao carregar honorários", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!HONORARIOS_ENABLED) return; // hard block
    if (!newClientName.trim()) {
      toast({ title: "Nome do cliente obrigatório", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("client_honorarios").insert({
        client_name: newClientName.trim(),
        honorario_percent: newHonorarioPercent,
      });
      if (error) throw error;
      toast({ title: "Honorário adicionado com sucesso" });
      setNewClientName("");
      setNewHonorarioPercent(20);
      loadHonorarios();
    } catch (err: any) {
      console.error(err);
      if (err.code === "23505") {
        toast({ title: "Cliente já cadastrado", variant: "destructive" });
      } else {
        toast({ title: "Erro ao adicionar honorário", variant: "destructive" });
      }
    }
  };

  const handleUpdate = async (id: string, honorario_percent: number) => {
    if (!HONORARIOS_ENABLED) return; // hard block
    try {
      const { error } = await supabase.from("client_honorarios").update({ honorario_percent }).eq("id", id);
      if (error) throw error;
      toast({ title: "Honorário atualizado" });
      loadHonorarios();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!HONORARIOS_ENABLED) return; // hard block
    if (!confirm("Tem certeza que deseja remover este honorário?")) return;
    try {
      const { error } = await supabase.from("client_honorarios").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Honorário removido" });
      loadHonorarios();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  if (!HONORARIOS_ENABLED) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-8 font-semibold">Configuração de Honorários</h1>
              <p className="text-muted-foreground">Este módulo está desativado no momento.</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Honorários desativados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                A funcionalidade de cadastro e edição de honorários foi temporariamente desativada. Caso precise
                reativar, altere a flag <code>HONORARIOS_ENABLED</code> para <code>true</code>.
              </p>
              <div className="mt-4">
                <Button onClick={() => navigate("/")}>Voltar ao início</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-8 font-semibold">Configuração de Honorários</h1>
              <p className="text-muted-foreground">Gerencie os honorários por cliente</p>
            </div>
          </div>
        </div>

        {/* Adicionar Novo */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adicionar Novo Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Nome do Cliente</Label>
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: SBT, Bridgestone..."
                />
              </div>
              <div className="w-40">
                <Label>Honorário (%)</Label>
                <Input
                  type="number"
                  value={newHonorarioPercent}
                  onChange={(e) => setNewHonorarioPercent(Number(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {honorarios.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum cliente cadastrado ainda</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Honorário (%)</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {honorarios.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.client_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={h.honorario_percent}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            setHonorarios((prev) =>
                              prev.map((item) => (item.id === h.id ? { ...item, honorario_percent: newValue } : item)),
                            );
                          }}
                          onBlur={() => handleUpdate(h.id, h.honorario_percent)}
                          className="w-24"
                          min="0"
                          max="100"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(h.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
