// The site's front door: pick a supported harness, or open the shared Trace viewer.
import { SITE, siteOrigin, ICON_LINKS } from "./site.mjs";
import { searchField, searchScript } from "./search-ui.mjs";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CHOICES = [
  {
    id: "claude-code",
    kicker: "Anthropic",
    title: "Claude Code",
    line: "The system prompt, system reminders, tools, agents, skills, settings, env vars and hooks, read from the shipped binary. Plus What wins: which setting, flag or env var Claude Code actually uses."
  },
  {
    id: "codex",
    kicker: "OpenAI",
    title: "Codex/ChatGPT",
    line: "GPT-6 base and persistent-mode instructions, conditional modules, Codex CLI prompts, ChatGPT desktop and Work prompts, config.toml and env vars, read from the shipped apps and catalogs."
  },
  {
    id: "opencode",
    kicker: "Open source",
    title: "OpenCode",
    line: "Model and agent prompts, conversation instructions, tools, configuration and network request assembly, read from release-pinned public source. Trace real OpenRouter runs and their visible reasoning."
  },
  {
    id: "cursor",
    kicker: "Anysphere",
    title: "Cursor",
    line: "Agent instructions, approval prompts, tool schemas, the AgentService request path, reasoning events and configuration from the shipped desktop app and Agent CLI, plus Binwalk and package scans."
  }
];

