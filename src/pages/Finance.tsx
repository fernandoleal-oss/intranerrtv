import { useMemo, useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, TrendingDown, DollarSign, Calendar,
  ChevronLeft, ChevronRight, Printer, Download
} from "lucide-react"

/* ============================================================================
 * TIPOS E HELPERS
 * ========================================================================== */
type FinanceItem = {
  cliente: string
  ap?: string
  descricao: string
  fornecedor: string
  categoria?: string
  competencia: string       // "2025-08" | "2025-09"
  valor_fornecedor?: number // repasse
  honorario_percent?: number | null
  honorario_reais?: number | null
  total: number             // receita do job (repasse + honorários)
  status?: "Previsto" | "Realizado"
  data_emissao_nf?: string
  prev_recebimento?: string
  data_pagto_fornecedor?: string
  centro_custo?: string
  links?: string
}

type MonthSummary = {
  key: string
  label: string
  fornecedor: number
  honorario: number
  total: number
  eventos: number
  clientesAtivos: number
  byClient: Array<{ cliente: string, total: number, honorario: number, eventos: number }>
  bySupplier: Array<{ fornecedor: string, total: number, eventos: number, pct: number }>
  items: FinanceItem[]
}

const PT_MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const monthLabel = (key: string) => {
  const [y,m] = key.split("-").map(Number)
  return `${PT_MONTHS[m-1]}/${y}`
}
const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(v || 0)

const calcHonorario = (item: FinanceItem) => {
  if (item.honorario_reais != null) return item.honorario_reais
  if (item.honorario_percent != null && item.valor_fornecedor != null) {
    return (item.valor_fornecedor) * (item.honorario_percent/100)
  }
  if (item.valor_fornecedor != null && item.total != null) {
    return Math.max(0, item.total - item.valor_fornecedor)
  }
  return 0
}
const calcRepasse = (item: FinanceItem) => {
  if (item.valor_fornecedor != null) return item.valor_fornecedor
  if (item.honorario_reais != null && item.total != null) return Math.max(0, item.total - item.honorario_reais)
  return item.total ?? 0
}
const pctDelta = (curr?: number, prev?: number) => {
  if (!prev || prev === 0 || curr == null) return null
  return ((curr - prev) / prev) * 100
}

/* ============================================================================
 * DADOS — TABELAS CONVERTIDAS
 * ========================================================================== */
