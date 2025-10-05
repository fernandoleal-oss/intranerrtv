import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Download, Camera, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface LineItem {
  id: string;
  descricao: string;
  valor: number;
  observacao?: string;
}

interface Table {
  id: string;
  lines: LineItem[];
}

export default function BydProntaEntrega() {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [titulo, setTitulo] = useState("Tabela de Orçamento BYD");
  const [observacao, setObservacao] = useState("");
  const [notaRodape, setNotaRodape] = useState("");
  const [tables, setTables] = useState<Table[]>([
    {
      id: crypto.randomUUID(),
      lines: [{ id: crypto.randomUUID(), descricao: "", valor: 0 }]
    }
  ]);

  const addTable = () => {
    setTables([...tables, {
      id: crypto.randomUUID(),
      lines: [{ id: crypto.randomUUID(), descricao: "", valor: 0 }]
    }]);
  };

  const removeTable = (tableId: string) => {
    if (tables.length === 1) {
      toast({ title: "É necessário ter pelo menos uma tabela", variant: "destructive" });
      return;
    }
    setTables(tables.filter(t => t.id !== tableId));
  };

  const addLine = (tableId: string) => {
    setTables(tables.map(t => 
      t.id === tableId 
        ? { ...t, lines: [...t.lines, { id: crypto.randomUUID(), descricao: "", valor: 0 }] }
        : t
    ));
  };

  const removeLine = (tableId: string, lineId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (table && table.lines.length === 1) {
      toast({ title: "É necessário ter pelo menos uma linha por tabela", variant: "destructive" });
      return;
    }
    setTables(tables.map(t => 
      t.id === tableId 
        ? { ...t, lines: t.lines.filter(l => l.id !== lineId) }
        : t
    ));
  };

  const updateLine = (tableId: string, lineId: string, field: keyof LineItem, value: any) => {
    setTables(tables.map(t => 
      t.id === tableId 
        ? {
            ...t,
            lines: t.lines.map(l => 
              l.id === lineId ? { ...l, [field]: value } : l
            )
          }
        : t
    ));
  };

  const totalGeral = tables.reduce((sum, table) => 
    sum + table.lines.reduce((lineSum, line) => lineSum + (line.valor || 0), 0), 0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const handleSave = () => {
    toast({ title: "Salvo com sucesso!" });
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
      pdf.save(`${titulo}-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`);
      
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
        a.download = `${titulo}-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.png`;
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
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Tabela de Orçamento BYD</h1>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} variant="outline" className="gap-2">
                <Save className="h-4 w-4" />
                Salvar
              </Button>
              <Button onClick={handleExportImage} variant="outline" className="gap-2">
                <Camera className="h-4 w-4" />
                Gerar Imagem
              </Button>
              <Button onClick={handleExportPDF} className="gap-2 bg-primary">
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
          <Card className="p-6 h-fit sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Configurações</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Título do Documento</label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título do documento"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Observação (banner superior)</label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Se preenchida, aparecerá como banner acima das tabelas"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Nota/Previsão (rodapé)</label>
                <Input
                  value={notaRodape}
                  onChange={(e) => setNotaRodape(e.target.value)}
                  placeholder="Ex: Não previsto: nova montagem"
                />
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Tabelas ({tables.length})</h3>
                  <Button onClick={addTable} size="sm" variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Tabela
                  </Button>
                </div>

                <div className="space-y-4">
                  {tables.map((table, tableIdx) => (
                    <div key={table.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Tabela {tableIdx + 1}</span>
                        {tables.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTable(table.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {table.lines.map((line, lineIdx) => (
                          <div key={line.id} className="text-xs bg-muted/30 p-2 rounded flex items-center justify-between">
                            <span className="flex-1 truncate">
                              {line.descricao || `Linha ${lineIdx + 1}`} - {formatCurrency(line.valor)}
                            </span>
                            {table.lines.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeLine(table.id, line.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      <Button 
                        onClick={() => addLine(table.id)} 
                        size="sm" 
                        variant="outline" 
                        className="w-full gap-2"
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar Linha
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Visualização</h2>
            <div ref={printRef} className="bg-white p-8 rounded-lg shadow-lg">
              {/* Título Editável */}
              <div className="bg-[#4A90E2] text-white p-4 text-center mb-6">
                <h1 className="text-2xl font-bold uppercase">{titulo}</h1>
              </div>

              {/* Banner de Observação */}
              {observacao && (
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                  <p className="font-semibold mb-1">Observação:</p>
                  <p className="text-sm whitespace-pre-wrap">{observacao}</p>
                </div>
              )}

              {/* Múltiplas Tabelas */}
              {tables.map((table, tableIdx) => {
                const subtotal = table.lines.reduce((sum, line) => sum + (line.valor || 0), 0);
                
                return (
                  <div key={table.id} className={tableIdx > 0 ? "mt-8" : ""}>
                    {tables.length > 1 && (
                      <h3 className="font-bold mb-2">Tabela {tableIdx + 1}</h3>
                    )}
                    
                    <table className="w-full border-collapse mb-4">
                      <tbody>
                        {table.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="py-2 px-3 border border-gray-800 font-semibold align-top">
                              <Input
                                value={line.descricao}
                                onChange={(e) => updateLine(table.id, line.id, "descricao", e.target.value)}
                                placeholder="Descrição"
                                className="border-0 p-0 h-auto font-semibold bg-transparent"
                              />
                            </td>
                            <td className="py-2 px-3 border border-gray-800 text-right font-semibold whitespace-nowrap w-32 align-top">
                              <Input
                                type="number"
                                value={line.valor || ""}
                                onChange={(e) => updateLine(table.id, line.id, "valor", parseFloat(e.target.value) || 0)}
                                className="border-0 p-0 h-auto text-right font-semibold bg-transparent"
                                step="0.01"
                              />
                            </td>
                            <td className="py-2 px-3 border border-gray-800 text-sm align-top">
                              <Input
                                value={line.observacao || ""}
                                onChange={(e) => updateLine(table.id, line.id, "observacao", e.target.value)}
                                placeholder="Observação"
                                className="border-0 p-0 h-auto text-sm bg-transparent"
                              />
                            </td>
                          </tr>
                        ))}
                        
                        {/* Subtotal (se múltiplas tabelas) */}
                        {tables.length > 1 && (
                          <tr className="bg-gray-100">
                            <td className="py-2 px-3 border border-gray-800 font-bold">
                              Subtotal
                            </td>
                            <td className="py-2 px-3 border border-gray-800 text-right font-bold whitespace-nowrap">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="py-2 px-3 border border-gray-800"></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {/* Total Geral */}
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="bg-[#4A90E2]/10">
                    <td className="py-3 px-3 border-2 border-gray-800 font-bold text-lg">
                      TOTAL GERAL
                    </td>
                    <td className="py-3 px-3 border-2 border-gray-800 text-right font-bold text-lg whitespace-nowrap">
                      {formatCurrency(totalGeral)}
                    </td>
                    <td className="py-3 px-3 border-2 border-gray-800"></td>
                  </tr>
                </tbody>
              </table>

              {/* Nota/Previsão Rodapé */}
              {notaRodape && (
                <div className="mt-6 text-sm text-muted-foreground">
                  <p>{notaRodape}</p>
                  <p>{new Date().toLocaleDateString("pt-BR")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
