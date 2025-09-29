import React, { memo, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface FormTextareaProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  rows?: number
  onBlur?: () => void
}

export const FormTextarea = memo(function FormTextarea({ 
  id, 
  label, 
  value, 
  onChange, 
  placeholder = '',
  required = false,
  rows = 3,
  onBlur
}: FormTextareaProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.persist() // Ensure event doesn't get pooled
    onChange(e.target.value)
  }, [onChange])

  const handleBlur = useCallback(() => {
    onBlur?.()
  }, [onBlur])

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="dark-label text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className="dark-input focus-ring resize-none"
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  )
})