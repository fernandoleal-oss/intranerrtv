<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <title>WE Proposals — Sistema de Orçamentos</title>

    <!-- SEO/Brand -->
    <meta name="application-name" content="WE Proposals" />
    <meta
      name="description"
      content="Sistema interno da WE para criar, gerenciar e versionar orçamentos de produção (filme, áudio, CC e banco de imagem)."
    />
    <meta name="author" content="WE Agency" />
    <meta name="robots" content="noindex, nofollow" />

    <!-- Cor do navegador -->
    <meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    <meta name="color-scheme" content="dark light" />
    <meta name="format-detection" content="telephone=no" />

    <!-- Open Graph / Twitter (sem Lovable) -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="WE Proposals" />
    <meta property="og:title" content="WE Proposals — Sistema de Orçamentos" />
    <meta
      property="og:description"
      content="Sistema interno da WE para criar, gerenciar e versionar orçamentos."
    />
    <meta property="og:url" content="https://sis-de-comp-hist-orc-we.lovable.app/" />
    <meta property="og:image" content="/og/we-proposals.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="WE Proposals — Sistema de Orçamentos" />
    <meta name="twitter:description" content="Sistema interno da WE para orçamentos." />
    <meta name="twitter:image" content="/og/we-proposals.png" />

    <!-- Ícones / Manifest (adicione os arquivos em public/) -->
    <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/icons/favicon.png" sizes="32x32" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#000000" />
    <link rel="manifest" href="/site.webmanifest" />

    <!-- Fontes -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
      rel="stylesheet"
    />

    <!-- (Opcional) CSP básica — ajuste os domínios do seu Supabase se habilitar
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-eval';
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
               font-src 'self' https://fonts.gstatic.com;
               img-src 'self' data: blob:;
               connect-src 'self' https://<SEU-PROJETO>.supabase.co https://<SEU-PROJETO>.supabase.in;
               frame-ancestors 'none';"> -->

    <style>
      /* app shell + ajustes globais */
      :root {
        --bg: #0b1220;
        --fg: #e6eaf2;
      }
      html, body {
        height: 100%;
        background: var(--bg);
        color: var(--fg);
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .skip-link {
        position: absolute;
        left: -9999px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      .skip-link:focus {
        position: fixed;
        left: 16px;
        top: 16px;
        width: auto;
        height: auto;
        padding: 8px 12px;
        background: #111827;
        color: #fff;
        border-radius: 8px;
        outline: 2px solid #3b82f6;
        z-index: 9999;
      }
      #app-shell {
        display: grid;
        place-items: center;
        min-height: 100dvh;
      }
      .spinner {
        width: 44px;
        height: 44px;
        border: 3px solid rgba(255,255,255,0.2);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 12px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .hint {
        color: #aab3c5;
        font-size: 12px;
      }
      @media (prefers-reduced-motion: reduce) {
        .spinner { animation: none; }
      }
    </style>
  </head>

  <body>
    <a href="#root" class="skip-link">Pular para o conteúdo</a>

    <!-- App shell mostrado até o React montar -->
    <div id="app-shell" aria-hidden="true">
      <div style="text-align:center">
        <div class="spinner" role="status" aria-label="Carregando"></div>
        <div class="hint">Carregando WE Proposals…</div>
      </div>
    </div>

    <!-- Ponto de montagem -->
    <main id="root" role="main"></main>

    <noscript>
      <div style="padding:16px; color:#fff; background:#111827; text-align:center">
        Ative o JavaScript para usar o WE Proposals.
      </div>
    </noscript>

    <script type="module" src="/src/main.tsx"></script>
    <script>
      // remove o app shell após o React montar
      window.addEventListener("DOMContentLoaded", () => {
        const root = document.getElementById("root");
        const shell = document.getElementById("app-shell");
        if (root && shell) {
          const obs = new MutationObserver(() => {
            if (root.childElementCount > 0) {
              shell.remove();
              obs.disconnect();
            }
          });
          obs.observe(root, { childList: true });
        }
      });
    </script>
  </body>
</html>
