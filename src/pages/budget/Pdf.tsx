import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Star, CheckCircle, FileText, Building2, Music, Film, Layers, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-spinner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logoWE from "@/assets/LOGO-WE-2.png";
import { addMiaguiToOrcamento } from "@/utils/addMiaguiToBudget";
import { FornecedorDisplayDialog } from "@/components/budget/FornecedorDisplayDialog";

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
  categorias?: Array<{
    nome: string;
    visivel?: boolean;
    modoPreco?: string;
    observacao?: string;
    fornecedores?: Array<{
      id?: string;
      nome?: string;
      valor?: number;
      desconto?: number;
      escopo?: string;
      diretor?: string;
      tratamento?: string;
      tem_opcoes?: boolean;
      opcoes?: FilmOption[];
    }>;
  }>;
}

// NOVA ESTRUTURA: Fornecedores → Opções → Fases → Itens
interface FornecedorItem {
  id: string;
  nome: string;
  valor: number;
  prazo: string;
  observacao: string;
  desconto?: number;
}

interface FornecedorFase {
  id: string;
  nome: string;
  itens: FornecedorItem[];
}

interface FornecedorOpcao {
  id: string;
  nome: string;
  fases: FornecedorFase[];
}

interface Fornecedor {
  id: string;
  nome: string;
  contato: string;
  cnpj?: string;
  opcoes: FornecedorOpcao[];
  desconto?: number;
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
  const [addingMiagui, setAddingMiagui] = useState(false);
  const [data, setData] = useState<BudgetData | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [fornecedorDisplayMode, setFornecedorDisplayMode] = useState<"somado" | "separado" | "nenhum">("separado");
  const [showDisplayDialog, setShowDisplayDialog] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const payload = data?.payload ?? {};
  const campanhas: CampaignQuotes[] = Array.isArray(payload.campanhas) ? payload.campanhas : [];
  
  // Detectar se é orçamento de imagem
  const isImageBudget = data?.type === 'imagem' && payload.assets && Array.isArray(payload.assets);

  // Detectar se é orçamento com estrutura de fornecedores → fases
  const isFornecedoresFases = payload.estrutura === 'fornecedores_fases' && payload.fornecedores && Array.isArray(payload.fornecedores);

  // Detectar se é orçamento livre (customizado) - nova estrutura com fornecedores
  const isLivreBudget = (payload.tipo === 'livre' || payload.type === 'livre') && payload.fornecedores && Array.isArray(payload.fornecedores);

  // Removidos cálculos de totais conforme solicitado

