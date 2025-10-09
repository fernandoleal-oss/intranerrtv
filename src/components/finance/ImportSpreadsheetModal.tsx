import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileSpreadsheet, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportSpreadsheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ParsedRow {
  cliente: string;
  ap: string;
  descricao: string;
  fornecedor: string;
  valor_fornecedor: number;
  honorario_percent: number;
  honorario_agencia: number;
  total: number;
}

export function ImportSpreadsheetModal({ open, onOpenChange, onImportComplete }: ImportSpreadsheetModalProps) {
  const { toast } = useToast();
  const [rawData, setRawData] = useState("");
  const [refMonth, setRefMonth] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<"input" | "preview" | "importing">("input");
  const [importing, setImporting] = useState(false);

  const parseSpreadsheetData = () => {
    try {
      const lines = rawData.trim().split("\n");
      if (lines.length < 2) {
        toast({ title: "Dados insuficientes", description: "Cole ao menos 2 linhas (cabeçalho + dados)", variant: "destructive" });
        return;
      }

      // Skip header (first line)
      const dataLines = lines.slice(1);
      const parsed: ParsedRow[] = [];

      dataLines.forEach((line, idx) => {
        // Split by tab or multiple spaces
        const cells = line.split(/\t|  +/).map(c => c.trim());
        
        if (cells.length < 8) return; // Skip incomplete rows

        const parseValue = (val: string): number => {
          if (!val) return 0;
          const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
          return Math.round(parseFloat(cleaned) * 100) || 0;
        };

        const parsePercent = (val: string): number => {
          if (!val) return 0;
          return parseFloat(val.replace(/[^0-9.-]/g, "")) || 0;
        };

        parsed.push({
          cliente: cells[0] || "",
          ap: cells[1] || "",
          descricao: cells[2] || "",
          fornecedor: cells[3] || "",
          valor_fornecedor: parseValue(cells[4]),
          honorario_percent: parsePercent(cells[5]),
          honorario_agencia: parseValue(cells[6]),
          total: parseValue(cells[7]),
        });
      });

      if (parsed.length === 0) {
        toast({ title: "Nenhum dado válido encontrado", variant: "destructive" });
        return;
      }

      setParsedData(parsed);
      setStep("preview");
    } catch (error: any) {
      toast({
        title: "Erro ao processar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!refMonth) {
      toast({ title: "Selecione o mês de referência", variant: "destructive" });
      return;
    }

    setImporting(true);
    setStep("importing");

    try {
      const rows = parsedData.map(row => ({
        ref_month: refMonth,
        cliente: row.cliente,
        ap: row.ap || null,
        descricao: row.descricao || null,
        fornecedor: row.fornecedor || null,
        valor_fornecedor_cents: row.valor_fornecedor,
        honorario_percent: row.honorario_percent || null,
        honorario_agencia_cents: row.honorario_agencia,
        total_cents: row.total,
      }));

      const { error } = await supabase.from("finance_events").insert(rows);

      if (error) throw error;

      toast({
        title: "Importação concluída!",
        description: `${parsedData.length} registros importados com sucesso.`,
      });

      onImportComplete?.();
      handleClose();
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
      setStep("preview");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setRawData("");
    setParsedData([]);
    setStep("input");
    setRefMonth("");
    onOpenChange(false);
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar/Colar Planilha
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "Cole os dados copiados do Google Sheets ou Excel (incluindo cabeçalho)"}
            {step === "preview" && `${parsedData.length} registros processados. Revise e confirme a importação.`}
            {step === "importing" && "Importando dados..."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cole os dados com as colunas: <strong>Cliente | AP | Descrição | Fornecedor | Valor Fornecedor | Honorário % | Honorário Agência | Total</strong>
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="month-select">Mês de Referência *</Label>
              <Select value={refMonth} onValueChange={setRefMonth}>
                <SelectTrigger id="month-select">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-01-01">Janeiro 2025</SelectItem>
                  <SelectItem value="2025-02-01">Fevereiro 2025</SelectItem>
                  <SelectItem value="2025-03-01">Março 2025</SelectItem>
                  <SelectItem value="2025-04-01">Abril 2025</SelectItem>
                  <SelectItem value="2025-05-01">Maio 2025</SelectItem>
                  <SelectItem value="2025-06-01">Junho 2025</SelectItem>
                  <SelectItem value="2025-07-01">Julho 2025</SelectItem>
                  <SelectItem value="2025-08-01">Agosto 2025</SelectItem>
                  <SelectItem value="2025-09-01">Setembro 2025</SelectItem>
                  <SelectItem value="2025-10-01">Outubro 2025</SelectItem>
                  <SelectItem value="2025-11-01">Novembro 2025</SelectItem>
                  <SelectItem value="2025-12-01">Dezembro 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paste-area">Dados da Planilha</Label>
              <Textarea
                id="paste-area"
                placeholder="Cole aqui os dados copiados da planilha (Ctrl+V)..."
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>{parsedData.length} registros</strong> prontos para importar em <strong>{new Date(refMonth).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong>
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">AP</th>
                    <th className="p-2 text-left">Fornecedor</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/50">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{row.cliente}</td>
                      <td className="p-2">{row.ap}</td>
                      <td className="p-2">{row.fornecedor}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Importando {parsedData.length} registros...</p>
          </div>
        )}

        <DialogFooter>
          {step === "input" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={parseSpreadsheetData} disabled={!rawData.trim() || !refMonth}>
                Processar Dados
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("input")}>Voltar</Button>
              <Button onClick={handleImport} disabled={importing}>
                Confirmar Importação
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
