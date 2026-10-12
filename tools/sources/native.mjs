// Instruction evidence from an already selected native/recorded session, plus current local files.
// Never infer cwd from an escaped Cursor project name; never follow config references or execute hooks.
// Path rules: OpenCode session/instruction.ts, skill/index.ts, config/{paths,agent}.ts;
// Cursor LocalCursorRulesService / AgentSkillsCursorRulesService (Agent CLI index.js),
// and hooks configuration paths (Agent CLI 190.index.js). These are candidates, not replayed precedence.
import { lstat, realpath, readdir, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, basename, join, resolve, relative, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { createRedactor } from '../../site/trace/network/redact.js';
import { scrubText, displayFile, MAX_TEXT, MAX_ROWS } from './read.mjs';
import { productOrigin } from '../../site/src/shared/site.mjs';

const MAX_SESSION_BYTES = 32 * 1024 * 1024;
const MAX_FILES = 500, MAX_VISITS = 3000, MAX_DEPTH = 6;
const SNAPSHOT = 'Current local files only; presence does not establish their contents or application when this session ran.';
const inside = (root, file) => { const r = relative(root, file); return !isAbsolute(r) && r !== '..' && !r.startsWith('../'); };
const absolute = value => typeof value === 'string' && isAbsolute(value) && !value.includes('\0') ? resolve(value) : null;
const textOf = value => typeof value === 'string' ? value : Array.isArray(value) ? value.filter(x => x?.type === 'text' && typeof x.text === 'string').map(x => x.text).join('\n') : '';

// Entries are resolver-owned, including in-memory SQLite exports, never caller-provided paths.
async function entryText(entry) {
  const size = entry.source?.size ?? (await lstat(entry.path)).size;
  if (!Number.isSafeInteger(size) || size > MAX_SESSION_BYTES) throw new Error('Native session entry exceeds the 32 MiB instruction scan limit.');
  if (entry.source) return Buffer.from(await entry.source.slice(0, size)).toString('utf8');
  const fd = await open(entry.path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { const buf = Buffer.alloc(size); const { bytesRead } = await fd.read(buf, 0, size, 0); return buf.subarray(0, bytesRead).toString('utf8'); }
  finally { await fd.close(); }
}

export async function nativeContext(session, { home = homedir() } = {}) {
  const ctx = { product: session.product, id: session.id, ids: [], cwd: null, version: null, start: null, end: null, home, catalog: null, warnings: [] };
  const recorded = [];
  const add = (id, location, kind, text) => { if (typeof text === 'string' && text) recorded.push({ session: id, location, kind, text }); };
  const capture = (id, loc, value) => {
    const role = value?.role ?? value?.message?.role;
    const text = textOf(value?.content ?? value?.message?.content);
    if (role === 'system' || role === 'developer') add(id, loc, `${role} text in native record`, text);
    else if (role === 'user') {
      // Exact bounded blocks, not a fabricated assembled prompt or ordinary user request.
      for (const match of text.matchAll(/<(rules|user_rules|project_rules|system_reminder|agent_instructions|skills)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g)) add(id, loc, `recorded ${match[1]} block`, match[0]);
      if (/^# AGENTS\.md instructions for /m.test(text)) add(id, loc, 'recorded AGENTS.md instruction message', text);
    }
  };
  const metadata = [];
  for (const entry of session.entries || []) {
    if (!/\.jsonl?$/.test(entry.path)) continue;
    try {
      const text = await entryText(entry);
      if (/\.jsonl$/.test(entry.path)) {
        const rows = text.split(/\r?\n/).flatMap((line, i) => { try { return [{ value: JSON.parse(line), line: i + 1 }]; } catch { return []; } });
        const init = rows.find(r => r.value.type === 'system' && r.value.subtype === 'init')?.value;
        const id = init?.session_id || session.id;
        if (id !== session.id) continue;
        metadata.push({ id, cwd: init?.cwd, version: init?.version, time: {} });
        for (const row of rows) capture(id, `line ${row.line}`, row.value);
      } else {
        const value = JSON.parse(text), info = value?.info;
        if (!info?.id) continue;
        if (session.product === 'opencode' && !Array.isArray(value.messages)) continue;
        if (session.product === 'cursor' && !/^trace-cursor-desktop-(?:transcript-)?export$/.test(value.format || '')) continue;
        metadata.push({ id: info.id, cwd: session.product === 'opencode' ? info.directory : info.cwd, version: info.version || info.desktopVersion, time: info.time || { created: info.createdAtMs, updated: info.updatedAtMs } });
        for (const [i, message] of (value.messages || []).entries()) {
          if (session.product === 'opencode') {
            const loc = `message ${message.info?.id || i + 1}`;
            add(info.id, loc, 'recorded message system override', textOf(message.info?.system));
            if (['system', 'developer'].includes(message.info?.role)) add(info.id, loc, 'recorded system message', textOf(message.parts));
            for (const [n, part] of (message.parts || []).entries()) {
              if (part.type === 'text' && part.synthetic === true) add(info.id, `${loc}, part ${n + 1}`, 'recorded synthetic text', part.text);
              if (part.type === 'tool' && part.state?.status === 'completed' && (part.tool === 'skill' || (part.tool === 'read' && part.state.metadata?.loaded?.length))) add(info.id, `${loc}, part ${n + 1}`, `recorded ${part.tool} output`, part.state.output);
            }
          } else capture(info.id, `native row ${message.row ?? i + 1}`, message.value);
        }
        for (const row of value.rows || []) capture(info.id, `native line ${row.line}`, row.value);
      }
    } catch (error) { ctx.warnings.push(error.message === 'Native session entry exceeds the 32 MiB instruction scan limit.' ? error.message : 'One selected session entry could not be scanned for instruction evidence.'); }
  }
  const root = metadata.find(m => m.id === session.id);
  ctx.ids = [...new Set([session.id, ...metadata.map(m => m.id)])];
  ctx.cwd = absolute(root?.cwd);
  ctx.version = root?.version || null;
  ctx.start = root?.time?.created ?? null; ctx.end = root?.time?.updated ?? null;
  if (!ctx.cwd) ctx.warnings.push('No exact working directory in the selected session metadata. Project sources are not guessed from storage folder names.');
  ctx.warnings.push('Default local instruction locations only. Historical environment overrides, rule selection, external configured paths, remote rules and plugin-generated text cannot be reconstructed from current files.');
  return { ctx, recorded };
}

// Allow root aliases such as /tmp -> /private/tmp, but reject symlinks at and below each
// explicit discovery boundary. Read revalidates and uses O_NOFOLLOW for the final component.
async function safeStat(root, file) {
  return (await inspectPath(root, file)).stat || null;
}
async function inspectPath(root, file) {
  if (!inside(root, file)) return { status: 'Custom location' };
  try {
    let cur = root;
    if ((await lstat(cur)).isSymbolicLink()) return { status: 'Linked folder' };
    for (const bit of relative(root, file).split('/').filter(Boolean)) { cur = join(cur, bit); if ((await lstat(cur)).isSymbolicLink()) return { status: 'Linked folder' }; }
    const [r, f] = await Promise.all([realpath(root), realpath(file)]);
    return inside(r, f) ? { stat: await lstat(file) } : { status: 'Custom location' };
  } catch (error) { return { status: ['ENOENT', 'ENOTDIR'].includes(error.code) ? 'Files not found' : 'Folder unreadable' }; }
}
async function ancestors(cwd, product) {
  if (!cwd) return [];
  const out = [];
  for (let p = cwd; out.length < 64; p = dirname(p)) {
    out.push(p);
    if (product === 'opencode' && await lstat(join(p, '.git')).catch(() => null)) break;
    if (dirname(p) === p) break;
  }
  return out;
}
function spec(id, name, what, targets, evidence) {
  return { id, name, join: 'snapshot', path: targets.map(t => t.label).join(', '), read: true, targets,
    reason: `${what} ${SNAPSHOT}`, catalog: { what: `${what} ${SNAPSHOT}`, evidence: [{ file: evidence }] } };
}
const file = (root, path, label, pick) => ({ root, path: join(root, path), label, pick });
const tree = (root, path, label, accept) => ({ root, path: join(root, path), label, accept });
async function specs(ctx) {
  const dirs = await ancestors(ctx.cwd, ctx.product), h = ctx.home;
  const project = (name, pick) => dirs.map(d => file(d, name, `{cwd ancestry}/${name}`, pick));
  const projectTree = (name, accept) => dirs.map(d => tree(d, name, `{cwd ancestry}/${name}`, accept));
  if (ctx.product === 'cursor') return [
    spec('cursor.project-rules', 'Project instruction candidates', 'AGENTS.md, optional third-party Markdown and .cursor/rules .mdc candidates along cwd ancestry; legacy .cursorrules candidates. Rule conditions and compatibility flags are not replayed.', [...['AGENTS.md', 'CLAUDE.md', 'CLAUDE.local.md', '.cursorrules'].flatMap(n => project(n)), ...projectTree('.cursor/rules', n => n.endsWith('.mdc'))], 'Agent CLI index.js: LocalCursorRulesService'),
    spec('cursor.skills', 'Local skill candidates', 'Skill definitions at default user and project locations; presence does not mean a skill was selected.', [...['.cursor/skills', '.cursor/skills-cursor', '.agents/skills', '.claude/skills', '.codex/skills', '.grok/skills'].flatMap(n => [tree(h, n, `~/${n}/**/SKILL.md`, x => x === 'SKILL.md'), ...(n === '.cursor/skills-cursor' ? [] : ctx.cwd ? [tree(ctx.cwd, n, `{cwd}/${n}/**/SKILL.md`, x => x === 'SKILL.md')] : [])])], 'Agent CLI index.js: AgentSkillsCursorRulesService'),
    ...(await cursorPluginSpecs(ctx)),
    spec('cursor.hooks', 'Configured hooks', 'Default user, team and project hook configuration. Commands are displayed only; configuration is not evidence of execution.', [file(h, '.cursor/hooks.json', '~/.cursor/hooks.json', 'hooks'), file(h, '.cursor/managed/active-team-hooks/hooks.json', '~/.cursor/managed/active-team-hooks/hooks.json', 'hooks'), ...(ctx.cwd ? [file(ctx.cwd, '.cursor/hooks.json', '{cwd}/.cursor/hooks.json', 'hooks')] : []), ...[file(h, '.claude/settings.json', '~/.claude/settings.json', 'hooks'), ...(ctx.cwd ? ['.claude/settings.json', '.claude/settings.local.json'].map(n => file(ctx.cwd, n, `{cwd}/${n}`, 'hooks')) : [])]], 'Agent CLI 190.index.js: hooks configuration paths'),
  ];
  const config = join(h, '.config/opencode');
  const configDirs = [config, join(h, '.opencode'), ...dirs.map(d => join(d, '.opencode'))];
  const configFile = (d, n, pick) => file(d === config ? h : dirname(d), join(d === config ? '.config/opencode' : '.opencode', n), `{config directory}/${n}`, pick);
  const configTree = (d, n, accept) => tree(d === config ? h : dirname(d), join(d === config ? '.config/opencode' : '.opencode', n), `{config directory}/${n}`, accept);
  return [
    spec('opencode.instructions', 'Instruction file candidates', 'Default global AGENTS.md and Claude compatibility fallback, plus project AGENTS.md/CLAUDE.md/CONTEXT.md. OpenCode precedence and runtime disable flags are not replayed.', [file(h, '.config/opencode/AGENTS.md', '~/.config/opencode/AGENTS.md'), file(h, '.claude/CLAUDE.md', '~/.claude/CLAUDE.md'), ...['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md'].flatMap(n => project(n))], 'packages/opencode/src/session/instruction.ts'),
    spec('opencode.config-instructions', 'Configured instruction and plugin references', 'Only instruction, agent prompt, skill path/URL and plugin fields are shown. References and substitutions remain literal: no external files, URLs, plugins or hooks are executed.', [...['opencode.json', 'opencode.jsonc'].flatMap(n => [...project(n, 'opencode'), ...configDirs.map(d => configFile(d, n, 'opencode'))])], 'packages/opencode/src/config/config.ts'),
    spec('opencode.skills', 'Local skill candidates', 'Default OpenCode and compatibility skill definitions; availability is not proof of invocation.', [...configDirs.flatMap(d => ['skill', 'skills'].map(n => configTree(d, n, x => x === 'SKILL.md'))), ...['.claude/skills', '.agents/skills'].flatMap(n => [tree(h, n, `~/${n}/**/SKILL.md`, x => x === 'SKILL.md'), ...projectTree(n, x => x === 'SKILL.md')])], 'packages/opencode/src/skill/index.ts'),
    spec('opencode.agents', 'Configured agent prompts', 'Markdown agent definitions in default configuration directories; presence does not establish which agent ran.', configDirs.flatMap(d => ['agent', 'agents', 'mode', 'modes'].map(n => configTree(d, n, x => x.endsWith('.md')))), 'packages/opencode/src/config/agent.ts'),
  ];
}

// Cursor's compatibility plugin loader reads this registry + enabledPlugins only.
// Installation references are accepted solely within fixed caches. Local plugin roots
// are immediate directories under .cursor/plugins/local; manifest paths stay inside one plugin.
const PLUGIN_LIMIT = 100;
const PLUGIN_EVIDENCE = 'Agent CLI index.js: cursor-plugins loadAllEnabledPlugins / loadUserLocalPlugins / discoverComponents';
async function boundedJSON(root, path) {
  const st = await safeStat(root, path);
  if (!st?.isFile() || st.size > MAX_TEXT * 2) return null;
  let fd;
  try {
    fd = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const size = (await fd.stat()).size;
    if (size > MAX_TEXT * 2) return null;
    const buf = Buffer.alloc(size), { bytesRead } = await fd.read(buf, 0, size, 0);
    return configJSON(buf.subarray(0, bytesRead).toString('utf8'));
  } catch { return null; } finally { await fd?.close(); }
}
const pluginRef = value => typeof value === 'string' && value.length <= 1024 && !value.includes('\\') && !value.includes('\0') && !isAbsolute(value) && !value.split('/').includes('..') && !/^[a-z][a-z0-9+.-]*:/i.test(value) ? value.replace(/^\.\//, '').replace(/\/$/, '') : null;
async function cursorPluginSpecs(ctx) {
  const h = ctx.home, rows = [], roots = [], targets = [], manifests = [];
  let references = 0;
  const cacheRoots = ['.claude/plugins/cache', '.cursor/plugins/cache'].map(n => join(h, n));
  const registry = await boundedJSON(h, join(h, '.claude/plugins/installed_plugins.json'));
  const global = await boundedJSON(h, join(h, '.claude/settings.json'));
  const project = ctx.cwd ? await boundedJSON(ctx.cwd, join(ctx.cwd, '.claude/settings.json')) : null;
  const local = ctx.cwd ? await boundedJSON(ctx.cwd, join(ctx.cwd, '.claude/settings.local.json')) : null;
  const flags = { ...project?.enabledPlugins, ...local?.enabledPlugins };
  for (const [id, entries] of Object.entries(registry?.plugins || {}).slice(0, PLUGIN_LIMIT)) {
    if (!Array.isArray(entries)) continue;
    if (ctx.cwd && flags[id] === false) continue;
    const selected = (ctx.cwd && flags[id] === true ? entries.find(e => ['project', 'local'].includes(e?.scope) && typeof e.projectPath === 'string' && e.projectPath.replaceAll('\\', '/').replace(/\/+$/, '') === ctx.cwd.replace(/\/+$/, '')) : null)
      || (global?.enabledPlugins?.[id] === true ? entries.find(e => e?.scope === 'user') : null);
    if (!selected) continue;
    const p = absolute(selected.installPath);
    const location = !p ? { status: 'No install path' }
      : !cacheRoots.some(root => p !== root && inside(root, p)) ? { status: 'Custom location' }
      : await inspectPath(h, p);
    const allowed = location.stat?.isDirectory();
    rows.push({ plugin: id, scope: selected.scope, version: typeof selected.version === 'string' ? selected.version : null, source: 'compatibility registry', status: allowed ? 'Available' : location.status || 'Not a folder', ...(allowed ? { path: displayFile(p, ctx) } : {}) });
    if (allowed) roots.push({ path: p, plugin: id });
  }
  if (Object.keys(registry?.plugins || {}).length > PLUGIN_LIMIT) rows.push({ status: 'registry limited to 100 plugin identifiers' });
  const localRoot = join(h, '.cursor/plugins/local');
  if ((await safeStat(h, localRoot))?.isDirectory()) {
    const entries = (await readdir(localRoot, { withFileTypes: true })).filter(e => !e.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries.slice(0, PLUGIN_LIMIT)) {
      const p = join(localRoot, entry.name);
      if (!entry.isDirectory() || !(await safeStat(h, p))?.isDirectory()) continue;
      rows.push({ plugin: entry.name, scope: 'user-local', source: 'Cursor local plugin folder', status: 'present in default local loader directory', path: displayFile(p, ctx) });
      roots.push({ path: p, plugin: entry.name });
    }
    if (entries.length > PLUGIN_LIMIT) rows.push({ status: 'local plugins limited to 100 directories' });
  }
  for (const root of roots) {
    let manifest = null, rejected = false;
    let fallback = {};
    const manifestPaths = [];
    for (const rel of ['.cursor-plugin/plugin.json', '.claude-plugin/plugin.json', 'plugin.json']) {
      const p = join(root.path, rel);
      // Conservative safety boundary: invalid/unsafe files never unlock another root.
      if (!await lstat(p).catch(() => null)) continue;
      const candidate = await boundedJSON(h, p);
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) { rejected = true; break; }
      manifestPaths.push(rel);
      // Shipped Bc accumulates only version/homepage/repository fallback metadata.
      // A name/version-only manifest must not mask a later component manifest.
      // Rich metadata, like description, is itself a stopping point in Bc.
      const components = ['commands', 'agents', 'skills', 'rules', 'hooks', 'mcpServers'].some(k => candidate[k] !== undefined);
      const logo = pluginRef(candidate.logo);
      const logoStat = logo ? await safeStat(h, resolve(root.path, logo)) : null;
      const rich = typeof candidate.displayName === 'string' || typeof candidate.description === 'string' || candidate.author?.name !== undefined
        || (logoStat?.isFile() && logoStat.size <= 10 * 1024 * 1024) || candidate.variables !== undefined || candidate.capabilities !== undefined;
      if (components || rich) { manifest = { ...fallback, ...candidate }; break; }
      for (const key of ['version', 'homepage', 'repository']) if (fallback[key] === undefined && candidate[key] !== undefined) fallback[key] = candidate[key];
    }
    if (rejected) {
      rows.push({ plugin: root.plugin, status: 'manifest unreadable, oversized or symlinked; components withheld' }); continue;
    }
    manifest ??= fallback;
    // Keep the original contributing files individually readable, rather than inventing
    // a merged historical manifest. Composition above selects today's components only.
    for (const rel of manifestPaths) manifests.push(file(h, relative(h, join(root.path, rel)), '{selected plugin}/manifest', 'plugin-manifest'));
    const add = async (rel, kind) => {
      if (++references > MAX_VISITS) { if (references === MAX_VISITS + 1) rows.push({ status: 'plugin discovery limited to 3000 component references' }); return; }
      const ref = pluginRef(rel);
      if (!ref || ref === '.') { rows.push({ plugin: root.plugin, status: `unsafe or empty ${kind} manifest path withheld` }); return; }
      const p = resolve(root.path, ref);
      if (!inside(root.path, p) || !(await safeStat(h, p))) return;
      if (kind === 'hooks') {
        const st = await safeStat(h, p);
        const f = st?.isDirectory() ? join(p, 'hooks.json') : p;
        if (!f.endsWith('.json') || !(await safeStat(h, f))?.isFile()) return;
        targets.push(file(h, relative(h, f), '{selected plugin}/hooks', 'hooks')); return;
      }
      const st = await safeStat(h, p);
      const accept = kind === 'skills' ? n => n === 'SKILL.md' : n => /\.(md|mdc|markdown)$/.test(n) || (kind === 'commands' && n.endsWith('.txt'));
      if (st?.isFile()) { if (accept(basename(p))) targets.push(file(h, relative(h, p), `{selected plugin}/${kind}`)); }
      else if (st?.isDirectory()) targets.push(tree(h, relative(h, p), `{selected plugin}/${kind}`, accept));
    };
    if (manifest?.skills === undefined) await add('SKILL.md', 'skills');
    for (const kind of ['skills', 'rules', 'agents', 'commands', 'hooks']) {
      const value = manifest?.[kind];
      if (value === undefined) await add(kind === 'hooks' ? 'hooks/hooks.json' : kind, kind);
      else if (typeof value === 'string') await add(value, kind);
      else if (Array.isArray(value)) {
        for (const ref of value.slice(0, PLUGIN_LIMIT)) await add(ref, kind);
        if (value.length > PLUGIN_LIMIT) rows.push({ plugin: root.plugin, status: `${kind} manifest paths limited to 100` });
      }
      // Inline hooks remain in the projected manifest; no referenced script is opened.
    }
  }
  return [
    { ...spec('cursor.plugin-registry', 'Current local plugin selection', 'Only enabledPlugins and installation metadata are used. Exact workspace settings override global selection; user-local folders are present candidates. Neither establishes session-time activation.', [], PLUGIN_EVIDENCE), path: '~/.claude/plugins/installed_plugins.json + enabledPlugins; ~/.cursor/plugins/local', rows },
    spec('cursor.plugin-manifests', 'Local plugin instruction manifests', 'Projected instruction component fields from selected local plugin manifests; MCP, variables and other configuration fields are withheld.', manifests, PLUGIN_EVIDENCE),
    spec('cursor.plugin-instructions', 'Local plugin skills, rules, agents, commands and hooks', 'Bounded instruction files from current compatible-plugin selection and user-local plugin folders. Only paths contained in fixed plugin roots are read; commands are never executed.', targets, PLUGIN_EVIDENCE),
  ];
}

async function filesOf(s) {
  const files = [], seen = new Set(); let visits = 0, limited = false;
  async function visit(target, p, depth) {
    if (++visits > MAX_VISITS || files.length >= MAX_FILES) { limited = true; return; }
    const st = await safeStat(target.root, p); if (!st) return;
    if (st.isDirectory() && target.accept) {
      if (depth >= MAX_DEPTH) { limited = true; return; }
      const dir = await readdir(p, { withFileTypes: true });
      for (const item of dir.sort((a, b) => a.name.localeCompare(b.name))) {
        if (visits >= MAX_VISITS || files.length >= MAX_FILES) { limited = true; break; }
        if (!item.isSymbolicLink() && (item.isDirectory() || target.accept(item.name))) await visit(target, join(p, item.name), depth + 1);
      }
    } else if (st.isFile() && (!target.accept || target.accept(basename(p))) && !seen.has(p)) {
      seen.add(p); files.push({ path: p, root: target.root, bytes: st.size, modified: st.mtimeMs, pick: target.pick });
    }
  }
  for (const target of s.targets) await visit(target, target.path, 0);
  return { files, limited };
}

// JSONC: strip comments and trailing commas outside strings, never evaluate configuration.
function configJSON(text) {
  let clean = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { clean += c; if (c === '\\') clean += text[++i] || ''; else if (c === '"') quoted = false; }
    else if (c === '"') { quoted = true; clean += c; }
    else if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; clean += '\n'; }
    else if (c === '/' && text[i + 1] === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; clean += ' '; }
    else clean += c;
  }
  let out = ''; quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) { out += c; if (c === '\\') out += clean[++i] || ''; else if (c === '"') quoted = false; }
    else if (c === '"') { quoted = true; out += c; }
    else if (c !== ',' || !/^\s*[}\]]/.test(clean.slice(i + 1))) out += c;
  }
  return JSON.parse(out);
}
function picked(value, type) {
  if (type === 'plugin-manifest') return Object.fromEntries(['name', 'version', 'description', 'skills', 'rules', 'agents', 'commands', 'hooks'].filter(k => value[k] != null).map(k => [k, value[k]]));
  if (type === 'hooks') return { ...(value.version != null ? { version: value.version } : {}), hooks: value.hooks ?? {} };
  const out = {};
  for (const key of ['instructions', 'plugin', 'skills', 'default_agent']) if (value[key] != null) out[key] = value[key];
  for (const key of ['agent', 'mode']) if (value[key] && typeof value[key] === 'object') {
    out[key] = Object.fromEntries(Object.entries(value[key]).map(([name, agent]) => [name, Object.fromEntries(['prompt', 'description', 'mode', 'disable', 'hidden'].filter(k => agent?.[k] != null).map(k => [k, agent[k]]))]));
  }
  return out;
}
// Avoid pathological regex work on unbroken binary-like values in otherwise textual files.
const boundedText = text => text.replace(/\S{2049,}/g, '‹overlong unbroken value withheld›');
function cleaner(ctx) { const r = createRedactor(); r.protect(ctx.ids); return text => scrubText(r.str(boundedText(text))); }

