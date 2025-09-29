import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { 
  Film, 
  Headphones, 
  Image, 
  Subtitles,
  Plus,
  Search,
  Settings,
  LogOut,
  Filter,
  Calendar,
  Users,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/integrations/supabase/client'
import AnimatedCard from '@/components/AnimatedCard'

interface Campaign {
  id: string
  name: string
  status: 'rascunho' | 'enviado_atendimento' | 'aprovado'
  client_name: string
  product_name: string
  responsible_name: string
  updated_at: string
  budget_count: number
  total_value: number
}

interface DashboardStats {
  total_campaigns: number
  active_budgets: number
  approved_value: number
  pending_approval: number
}

export default function Home() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    total_campaigns: 0,
    active_budgets: 0,
    approved_value: 0,
    pending_approval: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch campaigns with related data
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          status,
          updated_at,
          clients!inner(name),
          products!inner(name),
          profiles!inner(name),
          budgets(id)
        `)
        .order('updated_at', { ascending: false })
        .limit(10)

      const processedCampaigns = campaignsData?.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        client_name: campaign.clients.name,
        product_name: campaign.products.name,
        responsible_name: campaign.profiles.name || 'N/A',
        updated_at: campaign.updated_at,
        budget_count: campaign.budgets?.length || 0,
        total_value: campaign.budgets?.length * 50000 || 0 // Placeholder calculation
      })) || []

      setCampaigns(processedCampaigns)

      // Calculate stats
      const totalCampaigns = campaignsData?.length || 0
      const activeBudgets = processedCampaigns.reduce((sum, c) => sum + c.budget_count, 0)
      const approvedValue = processedCampaigns
        .filter(c => c.status === 'aprovado')
        .reduce((sum, c) => sum + c.total_value, 0)
      const pendingApproval = processedCampaigns.filter(c => c.status === 'enviado_atendimento').length

      setStats({
        total_campaigns: totalCampaigns,
        active_budgets: activeBudgets,
        approved_value: approvedValue,
        pending_approval: pendingApproval
      })
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const budgetTypes = [
    {
      id: 'filme',
      title: 'Produção de Filme',
      description: 'Cotações com múltiplas produtoras, comparador e honorários',
      icon: Film,
      gradient: 'from-blue-500 to-purple-600',
      path: '/new/filme'
    },
    {
      id: 'audio',
      title: 'Produção de Áudio', 
      description: 'Serviços de áudio com trilha, locução e spots',
      icon: Headphones,
      gradient: 'from-green-500 to-teal-600',
      path: '/new/audio'
    },
    {
      id: 'imagem',
      title: 'Compra de Imagem',
      description: 'Parser automático para Shutterstock, Getty Images e personalizados',
      icon: Image,
      gradient: 'from-orange-500 to-red-600', 
      path: '/new/imagem'
    },
    {
      id: 'cc',
      title: 'Closed Caption',
      description: 'R$ 900 por versão - Legendas acessíveis',
      icon: Subtitles,
      gradient: 'from-purple-500 to-pink-600',
      path: '/new/cc'
    }
  ]

  const getStatusBadge = (status: string) => {
    const variants = {
      rascunho: 'secondary',
      enviado_atendimento: 'default',
      aprovado: 'success'
    }
    
    const labels = {
      rascunho: 'Rascunho',
      enviado_atendimento: 'Enviado', 
      aprovado: 'Aprovado'
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] as any} className="text-xs">
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">WE</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Orçamento de Produção</h1>
                <p className="text-sm text-muted-foreground">RTV WE</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {profile?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Button>
              )}
              
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile?.name || profile?.email}`} />
                  <AvatarFallback>{profile?.name?.[0] || profile?.email?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-foreground">{profile?.name || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Campanhas Ativas</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_campaigns}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Orçamentos</p>
                  <p className="text-2xl font-bold text-foreground">{stats.active_budgets}</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Film className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor Aprovado</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(stats.approved_value)}</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aguardando Aprovação</p>
                  <p className="text-2xl font-bold text-warning">{stats.pending_approval}</p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-foreground"
            >
              Criar Novo Orçamento
            </motion.h2>
            <p className="text-muted-foreground text-lg">
              Escolha o tipo de produção para começar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {budgetTypes.map((type, index) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AnimatedCard
                  onClick={() => navigate(type.path)}
                  className="group cursor-pointer glass-card hover-lift h-full"
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${type.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                      <type.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {type.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {type.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6">
                    <Button className="w-full gap-2 btn-gradient">
                      <Plus className="w-4 h-4" />
                      Começar
                    </Button>
                  </CardContent>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Campaigns Dashboard */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-foreground">Campanhas Recentes</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => navigate('/budgets')}
              >
                <Filter className="w-4 h-4" />
                Ver Histórico
              </Button>
            </div>
          </div>

          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-muted-foreground">Campanha</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Produto</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Orçamentos</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Total</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Responsável</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-8 text-muted-foreground">
                          Nenhuma campanha encontrada
                        </td>
                      </tr>
                    ) : (
                      campaigns
                        .filter(campaign => 
                          campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          campaign.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          campaign.product_name.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((campaign) => (
                          <tr 
                            key={campaign.id} 
                            className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => navigate(`/campaign/${campaign.id}`)}
                          >
                            <td className="p-4">
                              <div className="font-medium text-foreground">{campaign.name}</div>
                            </td>
                            <td className="p-4 text-muted-foreground">{campaign.client_name}</td>
                            <td className="p-4 text-muted-foreground">{campaign.product_name}</td>
                            <td className="p-4">{getStatusBadge(campaign.status)}</td>
                            <td className="p-4 text-muted-foreground">{campaign.budget_count}</td>
                            <td className="p-4 font-medium text-foreground">
                              {formatCurrency(campaign.total_value)}
                            </td>
                            <td className="p-4 text-muted-foreground">{campaign.responsible_name}</td>
                            <td className="p-4 text-muted-foreground">{formatDate(campaign.updated_at)}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}