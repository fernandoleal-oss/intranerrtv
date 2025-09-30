"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client"; // usa seu adaptador
import {
  Film,
  FolderOpen,
  RefreshCcw,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";

// ------------------------------
// Tipos básicos
// ------------------------------

type RightRow = {
  id: string;
  client: string;
  product: string;
  title: string;
  contract_signed_cast: string | null;
  contract_signed_production: string | null;
  first_air: string | null;
  validity_months: number | null;
  expire_date: string | null;
  status_label: string | null;
  link_film: string | null;
  link_drive: string | null;
  renewed: boolean;
  renewal_contract_url: string | null;
  renewal_signed_at: string | null;
  renewal_validity_months: number | null;
};

// ------------------------------
// Helpers
// ------------------------------

function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—";
}

function daysUntil(dateStr?: string | null) {
  if (!dateStr) return undefined;
  const today = new Date();
  const target = new Date(dateStr);
  const ms = target.getTime() - new Date(today.toDateString()).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function classNames(...a: (string | false | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

// ------------------------------
// Componentes UI
// ------------------------------

function StatusPill({ expire_date, status_label }: { expire_date?: string | null; status_label?: string | null }) {
  const d = daysUntil(expire_date || undefined);
  let label = status_label || "—";
  let cls = "bg-gray-100 text-gray-800";

  if (d !== undefined) {
    if (d < 0) {
      label = "VENCIDO";
      cls = "bg-red-100 text-red-700";
    } else if (d === 0) {
      label = "VENCE HOJE";
      cls = "bg-amber-100 text-amber-700";
    } else if (d <= 15) {
      label = "A VENCER (≤15d)";
      cls = "bg-amber-100 text-amber-700";
    } else if (d <= 30) {
      label = "A VENCER (≤30d)";
      cls = "bg-yellow-100 text-yellow-700";
    } else {
      label = "EM USO";
      cls = "bg-emerald-100 text-emerald-700";
    }
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

function RenewWizard({ open, onClose, row, onSaved }:{
  open: boolean;
  onClose: () => void;
  row: RightRow | null;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(1);
  const [contractUrl, setContractUrl] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [validity, setValidity] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row && open) {
      setStep(1);
      setContractUrl(row.renewal_contract_url ?? "");
      setSignedAt(row.renewal_signed_at ?? "");
      setValidity(row.renewal_validity_months ?? "");
    }
  }, [row, open]);

  async function handleSave() {
    if (!row) return;
    setSaving(true);
    let newExpire: string | null = row.expire_date;
    if (signedAt && validity && Number(validity) > 0) {
      const dt = new Date(signedAt);
      dt.setMonth(dt.getMonth() + Number(validity));
      newExpire = dt.toISOString().slice(0, 10);
    }

    const { error } = await supabase.from("rights").update({
      renewed: true,
      renewal_contract_url: contractUrl || null,
      renewal_signed_at: signedAt || null,
      renewal_validity_months: validity === "" ? null : Number(validity),
      expire_date: newExpire,
      status_label: "RENOVADO",
      notified_30d: false,
      notified_15d: false,
      notified_expired: false,
    }).eq("id", row.id);

    setSaving(false);
    if (error) { alert("Erro ao salvar: " + error.message); return; }
    onSaved();
    onClose();
  }

  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6">
        <h3 className="text-lg mb-4">Renovar — {row.client} · {row.product}</h3>
        <ol className="flex items-center gap-2 text-xs mb-4">
          {[1,2,3].map(n => (
            <li key={n} className={classNames("px-2 py-1 rounded-lg border", step===n?"bg-black text-white":"bg-gray-50")}>Passo {n}</li>
          ))}
        </ol>
        {step===1 && (
          <div className="space-y-3">
            <p className="text-sm">Cole o <strong>link do contrato de renovação</strong> (PDF/Drive).</p>
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
              <div className="text-gray-500 text-xs mt-1">A nova data de expiração será calculada a partir da assinatura + validade.</div>
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-between">
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg border">Cancelar</button>
          </div>
          <div className="flex gap-2">
            {step>1 && <button onClick={()=>setStep(step-1)} className="px-3 py-2 rounded-lg border">Voltar</button>}
            {step<3 && <button onClick={()=>setStep(step+1)} className="px-3 py-2 rounded-lg bg-black text-white">Continuar</button>}
            {step===3 && <button disabled={saving} onClick={handleSave} className="px-3 py-2 rounded-lg bg-black text-white flex items-center gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin"/>}Salvar</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// Página (inclui todo o board)
// ------------------------------

export default function Page() {
  const [clients, setClients] = useState<string[]>([]);
  const [client, setClient] = useState<string>("");
  const [rows, setRows] = useState<RightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL"|"EM_USO"|"LE30"|"LE15"|"HOJE"|"VENCIDO">("ALL");
  const [openRenew, setOpenRenew] = useState(false);
  const [current, setCurrent] = useState<RightRow | null>(null);

  // Carregar lista de clientes
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("rights").select("client");
      if (error) { console.error(error.message); return; }
      const uniq = Array.from(new Set((data||[]).map((d:any)=>d.client))).filter(Boolean) as string[];
      setClients(uniq);
      setClient(uniq[0] || "");
    })();
  }, []);

  // Carregar linhas do cliente
  async function load() {
    if (!client) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("rights")
      .select("*")
      .eq("client", client)
      .order("expire_date", { ascending: true });
    if (error) console.error(error.message);
    setRows((data as RightRow[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [client]);

  // KPIs
  const kpis = useMemo(() => {
    const base = { uso:0, le30:0, le15:0, venc:0, hoje:0 };
    for (const r of rows) {
      const d = daysUntil(r.expire_date);
      if (d===undefined) continue;
      if (d<0) base.venc++;
      else if (d===0) base.hoje++;
      else if (d<=15) base.le15++;
      else if (d<=30) base.le30++;
      else base.uso++;
    }
    return base;
  }, [rows]);

  // Filtro de busca + status
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rows.filter(r => {
      const d = daysUntil(r.expire_date);
      let ok = true;
      if (statusFilter==='EM_USO') ok = (d!==undefined && d>30);
      if (statusFilter==='LE30') ok = (d!==undefined && d>15 && d<=30);
      if (statusFilter==='LE15') ok = (d!==undefined && d>0 && d<=15);
      if (statusFilter==='HOJE') ok = (d===0);
      if (statusFilter==='VENCIDO') ok = (d!==undefined && d<0);
      if (ok && t) ok = (`${r.product} ${r.title}`.toLowerCase().includes(t));
      return ok;
    });
  }, [rows, search, statusFilter]);

  return (
    <main className="max-w-7xl mx-auto py-8 p-4">
      <h1 className="text-2xl mb-4">Direitos por cliente</h1>

      {/* Abas de clientes */}
      <div className="flex flex-wrap gap-2 mb-4">
        {clients.length===0 && <div className="text-sm text-gray-500">Sem clientes cadastrados</div>}
        {clients.map(c => (
          <button key={c} onClick={()=>setClient(c)} className={classNames("px-3 py-2 rounded-xl border", client===c?"bg-black text-white":"bg-white")}>{c}</button>
        ))}
      </div>

      {/* Busca + filtros */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur mb-4 rounded-2xl border p-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative md:w-96">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por produto ou título" className="w-full pl-10 pr-3 py-2 rounded-xl border"/>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["ALL","Todos"],
              ["EM_USO","Em uso"],
              ["LE30","≤ 30 dias"],
              ["LE15","≤ 15 dias"],
              ["HOJE","Vence hoje"],
              ["VENCIDO","Vencido"],
            ] as const).map(([k,label]) => (
              <button key={k} onClick={()=>setStatusFilter(k)} className={classNames("px-3 py-2 rounded-xl border", statusFilter===k?"bg-black text-white":"bg-white")}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard label="Em uso" value={kpis.uso} />
        <StatCard label="≤ 30 dias" value={kpis.le30} />
        <StatCard label="≤ 15 dias" value={kpis.le15} />
        <StatCard label="Vence hoje" value={kpis.hoje} />
        <StatCard label="Vencido" value={kpis.venc} />
      </div>

      {/* Tabela */}
      <div className="overflow-auto border rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Produto</th>
              <th className="p-3">Título</th>
              <th className="p-3">1ª veiculação</th>
              <th className="p-3">Expira</th>
              <th className="p-3">Status</th>
              <th className="p-3">Links</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length:6}).map((_,i)=> (
                <tr key={i} className="border-t animate-pulse">
                  <td className="p-3"><div className="h-4 w-28 bg-gray-200 rounded"/></td>
                  <td className="p-3"><div className="h-4 w-56 bg-gray-200 rounded"/></td>
                  <td className="p-3"><div className="h-4 w-24 bg-gray-200 rounded"/></td>
                  <td className="p-3"><div className="h-4 w-24 bg-gray-200 rounded"/></td>
                  <td className="p-3"><div className="h-6 w-24 bg-gray-200 rounded-2xl"/></td>
                  <td className="p-3"><div className="h-4 w-16 bg-gray-200 rounded"/></td>
                  <td className="p-3"><div className="h-8 w-24 bg-gray-200 rounded"/></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td className="p-6 text-gray-500" colSpan={7}>Nada encontrado com esses filtros.</td></tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap">{r.product}</td>
                  <td className="p-3">{r.title}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(r.first_air)}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(r.expire_date)}</td>
                  <td className="p-3"><StatusPill expire_date={r.expire_date} status_label={r.status_label} /></td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {r.link_film ? (
                        <a className="underline inline-flex items-center gap-1" href={r.link_film} target="_blank"><Film className="h-4 w-4"/> filme</a>
                      ) : <span className="text-gray-400">—</span>}
                      {r.link_drive ? (
                        <a className="underline inline-flex items-center gap-1" href={r.link_drive} target="_blank"><FolderOpen className="h-4 w-4"/> drive</a>
                      ) : <span className="text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded-lg border inline-flex items-center gap-1" onClick={()=>{ setCurrent(r); setOpenRenew(true); }}><RefreshCcw className="h-4 w-4"/> Renovar</button>
                      {r.link_film && <a className="px-2 py-1 rounded-lg border inline-flex items-center gap-1" href={r.link_film} target="_blank"><ExternalLink className="h-4 w-4"/> Abrir</a>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RenewWizard open={openRenew} onClose={()=>setOpenRenew(false)} row={current} onSaved={load} />
    </main>
  );
}
