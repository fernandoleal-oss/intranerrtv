import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Download, Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface LineItem {
  id: string;
  descricao: string;
  valor: number;
  observacao?: string;
}

export default function BydProntaEntrega() {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineItem[]>([
    { id: crypto.randomUUID(), descricao: "", valor: 0 }
  ]);
  const [observacao, setObservacao] = useState("");

  const addLine = () => {
    setLines([...lines, { id: crypto.randomUUID(), descricao: "", valor: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) {
      toast({ title: "É necessário ter pelo menos uma linha", variant: "destructive" });
      return;
    }
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof LineItem, value: any) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const total = lines.reduce((sum, line) => sum + (line.valor || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`BYD-Pronta-Entrega-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`);
      
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const handleExportImage = async () => {
    if (!printRef.current) return;
    
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: "#ffffff"
      });
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `BYD-Pronta-Entrega-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
      
      toast({ title: "Imagem gerada com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">BYD Pronta Entrega</h1>
                <p className="text-sm text-muted-foreground">Orçamento para atendimento</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportImage} variant="outline" className="gap-2">
                <Camera className="h-4 w-4" />
                Gerar Imagem
              </Button>
              <Button onClick={handleExportPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Gerar PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Editar Linhas</h2>
            
            <div className="space-y-4">
              {lines.map((line, idx) => (
                <div key={line.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Linha {idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Descrição</label>
                    <Input
                      value={line.descricao}
                      onChange={(e) => updateLine(line.id, "descricao", e.target.value)}
                      placeholder="Ex: Edição, letterings e animação de letreiros"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Valor</label>
                    <Input
                      type="number"
                      value={line.valor || ""}
                      onChange={(e) => updateLine(line.id, "valor", parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Observação (opcional)</label>
                    <Input
                      value={line.observacao || ""}
                      onChange={(e) => updateLine(line.id, "observacao", e.target.value)}
                      placeholder="Ex: vamos usar claquete da Cine para Footages"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <Button onClick={addLine} variant="outline" className="w-full mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Linha
            </Button>

            <div className="mt-6 pt-6 border-t">
              <label className="text-sm font-medium mb-1.5 block">Observação Geral</label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Adicione observações gerais aqui..."
                rows={4}
              />
            </div>
          </Card>

          {/* Preview */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Visualização</h2>
            <div ref={printRef} className="bg-white p-8 rounded-lg shadow-lg">
              {/* Header */}
              <div className="bg-[#4A90E2] text-white p-4 text-center mb-4">
                <h1 className="text-2xl font-bold">BYD PRONTA ENTREGA</h1>
              </div>

              {/* Lines Table */}
              <table className="w-full border-collapse mb-4">
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-b border-gray-800">
                      <td className="py-2 px-3 border border-gray-800 font-semibold">
                        {line.descricao || "(vazio)"}
                      </td>
                      <td className="py-2 px-3 border border-gray-800 text-right font-semibold whitespace-nowrap">
                        {formatCurrency(line.valor)}
                      </td>
                      {line.observacao && (
                        <td className="py-2 px-3 border border-gray-800 text-sm">
                          {line.observacao}
                        </td>
                      )}
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr className="border-b border-gray-800 bg-gray-100">
                    <td className="py-2 px-3 border border-gray-800 font-bold">
                      TOTAL GERAL
                    </td>
                    <td className="py-2 px-3 border border-gray-800 text-right font-bold whitespace-nowrap">
                      {formatCurrency(total)}
                    </td>
                    <td className="py-2 px-3 border border-gray-800"></td>
                  </tr>
                </tbody>
              </table>

              {/* Description Section */}
              {observacao && (
                <div className="mt-6">
                  <div className="bg-[#C5D9F1] p-3 border border-gray-800">
                    <h2 className="font-bold mb-2">DESCRIÇÃO:</h2>
                    <div className="whitespace-pre-wrap text-sm">
                      {observacao}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer with date */}
              <div className="mt-6">
                <p className="text-red-600 font-semibold text-sm">
                  Não previsto: nova montagem
                </p>
                <p className="text-red-600 font-semibold text-sm">
                  {new Date().toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
