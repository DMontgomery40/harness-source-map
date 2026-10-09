// Release evidence is immutable: never stamp this review with a later binary.
import fs from 'node:fs';
import * as walk from 'acorn-walk';
import { VERSION, BINARY_SHA256, files, source, parse, provenance } from './lib.mjs';

const release = '2.1.295';
const binary = '0116ee2e0a513900b633d9951367f18747686478e2b462805b8c31609f047f70';
if (VERSION !== release || BINARY_SHA256 !== binary) throw new Error('Feature notes require the reviewed 2.1.295 binary');
const out = new URL('../outputs/', import.meta.url);
const cache = new Map();
function load(file) {
  if (!cache.has(file)) {
    // The main bundle is large. Keep a bounded parse cache during this review.
    if (cache.size >= 2) cache.delete(cache.keys().next().value);
    const src = source(file), ast = parse(src), nodes = [];
    walk.full(ast, node => nodes.push(node));
    cache.set(file, { src, nodes });
  }
  return cache.get(file);
}
function one(file, predicate, label) {
  const found = load(file).nodes.filter(predicate);
  if (found.length !== 1) throw new Error(`${file}: ${label}: expected one node, found ${found.length}`);
  return { file, node: found[0] };
}
const stringValue = n => n.type === 'Literal' ? n.value : n.type === 'TemplateLiteral' && n.expressions.length === 0 ? n.quasis[0].value.cooked : undefined;
const literal = (file, text) => one(file, n => typeof stringValue(n) === 'string' && stringValue(n).includes(text), text);
const fn = (file, name) => one(file, n => n.type === 'FunctionDeclaration' && n.id?.name === name, name);
const declaration = (file, name) => one(file, n => n.type === 'VariableDeclarator' && n.id?.name === name, name);
function containing(file, type, text) {
  const { src, nodes } = load(file);
  const matches = nodes.filter(n => n.type === type && src.slice(n.start, n.end).includes(text)).sort((a, b) => (a.end - a.start) - (b.end - b.start));
  if (!matches.length) throw new Error(`${file}: no complete ${type} for ${text}`);
  return { file, node: matches[0] };
}
function evidence(anchor, role) {
  const { file, node } = anchor;
  return { ...provenance(file, load(file).src, node.start, node.end), role };
}
function range(file, start, end, expected, role) {
  const src = source(file);
  if (!src.slice(start, end).startsWith(expected)) throw new Error(`${file}:${start}: source anchor changed`);
  return { ...provenance(file, src, start, end), role };
}
function reference(file, beginning, end) {
  const src = source(file), start = src.indexOf(beginning), finish = end === null ? src.length : src.indexOf(end, start);
  if (start < 0 || finish < 0 || src.indexOf(beginning, start + 1) >= 0) throw new Error(`Reference boundary missing: ${beginning}`);
  return { text: src.slice(start, finish), provenance: provenance(file, src, start, finish) };
}
function curated(area, id) {
  const doc = JSON.parse(fs.readFileSync(new URL(`${area}.json`, out)));
  const item = doc.items.find(i => i.id === id);
  if (!item || item.needs_review || item.provenance.some(p => p.version !== release)) throw new Error(`Unreviewed ${area}:${id}`);
  return { area, id, provenance: item.provenance };
}

