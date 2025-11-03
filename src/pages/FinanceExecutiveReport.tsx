// ADICIONAR ESTES NOVOS COMPONENTES E FUNCIONALIDADES

// 1. ✅ RESUMO EXECUTIVO COM INSIGHTS AUTOMÁTICOS
const ExecutiveSummary = ({ suppliers, totalInvestido, monthlyData }) => {
  const topSupplier = suppliers[0];
  const growthLastMonth = monthlyData.length > 1 
    ? ((monthlyData[monthlyData.length - 1].total - monthlyData[monthlyData.length - 2].total) / monthlyData[monthlyData.length - 2].total) * 100
    : 0;

  const insights = [
    {
      title: "Fornecedor Destaque",
      content: `${topSupplier.name} representa ${topSupplier.percentage.toFixed(1)}% do total`,
      type: "info"
    },
    {
      title: "Crescimento Mensal",
      content: `Último mês: ${growthLastMonth >= 0 ? '+' : ''}${growthLastMonth.toFixed(1)}%`,
      type: growthLastMonth >= 0 ? "success" : "warning"
    },
    {
      title: "Concentração",
      content: `Top 3 fornecedores: ${suppliers.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0).toFixed(1)}% do total`,
      type: suppliers.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0) > 60 ? "warning" : "info"
    }
  ];

  return (
    <Card className="print:shadow-none print:border mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Insights Executivos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              insight.type === 'success' ? 'border-green-500 bg-green-50' :
              insight.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}>
              <h4 className="font-semibold text-sm">{insight.title}</h4>
              <p className="text-sm mt-1">{insight.content}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// 2. ✅ COMPARATIVO MENSAL COM PERÍODO ANTERIOR
