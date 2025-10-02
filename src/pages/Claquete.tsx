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
  produto: string;
  duracao: string;            // ex: 30"
  agencia: string;            // fixo (somente leitura na UI)
  anunciante: string;         // fixo (somente leitura na UI)
  direcao: string;
  tipo: string;               // Comum / Especial / Promocional
  segmento: string;           // Segmentação
  crt: string;
  dataRegistro: string;
  anoProducao: string;
  produtora: string;
  cnpj: string;
  produtoraAudio: string;
  closedCaption: string;      // SIM / NÃO / SIM, SE DISPONÍVEL
  audiodescricao: string;     // SIM / NÃO
  teclaSap: string;           // SIM / NÃO
  logoUrl: string;
};

const FIXO_AGENCIA    = "WF/MOTTA COMUNICAÇÃO MARKETING E PUBLICIDADE LTDA.";

export default function Claquete() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slate, setSlate] = useState<SlateData>({
    tituloOriginal: "",
    produto: "",
    duracao: "",
    agencia: FIXO_AGENCIA,
    anunciante: ""
    direcao:"" ,
    tipo: ""
    segmento:""
    crt: "",
    dataRegistro: new Date().toLocaleDateString("pt-BR"),
    anoProducao: String(new Date().getFullYear()),
    produtora: "",
    cnpj: "",
    produtoraAudio: "",
    closedCaption: "SIM",
    audiodescricao: "SIM",
    teclaSap: "NÃO",
    logoUrl: "",
  });

  useEffect(() => {
    drawSlate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slate]);

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

  function update<K extends keyof SlateData>(key: K, value: SlateData[K]) {
    setSlate((s) => ({ ...s, [key]: value }));
  }

  /** --------- DRAW ---------- */
  function drawSlate() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // base 1920x1080 (16:9)
    const W = 1920;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    // fundo preto
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // faixa superior com linhas finas brancas e miolo verde (como na sua referência)
    drawTopGuides(ctx, W);

    // margens e colunas
    const leftColX = 120;
    const rightColX = 520;       // início do bloco tipográfico
    let textY = 200;             // início da tipografia
    const lineH = 28;            // altura entre linhas

    // coluna esquerda – logo (se houver) e selo FILM
    drawLeftColumn(ctx, leftColX, 170, slate.logoUrl, W, H);

    // bloco tipográfico (direita)
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";

    // título do comercial (logo acima, maior)
    if (slate.tituloOriginal) {
      ctx.font = "700 28px Arial, Helvetica, sans-serif";
      ctx.fillText(`Título: ${slate.tituloOriginal.toUpperCase()}`, rightColX, textY);
      textY += lineH;
    }

    if (slate.produto) {
      ctx.font = "700 24px Arial, Helvetica, sans-serif";
      ctx.fillText(`Produto: ${slate.produto.toUpperCase()}`, rightColX, textY);
      textY += lineH;
    }

    // linhas na ordem da referência
    const lines: string[] = [
      `Anunciante: ${slate.anunciante}`,
      `Agência de publicidade: ${slate.agencia}`,
      slate.direcao ? `Direção: ${slate.direcao}` : "",
      `Tipo: ${slate.tipo}`,
      slate.duracao ? `Duração: ${slate.duracao}` : "",
      `Segmentação de Mercado: ${slate.segmento}`,
      slate.crt ? `CRT: ${slate.crt}` : "",
      slate.dataRegistro ? `Data de registro: ${slate.dataRegistro}` : "",
      // “Quantidade de versões” não consta no form; omitido.
      `Ano de produção: ${slate.anoProducao}`,
      slate.produtora ? `Produtora de imagens: ${slate.produtora}` : "",
      slate.cnpj ? `CNPJ: ${slate.cnpj}` : "",
      slate.produtoraAudio ? `Produtora de áudio: ${slate.produtoraAudio}` : "",
      `Closed Caption: ${slate.closedCaption}`,
      `Audiodescrição: ${slate.audiodescricao}`,
      `Tecla SAP: ${slate.teclaSap}`,
    ].filter(Boolean);

    ctx.font = "400 22px Arial, Helvetica, sans-serif";
    const maxW = 1920 - rightColX - 140;
    for (const ln of lines) {
      textY = writeWrap(ctx, ln, rightColX, textY, maxW, 24);
    }
  }

  function drawTopGuides(ctx: CanvasRenderingContext2D, W: number) {
    // 4 segmentos, linha branca fina com miolo verde
    const groups = 4;
    const segW = 320;
    const segH = 8;
    const y = 64; // altura aproximada como na referência
    const gap = (W - groups * segW) / (groups + 1);

    for (let i = 0; i < groups; i++) {
      const x = Math.round(gap + i * (segW + gap));
      // linha branca
      ctx.fillStyle = "#E6E6E6";
      ctx.fillRect(x, y, segW, segH);
      // miolo verde central
      const greenW = Math.round(segW * 0.18);
      const gx = Math.round(x + (segW - greenW) / 2);
      ctx.fillStyle = "#3DDC84";
      ctx.fillRect(gx, y, greenW, segH);
    }
  }

  function drawLeftColumn(
    ctx: CanvasRenderingContext2D,
    x: number,
    topY: number,
    logoUrl: string,
    W: number,
    H: number
  ) {
    // logo “do filme” no topo esquerdo
    const logoMaxW = 300;
    const logoMaxH = 110;

    if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = logoUrl;
      img.onload = () => {
        const ratio = Math.min(logoMaxW / img.width, logoMaxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, x, topY, w, h);
        // selo FILM abaixo
        drawFilmBadge(ctx, x, topY + h + 80);
      };
    } else {
      // se não houver logo, escreve um placeholder estilizado
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.font = "700 56px Arial Black, Arial, Helvetica, sans-serif";
      ctx.fillText("LOGO", x, topY + 60);
      drawFilmBadge(ctx, x, topY + 120);
    }
  }

  function drawFilmBadge(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // ícone simples + texto FILM, como referência
    // desenha um “cartucho” com câmera bem simples
    const iconW = 68;
    const iconH = 48;

    // corpo do ícone
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y - iconH + 8, iconW, iconH);

    // lente da câmera
    ctx.fillStyle = "#000";
    ctx.fillRect(x + 12, y - iconH + 20, 20, 16);
    // viewfinder
    ctx.fillRect(x + 40, y - iconH + 20, 16, 12);

    // texto FILM
    ctx.fillStyle = "#fff";
    ctx.font = "700 64px Arial, Helvetica, sans-serif";
    ctx.fillText("FILM", x + iconW + 18, y + 2);
  }

  function writeWrap(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lh: number
  ) {
    const words = text.split(" ");
    let line = "";
    for (let i = 0; i < words.length; i++) {
      const testLine = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(testLine).width > maxWidth) {
        ctx.fillText(line, x, y);
        line = words[i];
        y += lh;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, x, y);
    return y + lh;
  }

  /** --------- EXPORT ---------- */
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `claquete-${(slate.tituloOriginal || "slate").replace(/\s+/g, "_")}.pdf`;
    a.click();
    toast({ title: "PDF gerado (imagem)!" });
  }

  /** --------- PRESETS ---------- */
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
      <HeaderBar title="Gerador de Claquete" subtitle="Layout 16:9 — estilo referência" backTo="/" />

      <div className="container-page py-6">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
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
                <Label>Título</Label>
                <Input value={slate.tituloOriginal} onChange={(e) => update("tituloOriginal", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produto</Label>
                  <Input value={slate.produto} onChange={(e) => update("produto", e.target.value)} />
                </div>
                <div>
                  <Label>Duração</Label>
                  <Input value={slate.duracao} onChange={(e) => update("duracao", e.target.value)} placeholder={`Ex: 30"`} />
                </div>
              </div>

              <div>
                <Label>Direção</Label>
                <Input value={slate.direcao} onChange={(e) => update("direcao", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={slate.tipo} onValueChange={(v) => update("tipo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comum">Comum</SelectItem>
                      <SelectItem value="Especial">Especial</SelectItem>
                      <SelectItem value="Promocional">Promocional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Segmentação de Mercado</Label>
                  <Input value={slate.segmento} onChange={(e) => update("segmento", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>CRT</Label>
                  <Input value={slate.crt} onChange={(e) => update("crt", e.target.value)} />
                </div>
                <div>
                  <Label>Data de registro</Label>
                  <Input value={slate.dataRegistro} onChange={(e) => update("dataRegistro", e.target.value)} />
                </div>
                <div>
                  <Label>Ano de produção</Label>
                  <Input value={slate.anoProducao} onChange={(e) => update("anoProducao", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produtora de imagens</Label>
                  <Input value={slate.produtora} onChange={(e) => update("produtora", e.target.value)} />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={slate.cnpj} onChange={(e) => update("cnpj", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Closed Caption</Label>
                  <Select value={slate.closedCaption} onValueChange={(v) => update("closedCaption", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="NÃO">NÃO</SelectItem>
                      <SelectItem value="SIM, SE DISPONÍVEL">SIM, SE DISPONÍVEL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Audiodescrição</Label>
                  <Select value={slate.audiodescricao} onValueChange={(v) => update("audiodescricao", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="NÃO">NÃO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tecla SAP</Label>
                  <Select value={slate.teclaSap} onValueChange={(v) => update("teclaSap", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="NÃO">NÃO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produtora de áudio</Label>
                  <Input value={slate.produtoraAudio} onChange={(e) => update("produtoraAudio", e.target.value)} />
                </div>
                <div>
                  <Label>Logo URL (opcional)</Label>
                  <Input value={slate.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://..." />
                </div>
              </div>

              {/* fixos (somente leitura) */}
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
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview 1920×1080 (estilo referência)</CardTitle>
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
                Atalho: <strong>⌘/Ctrl + P</strong> para imprimir em PDF.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
