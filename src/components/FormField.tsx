import { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  help?: string;
  children: ReactNode;
  className?: string;
}

export default function FormField({ label, help, children, className = "" }: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block">
        <span className="text-sm font-medium text-foreground/90 mb-2 block">{label}</span>
        {children}
      </label>
      {help && (
        <p className="text-xs text-muted-foreground">{help}</p>
      )}
    </div>
  );
}