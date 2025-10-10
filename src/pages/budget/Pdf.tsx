import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Star, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-spinner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logoWE from "@/assets/LOGO-WE-2.png";

/** ====== Tipagens ====== */
interface FilmOption {
  id: string;
  nome?: string;
  escopo?: string;
  valor?: number | string;
  desconto?: number | string;
}

interface QuoteFilm {
  id: string;
  produtora?: string;
  escopo?: string;
  valor?: number | string;
  diretor?: string;
  tratamento?: string;
  desconto?: number | string;
  tem_opcoes?: boolean;
  opcoes?: FilmOption[];
  selecionado?: boolean;
}

interface QuoteAudio {
  id: string;
  produtora?: string;
  descricao?: string;
  valor?: number | string;
  desconto?: number | string;
  selecionado?: boolean;
}

interface CampaignQuotes {
  id: string;
  nome: string;
  inclui_audio?: boolean;
  quotes_film?: QuoteFilm[];
  quotes_audio?: QuoteAudio[];
}

interface BudgetData {
  id: string;
  display_id: string;
  type: string;
  status: string;
  payload: any;
  version_id: string;
  budget_number: string;
}

/** ====== Utils numéricos e de formatação ====== */
const parseCurrency = (v: any): number => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const clean = String(v)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

const toNum = (v: any) => parseCurrency(v);

const money = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

/** menor entre base e opções de um fornecedor de FILME */
const lowestQuoteValue = (q: QuoteFilm) => {
  const base = toNum(q.valor) - toNum(q.desconto);
  if (q.tem_opcoes && Array.isArray(q.opcoes) && q.opcoes.length > 0) {
    const minOpt = Math.min(...q.opcoes.map((o) => toNum(o.valor) - toNum(o.desconto)));
    return Math.min(base, minOpt);
  }
  return base;
};
/** valor final para áudio */
const finalAudioValue = (a: QuoteAudio) => toNum(a.valor) - toNum(a.desconto);

/** escolhe fornecedor “selecionado” ou o mais barato */
const pickFilm = (quotes: QuoteFilm[] = []) => {
  const sel = quotes.find((q) => q.selecionado);
  if (sel) return sel;
  return quotes.reduce<QuoteFilm | null>((best, q) => {
    if (!best) return q;
    return lowestQuoteValue(q) < lowestQuoteValue(best) ? q : best;
  }, null as any);
};
const pickAudio = (quotes: QuoteAudio[] = []) => {
  const sel = quotes.find((q) => q.selecionado);
  if (sel) return sel;
  return quotes.reduce<QuoteAudio | null>((best, q) => {
    if (!best) return q;
    return finalAudioValue(q) < finalAudioValue(best) ? q : best;
  }, null as any);
};

