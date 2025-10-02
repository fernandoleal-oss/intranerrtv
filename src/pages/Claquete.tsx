import { useEffect, useRef, useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileImage, FileText, Save, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SlateData = {
  tituloOriginal: string;
  duracao: string;            // ex: 30"
  produto: string;
  direcao: string;
  tipo: string;               // COMUM | ESPECIAL | PROMOCIONAL
  segmento: string;           // Segmentação de mercado
  crt: string;
  produtora: string;
  cnpj: string;
  anoProducao: string;
  dataRegistro: string;
  teclaSap: string;           // SIM | NÃO
  closedCaption: string;      // SIM | NÃO | SIM, SE DISPONÍVEL
  audio: string;              // produtora de áudio
  logoUrl: string;            // opcional (url)
};

const FIXO_ANUNCIANTE = "IGC ASSOCIADOS - CONSULTORIA EM FINANÇAS LTDA";
const FIXO_AGENCIA    = "WF/MOTTA COMUNICAÇÃO MARKETING E PUBLICIDADE LTDA.";

export default function Claquete() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showSmpte, setShowSmpte]     = useState(true);
  const [showTopTicks, setShowTicks]  = useState(true);

  const [slate, setSlate] = useState<SlateData>({
    tituloOriginal: "",
    duracao: "",
    produto: "",
    direcao: "",
    tipo: "COMUM",
    segmento: "TODOS OS SEGMENTOS DE MERCADO",
    crt: "",
    produtora: "CINE CINEMATOGRÁFICA LTDA",
    cnpj: "00.445.787/0001-03",
    anoProducao: String(new Date().getFullYear()),
    dataRegistro: new Date().toLocaleDateString("pt-BR"),
    teclaSap: "NÃO",
    closedCaption: "SIM, SE DISPONÍVEL",
    audio: "",
    logoUrl: "",
  });

  useEffect(() => {
    drawSlate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slate, showSmpte, showTopTicks]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        downloadPDF();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function updateField<K extends keyof SlateData>(key: K, value: SlateData[K]) {
    setSlate((s) => ({ ...s, [key]: value }));
  }

  /** DRAW */
  function drawSlate() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1080p Landscape (16:9)
    const W = 1920;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    // Fundo preto
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    // Colorbars (SMPTE) – faixa de 80px
    let y = 0;
    if (showSmpte) {
      drawSmpteBars(ctx, 0, 60, W, 80);
      y = 80;
    }

    // Ticks superiores branco/verde como no exemplo
    if (showTopTicks) {
      drawTopTicks(ctx, y + 22, W);
      y += 42;
    }

    // Área de conteúdo
    const marginX = 110;
    let cursorY = Math.max(160, y + 60);
    const lh = 38;

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";

    // Título (maior)
    if (slate.tituloOriginal) {
      ctx.font = "700 56px Arial, Helvetica, sans-serif";
      ctx.fillText(slate.tituloOriginal.toUpperCase(), marginX, cursorY);
      cursorY += 48;
    }

    // Subtítulo com produto (maior espaçamento)
    if (slate.produto) {
      ctx.font = "600 34px Arial, Helvetica, sans-serif";
      ctx.fillText(`Produto: ${slate.produto.toUpperCase()}`, marginX, cursorY);
      cursorY += 44;
    }

    // Bloco de metadados
    ctx.font = "400 30px Arial, Helvetica, sans-serif";
    const block: Array<[string, string]> = [
      ["Anunciante", FIXO_ANUNCIANTE],
      ["Agência de publicidade", FIXO_AGENCIA],
      ["Direção", slate.direcao],
      ["Tipo", slate.tipo],
      ["Duração", slate.duracao],
      ["Segmentação de Mercado", slate.segmento],
      ["CRT", slate.crt],
      ["Data de registro", slate.dataRegistro],
      ["Ano de produção", slate.anoProducao],
      ["Produtora de imagens", slate.produtora],
      ["CNPJ", slate.cnpj],
      ["Produtora de áudio", slate.audio || "—"],
      ["Closed Caption", slate.closedCaption],
      ["Tecla SAP", slate.teclaSap],
    ];

    const labelW = 440;
    const maxW = W - marginX * 2 - labelW - 16;

    for (const [label, value] of block) {
      if (!value) continue;
      line(ctx, `${label}:`, value, marginX, cursorY, labelW, maxW);
      cursorY += lh;
    }

    // Logo (opcional) no canto inferior direito
    if (slate.logoUrl && /^https?:\/\//i.test(slate.logoUrl)) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = slate.logoUrl;
      img.onload = () => {
        const size = 140;
        ctx.drawImage(img, W - size - 80, H - size - 60, size, size);
      };
    }
  }

  function line(
    ctx: CanvasRenderingContext2D,
    label: string,
    value: string,
    x: number,
    y: number,
    labelWidth: number,
    maxValueWidth: number
  ) {
    ctx.font = "700 30px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(label.toUpperCase(), x, y);

    ctx.font = "400 30px Arial, Helvetica, sans-serif";
    const lx = x + labelWidth;
    if (ctx.measureText(value).width <= maxValueWidth) {
      ctx.fillText(value, lx, y);
      return;
    }
    // wrap
    const words = value.split(" ");
    let line = "";
    let yy = y;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxValueWidth) {
        ctx.fillText(line, lx, yy);
        line = w;
        yy += 34;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, lx, yy);
  }

  function drawSmpteBars(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const colors = ["#FFFFFF", "#FFFF00", "#00FFFF", "#00FF00", "#FF00FF", "#FF0000", "#0000FF"];
    const seg = w / colors.length;
    for (let i = 0; i < colors.length; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(x + i * seg, y, seg, h);
    }
  }

  // Faixa fina com blocos brancos e miolo verde (visual semelhante ao anexo)
  function drawTopTicks(ctx: CanvasRenderingContext2D, y: number, w: number) {
    const groups = 4;
    const width = 320;
    const height = 16;
    const gap = (w - groups * width) / (groups + 1);
    let x = gap;
    for (let i = 0; i < groups; i++) {
      // base branca
      ctx.fillStyle = "#EDEDED";
      roundRect(ctx, x, y, width, height, 3);
      ctx.fill();

      // miolo verde
      const gW = Math.round(width * 0.22);
      const gx = x + (width - gW) / 2;
      ctx.fillStyle = "#3DDC84";
      roundRect(ctx, gx, y, gW, height, 3);
      ctx.fill();

      x += width + gap;
    }
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** EXPORTS */
  function downloadPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `claquete-${(slate.tituloOriginal || "slate").replace(/\s+/g, "_")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PNG baixado com sucesso!" });
    });
  }

  function downloadPDF() {
    // Sem lib extra: baixa imagem com extensão .pdf (o usuário pode imprimir em PDF também pelo ⌘/Ctrl+P)
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `claquete-${(slate.tituloOriginal || "slate").replace(/\s+/g, "_")}.pdf`;
    a.click();
    toast({ title: "PDF gerado (como imagem)!" });
  }

  /** PRESETS */
  function savePreset() {
    const list = JSON.parse(localStorage.getItem("slate_presets_v1") || "[]");
    const name = prompt("Nome do preset:");
    if (!name) return;
    list.push({ name, data: slate });
    localStorage.setItem("slate_presets_v1", JSON.stringify(list));
    toast({ title: `Preset "${name}" salvo!` });
  }

  function loadPreset() {
    const list: Array<{ name: string; data: SlateData }> =
      JSON.parse(localStorage.getItem("slate_presets_v1") || "[]");
    if (!list.length) {
      toast({ title: "Nenhum preset salvo", variant: "destructive" });
      return;
    }
    const name = prompt(
      "Presets disponíveis:\n" + list.map((p) => `• ${p.name}`).join("\n") + "\n\nDigite o nome exatamente:"
    );
    if (!name) return;
    const found = list.find((p) => p.name === name);
    if (!found) return;
    setSlate(found.data);
    toast({ title: `Preset "${name}" carregado!` });
  }

  return (
    <div className="min-h-screen bg-white">
      <HeaderBar title="Gerador de Claquete" subtitle="1920×1080 — Fundo preto, texto branco" backTo="/" />

      <div className="container-page py-6">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Configuração
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
                  <Input value={slate.duracao} onChange={(e) => updateField("duracao", e.target.value)} placeholder={`Ex: 30"`} />
                </div>
                <div>
                  <Label>Produto</Label>
                  <Input value={slate.produto} onChange={(e) => updateField("produto", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={slate.tipo} onValueChange={(v) => updateField("tipo", v as SlateData["tipo"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMUM">COMUM</SelectItem>
                      <SelectItem value="ESPECIAL">ESPECIAL</SelectItem>
                      <SelectItem value="PROMOCIONAL">PROMOCIONAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Segmentação de Mercado</Label>
                  <Input value={slate.segmento} onChange={(e) => updateField("segmento", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CRT</Label>
                  <Input value={slate.crt} onChange={(e) => updateField("crt", e.target.value)} placeholder="Ex: 20250276240009" />
                </div>
                <div>
                  <Label>Data de Registro</Label>
                  <Input value={slate.dataRegistro} onChange={(e) => updateField("dataRegistro", e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Direção</Label>
                <Input value={slate.direcao} onChange={(e) => updateField("direcao", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produtora de Imagens</Label>
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
                  <Label>Produtora de Áudio</Label>
                  <Input value={slate.audio} onChange={(e) => updateField("audio", e.target.value)} placeholder="Ex: ANTFOOD" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tecla SAP</Label>
                  <Select value={slate.teclaSap} onValueChange={(v) => updateField("teclaSap", v as SlateData["teclaSap"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="NÃO">NÃO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Closed Caption</Label>
                  <Select
                    value={slate.closedCaption}
                    onValueChange={(v) => updateField("closedCaption", v as SlateData["closedCaption"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="NÃO">NÃO</SelectItem>
                      <SelectItem value="SIM, SE DISPONÍVEL">SIM, SE DISPONÍVEL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Logo URL (opcional)</Label>
                <Input value={slate.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} placeholder="https://..." />
              </div>

              {/* Campos fixos */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <Label>Anunciante (fixo)</Label>
                  <Input value={FIXO_ANUNCIANTE} readOnly disabled />
                </div>
                <div>
                  <Label>Agência (fixo)</Label>
                  <Input value={FIXO_AGENCIA} readOnly disabled />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={savePreset} variant="outline" className="gap-2 flex-1">
                  <Save className="h-4 w-4" /> Salvar preset
                </Button>
                <Button onClick={loadPreset} variant="outline" className="gap-2 flex-1">
                  <Upload className="h-4 w-4" /> Carregar preset
                </Button>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={showSmpte} onChange={(e) => setShowSmpte(e.target.checked)} />
                  Colorbar SMPTE
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={showTopTicks} onChange={(e) => setShowTicks(e.target.checked)} />
                  Faixa superior (branco/verde)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview 1920×1080</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-xl overflow-hidden bg-black shadow-sm">
                <canvas ref={canvasRef} className="w-full h-auto" />
              </div>

              <div className="flex gap-2">
                <Button onClick={downloadPNG} className="flex-1 gap-2">
                  <Download className="h-4 w-4" /> Baixar PNG
                </Button>
                <Button onClick={downloadPDF} variant="outline" className="flex-1 gap-2">
                  <FileText className="h-4 w-4" /> Baixar PDF
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Dica: use <strong>⌘/Ctrl + P</strong> para imprimir em PDF com controle total.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
