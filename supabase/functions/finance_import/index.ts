import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const formData = await req.formData()
    const file = formData.get('file') as File
    const refMonth = formData.get('ref_month') as string

    if (!file || !refMonth) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Arquivo e mês de referência são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing file:', file.name, 'for month:', refMonth)

    let rows: any[][] = []
    const refMonthDate = `${refMonth}-01`

    // Process Excel files
    if (file.name.match(/\.(xlsx|xls)$/)) {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
      rows = jsonData.slice(1).filter(row => row.length > 0 && row.some(cell => cell))
    } else if (file.name.match(/\.pdf$/)) {
      // For PDF, extract text and parse table structure
      const arrayBuffer = await file.arrayBuffer()
      const text = new TextDecoder().decode(arrayBuffer)
      
      // Split into lines and look for data rows
      const lines = text.split('\n').filter(line => line.trim())
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Skip header rows and empty lines
        if (!line || line.includes('CLIENTE') || line.includes('DESCRIÇÃO') || line.includes('FORNECEDOR')) {
          continue
        }
        
        // Look for lines with currency values (R$)
        if (line.includes('R$')) {
          // Try to extract structured data using regex patterns
          const currencyPattern = /R\$\s*([\d.,]+)/g
          const matches = [...line.matchAll(currencyPattern)]
          
          if (matches.length >= 1) {
            // Extract values in order: VALOR_FORNECEDOR, HONORARIO_AGENCIA, TOTAL
            const values = matches.map(m => m[1].replace(/\./g, '').replace(',', '.'))
            
            // Try to extract other fields
            const parts = line.split(/\s{2,}|\t|R\$/).filter(p => p.trim())
            
            if (parts.length >= 2) {
              const cliente = parts[0]?.trim() || ''
              const ap = parts[1]?.match(/\d{2}\.\d{3}/) ? parts[1].trim() : ''
              const descricao = parts[2]?.trim() || ''
              const fornecedor = parts[3]?.trim() || ''
              
              // Build row array
              rows.push([
                cliente,
                ap,
                descricao,
                fornecedor,
                values[0] || '0',
                '0', // honorario percent
                values[1] || values[0] || '0',
                values[2] || values[1] || values[0] || '0'
              ])
            }
          }
        }
      }
    }

    console.log(`Found ${rows.length} rows to process`)

    // Create import log
    const { data: logData, error: logError } = await supabaseClient
      .from('finance_import_logs')
      .insert({
        ref_month: refMonthDate,
        sheet_name: file.name,
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (logError) {
      console.error('Error creating log:', logError)
      throw logError
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      try {
        const cliente = String(row[0] || '').trim()
        const ap = String(row[1] || '').trim()
        const descricao = String(row[2] || '').trim()
        const fornecedor = String(row[3] || '').trim()
        const valorFornecedor = parseFloat(String(row[4] || '0').replace(/[^0-9.-]/g, ''))
        const honorarioPercent = parseFloat(String(row[5] || '0').replace(/[^0-9.-]/g, ''))
        const honorarioAgencia = parseFloat(String(row[6] || '0').replace(/[^0-9.-]/g, ''))
        const total = parseFloat(String(row[7] || '0').replace(/[^0-9.-]/g, ''))

        if (!cliente) {
          skipped++
          continue
        }

        const { error: insertError } = await supabaseClient
          .from('finance_events')
          .insert({
            ref_month: refMonthDate,
            cliente,
            ap: ap || null,
            descricao: descricao || null,
            fornecedor: fornecedor || null,
            valor_fornecedor_cents: Math.round(valorFornecedor * 100),
            honorario_percent: honorarioPercent || null,
            honorario_agencia_cents: Math.round(honorarioAgencia * 100),
            total_cents: Math.round(total * 100),
          })

        if (insertError) {
          console.error(`Error on row ${i + 2}:`, insertError)
          errors.push(`Linha ${i + 2}: ${insertError.message}`)
          skipped++
        } else {
          imported++
        }
      } catch (err: any) {
        console.error(`Error processing row ${i + 2}:`, err)
        errors.push(`Linha ${i + 2}: ${err.message}`)
        skipped++
      }
    }

    // Update log
    await supabaseClient
      .from('finance_import_logs')
      .update({
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        rows_imported: imported,
        rows_skipped: skipped,
        error_message: errors.length > 0 ? errors.join('\n') : null,
      })
      .eq('id', logData.id)

    console.log(`Import completed: ${imported} imported, ${skipped} skipped`)

    return new Response(
      JSON.stringify({ ok: true, imported, skipped, errors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Import error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Erro ao processar importação' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
