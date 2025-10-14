import React, { createContext, useContext, useReducer, ReactNode, useCallback, useMemo } from "react";

// Tipos melhorados com validações e valores padrão
interface BudgetItem {
  id: string;
  descricao: string;
  valor: number;
  banco?: string;
  categoria?: string;
}

interface Cotacao {
  id: string;
  fornecedor: string;
  valor: number;
  observacao?: string;
  selecionada: boolean;
}

interface DadosBancarios {
  banco: string;
  agencia: string;
  conta: string;
  pix?: string;
  tipo_conta?: string;
}

interface ItemOrdemCompra {
  descricao: string;
  qtde: number;
  un: string;
  vl_unit: number;
  vl_total: number;
  categoria: string;
}

interface Financeiro {
  fornecedor_razao: string;
  fornecedor_cnpj: string;
  fornecedor_endereco: string;
  dados_bancarios: DadosBancarios;
  condicoes_pagamento: string;
  centro_de_custo?: string;
  numero_ap?: string;
  numero_oc?: string;
  data_entrega?: string;
  instrucoes_nf?: string;
  itens_oc?: ItemOrdemCompra[];
}

interface Identificacao {
  cliente: string;
  produto: string;
  job: string;
  midias: string;
  territorio: string;
  periodo: string;
  entregaveis: string;
  adaptacoes: string;
  data_orcamento: string;
  exclusividade_elenco: string;
  audio: string;
  versao?: string;
  responsavel?: string;
}

interface ServicoBase {
  subtotal: number;
  diarias_diretor?: number;
  diarias_producao?: number;
  locacoes?: number;
  elenco?: number;
  equipamentos?: number;
  pos_producao?: number;
  outros?: number;
  locucao?: number;
  trilha?: number;
  mix?: number;
}

interface Filme extends ServicoBase {}
interface Audio extends ServicoBase {}

interface Imagem {
  items: BudgetItem[];
  total: number;
}

interface CentroCusto {
  qtd: number;
  valor_unitario: number;
  total: number;
  descricao?: string;
}

interface Totais {
  subtotal: number;
  impostos: number;
  taxas: number;
  honorarios: number;
  total_geral: number;
  margem_lucro?: number;
}

// Interface principal com estrutura hierárquica melhorada
interface BudgetForm {
  identificacao: Identificacao;
  servicos: {
    filme?: Filme;
    audio?: Audio;
    imagem?: Imagem;
    cc?: CentroCusto;
  };
  cotacoes: Cotacao[];
  totais: Totais;
  financeiro?: Financeiro;
  metadata?: {
    criado_em: string;
    atualizado_em: string;
    criado_por: string;
    status: "rascunho" | "enviado" | "aprovado" | "recusado";
  };
}

// Estado com melhor controle de loading e erro
interface BudgetState {
  form: BudgetForm;
  budgetId?: string;
  versionId?: string;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved?: string;
  error?: string;
  warnings: string[];
}

// Ações mais específicas e completas
type BudgetAction =
  | { type: "SET_FORM"; payload: Partial<BudgetForm> }
  | { type: "UPDATE_IDENTIFICACAO"; payload: Partial<Identificacao> }
  | { type: "UPDATE_SERVICO"; payload: { tipo: keyof BudgetForm["servicos"]; data: any } }
  | { type: "UPDATE_TOTAIS"; payload: Partial<Totais> }
  | { type: "ADD_COTACAO"; payload: Cotacao }
  | { type: "UPDATE_COTACAO"; payload: { id: string; updates: Partial<Cotacao> } }
  | { type: "REMOVE_COTACAO"; payload: string }
  | { type: "ADD_ITEM_IMAGEM"; payload: BudgetItem }
  | { type: "UPDATE_ITEM_IMAGEM"; payload: { id: string; updates: Partial<BudgetItem> } }
  | { type: "REMOVE_ITEM_IMAGEM"; payload: string }
  | { type: "SET_BUDGET_ID"; payload: string }
  | { type: "SET_VERSION_ID"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "ADD_WARNING"; payload: string }
  | { type: "CLEAR_WARNINGS" }
  | { type: "UPDATE_LAST_SAVED"; payload: string }
  | { type: "RESET" };

