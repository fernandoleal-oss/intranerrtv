import { useMemo, useState } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts"
import { ChevronLeft, ChevronRight, Printer, Download, CalendarDays, Clipboard } from "lucide-react"

/** ============================================================================
 *  DADOS FIXOS — extraídos dos anexos (Agosto e Setembro/2025)
 *  Agosto: total, jobs, clientes e quadro por cliente (BYD, Bridgestones, Shopee)
 *  Setembro: total, jobs, clientes (sem quadro por cliente no anexo)
 *  ========================================================================== */

type MonthRow = {
  key: string       // "YYYY-MM"
  label: string     // "Ago/2025"
  total: number     // Receita total do mês (faturamento)
  jobs: number      // nº de jobs
  clientes: number  // nº de clientes
  clientsBreakdown?: Array<{ cliente: string; total: number }>
}

const AUG_2025: MonthRow = {
  key: "2025-08",
  label: "Ago/2025",
  total: 262_074.26,
  jobs: 15,
  clientes: 3,
  clientsBreakdown: [
    { cliente: "BYD",          total: 164_734.26 },
    { cliente: "Bridgestones", total: 92_840.00 },
    { cliente: "Shopee",       total:   4_500.00 },
  ],
}

const SEP_2025: MonthRow = {
  key: "2025-09",
  label: "Set/2025",
  total: 2_053_792.51,
  jobs: 42,
  clientes: 8,
}

const MONTHS: MonthRow[] = [AUG_2025, SEP_2025]

/** ============================================================================
 *  CONSTANTES CORPORATIVAS (cabeçalho do PDF)
 *  ========================================================================== */
const COMPANY = {
  name: "WF/MOTTA COMUNICACAO, MARKETING E PUBLICIDADE LTDA",
  cnpj: "05.265.118/0001-65",
  address: "R. Chilon, 381 - Vila Olímpia — São Paulo - SP, 04552-030",
  logoSrc: "/Logo_WE.png", // ajuste conforme seu projeto
}

/** ============================================================================
 *  HELPERS
 *  ========================================================================== */
const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0)

const pctDelta = (curr?: number, prev?: number) => {
  if (prev == null || prev === 0 || curr == null) return null
  return ((curr - prev) / prev) * 100
}

const fmtDate = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

/** ============================================================================
 *  PROMPT “MELHORADO” → GERA UM RELATÓRIO MARKDOWN COM AS SUAS REGRAS
 *  - Usa apenas os dados disponíveis em MONTHS; onde não existir, usa "—"
 *  ========================================================================== */
