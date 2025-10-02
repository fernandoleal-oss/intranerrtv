import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fnGet, fnPost } from "../lib/functions";
import { ArrowLeft, RefreshCw, Search, Loader2, ExternalLink } from "lucide-react";

type CaptchaResp = { cookie: string; viewState: string; captchaBase64: string | null };
type Item = { titulo: string; url?: string };

export default function Ancine() {
  const nav = useNavigate();
  const [crt, setCrt] = useState(localStorage.getItem("ancine_crt_v1") || "");
  const [cookie, setCookie] = useState("");
  const [viewState, setViewState] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaText, setCaptchaText] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadCaptcha() {
    setError(null);
    setLoading(true);
    try {
      const data: CaptchaResp = await fnGet("/ancine_proxy/captcha");
      setCookie(data.cookie || "");
      setViewState(data.viewState || "");
      setCaptcha(data.captchaBase64 || null);
      setCaptchaText("");
    } catch (e: any) {
      setError("Erro ao carregar captcha — verifique se a Edge Function está publicada e a URL/.env estão corretas.");
    } finally {
      setLoading(false);
    }
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!crt.trim()) return setError("Informe o CRT.");
    if (!captchaText.trim()) return setError("Resolva o captcha.");
    if (!cookie || !viewState) return setError("Sessão inválida. Atualize o captcha e tente novamente.");

    setLoading(true);
    try {
      const data = await fnPost("/ancine_proxy/search", {
        cookie, viewState, crt: crt.trim(), captcha: captchaText.trim(),
      });
      const arr: Item[] = data?.items || [];
      setItems(arr);
      localStorage.setItem("ancine_crt_v1", crt.trim());
      if (!arr.length) setError("Nenhum resultado. Tente novamente (o captcha pode estar incorreto).");
    } catch (e: any) {
      setError("Falha ao consultar. Tente outro captcha ou recarregue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCaptcha(); }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* HeaderBar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => nav(-1)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-neutral-50">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <h1 className="text-lg font-semibold">Consulta ANCINE — Obras Publicitárias</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="rounded-3xl border p-5 shadow-sm">
          <div className="mb-4">
            <div className="text-sm text-neutral-600">
              Os dados são consultados no portal da ANCINE. A sessão é temporária e nenhuma credencial é armazenada.
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={onSearch} className="space-y-4">
            <div>
              <label className="text-sm text-neutral-600">CRT</label>
              <input
                className="w-full mt-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="Informe o CRT"
                value={crt}
                onChange={(e) => setCrt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <div className="text-sm text-neutral-600">Captcha</div>
                <div className="mt-1 h-[84px] rounded-xl border flex items-center justify-center overflow-hidden bg-neutral-50">
                  {captcha ? (
                    <img src={captcha} alt="captcha" className="object-contain max-h-full" />
                  ) : (
                    <div className="text-sm text-neutral-500">Sem imagem</div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-neutral-600">Digite o captcha</label>
                <input
                  className="w-full mt-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-900"
                  value={captchaText}
                  onChange={(e) => setCaptchaText(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadCaptcha}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-neutral-50"
                disabled={loading}
                aria-label="Atualizar captcha"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar captcha
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 text-white px-4 py-2 hover:bg-neutral-800 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Consultar
              </button>

              <a
                href="https://sad2.ancine.gov.br/obraspublicitarias/consultaGeralViaPortal/consultaGeralViaPortal.seam"
                target="_blank"
                className="ml-auto inline-flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-neutral-50"
                rel="noreferrer"
              >
                Abrir portal <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </form>
        </div>

        {/* Resultados */}
        <div className="rounded-3xl border p-5 shadow-sm">
          <div className="mb-3 font-medium">Resultados</div>
          {items.length === 0 ? (
            <div className="text-sm text-neutral-500">
              Sem resultados no momento. Preencha o CRT, resolva o captcha e clique em Consultar.
            </div>
          ) : (
            <div className="max-h-[520px] overflow-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="[&>th]:text-left [&>th]:py-2 [&>th]:px-3 text-neutral-500">
                    <th>Título</th>
                    <th className="w-28">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-t hover:bg-neutral-50">
                      <td className="py-2 px-3">{it.titulo}</td>
                      <td className="py-2 px-3">
                        {it.url ? (
                          <a className="inline-flex items-center gap-1 text-neutral-800 hover:underline" href={it.url} target="_blank" rel="noreferrer">
                            Abrir <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : <span className="text-neutral-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
