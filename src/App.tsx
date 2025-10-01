// src/App.tsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/components/AuthProvider";

// Lazy-load das páginas
const Login          = lazy(() => import("@/pages/Login"));
const Home           = lazy(() => import("@/pages/Home"));
const NovoFilme      = lazy(() => import("@/pages/new/Filme"));
const NovoAudio      = lazy(() => import("@/pages/new/Audio"));
const NovoCC         = lazy(() => import("@/pages/new/CC"));
const NovaImagem     = lazy(() => import("@/pages/new/Imagem"));
const PdfView        = lazy(() => import("@/pages/budget/Pdf"));
const BudgetList     = lazy(() => import("@/pages/BudgetList"));
const BudgetEdit     = lazy(() => import("@/pages/budget/Edit"));
const Finance        = lazy(() => import("@/pages/Finance"));
const Direitos       = lazy(() => import("@/pages/Direitos"));
const Orcamentos     = lazy(() => import("@/pages/Orcamentos"));
const OrcamentoNovo  = lazy(() => import("@/pages/OrcamentoNovo"));
const ComparadorBYD  = lazy(() => import("@/pages/ComparadorBYD"));

const queryClient = new QueryClient();

/** Skeleton de carregamento */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted">
      <div className="animate-pulse space-y-4 text-center">
        <div className="h-8 w-40 bg-muted rounded mx-auto" />
        <div className="h-4 w-56 bg-muted/70 rounded mx-auto" />
      </div>
    </div>
  );
}

/** Voltar ao topo ao trocar de rota */
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** Rota protegida por autenticação */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

/** 404 amigável dentro da área autenticada */
function NotFoundAuthed() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="text-muted-foreground">
          O endereço acessado não existe. Você pode voltar para a página inicial.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Ir para Início
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* 👉 usamos o Tooltip do Radix e o Toaster do sonner  */}
      <Tooltip.Provider delayDuration={100}>
        <AuthProvider>
          {/* Toaster global de notificações */}
          <Toaster richColors position="top-right" closeButton />

          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                {/* Público */}
                <Route path="/login" element={<Login />} />

                {/* Área autenticada */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/new/filme"
                  element={
                    <ProtectedRoute>
                      <NovoFilme />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/new/audio"
                  element={
                    <ProtectedRoute>
                      <NovoAudio />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/new/cc"
                  element={
                    <ProtectedRoute>
                      <NovoCC />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/new/imagem"
                  element={
                    <ProtectedRoute>
                      <NovaImagem />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/budgets"
                  element={
                    <ProtectedRoute>
                      <BudgetList />
                    </ProtectedRoute>
                  }
                />

                {/* /budget/:id abre o orçamento; /budget/:id/edit mantido por compatibilidade */}
                <Route
                  path="/budget/:id"
                  element={
                    <ProtectedRoute>
                      <BudgetEdit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/budget/:id/edit"
                  element={
                    <ProtectedRoute>
                      <BudgetEdit />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/budget/:id/pdf"
                  element={
                    <ProtectedRoute>
                      <PdfView />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/financeiro"
                  element={
                    <ProtectedRoute>
                      <Finance />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/direitos"
                  element={
                    <ProtectedRoute>
                      <Direitos />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/orcamentos"
                  element={
                    <ProtectedRoute>
                      <Orcamentos />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/orcamentos/novo"
                  element={
                    <ProtectedRoute>
                      <OrcamentoNovo />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/comparador-byd"
                  element={
                    <ProtectedRoute>
                      <ComparadorBYD />
                    </ProtectedRoute>
                  }
                />

                {/* 404 */}
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <NotFoundAuthed />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </Tooltip.Provider>
    </QueryClientProvider>
  );
}