// Legacy User Rules is a single exact key in the shared application database. Shipped
// desktop getPersonalContext/updatePersonalContext use APPLICATION scope (-1).
const PERSONAL_CONTEXT_KEY = 'aicontext.personalContext';
const cursorStatePath = h => join(h, process.platform === 'darwin' ? 'Library/Application Support/Cursor/User/globalStorage/state.vscdb' : process.platform === 'win32' ? 'AppData/Roaming/Cursor/User/globalStorage/state.vscdb' : '.config/Cursor/User/globalStorage/state.vscdb');
async function cursorPersonalContext(ctx, content = false) {
  const path = cursorStatePath(ctx.home);
  if (!(await safeStat(ctx.home, path))?.isFile()) return null;
  for (const suffix of ['-wal', '-shm', '-journal']) {
    const sidecar = await lstat(path + suffix).catch(() => null);
    if (sidecar && !(await safeStat(ctx.home, path + suffix))?.isFile()) return null;
  }
  let db;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(path, { readOnly: true });
    const row = db.prepare('SELECT length(CAST(value AS BLOB)) AS bytes FROM ItemTable WHERE key = ?').get(PERSONAL_CONTEXT_KEY);
    if (!row) return { path, bytes: 0, missing: true };
    if (!content || row.bytes > MAX_TEXT * 2) return { path, bytes: row.bytes, oversized: row.bytes > MAX_TEXT * 2 };
    return { path, bytes: row.bytes, text: String(db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(PERSONAL_CONTEXT_KEY).value || '') };
  } catch { return { path, error: 'The exact legacy User Rules database key could not be read.' }; }
  finally { db?.close(); }
}
const boundary = (product, id, name, status, reason, evidence) => ({ id: `${product}.${id}`, name, status, join: status === 'remote' ? 'remote' : 'none', read: false, path: 'Not reconstructed from local session records', reason, catalog: { what: reason, evidence: [{ file: evidence }] } });
function boundaries(product) {
  if (product === 'cursor') return [
    boundary(product, 'user-team-rules', 'Server-managed User and Team rules', 'remote', 'The shipped desktop KnowledgeBaseService fetches current User Rules from knowledgeBaseList. Team rules also have server-managed selection. Only text retained in the selected native recording is session evidence; Trace does not request these services.', 'desktop workbench.desktop.main.js: KnowledgeBaseService / injectLocalModeNonFileRules'),
    boundary(product, 'plugin-activation', 'Remote plugin activation and external plugin roots', 'not-read', 'First-party marketplace activation is selected by the listEnabledPlugins service, not cache presence. Historical activation, additional workspaces, external installation paths, variable substitutions and runtime plugin output are not reconstructed. Current bounded compatibility and user-local plugin sources are listed separately.', 'Agent CLI index.js: cursor-plugins runtime'),
    boundary(product, 'conditional-rules', 'Nested, managed and conditional rule selection', 'not-read', 'Arbitrary nested workspace rules, additional workspace roots, enterprise hook files, runtime feature flags and model/provider-selected prompt fragments are not replayed. Default cwd ancestry rules and hooks are current snapshots only.', 'Agent CLI index.js: LocalCursorRulesService'),
  ];
  return [boundary(product, 'external-instructions', 'External configured instructions and plugin transforms', 'not-read', 'Configured instruction globs, external skill paths, remote URL bodies, environment/file substitutions and plugin transforms are not followed or executed. Their literal configuration references are shown; runtime application requires recorded evidence.', 'packages/opencode/src/session/instruction.ts / session/llm/request.ts')];
}

