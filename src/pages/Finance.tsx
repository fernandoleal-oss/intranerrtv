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
  return list.reverse(); // mais recentes primeiro
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

export default function Finance() {
  const { user } = useAuth();
  const canEdit = canEditFinance(user?.email);

  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Novo: seleção de mês e comparação
  const [selectDialogOpen, setSelectDialogOpen] = useState<boolean>(false);
  const [selectedYM, setSelectedYM] = useState<string | null>(null);
  const [compareYM, setCompareYM] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const maxYM = nowYM();
  const allowedMonths = generateAllowedMonths(MIN_YM, maxYM);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Ao entrar, força escolha do mês/ano, caso ainda não haja seleção
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

  // Filtragem por mês selecionado / mês de comparação
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

  // KPIs (modo simples: compara com mês anterior; modo comparação: cada lado mostra seu “vs mês anterior”)
  const kpisSelected = useMemo<KPIs>(() => computeKPIs(curRows, prevForSelectedRows), [curRows, prevForSelectedRows]);

  const kpisCompare = useMemo<KPIs>(
    () => computeKPIs(compareRows, prevForCompareRows),
    [compareRows, prevForCompareRows],
  );

  // Summaries por mês
  const topClientsSelected = useMemo(() => summarizeClients(curRows), [curRows]);
  const topSuppliersSelected = useMemo(() => summarizeSuppliers(curRows), [curRows]);

  const topClientsCompare = useMemo(() => summarizeClients(compareRows), [compareRows]);
  const topSuppliersCompare = useMemo(() => summarizeSuppliers(compareRows), [compareRows]);

  // CSV (exporta SOMENTE o mês atual selecionado; mais útil na prática)
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
                  // Ativa diálogo reutilizando o mesmo seletor, mas agora para comparação
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

            {/* Ferramentas de edição */}
            <FinancialEditActions canEdit={canEdit} onImportOpen={() => setShowImportModal(true)} onSync={loadData} />
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
            {/* KPIs - Modo simples */}
            <KPICards
              receita={kpisSelected.receita}
              despesa={kpisSelected.despesa}
              resultado={kpisSelected.resultado}
              margem={kpisSelected.margem}
              varReceitaPct={kpisSelected.varReceitaPct}
              varDespesaPct={kpisSelected.varDespesaPct}
            />

            {/* Aviso de permissão */}
            {!canEdit && (
              <Card className="mb-6 border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-amber-800">
                    Visualização apenas. Apenas fernando.leal@we.com.br pode editar dados financeiros.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Top Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopClientsCard clients={topClientsSelected} loading={loading} />
              <TopSuppliersCard suppliers={topSuppliersSelected} loading={loading} />
            </div>
          </>
        )}

        {selectedYM && comparisonActive && (
          <>
            {/* Grid de comparação lado a lado */}
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

            {/* Cartão de Diferenças */}
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

      {/* Dialog Seleção de Mês / Comparação (reutilizável) */}
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

          // Decisão: se ainda não há mês principal, define-o.
          // Caso já exista mês principal e NÃO há compare ativo, define comparação.
          // Se já existe comparação, assume que o usuário quer trocar o mês principal.
          if (!selectedYM) {
            setSelectedYM(value);
          } else if (!compareYM) {
            // Impede comparar com o mesmo mês
            if (value === selectedYM) {
              // se o usuário escolheu o mesmo, apenas fecha sem setar comparação
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
        Importar/Colar Planilha
      </Button>
      <GoogleSheetsSync onSyncComplete={onSync} />
      <ExcelImportDialog onImportComplete={onSync} />
    </>
  );
}
