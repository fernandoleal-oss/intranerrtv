import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  emoji?: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ 
  icon: Icon, 
  emoji,
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed border-2 border-border/50 bg-transparent", className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-6">
          {emoji ? (
            <span className="text-4xl">{emoji}</span>
          ) : Icon ? (
            <Icon className="h-8 w-8 text-muted-foreground" />
          ) : null}
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
        {action && (
          <Button onClick={action.onClick} className="btn-gradient">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}