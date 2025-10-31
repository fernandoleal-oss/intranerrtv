import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { insertAllFinanceData } from "@/utils/insertFinanceData";

export function ImportFinanceDataButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const result = await insertAllFinanceData();
      toast.success(`Dados importados com sucesso! Agosto: ${result.agosto}, Setembro: ${result.setembro}, Outubro: ${result.outubro}. Total: ${result.total} registros.`);
    } catch (error) {
      toast.error("Erro ao importar dados financeiros");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleImport}
      disabled={isLoading}
      variant="outline"
      size="sm"
    >
      <Upload className="h-4 w-4 mr-2" />
      {isLoading ? "Importando..." : "Importar Dados Agosto-Outubro"}
    </Button>
  );
}
