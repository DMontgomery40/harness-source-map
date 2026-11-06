// Provenance of harness text without any separate view: where a piece of text the harness put in front of the model
// comes from (the reference library, the shipped code, outside), how many copies of it were delivered, to how many
// agents, and every copy in time order for the c / ⇧C walk and the reader's copy stepper. No DOM, no WebGL.
//
// The model is built in the worker (harness/pieces.js) the first time it is asked for, once per load and per native
// product: a mixed T3 family gets one model per product its bindings ran, each matched against that product's own
// reference and literal index, never the root's. Every request captures the load generation before it awaits; an
// answer for another generation is dropped.
//
//   createProvenance({ request(gen) -> Promise<parts> }) -> { at(trace, gen, agentId, block), reset() }

// What the library knows of a piece, in words.
export function rungWords(libName) {
  const lib = libName || "library";
  return {
    "found-nowhere": `not in the ${lib} library`,
    "binary-only": "in the shipped code",
    "in-library-unlinked": `in the ${lib} library; not linked`,
    "linked-type-text-differs": "linked by type; the text differs",
    composite: "a harness wrapper around other text",
    outside: "outside any harness binary",
    linked: `linked to a ${lib} record`,
  };
}

const num = n => Number(n).toLocaleString("en-US");
// What kind of place holds a binary-only piece's text: a CLI or app binary, a desktop app bundle (app.asar), or a
// source tree (file:line). `where.kind` says so; an older model without it is read from the shelf name, else "binary".
export const whereKind = w => w?.kind || (/app\.asar|bundle/i.test(w?.shelf || "") ? "bundle" : /\bsource\b/i.test(w?.shelf || "") ? "source" : "binary");
const PLACE = { binary: "in the binary", bundle: "in the app bundle", source: "in the source" };
// Where a piece's text lives: "in the binary: chunk-x.js @ 190,114,848", "in the app bundle: main.js @ 1,057,472",
// "in the source: codex-rs/x.rs:41".
export function whereText(p) {
  const w = p.where; if (!w) return null;
  if (p.rung === "binary-only") {
    const kind = whereKind(w), at = kind === "source" ? (Number.isFinite(w.pos) ? `:${w.pos}` : "") : Number.isFinite(w.pos) ? ` @ ${num(w.pos)}` : "";
    return `${PLACE[kind] || PLACE.binary}: ${w.key ?? w.shelf}${at}`;
  }
  return w.label ?? `${w.key ?? ""}${Number.isFinite(w.pos) ? ` @ ${num(w.pos)}` : ""}`;
}

export function createProvenance({ request }) {
  let held = null; // { gen, trace, promise, byBlock: Map("ai:bi" -> [part, piece, k]) }
  function parts(trace, gen) {
    if (held && held.gen === gen && held.trace === trace) return held.promise;
    const mine = { gen, trace, byBlock: null };
    mine.promise = request(gen).then(list => {
      if (held !== mine) return null; // another load (or a reset) came first
      mine.byBlock = new Map();
      for (const part of list || []) part.pieces.forEach(p => p.blocks.forEach(([a, b], k) => { const key = `${a}:${b}`; if (!mine.byBlock.has(key)) mine.byBlock.set(key, [part, p, k]); }));
      return list;
    }, error => { if (held === mine) held = null; throw error; });
    held = mine;
    return mine.promise;
  }
  return {
    // Every copy of the piece the block belongs to: { label, list: [{ agentId, block }], at, piece, product,
    // libName, words, where, agents } or null when the block carries no harness text (or the load changed).
    async at(trace, gen, agentId, block) {
      if (!trace || block == null) return null;
      const ai = trace.agents.findIndex(a => a.id === agentId);
      if (ai < 0) return null;
      const list = await parts(trace, gen);
      if (!list || held?.trace !== trace || held.gen !== gen) return null;
      const hit = held.byBlock.get(`${ai}:${block}`);
      if (!hit) return null;
      const [part, p, k] = hit;
      return {
        label: `${p.name} · ${p.n} ${p.n === 1 ? "copy" : "copies"}`, list: p.blocks.map(([a, b]) => ({ agentId: trace.agents[a].id, block: b })), at: k,
        piece: p, product: part.product, libName: part.libName, words: rungWords(part.libName)[p.rung] || p.rung, where: whereText(p), agents: part.agents
      };
    },
    reset() { held = null; },
  };
}
