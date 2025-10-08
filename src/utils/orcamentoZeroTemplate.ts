/**
 * Template base para Orçamento do Zero
 * Usado para testes e como exemplo inicial
 */

export const templateBase = {
  cliente: "Cliente Exemplo",
  produto: "Produto Teste",
  job: "Campanha de Lançamento",
  midias: "TV, Digital, Social Media",
  territorio: "Nacional",
  periodo: "12 meses",
  entregaveis: "1 Filme 30s, 5 adaptações, KV",
  adaptacoes: "15s, 6s, Stories, Feed",
  exclusividade_elenco: "orcado" as const,
  brief_text: `
## Contexto do Projeto
Campanha de lançamento de produto com foco em mídias digitais e TV.

## Objetivos
- Aumentar awareness da marca
- Gerar engajamento nas redes sociais
- Converter leads em vendas

## Entregáveis Principais
- 1 Filme principal 30s para TV
- 5 Adaptações para diferentes plataformas
- KV (Key Visual) para campanhas digitais
- Material complementar para redes sociais

## Referências
- Campanha X da concorrente
- Vídeos virais recentes do setor
  `.trim(),
  campanhas: [
    {
      id: crypto.randomUUID(),
      nome: "Campanha Principal",
      inclui_audio: true,
      categorias: [
        {
          id: crypto.randomUUID(),
          nome: "Filme",
          visivel: true,
          modoPreco: "itens" as const,
          itens: [
            {
              id: crypto.randomUUID(),
              tipo: "filme" as const,
              descricao: "Produção Filme 30s",
              quantidade: 1,
              valorUnitario: 150000,
              desconto: 0,
              observacao: "Inclui direção, produção, filmagem e edição"
            }
          ]
        },
        {
          id: crypto.randomUUID(),
          nome: "Adaptações",
          visivel: true,
          modoPreco: "itens" as const,
          itens: [
            {
              id: crypto.randomUUID(),
              tipo: "filme" as const,
              descricao: "Adaptação 15s",
              quantidade: 1,
              valorUnitario: 15000,
              desconto: 0
            },
            {
              id: crypto.randomUUID(),
              tipo: "filme" as const,
              descricao: "Adaptação 6s",
              quantidade: 1,
              valorUnitario: 10000,
              desconto: 0
            },
            {
              id: crypto.randomUUID(),
              tipo: "filme" as const,
              descricao: "Stories",
              quantidade: 3,
              valorUnitario: 5000,
              desconto: 0
            }
          ]
        },
        {
          id: crypto.randomUUID(),
          nome: "Áudio",
          visivel: true,
          modoPreco: "itens" as const,
          itens: [
            {
              id: crypto.randomUUID(),
              tipo: "audio" as const,
              descricao: "Produção de Áudio (Trilha + Locução)",
              quantidade: 1,
              valorUnitario: 25000,
              desconto: 0
            }
          ]
        },
        {
          id: crypto.randomUUID(),
          nome: "Imagem (KV)",
          visivel: true,
          modoPreco: "itens" as const,
          itens: [
            {
              id: crypto.randomUUID(),
              tipo: "imagem" as const,
              descricao: "Key Visual + Adaptações",
              quantidade: 1,
              valorUnitario: 35000,
              desconto: 0
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Calcula o total do template
 */
export function calcularTotalTemplate(honorarioPerc: number = 0): number {
  let subtotal = 0;
  
  templateBase.campanhas.forEach(campanha => {
    campanha.categorias.forEach(categoria => {
      categoria.itens.forEach(item => {
        subtotal += (item.quantidade * item.valorUnitario) - item.desconto;
      });
    });
  });

  if (honorarioPerc > 0) {
    return subtotal + (subtotal * (honorarioPerc / 100));
  }

  return subtotal;
}
