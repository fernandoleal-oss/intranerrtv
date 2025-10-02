import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, X, Plus, ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
  fotos: string[];
  video: string;
};

const initialModels: BYDModel[] = [
  {
    id: "dolphin-mini",
    nome: "Dolphin Mini",
    versao: "2024",
    autonomia: "340 km",
    potencia: "70 kW (95 cv)",
    aceleracao: "10,9s",
    bateria: "38,88 kWh",
    carga: "AC 7 kW | DC 60 kW",
    dimensoes: "4.125 x 1.770 x 1.570 mm",
    portaMalas: "345 L",
    preco: "R$ 149.800",
    garantiaBateria: "8 anos / 150.000 km",
    garantiaVeiculo: "6 anos / 150.000 km",
    linkOficial: "https://www.byd.com/br/car/dolphin-mini",
    fotos: [
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800",
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
      "https://images.unsplash.com/photo-1617654112359-f45a39748ad3?w=800",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
      "https://images.unsplash.com/photo-1617814703108-96d9eac46475?w=800",
    ],
    video: "https://www.youtube.com/embed/KQE3YzNF7Ww",
  },
  {
    id: "dolphin-gs",
    nome: "Dolphin GS",
    versao: "2024",
    autonomia: "427 km",
    potencia: "150 kW (204 cv)",
    aceleracao: "7,5s",
    bateria: "60,48 kWh",
    carga: "AC 11 kW | DC 88 kW",
    dimensoes: "4.290 x 1.770 x 1.550 mm",
    portaMalas: "345 L",
    preco: "R$ 169.800",
    garantiaBateria: "8 anos / 150.000 km",
    garantiaVeiculo: "6 anos / 150.000 km",
    linkOficial: "https://www.byd.com/br/car/dolphin",
    fotos: [
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
      "https://images.unsplash.com/photo-1617814703108-96d9eac46475?w=800",
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800",
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
      "https://images.unsplash.com/photo-1617654112359-f45a39748ad3?w=800",
    ],
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "yuan-plus",
    nome: "Yuan Plus",
    versao: "2024",
    autonomia: "510 km",
    potencia: "150 kW (204 cv)",
    aceleracao: "7,3s",
    bateria: "60,48 kWh",
    carga: "AC 11 kW | DC 88 kW",
    dimensoes: "4.455 x 1.875 x 1.615 mm",
    portaMalas: "500 L",
    preco: "R$ 199.800",
    garantiaBateria: "8 anos / 150.000 km",
    garantiaVeiculo: "6 anos / 150.000 km",
    linkOficial: "https://www.byd.com/br/car/yuan-plus",
    fotos: [
      "https://images.unsplash.com/photo-1617814703108-96d9eac46475?w=800",
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800",
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
      "https://images.unsplash.com/photo-1617654112359-f45a39748ad3?w=800",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
    ],
    video: "https://www.youtube.com/embed/placeholder",
  },
  {
    id: "song-pro",
    nome: "Song Pro",
    versao: "2024",
    autonomia: "450 km",
    potencia: "135 kW (184 cv)",
    aceleracao: "8,9s",
    bateria: "71,8 kWh",
    carga: "AC 11 kW | DC 80 kW",
    dimensoes: "4.650 x 1.860 x 1.700 mm",
    portaMalas: "520 L",
    preco: "R$ 219.800",
    garantiaBateria: "8 anos / 150.000 km",
    garantiaVeiculo: "6 anos / 150.000 km",
    linkOficial: "https://www.byd.com/br/car/song-pro",
    fotos: [
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
      "https://images.unsplash.com/photo-1617654112359-f45a39748ad3?w=800",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
      "https://images.unsplash.com/photo-1617814703108-96d9eac46475?w=800",
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800",
    ],
    video: "https://www.youtube.com/embed/placeholder1",
  },
  {
    id: "song-plus",
    nome: "Song Plus",
    versao: "Champion Edition",
    autonomia: "520 km",
    potencia: "160 kW (218 cv)",
    aceleracao: "8,5s",
    bateria: "87,04 kWh",
    carga: "AC 11 kW | DC 115 kW",
    dimensoes: "4.775 x 1.890 x 1.670 mm",
    portaMalas: "620 L",
    preco: "R$ 234.800",
    garantiaBateria: "8 anos / 150.000 km",
    garantiaVeiculo: "6 anos / 150.000 km",
    linkOficial: "https://www.byd.com/br/car/song-plus",
    fotos: [
      "https://images.unsplash.com/photo-1617654112359-f45a39748ad3?w=800",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
      "https://images.unsplash.com/photo-1617814703108-96d9eac46475?w=800",
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800",
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
    ],
    video: "https://www.youtube.com/embed/placeholder2",
  },
  {
    id: "song-premium",
    nome: "Song Premium",
    versao: "2024",
    autonomia: "530 km",
    potencia: "165 kW (225 cv)",
    aceleracao: "8,3s",
    bateria: "87,04 kWh",
    carga: "AC 11 kW | DC 120 kW",
    dimensoes: "4.785 x 1.890 x 1.680 mm",
    portaMalas: "640 L",
    preco: "R$ 259.800",
    garantiaBateria: "8 anos / 150.000 km",
    garantiaVeiculo: "6 anos / 150.000 km",
    linkOficial: "https://www.byd.com/br/car/song-premium",
    fotos: [
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
      "https://images.unsplash.com/photo-1617814703108-96d9eac46475?w=800",
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800",
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
      "https://images.unsplash.com/photo-1617654112359-f45a39748ad3?w=800",
    ],
    video: "https://www.youtube.com/embed/placeholder3",
  },
  {
    id: "tan",
    nome: "Tan",
    versao: "2024",
    autonomia: "530 km",
    potencia: "380 kW (517 cv)",
    aceleracao: "4,9s",
    bateria: "108,8 kWh",
    carga: "AC 11 kW | DC 170 kW",
    dimensoes: "4.970 x 1.960 x 1.775 mm",
    portaMalas: "940 L",
    preco: "R$ 549.800",
    garantiaBateria: "8 anos / 150.000 km",
    garantiaVeiculo: "6 anos / 150.000 km",
    linkOficial: "https://www.byd.com/br/car/tan",
    fotos: [
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
      "https://images.unsplash.com/photo-1617654112359-f45a39748ad3?w=800",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
      "https://images.unsplash.com/photo-1617814703108-96d9eac46475?w=800",
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800",
    ],
    video: "https://www.youtube.com/embed/placeholder4",
  },
  {
    id: "seal",
    nome: "Seal",
    versao: "Performance",
    autonomia: "570 km",
    potencia: "390 kW (530 cv)",
    aceleracao: "3,8s",
    bateria: "82,56 kWh",
    carga: "AC 11 kW | DC 150 kW",
    dimensoes: "4.800 x 1.875 x 1.460 mm",
    portaMalas: "400 L",
    preco: "R$ 449.800",
    garantiaBateria: "8 anos / 150.000 km",
    garantiaVeiculo: "6 anos / 150.000 km",
    linkOficial: "https://www.byd.com/br/car/seal",
    fotos: [
      "https://images.unsplash.com/photo-1617814703108-96d9eac46475?w=800",
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800",
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
      "https://images.unsplash.com/photo-1617654112359-f45a39748ad3?w=800",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
    ],
    video: "https://www.youtube.com/embed/placeholder5",
  },
  {
    id: "shark",
    nome: "Shark",
    versao: "2024",
    autonomia: "100 km (elétrico) / 850 km (total)",
    potencia: "320 kW (435 cv)",
    aceleracao: "5,7s",
    bateria: "29,58 kWh",
    carga: "AC 7 kW | DC 80 kW",
    dimensoes: "5.457 x 1.971 x 1.925 mm",
    portaMalas: "1.200 L",
    preco: "R$ 379.800",
    garantiaBateria: "8 anos / 150.000 km",
    garantiaVeiculo: "6 anos / 150.000 km",
    linkOficial: "https://www.byd.com/br/car/shark",
    fotos: [
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800",
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
      "https://images.unsplash.com/photo-1617654112359-f45a39748ad3?w=800",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
      "https://images.unsplash.com/photo-1617814703108-96d9eac46475?w=800",
    ],
    video: "https://www.youtube.com/embed/placeholder6",
  },
];

