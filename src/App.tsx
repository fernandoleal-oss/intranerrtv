import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import NovoFilme from "./pages/new/Filme";
import NovoAudio from "./pages/new/Audio";
import NovaImagem from "./pages/new/Imagem";
import NovoCC from "./pages/new/CC";
import PdfView from "./pages/budget/Pdf";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new/filme" element={<NovoFilme />} />
          <Route path="/new/audio" element={<NovoAudio />} />
          <Route path="/new/imagem" element={<NovaImagem />} />
          <Route path="/new/cc" element={<NovoCC />} />
          <Route path="/budget/:id/pdf" element={<PdfView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
