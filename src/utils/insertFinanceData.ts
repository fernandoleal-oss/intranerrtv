import { supabase } from "@/integrations/supabase/client";

const parseValor = (valor: string): number => {
  // Remove R$, espaços e converte para número em centavos
  return Math.round(parseFloat(valor.replace(/[R$\s.]/g, '').replace(',', '.')) * 100);
};

const parsePercentual = (percentual: string): number => {
  return parseFloat(percentual.replace('%', ''));
};

export async function insertFinanceDataAgosto() {
  const agosto = [
    { cliente: "BRIDGSTONES", ap: "27.738", descricao: "PNEU NOVO, TANQUE CHEIO", fornecedor: "CANJA", valor_fornecedor: "R$ 20.300,00", honorario: "10%", honorario_agencia: "R$ 2.030,00", total: "R$ 22.330,00" },
    { cliente: "BRIDGSTONES", ap: "27.528", descricao: "BOLEIA - CAMINHÃO", fornecedor: "CAIO SOARES DIRECAO DE ARTE", valor_fornecedor: "R$ 20.100,00", honorario: "10%", honorario_agencia: "R$ 2.010,00", total: "R$ 22.110,00" },
    { cliente: "BRIDGSTONES", ap: "27.709", descricao: "PEGADA", fornecedor: "LE MONSTER", valor_fornecedor: "R$ 44.000,00", honorario: "10%", honorario_agencia: "R$ 4.400,00", total: "R$ 48.400,00" },
    { cliente: "SHOPEE", ap: "", descricao: "CLOSED CAPTION CAMPANHA 8.8", fornecedor: "INTERNO", valor_fornecedor: "R$ 0,00", honorario: "0%", honorario_agencia: "R$ 4.500,00", total: "R$ 4.500,00" },
    { cliente: "BYD", ap: "27.723", descricao: "REGISTRO ANCINE__RAKING_1X30\"_VEICULAÇÃO: TODAS AS MIDIAS_NACIONAL_PERÍODO: 12 MESES", fornecedor: "RAIZ STUDIO", valor_fornecedor: "R$ 9.605,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 9.605,00" },
    { cliente: "BYD", ap: "", descricao: "LOCUÇÃO E REGRAVAÇÃO", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 11.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 11.000,00" },
    { cliente: "BYD", ap: "", descricao: "ANIMAÇÃO DE LETREIRO", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 9.895,00", honorario: "0%", honorario_agencia: "R$ 9.895,00", total: "R$ 19.790,00" },
    { cliente: "BYD", ap: "27.788", descricao: "COMPRA DE IMAGEM: ID: 2389551123; ID: 2458824295; ID: 2057307713; ID: 2195004687", fornecedor: "SHUTTERSTOCK", valor_fornecedor: "R$ 4.600,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 4.600,00" },
    { cliente: "BYD", ap: "27.866", descricao: "VAREJO SONG PRO 0105", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "27.866", descricao: "VAREJO SONG PRO 0105", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 26.000,00", honorario: "0%", honorario_agencia: "R$ 26.000,00", total: "R$ 52.000,00" },
    { cliente: "BYD", ap: "27.870", descricao: "DOLPHIN MINI | FILME EMERSON", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "27.870", descricao: "DOLPHIN MINI | FILME EMERSON", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 15.500,00", honorario: "0%", honorario_agencia: "R$ 15.500,00", total: "R$ 31.000,00" },
    { cliente: "BYD", ap: "27.894", descricao: "REGISTRO ANCINE | FILME DOLPHIN MINI", fornecedor: "CUSTO INTERNO", valor_fornecedor: "R$ 4.466,26", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 4.466,26" },
    { cliente: "BYD", ap: "27.901", descricao: "COMPRA DE IMAGEM ID: 1308231094", fornecedor: "GETTY IMAGES", valor_fornecedor: "R$ 3.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 3.000,00" },
    { cliente: "BYD", ap: "27.902", descricao: "COMPRA DE IMAGEM ID: 3549650059", fornecedor: "SHUTTERSTOCK", valor_fornecedor: "R$ 1.273,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 1.273,00" },
  ];

  const records = agosto.map(item => ({
    cliente: item.cliente,
    ap: item.ap || null,
    descricao: item.descricao,
    fornecedor: item.fornecedor,
    valor_fornecedor_cents: parseValor(item.valor_fornecedor),
    honorario_percent: parsePercentual(item.honorario),
    honorario_agencia_cents: parseValor(item.honorario_agencia),
    total_cents: parseValor(item.total),
    ref_month: '2024-08-01',
    imported_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('finance_events')
    .insert(records);

  if (error) {
    console.error('Erro ao inserir dados de agosto:', error);
    throw error;
  }

  return { success: true, count: records.length };
}

export async function insertFinanceDataSetembro() {
  const setembro = [
    { cliente: "BYD", ap: "28.186", descricao: "BYD SONG PRO - varejo 30\" versão 2 de 5", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "28.189", descricao: "BYD SONG PRO - varejo 5\" versão 3 de 5", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 10.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 10.000,00" },
    { cliente: "BYD", ap: "28.190", descricao: "VAREJO SONG PRO 0405", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 10.500,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 10.500,00" },
    { cliente: "BYD", ap: "28.190", descricao: "VAREJO SONG PRO 0405", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 9.500,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 9.500,00" },
    { cliente: "BYD", ap: "28.096", descricao: "AP referente ao custo de compra de imagens na shutter", fornecedor: "SHUTTERSTOCK", valor_fornecedor: "R$ 4.600,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 4.600,00" },
    { cliente: "BYD", ap: "28.106", descricao: "REGISTRO ANCINE | BYD - Dolphin Mini 2026", fornecedor: "INTERNO", valor_fornecedor: "R$ 5.550,22", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 5.550,22" },
    { cliente: "BYD", ap: "28.192", descricao: "ANIMAÇÃO DE LETREIRO", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 25.999,78", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 25.999,78" },
    { cliente: "BYD", ap: "28.192", descricao: "01 trilha composta de 30\" com vocal + reduções", fornecedor: "ANTFOOD", valor_fornecedor: "R$ 65.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 65.000,00" },
    { cliente: "BYD", ap: "28.116", descricao: "COMPRA DE IMAGEM: ID 1701646153", fornecedor: "SHUTTERSTOCK", valor_fornecedor: "R$ 1.150,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 1.150,00" },
    { cliente: "BYD", ap: "28.124", descricao: "DENZA - CAMPANHA - LANÇAMENTO NO BRASIL COMPRA DE IMAGEM: 2287137241", fornecedor: "SHUTTERSTOCK", valor_fornecedor: "R$ 1.150,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 1.150,00" },
    { cliente: "BYD", ap: "28.129", descricao: "REGISTRO CONDECINE_INTITUCIONAL_DURAÇÃO: 1X30\"", fornecedor: "02 FILMES", valor_fornecedor: "R$ 5.583,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 5.583,00" },
    { cliente: "BYD", ap: "", descricao: "Locutor voz + adaptação de trilha (Satelite)", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "", descricao: "Edição, letterings e animação de letreiros", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 26.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 26.000,00" },
    { cliente: "BYD", ap: "28.127", descricao: "BYD | SONG PLUS | FILME MARINA RUY", fornecedor: "MELANINA FILMES", valor_fornecedor: "R$ 17.359,51", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 17.359,51" },
    { cliente: "BYD", ap: "", descricao: "BYD | SONG PLUS | FILME MARINA RUY", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 0,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 0,00" },
    { cliente: "BYD", ap: "", descricao: "BYD | SONG PLUS | FILME MARINA RUY", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 0,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 0,00" },
    { cliente: "BYD", ap: "", descricao: "BYD - SATISFAÇÃO", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "", descricao: "BYD - SATISFAÇÃO", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 26.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 26.000,00" },
    { cliente: "BYD", ap: "28.267", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "28.267", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 26.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 26.000,00" },
    { cliente: "BYD", ap: "28.268", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "28.268", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 26.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 26.000,00" },
    { cliente: "BYD", ap: "28.271", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 22.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 22.000,00" },
    { cliente: "BYD", ap: "28.271", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 26.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 26.000,00" },
    { cliente: "BYD", ap: "28.272", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 8.500,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 8.500,00" },
    { cliente: "BYD", ap: "28.272", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 11.500,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 11.500,00" },
    { cliente: "BYD", ap: "28.273", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "28.273", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 6.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 6.000,00" },
    { cliente: "BYD", ap: "28.274", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 8.500,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 8.500,00" },
    { cliente: "BYD", ap: "28.274", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 11.500,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 11.500,00" },
    { cliente: "BYD", ap: "28.275", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "28.275", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 26.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 26.000,00" },
    { cliente: "BYD FROTA", ap: "28.278", descricao: "PRODUÇÃO DE 6 VINHETAS DE 5\" DO PACOTE SELEÇÃO GLOBO", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 35.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 35.000,00" },
    { cliente: "EMS", ap: "28.034", descricao: "REPOFLOR / BENG PRO / CALADRYL - Produção", fornecedor: "BOILER FILMES", valor_fornecedor: "R$ 1.342.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 1.342.000,00" },
    { cliente: "EMS", ap: "28.034", descricao: "REPOFLOR / BENG PRO / CALADRYL - Produção", fornecedor: "CANJA", valor_fornecedor: "R$ 126.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 126.000,00" },
    { cliente: "EMS", ap: "28.034", descricao: "REPOFLOR / BENG PRO / CALADRYL - Produção", fornecedor: "MOCKUP10 PRODUÇÕES E EFEITOS ESPECIAIS EIRELI-ME", valor_fornecedor: "R$ 3.700,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 3.700,00" },
    { cliente: "EMS", ap: "28.034", descricao: "REPOFLOR / BENG PRO / CALADRYL - Produção", fornecedor: "BUMBLEBEAT - CREATIVE AUDIO HIVE", valor_fornecedor: "R$ 28.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 28.000,00" },
    { cliente: "EMS", ap: "28.034", descricao: "Link para monitoramento remoto em 2 diárias de filmagem", fornecedor: "BOILER FILMES", valor_fornecedor: "R$ 6.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 6.000,00" },
    { cliente: "SHOPEE", ap: "", descricao: "CAMPANHA 10.10 - TVC - ENVIO DE MATERIAL", fornecedor: "INTERNO", valor_fornecedor: "R$ 3.600,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 3.600,00" },
    { cliente: "BRIDGESTONE", ap: "28.006", descricao: "JOB: FIRESTONE - IA_LOCUÇÃO", fornecedor: "CANJA", valor_fornecedor: "R$ 20.300,00", honorario: "10%", honorario_agencia: "R$ 2.030,00", total: "R$ 22.330,00" },
    { cliente: "BRIDGESTONE", ap: "28.007", descricao: "JOB: FIRESTONE - IA_LOCUÇÃO", fornecedor: "INTERNO", valor_fornecedor: "R$ 2.300,00", honorario: "10%", honorario_agencia: "R$ 230,00", total: "R$ 2.530,00" },
    { cliente: "LOJAS TORRA", ap: "28258", descricao: "PRODUÇÃO DE 1 CLOSED CAPTION PARA O FILME DIA DAS CRIANÇAS", fornecedor: "INTERNO", valor_fornecedor: "R$ 900,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 900,00" },
    { cliente: "NOVIBET", ap: "28041", descricao: "TRADUÇÃO_CUSTO ABSORVIDO PELA AGÊNCIA", fornecedor: "GIOVANNI", valor_fornecedor: "R$ 4.100,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 4.100,00" },
    { cliente: "WE", ap: "28123", descricao: "TRADUÇÃO APRESENTAÇÃO WE_CUSTO ABSORVIDO PELA AGÊNCIA", fornecedor: "GIOVANNI", valor_fornecedor: "R$ 3.500,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 3.500,00" },
  ];

  const records = setembro.map(item => ({
    cliente: item.cliente,
    ap: item.ap || null,
    descricao: item.descricao,
    fornecedor: item.fornecedor,
    valor_fornecedor_cents: parseValor(item.valor_fornecedor),
    honorario_percent: parsePercentual(item.honorario),
    honorario_agencia_cents: parseValor(item.honorario_agencia),
    total_cents: parseValor(item.total),
    ref_month: '2024-09-01',
    imported_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('finance_events')
    .insert(records);

  if (error) {
    console.error('Erro ao inserir dados de setembro:', error);
    throw error;
  }

  return { success: true, count: records.length };
}

export async function insertFinanceDataOutubro() {
  const outubro = [
    { cliente: "EMS", ap: "", descricao: "PLANO GOOGLE (DERMACYD)", fornecedor: "A GANDAIA", valor_fornecedor: "R$ 15.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 15.000,00" },
    { cliente: "BRIDGSTONE", ap: "", descricao: "BLACK FRIDAY", fornecedor: "A GANDAIA", valor_fornecedor: "R$ 27.200,00", honorario: "10%", honorario_agencia: "R$ 2.720,00", total: "R$ 29.920,00" },
    { cliente: "BYD", ap: "", descricao: "Novo Ancine - claquete Footage (Cine)", fornecedor: "CINE", valor_fornecedor: "R$ 5.930,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 5.930,00" },
    { cliente: "BYD", ap: "", descricao: "TAXA CONDECINE_CAMAÇARI_FILME BRASILEIRO", fornecedor: "O2 FILMES", valor_fornecedor: "R$ 5.583,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 5.583,00" },
    { cliente: "BYD", ap: "", descricao: "Referente a produção do filme Telões", fornecedor: "STINK FILMS SÃO PAULO", valor_fornecedor: "R$ 385.025,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 385.025,00" },
    { cliente: "BYD", ap: "", descricao: "Produção de áudio: Marina", fornecedor: "EVIL TWIN", valor_fornecedor: "R$ 45.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 45.000,00" },
    { cliente: "BYD", ap: "", descricao: "TAXA ANCINE", fornecedor: "STINK FILMS SÃO PAULO", valor_fornecedor: "R$ 5.975,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 5.975,00" },
    { cliente: "BYD", ap: "", descricao: "VALOR COMPLEMENTAR A AP 28491", fornecedor: "STINK FILMS SÃO PAULO", valor_fornecedor: "R$ 9.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 9.000,00" },
    { cliente: "BYD", ap: "", descricao: "Revista - Anúncio - Top Of Mind - Compra de imagens SHUTTERSTOCK ID1574160505", fornecedor: "SHUTTERSTOCK", valor_fornecedor: "R$ 1.150,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 1.150,00" },
    { cliente: "BYD", ap: "", descricao: "Revista - Anúncio - Top Of Mind - Compra de imagens GETTY", fornecedor: "GETTY IMAGES", valor_fornecedor: "R$ 3.800,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 3.800,00" },
    { cliente: "BYD", ap: "", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 26.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 26.000,00" },
    { cliente: "BYD", ap: "", descricao: "Custo de locução + trilha adaptada + edição, aplicação de letterings, motion para 1 filme de 30\"", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "", descricao: "DESENVOLVIMENTO E ENTREGA DE 5 PEÇAS EM IA", fornecedor: "CAIO SOARES DIRECAO DE ARTE", valor_fornecedor: "R$ 15.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 15.000,00" },
    { cliente: "BYD", ap: "", descricao: "1 Filme 15\" final novela + 48h eletrizantes", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 3.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 3.000,00" },
    { cliente: "BYD", ap: "", descricao: "1 Filme 15\" final novela + 48h eletrizantes", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 12.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 12.000,00" },
    { cliente: "BYD", ap: "", descricao: "CONTRATAÇÃO DE GUINCHO PARA TRANSPORTE DE 2 CARROS", fornecedor: "STINK FILMS SÃO PAULO", valor_fornecedor: "R$ 5.950,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 5.950,00" },
    { cliente: "BYD", ap: "", descricao: "Projeto Seleção - Desvalorizou menos Volkwagens", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 9.500,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 9.500,00" },
    { cliente: "BYD", ap: "", descricao: "Projeto Seleção - Desvalorizou menos Volkwagens", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 10.500,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 10.500,00" },
    { cliente: "BYD", ap: "", descricao: "1 Filme Varejo 30\" Pronta entrega/Montagem / Cartelas / Locução e finalização", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 26.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 26.000,00" },
    { cliente: "BYD", ap: "", descricao: "1 Filme Varejo 30\" Pronta entrega/Montagem / Cartelas / Locução e finalização", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 14.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 14.000,00" },
    { cliente: "BYD", ap: "", descricao: "1 Vinheta Song Pro 5\" (Pacote Seleção Globo)_Montagem / sem áudio", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 10.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 10.000,00" },
    { cliente: "BYD", ap: "", descricao: "1 Filme 30\" POLO (camisa)_Montagem + locução/finalização", fornecedor: "MONALISA STUDIO LTDA.", valor_fornecedor: "R$ 10.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 10.000,00" },
    { cliente: "BYD", ap: "", descricao: "1 Filme 30\" POLO (camisa)_Montagem + locução/finalização", fornecedor: "SUBSOUND AUDIO PRODUÇÕES LTDA", valor_fornecedor: "R$ 10.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 10.000,00" },
    { cliente: "BYD", ap: "", descricao: "Execução de rotoscopia quadro a quadro dos carros", fornecedor: "STINK FILMS SÃO PAULO", valor_fornecedor: "R$ 18.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 18.000,00" },
    { cliente: "NOVIBET", ap: "", descricao: "GRAVAÇÃO DE TEXTOS E CHAMADAS DE ESPERA", fornecedor: "A GANDAIA", valor_fornecedor: "R$ 12.500,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 12.500,00" },
    { cliente: "WE", ap: "", descricao: "CONCORRÊNCIA", fornecedor: "DIVERSOS FORNECEDORES", valor_fornecedor: "R$ 50.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 50.000,00" },
    { cliente: "WE", ap: "", descricao: "TRADUÇÃO APRESENTAÇÃO WE_CUSTO ABSORVIDO PELA AGÊNCIA", fornecedor: "GIOVANNI", valor_fornecedor: "R$ 8.000,00", honorario: "0%", honorario_agencia: "R$ 0,00", total: "R$ 8.000,00" },
  ];

  const records = outubro.map(item => ({
    cliente: item.cliente,
    ap: item.ap || null,
    descricao: item.descricao,
    fornecedor: item.fornecedor,
    valor_fornecedor_cents: parseValor(item.valor_fornecedor),
    honorario_percent: parsePercentual(item.honorario),
    honorario_agencia_cents: parseValor(item.honorario_agencia),
    total_cents: parseValor(item.total),
    ref_month: '2024-10-01',
    imported_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('finance_events')
    .insert(records);

  if (error) {
    console.error('Erro ao inserir dados de outubro:', error);
    throw error;
  }

  return { success: true, count: records.length };
}

export async function insertAllFinanceData() {
  try {
    const agosto = await insertFinanceDataAgosto();
    const setembro = await insertFinanceDataSetembro();
    const outubro = await insertFinanceDataOutubro();

    return {
      success: true,
      agosto: agosto.count,
      setembro: setembro.count,
      outubro: outubro.count,
      total: agosto.count + setembro.count + outubro.count
    };
  } catch (error) {
    console.error('Erro ao inserir dados financeiros:', error);
    throw error;
  }
}
