import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { sourcesReport, readSource, catalogOf } from '../sources/index.mjs';
import { memoryEntry } from '../trace-native.mjs';
const OC = 'ses_SyntheticMixedCase', CUR = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
async function setup(t) {
 const home = await mkdtemp(join(tmpdir(), 'native-sources-')); t.after(() => rm(home, { recursive: true, force: true }));
 const cwd = join(home, 'project', 'sub');
 await mkdir(cwd, { recursive: true }); await mkdir(join(home, 'project', '.git'));
 const put = async (p, text) => { const f = join(home, p); await mkdir(dirname(f), { recursive: true }); await writeFile(f, text); return f; };
 const oc = (extra = {}) => ({ product: 'opencode', id: OC, entries: [memoryEntry({ info: { id: OC, directory: cwd, version: '2.fixture', ...extra }, messages: [] }, `native/${OC}.json`)] });
 const cursor = (extra = {}) => ({ product: 'cursor', id: CUR, entries: [memoryEntry({ format: 'trace-cursor-desktop-export', info: { id: CUR, cwd, ...extra }, messages: [] }, `native/${CUR}.json`)] });
 return { home, cwd, put, oc, cursor };
}
const by = report => Object.fromEntries(report.sources.map(s => [s.id, s]));

test('plugin lookup reports missing files separately from custom and linked locations', async t => {
 const { home, put, cursor } = await setup(t);
 const cache = '.claude/plugins/cache/fixture';
 await put(`${cache}/present/1/skills/example/SKILL.md`, 'Local instruction');
 await symlink(join(home, cache, 'present/1'), join(home, cache, 'linked'));
 const paths = { present: `${cache}/present/1`, missing: `${cache}/missing/unknown`, linked: `${cache}/linked`, custom: 'other-plugin' };
 await put('.claude/plugins/installed_plugins.json', JSON.stringify({ plugins: Object.fromEntries(Object.entries(paths).map(([id, path]) => [id, [{ scope: 'user', installPath: join(home, path) }]])) }));
 await put('.claude/settings.json', JSON.stringify({ enabledPlugins: Object.fromEntries(Object.keys(paths).map(id => [id, true])) }));
 const { rows } = await readSource(cursor(), 'cursor.plugin-registry', { home });
 assert.deepEqual(Object.fromEntries(rows.map(r => [r.plugin, r.status])), { present: 'Available', missing: 'Files not found', linked: 'Linked folder', custom: 'Custom location' });
 assert.equal(by(await sourcesReport(cursor(), { home }))['cursor.plugin-instructions'].count, 1);
});

test('OpenCode in-memory native metadata drives bounded ancestor instruction, skill and config snapshots', async t => {
 const { home, cwd, put, oc } = await setup(t);
 await put('AGENTS.md', 'Outside the repository boundary');
 await put('project/AGENTS.md', 'Project instruction');
 await put('project/sub/AGENTS.md', 'Nested instruction');
 await put('.config/opencode/AGENTS.md', 'Global instruction');
 await put('.config/opencode/skills/fixture/SKILL.md', 'Fixture skill');
 await put('project/.opencode/agents/reviewer.md', 'Fixture agent prompt');
 await put('project/opencode.jsonc', '{ // synthetic config\n "instructions": ["guide.md", "https://example.test/rules"], "agent":{"build":{"prompt":"Configured prompt","options":{"credential":"withheld"}}}, "provider":{"secret":"PRIVATE"}, }');
 const rep = await sourcesReport(oc(), { home }), s = by(rep);
 assert.equal(rep.context.cwd, cwd); assert.equal(rep.context.id, OC); assert.deepEqual(rep.context.ids, [OC]);
 assert.equal(s['opencode.instructions'].count, 3); assert.equal(s['opencode.instructions'].join, 'snapshot');
 assert.equal(s['opencode.skills'].count, 1); assert.equal(s['opencode.agents'].count, 1);
 const config = await readSource(oc(), 'opencode.config-instructions', { home });
 assert.equal(config.kind, 'text'); assert.match(config.text, /Configured prompt/); assert.match(config.text, /guide.md/);
 assert.doesNotMatch(config.text, /PRIVATE|credential|options|provider/);
 const list = await readSource(oc(), 'opencode.instructions', { home });
 assert.equal(list.kind, 'files'); assert.equal(list.files.length, 3);
 const selected = await readSource(oc(), 'opencode.instructions', { home, part: '~/project/AGENTS.md' });
 assert.equal(selected.text, 'Project instruction'); assert.equal(selected.join, 'snapshot');
 assert.equal(catalogOf('opencode'), null);
});

