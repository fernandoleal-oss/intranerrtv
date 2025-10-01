// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // força o Vite a usar uma única instância de react/react-dom
    dedupe: ["react", "react-dom"],
  },
});
