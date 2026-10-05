// The docs search trigger and loader, shared by both sections' pages and the landing page. The
// palette itself is a real ES module (search/palette.js, copied to dist/search/ by site/build.mjs);
// it resolves the section indexes and every result link against its own URL, so pages load it by
// a relative path that works from any mount point.
import { SITE } from "./site.mjs";

// Files the build copies into dist/search/: the palette, its ranker, its styles, and the site's
// names (site.mjs, as site.js, so the palette reads product paths and labels from the one place).
export const SEARCH_CLIENT_FILES = [
  ["search/palette.js", "palette.js"],
  ["search/query.js", "query.js"],
  ["search/palette.css", "palette.css"],
  ["site.mjs", "site.js"]
];

const ICON = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" focusable="false"><circle cx="6.9" cy="6.9" r="4.7"/><path d="m10.4 10.4 3.8 3.8"/></svg>`;

// The corner-links pill: "Search ⌘K" (icon only on phones). `section` is the product id whose index
// the palette searches first; "all" searches both products.
export function searchTrigger(section) {
  const where = SITE.products[section]?.label ?? "all products";
  return `<button class="search-link" type="button" data-search-open data-search-section="${section}" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K /" aria-label="Search ${where} (⌘K or /)"><span class="search-link-mark" aria-hidden="true">${ICON}</span><span class="search-link-label">Search</span><kbd class="search-link-kbd" aria-hidden="true" data-search-kbd>⌘K</kbd></button>`;
}

// The landing page's wide search field (both products).
export function searchField() {
  return `<button class="search-field" type="button" data-search-open data-search-section="all" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K /" aria-label="Search all products (⌘K or /)"><span class="search-field-icon" aria-hidden="true">${ICON}</span><span class="search-field-text">Search prompts, env vars, settings, hooks, tools…</span><kbd aria-hidden="true" data-search-kbd>⌘K</kbd></button>`;
}

// `prefix` is the page's path back to the site root ("", "../", "../../").
export function searchScript(prefix) {
  return `<script type="module" src="${prefix}search/palette.js"></script>`;
}

// Matches the corner-links pills (.trace-link); hidden until JavaScript can open the palette.
export const searchTriggerStyles = `
    .search-link{display:inline-flex;align-items:center;gap:9px;padding:6px 8px 6px 7px;border:1px solid #475a50;border-radius:999px;background:#17211b;color:#e5f6df;box-shadow:0 8px 30px #0005;font:550 12px/1.2 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;cursor:pointer;transition:background .2s,transform .2s,border-color .2s}
    .search-link:hover{transform:translateY(-2px);border-color:#b5eb74;background:#223025;color:#fff}
    .search-link:focus-visible{outline:2px solid var(--focus,#d9e6f4);outline-offset:3px}
    .search-link-mark{display:grid;width:25px;height:25px;flex:none;place-items:center;border-radius:50%;background:#c8f784;color:#101610}
    .search-link-kbd{padding:2px 6px;border:1px solid #3d5244;border-radius:5px;background:#0f1711;color:#cfe3c4;font:600 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace}
    html:not(.js) .search-link{display:none}
    /* The pill sits at the bar's right end, clear of the reading column; the bar spans the width but
       lets clicks through between its pills. */
    .corner-links{right:24px;pointer-events:none}.corner-links>*{pointer-events:auto}.search-link{margin-left:auto}
    @media(max-width:800px){.search-link-kbd{display:none}}
    /* Phones: four pills share the corner bar, so the icon-only ones and the gaps tighten. */
    @media(max-width:450px){.corner-links{right:12px;gap:6px}.search-link,.github-link,.trace-link{padding:5px}.search-link-label{display:none}}
    @media(max-width:380px){.follow-link{gap:7px;padding-right:10px;font-size:11px}}
    @media(prefers-reduced-motion:reduce){.search-link{transition:none}.search-link:hover{transform:none}}`;
