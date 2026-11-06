// Finds an evidence literal in an extracted Claude Code build (claude-code/work/extracted).
// Chunk names and minified identifiers change with every build; string literals and property names mostly
// don't. A literal is looked up in the chunk it was traced in, then in every chunk of the build, then again
// with its short (minified) identifiers matching any short identifier. The result records what this build
// has: its file, offset and text. null means the literal is gone from the whole build.
const fs = require('fs');
const path = require('path');

// Reserved words only: contextual ones (as, of, get, set) are ordinary minified names.
const KW = new Set(['if', 'in', 'do', 'for', 'let', 'new', 'try', 'var', 'case', 'else', 'enum', 'null', 'this', 'true', 'void', 'with']);
const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

// The match nearest `hint` (an offset), or the first match without one.
function at(s, lit, hint) {
  let best = -1, i = -1;
  while ((i = s.indexOf(lit, i + 1)) !== -1) {
    if (best === -1 || (hint !== undefined && Math.abs(i - hint) < Math.abs(best - hint))) best = i;
    if (hint === undefined) break;
  }
  return best;
}

// Quoted strings, identifiers of 4+ characters and path segments (the v1 in /v1/sessions) must match exactly;
// other 1-3 character identifiers (minified names such as e, I0, _6n) match any whole 1-4 character identifier.
// `anchor` (the longest exact part) cheaply rules out chunks before the regex runs.
const minified = (t, before, after) => /^[A-Za-z_$][\w$]{0,2}$/.test(t) && !KW.has(t) && before !== '/' && after !== '/';
function tolerantPattern(lit) {
  const parts = lit.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[A-Za-z_$][\w$]*|[\s\S]/g) || [];
  const anchor = parts.filter(t => t.length >= 4).sort((a, b) => b.length - a.length)[0];
  const re = new RegExp(parts.map((t, i) => minified(t, parts[i - 1], parts[i + 1]) ? '(?<![\\w$])[A-Za-z_$][\\w$]{0,3}(?![\\w$])' : esc(t)).join(''));
  return { anchor, re };
}

// Desktop anchors have no chunk or proximity hint. Accept only one occurrence, and
// record the installed artifact's actual bytes rather than the historical spelling.
function uniqueEvidence(text, literal) {
  if (!literal) return null;
  const exact = text.indexOf(literal);
  if (exact !== -1) return text.indexOf(literal, exact + 1) === -1 ? { offset: exact, literal } : null;
  const { anchor, re } = tolerantPattern(literal);
  if (anchor && !text.includes(anchor)) return null;
  const matches = new RegExp(re.source, 'g');
  const match = matches.exec(text);
  if (!match || matches.exec(text)) return null;
  return { offset: match.index, literal: match[0] };
}

function evidenceFinder(dir) {
  const cache = {};
  const src = f => cache[f] ??= (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'latin1') : null);
  let chunks = null;
  const all = () => chunks ??= (fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => n.endsWith('.js')).sort() : []);
  return function find(file, lit, hint) {
    const named = src(file);
    if (named !== null) { const i = at(named, lit, hint); if (i !== -1) return { file, offset: i, literal: lit }; }
    const others = all().filter(g => g !== file);
    for (const g of others) { const i = at(src(g), lit); if (i !== -1) return { file: g, offset: i, literal: lit }; }
    const { anchor, re } = tolerantPattern(lit);
    for (const g of named !== null ? [file, ...others] : others) {
      const s = src(g);
      if (anchor && !s.includes(anchor)) continue;
      const m = re.exec(s);
      if (m) return { file: g, offset: m.index, literal: m[0] };
    }
    return null;
  };
}

module.exports = { evidenceFinder, tolerantPattern, uniqueEvidence };
