import { cn } from '@/lib/utils'

interface StepperProps {
  step: number
  steps: string[]
}

export function Stepper({ step, steps }: StepperProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={cn(
            'h-8 w-8 rounded-full text-sm flex items-center justify-center border font-medium transition-all',
            i + 1 <= step 
              ? 'bg-white text-black border-white shadow-sm' 
              : 'bg-transparent text-white/70 border-white/30'
          )}>
            {i + 1}
          </div>
          <span className={cn(
            'text-sm font-medium',
            i + 1 <= step ? 'text-white' : 'text-white/60'
          )}>
            {label}
          </span>
          {i < steps.length - 1 && (
            <div className={cn(
              'w-10 h-px transition-colors',
              i + 1 < step ? 'bg-white/50' : 'bg-white/20'
            )} />
          )}
        </div>
      ))}
    </div>
  )
}