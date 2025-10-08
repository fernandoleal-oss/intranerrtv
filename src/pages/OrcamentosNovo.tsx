// src/components/budget/CampaignTotals.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as React from "react";

export type CombineMode = "somar" | "separado";

type AnyRecord = Record<string, any>;

export interface CampaignTotalsProps {
  campaigns: AnyRecord[];
  combineMode?: CombineMode;
  currency?: string; // default BRL
}

/** Formata moeda (BRL por padrão) */
const fmtMoney = (v: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(v || 0));

/**
 * Tenta computar o total de uma campanha somando:
 * - items (usando `total`/`valor_total` OU `qty*unit`/equivalentes)
 * - extras: fees/taxes/ajustes se existirem
 * Ajuste os nomes de campos conforme a sua estrutura interna.
 */
export function computeCampaignTotal(campaign: AnyRecord): number {
  const categories = (campaign?.categories ?? []) as AnyRecord[];
  const items = categories.flatMap((c) => c?.items ?? []);

  const itemsTotal = items.reduce((acc, it) => {
    const explicito = Number(it.total ?? it.valor_total);
    if (!Number.isNaN(explicito) && Number.isFinite(explicito)) return acc + explicito;

    const qty = Number(it.qty ?? it.quantidade ?? it.qtd ?? 0);
    const unit = Number(it.unit ?? it.valor_unitario ?? it.preco ?? it.unit_price ?? 0);

    const calc = qty * unit;
    return acc + (Number.isFinite(calc) ? calc : 0);
  }, 0);

  const extras =
    Number(campaign?.feesTotal ?? 0) + Number(campaign?.taxesTotal ?? 0) + Number(campaign?.adjustmentsTotal ?? 0);

  return itemsTotal + (Number.isFinite(extras) ? extras : 0);
}

export function CampaignTotals({ campaigns, combineMode = "somar", currency = "BRL" }: CampaignTotalsProps) {
  const data = (campaigns ?? []).map((c) => ({
    id: c.id ?? c.uuid ?? c.key ?? Math.random().toString(36).slice(2),
    name: c.name ?? c.titulo ?? c.title ?? "Campanha",
    total: computeCampaignTotal(c),
  }));

  const grandTotal = combineMode === "somar" ? data.reduce((acc, c) => acc + c.total, 0) : null;

  if (combineMode === "separado") {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Totais por campanha</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((c) => (
            <Card key={c.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{c.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{fmtMoney(c.total, currency)}</div>
                <p className="text-xs text-muted-foreground">Total desta campanha</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Modo "somar": apenas um cartão de total geral
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Resumo</h2>
      <Card className="shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Total geral</span>
            <span className="text-2xl font-semibold">{fmtMoney(grandTotal ?? 0, currency)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