test('Cursor native and recorded stream metadata expose rule ancestry, skills and hooks without claiming execution', async t => {
 const { home, cwd, put, cursor } = await setup(t);
 await put('project/AGENTS.md', 'Ancestor rule');
 await put('project/sub/.cursor/rules/app.mdc', '---\nalwaysApply: true\n---\nFixture rule');
 await put('project/sub/.cursor/rules/ignored.txt', 'Not a rule');
 await put('.cursor/skills/fixture/SKILL.md', 'Global skill');
 await put('project/sub/.cursor/hooks.json', JSON.stringify({ version: 1, hooks: { beforeShellExecution: [{ command: 'printf fixture' }] }, other: 'withheld' }));
 const rep = await sourcesReport(cursor(), { home }), s = by(rep);
 assert.equal(s['cursor.project-rules'].count, 2); assert.equal(s['cursor.skills'].count, 1); assert.equal(s['cursor.hooks'].count, 1);
 assert.match(s['cursor.hooks'].catalog.what, /not evidence of execution/);
 const hooks = await readSource(cursor(), 'cursor.hooks', { home }); assert.match(hooks.text, /printf fixture/); assert.doesNotMatch(hooks.text, /withheld/);
 const log = await put('recording/stream.jsonl', JSON.stringify({ type: 'system', subtype: 'init', session_id: CUR, cwd, model: 'fixture' }) + '\n');
 assert.equal((await sourcesReport({ product: 'cursor', id: CUR, entries: [{ path: log }] }, { home })).context.cwd, cwd);
});

test('missing cwd is explicit: never reverse an escaped Cursor project storage path', async t => {
 const { home, put } = await setup(t);
 await put('project/AGENTS.md', 'Must not be inferred');
 await put('.cursor/skills/fixture/SKILL.md', 'Still available globally');
 const session = { product: 'cursor', id: CUR, entries: [memoryEntry({ format: 'trace-cursor-desktop-transcript-export', info: { id: CUR }, rows: [] }, `.cursor/projects/escaped-project/agent-transcripts/${CUR}.json`)] };
 const report = await sourcesReport(session, { home });
 assert.equal(report.context.cwd, null); assert.equal(by(report)['cursor.project-rules'].count, 0);
 assert.equal(by(report)['cursor.skills'].count, 1); assert.match(report.context.warnings.join(' '), /not guessed/);
});

test('recorded instruction text stays distinct from newer disk contents and ordinary user messages', async t => {
 const { home, cwd, put } = await setup(t);
 await put('project/AGENTS.md', 'NEW DISK CONTENT');
 const system = 'Original recorded system override';
 const injected = 'Instructions from: fixture.md\nOriginal injected body';
 const session = { product: 'opencode', id: OC, entries: [memoryEntry({ info: { id: OC, directory: cwd }, messages: [{ info: { id: 'msg_fixture', role: 'user', system }, parts: [{ type: 'text', text: 'Ordinary user request' }, { type: 'text', synthetic: true, text: injected }] }] }, 'native/fixture.json')] };
 const report = await sourcesReport(session, { home });
 assert.equal(by(report)['opencode.recorded-instructions'].join, 'exact');
 const read = await readSource(session, 'opencode.recorded-instructions', { home });
 assert.deepEqual(read.rows.map(r => r.text), [system, injected]); assert.doesNotMatch(JSON.stringify(read), /NEW DISK|Ordinary user/);
 const cursor = { product: 'cursor', id: CUR, entries: [memoryEntry({ format: 'trace-cursor-desktop-transcript-export', info: { id: CUR }, rows: [{ line: 1, value: { role: 'user', message: { content: [{ type: 'text', text: '<rules>Exact rule\n  whitespace</rules>\nOrdinary question' }] } } }] }, 'native/fixture.json')] };
 assert.equal((await readSource(cursor, 'cursor.recorded-instructions', { home })).rows[0].text, '<rules>Exact rule\n  whitespace</rules>');
});

