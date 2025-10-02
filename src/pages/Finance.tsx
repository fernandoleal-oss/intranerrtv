// src/pages/OrcamentoNovo.tsx
import { useState, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Save, FileText, Plus, Trash2, Eye, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

type BudgetType = "filme" | "audio" | "imagem" | "cc"

interface QuoteFilm {
  id: string
  produtora: string
  escopo: string
  valor: number
  diretor: string
  tratamento: string
  desconto: number
}

interface BudgetData {
  type: BudgetType
  produtor?: string
  email?: string
  cliente?: string
  produto?: string
  job?: string
  midias?: string
  territorio?: string
  periodo?: string
  quotes_film?: QuoteFilm[]
  honorario_perc?: number
  total: number
  pendente_faturamento?: boolean
}

const parseCurrency = (val: string): number => {
  if (!val) return 0
  const clean = val.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
  return parseFloat(clean) || 0
}

const money = (n: number | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0)

export default function OrcamentoNovo() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [data, setData] = useState<BudgetData>({
    type: "filme",
    quotes_film: [],
    honorario_perc: 0,
    total: 0,
    pendente_faturamento: false,
  })

  const updateData = useCallback((updates: Partial<BudgetData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  // Recalcular totais
  useEffect(() => {
    const filmSubtotal = (data.quotes_film || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0)
    const honorario = filmSubtotal * ((data.honorario_perc || 0) / 100)
    const total = filmSubtotal + honorario
    setData((prev) => ({ ...prev, total }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.quotes_film, data.honorario_perc])

  const addQuote = () => {
    const newQuote: QuoteFilm = {
      id: crypto.randomUUID(),
      produtora: "",
      escopo: "",
      valor: 0,
      diretor: "",
      tratamento: "",
      desconto: 0,
    }
    updateData({ quotes_film: [...(data.quotes_film || []), newQuote] })
  }

  const updateQuote = (id: string, updates: Partial<QuoteFilm>) => {
    const updated = (data.quotes_film || []).map((q) => (q.id === id ? { ...q, ...updates } : q))
    updateData({ quotes_film: updated })
  }

  const removeQuote = (id: string) => {
    updateData({ quotes_film: (data.quotes_film || []).filter((q) => q.id !== id) })
  }

  /**
   * Salva usando um único RPC:
   * create_budget_full_rpc(type, payload, total)
   */
  const handleSave = async (goToPdf = true) => {
    if (!data.cliente || !data.produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload = { ...data } // inclui pendente_faturamento no payload

      const { data: created, error } = (await supabase.rpc("create_budget_full_rpc" as any, {
        p_type_text: data.type,
        p_payload: payload,
        p_total: data.total ?? 0,
      })) as { data: { id: string; display_id: string; version_id: string } | null; error: any }

      if (error || !created) {
        throw new Error(error?.message ?? "Falha ao criar orçamento")
      }

      toast({ title: "Orçamento salvo com sucesso!" })
      if (goToPdf) navigate(`/budget/${created.id}/pdf`)
    } catch (err: any) {
      console.error("[save-budget] error:", err)
      const msg =
        err?.message ||
        err?.details ||
        err?.hint ||
        (typeof err === "object" ? JSON.stringify(err) : String(err)) ||
        "Falha ao salvar. Verifique o RPC."
      toast({ title: "Erro ao salvar orçamento", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const filmSubtotal = (data.quotes_film || []).reduce((s, q) => s + (q.valor - (q.desconto || 0)), 0)
  const honorValue = (filmSubtotal * (data.honorario_perc || 0)) / 100

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/orcamentos")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                Novo Orçamento {data.type ? `- ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}` : ""}
              </h1>
              <p className="text-neutral-400">Preencha os dados e visualize em tempo real</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving} className="gap-2">
              <Eye className="h-4 w-4" />
              Visualizar Preview
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} className="gap-2">
              {saving ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar e Gerar PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Instruções */}
        <Card className="mb-6 border-neutral-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-400">
              <AlertCircle className="h-5 w-5" />
              Instruções de Preenchimento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-300 space-y-1">
            <p>• <b>Cliente</b> e <b>Produto</b>: Campos obrigatórios para identificação do orçamento.</p>
            <p>• <b>Cotações</b>: Adicione todas as produtoras cotadas com valores e descontos.</p>
            <p>• <b>Honorário</b>: Percentual aplicado sobre o subtotal das cotações.</p>
            <p>• <b>Preview</b>: O PDF mostra o logo da WE em fundo preto e destaca quando marcado como <b>pendente de faturamento</b>.</p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-neutral-800">
              <CardHeader>
                <CardTitle>Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={data.type} onValueChange={(v) => updateData({ type: v as BudgetType })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filme">Filme</SelectItem>
                        <SelectItem value="audio">Áudio</SelectItem>
                        <SelectItem value="imagem">Imagem</SelectItem>
                        <SelectItem value="cc">Closed Caption</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Produtor</Label>
                    <Input
                      value={data.produtor || ""}
                      onChange={(e) => updateData({ produtor: e.target.value })}
                      placeholder="Nome do produtor"
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={data.email || ""}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-800">
              <CardHeader>
                <CardTitle>Cliente & Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente *</Label>
                    <Input
                      value={data.cliente || ""}
                      onChange={(e) => updateData({ cliente: e.target.value })}
                      placeholder="Nome do cliente"
                      required
                    />
                  </div>
                  <div>
                    <Label>Produto *</Label>
                    <Input
                      value={data.produto || ""}
                      onChange={(e) => updateData({ produto: e.target.value })}
                      placeholder="Nome do produto"
                      required
                    />
                  </div>
                  <div>
                    <Label>Job</Label>
                    <Input value={data.job || ""} onChange={(e) => updateData({ job: e.target.value })} />
                  </div>
                  <div>
                    <Label>Mídias</Label>
                    <Input value={data.midias || ""} onChange={(e) => updateData({ midias: e.target.value })} />
                  </div>
                  <div>
                    <Label>Território</Label>
                    <Input value={data.territorio || ""} onChange={(e) => updateData({ territorio: e.target.value })} />
                  </div>
                  <div>
                    <Label>Período</Label>
                    <Input value={data.periodo || ""} onChange={(e) => updateData({ periodo: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cotações</CardTitle>
                <Button size="sm" variant="outline" onClick={addQuote} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data.quotes_film || []).map((q) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4 space-y-3 border-neutral-800"
                  >
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <Label>Produtora</Label>
                        <Input
                          value={q.produtora}
                          onChange={(e) => updateQuote(q.id, { produtora: e.target.value })}
                          placeholder="Nome da produtora"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Escopo</Label>
                        <Input
                          value={q.escopo}
                          onChange={(e) => updateQuote(q.id, { escopo: e.target.value })}
                          placeholder="Descrição detalhada da proposta"
                        />
                      </div>

                      <div>
                        <Label>Diretor</Label>
                        <Input value={q.diretor} onChange={(e) => updateQuote(q.id, { diretor: e.target.value })} />
                      </div>
                      <div>
                        <Label>Tratamento</Label>
                        <Input
                          value={q.tratamento}
                          onChange={(e) => updateQuote(q.id, { tratamento: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          inputMode="decimal"
                          value={q.valor ? String(q.valor) : ""}
                          onChange={(e) => updateQuote(q.id, { valor: parseCurrency(e.target.value) })}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label>Desconto (R$)</Label>
                        <Input
                          inputMode="decimal"
                          value={q.desconto ? String(q.desconto) : ""}
                          onChange={(e) => updateQuote(q.id, { desconto: parseCurrency(e.target.value) })}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeQuote(q.id)}
                          className="text-red-500 gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {(!data.quotes_film || data.quotes_film.length === 0) && (
                  <div className="text-sm text-neutral-500">Nenhuma cotação adicionada.</div>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-neutral-800">
                <CardHeader>
                  <CardTitle>Honorário</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label>Percentual de Honorário (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={data.honorario_perc || 0}
                    onChange={(e) => updateData({ honorario_perc: parseFloat(e.target.value) || 0 })}
                  />
                </CardContent>
              </Card>

              <Card className="border-neutral-800">
                <CardHeader>
                  <CardTitle>Faturamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="pendente_faturamento"
                      checked={!!data.pendente_faturamento}
                      onCheckedChange={(checked) => updateData({ pendente_faturamento: Boolean(checked) })}
                    />
                    <div>
                      <Label htmlFor="pendente_faturamento">Marcar como pendente de faturamento</Label>
                      <p className="text-xs text-neutral-400">
                        O PDF exibirá “PENDENTE DE FATURAMENTO” e este orçamento deverá entrar no próximo faturamento.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card className="border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.pendente_faturamento && (
                    <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-xs px-2 py-1 inline-block">
                      PENDENTE DE FATURAMENTO
                    </div>
                  )}

                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Cliente:</span>
                      <span className="font-medium">{data.cliente || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Produto:</span>
                      <span className="font-medium">{data.produto || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Cotações:</span>
                      <span className="font-medium">{data.quotes_film?.length || 0}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="text-sm font-semibold mb-2">Resumo Financeiro</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Subtotal Cotações:</span>
                        <span>{money(filmSubtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Honorário ({data.honorario_perc || 0}%):</span>
                        <span>{money(honorValue)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-2 border-t">
                        <span>Total:</span>
                        <span className="text-primary">{money(data.total)}</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full gap-2" onClick={() => handleSave(true)} disabled={saving}>
                    <Eye className="h-4 w-4" /> Visualizar PDF
                  </Button>
                  <Button className="w-full gap-2" onClick={() => handleSave(true)} disabled={saving}>
                    <Save className="h-4 w-4" /> Salvar e Gerar PDF
                  </Button>
                </CardContent>
              </Card>

              <Card className="mt-4 border-neutral-800">
                <CardHeader>
                  <CardTitle className="text-sm">Dicas</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-neutral-400 space-y-1">
                  <p>• Use descrições claras no escopo das cotações.</p>
                  <p>• Confira descontos e honorários antes de salvar.</p>
                  <p>• O logo da WE será inserido automaticamente no PDF.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
