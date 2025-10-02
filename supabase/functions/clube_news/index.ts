// Deno edge function for Clube de Criação news

const CLUBE_URL = "https://ccsp.com.br/ultimas/";

function cors(res: Response) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Headers", "Content-Type");
  h.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  return new Response(res.body, { status: res.status, headers: h });
}

function json(data: unknown, status = 200) {
  return cors(new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  }));
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    const r = await fetch(CLUBE_URL, {
      headers: { "User-Agent": "WE-RTV/1.0" }
    });
    const html = await r.text();

    const items: Array<{ title: string; url: string }> = [];
    const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let m;
    
    while ((m = articleRegex.exec(html))) {
      const article = m[1];
      const linkMatch = article.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const titleMatch = article.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
      
      if (linkMatch && titleMatch) {
        const url = linkMatch[1].startsWith("http") ? linkMatch[1] : "https://ccsp.com.br" + linkMatch[1];
        const title = titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        items.push({ title, url });
      }
      
      if (items.length >= 5) break;
    }

    return json({ items: items.slice(0, 5) });
  } catch (e) {
    console.error("Clube News Error:", e);
    const error = e instanceof Error ? e.message : String(e);
    return json({ items: [], error }, 500);
  }
});