function buildMonthlyMarkdownReport(aug: MonthRow, sep: MonthRow) {
  // Dados calculáveis
  const receitaAgo = aug?.total ?? 0
  const receitaSet = sep?.total ?? 0

  // Custos diretos e honorários não estão nos anexos de set/2025 → “—”
  // Agosto tem quadro por cliente, mas não há custos/honorários detalhados por seção -> “—”
  const custosDiretosAgo: string = "—"
  const custosDiretosSet: string = "—"
  const honorarioRAgo: string = "—"
  const honorarioRSet: string = "—"
  const honorarioPctAgo: string = "—"
  const honorarioPctSet: string = "—"

  const margemRAgo: string = custosDiretosAgo === "—" ? "—" : formatBRL(receitaAgo - Number(custosDiretosAgo))
  const margemRSet: string = custosDiretosSet === "—" ? "—" : formatBRL(receitaSet - Number(custosDiretosSet))
  const margemPctAgo: string = "—"
  const margemPctSet: string = "—"

  const ticketMedioClienteAgo = aug?.clientes ? formatBRL(receitaAgo / aug.clientes) : "—"
  const ticketMedioClienteSet = sep?.clientes ? formatBRL(receitaSet / sep.clientes) : "—"
  const ticketMedioJobAgo = aug?.jobs ? formatBRL(receitaAgo / aug.jobs) : "—"
  const ticketMedioJobSet = sep?.jobs ? formatBRL(receitaSet / sep.jobs) : "—"

  const deltaReceita = pctDelta(receitaSet, receitaAgo)
  const deltaJobs = pctDelta(sep?.jobs, aug?.jobs)
  const deltaClientes = pctDelta(sep?.clientes, aug?.clientes)

  // Clientes do mês para cabeçalho: nomes do quadro de Agosto; Setembro sem quadro → “—”
  const clientesAgoStr = aug?.clientsBreakdown?.length
    ? aug.clientsBreakdown.map(c => c.cliente).join(", ")
    : "—"
  const clientesSetStr = sep?.clientsBreakdown?.length
    ? sep.clientsBreakdown.map(c => c.cliente).join(", ")
    : "—"

  const hoje = fmtDate(new Date())

  // Markdown (títulos simples, sem negrito; linha vazia entre seções)
  return [
    // CAPA E SUMÁRIO
    "Relatório Financeiro Mensal de Marketing – Agosto/2025 e Setembro/2025",
    "",
    "Período: 01/08/2025–31/08/2025 e 01/09/2025–30/09/2025",
    "Responsável: — | Versão: v1 | Data de emissão: " + hoje,
    "",
    "Cabeçalho do orçamento: Cliente(s) do mês | Período | Responsável | Versão | Critério (Competência/Caixa)",
    "Agosto/2025 – Clientes: " + clientesAgoStr,
    "Setembro/2025 – Clientes: " + clientesSetStr,
    "",
    // RESUMO EXECUTIVO
    "Resumo executivo",
    "",
    "KPIs por mês e variação:",
    "Receita Agosto: " + formatBRL(receitaAgo),
    "Receita Setembro: " + formatBRL(receitaSet) + (deltaReceita == null ? "" : ` | Variação vs mês anterior: ${(deltaReceita >= 0 ? "+" : "")}${deltaReceita.toFixed(1)}%`),
    "Custos diretos Agosto: " + custosDiretosAgo,
    "Custos diretos Setembro: " + custosDiretosSet,
    "Honorários (R$) Agosto: " + honorarioRAgo + " | % aplicado: " + honorarioPctAgo,
    "Honorários (R$) Setembro: " + honorarioRSet + " | % aplicado: " + honorarioPctSet,
    "Margem (R$) Agosto: " + margemRAgo + " | Margem (%) Agosto: " + margemPctAgo,
    "Margem (R$) Setembro: " + margemRSet + " | Margem (%) Setembro: " + margemPctSet,
    "Jobs Agosto: " + (aug?.jobs ?? "—"),
    "Jobs Setembro: " + (sep?.jobs ?? "—") + (deltaJobs == null ? "" : ` | Variação: ${(deltaJobs >= 0 ? "+" : "")}${deltaJobs.toFixed(1)}%`),
    "Clientes Agosto: " + (aug?.clientes ?? "—"),
    "Clientes Setembro: " + (sep?.clientes ?? "—") + (deltaClientes == null ? "" : ` | Variação: ${(deltaClientes >= 0 ? "+" : "")}${deltaClientes.toFixed(1)}%`),
    "Ticket médio por cliente Agosto: " + ticketMedioClienteAgo,
    "Ticket médio por cliente Setembro: " + ticketMedioClienteSet,
    "Ticket médio por job Agosto: " + ticketMedioJobAgo,
    "Ticket médio por job Setembro: " + ticketMedioJobSet,
    "",
    "Destaques:",
    "- Maior cliente do mês mais recente: —",
    "- Maior gasto do mês mais recente: —",
    "- Ponto de atenção regulatório/operacional: —",
    "",
    "Gráfico 1: Colunas Receita × Custos × Margem por mês (comparativo Agosto × Setembro).",
    "",
    // PERFORMANCE POR CLIENTE
    "Performance por cliente",
    "",
    "Tabela: Cliente | Receita do mês | Custos | Honorários (R$) | Margem (R$) | Margem (%) | nº de jobs | Ticket médio",
    ...(aug?.clientsBreakdown?.length
      ? aug.clientsBreakdown.map(c =>
          `${c.cliente} | ${formatBRL(c.total)} | — | — | — | — | — | —`
        )
      : ["—"]
    ),
    "",
    "Gráfico 2: Pizza da participação de receita por cliente (mês mais recente).",
    "",
    // PERFORMANCE POR JOB/AP
    "Performance por job/AP",
    "",
    "Tabela: Cliente | AP | Descrição | Fornecedor principal | Valor fornecedor | Honorário (R$) | Total | Competência | Status | Link",
    "—",
    "",
    "Observações: —",
    "",
    // GASTOS POR CATEGORIA
    "Gastos por categoria de produção",
    "",
    "Consolidado por categoria (Áudio, Pós, Imagem, Regulatório, Internos): —",
    "",
    "Gráfico 3: Barras das Top 5 categorias por gasto no mês.",
    "",
    // TOP FORNECEDORES
    "Top fornecedores (spend)",
    "",
    "Tabela: Fornecedor | nº de jobs | Spend no mês | % do total | Condição média de pagamento",
    "—",
    "",
    "Gráfico 4: Barras horizontais dos Top 5 fornecedores (mês mais recente).",
    "",
    // HONORÁRIOS / MARKUPS
    "Honorários e markups",
    "",
    "Tabela: Cliente | Base de cálculo | % aplicado | Honorário (R$) | Observações",
    "—",
    "",
    "KPIs: % honorário médio do mês e participação dos honorários na margem: —",
    "",
    // COMPLIANCE
    "Compliance e documentação",
    "",
    "Status por job: ANCINE/Condecine, licenças/cessões, territórios e prazos: —",
    "Status POs/NFs: emitido? aprovado? pago? link: —",
    "",
    // ANEXOS
    "Anexos",
    "",
    "Export do detalhamento por AP (csv/tabela) conforme colunas de entrada.",
    "Links úteis (PO, NF, Drive, ANCINE/Condecine): —",
    "",
    // METODOLOGIA
    "Metodologia",
    "",
    "Critério de apuração: Competência (ou Caixa, conforme aplicável).",
    "O que entra e o que não entra: pro bono, internos e custos absorvidos não contemplados.",
    "Fórmulas:",
    "Receita = soma dos valores faturados por cliente/job.",
    "Custos diretos = soma dos fornecedores/serviços de produção.",
    "Honorário (R$) = base de cálculo × % aplicado.",
    "Margem (R$) = Receita – Custos diretos.",
    "Margem (%) = Margem (R$) ÷ Receita.",
    "",
    // RODAPÉ
    "Dados considerados",
    "",
    "Mês A: Agosto/2025 – fonte: anexo/aba correspondente.",
    "Mês B: Setembro/2025 – fonte: anexo/aba correspondente.",
  ].join("\n")
}

