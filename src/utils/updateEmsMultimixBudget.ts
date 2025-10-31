import { supabase } from "@/integrations/supabase/client";

export const updateEmsMultimixBudget = async () => {
  try {
    const budgetId = '56213599-35e3-4192-896c-57e78148fc22';
    
    // Buscar a versão atual do orçamento
    const { data: currentVersion, error: fetchError } = await supabase
      .from("versions")
      .select("*")
      .eq("budget_id", budgetId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!currentVersion) throw new Error("Versão não encontrada");

    // Estrutura completa com os 4 fornecedores
    const fornecedores = [
      {
        id: "1",
        nome: "ESTÚDIO PÉ GRANDE",
        contato: "Contato a definir",
        cnpj: "CNPJ a definir",
        desconto: 0,
        fases: [
          {
            id: "1-1",
            nome: "Multimix Assets 3D - Fase 1",
            itens: [
              {
                id: "1-1-1",
                nome: "PACOTE (MODELAGEM + 6 STILLS)",
                valor: 49200.00,
                prazo: "30 dias",
                observacao: "Inclui modelagem 3D completa + 6 stills profissionais",
                desconto: 0
              },
              {
                id: "1-1-2",
                nome: "5 STILLS EXTRAS",
                valor: 27500.00,
                prazo: "18 dias",
                observacao: "Stills adicionais para ampliação do projeto",
                desconto: 0
              },
              {
                id: "1-1-3",
                nome: "1 STILL EXTRA",
                valor: 5860.00,
                prazo: "18 dias",
                observacao: "Still individual adicional",
                desconto: 0
              }
            ]
          },
          {
            id: "1-2",
            nome: "Multimix Assets 3D - Fase 2",
            itens: [
              {
                id: "1-2-1",
                nome: "PACOTE 1 (MODELAGEM + 9 STILLS)",
                valor: 63700.00,
                prazo: "35 dias",
                observacao: "Pacote completo com 9 stills",
                desconto: 0
              },
              {
                id: "1-2-2",
                nome: "PACOTE 2 (MODELAGEM + 8 STILLS)",
                valor: 56700.00,
                prazo: "35 dias",
                observacao: "Pacote alternativo com 8 stills",
                desconto: 0
              },
              {
                id: "1-2-3",
                nome: "5 STILLS EXTRAS",
                valor: 27500.00,
                prazo: "18 dias",
                observacao: "Stills adicionais para fase 2",
                desconto: 0
              },
              {
                id: "1-2-4",
                nome: "1 STILL EXTRA",
                valor: 5860.00,
                prazo: "18 dias",
                observacao: "Still individual para fase 2",
                desconto: 0
              }
            ]
          }
        ]
      },
      {
        id: "2",
        nome: "DIRTY WORD",
        contato: "Contato a definir",
        cnpj: "CNPJ a definir",
        desconto: 0,
        fases: [
          {
            id: "2-1",
            nome: "Shooting e Renders",
            itens: [
              {
                id: "2-1-1",
                nome: "Embalagens",
                valor: 55000.00,
                prazo: "A combinar",
                observacao: "Produção de embalagens",
                desconto: 0
              },
              {
                id: "2-1-2",
                nome: "Balas",
                valor: 60000.00,
                prazo: "A combinar",
                observacao: "Produção de assets de balas",
                desconto: 0
              },
              {
                id: "2-1-3",
                nome: "Pacote",
                valor: 110000.00,
                prazo: "A combinar",
                observacao: "Pacote completo de serviços",
                desconto: 0
              },
              {
                id: "2-1-4",
                nome: "Ervas Unitario",
                valor: 30000.00,
                prazo: "A combinar",
                observacao: "Serviços unitários de ervas",
                desconto: 0
              },
              {
                id: "2-1-5",
                nome: "Pacote Ervas",
                valor: 270000.00,
                prazo: "A combinar",
                observacao: "Pacote completo de ervas",
                desconto: 0
              },
              {
                id: "2-1-6",
                nome: "Renders unitário",
                valor: 20000.00,
                prazo: "A combinar",
                observacao: "Renders individuais",
                desconto: 0
              },
              {
                id: "2-1-7",
                nome: "Shooting até 10 fotos",
                valor: 150000.00,
                prazo: "A combinar",
                observacao: "Sessão de shooting fotográfico",
                desconto: 0
              }
            ]
          }
        ]
      },
      {
        id: "3",
        nome: "MIAGUI IMAGVERTISING",
        contato: "Natalia Monteiro - natalia.monteiro@miagui.cc",
        cnpj: "19.207.788/0001-30",
        desconto: 0,
        fases: [
          {
            id: "3-1",
            nome: "1. Embalagens (3D / modelagem / beneficiamento)",
            itens: [
              {
                id: "3-1-1",
                nome: "Embalagem Adulto (preparação do asset digital)",
                valor: 3717.42,
                prazo: "A combinar",
                observacao: "Preparação individual do asset digital",
                desconto: 0
              },
              {
                id: "3-1-2",
                nome: "Embalagem Kids (preparação do asset digital)",
                valor: 3717.42,
                prazo: "A combinar",
                observacao: "Preparação individual do asset digital",
                desconto: 0
              },
              {
                id: "3-1-3",
                nome: "Bala individual EMBALADA (preparação do asset digital)",
                valor: 3717.42,
                prazo: "A combinar",
                observacao: "Preparação individual do asset digital",
                desconto: 0
              },
              {
                id: "3-1-4",
                nome: "Bala individual SEM EMBALAGEM (preparação do asset digital)",
                valor: 3717.42,
                prazo: "A combinar",
                observacao: "Preparação individual do asset digital",
                desconto: 0
              },
              {
                id: "3-1-5",
                nome: "Imagem individual - Embalagem",
                valor: 2801.68,
                prazo: "A combinar",
                observacao: "Imagem em fundo neutro (custo unitário)",
                desconto: 0
              },
              {
                id: "3-1-6",
                nome: "Imagem individual - Bala embalada",
                valor: 2801.68,
                prazo: "A combinar",
                observacao: "Imagem em fundo neutro (custo unitário)",
                desconto: 0
              },
              {
                id: "3-1-7",
                nome: "Imagem individual - Bala sem embalagem (x2)",
                valor: 5603.36,
                prazo: "A combinar",
                observacao: "2 imagens em fundo neutro (custo unitário cada)",
                desconto: 0
              },
              {
                id: "3-1-8",
                nome: "Combo '1 Adulto + 1 Kids + Pastilha com e sem embalagem' (PACOTE com 5% desconto)",
                valor: 24880.00,
                prazo: "A combinar",
                observacao: "Pacote: 4 assets + 4 imagens finais. Economia de R$ 1.310,44",
                desconto: 0
              }
            ]
          },
          {
            id: "3-2",
            nome: "2. Sabores (rótulos) - Cotar por sabor",
            itens: [
              {
                id: "3-2-1",
                nome: "Troca de rótulo mantendo o mesmo ângulo/render base (unitário por sabor)",
                valor: 3538.24,
                prazo: "A combinar",
                observacao: "Alteração de rótulo sem modificar ângulo",
                desconto: 0
              },
              {
                id: "3-2-2",
                nome: "Render Adicional (novo ângulo)",
                valor: 3538.24,
                prazo: "A combinar",
                observacao: "Novo ângulo de visualização",
                desconto: 0
              }
            ]
          },
          {
            id: "3-3",
            nome: "3. Ervas (3D) - Unitário + Set (10)",
            itens: [
              {
                id: "3-3-1",
                nome: "Erva (unitária) - Adicional para novos sabores / ervas",
                valor: 3553.21,
                prazo: "A combinar",
                observacao: "1 imagem de erva adicional",
                desconto: 0
              },
              {
                id: "3-3-2",
                nome: "Pacote com 10 ervas",
                valor: 20919.90,
                prazo: "A combinar",
                observacao: "10 entregas individuais = 10 imagens finais em fundo neutro. Economia de R$ 14.612,20",
                desconto: 0
              }
            ]
          },
          {
            id: "3-4",
            nome: "4. Pack ambientado (considerar mockups)",
            itens: [
              {
                id: "3-4-1",
                nome: "1 Pack com 2 sabores (asset já desenvolvido)",
                valor: 13583.58,
                prazo: "A combinar",
                observacao: "Considerando que o asset da embalagem já foi desenvolvido",
                desconto: 0
              },
              {
                id: "3-4-2",
                nome: "2 Packs com 5 sabores (asset já desenvolvido)",
                valor: 25426.00,
                prazo: "A combinar",
                observacao: "Considerando que o asset da embalagem já foi desenvolvido",
                desconto: 0
              },
              {
                id: "3-4-3",
                nome: "Atualização de imagem (troca de rótulo no mesmo ângulo) 9:16 | 16:9, 4:5",
                valor: 3538.24,
                prazo: "A combinar",
                observacao: "Atualização simples de rótulo em diferentes formatos",
                desconto: 0
              }
            ]
          },
          {
            id: "3-5",
            nome: "5. Humanizada (pessoas/IA)",
            itens: [
              {
                id: "3-5-1",
                nome: "Foto humanizada - unitário",
                valor: 12992.11,
                prazo: "A combinar",
                observacao: "Inclui direção/arte, setup de IA, 1 rodada de ajustes, recorte/tratamento",
                desconto: 0
              },
              {
                id: "3-5-2",
                nome: "Pacote 5 fotos humanizadas - ângulos/poses diferentes",
                valor: 61105.00,
                prazo: "A combinar",
                observacao: "5% de desconto no pacote. Economia de R$ 3.855,55",
                desconto: 0
              },
              {
                id: "3-5-3",
                nome: "Pacote 10 fotos humanizadas - ângulos/poses diferentes",
                valor: 115920.00,
                prazo: "A combinar",
                observacao: "10% de desconto no pacote. Economia de R$ 13.001,10",
                desconto: 0
              }
            ]
          }
        ]
      },
      {
        id: "4",
        nome: "LADO ANIMATION",
        contato: "Luciana Pessoa / Rafaela Neves - luciana@ladoanimation.com / rafaela@ladoanimation.com",
        cnpj: "CNPJ a definir",
        desconto: 0,
        fases: [
          {
            id: "4-1",
            nome: "Embalagens 3D em fundo gráfico",
            itens: [
              {
                id: "4-1-1",
                nome: "Embalagem Adulto (unitário)",
                valor: 22000.00,
                prazo: "A combinar",
                observacao: "Modelagem, lookdev, renderização e finalização",
                desconto: 0
              },
              {
                id: "4-1-2",
                nome: "Embalagem Kids (unitário)",
                valor: 22000.00,
                prazo: "A combinar",
                observacao: "Modelagem, lookdev, renderização e finalização",
                desconto: 0
              },
              {
                id: "4-1-3",
                nome: "Bala individual embalada (unitário)",
                valor: 22000.00,
                prazo: "A combinar",
                observacao: "Modelagem, lookdev, renderização e finalização",
                desconto: 0
              },
              {
                id: "4-1-4",
                nome: "Bala individual sem embalagem (unitário)",
                valor: 22000.00,
                prazo: "A combinar",
                observacao: "Modelagem, lookdev, renderização e finalização",
                desconto: 0
              },
              {
                id: "4-1-5",
                nome: "Pastilha avulsa (3D) (unitário)",
                valor: 8148.00,
                prazo: "A combinar",
                observacao: "Modelagem, lookdev, renderização e finalização",
                desconto: 0
              },
              {
                id: "4-1-6",
                nome: "Combo 1 – 1 Adulto + 1 Kids + 2 Pastilhas",
                valor: 46100.00,
                prazo: "A combinar",
                observacao: "Pacote combinado com desconto",
                desconto: 0
              },
              {
                id: "4-1-7",
                nome: "Combo 2 – 2 Adulto + 2 Kids + 4 Pastilhas",
                valor: 66200.00,
                prazo: "A combinar",
                observacao: "Pacote combinado com desconto",
                desconto: 0
              },
              {
                id: "4-1-8",
                nome: "Combo 3 – 3 Adulto + 3 Kids + 6 Pastilhas",
                valor: 92700.00,
                prazo: "A combinar",
                observacao: "Pacote combinado com desconto",
                desconto: 0
              },
              {
                id: "4-1-9",
                nome: "Combo 4 – 6 Packs Copa",
                valor: 75000.00,
                prazo: "A combinar",
                observacao: "Pacote especial Copa",
                desconto: 0
              }
            ]
          },
          {
            id: "4-2",
            nome: "Sabores (rótulos)",
            itens: [
              {
                id: "4-2-1",
                nome: "Troca de rótulo mantendo o mesmo ângulo/render base (unitário)",
                valor: 6042.00,
                prazo: "A combinar",
                observacao: "Por sabor",
                desconto: 0
              },
              {
                id: "4-2-2",
                nome: "Novo ângulo/render (unitário)",
                valor: 8169.00,
                prazo: "A combinar",
                observacao: "Por sabor",
                desconto: 0
              }
            ]
          },
          {
            id: "4-3",
            nome: "Ervas 3D em fundo gráfico",
            itens: [
              {
                id: "4-3-1",
                nome: "Pacote com 3 ervas em fundo gráfico",
                valor: 30000.00,
                prazo: "A combinar",
                observacao: "Modelagem e renderização de ervas (Malva, Tomilho, Sálvia, Hissopo, Tomilho Selvagem, Marroio Branco, Hortelã, Tília, Limão e Erva-cidreira)",
                desconto: 0
              }
            ]
          },
          {
            id: "4-4",
            nome: "Entregas de imagem/render",
            itens: [
              {
                id: "4-4-1",
                nome: "Still neutro (fundo liso) - Unitário",
                valor: 8148.00,
                prazo: "A combinar",
                observacao: "Embalagens ambientadas com fundo neutro",
                desconto: 0
              },
              {
                id: "4-4-2",
                nome: "Still com ingredientes/sabores (composição) - Unitário",
                valor: 15000.00,
                prazo: "A combinar",
                observacao: "Embalagens ambientadas com fundo neutro",
                desconto: 0
              },
              {
                id: "4-4-3",
                nome: "Atualização de imagem (troca de rótulo no mesmo ângulo) - Unitário",
                valor: 6042.00,
                prazo: "A combinar",
                observacao: "Embalagens ambientadas com fundo neutro",
                desconto: 0
              },
              {
                id: "4-4-4",
                nome: "Still neutro (fundo liso) - Pack de 4 imagens",
                valor: 20000.00,
                prazo: "A combinar",
                observacao: "Pacote com desconto",
                desconto: 0
              },
              {
                id: "4-4-5",
                nome: "Still com ingredientes/sabores (composição) - Pack de 4 imagens",
                valor: 30000.00,
                prazo: "A combinar",
                observacao: "Pacote com desconto",
                desconto: 0
              },
              {
                id: "4-4-6",
                nome: "Atualização de imagem (troca de rótulo no mesmo ângulo) - Pack de 4 imagens",
                valor: 20000.00,
                prazo: "A combinar",
                observacao: "Pacote com desconto",
                desconto: 0
              }
            ]
          },
          {
            id: "4-5",
            nome: "Fotos humanizadas",
            itens: [
              {
                id: "4-5-1",
                nome: "Pacote com 5 fotos",
                valor: 80000.00,
                prazo: "A combinar",
                observacao: "Shooting em estúdio com 2 modelos, variação de ângulos e composições",
                desconto: 0
              },
              {
                id: "4-5-2",
                nome: "Pacote com 10 fotos",
                valor: 95000.00,
                prazo: "A combinar",
                observacao: "Shooting em estúdio com 2 modelos, variação de ângulos e composições",
                desconto: 0
              }
            ]
          }
        ]
      }
    ];

    // Criar payload atualizado
    const newPayload = {
      cliente: "EMS",
      produto: "MULTIMIX",
      job: "ASSETS 3D",
      produtor: "Luana Rodrigues",
      estrutura: "fornecedores_fases",
      fornecedores: fornecedores
    };

    // Atualizar a versão existente
    const { error: updateError } = await supabase
      .from("versions")
      .update({
        payload: newPayload,
        updated_at: new Date().toISOString()
      })
      .eq("id", currentVersion.id);

    if (updateError) throw updateError;

    return {
      success: true,
      message: "Orçamento atualizado com 4 fornecedores!",
      fornecedores: fornecedores.length
    };

  } catch (error: any) {
    console.error("Erro ao atualizar orçamento:", error);
    return {
      success: false,
      error: error.message
    };
  }
};
