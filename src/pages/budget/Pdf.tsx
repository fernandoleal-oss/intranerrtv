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
          .select(`
            id,
            payload,
            versao,
            budgets!inner(
              id,
              display_id,
              type,
              status
            )
          `)
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

  const handleGeneratePdf = async () => {
    if (!contentRef.current || !data) return;

    setGenerating(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
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
      (sum: number, item: any) =>
        sum + (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0),
      0
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

  const totalGeral = campanhas.reduce(
    (sum: number, camp: any) => sum + calcularTotalCampanha(camp),
    0
  );

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
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
          className="p-6 rounded-2xl shadow-sm max-w-[210mm] mx-auto"
          style={{ minHeight: "297mm", backgroundColor: "#A5A5A5", color: "#000000" }}
        >
          <div className="border-b-2 border-[#E6191E] pb-2 mb-3">
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#000000" }}>ORÇAMENTO</h1>
            <p className="text-base" style={{ color: "#000000" }}>{data.display_id}</p>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="mb-0.5" style={{ color: "#000000", opacity: 0.7 }}>Cliente</p>
              <p className="font-semibold" style={{ color: "#000000" }}>{payload.cliente || "-"}</p>
            </div>
            <div>
              <p className="mb-0.5" style={{ color: "#000000", opacity: 0.7 }}>Produto</p>
              <p className="font-semibold" style={{ color: "#000000" }}>{payload.produto || "-"}</p>
            </div>
            {payload.job && (
              <div>
                <p className="mb-0.5" style={{ color: "#000000", opacity: 0.7 }}>Job</p>
                <p className="font-semibold" style={{ color: "#000000" }}>{payload.job}</p>
              </div>
            )}
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
              <div key={campIdx} className="mb-4">
                <div className="border-l-4 px-3 py-2 mb-2" style={{ borderColor: "#E6191E", backgroundColor: "rgba(0,0,0,0.05)" }}>
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold" style={{ color: "#000000" }}>{campanha.nome}</h2>
                    <span className="text-sm font-bold" style={{ color: "#000000" }}>
                      {formatCurrency(calcularTotalCampanha(campanha))}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {categoriasVisiveis.map((cat: any, idx: number) => {
                    const maisBarato = getMaisBarato(cat);
                    const subtotal = calcularSubtotal(cat);

                    return (
                      <div key={idx} className="pl-2 py-1" style={{ borderLeft: "2px solid rgba(0,0,0,0.2)" }}>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-sm" style={{ color: "#000000" }}>{cat.nome}</h3>
                          <span className="font-bold text-sm" style={{ color: "#000000" }}>{formatCurrency(subtotal)}</span>
                        </div>

                        {cat.observacao && (
                          <p className="text-xs mb-1 italic" style={{ color: "#000000", opacity: 0.7 }}>{cat.observacao}</p>
                        )}

                        {cat.modoPreco === "fechado" && cat.fornecedores?.length > 0 && (
                          <div className="space-y-2 text-xs">
                            {cat.fornecedores.map((f: any, fIdx: number) => {
                              const isMaisBarato = maisBarato === f || maisBarato?.id === f.id;
                              const valorFinal = (f.valor || 0) - (f.desconto || 0);

                              return (
                                <div
                                  key={fIdx}
                                  className={`rounded px-2 py-2 ${
                                    isMaisBarato ? "border-l-3" : ""
                                  }`}
                                  style={{
                                    backgroundColor: isMaisBarato ? "rgba(34, 197, 94, 0.15)" : "rgba(255,255,255,0.3)",
                                    borderLeft: isMaisBarato ? "3px solid #22c55e" : "none",
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-start gap-1 flex-1">
                                      {isMaisBarato && <Star className="h-3 w-3 fill-green-600 text-green-600 mt-0.5 flex-shrink-0" />}
                                      <div className="flex-1">
                                        <p className={`font-semibold ${isMaisBarato ? "text-[11px]" : "text-[10px]"}`} style={{ color: "#000000" }}>
                                          {f.nome}
                                          {isMaisBarato && <span className="text-green-600 ml-1">(SUGESTÃO)</span>}
                                        </p>
                                        {f.diretor && (
                                          <p className="text-[9px]" style={{ color: "#000000", opacity: 0.7 }}>Dir: {f.diretor}</p>
                                        )}
                                        {f.escopo && (
                                          <div className="text-[9px] mt-1" style={{ color: "#000000", opacity: 0.7 }}>
                                            {(() => {
                                              const elencoMatch = f.escopo.match(/elenco:([^\.]+)/i);
                                              if (elencoMatch) {
                                                const elenco = elencoMatch[1].trim();
                                                const resto = f.escopo.replace(/elenco:[^\.]+\.?/i, '').trim();
                                                return (
                                                  <>
                                                    {resto && <p className="mb-0.5">{resto}</p>}
                                                    <p className="font-semibold italic" style={{ color: "#000000", opacity: 0.85 }}>
                                                      Elenco: {elenco}
                                                    </p>
                                                  </>
                                                );
                                              }
                                              return <p>{f.escopo}</p>;
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`font-bold ${isMaisBarato ? "text-[11px] text-green-600" : "text-[10px]"} ml-2 flex-shrink-0`} style={!isMaisBarato ? { color: "#000000" } : {}}>
                                      {formatCurrency(valorFinal)}
                                    </span>
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

          <div className="pt-3 mt-4 space-y-1" style={{ borderTop: "2px solid #E6191E" }}>
            {campanhas.length > 1 &&
              campanhas.map((camp: any, idx: number) => {
                const total = calcularTotalCampanha(camp);
                if (total === 0) return null;
                return (
                  <div key={idx} className="flex justify-between text-sm font-semibold" style={{ color: "#000000" }}>
                    <span>{camp.nome}:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                );
              })}
            <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.2)" }}>
              <span className="text-lg font-bold" style={{ color: "#000000" }}>TOTAL GERAL SUGERIDO:</span>
              <span className="text-2xl font-bold" style={{ color: "#E6191E" }}>{formatCurrency(totalGeral)}</span>
            </div>
          </div>

          {payload.observacoes && (
            <div className="mt-3 pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.2)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#000000" }}>Observações:</p>
              <p className="text-xs whitespace-pre-wrap" style={{ color: "#000000", opacity: 0.8 }}>{payload.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
