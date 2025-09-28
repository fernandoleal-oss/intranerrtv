import { Button } from "@/components/ui/button";
import { Upload, Copy, Settings } from "lucide-react";

export const QuickActions = () => {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      <Button variant="outline" className="gap-2">
        <Upload className="h-4 w-4" />
        Importar carta (PDF/DOCX)
      </Button>
      <Button variant="outline" className="gap-2">
        <Copy className="h-4 w-4" />
        Duplicar orçamento
      </Button>
      <Button variant="outline" className="gap-2">
        <Settings className="h-4 w-4" />
        Admin
      </Button>
    </div>
  );
};