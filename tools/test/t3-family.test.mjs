// Ephemeral SQLite schema regressions, not fabricated conversations or recorded session fixtures.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {openReadOnly} from '../t3/sqlite.mjs';
import {resolveFamily, familyRows} from '../t3/family.mjs';
import {createdThreadHops} from '../t3/collect.mjs';

const T = 'orchestration_v2_projection_threads', C = 'orchestration_v2_projection_turn_items';
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
async function database(t, {creations = true} = {}) {
 const dir = mkdtempSync(join(tmpdir(), 't3-family-schema-')), file = join(dir, 'state.sqlite');
 t.after(() => rmSync(dir, {recursive: true, force: true}));
 const sql = text => execFileSync('sqlite3', [file, text]);
 sql(`CREATE TABLE ${T} (thread_id TEXT PRIMARY KEY, project_id TEXT, title TEXT, created_at TEXT, payload_json TEXT);
 CREATE TABLE orchestration_v2_projection_subagents (subagent_id TEXT, thread_id TEXT, run_id TEXT, parent_node_id TEXT, child_thread_id TEXT, completion_delivery_state TEXT, payload_json TEXT);
 ${creations ? `CREATE TABLE ${C} (turn_item_id TEXT PRIMARY KEY, thread_id TEXT, run_id TEXT, node_id TEXT, type TEXT, status TEXT, updated_at TEXT, payload_json TEXT);` : ''}`);
 const thread = (id, extra = {}) => sql(`INSERT INTO ${T} VALUES (${quote(id)}, 'project', 'title', '2000-01-01T00:00:00Z', ${quote(JSON.stringify({lineage: {parentThreadId: null, rootThreadId: id}, ...extra}))})`);
 const item = (id, parent, child, extra = {}, type = 'thread_created') => sql(`INSERT INTO ${C} VALUES (${quote(id)}, ${quote(parent)}, 'parent-run', 'parent-node', ${quote(type)}, 'completed', '2000-01-01T00:00:01Z', ${quote(JSON.stringify({id, threadId: parent, type, targetThreadId: child, targetRunId: 'target-run', targetProviderInstanceId: 'provider', targetModel: 'model', startedAt: '2000-01-01T00:00:01Z', ...extra}))})`);
 const db = await openReadOnly(file);
 t.after(() => db.close());
 return {db, thread, item};
}

test('recorded thread creation joins an ordinary child and its descendants from either end', async t => {
 const {db, thread, item} = await database(t);
 for (const id of ['parent', 'child', 'grandchild', 'unrelated']) thread(id);
 item('creation-one', 'parent', 'child'); item('creation-two', 'child', 'grandchild');
 item('unrelated-tool', 'parent', 'unrelated', {}, 'tool');
 for (const seed of ['parent', 'child', 'grandchild']) {
  const family = resolveFamily(db, [seed], {environmentId: 'local'});
  assert.deepEqual(family.familyMetadata, {version: 1, threadCreations: 'available'});
  assert.deepEqual(family.threadIds.sort(), ['child', 'grandchild', 'parent']);
  assert.deepEqual(family.createdThreads.map(r => [r.fromThreadId, r.threadId]).sort(), [['child', 'grandchild'], ['parent', 'child']]);
 }
});

test('creation metadata is allowlisted and a missing target remains an explicit gap', async t => {
 const {db, thread, item} = await database(t);
 thread('parent'); item('creation', 'parent', 'missing-child', {text: 'must not be copied', unexpected: {prompt: 'must not be copied'}});
 const family = resolveFamily(db, ['parent'], {environmentId: 'local'});
 assert.deepEqual(family.missing, ['missing-child']);
 assert.equal(family.createdThreads[0].threadId, 'missing-child');
 const rows = familyRows(db, family.threadIds);
 assert.equal(rows.threadCreations[0].payload_json.targetThreadId, 'missing-child');
 assert.equal(rows.threadCreations[0].payload_json.targetModel, 'model');
 assert.ok(!JSON.stringify(rows.threadCreations).includes('must not be copied'));
 const [hop] = createdThreadHops(family, 'local', 'Local', rows, {string: value => value});
 assert.equal(hop.kind, 'launch');
 assert.deepEqual(hop.from, {environmentId: 'local', threadId: 'parent', nodeId: 'parent-node'});
 assert.deepEqual(hop.to, {environmentId: 'local', threadId: 'missing-child', label: 'Local', runId: 'target-run'});
 assert.equal(hop.provider, 'provider');
 assert.deepEqual(hop.join, {by: 'turn-item', table: 'orchestration_v2_projection_turn_items', turnItemId: 'creation'});
});

test('older schemas without turn items still resolve local lineage', async t => {
 const {db, thread} = await database(t, {creations: false});
 thread('parent'); thread('child', {lineage: {parentThreadId: 'parent', rootThreadId: 'parent'}});
 const family = resolveFamily(db, ['child'], {environmentId: 'local'});
 assert.deepEqual(family.threadIds.sort(), ['child', 'parent']);
 assert.deepEqual(family.createdThreads, []);
 assert.deepEqual(family.familyMetadata, {version: 1, threadCreations: 'unavailable'});
 assert.deepEqual(familyRows(db, family.threadIds).threadCreations, []);
});

test('local and explicitly qualified remote seeds do not join a colliding parent ID', async t => {
 const {db, thread} = await database(t);
 thread('same-parent');
 thread('local-child', {delegatedFrom: {environmentId: 'local', threadId: 'same-parent'}});
 thread('remote-child', {delegatedFrom: {environmentId: 'remote', threadId: 'same-parent'}});
 thread('other-child', {delegatedFrom: {environmentId: 'other', threadId: 'same-parent'}});
 assert.deepEqual(resolveFamily(db, ['same-parent'], {environmentId: 'local'}).threadIds.sort(), ['local-child', 'same-parent']);
 assert.deepEqual(resolveFamily(db, [], {environmentId: 'local', upstreamThreads: [{environmentId: 'remote', threadId: 'same-parent'}]}).threadIds, ['remote-child']);
});

test('legacy unqualified upstream seeds require one parent environment and report ambiguity', async t => {
 const {db, thread} = await database(t);
 thread('child-a', {delegatedFrom: {environmentId: 'remote-a', threadId: 'upstream'}});
 thread('child-b', {delegatedFrom: {environmentId: 'remote-b', threadId: 'upstream'}});
 thread('unique-child', {delegatedFrom: {environmentId: 'remote-c', threadId: 'unique-upstream'}});
 const family = resolveFamily(db, ['upstream', 'unique-upstream'], {environmentId: 'local'});
 assert.deepEqual(family.threadIds, ['unique-child']);
 assert.deepEqual(family.ambiguousUpstream, [{threadId: 'upstream', environmentIds: ['remote-a', 'remote-b']}]);
});
