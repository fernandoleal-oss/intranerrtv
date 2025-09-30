import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/components/AuthProvider'

/**
 * 💡 Lazy-load das páginas “pesadas” para melhorar o TTI.
 * (o Vite faz code-splitting automático por rota)
 */
const Login       = lazy(() => import('@/pages/Login'))
const Home        = lazy(() => import('@/pages/Home'))
const NovoFilme   = lazy(() => import('@/pages/new/Filme'))
const NovoAudio   = lazy(() => import('@/pages/new/Audio'))
const NovoCC      = lazy(() => import('@/pages/new/CC'))
const NovaImagem  = lazy(() => import('@/pages/new/Imagem'))
const PdfView     = lazy(() => import('@/pages/budget/Pdf'))
const BudgetList  = lazy(() => import('@/pages/BudgetList'))
const BudgetEdit  = lazy(() => import('@/pages/budget/Edit'))
const Finance     = lazy(() => import('@/pages/Finance'))

const queryClient = new QueryClient()

/** Skeleton leve usado no Suspense e quando o auth ainda está carregando */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted">
      <div className="animate-pulse space-y-4 text-center">
        <div className="h-8 w-40 bg-muted rounded mx-auto" />
        <div className="h-4 w-56 bg-muted/70 rounded mx-auto" />
      </div>
    </div>
  )
}

/** Sobe para o topo ao trocar de rota (UX melhor ao navegar) */
function ScrollToTop() {
  const { pathname } = useLocation()
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

/**
 * Guarda o destino pretendido quando o usuário não está logado
 * e devolve para a mesma página após login (state.from).
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
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
  )
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
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

              {/* 🔧 Correção importante: /budget/:id deve abrir o orçamento,
                  não a lista. Mantive também /budget/:id/edit por compatibilidade. */}
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

              {/* 404 — se estiver logado, mostra uma página amigável;
                  se não, o ProtectedRoute acima já redireciona para /login. */}
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
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