  /** ====== Carrega orçamento ====== */
  useEffect(() => {
    const fetchBudget = async () => {
      if (!id) return;
      
      setLoading(true);
      console.log("Fetching budget with ID:", id);

      try {
        // Força bypass do cache adicionando timestamp
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

        console.log("Query result:", row);
        console.log("Query error:", error);

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }
        if (!row) {
          console.error("No budget found for ID:", id);
          throw new Error("Orçamento não encontrado");
        }

        console.log("Setting data:", {
          id: row.budgets!.id,
          display_id: row.budgets!.display_id,
          type: row.budgets!.type,
          payload: row.payload
        });

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
        console.error("Error in fetchBudget:", err);
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
    
    // Recarrega dados quando a aba ganha foco
    const handleFocus = () => {
      fetchBudget();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [id, navigate]);

  /** ====== Adicionar MIAGUI ao orçamento ====== */
  const handleAddMiagui = async () => {
    setAddingMiagui(true);
    try {
      const result = await addMiaguiToOrcamento();
      
      if (result.success) {
        toast({
          title: "✅ Fornecedor MIAGUI adicionado!",
          description: `Versão ${result.newVersion?.versao} criada com ${result.fornecedoresCount} fornecedores. Total: R$ ${result.totalGeral?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        });
        // Recarregar a página após 1 segundo
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(result.error?.message || 'Erro desconhecido');
      }
    } catch (err: any) {
      toast({
        title: "Erro ao adicionar MIAGUI",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAddingMiagui(false);
    }
  };

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
        * { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        @media print {
          @page { size: A4 portrait; margin: 15mm 20mm; }
          .no-print { display: none !important; }
          .avoid-break { page-break-inside: avoid; break-inside: avoid; }
          .allow-break { page-break-inside: auto; break-inside: auto; }
          .page-break-before { page-break-before: auto; break-before: auto; }
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
        .print-content * {
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }
        .grid-opts {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .campaign-section {
          page-break-inside: auto;
          break-inside: auto;
        }
        .supplier-card {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 12px;
        }
        .fase-section {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 16px;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 0;
          border-bottom: 1px solid #F1F5F9;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .item-row:last-child {
          border-bottom: none;
        }
        .total-section {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-top: 20px;
          padding: 16px;
          background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
          border: 2px solid #F59E0B;
          border-radius: 8px;
        }
      `}</style>

      <FornecedorDisplayDialog
        open={showDisplayDialog}
        onOpenChange={setShowDisplayDialog}
        onConfirm={setFornecedorDisplayMode}
        currentMode={fornecedorDisplayMode}
      />

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
            {isFornecedoresFases && (
              <>
                <div className="flex gap-2 border rounded-lg p-1">
                  <Button 
                    variant={viewMode === 'list' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    Lista
                  </Button>
                  <Button 
                    variant={viewMode === 'cards' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setViewMode('cards')}
                  >
                    Cards
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDisplayDialog(true)}
                  className="gap-2"
                >
                  Exibição de Totais: {
                    fornecedorDisplayMode === 'somado' ? 'Somado' :
                    fornecedorDisplayMode === 'separado' ? 'Por Fornecedor' :
                    'Sem Totais'
                  }
                </Button>
              </>
            )}
            {id === '56213599-35e3-4192-896c-57e78148fc22' && (
              <Button 
                onClick={handleAddMiagui} 
                disabled={addingMiagui}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                {addingMiagui ? "Adicionando..." : "Adicionar MIAGUI"}
              </Button>
            )}
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
              {payload.tipo_servico && (
                <div>
                  <p style={{ marginBottom: "2px", fontSize: "10px", fontWeight: 600, color: "#64748B" }}>Tipo de Serviço</p>
                  <p style={{ fontWeight: "bold", color: "#000" }}>{payload.tipo_servico}</p>
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
              {payload.estrutura && (
                <div>
                  <p style={{ marginBottom: "2px", fontSize: "10px", fontWeight: 600, color: "#64748B" }}>Estrutura</p>
                  <p style={{ fontWeight: "bold", color: "#000" }}>
                    {payload.estrutura === 'fornecedores_fases' ? 'Fornecedores → Fases' : 'Categorias'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ESTRUTURA DE FORNECEDORES → FASES */}
          {isFornecedoresFases && (
            <div className="allow-break mb-8">
              {/* Cabeçalho Fornecedores */}
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
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-600" />
                  <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E293B" }}>
                    Fornecedores e Fases
                  </h2>
                </div>
              </div>

              {/* MODO LISTA */}
              {viewMode === 'list' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {(payload.fornecedores || []).map((fornecedor: Fornecedor, fornecedorIndex: number) => {
                    // Calcular total de cada opção
                    const calcularTotalOpcao = (opcao: FornecedorOpcao) => {
                      return opcao.fases.reduce((total, fase) => {
                        return total + fase.itens.reduce((sum, item) => sum + (item.valor - (item.desconto || 0)), 0);
                      }, 0);
                    };

                    return (
                      <div
                        key={fornecedor.id || fornecedorIndex}
                        className="campaign-section page-break-before"
                      >
                        {/* Cabeçalho do Fornecedor */}
                        <div
                          style={{
                            background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
                            borderLeft: "4px solid #0369A1",
                            padding: "16px 20px",
                            marginBottom: "16px",
                            borderRadius: "0 8px 8px 0",
                            border: "1px solid #BAE6FD",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-sky-600" />
                            <div>
                              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#0C4A6E" }}>
                                {fornecedor.nome || `Fornecedor ${fornecedorIndex + 1}`}
                              </h3>
                              {fornecedor.contato && (
                                <p style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                                  Contato: {fornecedor.contato}
                                </p>
                              )}
                              {fornecedor.cnpj && (
                                <p style={{ fontSize: "12px", color: "#475569" }}>
                                  CNPJ: {fornecedor.cnpj}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tabela Comparativa de Opções */}
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                                <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#475569", width: "25%" }}>
                                  Fase / Item
                                </th>
                                {fornecedor.opcoes.map((opcao) => (
                                  <th
                                    key={opcao.id}
                                    style={{
                                      padding: "12px",
                                      textAlign: "center",
                                      fontWeight: "bold",
                                      color: "#0369A1",
                                      borderLeft: "1px solid #E2E8F0"
                                    }}
                                  >
                                    {opcao.nome}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {/* Agrupar fases de todas as opções */}
                              {fornecedor.opcoes[0]?.fases.map((_, faseIndex) => {
                                const fasePrimeiraOpcao = fornecedor.opcoes[0].fases[faseIndex];
                                
                                return (
                                  <React.Fragment key={faseIndex}>
                                    {/* Linha com nome da fase */}
                                    <tr style={{ backgroundColor: "#F1F5F9", borderTop: "2px solid #CBD5E1" }}>
                                      <td
                                        colSpan={fornecedor.opcoes.length + 1}
                                        style={{
                                          padding: "10px 12px",
                                          fontWeight: "bold",
                                          color: "#1E293B",
                                          fontSize: "13px"
                                        }}
                                      >
                                        <Layers className="h-4 w-4 inline mr-2 text-green-600" />
                                        {fasePrimeiraOpcao.nome}
                                      </td>
                                    </tr>
                                    {/* Linhas com itens */}
                                    {fasePrimeiraOpcao.itens.map((_, itemIndex) => (
                                      <tr
                                        key={itemIndex}
                                        style={{
                                          borderBottom: "1px solid #E2E8F0",
                                          backgroundColor: itemIndex % 2 === 0 ? "#FFFFFF" : "#F9FAFB"
                                        }}
                                      >
                                        <td style={{ padding: "10px 12px" }}>
                                          <div>
                                            <p style={{ fontWeight: "600", color: "#1E293B", marginBottom: "2px" }}>
                                              {fornecedor.opcoes[0].fases[faseIndex].itens[itemIndex].nome}
                                            </p>
                                            {fornecedor.opcoes[0].fases[faseIndex].itens[itemIndex].prazo && (
                                              <p style={{ fontSize: "10px", color: "#64748B" }}>
                                                Prazo: {fornecedor.opcoes[0].fases[faseIndex].itens[itemIndex].prazo}
                                              </p>
                                            )}
                                            {fornecedor.opcoes[0].fases[faseIndex].itens[itemIndex].observacao && (
                                              <p style={{ fontSize: "10px", color: "#64748B", fontStyle: "italic" }}>
                                                {fornecedor.opcoes[0].fases[faseIndex].itens[itemIndex].observacao}
                                              </p>
                                            )}
                                          </div>
                                        </td>
                                        {fornecedor.opcoes.map((opcao) => {
                                          const item = opcao.fases[faseIndex]?.itens[itemIndex];
                                          const valorFinal = item ? item.valor - (item.desconto || 0) : 0;
                                          
                                          return (
                                            <td
                                              key={opcao.id}
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "center",
                                                borderLeft: "1px solid #E2E8F0"
                                              }}
                                            >
                                              <div>
                                                <p style={{ fontWeight: "bold", color: "#0369A1" }}>
                                                  {item ? money(valorFinal) : "-"}
                                                </p>
                                                {item && item.desconto > 0 && (
                                                  <p style={{ fontSize: "10px", color: "#DC2626" }}>
                                                    Desc: {money(item.desconto)}
                                                  </p>
                                                )}
                                              </div>
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                              {/* Linha de total por opção */}
                              <tr style={{ backgroundColor: "#EFF6FF", borderTop: "2px solid #0369A1", fontWeight: "bold" }}>
                                <td style={{ padding: "14px 12px", fontSize: "14px", color: "#1E293B" }}>
                                  TOTAL POR OPÇÃO
                                </td>
                                {fornecedor.opcoes.map((opcao) => (
                                  <td
                                    key={opcao.id}
                                    style={{
                                      padding: "14px 12px",
                                      textAlign: "center",
                                      fontSize: "15px",
                                      color: "#0369A1",
                                      borderLeft: "1px solid #BAE6FD"
                                    }}
                                  >
                                    {money(calcularTotalOpcao(opcao))}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total Geral Somado (modo somado) */}
              {fornecedorDisplayMode === 'somado' && (
                <div className="total-section">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#92400E" }}>
                      Total Geral
                    </span>
                    <span style={{ fontSize: "20px", fontWeight: "bold", color: "#92400E" }}>
                      {money(
                        (payload.fornecedores || []).reduce(
                          (total: number, fornecedor: Fornecedor) =>
                            total + fornecedor.opcoes.reduce((opcTotal: number, opcao: FornecedorOpcao) =>
                              opcTotal + opcao.fases.reduce(
                                (faseTotal: number, fase: FornecedorFase) =>
                                  faseTotal + fase.itens.reduce((sum: number, item: FornecedorItem) => sum + (item.valor - (item.desconto || 0)), 0),
                                0
                              ), 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* MODO CARDS - Fornecedores lado a lado */}
              {viewMode === 'cards' && (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(2, 1fr)", 
                  gap: "20px",
                  marginBottom: "24px"
                }}>
                  {/* Modo cards não suporta múltiplas opções, mostrar aviso */}
                  <div style={{ gridColumn: "1 / -1", padding: "16px", backgroundColor: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: "8px" }}>
                    <p style={{ fontSize: "12px", color: "#92400E" }}>
                      ℹ️ Modo de visualização em cards não suporta múltiplas opções. Use o modo lista para ver a tabela comparativa.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orçamento de Imagem */}
          {isImageBudget && (
            <div className="allow-break mb-8">
              {/* Cabeçalho Assets */}
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
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E293B" }}>
                    Assets de Imagem
                  </h2>
                </div>
                {payload.banco && (
                  <p style={{ fontSize: "12px", color: "#64748B", marginTop: "8px" }}>
                    Banco: {payload.banco === 'shutterstock' ? 'Shutterstock' : payload.banco === 'getty' ? 'Getty Images' : 'Personalizado'}
                  </p>
                )}
                {payload.midias && (
                  <p style={{ fontSize: "12px", color: "#64748B" }}>
                    Mídias: {payload.midias}
                  </p>
                )}
              </div>

              {/* Lista de Assets */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {payload.assets.map((asset: any, idx: number) => {
                  const price = asset.price || 0;
                  
                  return (
                    <div
                      key={idx}
                      className="avoid-break rounded-lg p-4"
                      style={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 style={{ fontWeight: 700, fontSize: "14px", color: "#1E293B" }}>
                              {asset.type === 'video' ? '🎥' : '📷'} {asset.title || `Asset ${idx + 1}`}
                            </h4>
                          </div>
                          
                          {asset.id && (
                            <p style={{ fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>
                              ID: {asset.id}
                            </p>
                          )}
                          
                          {asset.customDescription && (
                            <p style={{ fontSize: "12px", color: "#475569", marginBottom: "6px" }}>
                              {asset.customDescription}
                            </p>
                          )}
                          
                          {asset.chosenLicense && (
                            <div style={{ 
                              display: "inline-block",
                              fontSize: "11px", 
                              padding: "3px 8px",
                              borderRadius: "4px",
                              backgroundColor: "#F1F5F9",
                              color: "#475569",
                              marginTop: "6px"
                            }}>
                              {asset.chosenLicense}
                            </div>
                          )}
                          
                          {asset.pageUrl && (
                            <div style={{ marginTop: "8px" }}>
                              <a 
                                href={asset.pageUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ fontSize: "11px", color: "#3B82F6", textDecoration: "underline" }}
                              >
                                Ver no banco de imagens
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "2px" }}>Valor</p>
                          <span style={{ fontSize: "16px", fontWeight: "bold", color: "#1E293B" }}>
                            {money(price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Orçamento Livre (Customizado) */}
          {isLivreBudget && (
            <div className="allow-break mb-8">
              {/* Cabeçalho */}
              <div
                style={{
                  background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
                  borderLeft: "4px solid #0369A1",
                  padding: "16px 20px",
                  marginBottom: "16px",
                  borderRadius: "0 8px 8px 0",
                  border: "1px solid #BAE6FD",
                }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-sky-600" />
                  <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0C4A6E" }}>
                    Orçamento Livre
                  </h2>
                </div>
                {payload.cliente && (
                  <p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                    Cliente: {payload.cliente}
                  </p>
                )}
                {payload.projeto && (
                  <p style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                    Projeto: {payload.projeto}
                  </p>
                )}
              </div>

              {/* Fornecedores */}
              {payload.fornecedores.map((fornecedor: Fornecedor, fornIdx: number) => (
                <div
                  key={fornecedor.id}
                  className="supplier-card"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    overflow: "hidden",
                    marginBottom: "16px",
                  }}
                >
                  {/* Header do Fornecedor */}
                  <div
                    style={{
                      padding: "16px 20px",
                      backgroundColor: "#F8FAFC",
                      borderBottom: "2px solid #E2E8F0",
                    }}
                  >
                    <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1E293B", marginBottom: "4px" }}>
                      {fornecedor.nome}
                    </h3>
                    {fornecedor.contato && (
                      <p style={{ fontSize: "11px", color: "#64748B" }}>
                        Contato: {fornecedor.contato}
                      </p>
                    )}
                    {fornecedor.cnpj && (
                      <p style={{ fontSize: "11px", color: "#64748B" }}>
                        CNPJ: {fornecedor.cnpj}
                      </p>
                    )}
                  </div>

                  {/* Opções do Fornecedor */}
                  {fornecedor.opcoes.map((opcao: FornecedorOpcao) => (
                    <div key={opcao.id} style={{ padding: "16px 20px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "bold", color: "#0369A1", marginBottom: "12px" }}>
                        {opcao.nome}
                      </h4>

                      {/* Fases da Opção */}
                      {opcao.fases.map((fase: FornecedorFase) => (
                        <div key={fase.id} className="fase-section">
                          <p style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                            {fase.nome}
                          </p>

                          {/* Itens da Fase */}
                          <div style={{ marginLeft: "12px" }}>
                            {fase.itens.map((item: FornecedorItem) => {
                              const valorFinal = item.valor * (1 - (item.desconto || 0) / 100);
                              return (
                                <div
                                  key={item.id}
                                  className="item-row"
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    padding: "8px 0",
                                    borderBottom: "1px solid #F1F5F9",
                                  }}
                                >
                                  <div style={{ flex: 1, paddingRight: "16px" }}>
                                    <p style={{ fontSize: "12px", color: "#1E293B", fontWeight: "500" }}>
                                      {item.nome}
                                    </p>
                                    {item.observacao && (
                                      <p style={{ fontSize: "10px", color: "#64748B", marginTop: "2px" }}>
                                        {item.observacao}
                                      </p>
                                    )}
                                    {item.prazo && (
                                      <p style={{ fontSize: "10px", color: "#64748B", marginTop: "2px" }}>
                                        Prazo: {item.prazo}
                                      </p>
                                    )}
                                  </div>
                                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <p style={{ fontSize: "12px", fontWeight: "bold", color: "#1E293B" }}>
                                      {money(valorFinal)}
                                    </p>
                                    {item.desconto && item.desconto > 0 && (
                                      <p style={{ fontSize: "10px", color: "#64748B" }}>
                                        ({item.desconto}% desc)
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      ))}
                    </div>
                  ))}

                </div>
              ))}
            </div>
          )}

          {/* Campanhas (estrutura antiga) */}
          {!isImageBudget && !isFornecedoresFases && campanhas.map((camp, campIdx) => {
            // ... (código existente das campanhas antigas)
            const hasOldStructure = camp.quotes_film || camp.quotes_audio;
            const hasNewStructure = camp.categorias && camp.categorias.length > 0;
            
            if (!hasOldStructure && !hasNewStructure) return null;
            
            let filmSel: QuoteFilm | null = null;
            let audioSel: QuoteAudio | null = null;
            let films: QuoteFilm[] = [];
            let audios: QuoteAudio[] = [];
            let globalMinFilm = Infinity;
            
            if (hasOldStructure) {
              filmSel = pickFilm(camp.quotes_film || []);
              audioSel = camp.inclui_audio ? pickAudio(camp.quotes_audio || []) : null;
              films = camp.quotes_film || [];
              audios = camp.quotes_audio || [];
              globalMinFilm = films.length > 0 ? Math.min(...films.map((f) => lowestQuoteValue(f))) : Infinity;
            }

            return (
              <div key={camp.id || campIdx} className="campaign-section page-break-before mb-8">
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
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E293B" }}>
                      {camp.nome || `Campanha ${campIdx + 1}`}
                    </h2>
                  </div>
                </div>

                {/* PRODUTORAS DE FILME */}
                {films.length > 0 && (
                  <div className="allow-break" style={{ marginBottom: "20px" }}>
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
                            className="supplier-card rounded-lg p-4"
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
                              <div className="avoid-break" style={{ marginTop: 12 }}>
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
                  <div className="allow-break">
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
                            className="supplier-card rounded-lg p-4"
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
                
                {/* NOVA ESTRUTURA: Categorias com Fornecedores */}
                {hasNewStructure && (camp.categorias || []).map((cat: any, catIdx: number) => {
                  if (cat.visivel === false) return null;
                  if (cat.modoPreco !== "fechado" || !cat.fornecedores || cat.fornecedores.length === 0) return null;
                  
                  const fornecedores = cat.fornecedores;
                  const maisBarato = fornecedores.reduce((min: any, f: any) => {
                    const valor = (f.valor || 0) - (f.desconto || 0);
                    const minValor = (min.valor || 0) - (min.desconto || 0);
                    return valor < minValor ? f : min;
                  });
                  const globalMinFornecedor = Math.min(...fornecedores.map((f: any) => (f.valor || 0) - (f.desconto || 0)));
                  
                  return (
                    <div key={catIdx} className="allow-break" style={{ marginBottom: "20px" }}>
                      <div className="flex items-center gap-2 mb-3">
                        {cat.nome?.toLowerCase().includes('filme') && <Film className="h-4 w-4 text-blue-600" />}
                        {cat.nome?.toLowerCase().includes('audio') || cat.nome?.toLowerCase().includes('áudio') && <Music className="h-4 w-4 text-purple-600" />}
                        <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#1E293B" }}>
                          {cat.nome || `Categoria ${catIdx + 1}`}
                        </h3>
                      </div>
                      
                      {cat.observacao && (
                        <div style={{ 
                          marginBottom: "12px", 
                          padding: "12px",
                          backgroundColor: "#FFFBEB",
                          border: "1px solid #FCD34D",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "#78350F",
                          whiteSpace: "pre-wrap"
                        }}>
                          {cat.observacao}
                        </div>
                      )}
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {fornecedores.map((f: any, fIdx: number) => {
                          const valorFinal = (f.valor || 0) - (f.desconto || 0);
                          const isMaisBarato = Math.abs(valorFinal - globalMinFornecedor) < 0.005;
                          const destaque = isMaisBarato;
                          const cardBg = destaque ? "#F0FDF4" : "#FFFFFF";
                          const cardBorder = destaque ? "2px solid #16A34A" : "1px solid #E2E8F0";
                          const shadow = destaque ? "0 4px 12px rgba(22, 163, 74, 0.15)" : "0 2px 4px rgba(0,0,0,0.05)";
                          
                          return (
                            <div
                              key={f.id || fIdx}
                              className="supplier-card rounded-lg p-4"
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
                                    {isMaisBarato && (
                                      <Star className="h-4 w-4 fill-green-600 text-green-600 flex-shrink-0" />
                                    )}
                                    <p
                                      className={`font-bold ${destaque ? "text-base" : "text-sm"}`}
                                      style={{ color: "#1E293B" }}
                                    >
                                      {f.nome || `Fornecedor ${fIdx + 1}`}
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
                                        MELHOR PREÇO
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
                                        whiteSpace: "pre-wrap"
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
                                    {money(valorFinal)}
                                  </span>
                                  {toNum(f.desconto) > 0 && (
                                    <p className="text-[10px] mt-1" style={{ color: "#64748B" }}>
                                      Desconto: {money(toNum(f.desconto))}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Opções (se houver) */}
                              {f.tem_opcoes && f.opcoes && f.opcoes.length > 0 && (
                                <div className="avoid-break" style={{ marginTop: 12 }}>
                                  <p className="text-[11px] font-semibold mb-3" style={{ color: "#475569" }}>
                                    Opções disponíveis:
                                  </p>
                                  <div className="grid-opts">
                                    {f.opcoes.map((opc: any, oIdx: number) => {
                                      const valorOpc = toNum(opc.valor) - toNum(opc.desconto);
                                      const isOpcMaisBarata = Math.abs(valorOpc - valorFinal) < 0.005;
                                      
                                      return (
                                        <div
                                          key={opc.id || oIdx}
                                          style={{
                                            padding: "10px 12px",
                                            backgroundColor: isOpcMaisBarata ? "#F0FDF4" : "#F8FAFC",
                                            border: isOpcMaisBarata ? "2px solid #16A34A" : "1px solid #E2E8F0",
                                            borderRadius: 8,
                                            fontSize: 11,
                                            position: "relative",
                                          }}
                                        >
                                          {isOpcMaisBarata && (
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
                                            </div>
                                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                              <span style={{ fontWeight: 700, color: "#1E293B" }}>
                                                {money(valorOpc)}
                                              </span>
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
                  );
                })}
              </div>
            );
          })}


          {/* Observações (sem totais conforme solicitado) */}
          {payload.observacoes && (
            <div
              className="avoid-break mt-8 p-6 rounded-xl border"
              style={{
                background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
                border: "2px solid #E2E8F0",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px", color: "#1E293B" }}>
                Observações
              </h2>
              {Array.isArray(payload.observacoes) ? (
                <ul style={{ fontSize: "12px", color: "#475569", paddingLeft: "20px" }}>
                  {payload.observacoes.map((obs: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: "8px" }}>
                      {obs}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: "12px", color: "#475569", whiteSpace: "pre-wrap" }}>
                  {payload.observacoes}
                </p>
              )}
            </div>
          )}

          {payload.pendente_faturamento && (
            <div
              className="avoid-break mt-4"
              style={{
                padding: "12px",
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
      </div>
    </AppLayout>
  );
}