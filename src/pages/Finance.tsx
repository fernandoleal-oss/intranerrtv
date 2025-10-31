// src/pages/Finance.tsx
import { useEffect, useMemo, useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  Download,
  FileSpreadsheet,
  ArrowLeftRight,
  XCircle,
  CalendarSearch,
  ClipboardPaste,
  Trash2,
  BarChart3,
} from "lucide-react";
import { ExcelImportDialog } from "@/components/finance/ExcelImportDialog";
import { GoogleSheetsSync } from "@/components/finance/GoogleSheetsSync";
import { TopClientsCard } from "@/components/finance/TopClientsCard";
import { FinancialReport } from "@/components/finance/FinancialReport";
import { AnnualTotalsDialog } from "@/components/finance/AnnualTotalsDialog";
import { ImportSpreadsheetModal } from "@/components/finance/ImportSpreadsheetModal";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { useAuth } from "@/components/AuthProvider";
import { canEditFinance } from "@/utils/permissions";
import { supabase } from "@/integrations/supabase/client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

/* ========== Tipos/constantes ========== */

type ClientSummary = { client: string; total: number; count: number };

type EventRevenue = {
  id?: string;
  cliente: string | null;
  ref_month: string; // "YYYY-MM"
  total_cents: number | null; // faturado
};

// CORREÇÃO: Incluindo os meses de agosto, setembro e outubro
const MIN_YM = "2024-08"; // Alterado para incluir meses anteriores

/* ========== Helpers ========== */

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(v);
}

