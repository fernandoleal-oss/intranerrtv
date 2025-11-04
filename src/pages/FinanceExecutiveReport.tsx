<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório Executivo - WE/MOTTA</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Arial, sans-serif;
        }

        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.2em;
            margin-bottom: 10px;
            font-weight: 300;
        }

        .header .subtitle {
            font-size: 1.1em;
            opacity: 0.9;
            margin-bottom: 20px;
        }

        .company-info {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 10px;
            margin-top: 15px;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }

        .card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            text-align: center;
            border-left: 4px solid #667eea;
            transition: transform 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
        }

        .card h3 {
            color: #2c3e50;
            font-size: 0.9em;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .card .value {
            font-size: 1.8em;
            font-weight: bold;
            color: #2c3e50;
            margin: 10px 0;
        }

        .card .trend {
            font-size: 0.9em;
            padding: 4px 12px;
            border-radius: 20px;
            display: inline-block;
        }

        .trend.positive {
            background: #d4edda;
            color: #155724;
        }

        .trend.negative {
            background: #f8d7da;
            color: #721c24;
        }

        .section {
            padding: 30px;
            border-bottom: 1px solid #e9ecef;
        }

        .section-title {
            color: #2c3e50;
            font-size: 1.4em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
            display: inline-block;
        }

        .insights-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .insight-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #e74c3c;
        }

        .insight-card.warning {
            border-left-color: #e74c3c;
        }

        .insight-card.info {
            border-left-color: #3498db;
        }

        .insight-card.success {
            border-left-color: #27ae60;
        }

        .supplier-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .supplier-table th {
            background: #34495e;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 500;
        }

        .supplier-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e9ecef;
        }

        .supplier-table tr:hover {
            background: #f8f9fa;
        }

        .supplier-table .highlight {
            background: #fff3cd;
            font-weight: bold;
        }

        .projection-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .projection-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
        }

        .projection-card .value {
            font-size: 1.8em;
            font-weight: bold;
            margin: 15px 0;
        }

        .risk-indicator {
            display: inline-block;
            padding: 8px 20px;
            background: #f39c12;
            color: white;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
        }

        .footer {
            background: #2c3e50;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 0.9em;
        }

        @media (max-width: 768px) {
            .summary-cards {
                grid-template-columns: 1fr;
                padding: 20px;
            }
            
            .supplier-table {
                font-size: 0.9em;
            }
            
            .header h1 {
                font-size: 1.8em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Cabeçalho -->
        <div class="header">
            <h1>Relatório Executivo de Faturamento</h1>
            <div class="subtitle">WE/MOTTA COMUNICAÇÃO - Sistema de Orçamentos</div>
            <div class="subtitle">Análise Consolidada BYD - Período: 6 meses</div>
            <div class="company-info">
                <strong>CNPJ:</strong> 06.266.118/0001-65 | 
                <strong>Endereço:</strong> Rua Chilon, 381, Vila Olímpia, São Paulo - SP
            </div>
        </div>

        <!-- Cartões de Resumo -->
        <div class="summary-cards">
            <div class="card">
                <h3>Total Faturado</h3>
                <div class="value">R$ 4.137.259,89</div>
                <div class="trend positive">+229.2% crescimento médio</div>
            </div>
            <div class="card">
                <h3>Fornecedores Ativos</h3>
                <div class="value">22</div>
                <div class="trend">6 meses analisados</div>
            </div>
            <div class="card">
                <h3>Ticket Médio</h3>
                <div class="value">R$ 36.939,34</div>
                <div class="trend">30 transações/mês</div>
            </div>
            <div class="card">
                <h3>Retenção</h3>
                <div class="value">9%</div>
                <div class="trend">Fornecedores com múltiplos meses</div>
            </div>
        </div>

        <!-- Insights Executivos -->
        <div class="section">
            <h2 class="section-title">🎯 Insights Executivos</h2>
            <div class="insights-grid">
                <div class="insight-card warning">
                    <h4>Fornecedor Destaque</h4>
                    <p><strong>MONALISA STUDIO LTDA</strong> representa 23.6% do total faturado</p>
                </div>
                <div class="insight-card info">
                    <h4>Crescimento Mensal</h4>
                    <p>Último mês: <strong class="trend negative">-21.3%</strong></p>
                </div>
                <div class="insight-card warning">
                    <h4>Concentração</h4>
                    <p>Top 3 fornecedores: <strong>56.3%</strong> do total</p>
                </div>
            </div>
        </div>

        <!-- Análise de Risco -->
        <div class="section">
            <h2 class="section-title">📈 Análise de Concentração de Risco</h2>
            <div class="insights-grid">
                <div class="insight-card">
                    <h4>Top 1 Fornecedor</h4>
                    <p>20-24% do faturamento total</p>
                </div>
                <div class="insight-card warning">
                    <h4>Top 5 Fornecedores</h4>
                    <p>73.6% do faturamento total</p>
                </div>
                <div class="insight-card">
                    <h4>Classificação de Risco</h4>
                    <div class="risk-indicator">RISCO MÉDIO</div>
                </div>
            </div>
            <div class="insight-card info" style="margin-top: 20px;">
                <h4>Recomendações:</h4>
                <p>• Monitorar fornecedores estratégicos continuamente</p>
                <p>• Desenvolver fornecedores secundários para diversificação</p>
            </div>
        </div>

        <!-- Projeções -->
        <div class="section">
            <h2 class="section-title">🔮 Projeções de Faturamento</h2>
            <div class="projection-cards">
                <div class="projection-card">
                    <h4>Projeção 1</h4>
                    <div class="value">R$ 4.750.271,66</div>
                    <div class="trend positive">+229.2% vs anterior</div>
                </div>
                <div class="projection-card">
                    <h4>Projeção 2</h4>
                    <div class="value">R$ 15.636.901,45</div>
                    <div class="trend positive">+229.2% vs anterior</div>
                </div>
                <div class="projection-card">
                    <h4>Projeção 3</h4>
                    <div class="value">R$ 51.473.411,33</div>
                    <div class="trend positive">+220.2% vs anterior</div>
                </div>
            </div>
            <p style="margin-top: 15px; color: #666; font-size: 0.9em;">
                <em>Base: Média de crescimento dos últimos 6 meses</em>
            </p>
        </div>

        <!-- Ranking de Fornecedores -->
        <div class="section">
            <h2 class="section-title">📋 Ranking de Fornecedores</h2>
            <table class="supplier-table">
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
                    <tr class="highlight">
                        <td>1</td>
                        <td>MONALISA STUDIO LTDA</td>
                        <td>R$ 976.394,78</td>
                        <td>23.6%</td>
                        <td>98</td>
                    </tr>
                    <tr class="highlight">
                        <td>2</td>
                        <td>O2 FILMES PUBLICITARIOS LTDA</td>
                        <td>R$ 761.166,00</td>
                        <td>18.4%</td>
                        <td>77</td>
                    </tr>
                    <tr class="highlight">
                        <td>3</td>
                        <td>SUBSOUND AUDIO PRODUÇÕES LTDA</td>
                        <td>R$ 591.000,00</td>
                        <td>14.3%</td>
                        <td>60</td>
                    </tr>
                    <tr>
                        <td>4</td>
                        <td>STINK SP PRODUCAO DE FILMES LTDA</td>
                        <td>R$ 414.950,00</td>
                        <td>10.0%</td>
                        <td>42</td>
                    </tr>
                    <tr>
                        <td>5</td>
                        <td>TRUST DESIGN MULTIMIDIA S/S LTDA</td>
                        <td>R$ 299.800,00</td>
                        <td>7.2%</td>
                        <td>30</td>
                    </tr>
                    <tr>
                        <td>6</td>
                        <td>MELLODIA FILMES E PRODUÇÕES EIRELLI</td>
                        <td>R$ 275.000,00</td>
                        <td>6.6%</td>
                        <td>28</td>
                    </tr>
                    <tr>
                        <td colspan="2"><strong>Demais fornecedores (16)</strong></td>
                        <td><strong>R$ 819.949,11</strong></td>
                        <td><strong>19.8%</strong></td>
                        <td><strong>86</strong></td>
                    </tr>
                    <tr style="background: #2c3e50; color: white;">
                        <td colspan="2"><strong>TOTAL GERAL</strong></td>
                        <td><strong>R$ 4.137.259,89</strong></td>
                        <td><strong>100%</strong></td>
                        <td><strong>421</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Rodapé -->
        <div class="footer">
            <p>Relatório gerado em 03/11/2025 através do WE Proposals - Sistema de Orçamentos</p>
            <p>WE/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA</p>
        </div>
    </div>

    <script>
        // Efeitos interativos simples
        document.addEventListener('DOMContentLoaded', function() {
            // Animação de entrada dos cards
            const cards = document.querySelectorAll('.card, .insight-card, .projection-card');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    card.style.transition = 'all 0.6s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
            });

            // Destaque interativo na tabela
            const tableRows = document.querySelectorAll('.supplier-table tbody tr');
            tableRows.forEach(row => {
                row.addEventListener('mouseenter', function() {
                    this.style.backgroundColor = '#e3f2fd';
                    this.style.transition = 'background-color 0.3s ease';
                });
                
                row.addEventListener('mouseleave', function() {
                    if (!this.classList.contains('highlight')) {
                        this.style.backgroundColor = '';
                    }
                });
            });
        });
    </script>
</body>
</html>