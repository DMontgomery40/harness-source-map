// Tag filters for reference pages whose entries have records and tags (catalog `filters`).
// Every entry heading is wrapped with its record's tags; a chip bar filters entries by any
// combination of tags (an entry must carry every selected tag), and ?tags=a,b in the URL
// preselects a view so filtered views can be linked.
import { escapeHtml } from "./html.mjs";

export const plain = html => html.replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
// Some group/title strings carry literal backticks around inline code (e.g. "settings `env`")
// while the rendered heading turns that into <code>, which plain() strips along with the
// backticks. Compare with backticks removed on both sides so those still match.
const norm = s => String(s ?? "").replace(/`/g, "");
// The one key that ties a record (its group and title) to the rendered entry heading under its
// group heading. The tag filters and the search index (search-index.mjs) both match by it.
export const entryKey = (group, title) => `${norm(group)}\u0000${norm(title)}`;

export function wrapFilterable(html, filter) {
  const labels = new Map(filter.vocabulary.map(t => [t.id, t.label]));
  const queues = new Map();
  for (const record of filter.records) {
    const key = entryKey(record.group, record.title);
    (queues.get(key) ?? queues.set(key, []).get(key)).push(record);
  }
  let group = null, matched = 0, open = false, out = "";
  for (const block of html.split(/(?=<h[34][\s>])/)) {
    if (block.startsWith("<h3")) {
      if (open) out += "</section>";
      group = plain(block.match(/^<h3[^>]*>([\s\S]*?)<\/h3>/)[1]);
      out += `<section class="filter-group">${block}`;
      open = true;
      continue;
    }
    if (!block.startsWith("<h4")) { out += block; continue; }
    const heading = block.match(/^<h4[^>]*>[\s\S]*?<\/h4>/)[0];
    const record = queues.get(entryKey(group, plain(heading)))?.shift();
    if (!record) { out += block; continue; }
    matched += 1;
    const chips = record.tags.map(t => `<button type="button" class="chip chip-small" data-tag="${t}" aria-pressed="false">${escapeHtml(labels.get(t) ?? t)}</button>`).join("");
    const feeds = (record.feeds ?? []).map(f => `<a class="feeds-link" href="${escapeHtml(f.href)}">${escapeHtml(f.label)}</a>`).join("");
    out += `<section class="filter-item" data-tags="${record.tags.join(" ")}">${heading}<div class="item-tags">${chips}${feeds}</div>${block.slice(heading.length)}</section>`;
  }
  if (open) out += "</section>";
  return { html: out, matched };
}

export function filterBar(filter, total) {
  const chip = t => `<button type="button" class="chip${t.feature ? " chip-feature" : ""}" data-tag="${t.id}" aria-pressed="false"${t.description ? ` title="${escapeHtml(t.description)}"` : ""}>${escapeHtml(t.label)} <span class="chip-count">${t.count.toLocaleString("en-US")}</span></button>`;
  const topics = filter.vocabulary.filter(t => t.kind === "topic");
  const status = filter.vocabulary.filter(t => t.kind !== "topic");
  const newTag = filter.vocabulary.find(t => t.id === "new");
  return `${newTag?.description ? `<p class="release-note">${escapeHtml(newTag.description)}</p>` : ""}<div class="filter-bar" data-total="${total}">
    ${topics.length ? `<div class="filter-row"><span class="filter-label">Topics</span><div class="filter-chips">${topics.map(chip).join("")}</div></div>` : ""}
    <div class="filter-row"><span class="filter-label">Status</span><div class="filter-chips">${status.map(chip).join("")}</div></div>
    <div class="filter-status"><span class="filter-count">Showing all ${total.toLocaleString("en-US")}</span><button type="button" class="filter-clear" hidden>Clear filters</button></div>
  </div>`;
}

export const filterStyles = `
    .filter-bar{margin:0 0 28px;padding:16px 18px;border:1px solid var(--line);border-radius:6px;background:#171816}
    .filter-row{display:grid;grid-template-columns:64px 1fr;gap:10px;margin-bottom:10px}
    .filter-label{padding-top:5px;color:#c6c9c2;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
    .filter-chips{display:flex;flex-wrap:wrap;gap:6px}
    .chip{padding:4px 10px;border:1px solid #3a3d39;border-radius:999px;background:#1c1d1b;color:#d3d5cf;font:500 13px/1.4 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}
    .chip:hover{border-color:#6f736d;color:var(--text)}
    .chip[aria-pressed="true"]{border-color:#83bfd8;background:#83bfd8;color:#0d1418}
    .chip-feature{border-color:#5f7f3f;color:#dcffad}
    .chip-feature[aria-pressed="true"]{border-color:#c8f784;background:#c8f784;color:#101610}
    .chip-count{color:#a3a79f;font-size:12px}.chip[aria-pressed="true"] .chip-count{color:inherit;opacity:.85}
    .chip-small{padding:2px 8px;font-size:12px}
    .item-tags{display:flex;flex-wrap:wrap;gap:5px;margin:-6px 0 14px}
    .feeds-link{padding:2px 8px;border:1px solid #5f7f3f;border-radius:999px;color:#dcffad;font-size:12px;text-decoration:none}
    .feeds-link:hover{border-color:#c8f784}
    .filter-status{display:flex;align-items:center;gap:14px;color:#b9bcb5;font-size:14px}
    .filter-clear{padding:0;border:0;background:none;color:var(--link);font:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:.2em}
    .filter-item[hidden],.filter-group[hidden]{display:none}
    @media(max-width:800px){.filter-bar{position:static}.filter-row{grid-template-columns:1fr}.filter-label{padding:0}}`;

export const filterScript = `
    for (const bar of document.querySelectorAll(".filter-bar")) {
      const scope = bar.parentElement;
      const items = [...scope.querySelectorAll(".filter-item")];
      const groups = [...scope.querySelectorAll(".filter-group")].filter(g => g.querySelector(".filter-item"));
      const count = bar.querySelector(".filter-count"), clear = bar.querySelector(".filter-clear");
      const total = Number(bar.dataset.total);
      let selected = new Set((new URLSearchParams(location.search).get("tags") ?? "").split(",").filter(Boolean));
      const apply = () => {
        let shown = 0;
        for (const item of items) {
          const tags = item.dataset.tags.split(" ");
          item.hidden = ![...selected].every(t => tags.includes(t));
          if (!item.hidden) shown += 1;
        }
        for (const group of groups) group.hidden = !group.querySelector(".filter-item:not([hidden])");
        for (const chip of scope.querySelectorAll(".chip[data-tag]")) chip.setAttribute("aria-pressed", String(selected.has(chip.dataset.tag)));
        count.textContent = selected.size ? \`Showing \${shown.toLocaleString("en-US")} of \${total.toLocaleString("en-US")}\` : \`Showing all \${total.toLocaleString("en-US")}\`;
        clear.hidden = !selected.size;
        // The contents sidebar lists only what the filter shows.
        for (const link of document.querySelectorAll(".toc a[href*='#']")) {
          const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
          if (target && scope.contains(target)) link.parentElement.hidden = Boolean(target.closest("[hidden]"));
        }
        document.dispatchEvent(new Event("filterchange"));
        const url = new URL(location.href);
        if (selected.size) url.searchParams.set("tags", [...selected].join(",")); else url.searchParams.delete("tags");
        history.replaceState(history.state, "", url);
      };
      scope.addEventListener("click", event => {
        const chip = event.target.closest(".chip[data-tag]");
        if (!chip || !scope.contains(chip)) return;
        const tag = chip.dataset.tag;
        selected.has(tag) ? selected.delete(tag) : selected.add(tag);
        apply();
        if (!bar.contains(chip)) bar.scrollIntoView({ block: "nearest" });
      });
      clear.addEventListener("click", () => { selected = new Set(); apply(); });
      apply();
    }`;
