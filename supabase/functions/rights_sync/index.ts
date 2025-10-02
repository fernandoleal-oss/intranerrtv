import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sheetId } = await req.json()
    
    if (!sheetId) {
      throw new Error("sheetId é obrigatório")
    }

    console.log("Sincronização do Google Sheets solicitada para:", sheetId)

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Por enquanto, retornar sucesso sem sincronizar
    // A sincronização via Google Sheets requer configuração adicional
    // Use o botão "Adicionar Direito" para cadastrar manualmente
    console.log("Função de sincronização preparada. Configure as credenciais do Google Sheets para habilitar.")
    
    const totalRecords = 0

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sincronização não configurada. Use o botão 'Adicionar Direito' para cadastrar manualmente.",
        records: totalRecords
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error: any) {
    console.error("Erro:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