test('source reads cannot select credentials, symlink files, symlink directories or arbitrary paths', async t => {
 const { home, put, oc, cursor } = await setup(t);
 const secret = await put('private/credential', 'NEVER READ THIS');
 await symlink(secret, join(home, 'project', 'AGENTS.md'));
 await mkdir(join(home, 'project/sub/.cursor'), { recursive: true });
 await symlink(join(home, 'private'), join(home, 'project/sub/.cursor/rules'));
 await put('private/secret.mdc', 'NEVER READ THIS');
 await put('.cursor/auth.json', 'NEVER READ THIS');
 await put('project/sub/AGENTS.md', 'Allowed rule');
 const s = by(await sourcesReport(oc(), { home })); assert.equal(s['opencode.instructions'].count, 1);
 const cursorReport = by(await sourcesReport(cursor(), { home })); assert.equal(cursorReport['cursor.project-rules'].count, 1);
 const arbitrary = await readSource(oc(), 'opencode.instructions', { home, part: secret }); assert.equal(arbitrary.kind, 'note');
 assert.equal((await readSource(cursor(), '../../private/credential', { home })).kind, 'note');
 // Reject symlink components above the config directory as well.
 await symlink(join(home, 'private'), join(home, '.config'));
 await put('private/opencode/AGENTS.md', 'NEVER READ THIS');
 assert.equal(by(await sourcesReport(oc(), { home }))['opencode.instructions'].count, 1);
});

test('bounded reads redact instruction secrets and refuse oversized or malformed config', async t => {
 const { home, put, cursor, oc } = await setup(t);
 const token = 'gh' + 'p_' + 'aB9'.repeat(15);
 await put('project/sub/AGENTS.md', `rule\napi_key="${'abcd'.repeat(10)}"\n${token}\n` + 'x'.repeat(850_000));
 const rule = await readSource(cursor(), 'cursor.project-rules', { home });
 assert.equal(rule.truncated, true); assert.ok(rule.text.length <= 400_000); assert.doesNotMatch(rule.text, new RegExp(token)); assert.doesNotMatch(rule.text, /abcdabcd/);
 await put('project/opencode.jsonc', '{not valid: secret}');
 assert.equal((await readSource(oc(), 'opencode.config-instructions', { home })).kind, 'note');
 await put('project/opencode.jsonc', ' '.repeat(800_001));
 const large = await readSource(oc(), 'opencode.config-instructions', { home }); assert.equal(large.kind, 'note'); assert.match(large.text, /bounded parse limit/);
});

test('legacy Cursor User Rules query only the shipped exact SQLite key and leave credentials untouched', async t => {
 const { home, cursor } = await setup(t);
 const { DatabaseSync } = await import('node:sqlite');
 const dir = join(home, process.platform === 'darwin' ? 'Library/Application Support/Cursor/User/globalStorage' : process.platform === 'win32' ? 'AppData/Roaming/Cursor/User/globalStorage' : '.config/Cursor/User/globalStorage');
 await mkdir(dir, { recursive: true });
 const db = new DatabaseSync(join(dir, 'state.vscdb')); db.exec('CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)');
 db.prepare('INSERT INTO ItemTable VALUES (?, ?)').run('aicontext.personalContext', 'Synthetic legacy User Rules');
 db.prepare('INSERT INTO ItemTable VALUES (?, ?)').run('cursorAuth/accessToken', 'NEVER READ THIS'); db.close();
 const report = await sourcesReport(cursor(), { home });
 assert.equal(by(report)['cursor.personal-context'].join, 'snapshot'); assert.equal(by(report)['cursor.personal-context'].count, 1);
 const value = await readSource(cursor(), 'cursor.personal-context', { home }); assert.equal(value.text, 'Synthetic legacy User Rules');
 assert.doesNotMatch(JSON.stringify([report, value]), /NEVER READ THIS|accessToken/);
 assert.equal(by(report)['cursor.user-team-rules'].status, 'remote'); assert.equal(by(report)['cursor.plugin-activation'].status, 'not-read');
});

test('oversized session inputs are skipped before reading with a visible scan boundary', async t => {
 const { home } = await setup(t); let reads = 0;
 const session = { product: 'opencode', id: OC, entries: [{ path: 'native/large.json', memory: true, source: { size: 33 * 1024 * 1024, slice: async () => { reads++; return Buffer.alloc(0); } } }] };
 const report = await sourcesReport(session, { home });
 assert.equal(reads, 0); assert.match(report.context.warnings.join(' '), /32 MiB/);
 assert.equal(report.context.cwd, null); assert.equal(by(report)['opencode.recorded-instructions'].count, 0);
});

