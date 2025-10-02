// src/pages/ComparadorBYD.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Zap, Battery, Gauge, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HeaderBar } from "@/components/HeaderBar";

interface CarModel {
  id: string;
  name: string;
  image: string;
  price: string;
  range: string;
  acceleration: string;
  power: string;
  battery: string;
  seats: number;
  features: string[];
  videoUrl?: string;
}

const bydModels: CarModel[] = [
  {
    id: "dolphin",
    name: "BYD Dolphin",
    image: "https://www.byd.com/content/dam/byd-site/br/models/dolphin/dolphin-hero.jpg",
    price: "R$ 149.800",
    range: "291 km",
    acceleration: "7,5s (0-100km/h)",
    power: "70 kW",
    battery: "44,9 kWh",
    seats: 5,
    features: [
      "Carregamento rápido DC",
      "Teto solar panorâmico",
      "Sistema multimídia 12,8\"",
      "Assistente de voz",
      "Conectividade 4G",
    ],
  },
  {
    id: "dolphin-mini",
    name: "BYD Dolphin Mini",
    image: "https://www.byd.com/content/dam/byd-site/br/models/dolphin-mini/dolphin-mini-hero.jpg",
    price: "R$ 99.800",
    range: "250 km",
    acceleration: "10,9s (0-100km/h)",
    power: "55 kW",
    battery: "38,9 kWh",
    seats: 4,
    features: [
      "Compacto urbano",
      "Carregamento AC/DC",
      "Central multimídia 10,1\"",
      "Câmera de ré",
      "Eficiência energética",
    ],
  },
  {
    id: "yuan-plus",
    name: "BYD Yuan Plus",
    image: "https://www.byd.com/content/dam/byd-site/br/models/yuan-plus/yuan-plus-hero.jpg",
    price: "R$ 189.800",
    range: "320 km",
    acceleration: "7,3s (0-100km/h)",
    power: "150 kW",
    battery: "50,1 kWh",
    seats: 5,
    features: [
      "SUV elétrico",
      "Tração dianteira",
      "Tela rotativa 12,8\"",
      "ADAS completo",
      "Porta-malas 550L",
    ],
  },
  {
    id: "seal",
    name: "BYD Seal",
    image: "https://www.byd.com/content/dam/byd-site/br/models/seal/seal-hero.jpg",
    price: "R$ 349.800",
    range: "570 km",
    acceleration: "3,8s (0-100km/h)",
    power: "390 kW",
    battery: "82,5 kWh",
    seats: 5,
    features: [
      "Sedã esportivo",
      "Tração integral AWD",
      "Performance superior",
      "Bateria Blade",
      "Tecnologia CTB",
    ],
  },
  {
    id: "tan",
    name: "BYD Tan",
    image: "https://www.byd.com/content/dam/byd-site/br/models/tan/tan-hero.jpg",
    price: "R$ 469.800",
    range: "530 km",
    acceleration: "4,4s (0-100km/h)",
    power: "380 kW",
    battery: "108,8 kWh",
    seats: 7,
    features: [
      "SUV 7 lugares",
      "Tração integral",
      "Suspensão adaptativa",
      "Luxo e espaço",
      "Tecnologia de ponta",
    ],
  },
];

