// An answer's text as safe parts: plain text, and bracketed citations. Only an [E#] id that the answer's own
// preview cited (its local citation map) is actionable; an unknown, malformed or invented id stays visible text,
// marked unsupported, and is never repaired to a nearby id. A valid id proves the record exists, not that the
// claim beside it follows from it. Pure: the composer renders the parts with textContent only.
const BRACKET = /\[([^\[\]\n]{1,80})\]/g;
const VALID = /^E[1-9][0-9]{0,5}$/;

// -> [{ type: "text", text } | { type: "cite", id } | { type: "unsupported", text, id? }]
export function answerParts(text, known) {
  const out = [];
  const s = String(text ?? "");
  let at = 0;
  const push = part => {
    const last = out[out.length - 1];
    if (part.type === "text" && last?.type === "text") last.text += part.text; else out.push(part);
  };
  for (const m of s.matchAll(BRACKET)) {
    const inner = m[1];
    // a list of ids: [E1, E2] or [E1][E2] (the second is its own bracket)
    const ids = inner.split(/\s*[,;]\s*/);
    // an attempt at a citation: E or e, then digits (perhaps more after them), or a bare E; else ordinary brackets
    if (!ids.every(x => /^(?:[Ee]\s*\d+\w*|E)$/.test(x.trim()))) continue;
    if (m.index > at) push({ type: "text", text: s.slice(at, m.index) });
    push({ type: "text", text: "[" });
    ids.forEach((raw, k) => {
      const id = raw.trim();
      if (k) push({ type: "text", text: ", " });
      if (VALID.test(id) && known.has(id)) out.push({ type: "cite", id });
      else out.push({ type: "unsupported", text: id, id: VALID.test(id) ? id : null });
    });
    push({ type: "text", text: "]" });
    at = m.index + m[0].length;
  }
  if (at < s.length) push({ type: "text", text: s.slice(at) });
  return out;
}

// The ids an answer cites, split by whether its preview knows them: { known: [...], unsupported: [...] }.
export function citedIds(text, known) {
  const parts = answerParts(text, known);
  return { known: [...new Set(parts.filter(p => p.type === "cite").map(p => p.id))], unsupported: parts.filter(p => p.type === "unsupported").map(p => p.text) };
}
