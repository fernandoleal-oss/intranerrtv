import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Copy,
  FileText,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Printer,
  RefreshCcw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/*********************** Types ***********************/
interface Fornecedor {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  desconto: number;
  link?: string;
}

interface ItemPreco {
  id: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
  observacao?: string;
}

interface Categoria {
  id: string;
  nome: string;
  ordem: number;
  visivel: boolean;
  podeExcluir: boolean;
  observacao?: string;
  modoPreco: "fechado" | "itens";
  fornecedores: Fornecedor[];
  itens: ItemPreco[];
}

interface Campanha {
  id: string;
  nome: string;
  categorias: Categoria[];
}

/*********************** Consts ***********************/
const CATEGORIAS_BASE = [
  { nome: "Filme", podeExcluir: false },
  { nome: "Áudio", podeExcluir: false },
  { nome: "Imagem", podeExcluir: false },
  { nome: "CC", podeExcluir: false },
];

const CATEGORIAS_SUGERIDAS = [
  "Tradução/Legendagem",
  "Produção de KV (Key Visual)",
  "Locução",
  "Trilha/Música",
  "Motion/Animação",
  "Edição/Finalização",
  "Captação/Filmagem/Still",
];

/*********************** Utils ***********************/
const normNum = (n: any) => (Number.isFinite(+n) ? +n : 0);
const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const hojeBR = () => new Intl.DateTimeFormat("pt-BR").format(new Date());
const esc = (s?: string) =>
  (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/*********************** Shared Hooks/Logic ***********************/
function useCalculos() {
  const finalDe = useCallback((f: Fornecedor) => normNum(f.valor) - normNum(f.desconto), []);

  const cheapestFornecedor = useCallback(
    (categoria: Categoria | null) => {
      if (!categoria || categoria.modoPreco !== "fechado" || categoria.fornecedores.length === 0) return null;
      return categoria.fornecedores.reduce((min, cur) => (finalDe(cur) < finalDe(min) ? cur : min));
    },
    [finalDe],
  );

  const calcularSubtotalCategoria = useCallback(
    (categoria: Categoria) => {
      if (categoria.modoPreco === "fechado") {
        const cheap = cheapestFornecedor(categoria);
        return cheap ? finalDe(cheap) : 0;
      }
      return categoria.itens.reduce((sum, item) => {
        const subtotal = normNum(item.quantidade) * normNum(item.valorUnitario) - normNum(item.desconto);
        return sum + subtotal;
      }, 0);
    },
    [cheapestFornecedor, finalDe],
  );

  const calcularSubtotalCampanha = useCallback(
    (campanha: Campanha) =>
      campanha.categorias.filter((c) => c.visivel).reduce((sum, c) => sum + calcularSubtotalCategoria(c), 0),
    [calcularSubtotalCategoria],
  );

  const bestFilmAudioCombo = useCallback(
    (camp: Campanha) => {
      const catFilme = camp.categorias.find((c) => c.nome.toLowerCase() === "filme");
      const catAudio = camp.categorias.find((c) => c.nome.toLowerCase() === "áudio");
      const fFilm = cheapestFornecedor(catFilme || null);
      const fAudio = cheapestFornecedor(catAudio || null);
      if (!fFilm || !fAudio) return { film: fFilm || null, audio: fAudio || null, sum: null as number | null };
      return { film: fFilm, audio: fAudio, sum: finalDe(fFilm) + finalDe(fAudio) };
    },
    [cheapestFornecedor, finalDe],
  );

  return { finalDe, cheapestFornecedor, calcularSubtotalCategoria, calcularSubtotalCampanha, bestFilmAudioCombo };
}

function snapshotOrcamento(args: {
  cliente: string;
  produto: string;
  job: string;
  observacoes: string;
  campanhas: Campanha[];
}) {
  const { cliente, produto, job, observacoes, campanhas } = args;
  return {
    cliente,
    produto,
    job,
    observacoes,
    hojeBR: hojeBR(),
    campanhas: campanhas.map((camp) => ({
      id: camp.id,
      nome: camp.nome,
      categorias: camp.categorias.map((c) => ({
        id: c.id,
        nome: c.nome,
        visivel: c.visivel,
        modoPreco: c.modoPreco,
        observacao: c.observacao,
        fornecedores: c.fornecedores.map((f) => ({
          id: f.id,
          nome: f.nome,
          descricao: f.descricao,
          valor: normNum(f.valor),
          desconto: normNum(f.desconto),
        })),
        itens: c.itens.map((it) => ({
          id: it.id,
          unidade: it.unidade,
          quantidade: normNum(it.quantidade),
          valorUnitario: normNum(it.valorUnitario),
          desconto: normNum(it.desconto),
          observacao: it.observacao,
        })),
      })),
    })),
  };
}

function templateHTML(jsonData: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Orçamento</title>
  <style>
    @page { size: A4; margin: 12mm; }
    html, body { padding:0; margin:0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    body { font-size:10.5px; line-height:1.32; color:#111; }
    .wrap { width: 794px; margin: 0 auto; transform-origin: top left; }
    .muted { color:#666 } .bold { font-weight:600 }
    .cab { border-bottom:1px solid #ddd; padding-bottom:8px; margin-bottom:8px; }
    .cab .linha { display:flex; justify-content:space-between; align-items:flex-start; }
    h1 { font-size:14px; margin:0 0 4px 0; } h3 { font-size:12.5px; margin:0; }
    .linha { display:flex; justify-content:space-between; align-items:center; gap:12px; }
    .lista { margin-top:4px } .linha + .linha { margin-top:2px }
    .bloco { margin: 16px 0 24px } .cat { margin-top:8px }
    .total { padding-top:8px; border-top:1px solid #ddd; display:flex; justify-content:space-between; align-items:center }
    .rod { margin-top:12px; padding-top:8px; border-top:1px solid #eee; color:#666; font-size:9.5px }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
    .tight p { margin: 2mm 0; } .small { font-size:9.5px }
  </style>
  </head><body>
  <div id="app" class="wrap"></div>
  <script>
    window.__DATA__ = ${jsonData};
    (function(){
      const data = window.__DATA__;
      const brl = (n) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0);
      const esc = (s) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
      const finalDe = (f) => (+f.valor||0) - (+f.desconto||0);
      const cheapFornecedor = (cat) => {
        if (!cat || cat.modoPreco!=="fechado" || !(cat.fornecedores||[]).length) return null;
        return cat.fornecedores.reduce((m,c)=> finalDe(c)<finalDe(m)?c:m);
      };
      const subtotalCat = (c) => c.modoPreco==="fechado" ? (cheapFornecedor(c)? finalDe(cheapFornecedor(c)) : 0) : (c.itens||[]).reduce((s,it)=> s + ((+it.quantidade||0)*(+it.valorUnitario||0) - (+it.desconto||0)),0);
      const subtotalCamp = (camp) => (camp.categorias||[]).filter(c=>c.visivel).reduce((s,c)=> s+subtotalCat(c),0);
      const total = (data.campanhas||[]).reduce((s,c)=> s+subtotalCamp(c),0);

      function renderFornecedores(cat){
        const arr = [...(cat.fornecedores||[])].sort((a,b)=> finalDe(a)-finalDe(b)).slice(0,3);
        const cheap = cheapFornecedor(cat);
        if (!arr.length) return '<div class="muted">Sem cotações adicionadas.</div>';
        return '<div class="lista js-lista-fornecedores">' + arr.map(f => (
          '<div class="linha js-forn">'+
            '<div><span class="bold">'+(esc(f.nome)||'Cotação')+'</span>' + (f.descricao ? '<span class="muted js-escopo"> — '+esc(f.descricao)+'</span>' : '') + (cheap && cheap.id===f.id ? ' <span>• ⭐</span>' : '') + '</div>' +
            '<div class="bold">'+brl(finalDe(f))+'</div>'+
          '</div>'
        )).join('') + ((cat.fornecedores||[]).length>3 ? '<div class="muted">+'+((cat.fornecedores||[]).length-3)+' no orçamento online</div>' : '') + '</div>';
      }

      function renderItens(cat){
        const arr = (cat.itens||[]).slice(0,5);
        return '<div class="lista js-lista-itens">' + arr.map(it => {
          const sub = (+it.quantidade||0)*(+it.valorUnitario||0) - (+it.desconto||0);
          return '<div class="linha js-item">' +
            '<div><span class="bold">'+(esc(it.unidade)||'Item')+'</span> <span class="muted"> '+(+it.quantidade||0)+' × '+brl(+it.valorUnitario||0)+(it.observacao?(' — '+esc(it.observacao)):'')+'</span></div>' +
            '<div class="bold">'+brl(sub)+'</div>' +
          '</div>';
        }).join('') + ((cat.itens||[]).length>5 ? '<div class="muted">+'+((cat.itens||[]).length-5)+' no orçamento online</div>' : '') + '</div>';
      }

      function renderCampanhas(){
        return (data.campanhas||[]).map(camp => {
          const cats = (camp.categorias||[]).filter(c=>c.visivel);
          return '<section class="bloco avoid-break">' +
            '<div class="linha cab-camp"><h3>'+esc(camp.nome)+'</h3><div class="bold">'+brl(subtotalCamp(camp))+'</div></div>' +
            cats.map(cat => (
              '<div class="cat avoid-break">' +
                '<div class="linha"><div class="bold">'+esc(cat.nome)+'</div><div>'+brl(subtotalCat(cat))+'</div></div>' +
                (cat.observacao ? '<div class="muted js-tratamento">'+esc(cat.observacao)+'</div>' : '') +
                (cat.modoPreco==="fechado" ? renderFornecedores(cat) : renderItens(cat)) +
              '</div>'
            )).join('') +
          '</section>';
        }).join('');
      }

      function layout(){
        return '' +
        '<header class="cab">' +
          '<div class="linha">' +
            '<h1>ORÇAMENTO • CONFIDENCIAL</h1>' +
            '<div class="small"><div>Data: '+esc(data.hojeBR||'')+'</div><div>Validade: 7 dias</div></div>' +
          '</div>' +
          '<div class="small muted">' +
            (data.cliente ? 'Cliente: <span class="bold">'+esc(data.cliente)+'</span> • ' : '') +
            (data.produto ? 'Produto: <span class="bold">'+esc(data.produto)+'</span> • ' : '') +
            (data.job ? 'Job: <span class="bold">'+esc(data.job)+'</span>' : '') +
          '</div>' +
        '</header>' +
        '<main id="content">' +
          renderCampanhas() +
          (data.observacoes ? '<section class="bloco avoid-break"><div class="bold" style="margin-bottom:4px">Observações</div><div class="js-obs">'+esc(data.observacoes)+'</div></section>' : '') +
          '<div class="total avoid-break"><div class="bold" style="font-size:12px">Total Geral</div><div class="bold" style="font-size:16px">'+brl(total)+'</div></div>' +
        '</main>' +
        '<footer class="rod">WF/MOTTA • CNPJ • p. 1/2*</footer>';
      }

      function collapseLongText(selectors, maxChars) {
        selectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            const t = (el.textContent||'').trim(); if (t.length > maxChars) el.textContent = t.slice(0, maxChars - 1) + '…';
          });
        });
      }
      function limitRows(selector, max) {
        const nodes = Array.from(document.querySelectorAll(selector));
        nodes.forEach((el, i) => { if (i >= max) el.style.display = 'none'; });
      }
      function fitToTwoPages() {
        const root = document.querySelector('.wrap');
        const PAGE = 1122; const LIMIT = 2 * PAGE;
        const steps = [
          () => collapseLongText(['.js-escopo','.js-tratamento','.js-obs'], 180),
          () => limitRows('.js-lista-fornecedores > .js-forn', 3),
          () => limitRows('.js-lista-itens > .js-item', 5),
          () => root.classList.add('small'),
        ];
        let i = 0; while (document.body.scrollHeight > LIMIT && i < steps.length) steps[i++]();
        if (document.body.scrollHeight > LIMIT) {
          const scale = Math.max(0.8, LIMIT / document.body.scrollHeight);
          root.style.transform = 'scale('+scale+')';
          root.style.width = (794/scale) + 'px';
        }
      }

      document.getElementById('app').innerHTML = layout();
      window.scrollTo(0,0); fitToTwoPages(); setTimeout(()=>window.print(),0); window.addEventListener('afterprint', ()=>window.close());
    })();
  </script></body></html>`;
}

/*********************** Component: Novo Orçamento (com Wizard + PDF + Save) ***********************/
export default function OrcamentosNovo() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Dados principais
  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [job, setJob] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Campanhas
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);

  // Wizard
  const [wizardOpen, setWizardOpen] = useState(true);
  const [wizardStep, setWizardStep] = useState<"total" | "campanha">("total");
  const [wizardTotalStr, setWizardTotalStr] = useState<string>("");
  const [wizardTotal, setWizardTotal] = useState<number>(0);
  const [wizardIndex, setWizardIndex] = useState<number>(0);
  const [wizNome, setWizNome] = useState<string>("Campanha 1");
  const [wizQtdFilme, setWizQtdFilme] = useState<string>("2");
  const [wizQtdAudio, setWizQtdAudio] = useState<string>("2");

  const { finalDe, calcularSubtotalCategoria, calcularSubtotalCampanha, bestFilmAudioCombo } = useCalculos();

  const parseIntSafe = (s: string) => Math.max(0, Math.floor(Number(s || "0"))) || 0;

  const startWizard = () => {
    const total = parseIntSafe(wizardTotalStr);
    if (!total || total < 1) {
      toast({ title: "Informe um número válido de campanhas (>=1)", variant: "destructive" });
      return;
    }
    setWizardTotal(total);
    setWizardIndex(0);
    setWizNome("Campanha 1");
    setWizQtdFilme(total > 1 ? "2" : "1");
    setWizQtdAudio(total > 1 ? "2" : "1");
    setWizardStep("campanha");
  };

  const addCampaignFromWizard = (nome: string, qtdFilme: number, qtdAudio: number) => {
    const nova: Campanha = {
      id: crypto.randomUUID(),
      nome,
      categorias: CATEGORIAS_BASE.map((c, idx) => {
        let fornecedores: Fornecedor[] = [];
        if (c.nome === "Filme")
          fornecedores = Array.from({ length: Math.max(0, qtdFilme) }).map(() => ({
            id: crypto.randomUUID(),
            nome: "",
            descricao: "",
            valor: 0,
            desconto: 0,
          }));
        if (c.nome === "Áudio")
          fornecedores = Array.from({ length: Math.max(0, qtdAudio) }).map(() => ({
            id: crypto.randomUUID(),
            nome: "",
            descricao: "",
            valor: 0,
            desconto: 0,
          }));
        return {
          id: crypto.randomUUID(),
          nome: c.nome,
          ordem: idx,
          visivel: true,
          podeExcluir: c.podeExcluir,
          modoPreco: "fechado",
          fornecedores,
          itens: [],
        };
      }),
    };
    setCampanhas((prev) => [...prev, nova]);
  };

  const nextCampaignInWizard = () => {
    const qtdF = parseIntSafe(wizQtdFilme);
    const qtdA = parseIntSafe(wizQtdAudio);
    const nome = (wizNome || "").trim() || `Campanha ${wizardIndex + 1}`;
    addCampaignFromWizard(nome, qtdF, qtdA);
    const nextIndex = wizardIndex + 1;
    if (nextIndex >= wizardTotal) {
      setWizardOpen(false);
      return;
    }
    setWizardIndex(nextIndex);
    setWizNome(`Campanha ${nextIndex + 1}`);
    setWizQtdFilme("2");
    setWizQtdAudio("2");
  };

  // Mutators básicos
  const atualizarNomeCampanha = (id: string, nome: string) =>
    setCampanhas((prev) => prev.map((c) => (c.id === id ? { ...c, nome } : c)));
  const adicionarCampanha = () => {
    const nome = `Campanha ${campanhas.length + 1}`;
    const nova: Campanha = {
      id: crypto.randomUUID(),
      nome,
      categorias: CATEGORIAS_BASE.map((c, idx) => ({
        id: crypto.randomUUID(),
        nome: c.nome,
        ordem: idx,
        visivel: true,
        podeExcluir: c.podeExcluir,
        modoPreco: "fechado",
        fornecedores: [],
        itens: [],
      })),
    };
    setCampanhas((prev) => [...prev, nova]);
    toast({ title: "Nova campanha adicionada" });
  };
  const removerCampanha = (id: string) =>
    setCampanhas((prev) => {
      if (prev.length === 1) {
        toast({ title: "É necessário pelo menos uma campanha", variant: "destructive" });
        return prev;
      }
      return prev.filter((c) => c.id !== id);
    });
  const adicionarCategoria = (campanhaId: string, nome: string) => {
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: [
                ...camp.categorias,
                {
                  id: crypto.randomUUID(),
                  nome,
                  ordem: camp.categorias.length,
                  visivel: true,
                  podeExcluir: true,
                  modoPreco: "fechado",
                  fornecedores: [],
                  itens: [],
                },
              ],
            }
          : camp,
      ),
    );
    toast({ title: `Categoria "${nome}" adicionada` });
  };
  const removerCategoria = (campanhaId: string, categoriaId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId ? { ...camp, categorias: camp.categorias.filter((c) => c.id !== categoriaId) } : camp,
      ),
    );
  const alternarVisibilidade = (campanhaId: string, categoriaId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) => (c.id === categoriaId ? { ...c, visivel: !c.visivel } : c)),
            }
          : camp,
      ),
    );
  const atualizarCategoria = (campanhaId: string, categoriaId: string, updates: Partial<Categoria>) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? { ...camp, categorias: camp.categorias.map((c) => (c.id === categoriaId ? { ...c, ...updates } : c)) }
          : camp,
      ),
    );
  const adicionarFornecedor = (campanhaId: string, categoriaId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      fornecedores: [
                        ...c.fornecedores,
                        { id: crypto.randomUUID(), nome: "", descricao: "", valor: 0, desconto: 0 },
                      ],
                    }
                  : c,
              ),
            }
          : camp,
      ),
    );
  const atualizarFornecedor = (
    campanhaId: string,
    categoriaId: string,
    fornecedorId: string,
    updates: Partial<Fornecedor>,
  ) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      fornecedores: c.fornecedores.map((f) => (f.id === fornecedorId ? { ...f, ...updates } : f)),
                    }
                  : c,
              ),
            }
          : camp,
      ),
    );
  const removerFornecedor = (campanhaId: string, categoriaId: string, fornecedorId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId ? { ...c, fornecedores: c.fornecedores.filter((f) => f.id !== fornecedorId) } : c,
              ),
            }
          : camp,
      ),
    );
  const adicionarItem = (campanhaId: string, categoriaId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      itens: [
                        ...c.itens,
                        { id: crypto.randomUUID(), unidade: "", quantidade: 1, valorUnitario: 0, desconto: 0 },
                      ],
                    }
                  : c,
              ),
            }
          : camp,
      ),
    );
  const atualizarItem = (campanhaId: string, categoriaId: string, itemId: string, updates: Partial<ItemPreco>) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? { ...c, itens: c.itens.map((it) => (it.id === itemId ? { ...it, ...updates } : it)) }
                  : c,
              ),
            }
          : camp,
      ),
    );
  const removerItem = (campanhaId: string, categoriaId: string, itemId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId ? { ...c, itens: c.itens.filter((it) => it.id !== itemId) } : c,
              ),
            }
          : camp,
      ),
    );

  const totalGeral = useMemo(
    () => campanhas.reduce((sum, camp) => sum + calcularSubtotalCampanha(camp), 0),
    [campanhas, calcularSubtotalCampanha],
  );

  const combosOrdenados = useMemo(() => {
    const combos = campanhas.map((camp) => ({ campId: camp.id, campNome: camp.nome, combo: bestFilmAudioCombo(camp) }));
    return combos.sort((a, b) => {
      if (a.combo.sum == null && b.combo.sum == null) return 0;
      if (a.combo.sum == null) return 1;
      if (b.combo.sum == null) return -1;
      return a.combo.sum! - b.combo.sum!;
    });
  }, [campanhas, bestFilmAudioCombo]);

  // Save -> budgets + versions, navega para /budget/:id
  const handleSalvar = async () => {
    if (!cliente || !produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" });
      return;
    }
    if (!campanhas.length) {
      toast({ title: "Finalize o lançamento das campanhas", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = snapshotOrcamento({ cliente, produto, job, observacoes, campanhas });
      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .insert({ type: "filme", status: "rascunho" })
        .select()
        .single();
      if (budgetError) throw budgetError;
      const { error: versionError } = await supabase
        .from("versions")
        .insert([{ budget_id: budgetData.id, versao: 1, payload: payload as any, total_geral: totalGeral }])
        .select()
        .single();
      if (versionError) throw versionError;
      toast({ title: "Orçamento salvo!" });
      navigate(`/budget/${budgetData.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // PDF (snapshot + nova janela)
  const gerarPDF = () => {
    if (!cliente || !produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" });
      return;
    }
    const data = snapshotOrcamento({ cliente, produto, job, observacoes, campanhas });
    const json = JSON.stringify(data);
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
    if (!w) {
      toast({ title: "Pop-up bloqueado", description: "Permita pop-ups para gerar o PDF.", variant: "destructive" });
      return;
    }
    w.document.open();
    w.document.write(templateHTML(json));
    w.document.close();
  };

  return (
    <AppLayout>
      {/* WIZARD OVERLAY */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-6">
            {wizardStep === "total" && (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Lançar campanhas</h2>
                  <p className="text-sm text-muted-foreground">Quantas campanhas você deseja lançar agora?</p>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label>Quantidade de campanhas</Label>
                    <Input
                      inputMode="numeric"
                      value={wizardTotalStr}
                      onChange={(e) => setWizardTotalStr(e.target.value)}
                      placeholder="Ex.: 2"
                    />
                  </div>
                  <Button className="mt-6" onClick={startWizard}>
                    Continuar
                  </Button>
                </div>
              </>
            )}
            {wizardStep === "campanha" && (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">
                    Campanha {wizardIndex + 1} de {wizardTotal}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Informe o nome e quantas produtoras para <b>Filme</b> e <b>Áudio</b>.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Nome da campanha</Label>
                    <Input value={wizNome} onChange={(e) => setWizNome(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>
                        Produtoras de <b>Filme</b>
                      </Label>
                      <Input inputMode="numeric" value={wizQtdFilme} onChange={(e) => setWizQtdFilme(e.target.value)} />
                    </div>
                    <div>
                      <Label>
                        Produtoras de <b>Áudio</b>
                      </Label>
                      <Input inputMode="numeric" value={wizQtdAudio} onChange={(e) => setWizQtdAudio(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <div className="text-xs text-muted-foreground">Abrirei os campos abaixo automaticamente.</div>
                  <Button onClick={nextCampaignInWizard}>
                    {wizardIndex + 1 === wizardTotal ? "Concluir" : "Adicionar e continuar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-8 font-semibold">Novo Orçamento</h1>
              <p className="text-muted-foreground">
                Use o assistente para lançar campanhas e produtoras. Gere o PDF (máx. 2 páginas).
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast({ title: "Em breve" })} className="gap-2">
              <Copy className="h-4 w-4" />
              Duplicar
            </Button>
            <Button variant="outline" onClick={() => navigate("/orcamentos/tabela")} className="gap-2">
              <FileText className="h-4 w-4" />
              Exportar p/ BYD
            </Button>
            <Button variant="outline" onClick={gerarPDF} className="gap-2">
              <Printer className="h-4 w-4" />
              Gerar PDF
            </Button>
            <Button onClick={handleSalvar} disabled={saving || campanhas.length === 0} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Identificação */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Identificação</CardTitle>
              <span className="text-xs text-muted-foreground">Use nomes completos</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Input value={cliente} onChange={(e) => setCliente(e.target.value)} required />
              </div>
              <div>
                <Label>Produto *</Label>
                <Input value={produto} onChange={(e) => setProduto(e.target.value)} required />
              </div>
              <div>
                <Label>Job</Label>
                <Input value={job} onChange={(e) => setJob(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campanhas */}
        {campanhas.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Campanhas</CardTitle>
                <Button onClick={adicionarCampanha} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Campanha
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {campanhas.map((camp) => (
                  <div
                    key={camp.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-primary/10 border-primary/30"
                  >
                    <Input
                      value={camp.nome}
                      onChange={(e) => atualizarNomeCampanha(camp.id, e.target.value)}
                      className="h-7 w-44 text-sm font-medium"
                    />
                    {campanhas.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removerCampanha(camp.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Colunas */}
        <div className="grid grid-cols-[1fr_320px] gap-6">
          <div className="space-y-8">
            {campanhas.map((campanha) => {
              const categoriasVisiveis = campanha.categorias.filter((c) => c.visivel);
              const idCamp = campanha.id;
              const combo = bestFilmAudioCombo(campanha);
              const comboTexto =
                combo.sum == null
                  ? "Aguardando cotações de Filme e Áudio"
                  : `${combo.film?.nome || "Filme"} + ${combo.audio?.nome || "Áudio"} = ${brl(combo.sum)}`;
              return (
                <div key={idCamp} className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border-2 border-primary/20">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">{campanha.nome}</h2>
                      <div className="text-xs text-muted-foreground">
                        Melhor combinação (Filme + Áudio): {comboTexto}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {brl(
                        categoriasVisiveis.reduce(
                          (s, c) =>
                            s +
                            (c.modoPreco === "fechado"
                              ? c.fornecedores.length
                                ? c.fornecedores.reduce((m, f) =>
                                    normNum(f.valor) - normNum(f.desconto) < normNum(m.valor) - normNum(m.desconto)
                                      ? f
                                      : m,
                                  ).valor -
                                  c.fornecedores.reduce((m, f) =>
                                    normNum(f.valor) - normNum(f.desconto) < normNum(m.valor) - normNum(m.desconto)
                                      ? f
                                      : m,
                                  ).desconto
                                : 0
                              : c.itens.reduce(
                                  (x, it) =>
                                    x + normNum(it.quantidade) * normNum(it.valorUnitario) - normNum(it.desconto),
                                  0,
                                )),
                          0,
                        ),
                      )}
                    </div>
                  </div>

                  {/* Gerenciador de Categorias */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Gerenciador de Categorias</CardTitle>
                        <Select
                          onValueChange={(v) => {
                            if (!v) return;
                            if (v === "__custom__") {
                              const nome = window.prompt("Nome da categoria personalizada:");
                              if (nome && nome.trim()) adicionarCategoria(idCamp, nome.trim());
                              return;
                            }
                            adicionarCategoria(idCamp, v);
                          }}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="+ Adicionar categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIAS_SUGERIDAS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__">✏️ Personalizada...</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {campanha.categorias.map((cat) => (
                          <div
                            key={cat.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cat.visivel ? "bg-primary/10 border-primary/30" : "bg-muted border-border"}`}
                            title={cat.visivel ? "Visível" : "Oculta"}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{cat.nome}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => alternarVisibilidade(idCamp, cat.id)}
                            >
                              {cat.visivel ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                            {cat.podeExcluir && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removerCategoria(idCamp, cat.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Categorias */}
                  <div className="space-y-4">
                    {categoriasVisiveis.map((cat) => {
                      const idMaisBarata =
                        cat.modoPreco === "fechado" && cat.fornecedores.length
                          ? cat.fornecedores.reduce((min, f) =>
                              normNum(f.valor) - normNum(f.desconto) < normNum(min.valor) - normNum(min.desconto)
                                ? f
                                : min,
                            ).id
                          : null;
                      return (
                        <Card key={cat.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>{cat.nome}</CardTitle>
                              <Select
                                value={cat.modoPreco}
                                onValueChange={(v: any) => atualizarCategoria(idCamp, cat.id, { modoPreco: v })}
                              >
                                <SelectTrigger className="w-[170px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fechado">Valor Fechado</SelectItem>
                                  <SelectItem value="itens">Por Itens</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label>Observação da Categoria (opcional)</Label>
                              <Textarea
                                value={cat.observacao || ""}
                                onChange={(e) => atualizarCategoria(idCamp, cat.id, { observacao: e.target.value })}
                                rows={2}
                                placeholder="Ex.: período, premissas, limitações..."
                              />
                            </div>

                            {cat.modoPreco === "fechado" ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <Label>Fornecedores/Cotações</Label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => adicionarFornecedor(idCamp, cat.id)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar
                                  </Button>
                                </div>
                                <div className="space-y-3">
                                  {cat.fornecedores.map((forn) => {
                                    const valorFinal = normNum(forn.valor) - normNum(forn.desconto);
                                    const isCheapest = idMaisBarata === forn.id;
                                    return (
                                      <div
                                        key={forn.id}
                                        className={`border rounded-xl p-3 space-y-2 ${isCheapest ? "border-green-500 bg-green-500/5" : "border-border"}`}
                                      >
                                        {isCheapest && (
                                          <div className="text-xs font-semibold text-green-600 mb-2">
                                            ⭐ Mais barata considerada no subtotal
                                          </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                          <Input
                                            placeholder="Fornecedor"
                                            value={forn.nome}
                                            onChange={(e) =>
                                              atualizarFornecedor(idCamp, cat.id, forn.id, { nome: e.target.value })
                                            }
                                          />
                                          <Input
                                            placeholder="Valor (R$)"
                                            type="number"
                                            value={forn.valor ?? 0}
                                            onChange={(e) =>
                                              atualizarFornecedor(idCamp, cat.id, forn.id, {
                                                valor: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                        </div>
                                        <Textarea
                                          placeholder="Descrição/Escopo"
                                          value={forn.descricao}
                                          onChange={(e) =>
                                            atualizarFornecedor(idCamp, cat.id, forn.id, { descricao: e.target.value })
                                          }
                                          rows={2}
                                        />
                                        <div className="flex items-center gap-2">
                                          <Input
                                            placeholder="Desconto (R$)"
                                            type="number"
                                            value={forn.desconto ?? 0}
                                            onChange={(e) =>
                                              atualizarFornecedor(idCamp, cat.id, forn.id, {
                                                desconto: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <span className="text-sm font-medium whitespace-nowrap">
                                            = {brl(valorFinal)}
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removerFornecedor(idCamp, cat.id, forn.id)}
                                            className="text-destructive"
                                            title="Remover fornecedor"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <Label>Itens</Label>
                                  <Button size="sm" variant="outline" onClick={() => adicionarItem(idCamp, cat.id)}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar
                                  </Button>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Total = Σ(Qtd × Valor unit.) − Descontos
                                </div>
                                <div className="space-y-3">
                                  {cat.itens.map((item) => {
                                    const subtotal =
                                      normNum(item.quantidade) * normNum(item.valorUnitario) - normNum(item.desconto);
                                    return (
                                      <div key={item.id} className="border rounded-xl p-3 space-y-2">
                                        <div className="grid grid-cols-5 gap-2">
                                          <Input
                                            placeholder="Unidade"
                                            value={item.unidade}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, { unidade: e.target.value })
                                            }
                                          />
                                          <Input
                                            placeholder="Qtd"
                                            type="number"
                                            value={item.quantidade}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, {
                                                quantidade: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <Input
                                            placeholder="Valor unit."
                                            type="number"
                                            value={item.valorUnitario}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, {
                                                valorUnitario: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <Input
                                            placeholder="Desconto"
                                            type="number"
                                            value={item.desconto}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, {
                                                desconto: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <div className="flex items-center justify-end">
                                            <span className="text-sm">Subtotal: {brl(subtotal)}</span>
                                          </div>
                                        </div>
                                        <Textarea
                                          placeholder="Observação do item (opcional)"
                                          value={item.observacao || ""}
                                          onChange={(e) =>
                                            atualizarItem(idCamp, cat.id, item.id, { observacao: e.target.value })
                                          }
                                          rows={2}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}

                            <div className="pt-3 border-t flex justify-between items-center">
                              <span className="font-semibold">Subtotal</span>
                              <span className="text-lg font-bold text-primary">
                                {brl(calcularSubtotalCategoria(cat))}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Observações gerais */}
            {campanhas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={4}
                    placeholder="Adicione observações gerais do orçamento..."
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resumo (Direita) */}
          <div className="sticky top-8 h-fit space-y-4">
            {campanhas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumo por Campanha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {campanhas.map((campanha) => {
                    const categoriasVisiveis = campanha.categorias.filter((c) => c.visivel);
                    const subtotalCampanha = categoriasVisiveis.reduce(
                      (s, c) =>
                        s +
                        (c.modoPreco === "fechado"
                          ? c.fornecedores.length
                            ? c.fornecedores.reduce((m, f) =>
                                normNum(f.valor) - normNum(f.desconto) < normNum(m.valor) - normNum(m.desconto) ? f : m,
                              ).valor -
                              c.fornecedores.reduce((m, f) =>
                                normNum(f.valor) - normNum(f.desconto) < normNum(m.valor) - normNum(m.desconto) ? f : m,
                              ).desconto
                            : 0
                          : c.itens.reduce(
                              (x, it) => x + normNum(it.quantidade) * normNum(it.valorUnitario) - normNum(it.desconto),
                              0,
                            )),
                      0,
                    );
                    return (
                      <div key={campanha.id} className="space-y-2">
                        <div className="font-semibold text-primary pb-2 border-b">{campanha.nome}</div>
                        {categoriasVisiveis.map((cat) => (
                          <div key={cat.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{cat.nome}</span>
                            <span className="font-medium">{brl(calcularSubtotalCategoria(cat))}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                          <span>Subtotal {campanha.nome}</span>
                          <span className="text-primary">{brl(subtotalCampanha)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Geral</span>
                      <span className="text-2xl font-bold text-primary">{brl(totalGeral)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ranking */}
            {campanhas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Campanhas — Soma das mais baratas (Filme + Áudio)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {combosOrdenados.map(({ campId, campNome, combo }, idx) => (
                    <div
                      key={campId}
                      className={`flex justify-between items-center text-sm px-2 py-1.5 rounded ${idx === 0 && combo.sum != null ? "bg-green-500/10" : "bg-muted/40"}`}
                      title={
                        combo.sum == null
                          ? "Complete Filme e Áudio"
                          : "Soma do mais barato de Filme com o mais barato de Áudio"
                      }
                    >
                      <span className="font-medium">{campNome}</span>
                      <span className="font-semibold">{combo.sum == null ? "—" : brl(combo.sum)}</span>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground">Critério: (menor Filme) + (menor Áudio).</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/*********************** Component: BudgetDetalhe (reidrata a partir da última versão) ***********************/
export function BudgetDetalhe() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados do orçamento reidratados
  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [job, setJob] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);

  const { finalDe, calcularSubtotalCategoria, calcularSubtotalCampanha, bestFilmAudioCombo } = useCalculos();

  const hydrateFromPayload = (payload: any) => {
    try {
      setCliente(payload?.cliente || "");
      setProduto(payload?.produto || "");
      setJob(payload?.job || "");
      setObservacoes(payload?.observacoes || "");
      const camps: Campanha[] = (payload?.campanhas || []).map((camp: any) => ({
        id: camp.id || crypto.randomUUID(),
        nome: camp.nome || "Campanha",
        categorias: (camp.categorias || []).map((c: any, idx: number) => ({
          id: c.id || crypto.randomUUID(),
          nome: c.nome || "Categoria",
          ordem: idx,
          visivel: c.visivel !== false,
          podeExcluir: ["Filme", "Áudio", "Imagem", "CC"].includes(c.nome) ? false : true,
          modoPreco: c.modoPreco === "itens" ? "itens" : "fechado",
          observacao: c.observacao || "",
          fornecedores: (c.fornecedores || []).map((f: any) => ({
            id: f.id || crypto.randomUUID(),
            nome: f.nome || "",
            descricao: f.descricao || "",
            valor: normNum(f.valor),
            desconto: normNum(f.desconto),
          })),
          itens: (c.itens || []).map((it: any) => ({
            id: it.id || crypto.randomUUID(),
            unidade: it.unidade || "",
            quantidade: normNum(it.quantidade),
            valorUnitario: normNum(it.valorUnitario),
            desconto: normNum(it.desconto),
            observacao: it.observacao || "",
          })),
        })),
      }));
      setCampanhas(camps);
    } catch (e) {
      console.error(e);
      toast({ title: "Falha ao carregar payload", variant: "destructive" });
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const budgetId = id;
        if (!budgetId) {
          toast({ title: "ID inválido", variant: "destructive" });
          navigate("/orcamentos");
          return;
        }
        const { data, error } = await supabase
          .from("versions")
          .select("id, versao, payload, total_geral, created_at")
          .eq("budget_id", budgetId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (mounted) {
          if (data?.payload) hydrateFromPayload(data.payload);
          else toast({ title: "Nenhuma versão encontrada" });
        }
      } catch (err: any) {
        toast({ title: "Erro ao carregar", description: err.message, variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  // Mutators (mesmos da página nova, sem wizard)
  const atualizarNomeCampanha = (id: string, nome: string) =>
    setCampanhas((prev) => prev.map((c) => (c.id === id ? { ...c, nome } : c)));
  const adicionarCampanha = () => {
    const nome = `Campanha ${campanhas.length + 1}`;
    const nova: Campanha = {
      id: crypto.randomUUID(),
      nome,
      categorias: CATEGORIAS_BASE.map((c, idx) => ({
        id: crypto.randomUUID(),
        nome: c.nome,
        ordem: idx,
        visivel: true,
        podeExcluir: c.podeExcluir,
        modoPreco: "fechado",
        fornecedores: [],
        itens: [],
      })),
    };
    setCampanhas((prev) => [...prev, nova]);
    toast({ title: "Nova campanha adicionada" });
  };
  const removerCampanha = (id: string) =>
    setCampanhas((prev) => {
      if (prev.length === 1) {
        toast({ title: "É necessário pelo menos uma campanha", variant: "destructive" });
        return prev;
      }
      return prev.filter((c) => c.id !== id);
    });
  const adicionarCategoria = (campanhaId: string, nome: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: [
                ...camp.categorias,
                {
                  id: crypto.randomUUID(),
                  nome,
                  ordem: camp.categorias.length,
                  visivel: true,
                  podeExcluir: true,
                  modoPreco: "fechado",
                  fornecedores: [],
                  itens: [],
                },
              ],
            }
          : camp,
      ),
    );
  const removerCategoria = (campanhaId: string, categoriaId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId ? { ...camp, categorias: camp.categorias.filter((c) => c.id !== categoriaId) } : camp,
      ),
    );
  const alternarVisibilidade = (campanhaId: string, categoriaId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) => (c.id === categoriaId ? { ...c, visivel: !c.visivel } : c)),
            }
          : camp,
      ),
    );
  const atualizarCategoria = (campanhaId: string, categoriaId: string, updates: Partial<Categoria>) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? { ...camp, categorias: camp.categorias.map((c) => (c.id === categoriaId ? { ...c, ...updates } : c)) }
          : camp,
      ),
    );
  const adicionarFornecedor = (campanhaId: string, categoriaId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      fornecedores: [
                        ...c.fornecedores,
                        { id: crypto.randomUUID(), nome: "", descricao: "", valor: 0, desconto: 0 },
                      ],
                    }
                  : c,
              ),
            }
          : camp,
      ),
    );
  const atualizarFornecedor = (
    campanhaId: string,
    categoriaId: string,
    fornecedorId: string,
    updates: Partial<Fornecedor>,
  ) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      fornecedores: c.fornecedores.map((f) => (f.id === fornecedorId ? { ...f, ...updates } : f)),
                    }
                  : c,
              ),
            }
          : camp,
      ),
    );
  const removerFornecedor = (campanhaId: string, categoriaId: string, fornecedorId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId ? { ...c, fornecedores: c.fornecedores.filter((f) => f.id !== fornecedorId) } : c,
              ),
            }
          : camp,
      ),
    );
  const adicionarItem = (campanhaId: string, categoriaId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? {
                      ...c,
                      itens: [
                        ...c.itens,
                        { id: crypto.randomUUID(), unidade: "", quantidade: 1, valorUnitario: 0, desconto: 0 },
                      ],
                    }
                  : c,
              ),
            }
          : camp,
      ),
    );
  const atualizarItem = (campanhaId: string, categoriaId: string, itemId: string, updates: Partial<ItemPreco>) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId
                  ? { ...c, itens: c.itens.map((it) => (it.id === itemId ? { ...it, ...updates } : it)) }
                  : c,
              ),
            }
          : camp,
      ),
    );
  const removerItem = (campanhaId: string, categoriaId: string, itemId: string) =>
    setCampanhas((prev) =>
      prev.map((camp) =>
        camp.id === campanhaId
          ? {
              ...camp,
              categorias: camp.categorias.map((c) =>
                c.id === categoriaId ? { ...c, itens: c.itens.filter((it) => it.id !== itemId) } : c,
              ),
            }
          : camp,
      ),
    );

  const totalGeral = useMemo(
    () => campanhas.reduce((sum, camp) => sum + calcularSubtotalCampanha(camp), 0),
    [campanhas, calcularSubtotalCampanha],
  );

  const combosOrdenados = useMemo(() => {
    const combos = campanhas.map((camp) => ({ campId: camp.id, campNome: camp.nome, combo: bestFilmAudioCombo(camp) }));
    return combos.sort((a, b) => {
      if (a.combo.sum == null && b.combo.sum == null) return 0;
      if (a.combo.sum == null) return 1;
      if (b.combo.sum == null) return -1;
      return a.combo.sum! - b.combo.sum!;
    });
  }, [campanhas, bestFilmAudioCombo]);

  const salvarNovaVersao = async () => {
    setSaving(true);
    try {
      const payload = snapshotOrcamento({ cliente, produto, job, observacoes, campanhas });
      // pega última versao atual para incrementar
      const { data: last } = await supabase
        .from("versions")
        .select("versao")
        .eq("budget_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersao = (last?.versao || 0) + 1;
      const { error: vErr } = await supabase
        .from("versions")
        .insert([{ budget_id: id, versao: nextVersao, payload: payload as any, total_geral: totalGeral }])
        .select()
        .single();
      if (vErr) throw vErr;
      toast({ title: "Versão salva!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const gerarPDF = () => {
    if (!cliente || !produto) {
      toast({ title: "Preencha cliente e produto", variant: "destructive" });
      return;
    }
    const data = snapshotOrcamento({ cliente, produto, job, observacoes, campanhas });
    const json = JSON.stringify(data);
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
    if (!w) {
      toast({ title: "Pop-up bloqueado", description: "Permita pop-ups para gerar o PDF.", variant: "destructive" });
      return;
    }
    w.document.open();
    w.document.write(templateHTML(json));
    w.document.close();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <RefreshCcw className="h-4 w-4 animate-spin" /> Carregando orçamento...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-8 font-semibold">Orçamento</h1>
              <p className="text-muted-foreground">
                Reidratado da última versão salva. Edite e salve nova versão quando quiser.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={gerarPDF} className="gap-2">
              <Printer className="h-4 w-4" />
              Gerar PDF
            </Button>
            <Button onClick={salvarNovaVersao} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar versão"}
            </Button>
          </div>
        </div>

        {/* Identificação */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Identificação</CardTitle>
              <span className="text-xs text-muted-foreground">Dados carregados do payload</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Input value={cliente} onChange={(e) => setCliente(e.target.value)} required />
              </div>
              <div>
                <Label>Produto *</Label>
                <Input value={produto} onChange={(e) => setProduto(e.target.value)} required />
              </div>
              <div>
                <Label>Job</Label>
                <Input value={job} onChange={(e) => setJob(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campanhas */}
        {campanhas.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Campanhas</CardTitle>
                <Button onClick={adicionarCampanha} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Campanha
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {campanhas.map((camp) => (
                  <div
                    key={camp.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-primary/10 border-primary/30"
                  >
                    <Input
                      value={camp.nome}
                      onChange={(e) => atualizarNomeCampanha(camp.id, e.target.value)}
                      className="h-7 w-44 text-sm font-medium"
                    />
                    {campanhas.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removerCampanha(camp.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Colunas */}
        <div className="grid grid-cols-[1fr_320px] gap-6">
          <div className="space-y-8">
            {campanhas.map((campanha) => {
              const categoriasVisiveis = campanha.categorias.filter((c) => c.visivel);
              const idCamp = campanha.id;
              const combo = bestFilmAudioCombo(campanha);
              const comboTexto =
                combo.sum == null
                  ? "Aguardando cotações de Filme e Áudio"
                  : `${combo.film?.nome || "Filme"} + ${combo.audio?.nome || "Áudio"} = ${brl(combo.sum)}`;
              return (
                <div key={idCamp} className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border-2 border-primary/20">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">{campanha.nome}</h2>
                      <div className="text-xs text-muted-foreground">
                        Melhor combinação (Filme + Áudio): {comboTexto}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">{brl(calcularSubtotalCampanha(campanha))}</div>
                  </div>

                  {/* Gerenciador de Categorias */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Gerenciador de Categorias</CardTitle>
                        <Select
                          onValueChange={(v) => {
                            if (!v) return;
                            if (v === "__custom__") {
                              const nome = window.prompt("Nome da categoria personalizada:");
                              if (nome && nome.trim()) adicionarCategoria(idCamp, nome.trim());
                              return;
                            }
                            adicionarCategoria(idCamp, v);
                          }}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="+ Adicionar categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIAS_SUGERIDAS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__">✏️ Personalizada...</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {campanha.categorias.map((cat) => (
                          <div
                            key={cat.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cat.visivel ? "bg-primary/10 border-primary/30" : "bg-muted border-border"}`}
                            title={cat.visivel ? "Visível" : "Oculta"}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{cat.nome}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => alternarVisibilidade(idCamp, cat.id)}
                            >
                              {cat.visivel ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                            {cat.podeExcluir && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removerCategoria(idCamp, cat.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Categorias */}
                  <div className="space-y-4">
                    {categoriasVisiveis.map((cat) => {
                      const idMaisBarata =
                        cat.modoPreco === "fechado" && cat.fornecedores.length
                          ? cat.fornecedores.reduce((min, f) =>
                              normNum(f.valor) - normNum(f.desconto) < normNum(min.valor) - normNum(min.desconto)
                                ? f
                                : min,
                            ).id
                          : null;
                      return (
                        <Card key={cat.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>{cat.nome}</CardTitle>
                              <Select
                                value={cat.modoPreco}
                                onValueChange={(v: any) => atualizarCategoria(idCamp, cat.id, { modoPreco: v })}
                              >
                                <SelectTrigger className="w-[170px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fechado">Valor Fechado</SelectItem>
                                  <SelectItem value="itens">Por Itens</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label>Observação da Categoria (opcional)</Label>
                              <Textarea
                                value={cat.observacao || ""}
                                onChange={(e) => atualizarCategoria(idCamp, cat.id, { observacao: e.target.value })}
                                rows={2}
                                placeholder="Ex.: período, premissas, limitações..."
                              />
                            </div>

                            {cat.modoPreco === "fechado" ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <Label>Fornecedores/Cotações</Label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => adicionarFornecedor(idCamp, cat.id)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar
                                  </Button>
                                </div>
                                <div className="space-y-3">
                                  {cat.fornecedores.map((forn) => {
                                    const valorFinal = normNum(forn.valor) - normNum(forn.desconto);
                                    const isCheapest = idMaisBarata === forn.id;
                                    return (
                                      <div
                                        key={forn.id}
                                        className={`border rounded-xl p-3 space-y-2 ${isCheapest ? "border-green-500 bg-green-500/5" : "border-border"}`}
                                      >
                                        {isCheapest && (
                                          <div className="text-xs font-semibold text-green-600 mb-2">
                                            ⭐ Mais barata considerada no subtotal
                                          </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                          <Input
                                            placeholder="Fornecedor"
                                            value={forn.nome}
                                            onChange={(e) =>
                                              atualizarFornecedor(idCamp, cat.id, forn.id, { nome: e.target.value })
                                            }
                                          />
                                          <Input
                                            placeholder="Valor (R$)"
                                            type="number"
                                            value={forn.valor ?? 0}
                                            onChange={(e) =>
                                              atualizarFornecedor(idCamp, cat.id, forn.id, {
                                                valor: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                        </div>
                                        <Textarea
                                          placeholder="Descrição/Escopo"
                                          value={forn.descricao}
                                          onChange={(e) =>
                                            atualizarFornecedor(idCamp, cat.id, forn.id, { descricao: e.target.value })
                                          }
                                          rows={2}
                                        />
                                        <div className="flex items-center gap-2">
                                          <Input
                                            placeholder="Desconto (R$)"
                                            type="number"
                                            value={forn.desconto ?? 0}
                                            onChange={(e) =>
                                              atualizarFornecedor(idCamp, cat.id, forn.id, {
                                                desconto: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <span className="text-sm font-medium whitespace-nowrap">
                                            = {brl(valorFinal)}
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removerFornecedor(idCamp, cat.id, forn.id)}
                                            className="text-destructive"
                                            title="Remover fornecedor"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <Label>Itens</Label>
                                  <Button size="sm" variant="outline" onClick={() => adicionarItem(idCamp, cat.id)}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar
                                  </Button>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Total = Σ(Qtd × Valor unit.) − Descontos
                                </div>
                                <div className="space-y-3">
                                  {cat.itens.map((item) => {
                                    const subtotal =
                                      normNum(item.quantidade) * normNum(item.valorUnitario) - normNum(item.desconto);
                                    return (
                                      <div key={item.id} className="border rounded-xl p-3 space-y-2">
                                        <div className="grid grid-cols-5 gap-2">
                                          <Input
                                            placeholder="Unidade"
                                            value={item.unidade}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, { unidade: e.target.value })
                                            }
                                          />
                                          <Input
                                            placeholder="Qtd"
                                            type="number"
                                            value={item.quantidade}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, {
                                                quantidade: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <Input
                                            placeholder="Valor unit."
                                            type="number"
                                            value={item.valorUnitario}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, {
                                                valorUnitario: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <Input
                                            placeholder="Desconto"
                                            type="number"
                                            value={item.desconto}
                                            onChange={(e) =>
                                              atualizarItem(idCamp, cat.id, item.id, {
                                                desconto: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                          />
                                          <div className="flex items-center justify-end">
                                            <span className="text-sm">Subtotal: {brl(subtotal)}</span>
                                          </div>
                                        </div>
                                        <Textarea
                                          placeholder="Observação do item (opcional)"
                                          value={item.observacao || ""}
                                          onChange={(e) =>
                                            atualizarItem(idCamp, cat.id, item.id, { observacao: e.target.value })
                                          }
                                          rows={2}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}

                            <div className="pt-3 border-t flex justify-between items-center">
                              <span className="font-semibold">Subtotal</span>
                              <span className="text-lg font-bold text-primary">
                                {brl(calcularSubtotalCategoria(cat))}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Observações gerais */}
            {campanhas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={4}
                    placeholder="Adicione observações gerais do orçamento..."
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resumo (Direita) */}
          <div className="sticky top-8 h-fit space-y-4">
            {campanhas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumo por Campanha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {campanhas.map((campanha) => {
                    const categoriasVisiveis = campanha.categorias.filter((c) => c.visivel);
                    const subtotalCampanha = calcularSubtotalCampanha(campanha);
                    return (
                      <div key={campanha.id} className="space-y-2">
                        <div className="font-semibold text-primary pb-2 border-b">{campanha.nome}</div>
                        {categoriasVisiveis.map((cat) => (
                          <div key={cat.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{cat.nome}</span>
                            <span className="font-medium">{brl(calcularSubtotalCategoria(cat))}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                          <span>Subtotal {campanha.nome}</span>
                          <span className="text-primary">{brl(subtotalCampanha)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Geral</span>
                      <span className="text-2xl font-bold text-primary">{brl(totalGeral)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ranking */}
            {campanhas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Campanhas — Soma das mais baratas (Filme + Áudio)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {combosOrdenados.map(({ campId, campNome, combo }, idx) => (
                    <div
                      key={campId}
                      className={`flex justify-between items-center text-sm px-2 py-1.5 rounded ${idx === 0 && combo.sum != null ? "bg-green-500/10" : "bg-muted/40"}`}
                      title={
                        combo.sum == null
                          ? "Complete Filme e Áudio"
                          : "Soma do mais barato de Filme com o mais barato de Áudio"
                      }
                    >
                      <span className="font-medium">{campNome}</span>
                      <span className="font-semibold">{combo.sum == null ? "—" : brl(combo.sum)}</span>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground">Critério: (menor Filme) + (menor Áudio).</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
