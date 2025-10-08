import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ZeroWelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ZeroWelcomeDialog({
  open,
  onOpenChange,
  onConfirm,
}: ZeroWelcomeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Orçamento do Zero</AlertDialogTitle>
          <AlertDialogDescription>
            Você criará um orçamento em branco. Vamos perguntar o que incluir e montar tudo com o mesmo visual dos nossos modelos. Você poderá adicionar linhas como em uma planilha, com totais em tempo real.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={(e) => {
            e.preventDefault();
            onOpenChange(false);
          }}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={(e) => {
            e.preventDefault();
            onConfirm();
          }}>
            Começar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
