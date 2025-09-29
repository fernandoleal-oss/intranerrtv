import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Eye, Edit, FileText, Calendar, DollarSign, Search, Plus, Filter } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Budget {
  id: string
  display_id: string
  type: string
  status: string
  created_at: string
  updated_at: string
  total_value?: number
  client_name?: string
  product_name?: string
}

export default function BudgetList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          id,
          display_id,
          type,
          status,
          created_at,
          updated_at,
          versions!inner(total_geral),
          campaigns(
            clients(name),
            products(name)
          )
        `)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const formattedBudgets = data?.map(budget => ({
        id: budget.id,
        display_id: budget.display_id,
        type: budget.type,
        status: budget.status,
        created_at: budget.created_at,
        updated_at: budget.updated_at,
        total_value: budget.versions?.[0]?.total_geral || 0,
        client_name: budget.campaigns?.clients?.name,
        product_name: budget.campaigns?.products?.name
      })) || []

      setBudgets(formattedBudgets)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os orçamentos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'rascunho': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'enviado': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'aprovado': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'rejeitado': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'filme': return '🎬'
      case 'audio': return '🎵'
      case 'imagem': return '🖼️'
      case 'cc': return '📝'
      default: return '📄'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-8">
          <LoadingState message="Carregando orçamentos..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Meus Orçamentos</h1>
            <p className="text-white/70">Histórico e gerenciamento de orçamentos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
              <Input
                placeholder="Buscar orçamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 dark-input"
              />
            </div>
            <Button 
              onClick={() => navigate('/')} 
              className="btn-gradient gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Orçamento
            </Button>
          </div>
        </div>

        {budgets.filter(budget => 
          budget.display_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          budget.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          budget.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          budget.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
        ).length === 0 ? (
          <EmptyState
            emoji="📋"
            title={searchTerm ? "Nenhum resultado encontrado" : "Nenhum orçamento encontrado"}
            description={searchTerm ? "Tente buscar com outros termos" : "Crie seu primeiro orçamento para começar"}
            action={{
              label: searchTerm ? "Limpar busca" : "Criar Primeiro Orçamento",
              onClick: () => searchTerm ? setSearchTerm('') : navigate('/')
            }}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets
              .filter(budget => 
                budget.display_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                budget.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                budget.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                budget.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((budget, index) => (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getTypeIcon(budget.type)}</span>
                        <div>
                          <CardTitle className="text-white text-lg">{budget.display_id}</CardTitle>
                          <p className="text-white/60 text-sm capitalize">{budget.type}</p>
                        </div>
                      </div>
                      <StatusBadge status={budget.status} />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {(budget.client_name || budget.product_name) && (
                      <div className="space-y-1">
                        {budget.client_name && (
                          <p className="text-white/80 text-sm">
                            <strong>Cliente:</strong> {budget.client_name}
                          </p>
                        )}
                        {budget.product_name && (
                          <p className="text-white/80 text-sm">
                            <strong>Produto:</strong> {budget.product_name}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-white/60 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(budget.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      {budget.total_value && budget.total_value > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(budget.total_value)}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/budget/${budget.id}`)}
                        className="flex-1 text-white border-white/20 hover:bg-white/10"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/budget/${budget.id}/edit`)}
                        className="flex-1 text-white border-white/20 hover:bg-white/10"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/budget/${budget.id}/pdf`)}
                        className="text-white border-white/20 hover:bg-white/10"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}