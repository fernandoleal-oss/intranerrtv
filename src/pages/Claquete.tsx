import React, { useEffect, useRef, useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileImage, FileText, Save, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/** --------------------------- Tipos --------------------------- */
type SlateData = {
  // bloco da esquerda
  marcaGrande: string;     // texto grande (ex. logotipo em texto)
  logoUrl: string;         // opcional: URL de imagem para desenhar no canto

  // bloco informativo (direita)
  tituloOriginal: string;
  produto: string;
  anunciante: string;
  agencia: string;
  direcao: string;
  tipo: string;            // Comum / Especial / Promocional...
  duracao: string;         // 30"
  segmento: string;        // Segmentação de mercado
  crt: string;

  dataRegistro: string;    // dd/mm/aaaa
  qtdVersoes: string;      // número (como string para simplificar)
  anoProducao: string;     // aaaa

  produtoraImagens: string;
  cnpj: string;
  produtoraAudio: string;

  closedCaption: "SIM" | "NÃO" | "SIM, SE DISPONÍVEL";
  audiodescricao: "SIM" | "NÃO";
  teclaSap: "SIM" | "NÃO";

  observacoes: string;
};

const AGENCIA_DEFAULT = "WF/MOTTA COMUNICAÇÃO MARKETING E PUBLICIDADE LTDA.";

/** Dimensões do canvas 16:9 (FullHD) */
const CANVAS_W = 1920;
const CANVAS_H = 1080;

export default function Claquete() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [slate, setSlate] = useState<SlateData>({
    marcaGrande: "",
    logoUrl: "",

    tituloOriginal: "",
    produto: "",
    anunciante: "",
    agencia: AGENCIA_DEFAULT,
    direcao: "",
    tipo: "Comum",
    duracao: `30"`,
    segmento: "Todos os segmentos de mercado",
    crt: "",

    dataRegistro: new Date().toLocaleDateString("pt-BR"),
    qtdVersoes: "01",
    anoProducao: String(new Date().getFullYear()),

    produtoraImagens: "",
    cnpj: "",
    produtoraAudio: "",

    closedCaption: "SIM",
    audiodescricao: "SIM",
    teclaSap: "NÃO",

    observacoes: "",
  });

  // Redesenha a claquete a cada mudança
  useEffect(() => {
    drawSlate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(slate)]);

  // Atalho ⌘/Ctrl + P
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

  /** --------------------------- Desenho da claquete --------------------------- */
  function drawSlate() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    // Fundo preto
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Barras superiores (4 “tiras” brancas com miolo verde)
    drawTopCueStrips(ctx);

    // Margens e colunas
    const margin = 80;
    const colLeftW = 520; // coluna para logo/marca grande
    const xLeft = margin;
    const xRight = margin + colLeftW + 40;
    let y = 170; // altura após as barras

    // --- Coluna esquerda: marca grande + ícone "FILM" ---
    drawLeftBrand(ctx, xLeft, y, colLeftW, slate);

    // --- Coluna direita: bloco de informações ---
    const line = 36; // altura de linha
    y = 220; // topo do bloco direito

    const labelColor = "#FFFFFF";
    const valueColor = "#FFFFFF";

    // Funções utilitárias
    const label = (t: string) => {
      ctx.fillStyle = labelColor;
      ctx.font = "bold 24px Arial";
      return t.toUpperCase();
    };
    const value = (t: string) => {
      ctx.fillStyle = valueColor;
      ctx.font = "24px Arial";
      return t;
    };

    // largura útil do bloco à direita
    const maxW = CANVAS_W - xRight - margin;

    // Desenha par (label: valor) com quebra
    const drawRow = (lab: string, val: string) => {
      const labTxt = label(lab);
      ctx.fillText(labTxt, xRight, y);
      const labW = ctx.measureText(labTxt).width + 10;

      const wrapped = wrapText(ctx, value(val || "-"), maxW - labW);
      wrapped.forEach((ln, i) => {
        ctx.fillText(ln, xRight + labW, y + i * line);
      });
      y += line * Math.max(1, wrapped.length);
    };

    drawRow("Título:", slate.tituloOriginal);
    drawRow("Produto:", slate.produto);
    drawRow("Anunciante:", slate.anunciante);
    drawRow("Agência de publicidade:", slate.agencia);
    drawRow("Direção:", slate.direcao);
    drawRow("Tipo:", slate.tipo);
    drawRow("Duração:", slate.duracao);
    drawRow("Segmentação de Mercado:", slate.segmento);
    drawRow("CRT:", slate.crt);
    drawRow("Data de registro:", slate.dataRegistro);
    drawRow("Quantidade de versões:", slate.qtdVersoes);
    drawRow("Ano de produção:", slate.anoProducao);
    drawRow("Produtora de imagens:", slate.produtoraImagens);
    drawRow("CNPJ:", slate.cnpj);
    drawRow("Produtora de áudio:", slate.produtoraAudio);
    drawRow("Closed Caption:", slate.closedCaption);
    drawRow("Audiodescrição:", slate.audiodescricao);
    drawRow("Tecla SAP:", slate.teclaSap);

    if (slate.observacoes?.trim()) {
      y += 16;
      drawRow("Obs.:", slate.observacoes.trim());
    }

    // Logo opcional no canto inferior direito
    if (slate.logoUrl && /^https?:\/\//i.test(slate.logoUrl)) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = slate.logoUrl;
      img.onload = () => {
        const size = 120;
        ctx.drawImage(img, CANVAS_W - margin - size, CANVAS_H - margin - size, size, size);
      };
    }
  }

  // Barras inspiradas na referência: faixas brancas com “pílula” verde central
  function drawTopCueStrips(ctx: CanvasRenderingContext2D) {
    const count = 4;
    const barW = CANVAS_W / (count + 1); // espaço entre barras
    const barH = 14;
    const y = 84;
    const pillH = 10;
    const pillW = barW * 0.18;

    ctx.lineWidth = 1;

    for (let i = 0; i < count; i++) {
      const cx = (i + 1) * barW;
      // barra branca
      ctx.fillStyle = "#EDEDED";
      ctx.fillRect(cx - barW * 0.33, y, barW * 0.66, barH);

      // “pílula” verde central
      ctx.fillStyle = "#34D399";
      const px = cx - pillW / 2;
      const py = y + (barH - pillH) / 2;
      ctx.fillRect(px, py, pillW, pillH);
    }
  }

  function drawLeftBrand(
    ctx: CanvasRenderingContext2D,
    x: number,
    yTop: number,
    width: number,
    data: SlateData
  ) {
    let y = yTop;

    // Marca grande (texto) — equivalente ao logo grande da amostra
    if (data.marcaGrande?.trim()) {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 84px Arial";
      // limite de duas linhas, se necessário
      const lines = wrapText(ctx, data.marcaGrande.toUpperCase(), width);
      lines.slice(0, 2).forEach((ln) => {
        ctx.fillText(ln, x, y);
        y += 84;
      });
      y += 16;
    }

    // Badge “FILM” com ícone simples (clapper)
    const boxY = y + 24;
    const boxH = 110;
    const boxW = 300;

    // clapper
    ctx.fillStyle = "#FFFFFF";
    // base
    ctx.fillRect(x, boxY + 32, 70, 60);
    // tampa do clapper (diagonal)
    ctx.save();
    ctx.translate(x + 45, boxY + 28);
    ctx.rotate(-12 * Math.PI / 180);
    ctx.fillRect(-45, -16, 90, 18);
    ctx.restore();

    // texto FILM
    ctx.font = "bold 76px Arial";
    ctx.fillText("FILM", x + 95, boxY + boxH - 20);
  }

  // Quebra de texto básica
  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    if (!text) return [""];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = words[0] || "";

    for (let i = 1; i < words.length; i++) {
      const test = cur + " " + words[i];
      if (ctx.measureText(test).width <= maxWidth) {
        cur = test;
      } else {
        lines.push(cur);
        cur = words[i];
      }
    }
    lines.push(cur);
    return lines;
  }

  /** --------------------------- Ações --------------------------- */
  function update<K extends keyof SlateData>(key: K, val: SlateData[K]) {
    setSlate((s) => ({ ...s, [key]: val }));
  }

  function savePreset() {
    const all = JSON.parse(localStorage.getItem("slate_presets_v2") || "[]");
    const name = prompt("Nome do preset:");
    if (!name) return;
    all.push({ name, data: slate });
    localStorage.setItem("slate_presets_v2", JSON.stringify(all));
    toast({ title: `Preset "${name}" salvo!` });
  }

  function loadPreset() {
    const all = JSON.parse(localStorage.getItem("slate_presets_v2") || "[]");
    if (!all.length) {
      toast({ title: "Nenhum preset salvo", variant: "destructive" });
      return;
    }
    const list = all.map((p: any) => p.name).join("\n");
    const name = prompt(`Presets disponíveis:\n${list}\n\nDigite o nome a carregar:`);
    const p = all.find((x: any) => x.name === name);
    if (p) {
      setSlate(p.data);
      toast({ title: `Preset "${name}" carregado!` });
    }
  }

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
    // Exporta a imagem e baixa com extensão .pdf (fluxo simples compatível com o ambiente)
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = data;
    a.download = `claquete-${(slate.tituloOriginal || "slate").replace(/\s+/g, "_")}.pdf`;
    a.click();
    toast({ title: "PDF gerado (imagem)!" });
  }

  /** --------------------------- UI --------------------------- */
  return (
    <div className="min-h-screen bg-white">
      <HeaderBar title="Gerador de Claquete" subtitle="Slate Generator" backTo="/" />

      <div className="container-page py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Configuração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Marca (texto grande)</Label>
                  <Input value={slate.marcaGrande} onChange={(e) => update("marcaGrande", e.target.value)} placeholder="Ex.: TROPICAL" />
                </div>
                <div>
                  <Label>Logo URL (opcional)</Label>
                  <Input value={slate.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://..." />
                </div>
              </div>

              <div>
                <Label>Título Original</Label>
                <Input value={slate.tituloOriginal} onChange={(e) => update("tituloOriginal", e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Produto</Label>
                  <Input value={slate.produto} onChange={(e) => update("produto", e.target.value)} />
                </div>
                <div>
                  <Label>Anunciante</Label>
                  <Input value={slate.anunciante} onChange={(e) => update("anunciante", e.target.value)} placeholder="Ex.: AMBEV S.A." />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Agência</Label>
                  <Input value={slate.agencia} onChange={(e) => update("agencia", e.target.value)} />
                </div>
                <div>
                  <Label>Direção</Label>
                  <Input value={slate.direcao} onChange={(e) => update("direcao", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Input value={slate.tipo} onChange={(e) => update("tipo", e.target.value)} placeholder="Comum / Especial ..." />
                </div>
                <div>
                  <Label>Duração</Label>
                  <Input value={slate.duracao} onChange={(e) => update("duracao", e.target.value)} placeholder={`Ex.: 30"`} />
                </div>
                <div>
                  <Label>CRT</Label>
                  <Input value={slate.crt} onChange={(e) => update("crt", e.target.value)} placeholder="Ex.: 20250276240009" />
                </div>
              </div>

              <div>
                <Label>Segmentação de Mercado</Label>
                <Input value={slate.segmento} onChange={(e) => update("segmento", e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Data de registro</Label>
                  <Input value={slate.dataRegistro} onChange={(e) => update("dataRegistro", e.target.value)} placeholder="dd/mm/aaaa" />
                </div>
                <div>
                  <Label>Qtd. versões</Label>
                  <Input value={slate.qtdVersoes} onChange={(e) => update("qtdVersoes", e.target.value)} />
                </div>
                <div>
                  <Label>Ano de produção</Label>
                  <Input value={slate.anoProducao} onChange={(e) => update("anoProducao", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Produtora de imagens</Label>
                  <Input value={slate.produtoraImagens} onChange={(e) => update("produtoraImagens", e.target.value)} />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={slate.cnpj} onChange={(e) => update("cnpj", e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Produtora de áudio</Label>
                <Input value={slate.produtoraAudio} onChange={(e) => update("produtoraAudio", e.target.value)} placeholder="Ex.: ANTFOOD" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Closed Caption</Label>
                  <Select value={slate.closedCaption} onValueChange={(v) => update("closedCaption", v as SlateData["closedCaption"])}>
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
                  <Select value={slate.audiodescricao} onValueChange={(v) => update("audiodescricao", v as SlateData["audiodescricao"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="NÃO">NÃO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tecla SAP</Label>
                  <Select value={slate.teclaSap} onValueChange={(v) => update("teclaSap", v as SlateData["teclaSap"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="NÃO">NÃO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Observações (opcional)</Label>
                <Textarea rows={3} value={slate.observacoes} onChange={(e) => update("observacoes", e.target.value)} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={savePreset} variant="outline" className="flex-1 gap-2">
                  <Save className="h-4 w-4" /> Salvar preset
                </Button>
                <Button onClick={loadPreset} variant="outline" className="flex-1 gap-2">
                  <Upload className="h-4 w-4" /> Carregar preset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview (1920×1080)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-black">
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

              <p className="text-xs text-muted-foreground text-center">
                Dica: use <span className="font-mono">⌘/Ctrl + P</span> para gerar PDF rapidamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