// Preserved source-reviewed sections from the original release note.
const existingSections = [
  {
    "title": "Compaction has selectable instruction variants",
    "text": "Full compaction selects `control`, `lean`, `short`, or `capped`. `CLAUDE_CODE_CURRIED_TRINKET` overrides `tengu_curried_trinket`; the default and invalid-value fallback are `control`. Reactive and regular compaction use this selector. The capped variant requests at most 2,000 words. The lean variant specifies what must survive the handoff, including user-authored constraints. Partial compaction uses a separate prompt.\n\nRead the complete variants in [Background and utility prompts](#utility-prompts-md), records `compact-summary-prompt`, `compact-summary-lean`, `compact-summary-short`, and `compact-summary-capped`. [Environment variables](#environment-variables-md) contains the selector's source read."
  },
  {
    "title": "Chrome setup is a conditional model tool",
    "text": "`OfferChromeSetup` is in the built-in tool list. Its enablement requires the first-party provider, a dialog-capable session, the `tengu_foamy_spring` gate (compiled default true), tool-search eligibility, a host that renders the setup offer, and a recorded disconnected Chrome answer. Its experiment branch selects `tengu_brass_kite` or `tengu_gentle_dijkstra`, both compiled false, according to session type. The host and session guards still apply.\n\nThe full tool definition and guard qualification are in [Tools](#tools-md), record `tool-offerchromesetup`."
  },
  {
    "title": "Plugin publishing requires an explicit interaction",
    "text": "`PublishPlugin` is in the built-in list behind `tengu_copper_gazette`, compiled false. Before transmitting files, its permission path asks the user to review the organization, plugin folder, and exact files. It requires this interaction even when permission bypass is active.\n\nSee [Tools](#tools-md), record `tool-publishplugin`, for its complete prompt and schema. Source presence does not establish that the remote gate enables it."
  },
  {
    "title": "Personal configuration restrictions also affect skill permissions",
    "text": "`CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` now withholds allowed-tool grants supplied by personal skills and plugins, with a separate host-catalog exception. Managed and bundled definitions follow their separate paths, and managed-only restrictions still apply. `disableClaudeAiConnectors` also blocks explicitly configured `claudeai-proxy` MCP servers. `syncClaudeAiSkills` documents an active refresh interval and a reduced idle frequency.\n\nThe current schema descriptions are in [Settings](#settings-md); permission precedence is in [What wins](#what-wins-md). The environment-variable map records the personal-configuration read separately from its runtime consequences."
  },
  {
    "title": "Hook failures can block, and broken async installations are diagnosed",
    "text": "Command and HTTP hook schemas include `onFailure: \"block\"`. That policy is ignored for async hooks and for Stop, SubagentStop, TaskCompleted, and TeammateIdle. The runtime path is recorded alongside the schema. Separately, for async Stop hooks, interpreter output that identifies a script which cannot be opened produces broken-installation feedback. An unquoted path with spaces receives a quoting diagnosis. Identical repeated broken installations are dropped after the first report instead of repeatedly waking the model.\n\nSee [Hooks](#hooks-md) and [System reminders and injections](#system-reminders-md), especially `stop-hook-broken-installation` and `stop-hook-rewake`."
  },
  {
    "title": "Idle compaction has a disabling setting",
    "text": "`idleCompaction: false` disables idle compaction. Setting it to true does not independently enable that feature. The setting's schema and related controls appear in [Settings](#settings-md) and [Environment variables](#environment-variables-md)."
  },
  {
    "title": "WebSearch can replenish its session allowance",
    "text": "The WebSearch budget tracks consumed calls and replenishes them over elapsed time. Its default session ceiling is 200. `CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR` overrides the refill rate. Without that override, sessions that do not refill by default use zero; other sessions read `tengu_memoized_turtle`, with a compiled fallback of 100 per hour. The served flag value must be an integer from zero through 3600. A zero refill rate yields an infinite wait once the allowance is exhausted.\n\nThe environment-variable map locates the exact reads. The budget functions in `chunk-yygm1ede.js` are located by the current binary provenance below."
  },
  {
    "title": "HTTP MCP serving is dormant in this build",
    "text": "The source defines `claude mcp serve` options for `--transport`, `--port`, `--result-format`, and `--session-tunnel`. Their build gate returns false in this binary, so these options are not registered or reachable here. The dormant HTTP path binds loopback; the session tunnel uses port 28471 and one-line JSON input. Its credential-read and hook restrictions describe dormant implementation behavior.\n\nThe [CLI commands and flags](#cli-md) catalog marks these definitions inactive and retains their exact registration-source evidence. They are not available commands in the reviewed build."
  }
];
const oldEvidence = [
  [curated('utility-prompts', 'compact-summary-prompt'), curated('utility-prompts', 'compact-summary-lean'), curated('utility-prompts', 'compact-summary-short'), curated('utility-prompts', 'compact-summary-capped'), curated('environment-variables', 'env-claude-code-curried-trinket')],
  [curated('tools', 'tool-offerchromesetup')],
  [curated('tools', 'tool-publishplugin')],
  [curated('environment-variables', 'env-claude-code-restrict-personal-config'), curated('settings', 'setting-disable-claude-ai-connectors'), curated('settings', 'setting-sync-claude-ai-skills')],
  [curated('system-reminders', 'stop-hook-broken-installation'), curated('system-reminders', 'stop-hook-rewake')],
  [curated('settings', 'setting-idle-compaction')],
  [curated('environment-variables', 'env-claude-code-web-search-refills-per-hour')],
  ['transport', 'port', 'result-format', 'session-tunnel'].map(flag => curated('cli', `cli-flag-mcp-serve-${flag}`))
];
const ids = ['compaction-variants', 'chrome-setup', 'plugin-publishing', 'personal-config', 'hook-failures', 'idle-compaction', 'websearch-refill', 'dormant-mcp-http'];
const items = existingSections.map((s, i) => ({
  id: `feature-295-${ids[i]}`, title: s.title, text: s.text,
  provenance: oldEvidence[i][0].provenance,
  details: { text_kind: 'source-review', curated_source_records: oldEvidence[i] }
}));
function add(id, title, text, anchors, reads = [], authored = []) {
  const authoredSections = authored.map(a => `\n\nComplete authored text:\n\n\`\`\`text\n${stringValue(a.node)}\n\`\`\``).join('');
  items.push({ id: `feature-295-${id}`, title, text: text + authoredSections,
    provenance: anchors.map(a => evidence(a, 'definition')),
    details: { text_kind: 'source-review', source_read_provenance: reads,
      authored_texts: authored.map(a => ({ text: stringValue(a.node), provenance: evidence(a, 'authored text') })) }
  });
}

