// src/main.tsx
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

if (import.meta.env.DEV) {
  console.log('[React version]', React.version) // deve aparecer 18.2.0 ou 18.3.1 UMA vez
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Elemento #root não encontrado no index.html')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)
