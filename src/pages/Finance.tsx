// src/pages/Finance.tsx
import React, { useEffect, useMemo, useState } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Users,
  ChevronLeft, ChevronRight, Printer, Download, Filter, X, ArrowUpDown, Shield,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

/* =============================================================================
   TIPOS
============================================================================= */
type MonthKey = "2025-08" | "2025-09"

type AnexoItem = {
  cliente: string
  ap: string | null
  descricao: string
  fornecedor: string
  valor_fornecedor: number
  honorario_rs: number
  total: number
  competencia: MonthKey
}

/* =============================================================================
   DADOS – ANEXOS (linhas) POR MÊS (seus dados originais)
============================================================================= */
// ------------------------ AGOSTO ------------------------
const anexosAgosto: AnexoItem[] = [
  { cliente: "BRIDGSTONES", ap: "27.738", descricao: "PNEU NOVO, TANQUE CHEIO", fornecedor: "CANJA", valor_fornecedor: 20300, honorario_rs: 2030, total: 22330, competencia: "2025-08" },
  { cliente: "BRIDGSTONES", ap: "27.528", descricao: "BOLEIA - CAMINHÃO", fornecedor: "CAIO SOARES DIRECAO DE ARTE", valor_fornecedor: 20100, honorario_rs: 2010, total: 22110, competencia: "2025-08" },
  { cliente: "BRIDGSTONES", ap: "27.709", descricao: "PEGADA", fornecedor: "LE MONSTER", valor_fornecedor: 44000, honorario_rs: 4400, total: 48400, competencia: "2025-08" },
  { cliente: "SHOPEE", ap: null, descricao: "CLOSED CAPTION CAMPANHA 8.8", fornecedor: "INTERNO", valor_fornecedor: 0, honorario_rs: 4500, total: 4500, competencia: "2025-08" },
  { cliente: "BYD", ap: "27.723", descricao: "REGISTRO ANCINE__RAKING_1x30\"_12 MESES", fornecedor: "RAIZ STUDIO", valor_fornecedor: 9605, honorario_rs: 0, total: 9605, competencia: "2025-08" },
  { cliente: "BYD", ap: null, descricao: "LOCUÇÃO E REGRAVAÇÃO", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 11000, honorario_rs: 0, total: 11000, competencia: "2025-08" },
  { cliente: "BYD", ap: null, descricao: "ANIMAÇÃO DE LETREIRO", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 9895, honorario_rs: 9895, total: 19790, competencia: "2025-08" },
  { cliente: "BYD", ap: "27.788", descricao: "COMPRA DE IMAGENS (IDs diversas)", fornecedor: "SHUTTERSTOCK", valor_fornecedor: 4600, honorario_rs: 0, total: 4600, competencia: "2025-08" },
  { cliente: "BYD", ap: "27.866", descricao: "VAREJO SONG PRO 0105 (áudio)", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 14000, honorario_rs: 0, total: 14000, competencia: "2025-08" },
  { cliente: "BYD", ap: "27.866", descricao: "VAREJO SONG PRO 0105 (pós/letreiros)", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 26000, honorario_rs: 26000, total: 52000, competencia: "2025-08" },
  { cliente: "BYD", ap: "27.870", descricao: "DOLPHIN MINI | FILME EMERSON (áudio)", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 14000, honorario_rs: 0, total: 14000, competencia: "2025-08" },
  { cliente: "BYD", ap: "27.870", descricao: "DOLPHIN MINI | FILME EMERSON (pós)", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 15500, honorario_rs: 15500, total: 31000, competencia: "2025-08" },
  { cliente: "BYD", ap: "27.894", descricao: "REGISTRO ANCINE | FILME DOLPHIN MINI", fornecedor: "CUSTO INTERNO", valor_fornecedor: 4466.26, honorario_rs: 0, total: 4466.26, competencia: "2025-08" },
  { cliente: "BYD", ap: "27.901", descricao: "COMPRA DE IMAGEM ID: 1308231094", fornecedor: "GETTY IMAGES", valor_fornecedor: 3000, honorario_rs: 0, total: 3000, competencia: "2025-08" },
  { cliente: "BYD", ap: "27.902", descricao: "COMPRA DE IMAGEM ID: 3549650059", fornecedor: "SHUTTERSTOCK", valor_fornecedor: 1273, honorario_rs: 0, total: 1273, competencia: "2025-08" },
]

