import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'rascunho':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30'
      case 'enviado':
      case 'enviado_atendimento':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'
      case 'aprovado':
        return 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
      case 'rejeitado':
        return 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
      case 'em_andamento':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'rascunho': return 'Rascunho'
      case 'enviado': return 'Enviado'
      case 'enviado_atendimento': return 'Em Atendimento'
      case 'aprovado': return 'Aprovado'
      case 'rejeitado': return 'Rejeitado'
      case 'em_andamento': return 'Em Andamento'
      default: return status || 'Indefinido'
    }
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        getStatusStyles(status), 
        "text-xs font-medium transition-colors",
        className
      )}
    >
      {getStatusLabel(status)}
    </Badge>
  )
}