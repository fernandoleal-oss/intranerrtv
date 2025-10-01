// src/pages/Direitos.tsx
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
  CheckCircle2,
  Pencil,
  Trash2,
  Clipboard,
  Check,
} from "lucide-react";

/* =============================================================================
   TIPOS
============================================================================= */
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

  audio_producer?: string | null;
  film_producer?: string | null;
  archived?: boolean;
};

/* =============================================================================
   HELPERS
============================================================================= */
const genId = (p = "id") =>
  `${p}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

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
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
function classNames(...a: (string | false | undefined)[]) {
  return a.filter(Boolean).join(" ");
}
function addMonthsIso(isoBase: string, months: number): string {
  const d = new Date(isoBase);
  d.setMonth(d.getMonth() + months);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* --------- links do Google Drive: view / download / folder --------- */
function driveVariants(rawUrl: string): {
  view: string;
  download?: string; // só p/ arquivos
  isFolder: boolean;
} {
  try {
    const url = new URL(rawUrl);
    const hostOk = /(^|\.)google\.com$/.test(url.hostname);
    if (!hostOk) return { view: rawUrl, isFolder: false };

    const mFile = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (mFile) {
      const id = mFile[1];
      return {
        view: `https://drive.google.com/file/d/${id}/view`,
        download: `https://drive.google.com/uc?export=download&id=${id}`,
        isFolder: false,
      };
    }

    const id = url.searchParams.get("id");
    if (id) {
      return {
        view: `https://drive.google.com/file/d/${id}/view`,
        download: `https://drive.google.com/uc?export=download&id=${id}`,
        isFolder: false,
      };
    }

    const mFolder = url.pathname.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if (mFolder) return { view: rawUrl, isFolder: true };

    return { view: rawUrl, isFolder: false };
  } catch {
    return { view: rawUrl, isFolder: false };
  }
}

/* =============================================================================
   SEED + PERSISTÊNCIA LOCAL
============================================================================= */
const LOCAL_KEY = "rights_rows_v1";

const SEED_ALL: RightRow[] = [
  {
    id: genId("seed"),
    client: "BYD",
    product: "Marcas",
    title: "Dolphin e Song",
    contract_signed_cast: null,
    contract_signed_production: "2023-08-10",
    first_air: "2023-08-10",
    validity_months: 12,
    expire_date: "2024-08-10",
    status_label: "VENCIDO",
    link_film: null,
    link_drive: null,
    renewed: false,
    renewal_contract_url: null,
    renewal_signed_at: null,
    renewal_validity_months: null,
    film_producer: null,
    audio_producer: null,
    archived: false,
  },
  {
    id: genId("seed"),
    client: "EMS",
    product: "Lacday",
    title: "Diga sim",
    contract_signed_cast: null,
    contract_signed_production: "2024-01-16",
    first_air: "2024-03-01",
    validity_months: 12,
    expire_date: "2025-06-08",
    status_label: "RENOVADO",
    link_film: null,
    link_drive: null,
    renewed: true,
    renewal_contract_url: null,
    renewal_signed_at: "2025-06-09",
    renewal_validity_months: 12,
    film_producer: null,
    audio_producer: null,
    archived: false,
  },
  {
    id: genId("seed"),
    client: "LEGRAND",
    product: "EXPEC",
    title: "Escritório / Casal / Mulher à noite",
    contract_signed_cast: null,
    contract_signed_production: null,
    first_air: null,
    validity_months: 12,
    expire_date: "2026-03-01",
    status_label: "EM USO",
    link_film: null,
    link_drive: null,
    renewed: false,
    renewal_contract_url: null,
    renewal_signed_at: null,
    renewal_validity_months: null,
    film_producer: null,
    audio_producer: null,
    archived: false,
  },
];

/* =============================================================================
   UI BÁSICA
============================================================================= */
function StatusPill({
  expire_date,
  status_label,
  archived,
}: {
  expire_date?: string | null;
  status_label?: string | null;
  archived?: boolean;
}) {
  if (archived)
    return (
      <span className="px-2 py-1 rounded-2xl text-xs font-medium bg-gray-200 text-gray-700">
        ARQUIVADO
      </span>
    );
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
  return (
    <span className={classNames("px-2 py-1 rounded-2xl text-xs font-medium", cls)}>
      {label}
    </span>
  );
}
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
function DaysChip({ d }: { d: number | undefined }) {
  if (d === undefined) return <span>—</span>;
  let cls = "bg-gray-100 text-gray-700";
  if (d < 0) cls = "bg-red-100 text-red-700";
  else if (d === 0) cls = "bg-amber-100 text-amber-700";
  else if (d <= 15) cls = "bg-amber-50 text-amber-700";
  else if (d <= 30) cls = "bg-yellow-50 text-yellow-700";
  return <span className={classNames("px-2 py-0.5 rounded-lg text-xs", cls)}>{d}</span>;
}

