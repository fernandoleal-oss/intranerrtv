import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import * as XLSX from 'xlsx'

interface ExcelImportDialogProps {
  onImportComplete?: () => void
}

export function ExcelImportDialog({ onImportComplete }: ExcelImportDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [refMonth, setRefMonth] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    errors: string[]
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo Excel (.xlsx ou .xls)',
          variant: 'destructive',
        })
        return
      }
      setFile(selectedFile)
      setImportResult(null)
    }
  }

  const processExcelFile = async () => {
    if (!file || !refMonth) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione um arquivo e informe o mês de referência',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    setImportResult(null)

    try {
      // Ler arquivo Excel
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      // Pular a primeira linha (cabeçalho)
      const rows = jsonData.slice(1).filter(row => row.length > 0 && row.some(cell => cell))

      let imported = 0
      let skipped = 0
      const errors: string[] = []

      // Criar log de importação
      const { data: logData, error: logError } = await supabase
        .from('finance_import_logs')
        .insert({
          ref_month: refMonth,
          sheet_name: sheetName,
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (logError) throw logError

      // Processar cada linha
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        
        try {
          // Espera colunas: Cliente, AP, Descrição, Fornecedor, Valor Fornecedor, Honorário %, Honorário Agência, Total
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

          // Inserir no banco
          const { error: insertError } = await supabase
            .from('finance_events')
            .insert({
              ref_month: refMonth,
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
            errors.push(`Linha ${i + 2}: ${insertError.message}`)
            skipped++
          } else {
            imported++
          }
        } catch (err: any) {
          errors.push(`Linha ${i + 2}: ${err.message}`)
          skipped++
        }
      }

      // Atualizar log
      await supabase
        .from('finance_import_logs')
        .update({
          status: errors.length > 0 ? 'completed_with_errors' : 'completed',
          completed_at: new Date().toISOString(),
          rows_imported: imported,
          rows_skipped: skipped,
          error_message: errors.length > 0 ? errors.join('\n') : null,
        })
        .eq('id', logData.id)

      setImportResult({ imported, skipped, errors })

      if (imported > 0) {
        toast({
          title: 'Importação concluída',
          description: `${imported} registros importados com sucesso`,
        })
        onImportComplete?.()
      }
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error)
      toast({
        title: 'Erro ao importar',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setFile(null)
    setRefMonth('')
    setImportResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Planilha Financeira</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Formato esperado:</strong> Cliente, AP, Descrição, Fornecedor, Valor Fornecedor, Honorário %, Honorário Agência, Total
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="ref-month">Mês de Referência *</Label>
            <Input
              id="ref-month"
              type="month"
              value={refMonth}
              onChange={(e) => setRefMonth(e.target.value)}
              placeholder="2025-01"
            />
          </div>

          <div>
            <Label htmlFor="excel-file">Arquivo Excel *</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </div>

          {importResult && (
            <Alert variant={importResult.errors.length > 0 ? 'destructive' : 'default'}>
              {importResult.errors.length > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>Importados:</strong> {importResult.imported} registros
                  </p>
                  {importResult.skipped > 0 && (
                    <p>
                      <strong>Ignorados:</strong> {importResult.skipped} registros
                    </p>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold">Erros:</p>
                      <ul className="list-disc pl-5 text-xs mt-1 max-h-32 overflow-y-auto">
                        {importResult.errors.slice(0, 10).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li>... e mais {importResult.errors.length - 10} erros</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} variant="outline">
              {importResult ? 'Fechar' : 'Cancelar'}
            </Button>
            {!importResult && (
              <Button onClick={processExcelFile} disabled={isProcessing || !file || !refMonth}>
                {isProcessing ? 'Processando...' : 'Importar'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