test('Cursor compatibility plugin selection respects exact workspace scope and local disable overrides', async t => {
 const { home, cwd, put, cursor } = await setup(t);
 const cache = '.claude/plugins/cache/fixture';
 const install = async (name, text) => { const p = `${cache}/${name}/1`; await put(`${p}/skills/main/SKILL.md`, text); return join(home, p); };
 const user = await install('user', 'User plugin skill');
 const scoped = await install('scoped', 'Workspace plugin skill');
 const disabled = await install('disabled', 'Must remain disabled');
 const foreign = await install('foreign', 'Must not select foreign workspace');
 const fallback = await install('fallback', 'Global fallback skill');
 await put('.claude/plugins/installed_plugins.json', JSON.stringify({ plugins: {
  'selected@fixture': [{ scope: 'user', installPath: user }, { scope: 'project', projectPath: cwd, installPath: scoped }],
  'disabled@fixture': [{ scope: 'user', installPath: disabled }],
  'foreign@fixture': [{ scope: 'project', projectPath: join(home, 'other'), installPath: foreign }],
  'fallback@fixture': [{ scope: 'user', installPath: fallback }, { scope: 'local', projectPath: join(home, 'other'), installPath: foreign }],
 } }));
 await put('.claude/settings.json', JSON.stringify({ enabledPlugins: { 'selected@fixture': true, 'disabled@fixture': true, 'fallback@fixture': true }, env: { PRIVATE: 'Never show this environment value' } }));
 await put('project/sub/.claude/settings.json', JSON.stringify({ enabledPlugins: { 'selected@fixture': true, 'disabled@fixture': true, 'foreign@fixture': true, 'fallback@fixture': true } }));
 await put('project/sub/.claude/settings.local.json', JSON.stringify({ enabledPlugins: { 'disabled@fixture': false } }));
 const report = await sourcesReport(cursor(), { home });
 assert.equal(by(report)['cursor.plugin-instructions'].count, 2);
 assert.equal(by(report)['cursor.plugin-instructions'].join, 'snapshot');
 const registry = await readSource(cursor(), 'cursor.plugin-registry', { home });
 assert.deepEqual(registry.rows.map(row => [row.plugin, row.scope]), [['selected@fixture', 'project'], ['fallback@fixture', 'user']]);
 const list = await readSource(cursor(), 'cursor.plugin-instructions', { home });
 assert.equal(list.kind, 'files'); assert.ok(list.files.some(f => f.path.includes('/scoped/'))); assert.ok(list.files.some(f => f.path.includes('/fallback/')));
 assert.doesNotMatch(JSON.stringify([report, registry]), /Never show/);
 // Missing cwd allows user scope only, even if a project installation exists.
 const globalOnly = await readSource(cursor({ cwd: null }), 'cursor.plugin-registry', { home });
 assert.equal(globalOnly.rows.find(r => r.plugin === 'selected@fixture').scope, 'user');
});

test('Cursor user-local plugin manifests supply bounded instruction components and projected inline hooks', async t => {
 const { home, put, cursor } = await setup(t);
 const root = '.cursor/plugins/local/fixture';
 await put(`${root}/.cursor-plugin/plugin.json`, JSON.stringify({ name: 'fixture', skills: ['./custom-skills'], rules: 'guidance', hooks: { beforeShellExecution: [{ command: 'printf not-executed' }] }, mcpServers: { private: { command: 'never-run', env: { secret: 'NEVER RETURN' } } }, variables: { secret: 'NEVER RETURN' } }));
 await put(`${root}/custom-skills/one/SKILL.md`, 'Custom skill instruction');
 await put(`${root}/guidance/local.mdc`, 'Local plugin rule');
 await put(`${root}/agents/reviewer.md`, 'Agent definition');
 await put(`${root}/commands/start.txt`, 'Command instructions');
 await put(`${root}/scripts/should-not-read.js`, 'NEVER RETURN');
 await put(`${root}/skills/unused/SKILL.md`, 'Manifest replacement means not selected');
 const report = await sourcesReport(cursor(), { home });
 assert.equal(by(report)['cursor.plugin-manifests'].count, 1); assert.equal(by(report)['cursor.plugin-instructions'].count, 4);
 const manifest = await readSource(cursor(), 'cursor.plugin-manifests', { home });
 assert.match(manifest.text, /printf not-executed/); assert.doesNotMatch(manifest.text, /NEVER RETURN|mcpServers|variables/);
 const registry = await readSource(cursor(), 'cursor.plugin-registry', { home });
 assert.equal(registry.rows[0].scope, 'user-local');
 assert.match(by(report)['cursor.plugin-activation'].catalog.what, /listEnabledPlugins/);
});

