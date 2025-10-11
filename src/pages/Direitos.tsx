// src/pages/Direitos.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefreshCcw, Download, Settings, ArrowLeft, Plus, ExternalLink, ClipboardPaste, Filter, Eye, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ===== Types =====
type RightRow = {
  id?: string;
  client: string | null;
  product: string | null;
  title: string | null;
  contract_signed_production: string | null; // ISO
  first_air: string | null; // ISO
  expire_date: string | null; // ISO
  link_drive: string | null;
  status_label: string | null;
  idempotent_key?: string; // pode não existir no schema (fallback trata)
};

const TODAY = new Date();

// ===== Utils =====
function toISODate(d: Date | null) {
  if (!d || isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // ajuste fim de mês
  return d;
}

function parseBrDate(s?: string | null): Date | null {
  if (!s) return null;
  const cleaned = s
    .toString()
    .trim()
    .replace(/11h|12h|10h|9h|8h|7h|6h|5h|4h|3h|2h|1h/gi, "") // remove “11h” etc.
    .replace(/[^\d\/\-]/g, "");
  if (!cleaned) return null;

  // ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const d = new Date(cleaned + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // dd/mm/yyyy
  const m = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10) - 1;
  let yyyy = parseInt(m[3], 10);
  if (yyyy < 100) yyyy += 2000;
  const d = new Date(yyyy, mm, dd);
  return isNaN(d.getTime()) ? null : d;
}

function monthsFromLabel(validade: string | null | undefined): number | null {
  if (!validade) return null;
  const m = validade.toLowerCase().match(/(\d+)\s*mes/);
  return m ? parseInt(m[1], 10) : null;
}

function computeExpireDate(
  explicitExpireISO: string | null,
  firstAirISO: string | null,
  validadeLabel: string | null,
): string | null {
  if (explicitExpireISO) return explicitExpireISO;
  const base = firstAirISO ? new Date(firstAirISO) : null;
  const months = monthsFromLabel(validadeLabel);
  if (base && months) return toISODate(addMonths(base, months));
  return null;
}

function computeStatus(expireISO: string | null, firstAirISO: string | null, provided?: string | null): string | null {
  if (provided && provided.trim()) return provided.trim().toUpperCase();
  if (!expireISO) return null;

  const exp = new Date(expireISO);
  const diffDays = Math.floor((exp.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));

  // Se vencido
  if (diffDays < 0) return "VENCIDO";
  
  // Se menor de 30 dias para vencer
  if (diffDays <= 30) return "A VENCER (30d)";

  // Se data igual ou maior que hoje → EM USO
  if (exp >= TODAY) return "EM USO";

  return "DENTRO DO PRAZO";
}

function mkIdemKey(client: string | null, product: string | null, title: string | null, ap?: string | null) {
  const norm = (v?: string | null) => (v || "").trim().toLowerCase().replace(/\s+/g, " ");
  return [norm(client), norm(product), norm(title), norm(ap)].join("::");
}

function pill(status: string | null) {
  if (!status) return "bg-gray-100 text-gray-700";
  const s = status.toLowerCase();
  if (s.includes("vencido")) return "bg-red-100 text-red-700";
  if (s.includes("vencer")) return "bg-amber-100 text-amber-700";
  if (s.includes("renovado")) return "bg-blue-100 text-blue-700";
  if (s.includes("em uso")) return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
}

