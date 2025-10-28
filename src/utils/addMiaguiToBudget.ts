import { supabase } from "@/integrations/supabase/client";

export async function addMiaguiToOrcamento() {
  const budgetId = '56213599-35e3-4192-896c-57e78148fc22';
  
  // Buscar versão atual
  const { data: currentVersion, error: fetchError } = await supabase
    .from('versions')
    .select('*')
    .eq('budget_id', budgetId)
    .order('versao', { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !currentVersion) {
    console.error('Erro ao buscar versão atual:', fetchError);
    return { success: false, error: fetchError };
  }

  const currentPayload = (currentVersion.payload || {}) as any;
  
  // Adicionar fornecedor MIAGUI
  const miaguiFornecedor = {
    id: "miagui-001",
    nome: "MIAGUI IMAGVERTISING",
    contato: "Natalia Monteiro - natalia.monteiro@miagui.cc | CNPJ: 19.207.788/0001-30",
    fases: [
      {
        id: "miagui-fase-1",
        nome: "1. Embalagens (3D / modelagem / beneficiamento)",
        itens: [
          { id: "miagui-1-1", nome: "Embalagem Adulto (preparação do asset digital)", valor: 3717.42, prazo: "A combinar", observacao: "Preparação individual do asset digital" },
          { id: "miagui-1-2", nome: "Embalagem Kids (preparação do asset digital)", valor: 3717.42, prazo: "A combinar", observacao: "Preparação individual do asset digital" },
          { id: "miagui-1-3", nome: "Bala individual EMBALADA (preparação do asset digital)", valor: 3717.42, prazo: "A combinar", observacao: "Preparação individual do asset digital" },
          { id: "miagui-1-4", nome: "Bala individual SEM EMBALAGEM (preparação do asset digital)", valor: 3717.42, prazo: "A combinar", observacao: "Preparação individual do asset digital" },
          { id: "miagui-1-5", nome: "Imagem individual - Embalagem", valor: 2801.68, prazo: "A combinar", observacao: "Imagem em fundo neutro (custo unitário)" },
          { id: "miagui-1-6", nome: "Imagem individual - Bala embalada", valor: 2801.68, prazo: "A combinar", observacao: "Imagem em fundo neutro (custo unitário)" },
          { id: "miagui-1-7", nome: "Imagem individual - Bala sem embalagem (x2)", valor: 5603.36, prazo: "A combinar", observacao: "2 imagens em fundo neutro" },
          { id: "miagui-1-8", nome: "Combo completo (PACOTE 5% desconto)", valor: 24880.00, prazo: "A combinar", observacao: "1 Adulto + 1 Kids + Pastilha com/sem embalagem = 4 assets + 4 imagens. Economia de R$ 1.310,44" }
        ]
      },
      {
        id: "miagui-fase-2",
        nome: "2. Sabores (rótulos) - Cotar por sabor",
        itens: [
          { id: "miagui-2-1", nome: "Troca de rótulo mantendo o mesmo ângulo/render base", valor: 3538.24, prazo: "A combinar", observacao: "Unitário por sabor - alteração sem modificar ângulo" },
          { id: "miagui-2-2", nome: "Render Adicional (novo ângulo)", valor: 3538.24, prazo: "A combinar", observacao: "Novo ângulo de visualização" }
        ]
      },
      {
        id: "miagui-fase-3",
        nome: "3. Ervas (3D) - Unitário + Set (10)",
        itens: [
          { id: "miagui-3-1", nome: "Erva unitária - Adicional para novos sabores", valor: 3553.21, prazo: "A combinar", observacao: "1 imagem de erva adicional" },
          { id: "miagui-3-2", nome: "Pacote com 10 ervas", valor: 20919.90, prazo: "A combinar", observacao: "10 entregas individuais = 10 imagens finais em fundo neutro. Economia de R$ 14.612,20" }
        ]
      },
      {
        id: "miagui-fase-4",
        nome: "4. Pack ambientado (considerar mockups)",
        itens: [
          { id: "miagui-4-1", nome: "1 Pack com 2 sabores (asset já desenvolvido)", valor: 13583.58, prazo: "A combinar", observacao: "Considerando embalagem já desenvolvida" },
          { id: "miagui-4-2", nome: "2 Packs com 5 sabores (asset já desenvolvido)", valor: 25426.00, prazo: "A combinar", observacao: "Considerando embalagem já desenvolvida" },
          { id: "miagui-4-3", nome: "Atualização de imagem - troca de rótulo", valor: 3538.24, prazo: "A combinar", observacao: "9:16 | 16:9, 4:5 - mesmo ângulo" }
        ]
      },
      {
        id: "miagui-fase-5",
        nome: "5. Humanizada (pessoas/IA)",
        itens: [
          { id: "miagui-5-1", nome: "Foto humanizada - unitário", valor: 12992.11, prazo: "A combinar", observacao: "Inclui direção/arte, setup de IA, 1 rodada de ajustes, recorte/tratamento" },
          { id: "miagui-5-2", nome: "Pacote 5 fotos humanizadas", valor: 61105.00, prazo: "A combinar", observacao: "Ângulos/poses diferentes - 5% desconto. Economia de R$ 3.855,55" },
          { id: "miagui-5-3", nome: "Pacote 10 fotos humanizadas", valor: 115920.00, prazo: "A combinar", observacao: "Ângulos/poses diferentes - 10% desconto. Economia de R$ 13.001,10" }
        ]
      }
    ]
  };

  // Atualizar payload com novo fornecedor
  const existingFornecedores = Array.isArray(currentPayload.fornecedores) ? currentPayload.fornecedores : [];
  const updatedFornecedores = [...existingFornecedores, miaguiFornecedor];
  
  const newPayload: any = {
    ...currentPayload,
    fornecedores: updatedFornecedores
  };

  // Calcular novo total
  let totalGeral = 0;
  updatedFornecedores.forEach((forn: any) => {
    if (forn.fases && Array.isArray(forn.fases)) {
      forn.fases.forEach((fase: any) => {
        if (fase.itens && Array.isArray(fase.itens)) {
          fase.itens.forEach((item: any) => {
            totalGeral += item.valor || 0;
          });
        }
      });
    }
  });

  // Inserir nova versão
  const { data: newVersion, error: insertError } = await supabase
    .from('versions')
    .insert({
      budget_id: budgetId,
      versao: currentVersion.versao + 1,
      payload: newPayload,
      total_geral: totalGeral
    })
    .select()
    .single();

  if (insertError) {
    console.error('Erro ao criar nova versão:', insertError);
    return { success: false, error: insertError };
  }

  // Atualizar budget
  const { error: updateError } = await supabase
    .from('budgets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', budgetId);

  if (updateError) {
    console.error('Erro ao atualizar budget:', updateError);
  }

  return { 
    success: true, 
    newVersion,
    totalGeral,
    fornecedoresCount: updatedFornecedores.length
  };
}
