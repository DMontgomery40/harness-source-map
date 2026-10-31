#!/usr/bin/env node
// Standalone S1 build until the lead registers this product in the central site builder.
// It extends, and never replaces, the other products in the existing Trace index.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from './build-site.mjs';
import { categories } from './catalog.mjs';
import { buildTrace } from '../shared/trace-build.mjs';
import { writeSearchText } from '../shared/search-index.mjs';
import { writeProductDocs } from '../shared/llms.mjs';
import { SITE, productOrigin } from '../shared/site.mjs';
const siteRoot = fileURLToPath(new URL('../../', import.meta.url));
const sourceRoot = fileURLToPath(new URL('../../../t3code/', import.meta.url));
const outDir = path.join(siteRoot, 'dist/t3code');
await mkdir(outDir, { recursive: true });
const context = await buildSite({ sourceRoot, outFile: path.join(outDir, 'index.html'), categories, fullInventory: true });
await writeSearchText(outDir);
await writeProductDocs({ outDir, product: 't3code', categories, documents: context.documents });
const built = await buildTrace({ siteRoot, sourceRoot, categories, siteId: 't3code', section: 't3code', origin: productOrigin('t3code'), copy: false, write: false });
const indexFile = path.join(siteRoot, 'dist/trace/reference-index.json');
const combined = JSON.parse(await readFile(indexFile, 'utf8'));
combined.byProduct.t3code = { ...built.index, libName: SITE.name, label: SITE.products.t3code.label };
await writeFile(indexFile, JSON.stringify(combined));
console.log(`T3 Code: ${built.index.records.length} Trace reference records`);