export default function ComparadorBYD() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [models, setModels] = useState<BYDModel[]>(initialModels);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailsModel, setDetailsModel] = useState<BYDModel | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newModel, setNewModel] = useState<Partial<BYDModel>>({
    fotos: ["", "", "", "", ""],
  });

  const selectedModels = selectedIds
    .map((id) => models.find((m) => m.id === id))
    .filter(Boolean) as BYDModel[];

  const handleSelectModel = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < 5) {
      setSelectedIds([...selectedIds, id]);
    } else {
      toast({ title: "Máximo de 5 modelos", variant: "destructive" });
    }
  };

  const handleShowDetails = (model: BYDModel) => {
    setDetailsModel(model);
    setCurrentPhotoIndex(0);
  };

  const getDifferences = () => {
    if (selectedModels.length < 2) return [];
    const keys: (keyof BYDModel)[] = [
      "autonomia",
      "potencia",
      "aceleracao",
      "bateria",
      "portaMalas",
      "preco",
    ];
    return keys.filter((key) => {
      const values = selectedModels.map((m) => m[key]);
      const unique = new Set(values);
      return unique.size > 1;
    });
  };

  const differences = getDifferences();

  const exportCSV = () => {
    if (selectedModels.length === 0) {
      toast({ title: "Selecione ao menos um modelo", variant: "destructive" });
      return;
    }

    const headers = [
      "Modelo",
      "Autonomia",
      "Potência",
      "Aceleração",
      "Bateria",
      "Porta-Malas",
      "Preço",
    ];
    const rows = selectedModels.map((m) => [
      m.nome,
      m.autonomia,
      m.potencia,
      m.aceleracao,
      m.bateria,
      m.portaMalas,
      m.preco,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparativo-byd-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    toast({ title: "CSV exportado com sucesso!" });
  };

  const handleAddModel = () => {
    if (!newModel.nome || !newModel.preco) {
      toast({ title: "Preencha nome e preço", variant: "destructive" });
      return;
    }

    const id = newModel.nome!.toLowerCase().replace(/\s+/g, "-");
    const model: BYDModel = {
      id,
      nome: newModel.nome!,
      versao: newModel.versao || "2024",
      autonomia: newModel.autonomia || "N/D",
      potencia: newModel.potencia || "N/D",
      aceleracao: newModel.aceleracao || "N/D",
      bateria: newModel.bateria || "N/D",
      carga: newModel.carga || "N/D",
      dimensoes: newModel.dimensoes || "N/D",
      portaMalas: newModel.portaMalas || "N/D",
      preco: newModel.preco!,
      garantiaBateria: "8 anos / 150.000 km",
      garantiaVeiculo: "6 anos / 150.000 km",
      linkOficial: newModel.linkOficial || "https://www.byd.com/br",
      fotos: newModel.fotos?.filter((f) => f) || [],
      video: newModel.video || "",
    };

    setModels([...models, model]);
    setAddDialogOpen(false);
    setNewModel({ fotos: ["", "", "", "", ""] });
    toast({ title: "Modelo adicionado!" });
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1a365d 0%, #2c5282 100%)" }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-white">Comparador BYD</h1>
              <p className="text-blue-100">Compare até 5 modelos de veículos elétricos</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(true)}
              className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <Plus className="h-4 w-4" />
              Adicionar Modelo
            </Button>
            <Button
              onClick={exportCSV}
              disabled={selectedModels.length === 0}
              className="gap-2 bg-white text-blue-900 hover:bg-blue-50"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Selected Summary */}
        {selectedIds.length > 0 && (
          <Card className="mb-6 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Modelos Selecionados ({selectedIds.length}/5)</span>
                <div className="flex gap-2">
                  {selectedIds.length >= 2 && (
                    <Button
                      size="sm"
                      onClick={() => setShowComparison(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Comparar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedIds([])}
                    className="gap-1"
                  >
                    <X className="h-3 w-3" />
                    Limpar
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedModels.map((model) => (
                  <Badge
                    key={model.id}
                    variant="secondary"
                    className="px-3 py-2 text-sm bg-blue-100 text-blue-900"
                  >
                    {model.nome}
                    <button
                      onClick={() => handleSelectModel(model.id)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Models Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => {
            const isSelected = selectedIds.includes(model.id);
            return (
              <Card
                key={model.id}
                className={`cursor-pointer transition-all hover:shadow-2xl ${
                  isSelected
                    ? "ring-4 ring-blue-500 bg-blue-50/50"
                    : "bg-white hover:scale-105"
                }`}
                onClick={() => handleShowDetails(model)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl text-blue-900">{model.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">{model.versao}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectModel(model.id);
                      }}
                      className={`p-2 rounded-full transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-600 hover:bg-blue-100"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <img
                    src={model.fotos[0]}
                    alt={model.nome}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Autonomia:</span>
                      <p className="font-medium text-blue-900">{model.autonomia}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Potência:</span>
                      <p className="font-medium text-blue-900">{model.potencia}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-2xl font-bold text-blue-900">{model.preco}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={!!detailsModel} onOpenChange={() => setDetailsModel(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailsModel && (
            <>
              <DialogHeader>
                <DialogTitle className="text-3xl text-blue-900">
                  {detailsModel.nome} {detailsModel.versao}
                </DialogTitle>
              </DialogHeader>

              {/* Photo Gallery */}
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={detailsModel.fotos[currentPhotoIndex] || detailsModel.fotos[0]}
                    alt={`${detailsModel.nome} - Foto ${currentPhotoIndex + 1}`}
                    className="w-full h-96 object-cover rounded-lg"
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {detailsModel.fotos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          idx === currentPhotoIndex
                            ? "bg-white scale-125"
                            : "bg-white/50 hover:bg-white/75"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="grid grid-cols-5 gap-2">
                  {detailsModel.fotos.map((foto, idx) => (
                    <img
                      key={idx}
                      src={foto}
                      alt={`Thumbnail ${idx + 1}`}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`w-full h-20 object-cover rounded cursor-pointer transition-all ${
                        idx === currentPhotoIndex
                          ? "ring-2 ring-blue-500 scale-105"
                          : "opacity-70 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>

                {/* Video */}
                {detailsModel.video && (
                  <div className="rounded-lg overflow-hidden">
                    <iframe
                      width="100%"
                      height="400"
                      src={detailsModel.video}
                      title={`${detailsModel.nome} Video`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Specifications */}
                <div className="grid md:grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-3">Performance</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Autonomia:</span>
                        <span className="font-medium">{detailsModel.autonomia}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Potência:</span>
                        <span className="font-medium">{detailsModel.potencia}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">0-100 km/h:</span>
                        <span className="font-medium">{detailsModel.aceleracao}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-3">Bateria e Carga</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bateria:</span>
                        <span className="font-medium">{detailsModel.bateria}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carga:</span>
                        <span className="font-medium">{detailsModel.carga}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-3">Dimensões</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensões:</span>
                        <span className="font-medium">{detailsModel.dimensoes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Porta-Malas:</span>
                        <span className="font-medium">{detailsModel.portaMalas}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-3">Garantia</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bateria:</span>
                        <span className="font-medium">{detailsModel.garantiaBateria}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Veículo:</span>
                        <span className="font-medium">{detailsModel.garantiaVeiculo}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-3xl font-bold text-blue-900">{detailsModel.preco}</span>
                  <a
                    href={detailsModel.linkOficial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Ver no site oficial →
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Comparison Modal */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-blue-900">
              Comparação Detalhada
            </DialogTitle>
          </DialogHeader>

          {differences.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                Principais Diferenças:
              </h3>
              <div className="flex flex-wrap gap-2">
                {differences.map((diff) => (
                  <Badge key={diff} variant="secondary" className="bg-blue-100 text-blue-900">
                    {diff === "autonomia" && "Autonomia"}
                    {diff === "potencia" && "Potência"}
                    {diff === "aceleracao" && "Aceleração"}
                    {diff === "bateria" && "Bateria"}
                    {diff === "portaMalas" && "Porta-Malas"}
                    {diff === "preco" && "Preço"}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="p-3 text-left font-semibold">Especificação</th>
                  {selectedModels.map((model) => (
                    <th key={model.id} className="p-3 text-left font-semibold">
                      {model.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: "autonomia", label: "Autonomia" },
                  { key: "potencia", label: "Potência" },
                  { key: "aceleracao", label: "0-100 km/h" },
                  { key: "bateria", label: "Bateria" },
                  { key: "carga", label: "Carga" },
                  { key: "portaMalas", label: "Porta-Malas" },
                  { key: "preco", label: "Preço" },
                ].map(({ key, label }) => (
                  <tr
                    key={key}
                    className={`border-b ${
                      differences.includes(key as keyof BYDModel)
                        ? "bg-yellow-50"
                        : "bg-white"
                    }`}
                  >
                    <td className="p-3 font-medium text-blue-900">{label}</td>
                    {selectedModels.map((model) => (
                      <td key={model.id} className="p-3">
                        {model[key as keyof BYDModel]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Model Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Modelo BYD</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nome do Modelo *</Label>
                <Input
                  value={newModel.nome || ""}
                  onChange={(e) => setNewModel({ ...newModel, nome: e.target.value })}
                  placeholder="Ex: Song Plus"
                />
              </div>
              <div>
                <Label>Versão</Label>
                <Input
                  value={newModel.versao || ""}
                  onChange={(e) => setNewModel({ ...newModel, versao: e.target.value })}
                  placeholder="2024"
                />
              </div>
              <div>
                <Label>Autonomia</Label>
                <Input
                  value={newModel.autonomia || ""}
                  onChange={(e) => setNewModel({ ...newModel, autonomia: e.target.value })}
                  placeholder="520 km"
                />
              </div>
              <div>
                <Label>Potência</Label>
                <Input
                  value={newModel.potencia || ""}
                  onChange={(e) => setNewModel({ ...newModel, potencia: e.target.value })}
                  placeholder="160 kW (218 cv)"
                />
              </div>
              <div>
                <Label>Preço *</Label>
                <Input
                  value={newModel.preco || ""}
                  onChange={(e) => setNewModel({ ...newModel, preco: e.target.value })}
                  placeholder="R$ 234.800"
                />
              </div>
              <div>
                <Label>Link Oficial</Label>
                <Input
                  value={newModel.linkOficial || ""}
                  onChange={(e) => setNewModel({ ...newModel, linkOficial: e.target.value })}
                  placeholder="https://www.byd.com/br/car/..."
                />
              </div>
            </div>

            <div>
              <Label>Fotos (URLs)</Label>
              {(newModel.fotos || ["", "", "", "", ""]).map((foto, idx) => (
                <Input
                  key={idx}
                  value={foto}
                  onChange={(e) => {
                    const fotos = [...(newModel.fotos || ["", "", "", "", ""])];
                    fotos[idx] = e.target.value;
                    setNewModel({ ...newModel, fotos });
                  }}
                  placeholder={`URL da foto ${idx + 1}`}
                  className="mt-2"
                />
              ))}
            </div>

            <div>
              <Label>Vídeo (YouTube Embed URL)</Label>
              <Input
                value={newModel.video || ""}
                onChange={(e) => setNewModel({ ...newModel, video: e.target.value })}
                placeholder="https://www.youtube.com/embed/..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddModel} className="bg-blue-600 hover:bg-blue-700">
                Adicionar Modelo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
