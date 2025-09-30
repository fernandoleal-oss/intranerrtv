import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, ExternalLink, Film, FolderOpen, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Tipo manual para a tabela rights (será criada via migração)
type Right = {
  id: string;
  client: string;
  product: string;
  title: string;
  first_air: string | null;
  expire_date: string | null;
  status_label: string | null;
  link_film: string | null;
  link_drive: string | null;
  renewed: boolean;
  notified_30d: boolean;
  notified_15d: boolean;
  notified_expired: boolean;
  renewal_contract_url: string | null;
  renewal_signed_at: string | null;
  renewal_validity_months: number | null;
  created_at: string;
  updated_at: string;
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const daysUntil = (dateStr: string | null): number => {
  if (!dateStr) return 999;
  const exp = new Date(dateStr);
  const now = new Date();
  const diff = exp.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const StatusPill = ({
  expire_date,
  status_label,
}: {
  expire_date: string | null;
  status_label: string | null;
}) => {
  const d = daysUntil(expire_date);
  let color = "bg-gray-500/20 text-gray-300";
  let label = status_label || "Indefinido";

  if (d < 0) {
    color = "bg-red-500/20 text-red-300 border-red-500/30";
    label = "VENCIDO";
  } else if (d === 0) {
    color = "bg-orange-500/20 text-orange-300 border-orange-500/30";
    label = "HOJE";
  } else if (d <= 15) {
    color = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    label = "≤ 15 DIAS";
  } else if (d <= 30) {
    color = "bg-blue-500/20 text-blue-300 border-blue-500/30";
    label = "≤ 30 DIAS";
  } else {
    color = "bg-green-500/20 text-green-300 border-green-500/30";
    label = "EM USO";
  }

  return (
    <Badge className={`${color} text-xs px-3 py-1 rounded-full border`}>
      {label}
    </Badge>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
    <div className="text-3xl font-bold text-white">{value}</div>
    <div className="text-sm text-white/70 mt-1">{label}</div>
  </div>
);

const RenewWizard = ({
  open,
  onClose,
  row,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  row: Right | null;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [contractUrl, setContractUrl] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [validityMonths, setValidityMonths] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setContractUrl("");
      setSignedDate("");
      setValidityMonths("");
    }
  }, [open]);

  const handleSave = async () => {
    if (!row) return;
    try {
      const signed = new Date(signedDate);
      const expireDate = new Date(signed);
      expireDate.setMonth(expireDate.getMonth() + parseInt(validityMonths));

      const { error } = await supabase
        .from("rights" as any)
        .update({
          renewed: true,
          renewal_contract_url: contractUrl,
          renewal_signed_at: signedDate,
          renewal_validity_months: parseInt(validityMonths),
          expire_date: expireDate.toISOString().split("T")[0],
          notified_30d: false,
          notified_15d: false,
          notified_expired: false,
          status_label: "RENOVADO",
        } as any)
        .eq("id", row.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Contrato renovado!" });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">
            Renovar Direitos - {row?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label className="text-white/70">Link do Contrato Renovado</Label>
                <Input
                  value={contractUrl}
                  onChange={(e) => setContractUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!contractUrl}
                className="w-full btn-gradient"
              >
                Próximo
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label className="text-white/70">Data da Assinatura</Label>
                <Input
                  type="date"
                  value={signedDate}
                  onChange={(e) => setSignedDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Validade (meses)</Label>
                <Input
                  type="number"
                  value={validityMonths}
                  onChange={(e) => setValidityMonths(e.target.value)}
                  placeholder="12"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 nav-button"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!signedDate || !validityMonths}
                  className="flex-1 btn-gradient"
                >
                  Salvar
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="ghost" className="text-white/70">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function RightsBoard() {
  const { toast } = useToast();
  const [data, setData] = useState<Right[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [openRenew, setOpenRenew] = useState(false);
  const [current, setCurrent] = useState<Right | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("rights" as any)
        .select("*")
        .order("expire_date", { ascending: true });
      if (error) throw error;
      setData((rows as any as Right[]) || []);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const clients = useMemo(() => {
    const unique = Array.from(new Set(data.map((r) => r.client)));
    return unique.sort();
  }, [data]);

  const byClient = useMemo(() => {
    return clientFilter === "all"
      ? data
      : data.filter((r) => r.client === clientFilter);
  }, [data, clientFilter]);

  const filtered = useMemo(() => {
    let list = byClient;
    if (search) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.product.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter === "uso")
      list = list.filter((r) => daysUntil(r.expire_date) > 30);
    if (statusFilter === "30")
      list = list.filter(
        (r) => daysUntil(r.expire_date) <= 30 && daysUntil(r.expire_date) > 15
      );
    if (statusFilter === "15")
      list = list.filter(
        (r) => daysUntil(r.expire_date) <= 15 && daysUntil(r.expire_date) >= 0
      );
    if (statusFilter === "hoje") list = list.filter((r) => daysUntil(r.expire_date) === 0);
    if (statusFilter === "venc") list = list.filter((r) => daysUntil(r.expire_date) < 0);

    return list;
  }, [byClient, search, statusFilter]);

  const kpis = useMemo(() => {
    const uso = filtered.filter((r) => daysUntil(r.expire_date) > 30).length;
    const le30 = filtered.filter(
      (r) => daysUntil(r.expire_date) <= 30 && daysUntil(r.expire_date) > 15
    ).length;
    const le15 = filtered.filter(
      (r) => daysUntil(r.expire_date) <= 15 && daysUntil(r.expire_date) >= 0
    ).length;
    const hoje = filtered.filter((r) => daysUntil(r.expire_date) === 0).length;
    const venc = filtered.filter((r) => daysUntil(r.expire_date) < 0).length;
    return { uso, le30, le15, hoje, venc };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Tabs de clientes */}
      <Tabs value={clientFilter} onValueChange={setClientFilter}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="all" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Todos
          </TabsTrigger>
          {clients.map((c) => (
            <TabsTrigger
              key={c}
              value={c}
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Em uso" value={kpis.uso} />
        <StatCard label="≤ 30 dias" value={kpis.le30} />
        <StatCard label="≤ 15 dias" value={kpis.le15} />
        <StatCard label="Vence hoje" value={kpis.hoje} />
        <StatCard label="Vencido" value={kpis.venc} />
      </div>

      {/* Busca e filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou produto..."
            className="pl-10 bg-white/5 border-white/10 text-white"
          />
        </div>
        <Button
          onClick={() => setStatusFilter("")}
          variant={statusFilter === "" ? "default" : "outline"}
          className={statusFilter === "" ? "btn-gradient" : "nav-button"}
        >
          Todos
        </Button>
        <Button
          onClick={() => setStatusFilter("uso")}
          variant={statusFilter === "uso" ? "default" : "outline"}
          className={statusFilter === "uso" ? "btn-gradient" : "nav-button"}
        >
          Em uso
        </Button>
        <Button
          onClick={() => setStatusFilter("30")}
          variant={statusFilter === "30" ? "default" : "outline"}
          className={statusFilter === "30" ? "btn-gradient" : "nav-button"}
        >
          ≤30d
        </Button>
        <Button
          onClick={() => setStatusFilter("15")}
          variant={statusFilter === "15" ? "default" : "outline"}
          className={statusFilter === "15" ? "btn-gradient" : "nav-button"}
        >
          ≤15d
        </Button>
        <Button
          onClick={() => setStatusFilter("hoje")}
          variant={statusFilter === "hoje" ? "default" : "outline"}
          className={statusFilter === "hoje" ? "btn-gradient" : "nav-button"}
        >
          Hoje
        </Button>
        <Button
          onClick={() => setStatusFilter("venc")}
          variant={statusFilter === "venc" ? "default" : "outline"}
          className={statusFilter === "venc" ? "btn-gradient" : "nav-button"}
        >
          Vencido
        </Button>
      </div>

      {/* Tabela */}
      <div className="overflow-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
            <tr className="text-left text-white/70">
              <th className="p-3 font-medium">Produto</th>
              <th className="p-3 font-medium">Título</th>
              <th className="p-3 font-medium">1ª veiculação</th>
              <th className="p-3 font-medium">
                Expira <span className="text-white/40 text-xs">(asc)</span>
              </th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Links</th>
              <th className="p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-white/10 animate-pulse">
                    <td className="p-3">
                      <div className="h-4 w-28 bg-white/10 rounded" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-56 bg-white/10 rounded" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-24 bg-white/10 rounded" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-24 bg-white/10 rounded" />
                    </td>
                    <td className="p-3">
                      <div className="h-6 w-24 bg-white/10 rounded-2xl" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-16 bg-white/10 rounded" />
                    </td>
                    <td className="p-3">
                      <div className="h-8 w-24 bg-white/10 rounded" />
                    </td>
                  </tr>
                ))
              : filtered.length === 0
              ? (
                  <tr>
                    <td className="p-6 text-white/50 text-center" colSpan={7}>
                      Nada encontrado com esses filtros.
                    </td>
                  </tr>
                )
              : filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-white/10 hover:bg-white/5 text-white"
                  >
                    <td className="p-3 whitespace-nowrap">{r.product}</td>
                    <td className="p-3">{r.title}</td>
                    <td className="p-3 whitespace-nowrap">{fmt(r.first_air)}</td>
                    <td className="p-3 whitespace-nowrap">{fmt(r.expire_date)}</td>
                    <td className="p-3">
                      <StatusPill
                        expire_date={r.expire_date}
                        status_label={r.status_label}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {r.link_film ? (
                          <a
                            className="underline inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                            href={r.link_film}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Film className="h-4 w-4" /> filme
                          </a>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                        {r.link_drive ? (
                          <a
                            className="underline inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                            href={r.link_drive}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FolderOpen className="h-4 w-4" /> drive
                          </a>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          className="px-2 py-1 rounded-lg border border-white/10 inline-flex items-center gap-1 text-xs nav-button"
                          onClick={() => {
                            setCurrent(r);
                            setOpenRenew(true);
                          }}
                        >
                          <RefreshCcw className="h-3 w-3" /> Renovar
                        </Button>
                        {r.link_film && (
                          <a
                            className="px-2 py-1 rounded-lg border border-white/10 inline-flex items-center gap-1 text-xs nav-button"
                            href={r.link_film}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" /> Abrir
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <RenewWizard
        open={openRenew}
        onClose={() => setOpenRenew(false)}
        row={current}
        onSaved={load}
      />
    </div>
  );
}
