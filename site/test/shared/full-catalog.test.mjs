import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paginateOccurrences, occurrenceMarkdown, verifyCoverage } from '../../src/shared/full-catalog.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'opencode/outputs/discovery-inventory.json')));
const ledgerFile = path.join(root, 'opencode/work', `opencode-discovery-${inventory.sourceIdentity}.json`);
const records = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile)).records : [];
test('every saved OpenCode occurrence survives bounded file pagination', { skip: !records.length }, () => {
  const pages = paginateOccurrences(records, { maxEntries: 30, maxBytes: 100000 });
  assert.equal(pages.flatMap(p => p.records).length, inventory.items.length);
  verifyCoverage(inventory.items.map(r => r.id), pages.flatMap(p => p.records).map(r => r.id));
  assert.ok(pages.every(p => p.records.length <= 30 && new Set(p.records.map(r => r.file)).size === 1));
});
test('coverage rejects a missing or duplicate occurrence', () => {
  const ids = inventory.items.slice(0, 3).map(r => r.id);
  assert.throws(() => verifyCoverage(ids, ids.slice(1)), /missing/);
  assert.throws(() => verifyCoverage(ids, [...ids, ids[0]]), /duplicate/);
});
test('a real negative has an amber-entry heading, readable text and explicit verdict', { skip: !records.length }, () => {
  const item = records.find(r => r.status === 'classified' && r.model_facing.noul < 0.8);
  const text = occurrenceMarkdown(item);
  assert.match(text, /^### /);
  assert.match(text, /Jev judged not model-facing/);
  assert.ok(text.includes(item.text));
  assert.doesNotMatch(text, /Record: occ-/);
});
test('both public archives account for every candidate and every skipped Cursor literal', async () => {
  const { gunzipSync } = await import('node:zlib');
  const { createHash } = await import('node:crypto');
  for (const product of ['opencode', 'cursor']) {
    const archive = path.join(root, product, 'outputs/full-catalog');
    const manifest = JSON.parse(fs.readFileSync(path.join(archive, 'manifest.json')));
    const summary = JSON.parse(fs.readFileSync(path.join(root, product, 'outputs', product === 'cursor' ? 'discovery-summary.json' : 'discovery-inventory.json')));
    const expectedCandidates = product === 'cursor' ? summary.candidates : summary.items.length;
    const expectedSkipped = product === 'cursor' ? Object.values(summary.skipped_occurrences).reduce((a,b)=>a+b,0) : 0;
    assert.equal(manifest.candidates, expectedCandidates);
    assert.equal(manifest.skipped, expectedSkipped);
    let count = 0, candidates = 0, skipped = 0;
    const ids = new Set();
    for (const part of manifest.parts) {
      const compressed = fs.readFileSync(path.join(archive, part.file));
      assert.ok(compressed.length < 25_000_000);
      assert.equal(createHash('sha256').update(compressed).digest('hex'),part.sha256);
      const records = gunzipSync(compressed).toString().trimEnd().split('\n').map(JSON.parse);
      assert.equal(records.length,part.entries);
      for (const record of records) {
        assert.ok(!ids.has(record.id),`duplicate ${record.id}`); ids.add(record.id);
        assert.equal(typeof record.text,'string');
        count++; if(record.status==='not-selected') skipped++; else candidates++;
      }
    }
    assert.equal(count,manifest.total); assert.equal(candidates,expectedCandidates); assert.equal(skipped,expectedSkipped);
    if(product==='opencode') verifyCoverage(summary.items.map(r=>r.id),[...ids]);
  }
});
test('built occurrence pages preserve every archive ID and page count', async () => {
  const { createHash } = await import('node:crypto');
  for (const product of ['opencode','cursor']) {
    const dir=path.join(root,'site/dist',product);
    const file=path.join(dir,'full-catalog/coverage.json');
    if(!fs.existsSync(file)) throw new Error(`build full catalog first: ${product}`);
    const coverage=JSON.parse(fs.readFileSync(file));
    const digest=createHash('sha256'); let count=0;
    for(const page of coverage.pages) {
      const html=fs.readFileSync(path.join(dir,page.slug,'index.html'),'utf8');
      const ids=[...html.matchAll(/data-occurrence-id="([^"]+)"/g)].map(m=>m[1].replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&amp;','&'));
      assert.equal(ids.length,page.entries, page.slug);
      const bytes=ids.join('\n')+'\n';
      assert.equal(createHash('sha256').update(bytes).digest('hex'),page.ids_sha256);
      digest.update(bytes); count+=ids.length;
      assert.match(html, new RegExp(`${page.entries.toLocaleString('en-US')} text occurrences`));
      assert.ok(Buffer.byteLength(html)<25_000_000);
    }
    assert.equal(count,coverage.total);
    assert.equal(digest.digest('hex'),coverage.expected_ids_sha256);
  }
});
test('split reviewed pages keep distinct sidebar destinations', () => {
  const cases = [['opencode','key-findings','Model and agent prompts','model-prompts'],['cursor','configuration','Agent and model instructions','model-instructions']];
  for(const [product,page,label,target] of cases) {
    const html=fs.readFileSync(path.join(root,'site/dist',product,page,'index.html'),'utf8');
    assert.ok(html.includes(`href="../${target}/" data-depth="0">${label}</a>`),`${product}: ${label} must link to its own page`);
  }
});

test('Cursor archive candidate IDs match the saved Jev ledger in full', { skip: !fs.existsSync(path.join(root,'cursor/work/cursor-jev-discovery.json')) }, async () => {
  const {readLedgerRecords,LEDGER_FILE}=await import('../../../cursor/extract/classify.mjs');
  const {gunzipSync}=await import('node:zlib');const {createHash}=await import('node:crypto');
  const ledger=JSON.parse(fs.readFileSync(LEDGER_FILE));const expected=createHash('sha256'),actual=createHash('sha256');
  for(const batch of readLedgerRecords(ledger))for(const r of batch)expected.update(r.id+'\n');
  const archive=path.join(root,'cursor/outputs/full-catalog');const manifest=JSON.parse(fs.readFileSync(path.join(archive,'manifest.json')));
  let count=0;for(const part of manifest.parts)for(const line of gunzipSync(fs.readFileSync(path.join(archive,part.file))).toString().trimEnd().split('\n')){const r=JSON.parse(line);if(r.status!=='not-selected'){actual.update(r.id+'\n');count++;}}
  assert.equal(count,ledger.record_count);assert.equal(actual.digest('hex'),expected.digest('hex'));
});
test('email masking preserves real Git SSH syntax and placeholder addresses', async () => {
  const {maskPersonalEmails}=await import('../../../tools/export-full-catalog.mjs');
  // Both strings occur in the pinned Cursor Jev ledger; they are not personal identities.
  assert.equal(maskPersonalEmails('git@github.com'),'git@github.com');
  assert.equal(maskPersonalEmails('your@email.com'),'your@email.com');
});

test('Cursor presentation retains each saved semantic role for repeated shipped text', async () => {
  const { gunzipSync } = await import('node:zlib');
  const { shapeDiscovered } = await import('../../../cursor/extract/discovered-presentation.mjs');
  const archive=path.join(root,'cursor/outputs/full-catalog');
  const manifest=JSON.parse(fs.readFileSync(path.join(archive,'manifest.json')));
  const positive=[];
  for(const part of manifest.parts) {
    const rows=gunzipSync(fs.readFileSync(path.join(archive,part.file))).toString().trimEnd().split('\n').map(JSON.parse);
    for(const r of rows) if(r.status==='classified'&&r.model_facing.noul>=0.8&&['instructions','context','user_template','tool','parameter'].includes(r.role.choice)) positive.push({...r,title:r.text.slice(0,72),judgment:{semantic_role:r.role},provenance:[{file:r.file,byte_start:r.byte_start,line_start:r.line_start}]});
    if(rows.some(r=>r.status==='not-selected')) break;
  }
  const shaped=shapeDiscovered(positive,[]).items;
  const expected=new Set(positive.map(r=>r.text+'\0'+r.role.choice));
  const actual=new Set(shaped.map(r=>r.text+'\0'+r.judgment.semantic_role.choice));
  assert.deepEqual(actual,expected);
});

test('OpenCode package filters retain every merged source package', async () => {
  const { discoveredTags }=await import('../../../opencode/extract/lib/presentation.mjs');
  const items=['instructions','context-templates','tools-parameters'].flatMap(name=>JSON.parse(fs.readFileSync(path.join(root,'opencode/outputs',name+'.json'))).items);
  const result=discoveredTags(items);
  let multi=0;
  for(const item of items) {
    const packages=new Set(item.provenance.map(p=>'pkg-'+p.file.split('/')[1]));
    if(packages.size>1) multi++;
    for(const pkg of packages) assert.ok(result.items[item.id].includes(pkg),item.id+' lacks '+pkg);
  }
  assert.ok(multi>0,'pinned source has merged texts across packages');
});

test('OpenCode nested flags retain the shipped subcommand', () => {
  const items=JSON.parse(fs.readFileSync(path.join(root,'opencode/outputs/cli.json'))).items;
  assert.ok(items.some(r=>r.title==='opencode github run --event'));
  assert.ok(items.some(r=>r.title==='opencode session list --format'));
  assert.ok(items.some(r=>r.title==='opencode debug diagnostics <file> (argument)' && r.details.kind==='cli-positional'));
  assert.ok(items.some(r=>r.title==='opencode session delete <sessionID> (argument)' && r.details.kind==='cli-positional'));
});

test('archives are bound to the complete authoritative discovery state', async () => {
  const { createHash }=await import('node:crypto');
  for(const product of ['cursor','opencode']) {
    const manifest=JSON.parse(fs.readFileSync(path.join(root,product,'outputs/full-catalog/manifest.json')));
    const file=product==='cursor'?'inventory.json':'discovery-inventory.json';
    const digest=createHash('sha256').update(fs.readFileSync(path.join(root,product,'outputs',file))).digest('hex');
    assert.equal(manifest.verdict_state?.file,file);
    assert.equal(manifest.verdict_state?.sha256,digest);
  }
});

test('real lone-surrogate literals remain reversible in UTF-8 page source', async () => {
  const { gunzipSync }=await import('node:zlib');
  const archive=path.join(root,'cursor/outputs/full-catalog');
  const manifest=JSON.parse(fs.readFileSync(path.join(archive,'manifest.json')));
  let count=0;
  for(const part of manifest.parts) for(const row of gunzipSync(fs.readFileSync(path.join(archive,part.file))).toString().trimEnd().split('\n')) {
    const record=JSON.parse(row);
    if(record.text.isWellFormed()) continue;
    count++;
    const md=occurrenceMarkdown(record);
    assert.equal(Buffer.from(md).toString(),md,'UTF-8 encoding must not replace the literal');
    const json=md.match(/~{4,}json\n([^\n]+)\n~{4,}/)?.[1];
    assert.ok(json,'escaped exact literal is visible');
    assert.equal(JSON.parse(json),record.text);
  }
  assert.ok(count>0,'pinned Cursor archive contains lone-surrogate literals');
});
