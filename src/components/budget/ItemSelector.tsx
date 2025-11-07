import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Item {
  id: string;
  nome: string;
  valor: number;
  prazo?: string;
  observacao?: string;
  desconto?: number;
}

interface Fase {
  id: string;
  nome: string;
  itens: Item[];
}

interface Fornecedor {
  id: string;
  nome: string;
  fases: Fase[];
  cnpj?: string;
  contato?: string;
}

interface ItemSelectorProps {
  fornecedores: Fornecedor[];
  onSelectionChange: (selectedItems: any) => void;
}

export function ItemSelector({ fornecedores, onSelectionChange }: ItemSelectorProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [openFornecedores, setOpenFornecedores] = useState<Set<string>>(new Set());
  const [openFases, setOpenFases] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const toggleFornecedor = (fornecedorId: string) => {
    const newOpen = new Set(openFornecedores);
    if (newOpen.has(fornecedorId)) {
      newOpen.delete(fornecedorId);
    } else {
      newOpen.add(fornecedorId);
    }
    setOpenFornecedores(newOpen);
  };

  const toggleFase = (faseId: string) => {
    const newOpen = new Set(openFases);
    if (newOpen.has(faseId)) {
      newOpen.delete(faseId);
    } else {
      newOpen.add(faseId);
    }
    setOpenFases(newOpen);
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleAllFornecedor = (fornecedor: Fornecedor, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    fornecedor.fases.forEach(fase => {
      fase.itens.forEach(item => {
        if (checked) {
          newSelected.add(item.id);
        } else {
          newSelected.delete(item.id);
        }
      });
    });
    setSelectedItems(newSelected);
  };

  const toggleAllFase = (fase: Fase, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    fase.itens.forEach(item => {
      if (checked) {
        newSelected.add(item.id);
      } else {
        newSelected.delete(item.id);
      }
    });
    setSelectedItems(newSelected);
  };

  const isFornecedorFullySelected = (fornecedor: Fornecedor) => {
    return fornecedor.fases.every(fase =>
      fase.itens.every(item => selectedItems.has(item.id))
    );
  };

  const isFornecedorPartiallySelected = (fornecedor: Fornecedor) => {
    return fornecedor.fases.some(fase =>
      fase.itens.some(item => selectedItems.has(item.id))
    ) && !isFornecedorFullySelected(fornecedor);
  };

  const isFaseFullySelected = (fase: Fase) => {
    return fase.itens.every(item => selectedItems.has(item.id));
  };

  const isFasePartiallySelected = (fase: Fase) => {
    return fase.itens.some(item => selectedItems.has(item.id)) && !isFaseFullySelected(fase);
  };

  const calculateFornecedorTotal = (fornecedor: Fornecedor) => {
    let total = 0;
    fornecedor.fases.forEach(fase => {
      fase.itens.forEach(item => {
        if (selectedItems.has(item.id)) {
          total += item.valor;
        }
      });
    });
    return total;
  };

  const calculateFaseTotal = (fase: Fase) => {
    let total = 0;
    fase.itens.forEach(item => {
      if (selectedItems.has(item.id)) {
        total += item.valor;
      }
    });
    return total;
  };

  useEffect(() => {
    const itemsByFornecedor: any = {};
    fornecedores.forEach(fornecedor => {
      const selectedFornecedorItems: any[] = [];
      fornecedor.fases.forEach(fase => {
        fase.itens.forEach(item => {
          if (selectedItems.has(item.id)) {
            selectedFornecedorItems.push({
              ...item,
              fase: fase.nome
            });
          }
        });
      });
      if (selectedFornecedorItems.length > 0) {
        itemsByFornecedor[fornecedor.nome] = {
          items: selectedFornecedorItems,
          total: calculateFornecedorTotal(fornecedor)
        };
      }
    });
    onSelectionChange(itemsByFornecedor);
  }, [selectedItems, fornecedores]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Selecione os Itens por Fornecedor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fornecedores.map((fornecedor) => {
          const fornecedorTotal = calculateFornecedorTotal(fornecedor);
          const isOpen = openFornecedores.has(fornecedor.id);
          const isFullySelected = isFornecedorFullySelected(fornecedor);
          const isPartiallySelected = isFornecedorPartiallySelected(fornecedor);

          return (
            <Card key={fornecedor.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`fornecedor-${fornecedor.id}`}
                    checked={isFullySelected}
                    onCheckedChange={(checked) => toggleAllFornecedor(fornecedor, checked as boolean)}
                    className={isPartiallySelected ? "data-[state=checked]:bg-orange-500" : ""}
                  />
                  <button
                    onClick={() => toggleFornecedor(fornecedor.id)}
                    className="flex-1 flex items-center justify-between hover:bg-muted/50 rounded p-2 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Label htmlFor={`fornecedor-${fornecedor.id}`} className="font-bold text-base cursor-pointer">
                        {fornecedor.nome}
                      </Label>
                    </div>
                    {fornecedorTotal > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {formatCurrency(fornecedorTotal)}
                      </Badge>
                    )}
                  </button>
                </div>
              </CardHeader>

              {isOpen && (
                <CardContent className="space-y-3 pt-0">
                  {fornecedor.fases.map((fase) => {
                    const faseTotal = calculateFaseTotal(fase);
                    const isFaseOpen = openFases.has(fase.id);
                    const isFaseFull = isFaseFullySelected(fase);
                    const isFasePartial = isFasePartiallySelected(fase);

                    return (
                      <Card key={fase.id} className="border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`fase-${fase.id}`}
                              checked={isFaseFull}
                              onCheckedChange={(checked) => toggleAllFase(fase, checked as boolean)}
                              className={isFasePartial ? "data-[state=checked]:bg-orange-400" : ""}
                            />
                            <button
                              onClick={() => toggleFase(fase.id)}
                              className="flex-1 flex items-center justify-between hover:bg-muted/50 rounded p-1 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isFaseOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                <Label htmlFor={`fase-${fase.id}`} className="font-semibold text-sm cursor-pointer">
                                  {fase.nome}
                                </Label>
                              </div>
                              {faseTotal > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {formatCurrency(faseTotal)}
                                </Badge>
                              )}
                            </button>
                          </div>
                        </CardHeader>

                        {isFaseOpen && (
                          <CardContent className="space-y-2 pt-2">
                            {fase.itens.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                              >
                                <Checkbox
                                  id={`item-${item.id}`}
                                  checked={selectedItems.has(item.id)}
                                  onCheckedChange={() => toggleItem(item.id)}
                                />
                                <div className="flex-1">
                                  <Label htmlFor={`item-${item.id}`} className="cursor-pointer font-medium text-sm">
                                    {item.nome}
                                  </Label>
                                  {item.observacao && (
                                    <p className="text-xs text-muted-foreground mt-1">{item.observacao}</p>
                                  )}
                                  {item.prazo && (
                                    <p className="text-xs text-muted-foreground mt-1">Prazo: {item.prazo}</p>
                                  )}
                                </div>
                                <div className="text-sm font-semibold whitespace-nowrap">
                                  {formatCurrency(item.valor)}
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
