// src/main.tsx
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// ✅ Log de versão (apenas em dev)
if (import.meta.env.DEV) {
  // Deve aparecer UMA vez e mostrar 18.2.0
  console.log('[React version]', React.version)
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Elemento #root não encontrado no index.html')
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)