// ===== Página =====
export default function Direitos() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [rights, setRights] = useState<RightRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheetId, setSheetId] = useState("1UF-P79wkW3HMs9zMFgICtepX1bEL8Q5T_avZngeMGhw");
  const [syncing, setSyncing] = useState(false);

  // import via colar
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [defaultClient, setDefaultClient] = useState("");
  const [importing, setImporting] = useState(false);

  // filtros
  const params = new URLSearchParams(location.search);
  const initialClient = params.get("client") || "";
  const [clientFilter, setClientFilter] = useState(initialClient);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DUE30" | "EXPIRED">("ALL");

  useEffect(() => {
    loadRights();
  }, []);

  useEffect(() => {
    if (initialClient) setClientFilter(initialClient);
  }, [initialClient]);

  async function loadRights() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("rights").select("*").order("expire_date", { ascending: true });
      if (error) throw error;
      setRights((data as RightRow[]) || []);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function syncFromSheets() {
    if (!sheetId.trim()) {
      toast({ title: "Sheet ID obrigatório", variant: "destructive" });
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("rights_sync", {
        body: { sheetId: sheetId.trim() },
      });
      if (error) throw error;
      toast({
        title: "Sincronização concluída!",
        description: `${data?.records || 0} registros sincronizados.`,
      });
      await loadRights();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao sincronizar",
        description: e?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  function exportToCSV() {
    const headers = ["Cliente", "Produto", "Título", "Status", "Vencimento", "Primeira Veiculação", "Link"];
    const rows = rights.map((r) => [
      r.client || "",
      r.product || "",
      r.title || "",
      r.status_label || "—",
      r.expire_date || "—",
      r.first_air || "—",
      r.link_drive || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `direitos_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  // ===== Parse da planilha colada =====
  type ParsedRow = {
    ap?: string | null;
    client?: string | null;
    product?: string | null;
    title?: string | null;
    assinatura_elenco?: string | null;
    assinatura_producao?: string | null;
    primeira_veiculacao?: string | null;
    validade?: string | null;
    data_expira?: string | null;
    link_copia?: string | null;
    status?: string | null;
  };

  function normalizeHeader(h: string) {
    return h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function guessDelimiter(line: string): "tab" | "semicolon" | "comma" | "spaces" {
    if (line.includes("\t")) return "tab";
    if (line.includes(";")) return "semicolon";
    if (line.includes(",")) return "comma";
    return "spaces"; // 2+ spaces
  }

  function splitSmart(line: string, mode: ReturnType<typeof guessDelimiter>): string[] {
    if (mode === "tab") return line.split("\t").map((s) => s.trim());
    if (mode === "semicolon") return line.split(";").map((s) => s.trim());
    if (mode === "comma") return line.split(",").map((s) => s.trim());
    // fallback: 2+ spaces
    return line.split(/\s{2,}/).map((s) => s.trim());
  }

  function lineLooksLikeHeader(cells: string[]) {
    const joined = cells.join(" ").toLowerCase();
    return [
      "ap",
      "cliente",
      "produto",
      "título",
      "titulo",
      "assinatura",
      "elenco",
      "produção",
      "producao",
      "primeira",
      "veiculação",
      "veiculacao",
      "validade",
      "expira",
      "link",
      "status",
    ].some((k) => joined.includes(k));
  }

  function parsePastedTable(raw: string): ParsedRow[] {
    const lines = raw
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (!lines.length) return [];

    const mode = guessDelimiter(lines[0]);
    let startIdx = 1;
    let headerCells = splitSmart(lines[0], mode);
    let headerIsReal = lineLooksLikeHeader(headerCells);

    // se a primeira linha NÃO parece cabeçalho, cria mapeamento posicional padrão
    if (!headerIsReal) {
      // padrão para: AP | PRODUTO | TITULO | ASS. ELENCO | ASS. PRODUÇÃO | PRIMEIRA VEIC. | VALIDADE | DATA EXPIRA | LINK | STATUS | (CLIENTE opcional)
      headerCells = [
        "AP",
        "PRODUTO",
        "TITULO",
        "ASSINATURA CONTRATO ELENCO",
        "ASSINATURA CONTRATO DE PRODUÇÃO",
        "PRIMEIRA VEICULAÇÃO",
        "VALIDADE",
        "DATA QUE EXPIRA",
        "LINK CÓPIA",
        "STATUS",
        "CLIENTE",
      ];
      startIdx = 0; // primeira linha já é dado
    }

    const headerMap: Record<number, string> = {};
    headerCells.forEach((h, idx) => {
      const n = normalizeHeader(h);
      if (n === "ap") headerMap[idx] = "ap";
      else if (n.startsWith("cliente")) headerMap[idx] = "client";
      else if (n.startsWith("produto")) headerMap[idx] = "product";
      else if (n.startsWith("titulo") || n.startsWith("título")) headerMap[idx] = "title";
      else if (n.includes("elenco")) headerMap[idx] = "assinatura_elenco";
      else if (n.includes("producao") || n.includes("produção")) headerMap[idx] = "assinatura_producao";
      else if (n.includes("primeira") || n.includes("veiculacao") || n.includes("veiculação"))
        headerMap[idx] = "primeira_veiculacao";
      else if (n.includes("validade")) headerMap[idx] = "validade";
      else if (n.includes("expira")) headerMap[idx] = "data_expira";
      else if (n.includes("link")) headerMap[idx] = "link_copia";
      else if (n.includes("status")) headerMap[idx] = "status";
      else headerMap[idx] = n;
    });

    const out: ParsedRow[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cells = splitSmart(lines[i], mode);
      if (cells.every((c) => c === "")) continue;

      const row: ParsedRow = {};
      cells.forEach((c, idx) => {
        const key = headerMap[idx];
        if (!key) return;
        (row as any)[key] = c || null;
      });

      if (!row.client && defaultClient.trim()) row.client = defaultClient.trim();
      out.push(row);
    }
    return out;
  }

  // Upsert com fallback (idempotent_key → client,product,title)
  async function upsertWithFallback(batch: RightRow[]) {
    // 1) tenta com idempotent_key
    try {
      const { error } = await supabase
        .from("rights")
        .upsert(batch, { onConflict: "idempotent_key", ignoreDuplicates: false, count: "exact" });
      if (error) throw error;
      return;
    } catch (e: any) {
      const msg = (e?.message || "").toLowerCase();
      const hint = msg.includes("idempotent_key") || msg.includes("column") || msg.includes("does not exist");
      if (!hint) throw e; // outro erro (RLS, etc.)
      // 2) refaz sem a coluna e conflitando pela trinca
      const slim = batch.map(({ idempotent_key, ...rest }) => rest);
      const { error: e2 } = await supabase
        .from("rights")
        .upsert(slim, { onConflict: "client,product,title", ignoreDuplicates: false, count: "exact" });
      if (e2) throw e2;
    }
  }

  async function handlePasteImport() {
    setImporting(true);
    try {
      const parsed = parsePastedTable(pasteText);
      if (!parsed.length) {
        toast({ title: "Nada para importar", variant: "destructive" });
        return;
      }

      const build = (p: ParsedRow): RightRow => {
        const client = (p.client || defaultClient || "").trim() || null;
        const product = (p.product || "").trim() || null;
        const title = (p.title || "").trim() || null;

        const firstAirISO = toISODate(parseBrDate(p.primeira_veiculacao));
        const explicitExpireISO = toISODate(parseBrDate(p.data_expira));
        const expireISO = computeExpireDate(explicitExpireISO, firstAirISO, p.validade || null);
        const status = computeStatus(expireISO, firstAirISO, p.status || null);

        return {
          client,
          product,
          title,
          contract_signed_production: toISODate(parseBrDate(p.assinatura_producao)),
          first_air: firstAirISO,
          expire_date: expireISO,
          link_drive: (p.link_copia || "").trim() || null,
          status_label: status,
          idempotent_key: mkIdemKey(client, product, title, p.ap || null),
        };
      };

      const batch = parsed.map(build).filter((r) => r.client && r.title);
      if (!batch.length) {
        toast({ title: "Linhas sem Cliente/Título.", variant: "destructive" });
        return;
      }

      // Verificar duplicidades antes de inserir
      const uniqueMap = new Map<string, RightRow>();
      let duplicatesCount = 0;
      
      for (const row of batch) {
        const key = mkIdemKey(row.client, row.product, row.title, null);
        if (uniqueMap.has(key)) {
          duplicatesCount++;
        } else {
          uniqueMap.set(key, row);
        }
      }

      const uniqueBatch = Array.from(uniqueMap.values());

      if (duplicatesCount > 0) {
        toast({ 
          title: `${duplicatesCount} duplicata(s) removida(s)`, 
          description: `${uniqueBatch.length} registros únicos serão importados.` 
        });
      }

      // chunk para payload grande
      const chunkSize = 200;
      let total = 0;
      for (let i = 0; i < uniqueBatch.length; i += chunkSize) {
        const chunk = uniqueBatch.slice(i, i + chunkSize);
        await upsertWithFallback(chunk);
        total += chunk.length;
      }

      toast({ title: "Importação concluída", description: `${total} registro(s) processado(s).` });
      setPasteOpen(false);
      setPasteText("");
      await loadRights();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao importar",
        description: e?.message || "Verifique o formato da planilha.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  // ===== Derivados / UI =====
  const clients = useMemo(() => {
    const set = new Set<string>();
    rights.forEach((r) => r.client && set.add(r.client));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rights]);

  const filtered = useMemo(() => {
    let list = rights;
    if (clientFilter) list = list.filter((r) => (r.client || "") === clientFilter);
    if (statusFilter === "ACTIVE") {
      list = list.filter((r) => r.expire_date && new Date(r.expire_date) >= TODAY);
    } else if (statusFilter === "DUE30") {
      list = list.filter((r) => {
        if (!r.expire_date) return false;
        const exp = new Date(r.expire_date);
        const diffDays = Math.floor((exp.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      });
    } else if (statusFilter === "EXPIRED") {
      list = list.filter((r) => r.expire_date && new Date(r.expire_date) < TODAY);
    }
    return list;
  }, [rights, clientFilter, statusFilter]);

  const counts = useMemo(() => {
    const expired = rights.filter((r) => r.status_label?.toUpperCase().includes("VENCIDO")).length;
    const due30 = rights.filter((r) => r.status_label?.toUpperCase().includes("VENCER")).length;
    const inUse = rights.filter((r) => r.status_label?.toUpperCase() === "EM USO").length;
    return { expired, due30, inUse, total: rights.length };
  }, [rights]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="hover:bg-muted">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Gestão de Direitos
              </h1>
              <p className="text-muted-foreground">Controle de direitos de uso e renovações</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Importar colando */}
            <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" variant="default">
                  <ClipboardPaste className="h-4 w-4" />
                  Colar da Planilha
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Importar colando da planilha</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3 md:col-span-1">
                      <Label>Cliente padrão (se não vier na coluna)</Label>
                      <Input
                        placeholder="Ex.: BYD"
                        value={defaultClient}
                        onChange={(e) => setDefaultClient(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Se a planilha tiver coluna <strong>CLIENTE</strong>, ela prevalece.
                      </p>
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <Label>Conteúdo (cole direto do Excel / Google Sheets)</Label>
                      <textarea
                        className="w-full h-56 rounded-md border p-3 text-sm"
                        placeholder={`Aceita com ou sem cabeçalho.\nCabeçalhos suportados:\nAP | PRODUTO | TITULO | ASSINATURA CONTRATO ELENCO | ASSINATURA CONTRATO DE PRODUÇÃO | PRIMEIRA VEICULAÇÃO | VALIDADE | DATA QUE EXPIRA | LINK CÓPIA | STATUS | CLIENTE`}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPasteOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handlePasteImport} disabled={importing} className="gap-2">
                      {importing ? (
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ClipboardPaste className="h-4 w-4" />
                      )}
                      {importing ? "Importando..." : "Importar & Atualizar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Adicionar manual */}
            <AddRightDialog onAdded={loadRights} />

            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>

            {/* Sync Sheets */}
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
                    <p className="text-xs text-muted-foreground mt-1">Cada aba da planilha representa um cliente.</p>
                  </div>
                  <Button onClick={syncFromSheets} disabled={syncing} className="w-full gap-2">
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

            <Button onClick={loadRights} variant="outline" size="icon" title="Recarregar">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Button
              size="sm"
              variant={clientFilter ? "outline" : "default"}
              onClick={() => {
                setClientFilter("");
                navigate("/direitos");
              }}
            >
              Todos
            </Button>
            {clients.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={clientFilter === c ? "default" : "outline"}
                onClick={() => {
                  setClientFilter(c);
                  navigate(`/direitos?client=${encodeURIComponent(c)}`);
                }}
              >
                {c}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              size="sm"
              variant={statusFilter === "ALL" ? "default" : "outline"}
              onClick={() => setStatusFilter("ALL")}
            >
              Todos
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "ACTIVE" ? "default" : "outline"}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Ativos
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "DUE30" ? "default" : "outline"}
              onClick={() => setStatusFilter("DUE30")}
            >
              A vencer (30d)
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "EXPIRED" ? "default" : "outline"}
              onClick={() => setStatusFilter("EXPIRED")}
            >
              Vencidos
            </Button>
          </div>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total de Direitos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{counts.total}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-red-900 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Vencidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900">{counts.expired}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-amber-900 flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                A Vencer (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900">{counts.due30}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Em Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{counts.inUse}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card className="shadow-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Cliente</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Produto</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Título</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Primeira Veic.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Vencimento</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Carregando...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum direito encontrado para o filtro atual.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id || r.idempotent_key} className="hover:bg-muted/50">
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
                                title="Abrir cópia"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {r.first_air ? new Date(r.first_air).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {r.expire_date ? new Date(r.expire_date).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${pill(r.status_label)}`}
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

// ============ Adicionar Direito Manual ============
function AddRightDialog({ onAdded }: { onAdded: () => Promise<void> | void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    client: "",
    product: "",
    title: "",
    contract_signed_production: "",
    first_air: "",
    link_drive: "",
  });

  const save = async () => {
    if (!form.client || !form.product || !form.title) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      const idem = mkIdemKey(form.client, form.product, form.title, null);
      const expireISO = null;
      const status = computeStatus(expireISO, form.first_air || null, null);

      // tenta com idempotent_key; se faltar, usa trinca
      try {
        const { error } = await supabase.from("rights").upsert(
          [
            {
              client: form.client,
              product: form.product,
              title: form.title,
              contract_signed_production: form.contract_signed_production || null,
              first_air: form.first_air || null,
              link_drive: form.link_drive || null,
              expire_date: expireISO,
              status_label: status,
              idempotent_key: idem,
            },
          ],
          { onConflict: "idempotent_key", ignoreDuplicates: false },
        );
        if (error) throw error;
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        if (msg.includes("idempotent_key") || msg.includes("does not exist")) {
          const { error: e2 } = await supabase.from("rights").upsert(
            [
              {
                client: form.client,
                product: form.product,
                title: form.title,
                contract_signed_production: form.contract_signed_production || null,
                first_air: form.first_air || null,
                link_drive: form.link_drive || null,
                expire_date: expireISO,
                status_label: status,
              },
            ],
            { onConflict: "client,product,title", ignoreDuplicates: false },
          );
          if (e2) throw e2;
        } else {
          throw e;
        }
      }

      toast({ title: "Direito salvo!" });
      setOpen(false);
      setForm({ client: "", product: "", title: "", contract_signed_production: "", first_air: "", link_drive: "" });
      await onAdded();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Label>Cliente *</Label>
            <Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Produto *</Label>
            <Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Título do Filme *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Data de Assinatura (Produção)</Label>
            <Input
              type="date"
              value={form.contract_signed_production}
              onChange={(e) => setForm({ ...form, contract_signed_production: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Primeira Veiculação</Label>
            <Input
              type="date"
              value={form.first_air}
              onChange={(e) => setForm({ ...form, first_air: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Link do Drive (opcional)</Label>
            <Input
              value={form.link_drive}
              onChange={(e) => setForm({ ...form, link_drive: e.target.value })}
              placeholder="https://drive.google.com/..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
