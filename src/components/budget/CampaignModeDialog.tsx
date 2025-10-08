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

interface CampaignModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: "somar" | "separado") => void;
  currentMode?: "somar" | "separado";
}

export function CampaignModeDialog({
  open,
  onOpenChange,
  onConfirm,
  currentMode = "separado",
}: CampaignModeDialogProps) {
  const [selectedMode, setSelectedMode] = useState<"somar" | "separado">(currentMode);

  const handleConfirm = () => {
    onConfirm(selectedMode);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Como apresentar as campanhas?</AlertDialogTitle>
          <AlertDialogDescription>
            Escolha como deseja que as campanhas sejam apresentadas no preview e no PDF.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RadioGroup value={selectedMode} onValueChange={(v) => setSelectedMode(v as "somar" | "separado")}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="somar" id="somar" />
            <Label htmlFor="somar" className="cursor-pointer">
              <div>
                <div className="font-semibold">Somar (consolidado)</div>
                <div className="text-sm text-muted-foreground">
                  Mostra subtotais por campanha e um total consolidado com honorário aplicado no consolidado
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <RadioGroupItem value="separado" id="separado" />
            <Label htmlFor="separado" className="cursor-pointer">
              <div>
                <div className="font-semibold">Separado (individual)</div>
                <div className="text-sm text-muted-foreground">
                  Mostra cada campanha com seu total individual, honorário por campanha e total geral
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
