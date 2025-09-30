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
  CheckCircle2,
} from "lucide-react";

/* =========================================
   Tipos
========================================= */
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

/* =========================================
   Utils
========================================= */
const genId = (p = "seed") =>
  `${p}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

function parseBrDateToIso(str?: string | null): string | null {
  if (!str) return null;
  const s = str.trim().replace(/\./g, "/");
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  let yyyy = Number(m[3]);
  if (yyyy < 100) yyyy += 2000;
  const dt = new Date(yyyy, mm - 1, dd);
  if (isNaN(dt.getTime())) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
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

function addMonthsIso(isoBase: string, months: number): string {
  const d = new Date(isoBase);
  d.setMonth(d.getMonth() + months);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* =========================================
   Seed (EMS, BYD, LEGRAND)
========================================= */
function mkRow(p: Partial<RightRow>): RightRow {
  return {
    id: genId("seed"),
    client: p.client ?? "",
    product: p.product ?? "",
    title: p.title ?? "",
    contract_signed_cast: p.contract_signed_cast ?? null,
    contract_signed_production: p.contract_signed_production ?? null,
    first_air: p.first_air ?? null,
    validity_months: p.validity_months ?? null,
    expire_date: p.expire_date ?? null,
    status_label: p.status_label ?? null,
    link_film: p.link_film ?? null,
    link_drive: p.link_drive ?? null,
    renewed: !!p.renewed,
    renewal_contract_url: p.renewal_contract_url ?? null,
    renewal_signed_at: p.renewal_signed_at ?? null,
    renewal_validity_months: p.renewal_validity_months ?? null,
    audio_producer: p.audio_producer ?? null,
    film_producer: p.film_producer ?? null,
    archived: !!p.archived,
  };
}

const EMS_ROWS: RightRow[] = [
  mkRow({ client:"EMS", product:"Dermacyd", title:"Testemunhal (Paola Oliveira) · TVC1",
    contract_signed_production: parseBrDateToIso("01/04/2024"),
    first_air: parseBrDateToIso("01/05/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("22/04/2025"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"EMS", product:"Dermacyd", title:"Testemunhal (Paola Oliveira) · TVC2",
    contract_signed_production: parseBrDateToIso("01/04/2024"),
    first_air: parseBrDateToIso("01/10/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("12/09/2025"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"EMS", product:"Gelmax", title:"Max e Faro",
    contract_signed_production: parseBrDateToIso("15/10/2024"),
    first_air: parseBrDateToIso("19/10/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("18/10/2025"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"EMS", product:"Multgrip", title:"Incomodo",
    contract_signed_production: parseBrDateToIso("30/04/2025"),
    validity_months: 12, expire_date: parseBrDateToIso("29/04/2026"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"EMS", product:"Dermacyd", title:"Caroline",
    contract_signed_production: parseBrDateToIso("30/04/2025"),
    validity_months: 12, expire_date: parseBrDateToIso("29/04/2026"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"EMS", product:"Bengué", title:"Níveis de Dor",
    contract_signed_production: parseBrDateToIso("30/04/2025"),
    validity_months: 12, expire_date: parseBrDateToIso("29/04/2026"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"EMS", product:"Lacday", title:"Laclovers",
    contract_signed_production: parseBrDateToIso("30/04/2025"),
    validity_months: 12, expire_date: parseBrDateToIso("29/04/2026"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"EMS", product:"Lacday", title:"Diga sim (AP 19.736)",
    contract_signed_production: parseBrDateToIso("16/01/2024"),
    first_air: parseBrDateToIso("01/03/2024"),
    renewal_signed_at: parseBrDateToIso("09/06/2025"),
    validity_months: 12, renewal_validity_months: 12,
    expire_date: parseBrDateToIso("08/06/2026"),
    status_label: "RENOVADO", renewed: true,
  }),
  mkRow({ client:"EMS", product:"Institucional", title:"Getty - Renovação de pacote (AP 21.715)",
    contract_signed_production: parseBrDateToIso("21/06/2024"),
    renewal_signed_at: parseBrDateToIso("21/06/2025"),
    validity_months: 12, renewal_validity_months: 12,
    expire_date: parseBrDateToIso("20/06/2026"),
    status_label: "RENOVADO", renewed: true,
  }),
  mkRow({ client:"EMS", product:"Caladryl", title:"Renovação Pós Tudo",
    contract_signed_production: parseBrDateToIso("11/10/2024"),
    first_air: parseBrDateToIso("15/10/2024"),
    renewal_signed_at: parseBrDateToIso("20/06/2025"),
    validity_months: 9, renewal_validity_months: 9,
    expire_date: parseBrDateToIso("13/02/2026"),
    status_label: "RENOVADO", renewed: true,
  }),
  mkRow({ client:"EMS", product:"Lacday", title:"Confeiteira (AP 17.067)",
    contract_signed_production: parseBrDateToIso("29/04/2023"),
    first_air: parseBrDateToIso("29/04/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("29/04/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Bengué", title:"Halteres (AP 17.067)",
    contract_signed_production: parseBrDateToIso("13/05/2023"),
    first_air: parseBrDateToIso("13/05/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("13/05/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Naridrin", title:"Alta dosagem (AP 17.882)",
    contract_signed_production: parseBrDateToIso("30/05/2023"),
    first_air: parseBrDateToIso("30/06/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("30/06/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Institucional", title:"Renovação pacote Getty EMS/GERMED/LEGRAND (AP 17.884)",
    contract_signed_production: parseBrDateToIso("25/08/2023"),
    first_air: parseBrDateToIso("25/08/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("25/08/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Caladryl", title:"Pós Tudo (AP 17.966)",
    contract_signed_cast: parseBrDateToIso("29/08/2023"),
    contract_signed_production: parseBrDateToIso("15/08/2023"),
    first_air: parseBrDateToIso("29/09/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("29/09/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Multigrip", title:"Sonoplastia / Testemunhal (AP 16.416)",
    contract_signed_production: parseBrDateToIso("19/04/2023"),
    first_air: parseBrDateToIso("12/05/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("12/05/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Allexofedrin", title:"Sala Vazia (AP 16.416)",
    contract_signed_production: parseBrDateToIso("19/04/2023"),
    first_air: parseBrDateToIso("12/05/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("12/05/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Gerovital", title:"Energia Raiz (AP 16.416)",
    contract_signed_production: parseBrDateToIso("19/04/2023"),
    first_air: parseBrDateToIso("26/05/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("26/05/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Sominex", title:"Insônia (AP 19.736)",
    contract_signed_production: parseBrDateToIso("16/01/2024"),
    first_air: parseBrDateToIso("15/03/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("02/03/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Bengué", title:"Pra tudo terminar (AP 19.736)",
    contract_signed_production: parseBrDateToIso("16/01/2024"),
    first_air: parseBrDateToIso("16/03/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("01/03/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Gerovital", title:'Energia Raiz — Reut. (AP 19.736)',
    first_air: parseBrDateToIso("25/05/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("25/05/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Gerovital", title:'Energia Raiz — Reut. SPOT (AP 20.729)',
    first_air: parseBrDateToIso("12/04/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("05/05/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Allexofedrin", title:"Sala Vazia — Reut. (AP 20.784)",
    first_air: parseBrDateToIso("12/05/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("12/05/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Gerovital", title:'Demos animada disposição "mental" e "Física" (AP 19.736)',
    contract_signed_production: parseBrDateToIso("16/01/2024"),
    first_air: parseBrDateToIso("10/05/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("05/03/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"EMS", product:"Multgrip", title:"Fujão (Faro)",
    contract_signed_production: parseBrDateToIso("01/04/2024"),
    first_air: parseBrDateToIso("03/05/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("05/05/2025"),
    status_label: "VENCIDO",
  }),
];

const BYD_ROWS: RightRow[] = [
  mkRow({ client:"BYD", product:"ENERGY", title:"Solução Residencial e Comercial (AP 20.468)",
    first_air: parseBrDateToIso("20/03/2024"),
    validity_months: 24, expire_date: parseBrDateToIso("20/03/2026"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"BYD", product:"Shark Lançamento", title:"Surreal Films",
    first_air: parseBrDateToIso("01/10/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("01/10/2025"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"BYD", product:"Black Friday", title:"Thiago Nigro - Cine",
    first_air: parseBrDateToIso("01/11/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("01/11/2025"),
    status_label: "DENTRO DO PRAZO",
    link_film: "BYD_hero_30s-ON_4x5.mp4",
  }),
  mkRow({ client:"BYD", product:"Super Híbridos", title:"Luiz Miranda - Trust",
    first_air: parseBrDateToIso("26/02/2025"),
    validity_months: 12, expire_date: parseBrDateToIso("25/02/2026"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"BYD", product:"Shark", title:"Gustavo Lima - Melodia",
    first_air: parseBrDateToIso("01/03/2025"),
    validity_months: 12, expire_date: parseBrDateToIso("01/03/2026"),
    status_label: "DENTRO DO PRAZO",
  }),
  mkRow({ client:"BYD", product:"Tripa King", title:"—",
    first_air: parseBrDateToIso("18/06/2025"),
    validity_months: 12, expire_date: parseBrDateToIso("17/06/2026"),
    status_label: "RENOVADO", renewed: true,
  }),
  mkRow({ client:"BYD", product:"Dolphin, Dolphin Mini e Seal", title:"Pacote Footage 01-02/05 (AP 17.948)",
    validity_months: 12, expire_date: parseBrDateToIso("01/05/2026"),
    status_label: "RENOVADO", renewed: true,
  }),
  mkRow({ client:"BYD", product:"Marcas", title:"Dolphin e Song (AP 17.957)",
    first_air: parseBrDateToIso("10/08/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("10/08/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"BYD", product:"5 anos", title:"5 anos (AP 18.100)",
    first_air: parseBrDateToIso("10/08/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("10/08/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"BYD", product:"Seal", title:"Seal (AP 18.160)",
    first_air: parseBrDateToIso("10/08/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("10/08/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"BYD", product:"Lítio", title:"Lítio",
    first_air: parseBrDateToIso("15/09/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("15/09/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"BYD", product:"Dolphin", title:"Lanç. Dolphin (AP 18.296)",
    first_air: parseBrDateToIso("28/09/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("28/09/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"BYD", product:"Fábrica", title:"Camaçari",
    first_air: parseBrDateToIso("09/10/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("09/10/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"BYD", product:"Lanç. Dolphin Mini", title:"Filme e KV (AP 20.516)",
    first_air: parseBrDateToIso("28/02/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("28/02/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"BYD", product:"Lanç. Song Plus", title:"Acostamento (AP 20.452)",
    contract_signed_production: parseBrDateToIso("14/04/2024"),
    first_air: parseBrDateToIso("19/04/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("19/04/2025"),
    status_label: "VENCIDO",
    link_drive: "COPIA",
  }),
  mkRow({ client:"BYD", product:"Copa América", title:'Dorival: Convocados/Roda de time/"Tá com energia" (AP 21.403 — Pacote 1/2)',
    contract_signed_cast: parseBrDateToIso("24/05/2024"),
    first_air: parseBrDateToIso("14/06/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("14/06/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"BYD", product:"Lanç. Song PRO", title:'Melhor Amigo (AP 21.403 — Pacote 1/2)',
    contract_signed_cast: parseBrDateToIso("24/05/2024"),
    first_air: parseBrDateToIso("24/05/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("24/05/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"BYD", product:"Footages Dolphin/Dolphin Mini/YUAN", title:"(AP 21.404 — Pacote 2/2)",
    contract_signed_cast: parseBrDateToIso("03/06/2024"),
    first_air: parseBrDateToIso("03/06/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("03/06/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"BYD", product:"Lanç. KING", title:"King (Pelé) (AP 21.404 — Pacote 2/2)",
    contract_signed_cast: parseBrDateToIso("03/06/2024"),
    contract_signed_production: parseBrDateToIso("24/06/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("24/06/2025"),
    status_label: "VENCIDO",
  }),
];

const LEGRAND_ROWS: RightRow[] = [
  mkRow({ client:"LEGRAND", product:"Colírio Legrand", title:"Colírio Legrand",
    contract_signed_production: parseBrDateToIso("29/04/2021"),
    first_air: parseBrDateToIso("29/04/2021"),
    validity_months: 12, expire_date: parseBrDateToIso("29/04/2022"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"LEGRAND", product:"Bismujet", title:"Xadrez (AP 17.212)",
    contract_signed_cast: parseBrDateToIso("19/05/2023"),
    contract_signed_production: parseBrDateToIso("17/05/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("17/05/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"LEGRAND", product:"Kelosil", title:"Tatuagem (AP 17.212)",
    contract_signed_cast: parseBrDateToIso("19/05/2023"),
    contract_signed_production: parseBrDateToIso("17/05/2023"),
    validity_months: 12, expire_date: parseBrDateToIso("17/05/2024"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"LEGRAND", product:"Expec", title:"Escritório / Jantar / Cama (AP 21.055)",
    contract_signed_cast: parseBrDateToIso("12/05/2024"),
    contract_signed_production: parseBrDateToIso("09/03/2024"),
    first_air: parseBrDateToIso("17/05/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("17/05/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"LEGRAND", product:"Repoflor", title:"Repoflor Casa (AP 22.217)",
    contract_signed_production: parseBrDateToIso("02/08/2024"),
    first_air: parseBrDateToIso("10/09/2024"),
    validity_months: 12, expire_date: parseBrDateToIso("02/09/2025"),
    status_label: "VENCIDO",
  }),
  mkRow({ client:"LEGRAND", product:"Expec", title:"Escritório / Casal / Mulher à noite",
    validity_months: 12, expire_date: parseBrDateToIso("31/03/2026"),
    status_label: "DENTRO DO PRAZO",
  }),
];

const SEED_ALL: RightRow[] = [...EMS_ROWS, ...BYD_ROWS, ...LEGRAND_ROWS];

/* =========================================
   UI básicos
========================================= */
function StatusPill({
  expire_date, status_label, archived,
}: { expire_date?: string | null; status_label?: string | null; archived?: boolean }) {
  if (archived) return <span className="px-2 py-1 rounded-2xl text-xs font-medium bg-gray-200 text-gray-700">ARQUIVADO</span>;
  const d = daysUntil(expire_date || undefined);
  let label = status_label || "—";
  let cls = "bg-gray-100 text-gray-800";
  if (d !== undefined) {
    if (d < 0) label = "VENCIDO", cls = "bg-red-100 text-red-700";
    else if (d === 0) label = "VENCE HOJE", cls = "bg-amber-100 text-amber-700";
    else if (d <= 15) label = "A VENCER (≤15d)", cls = "bg-amber-100 text-amber-700";
    else if (d <= 30) label = "A VENCER (≤30d)", cls = "bg-yellow-100 text-yellow-700";
    else label = "EM USO", cls = "bg-emerald-100 text-emerald-700";
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

/* =========================================
   Modal: Renovar
========================================= */
function RenewWizard({
  open, onClose, row, onSaved,
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
              <div className="text-gray-500 text-xs mt-1">Nova expiração = assinatura + validade.</div>
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
                <Loader2 className="h-4 w-4 hidden" />Salvar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   Modal: Adicionar (Form + Prompt)
========================================= */
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
  const get = (...keys: string[]) => {
    for (const k of keys) if (map[k] != null) return map[k];
    return undefined;
  };

  const client = get("cliente");
  const product = get("produto");
  const title = get("título","titulo","nome do filme","filme","peça","nome da peça") || "";
  const filmProducer = get("produtora de filme","produtora de vídeo","produtora de video","produtora");
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
    contract_signed_production: signedProd ? parseBrDateToIso(signedProd) : null,
    first_air: firstAir ? parseBrDateToIso(firstAir) : null,
    validity_months: validityNum && !isNaN(validityNum) ? validityNum : null,
    expire_date: expire ? parseBrDateToIso(expire) : null,
    link_film: linkFilm || null,
    link_drive: linkDrive || null,
    status_label: status ? String(status).toUpperCase() : null,
  };
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
      setLinkFilm(""); setLinkDrive(""); setConfirmed(false);
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

  function handleCreateFromForm() {
    if (!confirmed) {
      alert("Marque a caixa de confirmação: 'Conferi e está correto'.");
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
    setClient(p.client ?? "");
    setProduct(p.product ?? "");
    setTitle(p.title ?? "");
    setFilmProd((p.film_producer as string) ?? "");
    setAudioProd((p.audio_producer as string) ?? "");
    setSignedProd(p.contract_signed_production ?? "");
    setFirstAir(p.first_air ?? "");
    setValidity(p.validity_months != null ? Number(p.validity_months) : "");
    setExpire(p.expire_date ?? "");
    setMode("form");
  }

  function calcExpire() {
    const base = firstAir || signedProd;
    if (base && validity && Number(validity) > 0) {
      setExpire(addMonthsIso(base, Number(validity)));
    }
  }

  return (
    <d
