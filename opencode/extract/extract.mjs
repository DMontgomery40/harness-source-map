#!/usr/bin/env node
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { records, toolFiles } from './catalog.mjs';
import { buildFullLibrary } from './lib/full-library.mjs';
import { cliCommands, environmentVariables } from './lib/structured.mjs';

export const VERSION = '1.18.34';
export const COMMIT = 'aec0b9a6d8898f68f923aaf08b7306d931fd9d76';
export const UPSTREAM = 'https://github.com/anomalyco/opencode';
const base = fileURLToPath(new URL('../', import.meta.url));
const prefix = 'packages/opencode/src/';
const hash = text => createHash('sha256').update(text).digest('hex');
const evidenceNote = `These records derive only from public upstream source. Conditions describe possible harness behavior; they do not establish that any text was sent in a session. Runtime configuration, plugins, MCP servers, provider catalogs and SDK serialization can change a request. Private recordings are not inputs to this extractor. Source excerpts are copyright (c) 2025 opencode, under the [upstream MIT license](${UPSTREAM}/blob/${COMMIT}/LICENSE); its notice is preserved in upstream-license.txt.`;

function fence(text, language) {
  const longest = Math.max(2, ...Array.from(text.matchAll(/`+/g), match => match[0].length));
  const delimiter = '`'.repeat(longest + 1);
  return `${delimiter}${language}\n${text}${text.endsWith('\n') ? '' : '\n'}${delimiter}`;
}

function markdown(title, items) {
  return `# OpenCode ${title}\n\nRelease: v${VERSION}. Upstream commit: ${COMMIT}.\n\n${evidenceNote}\n\n` + items.map(item => {
    const refs = item.provenance.map(p => `- [${p.file}:${p.startLine}-${p.endLine}](${p.url}) — SHA-256 \`${p.sha256}\``).join('\n');
    return `## ${item.title}\n\nRecord: \`${item.id}\`. Kind: ${item.details.kind}.\n\n${item.details.summary}\n\nCondition: ${item.details.condition}\n\n${refs}\n\n${fence(item.text, item.details.language ?? 'typescript')}\n`;
  }).join('\n');
}

// Grouped records: a group heading, then each record with its read or declaration sites.
function structuredMarkdown(title, items) {
  const groups = new Map();
  for (const item of items) (groups.get(item.group) ?? groups.set(item.group, []).get(item.group)).push(item);
  return `# OpenCode ${title}\n\nRelease: v${VERSION}. Upstream commit: ${COMMIT}.\n\n${evidenceNote}\n\nRead structurally from every non-test source file in the pinned workspace closure. ${items.length} records.\n\n` + [...groups].map(([group, records]) => `## ${group}\n\n` + records.map(item => {
    const refs = item.provenance.map(p => `- [${p.file}:${p.startLine}](${p.url})`).join('\n');
    const facts = [item.details.type && `Type: \`${item.details.type}\`.`, item.details.alias && `Alias: \`${item.details.alias}\`.`, item.details.readers && `Read through: ${item.details.readers.join(', ')}.`].filter(Boolean).join(' ');
    return `### ${item.title}\n\n${item.text}${facts ? `\n\n${facts}` : ''}\n\n${refs}\n`;
  }).join('\n')).join('\n');
}

const promptConditions = {
  anthropic: 'SystemPrompt.provider: model.api.id includes claude, after earlier model-name branches; agent.prompt overrides the selected provider prompt.',
  beast: 'SystemPrompt.provider: model.api.id includes gpt-4, o1 or o3; this branch precedes the general gpt branch.',
  codex: 'SystemPrompt.provider: model.api.id includes gpt and codex, but not gpt-6; earlier muse and gpt-4/o1/o3 branches win.',
  default: 'SystemPrompt.provider fallback when no preceding model-name or provider-ID branch matches; agent.prompt overrides it.',
  gemini: 'SystemPrompt.provider: model.api.id includes gemini-, after preceding muse/OpenAI-name branches.',
  gpt: 'SystemPrompt.provider: model.api.id includes gpt, after muse and gpt-4/o1/o3; neither gpt-6 nor codex matches.',
  'gpt-astra': 'SystemPrompt.provider: model.api.id includes gpt and gpt-6, after muse and gpt-4/o1/o3; takes precedence over the codex branch.',
  kimi: 'SystemPrompt.provider: case-insensitive model.api.id includes kimi, or providerID is kimi-for-coding, moonshotai or moonshotai-cn, after earlier branches.',
  meta: 'SystemPrompt.provider: model.api.id includes muse; {{MODEL_NAME}} becomes Muse Glimmer for muse-glimmer, otherwise Muse Spark.',
  trinity: 'SystemPrompt.provider: case-insensitive model.api.id includes trinity, after preceding model-name branches.',
  plan: 'SessionReminders.apply: experimentalPlanMode is disabled and current agent.name is plan; appended to the latest user message.',
  'build-switch': 'SessionReminders.apply: switches from plan to build when experimentalPlanMode is disabled; with experimentalPlanMode enabled, the latest assistant agent was plan and the current agent is not plan. Existing plan-file information may be appended.',
  'plan-mode': 'SessionReminders.apply: experimentalPlanMode enabled, current agent is plan and latest assistant agent was not plan; ${planInfo} is replaced with real plan-file state.',
  'copilot-gpt-5': 'Present as a shipped source file; no import or call site was found in the pinned packages source. Source presence alone does not establish use.',
  'plan-reminder-anthropic': 'Present as a shipped source file; no import or call site was found in the pinned packages source. Source presence alone does not establish use.',
};

function git(source, args) {
  return execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export function extract(source, options = {}) {
  source = resolve(source);
  if (git(source, ['rev-parse', 'HEAD']).trim() !== COMMIT)
    throw new Error(`Expected public upstream commit ${COMMIT}.`);
  if (git(source, ['rev-parse', `v${VERSION}^{commit}`]).trim() !== COMMIT)
    throw new Error(`Expected upstream release tag v${VERSION} to resolve to the pinned commit.`);
  if (git(source, ['status', '--porcelain', '--untracked-files=no']).trim())
    throw new Error('Upstream tracked source is modified; extraction requires the pristine release checkout.');
  const seen = new Map();
  const read = file => {
    if (!seen.has(file)) {
      if (file.startsWith('/') || file.split('/').includes('..')) throw new Error('Expected relative public source path.');
      const text = readFileSync(resolve(source, file), 'utf8');
      const tracked = git(source, ['show', `${COMMIT}:${file}`]);
      if (text !== tracked) throw new Error(`Source bytes differ from pinned Git blob: ${file}`);
      seen.set(file, text);
    }
    return seen.get(file);
  };
  const span = (file, startLine = 1, endLine) => {
    const text = read(file);
    const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    endLine ??= lines.length;
    if (startLine < 1 || endLine < startLine || endLine > lines.length) throw new Error(`Invalid source span: ${file}`);
    const selected = lines.slice(startLine - 1, endLine).join('');
    return {
      text: selected,
      provenance: { file, startLine, endLine, sha256: hash(selected), url: `${UPSTREAM}/blob/${COMMIT}/${file}#L${startLine}-L${endLine}` },
    };
  };
  const item = (id, title, sourceSpan, details, refs = []) => ({
    id, title, version: VERSION, upstreamCommit: COMMIT, text: sourceSpan.text,
    provenance: [sourceSpan.provenance, ...refs.map(ref => ref.provenance)],
    details: { evidence: 'public-source', observed: false, ...details },
  });
  const inventory = items => ({ schemaVersion: 1, product: 'OpenCode', version: VERSION, upstreamCommit: COMMIT, items });
  const prompts = [];
  for (const directory of ['session/prompt', 'agent/prompt']) {
    for (const file of readdirSync(resolve(source, prefix, directory)).filter(file => file.endsWith('.txt')).sort()) {
      const name = file.slice(0, -4);
      const agent = directory.startsWith('agent');
      const condition = agent
        ? `Agent.state defines the ${name} agent with this prompt; config can override or disable that agent. The configured agent prompt replaces the provider-selected prompt in request preparation.`
        : promptConditions[name];
      if (!condition) throw new Error(`Unreviewed prompt source: ${file}`);
      const refs = agent ? [span(prefix + 'agent/agent.ts')]
        : ['plan', 'build-switch', 'plan-mode'].includes(name) ? [span(prefix + 'session/reminders.ts')]
        : ['copilot-gpt-5', 'plan-reminder-anthropic'].includes(name) ? [] : [span(prefix + 'session/system.ts')];
      prompts.push(item(`prompt-${agent ? 'agent-' : ''}${name}`, `${agent ? 'Agent' : 'Session'} prompt: ${name}`,
        span(`${prefix}${directory}/${file}`), { kind: agent ? 'agent-prompt' : 'prompt-file', condition, summary: condition, language: 'text' }, refs));
    }
  }
  prompts.push(item('prompt-agent-generate', 'Agent configuration generator', span(prefix + 'agent/generate.txt'), {
    kind: 'agent-generation-prompt', language: 'text',
    condition: 'Agent.generate creates an agent configuration; uses the requested model or default model and the experimental.chat.system.transform hook. OpenAI OAuth places this system text in provider options instructions.',
    summary: 'Separate agent-configuration generation request, not the main conversation provider prompt.',
  }, [span(prefix + 'agent/agent.ts')]));
  const tools = [];
  const groups = { prompts, tools, configuration: [], 'network-tracing': [] };
  for (const [name, implementation, condition] of toolFiles) {
    const file = name === 'bash' ? 'tool/shell/shell.txt' : `tool/${name}.txt`;
    const refs = [span(prefix + 'tool/registry.ts'), span(prefix + 'session/llm/request.ts')];
    if (implementation) refs.push(span(prefix + `tool/${implementation}.ts`));
    tools.push(item(`tool-${name.replaceAll('_', '-')}`, `Tool description: ${name}`, span(prefix + file), {
      kind: 'tool-description-template', language: 'text', condition,
      summary: 'Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.',
      hasImplementation: implementation !== null,
    }, refs));
    if (implementation) {
      const schemaFile = prefix + (name === 'bash' ? 'tool/shell/prompt.ts' : `tool/${implementation}.ts`);
      const text = read(schemaFile);
      let start = text.indexOf('const Parameters =');
      let end;
      if (name === 'bash') {
        start = text.indexOf('export function parameterSchema()');
        end = text.indexOf('\nexport const Parameters =', start);
      } else if (name === 'task') {
        start = text.indexOf('const BaseParameterFields =');
        end = text.indexOf('\nfunction renderOutput', start);
      } else if (name === 'plan-exit') {
        end = text.indexOf('\n', start);
      } else {
        end = text.indexOf('\n})', start) + 3;
      }
      if (start < 0 || end < start) throw new Error(`Unreviewed parameter declaration: ${schemaFile}`);
      const first = text.slice(0, start).split('\n').length;
      const last = text.slice(0, end).split('\n').length;
      tools.push(item(`tool-schema-${name.replaceAll('_', '-')}`, `Tool parameter source: ${name}`, span(schemaFile, first, last), {
        kind: 'tool-parameter-source', condition,
        summary: 'Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.',
      }, [span(prefix + 'tool/json-schema.ts')]));
    }
  }
  for (const [group, id, title, file, first, last, condition, summary] of records) {
    groups[group].push(item(id, title, span(file, first, last), { kind: 'source-code', language: 'typescript', condition, summary }));
  }
  // Cover every public tool template in the reviewed directories, including
  // unused shipped descriptions; fail rather than silently omit new files.
  const toolTemplates = readdirSync(resolve(source, prefix, 'tool')).filter(file => file.endsWith('.txt')).sort();
  const reviewedTemplates = toolFiles.filter(([name]) => name !== 'bash').map(([name]) => `${name}.txt`).sort();
  if (JSON.stringify(toolTemplates) !== JSON.stringify(reviewedTemplates)) throw new Error('Tool template coverage changed; review the public source catalog.');
  const pkg = JSON.parse(read('packages/opencode/package.json'));
  if (pkg.version !== VERSION) throw new Error(`Package version does not match v${VERSION}.`);
  const license = read('LICENSE');
  const counts = Object.fromEntries(Object.entries(groups).map(([name, items]) => [name, items.length]));
  const sourceFiles = [...seen.keys()].sort();
  const sourceInventory = sourceFiles.map(file => item(`source-${file.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-$/, '')}`,
    file, span(file), {
      kind: 'public-source-file', language: file.endsWith('.txt') || file === 'LICENSE' ? 'text' : file.endsWith('.json') ? 'json' : 'typescript',
      condition: 'Archived because a reviewed extraction record references this file; presence alone does not establish runtime execution.',
      summary: 'Complete pinned public upstream file, with exact bytes and provenance. Review claims are bounded to the conditions in the prompt/tool/configuration/network records.',
    }));
  const limitations = [
    'Installed CLI version, build-injected catalog and runtime identity require separate verification.',
    'No private instructions, environment values, skill bodies, MCP server content or plugin output is expanded.',
    'AI SDK provider dependency implementations are outside this source checkout; native protocol records are labeled separately from default SDK execution.',
    'Dynamic catalog endpoints/capabilities can change after the release; configured baseURL can route through a gateway.',
    'Core runner and standalone native adapters are mapped as separate source paths, without claiming that a captured CLI run selected them.',
    'Source records do not prove exact request bodies, received visible reasoning, serving-provider identity, geography, retention or downstream hops.',
  ];
  const full = options.fullLibrary ?? buildFullLibrary(source, options);
  const outputs = {
    'capture-summary.json': JSON.stringify({ schemaVersion: 1, product: 'OpenCode', version: VERSION, upstreamCommit: COMMIT, upstream: UPSTREAM,
      evidence: 'public-source', observedTraffic: false,
      recordCounts: { legacyReviewed: counts, completeLibraries: full.summary.libraryCounts },
      sourceFiles: full.summary.scope.includedFiles,
      excludedFiles: full.summary.scope.excludedFiles,
      trackedFiles: full.summary.scope.trackedFiles,
      workspacePackages: full.summary.scope.packages.map(item => item.name),
      sourceIdentity: full.summary.scope.sourceIdentity,
      discovery: full.summary.discovery,
      extraction: 'Deterministic, pristine release checkout; complete first-party runtime workspace closure and every explicit package-tree exclusion match pinned Git blobs. No session inputs and no provider classification are required for local preparation.', limitations }, null, 2) + '\n',
  };
  const titles = { prompts: 'prompts', tools: 'tools', configuration: 'configuration', 'network-tracing': 'network and reasoning plumbing' };
  for (const [name, items] of Object.entries(groups)) {
    outputs[`${name}.json`] = JSON.stringify(inventory(items), null, 2) + '\n';
    outputs[`${name}.md`] = markdown(titles[name], items);
  }
  outputs['source-inventory.json'] = JSON.stringify(inventory(sourceInventory), null, 2) + '\n';
  outputs['upstream-license.txt'] = license;
  outputs['source-inventory.md'] = markdown('public source inventory', sourceInventory);
  const findingIDs = ['prompt-provider-routing', 'network-request-preparation', 'config-instructions', 'tool-registry', 'network-native-runtime', 'network-sdk-endpoint', 'network-reasoning-storage', 'network-history-replay', 'network-export'];
  outputs['key-findings.md'] = `# OpenCode key findings\n\nRelease: v${VERSION}. Upstream commit: ${COMMIT}.\n\n${evidenceNote}\n\n` + findingIDs.map(id => {
    const record = Object.values(groups).flat().find(item => item.id === id);
    return `## ${record.title}\n\n${record.details.summary}\n\nCondition: ${record.details.condition}\n\n[Public source](${record.provenance[0].url}).\n`;
  }).join('\n') + '\n## Evidence limits\n\n' + limitations.map(text => `- ${text}`).join('\n') + '\n';
  Object.assign(outputs, full.outputs);
  // Env vars and CLI commands/flags, read structurally from the same closure.
  const meta = { version: VERSION, commit: COMMIT, upstream: UPSTREAM };
  const structured = [
    ['env-vars', 'environment variables', environmentVariables(full.closure, meta)],
    ['cli', 'CLI commands and flags', cliCommands(full.closure, meta)]
  ];
  for (const [name, title, items] of structured) {
    outputs[`${name}.json`] = JSON.stringify(inventory(items), null, 2) + '\n';
    outputs[`${name}.md`] = structuredMarkdown(title, items);
  }
  return outputs;
}

export function writeOutputs(outputs, out, { check = false } = {}) {
  if (!check) mkdirSync(out, { recursive: true });
  for (const [file, text] of Object.entries(outputs)) {
    const destination = resolve(out, file);
    if (check) {
      if (readFileSync(destination, 'utf8') !== text) throw new Error(`Generated output differs: ${file}`);
    } else writeFileSync(destination, text);
  }
}

function main() {
  const args = process.argv.slice(2);
  let source = resolve(base, 'work/source');
  let out = resolve(base, 'outputs');
  let check = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' || args[i] === '--out') {
      const key = args[i];
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${key}.`);
      if (key === '--source') source = resolve(args[++i]);
      else out = resolve(args[++i]);
    } else if (args[i] === '--check') check = true;
    else if (args[i] === '--help') {
      process.stdout.write('Usage: node opencode/extract/extract.mjs [--source CHECKOUT] [--out DIRECTORY] [--check]\nVerify or regenerate records from the pristine public v1.18.34 checkout. No session data or network calls.\n');
      return;
    } else throw new Error(`Unknown argument: ${args[i]}`);
  }
  const outputs = extract(source);
  writeOutputs(outputs, out, { check });
  process.stdout.write(`${check ? 'Verified' : 'Wrote'} ${Object.keys(outputs).length} public-source outputs for OpenCode v${VERSION} (${COMMIT.slice(0, 12)}).\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { process.stderr.write(`OpenCode extraction: ${error.message}\n`); process.exitCode = 1; }
}