// ------------------------ SETEMBRO ------------------------
const anexosSetembro: AnexoItem[] = [
  { cliente: "BYD", ap: "28.186", descricao: "BYD SONG PRO - varejo 30\" v2/5", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 14000, honorario_rs: 0, total: 14000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.189", descricao: "BYD SONG PRO - varejo 5\" v3/5", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 10000, honorario_rs: 0, total: 10000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.190", descricao: "VAREJO SONG PRO 0405", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 10500, honorario_rs: 0, total: 10500, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.190", descricao: "VAREJO SONG PRO 0405", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 9500, honorario_rs: 0, total: 9500, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.096", descricao: "Compra de imagens (links planilha)", fornecedor: "SHUTTERSTOCK", valor_fornecedor: 4600, honorario_rs: 0, total: 4600, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.106", descricao: "REGISTRO ANCINE | BYD - Dolphin Mini 2026", fornecedor: "INTERNO", valor_fornecedor: 5550.22, honorario_rs: 0, total: 5550.22, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.192", descricao: "Animação de letreiro", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 25999.78, honorario_rs: 0, total: 25999.78, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.192", descricao: "Trilha 30” com vocal + reduções", fornecedor: "ANTFOOD", valor_fornecedor: 65000, honorario_rs: 0, total: 65000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.116", descricao: "COMPRA DE IMAGEM: ID 1701646153", fornecedor: "SHUTTERSTOCK", valor_fornecedor: 1150, honorario_rs: 0, total: 1150, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.124", descricao: "DENZA – compra de imagem 2287137241", fornecedor: "SHUTTERSTOCK", valor_fornecedor: 1150, honorario_rs: 0, total: 1150, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.129", descricao: "CONDECINE institucional 1x30\" – 12 meses", fornecedor: "02 FILMES", valor_fornecedor: 5583, honorario_rs: 0, total: 5583, competencia: "2025-09" },
  { cliente: "BYD", ap: null, descricao: "Locutor + adaptação de trilha (Satelite)", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 14000, honorario_rs: 0, total: 14000, competencia: "2025-09" },
  { cliente: "BYD", ap: null, descricao: "Edição/letterings/animação de letreiros", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 26000, honorario_rs: 0, total: 26000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.127", descricao: "BYD | SONG PLUS | FILME MARINA RUY", fornecedor: "MELANINA FILMES", valor_fornecedor: 17359.51, honorario_rs: 0, total: 17359.51, competencia: "2025-09" },
  { cliente: "BYD", ap: null, descricao: "BYD | SONG PLUS | FILME MARINA RUY", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 0, honorario_rs: 0, total: 0, competencia: "2025-09" },
  { cliente: "BYD", ap: null, descricao: "BYD | SONG PLUS | FILME MARINA RUY", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 0, honorario_rs: 0, total: 0, competencia: "2025-09" },
  { cliente: "BYD", ap: null, descricao: "BYD - SATISFAÇÃO (áudio)", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 14000, honorario_rs: 0, total: 14000, competencia: "2025-09" },
  { cliente: "BYD", ap: null, descricao: "BYD - SATISFAÇÃO (pós)", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 26000, honorario_rs: 0, total: 26000, competencia: "2025-09" },

  // pacote 28.267 ~ 28.275 (pares)
  { cliente: "BYD", ap: "28.267", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 14000, honorario_rs: 0, total: 14000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.267", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 26000, honorario_rs: 0, total: 26000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.268", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 14000, honorario_rs: 0, total: 14000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.268", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 26000, honorario_rs: 0, total: 26000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.271", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 22000, honorario_rs: 0, total: 22000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.271", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 26000, honorario_rs: 0, total: 26000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.272", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 8500, honorario_rs: 0, total: 8500, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.272", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 11500, honorario_rs: 0, total: 11500, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.273", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 14000, honorario_rs: 0, total: 14000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.273", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 6000, honorario_rs: 0, total: 6000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.274", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 8500, honorario_rs: 0, total: 8500, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.274", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 11500, honorario_rs: 0, total: 11500, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.275", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: 14000, honorario_rs: 0, total: 14000, competencia: "2025-09" },
  { cliente: "BYD", ap: "28.275", descricao: "Locução + trilha adaptada + edição/motion 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 26000, honorario_rs: 0, total: 26000, competencia: "2025-09" },

  { cliente: "BYD FROTA", ap: "28.278", descricao: "6 vinhetas 5\" Seleção Globo (montagem, sem áudio)", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: 35000, honorario_rs: 0, total: 35000, competencia: "2025-09" },

  // EMS
  { cliente: "EMS", ap: "28.034", descricao: "Campanhas Repoflor / Beng Pro / Caladryl (produção principal)", fornecedor: "BOILER FILMES", valor_fornecedor: 1342000, honorario_rs: 0, total: 1342000, competencia: "2025-09" },
  { cliente: "EMS", ap: "28.034", descricao: "Campanhas áudio/música", fornecedor: "CANJA", valor_fornecedor: 126000, honorario_rs: 0, total: 126000, competencia: "2025-09" },
  { cliente: "EMS", ap: "28.034", descricao: "Efeitos / mockups", fornecedor: "MOCKUP10 PRODUÇÕES E EFEITOS ESPECIAIS EIRELI-ME", valor_fornecedor: 3700, honorario_rs: 0, total: 3700, competencia: "2025-09" },
  { cliente: "EMS", ap: "28.034", descricao: "Criação/áudio adicional", fornecedor: "BUMBLEBEAT - CREATIVE AUDIO HIVE", valor_fornecedor: 28000, honorario_rs: 0, total: 28000, competencia: "2025-09" },
  { cliente: "EMS", ap: "28.034", descricao: "Link para monitoramento remoto – 2 diárias", fornecedor: "BOILER FILMES", valor_fornecedor: 6000, honorario_rs: 0, total: 6000, competencia: "2025-09" },

  { cliente: "SHOPEE", ap: null, descricao: "CAMPANHA 10.10 - TVC - envio de material", fornecedor: "INTERNO", valor_fornecedor: 3600, honorario_rs: 0, total: 3600, competencia: "2025-09" },

  { cliente: "BRIDGESTONE", ap: "28.006", descricao: "FIRESTONE – IA/Locução – 12 meses – Digital", fornecedor: "CANJA", valor_fornecedor: 20300, honorario_rs: 0, total: 20300, competencia: "2025-09" },
  { cliente: "BRIDGESTONE", ap: "28.007", descricao: "FIRESTONE – IA/Locução – 12 meses – Digital", fornecedor: "INTERNO", valor_fornecedor: 2300, honorario_rs: 0, total: 2300, competencia: "2025-09" },

  { cliente: "LOJAS TORRA", ap: "28258", descricao: "Closed Caption – Dia das Crianças", fornecedor: "INTERNO", valor_fornecedor: 900, honorario_rs: 0, total: 900, competencia: "2025-09" },

  { cliente: "NOVIBET", ap: "28041", descricao: "Tradução – custo absorvido pela agência", fornecedor: "GIOVANNI", valor_fornecedor: 4100, honorario_rs: 0, total: 4100, competencia: "2025-09" },
  { cliente: "WE", ap: "28123", descricao: "Tradução apresentação WE – custo absorvido", fornecedor: "GIOVANNI", valor_fornecedor: 3500, honorario_rs: 0, total: 3500, competencia: "2025-09" },
]

/* =============================================================================
   HELPERS / AGREGAÇÃO
============================================================================= */
const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0)

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 })