/** ====== Componente ====== */
export default function BudgetPdf() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<BudgetData | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Hooks que dependem de "data" PRECISAM vir antes de return, para não quebrar a ordem.
  const payload = data?.payload ?? {};
  // O seu orçamento novo salva como campanhas -> quotes_film/quotes_audio.
  const campanhas: CampaignQuotes[] = Array.isArray(payload.campanhas) ? payload.campanhas : [];

  const totaisPorCampanha = useMemo(() => {
    return campanhas.map((camp) => {
      const film = pickFilm(camp.quotes_film || []);
      const audio = camp.inclui_audio ? pickAudio(camp.quotes_audio || []) : null;
      const filmVal = film ? lowestQuoteValue(film) : 0;
      const audioVal = audio ? finalAudioValue(audio) : 0;
      return { id: camp.id, nome: camp.nome, total: filmVal + audioVal };
    });
  }, [JSON.stringify(campanhas)]);

  /** ====== Carrega orçamento ====== */
  useEffect(() => {
    const fetchBudget = async () => {
      if (!id) return;

      try {
        const { data: row, error } = await supabase
          .from("versions")
          .select(
            `
            id,
            payload,
            versao,
            budgets!inner(
              id,
              display_id,
              type,
              status,
              budget_number
            )
          `,
          )
          .eq("budget_id", id)
          .order("versao", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!row) throw new Error("Orçamento não encontrado");

        setData({
          id: row.budgets!.id,
          display_id: row.budgets!.display_id,
          type: row.budgets!.type,
          status: row.budgets!.status,
          payload: row.payload || {},
          version_id: row.id,
          budget_number: row.budgets!.budget_number || "000",
        });
      } catch (err: any) {
        toast({
          title: "Erro ao carregar orçamento",
          description: err.message,
          variant: "destructive",
        });
        navigate("/orcamentos");
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, [id, navigate]);

  /** ====== Geração de PDF com margens ====== */
  const handleGeneratePdf = async () => {
    if (!contentRef.current || !data) return;
    setGenerating(true);
    try {
      const element = contentRef.current;

      const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWmm = pdf.internal.pageSize.getWidth();
      const pageHmm = pdf.internal.pageSize.getHeight();

      const margin = 12;
      const usableW = pageWmm - margin * 2;
      const usableH = pageHmm - margin * 2;

      const cw = canvas.width;
      const ch = canvas.height;
      const pxPerMm = cw / usableW;
      const pageHPx = Math.ceil(usableH * pxPerMm);

      let y = 0;
      let pageIndex = 0;

      while (y < ch) {
        const srcH = Math.min(pageHPx, ch - y);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = cw;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        // @ts-ignore
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(canvas, 0, y, cw, srcH, 0, 0, cw, srcH);

        const img = pageCanvas.toDataURL("image/png");
        if (pageIndex > 0) pdf.addPage();

        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWmm, pageHmm, "F");

        const isLast = y + srcH >= ch;
        const hMm = isLast ? srcH / pxPerMm : usableH;
        pdf.addImage(img, "PNG", margin, margin, usableW, hMm);

        y += srcH;
        pageIndex++;
      }

      // nome do arquivo
      const cliente = String(payload.cliente || "cliente");
      const produto = String(payload.produto || "produto");
      const num = data.budget_number || "000";
      const clean = (t: string) =>
        t
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/gi, "_")
          .replace(/_+/g, "_")
          .toLowerCase();
      pdf.save(`${clean(cliente)}_${clean(produto)}_${num}.pdf`);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (err: any) {
      toast({
        title: "Erro ao gerar PDF",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Carregando orçamento..." />
      </AppLayout>
    );
  }

  if (!data) return null;

  return (
    <AppLayout>
      {/* Estilos para impressão + grid 2 colunas de opções */}
      <style>{`
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          @page { size: A4 portrait; margin: 15mm 20mm; }
          .no-print { display: none !important; }
          .avoid-break { page-break-inside: avoid; break-inside: avoid; }
        }
        .print-content {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          margin: 0 auto;
          background: #FFFFFF;
          color: #000000;
          box-sizing: border-box;
        }
        .grid-opts {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
      `}</style>

      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/budget/${id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-8 font-semibold">Gerar PDF</h1>
              <p className="text-muted-foreground">{data.display_id}</p>
            </div>
          </div>

          <Button onClick={handleGeneratePdf} disabled={generating} className="gap-2">
            <Download className="h-4 w-4" />
            {generating ? "Gerando..." : "Baixar PDF"}
          </Button>
        </div>

        {/* Conteúdo que vira PDF */}
        <div ref={contentRef} className="print-content">
          {/* Cabeçalho */}
          <div
            className="avoid-break flex items-start justify-between mb-8 pb-6"
            style={{ borderBottom: "3px solid #E6191E" }}
          >
            <div className="flex-1">
              <img src={logoWE} alt="Logo WE" style={{ height: "50px", marginBottom: "12px" }} />
              <div style={{ fontSize: "9px", lineHeight: "1.6", color: "#666" }}>
                <p style={{ fontWeight: "bold", fontSize: "10px", color: "#000", marginBottom: "4px" }}>
                  WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA
                </p>
                <p style={{ marginBottom: "2px" }}>CNPJ: 05.265.118/0001-65</p>
                <p>Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP: 04552-030</p>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "4px", color: "#E6191E" }}>ORÇAMENTO</h1>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#000", marginBottom: "4px" }}>
                Nº {data.budget_number}
              </p>
              <p style={{ fontSize: "11px", color: "#666", marginBottom: "2px" }}>{data.display_id}</p>
              <p style={{ fontSize: "12px", color: "#666" }}>{new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          {/* Identificação */}
          <div
            className="avoid-break"
            style={{
              marginBottom: "24px",
              padding: "16px",
              borderRadius: "8px",
              backgroundColor: "#F5F5F5",
              border: "1px solid #E0E0E0",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "16px",
                fontSize: "13px",
              }}
            >
              <div>
                <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: 600, color: "#666" }}>Cliente</p>
                <p style={{ fontWeight: "bold", color: "#000" }}>{payload.cliente || "-"}</p>
              </div>
              <div>
                <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: 600, color: "#666" }}>Produto</p>
                <p style={{ fontWeight: "bold", color: "#000" }}>{payload.produto || "-"}</p>
              </div>
              {payload.job && (
                <div>
                  <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: 600, color: "#666" }}>Job</p>
                  <p style={{ fontWeight: "bold", color: "#000" }}>{payload.job}</p>
                </div>
              )}
              {campanhas[0]?.nome && (
                <div>
                  <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: 600, color: "#666" }}>Campanha (1ª)</p>
                  <p style={{ fontWeight: "bold", color: "#000" }}>{campanhas[0].nome}</p>
                </div>
              )}
            </div>
          </div>

          {/* Campanhas (modelo de quotes) */}
          {campanhas.map((camp, campIdx) => {
            const filmSel = pickFilm(camp.quotes_film || []);
            const audioSel = camp.inclui_audio ? pickAudio(camp.quotes_audio || []) : null;
            const campTotal = (filmSel ? lowestQuoteValue(filmSel) : 0) + (audioSel ? finalAudioValue(audioSel) : 0);

            const films = camp.quotes_film || [];
            const audios = camp.quotes_audio || [];

            if (films.length === 0 && (!camp.inclui_audio || audios.length === 0)) return null;

            const globalMinFilm = films.length > 0 ? Math.min(...films.map((f) => lowestQuoteValue(f))) : Infinity;

            return (
              <div key={camp.id || campIdx} className="avoid-break" style={{ marginBottom: "24px" }}>
                {/* Cabeçalho da campanha */}
                <div
                  style={{
                    borderLeft: "4px solid #E6191E",
                    padding: "12px 16px",
                    marginBottom: "12px",
                    borderRadius: "0 8px 8px 0",
                    backgroundColor: "#F9F9F9",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#000" }}>
                      {camp.nome || `Campanha ${campIdx + 1}`}
                    </h2>
                    <span style={{ fontSize: "16px", fontWeight: "bold", color: "#E6191E" }}>{money(campTotal)}</span>
                  </div>
                </div>

                {/* PRODUTORAS DE FILME */}
                {films.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#000" }}>Produtoras — Filme</div>
                    {films.map((f, idx) => {
                      const isEscolhido = !!(filmSel && filmSel.id === f.id);
                      const minFornecedor = lowestQuoteValue(f);
                      const isMaisBaratoGlobal = Math.abs(minFornecedor - globalMinFilm) < 0.005;

                      const destaque = isEscolhido || isMaisBaratoGlobal;
                      const cardBg = destaque ? "#F0FAF4" : "#FFFFFF";
                      const cardBorder = destaque ? "2px solid #48bb78" : "1px solid #E5E5E5";
                      const shadow = destaque ? "0 2px 8px rgba(72, 187, 120, 0.15)" : "0 1px 3px rgba(0,0,0,0.08)";

                      return (
                        <div
                          key={f.id || idx}
                          className="rounded-lg px-3 py-3"
                          style={{ backgroundColor: cardBg, border: cardBorder, boxShadow: shadow }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 pr-3">
                              <div className="flex items-center gap-2 mb-1">
                                {isMaisBaratoGlobal && (
                                  <Star className="h-4 w-4 fill-green-600 text-green-600 flex-shrink-0" />
                                )}
                                {isEscolhido && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
                                <p
                                  className={`font-bold ${destaque ? "text-sm" : "text-xs"}`}
                                  style={{ color: "#000" }}
                                >
                                  {f.produtora || "Fornecedor"}
                                </p>
                              </div>

                              {f.diretor && (
                                <p className="text-[10px] mt-1" style={{ color: "#666" }}>
                                  <span className="font-semibold">Diretor:</span> {f.diretor}
                                </p>
                              )}
                              {f.tratamento && (
                                <p className="text-[10px] mt-1" style={{ color: "#666" }}>
                                  <span className="font-semibold">Tratamento:</span> {f.tratamento}
                                </p>
                              )}
                              {f.escopo && (
                                <div className="text-[10px] mt-2 leading-relaxed" style={{ color: "#444" }}>
                                  {f.escopo}
                                </div>
                              )}
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span
                                className={`font-bold ${destaque ? "text-base" : "text-sm"}`}
                                style={{ color: destaque ? "#2F855A" : "#000" }}
                              >
                                {money(minFornecedor)}
                              </span>
                              {toNum(f.desconto) > 0 && (
                                <p className="text-[9px] mt-1" style={{ color: "#666" }}>
                                  Desc: {money(toNum(f.desconto))}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Opções lado a lado (2 colunas) */}
                          {f.tem_opcoes && f.opcoes && f.opcoes.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <p className="text-[10px] font-semibold mb-2" style={{ color: "#666" }}>
                                Opções disponíveis:
                              </p>
                              <div className="grid-opts">
                                {f.opcoes.map((opc, oIdx) => {
                                  const valorOpc = toNum(opc.valor) - toNum(opc.desconto);
                                  // Marca a opção escolhida se ela for exatamente a menor e o fornecedor for o escolhido
                                  const isOpcEscolhida = isEscolhido && Math.abs(valorOpc - minFornecedor) < 0.005;

                                  return (
                                    <div
                                      key={opc.id || oIdx}
                                      style={{
                                        padding: "8px 10px",
                                        backgroundColor: isOpcEscolhida ? "#F0FAF4" : "#F9F9F9",
                                        border: isOpcEscolhida ? "1px solid #48BB78" : "1px solid #E5E5E5",
                                        borderRadius: 6,
                                        fontSize: 10,
                                      }}
                                    >
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                          <p style={{ fontWeight: 700, marginBottom: 2, color: "#000" }}>
                                            {opc.nome || `Opção ${oIdx + 1}`}
                                          </p>
                                          {opc.escopo && <p style={{ fontSize: 9, color: "#555" }}>{opc.escopo}</p>}
                                          {isOpcEscolhida && (
                                            <span
                                              style={{
                                                display: "inline-block",
                                                marginTop: 4,
                                                fontSize: 9,
                                                fontWeight: 700,
                                                color: "#2F855A",
                                                background: "#C6F6D5",
                                                border: "1px solid #48BB78",
                                                padding: "1px 6px",
                                                borderRadius: 999,
                                              }}
                                            >
                                              ✓ OPÇÃO ESCOLHIDA
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                          <p style={{ fontWeight: 700, color: "#000" }}>{money(valorOpc)}</p>
                                          {toNum(opc.desconto) > 0 && (
                                            <p style={{ fontSize: 8, color: "#666" }}>
                                              Desc: {money(toNum(opc.desconto))}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* PRODUTORAS DE ÁUDIO */}
                {camp.inclui_audio && audios.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#000" }}>Produtoras — Áudio</div>
                    {audios.map((a, idx) => {
                      const isEscolhido = !!(audioSel && audioSel.id === a.id);
                      const finalA = finalAudioValue(a);
                      return (
                        <div
                          key={a.id || idx}
                          className="rounded-lg px-3 py-3"
                          style={{
                            backgroundColor: isEscolhido ? "#EEF5FF" : "#FFFFFF",
                            border: isEscolhido ? "2px solid #3B82F6" : "1px solid #E5E5E5",
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="pr-3">
                              <div className="flex items-center gap-2">
                                {isEscolhido && <CheckCircle className="h-4 w-4 text-blue-600" />}
                                <p className="font-bold text-sm" style={{ color: "#000" }}>
                                  {a.produtora || "Fornecedor de Áudio"}
                                </p>
                              </div>
                              {a.descricao && (
                                <p className="text-[10px] mt-1" style={{ color: "#444" }}>
                                  {a.descricao}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span
                                className={`font-bold ${isEscolhido ? "text-base" : "text-sm"}`}
                                style={{ color: "#000" }}
                              >
                                {money(finalA)}
                              </span>
                              {toNum(a.desconto) > 0 && (
                                <p className="text-[9px] mt-1" style={{ color: "#666" }}>
                                  Desc: {money(toNum(a.desconto))}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Resumo por campanha */}
          {totaisPorCampanha.length > 0 && (
            <div
              className="avoid-break"
              style={{
                paddingTop: "16px",
                marginTop: "24px",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "#F5F5F5",
                borderTop: "3px solid #E6191E",
              }}
            >
              <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 14, color: "#000" }}>Resumo por Campanha</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                {totaisPorCampanha.map((t) => (
                  <div
                    key={t.id}
                    style={{ background: "#fff", border: "1px solid #E5E5E5", borderRadius: 8, padding: 12 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{t.nome}</span>
                      <span style={{ fontWeight: 700 }}>{money(t.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
