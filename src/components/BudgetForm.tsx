import React, { memo, useCallback, useEffect } from 'react'
import { FormInput } from '@/components/FormInput'
import { FormSelect } from '@/components/FormSelect'
import { FormTextarea } from '@/components/FormTextarea'
import { ClientProductAutocomplete } from '@/components/ClientProductAutocomplete'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AutosaveIndicator } from '@/components/AutosaveIndicator'
import { useAutosaveWithStatus } from '@/hooks/useAutosaveWithStatus'
import { useBudget } from '@/contexts/BudgetContext'
import { supabase } from '@/integrations/supabase/client'
import { Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BudgetFormProps {
  budgetId?: string
  versionId?: string
  budgetType: 'filme' | 'audio' | 'imagem' | 'cc'
}

const midiaOptions = [
  { value: 'tv', label: 'TV' },
  { value: 'digital', label: 'Digital' },
  { value: 'ooh', label: 'OOH (Out of Home)' },
  { value: 'radio', label: 'Rádio' },
  { value: 'tv_digital', label: 'TV + Digital' },
  { value: 'all_media', label: 'Todas as Mídias' },
  { value: 'outro', label: 'Outro' }
]

const territorioOptions = [
  { value: 'nacional', label: 'Nacional' },
  { value: 'sao_paulo', label: 'São Paulo' },
  { value: 'rio_janeiro', label: 'Rio de Janeiro' },
  { value: 'sudeste', label: 'Sudeste' },
  { value: 'sul', label: 'Sul' },
  { value: 'nordeste', label: 'Nordeste' },
  { value: 'regional', label: 'Regional' },
  { value: 'outro', label: 'Outro' }
]

const periodoOptions = [
  { value: '6_meses', label: '6 meses' },
  { value: '12_meses', label: '12 meses' },
  { value: '18_meses', label: '18 meses' },
  { value: '24_meses', label: '24 meses' },
  { value: '36_meses', label: '36 meses' },
  { value: 'perpetuo', label: 'Perpétuo' },
  { value: 'outro', label: 'Outro' }
]

const adaptacoesOptions = [
  { value: 'sem_adaptacao', label: 'Sem adaptação' },
  { value: 'cut_down', label: 'Cut down (versões menores)' },
  { value: 'formatos_sociais', label: 'Formatos para redes sociais' },
  { value: 'versao_radio', label: 'Versão para rádio' },
  { value: 'versao_digital', label: 'Versão para digital' },
  { value: 'multiplos_formatos', label: 'Múltiplos formatos' }
]

export const BudgetForm = memo(function BudgetForm({ 
  budgetId, 
  versionId, 
  budgetType 
}: BudgetFormProps) {
  const { state, dispatch, setFormField, calculateTotals } = useBudget()
  const { form } = state
  const { toast } = useToast()

  // Função de salvamento manual
  const handleManualSave = useCallback(async () => {
    try {
      if (versionId) {
        const { error } = await supabase
          .from('versions')
          .update({ 
            payload: form as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', versionId)
        
        if (error) throw error
        
        toast({
          title: 'Salvo com sucesso',
          description: 'As alterações foram salvas.',
        })
      }
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive'
      })
    }
  }, [versionId, form, toast])

  // Autosave com status visual
  const { status, saveNow } = useAutosaveWithStatus([form], handleManualSave, 1000)

  // Carregar dados iniciais do orçamento
  useEffect(() => {
    const loadInitialData = async () => {
      if (versionId) {
        const { data } = await supabase
          .from('versions')
          .select('payload')
          .eq('id', versionId)
          .single()
        
        if (data?.payload && typeof data.payload === 'object') {
          dispatch({ type: 'SET_FORM', payload: data.payload as any })
        }
      }
    }
    
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId])

  // Recalcular totais quando dados relevantes mudarem
  useEffect(() => {
    calculateTotals()
  }, [form.filme, form.audio, form.imagem, form.cc, calculateTotals])

  // Handlers memoizados para evitar re-renders
  const handleIdentificacaoChange = useCallback((field: string, value: string) => {
    setFormField(`identificacao.${field}`, value)
  }, [setFormField])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveNow()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [saveNow])

  return (
    <div className="space-y-6 form-container">
      {/* Header Sticky com Salvar e Autosave */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border py-4 -mx-6 px-6 mb-6">
        <div className="flex items-center justify-between">
          <AutosaveIndicator status={status} />
          <Button
            onClick={handleManualSave}
            className="btn-gradient gap-2"
            size="default"
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Identificação do Orçamento */}
      <Card className="dark-card">
        <CardHeader>
          <CardTitle className="text-foreground">Identificação do Orçamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <ClientProductAutocomplete
              type="client"
              label="Cliente"
              value={form.identificacao.cliente}
              onChange={(value) => handleIdentificacaoChange('cliente', value)}
              required
            />
            
            <ClientProductAutocomplete
              type="product"
              label="Produto"
              value={form.identificacao.produto}
              onChange={(value) => handleIdentificacaoChange('produto', value)}
              required
            />
            
            <FormInput
              id="job"
              label="Job"
              value={form.identificacao.job}
              onChange={(value) => handleIdentificacaoChange('job', value)}
              placeholder="Código ou nome do job"
              required
            />
            
            <FormSelect
              id="midias"
              label="Mídias"
              value={form.identificacao.midias}
              onChange={(value) => handleIdentificacaoChange('midias', value)}
              options={midiaOptions}
              placeholder="Selecione as mídias"
              required
            />
            
            <FormSelect
              id="territorio"
              label="Território"
              value={form.identificacao.territorio}
              onChange={(value) => handleIdentificacaoChange('territorio', value)}
              options={territorioOptions}
              placeholder="Selecione o território"
              required
            />
            
            <FormSelect
              id="periodo"
              label="Período"
              value={form.identificacao.periodo}
              onChange={(value) => handleIdentificacaoChange('periodo', value)}
              options={periodoOptions}
              placeholder="Selecione o período"
              required
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <FormTextarea
              id="entregaveis"
              label="Entregáveis"
              value={form.identificacao.entregaveis}
              onChange={(value) => handleIdentificacaoChange('entregaveis', value)}
              placeholder="Descreva os entregáveis do projeto..."
              rows={3}
            />
            
            <FormSelect
              id="adaptacoes"
              label="Adaptações de Formatos"
              value={form.identificacao.adaptacoes}
              onChange={(value) => handleIdentificacaoChange('adaptacoes', value)}
              options={adaptacoesOptions}
              placeholder="Selecione as adaptações necessárias"
            />
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <FormInput
              id="data_orcamento"
              label="Data do Orçamento"
              type="date"
              value={form.identificacao.data_orcamento}
              onChange={(value) => handleIdentificacaoChange('data_orcamento', value)}
              required
            />
            
            <FormInput
              id="exclusividade_elenco"
              label="Exclusividade de Elenco"
              value={form.identificacao.exclusividade_elenco}
              onChange={(value) => handleIdentificacaoChange('exclusividade_elenco', value)}
              placeholder="Ex: 12 meses, Nacional, etc."
            />
            
            <FormInput
              id="audio"
              label="Áudio"
              value={form.identificacao.audio}
              onChange={(value) => handleIdentificacaoChange('audio', value)}
              placeholder="Ex: Trilha + Locução + Mix"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resumo Visual dos Totais */}
      <Card className="dark-card border-primary/20">
        <CardHeader>
          <CardTitle className="text-foreground">Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Subtotal</div>
              <div className="text-lg font-semibold text-foreground">
                R$ {form.totais.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Impostos</div>
              <div className="text-lg font-semibold text-foreground">
                R$ {form.totais.impostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Taxas</div>
              <div className="text-lg font-semibold text-foreground">
                R$ {form.totais.taxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Honorários</div>
              <div className="text-lg font-semibold text-foreground">
                R$ {form.totais.honorarios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-sm text-muted-foreground">Total Geral</div>
              <div className="text-xl font-bold text-primary">
                R$ {form.totais.total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})