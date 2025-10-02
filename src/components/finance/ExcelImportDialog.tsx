import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

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
          description: 'Por favor, selecione apenas arquivos Excel (.xlsx ou .xls). PDFs não são suportados.',
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
      const formData = new FormData()
      formData.append('ref_month', refMonth)
      formData.append('file', file)

      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(
        'https://wturfdjywbpzassyuwun.supabase.co/functions/v1/finance_import',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Erro ao processar importação')
      }

      setImportResult({ 
        imported: data.imported || 0, 
        skipped: data.skipped || 0, 
        errors: data.errors || [] 
      })

      if (data.imported > 0) {
        toast({
          title: 'Importação concluída',
          description: `${data.imported} registros importados com sucesso`,
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
      setImportResult({ imported: 0, skipped: 0, errors: [error.message] })
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
        <Button variant="default" className="gap-2 shadow-sm">
          <Upload className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Importar Dados Financeiros</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
            <Alert className="border-blue-500/50 bg-blue-500/10">
            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
            <AlertDescription className="text-sm space-y-2">
              <div>
                <strong className="text-foreground">⚠️ Importante: Apenas arquivos Excel são suportados</strong>
                <p className="text-muted-foreground mt-1">
                  PDFs não podem ser importados diretamente. Por favor, converta seu PDF para Excel (.xlsx) antes de fazer o upload.
                </p>
              </div>
              <div>
                <strong className="text-foreground">Formato esperado (colunas do Excel):</strong>
                <p className="text-muted-foreground mt-1">Cliente | AP | Descrição | Fornecedor | Valor Fornecedor | Honorário % | Honorário Agência | Total</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ref-month" className="text-base">Mês de Referência *</Label>
              <Input
                id="ref-month"
                type="month"
                value={refMonth}
                onChange={(e) => setRefMonth(e.target.value)}
                placeholder="2025-01"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Selecione o mês dos dados financeiros</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excel-file" className="text-base">Arquivo *</Label>
              <div className="relative">
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  className="h-11 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="font-medium">{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {importResult && (
            <Alert 
              variant={importResult.errors.length > 0 ? 'destructive' : 'default'} 
              className={importResult.errors.length === 0 ? 'border-green-500/50 bg-green-500/10' : ''}
            >
              <div className="flex items-start gap-3">
                {importResult.errors.length > 0 ? (
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                )}
                <AlertDescription className="flex-1">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Importados</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {importResult.imported}
                        </p>
                      </div>
                      {importResult.skipped > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Ignorados</p>
                          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {importResult.skipped}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {importResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-semibold text-sm">Erros encontrados:</p>
                        <div className="bg-background/50 rounded-md p-3 max-h-40 overflow-y-auto">
                          <ul className="space-y-1 text-xs">
                            {importResult.errors.slice(0, 10).map((err, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-destructive font-medium">•</span>
                                <span className="flex-1">{err}</span>
                              </li>
                            ))}
                            {importResult.errors.length > 10 && (
                              <li className="text-muted-foreground italic mt-2">
                                ... e mais {importResult.errors.length - 10} erro(s)
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button onClick={handleClose} variant="outline" size="lg">
              {importResult ? 'Fechar' : 'Cancelar'}
            </Button>
            {!importResult && (
              <Button 
                onClick={processExcelFile} 
                disabled={isProcessing || !file || !refMonth}
                size="lg"
                className="min-w-32"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Dados
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
