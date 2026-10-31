// Finds any of many literal strings in text: the same matches as one alternation regex of them, longest first
// (leftmost, then longest), but in one pass with a rolling hash. A machine holds thousands of credential values; as
// one regex they scan about 2 MB a second, which made an hourly harvest of a busy family take minutes.
const B = 0x01000193;

export class ExactSet {
 constructor(values) {
  this.values = [...new Set([...values].filter(v => typeof v === 'string' && v.length > 0))];
  this.w = this.values.length ? Math.min(...this.values.map(v => v.length)) : 0;
  this.table = new Map();
  this.bits = new Uint8Array(1 << 20);
  let bw = 1; for (let i = 1; i < this.w; i++) bw = Math.imul(bw, B);
  this.bw = bw;
  for (const v of this.values) {
   const h = this.hash(v, 0);
   if (!this.table.has(h)) this.table.set(h, []);
   this.table.get(h).push(v);
   this.bits[h & 0xfffff] = 1;
  }
  for (const list of this.table.values()) list.sort((a, b) => b.length - a.length);
 }
 hash(s, at) {let h = 0; for (let i = 0; i < this.w; i++) h = (Math.imul(h, B) + s.charCodeAt(at + i)) >>> 0; return h;}
 // Matches as [index, value], left to right, not overlapping.
 *find(text) {
  const w = this.w, n = typeof text === 'string' ? text.length : 0;
  if (!w || n < w) return;
  let i = 0, h = this.hash(text, 0);
  while (i + w <= n) {
   const hit = this.bits[h & 0xfffff] ? this.table.get(h)?.find(v => text.startsWith(v, i)) : undefined;
   if (hit) {
    yield [i, hit];
    i += hit.length;
    if (i + w > n) return;
    h = this.hash(text, i);
    continue;
   }
   if (i + w >= n) return;
   h = (Math.imul((h - Math.imul(text.charCodeAt(i), this.bw)) >>> 0, B) + text.charCodeAt(i + w)) >>> 0;
   i++;
  }
 }
 has(text) {for (const _ of this.find(text)) return true; return false;}
 replace(text, fn) {
  if (typeof text !== 'string' || !this.w) return text;
  let out = '', last = 0;
  for (const [i, v] of this.find(text)) {out += text.slice(last, i) + fn(v); last = i + v.length;}
  return last ? out + text.slice(last) : text;
 }
}