const settings = 'chunk-8mqjkh8a.js', main = 'chunk-bc48hzhc.js', auth = 'chunk-3t8w43qz.js';
const gateway = literal(settings, 'Cloud gateway URL to pre-fill during login');
add('gateway-policy', 'Gateway login distinguishes managed policy from a user preference',
  'The managed login pin reads MDM, the managed settings file, or an eligible policy helper; it excludes remote-delivered settings. On a machine without managed policy, the login screen can instead use `forceLoginGatewayUrl` from user settings, but only alongside user `forceLoginMethod: "gateway"`. Project, local, flag, and remote-delivered values do not supply this user fallback.\n\nThe fallback is withheld when managed settings exist, managed settings could not be loaded, an inherited organization login pin exists, inherited managed settings are invalid, or the gateway provider is refused. The login screen gives the managed URL priority and begins gateway setup when this user fallback is accepted. This is a source-level login preference and precedence rule; it does not establish access to a gateway or account rollout. See [Settings](#settings-md), records `setting-force-login-method`, `setting-force-login-gateway-url`, and `setting-allowed-providers`.',
  [gateway], [
    ...['KA', '$A', 'GA', 'W3e', '_8', 'hFe', 'sQ', 'uu'].map(n => evidence(fn(auth, n), 'login fallback and provider guards')),
    ...['rCo', 'dCo', 'nnn'].map(n => evidence(fn(settings, n), 'managed login pin and fail-closed settings reads')),
    evidence(fn('chunk-ctxpwc46.js', 'MZ'), 'invalid inherited managed settings guard'),
    evidence(containing('chunk-15nj02ef.js', 'VariableDeclaration', '[pe]=y(W3e)'), 'complete login state initialization declaration')
  ], [gateway]);

