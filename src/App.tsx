import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/components/AuthProvider'

// ⬇️ IMPORTS extras que o componente usa (adicione junto com as outras)
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ArrowLeft, Printer } from "lucide-react";

// ⬇️ COMPONENTE BudgetPdf (cole inteiro no App.tsx, acima do export default do App)
function BudgetPdf() {
  type BudgetType = "filme" | "audio" | "imagem" | "cc";

  interface QuoteFilm {
    id: string;
    produtora: string;
    escopo: string;
    valor: number;           // valor unitário
    diretor?: string;
    tratamento?: string;
    desconto?: number;       // desconto absoluto
    quantidade?: number;     // opcional
    qtd?: number;            // alias opcional
  }

  interface BudgetPayload {
    type: BudgetType;
    produtor?: string;
    email?: string;
    cliente?: string;
    produto?: string;
    job?: string;
    midias?: string;
    territorio?: string;
    periodo?: string;
    quotes_film?: QuoteFilm[];
    honorario_perc?: number;
    total: number;
    pendente_pagamento?: boolean;
    observacoes_faturamento?: string;
  }

  const BRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

  const { id } = useParams(); // :id da rota /budget/:id/pdf
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<BudgetPayload | null>(null);
  const [displayId, setDisplayId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // carrega orçamento + última versão
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: budgetRow, error: bErr } = await supabase
          .from("budgets")
          .select("id, display_id, created_at")
          .eq("id", id)
          .maybeSingle();
        if (bErr) throw bErr;

        if (budgetRow) {
          setDisplayId(budgetRow.display_id || budgetRow.id);
          setCreatedAt(budgetRow.created_at || null);
        }

        const { data: versionRow, error: vErr } = await supabase
          .from("versions")
          .select("id, payload, created_at")
          .eq("budget_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (vErr) throw vErr;

        if (!versionRow?.payload) {
          setError("Nenhuma versão encontrada para este orçamento.");
        } else {
          setPayload(versionRow.payload as BudgetPayload);
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Erro ao carregar orçamento.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // cálculos
  const linhas = useMemo(() => (payload?.quotes_film || []), [payload]);

  const subtotal = useMemo(() => {
    return linhas.reduce((s, q) => {
      const qty = Number(q.quantidade ?? q.qtd ?? 1);
      const unit = Number(q.valor || 0);
      const desc = Number(q.desconto || 0);
      return s + (unit * qty - desc);
    }, 0);
  }, [linhas]);

  const honorario = useMemo(
    () => subtotal * ((payload?.honorario_perc || 0) / 100),
    [subtotal, payload?.honorario_perc]
  );

  const totalGeral = useMemo(
    () => payload?.total ?? subtotal + honorario,
    [payload?.total, subtotal, honorario]
  );

  const isAudio = payload?.type === "audio";

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Cabeçalho preto com logo (mostra "WE" caso a imagem não exista) */}
      <div className="w-full bg-black text-white px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/brand/we-white.png"
            alt="WE"
            className="h-10 w-auto"
            onError={(e) => ((e.currentTarget.style.display = "none"))}
          />
          <span className="text-xl font-bold">WE</span>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold">Orçamento {displayId ? `#${displayId}` : ""}</div>
          <div className="text-sm opacity-80">
            {(createdAt ? new Date(createdAt) : new Date()).toLocaleDateString("pt-BR")}
          </div>
        </div>
      </div>

      {/* Barra de ação (não imprime) */}
      <div className="no-print flex items-center gap-2 px-8 pt-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* Corpo */}
      <div className="px-8 py-8">
        {loading ? (
          <div className="text-sm text-neutral-600">Gerando PDF…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <>
            {/* Selo NÃO FATURADO */}
            {payload?.pendente_pagamento && (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 text-red-800 px-4 py-3 flex gap-2">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div>
                  <div className="font-semibold">NÃO FATURADO</div>
                  <div>Precisa ser incluso em algum faturamento.</div>
                  {payload?.observacoes_faturamento && (
                    <div className="mt-1 opacity-90">Obs.: {payload.observacoes_faturamento}</div>
                  )}
                </div>
              </div>
            )}

            {/* Identificação */}
            <section className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Identificação</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div><span className="text-neutral-500">Cliente:</span> {payload?.cliente || "—"}</div>
                <div><span className="text-neutral-500">Produto:</span> {payload?.produto || "—"}</div>
                <div><span className="text-neutral-500">Job:</span> {payload?.job || "—"}</div>
                <div><span className="text-neutral-500">Mídias:</span> {payload?.midias || "—"}</div>
                <div><span className="text-neutral-500">Território:</span> {payload?.territorio || "—"}</div>
                <div><span className="text-neutral-500">Período:</span> {payload?.periodo || "—"}</div>
                <div><span className="text-neutral-500">Produtor:</span> {payload?.produtor || "—"}</div>
                <div><span className="text-neutral-500">E-mail:</span> {payload?.email || "—"}</div>
              </div>
            </section>

            {/* Cotações — ÁUDIO sem entregáveis/extras */}
            <section className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Cotações</h2>

              {isAudio ? (
                // ÁUDIO: Produtora / Escopo / Valor Unitário / Qtd / Desconto / Valor Total
                <div className="w-full border rounded-md overflow-hidden">
                  <div className="grid grid-cols-6 bg-neutral-100 text-xs font-medium px-3 py-2">
                    <div>Produtora</div>
                    <div>Escopo</div>
                    <div className="text-right">Valor Unitário</div>
                    <div className="text-right">Qtd</div>
                    <div className="text-right">Desconto</div>
                    <div className="text-right">Valor Total</div>
                  </div>
                  {(payload?.quotes_film || []).map((q) => {
                    const qty = Number(q.quantidade ?? q.qtd ?? 1);
                    const unit = Number(q.valor || 0);
                    const desc = Number(q.desconto || 0);
                    const totalLinha = unit * qty - desc;
                    return (
                      <div key={q.id} className="grid grid-cols-6 px-3 py-2 text-sm border-t">
                        <div>{q.produtora || "—"}</div>
                        <div>{q.escopo || "—"}</div>
                        <div className="text-right">{BRL(unit)}</div>
                        <div className="text-right">{qty}</div>
                        <div className="text-right">{BRL(desc)}</div>
                        <div className="text-right">{BRL(totalLinha)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Outros tipos (filme, imagem, cc)
                <div className="w-full border rounded-md overflow-hidden">
                  <div className="grid grid-cols-5 bg-neutral-100 text-xs font-medium px-3 py-2">
                    <div>Produtora</div>
                    <div>Escopo</div>
                    <div>Diretor</div>
                    <div>Tratamento</div>
                    <div className="text-right">Valor</div>
                  </div>
                  {(payload?.quotes_film || []).map((q) => (
                    <div key={q.id} className="grid grid-cols-5 px-3 py-2 text-sm border-t">
                      <div>{q.produtora || "—"}</div>
                      <div>{q.escopo || "—"}</div>
                      <div>{q.diretor || "—"}</div>
                      <div>{q.tratamento || "—"}</div>
                      <div className="text-right">{BRL(Number(q.valor) || 0)}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Resumo Financeiro */}
            <section className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Resumo Financeiro</h2>
              <div className="max-w-md ml-auto">
                <div className="flex justify-between text-sm py-1">
                  <span className="text-neutra


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
const Direitos    = lazy(() => import('@/pages/Direitos'))
const Orcamentos  = lazy(() => import('@/pages/Orcamentos'))
const OrcamentoNovo = lazy(() => import('@/pages/OrcamentoNovo'))
const ComparadorBYD = lazy(() => import('@/pages/ComparadorBYD'))

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
