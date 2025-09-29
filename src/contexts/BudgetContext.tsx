import React, { createContext, useContext, useReducer, ReactNode } from 'react'

// Estrutura padronizada do formulário
interface BudgetForm {
  identificacao: {
    cliente?: string
    produto?: string
    campanha?: string
    responsavel?: string
    email?: string
  }
  itens: Array<{
    id: string
    tipo: 'filme' | 'audio' | 'imagem' | 'cc'
    descricao: string
    valor: number
    cotacoes?: any[]
  }>
  cotacoes: Array<{
    fornecedor: string
    valor: number
    observacao?: string
  }>
  totais: {
    subtotal: number
    impostos: number
    taxas: number
    total: number
  }
}

interface BudgetState {
  form: BudgetForm
  budgetId?: string
  versionId?: string
  isLoading: boolean
  error?: string
}

type BudgetAction =
  | { type: 'SET_FORM'; payload: Partial<BudgetForm> }
  | { type: 'UPDATE_IDENTIFICACAO'; payload: Partial<BudgetForm['identificacao']> }
  | { type: 'UPDATE_TOTAIS'; payload: Partial<BudgetForm['totais']> }
  | { type: 'SET_BUDGET_ID'; payload: string }
  | { type: 'SET_VERSION_ID'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' }

const initialState: BudgetState = {
  form: {
    identificacao: {},
    itens: [],
    cotacoes: [],
    totais: {
      subtotal: 0,
      impostos: 0,
      taxas: 0,
      total: 0
    }
  },
  isLoading: false
}

function budgetReducer(state: BudgetState, action: BudgetAction): BudgetState {
  switch (action.type) {
    case 'SET_FORM':
      return {
        ...state,
        form: { ...state.form, ...action.payload }
      }
    case 'UPDATE_IDENTIFICACAO':
      return {
        ...state,
        form: {
          ...state.form,
          identificacao: { ...state.form.identificacao, ...action.payload }
        }
      }
    case 'UPDATE_TOTAIS':
      return {
        ...state,
        form: {
          ...state.form,
          totais: { ...state.form.totais, ...action.payload }
        }
      }
    case 'SET_BUDGET_ID':
      return { ...state, budgetId: action.payload }
    case 'SET_VERSION_ID':
      return { ...state, versionId: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

interface BudgetContextType {
  state: BudgetState
  dispatch: React.Dispatch<BudgetAction>
  updateField: (path: string, value: any) => void
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(budgetReducer, initialState)

  const updateField = (path: string, value: any) => {
    const keys = path.split('.')
    if (keys[0] === 'identificacao') {
      dispatch({
        type: 'UPDATE_IDENTIFICACAO',
        payload: { [keys[1]]: value }
      })
    } else if (keys[0] === 'totais') {
      dispatch({
        type: 'UPDATE_TOTAIS',
        payload: { [keys[1]]: value }
      })
    }
    // Adicionar mais casos conforme necessário
  }

  return (
    <BudgetContext.Provider value={{ state, dispatch, updateField }}>
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider')
  }
  return context
}