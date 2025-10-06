import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BudgetForm } from "@/components/BudgetForm";

export default function OrcamentosNovo() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-8 font-semibold">Novo Orçamento</h1>
              <p className="text-muted-foreground">Preencha os dados e gerencie categorias</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast({ title: "Em breve" })} className="gap-2">
              <Copy className="h-4 w-4" />
              Duplicar
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/orcamentos/tabela")}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Exportar p/ BYD
            </Button>
          </div>
        </div>

        <BudgetForm onSaveSuccess={(id) => navigate(`/budget/${id}`)} />
      </div>
    </AppLayout>
  );
}