const monthLabel: Record<MonthKey, string> = {
  "2025-08": "Ago/2025",
  "2025-09": "Set/2025",
}

const monthRangeBr: Record<MonthKey, string> = {
  "2025-08": "01–31/08/2025",
  "2025-09": "01–30/09/2025",
}

function summarize(items: AnexoItem[]) {
  const receita = items.reduce((a, b) => a + (b.total || 0), 0)
  const custos = items.reduce((a, b) => a + (b.valor_fornecedor || 0), 0)
  const honor = items.reduce((a, b) => a + (b.honorario_rs || 0), 0)
  const margem = receita - custos
  const margemPct = receita > 0 ? (margem / receita) * 100 : 0
  const jobs = items.length
  const clientesSet = new Set(items.map(i => i.cliente))
  const clientes = clientesSet.size
  const ticketCliente = clientes > 0 ? receita / clientes : 0
  const ticketJob = jobs > 0 ? receita / jobs : 0
  return { receita, custos, honor, margem, margemPct, jobs, clientes, ticketCliente, ticketJob }
}

function groupBy<T, K extends string | number>(arr: T[], keyFn: (x: T) => K) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item)
    ;(acc[k] ||= []).push(item)
    return acc
  }, {} as Record<K, T[]>)
}

const pctDelta = (curr?: number, prev?: number) => {
  if (prev == null || prev === 0 || curr == null) return null
  return ((curr - prev) / prev) * 100
}

/* =============================================================================
   COMPONENTES AUXILIARES (KPIs, Th ordenável)
============================================================================= */
function KpiCard({
  label, value, prevValue, icon, currency = true, highlight = false,
}: {
  label: string
  value: number | string
  prevValue?: number
  icon: React.ReactNode
  currency?: boolean
  highlight?: boolean
}) {
  const delta = typeof value === "number" ? pctDelta(value, prevValue) : null
  const positive = (delta ?? 0) >= 0

  return (
    <Card className={highlight ? "border-primary/30" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${highlight ? "text-primary" : ""}`}>
          {icon}
          {label}
        </CardTitle>
        <CardDescription className="text-xs">Período selecionado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold tracking-tight ${highlight ? "text-primary" : ""}`}>
          {typeof value === "number" && currency ? formatCurrency(value) : value}
        </div>
        {delta !== null ? (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {positive ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
            )}
            {`${positive ? "+" : ""}${Math.abs(delta).toFixed(1)}% vs mês anterior`}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-1">—</div>
        )}
      </CardContent>
    </Card>
  )
}

