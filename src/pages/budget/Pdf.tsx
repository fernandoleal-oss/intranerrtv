import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
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
  const categorias = payload.categorias || [];

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
          className="bg-white p-6 rounded-2xl shadow-sm max-w-[210mm] mx-auto text-black"
          style={{ minHeight: "297mm" }}
        >
          <div className="border-b-2 border-[#FF6A00] pb-3 mb-4">
            <h1 className="text-2xl font-bold text-[#FF6A00] mb-1">ORÇAMENTO</h1>
            <p className="text-base text-gray-600">{data.display_id}</p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Cliente</p>
              <p className="font-semibold">{payload.cliente || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Produto</p>
              <p className="font-semibold">{payload.produto || "-"}</p>
            </div>
            {payload.job && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-0.5">Job</p>
                <p className="font-semibold text-sm">{payload.job}</p>
              </div>
            )}
          </div>

          <div className="space-y-3 mb-4">
            {categorias
              .filter((c: any) => c.visivel !== false)
              .map((cat: any, idx: number) => {
                const subtotal =
                  cat.modoPreco === "fechado"
                    ? cat.fornecedores?.reduce((min: number, f: any) => {
                        const valor = (f.valor || 0) - (f.desconto || 0);
                        return Math.min(min, valor);
                      }, Infinity) || 0
                    : cat.itens?.reduce(
                        (sum: number, item: any) =>
                          sum + (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0),
                        0
                      ) || 0;

                return (
                  <div key={idx} className="border-l-4 border-[#FF6A00] pl-3 py-1.5">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm">{cat.nome}</h3>
                      <span className="font-bold text-sm">{formatCurrency(subtotal)}</span>
                    </div>

                    {cat.observacao && (
                      <p className="text-xs text-gray-600 mb-1 italic">{cat.observacao}</p>
                    )}

                    {cat.modoPreco === "fechado" && cat.fornecedores?.length > 0 && (
                      <div className="space-y-0.5 text-xs">
                        {cat.fornecedores.map((f: any, fIdx: number) => (
                          <div key={fIdx} className="flex justify-between text-gray-700">
                            <span>• {f.nome}</span>
                            <span>{formatCurrency((f.valor || 0) - (f.desconto || 0))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="border-t-2 border-[#FF6A00] pt-3 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">TOTAL GERAL:</span>
              <span className="text-2xl font-bold text-[#FF6A00]">
                {formatCurrency(
                  categorias
                    .filter((c: any) => c.visivel !== false)
                    .reduce((sum: number, cat: any) => {
                      const subtotal =
                        cat.modoPreco === "fechado"
                          ? cat.fornecedores?.reduce((min: number, f: any) => {
                              const valor = (f.valor || 0) - (f.desconto || 0);
                              return Math.min(min, valor);
                            }, Infinity) || 0
                          : cat.itens?.reduce(
                              (sum: number, item: any) =>
                                sum + (item.quantidade || 0) * (item.valorUnitario || 0) - (item.desconto || 0),
                              0
                            ) || 0;
                      return sum + subtotal;
                    }, 0)
                )}
              </span>
            </div>
          </div>

          {payload.observacoes && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs font-semibold mb-1">Observações:</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{payload.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
