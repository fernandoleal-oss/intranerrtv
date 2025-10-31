const getBudgetData = () => {
  // Dados ORIGINAIS do EMS MULTIMIX - VALORES SEPARADOS
  return [
    {
      id: "1",
      nome: "ESTÚDIO PÉ GRANDE",
      total_fornecedor: 236320.00,
      contato: "Contato a definir",
      cnpj: "CNPJ a definir",
    fases: [
      {
        id: "1-1",
        nome: "Multimix Assets 3D - Fase 1",
        total_fase: 82560.00,
        itens: [
          {
            id: "1-1-1",
            descricao: "PACOTE (MODELAGEM + 6 STILLS)",
            valor: 49200.00,
            prazo: "30 dias",
            observacoes: "Inclui modelagem 3D completa + 6 stills profissionais"
          },
          {
            id: "1-1-2",
            descricao: "5 STILLS EXTRAS",
            valor: 27500.00,
            prazo: "18 dias",
            observacoes: "Stills adicionais para ampliação do projeto"
          },
          {
            id: "1-1-3",
            descricao: "1 STILL EXTRA",
            valor: 5860.00,
            prazo: "18 dias",
            observacoes: "Still individual adicional"
          }
        ]
      },
      {
        id: "1-2",
        nome: "Multimix Assets 3D - Fase 2",
        total_fase: 153760.00,
        itens: [
          {
            id: "1-2-1",
            descricao: "PACOTE 1 (MODELAGEM + 9 STILLS)",
            valor: 63700.00,
            prazo: "35 dias",
            observacoes: "Pacote completo com 9 stills"
          },
          {
            id: "1-2-2",
            descricao: "PACOTE 2 (MODELAGEM + 8 STILLS)",
            valor: 56700.00,
            prazo: "35 dias",
            observacoes: "Pacote alternativo com 8 stills"
          },
          {
            id: "1-2-3",
            descricao: "5 STILLS EXTRAS",
            valor: 27500.00,
            prazo: "18 dias",
            observacoes: "Stills adicionais para fase 2"
          },
          {
            id: "1-2-4",
            descricao: "1 STILL EXTRA",
            valor: 5860.00,
            prazo: "18 dias",
            observacoes: "Still individual para fase 2"
          }
        ]
      }
    ]
  },
  {
    id: "2",
    nome: "DIRTY WORD",
    total_fornecedor: 695000.00,
    contato: "Contato a definir", 
    cnpj: "CNPJ a definir",
    fases: [
      {
        id: "2-1",
        nome: "Shooting e Renders",
        total_fase: 695000.00,
        itens: [
          {
            id: "2-1-1",
            descricao: "Embalagens",
            valor: 55000.00,
            prazo: "A combinar",
            observacoes: "Produção de embalagens"
          },
          {
            id: "2-1-2",
            descricao: "Balas",
            valor: 60000.00,
            prazo: "A combinar",
            observacoes: "Produção de assets de balas"
          },
          {
            id: "2-1-3",
            descricao: "Pacote",
            valor: 110000.00,
            prazo: "A combinar",
            observacoes: "Pacote completo de serviços"
          },
          {
            id: "2-1-4",
            descricao: "Ervas Unitario",
            valor: 30000.00,
            prazo: "A combinar",
            observacoes: "Serviços unitários de ervas"
          },
          {
            id: "2-1-5",
            descricao: "Pacote Ervas",
            valor: 270000.00,
            prazo: "A combinar",
            observacoes: "Pacote completo de ervas"
          },
          {
            id: "2-1-6",
            descricao: "Renders unitário",
            valor: 20000.00,
            prazo: "A combinar",
            observacoes: "Renders individuais"
          },
          {
            id: "2-1-7",
            descricao: "Shooting até 10 fotos",
            valor: 150000.00,
            prazo: "A combinar",
            observacoes: "Sessão de shooting fotográfico"
          }
        ]
      }
    ]
  },
  {
    id: "3",
    nome: "MIAGUI IMAGVERTISING",
    total_fornecedor: 315070.92,
    contato: "Natalia Monteiro - natalia.monteiro@miagui.cc",
    cnpj: "19.207.788/0001-30",
    fases: [
      {
        id: "3-1",
        nome: "1. Embalagens (3D / modelagem / beneficiamento)",
        total_fase: 50956.40,
        itens: [
          {
            id: "3-1-1",
            descricao: "Embalagem Adulto (preparação do asset digital)",
            valor: 3717.42,
            prazo: "A combinar",
            observacoes: "Preparação individual do asset digital"
          },
          {
            id: "3-1-2",
            descricao: "Embalagem Kids (preparação do asset digital)",
            valor: 3717.42,
            prazo: "A combinar",
            observacoes: "Preparação individual do asset digital"
          },
          {
            id: "3-1-3",
            descricao: "Bala individual EMBALADA (preparação do asset digital)",
            valor: 3717.42,
            prazo: "A combinar",
            observacoes: "Preparação individual do asset digital"
          },
          {
            id: "3-1-4",
            descricao: "Bala individual SEM EMBALAGEM (preparação do asset digital)",
            valor: 3717.42,
            prazo: "A combinar",
            observacoes: "Preparação individual do asset digital"
          },
          {
            id: "3-1-5",
            descricao: "Imagem individual - Embalagem",
            valor: 2801.68,
            prazo: "A combinar",
            observacoes: "Imagem em fundo neutro (custo unitário)"
          },
          {
            id: "3-1-6",
            descricao: "Imagem individual - Bala embalada",
            valor: 2801.68,
            prazo: "A combinar",
            observacoes: "Imagem em fundo neutro (custo unitário)"
          },
          {
            id: "3-1-7",
            descricao: "Imagem individual - Bala sem embalagem (x2)",
            valor: 5603.36,
            prazo: "A combinar",
            observacoes: "2 imagens em fundo neutro (custo unitário cada)"
          },
          {
            id: "3-1-8",
            descricao: "Combo '1 Adulto + 1 Kids + Pastilha com e sem embalagem' (PACOTE com 5% desconto)",
            valor: 24880.00,
            prazo: "A combinar",
            observacoes: "Pacote: 4 assets + 4 imagens finais. Economia de R$ 1.310,44"
          }
        ]
      },
      {
        id: "3-2",
        nome: "2. Sabores (rótulos) - Cotar por sabor",
        total_fase: 7076.48,
        itens: [
          {
            id: "3-2-1",
            descricao: "Troca de rótulo mantendo o mesmo ângulo/render base (unitário por sabor)",
            valor: 3538.24,
            prazo: "A combinar",
            observacoes: "Alteração de rótulo sem modificar ângulo"
          },
          {
            id: "3-2-2",
            descricao: "Render Adicional (novo ângulo)",
            valor: 3538.24,
            prazo: "A combinar",
            observacoes: "Novo ângulo de visualização"
          }
        ]
      },
      {
        id: "3-3",
        nome: "3. Ervas (3D) - Unitário + Set (10)",
        total_fase: 24473.11,
        itens: [
          {
            id: "3-3-1",
            descricao: "Erva (unitária) - Adicional para novos sabores / ervas",
            valor: 3553.21,
            prazo: "A combinar",
            observacoes: "1 imagem de erva adicional"
          },
          {
            id: "3-3-2",
            descricao: "Pacote com 10 ervas",
            valor: 20919.90,
            prazo: "A combinar",
            observacoes: "10 entregas individuais = 10 imagens finais em fundo neutro. Economia de R$ 14.612,20"
          }
        ]
      },
      {
        id: "3-4",
        nome: "4. Pack ambientado (considerar mockups)",
        total_fase: 42547.82,
        itens: [
          {
            id: "3-4-1",
            descricao: "1 Pack com 2 sabores (asset já desenvolvido)",
            valor: 13583.58,
            prazo: "A combinar",
            observacoes: "Considerando que o asset da embalagem já foi desenvolvido"
          },
          {
            id: "3-4-2",
            descricao: "2 Packs com 5 sabores (asset já desenvolvido)",
            valor: 25426.00,
            prazo: "A combinar",
            observacoes: "Considerando que o asset da embalagem já foi desenvolvido"
          },
          {
            id: "3-4-3",
            descricao: "Atualização de imagem (troca de rótulo no mesmo ângulo) 9:16 | 16:9, 4:5",
            valor: 3538.24,
            prazo: "A combinar",
            observacoes: "Atualização simples de rótulo em diferentes formatos"
          }
        ]
      },
      {
        id: "3-5",
        nome: "5. Humanizada (pessoas/IA)",
        total_fase: 190017.11,
        itens: [
          {
            id: "3-5-1",
            descricao: "Foto humanizada - unitário",
            valor: 12992.11,
            prazo: "A combinar",
            observacoes: "Inclui direção/arte, setup de IA, 1 rodada de ajustes, recorte/tratamento"
          },
          {
            id: "3-5-2",
            descricao: "Pacote 5 fotos humanizadas - ângulos/poses diferentes",
            valor: 61105.00,
            prazo: "A combinar",
            observacoes: "5% de desconto no pacote. Economia de R$ 3.855,55"
          },
          {
            id: "3-5-3",
            descricao: "Pacote 10 fotos humanizadas - ângulos/poses diferentes",
            valor: 115920.00,
            prazo: "A combinar",
            observacoes: "10% de desconto no pacote. Economia de R$ 13.001,10"
          }
        ]
      }
    ]
  },
  {
    id: "4",
    nome: "LADO ANIMATION",
    total_fornecedor: 0, // Será calculado automaticamente
    contato: "Luciana Pessoa / Rafaela Neves - luciana@ladoanimation.com / rafaela@ladoanimation.com",
    cnpj: "CNPJ a definir",
    fases: [
      {
        id: "4-1",
        nome: "Embalagens 3D em fundo gráfico",
        total_fase: 0,
        itens: [
          {
            id: "4-1-1",
            descricao: "Embalagem Adulto (unitário)",
            valor: 22000.00,
            prazo: "A combinar",
            observacoes: "Modelagem, lookdev, renderização e finalização"
          },
          {
            id: "4-1-2",
            descricao: "Embalagem Kids (unitário)",
            valor: 22000.00,
            prazo: "A combinar",
            observacoes: "Modelagem, lookdev, renderização e finalização"
          },
          {
            id: "4-1-3",
            descricao: "Bala individual embalada (unitário)",
            valor: 22000.00,
            prazo: "A combinar",
            observacoes: "Modelagem, lookdev, renderização e finalização"
          },
          {
            id: "4-1-4",
            descricao: "Bala individual sem embalagem (unitário)",
            valor: 22000.00,
            prazo: "A combinar",
            observacoes: "Modelagem, lookdev, renderização e finalização"
          },
          {
            id: "4-1-5",
            descricao: "Pastilha avulsa (3D) (unitário)",
            valor: 8148.00,
            prazo: "A combinar",
            observacoes: "Modelagem, lookdev, renderização e finalização"
          },
          {
            id: "4-1-6",
            descricao: "Combo 1 – 1 Adulto + 1 Kids + 2 Pastilhas",
            valor: 46100.00,
            prazo: "A combinar",
            observacoes: "Pacote combinado com desconto"
          },
          {
            id: "4-1-7",
            descricao: "Combo 2 – 2 Adulto + 2 Kids + 4 Pastilhas",
            valor: 66200.00,
            prazo: "A combinar",
            observacoes: "Pacote combinado com desconto"
          },
          {
            id: "4-1-8",
            descricao: "Combo 3 – 3 Adulto + 3 Kids + 6 Pastilhas",
            valor: 92700.00,
            prazo: "A combinar",
            observacoes: "Pacote combinado com desconto"
          },
          {
            id: "4-1-9",
            descricao: "Combo 4 – 6 Packs Copa",
            valor: 75000.00,
            prazo: "A combinar",
            observacoes: "Pacote especial Copa"
          }
        ]
      },
      {
        id: "4-2",
        nome: "Sabores (rótulos)",
        total_fase: 0,
        itens: [
          {
            id: "4-2-1",
            descricao: "Troca de rótulo mantendo o mesmo ângulo/render base (unitário)",
            valor: 6042.00,
            prazo: "A combinar",
            observacoes: "Por sabor"
          },
          {
            id: "4-2-2",
            descricao: "Novo ângulo/render (unitário)",
            valor: 8169.00,
            prazo: "A combinar",
            observacoes: "Por sabor"
          }
        ]
      },
      {
        id: "4-3",
        nome: "Ervas 3D em fundo gráfico",
        total_fase: 0,
        itens: [
          {
            id: "4-3-1",
            descricao: "Pacote com 3 ervas em fundo gráfico",
            valor: 30000.00,
            prazo: "A combinar",
            observacoes: "Modelagem e renderização de ervas (Malva, Tomilho, Sálvia, Hissopo, Tomilho Selvagem, Marroio Branco, Hortelã, Tília, Limão e Erva-cidreira)"
          }
        ]
      },
      {
        id: "4-4",
        nome: "Entregas de imagem/render",
        total_fase: 0,
        itens: [
          {
            id: "4-4-1",
            descricao: "Still neutro (fundo liso) - Unitário",
            valor: 8148.00,
            prazo: "A combinar",
            observacoes: "Embalagens ambientadas com fundo neutro"
          },
          {
            id: "4-4-2",
            descricao: "Still com ingredientes/sabores (composição) - Unitário",
            valor: 15000.00,
            prazo: "A combinar",
            observacoes: "Embalagens ambientadas com fundo neutro"
          },
          {
            id: "4-4-3",
            descricao: "Atualização de imagem (troca de rótulo no mesmo ângulo) - Unitário",
            valor: 6042.00,
            prazo: "A combinar",
            observacoes: "Embalagens ambientadas com fundo neutro"
          },
          {
            id: "4-4-4",
            descricao: "Still neutro (fundo liso) - Pack de 4 imagens",
            valor: 20000.00,
            prazo: "A combinar",
            observacoes: "Pacote com desconto"
          },
          {
            id: "4-4-5",
            descricao: "Still com ingredientes/sabores (composição) - Pack de 4 imagens",
            valor: 30000.00,
            prazo: "A combinar",
            observacoes: "Pacote com desconto"
          },
          {
            id: "4-4-6",
            descricao: "Atualização de imagem (troca de rótulo no mesmo ângulo) - Pack de 4 imagens",
            valor: 20000.00,
            prazo: "A combinar",
            observacoes: "Pacote com desconto"
          }
        ]
      },
      {
        id: "4-5",
        nome: "Fotos humanizadas",
        total_fase: 0,
        itens: [
          {
            id: "4-5-1",
            descricao: "Pacote com 5 fotos",
            valor: 80000.00,
            prazo: "A combinar",
            observacoes: "Shooting em estúdio com 2 modelos, variação de ângulos e composições"
          },
          {
            id: "4-5-2",
            descricao: "Pacote com 10 fotos",
            valor: 95000.00,
            prazo: "A combinar",
            observacoes: "Shooting em estúdio com 2 modelos, variação de ângulos e composições"
          }
        ]
      }
    ]
  }
];
};

