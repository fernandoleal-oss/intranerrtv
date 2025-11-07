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
  const [openFornecedores, setOpenFornecedores] = useState<Set<string>>(
    new Set(fornecedores.length > 0 ? [fornecedores[0].id] : [])
  );
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

  const totalSelectedItems = Array.from(selectedItems).length;
  const totalGeral = fornecedores.reduce((sum, fornecedor) => sum + calculateFornecedorTotal(fornecedor), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Selecione os Itens por Fornecedor
        </CardTitle>
        {totalSelectedItems > 0 && (
          <div className="flex items-center justify-between mt-2 p-3 bg-primary/10 rounded-lg">
            <Badge variant="secondary" className="text-sm">
              {totalSelectedItems} {totalSelectedItems === 1 ? 'item selecionado' : 'itens selecionados'}
            </Badge>
            <div className="text-lg font-bold text-primary">
              {formatCurrency(totalGeral)}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {fornecedores.map((fornecedor) => {
          const fornecedorTotal = calculateFornecedorTotal(fornecedor);
          const isOpen = openFornecedores.has(fornecedor.id);
          const isFullySelected = isFornecedorFullySelected(fornecedor);
          const isPartiallySelected = isFornecedorPartiallySelected(fornecedor);

          return (
            <Card key={fornecedor.id} className={`border-2 transition-all ${isFullySelected ? 'border-primary' : isPartiallySelected ? 'border-orange-400' : ''}`}>
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
                      {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      <div className="text-left">
                        <Label htmlFor={`fornecedor-${fornecedor.id}`} className="font-bold text-base cursor-pointer block">
                          {fornecedor.nome}
                        </Label>
                        {fornecedor.cnpj && (
                          <span className="text-xs text-muted-foreground">CNPJ: {fornecedor.cnpj}</span>
                        )}
                      </div>
                    </div>
                    {fornecedorTotal > 0 && (
                      <Badge variant="default" className="ml-2 bg-primary">
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
                      <Card key={fase.id} className={`border transition-all ${isFaseFull ? 'bg-primary/5 border-primary/30' : isFasePartial ? 'bg-orange-50 border-orange-200' : ''}`}>
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
                                {isFaseOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <Label htmlFor={`fase-${fase.id}`} className="font-semibold text-sm cursor-pointer">
                                  {fase.nome}
                                </Label>
                                <Badge variant="outline" className="text-xs">
                                  {fase.itens.length} {fase.itens.length === 1 ? 'item' : 'itens'}
                                </Badge>
                              </div>
                              {faseTotal > 0 && (
                                <Badge variant="secondary" className="text-xs font-bold">
                                  {formatCurrency(faseTotal)}
                                </Badge>
                              )}
                            </button>
                          </div>
                        </CardHeader>

                        {isFaseOpen && (
                          <CardContent className="space-y-2 pt-2">
                            {fase.itens.map((item) => {
                              const isSelected = selectedItems.has(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                    isSelected 
                                      ? 'bg-primary/10 border-primary shadow-sm' 
                                      : 'bg-muted/30 border-transparent hover:border-muted-foreground/20'
                                  }`}
                                >
                                  <Checkbox
                                    id={`item-${item.id}`}
                                    checked={isSelected}
                                    onCheckedChange={() => toggleItem(item.id)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <Label htmlFor={`item-${item.id}`} className="cursor-pointer font-medium text-sm block">
                                      {item.nome}
                                    </Label>
                                    {item.observacao && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.observacao}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {item.prazo && (
                                        <Badge variant="outline" className="text-xs">
                                          📅 {item.prazo}
                                        </Badge>
                                      )}
                                      {item.desconto && item.desconto > 0 && (
                                        <Badge variant="outline" className="text-xs text-green-600">
                                          -{item.desconto}% desconto
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-primary whitespace-nowrap">
                                      {formatCurrency(item.valor)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
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