/** ============================================================================
 *  COMPONENTE
 *  ========================================================================== */
export default function Finance() {
  const [selectedKey, setSelectedKey] = useState<string>(MONTHS[MONTHS.length - 1].key) // começa em Set/2025

  const idx = MONTHS.findIndex(m => m.key === selectedKey)
  const current = MONTHS[idx]
  const prev = idx > 0 ? MONTHS[idx - 1] : undefined

  // série de evolução mensal (total)
  const trendData = useMemo(
    () => MONTHS.map(m => ({ label: m.label, total: m.total })),
    []
  )

  // comparativo atual × anterior
  const compareData = useMemo(() => ([
    { metric: "Total faturado", atual: current?.total ?? 0, anterior: prev?.total ?? 0 },
    { metric: "Jobs",           atual: current?.jobs ?? 0,  anterior: prev?.jobs ?? 0  },
    { metric: "Clientes",       atual: current?.clientes ?? 0, anterior: prev?.clientes ?? 0 },
  ]), [current, prev])

  const deltaTotal = pctDelta(current?.total, prev?.total)
  const deltaJobs = pctDelta(current?.jobs, prev?.jobs)
  const deltaClientes = pctDelta(current?.clientes, prev?.clientes)

  const goPrev = () => setSelectedKey(MONTHS[Math.max(0, idx - 1)].key)
  const goNext = () => setSelectedKey(MONTHS[Math.min(MONTHS.length - 1, idx + 1)].key)

  const markdown = buildMonthlyMarkdownReport(
    MONTHS.find(m => m.key === "2025-08")!,
    MONTHS.find(m => m.key === "2025-09")!
  )

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      alert("Relatório (Markdown) copiado para a área de transferência.")
    } catch {
      alert("Não foi possível copiar. Baixe em .md no botão ao lado.")
    }
  }

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Relatorio_Financeiro_Ago-Set_2025.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Cabeçalho corporativo (igual orçamento) */}
      <div className="w-full bg-black text-white print:text-black print:bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5 print:px-0">
          <div className="flex items-center gap-4">
            <div className="h-10 w-32 bg-white flex items-center justify-center">
              <img src={COMPANY.logoSrc} alt="WE" className="h-8 object-contain" />
            </div>
            <div className="text-sm leading-tight">
              <div className="font-semibold">{COMPANY.name}</div>
              <div>CNPJ: {COMPANY.cnpj}</div>
              <div>{COMPANY.address}</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
            </Button>
            <Button variant="outline" onClick={downloadMarkdown}>
              <Download className="h-4 w-4 mr-2" />
              Baixar .md
            </Button>
            <Button variant="outline" onClick={copyMarkdown}>
              <Clipboard className="h-4 w-4 mr-2" />
              Copiar Markdown
            </Button>
          </div>
        </div>
      </div>

      {/* Barra de controle */}
      <div className="max-w-6xl mx-auto px-6 py-6 print:px-0">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 md:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Relatório de Faturamento</h1>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="icon" onClick={goPrev} disabled={idx === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={goNext} disabled={idx === MONTHS.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPIs (apenas o que existe nos anexos) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Valor total de faturamento</CardTitle>
              <CardDescription>{current?.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatBRL(current?.total ?? 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {pctDelta(current?.total, prev?.total) == null
                  ? "—"
                  : `${(pctDelta(current?.total, prev?.total) ?? 0) >= 0 ? "+" : ""}${(pctDelta(current?.total, prev?.total) ?? 0).toFixed(1)}% vs mês anterior`}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de jobs faturados</CardTitle>
              <CardDescription>{current?.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{current?.jobs ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {pctDelta(current?.jobs, prev?.jobs) == null
                  ? "—"
                  : `${(pctDelta(current?.jobs, prev?.jobs) ?? 0) >= 0 ? "+" : ""}${(pctDelta(current?.jobs, prev?.jobs) ?? 0).toFixed(1)}% vs mês anterior`}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clientes atendidos</CardTitle>
              <CardDescription>{current?.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{current?.clientes ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {pctDelta(current?.clientes, prev?.clientes) == null
                  ? "—"
                  : `${(pctDelta(current?.clientes, prev?.clientes) ?? 0) >= 0 ? "+" : ""}${(pctDelta(current?.clientes, prev?.clientes) ?? 0).toFixed(1)}% vs mês anterior`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos: evolução e comparativo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Evolução mensal (Total faturado)</CardTitle>
              <CardDescription>Valores consolidados por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => formatBRL(v)}
                  />
                  <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Comparativo {current?.label}{prev ? ` × ${prev.label}` : ""}</CardTitle>
              <CardDescription>Total, Jobs e Clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={compareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v: number, n: string) =>
                      n === "atual" || n === "anterior"
                        ? typeof v === "number"
                          ? v > 999 ? formatBRL(v) : String(v)
                          : String(v)
                        : String(v)
                    }
                  />
                  <Legend />
                  <Bar dataKey="atual" name="Período atual" fill="hsl(var(--primary))" />
                  <Bar dataKey="anterior" name="Período anterior" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Por cliente – só quando houver no mês */}
        {current?.clientsBreakdown?.length ? (
          <Card className="glass-effect mt-6">
            <CardHeader>
              <CardTitle>Por cliente — {current.label}</CardTitle>
              <CardDescription>Totais exatamente como no anexo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border rounded-lg border">
                {current.clientsBreakdown.map((c) => (
                  <div key={c.cliente} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 hover:bg-muted/40 transition">
                    <div className="font-medium">{c.cliente}</div>
                    <div className="text-right">{formatBRL(c.total)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-effect mt-6">
            <CardHeader>
              <CardTitle>Por cliente</CardTitle>
              <CardDescription>O anexo deste mês não trouxe a tabela consolidada por cliente.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Ações do relatório textual */}
        <div className="flex flex-wrap gap-2 mt-8 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / PDF
          </Button>
          <Button variant="outline" onClick={downloadMarkdown}>
            <Download className="h-4 w-4 mr-2" />
            Baixar relatório (.md)
          </Button>
          <Button variant="outline" onClick={copyMarkdown}>
            <Clipboard className="h-4 w-4 mr-2" />
            Copiar relatório (Markdown)
          </Button>
        </div>

        {/* Rodapé */}
        <div className="text-xs text-muted-foreground mt-6 pb-8 print:pb-0">
          Relatório gerado para uso interno com base nos anexos de Agosto e Setembro/2025.
        </div>
      </div>
    </div>
  )
}
