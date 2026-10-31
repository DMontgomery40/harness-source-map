#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { literalsOf } from './lib/ts-literals.mjs';
import { buildFullLibrary, VERSION, COMMIT, UPSTREAM } from './lib/full-library.mjs';
export { VERSION, COMMIT, UPSTREAM };
const root = fileURLToPath(new URL('../', import.meta.url));
const hash = text => createHash('sha256').update(text).digest('hex');
export const DEFINITIONS = [
  ['instructions', 'Orchestration instructions', 'Model instructions', 'prompt'],
  ['runtime', 'Runtime and interaction modes', 'Prompts', 'prompt'],
  ['delivery', 'Delivery to each provider', 'Prompts', 'prompt'],
  ['tools', 'MCP tool catalog', 'Tools and features', 'tool'],
  ['schemas', 'MCP parameter schemas', 'Tools and features', 'tool'],
  ['launch', 'Provider launch flags and environment', 'Configuration', 'setting'],
  ['configuration', 'Injection settings and modes', 'Configuration', 'setting'],
  ['network', 'Endpoints and update channels', 'Build intel', 'h'],
];
export const DISCOVERED = [
  ['instructions', 'Discovered instructions and prompts', 'Prompts', 'prompt'],
  ['context-templates', 'Discovered context and user-turn templates', 'Prompts', 'prompt'],
  ['tools-parameters', 'Discovered tool and parameter descriptions', 'Tools and features', 'tool'],
];
const note = 'Pinned public source evidence, not observed model delivery. Runtime settings and tool capabilities control activation. Templates retain upstream substitutions; no local values or private sessions are inputs.';

