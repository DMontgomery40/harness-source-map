#!/usr/bin/env node
// A discoverable mode reference, derived from executable-verified templates and catalog
// captures. The CLI extractor must run first; source text may not silently replace a record.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { privacyScan } from './lib/privacy.mjs';

const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const fence = text => '`'.repeat(Math.max(3,1+Math.max(0,...[...text.matchAll(/`+/g)].map(m=>m[0].length))));
const block = text => `${fence(text)}text\n${text.replace(/\n+$/,'')}\n${fence(text)}`;
export function buildModeDocuments({source,templates,models}) {
  const items=['plan','default'].map(mode=>{
    const item=templates.find(t=>t.source===`collaboration-mode-templates/templates/${mode}.md`);
    if(!item) throw new Error(`${mode} template missing from executable-verified inventory`);
    if(sha(item.text)!==item.sha256) throw new Error(`${mode} template hash disagrees with executable provenance`);
    return {...item,id:`collaboration-${mode}`,mode,area:'Mode templates',title:mode==='plan'?'Plan mode':'Default mode',kind:'prompt',document:'collaboration-modes.md'};
  });
  const catalog_modes=models.map(model=>({model:model.slug ?? model.model_slug,default:model.model_messages?.collaboration_modes?.default ?? null,plan:model.model_messages?.collaboration_modes?.plan ?? null}));
  const code = file => `[\`codex-rs/${file}\`](https://github.com/openai/codex/blob/${source.commit}/codex-rs/${file})`;
  const rows=catalog_modes.map(m=>`| \`${m.model}\` | ${m.default==null?'No override':'Captured override'} | ${m.plan==null?'No override':'Captured override'} |`).join('\n');
  const overrides=new Map();
  for(const m of catalog_modes) for(const mode of ['default','plan']) if(m[mode]!=null) {
    const text=m[mode];
    if(!overrides.has(text)) overrides.set(text,[]);
    overrides.get(text).push(`\`${m.model}\` · \`${mode}\``);
  }
  const markdown=`# Plan mode and Default mode

Source: openai/codex \`${source.tag}\` (commit \`${source.commit.slice(0,12)}\`), matching the bundled \`${source.cli_version}\`. Mode templates below are checked byte for byte against the shipped executable; catalog overrides come from the published authenticated model records.

Plan mode is a harness collaboration mode with its own developer instructions. It lets the agent inspect the environment, resolve requirements and produce a complete plan while prohibiting implementation edits. Default mode restores the normal task workflow. The two modes exist independently of persistent mode and the \`update_plan\` progress tool.

## What selects and inserts the mode

The selected collaboration mode is \`ModeKind::Plan\` or \`ModeKind::Default\`. Built-in presets supply the matching bundled developer instructions; the Plan preset also selects medium reasoning effort. See ${code('models-manager/src/collaboration_mode_presets.rs')}.

When \`include_collaboration_mode_instructions\` is enabled (its source default is true), world-state assembly reads the effective mode and adds its instruction section. The mode's authenticated \`model_messages.collaboration_modes.plan\` or \`.default\` catalog override takes precedence. Without an override, the harness uses non-empty \`settings.developer_instructions\` from the selected preset or custom mode settings. A null catalog Plan field therefore does not mean Plan mode is absent. See ${code('core/src/session/world_state.rs')}, ${code('core/src/config/mod.rs')} and ${code('core/src/context/world_state/collaboration_mode.rs')}.

The fragment has role \`developer\`, content kind \`collaboration_mode.instructions\`, and \`<collaboration_mode>\` / \`</collaboration_mode>\` markers. The harness compares mode, model and instruction hashes with retained world state before emitting a changed fragment. When \`update_plan_enabled\` is false, it strips the tool's guidance from recognized built-in instructions; custom instructions remain unchanged. The templates' own rules say user wording does not switch the active mode; a new developer mode message does.

## What Plan mode changes

The bundled Plan prompt allows non-mutating exploration and validation, asks the agent to ground its questions in the environment, and forbids implementing the plan or changing tracked files. It describes exploration, intent and implementation-detail phases. A finished specification is rendered inside \`<proposed_plan>\` tags. The \`update_plan\` tool is a separate progress checklist and cannot enter or leave Plan mode. The exact current prompt follows below.

The \`request_user_input\` handler checks its configured available modes and rejects calls in unavailable modes. In Plan mode, its request sets \`is_blocking\` to true; a non-root agent cannot call it. This is distinct from \`request_user_input_async\`. See ${code('core/src/tools/handlers/request_user_input.rs')} and ${code('core/src/tools/handlers/request_user_input_spec.rs')}.

## Captured catalog fields

| Model | Default field | Plan field |
| --- | --- | --- |
${rows}

These are captured fields, not an observation of mode activation in a particular chat. The selected preset supplies the bundled fallback where a catalog override is absent. Server-only overrides and account-specific delivery remain unobserved.

## Mode templates

${items.map(item=>`### ${item.title}\n\nSource: ${code(item.source)}, SHA-256 \`${item.sha256}\`. Verified in the shipped executable.\n\n${block(item.text)}`).join('\n\n')}

## Authenticated catalog overrides

${[...overrides].map(([text,labels])=>`### ${labels.join(', ')}\n\nSource: published authenticated model records, \`model_messages.collaboration_modes\`; SHA-256 \`${sha(text)}\`.\n\n${block(text)}`).join('\n\n') || 'No mode override text in the captured records.'}
`;
  return {markdown,records:{source,items,catalog_modes}};
}

export function generate(root=path.resolve(import.meta.dirname,'../..')) {
  const read=name=>JSON.parse(fs.readFileSync(path.join(root,'outputs',name),'utf8'));
  const cli=read('codex-cli-prompts.json');
  const tag=fs.readFileSync(path.join(root,'work/codex-config/tag.txt'),'utf8').trim();
  if(cli.source.tag!==tag) throw new Error('Mode source tag does not match CLI inventory');
  const templates=cli.items.filter(i=>/^collaboration-mode-templates\/templates\//.test(i.source)).map(item=>({...item,text:fs.readFileSync(path.join(root,'work/codex-src/codex-rs',item.source),'utf8')}));
  const models=Object.keys(read('model-comparison.json').models).map(slug=>read(`${slug}-model-record.json`));
  const result=buildModeDocuments({source:cli.source,templates,models});
  const docs=new Map([['collaboration-modes.md',result.markdown],['collaboration-modes.json',`${JSON.stringify(result.records,null,2)}\n`]]);
  privacyScan(docs);
  for(const [name,text] of docs) fs.writeFileSync(path.join(root,'outputs',name),text);
  return {page:'collaboration-modes',modes:result.records.items.length,models:models.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(generate()));