// Estado inicial completo com valores padrão
const initialState: BudgetState = {
  form: {
    identificacao: {
      cliente: "",
      produto: "",
      job: "",
      midias: "",
      territorio: "",
      periodo: "",
      entregaveis: "",
      adaptacoes: "",
      data_orcamento: new Date().toISOString().split("T")[0],
      exclusividade_elenco: "",
      audio: "",
      responsavel: "",
      versao: "1.0",
    },
    servicos: {},
    cotacoes: [],
    totais: {
      subtotal: 0,
      impostos: 0,
      taxas: 0,
      honorarios: 0,
      total_geral: 0,
      margem_lucro: 0,
    },
    metadata: {
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      criado_por: "",
      status: "rascunho",
    },
  },
  isLoading: false,
  isSaving: false,
  warnings: [],
};

// Reducer mais robusto com validações
function budgetReducer(state: BudgetState, action: BudgetAction): BudgetState {
  switch (action.type) {
    case "SET_FORM":
      return {
        ...state,
        form: { ...state.form, ...action.payload },
        error: undefined,
      };

    case "UPDATE_IDENTIFICACAO":
      const novaIdentificacao = { ...state.form.identificacao, ...action.payload };
      return {
        ...state,
        form: {
          ...state.form,
          identificacao: novaIdentificacao,
          metadata: {
            ...state.form.metadata!,
            atualizado_em: new Date().toISOString(),
          },
        },
      };

    case "UPDATE_SERVICO":
      return {
        ...state,
        form: {
          ...state.form,
          servicos: {
            ...state.form.servicos,
            [action.payload.tipo]: action.payload.data,
          },
          metadata: {
            ...state.form.metadata!,
            atualizado_em: new Date().toISOString(),
          },
        },
      };

    case "UPDATE_TOTAIS":
      const novosTotais = { ...state.form.totais, ...action.payload };
      return {
        ...state,
        form: {
          ...state.form,
          totais: novosTotais,
        },
      };

    case "ADD_COTACAO":
      return {
        ...state,
        form: {
          ...state.form,
          cotacoes: [...state.form.cotacoes, { ...action.payload, selecionada: false }],
        },
      };

    case "UPDATE_COTACAO":
      return {
        ...state,
        form: {
          ...state.form,
          cotacoes: state.form.cotacoes.map((cotacao) =>
            cotacao.id === action.payload.id ? { ...cotacao, ...action.payload.updates } : cotacao,
          ),
        },
      };

    case "REMOVE_COTACAO":
      return {
        ...state,
        form: {
          ...state.form,
          cotacoes: state.form.cotacoes.filter((cotacao) => cotacao.id !== action.payload),
        },
      };

    case "ADD_ITEM_IMAGEM":
      const novosItems = [...(state.form.servicos.imagem?.items || []), action.payload];
      const totalImagem = novosItems.reduce((sum, item) => sum + (item.valor || 0), 0);

      return {
        ...state,
        form: {
          ...state.form,
          servicos: {
            ...state.form.servicos,
            imagem: {
              items: novosItems,
              total: totalImagem,
            },
          },
        },
      };

    case "UPDATE_ITEM_IMAGEM":
      const itemsAtualizados =
        state.form.servicos.imagem?.items.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload.updates } : item,
        ) || [];

      const totalAtualizado = itemsAtualizados.reduce((sum, item) => sum + (item.valor || 0), 0);

      return {
        ...state,
        form: {
          ...state.form,
          servicos: {
            ...state.form.servicos,
            imagem: {
              items: itemsAtualizados,
              total: totalAtualizado,
            },
          },
        },
      };

    case "REMOVE_ITEM_IMAGEM":
      const itemsFiltrados = state.form.servicos.imagem?.items.filter((item) => item.id !== action.payload) || [];
      const totalFiltrado = itemsFiltrados.reduce((sum, item) => sum + (item.valor || 0), 0);

      return {
        ...state,
        form: {
          ...state.form,
          servicos: {
            ...state.form.servicos,
            imagem: {
              items: itemsFiltrados,
              total: totalFiltrado,
            },
          },
        },
      };

    case "SET_BUDGET_ID":
      return { ...state, budgetId: action.payload };

    case "SET_VERSION_ID":
      return { ...state, versionId: action.payload };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_SAVING":
      return { ...state, isSaving: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "ADD_WARNING":
      return {
        ...state,
        warnings: [...state.warnings, action.payload],
      };

    case "CLEAR_WARNINGS":
      return { ...state, warnings: [] };

    case "UPDATE_LAST_SAVED":
      return { ...state, lastSaved: action.payload };

    case "RESET":
      return {
        ...initialState,
        form: {
          ...initialState.form,
          identificacao: {
            ...initialState.form.identificacao,
            data_orcamento: new Date().toISOString().split("T")[0],
          },
          metadata: {
            ...initialState.form.metadata!,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          },
        },
      };

    default:
      return state;
  }
}