const effort = literal('chunk-0mc5j25r.js', 'Reasoning effort for this agent.');
const forkEffort = literal('chunk-0mc5j25r.js', 'Ignored for subagent_type: "fork": a fork runs at your own effort.');
add('agent-effort', 'Agent effort requires an explicit instruction',
  'The Agent tool accepts an optional `effort` chosen from `low`, `medium`, `high`, `xhigh`, and `max`. Its schema instructs the model to set it only when the user, CLAUDE.md, a skill, or another instruction explicitly requests that effort for delegated work. Otherwise the model omits it. When fork mode is enabled, the schema adds a clause that a fork ignores this parameter and uses the parent effort. See the complete Agent schema in [Tools](#tools-md), record `tool-agent`.',
  [effort, forkEffort], [evidence(containing('chunk-0mc5j25r.js', 'ArrowFunctionExpression', 'Reasoning effort for this agent.'), 'complete Agent input schema factory'), evidence(fn(main, 'Nte'), 'fork availability condition'), evidence(fn(main, 'hNo'), 'fork availability guards')], [effort, forkEffort]);

const preload = declaration('chunk-11me4gx8.js', 'yn');
if (preload.node.init.value !== 32) throw new Error('Skill preload limit changed');
add('agent-skill-preload', 'Subagents preload at most 32 distinct skills',
  'The subagent launcher deduplicates its declared `skills` list, keeps the first 32 distinct names for preload, and warns when the list exceeds that limit. A carried preload is not loaded again. Each remaining preload must resolve to a prompt command and pass managed skill policy and synchronization restrictions; the launcher executes its prompt with `isSkillPreload: true` and inserts the metadata and full returned content as a model message.\n\nThis cap limits eager loading. It does not by itself remove the other skills from the Skill tool; that tool follows its own availability and policy checks.',
  [preload], [evidence(fn('chunk-84t3cnwy.js', 'D'), 'distinct-name selection'), evidence(fn('chunk-11me4gx8.js', 'gA'), 'complete subagent launch and preload producer')]);

const toolReference = reference('reference-db4b1247.md.zst', '`$.tool.register` declares a tool:', null);
add('mod-tool-placement', 'Mods can place a full tool schema in the initial tool list',
  '`$.tool.register` normally puts a mod tool behind ToolSearch, named `mcp__<plugin>__<name>`. A registration with `isDeferred: false` places its description and input schema in the initial tool list. A `tool.describe` hook\'s `isDeferred` override takes priority over the registration. This changes schema placement; availability, permissions, and the mod\'s `tool.call` handler still determine whether a call can run.\n\nThe same shipped reference describes registered agent types: `agent.offer` returning `{ isOffered: false }` hides an agent type from the model while the plugin\'s own `$.agent.spawn` can still run it.',
  [declaration('chunk-hh0a7kes.js', 'CT')], [
    { ...toolReference.provenance, role: 'complete authored tool and agent registration reference' },
    ...['c9', 'LDe', 'T'].map(n => evidence(fn('chunk-sz60fa8k.js', n), 'deferred schema resolution'))
  ]);

const blockReference = reference('reference-db4b1247.md.zst', '`$.model.complete({ model, prompt })`', '\n\n');
add('mod-model-blocks', 'Mod model requests preserve text blocks through compatible hook rewrites',
  '`$.model.complete` accepts `prompt` and `system` as strings or ordered `{ text, cache? }` blocks. The `model.complete` hook receives joined strings plus `promptBlocks` and `systemBlocks`. The final request keeps block marks only through the unchanged leading blocks: appending text preserves those matching blocks, while rewriting the opening removes their marks. The text is still sent when a mark is dropped.\n\nThis is a model-input construction rule. Provider caching support, minimum sizes, and runtime caching settings determine whether the marks have an effect. The request uses a single user message and an optional system message on the session\'s client, without conversation history. Its response is structured as `isAnswered` with text and usage, or `isAnswered: false` with a reason; a request that the engine refuses to send can reject.',
  [fn('chunk-hh0a7kes.js', 'Of')], [
    { ...blockReference.provenance, role: 'complete authored model and host API reference paragraph' },
    ...['F9t', 'B9t', 'W9t'].map(n => evidence(fn(main, n), 'block validation, rewrite preservation, and model request producer'))
  ]);

