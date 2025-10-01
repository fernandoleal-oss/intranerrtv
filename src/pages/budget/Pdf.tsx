// src/pages/budget/Pdf.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'

type Payload = Record<string, any>

type View = {
  budgetId: string
  displayId: string
  type: string
  status: string
  createdAt: string
  payload: Payload
}

const fmt = (v?: any) => (v == null || v === '' ? '—' : String(v))
const money = (n: number | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0)

export default function PdfView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [logoOk, setLogoOk] = useState<boolean | null>(null);

  const [view, setView] = useState<View | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from('versions')
          .select(`
            id,
            payload,
            created_at,
            budgets!inner(
              id,
              display_id,
              type,
              status,
              created_at
            )
          `)
          .eq('budget_id', id)
          .order('versao', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error || !data) throw error || new Error('Orçamento não encontrado')

        const payload: Payload = (data.payload as Payload) || {}
        setView({
          budgetId: data.budgets.id,
          displayId: data.budgets.display_id,
          type: data.budgets.type,
          status: data.budgets.status,
          createdAt: data.budgets.created_at,
          payload,
        })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="text-muted-foreground">Gerando PDF…</div>
      </div>
    )
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="space-y-4 text-center">
          <div className="text-xl font-semibold">Orçamento não encontrado</div>
          <Button onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" /> Início
          </Button>
        </div>
      </div>
    )
  }

  const p = view.payload
  const total = p.total ?? 0

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Barra de ações (não aparece na impressão) */}
      <div className="sticky top-0 z-10 bg-white border-b p-3 flex items-center gap-2 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button variant="outline" onClick={() => navigate('/')}>
          <Home className="w-4 h-4 mr-2" /> Início
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {view.displayId} • {view.type.toUpperCase()} • {view.status}
        </div>
        <Button className="ml-3" onClick={() => window.print()}>Imprimir / PDF</Button>
      </div>

      {/* Cabeçalho corporativo */}
      {/* Cabeçalho corporativo (preto com logo WE + dados da WE) */}
<div className="px-10 pt-10">
  <div className="rounded-2xl overflow-hidden border">
    <div className="bg-black text-white p-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src="/brand/we-white.png"
          alt="WE"
          className="h-10 w-auto"
          onLoad={() => setLogoOk(true)}
          onError={(e) => { setLogoOk(false); (e.currentTarget.style.display = 'none'); }}
        />
        <span className="text-xl font-bold">WE</span>
      </div>
      <div className="text-right">
        <div className="text-lg font-semibold">Orçamento #{view.displayId}</div>
        <div className="text-xs opacity-80">
          {new Date(view.createdAt).toLocaleDateString('pt-BR')}
        </div>
      </div>
    </div>

    {/* DADOS DA WE (sempre visíveis abaixo da faixa preta) */}
    <div className="p-6 text-sm leading-relaxed">
      <div className="font-semibold">
        WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA
      </div>
      <div>
        Endereço: Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP: 04552-030
      </div>
      {/* Se quiser reexibir CNPJ depois, descomente a linha abaixo */}
      {/* <div>CNPJ: 05.265.118/0001-65</div> */}
    </div>
  </div>
</div>


      {/* Resumo financeiro */}
      <div className="px-10 pt-6">
        <div className="rounded-2xl border p-6">
          <div className="text-lg font-semibold mb-4">Resumo Financeiro</div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="border rounded-xl p-4">
              <div className="text-muted-foreground">Filme (subtotal)</div>
              <div className="font-medium">{money(p?.filme?.subtotal)}</div>
            </div>
            <div className="border rounded-xl p-4">
              <div className="text-muted-foreground">Áudio (subtotal)</div>
              <div className="font-medium">{money(p?.audio?.subtotal)}</div>
            </div>
            <div className="border rounded-xl p-4">
              <div className="text-muted-foreground">Total Geral</div>
              <div className="font-semibold text-primary">{money(total)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Observações / termos (SEM INSTRUÇÕES DE FATURAMENTO até aprovar) */}
      <div className="px-10 py-8">
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div className="rounded-2xl border p-6">
            <div className="font-semibold mb-2">Observações</div>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Validade do orçamento: 7 dias a partir da emissão.</li>
              <li>Usos e prazos condicionados à aprovação e disponibilidade.</li>
            </ul>
          </div>

          <div className="rounded-2xl border p-6">
            <div className="font-semibold mb-2">Termos e Condições</div>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Alterações de escopo podem gerar nova versão.</li>
              <li>Conforme mídias, território e período informados neste orçamento.</li>
            </ul>
          </div>

          {view.status?.toLowerCase() === 'aprovado' && (
            <div className="rounded-2xl border p-6 md:col-span-2">
              <div className="font-semibold mb-2">Instruções para Faturamento</div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Enviar Nota Fiscal para: checking@we.com.br</li>
                <li>Constar número da AP/OC no corpo da Nota Fiscal</li>
                <li>Dados bancários corretos e atualizados</li>
                <li>Condições de pagamento: conforme acordado (30/45/60 dias)</li>
                <li>Dúvidas: departamento financeiro</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
