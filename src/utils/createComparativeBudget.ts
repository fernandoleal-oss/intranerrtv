import { supabase } from "@/integrations/supabase/client";

export interface ComparativeBudgetTemplate {
  fornecedorNome: string;
  fornecedorContato?: string;
  fornecedorCNPJ?: string;
  opcoes: {
    nome: string;
    descricao?: string;
    itensInclusos: string[];
    valor: number;
  }[];
}

export async function createComparativeBudget(
  template: ComparativeBudgetTemplate,
  clientName?: string,
  projectName?: string
) {
  try {
    // Criar estrutura de fornecedor com opções
    const fornecedor = {
      id: crypto.randomUUID(),
      nome: template.fornecedorNome,
      contato: template.fornecedorContato || "",
      cnpj: template.fornecedorCNPJ || "",
      opcoes: template.opcoes.map((opcao) => ({
        id: crypto.randomUUID(),
        nome: opcao.nome,
        fases: [
          {
            id: crypto.randomUUID(),
            nome: "Itens Inclusos",
            itens: opcao.itensInclusos.map((item, idx) => ({
              id: crypto.randomUUID(),
              nome: item,
              valor: idx === opcao.itensInclusos.length - 1 ? opcao.valor : 0,
              prazo: "",
              observacao: opcao.descricao || "",
              desconto: 0,
            })),
          },
        ],
      })),
    };

    const payload = {
      tipo: "livre",
      cliente: clientName || "Cliente",
      projeto: projectName || "Projeto",
      fornecedores: [fornecedor],
    };

    // Criar orçamento usando RPC
    const { data, error } = await supabase.rpc("create_budget_full_rpc", {
      p_payload: payload,
      p_total: template.opcoes.reduce((sum, opt) => Math.max(sum, opt.valor), 0),
      p_type_text: "livre",
    });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Falha ao criar orçamento");

    const result = data[0];
    return {
      budgetId: result.id,
      displayId: result.display_id,
      versionId: result.version_id,
    };
  } catch (error) {
    console.error("Erro ao criar orçamento comparativo:", error);
    throw error;
  }
}

// Template baseado nos PDFs enviados pelo usuário
export const gluckliveTemplate: ComparativeBudgetTemplate = {
  fornecedorNome: "Gluck Live",
  fornecedorContato: "Renato Ferreira - 11 9 8212 5520 - renato@glucklive.com",
  opcoes: [
    {
      nome: "Setup 1 Câmera",
      descricao: "Transmissão ao vivo com 1 câmera",
      valor: 5580.00,
      itensInclusos: [
        "01 Câmera Sony/PTZ",
        "01 Kit de iluminação",
        "01 VMix com operador",
        "01 Interface",
        "01 Teleprompter com operador (R$ 690,00)",
        "Tripés hidráulicos",
        "Suportes eletrônicos de câmera",
        "01 Console de áudio",
        "03 Microfones de lapela",
        "Diretor Artístico + Produtor",
        "01 Operador de câmera, áudio e iluminação",
        "Transporte e alimentação da equipe",
      ],
    },
    {
      nome: "Setup 2 Câmeras",
      descricao: "Transmissão ao vivo com 2 câmeras",
      valor: 6990.00,
      itensInclusos: [
        "02 Câmeras Sony/PTZ",
        "01 Kit de iluminação",
        "01 VMix com operador",
        "01 Interface",
        "01 Teleprompter com operador (R$ 690,00)",
        "Tripés hidráulicos",
        "Suportes eletrônicos de câmera",
        "01 Console de áudio",
        "03 Microfones de lapela",
        "Diretor Artístico + Produtor",
        "02 Operadores de câmera, áudio e iluminação",
        "Transporte e alimentação da equipe",
      ],
    },
  ],
};

export const digitalPepperTemplate: ComparativeBudgetTemplate = {
  fornecedorNome: "Digital Pepper Produções",
  fornecedorContato: "Igor Petrauskas - igorz28@hotmail.com",
  fornecedorCNPJ: "12.948.281/0001-98",
  opcoes: [
    {
      nome: "Opção 1 Câmera",
      descricao: "Serviços de captação/transmissão ao vivo com 1 câmera",
      valor: 16682.16,
      itensInclusos: [
        "01 Câmera Sony@7 mirrorless ou PTZ",
        "01 Kit de iluminação",
        "01 VMix com operador",
        "01 Interface",
        "01 Teleprompter com operador",
        "Tripés hidráulicos",
        "Suportes eletrônicos de câmera",
        "Captação de áudio ambiente por 1 Console",
        "03 Microfones de lapela (G3 ou countryman)",
        "Som ambiente em alta definição",
        "Diretor Artístico + Produtor",
        "01 Operador de câmera, áudio e iluminação",
        "Transporte e alimentação da equipe",
        "Edição/Pós-produção",
        "Valor base: R$ 14.200,00 + 17,48% impostos",
      ],
    },
    {
      nome: "Opção 2 Câmeras",
      descricao: "Serviços de captação/transmissão ao vivo com 2 câmeras",
      valor: 23730.96,
      itensInclusos: [
        "02 Câmeras Sony@7 mirrorless ou PTZ",
        "01 Kit de iluminação",
        "01 VMix com operador",
        "01 Interface",
        "01 Teleprompter com operador",
        "Tripés hidráulicos",
        "Suportes eletrônicos de câmera",
        "Captação de áudio ambiente por 1 Console",
        "03 Microfones de lapela (G3 ou countryman)",
        "Som ambiente em alta definição",
        "Diretor Artístico + Produtor",
        "02 Operadores de câmera, áudio e iluminação",
        "Transporte e alimentação da equipe",
        "Edição/Pós-produção",
        "Valor base: R$ 20.200,00 + 17,48% impostos",
      ],
    },
  ],
};
