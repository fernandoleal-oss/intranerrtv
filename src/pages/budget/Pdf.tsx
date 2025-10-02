// src/pages/budget/Pdf.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, Home, Printer, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoWeWhite from "@/assets/LOGO-WE.png";
import logoWeColor from "@/assets/Logo_WE-2.png";

type Quote = {
  id: string;
  produtora: string;
  escopo: string;
  valor: number;
  desconto?: number;
  diretor?: string;
  tratamento?: string;
  quantidade?: number;
  qtd?: number;
};

type Payload = {
  // identificação
  cliente?: string;
  produto?: string;
  job?: string;
  midias?: string;
  territorio?: string;
  periodo?: string;

  // complementares
  entregaveis?: string[] | string;
  formatos?: string[] | string;
  data_orcamento?: string;
  exclusividade_elenco?: string;
  audio_descr?: string;

  // financeiro
  quotes_film?: Quote[];
  honorario_perc?: number;
  total?: number;

  // faturamento
  pendente_pagamento?: boolean;
  observacoes_faturamento?: string;

  // assets (imagem/vídeo)
  assets?: Array<{
    provider: string;
    type: "video" | "image" | "unknown";
    id: string | null;
    title: string | null;
    durationSeconds?: number;
    resolution?: { width: number; height: number } | null;
    thumbnail?: string | null;
    pageUrl: string;
    licenseOptions: string[];
    recommendedLicense: string;
    chosenLicense: string;
  }>;
};

type View = {
  budgetId: string;
  displayId: string;
  type: "filme" | "audio" | "imagem" | "cc" | string;
  status: string;
  createdAt: string;
  payload: Payload;
};

const fmt = (v?: any) => (v == null || v === "" ? "—" : String(v));
const BRL = (n: number | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n || 0));

