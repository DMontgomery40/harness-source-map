import { escapeHtml, fileAnchor } from "./render.mjs";
import { releaseBadge } from "../shared/release-tags.mjs";

// Sidebar navigation modeled on the OpenAI Model Spec: every document is always listed,
// and a document's headings (two levels deep) appear only while that part of the page
// is on screen.

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function headingText(innerHtml) {
  return decodeEntities(innerHtml.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function uniqueId(base, ids) {
  let id = base;
  for (let n = 2; ids.has(id); n += 1) id = `${base}-${n}`;
  ids.add(id);
  return id;
}

const outlineToken = /<section\b([^>]*)>|<\/section>|<h([2-6])\b([^>]*)>([\s\S]*?)<\/h\2>/g;

// Gives every rendered heading a navigable id and returns the heading outline. A heading
// that opens an existing anchored section (review focus, module block) links to that
// section's id instead of receiving a second one.
export function anchorOutline(html, { anchor, ids }) {
  for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) ids.add(id);
  const sections = [];
  const outline = [];
  const anchored = html.replace(outlineToken, (match, sectionAttributes, level, attributes, inner) => {
    if (sectionAttributes !== undefined) {
      sections.push({ id: sectionAttributes.match(/\sid="([^"]+)"/)?.[1], headed: false });
      return match;
    }
    if (level === undefined) {
      sections.pop();
      return match;
    }
    const text = headingText(inner);
    if (!text) return match;
    const section = sections.at(-1);
    const existing = attributes.match(/\sid="([^"]+)"/)?.[1];
    let id = existing;
    if (!id && section?.id && !section.headed) id = section.id;
    if (section) section.headed = true;
    outline.push({ level: Number(level), text, id: id ?? uniqueId(`${anchor}--${slug(text) || "section"}`, ids) });
    return id ? match : `<h${level}${attributes} id="${outline.at(-1).id}">${inner}</h${level}>`;
  });
  // Documents often link to their own headings by bare slug (#section-name); point those at
  // the document-scoped ids assigned above.
  const own = new Set(outline.map(item => item.id));
  const squash = value => value.replace(/[^a-z0-9]/g, "");
  const bySquash = new Map(outline.filter(item => item.id.startsWith(`${anchor}--`)).map(item => [squash(item.id.slice(anchor.length + 2)), item.id]));
  const linked = anchored.replace(/href="#([^"]+)"/g, (match, target) => {
    if (own.has(`${anchor}--${target}`)) return `href="#${anchor}--${target}"`;
    const loose = bySquash.get(squash(target));
    return loose && !own.has(target) ? `href="#${loose}"` : match;
  });
  return { html: linked, outline };
}

// Nests an outline under its shallowest heading level plus one level below it.
export function outlineTree(outline) {
  if (!outline.length) return [];
  const top = Math.min(...outline.map(item => item.level));
  const tree = [];
  for (const item of outline) {
    if (item.level === top || (item.level === top + 1 && !tree.length)) {
      tree.push({ ...item, children: [] });
    } else if (item.level === top + 1) {
      tree.at(-1).children.push({ ...item, children: [] });
    }
  }
  return tree;
}

// Lets identifiers such as collaboration_modes.default wrap at their separators
// instead of mid-word.
function tocLabel(text) {
  return escapeHtml(text).replace(/([._/])(?=[A-Za-z0-9])/g, "$1<wbr>");
}

function renderItems(items, depth, href) {
  if (!items.length) return "";
  return `<ul>${items
    .map(item => `<li><a href="${href(item.id)}" data-depth="${depth}">${tocLabel(item.text)}</a>${renderItems(item.children, depth + 1, href)}</li>`)
    .join("")}</ul>`;
}

// `href(path, id)` returns the link for a document (no id) or one of its headings.
// Only documents with an entry in `outlines` list their headings.
export function renderToc(categories, outlines, href, siteName) {
  const groups = categories
    .map(category => `
        <div class="toc-group">
          <div class="toc-label">${escapeHtml(category.label)}</div>
          <ul>
            ${category.files
              .map(file => {
                const anchor = file.anchor ?? fileAnchor(file.path);
                const title = escapeHtml(file.title ?? file.path.split("/").at(-1)) + (file.isNew ? releaseBadge() : "");
                const children = renderItems(outlineTree(outlines.get(file.navKey ?? file.path) ?? []), 1, id => href(file.navKey ?? file.path, id));
                return `<li data-document="${anchor}"><a href="${href(file.navKey ?? file.path)}" data-depth="0">${title}</a>${children}</li>`;
              })
              .join("\n")}
          </ul>
        </div>`)
    .join("\n");

  return `<nav class="toc-nav" aria-label="Table of contents">
    <a class="toc-brand" href="/">${escapeHtml(siteName)}</a>
    <div class="toc-collapsible">
      <button class="toc-toggle" type="button" aria-expanded="false" aria-controls="toc">
        <span class="toc-current">Contents</span>
        <svg class="toc-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 15 6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="toc" id="toc">${groups}</div>
    </div>
  </nav>`;
}