const mcpShort = declaration('chunk-wesbg6zy.js', 'LRn'), mcpLong = declaration('chunk-wesbg6zy.js', 'Nns');
if (mcpShort.node.init.value !== 2048 || mcpLong.node.init.value !== 16384) throw new Error('MCP description limits changed');
add('mcp-description-expansion', 'ToolSearch can load a longer MCP tool description',
  'An MCP tool\'s prompt description uses a 2,048-character ceiling when it was not loaded through ToolSearch. When its schema is loaded through ToolSearch, its prompt uses a separate description with a 16,384-character ceiling. `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` overrides either default. The adapters choose the expanded text using `loadedThroughToolSearch`; they append a truncation marker when a description exceeds its ceiling. This is a bound on descriptions, not on the input schema or tool result.',
  [mcpShort, mcpLong], [evidence(fn(main, '_x'), 'ceiling override'), evidence(fn('chunk-n2dge94d.js', 'Io'), 'description truncation'), evidence(fn('chunk-n2dge94d.js', '$c'), 'MCP tool prompt selects loadedThroughToolSearch description'), evidence(fn('chunk-ncnpx1am.js', 'Wn'), 'second MCP adapter selects expanded description')]);

const webOffset = literal(main, 'Character position in the page text to start reading from.');
add('webfetch-continuation', 'WebFetch distinguishes verbatim text, a summary, and an unread tail',
  'WebFetch\'s optional `offset` is a character position in extracted page text. A long response can give the next offset so the model can continue through the same page. The producer budgets the result after accounting for the URL, content type, and reporting instructions. Re-fetching the same split without advancing does not establish that the tail was read.\n\nWhen the producer supplements a verbatim prefix with a secondary model summary, it marks the boundary, identifies the summary as model-extracted from the same untrusted page, and tells the model to identify claims that depend on that summary. If that secondary call does not finish, the result says the remaining characters were not read and tells the model to report that portion as unknown unless it continues reading. See [Tools](#tools-md), record `tool-webfetch`.',
  [webOffset], [evidence(fn(main, 'VLo'), 'complete WebFetch result construction')], [webOffset]);

const interrupted = literal('chunk-wesbg6zy.js', 'The tool call was interrupted before a result was received.');
add('mcp-interruption', 'An interrupted MCP call has an unknown server outcome',
  'The MCP interruption path returns an error marked `interrupted` with the complete notice below. The adapters propagate that notice as a tool error. It tells the model that interruption before a reply does not establish whether the server completed the operation, asks for verification before assuming success, and says to retry if needed.',
  [interrupted], [
    evidence(containing('chunk-n2dge94d.js', 'CatchClause', 'return{content:Avt'), 'complete abort-to-interrupted-result conversion'),
    evidence(containing('chunk-ncnpx1am.js', 'CatchClause', 'return{content:Avt'), 'complete second adapter abort-to-interrupted-result conversion'),
    evidence(containing('chunk-n2dge94d.js', 'IfStatement', 'ut.interrupted'), 'first adapter propagates interruption as a tool error'),
    evidence(containing('chunk-ncnpx1am.js', 'IfStatement', 'We.interrupted'), 'second adapter propagates interruption as a tool error')
  ], [interrupted]);

const withheld = one(main, n => n.type === 'TemplateLiteral' && n.quasis.some(q => q.value.cooked?.includes('ran, and a plugin withheld its result:')), 'post-execution withheld result');
add('plugin-withheld-result', 'A withheld tool result can follow a completed tool call',
  'The plugin denial path checks whether the underlying tool call has produced a non-error tool result. If it has, the model receives the tool name followed by `ran, and a plugin withheld its result:` and the plugin\'s denial reason. Without that recorded non-error result, it uses the separate denied-call path. The completed-call notice distinguishes withholding a result from preventing the action. A model that sees it must account for the action having run even though the result is unavailable.',
  [withheld], [evidence(containing(main, 'IfStatement', 'nt(e.deny)'), 'complete post-execution denial and message-presence branch'), evidence(fn(main, 'R5n'), 'non-error tool-result test'), evidence(fn(main, 'oS'), 'matching tool-result lookup')]);