export async function nativeSourcesReport(session, opts) {
  const { ctx, recorded } = await nativeContext(session, opts);
  const list = await specs(ctx);
  const sources = [{ id: `${ctx.product}.recorded-instructions`, name: 'Recorded instruction-bearing text', join: 'exact', status: recorded.length ? 'found' : 'none-for-session', read: true, path: 'Selected native session records', count: recorded.length, unit: 'record', catalog: { what: 'Exact text retained in native records, redacted on read. A synthetic flag or instruction wrapper is evidence of recorded content, not independent proof of its origin or final provider delivery.', evidence: [] } }];
  for (const s of list) {
    const { targets, rows, ...publicSpec } = s;
    if (rows) { sources.push({ ...publicSpec, status: rows.length ? 'found' : 'absent', count: rows.length, unit: 'record' }); continue; }
    const { files, limited } = await filesOf(s);
    sources.push({ ...publicSpec, path: [...new Set(s.targets.map(t => t.label))].join(', ') || 'Working directory not recorded', status: files.length ? 'found' : 'absent', count: files.length, unit: 'file', bytes: files.reduce((sum, f) => sum + f.bytes, 0), modified: files.length ? Math.max(...files.map(f => f.modified)) : null, limited });
  }
  if (ctx.product === 'cursor') {
    const r = await cursorPersonalContext(ctx);
    sources.push({ id: 'cursor.personal-context', name: 'Legacy desktop User Rules', join: 'snapshot', read: true, path: 'Cursor/User/globalStorage/state.vscdb · aicontext.personalContext', status: !r ? 'absent' : r.error ? 'error' : r.missing ? 'none-for-session' : 'found', count: r && !r.missing && !r.error ? 1 : 0, unit: 'key', bytes: r?.bytes, error: r?.error, catalog: { what: `Only the exact legacy personal-context key is queried; auth and other database keys are never selected. Modern server-managed User Rules are listed separately. ${SNAPSHOT}`, evidence: [{ file: 'desktop workbench.desktop.main.js: getPersonalContext / updatePersonalContext' }] } });
  }
  sources.push(...boundaries(ctx.product));
  const { home, ...context } = ctx;
  context.sourceMap = productOrigin(ctx.product);
  return { context, sources };
}