function ThSortable({
  label, onClick, active, dir, className = "",
}: {
  label: string
  onClick: () => void
  active?: boolean
  dir?: "asc" | "desc"
  className?: string
}) {
  return (
    <th className={className}>
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 hover:underline" title="Ordenar">
        {label}
        <ArrowUpDown className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`} />
        {active ? <span className="sr-only">{dir === "asc" ? "asc" : "desc"}</span> : null}
      </button>
    </th>
  )
}

/* =============================================================================
   ANEXO – TABELA INTERATIVA (com respiro)
============================================================================= */
type SortKey = keyof Pick<AnexoItem, "cliente" | "ap" | "descricao" | "fornecedor" | "valor_fornecedor" | "honorario_rs" | "total">

function AnexoTable({
  title,
  subtitle = "Detalhamento linha a linha",
  items,
  monthLabelText,
}: {
  title: string
  subtitle?: string
  items: AnexoItem[]
  monthLabelText: string
}) {
  const [q, setQ] = useState("")
  const [cliente, setCliente] = useState<string>("__all")
  const [fornecedor, setFornecedor] = useState<string>("__all")
  const [minTotal, setMinTotal] = useState<string>("")
  const [maxTotal, setMaxTotal] = useState<string>("")
  const [pageSize, setPageSize] = useState<number>(10)
  const [page, setPage] = useState<number>(1)
  const [sortKey, setSortKey] = useState<SortKey>("total")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const uniqueClientes = useMemo(() => Array.from(new Set(items.map(i => i.cliente))).sort(), [items])
  const uniqueFornecedores = useMemo(() => Array.from(new Set(items.map(i => i.fornecedor))).sort(), [items])

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase()
    const min = minTotal ? Number(minTotal.replace(/\./g, "").replace(",", ".")) : null
    const max = maxTotal ? Number(maxTotal.replace(/\./g, "").replace(",", ".")) : null

    return items.filter(i => {
      const textMatch =
        !qLower ||
        i.cliente.toLowerCase().includes(qLower) ||
        (i.ap ?? "").toLowerCase().includes(qLower) ||
        i.descricao.toLowerCase().includes(qLower) ||
        i.fornecedor.toLowerCase().includes(qLower)

      const clienteOk = cliente === "__all" || i.cliente === cliente
      const fornecedorOk = fornecedor === "__all" || i.fornecedor === fornecedor
      const minOk = min === null || i.total >= min
      const maxOk = max === null || i.total <= max

      return textMatch && clienteOk && fornecedorOk && minOk && maxOk
    })
  }, [items, q, cliente, fornecedor, minTotal, maxTotal])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      const va = a[sortKey] as any
      const vb = b[sortKey] as any
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir
      return String(va ?? "").localeCompare(String(vb ?? "")) * dir
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return sorted.slice(start, end)
  }, [sorted, currentPage, pageSize])

  const totals = useMemo(() => {
    const fornecedorSum = filtered.reduce((a, b) => a + (b.valor_fornecedor || 0), 0)
    const honorSum = filtered.reduce((a, b) => a + (b.honorario_rs || 0), 0)
    const totalSum = filtered.reduce((a, b) => a + (b.total || 0), 0)
    return { fornecedor: fornecedorSum, honor: honorSum, total: totalSum, count: filtered.length }
  }, [filtered])

  function resetFilters() {
    setQ(""); setCliente("__all"); setFornecedor("__all"); setMinTotal(""); setMaxTotal(""); setPage(1)
  }

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(k); setSortDir("asc") }
  }

  function exportCsv() {
    const header = ["Cliente","AP","Descrição","Fornecedor","Valor fornecedor","Honorário (R$)","Total","Competência"]
    const rows = sorted.map(i => ([
      i.cliente,
      i.ap ?? "",
      i.descricao.replace(/\n/g, " "),
      i.fornecedor,
      i.valor_fornecedor.toFixed(2).replace(".", ","),
      i.honorario_rs.toFixed(2).replace(".", ","),
      i.total.toFixed(2).replace(".", ","),
      i.competencia
    ]))
    const csv = [header, ...rows].map(r => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `anexo_${monthLabelText.replace("/","-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-6">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground justify-end">
              <Badge variant="secondary">Itens: {totals.count}</Badge>
              <Badge variant="secondary">Fornecedor: {formatCurrency(totals.fornecedor)}</Badge>
              <Badge variant="secondary">Honorários: {formatCurrency(totals.honor)}</Badge>
              <Badge variant="secondary">Total: {formatCurrency(totals.total)}</Badge>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="col-span-2 lg:col-span-2">
            <div className="text-xs mb-1 flex items-center gap-2 text-muted-foreground">
              <Filter className="h-3 w-3" /> Filtro rápido
            </div>
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }}
              placeholder="Buscar por cliente, AP, fornecedor ou descrição…"
            />
          </div>

          <div>
            <div className="text-xs mb-1 text-muted-foreground">Cliente</div>
            <Select value={cliente} onValueChange={(v) => { setCliente(v); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {uniqueClientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs mb-1 text-muted-foreground">Fornecedor</div>
            <Select value={fornecedor} onValueChange={(v) => { setFornecedor(v); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {uniqueFornecedores.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs mb-1 text-muted-foreground">Total mín. (R$)</div>
            <Input
              value={minTotal}
              onChange={(e) => { setMinTotal(e.target.value); setPage(1) }}
              placeholder="0,00"
              inputMode="decimal"
              pattern="[0-9.,]*"
            />
          </div>

          <div>
            <div className="text-xs mb-1 text-muted-foreground">Total máx. (R$)</div>
            <Input
              value={maxTotal}
              onChange={(e) => { setMaxTotal(e.target.value); setPage(1) }}
              placeholder="—"
              inputMode="decimal"
              pattern="[0-9.,]*"
            />
          </div>

          <div className="flex items-end">
            <Button variant="ghost" onClick={resetFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Tabela */}
        <div className="rounded-lg border overflow-hidden">
          <div className="max-h-[580px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                <tr className="[&>th]:text-left [&>th]:py-2.5 [&>th]:px-3 [&>th]:font-medium [&>th]:text-muted-foreground">
                  <ThSortable label="Cliente"   onClick={() => toggleSort("cliente")}   active={sortKey==="cliente"}   dir={sortDir} />
                  <ThSortable label="AP"        onClick={() => toggleSort("ap")}        active={sortKey==="ap"}        dir={sortDir} />
                  <ThSortable label="Descrição" onClick={() => toggleSort("descricao")} active={sortKey==="descricao"} dir={sortDir} className="min-w-[420px]" />
                  <ThSortable label="Fornecedor"onClick={() => toggleSort("fornecedor")}active={sortKey==="fornecedor"}dir={sortDir} />
                  <ThSortable label="Valor fornecedor" onClick={() => toggleSort("valor_fornecedor")} active={sortKey==="valor_fornecedor"} dir={sortDir} className="text-right" />
                  <ThSortable label="Honorário (R$)"   onClick={() => toggleSort("honorario_rs")}     active={sortKey==="honorario_rs"}     dir={sortDir} className="text-right" />
                  <ThSortable label="Total"            onClick={() => toggleSort("total")}            active={sortKey==="total"}            dir={sortDir} className="text-right" />
                </tr>
              </thead>
              <tbody>
                {paged.map((i, idx) => (
                  <tr key={`${i.cliente}-${i.ap}-${idx}`} className="border-t hover:bg-muted/20">
                    <td className="py-2.5 px-3">{i.cliente}</td>
                    <td className="py-2.5 px-3">{i.ap ?? "—"}</td>
                    <td className="py-2.5 px-3 whitespace-pre-line leading-snug">{i.descricao}</td>
                    <td className="py-2.5 px-3">{i.fornecedor}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(i.valor_fornecedor)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(i.honorario_rs)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium">{formatCurrency(i.total)}</td>
                  </tr>
                ))}

                {/* Totais (do recorte filtrado) */}
                <tr className="border-t bg-muted/10">
                  <td className="py-2.5 px-3" colSpan={4}>Totais do relatório ({monthLabelText})</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(totals.fornecedor)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(totals.honor)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-semibold">{formatCurrency(totals.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between p-3 bg-muted/10 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Itens { ( (currentPage-1)*pageSize + 1 ) }–{ Math.min(currentPage*pageSize, sorted.length) } de { sorted.length }
              <span className="mx-2">•</span>
              Página <strong className="mx-1">{currentPage}</strong> de <strong className="mx-1">{totalPages}</strong>
            </div>
            <div className="flex items-center gap-3">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / pág.</SelectItem>
                  <SelectItem value="25">25 / pág.</SelectItem>
                  <SelectItem value="50">50 / pág.</SelectItem>
                  <SelectItem value={String(Math.max(1, sorted.length))}>Todos</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" onClick={() => setPage(p => Math.max(1, p-1))} disabled={currentPage===1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* =============================================================================
   PÁGINA FINANCE – layout arejado + PDF com cabeçalho/rodapé confidencial
============================================================================= */
export default function Finance() {
  const [month, setMonth] = useState<MonthKey>("2025-09")
  const [comparePrev, setComparePrev] = useState(true)
  const generatedAt = useMemo(() => new Date(), []) // data/hora de emissão fixa durante a sessão

  const itemsByMonth: Record<MonthKey, AnexoItem[]> = {
    "2025-08": anexosAgosto,
    "2025-09": anexosSetembro,
  }

  const current = useMemo(() => summarize(itemsByMonth[month]), [month])
  const prevKey = month === "2025-09" ? "2025-08" : undefined
  const prev = useMemo(() => (prevKey ? summarize(itemsByMonth[prevKey]) : undefined), [prevKey])

  // série para colunas (Ago x Set)
  const seriesBar = useMemo(() => {
    const aug = summarize(anexosAgosto)
    const sep = summarize(anexosSetembro)
    return [
      { mes: "Ago/2025", Receita: aug.receita, Custos: aug.custos, Margem: aug.margem },
      { mes: "Set/2025", Receita: sep.receita, Custos: sep.custos, Margem: sep.margem },
    ]
  }, [])

  // distribuição por cliente (mês selecionado)
  const clientsDist = useMemo(() => {
    const grouped = groupBy(itemsByMonth[month], x => x.cliente)
    const total = Object.values(grouped).flat().reduce((a, b) => a + (b.total || 0), 0) || 1
    const entries = Object.entries(grouped).map(([cliente, arr], idx) => {
      const value = arr.reduce((a, b) => a + (b.total || 0), 0)
      return {
        name: cliente,
        value,
        pct: value / total,
        color:
          [
            "hsl(var(--primary))",
            "hsl(var(--chart-2))",
            "hsl(var(--chart-3))",
            "hsl(var(--chart-4))",
            "hsl(var(--chart-5))",
            "hsl(var(--chart-6))",
          ][idx % 6],
      }
    })
    return entries.sort((a, b) => b.value - a.value)
  }, [month])

  const clientesDoMes = useMemo(() => {
    const set = new Set(itemsByMonth[month].map(i => i.cliente))
    return Array.from(set).sort().join(", ")
  }, [month])

  // estilos de impressão: cabeçalho e rodapé fixos com confidencialidade
  useEffect(() => {
    const styleId = "finance-print-style"
    if (document.getElementById(styleId)) return
    const style = document.createElement("style")
    style.id = styleId
    style.innerHTML = `
      @media print {
        .print-header {
          position: fixed; top: 0; left: 0; right: 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          padding: 10px 16px; background: white !important; z-index: 9999;
        }
        .print-footer {
          position: fixed; bottom: 0; left: 0; right: 0;
          border-top: 1px solid rgba(0,0,0,0.1);
          padding: 8px 16px; background: white !important; z-index: 9999;
          font-size: 11px;
        }
        .print-spacer { height: 96px; }      /* espaço do header */
        .print-footer-spacer { height: 76px; } /* espaço do footer */
        .no-print { display: none !important; }
        .card-break { page-break-inside: avoid; }
      }
    `
    document.head.appendChild(style)
  }, [])

  // rótulos externos do gráfico de rosca
  const DONUT_MIN_PCT = 0.06
  const renderDonutLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, percent, name } = props
    if (!percent || percent < DONUT_MIN_PCT) return null
    const RAD = Math.PI / 180
    const r = outerRadius + 18
    const x = cx + r * Math.cos(-midAngle * RAD)
    const y = cy + r * Math.sin(-midAngle * RAD)
    const lbl = `${name} ${(percent * 100).toFixed(0)}%`
    const anchor = x > cx ? "start" as const : "end" as const
    return (
      <text x={x} y={y} fill="currentColor" textAnchor={anchor} dominantBaseline="central" className="text-xs">
        {lbl}
      </text>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* CABEÇALHO FIXO (tela e print) */}
      <div className="print-header rounded-none border bg-card/90 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <div className="text-base font-semibold">
              Relatório Financeiro – {monthLabel[month]}
            </div>
            <div className="text-xs text-muted-foreground">
              Cliente(s): {clientesDoMes || "—"} • Período: {monthRangeBr[month]} • Critério: Competência
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 no-print">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>
      <div className="print-spacer" />

      {/* CONTEÚDO */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* BARRA DE CONTROLES */}
        <div className="sticky top-20 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-4 no-print">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={month} onValueChange={(v) => (setMonth(v as MonthKey))}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-09">Set/2025</SelectItem>
                  <SelectItem value="2025-08">Ago/2025</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch id="comparePrev" checked={comparePrev} onCheckedChange={setComparePrev} />
                <label htmlFor="comparePrev" className="text-sm">Comparar com mês anterior</label>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                Emissão: {generatedAt.toLocaleDateString("pt-BR")} • {generatedAt.toLocaleTimeString("pt-BR")}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 card-break">
          <KpiCard
            label="Receita do mês"
            value={current.receita}
            prevValue={prev?.receita}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            highlight
          />
          <KpiCard label="Custos diretos" value={current.custos} prevValue={prev?.custos} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
          <KpiCard label="Honorários (R$)" value={current.honor} prevValue={prev?.honor} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Margem
              </CardTitle>
              <CardDescription className="text-xs">Valor absoluto e variação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCurrency(current.margem)}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                <Badge variant="secondary" className="text-xs">
                  {isFinite(current.margemPct) ? `${current.margemPct.toFixed(1)}%` : "—"}
                </Badge>
                {prev ? (
                  (() => {
                    const d = pctDelta(current.margem, prev.margem)
                    if (d === null) return <span>—</span>
                    return d >= 0 ? (
                      <span className="flex items-center"><TrendingUp className="h-3 w-3 mr-1 text-green-600" />{d.toFixed(1)}%</span>
                    ) : (
                      <span className="flex items-center"><TrendingDown className="h-3 w-3 mr-1 text-red-600" />{Math.abs(d).toFixed(1)}%</span>
                    )
                  })()
                ) : <span>—</span>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Jobs
              </CardTitle>
              <CardDescription className="text-xs">Quantidade no mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{current.jobs}</div>
              <div className="text-xs text-muted-foreground mt-1">itens faturados</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Clientes
              </CardTitle>
              <CardDescription className="text-xs">Ticket médio por cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{current.clientes}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Ticket por cliente: {formatCurrency(current.ticketCliente)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 card-break">
          {/* Colunas Receita x Custos x Margem */}
          <Card>
            <CardHeader>
              <CardTitle>Comparativo (Receita × Custos × Margem)</CardTitle>
              <CardDescription>Agosto vs Setembro/2025</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={seriesBar} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => "R$ " + compact.format(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="Receita" fill="hsl(var(--primary))" />
                  <Bar dataKey="Custos" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="Margem" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rosca – participação por cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Participação por cliente – {monthLabel[month]}</CardTitle>
              <CardDescription>Distribuição da receita no mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-3">
                  <ResponsiveContainer width="100%" height={360}>
                    <PieChart>
                      <Pie
                        data={clientsDist}
                        cx="48%"
                        cy="52%"
                        innerRadius={80}
                        outerRadius={120}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        labelLine={false}
                        label={renderDonutLabel}
                      >
                        {clientsDist.map((it, idx) => <Cell key={idx} fill={it.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none -mt-40 text-center">
                    <div className="inline-block rounded-xl px-3 py-1 bg-background/80 backdrop-blur border text-xs text-muted-foreground">
                      Receita total {monthLabel[month]}
                    </div>
                    <div className="text-lg font-semibold">{formatCurrency(current.receita)}</div>
                  </div>
                </div>
                <div className="md:col-span-2 max-h-[360px] overflow-auto pr-1">
                  <ul className="space-y-2">
                    {clientsDist.map((c, i) => (
                      <li key={i} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: c.color }} />
                          <span className="text-sm">{c.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium tabular-nums">{formatCurrency(c.value)}</div>
                          <div className="text-xs text-muted-foreground">{(c.pct * 100).toFixed(1)}%</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PERFORMANCE POR CLIENTE */}
        <Card className="card-break">
          <CardHeader>
            <CardTitle>Performance por cliente – {monthLabel[month]}</CardTitle>
            <CardDescription>Receita, custos, honorários e margem</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientTable monthItems={itemsByMonth[month]} totalResumo={current} />
          </CardContent>
        </Card>

        {/* COMPARATIVO ATUAL x ANTERIOR */}
        {comparePrev && prev && (
          <Card className="card-break">
            <CardHeader>
              <CardTitle>Comparativo {monthLabel[prevKey!]} × {monthLabel[month]}</CardTitle>
              <CardDescription>Receita, custos e honorários</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={[
                  { metric: "Receita", anterior: prev.receita, atual: current.receita },
                  { metric: "Custos", anterior: prev.custos, atual: current.custos },
                  { metric: "Honorários", anterior: prev.honor, atual: current.honor },
                ]} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => "R$ " + compact.format(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="anterior" name={`Período ${monthLabel[prevKey!]}`} fill="hsl(var(--chart-2))" />
                  <Bar dataKey="atual" name={`Período ${monthLabel[month]}`} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ANEXOS – AGO e SET */}
        <Tabs defaultValue={month === "2025-09" ? "set" : "ago"} className="space-y-4 card-break">
          <TabsList>
            <TabsTrigger value="ago">Anexo – Ago/2025</TabsTrigger>
            <TabsTrigger value="set">Anexo – Set/2025</TabsTrigger>
          </TabsList>
          <TabsContent value="ago">
            <AnexoTable title="Anexo – Itens faturados (Ago/2025)" monthLabelText="Ago/2025" items={anexosAgosto} />
          </TabsContent>
          <TabsContent value="set">
            <AnexoTable title="Anexo – Itens faturados (Set/2025)" monthLabelText="Set/2025" items={anexosSetembro} />
          </TabsContent>
        </Tabs>

        {/* NOTA DE SEGURANÇA (visível na tela e no PDF — também repetida no rodapé de impressão) */}
        <Card className="card-break">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Segurança e Confidencialidade
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Este relatório contém informações financeiras de clientes e fornecedores. É de <strong>uso interno</strong> da
            WE e está protegido por acordos de confidencialidade e pela <strong>LGPD</strong>. A <strong>divulgação, cópia,
            encaminhamento a terceiros ou publicação</strong> sem autorização por escrito é estritamente proibida. Em caso de
            extravio ou suspeita de acesso indevido, notifique imediatamente o time financeiro.
          </CardContent>
        </Card>
      </div>

      {/* RODAPÉ FIXO PARA IMPRESSÃO */}
      <div className="print-footer">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px]">
            <strong>WE – WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA</strong> • Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP 04552-030
          </div>
          <div className="text-[11px]">
            Confidencial – Uso interno. Não divulgar. Emissão: {generatedAt.toLocaleDateString("pt-BR")} {generatedAt.toLocaleTimeString("pt-BR")}
          </div>
        </div>
      </div>
      <div className="print-footer-spacer" />
    </div>
  )
}

/* =============================================================================
   TABELA POR CLIENTE (com totais)
============================================================================= */
function ClientTable({ monthItems, totalResumo }: { monthItems: AnexoItem[], totalResumo: ReturnType<typeof summarize> }) {
  const data = useMemo(() => {
    const grouped = groupBy(monthItems, x => x.cliente)
    return Object.entries(grouped).map(([cliente, arr]) => {
      const receita = arr.reduce((a, b) => a + (b.total || 0), 0)
      const custos = arr.reduce((a, b) => a + (b.valor_fornecedor || 0), 0)
      const honor = arr.reduce((a, b) => a + (b.honorario_rs || 0), 0)
      const margem = receita - custos
      const margemPct = receita > 0 ? (margem / receita) * 100 : 0
      const jobs = arr.length
      const ticket = jobs > 0 ? receita / jobs : 0
      return { cliente, receita, custos, honor, margem, margemPct, jobs, ticket }
    }).sort((a, b) => b.receita - a.receita)
  }, [monthItems])

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
            <tr className="[&>th]:text-left [&>th]:py-2.5 [&>th]:px-3 [&>th]:font-medium [&>th]:text-muted-foreground">
              <th>Cliente</th>
              <th className="text-right">Receita</th>
              <th className="text-right">Custos</th>
              <th className="text-right">Honorários (R$)</th>
              <th className="text-right">Margem (R$)</th>
              <th className="text-right">Margem (%)</th>
              <th className="text-right"># Jobs</th>
              <th className="text-right">Ticket médio</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.cliente} className="border-t hover:bg-muted/20">
                <td className="py-2.5 px-3">{row.cliente}</td>
                <td className="py-2.5 px-3 text-right">{formatCurrency(row.receita)}</td>
                <td className="py-2.5 px-3 text-right">{formatCurrency(row.custos)}</td>
                <td className="py-2.5 px-3 text-right">{formatCurrency(row.honor)}</td>
                <td className="py-2.5 px-3 text-right">{formatCurrency(row.margem)}</td>
                <td className="py-2.5 px-3 text-right">{row.margemPct.toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right">{row.jobs}</td>
                <td className="py-2.5 px-3 text-right">{formatCurrency(row.ticket)}</td>
              </tr>
            ))}
            <tr className="border-t bg-muted/10">
              <td className="py-2.5 px-3">Totais do mês</td>
              <td className="py-2.5 px-3 text-right">{formatCurrency(totalResumo.receita)}</td>
              <td className="py-2.5 px-3 text-right">{formatCurrency(totalResumo.custos)}</td>
              <td className="py-2.5 px-3 text-right">{formatCurrency(totalResumo.honor)}</td>
              <td className="py-2.5 px-3 text-right">{formatCurrency(totalResumo.margem)}</td>
              <td className="py-2.5 px-3 text-right">{isFinite(totalResumo.margemPct) ? `${totalResumo.margemPct.toFixed(1)}%` : "—"}</td>
              <td className="py-2.5 px-3 text-right">{totalResumo.jobs}</td>
              <td className="py-2.5 px-3 text-right">{formatCurrency(totalResumo.ticketJob)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
