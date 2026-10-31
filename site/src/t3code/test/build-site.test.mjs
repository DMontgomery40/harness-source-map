import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, symlink } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../build-site.mjs';
import { categories } from '../catalog.mjs';
import { SECTIONS } from '../../shared/sections.mjs';
import { buildTrace } from '../../shared/trace-build.mjs';
import { renderLanding } from '../../shared/landing.mjs';
import { SITE, productOrigin } from '../../shared/site.mjs';
import { productLabel } from '../../../trace/products.js';
const sourceRoot = fileURLToPath(new URL('../../../../t3code/', import.meta.url));
const viewer = fileURLToPath(new URL('../../../trace/', import.meta.url));

test('T3 Code uses exactly the existing seven sidebar sections', () => {
  assert.deepEqual(categories.map(c => c.label), SECTIONS.map(s => s.label));
  const pages = categories.flatMap(c => c.files);
  assert.equal(new Set(pages.map(p => p.slug)).size, pages.length);
  assert.deepEqual(SITE.products.t3code, { path: 't3code', label: 'T3 Code' });
  assert.equal(productLabel('t3code'), 'T3 Code');
  assert.match(renderLanding(), /href="t3code\/"/);
  assert.match(renderLanding(), /orchestrator that runs the other harnesses/);
});

test('every T3 Code typed record appears once in search and the Trace reference index', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 't3code-reference-'));
  try {
    await symlink(viewer, path.join(dir, 'trace'), 'dir');
    const outDir = path.join(dir, 'dist/t3code');
    const context = await buildSite({ sourceRoot, outFile: path.join(outDir, 'index.html'), categories, fullInventory: true });
    const catalog = JSON.parse(await readFile(path.join(sourceRoot, 'outputs/library-catalog.json'), 'utf8'));
    const documents = context.documents;
    const ids = documents.flatMap(d => (d.searchRecords ?? []).map(r => r.id));
    const intended = catalog.libraries.flatMap(l => l.recordIds);
    assert.deepEqual(ids.sort(), intended.sort());
    assert.equal(new Set(ids).size, intended.length);
    const search = JSON.parse(await readFile(path.join(outDir, 'search-index.json'), 'utf8'));
    assert.equal(search.items.filter(i => i.h === undefined).length, intended.length);
    assert.equal(search.items.filter(i => i.k === 'tool').length, catalog.libraries.filter(l => l.kind === 'tool').reduce((sum, l) => sum + l.count, 0));
    assert.equal(search.ver, JSON.parse(await readFile(path.join(sourceRoot, 'outputs/capture-summary.json'), 'utf8')).version);
    const built = await buildTrace({ siteRoot: dir, sourceRoot, categories, siteId: 't3code', origin: productOrigin('t3code'), section: 't3code', copy: false, write: false });
    assert.equal(built.index.records.length, intended.length);
    const locations = new Set();
    for (const record of built.index.records) {
      assert.ok(record.anchor, record.title);
      const key = `${record.slug}#${record.anchor}`;
      assert.ok(!locations.has(key), key); locations.add(key);
      const html = await readFile(path.join(dir, 'dist', record.slug, 'index.html'), 'utf8');
      assert.ok(html.includes(`id="${record.anchor}"`), key);
    }
    for (const library of catalog.libraries.filter(l => l.count)) {
      const typed = JSON.parse(await readFile(path.join(sourceRoot, 'outputs', library.json), 'utf8')).items;
      for (const item of typed) assert.equal(built.index.records.filter(r => r.slug === `t3code/${library.id}` && r.title === item.title).length, 1, item.id);
    }
    for (const name of ['discovery-inventory', 'source-inventory', 'discovery-coverage', 'library-catalog']) {
      const original = await readFile(path.join(sourceRoot, `outputs/${name}.json`));
      const compressed = await readFile(path.join(outDir, `${name}.json.gz`));
      assert.deepEqual(gunzipSync(compressed), original);
      assert.ok(compressed.length < 25 * 1024 * 1024);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
