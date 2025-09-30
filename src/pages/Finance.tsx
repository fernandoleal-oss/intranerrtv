import { useMemo, useState } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts"
import { ChevronLeft, ChevronRight, Printer, Download, CalendarDays, Clipboard } from "lucide-react"

/* =============================================================================
   1) DADOS BASE DO MÊS (KPI de alto nível)
   - Setembro agora poderá ter breakdown por cliente assim que você colar os itens.
============================================================================= */
type MonthRow = {
  key: string       // "YYYY-MM"
  label: string     // "Ago/2025"
  total: number     // Receita total do mês
  jobs: number      // nº de jobs no mês
  clientes: number  // nº de clientes no mês
  // opcional: caso queira manter um quadro fixo de clientes quando não houver itens
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

/* =============================================================================
   2) ITENS (ANEXO) — “Tudo que foi faturado no mês”
   Use este formato para colar os itens de setembro no editor embutido.
============================================================================= */
type FinanceItem = {
  cliente: string
  ap?: string
  descricao?: string
  fornecedor?: string
  categoria?: string
  competencia?: string   // "2025-09" etc.
  total: number
  status?: string        // Previsto/Realizado
  data_nf?: string       // dd/mm/aaaa
  prev_recebimento?: string
  data_pgto_fornecedor?: string
  centro_custo?: string
  link?: string          // PO/NF/Drive/ANCINE
}

/* Agosto com 3 linhas para espelhar o quadro por cliente.
   (Você pode expandir se quiser granularidade real por AP.) */
const AUGUST_ITEMS: FinanceItem[] = [
  { cliente: "BYD",          total: 164_734.26, competencia: "2025-08", descricao: "Consolidação mês", categoria: "Produção" },
  { cliente: "Bridgestones", total:  92_840.00, competencia: "2025-08", descricao: "Consolidação mês", categoria: "Produção" },
  { cliente: "Shopee",       total:   4_500.00, competencia: "2025-08", descricao: "Consolidação mês", categoria: "Serviços" },
]

/* Setembro inicialmente vazio (sem inventar valores).
   Vá em “Adicionar/Editar Itens do Mês” e cole um JSON de FinanceItem[].
   Exemplo de um item (apague o comentário ao colar):
   [
     {
       "cliente": "BYD",
       "ap": "AP-123",
       "descricao": "Filme 30s",
       "fornecedor": "Produtora X",
       "categoria": "Produção",
       "competencia": "2025-09",
       "total": 123456.78,
       "status": "Realizado",
       "data_nf": "25/09/2025",
       "prev_recebimento": "25/10/2025",
       "data_pgto_fornecedor": "10/10/2025",
       "centro_custo": "Publicidade",
       "link": "https://drive.google.com/..."
     }
   ]
*/
const SEPTEMBER_ITEMS: FinanceItem[] = []

/* Mapa padrão por mês */
const DEFAULT_DETAILS: Record<string, FinanceItem[]> = {
  "2025-08": AUGUST_ITEMS,
  "2025-09": SEPTEMBER_ITEMS,
}

/* =============================================================================
   3) CONSTANTES CORPORATIVAS (cabeçalho do PDF)
============================================================================= */
const COMPANY = {
  name: "WF/MOTTA COMUNICACAO, MARKETING E PUBLICIDADE LTDA",
  cnpj: "05.265.118/0001-65",
  address: "R. Chilon, 381 - Vila Olímpia — São Paulo - SP, 04552-030",
  logoSrc: "/Logo_WE.png", // ajuste conforme seu projeto
}

/* =============================================================================
   4) HELPERS
============================================================================= */
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

/* Gera Markdown do relatório conforme suas regras — usa o que estiver disponível */
function buildMonthlyMarkdownReport(current: MonthRow, previous: MonthRow | undefined, items: FinanceItem[]) {
  const hoje = fmtDate(new Date())
  const receita = current?.total ?? 0
  const receitaPrev = previous?.total ?? 0
  const deltaReceita = pctDelta(receita, receitaPrev)

  const jobs = current?.jobs ?? 0
  const jobsPrev = previous?.jobs ?? 0
  const deltaJobs = pctDelta(jobs, jobsPrev)

  const clientes = current?.clientes ?? 0
  const clientesPrev = previous?.clientes ?? 0
  const deltaClientes = pctDelta(clientes, clientesPrev)

  // “Por cliente” a partir dos itens; se não houver, tenta o clientsBreakdown do mês
  const byClient: Record<string, number> = {}
  if (items?.length) {
    for (const it of items) {
      byClient[it.cliente] = (byClient[it.cliente] || 0) + (it.total || 0)
    }
  } else if (current?.clientsBreakdown?.length) {
    current.clientsBreakdown.forEach(c => byClient[c.cliente] = c.total)
  }

  const clientesStr = Object.keys(byClient).length
    ? Object.keys(byClient).join(", ")
    : (current?.clientsBreakdown?.map(c => c.cliente).join(", ") || "—")

  return [
    `Relatório Financeiro Mensal de Marketing – ${current.label}`,
    "",
    `Período: 01/${current.key.slice(5,7)}/${current.key.slice(0,4)}–${new Date(Number(current.key.slice(0,4)), Number(current.key.slice(5,7)), 0).getDate().toString().padStart(2,"0")}/${current.key.slice(5,7)}/${current.key.slice(0,4)}`,
    `Responsável: — | Versão: v1 | Data de emissão: ${hoje}`,
    "",
    "Cabeçalho do orçamento: Cliente(s) do mês | Período | Responsável | Versão | Critério (Competência/Caixa)",
    `Clientes do mês: ${clientesStr}`,
    "",
    "Resumo executivo",
    "",
    `Receita do mês: ${formatBRL(receita)}` + (deltaReceita == null ? "" : ` | Variação vs mês anterior: ${(deltaReceita>=0?"+":"")}${deltaReceita.toFixed(1)}%`),
    `Jobs do mês: ${jobs}` + (deltaJobs == null ? "" : ` | Variação: ${(deltaJobs>=0?"+":"")}${deltaJobs.toFixed(1)}%`),
    `Clientes no mês: ${clientes}` + (deltaClientes == null ? "" : ` | Variação: ${(deltaClientes>=0?"+":"")}${deltaClientes.toFixed(1)}%`),
    "Custos diretos: —",
    "Honorários (R$ e %): —",
    "Margem (R$ e %): —",
    "Ticket médio por cliente: " + (clientes ? formatBRL(receita / clientes) : "—"),
    "Ticket médio por job: " + (jobs ? formatBRL(receita / jobs) : "—"),
    "",
    "Performance por cliente",
    "",
    "Cliente | Receita do mês | Custos | Honorários (R$) | Margem (R$) | Margem (%) | nº de jobs | Ticket médio",
    ...(Object.keys(byClient).length
      ? Object.entries(byClient).map(([cli, val]) => `${cli} | ${formatBRL(val)} | — | — | — | — | — | —`)
      : ["—"]),
    "",
    "Performance por job/AP",
    "",
    "Cliente | AP | Descrição | Fornecedor | Categoria | Competência | Total | Status | Data NF | Prev. recebimento | Pgto fornecedor | CC | Link",
    ...(items?.length
      ? items.map(it =>
          `${it.cliente || "—"} | ${it.ap || "—"} | ${it.descricao || "—"} | ${it.fornecedor || "—"} | ${it.categoria || "—"} | ${it.competencia || "—"} | ${formatBRL(it.total || 0)} | ${it.status || "—"} | ${it.data_nf || "—"} | ${it.prev_recebimento || "—"} | ${it.data_pgto_fornecedor || "—"} | ${it.centro_custo || "—"} | ${it.link || "—"}`
        )
      : ["—"]),
    "",
    "Gastos por categoria de produção",
    "",
    "Consolidado por categoria (Áudio, Pós, Imagem, Regulatório, Internos): —",
    "Gráfico: Barras — Top 5 categorias por gasto no mês.",
    "",
    "Top fornecedores (spend)",
    "",
    "Fornecedor | nº de jobs | Spend no mês | % do total | Condição média de pagamento",
    "—",
    "",
    "Honorários e markups",
    "",
    "Cliente | Base de cálculo | % aplicado | Honorário (R$) | Observações",
    "—",
    "",
    "Compliance e documentação",
    "",
    "ANCINE/Condecine, licenças/cessões, territórios e prazos: —",
    "POs/NFs: emitido? aprovado? pago? link: —",
    "",
    "Metodologia",
    "",
    "Critério de apuração: Competência (ou Caixa, conforme aplicável).",
    "Receita = soma dos valores faturados por cliente/job.",
    "Custos diretos = soma dos fornecedores/serviços de produção.",
    "Honorário (R$) = base de cálculo × % aplicado.",
    "Margem (R$) = Receita – Custos diretos.",
    "Margem (%) = Margem (R$) ÷ Receita.",
  ].join("\n")
}

/* =============================================================================
   5) COMPONENTE
============================================================================= */
export default function Finance() {
  const [selectedKey, setSelectedKey] = useState<string>(MONTHS[MONTHS.length - 1].key) // começa Set/2025
  // Overrides locais: você pode colar JSON de itens do mês, sem precisar de backend
  const [localOverrides, setLocalOverrides] = useState<Record<string, FinanceItem[]>>({})
  const [jsonDraft, setJsonDraft] = useState<string>("")

  const idx = MONTHS.findIndex(m => m.key === selectedKey)
  const current = MONTHS[idx]
  const prev = idx > 0 ? MONTHS[idx - 1] : undefined

  // Itens do mês (override > default)
  const monthItems: FinanceItem[] = useMemo(() => {
    if (localOverrides[current.key]?.length) return localOverrides[current.key]
    return DEFAULT_DETAILS[current.key] || []
  }, [current.key, localOverrides])

  // Por cliente (derivado dos itens; se vazio, tenta quadro fixo)
  const clientsPie = useMemo(() => {
    const map: Record<string, number> = {}
    if (monthItems.length) {
      monthItems.forEach(it => {
        const k = it.cliente || "—"
        map[k] = (map[k] || 0) + (it.total || 0)
      })
      return Object.entries(map).map(([name, value], i) => ({
        name, value,
        color: ["hsl(var(--primary))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))","hsl(var(--chart-5))"][i % 5],
      }))
    }
    if (current?.clientsBreakdown?.length) {
      return current.clientsBreakdown.map((c, i) => ({
        name: c.cliente, value: c.total,
        color: ["hsl(var(--primary))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))","hsl(var(--chart-5))"][i % 5],
      }))
    }
    return []
  }, [monthItems, current])

  // série (line) e comparativo (bars)
  const trendData = useMemo(
    () => MONTHS.map(m => ({ label: m.label, total: m.total })),
    []
  )
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

  // Markdown do mês corrente
  const markdown = buildMonthlyMarkdownReport(current, prev, monthItems)

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
    a.download = `Relatorio_Financeiro_${current.key}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportItemsCsv = () => {
    const headers = ["Cliente","AP","Descrição","Fornecedor","Categoria","Competência","Total","Status","Data NF","Prev. recebimento","Pgto fornecedor","CC","Link"]
    const rows = monthItems.map(it => ([
      it.cliente || "", it.ap || "", it.descricao || "", it.fornecedor || "", it.categoria || "",
      it.competencia || "", String(it.total || 0).replace(".", ","), it.status || "", it.data_nf || "",
      it.prev_recebimento || "", it.data_pgto_fornecedor || "", it.centro_custo || "", it.link || ""
    ]))
    const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].map(r => r.join(";")).join("\n")
    const a = document.createElement("a")
    a.href = encodeURI(csv)
    a.download = `anexo_${current.key}.csv`
    a.click()
  }

  const importJsonItems = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as FinanceItem[]
      if (!Array.isArray(parsed)) throw new Error("JSON deve ser um array [] de itens")
      setLocalOverrides(prev => ({ ...prev, [current.key]: parsed }))
      alert(`Carregado ${parsed.length} item(ns) para ${current.label}.`)
    } catch (e: any) {
      alert("JSON inválido: " + (e?.message || ""))
    }
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Cabeçalho corporativo */}
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

      <div className="max-w-6xl mx-auto px-6 py-6 print:px-0">
        {/* Barra de controle */}
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

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Valor total de faturamento</CardTitle>
              <CardDescription>{current?.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatBRL(current?.total ?? 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {deltaTotal == null ? "—" : `${deltaTotal >= 0 ? "+" : ""}${deltaTotal.toFixed(1)}% vs mês anterior`}
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
                {deltaJobs == null ? "—" : `${deltaJobs >= 0 ? "+" : ""}${deltaJobs.toFixed(1)}% vs mês anterior`}
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
                {deltaClientes == null ? "—" : `${deltaClientes >= 0 ? "+" : ""}${deltaClientes.toFixed(1)}% vs mês anterior`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
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
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
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
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number, n: string) =>
                      n === "atual" || n === "anterior"
                        ? typeof v === "number" ? (n === "atual" || n === "anterior") && v > 999 ? formatBRL(v) : String(v) : String(v)
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

        {/* Por cliente (deriva dos itens ou do quadro fixo) + Pizza */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Por cliente — {current.label}</CardTitle>
              <CardDescription>Se colar os itens, esta sessão atualiza automaticamente.</CardDescription>
            </CardHeader>
            <CardContent>
              {clientsPie.length ? (
                <div className="divide-y divide-border rounded-lg border">
                  {clientsPie.map((c) => (
                    <div key={c.name} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 hover:bg-muted/40 transition">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-right">{formatBRL(c.value)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados por cliente neste mês. Cole os itens no editor abaixo.</div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Participação por cliente</CardTitle>
              <CardDescription>Pizza do mês corrente</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={clientsPie} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={110} dataKey="value">
                    {clientsPie.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Editor simples: colar JSON de itens do mês */}
        <Card className="glass-effect mt-6 print:hidden">
          <CardHeader>
            <CardTitle>Adicionar/Editar Itens do Mês ({current.label})</CardTitle>
            <CardDescription>Cole aqui um JSON de itens faturados (FinanceItem[]). Isso alimenta “Por cliente” e o Anexo.</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full h-40 rounded-md border bg-background p-3 text-sm"
              placeholder='Ex.: [{"cliente":"BYD","total":123456.78,"competencia":"2025-09"}]'
              value={jsonDraft}
              onChange={e => setJsonDraft(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={importJsonItems}>Importar itens (JSON)</Button>
              <Button variant="outline" onClick={() => setJsonDraft("")}>Limpar</Button>
              <Button variant="outline" onClick={exportItemsCsv}><Download className="h-4 w-4 mr-2" />Exportar Anexo (.csv)</Button>
            </div>
          </CardContent>
        </Card>

        {/* Anexo — Tudo faturado no mês */}
        <Card className="glass-effect mt-6">
          <CardHeader>
            <CardTitle>Anexo — Tudo faturado no mês</CardTitle>
            <CardDescription>Lista detalhada usada para o relatório e o breakdown por cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            {monthItems.length ? (
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">AP</th>
                      <th className="text-left p-2">Descrição</th>
                      <th className="text-left p-2">Fornecedor</th>
                      <th className="text-left p-2">Categoria</th>
                      <th className="text-left p-2">Competência</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Data NF</th>
                      <th className="text-left p-2">Prev. receb.</th>
                      <th className="text-left p-2">Pgto forn.</th>
                      <th className="text-left p-2">CC</th>
                      <th className="text-left p-2">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthItems.map((it, i) => (
                      <tr key={i} className="border-t hover:bg-muted/20">
                        <td className="p-2">{it.cliente || "—"}</td>
                        <td className="p-2">{it.ap || "—"}</td>
                        <td className="p-2">{it.descricao || "—"}</td>
                        <td className="p-2">{it.fornecedor || "—"}</td>
                        <td className="p-2">{it.categoria || "—"}</td>
                        <td className="p-2">{it.competencia || "—"}</td>
                        <td className="p-2 text-right">{formatBRL(it.total || 0)}</td>
                        <td className="p-2">{it.status || "—"}</td>
                        <td className="p-2">{it.data_nf || "—"}</td>
                        <td className="p-2">{it.prev_recebimento || "—"}</td>
                        <td className="p-2">{it.data_pgto_fornecedor || "—"}</td>
                        <td className="p-2">{it.centro_custo || "—"}</td>
                        <td className="p-2">
                          {it.link ? (
                            <a className="underline" href={it.link} target="_blank" rel="noreferrer">abrir</a>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Não há itens cadastrados para {current.label}. Cole o JSON no editor acima para habilitar o anexo e o “Por cliente”.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rodapé */}
        <div className="text-xs text-muted-foreground mt-6 pb-8 print:pb-0">
          Relatório interno baseado nos anexos disponíveis. Para setembro, cole os itens faturados para habilitar o breakdown por cliente e o anexo completo.
        </div>
      </div>
    </div>
  )
}
