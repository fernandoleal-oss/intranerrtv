import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Star, CheckCircle, FileText, Building2, Music, Film } from "lucide-react";
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

/** escolhe fornecedor "selecionado" ou o mais barato */
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

  const payload = data?.payload ?? {};
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

  const totalGeral = useMemo(() => {
    return totaisPorCampanha.reduce((sum, camp) => sum + camp.total, 0);
  }, [totaisPorCampanha]);

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
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
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
              <h1 className="text-[28px] leading-8 font-semibold">Visualização do Orçamento</h1>
              <p className="text-muted-foreground">{data.display_id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(`/budget/${id}`)} className="gap-2">
              <FileText className="h-4 w-4" />
              Editar
            </Button>
            <Button onClick={handleGeneratePdf} disabled={generating} className="gap-2">
              <Download className="h-4 w-4" />
              {generating ? "Gerando..." : "Baixar PDF"}
            </Button>
          </div>
        </div>

        {/* Conteúdo que vira PDF */}
        <div ref={contentRef} className="print-content bg-white shadow-2xl">
          {/* Cabeçalho */}
          <div
            className="avoid-break flex items-start justify-between mb-8 pb-6 border-b-4"
            style={{ borderColor: "#E6191E" }}
          >
            <div className="flex-1">
              <img src={logoWE} alt="Logo WE" style={{ height: "45px", marginBottom: "12px" }} />
              <div style={{ fontSize: "9px", lineHeight: "1.4", color: "#666" }}>
                <p style={{ fontWeight: "bold", fontSize: "10px", color: "#000", marginBottom: "2px" }}>
                  WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA
                </p>
                <p style={{ marginBottom: "1px" }}>CNPJ: 05.265.118/0001-65</p>
                <p>Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP: 04552-030</p>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <h1 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "4px", color: "#E6191E" }}>ORÇAMENTO</h1>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#000", marginBottom: "4px" }}>
                Nº {data.budget_number}
              </p>
              <p style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>{data.display_id}</p>
              <p style={{ fontSize: "11px", color: "#666" }}>{new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          {/* Informações do Cliente */}
          <div
            className="avoid-break mb-6 p-4 rounded-lg border"
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px", color: "#1E293B" }}>
              Informações do Projeto
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                fontSize: "12px",
              }}
            >
              <div>
                <p style={{ marginBottom: "2px", fontSize: "10px", fontWeight: 600, color: "#64748B" }}>Cliente</p>
                <p style={{ fontWeight: "bold", color: "#000" }}>{payload.cliente || "-"}</p>
              </div>
              <div>
                <p style={{ marginBottom: "2px", fontSize: "10px", fontWeight: 600, color: "#64748B" }}>Produto</p>
                <p style={{ fontWeight: "bold", color: "#000" }}>{payload.produto || "-"}</p>
              </div>
              {payload.job && (
                <div>
                  <p style={{ marginBottom: "2px", fontSize: "10px", fontWeight: 600, color: "#64748B" }}>Job</p>
                  <p style={{ fontWeight: "bold", color: "#000" }}>{payload.job}</p>
                </div>
              )}
              {payload.produtor && (
                <div>
                  <p style={{ marginBottom: "2px", fontSize: "10px", fontWeight: 600, color: "#64748B" }}>Produtor</p>
                  <p style={{ fontWeight: "bold", color: "#000" }}>{payload.produtor}</p>
                </div>
              )}
              {payload.entregaveis && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <p style={{ marginBottom: "2px", fontSize: "10px", fontWeight: 600, color: "#64748B" }}>
                    Entregáveis
                  </p>
                  <p style={{ fontWeight: "bold", color: "#000" }}>{payload.entregaveis}</p>
                </div>
              )}
            </div>
          </div>

          {/* Campanhas */}
          {campanhas.map((camp, campIdx) => {
            const filmSel = pickFilm(camp.quotes_film || []);
            const audioSel = camp.inclui_audio ? pickAudio(camp.quotes_audio || []) : null;
            const campTotal = (filmSel ? lowestQuoteValue(filmSel) : 0) + (audioSel ? finalAudioValue(audioSel) : 0);

            const films = camp.quotes_film || [];
            const audios = camp.quotes_audio || [];

            if (films.length === 0 && (!camp.inclui_audio || audios.length === 0)) return null;

            const globalMinFilm = films.length > 0 ? Math.min(...films.map((f) => lowestQuoteValue(f))) : Infinity;

            return (
              <div key={camp.id || campIdx} className="avoid-break mb-8">
                {/* Cabeçalho da campanha */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
                    borderLeft: "4px solid #E6191E",
                    padding: "16px 20px",
                    marginBottom: "16px",
                    borderRadius: "0 8px 8px 0",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-gray-600" />
                      <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E293B" }}>
                        {camp.nome || `Campanha ${campIdx + 1}`}
                      </h2>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "2px" }}>Total da Campanha</p>
                      <span style={{ fontSize: "20px", fontWeight: "bold", color: "#E6191E" }}>{money(campTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* PRODUTORAS DE FILME */}
                {films.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Film className="h-4 w-4 text-blue-600" />
                      <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#1E293B" }}>Produtoras de Filme</h3>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {films.map((f, idx) => {
                        const isEscolhido = !!(filmSel && filmSel.id === f.id);
                        const minFornecedor = lowestQuoteValue(f);
                        const isMaisBaratoGlobal = Math.abs(minFornecedor - globalMinFilm) < 0.005;

                        const destaque = isEscolhido || isMaisBaratoGlobal;
                        const cardBg = destaque ? "#F0FDF4" : "#FFFFFF";
                        const cardBorder = destaque ? "2px solid #16A34A" : "1px solid #E2E8F0";
                        const shadow = destaque ? "0 4px 12px rgba(22, 163, 74, 0.15)" : "0 2px 4px rgba(0,0,0,0.05)";

                        return (
                          <div
                            key={f.id || idx}
                            className="rounded-lg p-4"
                            style={{
                              backgroundColor: cardBg,
                              border: cardBorder,
                              boxShadow: shadow,
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            {destaque && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: "3px",
                                  background: "linear-gradient(90deg, #16A34A, #22C55E)",
                                }}
                              />
                            )}
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1 pr-4">
                                <div className="flex items-center gap-2 mb-2">
                                  {isMaisBaratoGlobal && (
                                    <Star className="h-4 w-4 fill-green-600 text-green-600 flex-shrink-0" />
                                  )}
                                  {isEscolhido && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
                                  <p
                                    className={`font-bold ${destaque ? "text-base" : "text-sm"}`}
                                    style={{ color: "#1E293B" }}
                                  >
                                    {f.produtora || "Fornecedor"}
                                  </p>
                                  {destaque && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: "#16A34A",
                                        background: "#DCFCE7",
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                        marginLeft: "8px",
                                      }}
                                    >
                                      {isEscolhido ? "SELECIONADO" : "MELHOR PREÇO"}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  {f.diretor && (
                                    <p className="text-[11px]" style={{ color: "#475569" }}>
                                      <span className="font-semibold">Diretor:</span> {f.diretor}
                                    </p>
                                  )}
                                  {f.tratamento && (
                                    <p className="text-[11px]" style={{ color: "#475569" }}>
                                      <span className="font-semibold">Tratamento:</span> {f.tratamento}
                                    </p>
                                  )}
                                </div>

                                {f.escopo && (
                                  <div
                                    className="mt-3 p-3 rounded border"
                                    style={{
                                      backgroundColor: "#F8FAFC",
                                      border: "1px solid #E2E8F0",
                                      fontSize: "11px",
                                      lineHeight: "1.5",
                                      color: "#475569",
                                    }}
                                  >
                                    {f.escopo}
                                  </div>
                                )}
                              </div>

                              <div className="text-right flex-shrink-0">
                                <span
                                  className={`font-bold ${destaque ? "text-lg" : "text-base"}`}
                                  style={{ color: destaque ? "#16A34A" : "#1E293B" }}
                                >
                                  {money(minFornecedor)}
                                </span>
                                {toNum(f.desconto) > 0 && (
                                  <p className="text-[10px] mt-1" style={{ color: "#64748B" }}>
                                    Desconto: {money(toNum(f.desconto))}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Opções lado a lado (2 colunas) */}
                            {f.tem_opcoes && f.opcoes && f.opcoes.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <p className="text-[11px] font-semibold mb-3" style={{ color: "#475569" }}>
                                  Opções disponíveis:
                                </p>
                                <div className="grid-opts">
                                  {f.opcoes.map((opc, oIdx) => {
                                    const valorOpc = toNum(opc.valor) - toNum(opc.desconto);
                                    const isOpcEscolhida = isEscolhido && Math.abs(valorOpc - minFornecedor) < 0.005;

                                    return (
                                      <div
                                        key={opc.id || oIdx}
                                        style={{
                                          padding: "10px 12px",
                                          backgroundColor: isOpcEscolhida ? "#F0FDF4" : "#F8FAFC",
                                          border: isOpcEscolhida ? "2px solid #16A34A" : "1px solid #E2E8F0",
                                          borderRadius: 8,
                                          fontSize: 11,
                                          position: "relative",
                                        }}
                                      >
                                        {isOpcEscolhida && (
                                          <div
                                            style={{
                                              position: "absolute",
                                              top: -1,
                                              left: -1,
                                              right: -1,
                                              height: "2px",
                                              backgroundColor: "#16A34A",
                                              borderRadius: "8px 8px 0 0",
                                            }}
                                          />
                                        )}
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                          <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 700, marginBottom: 4, color: "#1E293B" }}>
                                              {opc.nome || `Opção ${oIdx + 1}`}
                                            </p>
                                            {opc.escopo && (
                                              <p style={{ fontSize: 10, color: "#64748B", lineHeight: "1.4" }}>
                                                {opc.escopo}
                                              </p>
                                            )}
                                            {isOpcEscolhida && (
                                              <span
                                                style={{
                                                  display: "inline-block",
                                                  marginTop: 6,
                                                  fontSize: 9,
                                                  fontWeight: 700,
                                                  color: "#16A34A",
                                                  background: "#DCFCE7",
                                                  border: "1px solid #16A34A",
                                                  padding: "2px 8px",
                                                  borderRadius: "12px",
                                                }}
                                              >
                                                ✓ OPÇÃO ESCOLHIDA
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                                            <p style={{ fontWeight: 700, color: "#1E293B", fontSize: "12px" }}>
                                              {money(valorOpc)}
                                            </p>
                                            {toNum(opc.desconto) > 0 && (
                                              <p style={{ fontSize: 9, color: "#64748B" }}>
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
                  </div>
                )}

                {/* PRODUTORAS DE ÁUDIO */}
                {camp.inclui_audio && audios.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Music className="h-4 w-4 text-purple-600" />
                      <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#1E293B" }}>Produtoras de Áudio</h3>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {audios.map((a, idx) => {
                        const isEscolhido = !!(audioSel && audioSel.id === a.id);
                        const finalA = finalAudioValue(a);
                        return (
                          <div
                            key={a.id || idx}
                            className="rounded-lg p-4"
                            style={{
                              backgroundColor: isEscolhido ? "#F8FAFF" : "#FFFFFF",
                              border: isEscolhido ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                              boxShadow: isEscolhido
                                ? "0 4px 12px rgba(79, 70, 229, 0.15)"
                                : "0 2px 4px rgba(0,0,0,0.05)",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            {isEscolhido && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: "3px",
                                  background: "linear-gradient(90deg, #4F46E5, #6366F1)",
                                }}
                              />
                            )}
                            <div className="flex justify-between items-start">
                              <div className="pr-4 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {isEscolhido && <CheckCircle className="h-4 w-4 text-blue-600" />}
                                  <p className="font-bold text-sm" style={{ color: "#1E293B" }}>
                                    {a.produtora || "Fornecedor de Áudio"}
                                  </p>
                                  {isEscolhido && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: "#4F46E5",
                                        background: "#E0E7FF",
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                        marginLeft: "8px",
                                      }}
                                    >
                                      SELECIONADO
                                    </span>
                                  )}
                                </div>
                                {a.descricao && (
                                  <div
                                    className="p-2 rounded border mt-2"
                                    style={{
                                      backgroundColor: "#F8FAFC",
                                      border: "1px solid #E2E8F0",
                                      fontSize: "11px",
                                      color: "#475569",
                                    }}
                                  >
                                    {a.descricao}
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span
                                  className={`font-bold ${isEscolhido ? "text-lg" : "text-base"}`}
                                  style={{ color: isEscolhido ? "#4F46E5" : "#1E293B" }}
                                >
                                  {money(finalA)}
                                </span>
                                {toNum(a.desconto) > 0 && (
                                  <p className="text-[10px] mt-1" style={{ color: "#64748B" }}>
                                    Desconto: {money(toNum(a.desconto))}
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

          {/* Resumo Financeiro */}
          {(totaisPorCampanha.length > 0 || totalGeral > 0) && (
            <div
              className="avoid-break mt-8 p-6 rounded-xl border"
              style={{
                background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
                border: "2px solid #E2E8F0",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "#1E293B" }}>
                Resumo Financeiro
              </h2>

              {/* Totais por Campanha */}
              {totaisPorCampanha.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#475569" }}>
                    Totais por Campanha
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "12px" }}>
                    {totaisPorCampanha.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          background: "#fff",
                          border: "1px solid #E2E8F0",
                          borderRadius: 8,
                          padding: "12px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: "13px", color: "#1E293B" }}>{t.nome}</span>
                          <span style={{ fontWeight: 700, fontSize: "14px", color: "#E6191E" }}>{money(t.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Geral */}
              {totalGeral > 0 && (
                <div
                  style={{
                    padding: "16px",
                    background: "#FFFFFF",
                    border: "2px solid #E6191E",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", marginBottom: "4px" }}>
                    TOTAL GERAL
                  </p>
                  <p style={{ fontSize: "24px", fontWeight: "bold", color: "#E6191E" }}>{money(totalGeral)}</p>
                </div>
              )}

              {/* Observações */}
              {payload.observacoes && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px",
                    background: "#FFF",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", marginBottom: "4px" }}>
                    Observações:
                  </p>
                  <p style={{ fontSize: "11px", color: "#475569" }}>{payload.observacoes}</p>
                </div>
              )}

              {payload.pendente_faturamento && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px 12px",
                    background: "#FEF3C7",
                    border: "1px solid #F59E0B",
                    borderRadius: "6px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#92400E" }}>
                    ⚠️ ORÇAMENTO PENDENTE DE FATURAMENTO
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
