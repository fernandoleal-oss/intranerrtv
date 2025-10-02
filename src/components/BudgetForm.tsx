// src/components/BudgetForm.tsx
import React, { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

type Props = {
  budgetId: string;
  versionId: string;
  budgetType: string;
  initialPayload: Record<string, any>;
};

/** Util: título agradável para as labels */
function pretty(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/** Decide se um valor é “simples” (input direto) ou complexo (edita como JSON) */
function isPrimitive(val: any) {
  const t = typeof val;
  return val == null || t === "string" || t === "number" || t === "boolean";
}

/** Ordena para mostrar primeiro campos mais comuns e em seguida os demais */
const COMMON_ORDER = [
  "cliente",
  "job",
  "titulo",
  "titulo_original",
  "produto",
  "anunciante",
  "agencia",
  "direcao",
  "produtora",
  "cnpj",
  "periodo",
  "duracao",
  "observacoes",
  "links",
  "valor",
  "itens",
  "impostos",
  "descontos",
];

export function BudgetForm({ budgetId, versionId, budgetType, initialPayload }: Props) {
  const { toast } = useToast();

  // Valor inicial: se vier vazio, usa objeto vazio (evita crashes)
  const defaults = useMemo(() => (initialPayload && typeof initialPayload === "object" ? initialPayload : {}), [initialPayload]);

  const { register, handleSubmit, reset, watch, setValue, getValues } = useForm<Record<string, any>>({
    defaultValues: defaults,
  });

  // Sempre que o payload de entrada mudar (ou entrar na página), sobrescreve o form
  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  // Atalho Ctrl/Cmd+S para salvar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        onSubmit(getValues());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [getValues]); // eslint-disable-line

  // Integração com o header: escuta evento "budget:save"
  useEffect(() => {
    const onSave = (ev: Event) => {
      onSubmit(getValues());
    };
    window.addEventListener("budget:save" as any, onSave);
    return () => window.removeEventListener("budget:save" as any, onSave);
  }, [getValues]); // eslint-disable-line

  /** Garante o próximo número de versão (versao) */
  const nextVersion = useCallback(async (): Promise<number> => {
    const { data, error } = await supabase
      .from("versions")
      .select("versao")
      .eq("budget_id", budgetId)
      .order("versao", { ascending: false })
      .limit(1);

    if (error) throw error;
    const current = data?.[0]?.versao ?? 0;
    return Number(current) + 1;
  }, [budgetId]);

  /** Salva nova versão com o payload atual do form */
  const onSubmit = async (values: Record<string, any>) => {
    try {
      const versao = await nextVersion();

      const { error } = await supabase.from("versions").insert({
        budget_id: budgetId,
        payload: values,
        versao,
      });

      if (error) throw error;

      toast({ title: "Orçamento salvo", description: `Versão ${versao} criada.` });
      // Dispara evento de feedback para a tela pai (se quiser atualizar)
      window.dispatchEvent(new CustomEvent("budget:saved", { detail: { budgetId, versao } }));
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  /** Lista de chaves do payload (mantém ordem útil) */
  const keys = useMemo(() => {
    const ks = Object.keys(defaults || {});
    const priority = ks.filter((k) => COMMON_ORDER.includes(k));
    const rest = ks.filter((k) => !COMMON_ORDER.includes(k)).sort();
    return [...priority, ...rest];
  }, [defaults]);

  // Garante que “produtora” exista no form (mesmo que não esteja no payload original)
  useEffect(() => {
    if (!("produtora" in (defaults || {}))) {
      setValue("produtora", "");
    }
  }, [defaults, setValue]);

  // Assiste mudanças (somente para rerender em inputs controlados simples)
  watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>
            Dados do orçamento — <span className="capitalize">{budgetType}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campo fixo: Produtora sempre visível */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Produtora</Label>
              <Input placeholder="Ex.: Santa Produção de Filmes" {...register("produtora")} />
            </div>
            <div>
              <Label>CNPJ (produtora)</Label>
              <Input placeholder="00.000.000/0000-00" {...register("cnpj")} />
            </div>
          </div>

          {/* Campos vindos do payload (dinâmicos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {keys.map((key) => {
              // pula os que já tratamos acima
              if (key === "produtora" || key === "cnpj") return null;

              const val = defaults[key];
              const type = typeof val;

              if (isPrimitive(val)) {
                // string | number | boolean | null/undefined
                if (type === "boolean") {
                  return (
                    <div key={key} className="flex items-center justify-between border rounded-lg p-3">
                      <Label className="mr-4">{pretty(key)}</Label>
                      <Switch checked={!!watch(key)} onCheckedChange={(v) => setValue(key, v)} />
                    </div>
                  );
                }

                return (
                  <div key={key}>
                    <Label>{pretty(key)}</Label>
                    <Input defaultValue={val ?? ""} {...register(key)} />
                  </div>
                );
              }

              // objetos/arrays — editor JSON do bloco
              return (
                <div key={key} className="sm:col-span-2">
                  <Label>{pretty(key)} (JSON)</Label>
                  <Textarea
                    rows={6}
                    defaultValue={JSON.stringify(val ?? {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const obj = JSON.parse(e.target.value || "{}");
                        setValue(key, obj, { shouldDirty: true });
                        e.currentTarget.setCustomValidity("");
                      } catch {
                        // mostra invalidez visual no textarea
                        e.currentTarget.setCustomValidity("JSON inválido");
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              Salvar nova versão
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
