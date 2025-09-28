import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";

interface BudgetData {
  client?: string;
  product?: string;
  type: "filme" | "audio" | "cc" | "imagem";
  filmItems?: Array<{ name: string; value: number }>;
  audioItems?: Array<{ name: string; value: number }>;
  ccItems?: Array<{ name: string; value: number }>;
  imageItems?: Array<{ name: string; value: number }>;
  honorarioPercent?: number;
  honorarioValue?: number;
  total: number;
}

interface BudgetPreviewProps {
  data: BudgetData;
}

export function BudgetPreview({ data }: BudgetPreviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const hasHonorario = data.honorarioPercent && data.honorarioPercent > 0;

  return (
    <Card className="w-80 h-fit sticky top-8">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Preview do Orçamento</CardTitle>
        {data.client && data.product && (
          <div className="text-sm text-muted-foreground">
            {data.client} • {data.product}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {hasHonorario && (
          <div className="bg-accent-subtle border border-accent/20 rounded-lg p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-accent">Cliente com Honorário</p>
              <p className="text-accent/80">
                {data.honorarioPercent}% será adicionado ao total
              </p>
            </div>
          </div>
        )}

        <div className="section-spacing">
          {/* Filme */}
          {data.filmItems && data.filmItems.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Produção de Filme</h4>
              <div className="space-y-1">
                {data.filmItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
              <Separator className="mt-2" />
              <div className="flex justify-between font-medium pt-2">
                <span>Subtotal Filme</span>
                <span>
                  {formatCurrency(data.filmItems.reduce((sum, item) => sum + item.value, 0))}
                </span>
              </div>
            </div>
          )}

          {/* Áudio */}
          {data.audioItems && data.audioItems.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Produção de Áudio</h4>
              <div className="space-y-1">
                {data.audioItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
              <Separator className="mt-2" />
              <div className="flex justify-between font-medium pt-2">
                <span>Subtotal Áudio</span>
                <span>
                  {formatCurrency(data.audioItems.reduce((sum, item) => sum + item.value, 0))}
                </span>
              </div>
            </div>
          )}

          {/* Closed Caption */}
          {data.ccItems && data.ccItems.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Closed Caption</h4>
              <div className="space-y-1">
                {data.ccItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
              <Separator className="mt-2" />
              <div className="flex justify-between font-medium pt-2">
                <span>Subtotal CC</span>
                <span>
                  {formatCurrency(data.ccItems.reduce((sum, item) => sum + item.value, 0))}
                </span>
              </div>
            </div>
          )}

          {/* Imagens */}
          {data.imageItems && data.imageItems.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Compra de Imagens</h4>
              <div className="space-y-1">
                {data.imageItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
              <Separator className="mt-2" />
              <div className="flex justify-between font-medium pt-2">
                <span>Subtotal Imagens</span>
                <span>
                  {formatCurrency(data.imageItems.reduce((sum, item) => sum + item.value, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Honorário */}
        {hasHonorario && (
          <>
            <div className="flex justify-between text-accent font-medium">
              <span>Honorário ({data.honorarioPercent}%)</span>
              <span>{formatCurrency(data.honorarioValue || 0)}</span>
            </div>
            <Separator />
          </>
        )}

        {/* Total */}
        <div className="flex justify-between text-lg font-semibold">
          <span>Total Geral</span>
          <span>{formatCurrency(data.total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}