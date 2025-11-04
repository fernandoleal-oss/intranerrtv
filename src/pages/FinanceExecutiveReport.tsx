<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Faturamento BYD - 2025</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
        }
        .summary {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .summary-box {
            background-color: #3498db;
            color: white;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            flex: 1;
            margin: 0 10px;
            min-width: 200px;
        }
        .summary-box h3 {
            margin-top: 0;
        }
        .summary-box .amount {
            font-size: 24px;
            font-weight: bold;
        }
        .charts-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 30px;
        }
        .chart-box {
            flex: 1;
            min-width: 300px;
            background-color: white;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 0 5px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .table-container {
            max-height: 400px;
            overflow-y: auto;
            margin-bottom: 30px;
        }
        .period-filter {
            margin-bottom: 20px;
        }
        .period-filter select {
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        @media (max-width: 768px) {
            .summary {
                flex-direction: column;
            }
            .summary-box {
                margin: 10px 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Relatório de Faturamento BYD - 2025</h1>
        
        <div class="summary">
            <div class="summary-box">
                <h3>Valor Total do Período</h3>
                <div class="amount">R$ 8.647.241,21</div>
            </div>
            <div class="summary-box">
                <h3>Total por Fornecedor</h3>
                <div class="amount">R$ 4.065.259,89</div>
            </div>
            <div class="summary-box">
                <h3>Número de Fornecedores</h3>
                <div class="amount">22</div>
            </div>
        </div>
        
        <div class="period-filter">
            <label for="periodSelect">Filtrar por Período:</label>
            <select id="periodSelect">
                <option value="all">Todos os Períodos</option>
                <option value="01/2025">Janeiro 2025</option>
                <option value="02/2025">Fevereiro 2025</option>
                <option value="03/2025">Março 2025</option>
                <option value="04/2025">Abril 2025</option>
                <option value="05/2025">Maio 2025</option>
                <option value="06/2025">Junho 2025</option>
                <option value="07/2025">Julho 2025</option>
                <option value="08/2025">Agosto 2025</option>
                <option value="09/2025">Setembro 2025</option>
                <option value="10/2025">Outubro 2025</option>
            </select>
        </div>
        
        <div class="charts-container">
            <div class="chart-box">
                <canvas id="supplierChart"></canvas>
            </div>
            <div class="chart-box">
                <canvas id="periodChart"></canvas>
            </div>
        </div>
        
        <h2>Detalhamento por Fornecedor</h2>
        <div class="table-container">
            <table id="supplierTable">
                <thead>
                    <tr>
                        <th>Fornecedor</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>MONALISA STUDIO LTDA</td><td>R$ 976.394,78</td></tr>
                    <tr><td>O2 FILMES PUBLICITARIOS LTDA</td><td>R$ 761.166,00</td></tr>
                    <tr><td>SUBSOUND AUDIO PRODUÇÕES LTDA</td><td>R$ 591.000,00</td></tr>
                    <tr><td>STINK SP PRODUCAO DE FILMES LTDA</td><td>R$ 414.950,00</td></tr>
                    <tr><td>TRUST DESIGN MULTIMIDIA S/S LTDA</td><td>R$ 299.800,00</td></tr>
                    <tr><td>MELLODIA FILMES E PRODUÇÕES EIRELLI</td><td>R$ 275.000,00</td></tr>
                    <tr><td>CINE CINEMATOGRÁFICA LTDA</td><td>R$ 192.732,00</td></tr>
                    <tr><td>CANJA PRODUÇÕES MUSICAIS LTDA-ME</td><td>R$ 73.000,00</td></tr>
                    <tr><td>PALMA EVENTOS E PRODUÇÕES CULTURAIS LTDA</td><td>R$ 66.000,00</td></tr>
                    <tr><td>555 STUDIOS LTDA</td><td>R$ 60.000,00</td></tr>
                    <tr><td>ANTFOOD PRODUÇÕES LTDA</td><td>R$ 65.000,00</td></tr>
                    <tr><td>MARCOS LOPES STUDIO E PHOTO LTDA</td><td>R$ 50.000,00</td></tr>
                    <tr><td>BUMBLEBEAT AUDIO LTDA</td><td>R$ 50.000,00</td></tr>
                    <tr><td>CAIO SOARES DIRECAO DE ARTE LTDA</td><td>R$ 45.000,00</td></tr>
                    <tr><td>EVIL TWIN</td><td>R$ 45.000,00</td></tr>
                    <tr><td>MELANINA FILMES LTDA</td><td>R$ 34.719,02</td></tr>
                    <tr><td>LOC LACADORA DE EQUIPAMENTOS CINEMAT</td><td>R$ 18.000,00</td></tr>
                    <tr><td>PICTURE HOUSE PRODUÇÕES LTDA</td><td>R$ 17.631,52</td></tr>
                    <tr><td>CUSTO INTERNO / ANCINE</td><td>R$ 11.100,44</td></tr>
                    <tr><td>FM MORAES FILMES</td><td>R$ 9.605,00</td></tr>
                    <tr><td>G&S IMAGENS DO BRASIL LTDA</td><td>R$ 6.800,00</td></tr>
                    <tr><td>GETTY IMAGE</td><td>R$ 2.361,13</td></tr>
                </tbody>
            </table>
        </div>
        
        <h2>Transações Detalhadas</h2>
        <div class="table-container">
            <table id="transactionsTable">
                <thead>
                    <tr>
                        <th>Período</th>
                        <th>Fornecedor</th>
                        <th>Produto</th>
                        <th>Valor</th>
                        <th>Vencimento</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- As transações serão preenchidas via JavaScript -->
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // Dados dos fornecedores
        const supplierData = {
            labels: [
                'MONALISA STUDIO LTDA', 'O2 FILMES', 'SUBSOUND AUDIO', 
                'STINK SP', 'TRUST DESIGN', 'MELLODIA FILMES', 'CINE CINEMATOGRÁFICA',
                'CANJA PRODUÇÕES', 'PALMA EVENTOS', '555 STUDIOS'
            ],
            datasets: [{
                label: 'Valor por Fornecedor (R$)',
                data: [976394.78, 761166.00, 591000.00, 414950.00, 299800.00, 275000.00, 192732.00, 73000.00, 66000.00, 60000.00],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 205, 86, 0.7)',
                    'rgba(201, 203, 207, 0.7)',
                    'rgba(0, 128, 0, 0.7)',
                    'rgba(139, 69, 19, 0.7)',
                    'rgba(255, 0, 0, 0.7)'
                ],
                borderColor: [
                    'rgb(54, 162, 235)',
                    'rgb(255, 99, 132)',
                    'rgb(75, 192, 192)',
                    'rgb(255, 159, 64)',
                    'rgb(153, 102, 255)',
                    'rgb(255, 205, 86)',
                    'rgb(201, 203, 207)',
                    'rgb(0, 128, 0)',
                    'rgb(139, 69, 19)',
                    'rgb(255, 0, 0)'
                ],
                borderWidth: 1
            }]
        };

        // Dados por período
        const periodData = {
            labels: ['Jan/25', 'Fev/25', 'Mar/25', 'Abr/25', 'Mai/25', 'Jun/25', 'Jul/25', 'Ago/25', 'Set/25', 'Out/25'],
            datasets: [{
                label: 'Valor por Período (R$)',
                data: [80000, 216000, 594012, 24052, 282466.26, 1011361.13, 84000, 106323, 399999.78, 385025],
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1
            }]
        };

        // Configuração do gráfico de fornecedores
        const supplierCtx = document.getElementById('supplierChart').getContext('2d');
        const supplierChart = new Chart(supplierCtx, {
            type: 'bar',
            data: supplierData,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Valores por Fornecedor'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });

        // Configuração do gráfico por período
        const periodCtx = document.getElementById('periodChart').getContext('2d');
        const periodChart = new Chart(periodCtx, {
            type: 'line',
            data: periodData,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Valores por Período'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });

        // Dados das transações
        const transactions = [
            { period: '01/2025', supplier: 'MONALISA STUDIO LTDA', product: 'PRODUÇÃO', value: 26000, dueDate: '07/02/2025' },
            { period: '01/2025', supplier: 'SUBSOUND AUDIO PRODUÇÕES LTDA', product: 'PRODUTORA DE SOM', value: 14000, dueDate: '07/02/2025' },
            { period: '01/2025', supplier: 'MONALISA STUDIO LTDA', product: 'PRODUÇÃO', value: 26000, dueDate: '07/02/2025' },
            { period: '01/2025', supplier: 'SUBSOUND AUDIO PRODUÇÕES LTDA', product: 'PRODUTORA DE SOM', value: 14000, dueDate: '07/02/2025' },
            { period: '01/2025', supplier: 'MONALISA STUDIO LTDA', product: 'PRODUÇÃO', value: 40000, dueDate: '24/02/2025' },
            { period: '01/2025', supplier: 'SUBSOUND AUDIO PRODUÇÕES LTDA', product: 'PRODUTORA DE SOM', value: 16000, dueDate: '24/02/2025' },
            { period: '01/2025', supplier: 'MONALISA STUDIO LTDA', product: 'PRODUÇÃO', value: 25000, dueDate: '24/02/2025' },
            { period: '01/2025', supplier: 'MONALISA STUDIO LTDA', product: 'PRODUÇÃO', value: 11000, dueDate: '24/02/2025' },
            { period: '01/2025', supplier: 'MONALISA STUDIO LTDA', product: 'PRODUÇÃO', value: 13000, dueDate: '24/02/2025' },
            { period: '01/2025', supplier: 'PALMA EVENTOS E PRODUÇÕES CULTURAIS LTDA', product: 'PRODUÇÃO', value: 40000, dueDate: '24/02/2025' },
            { period: '01/2025', supplier: 'SUBSOUND AUDIO PRODUÇÕES LTDA', product: 'PRODUTORA DE SOM', value: 40000, dueDate: '24/02/2025' },
            { period: '01/2025', supplier: 'CINE CINEMATOGRÁFICA LTDA', product: 'HONORÁRIOS', value: 24012, dueDate: '17/03/2025' },
            // Adicione mais transações conforme necessário
        ];

        // Preencher tabela de transações
        const transactionsTable = document.getElementById('transactionsTable').getElementsByTagName('tbody')[0];
        
        transactions.forEach(transaction => {
            const row = transactionsTable.insertRow();
            row.insertCell(0).textContent = transaction.period;
            row.insertCell(1).textContent = transaction.supplier;
            row.insertCell(2).textContent = transaction.product;
            row.insertCell(3).textContent = 'R$ ' + transaction.value.toLocaleString('pt-BR');
            row.insertCell(4).textContent = transaction.dueDate;
        });

        // Filtro por período
        document.getElementById('periodSelect').addEventListener('change', function() {
            const selectedPeriod = this.value;
            
            // Limpar tabela
            while(transactionsTable.rows.length > 0) {
                transactionsTable.deleteRow(0);
            }
            
            // Preencher com transações filtradas
            const filteredTransactions = selectedPeriod === 'all' 
                ? transactions 
                : transactions.filter(t => t.period === selectedPeriod);
                
            filteredTransactions.forEach(transaction => {
                const row = transactionsTable.insertRow();
                row.insertCell(0).textContent = transaction.period;
                row.insertCell(1).textContent = transaction.supplier;
                row.insertCell(2).textContent = transaction.product;
                row.insertCell(3).textContent = 'R$ ' + transaction.value.toLocaleString('pt-BR');
                row.insertCell(4).textContent = transaction.dueDate;
            });
        });
    </script>
</body>
</html>