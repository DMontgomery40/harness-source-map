import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { buildSite as buildReference } from '../codex/build-site.mjs';
import { escapeHtml } from '../shared/html.mjs';

export async function profile(sourceRoot) {
  const summary = JSON.parse(await readFile(path.join(sourceRoot, 'outputs/capture-summary.json'), 'utf8'));
  const coverage = JSON.parse(await readFile(path.join(sourceRoot, 'outputs/discovery-coverage.json'), 'utf8'));
  return {
    product: 't3code', siteName: 'T3 Code Source Map', indexTitle: 'T3 Code Source Map · Orchestration, tools and provider delivery',
    shareTitle: 'T3 Code Source Map', description: 'What T3 Code adds to the harnesses it runs: orchestration instructions, MCP tools, provider delivery and configuration, with pinned public-source provenance.',
    shareDescription: 'T3 Code instructions, MCP tools, provider delivery and launch configuration from pinned public source.',
    dek: 'T3 Code is an orchestrator that runs other harnesses. Follow the instructions, tools and launch settings it adds to Claude Code, Codex/ChatGPT, OpenCode, Cursor and other providers.',
    socialCard: null, intro: false, guide: null,
    featured: ['key-findings', 'reference-instructions', 'reference-delivery', 'reference-tools', 'reference-configuration', 'reference-network'],
    additionalStyles: '\n.page-title,.markdown-body :is(h2,h3,h4,p,li){overflow-wrap:anywhere}',
    front: () => `<div class="markdown-body"><p class="date">Public source · v${escapeHtml(summary.version)} · commit <code>${escapeHtml(summary.upstreamCommit)}</code></p><p>T3 Code adds its own context around the harness each provider runs. The records preserve source text, conditions and pinned file/line/hash provenance. They describe possible delivery, not an observed agent request.</p><p>Jev discovery: ${coverage.classified.toLocaleString('en-US')} classified; ${coverage.pending.toLocaleString('en-US')} unresolved occurrences. Read the <a href="discovery-status/">coverage status</a> before treating the library as complete. <a href="/trace/">Trace</a> opens session evidence separately.</p></div>`
  };
}
export async function buildSite({ sourceRoot, outFile, categories, ...options }) {
  const context = await buildReference({ sourceRoot, outFile, categories, ...options, profile: await profile(sourceRoot) });
  const outDir = path.dirname(outFile);
  await mkdir(outDir, { recursive: true });
  for (const name of ['discovery-inventory', 'source-inventory', 'discovery-coverage', 'library-catalog']) {
    const bytes = await readFile(path.join(sourceRoot, `outputs/${name}.json`));
    await writeFile(path.join(outDir, `${name}.json.gz`), gzipSync(bytes, { level: 9 }));
  }
  return context;
}
