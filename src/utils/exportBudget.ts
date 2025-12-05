import * as XLSX from 'xlsx';

interface ExportBudgetData {
  id: string;
  display_id: string;
  type: string;
  status: string;
  payload: any;
}

// Exportar JSON
export const exportToJSON = (budget: ExportBudgetData, filename?: string) => {
  const data = {
    id: budget.id,
    display_id: budget.display_id,
    type: budget.type,
    status: budget.status,
    exportedAt: new Date().toISOString(),
    data: budget.payload
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${budget.display_id || 'orcamento'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Exportar Excel
export const exportToExcel = (budget: ExportBudgetData, filename?: string) => {
  const workbook = XLSX.utils.book_new();
  const payload = budget.payload || {};

  // Aba 1: Identificação
  const identificacao: any[] = [
    ['IDENTIFICAÇÃO DO ORÇAMENTO'],
    [],
    ['ID', budget.display_id || budget.id],
    ['Tipo', budget.type],
    ['Status', budget.status],
    ['Cliente', payload.cliente || '-'],
    ['Produto/Projeto', payload.produto || payload.projeto || '-'],
    ['Job', payload.job || '-'],
    ['Campanha', payload.campanha || '-'],
    ['Data Criação', new Date().toLocaleDateString('pt-BR')],
  ];

  // Adicionar campos personalizados se existirem
  if (payload.camposPersonalizados?.length > 0) {
    identificacao.push([]);
    identificacao.push(['CAMPOS PERSONALIZADOS']);
    payload.camposPersonalizados.forEach((campo: any) => {
      identificacao.push([campo.nome, campo.valor]);
    });
  }

  const wsIdentificacao = XLSX.utils.aoa_to_sheet(identificacao);
  wsIdentificacao['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, wsIdentificacao, 'Identificação');

  // Aba 2: Fornecedores e Itens
  if (payload.fornecedores?.length > 0) {
    const itensData: any[] = [
      ['FORNECEDORES E ITENS'],
      [],
      ['Fornecedor', 'Opção', 'Fase', 'Item', 'Valor', 'Desconto %', 'Valor Final', 'Prazo', 'Observação']
    ];

    payload.fornecedores.forEach((fornecedor: any) => {
      const opcoes = fornecedor.opcoes || [{ nome: 'Única', fases: fornecedor.fases || [] }];
      
      opcoes.forEach((opcao: any) => {
        (opcao.fases || []).forEach((fase: any) => {
          (fase.itens || []).forEach((item: any) => {
            const valorFinal = item.valor * (1 - (item.desconto || 0) / 100);
            itensData.push([
              fornecedor.nome || '-',
              opcao.nome || '-',
              fase.nome || '-',
              item.nome || item.descricao || '-',
              item.valor || 0,
              item.desconto || 0,
              valorFinal,
              item.prazo || '-',
              item.observacao || '-'
            ]);
          });
        });
      });
    });

    const wsItens = XLSX.utils.aoa_to_sheet(itensData);
    wsItens['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, 
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsItens, 'Itens');
  }

  // Aba para orçamentos de imagem
  if (payload.assets?.length > 0) {
    const assetsData: any[] = [
      ['ASSETS DE IMAGEM'],
      [],
      ['Título', 'ID', 'Tipo', 'Licença', 'Valor', 'Descrição']
    ];

    payload.assets.forEach((asset: any) => {
      assetsData.push([
        asset.title || '-',
        asset.id || '-',
        asset.type || '-',
        asset.chosenLicense || '-',
        asset.price || 0,
        asset.customDescription || '-'
      ]);
    });

    const wsAssets = XLSX.utils.aoa_to_sheet(assetsData);
    wsAssets['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsAssets, 'Assets');
  }

  // Aba para orçamentos com campanhas/categorias
  if (payload.campanhas?.length > 0 || payload.categorias?.length > 0) {
    const campanhasData: any[] = [
      ['CAMPANHAS E CATEGORIAS'],
      [],
      ['Campanha', 'Categoria', 'Item', 'Quantidade', 'Valor Unitário', 'Desconto', 'Total']
    ];

    const campanhas = payload.campanhas || [{ nome: 'Única', categorias: payload.categorias || [] }];
    
    campanhas.forEach((campanha: any) => {
      (campanha.categorias || []).forEach((cat: any) => {
        if (cat.modoPreco === 'fechado') {
          (cat.fornecedores || []).forEach((f: any) => {
            campanhasData.push([
              campanha.nome || '-',
              cat.nome || '-',
              f.nome || '-',
              1,
              f.valor || 0,
              f.desconto || 0,
              (f.valor || 0) - (f.desconto || 0)
            ]);
          });
        } else {
          (cat.itens || []).forEach((item: any) => {
            campanhasData.push([
              campanha.nome || '-',
              cat.nome || '-',
              item.descricao || '-',
              item.quantidade || 1,
              item.valorUnitario || 0,
              item.desconto || 0,
              (item.quantidade || 1) * (item.valorUnitario || 0) - (item.desconto || 0)
            ]);
          });
        }
      });
    });

    const wsCampanhas = XLSX.utils.aoa_to_sheet(campanhasData);
    wsCampanhas['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsCampanhas, 'Campanhas');
  }

  // Aba: Totais
  const totais: any[] = [
    ['RESUMO DE TOTAIS'],
    [],
  ];

  // Calcular totais dependendo do tipo
  let totalGeral = 0;

  if (payload.fornecedores?.length > 0) {
    totais.push(['Fornecedor', 'Total']);
    payload.fornecedores.forEach((f: any) => {
      let totalFornecedor = 0;
      const opcoes = f.opcoes || [{ fases: f.fases || [] }];
      opcoes.forEach((opcao: any) => {
        (opcao.fases || []).forEach((fase: any) => {
          (fase.itens || []).forEach((item: any) => {
            totalFornecedor += item.valor * (1 - (item.desconto || 0) / 100);
          });
        });
      });
      totais.push([f.nome, totalFornecedor]);
      totalGeral += totalFornecedor;
    });
  }

  if (payload.assets?.length > 0) {
    totais.push(['Asset', 'Valor']);
    payload.assets.forEach((a: any) => {
      totais.push([a.title || a.id, a.price || 0]);
      totalGeral += a.price || 0;
    });
  }

  totais.push([]);
  
  // Honorário
  if (payload.honorario?.aplicar) {
    const valorBase = totalGeral;
    const valorHonorario = valorBase * (payload.honorario.percentual / 100);
    totais.push(['Subtotal', valorBase]);
    totais.push([`Honorário (${payload.honorario.percentual}%)`, valorHonorario]);
    totalGeral = valorBase + valorHonorario;
  }

  totais.push(['TOTAL GERAL', totalGeral]);

  const wsTotais = XLSX.utils.aoa_to_sheet(totais);
  wsTotais['!cols'] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, wsTotais, 'Totais');

  // Download
  XLSX.writeFile(workbook, filename || `${budget.display_id || 'orcamento'}.xlsx`);
};
