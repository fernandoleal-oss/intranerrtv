// src/pages/Direitos.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  RefreshCcw,
  Download,
  Settings,
  ArrowLeft,
  Plus,
  ExternalLink,
  ClipboardPaste,
  Filter,
  Eye,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ===== Types =====
interface RightRow {
  id?: string;
  client: string | null;
  product: string | null;
  title: string | null;
  contract_signed_production: string | null;
  first_air: string | null;
  expire_date: string | null;
  link_drive: string | null;
  status_label: string | null;
  idempotent_key?: string;
}

interface ParsedRow {
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
}

type StatusFilter = "ALL" | "ACTIVE" | "DUE30" | "EXPIRED";

const TODAY = new Date();

// ===== Utils =====
function toISODate(date: Date | null): string | null {
  if (!date || isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date.getTime());
  const day = newDate.getDate();

  newDate.setMonth(newDate.getMonth() + months);

  // Ajuste para fim de mês
  if (newDate.getDate() < day) {
    newDate.setDate(0);
  }

  return newDate;
}

function parseBrDate(dateString?: string | null): Date | null {
  if (!dateString) return null;

  const cleaned = dateString
    .toString()
    .trim()
    .replace(/[1-9]h/gi, "") // Remove horários como "11h", "9h", etc.
    .replace(/[^\d\/\-]/g, "");

  if (!cleaned) return null;

  // Formato ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const date = new Date(cleaned + "T00:00:00");
    return isNaN(date.getTime()) ? null : date;
  }

  // Formato dd/mm/yyyy
  const match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  let year = parseInt(match[3], 10);

  if (year < 100) year += 2000;

  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
}

function monthsFromLabel(validade: string | null | undefined): number | null {
  if (!validade) return null;

  const match = validade.toLowerCase().match(/(\d+)\s*mes/);
  return match ? parseInt(match[1], 10) : null;
}

function computeExpireDate(
  explicitExpireISO: string | null,
  firstAirISO: string | null,
  validadeLabel: string | null,
): string | null {
  if (explicitExpireISO) return explicitExpireISO;

  const baseDate = firstAirISO ? new Date(firstAirISO) : null;
  const months = monthsFromLabel(validadeLabel);

  if (baseDate && months) {
    return toISODate(addMonths(baseDate, months));
  }

  return null;
}