// Context type com funcionalidades expandidas
interface BudgetContextType {
  state: BudgetState;
  dispatch: React.Dispatch<BudgetAction>;
  // Funções utilitárias
  updateField: (path: string, value: any) => void;
  setFormField: (path: string, value: any) => void;
  calculateTotals: (config?: { impostos?: number; taxas?: number; honorarios?: number }) => void;
  validateForm: () => { isValid: boolean; errors: string[] };
  exportToJSON: () => string;
  importFromJSON: (json: string) => boolean;
  duplicateBudget: () => BudgetForm;
  getBudgetSummary: () => {
    total: number;
    servicos: string[];
    qtdItens: number;
    qtdCotacoes: number;
  };
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(budgetReducer, initialState);

  // Função genérica para atualizar campos
  const updateField = useCallback((path: string, value: any) => {
    const keys = path.split(".");

    if (keys[0] === "identificacao") {
      dispatch({
        type: "UPDATE_IDENTIFICACAO",
        payload: { [keys[1]]: value },
      });
    } else if (keys[0] === "totais") {
      dispatch({
        type: "UPDATE_TOTAIS",
        payload: { [keys[1]]: value },
      });
    } else if (keys[0] === "servicos") {
      dispatch({
        type: "UPDATE_SERVICO",
        payload: { tipo: keys[1] as keyof BudgetForm["servicos"], data: value },
      });
    }
  }, []);

  // Função para atualizar campos aninhados
  const setFormField = useCallback(
    (path: string, value: any) => {
      const keys = path.split(".");
      const newForm = JSON.parse(JSON.stringify(state.form)); // Deep clone
      let current = newForm;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;

      dispatch({
        type: "SET_FORM",
        payload: newForm,
      });
    },
    [state.form],
  );

  // Cálculo de totais com configuração flexível
  const calculateTotals = useCallback(
    (config = { impostos: 0.05, taxas: 0.02, honorarios: 0.15 }) => {
      let subtotal = 0;

      // Calcular subtotal de todos os serviços
      if (state.form.servicos.filme) {
        const filmeSubtotal = Object.entries(state.form.servicos.filme)
          .filter(([key]) => key !== "subtotal")
          .reduce((sum, [, valor]) => sum + (Number(valor) || 0), 0);
        subtotal += filmeSubtotal;
      }

      if (state.form.servicos.audio) {
        const audioSubtotal = Object.entries(state.form.servicos.audio)
          .filter(([key]) => key !== "subtotal")
          .reduce((sum, [, valor]) => sum + (Number(valor) || 0), 0);
        subtotal += audioSubtotal;
      }

      if (state.form.servicos.imagem) {
        subtotal += state.form.servicos.imagem.total;
      }

      if (state.form.servicos.cc) {
        subtotal += state.form.servicos.cc.total;
      }

      // Adicionar cotações selecionadas
      const cotacoesSelecionadas = state.form.cotacoes
        .filter((cotacao) => cotacao.selecionada)
        .reduce((sum, cotacao) => sum + cotacao.valor, 0);

      subtotal += cotacoesSelecionadas;

      const impostos = subtotal * (config.impostos || 0.05);
      const taxas = subtotal * (config.taxas || 0.02);
      const honorarios = subtotal * (config.honorarios || 0.15);
      const total_geral = subtotal + impostos + taxas + honorarios;
      const margem_lucro = (honorarios / total_geral) * 100;

      dispatch({
        type: "UPDATE_TOTAIS",
        payload: {
          subtotal,
          impostos,
          taxas,
          honorarios,
          total_geral,
          margem_lucro,
        },
      });
    },
    [state.form],
  );