export default function ComparadorBYD() {
  const navigate = useNavigate();
  const [selectedCars, setSelectedCars] = useState<string[]>([]);

  const toggleCar = (id: string) => {
    if (selectedCars.includes(id)) {
      setSelectedCars(selectedCars.filter((c) => c !== id));
    } else if (selectedCars.length < 3) {
      setSelectedCars([...selectedCars, id]);
    }
  };

  const selectedModels = bydModels.filter((car) => selectedCars.includes(car.id));

  return (
    <div className="min-h-screen bg-background">
      <HeaderBar
        title="Comparador BYD Brasil"
        subtitle="Compare modelos e encontre o carro elétrico ideal"
        backTo="/"
      />

      <div className="container-page">

        {/* Seleção de modelos */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Selecione até 3 modelos para comparar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4">
              {bydModels.map((car) => (
                <button
                  key={car.id}
                  onClick={() => toggleCar(car.id)}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    selectedCars.includes(car.id)
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/20 hover:border-primary/50"
                  }`}
                >
                  <div className="aspect-video bg-secondary rounded-xl mb-2 overflow-hidden">
                    <img src={car.image} alt={car.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-sm font-medium text-foreground">{car.name}</div>
                  <div className="text-xs text-muted-foreground">{car.price}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comparação */}
        {selectedModels.length > 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comparação de Especificações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-muted-foreground">Especificação</th>
                        {selectedModels.map((car) => (
                          <th key={car.id} className="text-left p-4">
                            <div className="font-bold text-foreground">{car.name}</div>
                            <div className="text-sm text-muted-foreground">{car.price}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border hover:bg-secondary/20">
                        <td className="p-4 flex items-center gap-2">
                          <Battery className="h-4 w-4 text-primary" />
                          Autonomia
                        </td>
                        {selectedModels.map((car) => (
                          <td key={car.id} className="p-4 font-medium">{car.range}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-border hover:bg-secondary/20">
                        <td className="p-4 flex items-center gap-2">
                          <Gauge className="h-4 w-4 text-primary" />
                          Aceleração (0-100km/h)
                        </td>
                        {selectedModels.map((car) => (
                          <td key={car.id} className="p-4 font-medium">{car.acceleration}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-border hover:bg-secondary/20">
                        <td className="p-4 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          Potência
                        </td>
                        {selectedModels.map((car) => (
                          <td key={car.id} className="p-4 font-medium">{car.power}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-border hover:bg-secondary/20">
                        <td className="p-4 flex items-center gap-2">
                          <Battery className="h-4 w-4 text-primary" />
                          Bateria
                        </td>
                        {selectedModels.map((car) => (
                          <td key={car.id} className="p-4 font-medium">{car.battery}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-border hover:bg-secondary/20">
                        <td className="p-4 flex items-center gap-2">
                          <Car className="h-4 w-4 text-primary" />
                          Lugares
                        </td>
                        {selectedModels.map((car) => (
                          <td key={car.id} className="p-4 font-medium">{car.seats} pessoas</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recursos e Tecnologias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {selectedModels.map((car) => (
                    <div key={car.id} className="space-y-3">
                      <div className="font-semibold text-lg text-foreground">{car.name}</div>
                      <ul className="space-y-2">
                        {car.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Diferenças principais */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-primary">Principais Diferenças</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {selectedModels.length === 2 && (
                    <>
                      <p>
                        <strong className="text-foreground">Autonomia:</strong>{" "}
                        {selectedModels[0].range > selectedModels[1].range
                          ? `${selectedModels[0].name} tem maior autonomia (${selectedModels[0].range})`
                          : `${selectedModels[1].name} tem maior autonomia (${selectedModels[1].range})`}
                      </p>
                      <p>
                        <strong className="text-foreground">Performance:</strong>{" "}
                        {parseFloat(selectedModels[0].acceleration) < parseFloat(selectedModels[1].acceleration)
                          ? `${selectedModels[0].name} é mais rápido (${selectedModels[0].acceleration})`
                          : `${selectedModels[1].name} é mais rápido (${selectedModels[1].acceleration})`}
                      </p>
                      <p>
                        <strong className="text-foreground">Preço:</strong>{" "}
                        {parseFloat(selectedModels[0].price.replace(/[^\d,]/g, "").replace(",", ".")) <
                        parseFloat(selectedModels[1].price.replace(/[^\d,]/g, "").replace(",", "."))
                          ? `${selectedModels[0].name} é mais acessível (${selectedModels[0].price})`
                          : `${selectedModels[1].name} é mais acessível (${selectedModels[1].price})`}
                      </p>
                    </>
                  )}
                  {selectedModels.length === 3 && (
                    <>
                      <p>
                        <strong className="text-foreground">Melhor custo-benefício:</strong>{" "}
                        {selectedModels[1].name} - equilíbrio entre preço e recursos
                      </p>
                      <p>
                        <strong className="text-foreground">Mais econômico:</strong>{" "}
                        {selectedModels.sort(
                          (a, b) =>
                            parseFloat(a.price.replace(/[^\d,]/g, "").replace(",", ".")) -
                            parseFloat(b.price.replace(/[^\d,]/g, "").replace(",", "."))
                        )[0].name}
                      </p>
                      <p>
                        <strong className="text-foreground">Maior autonomia:</strong>{" "}
                        {selectedModels.sort((a, b) => parseInt(b.range) - parseInt(a.range))[0].name} com{" "}
                        {selectedModels.sort((a, b) => parseInt(b.range) - parseInt(a.range))[0].range}
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
