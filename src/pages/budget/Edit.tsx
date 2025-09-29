import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { BudgetForm } from '@/components/BudgetForm'
import { BudgetProvider } from '@/contexts/BudgetContext'
import { LoadingState } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, FileText, Home, AlertCircle } from 'lucide-react'

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

  useEffect(() => {
    if (id) {
      fetchBudget()
    }
  }, [id])

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
      } else {
        throw new Error('Orçamento não encontrado')
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o orçamento',
        variant: 'destructive'
      })
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

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
              label: "Voltar para Início",
              onClick: () => navigate('/')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <BudgetProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                size="sm"
                className="nav-button gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
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
                onClick={() => navigate('/')}
                variant="outline"
                className="nav-button gap-2"
              >
                <Home className="h-4 w-4" />
                Início
              </Button>
              <Button
                onClick={() => navigate(`/budget/${data.id}/pdf`)}
                className="btn-gradient gap-2"
              >
                <FileText className="h-4 w-4" />
                Ver PDF
              </Button>
            </div>
          </motion.div>

          {/* Form Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <BudgetForm 
              budgetId={data.id}
              versionId={data.version_id}
              budgetType={data.type as any}
            />
          </motion.div>
        </div>
      </div>
    </BudgetProvider>
  )
}