const hookRule = literal(main, '"ok" decides what happens next: true lets the action go ahead');
add('hook-rule-evaluation', 'Hook evaluators apply allow/block rules to the requested action',
  'The shared hook evaluator instruction makes `ok: true` permit the action and `ok: false` block it. It asks the evaluator to apply a user-authored allow/block rule as a rule, or test a condition for whether it holds. Event JSON and material read during evaluation are evidence, and instructions embedded inside them are ignored even when they claim to come from the user. This instruction is shared by the condition and stop-condition prompt paths. Read the complete evaluator prompts in [Background and utility prompts](#utility-prompts-md), records `hook-condition-evaluator` and `hook-stop-condition-evaluator`.',
  [hookRule], [], [hookRule]);

// Add direct condition evidence for the preserved sections whose primary record
// is prompt text or a schema description rather than a runtime implementation.
items[4].text = 'Command and HTTP hook schemas include `onFailure: "block"`. A hook that cannot start, times out, exits with an unexpected code, or produces invalid JSON becomes a blocking outcome instead of letting the guarded action continue. For command hooks, the policy does not apply when `async` or `asyncRewake` is true. It is also ignored for Stop, SubagentStop, TaskCompleted, and TeammateIdle. A timeout is converted to a failure only when the overall turn has not been cancelled. The PermissionRequest path returns a denial and the blocking path suppresses the original prompt.\n\nSeparately, for async Stop hooks, interpreter output that identifies a script which cannot be opened produces broken-installation feedback. An unquoted path with spaces receives a quoting diagnosis. Identical repeated broken installations are dropped after the first report instead of repeatedly waking the model.\n\nSee [Hooks](#hooks-md) and [System reminders and injections](#system-reminders-md), especially `stop-hook-broken-installation` and `stop-hook-rewake`.';
const failurePolicy = literal(settings, 'What a failure of this hook does:');
items[4].provenance = [evidence(failurePolicy, 'failure policy definition'), ...items[4].provenance];
items[4].text += `\n\nComplete authored text:\n\n\`\`\`text\n${stringValue(failurePolicy.node)}\n\`\`\``;
items[4].details.authored_texts = [{ text: stringValue(failurePolicy.node), provenance: evidence(failurePolicy, 'authored text') }];
items[4].details.source_read_provenance = [
  evidence(failurePolicy, 'complete command and HTTP hook failure policy description'),
  evidence(fn(settings, 'Ap'), 'complete hook schemas showing onFailure on command and HTTP definitions'),
  ...['tOe', 'G_t', 'Qre', 'K_t', 'V_t'].map(n => evidence(fn(main, n), 'onFailure policy guards and blocking result conversion')),
  evidence(declaration(main, 'z_t'), 'events that ignore onFailure block'),
  evidence(declaration(main, 'uXn'), 'personal required-hook event guard'),
  evidence(fn(main, 'xpr'), 'complete command and HTTP hook execution, failure classification, and policy application')
];
items[6].details.source_read_provenance = [range('chunk-yygm1ede.js', 34417, 35546, 'var rn=200,te=100,', 'complete allowance and refill implementation')];
items[0].details.source_read_provenance = [evidence(fn(main, 'yye'), 'compaction selector override, default, and invalid-value fallback')];
items[1].details.source_read_provenance = [
  ...['B4n', 'ss', 'os', 'ts', 'ns'].map(n => evidence(fn('chunk-v5wkdteh.js', n), 'Chrome setup offer guards and experiment selection')),
  ...['es', 'Jn'].map(n => evidence(declaration('chunk-v5wkdteh.js', n), 'Chrome offer experiment gate names')),
  evidence(fn(auth, 'Jp'), 'Chrome setup global gate and default'),
  evidence(fn('chunk-jryxzr93.js', 'VUt'), 'disconnected browser answer guard'),
  evidence(fn('chunk-tz5k4dyb.js', 'qn'), 'first-party provider guard'),
  evidence(fn(main, 'Hq'), 'dialog capability guard'),
  evidence(fn('chunk-ctxpwc46.js', 'zut'), 'host renders setup offer guard'),
  evidence(fn('chunk-p6qe267k.js', 'Wh'), 'ToolSearch eligibility guard')
];
items[2].details.source_read_provenance = [evidence(declaration('chunk-hnzz4bhg.js', 'r'), 'plugin publishing gate name'), evidence(declaration('chunk-hnzz4bhg.js', 't'), 'plugin publishing compiled default'), evidence(declaration('chunk-hnzz4bhg.js', 'F9n'), 'plugin publishing enablement'), evidence(fn('chunk-yc20d8eg.js', '$u'), 'complete publishing permission producer')];
for (const item of items) Object.assign(item.details, {
  evidence_scope: 'shipped-binary source review; external activation not observed',
  release, binary_sha256: binary, release_evidence: true, review_method: 'local complete-source inspection; not a provider verdict'
});
function allProvenance(item) {
  const p = [...item.provenance, ...(item.details.source_read_provenance ?? []), ...(item.details.curated_source_records ?? []).flatMap(r => r.provenance)];
  return [...new Map(p.map(p => [JSON.stringify([p.file, p.binary_offset, p.length, p.decompressed_offset, p.decompressed_length]), p])).values()];
}
const intro = '# Installed harness mechanisms in 2.1.295\n\nThis review describes the shipped macOS Apple-silicon binary for Claude Code 2.1.295. A compiled definition establishes source presence. Its gate and default determine whether the harness can expose it; remote flag values and account rollout remain unknown. This page is immutable release evidence for 2.1.295. Each record has the complete reviewed body and exact source locators; authored text is identified separately from the review prose.\n\n';
const md = intro + items.map(i => `## ${i.title}\n\n${i.text}\n\nSource evidence for 2.1.295:\n\n` + allProvenance(i).map(p => `- \`${p.file}\`, binary offset ${p.binary_offset}, length ${p.length}, SHA-256 \`${p.sha256}\`${p.encoding === 'zstd' ? `; decompressed offset ${p.decompressed_offset}, length ${p.decompressed_length}, SHA-256 \`${p.decompressed_sha256}\`` : ''}.`).join('\n')).join('\n\n') + '\n';
fs.writeFileSync(new URL(`feature-notes-${release}.json`, out), JSON.stringify({ area: 'feature-notes', version: release, binary_sha256: binary, items }, null, 2) + '\n');
fs.writeFileSync(new URL(`feature-notes-${release}.md`, out), md);
// Complete public-binary code bodies stay in the local review packet. Published
// records expose prose, authored text, and locators, never minified code context.
const sourceReview = items.map(item => ({ id: item.id, title: item.title, text: item.text,
  source_reads: allProvenance(item).map(p => {
    const encoding = p.encoding === 'utf-16le' || p.decoded_encoding === 'utf-16le' ? 'utf16le' : 'utf8';
    const bytes = Buffer.from(source(p.file), encoding);
    const start = p.decompressed_offset ?? p.binary_offset - files.get(p.file).file_offset;
    const length = p.decompressed_length ?? p.length;
    return { provenance: p, source_text: bytes.subarray(start, start + length).toString(encoding) };
  })
}));
fs.writeFileSync(new URL(`../work/feature-notes-${release}-source-review.json`, import.meta.url), JSON.stringify({
  version: release, binary_sha256: binary, scope: 'local semantic review of complete public-binary source spans; not a publication artifact', items: sourceReview
}, null, 2) + '\n');
console.log(`Feature notes: ${items.length} source-reviewed ${release} records`);
