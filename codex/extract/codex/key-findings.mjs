#!/usr/bin/env node
// Current findings derive from public extraction records. Historical browser observations
// retain their dates and never stand in for current server-side instruction captures.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { categories } from '../../../site/src/codex/catalog.mjs';
import { productOrigin } from '../../../site/src/shared/site.mjs';
import { privacyScan } from './lib/privacy.mjs';

const records = categories.flatMap(category => category.files);
const link = (label, filename) => {
  const record = records.find(item => item.path === `outputs/${filename}`);
  if (!record) throw new Error(`Key findings has no catalog page for ${filename}`);
  return `[${label}](${productOrigin('codex')}/${record.slug}/)`;
};
const size = values => (values ?? []).length;
const count = value => value.toLocaleString('en-US');
export function renderKeyFindings({sources,comparison,provenance,promptPages,tools,config,env,ledger,sweep}) {
  const models = Object.keys(comparison.models);
  const fields = [...new Set(models.flatMap(model => Object.keys(comparison.models[model])))];
  const identical = fields.filter(field => models.length > 0 && models.every(model => typeof comparison.models[model][field]?.sha256 === 'string') && new Set(models.map(model => comparison.models[model][field].sha256)).size === 1);
  const distinct = fields.filter(field => !identical.includes(field));
  const namedFields = values => values.length ? values.map(field => `\`${field}\``).join(', ') : 'none';
  const modelLinks = models.map(model => {
    const file = `${model}-base-instructions.md`;
    return records.some(item => item.path === `outputs/${file}`) ? link(model, file) : `\`${model}\` (${link('catalog capture', 'other-catalog-models.md')})`;
  }).join(', ');
  const roleLines = [...sweep.matchAll(/^Role: (.+)$/gm)].map(match => match[1]);
  const local = roleLines.filter(line => line.startsWith('local source review')).length;
  const classified = roleLines.filter(line => line.startsWith('Jev classification')).length;
  // Match exact recovered authority text, not prose headings or classifier descriptions.
  const pageScope = /```text\n[\s\S]*?agent_instructions[\s\S]*?Page-scoped[\s\S]*?```/.test(sweep);
  const candidates = ledger.candidates ?? [];
  const positive = candidates.filter(candidate => typeof candidate.triage_score === 'number' && candidate.triage_score >= 0.5);
  const endpoints = positive.filter(candidate => candidate.kind === 'endpoints').length;
  const prompts = promptPages.reduce((total,page) => total + size(page.items),0);
  const unavailable = promptPages.reduce((total,page) => total + size(page.not_found),0);
  const persistent = identical.includes('persistent_instructions')
    ? 'The persistent field is identical across these records; it applies only when persistent mode is enabled.'
    : 'The persistent field differs or is absent across these records; the persistent-mode page shows Astra’s captured variant, and the model comparison records the differences.';
  return `# Key findings

Current extraction: ChatGPT desktop ${sources.app.version} (build ${sources.app.build}), bundled Codex CLI ${sources.cli.version.replace(/^codex-cli\s+/,'')}. These findings regenerate from the current published records on every refresh. Each linked source retains its own capture provenance; a failed extractor can leave an earlier record in place.

## The authenticated catalog exposes the model instruction stack

The current comparison includes ${models.length} model records: ${modelLinks}. Base instructions are model-specific catalog defaults. ${link('Conditional instruction modules', 'gpt-6-instruction-modules.md')} expose harness controls such as approvals, collaboration, automatic review and agent behavior when present; each module applies only when its corresponding condition is enabled. ${persistent}

${identical.length} of ${fields.length} top-level \`model_messages\` fields have identical serialized hashes across all compared records. Identical fields: ${namedFields(identical)}. Differing or absent fields: ${namedFields(distinct)}. A matching hash establishes equality of the captured value, including null values; it does not establish that a module was active. ${link('Model comparison', 'model-comparison.json')} reports hashes and field presence for the compared model records.

This is direct authenticated Codex CLI catalog evidence. It does not reveal ChatGPT Work’s server-side system or developer instructions, or prove that a specific turn used every catalog field. ${link('Prompt provenance inventory', 'prompt-provenance-inventory.json')} records ${count(size(provenance.codex_model_message_leaves))} model-message string leaves, ${count(size(provenance.helper_prompts))} desktop helper templates and ${count(size(provenance.voice_prompts))} bundled voice prompts, with hashes and separate activation labels.

## Page instructions have an explicit authority boundary

${pageScope ? `The shipped Page editing and visualization wrappers recognize complete native \`agent_instructions\` blocks on the selected Page as Page-scoped user-priority guidance. Those blocks cannot override the live request or grant permissions. Ordinary Page Markdown, HTML and tool results remain untrusted reference material. Product-identified blocks and completeness checks establish the client’s intended boundary; these extracted wrappers do not prove live server enforcement.` : 'No Page-scoped agent-instruction wrapper was recovered in the current published sweep; the absence does not establish that the feature is unavailable.'} ${link('Recovered Page wrappers', 'desktop-model-facing-text.md')} supplies the exact text and source locators.