export const tocStyles = `
    .toc-nav{position:fixed;z-index:20;inset:0 auto 0 0;width:250px;display:flex;flex-direction:column;padding-top:89px}
    .toc-brand{flex:none;display:block;margin:0 30px 20px 48px;color:var(--text);font-size:23px;font-weight:800;line-height:1.15;letter-spacing:-.02em;text-decoration:none}
    .toc-brand:hover,.toc-brand:focus-visible{color:var(--link)}
    .toc-collapsible{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
    .toc{flex:1 1 auto;min-height:0;padding:0 30px 48px 48px;overflow-y:auto;scrollbar-width:thin}
    .toc-toggle{display:none}
    .toc-group{margin:0 0 24px}
    .toc-label{margin-bottom:6px;color:#c6c9c2;font-size:12px;font-weight:600;letter-spacing:.045em;text-transform:uppercase}
    .toc ul{margin:0;padding:0;list-style:none}
    .toc li{margin:0 0 5px}
    .toc a{display:block;color:var(--muted);font-size:13px;line-height:1.35;text-decoration:none;overflow-wrap:break-word;transition:color .2s}
    .toc a:hover,.toc a:focus-visible,.toc a.in-view{color:var(--text)}
    .toc li>ul{display:none;margin:5px 0 8px 1px;padding-left:12px;border-left:1px solid #3a3d39}
    .toc a.in-view+ul{display:block}
    .toc li[data-closed]>ul{display:none}
    .toc li>ul a{color:#a3a79f}
    .toc li>ul a:hover,.toc li>ul a:focus-visible,.toc li>ul a.in-view{color:var(--text)}
    .markdown-body :is(h2,h3,h4,h5,h6),.markdown-body section[id]{scroll-margin-top:28px}
    @media(max-width:1050px){.toc-nav{width:220px}.toc-brand{margin-left:30px}.toc{padding-left:30px}}
    @media(max-width:800px){
      .toc-nav{inset:auto 0 0 0;z-index:40;flex-direction:column;width:auto;padding-top:0;padding-bottom:env(safe-area-inset-bottom);border-top:1px solid #3a3d39;background:var(--panel);box-shadow:0 -12px 32px #0007}
      .toc-brand{margin:0;padding:12px 22px;font-size:17px;border-bottom:1px solid #3a3d39}
      .toc-collapsible{flex:none;flex-direction:column-reverse}
      .toc-toggle{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:0 18px 0 22px;border:0;background:none;color:var(--text);font:500 15px/1.3 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left;cursor:pointer}
      .toc-current{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .toc-chevron{flex:none;color:var(--muted);transition:transform .25s}
      .toc-nav.is-open .toc-chevron{transform:rotate(180deg)}
      .toc{display:none;height:auto;max-height:min(62vh,480px);padding:20px 22px 8px;border-bottom:1px solid var(--line)}
      .toc-nav.is-open .toc{display:block}
      .toc a{padding:3px 0;font-size:14px}
      .main{padding-bottom:130px}
    }
    @media(prefers-reduced-motion:reduce){.toc a,.toc-chevron{transition:none}}`;

// Without JavaScript the mobile bar cannot open, so the contents render in place.
export const tocNoscriptStyles = "@media(max-width:800px){.toc-nav{position:static;display:block;border:0;box-shadow:none;background:none}.toc-toggle{display:none}.toc{display:block;max-height:none;padding:100px 22px 0}}";

