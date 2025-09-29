import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Eye, FileText } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'

interface Budget {
  id: string
  display_id: string
  type: string
  status: string
  updated_at: string
  total_value?: number
  has_data: boolean
}

export function RecentBudgets() {
  const navigate = useNavigate()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentBudgets()
  }, [])

  const fetchRecentBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          id,
          display_id,
          type,
          status,
          updated_at,
          versions!inner(payload, total_geral)
        `)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const formattedBudgets = data?.map((budget: any) => ({
        id: budget.id,
        display_id: budget.display_id,
        type: budget.type,
        status: budget.status,
        updated_at: budget.updated_at,
        total_value: budget.versions?.[0]?.total_geral || 0,
        has_data: budget.versions?.[0]?.payload && Object.keys(budget.versions[0].payload).length > 0
      })) || []

      setBudgets(formattedBudgets)
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'rascunho':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'enviado':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'aprovado':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  if (loading) {
    return (
      <Card className="dark-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="h-5 w-5" />
            Histórico Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white/10 h-16 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dark-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Clock className="h-5 w-5" />
          Histórico Recente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {budgets.length === 0 ? (
          <p className="text-white/60 text-center py-4">Nenhum orçamento encontrado</p>
        ) : (
          budgets.map((budget) => (
            <div key={budget.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{budget.display_id}</span>
                  <Badge variant="outline" className={getStatusColor(budget.status)}>
                    {budget.status}
                  </Badge>
                  {budget.has_data && (
                    <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-500/10">
                      ✓ Dados
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-white/70">
                  {budget.type?.toUpperCase()} • {new Date(budget.updated_at).toLocaleDateString('pt-BR')}
                  {budget.total_value > 0 && (
                    <span className="ml-2 font-medium text-green-400">
                      {formatCurrency(budget.total_value)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/budget/${budget.id}/pdf`)}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  title="Ver PDF"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/budget/${budget.id}/edit`)}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  title="Editar"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}