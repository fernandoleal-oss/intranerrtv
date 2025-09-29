import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Home } from "lucide-react";
import logoWE from "@/assets/Logo_WE.png";

export default function PdfView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      // pegue a última versão; ajuste consulta conforme seu schema
      const { data: v } = await supabase
        .from("versions")
        .select("*, budgets:budget_id(display_id, type)")
        .eq("budget_id", id)
        .order("versao", { ascending: false })
        .limit(1)
        .maybeSingle();
      setData(v);
    })();
  }, [id]);

  if (!data) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Carregando orçamento...</p>
      </div>
    </div>
  )

  const payload = data.payload || {};
  const fmt = (n: number) => (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <div className="bg-white text-zinc-900 min-h-screen py-8 print:py-0">
      {/* Navigation Buttons - Hide on Print */}
      <div className="no-print mb-6">
        <div className="max-w-3xl mx-auto px-6 flex gap-3">
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="gap-2 nav-button"
          >
            <Home className="h-4 w-4" />
            Página Inicial
          </Button>
          <Button 
            onClick={() => navigate(`/budget/${id}/edit`)}
            variant="outline"
            className="gap-2 nav-button"
          >
            <Edit className="h-4 w-4" />
            Editar Orçamento
          </Button>
          <Button 
            onClick={() => window.print()}
            className="gap-2 btn-gradient ml-auto"
          >
            Imprimir PDF
          </Button>
        </div>
      </div>
      
      <div className="max-w-3xl mx-auto px-6 print:px-0">
        <header className="pdf-header flex items-center justify-between mb-8 print:mb-6 p-6 rounded-lg">
          <div className="flex items-center gap-6">
            <div className="bg-white p-3 rounded-lg">
              <img src={logoWE} alt="WE Logo" className="h-12 w-auto" />
            </div>
            <div className="text-sm text-white">
              <div className="font-semibold">WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA</div>
              <div>CNPJ: 05.265.118/0001-65</div>
              <div>R. Chilon, 381 - Vila Olímpia</div>
              <div>São Paulo - SP, 04552-030</div>
            </div>
          </div>
          <div className="text-right text-sm text-white">
            <div className="font-semibold">ID: {data.budgets?.display_id || id}</div>
            <div>Tipo: {data.budgets?.type?.toUpperCase()}</div>
            <div>Versão: v{data.versao}</div>
            <div className="text-white/70">Data: {new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </header>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">Orçamento de Produção</h1>
          <div className="text-sm text-muted-foreground">
            Documento gerado em {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* Informações do Cliente */}
        {(payload.cliente || payload.produto) && (
          <div className="mb-8 p-4 bg-muted/30 rounded-lg">
            <h2 className="font-semibold mb-3 text-lg">Informações do Cliente</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {payload.cliente && (
                <div>
                  <strong className="text-sm text-muted-foreground">Cliente:</strong>
                  <div className="font-medium">{payload.cliente}</div>
                </div>
              )}
              {payload.produto && (
                <div>
                  <strong className="text-sm text-muted-foreground">Produto:</strong>
                  <div className="font-medium">{payload.produto}</div>
                </div>
              )}
              {payload.job && (
                <div>
                  <strong className="text-sm text-muted-foreground">Job:</strong>
                  <div className="font-medium">{payload.job}</div>
                </div>
              )}
              {payload.campanha && (
                <div>
                  <strong className="text-sm text-muted-foreground">Campanha:</strong>
                  <div className="font-medium">{payload.campanha}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Seções por tipo */}
        <div className="space-y-6">
          {payload.filme && (
            <section className="p-4 border border-border rounded-lg">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                🎬 Produção de Filme
              </h2>
              <div className="bg-muted/20 p-3 rounded">
                <div className="grid md:grid-cols-2 gap-4 mb-3">
                  {payload.midias && (
                    <div>
                      <span className="text-sm text-muted-foreground">Mídias:</span>
                      <div className="font-medium">{payload.midias}</div>
                    </div>
                  )}
                  {payload.territorio && (
                    <div>
                      <span className="text-sm text-muted-foreground">Território:</span>
                      <div className="font-medium">{payload.territorio}</div>
                    </div>
                  )}
                  {payload.periodo && (
                    <div>
                      <span className="text-sm text-muted-foreground">Período:</span>
                      <div className="font-medium">{payload.periodo}</div>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Subtotal:</span>
                  <span className="font-bold ml-2">R$ {fmt(payload.filme.subtotal || 0)}</span>
                </div>
              </div>
            </section>
          )}

          {payload.audio && (
            <section className="p-4 border border-border rounded-lg">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                🎵 Produção de Áudio
              </h2>
              <div className="bg-muted/20 p-3 rounded">
                <div className="grid md:grid-cols-2 gap-4 mb-3">
                  {payload.tipo_audio && (
                    <div>
                      <span className="text-sm text-muted-foreground">Tipo:</span>
                      <div className="font-medium">{payload.tipo_audio}</div>
                    </div>
                  )}
                  {payload.duracao && (
                    <div>
                      <span className="text-sm text-muted-foreground">Duração:</span>
                      <div className="font-medium">{payload.duracao}</div>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Subtotal:</span>
                  <span className="font-bold ml-2">R$ {fmt(payload.audio.subtotal || 0)}</span>
                </div>
              </div>
            </section>
          )}

          {payload.cc && (
            <section className="p-4 border border-border rounded-lg">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                📝 Closed Caption
              </h2>
              <div className="bg-muted/20 p-3 rounded">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-muted-foreground">Versões:</span>
                    <span className="font-medium ml-2">{payload.cc.qtd || 0}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <span className="font-bold ml-2">R$ {fmt(payload.cc.total || 0)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {payload.imagens && payload.imagens.items && payload.imagens.items.length > 0 && (
            <section className="p-4 border border-border rounded-lg">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                🖼️ Compra de Imagens
              </h2>
              <div className="bg-muted/20 p-3 rounded">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-muted-foreground">Itens:</span>
                    <span className="font-medium ml-2">{payload.imagens.items.length}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <span className="font-bold ml-2">R$ {fmt(payload.imagens.total || 0)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Total Geral */}
        <section className="mt-8 p-6 bg-primary/5 border-2 border-primary/20 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Resumo Financeiro</h2>
          </div>
          <div className="space-y-3">
            {data.honorario_total > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Honorário:</span>
                <span className="font-semibold">R$ {fmt(data.honorario_total)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-2xl font-bold border-t pt-3">
              <span>Total Geral:</span>
              <span className="text-primary">R$ {fmt(data.total_geral || payload.total || 0)}</span>
            </div>
          </div>
        </section>

        {/* Observações e Termos */}
        <section className="mt-8 p-4 bg-muted/10 rounded-lg border-l-4 border-primary">
          <h3 className="font-semibold mb-3">Termos e Condições</h3>
          <div className="text-sm space-y-2 text-muted-foreground leading-relaxed">
            <p><strong>📅 Validade:</strong> 7 dias a partir da data deste orçamento.</p>
            <p><strong>📋 Inclui:</strong> os itens e serviços listados neste documento.</p>
            <p><strong>⏱️ Prazos:</strong> condicionados à aprovação do escopo com a produtora e à disponibilidade/agenda da produtora.</p>
            <p><strong>📺 Usos:</strong> conforme mídias, território e período informados neste orçamento.</p>
            <p><strong>⚠️ Importante:</strong> Alterações de escopo e/ou entregáveis geram nova versão deste orçamento.</p>
          </div>
        </section>

        <div className="mt-10 flex gap-3 no-print">
          <Button 
            onClick={() => window.print()} 
            className="btn-gradient"
          >
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}