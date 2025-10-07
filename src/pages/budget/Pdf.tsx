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
          className="p-8 max-w-[210mm] mx-auto"
          style={{ minHeight: "297mm", backgroundColor: "#FFFFFF", color: "#000000" }}
        >
          {/* Cabeçalho com Logo e Dados da Empresa */}
          <div className="flex items-start justify-between mb-6 pb-4" style={{ borderBottom: "3px solid #E6191E" }}>
            <div className="flex-1">
              <img src="/src/assets/Logo_WE.png" alt="Logo WE" className="h-14 mb-3" />
              <div className="text-[9px] leading-relaxed" style={{ color: "#666666" }}>
                <p className="font-bold text-[10px]" style={{ color: "#000000" }}>WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA</p>
                <p>CNPJ: 05.265.118/0001-65</p>
                <p>Rua Chilon, 381, Vila Olímpia, São Paulo – SP, CEP: 04552-030</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold mb-1" style={{ color: "#E6191E" }}>ORÇAMENTO</h1>
              <p className="text-base font-semibold" style={{ color: "#000000" }}>{data.display_id}</p>
              <p className="text-xs mt-1" style={{ color: "#666666" }}>
                {new Date().toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          {/* Informações do Cliente */}
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: "#F5F5F5", border: "1px solid #E0E0E0" }}>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="mb-1 text-xs font-semibold" style={{ color: "#666666" }}>Cliente</p>
                <p className="font-bold" style={{ color: "#000000" }}>{payload.cliente || "-"}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold" style={{ color: "#666666" }}>Produto</p>
                <p className="font-bold" style={{ color: "#000000" }}>{payload.produto || "-"}</p>
              </div>
              {payload.job && (
                <div>
                  <p className="mb-1 text-xs font-semibold" style={{ color: "#666666" }}>Job</p>
                  <p className="font-bold" style={{ color: "#000000" }}>{payload.job}</p>
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
              <div key={campIdx} className="mb-6">
                <div className="border-l-4 px-4 py-3 mb-3 rounded-r-lg" style={{ borderColor: "#E6191E", backgroundColor: "#F9F9F9" }}>
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold" style={{ color: "#000000" }}>{campanha.nome}</h2>
                    <span className="text-base font-bold" style={{ color: "#E6191E" }}>
                      {formatCurrency(calcularTotalCampanha(campanha))}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {categoriasVisiveis.map((cat: any, idx: number) => {
                    const maisBarato = getMaisBarato(cat);
                    const subtotal = calcularSubtotal(cat);

                    return (
                      <div key={idx} className="pl-4 py-2 rounded-lg" style={{ backgroundColor: "#FAFAFA", borderLeft: "3px solid #D0D0D0" }}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-base" style={{ color: "#000000" }}>{cat.nome}</h3>
                          <span className="font-bold text-base" style={{ color: "#000000" }}>{formatCurrency(subtotal)}</span>
                        </div>

                        {cat.observacao && (
                          <p className="text-xs mb-2 italic px-2 py-1 rounded" style={{ color: "#555555", backgroundColor: "#F0F0F0" }}>{cat.observacao}</p>
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
                                     boxShadow: isMaisBarato ? "0 2px 8px rgba(72, 187, 120, 0.15)" : "0 1px 3px rgba(0,0,0,0.08)",
                                   }}
                                 >
                                   <div className="flex justify-between items-start mb-2">
                                     <div className="flex-1 pr-3">
                                       <div className="flex items-center gap-2 mb-1">
                                         {isMaisBarato && (
                                           <Star className="h-4 w-4 fill-green-600 text-green-600 flex-shrink-0" />
                                         )}
                                         <p className={`font-bold ${isMaisBarato ? "text-sm" : "text-xs"}`} style={{ color: "#000000" }}>
                                           {f.nome}
                                         </p>
                                       </div>
                                       {isMaisBarato && (
                                         <p className="text-[10px] font-semibold mb-1" style={{ color: "#48bb78" }}>★ OPÇÃO MAIS BARATA</p>
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
                                               const resto = f.escopo.replace(/elenco:[^\.]+\.?/i, '').trim();
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
                                       <span className={`font-bold ${isMaisBarato ? "text-base" : "text-sm"}`} style={{ color: isMaisBarato ? "#48bb78" : "#000000" }}>
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
          <div className="pt-4 mt-6 space-y-2 rounded-lg p-4" style={{ backgroundColor: "#F5F5F5", borderTop: "3px solid #E6191E" }}>
            {campanhas.length > 1 &&
              campanhas.map((camp: any, idx: number) => {
                const total = calcularTotalCampanha(camp);
                if (total === 0) return null;
                return (
                  <div key={idx} className="flex justify-between text-sm font-semibold py-1" style={{ color: "#000000" }}>
                    <span>{camp.nome}:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                );
              })}
            <div className="flex justify-between items-center pt-3 mt-2" style={{ borderTop: "2px solid #D0D0D0" }}>
              <span className="text-lg font-bold" style={{ color: "#000000" }}>TOTAL GERAL SUGERIDO:</span>
              <span className="text-2xl font-bold" style={{ color: "#E6191E" }}>{formatCurrency(totalGeral)}</span>
            </div>
          </div>

          {/* Observações */}
          {payload.observacoes && (
            <div className="mt-5 p-4 rounded-lg" style={{ backgroundColor: "#FAFAFA", border: "1px solid #E0E0E0" }}>
              <p className="text-sm font-bold mb-2" style={{ color: "#000000" }}>Observações:</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#555555" }}>{payload.observacoes}</p>
            </div>
          )}

          {/* Rodapé LGPD */}
          <div className="mt-6 pt-4" style={{ borderTop: "2px solid #E6191E" }}>
            <p className="text-[9px] text-center leading-relaxed" style={{ color: "#888888" }}>
              Este orçamento é confidencial e destinado exclusivamente ao cliente mencionado. 
              Conforme a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), 
              todas as informações contidas neste documento são tratadas com segurança e privacidade.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
