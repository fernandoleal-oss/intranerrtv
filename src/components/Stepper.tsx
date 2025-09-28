interface StepperProps {
  step: number;
  steps: string[];
  onStepClick?: (step: number) => void;
}

export const Stepper = ({ step, steps, onStepClick }: StepperProps) => {
  return (
    <div className="w-full mb-8">
      <div className="glass-effect rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-4">
          {steps.map((stepName, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === step;
            const isCompleted = stepNumber < step;
            
            return (
              <div key={stepName} className="flex items-center gap-3">
                <button
                  onClick={() => onStepClick?.(stepNumber)}
                  disabled={!onStepClick}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow scale-110"
                      : isCompleted
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {stepNumber}
                </button>
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {stepName}
                </span>
                {index < steps.length - 1 && (
                  <div className={`h-px w-8 transition-all duration-300 ${
                    stepNumber < step ? "bg-primary" : "bg-border"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};