import { Button } from "@/components/ui/button";
import { Upload, Copy, Settings } from "lucide-react";

export const QuickActions = () => {
  return (
    <div className="flex flex-wrap gap-4 justify-center animate-fade-in">
      <Button 
        variant="outline" 
        className="gap-3 h-11 px-6 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 hover:shadow-md"
      >
        <Upload className="h-4 w-4" />
        Importar carta (PDF/DOCX)
      </Button>
      <Button 
        variant="outline" 
        className="gap-3 h-11 px-6 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 hover:shadow-md"
      >
        <Copy className="h-4 w-4" />
        Duplicar orçamento
      </Button>
      <Button 
        variant="outline" 
        className="gap-3 h-11 px-6 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 hover:shadow-md"
      >
        <Settings className="h-4 w-4" />
        Admin
      </Button>
    </div>
  );
};