  // Validação do formulário
  const validateForm = useCallback(() => {
    const errors: string[] = [];
    const { identificacao, totais } = state.form;

    if (!identificacao.cliente) errors.push("Cliente é obrigatório");
    if (!identificacao.produto) errors.push("Produto é obrigatório");
    if (!identificacao.job) errors.push("Job é obrigatório");
    if (totais.total_geral <= 0) errors.push("Orçamento deve ter valor maior que zero");

    // Validar se há pelo menos um serviço
    const hasServices = Object.values(state.form.servicos).some(
      (servico) => servico && Object.values(servico).some((val) => (typeof val === "number" ? val > 0 : true)),
    );

    if (!hasServices) errors.push("Pelo menos um serviço deve ser preenchido");

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [state.form]);

  // Exportar para JSON
  const exportToJSON = useCallback(() => {
    return JSON.stringify(state.form, null, 2);
  }, [state.form]);

  // Importar de JSON
  const importFromJSON = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      dispatch({ type: "SET_FORM", payload: parsed });
      return true;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Erro ao importar JSON" });
      return false;
    }
  }, []);

  // Duplicar orçamento
  const duplicateBudget = useCallback(() => {
    return {
      ...state.form,
      identificacao: {
        ...state.form.identificacao,
        job: `${state.form.identificacao.job} - Cópia`,
        data_orcamento: new Date().toISOString().split("T")[0],
        versao: "1.0",
      },
      metadata: {
        ...state.form.metadata!,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        status: "rascunho",
      },
    };
  }, [state.form]);

  // Resumo do orçamento
  const getBudgetSummary = useCallback(() => {
    const servicos = Object.keys(state.form.servicos).filter(
      (key) => state.form.servicos[key as keyof BudgetForm["servicos"]] !== undefined,
    );

    const qtdItens = state.form.servicos.imagem?.items.length || 0;
    const qtdCotacoes = state.form.cotacoes.length;

    return {
      total: state.form.totais.total_geral,
      servicos,
      qtdItens,
      qtdCotacoes,
    };
  }, [state.form]);

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      updateField,
      setFormField,
      calculateTotals,
      validateForm,
      exportToJSON,
      importFromJSON,
      duplicateBudget,
      getBudgetSummary,
    }),
    [
      state,
      dispatch,
      updateField,
      setFormField,
      calculateTotals,
      validateForm,
      exportToJSON,
      importFromJSON,
      duplicateBudget,
      getBudgetSummary,
    ],
  );

  return <BudgetContext.Provider value={contextValue}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider");
  }
  return context;
}

// Hook derivado para operações comuns
export function useBudgetOperations() {
  const { state, dispatch, calculateTotals } = useBudget();

  const addCotacao = useCallback(
    (cotacao: Omit<Cotacao, "selecionada">) => {
      dispatch({
        type: "ADD_COTACAO",
        payload: { ...cotacao, selecionada: false },
      });
      calculateTotals();
    },
    [dispatch, calculateTotals],
  );

  const toggleCotacao = useCallback(
    (id: string) => {
      const cotacao = state.form.cotacoes.find((c) => c.id === id);
      if (cotacao) {
        dispatch({
          type: "UPDATE_COTACAO",
          payload: { id, updates: { selecionada: !cotacao.selecionada } },
        });
        calculateTotals();
      }
    },
    [state.form.cotacoes, dispatch, calculateTotals],
  );

  const addItemImagem = useCallback(
    (item: BudgetItem) => {
      dispatch({ type: "ADD_ITEM_IMAGEM", payload: item });
      calculateTotals();
    },
    [dispatch, calculateTotals],
  );

  return {
    addCotacao,
    toggleCotacao,
    addItemImagem,
    budgetSummary: state.form.totais,
  };
}
