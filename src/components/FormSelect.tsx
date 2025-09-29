import React, { memo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Option {
  value: string
  label: string
}

interface FormSelectProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  required?: boolean
}

export const FormSelect = memo(function FormSelect({ 
  id, 
  label, 
  value, 
  onChange, 
  options, 
  placeholder = 'Selecione uma opção',
  required = false 
}: FormSelectProps) {
  const handleValueChange = React.useCallback((newValue: string) => {
    onChange(newValue)
  }, [onChange])

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="dark-label text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="dark-input focus-ring">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="dark-form-bg border-border/30 z-50 bg-background">
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="text-foreground hover:bg-muted focus:bg-muted"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})