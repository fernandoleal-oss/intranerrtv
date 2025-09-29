import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/components/AuthProvider'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import NovoFilme from '@/pages/new/Filme'
import NovoAudio from '@/pages/new/Audio'
import NovoCC from '@/pages/new/CC'
import NovaImagem from '@/pages/new/Imagem'
import PdfView from '@/pages/budget/Pdf'
import BudgetList from '@/pages/BudgetList'
import BudgetEdit from '@/pages/BudgetEdit'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-8 w-32 bg-muted rounded mx-auto"></div>
          <div className="h-4 w-48 bg-muted/70 rounded mx-auto"></div>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
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
            <Route
              path="/budget/:id"
              element={
                <ProtectedRoute>
                  <BudgetList />
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
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