export const tocScript = `
    (() => {
      const nav = document.querySelector(".toc-nav");
      if (!nav) return;
      const toc = nav.querySelector(".toc");
      const toggle = nav.querySelector(".toc-toggle");
      const current = nav.querySelector(".toc-current");
      const mobile = matchMedia("(max-width: 800px)");
      const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
      const entries = [...toc.querySelectorAll("a[data-depth]")].flatMap(link => {
        const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
        if (!target) return [];
        const depth = Number(link.dataset.depth);
        const panel = target.closest("details.document, .document-page");
        return [{ link, target, depth, panel, parent: null, next: null }];
      });
      entries.forEach((entry, index) => {
        for (let i = index - 1; i >= 0; i -= 1) {
          if (entries[i].depth < entry.depth) { entry.parent = entries[i]; break; }
        }
        if (entry.depth === 0) return;
        for (let i = index + 1; i < entries.length; i += 1) {
          if (entries[i].panel !== entry.panel || entries[i].depth === 0) break;
          if (entries[i].depth <= entry.depth) { entry.next = entries[i]; break; }
        }
      });
      const byLink = new Map(entries.map(entry => [entry.link, entry]));
      let frozen = false;

      const shown = panel => !(panel instanceof HTMLDetailsElement) || panel.open;

      function syncClosedDocuments() {
        for (const entry of entries) {
          if (entry.depth === 0 && entry.panel) entry.link.parentElement.toggleAttribute("data-closed", !shown(entry.panel));
        }
      }

      function range(entry) {
        if (entry.depth === 0) {
          const box = entry.target.getBoundingClientRect();
          return [box.top, box.bottom];
        }
        if (!entry.panel || !shown(entry.panel) || entry.target.closest("[hidden]")) return null;
        const top = entry.target.getBoundingClientRect().top;
        let next = entry.next;
        while (next && next.target.closest("[hidden]")) next = next.next;
        const bottom = next
          ? next.target.getBoundingClientRect().top
          : entry.panel.getBoundingClientRect().bottom;
        return [top, bottom];
      }

      function keepVisible(link) {
        if (!link || (mobile.matches && !nav.classList.contains("is-open"))) return;
        const box = link.getBoundingClientRect();
        const frame = toc.getBoundingClientRect();
        const margin = 32;
        if (box.top < frame.top + margin) toc.scrollTop -= frame.top + margin - box.top;
        else if (box.bottom > frame.bottom - margin) toc.scrollTop += box.bottom - (frame.bottom - margin);
      }

      let focusLink = null;
      function show(active, focus) {
        for (const entry of entries) entry.link.classList.toggle("in-view", active.has(entry));
        focusLink = focus?.link ?? null;
        current.textContent = focusLink ? focusLink.textContent : "Contents";
        keepVisible(focusLink);
      }

      // Same reading band as the Model Spec observer (rootMargin -25% 0px -50% 0px): every
      // section overlapping it is in view, so a parent stays open while a child is read.
      function update() {
        if (frozen) return;
        const bandTop = innerHeight * 0.25;
        const bandBottom = innerHeight * 0.5;
        const active = new Set();
        let focus = null;
        for (const entry of entries) {
          const box = range(entry);
          if (!box || box[0] >= bandBottom || box[1] <= bandTop) continue;
          active.add(entry);
          if (box[0] <= bandTop && (!focus || entry.depth >= focus.depth)) focus = entry;
        }
        show(active, focus ?? [...active][0]);
      }

      let queued = false;
      function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; update(); });
      }

      function withAncestors(entry) {
        const active = new Set();
        for (let item = entry; item; item = item.parent) active.add(item);
        return active;
      }

      function scrollToEntry(entry) {
        const style = getComputedStyle(entry.target);
        const destination = Math.max(0, Math.round(entry.target.getBoundingClientRect().top + scrollY - (parseFloat(style.scrollMarginTop) || 0)));
        const distance = destination - scrollY;
        const threshold = 800;
        if (Math.abs(distance) > threshold) {
          scrollTo({ top: destination - Math.sign(distance) * threshold, behavior: "instant" });
        }
        scrollTo({ top: destination, behavior: "smooth" });
      }

      function releaseAfterScroll() {
        let timer;
        const settle = () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            removeEventListener("scroll", settle);
            frozen = false;
            update();
          }, 100);
        };
        addEventListener("scroll", settle, { passive: true });
        settle();
      }

      function setOpen(open) {
        nav.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        if (open) keepVisible(focusLink);
      }

      toc.addEventListener("click", event => {
        const link = event.target.closest("a[data-depth]");
        const entry = link && byLink.get(link);
        if (!entry || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        setOpen(false);
        if (reducedMotion.matches) return;
        event.preventDefault();
        if (entry.panel && !shown(entry.panel)) entry.panel.open = true;
        syncClosedDocuments();
        history.pushState(null, "", link.hash);
        frozen = true;
        show(withAncestors(entry), entry);
        scrollToEntry(entry);
        releaseAfterScroll();
      });

      toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
      document.addEventListener("keydown", event => {
        if (event.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
      });
      document.addEventListener("toggle", () => { syncClosedDocuments(); schedule(); }, true);
      addEventListener("scroll", schedule, { passive: true });
      addEventListener("resize", schedule);
      document.addEventListener("filterchange", schedule);
      syncClosedDocuments();
      update();
    })();`;
