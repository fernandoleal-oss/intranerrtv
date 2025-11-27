import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, FileText } from 'lucide-react'
import { ImageQuickForm } from '@/components/budget/ImageQuickForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ImageData {
  produtor?: string
  email?: string
  cliente?: string
  produto?: string
  midias?: string
  banco?: string
  assets?: string
  observacoes?: string
  producer?: {
    name?: string
    email?: string
  }
}

export default function NovaImagem() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  
  // Check if we're editing an existing budget
  const editData = location.state?.editData as ImageData | undefined
  const existingBudgetId = location.state?.budgetId as string | undefined
  
  const [budgetId, setBudgetId] = useState<string | null>(existingBudgetId || null)
  const [isSaving, setIsSaving] = useState(false)
  const [initialFormData, setInitialFormData] = useState<any>(null)

  // Load edit data on mount
  useEffect(() => {
    if (editData) {
      setInitialFormData({
        producer: {
          name: editData.produtor || editData.producer?.name || '',
          email: editData.email || editData.producer?.email || ''
        },
        cliente: editData.cliente || '',
        produto: editData.produto || '',
        midias: editData.midias || '',
        banco: editData.banco || '',
        assets: editData.assets || '',
        observacoes: editData.observacoes || ''
      })
    }
  }, [editData])

  const isEditing = !!existingBudgetId

  const handleSave = async (formData: any) => {
    setIsSaving(true)
    try {
      // Criar payload
      const payload = {
        type: 'imagem',
        produtor: formData.producer.name,
        email: formData.producer.email,
        cliente: formData.cliente,
        produto: formData.produto,
        midias: formData.midias,
        banco: formData.banco,
        assets: formData.assets,
        observacoes: formData.observacoes || ''
      }

      if (isEditing && budgetId) {
        // Update existing budget - create new version
        const { data: versions } = await supabase
          .from('versions')
          .select('versao')
          .eq('budget_id', budgetId)
          .order('versao', { ascending: false })
          .limit(1)

        const nextVersao = versions && versions.length > 0 ? versions[0].versao + 1 : 1

        const { error: versionError } = await supabase
          .from('versions')
          .insert([{ 
            budget_id: budgetId, 
            versao: nextVersao, 
            payload: payload,
            total_geral: 0
          }])

        if (versionError) throw versionError

        toast({ 
          title: 'Orçamento atualizado com sucesso!', 
          description: `Nova versão ${nextVersao} criada.`
        })

        // Navegar para PDF
        navigate(`/budget/${budgetId}/pdf`)
      } else {
        // Create new budget
        const { data: budgetData, error: createError } = await supabase
          .from('budgets')
          .insert([{ type: 'imagem', status: 'rascunho' }])
          .select('id, display_id')
          .single()

        if (createError) throw createError

        // Criar versão com o payload
        const { error: versionError } = await supabase
          .from('versions')
          .insert([{ 
            budget_id: budgetData.id, 
            versao: 1, 
            payload: payload,
            total_geral: 0
          }])

        if (versionError) throw versionError

        setBudgetId(budgetData.id)
        toast({ 
          title: 'Orçamento criado com sucesso!', 
          description: `ID: ${budgetData.display_id}` 
        })

        // Navegar para PDF
        navigate(`/budget/${budgetData.id}/pdf`)
      }
    } catch (error: any) {
      console.error('Erro ao criar orçamento:', error)
      toast({ 
        title: 'Erro ao criar orçamento', 
        description: error.message || 'Tente novamente', 
        variant: 'destructive' 
      })
    } finally {
      setIsSaving(false)
    }
  }

  // If editing and we haven't loaded the data yet, show loading
  if (isEditing && !initialFormData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-white">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {isEditing ? 'Editar Orçamento - Imagem' : 'Orçamento de Imagem'}
              </h1>
              <p className="text-white/70">
                {isEditing ? 'Modifique os dados e salve as alterações' : 'Preencha os dados do orçamento de imagem'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <ImageQuickForm 
            onSave={handleSave} 
            initialData={initialFormData}
            submitLabel={isEditing ? "Salvar e Gerar PDF" : "Criar Orçamento"}
          />
        </motion.div>
      </div>
    </div>
  )
}