/* Agosto/2025 */
const augustItems: FinanceItem[] = [
  // BRIDGSTONES
  { cliente:"BRIDGSTONES", ap:"27.738", descricao:"PNEU NOVO, TANQUE CHEIO", fornecedor:"CANJA", competencia:"2025-08", valor_fornecedor:20300.00, honorario_percent:10, honorario_reais:2030.00, total:22330.00, status:"Realizado" },
  { cliente:"BRIDGSTONES", ap:"27.528", descricao:"BOLEIA - CAMINHÃO", fornecedor:"CAIO SOARES DIRECAO DE ARTE", competencia:"2025-08", valor_fornecedor:20100.00, honorario_percent:10, honorario_reais:2010.00, total:22110.00, status:"Realizado" },
  { cliente:"BRIDGSTONES", ap:"27.709", descricao:"PEGADA", fornecedor:"LE MONSTER", competencia:"2025-08", valor_fornecedor:44000.00, honorario_percent:10, honorario_reais:4400.00, total:48400.00, status:"Realizado" },
  // SHOPEE
  { cliente:"SHOPEE", descricao:"CLOSED CAPTION CAMPANHA 8.8", fornecedor:"INTERNO", competencia:"2025-08", valor_fornecedor:0.00, honorario_percent:0, honorario_reais:4500.00, total:4500.00, status:"Realizado" },
  // BYD
  { cliente:"BYD", ap:"27.723", descricao:'REGISTRO ANCINE__RAKING_1X30" VEICULAÇÃO: TODAS AS MIDIAS_NACIONAL_PERÍODO: 12 MESES', fornecedor:"RAIZ STUDIO", competencia:"2025-08", valor_fornecedor:9605.00, honorario_percent:0, honorario_reais:0.00, total:9605.00, status:"Realizado" },
  { cliente:"BYD", descricao:"LOCUÇÃO E REGRAVAÇÃO", fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-08", valor_fornecedor:11000.00, honorario_percent:0, honorario_reais:0.00, total:11000.00, status:"Realizado" },
  { cliente:"BYD", descricao:"ANIMAÇÃO DE LETREIRO", fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-08", valor_fornecedor:9895.00, honorario_percent:0, honorario_reais:9895.00, total:19790.00, status:"Realizado" },
  { cliente:"BYD", ap:"27.788", descricao:"COMPRA DE IMAGEM: IDs 2389551123, 2458824295, 2057307713, 2195004687", fornecedor:"SHUTTERSTOCK", competencia:"2025-08", valor_fornecedor:4600.00, honorario_percent:0, honorario_reais:0.00, total:4600.00, status:"Realizado" },
  { cliente:"BYD", ap:"27.866", descricao:"VAREJO SONG PRO 0105", fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-08", valor_fornecedor:14000.00, honorario_percent:0, honorario_reais:0.00, total:14000.00, status:"Realizado" },
  { cliente:"BYD", ap:"27.866", descricao:"VAREJO SONG PRO 0105", fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-08", valor_fornecedor:26000.00, honorario_percent:0, honorario_reais:26000.00, total:52000.00, status:"Realizado" },
  { cliente:"BYD", ap:"27.870", descricao:"DOLPHIN MINI | FILME EMERSON", fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-08", valor_fornecedor:14000.00, honorario_percent:0, honorario_reais:0.00, total:14000.00, status:"Realizado" },
  { cliente:"BYD", ap:"27.870", descricao:"DOLPHIN MINI | FILME EMERSON", fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-08", valor_fornecedor:15500.00, honorario_percent:0, honorario_reais:15500.00, total:31000.00, status:"Realizado" },
  { cliente:"BYD", ap:"27.894", descricao:"REGISTRO ANCINE | FILME DOLPHIN MINI", fornecedor:"CUSTO INTERNO", competencia:"2025-08", valor_fornecedor:4466.26, honorario_percent:0, honorario_reais:0.00, total:4466.26, status:"Realizado" },
  { cliente:"BYD", ap:"27.901", descricao:"COMPRA DE IMAGEM ID: 1308231094", fornecedor:"GETTY IMAGES", competencia:"2025-08", valor_fornecedor:3000.00, honorario_percent:0, honorario_reais:0.00, total:3000.00, status:"Realizado" },
  { cliente:"BYD", ap:"27.902", descricao:"COMPRA DE IMAGEM ID: 3549650059", fornecedor:"SHUTTERSTOCK", competencia:"2025-08", valor_fornecedor:1273.00, honorario_percent:0, honorario_reais:0.00, total:1273.00, status:"Realizado" },
]

/* Setembro/2025 */
const septemberItems: FinanceItem[] = [
  { cliente:"BYD", ap:"28.186", descricao:'BYD SONG PRO - varejo 30" versão 2 de 5', fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:14000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.189", descricao:'BYD SONG PRO - varejo 5" versão 3 de 5', fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:10000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.190", descricao:"VAREJO SONG PRO 0405", fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:10500.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.190", descricao:"VAREJO SONG PRO 0405", fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:9500.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.096", descricao:"AP referente ao custo de compra de imagens na Shutterstock (links na planilha)", fornecedor:"SHUTTERSTOCK", competencia:"2025-09", total:4600.00, status:"Realizado", links:"https://www.shutterstock.com/pt/image-photo/young-brunette-woman-wearing-casual-clothes-1955711983 | https://www.shutterstock.com/pt/image-photo/image-happy-young-business-woman-posing-1215373642 | https://www.shutterstock.com/pt/image-photo/young-woman-looking-camera-smiling-african-1845716596 | https://www.shutterstock.com/pt/image-photo/close-portrait-young-cheerful-beautful-girl-1483850369" },
  { cliente:"BYD", ap:"28.106", descricao:"REGISTRO ANCINE | BYD - Dolphin Mini 2026", fornecedor:"INTERNO", competencia:"2025-09", total:5550.22, status:"Realizado" },
  { cliente:"BYD", ap:"28.192", descricao:"ANIMAÇÃO DE LETREIRO", fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:25999.78, status:"Realizado" },
  { cliente:"BYD", ap:"28.192", descricao:"01 trilha composta de 30” com vocal + reduções", fornecedor:"ANTFOOD", competencia:"2025-09", total:65000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.116", descricao:"COMPRA DE IMAGEM: ID 1701646153", fornecedor:"SHUTTERSTOCK", competencia:"2025-09", total:1150.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.124", descricao:'"DENZA - CAMPANHA - LANÇAMENTO NO BRASIL" COMPRA DE IMAGEM: 2287137241', fornecedor:"SHUTTERSTOCK", competencia:"2025-09", total:1150.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.129", descricao:'REGISTRO CONDECINE_INSTITUCIONAL 1x30" – 12 meses – todas as mídias', fornecedor:"02 FILMES", competencia:"2025-09", total:5583.00, status:"Realizado" },
  { cliente:"BYD", descricao:"Locutor voz + adaptação de trilha (Satelite)", fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:14000.00, status:"Realizado" },
  { cliente:"BYD", descricao:"Edição, letterings e animação de letreiros", fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:26000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.127", descricao:"BYD | SONG PLUS | FILME MARINA RUY", fornecedor:"MELANINA FILMES", competencia:"2025-09", total:17359.51, status:"Realizado" },
  { cliente:"BYD", descricao:"BYD | SONG PLUS | FILME MARINA RUY", fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:0.00, status:"Realizado" },
  { cliente:"BYD", descricao:"BYD | SONG PLUS | FILME MARINA RUY", fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:0.00, status:"Realizado" },
  { cliente:"BYD", descricao:"BYD - SATISFAÇÃO", fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:14000.00, status:"Realizado" },
  { cliente:"BYD", descricao:"BYD - SATISFAÇÃO", fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:26000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.267", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:14000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.267", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:26000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.268", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:14000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.268", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:26000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.271", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:22000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.271", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:26000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.272", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:8500.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.272", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:11500.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.273", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:14000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.273", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:6000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.274", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:8500.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.274", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:11500.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.275", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"SUBSOUND AUDIO PRODUÇÕES LTDA", competencia:"2025-09", total:14000.00, status:"Realizado" },
  { cliente:"BYD", ap:"28.275", descricao:'Custo de locução + trilha adaptada + edição, letterings e motion (30")', fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:26000.00, status:"Realizado" },
  { cliente:"BYD FROTA", ap:"28.278", descricao:'PRODUÇÃO DE 6 VINHETAS de 5" do pacote Seleção Globo (montagem, cenas BYD + fábrica O2, sem áudio)', fornecedor:"MONALISA STUDIO LTDA.", competencia:"2025-09", total:35000.00, status:"Realizado" },
  // EMS (pacotões)
  { cliente:"EMS", ap:"28.034", descricao:"REPOFLOR / BENG PRO / CALADRYL – pacote de filmes", fornecedor:"BOILER FILMES", competencia:"2025-09", total:1342000.00, status:"Realizado" },
  { cliente:"EMS", ap:"28.034", descricao:"REPOFLOR / BENG PRO / CALADRYL – pacote de filmes", fornecedor:"CANJA", competencia:"2025-09", total:126000.00, status:"Realizado" },
  { cliente:"EMS", ap:"28.034", descricao:"REPOFLOR / BENG PRO / CALADRYL – mockups e efeitos", fornecedor:"MOCKUP10 PRODUÇÕES E EFEITOS ESPECIAIS EIRELI-ME", competencia:"2025-09", total:3700.00, status:"Realizado" },
  { cliente:"EMS", ap:"28.034", descricao:"REPOFLOR / BENG PRO / CALADRYL – áudio/trilha", fornecedor:"BUMBLEBEAT - CREATIVE AUDIO HIVE", competencia:"2025-09", total:28000.00, status:"Realizado" },
  { cliente:"EMS", ap:"28.034", descricao:"Monitoramento remoto – 2 diárias de filmagem", fornecedor:"BOILER FILMES", competencia:"2025-09", total:6000.00, status:"Realizado" },
  // Outros clientes
  { cliente:"SHOPEE", descricao:"CAMPANHA 10.10 – TVC – envio de material", fornecedor:"INTERNO", competencia:"2025-09", total:3600.00, status:"Realizado" },
  { cliente:"BRIDGESTONE", ap:"28.006", descricao:"FIRESTONE – IA/Locução – todas mídias – 12 meses – digital", fornecedor:"CANJA", competencia:"2025-09", total:20300.00, status:"Realizado" },
  { cliente:"BRIDGESTONE", ap:"28.007", descricao:"FIRESTONE – IA/Locução – todas mídias – 12 meses – digital", fornecedor:"INTERNO", competencia:"2025-09", total:2300.00, status:"Realizado" },
  { cliente:"LOJAS TORRA", ap:"28258", descricao:"Closed Caption – filme Dia das Crianças", fornecedor:"INTERNO", competencia:"2025-09", total:900.00, status:"Realizado" },
  { cliente:"NOVIBET", ap:"28041", descricao:"Tradução (custo absorvido)", fornecedor:"GIOVANNI", competencia:"2025-09", total:4100.00, status:"Realizado" },
  { cliente:"WE", ap:"28123", descricao:"Tradução apresentação WE (custo absorvido)", fornecedor:"GIOVANNI", competencia:"2025-09", total:3500.00, status:"Realizado" },
]

/* ============================================================================
 * AGREGAÇÃO POR MÊS
 * ========================================================================== */
function buildMonth(items: FinanceItem[], key: string): MonthSummary {
  const label = monthLabel(key)
  const eventos = items.length
  const byClientMap = new Map<string, { total:number, honor:number, eventos:number }>()
  const bySupplierMap = new Map<string, { total:number, eventos:number }>()

  let repasse=0, honor=0, total=0
  for (const it of items) {
    const h = calcHonorario(it)
    const r = calcRepasse(it)
    repasse += r
    honor   += h
    total   += (it.total ?? (r + h))

    const c = byClientMap.get(it.cliente) || { total:0, honor:0, eventos:0 }
    c.total += (it.total ?? (r + h))
    c.honor += h
    c.eventos += 1
    byClientMap.set(it.cliente, c)

    const s = bySupplierMap.get(it.fornecedor) || { total:0, eventos:0 }
    s.total += r || it.total || 0 // melhor proxy de spend do fornecedor = repasse
    s.eventos += 1
    bySupplierMap.set(it.fornecedor, s)
  }

  const byClient = Array.from(byClientMap.entries()).map(([cliente, agg]) => ({
    cliente, total: agg.total, honorario: agg.honor, eventos: agg.eventos
  })).sort((a,b)=> b.total - a.total)

  const bySupplierRaw = Array.from(bySupplierMap.entries()).map(([fornecedor, agg]) => ({
    fornecedor, total: agg.total, eventos: agg.eventos
  })).sort((a,b)=> b.total - a.total)
  const bySupplier = bySupplierRaw.map(s => ({
    ...s,
    pct: total ? (s.total / total) * 100 : 0
  }))

  return {
    key,
    label,
    fornecedor: repasse,
    honorario: honor,
    total,
    eventos,
    clientesAtivos: byClient.length,
    byClient,
    bySupplier,
    items
  }
}

/* ============================================================================
 * COMPONENTES: KPI CARD
 * ========================================================================== */
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
    <Card className={highlight ? "border-primary/30" : "glass-effect"}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${highlight ? "text-primary" : ""}`}>
          {icon}{label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>
          {typeof value === "number" && currency ? brl(value) : value}
        </div>
        {delta !== null ? (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {positive ? (
              <>
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +{Math.abs(delta).toFixed(1)}% vs período anterior
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                -{Math.abs(delta).toFixed(1)}% vs período anterior
              </>
            )}
          </div>
        ) : <div className="text-xs text-muted-foreground mt-1">—</div>}
      </CardContent>
    </Card>
  )
}

/* ============================================================================
 * PÁGINA
 * ========================================================================== */
export default function Finance() {
  const months = useMemo(() => [
    buildMonth(augustItems,  "2025-08"),
    buildMonth(septemberItems,"2025-09"),
  ], [])

  const [idx, setIdx] = useState(() => Math.max(0, months.length - 1))
  const [comparePrev, setComparePrev] = useState(true)

  useEffect(() => {
    setIdx((i) => Math.min(Math.max(0, i), Math.max(0, months.length - 1)))
  }, [months.length])

  const period = months[idx]
  const prev   = months[idx - 1]

  // KPIs
  const ticketCliente = period ? (period.total / Math.max(1, period.clientesAtivos)) : 0
  const ticketJob = period ? (period.total / Math.max(1, period.eventos)) : 0
  const margemRS = period ? (period.total - period.fornecedor) : 0
  const margemPct = period?.total ? (margemRS / period.total) * 100 : 0

  // gráficos
  const evolution = months.map(m => ({
    label: m.label, total: m.total, fornecedor: m.fornecedor, honorario: m.honorario
  }))
  const compareBars = [
    { metric: "Total",       atual: period?.total || 0,       anterior: prev?.total || 0 },
    { metric: "Fornecedor",  atual: period?.fornecedor || 0,  anterior: prev?.fornecedor || 0 },
    { metric: "Honorário",   atual: period?.honorario || 0,   anterior: prev?.honorario || 0 },
    { metric: "Margem",      atual: margemRS,                 anterior: prev ? (prev.total - prev.fornecedor) : 0 },
  ]
  const pieClients = (period?.byClient || []).slice(0,8).map((c,i) => ({
    name: c.cliente,
    value: c.total,
    color: [
      "hsl(var(--primary))","hsl(var(--chart-2))","hsl(var(--chart-3))",
      "hsl(var(--chart-4))","hsl(var(--chart-5))","hsl(var(--chart-6))",
      "hsl(var(--chart-7))","hsl(var(--chart-8))"
    ][i % 8]
  }))

  const goPrev = () => setIdx(i => Math.max(0, i-1))
  const goNext = () => setIdx(i => Math.min(months.length-1, i+1))

  // Destaques (resumo executivo simples)
  const maiorCliente = period?.byClient?.[0]
  const maiorFornecedor = period?.bySupplier?.[0]

  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho preto com logo e dados */}
      <div className="w-full bg-black text-white print:bg-black print:text-white">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* coloque /public/we-logo-white.png; se não tiver, deixa vazio por enquanto */}
          <img src="/we-logo-white.png" alt="WE" className="h-8 w-auto print:invert-0" />
          <div className="text-xs opacity-80 text-right leading-tight">
            WF/MOTTA COMUNICACAO, MARKETING E PUBLICIDADE LTDA · CNPJ 05.265.118/0001-65<br />
            R. Chilon, 381 – Vila Olímpia, São Paulo – SP, 04552-030
          </div>
        </div>
      </div>

      {/* Barra (sticky) */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-3 flex flex-wrap items-center gap-2 justify-between">
          <div>
            <h1 className="text-2xl font-bold">Relatório Financeiro Mensal de Marketing</h1>
            <p className="text-muted-foreground">Comparativo entre meses e anexo detalhado por AP</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goPrev} disabled={idx===0}><ChevronLeft className="h-4 w-4" /></Button>

            <Select value={period?.label} onValueChange={(v) => {
              const i = months.findIndex(m => m.label === v)
              if (i >= 0) setIdx(i)
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Mês/Ano" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.key} value={m.label}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={goNext} disabled={idx===months.length-1}><ChevronRight className="h-4 w-4" /></Button>

            <div className="flex items-center gap-2 pl-3">
              <Switch id="comparePrev" checked={comparePrev} onCheckedChange={setComparePrev} />
              <label htmlFor="comparePrev" className="text-sm">Comparar mês anterior</label>
            </div>

            <Button variant="outline" onClick={() => window.print()} className="ml-2">
              <Printer className="h-4 w-4 mr-2" /> Exportar PDF
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const rows = [
                  ["Mês", period?.label ?? "-"],
                  ["Total", brl(period?.total || 0)],
                  ["Fornecedor", brl(period?.fornecedor || 0)],
                  ["Honorários", brl(period?.honorario || 0)],
                  ["Margem (R$)", brl(margemRS)],
                  ["Margem (%)", `${margemPct.toFixed(1)}%`],
                  ["Jobs", String(period?.eventos || 0)],
                  ["Clientes", String(period?.clientesAtivos || 0)],
                ]
                const csv = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(";")).join("\n")
                const a = document.createElement("a")
                a.href = encodeURI(csv)
                a.download = `relatorio_${period?.key}.csv`
                a.click()
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Resumo executivo */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Resumo executivo – {period?.label}</CardTitle>
            <CardDescription>KPIs do mês e variação vs. mês anterior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard label="Valor Fornecedor" value={period?.fornecedor || 0} prevValue={prev?.fornecedor} icon={<DollarSign className="h-4 w-4" />} />
              <Card className="glass-effect">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" /> Honorários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{brl(period?.honorario || 0)}</div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {period?.total ? `${((period.honorario/period.total)*100).toFixed(1)}%` : "—"} média
                    </Badge>
                    {prev ? (
                      (pctDelta(period?.honorario, prev.honorario) ?? 0) >= 0 ? (
                        <span className="flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                          {`${(pctDelta(period?.honorario, prev.honorario) ?? 0).toFixed(1)}%`}
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                          {`${Math.abs(pctDelta(period?.honorario, prev.honorario) ?? 0).toFixed(1)}%`}
                        </span>
                      )
                    ) : <span>—</span>}
                  </div>
                </CardContent>
              </Card>
              <KpiCard label="Total Geral" value={period?.total || 0} prevValue={prev?.total} icon={<DollarSign className="h-4 w-4 text-primary" />} highlight />
              <KpiCard label="Jobs" value={period?.eventos || 0} prevValue={prev?.eventos} icon={<FileIcon />} currency={false} />
              <KpiCard label="Clientes" value={period?.clientesAtivos || 0} prevValue={prev?.clientesAtivos} icon={<UsersIcon />} currency={false} />
              <KpiCard label="Ticket/Cliente" value={ticketCliente} prevValue={prev ? (prev.total/Math.max(1,prev.clientesAtivos)) : undefined} icon={<Calendar className="h-4 w-4" />} />
              <KpiCard label="Ticket/Job" value={ticketJob} prevValue={prev ? (prev.total/Math.max(1,prev.eventos)) : undefined} icon={<Calendar className="h-4 w-4" />} />
              <KpiCard label="Margem (R$)" value={margemRS} prevValue={prev ? (prev.total - prev.fornecedor) : undefined} icon={<DollarSign className="h-4 w-4" />} />
              <KpiCard label="Margem (%)" value={`${margemPct.toFixed(1)}%`} prevValue={undefined} icon={<DollarSign className="h-4 w-4" />} currency={false} />
            </div>

            {/* Bullets de destaque */}
            <div className="mt-6 text-sm space-y-1">
              <div>• Maior cliente do mês: {maiorCliente ? `${maiorCliente.cliente} (${brl(maiorCliente.total)})` : "—"}</div>
              <div>• Maior spend em fornecedor: {maiorFornecedor ? `${maiorFornecedor.fornecedor} (${brl(maiorFornecedor.total)})` : "—"}</div>
              <div>• Ponto de atenção: garantir documentação ANCINE/Condecine e licenças (quando aplicável).</div>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Evolução por mês</CardTitle>
              <CardDescription>Receita, Fornecedor e Honorários</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(v:number)=>brl(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="fornecedor" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Fornecedor" />
                  <Line type="monotone" dataKey="honorario" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Honorário" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Comparativo {period?.label}{prev ? ` × ${prev.label}` : ""}</CardTitle>
              <CardDescription>Total, Fornecedor, Honorários e Margem</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={compareBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(v:number)=>brl(v)} />
                  <Legend />
                  <Bar dataKey="atual" name="Mês atual" fill="hsl(var(--primary))" />
                  {comparePrev && <Bar dataKey="anterior" name="Mês anterior" fill="hsl(var(--chart-2))" />}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Distribuição por Cliente */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Participação por cliente – {period?.label}</CardTitle>
            <CardDescription>Receita por cliente (Top 8)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieClients}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={110}
                  dataKey="value"
                >
                  {pieClients.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(v:number)=>brl(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance por cliente */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Performance por cliente – {period?.label}</CardTitle>
            <CardDescription>Receita, custos, honorários, margem e jobs</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Receita</th>
                  <th className="py-2 pr-3">Custos (Fornecedor)</th>
                  <th className="py-2 pr-3">Honorários</th>
                  <th className="py-2 pr-3">Margem (R$)</th>
                  <th className="py-2 pr-3">Margem (%)</th>
                  <th className="py-2 pr-3">Jobs</th>
                  <th className="py-2 pr-3">Ticket médio (job)</th>
                </tr>
              </thead>
              <tbody>
                {(period?.byClient || []).map(c => {
                  // aproximações por rateio proporcional
                  const rateioFornecedor = (period?.fornecedor || 0) * (c.total / Math.max(1, period?.total || 0))
                  const margemR = c.total - rateioFornecedor
                  const margemP = c.total ? (margemR / c.total) * 100 : 0
                  return (
                    <tr key={c.cliente} className="border-t border-border/50">
                      <td className="py-2 pr-3">{c.cliente}</td>
                      <td className="py-2 pr-3">{brl(c.total)}</td>
                      <td className="py-2 pr-3">{brl(rateioFornecedor)}</td>
                      <td className="py-2 pr-3">{brl(c.honorario)}</td>
                      <td className="py-2 pr-3">{brl(margemR)}</td>
                      <td className="py-2 pr-3">{margemP.toFixed(1)}%</td>
                      <td className="py-2 pr-3">{c.eventos}</td>
                      <td className="py-2 pr-3">{brl(c.total/Math.max(1,c.eventos))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top fornecedores (spend) */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Top fornecedores – {period?.label}</CardTitle>
            <CardDescription>Spend do mês (proxy = repasse) e participação</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Fornecedor</th>
                  <th className="py-2 pr-3">Jobs</th>
                  <th className="py-2 pr-3">Spend</th>
                  <th className="py-2 pr-3">% do total</th>
                </tr>
              </thead>
              <tbody>
                {(period?.bySupplier || []).slice(0,8).map(s => (
                  <tr key={s.fornecedor} className="border-t border-border/50">
                    <td className="py-2 pr-3">{s.fornecedor}</td>
                    <td className="py-2 pr-3">{s.eventos}</td>
                    <td className="py-2 pr-3">{brl(s.total)}</td>
                    <td className="py-2 pr-3">{s.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Anexo: detalhamento por AP (tudo o que foi faturado) */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Anexo – Itens faturados ({period?.label})</CardTitle>
            <CardDescription>Detalhamento linha a linha</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">AP</th>
                  <th className="py-2 pr-3">Descrição</th>
                  <th className="py-2 pr-3">Fornecedor</th>
                  <th className="py-2 pr-3">Valor fornecedor</th>
                  <th className="py-2 pr-3">Honorário (R$)</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Competência</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Links</th>
                </tr>
              </thead>
              <tbody>
                {(period?.items || []).map((it, i) => {
                  const rep = calcRepasse(it)
                  const hon = calcHonorario(it)
                  return (
                    <tr key={i} className="border-t border-border/50 align-top">
                      <td className="py-2 pr-3">{it.cliente}</td>
                      <td className="py-2 pr-3">{it.ap || "—"}</td>
                      <td className="py-2 pr-3 min-w-[280px]">{it.descricao}</td>
                      <td className="py-2 pr-3">{it.fornecedor}</td>
                      <td className="py-2 pr-3">{brl(rep)}</td>
                      <td className="py-2 pr-3">{brl(hon)}</td>
                      <td className="py-2 pr-3">{brl(it.total)}</td>
                      <td className="py-2 pr-3">{it.competencia}</td>
                      <td className="py-2 pr-3">{it.status || "—"}</td>
                      <td className="py-2 pr-3">
                        {it.links ? it.links.split("|").map((l,idx)=>
                          <a key={idx} href={l.trim()} target="_blank" rel="noreferrer" className="underline block max-w-[260px] truncate">
                            {l.trim()}
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Rodapé / metodologia */}
        <div className="text-xs text-muted-foreground mt-8">
          Critério: Competência. Fórmulas: Receita = soma dos Totais; Custos diretos = soma dos repasses (Valor fornecedor);
          Honorário = base × % ou Total − Fornecedor; Margem = Receita − Custos; Margem% = Margem ÷ Receita.
          Itens pro bono/absorvidos estão identificados.
        </div>
      </div>
    </div>
  )
}

/* Ícones simples para KPI extras (evita importar muitos) */
function FileIcon() { return <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="2"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2"/></svg>}
function UsersIcon() { return <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/></svg>}
