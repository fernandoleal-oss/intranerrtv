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

  if (!data) return <div className="p-8 text-white/70">Carregando…</div>;

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

        <h1 className="text-2xl font-semibold mb-4">Orçamento de Produção</h1>

        {/* Cliente e Produto */}
        {payload.cliente && (
          <div className="mb-6">
            <div><strong>Cliente:</strong> {payload.cliente}</div>
            {payload.produto && <div><strong>Produto:</strong> {payload.produto}</div>}
          </div>
        )}

        {/* Blocos por tipo */}
        {payload.filme && (
          <section className="mb-4">
            <h2 className="font-medium mb-2">Produção de Filme</h2>
            <div className="bg-zinc-50 p-3 rounded">
              <div>Subtotal: R$ {fmt(payload.filme.subtotal || 0)}</div>
            </div>
          </section>
        )}

        {payload.audio && (
          <section className="mb-4">
            <h2 className="font-medium mb-2">Produção de Áudio</h2>
            <div className="bg-zinc-50 p-3 rounded">
              <div>Subtotal: R$ {fmt(payload.audio.subtotal || 0)}</div>
            </div>
          </section>
        )}

        {payload.cc && (
          <section className="mb-4">
            <h2 className="font-medium mb-2">Closed Caption</h2>
            <div className="bg-zinc-50 p-3 rounded">
              <div>Versões: {payload.cc.qtd || 0}</div>
              <div>Total: R$ {fmt(payload.cc.total || 0)}</div>
            </div>
          </section>
        )}

        {payload.imagens && payload.imagens.items && payload.imagens.items.length > 0 && (
          <section className="mb-4">
            <h2 className="font-medium mb-2">Compra de Imagens</h2>
            <div className="bg-zinc-50 p-3 rounded">
              <div>Itens: {payload.imagens.items.length}</div>
              <div>Total: R$ {fmt(payload.imagens.total || 0)}</div>
            </div>
          </section>
        )}

        {/* Total */}
        <section className="mt-6 border-t pt-4">
          {data.honorario_total > 0 && (
            <div className="mb-2">Honorário: R$ {fmt(data.honorario_total)}</div>
          )}
          <div className="text-lg font-semibold">Total Geral: R$ {fmt(data.total_geral || payload.total || 0)}</div>
        </section>

        {/* Observações */}
        <section className="mt-8 text-sm text-zinc-600 space-y-1">
          <p><strong>Validade:</strong> 7 dias a partir da data deste orçamento.</p>
          <p><strong>Inclui:</strong> os itens e serviços listados neste documento.</p>
          <p><strong>Prazos:</strong> condicionados à aprovação do escopo com a produtora e à disponibilidade/agenda da produtora.</p>
          <p><strong>Usos:</strong> conforme mídias, território e período informados neste orçamento.</p>
          <p><strong>Alterações de escopo e/ou entregáveis geram nova versão deste orçamento.</strong></p>
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