/* =============================================================================
   MODAIS (Renovar e Upsert)
============================================================================= */
function RenewWizard({
  open,
  onClose,
  row,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  row: RightRow | null;
  onSaved: (patch: Partial<RightRow>) => void;
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
      newExpire = addMonthsIso(signedAt, Number(validity));
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
        <h3 className="text-lg mb-4">
          Renovar — {row.client} · {row.product}
        </h3>
        <ol className="flex items-center gap-2 text-xs mb-4">
          {[1, 2, 3].map((n) => (
            <li
              key={n}
              className={classNames(
                "px-2 py-1 rounded-lg border",
                step === n ? "bg-black text-white" : "bg-gray-50"
              )}
            >
              Passo {n}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm">Cole o link do contrato de renovação.</p>
            <input
              className="w-full border rounded-lg p-2"
              value={contractUrl}
              onChange={(e) => setContractUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </div>
        )}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Data da assinatura</label>
              <input
                type="date"
                className="w-full border rounded-lg p-2"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Validade (meses)</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded-lg p-2"
                value={validity}
                onChange={(e) =>
                  setValidity(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2">
            <p className="text-sm">Conferir:</p>
            <div className="rounded-xl border p-3 text-sm">
              <div>
                <span className="text-gray-500">Contrato:</span>{" "}
                {contractUrl || "—"}
              </div>
              <div>
                <span className="text-gray-500">Assinatura:</span>{" "}
                {signedAt || "—"}
              </div>
              <div>
                <span className="text-gray-500">Validade:</span>{" "}
                {validity || "—"} meses
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Nova expiração = assinatura + validade.
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border">
            Cancelar
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-3 py-2 rounded-lg border"
              >
                Voltar
              </button>
            )}
            {step < 3 && (
              <button
                onClick={() => setStep(step + 1)}
                className="px-3 py-2 rounded-lg bg-black text-white"
              >
                Continuar
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleSave}
                className="px-3 py-2 rounded-lg bg-black text-white flex items-center gap-2"
              >
                <Loader2 className="h-4 w-4 hidden" />
                Salvar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UpsertModal({
  open,
  onClose,
  onAdd,
  onEdit,
  clientSuggestions,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (row: RightRow) => void;
  onEdit: (id: string, patch: Partial<RightRow>) => void;
  clientSuggestions: string[];
  initial?: RightRow | null;
}) {
  const isEdit = !!initial;

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
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setClient(initial.client || "");
        setProduct(initial.product || "");
        setTitle(initial.title || "");
        setSignedProd(initial.contract_signed_production || "");
        setFirstAir(initial.first_air || "");
        setValidity(
          initial.validity_months != null ? Number(initial.validity_months) : ""
        );
        setExpire(initial.expire_date || "");
        setAudioProd((initial.audio_producer as string) || "");
        setFilmProd((initial.film_producer as string) || "");
        setLinkFilm(initial.link_film || "");
        setLinkDrive(initial.link_drive || "");
        setMarkRenewed(!!initial.renewed);
        setArchiveNow(!!initial.archived);
        setConfirmed(false);
      } else {
        setClient("");
        setProduct("");
        setTitle("");
        setSignedProd("");
        setFirstAir("");
        setValidity("");
        setExpire("");
        setAudioProd("");
        setFilmProd("");
        setLinkFilm("");
        setLinkDrive("");
        setMarkRenewed(false);
        setArchiveNow(false);
        setConfirmed(false);
      }
    }
  }, [open, initial]);

  function calcExpire() {
    const base = firstAir || signedProd;
    if (base && validity && Number(validity) > 0) {
      setExpire(addMonthsIso(base, Number(validity)));
    }
  }

  function handleSubmit() {
    if (!confirmed) {
      alert("Marque “Conferi e está correto”.");
      return;
    }

    if (isEdit && initial) {
      onEdit(initial.id, {
        client: client.trim(),
        product: product.trim(),
        title: title.trim(),
        contract_signed_production: signedProd || null,
        first_air: firstAir || null,
        validity_months: validity === "" ? null : Number(validity),
        expire_date: expire || null,
        link_film: linkFilm || null,
        link_drive: linkDrive || null,
        audio_producer: audioProd || null,
        film_producer: filmProd || null,
        renewed: !!markRenewed,
        status_label: markRenewed ? "RENOVADO" : initial.status_label,
        archived: !!archiveNow,
      });
      onClose();
      return;
    }

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
      renewal_validity_months: markRenewed
        ? validity === ""
          ? null
          : Number(validity)
        : null,
      audio_producer: audioProd || null,
      film_producer: filmProd || null,
      archived: !!archiveNow,
    };
    onAdd(row);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg">{isEdit ? "Editar registro" : "Adicionar novo registro"}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Cliente</label>
            <input
              list="client-datalist"
              className="w-full border rounded-lg p-2"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Ex.: EMS, BYD, LEGRAND…"
            />
            <datalist id="client-datalist">
              {clientSuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm mb-1">Produto</label>
            <input
              className="w-full border rounded-lg p-2"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Ex.: Lacday"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Título (filme/peça)</label>
            <input
              className="w-full border rounded-lg p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Ex.: “Fujão (Faro)”'
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Assinatura do contrato (produção)</label>
            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={signedProd}
              onChange={(e) => setSignedProd(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Primeira veiculação</label>
            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={firstAir}
              onChange={(e) => setFirstAir(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Validade (meses)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                className="w-full border rounded-lg p-2"
                value={validity}
                onChange={(e) =>
                  setValidity(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
              <button
                type="button"
                onClick={calcExpire}
                className="px-3 py-2 rounded-lg border"
              >
                Calcular expira
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Data que expira</label>
            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={expire}
              onChange={(e) => setExpire(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Produtora de áudio</label>
            <input
              className="w-full border rounded-lg p-2"
              value={audioProd}
              onChange={(e) => setAudioProd(e.target.value)}
              placeholder="Ex.: Subsoud / Antfood"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Produtora de filme</label>
            <input
              className="w-full border rounded-lg p-2"
              value={filmProd}
              onChange={(e) => setFilmProd(e.target.value)}
              placeholder="Ex.: Boiler / Surreal / O2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Link filme (opcional)</label>
            <input
              className="w-full border rounded-lg p-2"
              value={linkFilm}
              onChange={(e) => setLinkFilm(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Link drive (opcional)</label>
            <input
              className="w-full border rounded-lg p-2"
              value={linkDrive}
              onChange={(e) => setLinkDrive(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={markRenewed}
              onChange={(e) => setMarkRenewed(e.target.checked)}
            />
            Marcar como renovado
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={archiveNow}
              onChange={(e) => setArchiveNow(e.target.checked)}
            />
            Arquivar este registro
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Conferi e está correto
          </label>
        </div>

        <div className="mt-6 flex justify-between">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-2 rounded-lg bg-black text-white flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isEdit ? "Salvar alterações" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   PÁGINA
============================================================================= */
type SortMode = "UPCOMING_FIRST" | "EXPIRE_ASC" | "EXPIRE_DESC";
const ALL = "ALL";

export default function Direitos() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<RightRow[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw) as RightRow[];
    } catch {}
    return SEED_ALL;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
    } catch {}
  }, [rows]);

  const clientOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.client) set.add(r.client);
    return Array.from(set).sort();
  }, [rows]);

  // agora começa em "Todos"
  const [client, setClient] = useState<string>(ALL);
  useEffect(() => {
    // se eu estava em um cliente removido, volto pra "Todos"
    if (client !== ALL && !clientOptions.includes(client)) setClient(ALL);
  }, [clientOptions, client]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "EM_USO" | "LE30" | "LE15" | "HOJE" | "VENCIDO" | "ARQ"
  >("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("UPCOMING_FIRST");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [openRenew, setOpenRenew] = useState(false);
  const [current, setCurrent] = useState<RightRow | null>(null);
  const [openUpsert, setOpenUpsert] = useState(false);
  const [editTarget, setEditTarget] = useState<RightRow | null>(null);

  // linhas visíveis conforme aba (Todos ou cliente)
  const rowsScope = useMemo(
    () => (client === ALL ? rows : rows.filter((r) => r.client === client)),
    [rows, client]
  );

  // KPIs no escopo atual
  const kpis = useMemo(() => {
    let uso = 0,
      le30 = 0,
      le15 = 0,
      hoje = 0,
      venc = 0,
      arq = 0;
    for (const r of rowsScope) {
      if (r.archived) {
        arq++;
        continue;
      }
      const d = daysUntil(r.expire_date);
      if (d === undefined) continue;
      if (d < 0) venc++;
      else if (d === 0) hoje++;
      else if (d <= 15) le15++;
      else if (d <= 30) le30++;
      else uso++;
    }
    return { uso, le30, le15, hoje, venc, arq };
  }, [rowsScope]);

  // Filtros + Ordenação dentro do escopo
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    const base = rowsScope.filter((r) => {
      if (statusFilter === "ARQ") return r.archived === true;
      if (r.archived) return false;
      const d = daysUntil(r.expire_date);
      let ok = true;
      if (statusFilter === "EM_USO") ok = d !== undefined && d > 30;
      if (statusFilter === "LE30") ok = d !== undefined && d > 15 && d <= 30;
      if (statusFilter === "LE15") ok = d !== undefined && d > 0 && d <= 15;
      if (statusFilter === "HOJE") ok = d === 0;
      if (statusFilter === "VENCIDO") ok = d !== undefined && d < 0;
      if (statusFilter === "ALL") ok = true;
      if (ok && t) ok = (`${r.client} ${r.product} ${r.title}`.toLowerCase().includes(t));
      return ok;
    });

    const byTime = (r: RightRow) =>
      r.expire_date ? new Date(r.expire_date).getTime() : Infinity;
    const isExpired = (r: RightRow) => {
      const d = daysUntil(r.expire_date);
      return d !== undefined && d < 0;
    };

    return base.sort((a, b) => {
      if (sortMode === "EXPIRE_ASC") return byTime(a) - byTime(b);
      if (sortMode === "EXPIRE_DESC") return byTime(b) - byTime(a);

      // DEFAULT: não vencidos primeiro; dentro do grupo, data crescente
      const ga = isExpired(a) ? 1 : 0;
      const gb = isExpired(b) ? 1 : 0;
      if (ga !== gb) return ga - gb;
      return byTime(a) - byTime(b);
    });
  }, [rowsScope, search, statusFilter, sortMode]);

  // Atualizações
  function updateRow(id: string, patch: Partial<RightRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow(row: RightRow) {
    // não mudo a aba; só adiciono. O botão do cliente aparece automaticamente.
    setRows((prev) => [...prev, row]);
  }
  function deleteRow(id: string) {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  // Export
  function exportCsv() {
    const head = [
      "Cliente",
      "Produto",
      "Título",
      "1ª veiculação",
      "Expira",
      "Val.(meses)",
      "Status",
      "Renovado?",
      "Prod. filme",
      "Prod. áudio",
      "Link filme",
      "Link drive",
    ];
    const lines = filtered.map((r) => [
      r.client,
      r.product,
      r.title,
      fmtDate(r.first_air),
      fmtDate(r.expire_date),
      r.validity_months ?? "—",
      r.status_label ?? "—",
      r.renewed ? "Sim" : "Não",
      r.film_producer ?? "—",
      r.audio_producer ?? "—",
      r.link_film ?? "—",
      r.link_drive ?? "—",
    ]);
    const csv = [head, ...lines].map((row) => row.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = client === ALL ? `direitos_todos.csv` : `direitos_${client}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      alert("Não foi possível copiar o link.");
    }
  }

  return (
    <main className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="px-3 py-2 rounded-xl border inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Início
          </button>
          <h1 className="text-2xl font-semibold">
            {client === ALL ? "Direitos — Todos os clientes" : `Direitos — ${client}`}
          </h1>
        </div>

        <div className="flex gap-2">
          <select
            className="px-3 py-2 rounded-xl border"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            title="Ordenação"
          >
            <option value="UPCOMING_FIRST">Vencidos por último (padrão)</option>
            <option value="EXPIRE_ASC">Data de expiração (mais cedo → tarde)</option>
            <option value="EXPIRE_DESC">Data de expiração (tarde → cedo)</option>
          </select>
          <button
            onClick={() => {
              setEditTarget(null);
              setOpenUpsert(true);
            }}
            className="px-3 py-2 rounded-xl border inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
          <button
            onClick={exportCsv}
            className="px-3 py-2 rounded-xl border inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Abas: Todos + clientes */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setClient(ALL)}
          className={classNames(
            "px-3 py-2 rounded-xl border",
            client === ALL ? "bg-black text-white" : "bg-white"
          )}
        >
          Todos
        </button>
        {clientOptions.length === 0 && (
          <span className="text-sm text-gray-500">
            Sem registros. Clique em “Adicionar”.
          </span>
        )}
        {clientOptions.map((c) => (
          <button
            key={c}
            onClick={() => setClient(c)}
            className={classNames(
              "px-3 py-2 rounded-xl border",
              client === c ? "bg-black text-white" : "bg-white"
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
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, produto ou título"
              className="w-full pl-10 pr-3 py-2 rounded-xl border"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["ALL", "Todos"],
                ["EM_USO", "Em uso"],
                ["LE30", "≤ 30 dias"],
                ["LE15", "≤ 15 dias"],
                ["HOJE", "Vence hoje"],
                ["VENCIDO", "Vencido"],
                ["ARQ", "Arquivados"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setStatusFilter(k)}
                className={classNames(
                  "px-3 py-2 rounded-xl border",
                  statusFilter === k ? "bg-black text-white" : "bg-white"
                )}
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
              <th className="p-3">Cliente</th>
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
              <tr>
                <td className="p-6 text-gray-500" colSpan={9}>
                  Nada encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const d = daysUntil(r.expire_date);
                const rowTint =
                  d !== undefined && d < 0
                    ? "bg-red-50/60"
                    : d !== undefined && d <= 15
                    ? "bg-amber-50/60"
                    : "";
                const drive = r.link_drive ? driveVariants(r.link_drive) : null;
                const copyKey = `${r.id}-drive`;

                return (
                  <tr key={r.id} className={classNames("border-t hover:bg-gray-50", rowTint)}>
                    <td className="p-3 whitespace-nowrap">{r.client}</td>
                    <td className="p-3 whitespace-nowrap">{r.product}</td>
                    <td className="p-3">
                      <div className="font-medium">{r.title}</div>
                      {(r.film_producer || r.audio_producer) && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {r.film_producer && <>Prod. filme: {r.film_producer}</>}
                          {r.film_producer && r.audio_producer && " · "}
                          {r.audio_producer && <>Prod. áudio: {r.audio_producer}</>}
                        </div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(r.first_air)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(r.expire_date)}</td>
                    <td className="p-3"><DaysChip d={d} /></td>
                    <td className="p-3">
                      <StatusPill
                        expire_date={r.expire_date}
                        status_label={r.status_label}
                        archived={r.archived}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.link_film ? (
                          <a
                            className="underline inline-flex items-center gap-1"
                            href={r.link_film}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir filme"
                          >
                            <Film className="h-4 w-4" /> filme
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}

                        {drive ? (
                          <div className="inline-flex items-center gap-1">
                            <a
                              className="underline inline-flex items-center gap-1"
                              href={drive.view}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir no Drive (visualização)"
                            >
                              <FolderOpen className="h-4 w-4" /> drive
                            </a>
                            {!drive.isFolder && drive.download && (
                              <a
                                className="px-1.5 py-0.5 text-xs border rounded"
                                href={drive.download}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Abrir como download"
                              >
                                ↓
                              </a>
                            )}
                            <button
                              className="px-1.5 py-0.5 text-xs border rounded inline-flex items-center gap-1"
                              onClick={() => copyToClipboard(drive.view, copyKey)}
                              title="Copiar link"
                            >
                              {copiedKey === copyKey ? (
                                <>
                                  <Check className="h-3.5 w-3.5" /> Copiado
                                </>
                              ) : (
                                <>
                                  <Clipboard className="h-3.5 w-3.5" /> Copiar
                                </>
                              )}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {!r.archived && (
                          <button
                            className="px-2 py-1 rounded-lg border inline-flex items-center gap-1"
                            onClick={() => {
                              setCurrent(r);
                              setOpenRenew(true);
                            }}
                          >
                            <RefreshCcw className="h-4 w-4" /> Renovar
                          </button>
                        )}
                        <button
                          className="px-2 py-1 rounded-lg border inline-flex items-center gap-1"
                          onClick={() => {
                            setEditTarget(r);
                            setOpenUpsert(true);
                          }}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </button>
                        <button
                          className="px-2 py-1 rounded-lg border inline-flex items-center gap-1"
                          onClick={() => updateRow(r.id, { archived: !r.archived })}
                          title={r.archived ? "Desarquivar" : "Arquivar"}
                        >
                          <Archive className="h-4 w-4" />{" "}
                          {r.archived ? "Desarquivar" : "Arquivar"}
                        </button>
                        <button
                          className="px-2 py-1 rounded-lg border inline-flex items-center gap-1 text-red-600"
                          onClick={() => deleteRow(r.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" /> Excluir
                        </button>
                        {r.link_film && (
                          <a
                            className="px-2 py-1 rounded-lg border inline-flex items-center gap-1"
                            href={r.link_film}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" /> Abrir
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
        onClose={() => setOpenRenew(false)}
        row={current}
        onSaved={(patch) => current && updateRow(current.id, patch)}
      />
      <UpsertModal
        open={openUpsert}
        onClose={() => setOpenUpsert(false)}
        onAdd={(row) => addRow(row)}
        onEdit={(id, patch) => updateRow(id, patch)}
        clientSuggestions={clientOptions}
        initial={editTarget}
      />
    </main>
  );
}
