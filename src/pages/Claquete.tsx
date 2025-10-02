import { useState, useRef, useEffect } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Download, Save, Upload, FileImage, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SlateData = {
  tituloOriginal: string;
  duracao: string;
  produto: string;
  anunciante: string;
  agencia: string;
  direcao: string;
  tipo: string;
  segmento: string;
  crt: string;
  produtora: string;
  cnpj: string;
  anoProducao: string;
  dataRegistro: string;
  teclaSap: string;
  closedCaption: string;
  audio: string;
  logoUrl: string;
};

export default function Claquete() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showBars, setShowBars] = useState(true);
  const [slate, setSlate] = useState<SlateData>({
    tituloOriginal: "",
    duracao: "",
    produto: "",
    anunciante: "",
    agencia: "",
    direcao: "",
    tipo: "COMUM",
    segmento: "TODOS OS SEGMENTOS DE MERCADO",
    crt: "",
    produtora: "CINE CINEMATOGRÁFICA LTDA",
    cnpj: "00.445.787/0001-03",
    anoProducao: new Date().getFullYear().toString(),
    dataRegistro: new Date().toLocaleDateString("pt-BR"),
    teclaSap: "NÃO",
    closedCaption: "SIM, SE DISPONÍVEL",
    audio: "",
    logoUrl: "",
  });

  useEffect(() => {
    drawSlate();
  }, [slate, theme, showBars]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        downloadPDF();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const drawSlate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 1920;
    const h = 2700; // Aumentado para formato vertical
    canvas.width = w;
    canvas.height = h;

    // Background branco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Texto preto
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";

    let y = 80;
    const leftMargin = 80;
    const lineHeight = 85;

    // Logo/Header da produtora
    if (slate.produtora) {
      ctx.font = "bold 48px Arial";
      ctx.fillText(slate.produtora.toUpperCase(), leftMargin, y);
      y += lineHeight * 0.8;
      if (slate.logoUrl) {
        ctx.font = "32px Arial";
        ctx.fillText(slate.logoUrl, leftMargin, y);
      }
      y += lineHeight * 1.5;
    }

    // Linha separadora
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftMargin, y);
    ctx.lineTo(w - leftMargin, y);
    ctx.stroke();
    y += lineHeight;

    ctx.font = "40px Arial";

    // Campos na ordem exata
    const fields = [
      { label: "TÍTULO ORIGINAL:", value: slate.tituloOriginal },
      { label: "DURAÇÃO:", value: slate.duracao },
      { label: "PRODUTO:", value: slate.produto },
      { label: "ANUNCIANTE:", value: slate.anunciante },
      { label: "AGÊNCIA:", value: slate.agencia },
      { label: "DIREÇÃO:", value: slate.direcao },
      { label: "TIPO:", value: slate.tipo },
      { label: "SEGMENTO:", value: slate.segmento },
      { label: "CRT:", value: slate.crt },
      { label: "PRODUTORA:", value: slate.produtora },
      { label: "CNPJ:", value: slate.cnpj },
      { label: "ANO DE PRODUÇÃO:", value: slate.anoProducao },
      { label: "DATA DE REGISTRO:", value: slate.dataRegistro },
      { label: "TECLA SAP:", value: slate.teclaSap },
      { label: "CLOSED CAPTION:", value: slate.closedCaption },
      { label: "AUDIO:", value: slate.audio },
    ];

    fields.forEach((field) => {
      ctx.font = "bold 40px Arial";
      ctx.fillText(field.label, leftMargin, y);
      
      ctx.font = "40px Arial";
      const labelWidth = ctx.measureText(field.label).width;
      
      // Wrap text se necessário
      const maxWidth = w - leftMargin * 2 - labelWidth - 20;
      const valueText = field.value || "";
      
      if (ctx.measureText(valueText).width > maxWidth) {
        const lines = wrapText(ctx, valueText, maxWidth);
        lines.forEach((line, i) => {
          if (i === 0) {
            ctx.fillText(line, leftMargin + labelWidth + 20, y);
          } else {
            y += lineHeight * 0.9;
            ctx.fillText(line, leftMargin, y);
          }
        });
      } else {
        ctx.fillText(valueText, leftMargin + labelWidth + 20, y);
      }
      
      y += lineHeight;
    });

    // Logo inferior direito se houver
    if (slate.logoUrl && slate.logoUrl.startsWith("http")) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = slate.logoUrl;
      img.onload = () => {
        const logoSize = 150;
        ctx.drawImage(img, w - logoSize - leftMargin, h - logoSize - 80, logoSize, logoSize);
      };
    }
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `claquete-${slate.tituloOriginal || "slate"}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PNG baixado com sucesso!" });
    });
  };

  const downloadPDF = () => {
    // Simple PDF using canvas as image
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgData;
    link.download = `claquete-${slate.tituloOriginal || "slate"}.pdf`;
    link.click();
    toast({ title: "PDF gerado (imagem)!" });
  };

  const savePreset = () => {
    const presets = JSON.parse(localStorage.getItem("slate_presets_v1") || "[]");
    const name = prompt("Nome do preset:");
    if (!name) return;
    presets.push({ name, data: slate });
    localStorage.setItem("slate_presets_v1", JSON.stringify(presets));
    toast({ title: `Preset "${name}" salvo!` });
  };

  const loadPreset = () => {
    const presets = JSON.parse(localStorage.getItem("slate_presets_v1") || "[]");
    if (presets.length === 0) {
      toast({ title: "Nenhum preset salvo", variant: "destructive" });
      return;
    }
    const names = presets.map((p: any) => p.name).join("\n");
    const name = prompt(`Presets disponíveis:\n${names}\n\nDigite o nome:`);
    if (!name) return;
    const preset = presets.find((p: any) => p.name === name);
    if (preset) {
      setSlate(preset.data);
      toast({ title: `Preset "${name}" carregado!` });
    }
  };

  const updateField = (field: keyof SlateData, value: string) => {
    setSlate((s) => ({ ...s, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-white">
      <HeaderBar title="Gerador de Claquete" subtitle="Slate Generator" backTo="/" />

      <div className="container-page py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Configuração da Claquete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <Label>Título Original</Label>
                <Input value={slate.tituloOriginal} onChange={(e) => updateField("tituloOriginal", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duração</Label>
                  <Input value={slate.duracao} onChange={(e) => updateField("duracao", e.target.value)} placeholder='Ex: 30"' />
                </div>
                <div>
                  <Label>Produto</Label>
                  <Input value={slate.produto} onChange={(e) => updateField("produto", e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Anunciante</Label>
                <Input value={slate.anunciante} onChange={(e) => updateField("anunciante", e.target.value)} />
              </div>

              <div>
                <Label>Agência</Label>
                <Input value={slate.agencia} onChange={(e) => updateField("agencia", e.target.value)} />
              </div>

              <div>
                <Label>Direção</Label>
                <Input value={slate.direcao} onChange={(e) => updateField("direcao", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={slate.tipo} onValueChange={(v) => updateField("tipo", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMUM">COMUM</SelectItem>
                      <SelectItem value="ESPECIAL">ESPECIAL</SelectItem>
                      <SelectItem value="PROMOCIONAL">PROMOCIONAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Segmento</Label>
                  <Input value={slate.segmento} onChange={(e) => updateField("segmento", e.target.value)} />
                </div>
              </div>

              <div>
                <Label>CRT (Certificado de Registro de Título)</Label>
                <Input value={slate.crt} onChange={(e) => updateField("crt", e.target.value)} placeholder="Ex: 20250276240009" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produtora</Label>
                  <Input value={slate.produtora} onChange={(e) => updateField("produtora", e.target.value)} />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={slate.cnpj} onChange={(e) => updateField("cnpj", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ano de Produção</Label>
                  <Input value={slate.anoProducao} onChange={(e) => updateField("anoProducao", e.target.value)} />
                </div>
                <div>
                  <Label>Data de Registro</Label>
                  <Input value={slate.dataRegistro} onChange={(e) => updateField("dataRegistro", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tecla SAP</Label>
                  <Select value={slate.teclaSap} onValueChange={(v) => updateField("teclaSap", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="NÃO">NÃO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Closed Caption</Label>
                  <Select value={slate.closedCaption} onValueChange={(v) => updateField("closedCaption", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="NÃO">NÃO</SelectItem>
                      <SelectItem value="SIM, SE DISPONÍVEL">SIM, SE DISPONÍVEL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Áudio</Label>
                <Input value={slate.audio} onChange={(e) => updateField("audio", e.target.value)} placeholder="Ex: ANTFOOD" />
              </div>

              <div>
                <Label>Logo URL (opcional)</Label>
                <Input
                  value={slate.logoUrl}
                  onChange={(e) => updateField("logoUrl", e.target.value)}
                  placeholder="https://... ou www.site.com.br"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePreset} variant="outline" className="gap-2 flex-1">
                  <Save className="h-4 w-4" />
                  Salvar Preset
                </Button>
                <Button onClick={loadPreset} variant="outline" className="gap-2 flex-1">
                  <Upload className="h-4 w-4" />
                  Carregar Preset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-black">
                <canvas ref={canvasRef} className="w-full h-auto" />
              </div>

              <div className="flex gap-2">
                <Button onClick={downloadPNG} className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Baixar PNG
                </Button>
                <Button onClick={downloadPDF} variant="outline" className="flex-1 gap-2">
                  <FileText className="h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Atalho: ⌘+P para PDF
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
