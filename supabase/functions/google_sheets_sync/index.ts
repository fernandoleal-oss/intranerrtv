import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to get Google access token using jose library
import { SignJWT } from 'https://deno.land/x/jose@v5.2.0/index.ts'
import { importPKCS8 } from 'https://deno.land/x/jose@v5.2.0/index.ts'

async function getGoogleAccessToken(clientEmail: string, privateKey: string, scopes: string[]) {
  try {
    // Clean up the private key - handle both \\n and literal newlines
    let cleanKey = privateKey.trim();
    
    // If the key contains \\n (escaped), replace with actual newlines
    if (cleanKey.includes('\\n')) {
      cleanKey = cleanKey.replace(/\\n/g, '\n');
    }
    
    // Ensure proper PKCS#8 format with headers
    if (!cleanKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Invalid PKCS#8 key format: missing header');
    }
    
    // Import the private key
    const key = await importPKCS8(cleanKey, 'RS256')
    
    const now = Math.floor(Date.now() / 1000)
    
    // Create JWT
    const jwt = await new SignJWT({
      scope: scopes.join(' '),
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt(now)
      .setIssuer(clientEmail)
      .setAudience('https://oauth2.googleapis.com/token')
      .setExpirationTime(now + 3600)
      .sign(key)
    
    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(`Google auth failed: ${JSON.stringify(data)}`)
    }
    
    return data.access_token
  } catch (error) {
    console.error('Error getting Google access token:', error)
    throw error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { spreadsheetId, monthSheets } = await req.json()
    
    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Spreadsheet ID é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Syncing from spreadsheet:', spreadsheetId)

    // Create sync log
    const { data: logData, error: logError } = await supabaseClient
      .from('finance_sync_logs')
      .insert({
        sync_type: 'manual',
        sheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (logError) {
      console.error('Error creating sync log:', logError)
      throw logError
    }

    // Authenticate with Google
    const clientEmail = Deno.env.get('GOOGLE_SHEETS_CLIENT_EMAIL')
    const privateKey = Deno.env.get('GOOGLE_SHEETS_PRIVATE_KEY')

    if (!clientEmail || !privateKey) {
      throw new Error('Google Sheets credentials not configured')
    }

    const token = await getGoogleAccessToken(
      clientEmail,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    )

    let totalSynced = 0
    const sheetsSynced: string[] = []
    const errors: string[] = []

    // Sync monthly sheets
    for (const sheetName of monthSheets || ['agosto_25', 'setembro_25']) {
      try {
        console.log(`Processing sheet: ${sheetName}`)
        
        // Get sheet data
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:H`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          }
        )

        if (!response.ok) {
          console.error(`Failed to fetch sheet ${sheetName}:`, await response.text())
          errors.push(`Sheet ${sheetName}: Failed to fetch data`)
          continue
        }

        const data = await response.json()
        const rows = data.values || []

        if (rows.length < 2) {
          console.log(`Sheet ${sheetName} has no data rows`)
          continue
        }

        // Parse month from sheet name (formato: mes_ano)
        const [monthName, year] = sheetName.toLowerCase().split('_')
        const monthMap: Record<string, string> = {
          'janeiro': '01', 'fevereiro': '02', 'marco': '03', 'abril': '04',
          'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
          'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
        }
        const monthNum = monthMap[monthName]
        const fullYear = year?.length === 2 ? `20${year}` : year
        const refMonth = `${fullYear}-${monthNum}-01`

        console.log(`Parsed date: ${refMonth} from ${sheetName}`)

        let imported = 0
        // Skip header row (row 0)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          
          try {
            const cliente = String(row[0] || '').trim()
            const ap = String(row[1] || '').trim()
            const descricao = String(row[2] || '').trim()
            const fornecedor = String(row[3] || '').trim()
            
            // Parse currency values
            const parseValue = (val: string) => {
              if (!val) return 0
              const cleaned = String(val).replace(/[R$\s.]/g, '').replace(',', '.')
              return Math.round(parseFloat(cleaned) * 100) || 0
            }

            const valorFornecedor = parseValue(row[4])
            const honorarioPercent = parseFloat(String(row[5] || '0').replace(/[^0-9.-]/g, '')) || 0
            const honorarioAgencia = parseValue(row[6])
            const total = parseValue(row[7])

            if (!cliente || total === 0) {
              continue
            }

            const { error: insertError } = await supabaseClient
              .from('finance_events')
              .insert({
                ref_month: refMonth,
                cliente,
                ap: ap || null,
                descricao: descricao || null,
                fornecedor: fornecedor || null,
                valor_fornecedor_cents: valorFornecedor,
                honorario_percent: honorarioPercent || null,
                honorario_agencia_cents: honorarioAgencia,
                total_cents: total,
              })

            if (insertError) {
              // Skip duplicate entries silently
              if (!insertError.message.includes('duplicate key')) {
                console.error(`Error on row ${i + 1}:`, insertError)
                errors.push(`${sheetName} linha ${i + 1}: ${insertError.message}`)
              }
            } else {
              imported++
            }
          } catch (err: any) {
            console.error(`Error processing row ${i + 1}:`, err)
            errors.push(`${sheetName} linha ${i + 1}: ${err.message}`)
          }
        }

        totalSynced += imported
        sheetsSynced.push(sheetName)
        console.log(`Imported ${imported} rows from ${sheetName}`)
      } catch (err: any) {
        console.error(`Error processing sheet ${sheetName}:`, err)
        errors.push(`Sheet ${sheetName}: ${err.message}`)
      }
    }

    // Sync balances sheet (Saldo)
    try {
      console.log('Processing balances sheet: saldo')
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/saldo!A:B`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        const rows = data.values || []

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          const fornecedor = String(row[0] || '').trim()
          const saldoStr = String(row[1] || '0').replace(/[R$\s.]/g, '').replace(',', '.')
          const saldoCents = Math.round(parseFloat(saldoStr) * 100) || 0

          if (!fornecedor) continue

          await supabaseClient
            .from('finance_supplier_balances')
            .upsert({
              fornecedor,
              saldo_cents: saldoCents,
              last_updated: new Date().toISOString(),
            }, {
              onConflict: 'fornecedor'
            })
        }

        sheetsSynced.push('saldo')
      }
    } catch (err: any) {
      console.error('Error syncing balances:', err)
      errors.push(`Saldo: ${err.message}`)
    }

    // Update log
    await supabaseClient
      .from('finance_sync_logs')
      .update({
        status: errors.length > 0 ? 'partial' : 'success',
        completed_at: new Date().toISOString(),
        rows_synced: totalSynced,
        sheets_synced: sheetsSynced,
        error_message: errors.length > 0 ? errors.join('\n') : null,
      })
      .eq('id', logData.id)

    console.log(`Sync completed: ${totalSynced} rows synced from ${sheetsSynced.length} sheets`)

    return new Response(
      JSON.stringify({ 
        ok: true, 
        synced: totalSynced, 
        sheets: sheetsSynced,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Erro ao sincronizar' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
