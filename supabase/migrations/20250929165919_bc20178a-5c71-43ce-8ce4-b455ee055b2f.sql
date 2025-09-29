-- Update the version with fictional budget data
UPDATE versions 
SET payload = '{
  "cliente": "Empresa ABC Ltda",
  "produto": "Campanha Verão 2024",
  "job": "ABC-VER-001",
  "campanha": "Verão na Praia",
  "midias": "TV, Digital, OOH",
  "territorio": "Nacional",
  "periodo": "3 meses",
  "filme": {
    "subtotal": 85000
  },
  "audio": {
    "subtotal": 12000
  },
  "cc": {
    "qtd": 3,
    "total": 1500
  },
  "imagens": {
    "items": [
      {"descricao": "Banco Getty Images - 5 fotos", "valor": 800},
      {"descricao": "Shutterstock Premium - 3 videos", "valor": 1200}
    ],
    "total": 2000
  },
  "tipo_audio": "Trilha sonora + locução",
  "duracao": "30 segundos",
  "total": 100500
}',
total_geral = 100500,
honorario_total = 15000
WHERE id = 'c7206923-8b49-472a-926e-ca4495d63937'