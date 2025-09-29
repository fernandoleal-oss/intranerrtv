import React, { createContext, useContext, useReducer, ReactNode, useCallback, useMemo } from 'react'

// Shape de dados padronizado conforme especificação
interface BudgetForm {
  identificacao: {
    cliente: string
    produto: string
    job: string
    midias: string
    territorio: string
    periodo: string
    entregaveis: string
    adaptacoes: string
    data_orcamento: string
    exclusividade_elenco: string
    audio: string
  }
  filme?: {
    subtotal: number
    diarias_diretor: number
    diarias_producao: number
    locacoes: number
    elenco: number
    equipamentos: number
    pos_producao: number
    outros: number
  }
  audio?: {
    subtotal: number
    locucao: number
    trilha: number
    mix: number
    outros: number
  }
  imagem?: {
    items: Array<{
      id: string
      descricao: string
      valor: number
      banco: string
    }>
    total: number
  }
  cc?: {
    qtd: number
    valor_unitario: number
    total: number
  }
  cotacoes: Array<{
    id: string
    fornecedor: string
    valor: number
    observacao?: string
  }>
  totais: {
    subtotal: number
    impostos: number
    taxas: number
    honorarios: number
    total_geral: number
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
    identificacao: {
      cliente: '',
      produto: '',
      job: '',
      midias: '',
      territorio: '',
      periodo: '',
      entregaveis: '',
      adaptacoes: '',
      data_orcamento: new Date().toISOString().split('T')[0],
      exclusividade_elenco: '',
      audio: ''
    },
    cotacoes: [],
    totais: {
      subtotal: 0,
      impostos: 0,
      taxas: 0,
      honorarios: 0,
      total_geral: 0
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
  setFormField: (path: string, value: any) => void
  calculateTotals: () => void
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(budgetReducer, initialState)

  // Função memoizada para atualizar campos específicos
  const updateField = useCallback((path: string, value: any) => {
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
  }, [])

  // Função para campos do formulário (evita re-renders)
  const setFormField = useCallback((path: string, value: any) => {
    const keys = path.split('.')
    const newForm = { ...state.form }
    let current = newForm as any
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {}
      }
      current = current[keys[i]]
    }
    
    current[keys[keys.length - 1]] = value
    
    dispatch({
      type: 'SET_FORM',
      payload: newForm
    })
  }, [state.form])

  // Cálculo memoizado dos totais
  const calculateTotals = useCallback(() => {
    let subtotal = 0
    
    // Calcular subtotal baseado no tipo de orçamento
    if (state.form.filme) {
      subtotal = Object.values(state.form.filme).reduce((sum, val) => sum + (Number(val) || 0), 0)
    }
    if (state.form.audio) {
      subtotal = Object.values(state.form.audio).reduce((sum, val) => sum + (Number(val) || 0), 0)
    }
    if (state.form.imagem?.items) {
      subtotal = state.form.imagem.items.reduce((sum, item) => sum + (item.valor || 0), 0)
    }
    if (state.form.cc) {
      subtotal = (state.form.cc.qtd || 0) * (state.form.cc.valor_unitario || 0)
    }

    const impostos = subtotal * 0.05 // 5% impostos
    const taxas = subtotal * 0.02 // 2% taxas
    const honorarios = subtotal * 0.15 // 15% honorários
    const total_geral = subtotal + impostos + taxas + honorarios

    dispatch({
      type: 'UPDATE_TOTAIS',
      payload: {
        subtotal,
        impostos,
        taxas,
        honorarios,
        total_geral
      }
    })
  }, [state.form])

  const contextValue = useMemo(() => ({
    state,
    dispatch,
    updateField,
    setFormField,
    calculateTotals
  }), [state, dispatch, updateField, setFormField, calculateTotals])

  return (
    <BudgetContext.Provider value={contextValue}>
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