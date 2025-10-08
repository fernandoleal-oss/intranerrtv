import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HonorarioWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
}

export function HonorarioWarningDialog({
  open,
  onOpenChange,
  clientName,
  honorarioPercent,
}: HonorarioWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Honorário será aplicado</AlertDialogTitle>
          <AlertDialogDescription>
            O cliente <strong>{clientName}</strong> possui honorário de <strong>{honorarioPercent}%</strong>{" "}
            configurado.
            <br />
            <br />
            Este honorário será somado ao valor final do orçamento.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
