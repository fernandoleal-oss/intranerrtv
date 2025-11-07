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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";

interface FornecedorDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: "somado" | "separado" | "nenhum") => void;
  currentMode?: "somado" | "separado" | "nenhum";
}

export function FornecedorDisplayDialog({
  open,
  onOpenChange,
  onConfirm,
  currentMode = "separado",
}: FornecedorDisplayDialogProps) {
  const [selectedMode, setSelectedMode] = useState<"somado" | "separado" | "nenhum">(currentMode);

  const handleConfirm = () => {
    onConfirm(selectedMode);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Como apresentar os fornecedores?</AlertDialogTitle>
          <AlertDialogDescription>
            Escolha como deseja que os fornecedores e totais sejam apresentados no orçamento.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RadioGroup value={selectedMode} onValueChange={(v) => setSelectedMode(v as "somado" | "separado" | "nenhum")}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="somado" id="somado" />
            <Label htmlFor="somado" className="cursor-pointer">
              <div>
                <div className="font-semibold">Total Somado</div>
                <div className="text-sm text-muted-foreground">
                  Mostra apenas o total consolidado de todos os fornecedores
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <RadioGroupItem value="separado" id="separado" />
            <Label htmlFor="separado" className="cursor-pointer">
              <div>
                <div className="font-semibold">Por Fornecedor</div>
                <div className="text-sm text-muted-foreground">
                  Mostra totais separados por cada fornecedor com seus itens
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <RadioGroupItem value="nenhum" id="nenhum" />
            <Label htmlFor="nenhum" className="cursor-pointer">
              <div>
                <div className="font-semibold">Sem Totais</div>
                <div className="text-sm text-muted-foreground">
                  Não mostra totais de fornecedores, apenas os itens
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
