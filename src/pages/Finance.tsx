// src/pages/Finance.tsx
import { useEffect, useMemo, useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Download,
  FileSpreadsheet,
  ArrowLeftRight,
  XCircle,
  CalendarSearch,
  ClipboardPaste,
  Trash2,
} from "lucide-react";
import { ExcelImportDialog } from "@/components/finance/ExcelImportDialog";
import { GoogleSheetsSync } from "@/components/finance/GoogleSheetsSync";
import { TopClientsCard } from "@/components/finance/TopClientsCard";
import { TopSuppliersCard } from "@/components/finance/TopSuppliersCard";
import { FinancialReport } from "@/components/finance/FinancialReport";
import { AnnualTotalsDialog } from "@/components/finance/AnnualTotalsDialog";
import { ImportSpreadsheetModal } from "@/components/finance/ImportSpreadsheetModal";
import { useAuth } from "@/components/AuthProvider";
import { canEditFinance } from "@/utils/permissions";
import { supabase } from "@/integrations/supabase/client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type ClientSummary = { client: string; total: number; count: number };
type SupplierSummary = { supplier: string; total: number; count: number };

type Event = {
  id?: string;
  cliente: string | null;
  fornecedor: string | null;
  ref_month: string; // "YYYY-MM" ou "YYYY-MM-DD"
  total_cents: number | null;
  valor_fornecedor_cents: number | null;
};

const MIN_YM = "2025-08";

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(v);
}

function ym(ref: string | null | undefined) {
  if (!ref) return "";
  return ref.slice(0, 7);
}

