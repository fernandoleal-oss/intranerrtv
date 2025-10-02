// Deno edge function for ANCINE proxy

const ANCINE_BASE = "https://sad2.ancine.gov.br";
const CONSULTA_URL = ANCINE_BASE + "/obraspublicitarias/consultaGeralViaPortal/consultaGeralViaPortal.seam";

function cors(res: Response) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return new Response(res.body, { status: res.status, headers: h });
}

function json(data: unknown, status = 200) {
  return cors(new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  }));
}

function parseCookies(h: Headers) {
  const raw = h.get("set-cookie") || "";
  return raw.split(/,(?=\s*\w+=)/).map(s => s.split(";")[0].trim()).join("; ");
}

function extract(input: string, regex: RegExp, group = 1): string | null {
  const m = input.match(regex);
  return m ? (m[group] || "").trim() : null;
}

async function fetchCaptcha(sessionCookie: string, html: string) {
  const src = extract(html, /<img[^>]+id="[^"]*captcha[^"]*"[^>]+src="([^"]+)"/i);
  if (!src) return { base64: null };
  const url = src.startsWith("http") ? src : ANCINE_BASE + src;
  const img = await fetch(url, { headers: { "Cookie": sessionCookie, "User-Agent": "WE-RTV/1.0" } });
  const buf = new Uint8Array(await img.arrayBuffer());
  const base64 = "data:image/png;base64," + btoa(String.fromCharCode(...buf));
  return { base64 };
}

Deno.serve(async (req) => {
  try {
    const { pathname } = new URL(req.url);

    if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    if (pathname.endsWith("/health")) return json({ ok: true });

    if (pathname.endsWith("/captcha")) {
      const r = await fetch(CONSULTA_URL, { headers: { "User-Agent": "WE-RTV/1.0" } });
      const html = await r.text();
      const cookie = parseCookies(r.headers);
      const viewState = extract(html, /name="javax\.faces\.ViewState"[^>]+value="([^"]+)"/i) || "";
      const { base64 } = await fetchCaptcha(cookie, html);
      return json({ cookie, viewState, captchaBase64: base64 });
    }

    if (pathname.endsWith("/search") && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { cookie, viewState, crt, captcha } = body || {};
      if (!cookie || !crt || !captcha) return json({ error: "Parâmetros inválidos" }, 400);

      const formName = "formConsultaGeralViaPortal";
      const fields = new URLSearchParams();
      fields.set(`${formName}:j_idtBuscar`, `${formName}:j_idtBuscar`);
      fields.set(`${formName}:numeroCRT`, crt);
      fields.set(`${formName}:captcha`, captcha);
      fields.set("javax.faces.ViewState", viewState);

      const r = await fetch(CONSULTA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": cookie,
          "User-Agent": "WE-RTV/1.0",
        },
        body: fields.toString(),
      });

      const html = await r.text();

      const rows: Array<{ titulo: string; url?: string; numero?: string; status?: string }> = [];
      const rowRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = rowRegex.exec(html))) {
        const url = m[1].startsWith("http") ? m[1] : ANCINE_BASE + m[1];
        const titulo = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (url.includes("consultaGeralViaPortal") || url.includes("detalhe")) {
          rows.push({ titulo, url, numero: crt, status: "Encontrado" });
        }
      }

      return json({ items: rows.slice(0, 100) });
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error("ANCINE Proxy Error:", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
