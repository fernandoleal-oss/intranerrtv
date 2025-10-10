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
  budget_number: string;
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

  // ====== Geração de PDF COM MARGENS FIXAS ======
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

      const pageWmm = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHmm = pdf.internal.pageSize.getHeight(); // 297mm
      
      // Margens internas (12mm em cada lado)
      const pageMarginMm = 12;
      const contentWmm = pageWmm - pageMarginMm * 2; // largura útil = 186mm
      const contentHmm = pageHmm - pageMarginMm * 2; // altura útil = 273mm

      const cw = canvas.width;
      const ch = canvas.height;

      // px↔mm com base na LARGURA útil (com margens)
      const pxPerMm = cw / contentWmm;
      const pageHPx = Math.ceil(contentHmm * pxPerMm); // altura exata por página

      let y = 0;
      let pageIndex = 0;

      while (y < ch) {
        const srcHeight = Math.min(pageHPx, ch - y);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = cw;
        pageCanvas.height = srcHeight;

        const ctx = pageCanvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        // @ts-ignore
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(
          canvas,
          0,
          y,
          cw,
          srcHeight, // origem
          0,
          0,
          cw,
          srcHeight, // destino
        );

        const img = pageCanvas.toDataURL("image/png");

        if (pageIndex > 0) pdf.addPage();

        // Fundo branco na página
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWmm, pageHmm, "F");

        const isLast = y + srcHeight >= ch;
        // Para páginas cheias, ocupa altura útil; na última respeita altura real
        const targetHeightMm = isLast ? srcHeight / pxPerMm : contentHmm;
        const targetWidthMm = contentWmm;

        // Adiciona imagem COM MARGEM (pageMarginMm de offset em x e y)
        pdf.addImage(img, "PNG", pageMarginMm, pageMarginMm, targetWidthMm, targetHeightMm);

        y += srcHeight;
        pageIndex += 1;
      }

      // Nome do arquivo: cliente_produto_numero.pdf
      const payload = data.payload || {};
      const cliente = payload.cliente || "cliente";
      const produto = payload.produto || "produto";
      const numero = data.budget_number || "000";

      const cleanText = (text: string) =>
        String(text)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]/g, "_")
          .replace(/_+/g, "_")
          .toLowerCase();

      const fileName = `${cleanText(cliente)}_${cleanText(produto)}_${numero}.pdf`;

      pdf.save(fileName);
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
  // ====== FIM ======

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

  const payload = data.payload || {};
  const campanhas = payload.campanhas || [{ nome: "Campanha Única", categorias: payload.categorias || [] }];

  // Ordenar fornecedores por valor final (valor - desconto), do mais barato ao mais caro
  const ordenarFornecedores = (fornecedores: any[]) => {
    if (!fornecedores || fornecedores.length === 0) return [];
    return [...fornecedores].sort((a, b) => {
      const valorA = (a.valor || 0) - (a.desconto || 0);
      const valorB = (b.valor || 0) - (b.desconto || 0);
      return valorA - valorB;
    });
  };

  const getMaisBarato = (cat: any) => {
    const ordenados = ordenarFornecedores(cat.fornecedores);
    if (!ordenados || ordenados.length === 0) return null;
    
    // Considerar opções múltiplas ao calcular o mais barato
    let maisBarato = ordenados[0];
    let menorValor = (maisBarato.valor || 0) - (maisBarato.desconto || 0);
    
    for (const f of ordenados) {
      // Se tem opções, verificar a opção mais barata
      if (f.tem_opcoes && f.opcoes && f.opcoes.length > 0) {
        for (const opc of f.opcoes) {
          const valorOpcao = (opc.valor || 0) - (opc.desconto || 0);
          if (valorOpcao < menorValor) {
            menorValor = valorOpcao;
            maisBarato = { ...f, opcaoSelecionada: opc };
          }
        }
      } else {
        const valorF = (f.valor || 0) - (f.desconto || 0);
        if (valorF < menorValor) {
          menorValor = valorF;
          maisBarato = f;
        }
      }
    }
    
    return maisBarato;
  };

  const calcularSubtotal = (cat: any) => {
    if (cat.modoPreco === "fechado") {
      const maisBarato = getMaisBarato(cat);
      if (!maisBarato) return 0;
      
      // Se tem opção selecionada, usar o valor dela
      if (maisBarato.opcaoSelecionada) {
        return (maisBarato.opcaoSelecionada.valor || 0) - (maisBarato.opcaoSelecionada.desconto || 0);
      }
      
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

  // Array para o resumo em cards (lado a lado)
  const totaisPorCampanha = campanhas.map((camp: any) => ({
    nome: camp.nome,
    total: calcularTotalCampanha(camp),
  }));

  return (
    <AppLayout>
      <style>{`
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        @media print {
          @page { 
            size: A4 portrait; 
            margin: 15mm 20mm; 
          }
          html, body { 
            width: 210mm; 
            background: #FFFFFF !important; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .print-content, .print-content * { 
            box-shadow: none !important; 
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        .print-content {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm 20mm;
          margin: 0 auto;
          background: #FFFFFF;
          color: #000000;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          box-sizing: border-box;
        }

        .avoid-break { 
          break-inside: avoid !important; 
          page-break-inside: avoid !important;
        }
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
            padding: "20mm 20mm",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {/* Cabeçalho */}
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
              <p style={{ fontSize: "18px", fontWeight: "700", color: "#000000", marginBottom: "4px" }}>
                Nº {data.budget_number}
              </p>
              <p style={{ fontSize: "11px", color: "#666666", marginBottom: "2px" }}>{data.display_id}</p>
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
                  <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: "600", color: "#666666" }}>
                    Campanha (1ª)
                  </p>
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

                        {/* Itens itemizados */}
                        {cat.modoPreco !== "fechado" && cat.itens?.length > 0 && (
                          <div style={{ marginTop: "12px" }}>
                            <table style={{ width: "100%", fontSize: "10px", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ backgroundColor: "#F0F0F0", borderBottom: "1px solid #D0D0D0" }}>
                                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600" }}>Item</th>
                                  <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: "600" }}>Qtd</th>
                                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: "600" }}>Valor Unit.</th>
                                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: "600" }}>Desconto</th>
                                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: "600" }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cat.itens.map((item: any, iIdx: number) => {
                                  const totalItem = (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0);
                                  return (
                                    <tr key={iIdx} style={{ borderBottom: "1px solid #E5E5E5" }}>
                                      <td style={{ padding: "6px 8px" }}>{item.nome || "-"}</td>
                                      <td style={{ padding: "6px 8px", textAlign: "center" }}>{item.quantidade || 0}</td>
                                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                        {formatCurrency(item.valorUnitario || 0)}
                                      </td>
                                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                        {formatCurrency(item.desconto || 0)}
                                      </td>
                                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "600" }}>
                                        {formatCurrency(totalItem)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Fornecedores (modo fechado) */}
                        {cat.modoPreco === "fechado" && cat.fornecedores?.length > 0 && (
                          <div className="space-y-3 mt-3">
                            {ordenarFornecedores(cat.fornecedores).map((f: any, fIdx: number) => {
                              const isMaisBarato = maisBarato === f || maisBarato?.id === f.id || 
                                (maisBarato?.opcaoSelecionada && maisBarato.id === f.id);
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
                                      {f.tratamento && (
                                        <p className="text-[10px] mt-1" style={{ color: "#666666" }}>
                                          <span className="font-semibold">Tratamento:</span> {f.tratamento}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <span
                                        className={`font-bold ${isMaisBarato ? "text-base" : "text-sm"}`}
                                        style={{ color: isMaisBarato ? "#48bb78" : "#000000" }}
                                      >
                                        {formatCurrency(valorFinal)}
                                      </span>
                                      {f.desconto > 0 && (
                                        <p className="text-[9px] mt-1" style={{ color: "#666666" }}>
                                          Desc: {formatCurrency(f.desconto)}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Opções múltiplas do fornecedor */}
                                  {f.tem_opcoes && f.opcoes && f.opcoes.length > 0 && (
                                    <div style={{ marginTop: "8px", paddingLeft: "12px" }}>
                                      <p className="text-[10px] font-semibold mb-2" style={{ color: "#666666" }}>
                                        Opções disponíveis:
                                      </p>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {f.opcoes.map((opc: any, opcIdx: number) => {
                                          const valorOpcao = (opc.valor || 0) - (opc.desconto || 0);
                                          return (
                                            <div
                                              key={opcIdx}
                                              style={{
                                                padding: "6px 10px",
                                                backgroundColor: "#F9F9F9",
                                                border: "1px solid #E5E5E5",
                                                borderRadius: "6px",
                                                fontSize: "10px",
                                              }}
                                            >
                                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                                <div style={{ flex: 1 }}>
                                                  <p style={{ fontWeight: "600", marginBottom: "2px", color: "#000000" }}>
                                                    {opc.nome || `Opção ${opcIdx + 1}`}
                                                  </p>
                                                  {opc.escopo && (
                                                    <p style={{ fontSize: "9px", color: "#555555", marginTop: "2px" }}>
                                                      {opc.escopo}
                                                    </p>
                                                  )}
                                                </div>
                                                <div style={{ textAlign: "right", marginLeft: "8px" }}>
                                                  <p style={{ fontWeight: "700", color: "#000000" }}>
                                                    {formatCurrency(valorOpcao)}
                                                  </p>
                                                  {opc.desconto > 0 && (
                                                    <p style={{ fontSize: "8px", color: "#666666" }}>
                                                      Desc: {formatCurrency(opc.desconto)}
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
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Resumo por campanha — SEM total geral / SEM honorário */}
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
            <div style={{ marginBottom: "8px", fontWeight: 700, fontSize: "14px", color: "#000000" }}>
              Resumo por Campanha
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px",
              }}
            >
              {totaisPorCampanha.map((c: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E0E0E0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#333333" }}>{c.nome}</span>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#E6191E" }}>{formatCurrency(c.total)}</span>
                </div>
              ))}
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
