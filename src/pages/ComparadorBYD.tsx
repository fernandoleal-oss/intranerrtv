import { useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, X, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BYDModel = {
  id: string;
  nome: string;
  versao: string;
  autonomia: string;
  potencia: string;
  aceleracao: string;
  bateria: string;
  carga: string;
  dimensoes: string;
  portaMalas: string;
  preco: string;
  garantiaBateria: string;
  garantiaVeiculo: string;
  linkOficial: string;
  media: string[];
  videos: string[];
};

const bydModels: BYDModel[] = [
  {
    id: "dolphin-mini",
    nome: "Dolphin Mini",
    versao: "2024",
    autonomia: "340 km (NEDC)",
    potencia: "70 kW (95 cv)",
    aceleracao: "10,9s (0-100 km/h)",
    bateria: "38,88 kWh Blade Battery",
    carga: "AC 7 kW | DC 60 kW",
    dimensoes: "4.125 x 1.770 x 1.570 mm",
    portaMalas: "345 L",
    preco: "A partir de R$ 149.800",
    garantiaBateria: "8 anos ou 150.000 km",
    garantiaVeiculo: "6 anos ou 150.000 km",
    linkOficial: "https://www.byd.com/br/car/dolphin-mini.html",
    media: [
      "https://www.byd.com/content/dam/byd-site/br/car-img/dolphin-mini/exterior-01.jpg",
      "https://www.byd.com/content/dam/byd-site/br/car-img/dolphin-mini/interior-01.jpg",
    ],
    videos: ["https://www.youtube.com/embed/KQE3YzNF7Ww"],
  },
  {
    id: "dolphin",
    nome: "Dolphin",
    versao: "2024",
    autonomia: "427 km (NEDC)",
    potencia: "150 kW (204 cv)",
    aceleracao: "7,5s (0-100 km/h)",
    bateria: "60,48 kWh Blade Battery",
    carga: "AC 11 kW | DC 88 kW",
    dimensoes: "4.290 x 1.770 x 1.550 mm",
    portaMalas: "345 L",
    preco: "A partir de R$ 169.800",
    garantiaBateria: "8 anos ou 150.000 km",
    garantiaVeiculo: "6 anos ou 150.000 km",
    linkOficial: "https://www.byd.com/br/car/dolphin.html",
    media: [
      "https://www.byd.com/content/dam/byd-site/br/car-img/dolphin/exterior-01.jpg",
      "https://www.byd.com/content/dam/byd-site/br/car-img/dolphin/interior-01.jpg",
    ],
    videos: ["https://www.youtube.com/embed/dQw4w9WgXcQ"],
  },
  {
    id: "yuan-plus",
    nome: "Yuan Plus",
    versao: "2024",
    autonomia: "510 km (NEDC)",
    potencia: "150 kW (204 cv)",
    aceleracao: "7,3s (0-100 km/h)",
    bateria: "60,48 kWh Blade Battery",
    carga: "AC 11 kW | DC 88 kW",
    dimensoes: "4.455 x 1.875 x 1.615 mm",
    portaMalas: "500 L",
    preco: "A partir de R$ 199.800",
    garantiaBateria: "8 anos ou 150.000 km",
    garantiaVeiculo: "6 anos ou 150.000 km",
    linkOficial: "https://www.byd.com/br/car/yuan-plus.html",
    media: [
      "https://www.byd.com/content/dam/byd-site/br/car-img/yuan-plus/exterior-01.jpg",
      "https://www.byd.com/content/dam/byd-site/br/car-img/yuan-plus/interior-01.jpg",
    ],
    videos: ["https://www.youtube.com/embed/placeholder"],
  },
  {
    id: "song-plus",
    nome: "Song Plus",
    versao: "Champion Edition",
    autonomia: "520 km (NEDC)",
    potencia: "160 kW (218 cv)",
    aceleracao: "8,5s (0-100 km/h)",
    bateria: "87,04 kWh Blade Battery",
    carga: "AC 11 kW | DC 115 kW",
    dimensoes: "4.775 x 1.890 x 1.670 mm",
    portaMalas: "620 L",
    preco: "A partir de R$ 234.800",
    garantiaBateria: "8 anos ou 150.000 km",
    garantiaVeiculo: "6 anos ou 150.000 km",
    linkOficial: "https://www.byd.com/br/car/song-plus.html",
    media: [
      "https://www.byd.com/content/dam/byd-site/br/car-img/song-plus/exterior-01.jpg",
      "https://www.byd.com/content/dam/byd-site/br/car-img/song-plus/interior-01.jpg",
    ],
    videos: ["https://www.youtube.com/embed/placeholder2"],
  },
  {
    id: "tan",
    nome: "Tan",
    versao: "2024",
    autonomia: "530 km (NEDC)",
    potencia: "380 kW (517 cv) - Tração integral",
    aceleracao: "4,9s (0-100 km/h)",
    bateria: "108,8 kWh Blade Battery",
    carga: "AC 11 kW | DC 170 kW",
    dimensoes: "4.970 x 1.960 x 1.775 mm",
    portaMalas: "940 L",
    preco: "A partir de R$ 549.800",
    garantiaBateria: "8 anos ou 150.000 km",
    garantiaVeiculo: "6 anos ou 150.000 km",
    linkOficial: "https://www.byd.com/br/car/tan.html",
    media: [
      "https://www.byd.com/content/dam/byd-site/br/car-img/tan/exterior-01.jpg",
      "https://www.byd.com/content/dam/byd-site/br/car-img/tan/interior-01.jpg",
    ],
    videos: ["https://www.youtube.com/embed/placeholder3"],
  },
  {
    id: "seal",
    nome: "Seal",
    versao: "Performance",
    autonomia: "570 km (NEDC)",
    potencia: "390 kW (530 cv) - Tração integral",
    aceleracao: "3,8s (0-100 km/h)",
    bateria: "82,56 kWh Blade Battery",
    carga: "AC 11 kW | DC 150 kW",
    dimensoes: "4.800 x 1.875 x 1.460 mm",
    portaMalas: "400 L",
    preco: "A partir de R$ 449.800",
    garantiaBateria: "8 anos ou 150.000 km",
    garantiaVeiculo: "6 anos ou 150.000 km",
    linkOficial: "https://www.byd.com/br/car/seal.html",
    media: [
      "https://www.byd.com/content/dam/byd-site/br/car-img/seal/exterior-01.jpg",
      "https://www.byd.com/content/dam/byd-site/br/car-img/seal/interior-01.jpg",
    ],
    videos: ["https://www.youtube.com/embed/placeholder4"],
  },
];

export default function ComparadorBYD() {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedModels = selectedIds.map((id) => bydModels.find((m) => m.id === id)!).filter(Boolean);

  const handleSelectModel = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, id]);
    } else {
      toast({ title: "Máximo de 3 modelos", variant: "destructive" });
    }
  };

  const getDifferences = () => {
    if (selectedModels.length < 2) return [];
    const keys: (keyof BYDModel)[] = [
      "autonomia",
      "potencia",
      "aceleracao",
      "bateria",
      "carga",
      "portaMalas",
      "preco",
    ];
    const diffs: string[] = [];
    keys.forEach((key) => {
      const values = selectedModels.map((m) => m[key]);
      const unique = new Set(values);
      if (unique.size > 1) {
        diffs.push(key);
      }
    });
    return diffs;
  };

  const differences = getDifferences();

  const exportCSV = () => {
    if (selectedModels.length === 0) {
      toast({ title: "Selecione ao menos um modelo", variant: "destructive" });
      return;
    }

    const headers = ["Campo", ...selectedModels.map((m) => m.nome)];
    const rows = [
      ["Versão", ...selectedModels.map((m) => m.versao)],
      ["Autonomia", ...selectedModels.map((m) => m.autonomia)],
      ["Potência", ...selectedModels.map((m) => m.potencia)],
      ["0-100 km/h", ...selectedModels.map((m) => m.aceleracao)],
      ["Bateria", ...selectedModels.map((m) => m.bateria)],
      ["Carga", ...selectedModels.map((m) => m.carga)],
      ["Dimensões", ...selectedModels.map((m) => m.dimensoes)],
      ["Porta-malas", ...selectedModels.map((m) => m.portaMalas)],
      ["Preço", ...selectedModels.map((m) => m.preco)],
      ["Garantia Bateria", ...selectedModels.map((m) => m.garantiaBateria)],
      ["Garantia Veículo", ...selectedModels.map((m) => m.garantiaVeiculo)],
    ];

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparacao-byd-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado com sucesso!" });
  };

  return (
    <div className="min-h-screen bg-white">
      <HeaderBar title="Comparador BYD" subtitle="Compare até 3 modelos elétricos" backTo="/" />

      <div className="container-page py-6 space-y-6">
        {/* Seleção */}
        <Card>
          <CardHeader>
            <CardTitle>Selecione os modelos (máx. 3)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {bydModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelectModel(model.id)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    selectedIds.includes(model.id)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  {model.nome}
                </button>
              ))}
            </div>

            {selectedIds.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Selecionados:</span>
                {selectedIds.map((id) => {
                  const model = bydModels.find((m) => m.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {model?.nome}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => handleSelectModel(id)} />
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diferenças */}
        {differences.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-sm">Onde os modelos diferem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {differences.map((diff) => (
                  <Badge key={diff} variant="outline" className="capitalize">
                    {diff.replace(/([A-Z])/g, " $1").trim()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparação */}
        {selectedModels.length > 0 && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedModels.map((model) => (
                <Card key={model.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{model.nome}</span>
                      <Badge>{model.versao}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Fotos */}
                    <div className="space-y-2">
                      {model.media.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`${model.nome} ${idx + 1}`}
                          className="w-full h-40 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/400x300?text=Imagem+Indisponível";
                          }}
                        />
                      ))}
                    </div>

                    {/* Vídeo */}
                    {model.videos[0] && (
                      <div className="aspect-video">
                        <iframe
                          src={model.videos[0]}
                          className="w-full h-full rounded-lg"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* Specs */}
                    <div className="space-y-2 text-sm">
                      <div className={differences.includes("autonomia") ? "bg-yellow-100 p-2 rounded" : ""}>
                        <strong>Autonomia:</strong> {model.autonomia}
                      </div>
                      <div className={differences.includes("potencia") ? "bg-yellow-100 p-2 rounded" : ""}>
                        <strong>Potência:</strong> {model.potencia}
                      </div>
                      <div className={differences.includes("aceleracao") ? "bg-yellow-100 p-2 rounded" : ""}>
                        <strong>0-100 km/h:</strong> {model.aceleracao}
                      </div>
                      <div className={differences.includes("bateria") ? "bg-yellow-100 p-2 rounded" : ""}>
                        <strong>Bateria:</strong> {model.bateria}
                      </div>
                      <div className={differences.includes("carga") ? "bg-yellow-100 p-2 rounded" : ""}>
                        <strong>Carga:</strong> {model.carga}
                      </div>
                      <div>
                        <strong>Dimensões:</strong> {model.dimensoes}
                      </div>
                      <div className={differences.includes("portaMalas") ? "bg-yellow-100 p-2 rounded" : ""}>
                        <strong>Porta-malas:</strong> {model.portaMalas}
                      </div>
                      <div className={differences.includes("preco") ? "bg-yellow-100 p-2 rounded" : ""}>
                        <strong>Preço:</strong> {model.preco}
                      </div>
                      <div>
                        <strong>Garantia Bateria:</strong> {model.garantiaBateria}
                      </div>
                      <div>
                        <strong>Garantia Veículo:</strong> {model.garantiaVeiculo}
                      </div>
                    </div>

                    <Button variant="outline" className="w-full gap-2" asChild>
                      <a href={model.linkOficial} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Site Oficial
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={exportCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button onClick={() => window.print()} variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