function computeStatus(
  expireISO: string | null,
  firstAirISO: string | null,
  providedStatus?: string | null,
): string | null {
  if (providedStatus?.trim()) {
    return providedStatus.trim().toUpperCase();
  }

  if (!expireISO) return null;

  const expireDate = new Date(expireISO);
  const diffDays = Math.floor((expireDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "VENCIDO";
  if (diffDays <= 30) return "A VENCER (30d)";
  if (expireDate >= TODAY) return "EM USO";

  return "DENTRO DO PRAZO";
}

function createIdempotentKey(
  client: string | null,
  product: string | null,
  title: string | null,
  ap?: string | null,
): string {
  const normalize = (value?: string | null) => (value || "").trim().toLowerCase().replace(/\s+/g, " ");

  return [normalize(client), normalize(product), normalize(title), normalize(ap)].filter(Boolean).join("::");
}

function getStatusPillClass(status: string | null): string {
  if (!status) return "bg-gray-100 text-gray-700";

  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("vencido")) return "bg-red-100 text-red-700";
  if (normalizedStatus.includes("vencer")) return "bg-amber-100 text-amber-700";
  if (normalizedStatus.includes("renovado")) return "bg-blue-100 text-blue-700";
  if (normalizedStatus.includes("em uso")) return "bg-green-100 text-green-700";

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
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [defaultClient, setDefaultClient] = useState("");
  const [importing, setImporting] = useState(false);

  // Filtros
  const params = new URLSearchParams(location.search);
  const initialClient = params.get("client") || "";
  const [clientFilter, setClientFilter] = useState(initialClient);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  useEffect(() => {
    loadRights();
  }, []);

  useEffect(() => {
    if (initialClient) {
      setClientFilter(initialClient);
    }
  }, [initialClient]);

  async function loadRights() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("rights").select("*").order("expire_date", { ascending: true });

      if (error) throw error;

      setRights((data as RightRow[]) || []);
    } catch (error) {
      console.error("Erro ao carregar direitos:", error);
      toast({
        title: "Erro ao carregar direitos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function syncFromSheets() {
    if (!sheetId.trim()) {
      toast({
        title: "Sheet ID obrigatório",
        variant: "destructive",
      });
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
    } catch (error: any) {
      console.error("Erro na sincronização:", error);
      toast({
        title: "Erro ao sincronizar",
        description: error?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  function exportToCSV() {
    const headers = ["Cliente", "Produto", "Título", "Status", "Vencimento", "Primeira Veiculação", "Link"];
    const rows = rights.map((right) => [
      right.client || "",
      right.product || "",
      right.title || "",
      right.status_label || "—",
      right.expire_date || "—",
      right.first_air || "—",
      right.link_drive || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `direitos_${TODAY.toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ===== Parse da planilha colada =====
  function normalizeHeader(header: string): string {
    return header
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
    return "spaces";
  }

  function splitLine(line: string, delimiter: ReturnType<typeof guessDelimiter>): string[] {
    switch (delimiter) {
      case "tab":
        return line.split("\t").map((cell) => cell.trim());
      case "semicolon":
        return line.split(";").map((cell) => cell.trim());
      case "comma":
        return line.split(",").map((cell) => cell.trim());
      case "spaces":
        return line.split(/\s{2,}/).map((cell) => cell.trim());
      default:
        return [line.trim()];
    }
  }

  function isHeaderLine(cells: string[]): boolean {
    const joined = cells.join(" ").toLowerCase();
    const keywords = [
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
    ];

    return keywords.some((keyword) => joined.includes(keyword));
  }

  function parsePastedTable(rawText: string): ParsedRow[] {
    const lines = rawText
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return [];

    const delimiter = guessDelimiter(lines[0]);
    let startIndex = 1;
    let headerCells = splitLine(lines[0], delimiter);
    let hasHeader = isHeaderLine(headerCells);

    if (!hasHeader) {
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
      startIndex = 0;
    }

    const headerMap: Record<number, string> = {};
    headerCells.forEach((header, index) => {
      const normalizedHeader = normalizeHeader(header);

      if (normalizedHeader === "ap") headerMap[index] = "ap";
      else if (normalizedHeader.startsWith("cliente")) headerMap[index] = "client";
      else if (normalizedHeader.startsWith("produto")) headerMap[index] = "product";
      else if (normalizedHeader.startsWith("titulo")) headerMap[index] = "title";
      else if (normalizedHeader.includes("elenco")) headerMap[index] = "assinatura_elenco";
      else if (normalizedHeader.includes("producao")) headerMap[index] = "assinatura_producao";
      else if (normalizedHeader.includes("primeira") || normalizedHeader.includes("veiculacao"))
        headerMap[index] = "primeira_veiculacao";
      else if (normalizedHeader.includes("validade")) headerMap[index] = "validade";
      else if (normalizedHeader.includes("expira")) headerMap[index] = "data_expira";
      else if (normalizedHeader.includes("link")) headerMap[index] = "link_copia";
      else if (normalizedHeader.includes("status")) headerMap[index] = "status";
      else headerMap[index] = normalizedHeader;
    });

    const result: ParsedRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const cells = splitLine(lines[i], delimiter);
      if (cells.every((cell) => cell === "")) continue;

      const row: ParsedRow = {};
      cells.forEach((cell, index) => {
        const key = headerMap[index];
        if (key) {
          (row as any)[key] = cell || null;
        }
      });

      if (!row.client && defaultClient.trim()) {
        row.client = defaultClient.trim();
      }

      result.push(row);
    }

    return result;
  }

  async function upsertRightsBatch(batch: RightRow[]) {
    try {
      const { error } = await supabase.from("rights").upsert(batch, {
        onConflict: "idempotent_key",
        ignoreDuplicates: false,
      });

      if (error) throw error;
      return;
    } catch (error: any) {
      const errorMessage = (error?.message || "").toLowerCase();
      const isIdempotentKeyError =
        errorMessage.includes("idempotent_key") ||
        errorMessage.includes("column") ||
        errorMessage.includes("does not exist");

      if (!isIdempotentKeyError) throw error;

      const slimBatch = batch.map(({ idempotent_key, ...rest }) => rest);
      const { error: upsertError } = await supabase.from("rights").upsert(slimBatch, {
        onConflict: "client,product,title",
        ignoreDuplicates: false,
      });

      if (upsertError) throw upsertError;
    }
  }

  async function handlePasteImport() {
    setImporting(true);

    try {
      const parsed = parsePastedTable(pasteText);
      if (parsed.length === 0) {
        toast({
          title: "Nada para importar",
          variant: "destructive",
        });
        return;
      }

      const buildRightRow = (parsedRow: ParsedRow): RightRow => {
        const client = (parsedRow.client || defaultClient || "").trim() || null;
        const product = (parsedRow.product || "").trim() || null;
        const title = (parsedRow.title || "").trim() || null;

        const firstAirISO = toISODate(parseBrDate(parsedRow.primeira_veiculacao));
        const explicitExpireISO = toISODate(parseBrDate(parsedRow.data_expira));
        const expireISO = computeExpireDate(explicitExpireISO, firstAirISO, parsedRow.validade || null);
        const status = computeStatus(expireISO, firstAirISO, parsedRow.status || null);

        return {
          client,
          product,
          title,
          contract_signed_production: toISODate(parseBrDate(parsedRow.assinatura_producao)),
          first_air: firstAirISO,
          expire_date: expireISO,
          link_drive: (parsedRow.link_copia || "").trim() || null,
          status_label: status,
          idempotent_key: createIdempotentKey(client, product, title, parsedRow.ap || null),
        };
      };

      const batch = parsed.map(buildRightRow).filter((row) => row.client && row.title);

      if (batch.length === 0) {
        toast({
          title: "Linhas sem Cliente/Título",
          variant: "destructive",
        });
        return;
      }

      // Remover duplicatas
      const uniqueMap = new Map<string, RightRow>();
      let duplicatesCount = 0;

      for (const row of batch) {
        const key = createIdempotentKey(row.client, row.product, row.title, null);
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
          description: `${uniqueBatch.length} registros únicos serão importados.`,
        });
      }

      // Processar em chunks
      const CHUNK_SIZE = 200;
      let totalProcessed = 0;

      for (let i = 0; i < uniqueBatch.length; i += CHUNK_SIZE) {
        const chunk = uniqueBatch.slice(i, i + CHUNK_SIZE);
        await upsertRightsBatch(chunk);
        totalProcessed += chunk.length;
      }

      toast({
        title: "Importação concluída",
        description: `${totalProcessed} registro(s) processado(s).`,
      });

      setPasteOpen(false);
      setPasteText("");
      await loadRights();
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro ao importar",
        description: error?.message || "Verifique o formato da planilha.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  // ===== Derivados / UI =====
  const clients = useMemo(() => {
    const clientSet = new Set<string>();
    rights.forEach((right) => {
      if (right.client) clientSet.add(right.client);
    });
    return Array.from(clientSet).sort((a, b) => a.localeCompare(b));
  }, [rights]);

  const filteredRights = useMemo(() => {
    let filtered = rights;

    if (clientFilter) {
      filtered = filtered.filter((right) => right.client === clientFilter);
    }

    switch (statusFilter) {
      case "ACTIVE":
        filtered = filtered.filter((right) => right.expire_date && new Date(right.expire_date) >= TODAY);
        break;
      case "DUE30":
        filtered = filtered.filter((right) => {
          if (!right.expire_date) return false;
          const expireDate = new Date(right.expire_date);
          const diffDays = Math.floor((expireDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 30;
        });
        break;
      case "EXPIRED":
        filtered = filtered.filter((right) => right.expire_date && new Date(right.expire_date) < TODAY);
        break;
      default:
        break;
    }

    return filtered;
  }, [rights, clientFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    const expired = rights.filter((right) => right.status_label?.toUpperCase().includes("VENCIDO")).length;

    const due30 = rights.filter((right) => right.status_label?.toUpperCase().includes("VENCER")).length;

    const inUse = rights.filter((right) => right.status_label?.toUpperCase() === "EM USO").length;

    return {
      expired,
      due30,
      inUse,
      total: rights.length,
    };
  }, [rights]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
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

          <div className="flex flex-wrap gap-2 justify-end">
            {/* Importar colando */}
            <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <ClipboardPaste className="h-4 w-4" />
                  Colar da Planilha
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importar colando da planilha</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <Label htmlFor="default-client">Cliente padrão (se não vier na coluna)</Label>
                      <Input
                        id="default-client"
                        placeholder="Ex.: BYD"
                        value={defaultClient}
                        onChange={(e) => setDefaultClient(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Se a planilha tiver coluna <strong>CLIENTE</strong>, ela prevalece.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="paste-content">Conteúdo (cole direto do Excel / Google Sheets)</Label>
                      <textarea
                        id="paste-content"
                        className="w-full h-48 rounded-md border p-3 text-sm resize-vertical"
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
                    <Button onClick={handlePasteImport} disabled={importing || !pasteText.trim()} className="gap-2">
                      {importing ? (
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ClipboardPaste className="h-4 w-4" />
                      )}
                      {importing ? "Importando..." : "Importar"}
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
                  Sincronizar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sincronizar com Google Sheets</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sheet-id">Sheet ID</Label>
                    <Input
                      id="sheet-id"
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
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Button
              size="sm"
              variant={!clientFilter ? "default" : "outline"}
              onClick={() => {
                setClientFilter("");
                navigate("/direitos");
              }}
            >
              Todos os Clientes
            </Button>
            {clients.map((client) => (
              <Button
                key={client}
                size="sm"
                variant={clientFilter === client ? "default" : "outline"}
                onClick={() => {
                  setClientFilter(client);
                  navigate(`/direitos?client=${encodeURIComponent(client)}`);
                }}
              >
                {client}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total de Direitos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{statusCounts.total}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-900 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Vencidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900">{statusCounts.expired}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-900 flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />A Vencer (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900">{statusCounts.due30}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Em Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{statusCounts.inUse}</div>
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
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                          Carregando...
                        </div>
                      </td>
                    </tr>
                  ) : filteredRights.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum direito encontrado para o filtro atual.
                      </td>
                    </tr>
                  ) : (
                    filteredRights.map((right) => (
                      <tr key={right.id || right.idempotent_key} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-sm">{right.client || "—"}</td>
                        <td className="px-4 py-3 text-sm">{right.product || "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{right.title || "—"}</span>
                            {right.link_drive && (
                              <a
                                href={right.link_drive}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 transition-colors"
                                title="Abrir cópia no Drive"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {right.first_air ? new Date(right.first_air).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {right.expire_date ? new Date(right.expire_date).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusPillClass(right.status_label)}`}
                          >
                            {right.status_label || "—"}
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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client: "",
    product: "",
    title: "",
    contract_signed_production: "",
    first_air: "",
    link_drive: "",
  });

  const handleSave = async () => {
    if (!form.client.trim() || !form.product.trim() || !form.title.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha Cliente, Produto e Título",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const idempotentKey = createIdempotentKey(form.client, form.product, form.title, null);
      const expireISO = null;
      const status = computeStatus(expireISO, form.first_air || null, null);

      const rightData = {
        client: form.client.trim(),
        product: form.product.trim(),
        title: form.title.trim(),
        contract_signed_production: form.contract_signed_production || null,
        first_air: form.first_air || null,
        link_drive: form.link_drive.trim() || null,
        expire_date: expireISO,
        status_label: status,
        idempotent_key: idempotentKey,
      };

      try {
        const { error } = await supabase.from("rights").upsert([rightData], {
          onConflict: "idempotent_key",
          ignoreDuplicates: false,
        });

        if (error) throw error;
      } catch (error: any) {
        const errorMessage = (error?.message || "").toLowerCase();
        if (errorMessage.includes("idempotent_key") || errorMessage.includes("does not exist")) {
          const { idempotent_key, ...slimData } = rightData;
          const { error: upsertError } = await supabase.from("rights").upsert([slimData], {
            onConflict: "client,product,title",
            ignoreDuplicates: false,
          });

          if (upsertError) throw upsertError;
        } else {
          throw error;
        }
      }

      toast({ title: "Direito salvo com sucesso!" });
      setOpen(false);
      setForm({
        client: "",
        product: "",
        title: "",
        contract_signed_production: "",
        first_air: "",
        link_drive: "",
      });

      await onAdded();
    } catch (error: any) {
      console.error("Erro ao salvar direito:", error);
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setForm({
        client: "",
        product: "",
        title: "",
        contract_signed_production: "",
        first_air: "",
        link_drive: "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Input
              id="client"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product">Produto *</Label>
            <Input
              id="product"
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
              placeholder="Nome do produto"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="title">Título do Filme *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título do conteúdo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract-date">Data de Assinatura (Produção)</Label>
            <Input
              id="contract-date"
              type="date"
              value={form.contract_signed_production}
              onChange={(e) => setForm({ ...form, contract_signed_production: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="first-air">Primeira Veiculação</Label>
            <Input
              id="first-air"
              type="date"
              value={form.first_air}
              onChange={(e) => setForm({ ...form, first_air: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="drive-link">Link do Drive (opcional)</Label>
            <Input
              id="drive-link"
              value={form.link_drive}
              onChange={(e) => setForm({ ...form, link_drive: e.target.value })}
              placeholder="https://drive.google.com/..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
