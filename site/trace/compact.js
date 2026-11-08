// One interaction for long values in ordinary rows (ids, hashes, encoded ids, URLs, paths): a short distinguishing
// label, a deliberate reveal of the exact value (wrapping narrowly in place), and a separate Copy of the exact
// original. Readers never use it: they show exact source text as stored. Also: a short tooltip that works by
// keyboard focus as well as hover (tip), for the few controls whose effect their name cannot carry.
import { el } from "./panels.js";
import { middle, urlLabel, pathLabel } from "./ids.js";

// The label a value gets when the caller has none: host and path for a URL, the tail of a path, else both ends.
export function autoLabel(value, kind = null) {
  const s = String(value ?? "");
  if (kind === "url" || (!kind && /^(https?|wss?):\/\//i.test(s))) return urlLabel(s) || middle(s, 24, 8);
  if (kind === "path" || (!kind && /[\\/]/.test(s) && !/\s/.test(s))) return pathLabel(s);
  return middle(s);
}

// One hidden description element per distinct tooltip text (re-rendered panels reuse them; bounded by the texts).
const described = new Map();
// A tooltip for `target`: shown on hover and on keyboard focus (CSS, from data-tip), and the same text as the
// target's accessible description. Returns the target.
export function tip(target, text) {
  if (!target || !text) return target;
  const t = String(text);
  target.dataset.tip = t;
  target.classList?.add?.("has-tip");
  let id = described.get(t);
  if (!id) {
    id = `tip-${described.size + 1}`;
    described.set(t, id);
    document.body?.append?.(el("span", { id, class: "sr-only", hidden: true, text: t }));
  }
  target.setAttribute("aria-describedby", id);
  return target;
}

// Copies `value` exactly; the button says whether that worked. Returns the promise.
export function copyText(value, button = null, { done = "Copied", failed = "Select to copy" } = {}) {
  const label = button?.textContent;
  const say = text => { if (!button) return; button.textContent = text; setTimeout(() => { if (button.textContent === text) button.textContent = label; }, 1600); };
  try {
    const p = navigator.clipboard?.writeText(String(value));
    if (!p) { say(failed); return Promise.resolve(false); }
    return p.then(() => { say(done); return true; }, () => { say(failed); return false; });
  } catch { say(failed); return Promise.resolve(false); }
}

// A Copy button for an exact value (commands, ids): its own control, never part of a label.
export function copyButton(value, { label = "Copy", what = "value", cls = "btn small" } = {}) {
  const b = el("button", { type: "button", class: `${cls} copy-btn`, text: label, "aria-label": `Copy ${what}` });
  b.addEventListener("click", e => { e.stopPropagation(); copyText(value, b); });
  return b;
}

// The compact value: label · reveal · copy. A value short enough to read whole is shown whole, with Copy only when
// asked for (copy: true). opts: { label, kind: "id"|"url"|"path"|"hash", what (spoken name), copy }
export function compactValue(value, { label = null, kind = null, what = "value", copy = true } = {}) {
  const exact = String(value ?? "");
  const shown = label ?? autoLabel(exact, kind);
  if (!exact) return el("span", { class: "cv empty", text: shown || "–" });
  const wrap = el("span", { class: "cv" });
  if (shown === exact) {
    wrap.append(el("span", { class: "cv-text", text: exact }));
    if (copy) wrap.append(copyButton(exact, { label: "⧉", what, cls: "cv-copy" }));
    return wrap;
  }
  const full = el("code", { class: "cv-full", hidden: true, text: exact });
  const reveal = el("button", { type: "button", class: "cv-label", "aria-expanded": "false", text: shown, "aria-label": `${shown}, show the full ${what}` });
  const toggle = open => { full.hidden = !open; reveal.setAttribute("aria-expanded", String(open)); wrap.classList.toggle("open", open); };
  reveal.addEventListener("click", e => { e.stopPropagation(); toggle(full.hidden); });
  // Esc closes an open value before it reaches Trace's own back step
  wrap.addEventListener("keydown", e => { if (e.key === "Escape" && !full.hidden) { e.preventDefault(); e.stopPropagation(); toggle(false); reveal.focus?.(); } });
  wrap.append(reveal);
  if (copy) wrap.append(copyButton(exact, { label: "⧉", what, cls: "cv-copy" }));
  wrap.append(full);
  return wrap;
}
