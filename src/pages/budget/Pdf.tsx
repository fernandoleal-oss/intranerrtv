import { useEffect, useState, useRef, useMemo } from "react";
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

interface BudgetData {
  id: string;
  display_id: string;
  type: string;
  status: string;
  payload: any;
  version_id: string;
  budget_number: string;
}

type Fornecedor = {
  id: string;
  nome: string;
  diretor?: string;
  tratamento?: string;
  escopo?: string;
  valor?: number | string;
  desconto?: number | string;
  tem_opcoes?: boolean;
  opcoes?: { id: string; nome?: string; escopo?: string; valor?: number | string; desconto?: number | string }[];
};

type Categoria = {
  nome: string;
  modoPreco: "fechado" | "itens";
  fornecedores?: Fornecedor[];
  itens?: any[];
  visivel?: boolean;
  observacao?: string;
};

type CampanhaPDF = {
  nome: string;
  categorias: Categoria[];
};

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

  // ===== Utils =====
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

  const toNum = (v: any) => {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (typeof v === "string") {
      const norm = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
      const n = Number(norm);
      return isFinite(n) ? n : 0;
    }
    const n = Number(v);
    return isFinite(n) ? n : 0;
  };

  // ===== NORMALIZAÇÃO (novo modelo -> categorias/fornecedores) =====
  const normalizeCampanhas = (payload: any): CampanhaPDF[] => {
    // Já no modelo antigo?
    if (Array.isArray(payload?.campanhas) && payload.campanhas[0]?.categorias) {
      return payload.campanhas as CampanhaPDF[];
    }
    if (Array.isArray(payload?.categorias)) {
      return [{ nome: payload?.nome || "Campanha Única", categorias: payload.categorias }];
    }

    // Novo modelo: campanhas com quotes_film / quotes_audio
    if (Array.isArray(payload?.campanhas)) {
      return payload.campanhas.map((c: any) => {
        const catFilme: Categoria = {
          nome: "Produção de Filme",
          modoPreco: "fechado",
          fornecedores: (c.quotes_film || []).map((q: any) => ({
            id: q.id,
            nome: q.produtora || q.nome || "Fornecedor",
            diretor: q.diretor,
            tratamento: q.tratamento,
            escopo: q.escopo,
            valor: toNum(q.valor),
            desconto: toNum(q.desconto),
            tem_opcoes: !!q.tem_opcoes && Array.isArray(q.opcoes) && q.opcoes.length > 0,
            opcoes: (q.opcoes || []).map((op: any) => ({
              id: op.id,
              nome: op.nome,
              escopo: op.escopo,
              valor: toNum(op.valor),
              desconto: toNum(op.desconto),
            })),
          })),
          visivel: true,
        };

        const categorias: Categoria[] = [];
        if ((catFilme.fornecedores || []).length > 0) categorias.push(catFilme);

        if (c.inclui_audio) {
          const catAudio: Categoria = {
            nome: "Áudio",
            modoPreco: "fechado",
            fornecedores: (c.quotes_audio || []).map((q: any) => ({
              id: q.id,
              nome: q.produtora || "Produtora de Áudio",
              escopo: q.descricao,
              valor: toNum(q.valor),
              desconto: toNum(q.desconto),
              tem_opcoes: false,
              opcoes: [],
            })),
            visivel: true,
          };
          if ((catAudio.fornecedores || []).length > 0) categorias.push(catAudio);
        }

        return { nome: c.nome || "Campanha", categorias };
      });
    }

    // Fallback
    const categorias: Categoria[] = (payload?.categorias || []).map((x: any) => x);
    return [{ nome: "Campanha Única", categorias }];
  };

  // ===== Cálculos =====
  const precoMinFornecedor = (f: Fornecedor) => {
    const base = toNum(f.valor) - toNum(f.desconto);
    if (f.tem_opcoes && Array.isArray(f.opcoes) && f.opcoes.length) {
      const minOpc = f.opcoes.reduce((min: number, opc: any) => {
        const val = toNum(opc.valor) - toNum(opc.desconto);
        return val < min ? val : min;
      }, base);
      return Math.min(base, minOpc);
    }
    return base;
  };

  const ordenarFornecedores = (fornecedores: Fornecedor[] = []) =>
    [...fornecedores].sort((a, b) => precoMinFornecedor(a) - precoMinFornecedor(b));

  const getSelecionado = (cat: Categoria) => {
    for (const f of cat.fornecedores || []) {
      if ((f as any)?.selecionado) {
        if (f.tem_opcoes && f.opcoes?.length) {
          const opSel = (f.opcoes as any[]).find((o) => (o as any)?.selecionada);
          if (opSel) return { ...f, opcaoSelecionada: opSel, selecionado: true };
        }
        return { ...f, selecionado: true };
      }
    }
    for (const f of cat.fornecedores || []) {
      if (f.tem_opcoes && f.opcoes?.length) {
        const opSel = (f.opcoes as any[]).find((o) => (o as any)?.selecionada);
        if (opSel) return { ...f, opcaoSelecionada: opSel, selecionado: true };
      }
    }
    return null;
  };

  const getEscolhido = (cat: Categoria) => {
    const sel = getSelecionado(cat);
    if (sel) return sel;

    let best: any = null;
    let bestVal = Infinity;
    for (const f of cat.fornecedores || []) {
      if (f.tem_opcoes && f.opcoes?.length) {
        for (const opc of f.opcoes) {
          const val = toNum(opc.valor) - toNum(opc.desconto);
          if (val < bestVal) {
            bestVal = val;
            best = { ...f, opcaoSelecionada: opc };
          }
        }
      } else {
        const val = toNum(f.valor) - toNum(f.desconto);
        if (val < bestVal) {
          bestVal = val;
          best = f;
        }
      }
    }
    return best;
  };

  const calcularSubtotal = (cat: Categoria) => {
    if (cat.modoPreco === "fechado") {
      const escolhido = getEscolhido(cat);
      if (!escolhido) return 0;
      return escolhido.opcaoSelecionada
        ? toNum(escolhido.opcaoSelecionada.valor) - toNum(escolhido.opcaoSelecionada.desconto)
        : toNum(escolhido.valor) - toNum(escolhido.desconto);
    }
    return (cat.itens || []).reduce(
      (sum: number, item: any) => sum + toNum(item.quantidade) * toNum(item.valorUnitario) - toNum(item.desconto),
      0,
    );
  };

  const calcularTotalCampanha = (campanha: CampanhaPDF) =>
    (campanha.categorias || [])
      .filter((c: any) => c.visivel !== false)
      .filter((c: any) => (c.modoPreco === "fechado" ? c.fornecedores?.length > 0 : c.itens?.length > 0))
      .reduce((sum: number, c: any) => sum + calcularSubtotal(c), 0);

  // ===== Hooks sempre no topo =====
  const payload = data?.payload || {};
  const campanhasPDF: CampanhaPDF[] = useMemo(() => normalizeCampanhas(payload), [JSON.stringify(payload)]);

  const totaisPorCampanha = useMemo(
    () => campanhasPDF.map((camp) => ({ nome: camp.nome, total: calcularTotalCampanha(camp) })),
    [JSON.stringify(campanhasPDF)],
  );

  // ===== PDF =====
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

      const pageMarginMm = 12;
      const contentWmm = pageWmm - pageMarginMm * 2;
      const contentHmm = pageHmm - pageMarginMm * 2;

      const cw = canvas.width;
      const ch = canvas.height;

      const pxPerMm = cw / contentWmm;
      const pageHPx = Math.ceil(contentHmm * pxPerMm);

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
        ctx.drawImage(canvas, 0, y, cw, srcHeight, 0, 0, cw, srcHeight);

        const img = pageCanvas.toDataURL("image/png");

        if (pageIndex > 0) pdf.addPage();

        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWmm, pageHmm, "F");

        const isLast = y + srcHeight >= ch;
        const targetHeightMm = isLast ? srcHeight / pxPerMm : contentHmm;
        const targetWidthMm = contentWmm;

        pdf.addImage(img, "PNG", pageMarginMm, pageMarginMm, targetWidthMm, targetHeightMm);

        y += srcHeight;
        pageIndex += 1;
      }

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
      <style>{`
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          @page { size: A4 portrait; margin: 15mm 20mm; }
          html, body { width: 210mm; background: #FFFFFF !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-content, .print-content * { box-shadow: none !important; }
          .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
        }
        .print-content {
          width: 210mm; min-height: 297mm; padding: 20mm 20mm; margin: 0 auto;
          background: #FFFFFF; color: #000000; box-shadow: 0 0 10px rgba(0,0,0,0.1); box-sizing: border-box;
        }
        .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
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
              {campanhasPDF.length > 0 && campanhasPDF[0].nome && (
                <div>
                  <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: "600", color: "#666666" }}>
                    Campanha (1ª)
                  </p>
                  <p style={{ fontWeight: "bold", color: "#000000" }}>{campanhasPDF[0].nome}</p>
                </div>
              )}
            </div>
          </div>

          {campanhasPDF.map((campanha: CampanhaPDF, campIdx: number) => {
            const categoriasVisiveis = (campanha.categorias || [])
              .filter((c: any) => c.visivel !== false)
              .filter((c: any) => (c.modoPreco === "fechado" ? c.fornecedores?.length > 0 : c.itens?.length > 0));

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
                  {categoriasVisiveis.map((cat: Categoria, idx: number) => {
                    const escolhido: any = getEscolhido(cat);
                    const subtotal = calcularSubtotal(cat);

                    const fornecedoresOrdenados = ordenarFornecedores(cat.fornecedores || []);
                    const globalMin =
                      fornecedoresOrdenados.length > 0
                        ? Math.min(...fornecedoresOrdenados.map((f: any) => precoMinFornecedor(f)))
                        : Infinity;

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
                                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: "600" }}>
                                    Valor Unit.
                                  </th>
                                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: "600" }}>
                                    Desconto
                                  </th>
                                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: "600" }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cat.itens!.map((item: any, iIdx: number) => {
                                  const totalItem =
                                    toNum(item.quantidade) * toNum(item.valorUnitario) - toNum(item.desconto);
                                  return (
                                    <tr key={iIdx} style={{ borderBottom: "1px solid #E5E5E5" }}>
                                      <td style={{ padding: "6px 8px" }}>{item.nome || "-"}</td>
                                      <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                        {toNum(item.quantidade) || 0}
                                      </td>
                                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                        {formatCurrency(toNum(item.valorUnitario) || 0)}
                                      </td>
                                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                        {formatCurrency(toNum(item.desconto) || 0)}
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
                        {cat.modoPreco === "fechado" && (cat.fornecedores?.length || 0) > 0 && (
                          <div className="space-y-3 mt-3">
                            {ordenarFornecedores(cat.fornecedores!).map((f: any, fIdx: number) => {
                              const isEscolhido = !!(escolhido && escolhido.id === f.id);
                              const isSelecionado = !!(escolhido?.selecionado && escolhido.id === f.id);
                              const precoMinDoFornecedor = precoMinFornecedor(f);
                              const isMaisBaratoGlobal = Math.abs(precoMinDoFornecedor - globalMin) < 0.005;

                              const valorBase = toNum(f.valor) - toNum(f.desconto);
                              const valorEscolhidoOpc =
                                isEscolhido && escolhido?.opcaoSelecionada
                                  ? toNum(escolhido.opcaoSelecionada.valor) - toNum(escolhido.opcaoSelecionada.desconto)
                                  : null;
                              const valorExibido = valorEscolhidoOpc ?? valorBase;

                              const destaque = isSelecionado || isMaisBaratoGlobal;
                              const cardBg = destaque ? "#F0FAF4" : "#FFFFFF";
                              const cardBorder = destaque ? "2px solid #48bb78" : "1px solid #E5E5E5";
                              const shadow = destaque
                                ? "0 2px 8px rgba(72, 187, 120, 0.15)"
                                : "0 1px 3px rgba(0,0,0,0.08)";

                              return (
                                <div
                                  key={fIdx}
                                  className="rounded-lg px-3 py-3"
                                  style={{ backgroundColor: cardBg, border: cardBorder, boxShadow: shadow }}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 pr-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        {isMaisBaratoGlobal && (
                                          <Star className="h-4 w-4 fill-green-600 text-green-600 flex-shrink-0" />
                                        )}
                                        {isSelecionado && (
                                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                        )}
                                        <p
                                          className={`font-bold ${destaque ? "text-sm" : "text-xs"}`}
                                          style={{ color: "#000000" }}
                                        >
                                          {f.nome}
                                        </p>
                                      </div>

                                      {f.diretor && (
                                        <p className="text-[10px] mt-1" style={{ color: "#666666" }}>
                                          <span className="font-semibold">Diretor:</span> {f.diretor}
                                        </p>
                                      )}

                                      {f.escopo && (
                                        <div className="text-[10px] mt-2 leading-relaxed" style={{ color: "#444444" }}>
                                          {(() => {
                                            const elencoMatch = String(f.escopo || "").match(/elenco:([^\.]+)/i);
                                            if (elencoMatch) {
                                              const elenco = elencoMatch[1].trim();
                                              const resto = String(f.escopo || "")
                                                .replace(/elenco:[^\.]+\.?/i, "")
                                                .trim();
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
                                        className={`font-bold ${destaque ? "text-base" : "text-sm"}`}
                                        style={{ color: destaque ? "#2F855A" : "#000000" }}
                                      >
                                        {formatCurrency(valorExibido)}
                                      </span>
                                      {toNum(f.desconto) > 0 && (
                                        <p className="text-[9px] mt-1" style={{ color: "#666666" }}>
                                          Desc: {formatCurrency(toNum(f.desconto))}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Opções do fornecedor */}
                                  {f.tem_opcoes && f.opcoes && f.opcoes.length > 0 && (
                                    <div style={{ marginTop: "8px", paddingLeft: "12px" }}>
                                      <p className="text-[10px] font-semibold mb-2" style={{ color: "#666666" }}>
                                        Opções disponíveis:
                                      </p>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {f.opcoes.map((opc: any, opcIdx: number) => {
                                          const valorOpcao = toNum(opc.valor) - toNum(opc.desconto);
                                          const isOpcSelecionada =
                                            isEscolhido &&
                                            !!escolhido?.opcaoSelecionada &&
                                            escolhido.opcaoSelecionada === opc;
                                          return (
                                            <div
                                              key={opcIdx}
                                              style={{
                                                padding: "6px 10px",
                                                backgroundColor: isOpcSelecionada ? "#F0FAF4" : "#F9F9F9",
                                                border: isOpcSelecionada ? "1px solid #48BB78" : "1px solid #E5E5E5",
                                                borderRadius: "6px",
                                                fontSize: "10px",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: "flex",
                                                  justifyContent: "space-between",
                                                  alignItems: "start",
                                                }}
                                              >
                                                <div style={{ flex: 1 }}>
                                                  <p
                                                    style={{
                                                      fontWeight: "600",
                                                      marginBottom: "2px",
                                                      color: "#000000",
                                                    }}
                                                  >
                                                    {opc.nome || `Opção ${opcIdx + 1}`}
                                                  </p>
                                                  {opc.escopo && (
                                                    <p
                                                      style={{
                                                        fontSize: "9px",
                                                        color: "#555555",
                                                        marginTop: "2px",
                                                      }}
                                                    >
                                                      {opc.escopo}
                                                    </p>
                                                  )}
                                                  {isOpcSelecionada && (
                                                    <span
                                                      style={{
                                                        display: "inline-block",
                                                        marginTop: "4px",
                                                        fontSize: "9px",
                                                        fontWeight: 700,
                                                        color: "#2F855A",
                                                        background: "#C6F6D5",
                                                        border: "1px solid #48BB78",
                                                        padding: "1px 6px",
                                                        borderRadius: "999px",
                                                      }}
                                                    >
                                                      ✓ OPÇÃO SELECIONADA
                                                    </span>
                                                  )}
                                                </div>
                                                <div style={{ textAlign: "right", marginLeft: "8px" }}>
                                                  <p style={{ fontWeight: "700", color: "#000000" }}>
                                                    {formatCurrency(valorOpcao)}
                                                  </p>
                                                  {toNum(opc.desconto) > 0 && (
                                                    <p style={{ fontSize: "8px", color: "#666666" }}>
                                                      Desc: {formatCurrency(toNum(opc.desconto))}
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

          {/* Resumo por campanha */}
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