export async function readNativeSource(session, sourceId, opts = {}) {
  const { ctx, recorded } = await nativeContext(session, opts), clean = cleaner(ctx);
  if (sourceId === `${ctx.product}.recorded-instructions`) {
    const offset = Math.max(0, Number.isSafeInteger(opts.offset) ? opts.offset : 0);
    return { kind: 'rows', path: 'Selected native session records', total: recorded.length, offset, rows: recorded.slice(offset, offset + MAX_ROWS).map(row => ({ ...row, text: clean(row.text.slice(0, MAX_TEXT)), ...(row.text.length > MAX_TEXT ? { truncated: true } : {}) })) };
  }
  if (ctx.product === 'cursor' && sourceId === 'cursor.personal-context') {
    const r = await cursorPersonalContext(ctx, true);
    if (!r || r.missing || r.error || r.oversized) return { kind: 'note', text: r?.error || (r?.oversized ? 'Legacy User Rules exceeds the bounded read limit.' : 'No legacy personal-context key in the known local database.') };
    return { kind: 'text', join: 'snapshot', path: `${displayFile(r.path, ctx)} · ${PERSONAL_CONTEXT_KEY}`, bytes: r.bytes, text: clean(r.text.slice(0, MAX_TEXT)), truncated: r.text.length > MAX_TEXT };
  }
  const limitation = boundaries(ctx.product).find(s => s.id === sourceId);
  if (limitation) return { kind: 'note', text: limitation.reason };
  const s = (await specs(ctx)).find(s => s.id === sourceId);
  if (!s) return { kind: 'note', text: "That source isn't among this session's local instruction sources." };
  if (s.rows) {
    const offset = Math.max(0, Number.isSafeInteger(opts.offset) ? opts.offset : 0);
    return { kind: 'rows', path: s.path, join: 'snapshot', total: s.rows.length, offset, rows: s.rows.slice(offset, offset + MAX_ROWS).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'string' ? clean(value) : value]))) };
  }
  const { files, limited } = await filesOf(s);
  if (!files.length) return { kind: 'note', text: ctx.cwd ? 'No readable files in the known local locations.' : 'No files in the known global locations; the session does not record an exact project working directory.' };
  if (opts.part == null && files.length > 1) return { kind: 'files', total: files.length, limited, files: files.map(f => ({ path: displayFile(f.path, ctx), bytes: f.bytes, modified: f.modified })) };
  const f = opts.part == null ? files[0] : files.find(f => displayFile(f.path, ctx) === opts.part);
  if (!f || !(await safeStat(f.root, f.path))?.isFile()) return { kind: 'note', text: "That file isn't a readable member of this source." };
  const fd = await open(f.path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const st = await fd.stat();
    if (!st.isFile()) return { kind: 'note', text: 'Not a regular instruction file.' };
    if (f.pick && st.size > MAX_TEXT * 2) return { kind: 'note', text: 'Configuration exceeds the bounded parse limit; content was not read.' };
    const buf = Buffer.alloc(Math.min(st.size, MAX_TEXT * 2)), { bytesRead } = await fd.read(buf, 0, buf.length, 0);
    if (buf.includes(0)) return { kind: 'note', text: 'Binary content is not read as instructions.' };
    let text = buf.subarray(0, bytesRead).toString('utf8');
    if (f.pick) {
      let value; try { value = picked(configJSON(text), f.pick); } catch { return { kind: 'note', text: 'Configuration is not valid JSON/JSONC; raw contents are withheld.' }; }
      const bound = (v, depth = 0) => depth > 30 ? '‹nested value withheld›' : typeof v === 'string' ? boundedText(v) : Array.isArray(v) ? v.map(x => bound(x, depth + 1)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, bound(x, depth + 1)])) : v;
      value = bound(value);
      const redactor = createRedactor(); redactor.protect(ctx.ids); redactor.harvest(value);
      text = JSON.stringify(redactor.json(value), null, 2);
    }
    return { kind: 'text', path: displayFile(f.path, ctx), bytes: st.size, join: 'snapshot', text: clean(text.slice(0, MAX_TEXT)), truncated: st.size > buf.length || text.length > MAX_TEXT };
  } finally { await fd.close(); }
}
