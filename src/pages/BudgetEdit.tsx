import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/FormInput'
import { FormSelect } from '@/components/FormSelect'
import { LoadingState } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save, Eye, FileText, AlertCircle } from 'lucide-react'
import { useAutosave } from '@/hooks/useAutosave'

interface BudgetData {
  id: string
  display_id: string
  type: string
  status: string
  payload: any
  version_id: string
}

export default function BudgetEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BudgetData | null>(null)
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    if (id) {
      fetchBudget()
    }
  }, [id])

  // Auto-save with debounce
  useAutosave([formData], () => {
    if (data?.version_id && Object.keys(formData).length > 0) {
      saveBudget(false)
    }
  })

  const fetchBudget = async () => {
    try {
      const { data: budget, error } = await supabase
        .from('versions')
        .select(`
          id,
          payload,
          budgets!inner(
            id,
            display_id,
            type,
            status
          )
        `)
        .eq('budget_id', id)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (budget) {
        const budgetData = {
          id: budget.budgets.id,
          display_id: budget.budgets.display_id,
          type: budget.budgets.type,
          status: budget.budgets.status,
          payload: budget.payload || {},
          version_id: budget.id
        }
        setData(budgetData)
        setFormData(budget.payload || {})
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o orçamento',
        variant: 'destructive'
      })
      navigate('/budgets')
    } finally {
      setLoading(false)
    }
  }

  const saveBudget = async (showToast = true) => {
    if (!data?.version_id) return

    try {
      const { error } = await supabase
        .from('versions')
        .update({ 
          payload: formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.version_id)

      if (error) throw error

      if (showToast) {
        toast({
          title: 'Salvo',
          description: 'Orçamento salvo com sucesso'
        })
      }
    } catch (error) {
      if (showToast) {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar o orçamento',
          variant: 'destructive'
        })
      }
    }
  }

  const updateFormData = (path: string, value: any) => {
    setFormData((prev: any) => {
      const keys = path.split('.')
      const newData = { ...prev }
      let current = newData

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }

      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  // Remove função renderField não utilizada mais

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-8">
          <LoadingState message="Carregando orçamento..." />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-8">
          <EmptyState
            icon={AlertCircle}
            title="Orçamento não encontrado"
            description="O orçamento que você está procurando não existe ou foi removido."
            action={{
              label: "Voltar para Lista",
              onClick: () => navigate('/budgets')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/budgets')}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Editar Orçamento</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-white/70">{data.display_id}</p>
                <StatusBadge status={data.status} />
                <span className="text-white/50 text-sm capitalize">• {data.type}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => navigate(`/budget/${data.id}/pdf`)}
              variant="outline"
              className="text-white border-white/20 hover:bg-white/10 gap-2"
            >
              <FileText className="h-4 w-4" />
              Ver PDF
            </Button>
            <Button
              onClick={() => saveBudget(true)}
              className="btn-gradient gap-2"
            >
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📋</span> Informações Básicas
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormInput
                  id="produtor"
                  label="Produtor"
                  value={formData.produtor || ''}
                  onChange={(value) => updateFormData('produtor', value)}
                  placeholder="Nome do produtor"
                />
                
                <FormInput
                  id="email"
                  label="E-mail"
                  type="email"
                  value={formData.email || ''}
                  onChange={(value) => updateFormData('email', value)}
                  placeholder="email@exemplo.com"
                />
                
                <FormInput
                  id="cliente"
                  label="Cliente"
                  value={formData.cliente || ''}
                  onChange={(value) => updateFormData('cliente', value)}
                  placeholder="Nome do cliente"
                />
                
                <FormInput
                  id="produto"
                  label="Produto"
                  value={formData.produto || ''}
                  onChange={(value) => updateFormData('produto', value)}
                  placeholder="Nome do produto"
                />
              </div>
            </div>

            {/* Type-specific fields */}
            {data.type === 'filme' && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🎬</span> Detalhes do Filme
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormInput
                    id="job"
                    label="Job"
                    value={formData.job || ''}
                    onChange={(value) => updateFormData('job', value)}
                    placeholder="Descrição do job"
                  />
                  
                  <FormInput
                    id="midias"
                    label="Mídias"
                    value={formData.midias || ''}
                    onChange={(value) => updateFormData('midias', value)}
                    placeholder="TV, Digital, etc."
                  />
                  
                  <FormInput
                    id="territorio"
                    label="Território"
                    value={formData.territorio || ''}
                    onChange={(value) => updateFormData('territorio', value)}
                    placeholder="Nacional, Regional, etc."
                  />
                  
                  <FormInput
                    id="periodo"
                    label="Período"
                    value={formData.periodo || ''}
                    onChange={(value) => updateFormData('periodo', value)}
                    placeholder="12 meses, 6 meses, etc."
                  />
                </div>
              </div>
            )}

            {data.type === 'audio' && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🎵</span> Detalhes do Áudio
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormInput
                    id="tipo_audio"
                    label="Tipo de Áudio"
                    value={formData.tipo_audio || ''}
                    onChange={(value) => updateFormData('tipo_audio', value)}
                    placeholder="Locução, Jingle, etc."
                  />
                  
                  <FormInput
                    id="duracao"
                    label="Duração"
                    value={formData.duracao || ''}
                    onChange={(value) => updateFormData('duracao', value)}
                    placeholder="30s, 60s, etc."
                  />
                  
                  <FormInput
                    id="meio_uso"
                    label="Meio de Uso"
                    value={formData.meio_uso || ''}
                    onChange={(value) => updateFormData('meio_uso', value)}
                    placeholder="Rádio, TV, Digital"
                  />
                  
                  <FormInput
                    id="praca"
                    label="Praça"
                    value={formData.praca || ''}
                    onChange={(value) => updateFormData('praca', value)}
                    placeholder="Nacional, Regional"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Preview/Summary */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Preview dos Dados</h3>
              <div className="space-y-2 text-sm">
                <pre className="text-white/70 whitespace-pre-wrap overflow-auto max-h-96 bg-black/20 p-4 rounded">
                  {JSON.stringify(formData, null, 2)}
                </pre>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Status do Orçamento</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/70">Status:</span>
                  <span className="text-white font-medium">{data.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Tipo:</span>
                  <span className="text-white font-medium capitalize">{data.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">ID:</span>
                  <span className="text-white font-medium">{data.display_id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}