function ym(ref: string | null | undefined) {
  return ref ? ref.slice(0, 7) : "";
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

const nextYM = (x: string) => addMonths(x, 1);

function nowYM() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
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

// persistimos sempre como "YYYY-MM-01" para compatibilidade com tipo DATE
const storeRefMonth = (ymStr: string) => `${ymStr}-01`;

function summarizeClients(rows: EventRevenue[]): ClientSummary[] {
  const map: Record<string, ClientSummary> = {};
  for (const row of rows) {
    const client = row.cliente || "Sem cliente";
    if (!map[client]) map[client] = { client, total: 0, count: 0 };
    map[client].total += (row.total_cents ?? 0) / 100;
    map[client].count += 1;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

/* KPIs (só receita) */
type KPIs = { receita: number; varReceitaPct: number; registros: number; ticketMedio: number };

function computeKPIs(curRows: EventRevenue[], prevRows: EventRevenue[]): KPIs {
  const sum = (xs: EventRevenue[]) => xs.reduce((a, e) => a + (e.total_cents ?? 0), 0) / 100;
  const receita = sum(curRows);
  const receitaPrev = sum(prevRows);
  const varReceitaPct = receitaPrev > 0 ? ((receita - receitaPrev) / receitaPrev) * 100 : 0;
  const registros = curRows.length;
  const ticketMedio = registros > 0 ? receita / registros : 0;
  return { receita, varReceitaPct, registros, ticketMedio };
}

/* ========== Parsing da colagem (sem cabeçalho, com quebras) ========== */

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCurrencyBrOrEn(v: string | undefined): number {
  if (!v) return NaN;
  const raw = v
    .replace(/\s/g, "")
    .replace(/[R$\u00A0]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

const CURRENCY_RE = /R\$\s*\d{1,3}(\.\d{3})*,\d{2}/;

/** Junta linhas soltas (descrição/links) até encontrar uma linha com tabs e um R$.
 * Retorna cada "registro" como uma string única (ainda tabulada). */
function splitIntoRecords(text: string): string[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const records: string[] = [];
  let buf = "";

  for (const raw of lines) {
    const line = raw.trimEnd();
    const accum = buf ? buf + "\n" + line : line;

    const tabCount = (accum.match(/\t/g) || []).length;
    const hasCurrency = CURRENCY_RE.test(accum);

    // Heurística de término de registro:
    // precisa ter ao menos 2 colunas (cliente + algo) e conter algum valor em R$.
    if (hasCurrency && tabCount >= 2) {
      records.push(accum);
      buf = "";
    } else {
      buf = accum;
    }
  }
  if (buf.trim().length > 0) records.push(buf);
  return records;
}

/** Detecta YM no conteúdo das células (YYYY-MM, MM/YYYY, nomes PT). */
function guessYMFromCells(cells: string[]): string | null {
  const PT_MONTHS: Record<string, number> = {
    jan: 1,
    janeiro: 1,
    fev: 2,
    fevereiro: 2,
    mar: 3,
    marco: 3,
    março: 3,
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
  const t = normalize(cells.join(" "));

  const m1 = t.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b/);
  if (m1) return `${m1[1]}-${String(Number(m1[2])).padStart(2, "0")}`;

  const m2 = t.match(/\b(0?[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (m2) return `${m2[2]}-${String(Number(m2[1])).padStart(2, "0")}`;

  const m3 = t.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (m3) return `${m3[3]}-${String(Number(m3[2])).padStart(2, "0")}`;

  for (const [k, v] of Object.entries(PT_MONTHS)) {
    const re = new RegExp(`\\b${k}\\b[^\\d]*\\b(20\\d{2})\\b`, "i");
    const m = t.match(re);
    if (m) return `${m[1]}-${String(v).padStart(2, "0")}`;
  }
  return null;
}

/** Converte records tabulados em eventos (cliente, total).
 * total = último valor monetário da linha;
 * mês/ano = fallbackSelectedYM (ou detectado no texto). */
function recordsToEvents(
  records: string[],
  fallbackSelectedYM: string | null,
): { events: EventRevenue[]; ymDetected: string | null } {
  const events: EventRevenue[] = [];
  let ymDetected: string | null = null;

  for (const rec of records) {
    const cells = rec
      .split(/\t+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 2) continue;

    const cliente = (cells[0] ?? "") || null;

    // total: procura do fim pro começo o último token com R$
    let total: number | null = null;
    for (let i = cells.length - 1; i >= 0; i--) {
      const cell = cells[i];
      if (CURRENCY_RE.test(cell)) {
        const n = parseCurrencyBrOrEn(cell);
        if (!isNaN(n)) {
          total = n;
          break;
        }
      }
    }
    if (total === null) continue;

    // tenta achar um mês/ano em qualquer célula
    if (!ymDetected) {
      const guess = guessYMFromCells(cells);
      if (guess) ymDetected = guess;
    }

    const ymFinal = storeRefMonth(ymDetected || fallbackSelectedYM || "");
    if (!ymFinal) continue;

    events.push({
      cliente,
      ref_month: ymFinal,
      total_cents: Math.round(total * 100),
    });
  }
  return { events, ymDetected };
}

/* deduplicação por cliente + mês + total */
function dedupKey(e: EventRevenue) {
  const norm = (s?: string | null) => (s ?? "").trim().toUpperCase();
  return [norm(e.cliente), ym(e.ref_month), e.total_cents ?? 0].join("|");
}

/* ========== Página ========== */

export default function Finance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = canEditFinance(user?.email);

  const [allEvents, setAllEvents] = useState<EventRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectDialogOpen, setSelectDialogOpen] = useState<boolean>(false);
  const [selectedYM, setSelectedYM] = useState<string | null>(null);
  const [compareYM, setCompareYM] = useState<string | null>(null);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState<{
    ym: string | null;
    rowsCount: number;
    totalSum: number;
  } | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showRevenueChart, setShowRevenueChart] = useState(false);

  // CORREÇÃO: Alterado MIN_YM para incluir agosto/2024
  const maxYM = nowYM();
  const allowedMonths = generateAllowedMonths(MIN_YM, maxYM);

  useEffect(() => {
    loadData();
  }, []);
  
  useEffect(() => {
    if (!selectedYM) setSelectDialogOpen(true);
  }, [selectedYM]);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_events")
        .select("cliente, ref_month, total_cents")
        .order("ref_month", { ascending: false });
      if (error) throw error;
      setAllEvents((data || []) as EventRevenue[]);
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados financeiros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

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

  const kpisSelected = useMemo(() => computeKPIs(curRows, prevForSelectedRows), [curRows, prevForSelectedRows]);
  const kpisCompare = useMemo(() => computeKPIs(compareRows, prevForCompareRows), [compareRows, prevForCompareRows]);

  const topClientsSelected = useMemo(() => summarizeClients(curRows), [curRows]);
  const topClientsCompare = useMemo(() => summarizeClients(compareRows), [compareRows]);

  // NOVO: Dados para o gráfico de faturamento mensal (simplificado sem recharts)
  const monthlyRevenueData = useMemo(() => {
    const monthlyTotals: { [key: string]: number } = {};
    
    allEvents.forEach(event => {
      const month = ym(event.ref_month);
      const value = (event.total_cents || 0) / 100;
      
      if (monthlyTotals[month]) {
        monthlyTotals[month] += value;
      } else {
        monthlyTotals[month] = value;
      }
    });

    return Object.entries(monthlyTotals)
      .map(([month, revenue]) => ({
        month: toPTMonthLabel(month),
        revenue,
        fullMonth: month // para ordenação
      }))
      .sort((a, b) => a.fullMonth.localeCompare(b.fullMonth));
  }, [allEvents]);

  function handleExportCSV() {
    if (!selectedYM) return;
    const header = ["ref_month", "cliente", "total"].join(",");
    const lines = curRows.map((e) =>
      [ym(e.ref_month), `"${(e.cliente ?? "").replace(/"/g, '""')}"`, (e.total_cents ?? 0) / 100].join(","),
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_revenue_${selectedYM}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const comparisonActive = !!compareYM;

  /* ===== Colar do Clipboard diretamente ===== */
  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast({
          title: "Clipboard vazio",
          description: "Cole os dados do Excel primeiro (Ctrl+C no Excel, depois clique no botão)",
          variant: "destructive",
        });
        return;
      }

      const records = splitIntoRecords(text.trim());
      if (records.length === 0) {
        toast({
          title: "Nenhum dado válido encontrado",
          description: "Certifique-se de copiar a tabela completa do Excel",
          variant: "destructive",
        });
        return;
      }

      const { events, ymDetected } = recordsToEvents(records, selectedYM ?? null);
      const ymImport = ymDetected || selectedYM;

      if (!ymImport) {
        toast({
          title: "Selecione o mês",
          description: "Não identifiquei a competência. Selecione um mês na barra superior.",
          variant: "destructive",
        });
        return;
      }

      if (!betweenInclusive(ymImport, MIN_YM, nowYM())) {
        toast({
          title: "Período bloqueado",
          description: `Somente meses a partir de ${toPTMonthLabel(MIN_YM)}.`,
          variant: "destructive",
        });
        return;
      }

      // Dedup
      const uniq = new Map<string, EventRevenue>();
      for (const e of events) {
        const key = [(e.cliente ?? "").trim().toUpperCase(), ym(e.ref_month), e.total_cents ?? 0].join("|");
        uniq.set(key, e);
      }
      const uniqueEvents = Array.from(uniq.values()).map((e) => ({ ...e, ref_month: storeRefMonth(ymImport!) }));

      const ok = window.confirm(
        `Isso vai substituir ${toPTMonthLabel(ymImport)} por ${uniqueEvents.length} itens.\n` +
          `Receita total: ${formatBRL(uniqueEvents.reduce((a, e) => a + (e.total_cents ?? 0), 0) / 100)}\n\n` +
          `Deseja continuar?`,
      );
      if (!ok) return;

      // Apaga e insere (agora ref_month já vem como YYYY-MM-01)
      const start = `${ymImport}-01`;
      const end = `${nextYM(ymImport)}-01`;
      const delRange = await supabase.from("finance_events").delete().gte("ref_month", start).lt("ref_month", end);
      if (delRange.error) throw delRange.error;

      const ins = await supabase.from("finance_events").insert(uniqueEvents);
      if (ins.error) throw ins.error;

      toast({
        title: "Importação concluída",
        description: `Substituí ${toPTMonthLabel(ymImport)} com ${uniqueEvents.length} itens.`,
      });
      setSelectedYM(ymImport);
      await loadData();
    } catch (e: any) {
      console.error(e);
      // Se falhou ao ler clipboard, abre o dialog manual
      if (e.name === "NotAllowedError" || e.message?.includes("clipboard")) {
        setPasteOpen(true);
      } else {
        toast({
          title: "Erro ao importar",
          description: e?.message ?? "Falha desconhecida ao gravar no banco.",
          variant: "destructive",
        });
      }
    }
  }

  /* ===== Colar/Analisar (fallback manual) ===== */
  function handlePasteAnalyze() {
    const text = pasteText.trim();
    if (!text) {
      setPastePreview(null);
      return;
    }

    const records = splitIntoRecords(text);
    if (records.length === 0) {
      setPastePreview(null);
      return;
    }

    const { events, ymDetected } = recordsToEvents(records, selectedYM ?? null);

    const rowsCount = events.length;
    const totalSum = events.reduce((a, e) => a + (e.total_cents ?? 0), 0) / 100;

    setPastePreview({
      ym: ymDetected ?? selectedYM ?? null,
      rowsCount,
      totalSum,
    });
  }

  async function handlePasteConfirm() {
    if (!pastePreview) return;

    // usa o mês detectado ou o que está selecionado na UI
    let ymImport = pastePreview.ym || selectedYM;
    if (!ymImport) {
      toast({
        title: "Selecione o mês",
        description: "Não identifiquei a competência. Selecione um mês na barra superior.",
        variant: "destructive",
      });
      return;
    }
    if (!betweenInclusive(ymImport, MIN_YM, nowYM())) {
      toast({
        title: "Período bloqueado",
        description: `Somente meses a partir de ${toPTMonthLabel(MIN_YM)}.`,
        variant: "destructive",
      });
      return;
    }

    // Reparse final para garantir consistência com o texto atual
    const records = splitIntoRecords(pasteText.trim());
    const { events } = recordsToEvents(records, ymImport);
    if (events.length === 0) {
      toast({ title: "Nada para importar", description: "Não identifiquei linhas válidas.", variant: "destructive" });
      return;
    }

    // Dedup e normalização do mês
    const uniq = new Map<string, EventRevenue>();
    for (const e of events) {
      const key = [(e.cliente ?? "").trim().toUpperCase(), ym(e.ref_month), e.total_cents ?? 0].join("|");
      uniq.set(key, e);
    }
    let uniqueEvents = Array.from(uniq.values()).map((e) => ({ ...e, ref_month: storeRefMonth(ymImport!) }));

    const ok = window.confirm(
      `Isso vai substituir ${toPTMonthLabel(ymImport)} por ${uniqueEvents.length} itens.\n` +
        `Receita total: ${formatBRL(uniqueEvents.reduce((a, e) => a + (e.total_cents ?? 0), 0) / 100)}\n\n` +
        `Deseja continuar?`,
    );
    if (!ok) return;

    try {
      // Apaga e insere (ref_month já vem como YYYY-MM-01)
      const start = `${ymImport}-01`;
      const end = `${nextYM(ymImport)}-01`;
      const delRange = await supabase.from("finance_events").delete().gte("ref_month", start).lt("ref_month", end);
      if (delRange.error) throw delRange.error;

      const ins = await supabase.from("finance_events").insert(uniqueEvents);
      if (ins.error) throw ins.error;

      toast({
        title: "Importação concluída",
        description: `Substituí ${toPTMonthLabel(ymImport)} com ${uniqueEvents.length} itens.`,
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

            {/* NOVO: Botão para gráfico de faturamento */}
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => setShowRevenueChart(true)}
              disabled={monthlyRevenueData.length === 0}
            >
              <BarChart3 className="h-4 w-4" />
              Gráfico Faturamento
            </Button>

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
                <Button variant="default" className="gap-2" onClick={handlePasteFromClipboard}>
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
                Selecione o mês de referência para visualizar o faturamento.
                <br />
                {/* ATUALIZADO: Mensagem refletindo os meses disponíveis */}
                Meses anteriores a <strong>ago/2024</strong> ficam indisponíveis.
              </p>
            </CardContent>
          </Card>
        )}

        {selectedYM && !comparisonActive && (
          <>
            {!canEdit && (
              <Card className="mb-6 border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-amber-800">
                    Visualização apenas. Apenas fernando.leal@we.com.br pode editar dados financeiros.
                  </p>
                </CardContent>
              </Card>
            )}

            <FinanceDashboard
              receita={kpisSelected.receita}
              varReceitaPct={kpisSelected.varReceitaPct}
              registros={kpisSelected.registros}
              ticketMedio={kpisSelected.ticketMedio}
              topClients={topClientsSelected}
              monthLabel={toPTMonthLabel(selectedYM)}
            />
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
                      varReceitaPct={kpisSelected.varReceitaPct}
                      registros={kpisSelected.registros}
                      ticketMedio={kpisSelected.ticketMedio}
                      compact
                    />
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TopClientsCard clients={topClientsSelected} loading={loading} />
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
                      varReceitaPct={kpisCompare.varReceitaPct}
                      registros={kpisCompare.registros}
                      ticketMedio={kpisCompare.ticketMedio}
                      compact
                    />
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TopClientsCard clients={topClientsCompare} loading={loading} />
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DiffItem label="Receita" value={kpisSelected.receita - kpisCompare.receita} money />
                  <DiffItem label="Registros" value={kpisSelected.registros - kpisCompare.registros} />
                  <DiffItem label="Ticket médio" value={kpisSelected.ticketMedio - kpisCompare.ticketMedio} money />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <ImportSpreadsheetModal open={showImportModal} onOpenChange={setShowImportModal} onImportComplete={loadData} />

      {/* NOVO: Modal do gráfico de faturamento mensal (simplificado) */}
      <RevenueChartModal 
        open={showRevenueChart}
        onOpenChange={setShowRevenueChart}
        data={monthlyRevenueData}
      />

      {/* Seleção de mês / comparação */}
      <MonthSelectDialog
        open={selectDialogOpen}
        onOpenChange={(o) => setSelectDialogOpen(o)}
        title={
          !selectedYM ? "Selecione o mês de referência" : compareYM === null ? "Comparar com outro mês" : "Trocar mês"
        }
        allowedMonths={allowedMonths}
        selected={null}
        helper="Apenas meses a partir de ago/2024 estão disponíveis."
        onConfirm={(value) => {
          if (!value) return;
          if (!selectedYM) setSelectedYM(value);
          else if (!compareYM) {
            if (value === selectedYM) setCompareYM(null);
            else setCompareYM(value);
          } else setSelectedYM(value);
          setSelectDialogOpen(false);
        }}
        exclude={selectedYM ? [selectedYM] : []}
      />

      {/* Zerar e colar do Excel */}
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
              Pode colar diretamente como no exemplo que você enviou (sem cabeçalho). Vou detectar cada linha e o último{" "}
              <b>R$</b> como total. Se não houver competência na colagem, uso o mês atualmente selecionado.
            </p>

            <Textarea
              className="h-56"
              placeholder={`Cole aqui...`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onBlur={handlePasteAnalyze}
            />

            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handlePasteAnalyze}>
                <CalendarSearch className="h-4 w-4" />
                Analisar colagem
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
                  <CardTitle className="text-sm">Pré-visualização</CardTitle>
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
                        {pastePreview.ym
                          ? toPTMonthLabel(pastePreview.ym)
                          : "não identificado (usarei o mês selecionado)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Linhas válidas:</span> {pastePreview.rowsCount}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Receita (soma):</span> {formatBRL(pastePreview.totalSum)}
                    </div>
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

/** NOVO: Componente do Modal do Gráfico de Faturamento (simplificado) */
function RevenueChartModal({ 
  open, 
  onOpenChange, 
  data 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  data: { month: string; revenue: number }[];
}) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 0);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-base">Faturamento Mensal</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {data.length > 0 ? (
            <>
              {/* Gráfico simplificado com barras */}
              <div className="h-80 border rounded-lg p-6 bg-gradient-to-b from-slate-50 to-white">
                <div className="flex items-end justify-between h-64 gap-2">
                  {data.map((item, index) => {
                    const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className="text-xs text-gray-600 mb-2 text-center min-h-[40px]">
                          {item.month}
                        </div>
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-500 hover:from-blue-500 hover:to-blue-300 cursor-pointer"
                          style={{ height: `${height}%` }}
                          title={`${item.month}: ${formatBRL(item.revenue)}`}
                        />
                        <div className="text-xs text-gray-700 mt-2 font-medium">
                          {formatBRL(item.revenue)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela de dados */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Detalhamento por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-medium text-gray-700">{item.month}</span>
                        <span className="font-bold text-green-600">{formatBRL(item.revenue)}</span>
                      </div>
                    ))}
                    {/* Total */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="font-bold text-gray-900">Total Geral</span>
                      <span className="font-bold text-blue-600">
                        {formatBRL(data.reduce((sum, item) => sum + item.revenue, 0))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Nenhum dado disponível para exibir o gráfico</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Subcomponentes **/

function KPICards({
  receita,
  varReceitaPct,
  registros,
  ticketMedio,
  compact = false,
}: {
  receita: number;
  varReceitaPct: number;
  registros: number;
  ticketMedio: number;
  compact?: boolean;
}) {
  const valueClass = compact ? "text-xl" : "text-2xl";
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${compact ? "" : "mb-6"}`}>
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Receita do mês</CardTitle>
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

      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Registros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${valueClass} font-bold text-emerald-700`}>{registros}</div>
          <p className="text-xs text-muted-foreground mt-1">Quantidade de lançamentos</p>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Ticket médio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${valueClass} font-bold text-purple-700`}>{formatBRL(ticketMedio)}</div>
          <p className="text-xs text-muted-foreground mt-1">Receita / registro</p>
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
          {money ? formatBRL(Math.abs(value)) : `${Math.abs(value).toFixed(0)}${suffix ?? ""}`}
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
        Importar Planilha (arquivo)
      </Button>
      <GoogleSheetsSync onSyncComplete={onSync} />
      <ExcelImportDialog onImportComplete={onSync} />
    </>
  );
}