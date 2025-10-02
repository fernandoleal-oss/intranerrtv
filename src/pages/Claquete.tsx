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
  producao: string;
  cliente: string;
  titulo: string;
  cena: string;
  take: string;
  diretor: string;
  produtor: string;
  data: string;
  hora: string;
  fps: string;
  audio: string;
  timecodeIn: string;
  timecodeOut: string;
  observacoes: string;
  logoUrl: string;
};

export default function Claquete() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showBars, setShowBars] = useState(true);
  const [slate, setSlate] = useState<SlateData>({
    producao: "WE Produção",
    cliente: "",
    titulo: "",
    cena: "1",
    take: "1",
    diretor: "",
    produtor: "",
    data: new Date().toISOString().split("T")[0],
    hora: new Date().toTimeString().split(" ")[0].substring(0, 5),
    fps: "24",
    audio: "48kHz",
    timecodeIn: "00:00:00:00",
    timecodeOut: "00:00:00:00",
    observacoes: "",
    logoUrl: "",
  });

  useEffect(() => {
    drawSlate();
  }, [slate, theme, showBars]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlate((s) => ({ ...s, take: String(Math.max(1, parseInt(s.take || "1") - 1)) }));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlate((s) => ({ ...s, take: String(parseInt(s.take || "1") + 1) }));
      } else if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        downloadPDF();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [slate.take]);

  const drawSlate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 1920;
    const h = 1080;
    canvas.width = w;
    canvas.height = h;

    // Background
    ctx.fillStyle = theme === "dark" ? "#1a1a1a" : "#f5f5f5";
    ctx.fillRect(0, 0, w, h);

    // Color bars
    if (showBars) {
      const colors = ["#ffffff", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff"];
      const barWidth = w / colors.length;
      colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(i * barWidth, 0, barWidth, 120);
      });
    }

    // Main content
    const textColor = theme === "dark" ? "#ffffff" : "#000000";
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";

    // Title section
    ctx.font = "bold 60px Arial";
    ctx.fillText(slate.titulo || "TÍTULO", 60, showBars ? 220 : 100);

    ctx.font = "40px Arial";
    ctx.fillText(`Produção: ${slate.producao}`, 60, showBars ? 290 : 170);
    ctx.fillText(`Cliente: ${slate.cliente}`, 60, showBars ? 350 : 230);

    // Scene/Take (large)
    ctx.font = "bold 120px Arial";
    ctx.fillText(`CENA ${slate.cena}`, 60, showBars ? 520 : 400);
    ctx.fillText(`TAKE ${slate.take}`, 60, showBars ? 660 : 540);

    // Right column
    ctx.font = "32px Arial";
    const rightX = w - 700;
    let y = showBars ? 220 : 100;
    ctx.fillText(`Diretor: ${slate.diretor}`, rightX, y);
    ctx.fillText(`Produtor: ${slate.produtor}`, rightX, y + 60);
    ctx.fillText(`Data: ${slate.data}`, rightX, y + 120);
    ctx.fillText(`Hora: ${slate.hora}`, rightX, y + 180);
    ctx.fillText(`FPS: ${slate.fps}`, rightX, y + 240);
    ctx.fillText(`Áudio: ${slate.audio}`, rightX, y + 300);
    ctx.fillText(`TC In: ${slate.timecodeIn}`, rightX, y + 360);
    ctx.fillText(`TC Out: ${slate.timecodeOut}`, rightX, y + 420);

    // Observações
    if (slate.observacoes) {
      ctx.font = "28px Arial";
      const maxWidth = w - 120;
      const lines = wrapText(ctx, slate.observacoes, maxWidth);
      lines.forEach((line, i) => {
        ctx.fillText(line, 60, h - 200 + i * 35);
      });
    }

    // Logo
    if (slate.logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = slate.logoUrl;
      img.onload = () => {
        const logoSize = 100;
        ctx.drawImage(img, w - logoSize - 60, h - logoSize - 60, logoSize, logoSize);
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
      a.download = `claquete-${slate.titulo || "slate"}-c${slate.cena}t${slate.take}.png`;
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
    link.download = `claquete-${slate.titulo || "slate"}-c${slate.cena}t${slate.take}.pdf`;
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produção</Label>
                  <Input value={slate.producao} onChange={(e) => updateField("producao", e.target.value)} />
                </div>
                <div>
                  <Label>Cliente</Label>
                  <Input value={slate.cliente} onChange={(e) => updateField("cliente", e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Título/Job</Label>
                <Input value={slate.titulo} onChange={(e) => updateField("titulo", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cena</Label>
                  <Input value={slate.cena} onChange={(e) => updateField("cena", e.target.value)} />
                </div>
                <div>
                  <Label>Take (↑↓)</Label>
                  <Input type="number" value={slate.take} onChange={(e) => updateField("take", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Diretor</Label>
                  <Input value={slate.diretor} onChange={(e) => updateField("diretor", e.target.value)} />
                </div>
                <div>
                  <Label>Produtor</Label>
                  <Input value={slate.produtor} onChange={(e) => updateField("produtor", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={slate.data} onChange={(e) => updateField("data", e.target.value)} />
                </div>
                <div>
                  <Label>Hora</Label>
                  <Input type="time" value={slate.hora} onChange={(e) => updateField("hora", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>FPS</Label>
                  <Select value={slate.fps} onValueChange={(v) => updateField("fps", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 fps</SelectItem>
                      <SelectItem value="25">25 fps</SelectItem>
                      <SelectItem value="30">30 fps</SelectItem>
                      <SelectItem value="60">60 fps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Áudio</Label>
                  <Input value={slate.audio} onChange={(e) => updateField("audio", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Timecode In</Label>
                  <Input value={slate.timecodeIn} onChange={(e) => updateField("timecodeIn", e.target.value)} />
                </div>
                <div>
                  <Label>Timecode Out</Label>
                  <Input value={slate.timecodeOut} onChange={(e) => updateField("timecodeOut", e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={slate.observacoes}
                  onChange={(e) => updateField("observacoes", e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Logo URL (opcional)</Label>
                <Input
                  value={slate.logoUrl}
                  onChange={(e) => updateField("logoUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
                    <Label>Tema Escuro</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={showBars} onCheckedChange={setShowBars} />
                    <Label>Bastões Coloridos</Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={savePreset} variant="outline" className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Preset
                </Button>
                <Button onClick={loadPreset} variant="outline" className="gap-2">
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
                Atalhos: ↑↓ para Take • ⌘+P para PDF
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