export default function PdfView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoOk, setLogoOk] = useState<boolean | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>("rascunho");
  const [versions, setVersions] = useState<Array<{ id: string; versao: number; created_at: string }>>([]);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchView = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("versions")
        .select(`
          id, payload, created_at, versao, budget_id,
          budgets!inner(id, display_id, type, status, created_at)
        `)
        .eq("budget_id", id)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) throw error || new Error("Orçamento não encontrado");

      const latest = data[0] as any;
      const payload: Payload = (latest.payload as Payload) || {};

      setView({
        budgetId: latest.budgets.id,
        displayId: latest.budgets.display_id,
        type: latest.budgets.type,
        status: latest.budgets.status,
        createdAt: latest.budgets.created_at,
        payload,
      });

      setCurrentStatus(latest.budgets.status || "rascunho");
      setVersions(data.map((v: any) => ({ id: v.id, versao: v.versao, created_at: v.created_at })));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Erro ao carregar orçamento.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchView();
  }, [fetchView]);

  const handleStatusChange = async (newStatus: string) => {
    if (!view) return;
    try {
      const { error } = await supabase.from("budgets").update({ status: newStatus }).eq("id", view.budgetId);
      if (error) throw error;
      setCurrentStatus(newStatus);
      toast({ title: "Status atualizado", description: `Status alterado para ${newStatus.toUpperCase()}` });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar", description: e?.message, variant: "destructive" });
    }
  };

  const handlePrint = async () => {
    if (!view) return;
    try {
      // garante ORÇADO caso esteja rascunho
      let finalStatus = currentStatus;
      if (!finalStatus || finalStatus === "rascunho") {
        finalStatus = "orçado";
        await handleStatusChange(finalStatus);
      }

      // cria versão antes de imprimir
      const nextVersion = versions.length > 0 ? Math.max(...versions.map((v) => v.versao)) + 1 : 1;
      const { error } = await supabase.from("versions").insert({
        budget_id: view.budgetId,
        versao: nextVersion,
        payload: view.payload,
      });
      if (error) throw error;

      toast({ title: "Versão criada", description: `Versão ${nextVersion} salva antes da impressão.` });

      // imprime
      setTimeout(() => window.print(), 350);
    } catch (e: any) {
      toast({ title: "Erro ao criar versão", description: e?.message, variant: "destructive" });
    }
  };

  // ----- cálculos -----
  const p = view?.payload || {};
  const linhas: Quote[] = useMemo(() => p.quotes_film ?? [], [p.quotes_film]);

  const subtotal = useMemo(() => {
    return linhas.reduce((s, q) => {
      const qty = Number(q.quantidade ?? q.qtd ?? 1);
      const unit = Number(q.valor || 0);
      const desc = Number(q.desconto || 0);
      return s + (unit * qty - desc);
    }, 0);
  }, [linhas]);

  const honorario = useMemo(() => subtotal * ((p.honorario_perc || 0) / 100), [subtotal, p.honorario_perc]);

  const totalGeral = useMemo(
    () => (typeof p.total === "number" ? p.total : subtotal + honorario),
    [p.total, subtotal, honorario]
  );

  const isAudio = (view?.type || "").toLowerCase() === "audio";

  // Badge do status para exibir
  const getStatusBadge = () => {
    const s = (currentStatus || "").toLowerCase();
    if (s === "enviado") return { text: "EM APROVAÇÃO", variant: "default" as const };
    if (s === "aprovado") return { text: "APROVADO", variant: "default" as const };
    if (s === "reprovado") return { text: "REPROVADO", variant: "destructive" as const };
    if (s === "orçado") return { text: "ORÇADO", variant: "secondary" as const };
    return null;
  };

  const statusBadge = getStatusBadge();

  // fit-to-page (A4)
  useEffect(() => {
    const handleBeforePrint = () => {
      const el = printRef.current;
      if (!el) return;
      const TARGET_HEIGHT_PX = 1047;
      el.style.setProperty("--print-scale", "1");
      const actual = el.scrollHeight;
      if (actual <= TARGET_HEIGHT_PX) return;
      const MIN_SCALE = 0.72;
      const scale = Math.max(MIN_SCALE, Math.min(1, (TARGET_HEIGHT_PX / actual) * 0.985));
      el.style.setProperty("--print-scale", String(scale));
    };
    const handleAfterPrint = () => {
      const el = printRef.current;
      if (!el) return;
      el.style.setProperty("--print-scale", "1");
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  // ----- estados de tela -----
  if (loading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="text-muted-foreground">Gerando PDF…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="space-y-4 text-center">
          <div className="text-xl font-semibold">Erro ao carregar</div>
          <div className="text-sm text-muted-foreground">{error}</div>
          <Button onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-2" /> Início
          </Button>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="space-y-4 text-center">
          <div className="text-xl font-semibold">Orçamento não encontrado</div>
          <Button onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-2" /> Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white print:bg-white relative">
      {/* Barra de ações (preview) */}
      <div className="sticky top-0 z-10 bg-white border-b p-3 flex items-center gap-2 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button variant="outline" onClick={() => navigate("/")}>
          <Home className="w-4 h-4 mr-2" /> Início
        </Button>

        <div className="ml-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={currentStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rascunho">RASCUNHO</SelectItem>
              <SelectItem value="orçado">ORÇADO</SelectItem>
              <SelectItem value="enviado">ENVIADO</SelectItem>
              <SelectItem value="aprovado">APROVADO</SelectItem>
              <SelectItem value="reprovado">REPROVADO</SelectItem>
              <SelectItem value="pendente_faturamento">PENDENTE FATURAMENTO</SelectItem>
              <SelectItem value="arquivado">ARQUIVADO</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          {view.displayId} • {String(view.type).toUpperCase()}
        </div>

        {logoOk === false && <span className="ml-3 text-xs text-amber-600">Logo não encontrado</span>}
        {logoOk === true && <span className="ml-3 text-xs text-emerald-600">Logo ok</span>}

        <Button className="ml-3" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF
        </Button>
      </div>

      {/* Aviso sobre status — preview somente */}
      {statusBadge && (
        <Alert className="m-4 print:hidden border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            Status atual: <strong>{statusBadge.text}</strong>
          </AlertDescription>
        </Alert>
      )}

      <div className="px-6 py-6 print:px-0 print:py-0 flex justify-center relative z-10">
        <div
          ref={printRef}
          id="print-root"
          className="w-full max-w-5xl print:w-[190mm] relative"
          style={{ transformOrigin: "top left" }}
        >
          <div id="page-body" className="flex flex-col">
            {/* Cabeçalho preto + dados da WE */}
            <div className="rounded-xl overflow-hidden border print:rounded-none print:border-0">
              <div className="bg-black text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={logoWeWhite}
                    alt="WE Logo"
                    className="h-8 w-auto"
                    onLoad={() => setLogoOk(true)}
                    onError={(e) => {
                      setLogoOk(false);
                      (e.currentTarget.style.display = "none");
                    }}
                  />
                </div>
                <div className="text-right flex items-center gap-3">
                  {statusBadge && (
                    <Badge 
                      variant={statusBadge.variant} 
                      className="px-3 py-1 text-xs font-semibold"
                    >
                      {statusBadge.text}
                    </Badge>
                  )}
                  <div>
                    <div className="text-base font-semibold leading-none">Orçamento #{view.displayId}</div>
                    <div className="text-[10px] opacity-80 mt-1 leading-none">
                      {new Date(view.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 text-xs leading-snug">
                <div className="font-semibold">WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA</div>
                <div>Endereço: Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP: 04552-030</div>
              </div>
            </div>

            {/* ALERTA NÃO FATURADO */}
            {p.pendente_pagamento && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-2.5 flex gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold uppercase leading-none">Não faturado</div>
                  <div>Este orçamento está pendente e precisa ser incluso em algum faturamento.</div>
                  {p.observacoes_faturamento && <div className="mt-1 opacity-90">Obs.: {p.observacoes_faturamento}</div>}
                </div>
              </div>
            )}

            {/* GRID PRINCIPAL (cotações maiores) */}
            <div className="mt-3 grid grid-cols-12 gap-3">
              {/* ESQUERDA = 9/12 */}
              <div className="col-span-12 md:col-span-9">
                {/* Identificação */}
                <section className="rounded-lg border px-4 py-3">
                  <h2 className="text-sm font-semibold mb-2">Identificação</h2>
                  {view.type === 'imagem' ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-neutral-500">Cliente:</span> {fmt(p.cliente)}
                      </div>
                      <div>
                        <span className="text-neutral-500">Produto:</span> {fmt(p.produto)}
                      </div>
                      <div>
                        <span className="text-neutral-500">Mídias:</span> {fmt(p.midias)}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-neutral-500">Cliente:</span> {fmt(p.cliente)}
                      </div>
                      <div>
                        <span className="text-neutral-500">Produto:</span> {fmt(p.produto)}
                      </div>
                      <div>
                        <span className="text-neutral-500">Job:</span> {fmt(p.job)}
                      </div>
                      <div>
                        <span className="text-neutral-500">Mídias:</span> {fmt(p.midias)}
                      </div>
                      <div>
                        <span className="text-neutral-500">Território:</span> {fmt(p.territorio)}
                      </div>
                      <div>
                        <span className="text-neutral-500">Período:</span> {fmt(p.periodo)}
                      </div>
                    </div>
                  )}
                </section>

                {/* Cotações */}
                <section className="rounded-lg border px-4 py-3 mt-3">
                  <h2 className="text-sm font-semibold mb-2">Cotações</h2>

                  {linhas.length === 0 ? (
                    <div className="text-xs text-neutral-600">Nenhuma cotação informada.</div>
                  ) : isAudio ? (
                    // ÁUDIO
                    <div className="w-full border rounded-md overflow-hidden">
                      <div className="grid grid-cols-12 bg-neutral-100 text-[12px] font-medium px-3 py-2">
                        <div className="col-span-2">Produtora</div>
                        <div className="col-span-5">Escopo</div>
                        <div className="col-span-1 text-right">Unit.</div>
                        <div className="col-span-1 text-right">Qtd</div>
                        <div className="col-span-1 text-right">Desc.</div>
                        <div className="col-span-2 text-right">Total</div>
                      </div>
                      {linhas.map((q) => {
                        const qty = Number(q.quantidade ?? q.qtd ?? 1);
                        const unit = Number(q.valor || 0);
                        const desc = Number(q.desconto || 0);
                        const totalLinha = unit * qty - desc;
                        return (
                          <div key={q.id} className="grid grid-cols-12 px-3 py-2 text-[12px] border-t leading-snug">
                            <div className="col-span-2 break-words">{fmt(q.produtora)}</div>
                            <div className="col-span-5 whitespace-pre-wrap break-words">{fmt(q.escopo)}</div>
                            <div className="col-span-1 text-right">{BRL(unit)}</div>
                            <div className="col-span-1 text-right">{qty}</div>
                            <div className="col-span-1 text-right">{BRL(desc)}</div>
                            <div className="col-span-2 text-right">{BRL(totalLinha)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // OUTROS TIPOS
                    <div className="w-full border rounded-md overflow-hidden">
                      <div className="grid grid-cols-12 bg-neutral-100 text-[12px] font-medium px-3 py-2">
                        <div className="col-span-2">Produtora</div>
                        <div className="col-span-6">Escopo</div>
                        <div className="col-span-2">Diretor</div>
                        <div className="col-span-1">Trat.</div>
                        <div className="col-span-1 text-right">Valor</div>
                      </div>
                      {linhas.map((q) => (
                        <div key={q.id} className="grid grid-cols-12 px-3 py-2 text-[12px] border-t leading-snug">
                          <div className="col-span-2 break-words">{fmt(q.produtora)}</div>
                          <div className="col-span-6 whitespace-pre-wrap break-words">{fmt(q.escopo)}</div>
                          <div className="col-span-2 break-words">{fmt(q.diretor)}</div>
                          <div className="col-span-1 break-words">{fmt(q.tratamento)}</div>
                          <div className="col-span-1 text-right">{BRL(Number(q.valor) || 0)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Complementares – ocultos em ÁUDIO e IMAGEM para não poluir */}
                  {!['audio', 'imagem'].includes(String(view.type).toLowerCase()) && (
                    <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                      <div className="border rounded-md p-2">
                        <div className="text-neutral-500">Entregáveis</div>
                        <div className="font-medium">
                          {Array.isArray(p.entregaveis) ? p.entregaveis.join(", ") : fmt(p.entregaveis)}
                        </div>
                      </div>
                      <div className="border rounded-md p-2">
                        <div className="text-neutral-500">Adaptações</div>
                        <div className="font-medium">
                          {Array.isArray(p.formatos) ? p.formatos.join(", ") : fmt(p.formatos)}
                        </div>
                      </div>
                      <div className="border rounded-md p-2">
                        <div className="text-neutral-500">Exclusividade</div>
                        <div className="font-medium">{fmt(p.exclusividade_elenco)}</div>
                      </div>
                    </div>
                  )}
                </section>

                {/* Assets (Imagens/Vídeos) */}
                {p.assets && p.assets.length > 0 && (
                  <section className="rounded-lg border px-4 py-3 mt-3">
                    <h2 className="text-sm font-semibold mb-2">Assets (Imagens/Vídeos)</h2>
                    <div className="w-full border rounded-md overflow-hidden">
                      <div className="grid grid-cols-12 bg-neutral-100 text-[11px] font-medium px-3 py-2">
                        <div className="col-span-1">ID</div>
                        <div className="col-span-4">Nome</div>
                        <div className="col-span-1">Tipo</div>
                        <div className="col-span-2">Resolução</div>
                        <div className="col-span-3">Licença</div>
                        <div className="col-span-1 text-right">Link</div>
                      </div>
                      {p.assets.map((asset, idx) => {
                        // Extrair apenas o nome limpo do título, removendo URLs
                        const cleanTitle = asset.title 
                          ? asset.title.replace(/https?:\/\/[^\s]+/g, '').trim() || asset.title.split('/').pop()?.split('?')[0] || "—"
                          : "—";
                        
                        return (
                          <div key={idx} className="grid grid-cols-12 px-3 py-2 text-[11px] border-t leading-snug">
                            <div className="col-span-1 break-words">{asset.id || "—"}</div>
                            <div className="col-span-4 break-words">{cleanTitle}</div>
                            <div className="col-span-1 capitalize">{asset.type}</div>
                            <div className="col-span-2">
                              {asset.resolution
                                ? `${asset.resolution.width}×${asset.resolution.height}`
                                : asset.durationSeconds
                                ? `${Math.floor(asset.durationSeconds / 60)}:${String(
                                    Math.floor(asset.durationSeconds % 60)
                                  ).padStart(2, "0")}`
                                : "—"}
                            </div>
                            <div className="col-span-3 break-words">{asset.chosenLicense}</div>
                            <div className="col-span-1 text-right">
                              <a
                                href={asset.pageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-[10px]"
                              >
                                Ver
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {/* DIREITA = 3/12 (observações) */}
              <div className="col-span-12 md:col-span-3">
                {/* Observações */}
                <section className="rounded-lg border px-4 py-3 mt-3">
                  <h2 className="text-sm font-semibold mb-2">Observações</h2>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-neutral-700">
                    {p.pendente_pagamento && <li>NÃO FATURADO — incluir no próximo faturamento.</li>}
                    {p.observacoes_faturamento && <li>{p.observacoes_faturamento}</li>}
                    <li>Validade do orçamento: 7 dias a partir da emissão.</li>
                    <li>Usos e prazos condicionados à aprovação e disponibilidade.</li>
                  </ul>
                </section>

                {/* Termos */}
                <section className="rounded-lg border px-4 py-3 mt-3">
                  <h2 className="text-sm font-semibold mb-2">Termos e Condições</h2>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-neutral-700">
                    <li>Alterações de escopo podem gerar nova versão.</li>
                    <li>Conforme mídias, território e período informados neste orçamento.</li>
                  </ul>
                </section>
              </div>
            </div>

            <footer className="mt-4 border-t pt-2 text-[10px] text-neutral-600">
              <div className="flex flex-wrap items-center justify-between mb-2">
                <div className="font-medium">WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA</div>
                <div className="opacity-90">Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP: 04552-030</div>
                <div className="opacity-90">
                  Orçamento #{view.displayId} • {new Date(view.createdAt).toLocaleDateString("pt-BR")} • Validade 7 dias •
                  Confidencial
                </div>
              </div>

              {versions.length > 1 && (
                <div className="mt-2 pt-2 border-t">
                  <div className="text-[9px] text-neutral-500 mb-1">Histórico de Versões</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {versions.slice(0, 5).map((v, idx) => (
                      <div key={v.id} className="flex items-center gap-1">
                        <Badge variant={idx === 0 ? "default" : "outline"} className="text-[8px] px-1.5 py-0.5">
                          v{v.versao}
                        </Badge>
                        {idx < Math.min(versions.length - 1, 4) && <span className="text-neutral-400">→</span>}
                      </div>
                    ))}
                    {versions.length > 5 && <span className="text-[8px] text-neutral-400">+{versions.length - 5} mais</span>}
                  </div>
                </div>
              )}
            </footer>
          </div>
        </div>
      </div>

      {/* Estilos: A4 fit */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Fit-to-page */
          #print-root { transform: scale(var(--print-scale, 1)); }
          #print-root { min-height: 277mm; display: flex; flex-direction: column; }
          #page-body { flex: 1 0 auto; display: flex; flex-direction: column; }
          #page-body footer { margin-top: auto; }

          .no-print { display: none !important; }
        }

        /* Evitar quebras no meio dos blocos */
        #print-root, #print-root * { page-break-inside: avoid; }
      `}</style>
    </div>
  );
}
