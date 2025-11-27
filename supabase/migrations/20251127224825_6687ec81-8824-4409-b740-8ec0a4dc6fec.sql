-- Corrigir honorários para 10% em todos os clientes que têm honorário
UPDATE client_honorarios SET honorario_percent = 10 WHERE honorario_percent > 0;