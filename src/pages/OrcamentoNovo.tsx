// Adicione esta interface após as outras interfaces
interface CCBudgetData {
  cliente: string;
  produto: string;
  pecas: Array<{
    descricao: string;
    quantidade: number;
  }>;
  valor_total: number;
}

// Adicione este componente após o EmsMultimixBudgetEditForm
function CCBudgetEditForm({ budgetData, onSaveSuccess, onRefresh }: BudgetEditFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [ccData, setCCData] = useState<CCBudgetData>(() => {
    const payload = budgetData.payload || {};
    
    // Se já existirem dados, usar eles
    if (payload.cliente && payload.produto && payload.pecas) {
      return {
        cliente: payload.cliente || "",
        produto: payload.produto || "",
        pecas: payload.pecas || [],
        valor_total: payload.valor_total || 0
      };
    }

    // Dados padrão para CC
    return {
      cliente: "",
      produto: "",
      pecas: [
        {
          descricao: "",
          quantidade: 1
        }
      ],
      valor_total: 900 // Valor fixo por CC
    };
  });

  const updateCCField = (field: keyof CCBudgetData, value: any) => {
    setCCData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePeca = (index: number, field: keyof CCBudgetData['pecas'][0], value: any) => {
    setCCData(prev => ({
      ...prev,
      pecas: prev.pecas.map((peca, i) => 
        i === index ? { ...peca, [field]: value } : peca
      )
    }));
  };

  const addPeca = () => {
    setCCData(prev => ({
      ...prev,
      pecas: [
        ...prev.pecas,
        {
          descricao: "",
          quantidade: 1
        }
      ]
    }));
  };

  const removePeca = (index: number) => {
    if (ccData.pecas.length > 1) {
      setCCData(prev => ({
        ...prev,
        pecas: prev.pecas.filter((_, i) => i !== index)
      }));
    }
  };

  const calcularValorTotal = () => {
    const totalPecas = ccData.pecas.reduce((total, peca) => total + peca.quantidade, 0);
    return totalPecas * 900; // R$ 900 por CC
  };

  const handleSave = async () => {
    // Validações
    if (!ccData.cliente.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!ccData.produto.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o produto.",
        variant: "destructive",
      });
      return;
    }

    for (let i = 0; i < ccData.pecas.length; i++) {
      if (!ccData.pecas[i].descricao.trim()) {
        toast({
          title: "Campo obrigatório",
          description: `Por favor, informe a descrição da peça ${i + 1}.`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const valor_total = calcularValorTotal();
      const total_pecas = ccData.pecas.reduce((total, peca) => total + peca.quantidade, 0);

      const payload = {
        ...budgetData.payload,
        type: "cc",
        cliente: ccData.cliente,
        produto: ccData.produto,
        pecas: ccData.pecas,
        valor_total,
        total_pecas,
        valor_por_cc: 900,
        solicitante: "Solicitante não informado",
        data_orcamento: new Date().toISOString().split('T')[0],
        observacoes: [
          "Valor unitário por CC: R$ 900,00",
          `Total de peças: ${total_pecas}`,
          "Prazo a combinar conforme complexidade das peças"
        ]
      };

      // Criar nova versão
      const { error: versionError } = await supabase.from("versions").insert([
        {
          budget_id: budgetData.id,
          versao: budgetData.versao + 1,
          payload: payload as any,
          total_geral: valor_total,
        },
      ]);

      if (versionError) throw versionError;

      // Atualizar budget
      const { error: budgetError } = await supabase
        .from("budgets")
        .update({ 
          updated_at: new Date().toISOString(),
          status: budgetData.status
        })
        .eq("id", budgetData.id);

      if (budgetError) throw budgetError;

      toast({
        title: "✅ Orçamento CC atualizado!",
        description: `Versão ${budgetData.versao + 1} salva com sucesso. Total: R$ ${valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      });

      onSaveSuccess(budgetData.id);
      
    } catch (err: any) {
      console.error("[edit-cc-budget] error:", err);
      toast({
        title: "Erro ao atualizar orçamento",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const valorTotal = calcularValorTotal();
  const totalPecas = ccData.pecas.reduce((total, peca) => total + peca.quantidade, 0);

  return (
    <div className="space-y-6">
      {/* Banner de Informação */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-purple-900 text-lg">Editando Orçamento - Criação de Conteúdo (CC)</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm text-purple-800">
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <span>
                    <strong>Nº {budgetData.budget_number}</strong> • {budgetData.display_id}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <span>
                    Versão atual: <strong>{budgetData.versao}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <span>Valor por CC: <strong>R$ 900,00</strong></span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <span>Status: <StatusBadge status={budgetData.status} /></span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Básicas */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Building2 className="h-5 w-5 text-gray-600" />
            Informações do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cliente" className="text-sm font-medium">
                Cliente *
              </Label>
              <Input
                id="cliente"
                value={ccData.cliente}
                onChange={(e) => updateCCField('cliente', e.target.value)}
                placeholder="Nome do cliente"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="produto" className="text-sm font-medium">
                Produto *
              </Label>
              <Input
                id="produto"
                value={ccData.produto}
                onChange={(e) => updateCCField('produto', e.target.value)}
                placeholder="Nome do produto"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peças Produzidas */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-600" />
              Peças Produzidas
            </div>
            <Button
              onClick={addPeca}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Peça
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {ccData.pecas.map((peca, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800">Peça {index + 1}</h4>
                  {ccData.pecas.length > 1 && (
                    <Button
                      onClick={() => removePeca(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid md:grid-cols-12 gap-4">
                  <div className="md:col-span-8">
                    <Label>Descrição da Peça *</Label>
                    <Input
                      value={peca.descricao}
                      onChange={(e) => updatePeca(index, 'descricao', e.target.value)}
                      placeholder="Descreva a peça produzida..."
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={peca.quantidade}
                      onChange={(e) => updatePeca(index, 'quantidade', parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <span className="text-sm font-semibold text-gray-700">
                      R$ {(peca.quantidade * 900).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo e Total */}
      <Card className="shadow-lg border-green-200">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">Resumo</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total de Peças:</span>
                  <span className="font-semibold">{totalPecas}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor por CC:</span>
                  <span className="font-semibold">R$ 900,00</span>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">TOTAL DO PROJETO</h3>
                  <p className="text-sm text-gray-600">
                    {ccData.cliente && ccData.produto 
                      ? `${ccData.cliente} - ${ccData.produto}`
                      : "Cliente e Produto não informados"
                    }
                  </p>
                </div>
                <span className="text-3xl font-bold text-green-600">
                  R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-3 justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Salvando...
            </div>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Orçamento CC
            </>
          )}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}