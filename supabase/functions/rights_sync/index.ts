import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.9.6/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetId } = await req.json();
    
    if (!sheetId) {
      return new Response(
        JSON.stringify({ error: "Sheet ID é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Google Sheets API
    const clientEmail = Deno.env.get("GOOGLE_SHEETS_CLIENT_EMAIL")!;
    const privateKey = Deno.env.get("GOOGLE_SHEETS_PRIVATE_KEY")!.replace(/\\n/g, "\n");

    // Criar JWT
    const pkcs8 = await importPKCS8(privateKey, "RS256");
    const jwt = await new SignJWT({
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(clientEmail)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(pkcs8);

    // Trocar JWT por access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const { access_token } = await tokenRes.json();

    // Buscar abas da planilha
    const sheetsMetaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const sheetsMeta = await sheetsMetaRes.json();
    
    if (!sheetsMeta.sheets) {
      return new Response(
        JSON.stringify({ error: "Planilha não encontrada ou sem abas" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Processar cada aba (cada aba é um cliente)
    const results = [];
    
    for (const sheet of sheetsMeta.sheets) {
      const sheetName = sheet.properties.title;
      
      // Buscar dados da aba
      const dataRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      const data = await dataRes.json();
      
      if (!data.values || data.values.length < 2) {
        console.log(`Aba ${sheetName} vazia ou sem dados`);
        continue;
      }

      // Primeira linha = cabeçalhos
      const headers = data.values[0].map((h: string) => h.toLowerCase().trim());
      
      // Processar cada linha
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        const record: any = { client: sheetName };
        
        headers.forEach((header: string, idx: number) => {
          const value = row[idx]?.toString().trim() || '';
          
          switch (header) {
            case 'produto':
              record.product = value;
              break;
            case 'título':
            case 'titulo':
              record.title = value;
              break;
            case 'assinatura_produção':
            case 'assinatura_producao':
              record.contract_signed_production = value || null;
              break;
            case 'assinatura_elenco':
              record.contract_signed_cast = value || null;
              break;
            case 'primeira_veiculação':
            case 'primeira_veiculacao':
              record.first_air = value || null;
              break;
            case 'validade_meses':
              record.validity_months = value ? parseInt(value) : null;
              break;
            case 'vencimento':
              record.expire_date = value || null;
              break;
            case 'status':
              record.status_label = value || null;
              break;
            case 'link_filme':
              record.link_film = value || null;
              break;
            case 'link_drive':
              record.link_drive = value || null;
              break;
            case 'renovado':
              record.renewed = value.toLowerCase() === 'sim';
              break;
            case 'produtora_audio':
              record.audio_producer = value || null;
              break;
            case 'produtora_filme':
              record.film_producer = value || null;
              break;
          }
        });

        // Inserir ou atualizar
        if (record.product && record.title) {
          const { error } = await supabase
            .from('rights')
            .upsert(record, {
              onConflict: 'client,product,title',
              ignoreDuplicates: false,
            });

          if (error) {
            console.error(`Erro ao salvar ${record.title}:`, error);
          } else {
            results.push(record);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${results.length} registros sincronizados`,
        records: results.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});