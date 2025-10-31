import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { updateEmsMultimixBudget } from "@/utils/updateEmsMultimixBudget";

export const UpdateEmsButton = () => {
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const result = await updateEmsMultimixBudget();
      
      if (result.success) {
        toast({
          title: "✅ Orçamento Atualizado!",
          description: `${result.fornecedores} fornecedores carregados com sucesso. Atualize a página para ver as mudanças.`,
        });
        // Recarregar após 1 segundo
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleUpdate}
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? "Atualizando..." : "Carregar 4 Fornecedores"}
    </Button>
  );
};
