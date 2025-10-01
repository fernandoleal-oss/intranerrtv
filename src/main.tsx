import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import React from 'react'
import * as ReactDOMClient from 'react-dom/client'

if (import.meta.env.DEV) {
  // Deve imprimir 18.2.0 uma única vez
  console.log('[React version]', React.version)
  // Algumas builds expõem .version no ReactDOM também:
  // @ts-ignore
  console.log('[ReactDOM version]', (ReactDOMClient as any).version || 'n/a')
}


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