export default function BudgetEdit() {
  const budgetData = getBudgetData();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Editar Orçamento - EMS Multimix</h1>
      <div className="space-y-6">
        {budgetData.map((fornecedor: any) => (
          <div key={fornecedor.id} className="bg-background border rounded-lg p-4">
            <h2 className="text-xl font-semibold">{fornecedor.nome}</h2>
            <p className="text-sm text-muted-foreground">{fornecedor.contato}</p>
            <p className="text-sm text-muted-foreground">CNPJ: {fornecedor.cnpj}</p>
            <p className="text-lg font-bold mt-2">
              Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fornecedor.total_fornecedor)}
            </p>
            <div className="mt-4 space-y-4">
              {fornecedor.fases?.map((fase: any) => (
                <div key={fase.id} className="border-l-4 border-primary pl-4">
                  <h3 className="font-medium">{fase.nome}</h3>
                  <p className="text-sm font-semibold">
                    Subtotal: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fase.total_fase)}
                  </p>
                  <div className="mt-2 space-y-1">
                    {fase.itens?.map((item: any) => (
                      <div key={item.id} className="text-sm">
                        <span className="font-medium">{item.descricao}</span> - 
                        <span className="text-primary ml-1">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                        </span>
                        {item.prazo && <span className="text-muted-foreground ml-2">({item.prazo})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}