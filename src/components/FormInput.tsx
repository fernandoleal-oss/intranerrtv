import React, { memo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FormInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  autoComplete?: string
}

export const FormInput = memo(function FormInput({ 
  id, 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder = '',
  required = false,
  autoComplete = 'off'
}: FormInputProps) {
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.persist() // Ensure event doesn't get pooled
    onChange(e.target.value)
  }, [onChange])

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="dark-label text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        className="dark-input focus-ring"
        placeholder={placeholder}
        autoComplete={autoComplete}
        spellCheck={false}
      />
    </div>
  )
})