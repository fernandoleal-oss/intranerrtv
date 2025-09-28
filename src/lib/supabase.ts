import { createClient } from '@supabase/supabase-js'

// For now using placeholder values - you'll need to connect to Supabase
// Click the green Supabase button in the top right to connect properly
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: { 
    headers: { 'x-client-info': 'we-proposals' } 
  },
})

// Utility functions for the app
export const createBudget = async (type: 'filme' | 'audio' | 'cc' | 'imagem') => {
  // For now, return mock data - this would connect to Supabase RPC
  const id = `budget-${Date.now()}`
  const displayId = `ORC-NEW-${type.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`
  
  return { id, display_id: displayId }
}

export const saveBudgetData = async (budgetId: string, data: any) => {
  // For now, just log - this would save to Supabase
  console.log('Saving budget data:', budgetId, data)
  return { success: true }
}