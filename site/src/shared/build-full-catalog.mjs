import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createStandaloneRenderer } from '../codex/render.mjs';
import { occurrenceMarkdown, titleOf, verdictOf } from './full-catalog.mjs';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export const fileSlug = file => `source-file-${hash(file).slice(0,16)}`;
const n = value => value.toLocaleString('en-US');
const mdName = value => value.replace(/[\[\]#`*_~<>!&\\|]/g, ' ');
export function catalogIntro(manifest) {
  return `${n(manifest.files.length)} source files, containing ${n(manifest.total)} shipped text occurrences: ${n(manifest.candidates)} candidates with their saved Jev verdicts${manifest.skipped ? ` and ${n(manifest.skipped)} short literals not sent to the classifier` : ''}. Every occurrence is readable on a file page, including negatives and local-review items. Classifier judgments are evidence, not proof of runtime delivery. Third-party personal emails are masked; original text hashes remain available.`;
}
export function indexMarkdown(manifest) {
  return `# All shipped source text\n\n${catalogIntro(manifest)}\n\n## Files\n\n` + manifest.files.map(info => `### ${mdName(info.file)}\n\n${n(info.entries)} occurrences. [Read every occurrence](${fileSlug(info.file)}/).\n`).join('\n') + '\n## Downloads\n\n' + manifest.parts.map(part => `- [${part.file}](${`full-catalog/${part.file}`}) — ${n(part.entries)} entries, ${n(part.bytes)} bytes; SHA-256 \`${part.sha256}\`.`).join('\n') + '\n';
}
export function buildFullCatalog({ sourceRoot, outDir, context }) {
  const archive = path.join(sourceRoot, 'outputs/full-catalog');
  const manifest = JSON.parse(fs.readFileSync(path.join(archive, 'manifest.json')));
  const current = JSON.parse(fs.readFileSync(path.join(sourceRoot,'outputs',manifest.product==='cursor'?'discovery-summary.json':'discovery-inventory.json')));
  const identity = manifest.product==='cursor'?current.release.id:current.sourceIdentity;
  const catalogIdentity = manifest.product==='cursor'?manifest.source.id:manifest.source.identity;
  const candidates = manifest.product==='cursor'?current.candidates:current.items.length;
  const skipped = manifest.product==='cursor'?Object.values(current.skipped_occurrences).reduce((a,b)=>a+b,0):0;
  if(identity!==catalogIdentity || manifest.candidates!==candidates || manifest.skipped!==skipped) throw new Error('Full catalog is stale for current source; run the local full-catalog exporter before publication');
  const stateFile = manifest.product==='cursor'?'inventory.json':'discovery-inventory.json';
  if(manifest.verdict_state?.file!==stateFile || manifest.verdict_state.sha256!==hash(fs.readFileSync(path.join(sourceRoot,'outputs',stateFile)))) throw new Error('Full catalog verdicts are stale; run the local full-catalog exporter before publication');
  const render = createStandaloneRenderer(context);
  const pages = [], byFile = new Map(), seen = new Set(), expectedHash = crypto.createHash('sha256'), publishedHash = crypto.createHash('sha256');
  let batch = [], bytes = 0, count = 0, locations = [];
  const writePage = (slug, title, source, filter) => {
    const doc = { path: `outputs/${slug}.md`, slug, anchor: slug, title, category: 'Evidence and archive', format: 'markdown', source, outlineDepth: 3, searchRecords: [], filter };
    const dir = path.join(outDir, slug); fs.mkdirSync(dir, { recursive: true });
    return { dir, html: render(doc) };
  };
  const flush = () => {
    if (!batch.length) return;
    const file = batch[0].file, list = byFile.get(file) ?? [], part = list.length + 1;
    const slug = `source-text-${hash(file).slice(0,16)}-${part}`;
    const titles = new Map();
    const shaped = batch.map(record => {
      let title = titleOf(record);
      const key = title; titles.set(key, (titles.get(key) ?? 0) + 1);
      if (titles.get(key) > 1) title += ` · ${record.byte_start != null ? 'byte ' + record.byte_start : 'character ' + record.start}`;
      return { record, title, tags: [verdictOf(record).tag, record.surface === 'desktop' ? 'desktop' : record.surface === 'agent-cli' ? 'agent-cli' : 'source'] };
    });
    const vocabulary = [
      { id: 'model-facing', label: 'Model-facing', kind: 'status' }, { id: 'not-model-facing', label: 'Not model-facing', kind: 'status' }, { id: 'unclassified', label: 'Not classified', kind: 'status' },
      { id: 'desktop', label: 'Desktop', kind: 'topic' }, { id: 'agent-cli', label: 'Agent CLI', kind: 'topic' }, { id: 'source', label: 'Public source', kind: 'topic' }
    ].map(tag => ({ ...tag, count: shaped.filter(r => r.tags.includes(tag.id)).length })).filter(t => t.count);
    const group = 'Shipped text';
    const source = `# ${mdName(path.basename(file))} · part ${part}\n\n${n(batch.length)} text occurrences from \`${file.replace(/`/g, "'")}\`, part ${part}. Every entry preserves the shipped literal and its saved verdict or selection reason.\n\n[File contents and all parts](${fileSlug(file)}/) · [All files](all-source-text/)\n\n## ${group}\n\n` + shaped.map(({record,title}) => occurrenceMarkdown(record,{title})).join('\n');
    const filter = { vocabulary, records: shaped.map(r => ({ group, title: r.title, tags: r.tags })) };
    let { dir, html } = writePage(slug, `${path.basename(file)} · part ${part}`, source, filter);
    let at = 0;
    html = html.replace(/<h4\b[^>]*>/g, heading => {
      const record = batch[at++], anchor = `occ-${hash(record.id).slice(0,20)}`;
      locations.push([slug,anchor]);
      return heading.replace(/\sid="[^"]*"/, '').replace('>', ` id="${anchor}" data-occurrence-id="${record.id.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')}" >`);
    });
    if (at !== batch.length) throw new Error(`${slug}: rendered ${at} of ${batch.length} entries`);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    const ids = batch.map(r => r.id);
    for (const id of ids) publishedHash.update(`${id}\n`);
    const page = { slug, file, part, entries: batch.length, ids_sha256: hash(ids.join('\n')+'\n'), bytes: Buffer.byteLength(html) };
    if (page.bytes >= 24_000_000) throw new Error(`${slug}: page exceeds asset budget`);
    pages.push(page); list.push(page); byFile.set(file,list); batch = []; bytes = 0;
  };
  fs.mkdirSync(path.join(outDir, 'full-catalog'), {recursive:true});
  for (const part of manifest.parts) {
    const zipped = fs.readFileSync(path.join(archive, part.file));
    if (hash(zipped) !== part.sha256) throw new Error(`Changed archive: ${part.file}`);
    const raw = gunzipSync(zipped);
    if (hash(raw) !== part.uncompressed_sha256) throw new Error(`Changed content: ${part.file}`);
    const records = raw.toString().trimEnd().split('\n').map(JSON.parse);
    if (records.length !== part.entries) throw new Error(`Changed count: ${part.file}`);
    for (const record of records) {
      if (seen.has(record.id)) throw new Error(`duplicate occurrence ${record.id}`);
      seen.add(record.id); expectedHash.update(`${record.id}\n`); count++;
      const weight = Buffer.byteLength(record.text);
      const limit = record.status === 'not-selected' ? 500 : 60;
      if (batch.length && (batch[0].file !== record.file || batch.length >= limit || bytes + weight > 180000)) flush();
      batch.push(record); bytes += weight;
    }
    flush();
    fs.writeFileSync(path.join(outDir,'full-catalog',part.file.replace('.jsonl.gz','.locations.json.gz')),gzipSync(JSON.stringify(locations),{level:9}));
    locations = [];
    fs.copyFileSync(path.join(archive,part.file),path.join(outDir,'full-catalog',part.file));
  }
  flush();
  const expected = expectedHash.digest('hex'), published = publishedHash.digest('hex');
  if (count !== manifest.total || expected !== published) throw new Error('Full catalog publication gap');
  for (const info of manifest.files) {
    const list = byFile.get(info.file);
    if (!list || list.reduce((sum,p)=>sum+p.entries,0) !== info.entries) throw new Error(`File publication gap: ${info.file}`);
    const source = `# ${mdName(path.basename(info.file))}\n\n${n(list.length)} pages of text from \`${info.file}\`, containing ${n(info.entries)} occurrences. Every catalogued occurrence from this file is listed below.\n\n[All source files](all-source-text/)\n\n## File pages\n\n` + list.map(p=>`### Part ${p.part}\n\n${n(p.entries)} occurrences. [Read part ${p.part}](${p.slug}/).\n`).join('\n');
    const {dir,html} = writePage(fileSlug(info.file),path.basename(info.file),source);
    fs.writeFileSync(path.join(dir,'index.html'),html);
  }
  fs.writeFileSync(path.join(outDir,'full-catalog/manifest.json'), JSON.stringify({ ...manifest, files: manifest.files.map(info => ({ ...info, slug: fileSlug(info.file) })) }));
  const indexPath = path.join(outDir, 'all-source-text/index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  const search = `<form data-catalog-search style="margin:24px 0;padding:20px;border:1px solid var(--line)"><label for="catalog-query">Search every shipped literal</label><p>Search scans the split archives, including negatives and unclassified text. Results appear as each part finishes.</p><input id="catalog-query" type="search" required placeholder="Text to find" style="max-width:100%;padding:8px"><button type="submit">Search all text</button><button data-stop type="button" hidden>Stop</button><p role="status" aria-live="polite"></p><ol></ol></form>`;
  indexHtml = indexHtml.replace('<h3', search + '<h3').replace('</body>', '<script type="module" src="../full-catalog-search.js"></script></body>');
  fs.writeFileSync(indexPath,indexHtml);
  fs.copyFileSync(path.resolve(import.meta.dirname, 'full-catalog-search.js'),path.join(outDir,'full-catalog-search.js')); 
  const coverage = { total: count, candidates: manifest.candidates, skipped: manifest.skipped, expected_ids_sha256: expected, published_ids_sha256: published, pages };
  fs.writeFileSync(path.join(outDir,'full-catalog/coverage.json'),JSON.stringify(coverage));
  console.log(`full catalog ${manifest.product}: ${n(count)} entries on ${n(pages.length)} pages`);
  return coverage;
}
