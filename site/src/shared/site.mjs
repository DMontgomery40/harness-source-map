// The one site that publishes the supported harnesses. Every absolute URL is derived from here, so a
// rename of the domain or the repo is a one-line change.
export const SITE = {
  domain: "harness.dtmont.com",
  name: "Harness Source Map",
  repo: "https://github.com/DMontgomery40/harness-source-map",
  follow: { handle: "_DMontgomery40", url: "https://x.com/_DMontgomery40" },
  products: {
    "claude-code": { path: "claude-code", label: "Claude Code", legacyHost: "ccprompts.dtmont.com" },
    codex: { path: "codex", label: "Codex/ChatGPT", legacyHost: "gpt6aeon.dtmont.com" },
    opencode: { path: "opencode", label: "OpenCode" },
    cursor: { path: "cursor", label: "Cursor" }
  }
};

// The site's icon, in every page's head (the files sit at the site root; tools/render-brand-assets.py
// renders the .ico and the touch icon from favicon.svg).
export const ICON_LINKS = `<link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">`;

export const siteOrigin = () => `https://${SITE.domain}`;
export const productOrigin = id => `${siteOrigin()}/${SITE.products[id].path}`;
