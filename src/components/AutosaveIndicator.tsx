import React, { memo } from 'react'
import { Check, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutosaveIndicatorProps {
  status: AutosaveStatus
  className?: string
}

export const AutosaveIndicator = memo(function AutosaveIndicator({ 
  status, 
  className 
}: AutosaveIndicatorProps) {
  const statusConfig = {
    idle: {
      icon: Clock,
      text: 'Aguardando...',
      className: 'text-muted-foreground'
    },
    saving: {
      icon: Loader2,
      text: 'Salvando...',
      className: 'text-primary animate-spin'
    },
    saved: {
      icon: Check,
      text: 'Salvo',
      className: 'text-success'
    },
    error: {
      icon: Clock,
      text: 'Erro ao salvar',
      className: 'text-destructive'
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={cn(
      'flex items-center gap-2 text-xs transition-all duration-200',
      config.className,
      className
    )}>
      <Icon className="h-3 w-3" />
      <span>{config.text}</span>
    </div>
  )
})