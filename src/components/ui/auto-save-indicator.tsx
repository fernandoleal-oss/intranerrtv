import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutoSaveIndicatorProps {
  status: SaveStatus
  lastSaved?: Date
  className?: string
}

export function AutoSaveIndicator({ status, lastSaved, className }: AutoSaveIndicatorProps) {
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    if (status !== 'idle') {
      setShowIndicator(true)
      
      if (status === 'saved') {
        const timer = setTimeout(() => setShowIndicator(false), 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [status])

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: Clock,
          text: 'Salvando...',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10 border-blue-500/20'
        }
      case 'saved':
        return {
          icon: CheckCircle,
          text: 'Salvo automaticamente',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10 border-green-500/20'
        }
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Erro ao salvar',
          color: 'text-red-400',
          bgColor: 'bg-red-500/10 border-red-500/20'
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config || !showIndicator) return null

  const Icon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-md',
          config.bgColor,
          className
        )}
      >
        <Icon className={cn('h-4 w-4', config.color)} />
        <span className={cn('text-sm font-medium', config.color)}>
          {config.text}
        </span>
        {lastSaved && status === 'saved' && (
          <span className="text-xs text-muted-foreground ml-2">
            {lastSaved.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  )
}