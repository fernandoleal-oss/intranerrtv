import * as XLSX from 'xlsx';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun, 
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  convertInchesToTwip
} from 'docx';
import { saveAs } from 'file-saver';

interface ExportBudgetData {
  id: string;
  display_id: string;
  type: string;
  status: string;
  payload: any;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

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

// Exportar Word (DOCX) - Layout limpo e editável
export const exportToWord = async (budget: ExportBudgetData, filename?: string) => {
  const payload = budget.payload || {};
  
  // Configurações de estilo
  const COLORS = {
    primary: "1e40af",    // Azul escuro
    secondary: "475569",  // Cinza
    accent: "059669",     // Verde
    light: "f1f5f9",      // Cinza claro
    text: "1e293b",       // Texto principal
  };

  const createHeading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) => {
    return new Paragraph({
      children: [new TextRun({ text, bold: true, size: level === HeadingLevel.TITLE ? 40 : 28, color: COLORS.primary })],
      heading: level,
      spacing: { before: 300, after: 150 },
    });
  };

  const createSimpleRow = (label: string, value: string, isAlternate = false) => {
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22, color: COLORS.secondary })] })],
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: isAlternate ? { fill: COLORS.light, type: ShadingType.CLEAR } : undefined,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: value || "–", size: 22, color: COLORS.text })] })],
          width: { size: 65, type: WidthType.PERCENTAGE },
          shading: isAlternate ? { fill: COLORS.light, type: ShadingType.CLEAR } : undefined,
        }),
      ],
    });
  };

  const docChildren: (Paragraph | Table)[] = [];

  // === CABEÇALHO ===
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "ORÇAMENTO", bold: true, size: 48, color: COLORS.primary })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: budget.display_id || "", size: 24, color: COLORS.secondary })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({ children: [], spacing: { after: 200 } }) // Espaço
  );

  // === IDENTIFICAÇÃO ===
  docChildren.push(createHeading("Identificação"));

  const infoRows: TableRow[] = [];
  let rowIndex = 0;
  
  if (payload.cliente || payload.agencia) infoRows.push(createSimpleRow("Cliente", payload.cliente || payload.agencia, rowIndex++ % 2 === 0));
  if (payload.produto || payload.projeto) infoRows.push(createSimpleRow("Produto/Projeto", payload.produto || payload.projeto, rowIndex++ % 2 === 0));
  if (payload.job) infoRows.push(createSimpleRow("Job", payload.job, rowIndex++ % 2 === 0));
  if (payload.campanha) infoRows.push(createSimpleRow("Campanha", payload.campanha, rowIndex++ % 2 === 0));
  if (payload.produtor) infoRows.push(createSimpleRow("Produtor", payload.produtor, rowIndex++ % 2 === 0));
  infoRows.push(createSimpleRow("Tipo", budget.type?.toUpperCase() || "–", rowIndex++ % 2 === 0));
  infoRows.push(createSimpleRow("Data", new Date().toLocaleDateString('pt-BR'), rowIndex++ % 2 === 0));

  if (infoRows.length > 0) {
    docChildren.push(new Table({ rows: infoRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  docChildren.push(new Paragraph({ children: [], spacing: { after: 300 } }));

  // === FORNECEDORES ===
  if (payload.fornecedores?.length > 0) {
    docChildren.push(createHeading("Fornecedores"));

    let totalGeral = 0;

    payload.fornecedores.forEach((fornecedor: any, fIdx: number) => {
      // Nome do fornecedor
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `${fIdx + 1}. ${fornecedor.nome || "Fornecedor"}`, bold: true, size: 26, color: COLORS.primary })],
          spacing: { before: 250, after: 100 },
        })
      );

      if (fornecedor.contato) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: `Contato: ${fornecedor.contato}`, size: 20, italics: true, color: COLORS.secondary })],
            spacing: { after: 100 },
          })
        );
      }

      const opcoes = fornecedor.opcoes || [{ nome: "Padrão", fases: fornecedor.fases || [] }];

      opcoes.forEach((opcao: any, oIdx: number) => {
        if (opcoes.length > 1) {
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: `► ${opcao.nome || `Opção ${oIdx + 1}`}`, bold: true, size: 22, color: COLORS.secondary })],
              spacing: { before: 150, after: 80 },
            })
          );
        }

        // Tabela de itens simples
        const tableRows: TableRow[] = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item", bold: true, size: 20 })] })], width: { size: 50, type: WidthType.PERCENTAGE }, shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true, size: 20 })] , alignment: AlignmentType.RIGHT })], width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Prazo", bold: true, size: 20 })] })], width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
            ],
          }),
        ];

        let totalOpcao = 0;
        let itemCount = 0;

        (opcao.fases || []).forEach((fase: any) => {
          // Linha de fase como subtítulo
          if (fase.nome) {
            tableRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: fase.nome.toUpperCase(), bold: true, size: 18, color: COLORS.secondary })] })],
                    columnSpan: 3,
                  }),
                ],
              })
            );
          }

          (fase.itens || []).forEach((item: any) => {
            const valorFinal = (item.valor || 0) * (1 - (item.desconto || 0) / 100);
            totalOpcao += valorFinal;
            itemCount++;

            tableRows.push(
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.nome || item.descricao || "–", size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(valorFinal), size: 20 })] , alignment: AlignmentType.RIGHT })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.prazo || "–", size: 20 })] })] }),
                ],
              })
            );
          });
        });

        // Linha de total da opção
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, size: 22 })] })], shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(totalOpcao), bold: true, size: 22, color: COLORS.accent })] , alignment: AlignmentType.RIGHT })], shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
              new TableCell({ children: [new Paragraph({ children: [] })], shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
            ],
          })
        );

        totalGeral += totalOpcao;

        if (itemCount > 0) {
          docChildren.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          docChildren.push(new Paragraph({ children: [], spacing: { after: 150 } }));
        }
      });
    });

    // Honorário
    if (payload.honorario?.aplicar) {
      const subtotal = totalGeral;
      const valorHonorario = subtotal * (payload.honorario.percentual / 100);
      
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Subtotal: ${formatCurrency(subtotal)}`, size: 22, color: COLORS.text }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Honorário (${payload.honorario.percentual}%): ${formatCurrency(valorHonorario)}`, size: 22, color: COLORS.text }),
          ],
          alignment: AlignmentType.RIGHT,
        })
      );
      
      totalGeral = subtotal + valorHonorario;
    }

    // Total geral
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `TOTAL: ${formatCurrency(totalGeral)}`, bold: true, size: 32, color: COLORS.accent })],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 200, after: 300 },
      })
    );
  }

  // === ASSETS (Imagem) ===
  if (payload.assets?.length > 0) {
    docChildren.push(createHeading("Assets"));

    const assetRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Asset", bold: true, size: 20 })] })], shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tipo", bold: true, size: 20 })] })], shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true, size: 20 })] , alignment: AlignmentType.RIGHT })], shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
        ],
      }),
    ];

    let totalAssets = 0;
    payload.assets.forEach((asset: any) => {
      totalAssets += asset.price || 0;
      assetRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: asset.title || "–", size: 20 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: asset.type || "–", size: 20 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(asset.price || 0), size: 20 })] , alignment: AlignmentType.RIGHT })] }),
          ],
        })
      );
    });

    assetRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, size: 22 })] })], columnSpan: 2, shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(totalAssets), bold: true, size: 22, color: COLORS.accent })] , alignment: AlignmentType.RIGHT })], shading: { fill: COLORS.light, type: ShadingType.CLEAR } }),
        ],
      })
    );

    docChildren.push(new Table({ rows: assetRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    docChildren.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  }

  // === OBSERVAÇÕES ===
  if (payload.observacoes) {
    docChildren.push(createHeading("Observações"));
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: payload.observacoes, size: 22, color: COLORS.text })],
        spacing: { after: 200 },
      })
    );
  }

  // === RODAPÉ ===
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "–––––––––––––––––––––––––––––––––––––", size: 16, color: COLORS.light })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Gerado em ${new Date().toLocaleString('pt-BR')}`, size: 18, italics: true, color: COLORS.secondary })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
    })
  );

  // Criar documento
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: convertInchesToTwip(0.8), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(0.8), right: convertInchesToTwip(0.8) },
        },
      },
      children: docChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename || `${budget.display_id || 'orcamento'}.docx`);
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