const MonthlyComparison = ({ monthlyData }) => {
  const currentYearData = monthlyData.filter(m => m.month.startsWith('2025'));
  const comparisonData = currentYearData.map((month, index) => {
    const previousMonth = currentYearData[index - 1];
    const growth = previousMonth ? ((month.total - previousMonth.total) / previousMonth.total) * 100 : 0;
    
    return {
      month: formatMonth(month.month),
      valor: month.total / 100,
      crescimento: growth,
      transacoes: month.count
    };
  });

  return (
    <Card className="print:shadow-none print:border mb-6">
      <CardHeader>
        <CardTitle>Evolução Mensal com Comparativo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value.toFixed(0)}%`} />
            <Tooltip formatter={(value, name) => 
              name === 'crescimento' ? [`${Number(value).toFixed(1)}%`, 'Crescimento'] : [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Faturamento']
            } />
            <Legend />
            <Bar yAxisId="left" dataKey="valor" fill="#3B82F6" name="Faturamento" />
            <Line yAxisId="right" type="monotone" dataKey="crescimento" stroke="#EF4444" name="Crescimento %" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 3. ✅ ANÁLISE DE SAZONALIDADE
const SeasonalityAnalysis = ({ monthlyData }) => {
  const monthlyAverages = {};
  
  // Agrupar por mês (jan, fev, mar...) através dos anos
  monthlyData.forEach(month => {
    const monthName = formatMonth(month.month).split('/')[0];
    if (!monthlyAverages[monthName]) {
      monthlyAverages[monthName] = { total: 0, count: 0 };
    }
    monthlyAverages[monthName].total += month.total;
    monthlyAverages[monthName].count += 1;
  });

  const seasonalityData = Object.entries(monthlyAverages).map(([month, data]) => ({
    month,
    media: data.total / data.count / 100
  }));

  return (
    <Card className="print:shadow-none print:border mb-6">
      <CardHeader>
        <CardTitle>Análise de Sazonalidade</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={seasonalityData}>
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Média']} />
            <Bar dataKey="media" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 4. ✅ PROJEÇÃO FUTURA BASEADA EM DADOS HISTÓRICOS
const RevenueProjection = ({ monthlyData }) => {
  const last6Months = monthlyData.slice(-6);
  const totalGrowth = last6Months.reduce((sum, month, index, array) => {
    if (index === 0) return sum;
    const growth = (month.total - array[index - 1].total) / array[index - 1].total;
    return sum + growth;
  }, 0);
  
  const averageMonthlyGrowth = totalGrowth / (last6Months.length - 1);
  const lastMonthRevenue = last6Months[last6Months.length - 1].total;
  
  const projections = Array.from({ length: 3 }, (_, i) => {
    const projectedRevenue = lastMonthRevenue * Math.pow(1 + averageMonthlyGrowth, i + 1);
    return {
      mes: `Projeção ${i + 1}`,
      valor: projectedRevenue / 100,
      crescimento: (averageMonthlyGrowth * 100).toFixed(1)
    };
  });

  return (
    <Card className="print:shadow-none print:border mb-6">
      <CardHeader>
        <CardTitle>Projeção de Faturamento (Próximos 3 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projections.map((proj, index) => (
            <div key={index} className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(proj.valor * 100)}
              </div>
              <div className="text-sm text-muted-foreground">{proj.mes}</div>
              <div className={`text-xs mt-1 ${proj.crescimento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {proj.crescimento >= 0 ? '+' : ''}{proj.crescimento}% vs anterior
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// 5. ✅ ANÁLISE DE CONCENTRAÇÃO DE RISCO
const RiskConcentrationAnalysis = ({ suppliers }) => {
  const concentrationData = [
    { name: 'Top 1', value: suppliers[0]?.percentage || 0 },
    { name: 'Top 3', value: suppliers.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0) },
    { name: 'Top 5', value: suppliers.slice(0, 5).reduce((sum, s) => sum + s.percentage, 0) },
    { name: 'Demais', value: suppliers.slice(5).reduce((sum, s) => sum + s.percentage, 0) }
  ];

  const riskLevel = concentrationData[1].value > 70 ? 'ALTO' : concentrationData[1].value > 50 ? 'MÉDIO' : 'BAIXO';

  return (
    <Card className="print:shadow-none print:border mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Análise de Concentração de Risco
          <span className={`text-sm px-2 py-1 rounded ${
            riskLevel === 'ALTO' ? 'bg-red-100 text-red-800' :
            riskLevel === 'MÉDIO' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            Risco {riskLevel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={concentrationData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
              >
                {concentrationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Participação']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            <div className="text-sm">
              <strong>Recomendações:</strong>
              {riskLevel === 'ALTO' && (
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                  <li>Diversificar base de fornecedores</li>
                  <li>Estabelecer contratos de longo prazo</li>
                  <li>Criar plano de contingência</li>
                </ul>
              )}
              {riskLevel === 'MÉDIO' && (
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                  <li>Monitorar fornecedores estratégicos</li>
                  <li>Desenvolver fornecedores secundários</li>
                </ul>
              )}
              {riskLevel === 'BAIXO' && (
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                  <li>Manter diversificação atual</li>
                  <li>Focar em eficiência operacional</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 6. ✅ INDICADORES DE PERFORMANCE (KPIs) AVANÇADOS
const AdvancedKPIs = ({ suppliers, monthlyData, events }) => {
  const avgTransactionValue = events.length > 0 ? events.reduce((sum, e) => sum + e.total_cents, 0) / events.length : 0;
  const monthlyTransactionCount = events.length / monthlyData.length;
  const supplierRetentionRate = (suppliers.filter(s => s.monthlyData.length > 1).length / suppliers.length) * 100;

  const kpis = [
    {
      title: "Ticket Médio",
      value: formatCurrency(avgTransactionValue),
      description: "Valor médio por transação",
      trend: "stable"
    },
    {
      title: "Transações/Mês",
      value: monthlyTransactionCount.toFixed(0),
      description: "Média mensal de transações",
      trend: