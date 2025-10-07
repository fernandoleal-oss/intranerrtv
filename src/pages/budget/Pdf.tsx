import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-spinner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logoWE from "@/assets/LOGO-WE-2.png";

interface BudgetData {
  id: string;
  display_id: string;
  type: string;
  status: string;
  payload: any;
  version_id: string;
}

export default function BudgetPdf() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<BudgetData | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
              status
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

  // NOVO: lógica que fatia o canvas por página, evitando cortes
  const handleGeneratePdf = async () => {
    if (!contentRef.current || !data) return;

    setGenerating(true);
    try {
      const element = contentRef.current;

      const canvas = await html2canvas(element, {
        scale: window.devicePixelRatio > 1 ? 2 : 1.5,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // px por mm baseado na largura (mantém proporção correta)
      const pxPerMm = canvasWidth / pageWidth;
      const pageHeightPx = pageHeight * pxPerMm;

      let y = 0;
      let pageIndex = 0;

      while (y < canvasHeight) {
        const sliceHeight = Math.min(pageHeightPx, canvasHeight - y);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvasWidth;
        pageCanvas.height = Math.ceil(sliceHeight);

        const ctx = pageCanvas.getContext("2d")!;
        ctx.drawImage(
          canvas,
          0,
          y,
          canvasWidth,
          sliceHeight, // origem
          0,
          0,
          canvasWidth,
          sliceHeight, // destino
        );

        const imgData = pageCanvas.toDataURL("image/png");
        const imgHeightMm = (sliceHeight * pageWidth) / canvasWidth;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeightMm);

        y += sliceHeight;
        pageIndex += 1;
      }

      pdf.save(`orcamento-${data.display_id}.pdf`);
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Carregando orçamento..." />
      </AppLayout>
    );
  }

  if (!data) return null;

  const payload = data.payload;
  const campanhas = payload.campanhas || [{ nome: "Campanha Única", categorias: payload.categorias || [] }];

  const getMaisBarato = (cat: any) => {
    if (!cat.fornecedores || cat.fornecedores.length === 0) return null;
    return cat.fornecedores.reduce((min: any, f: any) => {
      const valor = (f.valor || 0) - (f.desconto || 0);
      const minValor = (min.valor || 0) - (min.desconto || 0);
      return valor < minValor ? f : min;
    });
  };

  const calcularSubtotal = (cat: any) => {
    if (cat.modoPreco === "fechado") {
      const maisBarato = getMaisBarato(cat);
      if (!maisBarato) return 0;
      return (maisBarato.valor || 0) - (maisBarato.desconto || 0);
    }
    return (cat.itens || []).reduce(
      (sum: number, item: any) => sum + (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0),
      0,
    );
  };

  const calcularTotalCampanha = (campanha: any) => {
    return (campanha.categorias || [])
      .filter((c: any) => c.visivel !== false)
      .filter((c: any) => {
        if (c.modoPreco === "fechado") {
          return c.fornecedores && c.fornecedores.length > 0;
        }
        return c.itens && c.itens.length > 0;
      })
      .reduce((sum: number, c: any) => sum + calcularSubtotal(c), 0);
  };

  const totalGeral = campanhas.reduce((sum: number, camp: any) => sum + calcularTotalCampanha(camp), 0);

  return (
    <AppLayout>
      <style>{`
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        @media print {
          @page { size: A4 portrait; margin: 10mm 10mm 12mm 10mm; }
          html, body { width: 210mm; }
          .no-print { display: none !important; }
          .print-content { box-shadow: none; }
        }

        .print-content {
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          margin: 0 auto;
          /* ESSENCIAL: impede overflow ao somar padding com largura fixa */
          box-sizing: border-box;
        }

        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
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

        <div
          ref={contentRef}
          className="print-content"
          style={{
            width: "210mm",
            minHeight: "297mm",
            backgroundColor: "#FFFFFF",
            color: "#000000",
            padding: "15mm 20mm",
            margin: "0 auto",
            boxSizing: "border-box", // NOVO: evita corte horizontal
          }}
        >
          {/* Cabeçalho com Logo e Dados da Empresa */}
          <div
            className="avoid-break flex items-start justify-between mb-8 pb-6"
            style={{ borderBottom: "3px solid #E6191E" }}
          >
            <div className="flex-1">
              <img src={logoWE} alt="Logo WE" style={{ height: "50px", marginBottom: "12px" }} />
              <div style={{ fontSize: "9px", lineHeight: "1.6", color: "#666666" }}>
                <p style={{ fontWeight: "bold", fontSize: "10px", color: "#000000", marginBottom: "4px" }}>
                  WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA
                </p>
                <p style={{ marginBottom: "2px" }}>CNPJ: 05.265.118/0001-65</p>
                <p>Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP: 04552-030</p>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "4px", color: "#E6191E" }}>ORÇAMENTO</h1>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "#000000", marginBottom: "4px" }}>
                {data.display_id}
              </p>
              <p style={{ fontSize: "12px", color: "#666666" }}>{new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          {/* Informações do Cliente */}
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
                <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: "600", color: "#666666" }}>Cliente</p>
                <p style={{ fontWeight: "bold", color: "#000000" }}>{payload.cliente || "-"}</p>
              </div>
              <div>
                <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: "600", color: "#666666" }}>Produto</p>
                <p style={{ fontWeight: "bold", color: "#000000" }}>{payload.produto || "-"}</p>
              </div>
              {payload.job && (
                <div>
                  <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: "600", color: "#666666" }}>Job</p>
                  <p style={{ fontWeight: "bold", color: "#000000" }}>{payload.job}</p>
                </div>
              )}
              {campanhas.length > 0 && campanhas[0].nome && (
                <div>
                  <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: "600", color: "#666666" }}>Campanha</p>
                  <p style={{ fontWeight: "bold", color: "#000000" }}>{campanhas[0].nome}</p>
                </div>
              )}
            </div>
          </div>

          {campanhas.map((campanha: any, campIdx: number) => {
            const categoriasVisiveis = (campanha.categorias || [])
              .filter((c: any) => c.visivel !== false)
              .filter((c: any) => {
                if (c.modoPreco === "fechado") {
                  return c.fornecedores && c.fornecedores.length > 0;
                }
                return c.itens && c.itens.length > 0;
              });

            if (categoriasVisiveis.length === 0) return null;

            return (
              <div key={campIdx} className="avoid-break" style={{ marginBottom: "24px", pageBreakInside: "avoid" }}>
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
                    <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#000000" }}>{campanha.nome}</h2>
                    <span style={{ fontSize: "16px", fontWeight: "bold", color: "#E6191E" }}>
                      {formatCurrency(calcularTotalCampanha(campanha))}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {categoriasVisiveis.map((cat: any, idx: number) => {
                    const maisBarato = getMaisBarato(cat);
                    const subtotal = calcularSubtotal(cat);

                    return (
                      <div
                        key={idx}
                        className="avoid-break"
                        style={{
                          paddingLeft: "16px",
                          paddingTop: "8px",
                          paddingBottom: "8px",
                          borderRadius: "8px",
                          backgroundColor: "#FAFAFA",
                          borderLeft: "3px solid #D0D0D0",
                          pageBreakInside: "avoid",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "8px",
                          }}
                        >
                          <h3 style={{ fontWeight: "bold", fontSize: "15px", color: "#000000" }}>{cat.nome}</h3>
                          <span style={{ fontWeight: "bold", fontSize: "15px", color: "#000000" }}>
                            {formatCurrency(subtotal)}
                          </span>
                        </div>

                        {cat.observacao && (
                          <p
                            style={{
                              fontSize: "11px",
                              marginBottom: "8px",
                              fontStyle: "italic",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              color: "#555555",
                              backgroundColor: "#F0F0F0",
                            }}
                          >
                            {cat.observacao}
                          </p>
                        )}

                        {cat.modoPreco === "fechado" && cat.fornecedores?.length > 0 && (
                          <div className="space-y-3 mt-3">
                            {cat.fornecedores.map((f: any, fIdx: number) => {
                              const isMaisBarato = maisBarato === f || maisBarato?.id === f.id;
                              const valorFinal = (f.valor || 0) - (f.desconto || 0);

                              return (
                                <div
                                  key={fIdx}
                                  className="rounded-lg px-3 py-3"
                                  style={{
                                    backgroundColor: isMaisBarato ? "#F0FAF4" : "#FFFFFF",
                                    border: isMaisBarato ? "2px solid #48bb78" : "1px solid #E5E5E5",
                                    boxShadow: isMaisBarato
                                      ? "0 2px 8px rgba(72, 187, 120, 0.15)"
                                      : "0 1px 3px rgba(0,0,0,0.08)",
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 pr-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        {isMaisBarato && (
                                          <Star className="h-4 w-4 fill-green-600 text-green-600 flex-shrink-0" />
                                        )}
                                        <p
                                          className={`font-bold ${isMaisBarato ? "text-sm" : "text-xs"}`}
                                          style={{ color: "#000000" }}
                                        >
                                          {f.nome}
                                        </p>
                                      </div>
                                      {isMaisBarato && (
                                        <p className="text-[10px] font-semibold mb-1" style={{ color: "#48bb78" }}>
                                          ★ OPÇÃO MAIS BARATA
                                        </p>
                                      )}
                                      {f.diretor && (
                                        <p className="text-[10px] mb-1" style={{ color: "#666666" }}>
                                          <span className="font-semibold">Diretor:</span> {f.diretor}
                                        </p>
                                      )}
                                      {f.escopo && (
                                        <div className="text-[10px] mt-2 leading-relaxed" style={{ color: "#444444" }}>
                                          {(() => {
                                            const elencoMatch = f.escopo.match(/elenco:([^\.]+)/i);
                                            if (elencoMatch) {
                                              const elenco = elencoMatch[1].trim();
                                              const resto = f.escopo.replace(/elenco:[^\.]+\.?/i, "").trim();
                                              return (
                                                <>
                                                  {resto && <p className="mb-1.5">{resto}</p>}
                                                  <div className="bg-gray-50 border-l-2 border-gray-400 pl-2 py-1 mt-1">
                                                    <p className="font-semibold italic">
                                                      <span style={{ color: "#666666" }}>Elenco:</span> {elenco}
                                                    </p>
                                                  </div>
                                                </>
                                              );
                                            }
                                            return <p>{f.escopo}</p>;
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <span
                                        className={`font-bold ${isMaisBarato ? "text-base" : "text-sm"}`}
                                        style={{ color: isMaisBarato ? "#48bb78" : "#000000" }}
                                      >
                                        {formatCurrency(valorFinal)}
                                      </span>
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
                </div>
              </div>
            );
          })}

          {/* Totalizadores */}
          <div
            className="avoid-break"
            style={{
              paddingTop: "16px",
              marginTop: "24px",
              borderRadius: "8px",
              padding: "16px",
              backgroundColor: "#F5F5F5",
              borderTop: "3px solid #E6191E",
              pageBreakInside: "avoid",
            }}
          >
            {campanhas.length > 1 &&
              campanhas.map((camp: any, idx: number) => {
                const total = calcularTotalCampanha(camp);
                if (total === 0) return null;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      fontWeight: "600",
                      paddingTop: "4px",
                      paddingBottom: "4px",
                      color: "#000000",
                    }}
                  >
                    <span>{camp.nome}:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                );
              })}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                marginTop: "8px",
                borderTop: "2px solid #D0D0D0",
              }}
            >
              <span style={{ fontSize: "18px", fontWeight: "bold", color: "#000000" }}>TOTAL GERAL SUGERIDO:</span>
              <span style={{ fontSize: "24px", fontWeight: "bold", color: "#E6191E" }}>
                {formatCurrency(totalGeral)}
              </span>
            </div>
          </div>

          {/* Observações */}
          {payload.observacoes && (
            <div
              className="avoid-break"
              style={{
                marginTop: "20px",
                padding: "16px",
                borderRadius: "8px",
                backgroundColor: "#FAFAFA",
                border: "1px solid #E0E0E0",
                pageBreakInside: "avoid",
              }}
            >
              <p style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "8px", color: "#000000" }}>
                Observações:
              </p>
              <p
                style={{
                  fontSize: "11px",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  color: "#555555",
                }}
              >
                {payload.observacoes}
              </p>
            </div>
          )}

          {/* Rodapé LGPD */}
          <div
            className="avoid-break"
            style={{ marginTop: "24px", paddingTop: "16px", borderTop: "2px solid #E6191E" }}
          >
            <p
              style={{
                fontSize: "9px",
                textAlign: "center",
                lineHeight: "1.6",
                color: "#888888",
              }}
            >
              Este orçamento é confidencial e destinado exclusivamente ao cliente mencionado. Conforme a Lei Geral de
              Proteção de Dados (LGPD - Lei nº 13.709/2018), todas as informações contidas neste documento são tratadas
              com segurança e privacidade.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