export function markdown(title, items) {
  return `# T3 Code ${title}\n\nRelease v${VERSION}, commit \`${COMMIT}\`. ${note}\n\n` + items.map(item => {
    const fence = '`'.repeat(Math.max(3, ...[...item.text.matchAll(/`+/g)].map(m => m[0].length + 1)));
    return `## ${item.title}\n\n${item.details.summary ?? ''}\n\n**When:** ${item.details.condition}\n\n` + item.provenance.map(p => `[${p.file}:${p.startLine}–${p.endLine}](${p.url}) · SHA-256 \`${p.sha256}\``).join('\n\n') + `\n\n${fence}typescript\n${item.text}${item.text.endsWith('\n') ? '' : '\n'}${fence}\n`;
  }).join('\n');
}

// Top-level source declarations delimit complete reviewed templates and shared Effect schema
// definitions. We preserve TypeScript, including dynamic schema assembly, rather than inventing
// a JSON Schema without running the upstream dependency graph.
export function declarations(file) {
  const starts = [...file.text.matchAll(/^(?:export\s+)?(?:async\s+)?(?:const|let|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm)];
  return starts.map((m, i) => ({ name: m[1], file: file.file, start: m.index, end: starts[i + 1]?.index ?? file.text.length })).filter((d, i, all) => all.findIndex(other => other.name === d.name) === i);
}

export function reviewedLibrary(closure) {
  const files = new Map(closure.included.map(f => [f.file, f]));
  const groups = new Map(DEFINITIONS.map(([id]) => [id, []]));
  const definitions = new Map([...files].map(([file, f]) => [file, declarations(f)]));
  const span = (file, start = 0, end = files.get(file)?.text.length) => {
    const source = files.get(file)?.text;
    if (source === undefined || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > source.length) throw new Error(`Invalid pinned source span: ${file}`);
    const text = source.slice(start, end);
    const startLine = source.slice(0, start).split('\n').length;
    const endLine = source.slice(0, end - 1).split('\n').length;
    return { text, provenance: { file, startLine, endLine, startOffset: start, endOffset: end, sha256: hash(text), textSha256: hash(text), url: `${UPSTREAM}/blob/${COMMIT}/${file}#L${startLine}-L${endLine}` } };
  };
  const add = (group, id, title, selected, details) => {
    const item = { id, title, kind: DEFINITIONS.find(d => d[0] === group)[3], version: VERSION, release: `v${VERSION}`, upstreamCommit: COMMIT,
      text: selected.text, provenance: [selected.provenance], details: { evidence: 'public-source', observed: false, condition: note, ...details } };
    groups.get(group).push(item); return item;
  };
  const decl = (file, name) => {
    const d = definitions.get(file)?.find(d => d.name === name);
    if (!d) throw new Error(`Missing pinned declaration ${file}:${name}`);
    return span(file, d.start, d.end);
  };
  const orchestration = 'packages/provider-core/src/server/orchestrationInstructions.ts';
  for (const d of definitions.get(orchestration)) {
    if (d.name === 'T3AcpInstructionState') continue;
    const acp = /ACP|Acp/.test(d.name);
    const group = acp ? 'runtime' : 'instructions';
    add(group, `instruction-${d.name}`, d.name.replaceAll('_', ' '), span(d.file, d.start, d.end), {
      condition: acp ? 'ACP first prompt or interaction/tool-state change. Slash commands bypass injection; unchanged state does not resend text.'
        : /WITH_TOOL_SEARCH/.test(d.name) ? 'Claude Code with a device-capable T3 MCP session; also supplied to native subagents by SubagentStart.'
        : /DEVICE/.test(d.name) || d.name === 'deviceToolInstructions' ? 'The thread has the device capability; the helper retains the loadTools substitution used by both device variants.'
        : /BROWSER/.test(d.name) ? 'Browser capability where the provider delivery path selects browser guidance; see delivery records.'
        : 'T3 MCP is available; the adapter selects system, application developer context or a user-prompt prepend. See delivery records.',
      summary: 'Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.' });
  }
  for (const d of definitions.get('packages/provider-core/src/server/runtimeInstructions.ts')) {
    add('runtime', `runtime-${d.name}`, `Runtime: ${d.name}`, span(d.file, d.start, d.end), { condition: 'Provider assembles runtime identity and PR-linking instructions; model and effort are omitted when managed dynamically by the harness.', summary: 'Exact runtime template and source; substitutions are not expanded from this machine.' });
  }
  const claude = 'apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts';
  add('runtime', 'claude-background-wait', 'Claude Code background-wait rule', decl(claude, 'CLAUDE_BACKGROUND_WAIT_INSTRUCTIONS'), { condition: 'Claude Code query options include T3 MCP servers; appended to the claude_code preset system prompt.' });
  for (const name of ['subagentDeviceInstructions', 'makeClaudeQueryOptions']) add('delivery', `claude-${name}`, `Claude Code: ${name}`, decl(claude, name), { condition: 'Runtime always appended; orchestration/background wait require MCP; device text and SubagentStart hook additionally require deviceToolsAvailable=true. User append-system-prompt text follows.', summary: 'SDK query options are source evidence; downstream SDK flag serialization is outside this checkout.' });
  const codex = 'apps/server/src/provider/CodexDeveloperInstructions.ts';
  add('delivery', 'codex-additional-context', 'Codex/ChatGPT application developer context', span(codex), { condition: 'One numbered application context value per orchestration section, plus runtime and available browser/device guidance. Each value must fit the 4,000-byte cap.', summary: 'Kept outside collaboration mode because model-catalog mode text can override client developer_instructions.' });
  const pi = 'packages/provider-pi/src/server/mcpExtensionSource.ts';
  add('delivery', 'pi-mcp-extension', 'Pi: MCP extension source', span(pi), { condition: 'Pi loads the T3 MCP extension; the extension constructs instructions and tool bridge from the per-launch MCP session.', summary: 'Complete generated extension source, retaining all nested template substitutions.' });
  const deliveryPaths = [
    ['OpenCode', 'packages/provider-opencode/src/server/adapter.ts', /const orchestrationSystemPrompt =|const systemPrompt =/g],
    ['Cursor', 'packages/provider-cursor/src/server/adapter.ts', /const userText = t3OrchestrationPrompt|const text = `\$\{userText\}/g],
    ['ACP', 'packages/provider-acp/src/server/adapter.ts', /t3AcpPromptWithInstructions\(\{|text: buildRuntimeInstructions\(/g],
    ['Muse', 'packages/provider-muse/src/server/adapter.ts', /text: buildRuntimeInstructions\(/g],
    ['Codex/ChatGPT', 'apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts', /buildCodexAdditionalContext\(/g],
  ];
  // Bounded source windows are routing evidence, not reconstructed prompt bodies. Complete text
  // definitions live in the records above. Merge overlapping windows so each byte is published once.
  function windows(file, pattern, before = 10, after = 40) {
    const source = files.get(file).text, lines = source.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    const ranges = [...source.matchAll(pattern)].map(m => { const line = source.slice(0, m.index).split('\n').length - 1; return [Math.max(0, line - before), Math.min(lines.length, line + after)]; });
    const merged = [];
    for (const r of ranges) { if (merged.length && r[0] <= merged.at(-1)[1]) merged.at(-1)[1] = Math.max(r[1], merged.at(-1)[1]); else merged.push(r); }
    return merged.map(([start, end]) => span(file, lines.slice(0, start).join('').length, lines.slice(0, end).join('').length));
  }
  for (const [provider, file, pattern] of deliveryPaths) {
    const selections = windows(file, pattern);
    if (!selections.length) throw new Error(`Missing ${provider} delivery evidence`);
    selections.forEach((s, i) => add('delivery', `delivery-${provider.replace(/\W+/g, '-').toLowerCase()}-${i + 1}`, `${provider}: instruction delivery ${i + 1}`, s, {
      condition: provider === 'ACP' ? 'First ACP prompt or mode/tool change; prepended to user content, with the fallback only when T3 MCP is configured.' : provider === 'Cursor' ? 'Orchestration prepended to user prompt when not already delivered; device guidance can be added later. Runtime identity follows the prompt.' : provider === 'OpenCode' ? 'Adapter passes a system prompt assembled from orchestration (when MCP available), runtime identity and applicable guidance.' : 'Adapter calls the shared instruction builder for the selected provider session.',
      summary: 'Source window around the delivery call; the complete referenced templates are separate records.' }));
  }
  const contractFiles = [...files.keys()].filter(file => file.startsWith('packages/contracts/src/') || file.startsWith('apps/server/src/mcp/toolkits/'));
  const symbols = new Map();
  for (const file of contractFiles) for (const d of definitions.get(file)) {
    const candidates = symbols.get(d.name) ?? []; candidates.push(d); symbols.set(d.name, candidates);
  }
  const schemaSeen = new Set();
  const schemaRefs = (sourceText, file) => {
    const result = [];
    for (const name of new Set(sourceText.match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? [])) {
      const candidates = symbols.get(name) ?? [];
      const d = candidates.find(d => d.file === file) ?? (candidates.length === 1 ? candidates[0] : undefined);
      if (!d) continue;
      const id = `schema-${hash(`${d.file}:${d.name}`).slice(0, 20)}`;
      result.push(id);
      if (schemaSeen.has(id)) continue;
      schemaSeen.add(id);
      const s = span(d.file, d.start, d.end);
      const refs = schemaRefs(s.text.replace(new RegExp(`\\b${d.name}\\b`, 'g'), ''), d.file);
      add('schemas', id, `${d.name} (${path.basename(d.file)})`, s, { condition: 'Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.', schemaRecordIds: [...new Set(refs)].filter(ref => ref !== id), summary: 'Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.' });
    }
    return result;
  };
  for (const file of [...files.keys()].filter(f => /^apps\/server\/src\/mcp\/toolkits\/.*\/tools\.ts$/.test(f)).sort()) {
    const source = files.get(file).text;
    const literalRanges = literalsOf(source).outer;
    const masked = source.split('');
    for (const literal of literalRanges) for (let i = literal.start; i < literal.end; i++) masked[i] = ' ';
    const code = masked.join('').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, m => ' '.repeat(m.length));
    for (const match of source.matchAll(/Tool\.make\("([^"]+)"/g)) {
      const name = match[1], start = match.index;
      let depth = 0, end;
      for (let i = start + 'Tool.make'.length; i < code.length; i++) {
        if (code[i] === '(') depth++;
        if (code[i] === ')' && --depth === 0) { end = i + 1; break; }
      }
      if (!end) throw new Error(`Unbalanced tool declaration ${name}`);
      const s = span(file, start, end);
      // parameters is a source expression, possibly inline Struct/Record. Retain the entire
      // declaration, and resolve every contract symbol reachable from that expression.
      const parameterStart = /\bparameters:\s*/.exec(s.text);
      let parameters;
      if (parameterStart) {
        const from = start + parameterStart.index + parameterStart[0].length;
        let depth = 0, to = from;
        for (; to < end; to++) {
          if (code[to] === ',' && depth === 0) break;
          if ('([{'.includes(code[to])) depth++;
          if (')]}'.includes(code[to])) { if (depth === 0) break; depth--; }
        }
        parameters = source.slice(from, to);
      }
      add('tools', `tool-${name}`, name, s, { toolName: name, schemaRecordIds: [...new Set(schemaRefs(parameters ?? "", file))], condition: 'Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.', summary: 'Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.' });
    }
  }
  // Complete launch/config declarations and routing windows, discovered structurally in every
  // adapter's source. This includes ACP-backed providers such as fx, Grok and Antigravity.
  const launchFiles = [...files.keys()].filter(f => /(?:packages\/provider-[^/]+\/src\/.*(?:adapter|launch|spawn|sessionConfig|settings|driver|sdk|command|environment)|apps\/server\/src\/provider\/(?:Drivers\/(?:Claude|Codex)[^/]*|codexLaunchArgs|CodexProvider|CodexManagedHome)|apps\/server\/src\/orchestration-v2\/Adapters\/(?:Claude|Codex)AdapterV2)\.ts$/i.test(f));
  for (const file of launchFiles) {
    const matches = windows(file, /(?:args:|args =|spawn\(|spawnCommand|makeClaudeEnvironment|makeCodexEnvironment|app-server|allowedTools:|permission-prompt-tool|add-dir|settings: input\.settings|--[a-z][a-z-]+|env:|environment:|T3_[A-Z_]+|T3CODE_[A-Z_]+|ENABLE_TOOL_SEARCH)/g, 8, 26);
    matches.forEach((s, i) => add('launch', `launch-${hash(`${file}:${i}`).slice(0, 20)}`, `${file} · launch ${i + 1}`, s, { condition: 'Selected provider, runtime policy and user launch settings govern this source branch.', summary: 'Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.' }));
  }
  for (const file of ['packages/shared/src/AgentScope.ts', 'apps/server/src/process/agentScope.ts']) add('launch', `launch-${path.basename(file)}`, `Linux process scope: ${path.basename(file)}`, span(file), { condition: 'Linux with a usable user systemd manager; fallback and environment requirements remain in the source.', summary: 'systemd-run --user --scope and app-t3code-agents slice construction.' });
  for (const file of ['packages/contracts/src/settings.ts', 'packages/contracts/src/providerPolicy.ts', 'packages/contracts/src/providerInstance.ts', 'apps/server/src/mcp/McpSessionRegistry.ts', 'apps/server/src/mcp/McpHttpServer.ts', 'apps/server/src/mcp/McpToolAccess.ts']) {
    // Full settings schema and MCP selection are important context; split by declarations for
    // navigable typed records, instead of publishing one enormous settings dump.
    const selections = definitions.get(file).filter(d => /linkedEnvironmentsEnabled|[Dd]evice|[Bb]rowser|[Ii]nteraction|[Rr]untime|[Cc]apabilit|[Bb]eta|[Tt]ool|T3CODE_/.test(span(file, d.start, d.end).text));
    for (const d of selections) add('configuration', `config-${hash(`${file}:${d.name}`).slice(0, 20)}`, `${d.name} (${path.basename(file)})`, span(file, d.start, d.end), { condition: 'Server settings, thread policy and MCP launch capabilities select the available tools and injected text.', summary: 'Complete configuration/selection declaration. Defaults and precedence are source expressions.' });
  }
  const networkFiles = ['apps/server/src/cloud/publicConfig.ts', 'apps/server/src/telemetry/AnalyticsService.ts', 'apps/server/src/cloud/selfUpdate.ts', 'apps/desktop/src/updates/updateChannels.ts', 'apps/desktop/src/electron/ElectronUpdater.ts', 'packages/shared/src/relayAuth.ts', 'packages/shared/src/relayUrl.ts', 'packages/shared/src/connectAuth.ts'];
  for (const file of networkFiles) for (const d of definitions.get(file) ?? []) add('network', `network-${hash(`${file}:${d.name}`).slice(0, 20)}`, `${d.name} (${path.basename(file)})`, span(file, d.start, d.end), { condition: 'Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.', summary: 'Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.' });
  const ids = [...groups.values()].flat().map(i => i.id);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate reviewed record ID: ${ids.filter((id,i)=>ids.indexOf(id)!==i).join(', ')}`);
  return groups;
}

export function extract(source = path.join(root, 'work/source'), options = {}) {
  const full = options.fullLibrary ?? buildFullLibrary(source, { work: options.work });
  const groups = reviewedLibrary(full.closure);
  const inventory = items => ({ schemaVersion: 1, product: 'T3 Code', version: VERSION, release: `v${VERSION}`, upstreamCommit: COMMIT, items });
  const outputs = { ...full.outputs };
  const libraries = [];
  for (const [id, title, section, kind] of DEFINITIONS) {
    const name = `reference-${id}`, items = groups.get(id);
    outputs[`${name}.json`] = JSON.stringify(inventory(items), null, 2) + '\n';
    outputs[`${name}.md`] = markdown(title, items);
    libraries.push({ id: name, title, section, kind, json: `${name}.json`, markdown: `${name}.md`, count: items.length, recordIds: items.map(i => i.id) });
  }
  for (const [id, title, section, kind] of DISCOVERED) {
    const items = JSON.parse(outputs[`${id}.json`]).items;
    libraries.push({ id, title, section, kind, json: `${id}.json`, markdown: `${id}.md`, count: items.length, recordIds: items.map(i => i.id) });
  }
  outputs['library-catalog.json'] = JSON.stringify({ schemaVersion: 1, product: 'T3 Code', version: VERSION, upstreamCommit: COMMIT, sourceIdentity: full.closure.identity, totalRecords: libraries.reduce((sum, l) => sum + l.count, 0), libraries }, null, 2) + '\n';
  outputs['capture-summary.json'] = JSON.stringify({ schemaVersion: 1, product: 'T3 Code', version: VERSION, release: `v${VERSION}`, upstreamCommit: COMMIT, upstream: UPSTREAM, manifestVersion: JSON.parse(readFileSync(path.join(source, 'apps/server/package.json'), 'utf8')).version,
    evidence: 'public-source', observed: false, scope: full.summary.scope, discovery: full.summary.discovery, recordCounts: Object.fromEntries(libraries.map(l => [l.id, l.count])), limitations: [note, 'Package manifests may retain a base version different from the verified nightly release tag.', 'Downstream SDK implementations, build-injected secrets and private runtime settings are outside this source evidence.', 'Broad discovery pending work is not a completeness claim.'] }, null, 2) + '\n';
  outputs['key-findings.md'] = `# T3 Code: an orchestrator over other harnesses\n\nT3 Code runs Claude Code, Codex/ChatGPT, OpenCode, Cursor, Pi, Muse and ACP providers. It adds orchestration instructions and a capability-filtered t3-code MCP server to their own harness context.\n\n## Delivery is provider-specific\n\nClaude Code receives a preset system-prompt append and device guidance through a SubagentStart hook. Codex/ChatGPT receives numbered application developer-context sections below the per-entry cap. OpenCode receives system text; ACP and Cursor prepend instructions to the user request. Pi loads the MCP extension source. Runtime identity and PR-linking text accompany the applicable provider paths.\n\n## Source and observation\n\nRelease v${VERSION}, commit \`${COMMIT}\`. ${note} The source inventory accounts for the public runtime workspace closure. The discovery ledger reports unanswered classification separately.\n\n## Tools and infrastructure\n\nThe tool catalog preserves every Tool.make declaration and its parameter-schema source dependencies. Server settings and per-launch capabilities filter the catalog. Build intel records relay, Clerk, telemetry and update configuration; build-time placeholders do not establish an installed destination. See the pinned source links on each record.\n`;
  outputs['discovery-status.md'] = `# T3 Code discovery and coverage status\n\nThe pinned public source closure has ${full.summary.scope.includedFiles} included files and ${full.summary.scope.excludedFiles} explicitly excluded files.\n\n## Preparation and pending work\n\n${full.summary.discovery.selected} complete source occurrences were selected for discovery. ${full.summary.discovery.classified} have provider judgments; ${full.summary.discovery.pending} remain unresolved, including ${full.summary.discovery.withheld} privacy-withheld and ${full.summary.discovery.oversized} oversized occurrences. Preparation does not establish complete classification or runtime delivery.\n\n## Download the evidence\n\n- [Complete occurrence inventory (gzip)](../discovery-inventory.json.gz)\n- [File hashes, pinned locators and exclusions (gzip)](../source-inventory.json.gz)\n- [Coverage status (gzip)](../discovery-coverage.json.gz)\n- [Typed record assignment catalog (gzip)](../library-catalog.json.gz)\n\nOnly the pinned public upstream source enters the discovery workflow. Privacy-withheld text stays out of the external request and published candidate body. The local pending ledger retains the unresolved occurrence.\n`;
  outputs['upstream-license.txt'] = readFileSync(path.join(source, 'LICENSE'), 'utf8');
  return outputs;
}
export function writeOutputs(outputs, out, { check = false } = {}) {
  if (!check) mkdirSync(out, { recursive: true });
  const stale = [];
  for (const [name, text] of Object.entries(outputs)) {
    if (check) { let current; try { current = readFileSync(path.join(out, name), 'utf8'); } catch {} if (current !== text) stale.push(name); }
    else writeFileSync(path.join(out, name), text);
  }
  if (stale.length) throw new Error(`Stale T3 Code outputs: ${stale.join(', ')}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2); let source = path.join(root, 'work/source'), out = path.join(root, 'outputs'), check = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--source') source = path.resolve(args[++i]);
      else if (args[i] === '--out') out = path.resolve(args[++i]);
      else if (args[i] === '--check') check = true;
      else throw new Error(`Unknown argument: ${args[i]}`);
    }
    writeOutputs(extract(source), out, { check }); console.log(`T3 Code v${VERSION}: ${check ? 'verified' : 'generated'}`);
  } catch (error) { console.error(error.stack); process.exitCode = 1; }
}
