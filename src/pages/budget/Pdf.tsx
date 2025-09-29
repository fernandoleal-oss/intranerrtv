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
        <div className="max-w-4xl mx-auto px-6 flex gap-3">
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
      
      <div className="max-w-4xl mx-auto px-6 print:px-0">
        {/* Cabeçalho Corporativo (estilo AP) */}
        <header className="bg-black text-white p-6 rounded-lg mb-6 print:rounded-none">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-6">
              <div className="bg-white p-2 rounded">
                <img src={logoWE} alt="WE Logo" className="h-10 w-auto" />
              </div>
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-sm">WF/MOTTA COMUNICAÇÃO, MARKETING E PUBLICIDADE LTDA</div>
                <div>CNPJ: 05.265.118/0001-65</div>
                <div>R. Chilon, 381 - Vila Olímpia, São Paulo - SP, 04552-030</div>
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-sm mb-1">Orçamento {data.budgets?.display_id || id}</div>
              <div>Versão: v{data.versao}</div>
              <div className="mt-2 text-white/80">
                Data: {payload.data_orcamento ? new Date(payload.data_orcamento).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
          
          {/* Bloco superior estilo AP */}
          <div className="border-t border-white/20 pt-4 mt-4">
            <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-white/60 block">Agência</span>
                <span className="font-semibold">AGÊNCIA WE</span>
              </div>
              <div>
                <span className="text-white/60 block">Cliente</span>
                <span className="font-semibold">{payload.cliente || '—'}</span>
              </div>
              <div>
                <span className="text-white/60 block">Produto</span>
                <span className="font-semibold">{payload.produto || '—'}</span>
              </div>
              <div>
                <span className="text-white/60 block">Job</span>
                <span className="font-semibold">{payload.job || '—'}</span>
              </div>
              <div>
                <span className="text-white/60 block">Competência</span>
                <span className="font-semibold">
                  {payload.data_orcamento 
                    ? new Date(payload.data_orcamento).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                    : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                  }
                </span>
              </div>
              <div>
                <span className="text-white/60 block">Tipo Orçamento</span>
                <span className="font-semibold">{data.budgets?.type?.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Sumário Detalhado (estilo AP) */}
        <section className="mb-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-300 pb-2">
            Detalhamento do Projeto
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="flex">
              <span className="font-semibold text-slate-700 w-40">Cliente:</span>
              <span className="text-slate-900">{payload.cliente || '—'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-slate-700 w-40">Produto:</span>
              <span className="text-slate-900">{payload.produto || '—'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-slate-700 w-40">Job:</span>
              <span className="text-slate-900">{payload.job || '—'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-slate-700 w-40">Mídias:</span>
              <span className="text-slate-900">{payload.midias || '—'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-slate-700 w-40">Território:</span>
              <span className="text-slate-900">{payload.territorio || '—'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-slate-700 w-40">Período:</span>
              <span className="text-slate-900">{payload.periodo || '—'}</span>
            </div>
            <div className="flex col-span-2">
              <span className="font-semibold text-slate-700 w-40">Entregáveis:</span>
              <span className="text-slate-900">{payload.entregaveis || '—'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-slate-700 w-40">Adaptações:</span>
              <span className="text-slate-900">{payload.adaptacoes || '—'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-slate-700 w-40">Data Orçamento:</span>
              <span className="text-slate-900">
                {payload.data_orcamento ? new Date(payload.data_orcamento).toLocaleDateString('pt-BR') : '—'}
              </span>
            </div>
            <div className="flex">
              <span className="font-semibold text-slate-700 w-40">Exclusividade Elenco:</span>
              <span className="text-slate-900">{payload.exclusividade_elenco || '—'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-slate-700 w-40">Áudio:</span>
              <span className="text-slate-900">{payload.audio || payload.tipo_audio || '—'}</span>
            </div>
          </div>
        </section>

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
                Produção de Filme
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
                Produção de Áudio
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
                Closed Caption
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
                Compra de Imagens
              </h2>
              <div className="bg-muted/20 p-3 rounded">
                <div className="space-y-2 mb-3">
                  {payload.imagens.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                      <span className="text-sm">{item.descricao}</span>
                      <span className="font-medium">R$ {fmt(item.valor || 0)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total de Imagens:</span>
                    <span className="font-bold">R$ {fmt(payload.imagens.total || 0)}</span>
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

        {/* Observações e Termos (estilo AP/OC) */}
        <section className="mt-8 space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-bold text-amber-900 mb-2">Observações</h3>
            <div className="text-sm text-amber-800 space-y-1">
              <p><strong>Território:</strong> {payload.territorio || 'Conforme especificado'}</p>
              <p><strong>Período:</strong> {payload.periodo || 'Conforme especificado'}</p>
              <p><strong>Mídia:</strong> {payload.midias || 'Conforme especificado'}</p>
              <p><strong>Validade do orçamento:</strong> 7 dias a partir da data de emissão</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h3 className="font-bold text-slate-900 mb-3">Termos e Condições</h3>
            <div className="text-sm text-slate-700 space-y-2 leading-relaxed">
              <p><strong>Inclui:</strong> Os itens e serviços discriminados neste documento.</p>
              <p><strong>Prazos:</strong> Condicionados à aprovação do escopo e disponibilidade dos fornecedores.</p>
              <p><strong>Usos:</strong> Conforme mídias, território e período informados neste orçamento.</p>
              <p><strong>Alterações:</strong> Mudanças de escopo e/ou entregáveis geram nova versão deste orçamento.</p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-3">Instruções para Faturamento</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• Enviar Nota Fiscal para: <strong>checking@we.com.br</strong></p>
              <p>• Constar número da AP/OC no corpo da Nota Fiscal</p>
              <p>• Dados bancários devem estar corretos e atualizados</p>
              <p>• Condições de pagamento: Conforme acordado (30/45/60 dias)</p>
              <p>• Para dúvidas sobre faturamento, contatar o departamento financeiro</p>
            </div>
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