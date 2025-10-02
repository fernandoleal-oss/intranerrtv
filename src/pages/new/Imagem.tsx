import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import { ImageQuickForm } from '@/components/budget/ImageQuickForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NovaImagem() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [budgetId, setBudgetId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (formData: any) => {
    setIsSaving(true)
    try {
      // Criar orçamento com payload
      const payload = {
        produtor: formData.producer.name,
        email: formData.producer.email,
        cliente: formData.cliente,
        produto: formData.produto,
        midias: formData.midias,
        banco: formData.banco,
        assets: formData.assets,
        observacoes: formData.observacoes || ''
      }

      // Criar o orçamento básico primeiro
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

      // Navegar para visualização
      setTimeout(() => {
        navigate(`/budget/${budgetData.id}`)
      }, 1500)
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
            <h1 className="text-3xl font-bold text-white">Orçamento de Imagem</h1>
          </div>
        </div>

        {/* Main Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          {!budgetId ? (
            <ImageQuickForm onSave={handleSave} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Orçamento Criado com Sucesso!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Seu orçamento de imagem foi criado. Você será redirecionado automaticamente...
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => navigate(`/budget/${budgetId}`)} className="flex-1">
                    Ver Orçamento
                  </Button>
                  <Button onClick={() => navigate(`/budget/${budgetId}/pdf`)} variant="outline" className="flex-1">
                    Ver PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
