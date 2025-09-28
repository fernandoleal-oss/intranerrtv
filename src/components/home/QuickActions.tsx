import { Button } from "@/components/ui/button";
import { Upload, Copy, Settings } from "lucide-react";

export const QuickActions = () => {
  const handleImportDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.doc';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        alert(`📄 Importando arquivo: ${file.name}\n\nFuncionalidade em desenvolvimento. Em breve será possível extrair dados automaticamente do documento.`);
      }
    };
    input.click();
  };

  const handleDuplicateBudget = () => {
    alert("📋 Duplicar Orçamento\n\nSelecione um orçamento existente para duplicar. Esta funcionalidade permite criar uma nova versão baseada em um orçamento anterior.");
  };

  const handleAdminAccess = () => {
    alert("⚙️ Área Administrativa\n\nAcesso restrito para administradores.\n\nFuncionalidades disponíveis:\n• Gerenciar clientes\n• Configurar produtos\n• Definir honorários\n• Gerenciar usuários");
  };

  return (
    <div className="flex flex-wrap gap-4 justify-center animate-fade-in">
      <Button 
        variant="outline" 
        className="gap-3 h-11 px-6 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 hover:shadow-md"
        onClick={handleImportDocument}
      >
        <Upload className="h-4 w-4" />
        Importar carta (PDF/DOCX)
      </Button>
      <Button 
        variant="outline" 
        className="gap-3 h-11 px-6 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 hover:shadow-md"
        onClick={handleDuplicateBudget}
      >
        <Copy className="h-4 w-4" />
        Duplicar orçamento
      </Button>
      <Button 
        variant="outline" 
        className="gap-3 h-11 px-6 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 hover:shadow-md"
        onClick={handleAdminAccess}
      >
        <Settings className="h-4 w-4" />
        Admin
      </Button>
    </div>
  );
};