Team Space UI text separately describes shared agent instructions used by scheduled runs. ${link('Surface coverage ledger', 'devday-surface-coverage.md')} retains the source text and unresolved dispatch details. Page-scoped guidance, scheduled-run composition and ordinary document content have distinct evidence boundaries.

## Intelligent UI has separate instruction and delivery paths

${link('Intelligent UI and inline visualizations', 'intelligent-ui.md')} publishes the complete Visualize skill, design-controls reference and Page-precedence notice from the shipped desktop app. It distinguishes registered learning blocks, generative-UI widget refresh and inline HTML, and records widget-state handling and the Sites handoff. Client source establishes those instruction contents and assembly paths; account rollout and server-side delivery require separate evidence.

## Shipped prompts and tools show what the client can assemble

${link('Plan mode and Default mode', 'collaboration-modes.md')} documents mode selection, developer-message assembly and the exact executable-verified templates. Null catalog mode fields mean no catalog override; selected mode settings can still supply the instructions. Plan mode is distinct from the \`update_plan\` progress tool.

The ${promptPages.length} ChatGPT prompt inventories contain ${count(prompts)} published items and ${count(unavailable)} unavailable anchors. ${link('Work prompts', 'chatgpt-work-prompts.md')} includes the current captured requests and source labels. ${link('Desktop tool manifest', 'desktop-tool-manifest.md')} defines ${count(size(tools.tools))} tools. The ${link('configuration reference', 'codex-config.md')} contains ${count(size(config.items))} entries and the ${link('environment-variable reference', 'codex-env-vars.md')} contains ${count(size(env.items))} entries; each follows its documented source version.

The additional ${link('model-facing text sweep', 'desktop-model-facing-text.md')} publishes ${count(roleLines.length)} reviewed entries: ${count(local)} local source review and ${count(classified)} Jev classifications. Classifier confidence is a triage signal, while local review is a separate source decision. Neither proves UI execution, account access or live model delivery.

The structural ledger contains ${count(candidates.length)} structural candidates; ${count(positive.length)} classified positive, including ${count(endpoints)} endpoints. A shipped endpoint, label, enum or feature flag does not establish a launched or enabled feature. ${link('Complete coverage and unresolved surfaces', 'devday-surface-coverage.md')} preserves these limits.

## Historical Work and voice observations — September 24, 2026

Authenticated browser test turns on September 24 selected \`gpt-6-astra-wm\`, \`gpt-6-sol-wm\` and \`gpt-6-luna-wm\`. Each observed request contained one user message and the model selection, with no client-visible system, developer or prompt field. Those dated observations do not capture the Work service’s instruction stack and are not refreshed by a new CLI catalog. ${link('Dated Work evidence', 'chatgpt-work-source-check-2026-09-24.md')} · ${link('Sanitized browser trace', 'chatgpt-work-gpt6-client-trace-2026-09-24.json')}.

The September 24 automatic voice prefetch selected Luna and advertised an empty client tool list, but it was not a completed microphone call. The completed-call Work voice tool surface remains unobserved in that evidence. ${link('Dated voice observation', 'voice-tool-surface-2026-09-24.md')}. The current ${link('bundled Codex/ChatGPT voice prompts', 'voice-prompts.md')} are a separate static source; their presence does not establish Work voice tools or runtime activation.
`;
}
export function generate(root = path.resolve(import.meta.dirname,'../..')) {
  const read = filename => JSON.parse(fs.readFileSync(path.join(root,'outputs',filename),'utf8'));
  const promptPages = ['conversation','gpt-builder','work','finance-health','sites-artifacts'].map(name => read(`chatgpt-${name}-prompts.json`));
  const md = renderKeyFindings({sources:read('sources.json'),comparison:read('model-comparison.json'),provenance:read('prompt-provenance-inventory.json'),promptPages,tools:read('desktop-tool-manifest.json'),config:read('codex-config.json'),env:read('codex-env-vars.json'),ledger:read('devday-surface-coverage.json'),sweep:fs.readFileSync(path.join(root,'outputs/desktop-model-facing-text.md'),'utf8')});
  privacyScan(new Map([['key-findings.md',md]]));
  const out = path.join(root,'outputs/key-findings.md');
  const changed = !fs.existsSync(out) || fs.readFileSync(out,'utf8') !== md;
  fs.writeFileSync(out,md);
  return {page:'key-findings',changed};
}
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(generate()));
