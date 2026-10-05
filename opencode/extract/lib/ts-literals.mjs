import vm from "node:vm";

// A dependency-free lexer for the pinned TypeScript/TSX source. It follows the
// same literal boundary rules as the desktop scanner, with two TSX adjustments:
// a slash after a JSX expression or `<` is a tag delimiter rather than a regular
// expression. The extractor falls back to exact contiguous source spans when a
// file still cannot be scanned, so a parse failure never removes the file from
// discovery.
const REGEX_AFTER_PUNCT = new Set([..."(,=:[!&|?{;+-*%>~^"]);
const REGEX_AFTER_WORD = new Set([
  "return", "typeof", "case", "do", "else", "in", "of", "new", "delete",
  "void", "throw", "instanceof", "yield", "await",
]);

const isIdentStart = (c) => /[A-Za-z_$#]/.test(c) || c.charCodeAt(0) > 127;
const isIdentPart = (c) => /[A-Za-z0-9_$]/.test(c) || c.charCodeAt(0) > 127;

function skipString(source, start) {
  const quote = source[start];
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === "\\") i++;
    else if (source[i] === quote) return i + 1;
  }
  throw new Error(`unterminated string at ${start}`);
}

function skipRegex(source, start) {
  let inClass = false;
  for (let i = start + 1; i < source.length; i++) {
    const char = source[i];
    if (char === "\\") i++;
    else if (char === "\n") throw new Error(`unterminated regex at ${start}`);
    else if (inClass) inClass = char !== "]";
    else if (char === "[") inClass = true;
    else if (char === "/") {
      i++;
      while (i < source.length && /[a-z]/i.test(source[i])) i++;
      return i;
    }
  }
  throw new Error(`unterminated regex at ${start}`);
}

function scanTemplate(source, start, output) {
  let substitutions = 0;
  for (let i = start + 1; i < source.length; i++) {
    const char = source[i];
    if (char === "\\") i++;
    else if (char === "`") {
      output.push({ start, end: i + 1, kind: "template", substitutions });
      return i + 1;
    } else if (char === "$" && source[i + 1] === "{") {
      substitutions++;
      i = scanCode(source, i + 2, "}", output);
    }
  }
  throw new Error(`unterminated template at ${start}`);
}

function scanCode(source, start, closer, output) {
  const depth = [];
  let previous = "";
  let word = "";
  let i = start;
  if (i === 0 && source.startsWith("#!")) i = source.indexOf("\n");
  while (i < source.length) {
    const char = source[i];
    if (char === '"' || char === "'") {
      const end = skipString(source, i);
      output.push({ start: i, end, kind: "string", substitutions: 0 });
      i = end;
      previous = "a";
      word = "";
    } else if (char === "`") {
      i = scanTemplate(source, i, output);
      previous = "a";
      word = "";
    } else if (char === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      i = end < 0 ? source.length : end;
    } else if (char === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) throw new Error(`unterminated comment at ${i}`);
      i = end + 2;
    } else if (char === "/") {
      if (previous === "" || REGEX_AFTER_PUNCT.has(previous) || REGEX_AFTER_WORD.has(word)) {
        i = skipRegex(source, i);
        previous = "a";
      } else {
        previous = "/";
        i++;
      }
      word = "";
    } else if (char === "(" || char === "[" || char === "{") {
      depth.push(char);
      previous = char;
      word = "";
      i++;
    } else if (char === ")" || char === "]" || char === "}") {
      if (!depth.length) {
        if (char === closer) return i;
        throw new Error(`unbalanced ${char} at ${i}`);
      }
      depth.pop();
      previous = char;
      word = "";
      i++;
    } else if (/\s/.test(char)) {
      i++;
    } else if (isIdentStart(char)) {
      let end = i + 1;
      while (end < source.length && isIdentPart(source[end])) end++;
      word = source.slice(i, end);
      previous = "a";
      i = end;
    } else if (/[0-9]/.test(char)) {
      let end = i + 1;
      while (end < source.length && /[0-9A-Za-z_.]/.test(source[end])) end++;
      previous = "a";
      word = "";
      i = end;
    } else {
      previous = char;
      word = "";
      i++;
    }
  }
  if (closer) throw new Error(`missing ${closer}`);
  return i;
}

export function literalsOf(source) {
  const all = [];
  scanCode(source, 0, null, all);
  all.sort((a, b) => a.start - b.start);
  const outer = [];
  for (const literal of all) if (!outer.length || literal.start >= outer.at(-1).end) outer.push(literal);
  return { all, outer };
}

export function decodeLiteral(source, literal) {
  if (literal.substitutions) return source.slice(literal.start + 1, literal.end - 1);
  return vm.runInNewContext(source.slice(literal.start, literal.end), Object.create(null), { timeout: 1000 });
}