export function renderLanding({ cardFile = "social-card.png" } = {}) {
  const origin = siteOrigin();
  const title = `${SITE.name} · What coding-agent harnesses send the model`;
  const description = "The prompts, reminders, tools and settings that Claude Code, Codex/ChatGPT, OpenCode and Cursor put in front of the model, with source provenance. Trace your own session and captured network requests.";
  const cards = CHOICES.map(c => `
      <a class="choice" href="${esc(SITE.products[c.id].path)}/">
        <span class="kicker">${esc(c.kicker)}</span>
        <span class="choice-title">${esc(c.title)}</span>
        <span class="choice-line">${esc(c.line)}</span>
        <span class="go" aria-hidden="true">Open →</span>
      </a>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${origin}/">
  ${ICON_LINKS}
  <meta name="theme-color" content="#0b100e">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${origin}/">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${origin}/${esc(cardFile)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${origin}/${esc(cardFile)}">
  <script>document.documentElement.classList.add("js")</script>
  <style>
    :root{color-scheme:dark;--bg:#0b100e;--panel:#111a14;--line:#2c3d2d;--ink:#eef4e6;--ink-2:#a9b8a3;--accent:#c8f784}
    *{box-sizing:border-box}
    html,body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
    main{max-width:1040px;margin:0 auto;padding:clamp(28px,6vw,72px) 16px 48px}
    .eyebrow{font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
    h1{font-size:clamp(34px,6vw,60px);line-height:1.04;letter-spacing:-.02em;margin:14px 0 14px}
    .dek{max-width:680px;color:var(--ink-2);font-size:clamp(16px,2.2vw,19px);margin:0 0 clamp(28px,5vw,44px)}
    h2{font-size:15px;font-weight:600;color:var(--ink-2);margin:0 0 14px}
    .choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
    .choice{display:flex;flex-direction:column;gap:10px;padding:26px 24px 22px;border:1px solid var(--line);border-radius:14px;background:var(--panel);color:inherit;text-decoration:none;transition:border-color .15s,transform .15s}
    .choice:hover,.choice:focus-visible{border-color:var(--accent);transform:translateY(-2px);outline:none}
    .kicker{font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
    .choice-title{font-size:clamp(26px,3.6vw,34px);font-weight:700;letter-spacing:-.01em}
    .choice-line{color:var(--ink-2)}
    .go{margin-top:auto;padding-top:6px;color:var(--accent);font-weight:600}
    .trace{display:grid;grid-template-columns:1fr auto;gap:18px 24px;align-items:center;margin-top:20px;padding:22px 22px 22px;border:1px solid var(--line);border-radius:18px;background:var(--panel)}
    .trace-title{font-size:clamp(22px,3vw,28px);font-weight:700;letter-spacing:-.01em;margin:0;color:var(--ink)}
    .trace p{margin:6px 0 0;color:var(--ink-2);max-width:640px}
    .trace-go{justify-self:end;padding:11px 18px;border-radius:999px;background:var(--accent);color:#0b100e;font-weight:700;text-decoration:none;white-space:nowrap}
    .trace-shot{grid-column:1/-1;display:block;border-radius:12px;overflow:hidden;border:1px solid #1e2833;background:#0f131a;box-shadow:0 30px 70px -30px rgba(0,0,0,.8)}
    .trace-shot img{display:block;width:100%;height:auto;transition:transform .5s ease}
    .trace-shot:hover img,.trace-shot:focus-visible img{transform:scale(1.012)}
    .trace-shot:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
    .search-field{display:flex;align-items:center;gap:12px;width:min(680px,100%);margin:0 0 clamp(28px,5vw,44px);padding:13px 14px 13px 16px;border:1px solid #35506a;border-radius:12px;background:#0d141d;color:#b4bfcc;font:16px/1.4 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;text-align:left;cursor:text;transition:border-color .15s}
    .search-field:hover,.search-field:focus-visible{border-color:#6d9fd6;color:var(--ink);outline:none}
    .search-field-icon{display:grid;place-items:center;color:#9fc4e8;flex:none}
    .search-field-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .search-field kbd{flex:none;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ink);background:#1a2532;border:1px solid #3a4d63;border-radius:5px;padding:3px 6px}
    html:not(.js) .search-field{display:none}
    footer{display:flex;flex-wrap:wrap;gap:18px;margin-top:40px;color:var(--ink-2);font-size:14px}
    footer a{color:var(--ink-2)}
    @media (max-width:560px){.trace{grid-template-columns:1fr;padding:18px 14px}.trace-go{justify-self:start}.search-field kbd{display:none}}
    @media (prefers-reduced-motion:reduce){.choice,.search-field,.trace-shot img{transition:none}}
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">${esc(SITE.name)}</div>
    <h1>What the agent harness puts in front of the model.</h1>
    <p class="dek">The prompts, reminders, tool descriptions and settings that Claude Code, Codex/ChatGPT, OpenCode and Cursor send, read from shipped apps and public source, each with its provenance.</p>
    ${searchField()}
    <h2 id="pick">Which harness?</h2>
    <nav class="choices" aria-labelledby="pick">${cards}
    </nav>
    <section class="trace" aria-labelledby="trace-title">
      <div><h2 id="trace-title" class="trace-title">Trace a session</h2><p>Open your own Claude Code, Codex/ChatGPT, OpenCode or Cursor session and see its instructions, tools and visible reasoning. Add an opt-in network capture to inspect actual request payloads and destinations. Runs in your browser; nothing is uploaded.</p></div>
      <a class="trace-go" href="trace/">Open Trace</a>
      <a class="trace-shot" href="trace/" tabindex="-1"><img src="trace-landscape-2000.webp" srcset="trace-landscape-1000.webp 1000w, trace-landscape-2000.webp 2000w" sizes="(max-width: 1072px) calc(100vw - 32px), 1040px" width="2000" height="1162" loading="lazy" decoding="async" alt="Trace showing a Claude Code session as a 3D landscape: a ridge for each agent, its context stacked in layers by source, and a sidebar breaking down what filled the context."></a>
    </section>
    <footer>
      <a href="${esc(SITE.follow.url)}">Follow @${esc(SITE.follow.handle)} on X</a>
      <a href="${esc(SITE.repo)}">Source on GitHub</a>
    </footer>
  </main>
  ${searchScript("")}
</body>
</html>
`;
}
