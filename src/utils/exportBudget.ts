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

// Exportar Word (DOCX)
export const exportToWord = async (budget: ExportBudgetData, filename?: string) => {
  const payload = budget.payload || {};
  const docElements: (Paragraph | Table)[] = [];
  
  // Título principal
  docElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "ORÇAMENTO",
          bold: true,
          size: 48,
          color: "1a1a1a",
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // ID do orçamento
  docElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: budget.display_id || budget.id,
          bold: true,
          size: 28,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Linha separadora
  docElements.push(new Paragraph({ spacing: { after: 200 } }));

  // Seção de Identificação
  docElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "IDENTIFICAÇÃO",
          bold: true,
          size: 28,
          color: "333333",
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 200 },
    })
  );

  // Tabela de identificação
  const infoRows: TableRow[] = [];
  
  const addInfoRow = (label: string, value: string) => {
    infoRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: label, bold: true, size: 22 })],
            })],
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "f5f5f5", type: ShadingType.CLEAR },
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: value || "-", size: 22 })],
            })],
            width: { size: 70, type: WidthType.PERCENTAGE },
          }),
        ],
      })
    );
  };

  addInfoRow("Cliente", payload.cliente || payload.agencia || "-");
  addInfoRow("Produto/Projeto", payload.produto || payload.projeto || "-");
  addInfoRow("Tipo", budget.type?.toUpperCase() || "-");
  addInfoRow("Status", budget.status || "-");
  addInfoRow("Data", new Date().toLocaleDateString('pt-BR'));
  
  if (payload.job) addInfoRow("Job", payload.job);
  if (payload.campanha) addInfoRow("Campanha", payload.campanha);
  if (payload.produtor) addInfoRow("Produtor", payload.produtor);

  docElements.push(
    new Paragraph({
      children: [],
    })
  );

  const infoTable = new Table({
    rows: infoRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  // Fornecedores (orçamentos livre/audio)
  if (payload.fornecedores?.length > 0) {
    const fornecedorParagraphs: (Paragraph | Table)[] = [];
    
    fornecedorParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "FORNECEDORES",
            bold: true,
            size: 28,
            color: "333333",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    payload.fornecedores.forEach((fornecedor: any, fIndex: number) => {
      // Nome do fornecedor
      fornecedorParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${fIndex + 1}. ${fornecedor.nome || "Fornecedor"}`,
              bold: true,
              size: 24,
              color: "2563eb",
            }),
          ],
          spacing: { before: 300, after: 100 },
        })
      );

      if (fornecedor.contato) {
        fornecedorParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Contato: ", bold: true, size: 20 }),
              new TextRun({ text: fornecedor.contato, size: 20 }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      // Opções do fornecedor
      const opcoes = fornecedor.opcoes || [{ nome: "Única", fases: fornecedor.fases || [] }];
      
      opcoes.forEach((opcao: any, oIndex: number) => {
        if (opcoes.length > 1) {
          fornecedorParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Opção: ${opcao.nome || `Opção ${oIndex + 1}`}`,
                  bold: true,
                  size: 22,
                  italics: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            })
          );
        }

        // Tabela de itens
        const itemRows: TableRow[] = [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Fase", bold: true, size: 20, color: "ffffff" })] })],
                shading: { fill: "2563eb", type: ShadingType.CLEAR },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Item", bold: true, size: 20, color: "ffffff" })] })],
                shading: { fill: "2563eb", type: ShadingType.CLEAR },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true, size: 20, color: "ffffff" })] , alignment: AlignmentType.RIGHT })],
                shading: { fill: "2563eb", type: ShadingType.CLEAR },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Prazo", bold: true, size: 20, color: "ffffff" })] })],
                shading: { fill: "2563eb", type: ShadingType.CLEAR },
              }),
            ],
          }),
        ];

        let totalOpcao = 0;

        (opcao.fases || []).forEach((fase: any) => {
          (fase.itens || []).forEach((item: any, itemIndex: number) => {
            const valorFinal = (item.valor || 0) * (1 - (item.desconto || 0) / 100);
            totalOpcao += valorFinal;

            itemRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: itemIndex === 0 ? fase.nome || "-" : "", size: 20 })] })],
                    shading: { fill: itemIndex % 2 === 0 ? "f9fafb" : "ffffff", type: ShadingType.CLEAR },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: item.nome || item.descricao || "-", size: 20 })] })],
                    shading: { fill: itemIndex % 2 === 0 ? "f9fafb" : "ffffff", type: ShadingType.CLEAR },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(valorFinal), size: 20 })] , alignment: AlignmentType.RIGHT })],
                    shading: { fill: itemIndex % 2 === 0 ? "f9fafb" : "ffffff", type: ShadingType.CLEAR },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: item.prazo || "-", size: 20 })] })],
                    shading: { fill: itemIndex % 2 === 0 ? "f9fafb" : "ffffff", type: ShadingType.CLEAR },
                  }),
                ],
              })
            );
          });
        });

        // Linha de total
        itemRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "", size: 20 })] })],
                columnSpan: 2,
                shading: { fill: "e5e7eb", type: ShadingType.CLEAR },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(totalOpcao), bold: true, size: 22 })] , alignment: AlignmentType.RIGHT })],
                shading: { fill: "e5e7eb", type: ShadingType.CLEAR },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true, size: 20 })] })],
                shading: { fill: "e5e7eb", type: ShadingType.CLEAR },
              }),
            ],
          })
        );

        fornecedorParagraphs.push(
          new Table({
            rows: itemRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );

        fornecedorParagraphs.push(new Paragraph({ spacing: { after: 200 } }));
      });
    });

    // Calcular total geral
    let totalGeral = 0;
    payload.fornecedores.forEach((f: any) => {
      const opcoes = f.opcoes || [{ fases: f.fases || [] }];
      opcoes.forEach((opcao: any) => {
        (opcao.fases || []).forEach((fase: any) => {
          (fase.itens || []).forEach((item: any) => {
            totalGeral += (item.valor || 0) * (1 - (item.desconto || 0) / 100);
          });
        });
      });
    });

    // Honorário
    if (payload.honorario?.aplicar) {
      const valorHonorario = totalGeral * (payload.honorario.percentual / 100);
      
      fornecedorParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Subtotal: ", bold: true, size: 22 }),
            new TextRun({ text: formatCurrency(totalGeral), size: 22 }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200 },
        })
      );

      fornecedorParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Honorário (${payload.honorario.percentual}%): `, bold: true, size: 22 }),
            new TextRun({ text: formatCurrency(valorHonorario), size: 22 }),
          ],
          alignment: AlignmentType.RIGHT,
        })
      );

      totalGeral += valorHonorario;
    }

    // Total geral destacado
    fornecedorParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `TOTAL GERAL: ${formatCurrency(totalGeral)}`,
            bold: true,
            size: 28,
            color: "16a34a",
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 200, after: 200 },
      })
    );

    // Add all paragraphs to docElements
    docElements.push(...fornecedorParagraphs);
  }

  // Assets (orçamento de imagem)
  if (payload.assets?.length > 0) {
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "ASSETS",
            bold: true,
            size: 28,
            color: "333333",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const assetRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Título", bold: true, size: 20, color: "ffffff" })] })],
            shading: { fill: "2563eb", type: ShadingType.CLEAR },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Tipo", bold: true, size: 20, color: "ffffff" })] })],
            shading: { fill: "2563eb", type: ShadingType.CLEAR },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Licença", bold: true, size: 20, color: "ffffff" })] })],
            shading: { fill: "2563eb", type: ShadingType.CLEAR },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true, size: 20, color: "ffffff" })] , alignment: AlignmentType.RIGHT })],
            shading: { fill: "2563eb", type: ShadingType.CLEAR },
          }),
        ],
      }),
    ];

    let totalAssets = 0;

    payload.assets.forEach((asset: any, index: number) => {
      totalAssets += asset.price || 0;
      assetRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: asset.title || "-", size: 20 })] })],
              shading: { fill: index % 2 === 0 ? "f9fafb" : "ffffff", type: ShadingType.CLEAR },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: asset.type || "-", size: 20 })] })],
              shading: { fill: index % 2 === 0 ? "f9fafb" : "ffffff", type: ShadingType.CLEAR },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: asset.chosenLicense || "-", size: 20 })] })],
              shading: { fill: index % 2 === 0 ? "f9fafb" : "ffffff", type: ShadingType.CLEAR },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(asset.price || 0), size: 20 })] , alignment: AlignmentType.RIGHT })],
              shading: { fill: index % 2 === 0 ? "f9fafb" : "ffffff", type: ShadingType.CLEAR },
            }),
          ],
        })
      );
    });

    // Total
    assetRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true, size: 20 })] })],
            columnSpan: 3,
            shading: { fill: "e5e7eb", type: ShadingType.CLEAR },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(totalAssets), bold: true, size: 22 })] , alignment: AlignmentType.RIGHT })],
            shading: { fill: "e5e7eb", type: ShadingType.CLEAR },
          }),
        ],
      })
    );

    docElements.push(
      new Table({
        rows: assetRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }

  // Observações
  if (payload.observacoes) {
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "OBSERVAÇÕES",
            bold: true,
            size: 28,
            color: "333333",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: payload.observacoes,
            size: 22,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Rodapé
  docElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Documento gerado em ${new Date().toLocaleString('pt-BR')}`,
          size: 18,
          color: "999999",
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    })
  );

  // Criar documento
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        ...docElements.slice(0, 5), // Título e subtítulo
        infoTable,
        ...docElements.slice(5),
      ],
    }],
  });

  // Gerar e baixar
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