function toPTMonthLabel(ymStr: string) {
  const [y, m] = ymStr.split("-").map(Number);
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${months[(m ?? 1) - 1]}/${y}`;
}

function addMonths(ymStr: string, delta: number) {
  const [y, m] = ymStr.split("-").map(Number);
  const base = new Date(y, (m ?? 1) - 1, 1);
  base.setMonth(base.getMonth() + delta);
  const yy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function nowYM() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function betweenInclusive(ymStr: string, min: string, max: string) {
  return ymStr >= min && ymStr <= max;
}

function generateAllowedMonths(minYM: string, maxYM: string) {
  const list: string[] = [];
  let cur = minYM;
  while (cur <= maxYM) {
    list.push(cur);
    cur = addMonths(cur, 1);
  }
  return list.reverse();
}

function summarizeClients(rows: Event[]): ClientSummary[] {
  const map: Record<string, ClientSummary> = {};
  for (const row of rows) {
    const client = row.cliente || "Sem cliente";
    if (!map[client]) map[client] = { client, total: 0, count: 0 };
    map[client].total += (row.total_cents ?? 0) / 100;
    map[client].count += 1;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function summarizeSuppliers(rows: Event[]): SupplierSummary[] {
  const map: Record<string, SupplierSummary> = {};
  for (const row of rows) {
    const supplier = row.fornecedor || "Sem fornecedor";
    if (supplier === "Sem fornecedor") continue;
    if (!map[supplier]) map[supplier] = { supplier, total: 0, count: 0 };
    map[supplier].total += (row.valor_fornecedor_cents ?? 0) / 100;
    map[supplier].count += 1;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

type KPIs = {
  receita: number;
  despesa: number;
  resultado: number;
  margem: number;
  varReceitaPct: number;
  varDespesaPct: number;
};

function computeKPIs(curRows: Event[], prevRows: Event[]): KPIs {
  const sum = (xs: Event[], sel: (e: Event) => number) => xs.reduce((acc, e) => acc + sel(e), 0);

  const receita = sum(curRows, (e) => (e.total_cents ?? 0) / 100);
  const despesa = sum(curRows, (e) => (e.valor_fornecedor_cents ?? 0) / 100);
  const receitaPrev = sum(prevRows, (e) => (e.total_cents ?? 0) / 100);
  const despesaPrev = sum(prevRows, (e) => (e.valor_fornecedor_cents ?? 0) / 100);

  const resultado = receita - despesa;
  const margem = receita > 0 ? (resultado / receita) * 100 : 0;

  const varReceitaPct = receitaPrev > 0 ? ((receita - receitaPrev) / receitaPrev) * 100 : 0;
  const varDespesaPct = despesaPrev > 0 ? ((despesa - despesaPrev) / despesaPrev) * 100 : 0;

  return { receita, despesa, resultado, margem, varReceitaPct, varDespesaPct };
}

/* ============================= */
/* ======= PASTE PARSER =========*/
/* ============================= */

type DetectedMapping = {
  idxCliente?: number;
  idxFornecedor?: number;
  idxTotal?: number;
  idxValorFornecedor?: number;
  idxRef?: number;
  idxMes?: number;
  idxAno?: number;
  // possíveis colunas auxiliares:
  idxHonorario?: number;
  idxHonorarioAgencia?: number;
};

const PT_MONTHS: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  março: 3,
  marco: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function guessDelimiter(lines: string[]) {
  const cands = ["\t", ";", ",", "|"];
  let best = "\t";
  let bestScore = 0;
  for (const d of cands) {
    const counts = lines.slice(0, 5).map((l) => (l ? l.split(d).length : 0));
    const score = counts.reduce((a, b) => a + b, 0);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

function parseCurrencyBrOrEn(v: string | undefined): number {
  if (!v) return 0;
  const raw = v
    .replace(/\s/g, "")
    .replace(/[R$\u00A0]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function asYMFromText(text: string): string | null {
  const t = normalize(text);
  // padrões: YYYY-MM, YYYY/MM, MM/YYYY, DD/MM/YYYY, ago/2025, agosto 2025, 2025-08-01
  const m1 = t.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b/); // YYYY-MM or YYYY/MM
  if (m1) return `${m1[1]}-${String(Number(m1[2])).padStart(2, "0")}`;

  const m2 = t.match(/\b(0?[1-9]|1[0-2])[-/](20\d{2})\b/); // MM/YYYY
  if (m2) return `${m2[2]}-${String(Number(m2[1])).padStart(2, "0")}`;

  const m3 = t.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2})\b/); // DD/MM/YYYY
  if (m3) return `${m3[3]}-${String(Number(m3[2])).padStart(2, "0")}`;

  // nomes PT
  for (const k of Object.keys(PT_MONTHS)) {
    const re = new RegExp(`\\b${k}\\b[^\\d]*\\b(20\\d{2})\\b`, "i");
    const m = t.match(re);
    if (m) {
      const mm = String(PT_MONTHS[k]).padStart(2, "0");
      return `${m[1]}-${mm}`;
    }
  }
  return null;
}

function detectMapping(headers: string[]): DetectedMapping {
  const map: DetectedMapping = {};
  const cols = headers.map((h) => normalize(h));

  const find = (alts: string[]) => {
    const idx = cols.findIndex((c) => alts.some((a) => c === a || c.includes(a)));
    return idx >= 0 ? idx : undefined;
  };

  map.idxCliente = find(["cliente", "client", "conta", "brand", "marca"]);
  map.idxFornecedor = find(["fornecedor", "supplier", "vendor"]);
  map.idxTotal = find(["total", "valor total", "total geral"]);
  map.idxValorFornecedor = find([
    "valor do fornecedor",
    "valor fornecedor",
    "custo fornecedor",
    "fornecedor valor",
    "custo",
  ]);
  map.idxHonorario = find(["honorario", "honorário"]);
  map.idxHonorarioAgencia = find(["honorario agencia", "honorário agencia", "honorario da agencia"]);

  // referência temporal
  map.idxRef = find(["ref_month", "ref", "competencia", "competência", "periodo", "período", "mes/ano", "mes-ano"]);
  map.idxMes = find(["mes", "mês", "month"]);
  map.idxAno = find(["ano", "year"]);

  return map;
}

function assembleYM(row: string[], map: DetectedMapping): string | null {
  if (map.idxRef !== undefined) {
    const ymText = row[map.idxRef] ?? "";
    const ymd = asYMFromText(ymText);
    if (ymd) return ymd;
  }
  if (map.idxMes !== undefined && map.idxAno !== undefined) {
    const mesRaw = normalize(row[map.idxMes] ?? "");
    const anoRaw = row[map.idxAno] ?? "";
    let m = Number(mesRaw);
    if (!m || m < 1 || m > 12) {
      // tentar por nome
      m = PT_MONTHS[mesRaw] || 0;
    }
    const y = Number(anoRaw);
    if (m >= 1 && m <= 12 && y >= 2000) {
      return `${y}-${String(m).padStart(2, "0")}`;
    }
  }
  // checar se tem alguma célula com data
  for (const cell of row) {
    const ymd = asYMFromText(cell ?? "");
    if (ymd) return ymd;
  }
  return null;
}

function rowsToEvents(rows: string[][], map: DetectedMapping, fallbackYM: string | null) {
  const events: Event[] = [];
  let ymDetected: string | null = null;
  for (const row of rows) {
    if (row.every((c) => !c || !String(c).trim())) continue;

    const cliente = (map.idxCliente !== undefined ? row[map.idxCliente] : "") || null;
    const fornecedor = (map.idxFornecedor !== undefined ? row[map.idxFornecedor] : "") || null;

    const vFornecedor = parseCurrencyBrOrEn(
      map.idxValorFornecedor !== undefined ? row[map.idxValorFornecedor] : undefined,
    );

    let total = parseCurrencyBrOrEn(map.idxTotal !== undefined ? row[map.idxTotal] : undefined);

    if (!total) {
      const hon = parseCurrencyBrOrEn(map.idxHonorario !== undefined ? row[map.idxHonorario] : undefined);
      const honAg = parseCurrencyBrOrEn(
        map.idxHonorarioAgencia !== undefined ? row[map.idxHonorarioAgencia] : undefined,
      );
      total = vFornecedor + hon + honAg;
    }

    let thisYM = assembleYM(row, map) || fallbackYM;
    if (!ymDetected && thisYM) ymDetected = thisYM;

    if (!thisYM) {
      // sem mês válido, descarta linha
      continue;
    }

    events.push({
      cliente,
      fornecedor,
      ref_month: `${thisYM}-01`,
      total_cents: Math.round((total || 0) * 100),
      valor_fornecedor_cents: Math.round((vFornecedor || 0) * 100),
    });
  }
  return { events, ymDetected };
}

/* ============================= */
/* ========== PAGE ============= */
/* ============================= */

export default function Finance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = canEditFinance(user?.email);

  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // seleção e comparação
  const [selectDialogOpen, setSelectDialogOpen] = useState<boolean>(false);
  const [selectedYM, setSelectedYM] = useState<string | null>(null);
  const [compareYM, setCompareYM] = useState<string | null>(null);

  // paste dialog
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState<{
    mapping: DetectedMapping | null;
    ym: string | null;
    rowsCount: number;
    totalSum: number;
    fornecedorSum: number;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const maxYM = nowYM();
  const allowedMonths = generateAllowedMonths(MIN_YM, maxYM);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedYM) {
      setSelectDialogOpen(true);
    }
  }, [selectedYM]);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_events")
        .select("cliente, fornecedor, ref_month, total_cents, valor_fornecedor_cents")
        .order("ref_month", { ascending: false });

      if (error) throw error;
      setAllEvents((data || []) as Event[]);
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  }

  // filtragem por mês
  const curRows = useMemo(
    () => (selectedYM ? allEvents.filter((r) => ym(r.ref_month) === selectedYM) : []),
    [allEvents, selectedYM],
  );

  const prevForSelectedRows = useMemo(() => {
    if (!selectedYM) return [];
    const prevYM = addMonths(selectedYM, -1);
    return allEvents.filter((r) => ym(r.ref_month) === prevYM);
  }, [allEvents, selectedYM]);

  const compareRows = useMemo(
    () => (compareYM ? allEvents.filter((r) => ym(r.ref_month) === compareYM) : []),
    [allEvents, compareYM],
  );

  const prevForCompareRows = useMemo(() => {
    if (!compareYM) return [];
    const prevYM = addMonths(compareYM, -1);
    return allEvents.filter((r) => ym(r.ref_month) === prevYM);
  }, [allEvents, compareYM]);

  const kpisSelected = useMemo<KPIs>(() => computeKPIs(curRows, prevForSelectedRows), [curRows, prevForSelectedRows]);
  const kpisCompare = useMemo<KPIs>(
    () => computeKPIs(compareRows, prevForCompareRows),
    [compareRows, prevForCompareRows],
  );

  const topClientsSelected = useMemo(() => summarizeClients(curRows), [curRows]);
  const topSuppliersSelected = useMemo(() => summarizeSuppliers(curRows), [curRows]);
  const topClientsCompare = useMemo(() => summarizeClients(compareRows), [compareRows]);
  const topSuppliersCompare = useMemo(() => summarizeSuppliers(compareRows), [compareRows]);

  function handleExportCSV() {
    if (!selectedYM) return;
    const header = ["ref_month", "cliente", "fornecedor", "total", "valor_fornecedor"].join(",");
    const lines = curRows.map((e) =>
      [
        ym(e.ref_month),
        `"${(e.cliente ?? "").replace(/"/g, '""')}"`,
        `"${(e.fornecedor ?? "").replace(/"/g, '""')}"`,
        (e.total_cents ?? 0) / 100,
        (e.valor_fornecedor_cents ?? 0) / 100,
      ].join(","),
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_events_${selectedYM}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const comparisonActive = !!compareYM;

  /* ===== Paste handling ===== */
  function handlePasteAnalyze() {
    const text = pasteText.trim();
    if (!text) {
      setPastePreview(null);
      return;
    }
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setPastePreview(null);
      return;
    }
    const delim = guessDelimiter(lines);
    const headerCells = lines[0].split(delim).map((c) => c.trim());
    const mapping = detectMapping(headerCells);

    const body = lines.slice(1).map((l) => l.split(delim));
    // tentar detectar YM por linha; se vários, pegar o mais frequente
    const ymCount: Record<string, number> = {};
    for (const row of body) {
      const ymMaybe = assembleYM(row, mapping);
      if (ymMaybe) ymCount[ymMaybe] = (ymCount[ymMaybe] ?? 0) + 1;
    }
    let detectedYM: string | null = null;
    let maxC = 0;
    for (const k of Object.keys(ymCount)) {
      if (ymCount[k] > maxC) {
        maxC = ymCount[k];
        detectedYM = k;
      }
    }

    const { events } = rowsToEvents(body, mapping, detectedYM);

    // agregados
    const rowsCount = events.length;
    const totalSum = events.reduce((a, e) => a + (e.total_cents ?? 0), 0) / 100;
    const fornecedorSum = events.reduce((a, e) => a + (e.valor_fornecedor_cents ?? 0), 0) / 100;

    const ymFinal = detectedYM;
    setPastePreview({
      mapping,
      ym: ymFinal,
      rowsCount,
      totalSum,
      fornecedorSum,
    });
  }

  async function handlePasteConfirm() {
    if (!pastePreview || !pastePreview.mapping) return;

    let ymImport = pastePreview.ym;
    if (!ymImport) {
      toast({
        title: "Mês/ano não detectado",
        description:
          "Não consegui identificar o mês/ano da tabela. Escolha o mês na barra superior e tente novamente, ou inclua uma coluna de competência.",
        variant: "destructive",
      });
      return;
    }

    if (!betweenInclusive(ymImport, MIN_YM, nowYM())) {
      toast({
        title: "Período bloqueado",
        description: `Somente meses a partir de ${toPTMonthLabel(MIN_YM)} são aceitos.`,
        variant: "destructive",
      });
      return;
    }

    // Reparse completo para garantir consistência
    const lines = pasteText
      .trim()
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    const delim = guessDelimiter(lines);
    const headerCells = lines[0].split(delim).map((c) => c.trim());
    const mapping = detectMapping(headerCells);
    const body = lines.slice(1).map((l) => l.split(delim));
    const { events } = rowsToEvents(body, mapping, ymImport);

    if (events.length === 0) {
      toast({
        title: "Nada para importar",
        description: "Não identifiquei linhas válidas após a análise.",
        variant: "destructive",
      });
      return;
    }

    // Confirmação destrutiva: sobrescrever mês
    const ok = window.confirm(
      `Isso vai apagar ${toPTMonthLabel(ymImport)} e inserir ${events.length} itens.\n` +
        `Receita total: ${formatBRL(events.reduce((a, e) => a + (e.total_cents ?? 0), 0) / 100)}\n` +
        `Fornecedor: ${formatBRL(events.reduce((a, e) => a + (e.valor_fornecedor_cents ?? 0), 0) / 100)}\n\n` +
        `Deseja continuar?`,
    );
    if (!ok) return;

    try {
      // Apagar mês
      const del = await supabase.from("finance_events").delete().like("ref_month", `${ymImport}%`);
      if (del.error) throw del.error;

      // Inserir
      const ins = await supabase.from("finance_events").insert(events);
      if (ins.error) throw ins.error;

      toast({
        title: "Importação concluída",
        description: `Substituí ${toPTMonthLabel(ymImport)} com ${events.length} itens.`,
      });

      setPasteOpen(false);
      setPasteText("");
      setPastePreview(null);
      setSelectedYM(ymImport);
      await loadData();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao importar",
        description: e?.message ?? "Falha desconhecida ao gravar no banco.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <HeaderBar
        title="Financeiro"
        subtitle={
          selectedYM
            ? comparisonActive
              ? `Comparação ativa: ${toPTMonthLabel(selectedYM)} × ${toPTMonthLabel(compareYM!)}`
              : `Mês selecionado: ${toPTMonthLabel(selectedYM)}`
            : "Selecione o mês de referência"
        }
        backTo="/"
        actions={
          <div className="flex gap-2 flex-wrap">
            <FinancialReport />
            <AnnualTotalsDialog />

            <Button variant="outline" className="gap-2" onClick={() => setSelectDialogOpen(true)}>
              <CalendarSearch className="h-4 w-4" />
              {selectedYM ? "Trocar mês" : "Escolher mês"}
            </Button>

            {!comparisonActive ? (
              <Button
                variant="outline"
                className="gap-2"
                disabled={!selectedYM}
                onClick={() => {
                  setCompareYM(null);
                  setSelectDialogOpen(true);
                }}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Comparar com outro mês
              </Button>
            ) : (
              <Button variant="destructive" className="gap-2" onClick={() => setCompareYM(null)}>
                <XCircle className="h-4 w-4" />
                Remover comparação
              </Button>
            )}

            <Button variant="outline" className="gap-2" onClick={handleExportCSV} disabled={!selectedYM}>
              <Download className="h-4 w-4" />
              Exportar CSV (mês atual)
            </Button>

            {canEdit && (
              <>
                <Button variant="default" className="gap-2" onClick={() => setPasteOpen(true)}>
                  <ClipboardPaste className="h-4 w-4" />
                  Zerar e colar do Excel
                </Button>
                <FinancialEditActions
                  canEdit={canEdit}
                  onImportOpen={() => setShowImportModal(true)}
                  onSync={loadData}
                />
              </>
            )}
          </div>
        }
      />

      <div className="container-page py-6">
        {!selectedYM && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-800">
                Selecione o mês de referência para visualizar o financeiro.
                <br />
                Por política de dados, meses anteriores a <strong>ago/2025</strong> ficam indisponíveis.
              </p>
            </CardContent>
          </Card>
        )}

        {selectedYM && !comparisonActive && (
          <>
            <KPICards
              receita={kpisSelected.receita}
              despesa={kpisSelected.despesa}
              resultado={kpisSelected.resultado}
              margem={kpisSelected.margem}
              varReceitaPct={kpisSelected.varReceitaPct}
              varDespesaPct={kpisSelected.varDespesaPct}
            />

            {!canEdit && (
              <Card className="mb-6 border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-amber-800">
                    Visualização apenas. Apenas fernando.leal@we.com.br pode editar dados financeiros.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopClientsCard clients={topClientsSelected} loading={loading} />
              <TopSuppliersCard suppliers={topSuppliersSelected} loading={loading} />
            </div>
          </>
        )}

        {selectedYM && comparisonActive && (
          <>
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 mb-6">
              <div>
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">{toPTMonthLabel(selectedYM)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KPICards
                      receita={kpisSelected.receita}
                      despesa={kpisSelected.despesa}
                      resultado={kpisSelected.resultado}
                      margem={kpisSelected.margem}
                      varReceitaPct={kpisSelected.varReceitaPct}
                      varDespesaPct={kpisSelected.varDespesaPct}
                      compact
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TopClientsCard clients={topClientsSelected} loading={loading} />
                  <TopSuppliersCard suppliers={topSuppliersSelected} loading={loading} />
                </div>
              </div>

              <div>
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">{toPTMonthLabel(compareYM!)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KPICards
                      receita={kpisCompare.receita}
                      despesa={kpisCompare.despesa}
                      resultado={kpisCompare.resultado}
                      margem={kpisCompare.margem}
                      varReceitaPct={kpisCompare.varReceitaPct}
                      varDespesaPct={kpisCompare.varDespesaPct}
                      compact
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TopClientsCard clients={topClientsCompare} loading={loading} />
                  <TopSuppliersCard suppliers={topSuppliersCompare} loading={loading} />
                </div>
              </div>
            </div>

            <Card className="border-indigo-200 bg-indigo-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-indigo-900">
                  Diferenças (selecionado – comparação)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <DiffItem label="Receita" value={kpisSelected.receita - kpisCompare.receita} money />
                  <DiffItem label="Despesa" value={kpisSelected.despesa - kpisCompare.despesa} money />
                  <DiffItem label="Resultado" value={kpisSelected.resultado - kpisCompare.resultado} money />
                  <DiffItem label="Margem (p.p.)" value={kpisSelected.margem - kpisCompare.margem} suffix=" p.p." />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Dica: use “Trocar mês” para ajustar o mês principal e “Remover comparação” para voltar à visão única.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <ImportSpreadsheetModal open={showImportModal} onOpenChange={setShowImportModal} onImportComplete={loadData} />

      {/* Diálogo de seleção de mês / comparação */}
      <MonthSelectDialog
        open={selectDialogOpen}
        onOpenChange={(o) => setSelectDialogOpen(o)}
        title={
          !selectedYM ? "Selecione o mês de referência" : compareYM === null ? "Comparar com outro mês" : "Trocar mês"
        }
        allowedMonths={allowedMonths}
        selected={null}
        helper="Apenas meses a partir de ago/2025 estão disponíveis."
        onConfirm={(value) => {
          if (!value) return;
          if (!selectedYM) {
            setSelectedYM(value);
          } else if (!compareYM) {
            if (value === selectedYM) {
              setCompareYM(null);
            } else {
              setCompareYM(value);
            }
          } else {
            setSelectedYM(value);
          }
          setSelectDialogOpen(false);
        }}
        exclude={selectedYM ? [selectedYM] : []}
      />

      {/* Diálogo de "Zerar e colar do Excel" */}
      <Dialog
        open={pasteOpen}
        onOpenChange={(o) => {
          setPasteOpen(o);
          if (!o) {
            setPastePreview(null);
            setPasteText("");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base">Zerar mês e colar a tabela do Excel</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cole aqui a tabela copiada do Excel/Sheets (aceita tabulação, “;”, “,” ou “|”). O sistema tenta detectar
              as colunas e o mês/ano automaticamente. Antes de gravar, você confirma.
            </p>

            <Textarea
              className="h-56"
              placeholder={`Exemplo de cabeçalhos aceitos: CLIENTE\tFORNECEDOR\tTOTAL\tVALOR DO FORNECEDOR\tCOMPETÊNCIA\n...`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onBlur={handlePasteAnalyze}
            />

            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handlePasteAnalyze}>
                <CalendarSearch className="h-4 w-4" />
                Analisar formatação
              </Button>
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => {
                  setPasteText("");
                  setPastePreview(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Limpar
              </Button>
            </div>

            {pastePreview && (
              <Card className="border-slate-200 bg-slate-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pré-visualização detectada</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <span className="text-muted-foreground">Mês/Ano:</span>{" "}
                      <span
                        className={
                          pastePreview.ym && betweenInclusive(pastePreview.ym, MIN_YM, nowYM())
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }
                      >
                        {pastePreview.ym ? toPTMonthLabel(pastePreview.ym) : "não identificado"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Linhas válidas:</span> {pastePreview.rowsCount}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Receita (soma):</span> {formatBRL(pastePreview.totalSum)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fornecedor (soma):</span>{" "}
                      {formatBRL(pastePreview.fornecedorSum)}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mt-2">
                    Mapeamento:
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                      <li>
                        Cliente → {pastePreview.mapping?.idxCliente !== undefined ? "detectado" : "não encontrado"}
                      </li>
                      <li>
                        Fornecedor →{" "}
                        {pastePreview.mapping?.idxFornecedor !== undefined ? "detectado" : "não encontrado"}
                      </li>
                      <li>
                        Total →{" "}
                        {pastePreview.mapping?.idxTotal !== undefined
                          ? "detectado"
                          : "tentarei somar honorários + fornecedor"}
                      </li>
                      <li>
                        Valor do fornecedor →{" "}
                        {pastePreview.mapping?.idxValorFornecedor !== undefined ? "detectado" : "não encontrado"}
                      </li>
                      <li>
                        Competência/Mês →{" "}
                        {pastePreview.mapping?.idxRef !== undefined ||
                        (pastePreview.mapping?.idxMes !== undefined && pastePreview.mapping?.idxAno !== undefined)
                          ? "detectado"
                          : "não encontrado"}
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPasteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePasteConfirm} disabled={!pastePreview || !pastePreview.rowsCount}>
              Confirmar e substituir mês
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Subcomponentes **/

function KPICards({
  receita,
  despesa,
  resultado,
  margem,
  varReceitaPct,
  varDespesaPct,
  compact = false,
}: KPIs & { compact?: boolean }) {
  const valueClass = compact ? "text-xl" : "text-2xl";
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${compact ? "" : "mb-6"}`}>
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Receitas do Mês</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className={`${valueClass} font-bold text-blue-700`}>{formatBRL(receita)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <TrendingUp className="h-3 w-3 inline mr-1" />
            {varReceitaPct >= 0 ? "+" : ""}
            {varReceitaPct.toFixed(1)}% vs mês anterior
          </p>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Despesas do Mês</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className={`${valueClass} font-bold text-red-700`}>{formatBRL(despesa)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {varDespesaPct >= 0 ? "+" : ""}
            {varDespesaPct.toFixed(1)}% vs mês anterior
          </p>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className={`${valueClass} font-bold text-green-700`}>{formatBRL(resultado)}</div>
          <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Margem</CardTitle>
          <Percent className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className={`${valueClass} font-bold text-purple-700`}>{margem.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">% de lucro do mês</p>
        </CardContent>
      </Card>
    </div>
  );
}

function DiffItem({ label, value, money, suffix }: { label: string; value: number; money?: boolean; suffix?: string }) {
  const positive = value >= 0;
  return (
    <Card className={`${positive ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"}`}>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-lg font-semibold ${positive ? "text-emerald-700" : "text-rose-700"}`}>
          {positive ? "+" : ""}
          {money ? formatBRL(Math.abs(value)) : `${Math.abs(value).toFixed(1)}${suffix ?? ""}`}
        </div>
      </CardContent>
    </Card>
  );
}

function MonthSelectDialog({
  open,
  onOpenChange,
  title,
  allowedMonths,
  selected,
  helper,
  onConfirm,
  exclude = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  allowedMonths: string[];
  selected: string | null;
  helper?: string;
  onConfirm: (value: string | null) => void;
  exclude?: string[];
}) {
  const [temp, setTemp] = useState<string | null>(selected);

  useEffect(() => {
    setTemp(selected);
  }, [selected, open]);

  const filtered = allowedMonths.filter((m) => !exclude.includes(m));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Mês de referência</label>
          <Select value={temp ?? undefined} onValueChange={(v) => setTemp(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha o mês/ano" />
            </SelectTrigger>
            <SelectContent>
              {filtered.map((m) => (
                <SelectItem key={m} value={m}>
                  {toPTMonthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(temp ?? null)} disabled={!temp || !betweenInclusive(temp, MIN_YM, nowYM())}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FinancialEditActions({
  canEdit,
  onImportOpen,
  onSync,
}: {
  canEdit: boolean;
  onImportOpen: () => void;
  onSync: () => void;
}) {
  if (!canEdit) return null;
  return (
    <>
      <Button variant="outline" className="gap-2" onClick={onImportOpen}>
        <FileSpreadsheet className="h-4 w-4" />
        Importar/Colar Planilha (arquivo)
      </Button>
      <GoogleSheetsSync onSyncComplete={onSync} />
      <ExcelImportDialog onImportComplete={onSync} />
    </>
  );
}
