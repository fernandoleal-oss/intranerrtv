import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutocompleteOption {
  id: string
  name: string
}

interface ClientProductAutocompleteProps {
  type: 'client' | 'product'
  value: string
  onChange: (value: string) => void
  label: string
  required?: boolean
  clientId?: string // Para produtos, filtrar por cliente
}

export const ClientProductAutocomplete = React.memo(function ClientProductAutocomplete({
  type,
  value,
  onChange,
  label,
  required = false,
  clientId
}: ClientProductAutocompleteProps) {
  const [options, setOptions] = useState<AutocompleteOption[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Carregar opções
  const loadOptions = async () => {
    const table = type === 'client' ? 'clients' : 'products'
    
    if (type === 'product' && clientId) {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('client_id', clientId)
        .order('name')
      if (data) setOptions(data)
    } else if (type === 'client') {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')
      if (data) setOptions(data)
    }
  }

  useEffect(() => {
    loadOptions()
  }, [type, clientId])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Criar novo cliente ou produto
  const handleCreate = async () => {
    if (!value.trim()) return

    setIsCreating(true)
    try {
      const table = type === 'client' ? 'clients' : 'products'
      const data: any = { name: value.trim() }
      
      if (type === 'product' && clientId) {
        data.client_id = clientId
      }

      const { error } = await supabase.from(table).insert(data)
      
      if (!error) {
        await loadOptions()
        setShowDropdown(false)
      }
    } finally {
      setIsCreating(false)
    }
  }

  // Filtrar opções baseado no valor digitado
  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(value.toLowerCase())
  )

  const exactMatch = options.find(opt => 
    opt.name.toLowerCase() === value.toLowerCase()
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setShowDropdown(true)
  }

  const handleSelectOption = (optionName: string) => {
    onChange(optionName)
    setShowDropdown(false)
    inputRef.current?.blur()
  }

  return (
    <div className="space-y-2 relative">
      <Label htmlFor={`${type}-input`} className="dark-label text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          ref={inputRef}
          id={`${type}-input`}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          placeholder={`Digite ou selecione ${label.toLowerCase()}`}
          className="dark-input focus-ring pr-10"
          autoComplete="off"
        />
        
        {value && exactMatch && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectOption(option.name)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                    option.name === value && "bg-muted font-medium"
                  )}
                >
                  {option.name}
                </button>
              ))}
            </div>
          ) : null}
          
          {!exactMatch && value.trim() && (
            <div className="border-t border-border py-2 px-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full justify-start gap-2 text-primary hover:text-primary hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
                {isCreating ? 'Criando...' : `Criar "${value}"`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})