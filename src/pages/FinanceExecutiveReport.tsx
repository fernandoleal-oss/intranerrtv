import React from "react";
import "./FinanceExecutiveReport.css";

const FinanceExecutiveReport: React.FC = () => {
  // Dados do relatório
  const reportData = {
    company: {
      name: "WE/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA",
      cnpj: "06.266.118/0001-65",
      address: "Rua Chilon, 381, Vila Olímpia, São Paulo - SP",
      cep: "04652-030",
    },
    summary: {
      totalBilled: "R$ 4.137.259,89",
      suppliersCount: 22,
      monthsAnalyzed: 6,
      averageGrowth: "+229.2%",
      averageTicket: "R$ 36.939,34",
      monthlyTransactions: 30,
      retentionRate: "9%",
    },
    insights: {
      topSupplier: "MONALISA STUDIO LTDA (23.6%)",
      monthlyGrowth: "-21.3%",
      concentration: "56.3% (Top 3)",
    },
    riskAnalysis: {
      top1: "20-24%",
      top5: "73.6%",
      riskLevel: "MÉDIO",
    },
    projections: [
      { name: "Projeção 1", value: "R$ 4.750.271,66", growth: "+229.2%" },
      { name: "Projeção 2", value: "R$ 15.636.901,45", growth: "+229.2%" },
      { name: "Projeção 3", value: "R$ 51.473.411,33", growth: "+220.2%" },
    ],
    suppliers: [
      { rank: 1, name: "MONALISA STUDIO LTDA", value: "R$ 976.394,78", participation: "23.6%", transactions: 98 },
      {
        rank: 2,
        name: "O2 FILMES PUBLICITARIOS LTDA",
        value: "R$ 761.166,00",
        participation: "18.4%",
        transactions: 77,
      },
      {
        rank: 3,
        name: "SUBSOUND AUDIO PRODUÇÕES LTDA",
        value: "R$ 591.000,00",
        participation: "14.3%",
        transactions: 60,
      },
      {
        rank: 4,
        name: "STINK SP PRODUCAO DE FILMES LTDA",
        value: "R$ 414.950,00",
        participation: "10.0%",
        transactions: 42,
      },
      {
        rank: 5,
        name: "TRUST DESIGN MULTIMIDIA S/S LTDA",
        value: "R$ 299.800,00",
        participation: "7.2%",
        transactions: 30,
      },
      {
        rank: 6,
        name: "MELLODIA FILMES E PRODUÇÕES EIRELLI",
        value: "R$ 275.000,00",
        participation: "6.6%",
        transactions: 28,
      },
    ],
  };

  return (
    <div className="container">
      {/* Cabeçalho */}
      <div className="header">
        <h1>Relatório Executivo de Faturamento</h1>
        <div className="subtitle">WE/MOTTA COMUNICAÇÃO - Sistema de Orçamentos</div>
        <div className="subtitle">Análise Consolidada BYD - Período: 6 meses</div>
        <div className="company-info">
          <strong>CNPJ:</strong> {reportData.company.cnpj} |<strong>Endereço:</strong> {reportData.company.address}
        </div>
      </div>

      {/* Cartões de Resumo */}
      <div className="summary-cards">
        <div className="card">
          <h3>Total Faturado</h3>
          <div className="value">{reportData.summary.totalBilled}</div>
          <div className="trend positive">{reportData.summary.averageGrowth} crescimento médio</div>
        </div>
        <div className="card">
          <h3>Fornecedores Ativos</h3>
          <div className="value">{reportData.summary.suppliersCount}</div>
          <div className="trend">{reportData.summary.monthsAnalyzed} meses analisados</div>
        </div>
        <div className="card">
          <h3>Ticket Médio</h3>
          <div className="value">{reportData.summary.averageTicket}</div>
          <div className="trend">{reportData.summary.monthlyTransactions} transações/mês</div>
        </div>
        <div className="card">
          <h3>Retenção</h3>
          <div className="value">{reportData.summary.retentionRate}</div>
          <div className="trend">Fornecedores com múltiplos meses</div>
        </div>
      </div>

      {/* Insights Executivos */}
      <div className="section">
        <h2 className="section-title">🎯 Insights Executivos</h2>
        <div className="insights-grid">
          <div className="insight-card warning">
            <h4>Fornecedor Destaque</h4>
            <p>
              <strong>{reportData.insights.topSupplier}</strong> do total faturado
            </p>
          </div>
          <div className="insight-card info">
            <h4>Crescimento Mensal</h4>
            <p>
              Último mês: <strong className="trend negative">{reportData.insights.monthlyGrowth}</strong>
            </p>
          </div>
          <div className="insight-card warning">
            <h4>Concentração</h4>
            <p>
              Top 3 fornecedores: <strong>{reportData.insights.concentration}</strong> do total
            </p>
          </div>
        </div>
      </div>

      {/* Análise de Risco */}
      <div className="section">
        <h2 className="section-title">📈 Análise de Concentração de Risco</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Top 1 Fornecedor</h4>
            <p>{reportData.riskAnalysis.top1} do faturamento total</p>
          </div>
          <div className="insight-card warning">
            <h4>Top 5 Fornecedores</h4>
            <p>{reportData.riskAnalysis.top5} do faturamento total</p>
          </div>
          <div className="insight-card">
            <h4>Classificação de Risco</h4>
            <div className="risk-indicator">RISCO {reportData.riskAnalysis.riskLevel}</div>
          </div>
        </div>
        <div className="insight-card info" style={{ marginTop: "20px" }}>
          <h4>Recomendações:</h4>
          <p>• Monitorar fornecedores estratégicos continuamente</p>
          <p>• Desenvolver fornecedores secundários para diversificação</p>
        </div>
      </div>

      {/* Projeções */}
      <div className="section">
        <h2 className="section-title">🔮 Projeções de Faturamento</h2>
        <div className="projection-cards">
          {reportData.projections.map((projection, index) => (
            <div key={index} className="projection-card">
              <h4>{projection.name}</h4>
              <div className="value">{projection.value}</div>
              <div className="trend positive">{projection.growth} vs anterior</div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: "15px", color: "#666", fontSize: "0.9em" }}>
          <em>Base: Média de crescimento dos últimos 6 meses</em>
        </p>
      </div>

      {/* Ranking de Fornecedores */}
      <div className="section">
        <h2 className="section-title">📋 Ranking de Fornecedores</h2>
        <table className="supplier-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fornecedor</th>
              <th>Valor Total</th>
              <th>Participação</th>
              <th>Transações</th>
            </tr>
          </thead>
          <tbody>
            {reportData.suppliers.map((supplier, index) => (
              <tr key={supplier.rank} className={index < 3 ? "highlight" : ""}>
                <td>{supplier.rank}</td>
                <td>{supplier.name}</td>
                <td>{supplier.value}</td>
                <td>{supplier.participation}</td>
                <td>{supplier.transactions}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={2}>
                <strong>Demais fornecedores (16)</strong>
              </td>
              <td>
                <strong>R$ 819.949,11</strong>
              </td>
              <td>
                <strong>19.8%</strong>
              </td>
              <td>
                <strong>86</strong>
              </td>
            </tr>
            <tr style={{ background: "#2c3e50", color: "white" }}>
              <td colSpan={2}>
                <strong>TOTAL GERAL</strong>
              </td>
              <td>
                <strong>R$ 4.137.259,89</strong>
              </td>
              <td>
                <strong>100%</strong>
              </td>
              <td>
                <strong>421</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="footer">
        <p>Relatório gerado em 03/11/2025 através do WE Proposals - Sistema de Orçamentos</p>
        <p>{reportData.company.name}</p>
      </div>
    </div>
  );
};

export default FinanceExecutiveReport;
