import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle, AlertCircle, Loader2, Sheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GoogleSheetsSyncProps {
  onSyncComplete?: () => void;
}

export function GoogleSheetsSync({ onSyncComplete }: GoogleSheetsSyncProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState(
    "1b5isZF7EUyHaSgU3bRZzuFPrTQJ1DbklA0NWpGn0dPI"
  );
  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    "agosto_25",
    "setembro_25"
  ]);
  const [selectedYear, setSelectedYear] = useState("25");
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    sheets: string[];
    errors?: string[];
  } | null>(null);

  const months = [
    { value: "janeiro", label: "Janeiro" },
    { value: "fevereiro", label: "Fevereiro" },
    { value: "marco", label: "Março" },
    { value: "abril", label: "Abril" },
    { value: "maio", label: "Maio" },
    { value: "junho", label: "Junho" },
    { value: "julho", label: "Julho" },
    { value: "agosto", label: "Agosto" },
    { value: "setembro", label: "Setembro" },
    { value: "outubro", label: "Outubro" },
    { value: "novembro", label: "Novembro" },
    { value: "dezembro", label: "Dezembro" },
  ];

  const years = ["24", "25", "26"];

  const toggleMonth = (month: string) => {
    const sheetName = `${month}_${selectedYear}`;
    setSelectedMonths((prev) =>
      prev.includes(sheetName)
        ? prev.filter((m) => m !== sheetName)
        : [...prev, sheetName]
    );
  };

  const handleSync = async () => {
    if (!spreadsheetId) {
      toast({
        title: "ID da planilha necessário",
        description: "Por favor, insira o ID da planilha do Google Sheets",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setSyncResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        "https://wturfdjywbpzassyuwun.supabase.co/functions/v1/google_sheets_sync",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            spreadsheetId,
            monthSheets: selectedMonths,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Erro ao sincronizar");
      }

      setSyncResult({
        synced: data.synced || 0,
        sheets: data.sheets || [],
        errors: data.errors || [],
      });

      if (data.synced > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${data.synced} registros sincronizados de ${data.sheets?.length || 0} aba(s)`,
        });
        onSyncComplete?.();
      } else {
        toast({
          title: "Nenhum dado novo",
          description: "Não foram encontrados novos dados para sincronizar",
        });
      }
    } catch (error: any) {
      console.error("Erro ao sincronizar:", error);
      toast({
        title: "Erro ao sincronizar",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
      setSyncResult({ synced: 0, sheets: [], errors: [error.message] });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSyncResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Sincronizar Google Sheets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Sincronizar com Google Sheets</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Sheet className="h-5 w-5 text-blue-500" />
            <AlertDescription className="text-sm space-y-2">
              <div>
                <strong className="text-foreground">Sincronização automática</strong>
                <p className="text-muted-foreground mt-1">
                  Esta função busca dados das abas mensais (agosto_25, setembro_25, etc.) e da aba "saldo" 
                  para atualizar o sistema automaticamente.
                </p>
              </div>
              <div>
                <strong className="text-foreground">Formato das abas:</strong>
                <p className="text-muted-foreground mt-1">
                  Cliente | AP | Descrição | Fornecedor | Valor Fornecedor | Honorário % | Honorário Agência | Total
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spreadsheet-id" className="text-base">ID da Planilha do Google</Label>
              <Input
                id="spreadsheet-id"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="1b5isZF7EUyHaSgU3bRZzuFPrTQJ1DbklA0NWpGn0dPI"
                className="h-11 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                O ID está na URL: docs.google.com/spreadsheets/d/<strong>ID_AQUI</strong>/edit
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        20{year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Meses para Sincronizar</Label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {months.map((month) => {
                    const sheetName = `${month.value}_${selectedYear}`;
                    return (
                      <div key={month.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={month.value}
                          checked={selectedMonths.includes(sheetName)}
                          onCheckedChange={() => toggleMonth(month.value)}
                        />
                        <label
                          htmlFor={month.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {month.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {syncResult && (
            <Alert 
              variant={syncResult.errors && syncResult.errors.length > 0 ? "destructive" : "default"}
              className={syncResult.errors && syncResult.errors.length === 0 ? "border-green-500/50 bg-green-500/10" : ""}
            >
              <div className="flex items-start gap-3">
                {syncResult.errors && syncResult.errors.length > 0 ? (
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                )}
                <AlertDescription className="flex-1">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Registros Sincronizados</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {syncResult.synced}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Abas Processadas</p>
                        <p className="text-2xl font-bold">{syncResult.sheets.length}</p>
                      </div>
                    </div>
                    
                    {syncResult.sheets.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Abas sincronizadas:</p>
                        <div className="flex flex-wrap gap-2">
                          {syncResult.sheets.map((sheet, idx) => (
                            <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                              {sheet}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {syncResult.errors && syncResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-semibold text-sm">Avisos:</p>
                        <div className="bg-background/50 rounded-md p-3 max-h-40 overflow-y-auto">
                          <ul className="space-y-1 text-xs">
                            {syncResult.errors.slice(0, 10).map((err, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-destructive font-medium">•</span>
                                <span className="flex-1">{err}</span>
                              </li>
                            ))}
                            {syncResult.errors.length > 10 && (
                              <li className="text-muted-foreground italic mt-2">
                                ... e mais {syncResult.errors.length - 10} aviso(s)
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
              {syncResult ? "Fechar" : "Cancelar"}
            </Button>
            {!syncResult && (
              <Button 
                onClick={handleSync} 
                disabled={isProcessing || !spreadsheetId}
                size="lg"
                className="min-w-32"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar Agora
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
