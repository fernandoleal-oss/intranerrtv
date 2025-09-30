"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Film,
  FolderOpen,
  RefreshCcw,
  Search,
  ExternalLink,
  Loader2,
  Download,
  Plus,
  Archive,
  ArrowLeft,
  ClipboardList,
} from "lucide-react";

/* =============================================================================
   TIPOS
============================================================================= */
type RightRow = {
  id: string;
  client: string;                         // agora é texto livre (pode ser novo cliente)
  product: string;
  title: string;

  contract_signed_cast: string | null;       // ISO YYYY-MM-DD
  contract_signed_production: string | null; // ISO
  first_air: string | null;                  // ISO
  validity_months: number | null;
  expire_date: string | null;                // ISO

  status_label: string | null;               // rótulo manual (opcional)
  link_film: string | null;
  link_drive: string | null;

  renewed: boolean;
  renewal_contract_url: string | null;
  renewal_signed_at: string | null;          // ISO
  renewal_validity_months: number | null;

  audio_producer?: string | null;
  film_producer?: string | null;
  archived?: boolean;
};

/* =============================================================================
   HELPERS
============================================================================= */
const genId = (p = "seed") =>
  `${p}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

function parseBr(str?: string | null): string | null {
  if (!str) return null;
  const s = str.trim().toLowerCase().replace(/\s+/g, " ");

  const meses = [
    "janeiro","fevereiro","março","marco","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro"
  ];
  const mIx = meses.findIndex(m => s.includes(m));
  if (mIx >= 0) {
    const yMatch = s.match(/20\d{2}/);
    const y = yMatch ? Number(yMatch[0]) : new Date().getFullYear();
    const lastDay = new Date(y, mIx + 1, 0).getDate();
    return `${y}-${String(mIx+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
  }

  const norm = s.replace(/\./g, "/");
  const m = norm.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  let yyyy = Number(m[3]);
  if (yyyy < 100) yyyy += 2000;
  return `${yyyy}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR");
}
function daysUntil(dateStr?: string | null) {
  if (!dateStr) return undefined;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return undefined;
  const today = new Date();
  const baseToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const baseTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const ms = baseTarget.getTime() - baseToday.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
function classNames(...a: (string | false | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

/* =============================================================================
   SEED (resumo mínimo; substitua pelos seus SEED_EMS/BYD/LEGRAND já usados)
   -> Aqui deixei vazio só p/ focar no fluxo de "adicionar novo cliente"
============================================================================= */
const SEED_ALL: RightRow[] = [];

/* =============================================================================
   PROMPT PARSER
   - Lê o texto do modelo e extrai os campos.
   - Robusto a chaves com acentos/variações (“Título”/“Titulo”, “áudio”/“audio” etc.)
============================================================================= */
function parseQuickPrompt(text: string): Partial<RightRow> {
  const map: Record<string, string> = {};
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const [kRaw, ...rest] = line.split(":");
    if (!kRaw || rest.length === 0) continue;
    const key = kRaw.trim().toLowerCase();
    const value = rest.join(":").trim();
    map[key] = value;
  }

  // aliases
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (map[k] != null) return map[k];
    }
    return undefined;
  };

  const client = get("cliente");
  const product = get("produto");
  const title = get("título","titulo","nome do filme","filme","peça","nome da peça") || "";
  const filmProducer = get("produtora de filme","produtora de vídeo","produtora de video","produtora de filme:");
  const audioProducer = get("produtora de áudio","produtora de audio");
  const signedProd = get("assinatura contrato (produção)","assinatura contrato","assinatura do contrato (produção)","assinatura do contrato");
  const firstAir = get("primeira veiculação","primeira veiculacao","1ª veiculação","1a veiculação","1a veiculacao");
  const validity = get("validade (meses)","validade");
  const expire = get("data que expira","expira","data de expiração","data de expiracao");
  const linkFilm = get("link filme (opcional)","link filme","filme");
  const linkDrive = get("link drive (opcional)","link drive","drive");
  const status = get("status (opcional)","status");

  const validityNum = validity ? Number(String(validity).replace(/[^\d]/g,"")) : undefined;

  return {
    client: client || "",
    product: product || "",
    title,
    film_producer: filmProducer || null,
    audio_producer: audioProducer || null,
    contract_signed_production: signedProd ? parseBr(signedProd) : null,
    first_air: firstAir ? parseBr(firstAir) : null,
    validity_months: validityNum && !isNaN(validityNum) ? validityNum : null,
    expire_date: expire ? parseBr(expire) : null,
    link_film: linkFilm || null,
    link_drive: linkDrive || null,
    status_label: status ? String(status).toUpperCase() : null,
  };
}

/* =============================================================================
   UI PRIMITIVES
============================================================================= */
function StatusPill({ expire_date, status_label, archived }: { expire_date?: string | null; status_label?: string | null; archived?: boolean }) {
  if (archived) return <span className="px-2 py-1 rounded-2xl text-xs font-medium bg-gray-200 text-gray-700">ARQUIVADO</span>;
  const d = daysUntil(expire_date || undefined);
  let label = status_label || "—";
  let cls = "bg-gray-100 text-gray-800";
  if (d !== undefined) {
    if (d < 0)        { label = "VENCIDO"; cls = "bg-red-100 text-red-700"; }
    else if (d === 0) { label = "VENCE HOJE"; cls = "bg-amber-100 text-amber-700"; }
    else if (d <= 15) { label = "A VENCER (≤15d)"; cls = "bg-amber-100 text-amber-700"; }
    else if (d <= 30) { label = "A VENCER (≤30d)"; cls = "bg-yellow-100 text-yellow-700"; }
    else              { label = "EM USO"; cls = "bg-emerald-100 text-emerald-700"; }
  }
  return <span className={classNames("px-2 py-1 rounded-2xl text-xs font-medium", cls)}>{label}</span>;
}
function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

/* =============================================================================
   MODAIS: RENOVAR & ADICIONAR (com MODO PROMPT)
============================================================================= */
function RenewWizard({
  open, onClose, row, onSaved
}:{
  open: boolean; onClose: () => void; row: RightRow | null; onSaved: (patch: Partial<RightRow>) => void;
}) {
  const [step, setStep] = useState(1);
  const [contractUrl, setContractUrl] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [validity, setValidity] = useState<number | "">("");

  useEffect(() => {
    if (row && open) {
      setStep(1);
      setContractUrl(row.renewal_contract_url ?? "");
      setSignedAt(row.renewal_signed_at ?? "");
      setValidity(row.renewal_validity_months ?? "");
    }
  }, [row, open]);

  if (!open || !row) return null;

  function handleSave() {
    let newExpire: string | null = row.expire_date;
    if (signedAt && validity && Number(validity) > 0) {
      const dt = new Date(signedAt);
      dt.setMonth(dt.getMonth() + Number(validity));
      newExpire = dt.toISOString().slice(0, 10);
    }
    onSaved({
      renewed: true,
      renewal_contract_url: contractUrl || null,
      renewal_signed_at: signedAt || null,
      renewal_validity_months: validity === "" ? null : Number(validity),
      expire_date: newExpire,
      status_label: "RENOVADO",
      archived: false,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6">
        <h3 className="text-lg mb-4">Renovar — {row.client} · {row.product}</h3>
        <ol className="flex items-center gap-2 text-xs mb-4">
          {[1,2,3].map(n => (
            <li key={n} className={classNames("px-2 py-1 rounded-lg border", step===n?"bg-black text-white":"bg-gray-50")}>
              Passo {n}
            </li>
          ))}
        </ol>

        {step===1 && (
          <div className="space-y-3">
            <p className="text-sm">Cole o link do contrato de renovação (PDF/Drive).</p>
            <input className="w-full border rounded-lg p-2" value={contractUrl} onChange={e=>setContractUrl(e.target.value)} placeholder="https://drive.google.com/..." />
          </div>
        )}
        {step===2 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Data da assinatura</label>
              <input type="date" className="w-full border rounded-lg p-2" value={signedAt} onChange={e=>setSignedAt(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Validade (meses)</label>
              <input type="number" min={1} className="w-full border rounded-lg p-2" value={validity} onChange={e=>setValidity(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
          </div>
        )}
        {step===3 && (
          <div className="space-y-2">
            <p className="text-sm">Conferir:</p>
            <div className="rounded-xl border p-3 text-sm">
              <div><span className="text-gray-500">Contrato:</span> {contractUrl || "—"}</div>
              <div><span className="text-gray-500">Assinatura:</span> {signedAt || "—"}</div>
              <div><span className="text-gray-500">Validade:</span> {validity || "—"} meses</div>
              <div className="text-gray-500 text-xs mt-1">A nova expiração = assinatura + validade.</div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border">Cancelar</button>
          <div className="flex gap-2">
            {step>1 && <button onClick={()=>setStep(step-1)} className="px-3 py-2 rounded-lg border">Voltar</button>}
            {step<3 && <button onClick={()=>setStep(step+1)} className="px-3 py-2 rounded-lg bg-black text-white">Continuar</button>}
            {step===3 && (
              <button onClick={handleSave} className="px-3 py-2 rounded-lg bg-black text-white flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin hidden" />Salvar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddModal({
  open, onClose, onAdd, clientSuggestions
}:{
  open: boolean;
  onClose: () => void;
  onAdd: (row: RightRow) => void;
  clientSuggestions: string[];
}) {
  const [mode, setMode] = useState<"form"|"prompt">("form");

  // formulário
  const [client, setClient] = useState("");
  const [product, setProduct] = useState("");
  const [title, setTitle] = useState("");
  const [signedProd, setSignedProd] = useState("");
  const [firstAir, setFirstAir] = useState("");
  const [audioProd, setAudioProd] = useState("");
  const [filmProd, setFilmProd] = useState("");
  const [validity, setValidity] = useState<number | "">("");
  const [expire, setExpire] = useState("");
  const [markRenewed, setMarkRenewed] = useState(false);
  const [archiveNow, setArchiveNow] = useState(false);
  const [linkFilm, setLinkFilm] = useState("");
  const [linkDrive, setLinkDrive] = useState("");

  // prompt
  const [promptText, setPromptText] = useState(
`Cliente: 
Produto: 
Título: 
Produtora de filme: 
Produtora de áudio: 
Assinatura contrato (produção): 
Primeira veiculação: 
Validade (meses): 
Data que expira: 
Link filme (opcional): 
Link drive (opcional): 
Status (opcional): `
  );

  useEffect(() => {
    if (!open) {
      setMode("form");
      setClient(""); setProduct(""); setTitle(""); setSignedProd("");
      setFirstAir(""); setAudioProd(""); setFilmProd(""); setValidity("");
      setExpire(""); setMarkRenewed(false); setArchiveNow(false);
      setLinkFilm(""); setLinkDrive("");
      setPromptText(
`Cliente: 
Produto: 
Título: 
Produtora de filme: 
Produtora de áudio: 
Assinatura contrato (produção): 
Primeira veiculação: 
Validade (meses): 
Data que expira: 
Link filme (opcional): 
Link drive (opcional): 
Status (opcional): `
      );
    }
  }, [open]);

  if (!open) return null;

  function handleCreateFromForm() {
    const row: RightRow = {
      id: genId("local"),
      client: client.trim(),
      product: product.trim(),
      title: title.trim(),
      contract_signed_cast: null,
      contract_signed_production: signedProd || null,
      first_air: firstAir || null,
      validity_months: validity === "" ? null : Number(validity),
      expire_date: expire || null,
      status_label: markRenewed ? "RENOVADO" : null,
      link_film: linkFilm || null,
      link_drive: linkDrive || null,
      renewed: !!markRenewed,
      renewal_contract_url: null,
      renewal_signed_at: null,
      renewal_validity_months: markRenewed ? (validity === "" ? null : Number(validity)) : null,
      audio_producer: audioProd || null,
      film_producer: filmProd || null,
      archived: !!archiveNow,
    };
    onAdd(row);
    onClose();
  }

  function handleCreateFromPrompt() {
    const p = parseQuickPrompt(promptText);
    const row: RightRow = {
      id: genId("local"),
      client: (p.client ?? "").trim(),
      product: (p.product ?? "").trim(),
      title: (p.title ?? "").trim(),
      contract_signed_cast: null,
      contract_signed_production: p.contract_signed_production ?? null,
      first_air: p.first_air ?? null,
      validity_months: p.validity_months ?? null,
      expire_date: p.expire_date ?? null,
      status_label: p.status_label ?? null,
      link_film: p.link_film ?? null,
      link_drive: p.link_drive ?? null,
      renewed: (p.status_label ?? "").toUpperCase() === "RENOVADO",
      renewal_contract_url: null,
      renewal_signed_at: null,
      renewal_validity_months: p.validity_months ?? null,
      audio_producer: p.audio_producer ?? null,
      film_producer: p.film_producer ?? null,
      archived: false,
    };
    onAdd(row);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg">Adicionar novo registro</h3>
          <div className="flex gap-2">
            <button
              className={classNames("px-3 py-2 rounded-lg border", mode==="form"?"bg-black text-white":"")}
              onClick={()=>setMode("form")}
            >
              Formulário
            </button>
            <button
              className={classNames("px-3 py-2 rounded-lg border", mode==="prompt"?"bg-black text-white":"")}
              onClick={()=>setMode("prompt")}
              title="Colar bloco de texto e deixar o sistema preencher"
            >
              <ClipboardList className="h-4 w-4 inline mr-1" />
              Prompt
            </button>
          </div>
        </div>

        {mode==="form" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Cliente</label>
                <input
                  list="client-datalist"
                  className="w-full border rounded-lg p-2"
                  value={client}
                  onChange={e=>setClient(e.target.value)}
                  placeholder="Ex.: EMS, BYD, LEGRAND, ACME..."
                />
                <datalist id="client-datalist">
                  {clientSuggestions.map(c => <option key={c} value={c} />)}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">Dica: digite um nome novo para criar um cliente.</p>
              </div>
              <div>
                <label className="block text-sm mb-1">Produto</label>
                <input className="w-full border rounded-lg p-2" value={product} onChange={e=>setProduct(e.target.value)} placeholder="Ex.: Lacday" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Título (nome do filme/peça)</label>
                <input className="w-full border rounded-lg p-2" value={title} onChange={e=>setTitle(e.target.value)} placeholder='Ex.: “Fujão (Faro)”' />
              </div>
              <div>
                <label className="block text-sm mb-1">Assinatura do contrato (produção)</label>
                <input type="date" className="w-full border rounded-lg p-2" value={signedProd} onChange={e=>setSignedProd(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Primeira veiculação</label>
                <input type="date" className="w-full border rounded-lg p-2" value={firstAir} onChange={e=>setFirstAir(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Validade (meses)</label>
                <input type="number" min={1} className="w-full border rounded-lg p-2" value={validity} onChange={e=>setValidity(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Data que expira</label>
                <input type="date" className="w-full border rounded-lg p-2" value={expire} onChange={e=>setExpire(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Produtora de áudio</label>
                <input className="w-full border rounded-lg p-2" value={audioProd} onChange={e=>setAudioProd(e.target.value)} placeholder="Ex.: Subsoud / Antfood" />
              </div>
              <div>
                <label className="block text-sm mb-1">Produtora de filme</label>
                <input className="w-full border rounded-lg p-2" value={filmProd} onChange={e=>setFilmProd(e.target.value)} placeholder="Ex.: Boiler / Surreal / O2" />
              </div>
              <div>
                <label className="block text-sm mb-1">Link filme (opcional)</label>
                <input className="w-full border rounded-lg p-2" value={linkFilm} onChange={e=>setLinkFilm(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm mb-1">Link drive (opcional)</label>
                <input className="w-full border rounded-lg p-2" value={linkDrive} onChange={e=>setLinkDrive(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={markRenewed} onChange={e=>setMarkRenewed(e.target.checked)} />
                Já marcar como renovado
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={archiveNow} onChange={e=>setArchiveNow(e.target.checked)} />
                Arquivar este registro
              </label>
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={onClose} className="px-3 py-2 rounded-lg border">Cancelar</button>
              <button onClick={handleCreateFromForm} className="px-3 py-2 rounded-lg bg-black text-white flex items-center gap-2">
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-2">
              Cole aqui o bloco no formato do modelo. Eu extraio cliente, produto, título, produtoras, datas e links automaticamente.
            </p>
            <textarea
              className="w-full h-64 border rounded-lg p-3 font-mono text-sm"
              value={promptText}
              onChange={e=>setPromptText(e.target.value)}
            />
            <div className="mt-6 flex justify-between">
              <button onClick={onClose} className="px-3 py-2 rounded-lg border">Cancelar</button>
              <button onClick={handleCreateFromPrompt} className="px-3 py-2 rounded-lg bg-black text-white flex items-center gap-2">
                <Plus className="h-4 w-4" /> Adicionar via Prompt
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   PÁGINA
============================================================================= */
export default function Direitos() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<RightRow[]>(SEED_ALL);
  const clientOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.client);
    return Array.from(set).sort();
  }, [rows]);

  const [client, setClient] = useState<string>(clientOptions[0] || "EMS");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL"|"EM_USO"|"LE30"|"LE15"|"HOJE"|"VENCIDO"|"ARQ">("ALL");

  // Modais
  const [openRenew, setOpenRenew] = useState(false);
  const [current, setCurrent] = useState<RightRow | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  // Ajusta cliente ativo quando a lista muda
  useEffect(() => {
    if (!clientOptions.includes(client) && clientOptions.length > 0) {
      setClient(clientOptions[0]);
    }
  }, [clientOptions, client]);

  const rowsClient = useMemo(
    () => rows.filter(r => r.client === client),
    [rows, client]
  );

  const kpis = useMemo(() => {
    let uso=0, le30=0, le15=0, hoje=0, venc=0, arq=0;
    for (const r of rowsClient) {
      if (r.archived) { arq++; continue; }
      const d = daysUntil(r.expire_date);
      if (d===undefined) continue;
      if (d<0) venc++;
      else if (d===0) hoje++;
      else if (d<=15) le15++;
      else if (d<=30) le30++;
      else uso++;
    }
    return { uso, le30, le15, hoje, venc, arq };
  }, [rowsClient]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rowsClient
      .filter(r => {
        if (statusFilter === "ARQ") return r.archived === true;
        if (r.archived) return false;
        const d = daysUntil(r.expire_date);
        let ok = true;
        if (statusFilter==='EM_USO') ok = (d!==undefined && d>30);
        if (statusFilter==='LE30')  ok = (d!==undefined && d>15 && d<=30);
        if (statusFilter==='LE15')  ok = (d!==undefined && d>0 && d<=15);
        if (statusFilter==='HOJE')  ok = (d===0);
        if (statusFilter==='VENCIDO') ok = (d!==undefined && d<0);
        if (statusFilter==='ALL') ok = true;
        if (ok && t) ok = (`${r.product} ${r.title}`.toLowerCase().includes(t));
        return ok;
      })
      .sort((a,b) => {
        const da = a.expire_date ? new Date(a.expire_date).getTime() : Infinity;
        const db = b.expire_date ? new Date(b.expire_date).getTime() : Infinity;
        return da - db;
      });
  }, [rowsClient, search, statusFilter]);

  function updateRow(id: string, patch: Partial<RightRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }
  function archiveRow(id: string) {
    updateRow(id, { archived: true });
  }
  function exportCsv() {
    const head = ["Cliente","Produto","Título","1ª veic.","Expira","Val(meses)","Status","Renovado?","Prod. filme","Prod. áudio","Link filme","Link drive"];
    const lines = filtered.map(r => [
      r.client,
      r.product,
      r.title,
      fmtDate(r.first_air),
      fmtDate(r.expire_date),
      r.validity_months ?? "—",
      (r.status_label ?? "—"),
      r.renewed ? "Sim" : "Não",
      r.film_producer ?? "—",
      r.audio_producer ?? "—",
      r.link_film ?? "—",
      r.link_drive ?? "—",
    ]);
    const csv = [head, ...lines].map(row => row.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `direitos_${client}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="px-3 py-2 rounded-xl border inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Início
          </button>
          <h1 className="text-2xl font-semibold">Direitos por cliente</h1>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setOpenAdd(true)} className="px-3 py-2 rounded-xl border inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Adicionar (form ou prompt)
          </button>
          <button onClick={exportCsv} className="px-3 py-2 rounded-xl border inline-flex items-center gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Abas de clientes (dinâmicas) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {clientOptions.length===0 && <span className="text-sm text-gray-500">Sem registros. Clique em “Adicionar”.</span>}
        {clientOptions.map(c => (
          <button
            key={c}
            onClick={()=>setClient(c)}
            className={classNames(
              "px-3 py-2 rounded-xl border",
              client===c ? "bg-black text-white" : "bg-white"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Busca + filtros */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur mb-4 rounded-2xl border p-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative md:w-96">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"/>
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar por produto ou título"
              className="w-full pl-10 pr-3 py-2 rounded-xl border"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["ALL","Todos"],
              ["EM_USO","Em uso"],
              ["LE30","≤ 30 dias"],
              ["LE15","≤ 15 dias"],
              ["HOJE","Vence hoje"],
              ["VENCIDO","Vencido"],
              ["ARQ","Arquivados"],
            ] as const).map(([k,label]) => (
              <button
                key={k}
                onClick={()=>setStatusFilter(k)}
                className={classNames("px-3 py-2 rounded-xl border", statusFilter===k?"bg-black text-white":"bg-white")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <StatCard label="Em uso" value={kpis.uso} />
        <StatCard label="≤ 30 dias" value={kpis.le30} />
        <StatCard label="≤ 15 dias" value={kpis.le15} />
        <StatCard label="Vence hoje" value={kpis.hoje} />
        <StatCard label="Vencido" value={kpis.venc} />
        <StatCard label="Arquivados" value={kpis.arq} />
      </div>

      {/* Tabela */}
      <div className="overflow-auto border rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="text-left">
              <th className="p-3">Produto</th>
              <th className="p-3">Título</th>
              <th className="p-3">1ª veiculação</th>
              <th className="p-3">Expira</th>
              <th className="p-3">Dias</th>
              <th className="p-3">Status</th>
              <th className="p-3">Links</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td className="p-6 text-gray-500" colSpan={8}>Nada encontrado com esses filtros.</td></tr>
            ) : (
              filtered.map(r => {
                const d = daysUntil(r.expire_date);
                return (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap">{r.product}</td>
                    <td className="p-3">
                      <div className="font-medium">{r.title}</div>
                      {(r.film_producer || r.audio_producer) && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {r.film_producer && <>Prod. filme: {r.film_producer}</>} {r.film_producer && r.audio_producer && " · "}
                          {r.audio_producer && <>Prod. áudio: {r.audio_producer}</>}
                        </div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(r.first_air)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(r.expire_date)}</td>
                    <td className="p-3">{d === undefined ? "—" : d}</td>
                    <td className="p-3"><StatusPill expire_date={r.expire_date} status_label={r.status_label} archived={r.archived} /></td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {r.link_film ? (
                          <a className="underline inline-flex items-center gap-1" href={r.link_film} target="_blank" rel="noreferrer">
                            <Film className="h-4 w-4"/> filme
                          </a>
                        ) : <span className="text-gray-400">—</span>}
                        {r.link_drive ? (
                          <a className="underline inline-flex items-center gap-1" href={r.link_drive} target="_blank" rel="noreferrer">
                            <FolderOpen className="h-4 w-4"/> drive
                          </a>
                        ) : <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {!r.archived && (
                          <button
                            className="px-2 py-1 rounded-lg border inline-flex items-center gap-1"
                            onClick={()=>{ setCurrent(r); setOpenRenew(true); }}
                          >
                            <RefreshCcw className="h-4 w-4"/> Renovar
                          </button>
                        )}
                        <button
                          className="px-2 py-1 rounded-lg border inline-flex items-center gap-1"
                          onClick={()=>updateRow(r.id, { archived: !r.archived })}
                          title={r.archived ? "Desarquivar" : "Arquivar"}
                        >
                          <Archive className="h-4 w-4"/> {r.archived ? "Desarquivar" : "Arquivar"}
                        </button>
                        {r.link_film && (
                          <a className="px-2 py-1 rounded-lg border inline-flex items-center gap-1" href={r.link_film} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4"/> Abrir
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modais */}
      <RenewWizard
        open={openRenew}
        onClose={()=>setOpenRenew(false)}
        row={current}
        onSaved={(patch)=> current && updateRow(current.id, patch)}
      />
      <AddModal
        open={openAdd}
        onClose={()=>setOpenAdd(false)}
        onAdd={(row)=> {
          setRows(prev => [...prev, row]);
          // se o cliente for novo, já troca para ele
          setClient(row.client);
        }}
        clientSuggestions={clientOptions}
      />
    </main>
  );
}