test('Cursor plugin roots, escaped manifest paths, symlinked files and unselected cache versions stay unreadable', async t => {
 const { home, put, cursor } = await setup(t);
 const inside = '.claude/plugins/cache/fixture/good/1';
 await put(`${inside}/.claude-plugin/plugin.json`, JSON.stringify({ skills: ['skills', '../../outside'], rules: '../other/rules', hooks: '../../secret.json' }));
 await put(`${inside}/skills/good/SKILL.md`, 'Allowed skill');
 const secret = await put('private/SKILL.md', 'NEVER RETURN');
 await mkdir(join(home, inside, 'skills/bad'), { recursive: true });
 await symlink(secret, join(home, inside, 'skills/bad/SKILL.md'));
 await put('.claude/plugins/cache/fixture/outside/SKILL.md', 'NEVER RETURN');
 await put('.claude/plugins/cache/fixture/good/2/skills/new/SKILL.md', 'Unselected version');
 await put('.claude/plugins/installed_plugins.json', JSON.stringify({ plugins: {
  'good@fixture': [{ scope: 'user', installPath: join(home, inside) }],
  'escape@fixture': [{ scope: 'user', installPath: join(home, 'private') }],
 } }));
 await put('.claude/settings.json', JSON.stringify({ enabledPlugins: { 'good@fixture': true, 'escape@fixture': true } }));
 const report = await sourcesReport(cursor(), { home }); assert.equal(by(report)['cursor.plugin-instructions'].count, 1);
 const skill = await readSource(cursor(), 'cursor.plugin-instructions', { home }); assert.equal(skill.text, 'Allowed skill');
 const denied = await readSource(cursor(), 'cursor.plugin-instructions', { home, part: secret }); assert.equal(denied.kind, 'note');
 const registry = await readSource(cursor(), 'cursor.plugin-registry', { home }); assert.ok(registry.rows.some(row => row.status === 'Custom location')); assert.ok(registry.rows.some(row => /unsafe/.test(row.status)));
 // A symlinked manifest invalidates discovery rather than falling back to default directories.
 await rm(join(home, inside, '.claude-plugin/plugin.json'));
 await symlink(secret, join(home, inside, '.claude-plugin/plugin.json'));
 assert.equal(by(await sourcesReport(cursor(), { home }))['cursor.plugin-instructions'].count, 0);
});

test('Cursor metadata-only manifest preserves later component discovery without overriding richer metadata precedence', async t => {
 const { home, put, cursor } = await setup(t);
 const root = '.cursor/plugins/local/metadata-fallback';
 await put(`${root}/.cursor-plugin/plugin.json`, JSON.stringify({ name: 'fixture', version: '1.2.3' }));
 await put(`${root}/.claude-plugin/plugin.json`, JSON.stringify({ skills: ['custom-skills'] }));
 await put(`${root}/custom-skills/review/SKILL.md`, 'Recovered custom skill');
 await put(`${root}/skills/default/SKILL.md`, 'Must not replace explicit skill paths');
 let report = await sourcesReport(cursor(), { home });
 assert.equal(by(report)['cursor.plugin-instructions'].count, 1);
 assert.equal(by(report)['cursor.plugin-manifests'].count, 2);
 assert.equal((await readSource(cursor(), 'cursor.plugin-instructions', { home })).text, 'Recovered custom skill');
 const first = await readSource(cursor(), 'cursor.plugin-manifests', { home, part: `~/${root}/.cursor-plugin/plugin.json` });
 assert.match(first.text, /1\.2\.3/);
 // Bc stops at rich metadata even without component fields; defaults then apply.
 await put(`${root}/.cursor-plugin/plugin.json`, JSON.stringify({ name: 'fixture', version: '1.2.3', description: 'Stops manifest search' }));
 report = await sourcesReport(cursor(), { home });
 assert.equal(by(report)['cursor.plugin-manifests'].count, 1);
 assert.equal((await readSource(cursor(), 'cursor.plugin-instructions', { home })).text, 'Must not replace explicit skill paths');
 // Our stricter invalid-manifest boundary remains closed instead of falling through.
 await put(`${root}/.cursor-plugin/plugin.json`, '{invalid');
 report = await sourcesReport(cursor(), { home });
 assert.equal(by(report)['cursor.plugin-instructions'].count, 0);
});
