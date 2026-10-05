// Native `opencode export` JSON, release v1.18.34. The exported parts are logged
// evidence; request assembly may transform or omit them before a provider call.
import { newAgent, addBlock, partText, finalizeAgent, classifyCommand, RANK } from '../model.js';

const decoder = new TextDecoder();
const finite = value => Number.isFinite(value) ? value : 0;

export function isOpenCodeExport(value) {
  return !!(value && typeof value.info?.id === 'string' && value.info.id.startsWith('ses') &&
    Array.isArray(value.messages) && value.messages.every(m => m && ['user', 'assistant'].includes(m.info?.role) && Array.isArray(m.parts)));
}

// A byte scanner keeps refs tied to the original UTF-8, including pretty printed
// exports. Re-serializing a parsed object would change both offsets and spelling.
function spans(bytes) {
  const ws = i => { while ([9, 10, 13, 32].includes(bytes[i])) i++; return i; };
  const end = start => {
    let string = false, escaped = false, depth = 0;
    for (let i = start; i < bytes.length; i++) {
      const c = bytes[i];
      if (string) { if (escaped) escaped = false; else if (c === 92) escaped = true; else if (c === 34) { string = false; if (!depth) return i + 1; } continue; }
      if (c === 34) string = true;
      else if (c === 123 || c === 91) depth++;
      else if (c === 125 || c === 93) { if (!depth) return i; if (!--depth) return i + 1; }
      else if (!depth && (c === 44 || [9, 10, 13, 32].includes(c))) return i;
    }
    return bytes.length;
  };
  let array = null;
  for (let i = ws(0) + 1; i < bytes.length;) {
    i = ws(i); if (bytes[i] === 125) break;
    const keyEnd = end(i), key = JSON.parse(decoder.decode(bytes.subarray(i, keyEnd)));
    const start = ws(ws(keyEnd) + 1), valueEnd = end(start);
    if (key === 'messages') { array = start; break; }
    i = ws(valueEnd) + 1;
  }
  const out = [];
  if (array == null || bytes[array] !== 91) return out;
  for (let i = ws(array + 1); i < bytes.length && bytes[i] !== 93;) {
    const stop = end(i); out.push({ offset: i, length: stop - i });
    i = ws(stop); if (bytes[i] === 44) i = ws(i + 1); else break;
  }
  return out;
}

function tokens(u = {}) {
  // session/session.ts getUsage stores uncached input and final-text output
  // separately from cache and reasoning. These are logged counts, not estimates.
  const input = finite(u.input), read = finite(u.cache?.read), write = finite(u.cache?.write);
  const output = finite(u.output), reasoning = finite(u.reasoning);
  return { context: input + read + write, cacheRead: read, cacheWrite: write, uncached: input,
    output: output + reasoning, reasoning, fresh: input + write + output + reasoning };
}

function actionFor(part, ref, result) {
  const name = part.tool;
  let cls = 'read', kind = 'tool';
  if (name === 'bash') cls = classifyCommand(part.state?.input?.command || '');
  else if (['edit', 'write', 'apply_patch', 'multiedit'].includes(name)) cls = 'write';
  else if (['webfetch', 'websearch', 'codesearch'].includes(name)) cls = 'outward';
  else if (['task', 'todowrite', 'todoread', 'question', 'skill', 'plan_enter', 'plan_exit'].includes(name)) cls = 'internal';
  return { kind, tool: name, class: cls, target: null, args: ref, result, callId: part.callID || null };
}

export async function parseOpenCodeExport(source, fileIndex, { onProgress = () => {}, index = null } = {}) {
  const bytes = await source.slice(0, source.size);
  let native;
  try { native = JSON.parse(decoder.decode(bytes)); } catch { throw new Error('The OpenCode export is incomplete or invalid JSON. Export it again after the session settles.'); }
  if (!isOpenCodeExport(native)) throw new Error('That JSON is not a native OpenCode session export.');
  const info = native.info;
  const agent = newAgent({ id: info.id, parentId: info.parentID || null, file: fileIndex, harnessSource: 'residual', name: 'root' }, index);
  const messageSpans = spans(bytes);
  const notes = [];
  let latestUser = null, lastTime = finite(info.time?.created), pending = [], reasoning = null, contextEnd = -1, stepTime = lastTime;
  const finish = (message, usage, reason, complete = true) => {
    const best = pending.reduce((a, b) => !a || RANK[b.class] > RANK[a.class] ? b : a, null);
    const req = { i: agent.requests.length, t: stepTime, model: message.modelID || null,
      provider: message.providerID || null, tokens: tokens(usage), window: [0, contextEnd], strata: null,
      action: best ? { ...best, ...(pending.length > 1 ? { all: pending.slice() } : {}) } : null,
      reasoning, messageId: message.id, parentMessageId: message.parentID || latestUser,
      finish: reason || null, complete, evidence: 'exported step', contextEvidence: 'logged history; exact request unavailable' };
    agent.requests.push(req); pending = []; reasoning = null;
    contextEnd = agent.blocks.length - 1; stepTime = lastTime;
  };
  native.messages.forEach((message, mi) => {
    const m = message.info, span = messageSpans[mi];
    if (!span) throw new Error('The OpenCode export has unreadable message boundaries.');
    const ref = path => ({ file: fileIndex, ...span, path });
    const created = finite(m.time?.created);
    lastTime = Math.max(lastTime, created, finite(m.time?.completed));
    if (m.role === 'user') {
      latestUser = m.id;
      if (m.system) addBlock(agent, { t: created, kind: 'harness', label: 'system override (exported)', text: m.system, ref: ref(['info', 'system']) });
    } else { stepTime = created; contextEnd = agent.blocks.length - 1; }
    let finished = 0;
    message.parts.forEach((part, pi) => {
      const path = ['parts', pi], t = finite(part.time?.start) || created;
      lastTime = Math.max(lastTime, t, finite(part.time?.end));
      const add = (kind, label, value, field) => addBlock(agent, { t, kind, label, text: partText(value), ref: ref([...path, ...field]) });
      if (part.type === 'text') {
        const b = add(m.summary ? 'summary' : m.role === 'assistant' ? 'model' : part.synthetic ? 'injected' : 'you',
          m.summary ? 'compaction summary' : m.role === 'assistant' ? 'assistant' : part.synthetic ? 'harness-added text (exported)' : 'user', part.text, ['text']);
        if (part.ignored) b.ignored = true;
        if (m.role === 'user' && !part.synthetic) agent.asks.push({ t, block: b.i });
      } else if (part.type === 'reasoning') {
        const b = add('model', part.text ? 'reasoning' : 'reasoning (no readable text)', part.text || '', ['text']);
        b.reasoning = true; b.complete = part.time?.end != null;
        reasoning = { encrypted: false, readable: !!part.text, block: b.i };
      } else if (part.type === 'tool') {
        const b = add('model', `${part.tool} call`, part.state?.input || {}, ['state', 'input']);
        let result = null;
        if (part.state?.status === 'completed') result = add('outside', `${part.tool} result`, part.state.output, ['state', 'output']).ref;
        else if (part.state?.status === 'error') result = add('outside', `${part.tool} error`, part.state.error, ['state', 'error']).ref;
        pending.push(actionFor(part, b.ref, result));
        if (part.state?.status === 'pending' || part.state?.status === 'running') notes.push('A tool call was still in progress when the session was exported.');
      } else if (part.type === 'file') {
        if (part.source?.text?.value) add('you', 'file source text (exported)', part.source.text.value, ['source', 'text', 'value']);
        else add('you', 'file attachment (exported)', part.url, ['url']);
      } else if (part.type === 'subtask') add('agents', 'subtask prompt (exported)', part.prompt, ['prompt']);
      else if (part.type === 'compaction') agent.compactions.push({ t, pre: null, post: null, trigger: part.auto ? 'auto' : 'manual', block: null });
      else if (part.type === 'step-start') { contextEnd = agent.blocks.length - 1; stepTime = t; }
      else if (part.type === 'step-finish') { finish(m, part.tokens, part.reason); finished++; }
      else if (part.type === 'retry') notes.push('The export records a retried provider request. Its exact failed payload is available only with a capture.');
    });
    if (m.role === 'assistant' && !finished) finish(m, m.tokens, m.finish, m.time?.completed != null && !m.error);
    if (m.error) notes.push(`An assistant message ended with ${m.error.name || 'an error'}; inspect the export or capture for details.`);
    onProgress(span.offset + span.length, bytes.length);
  });
  agent.model = agent.requests.find(r => r.model)?.model || null;
  finalizeAgent(agent);
  onProgress(bytes.length, bytes.length);
  return { agent, meta: { id: info.id, parentID: info.parentID || null, version: info.version || null, title: typeof info.title === 'string' ? info.title : null },
    firstT: finite(info.time?.created), lastT: lastTime, bytesRead: bytes.length, notes };
}

export function buildOpenCodeTrace(sessions, files) {
  const byId = new Map(sessions.map(s => [s.meta.id, s]));
  const root = sessions.find(s => !s.meta.parentID || !byId.has(s.meta.parentID)) || sessions[0];
  const depth = (s, seen = new Set()) => { if (s === root || seen.has(s)) return 0; seen.add(s); const parent = byId.get(s.meta.parentID); return parent ? depth(parent, seen) + 1 : 1; };
  for (const s of sessions) { s.agent.kind = s === root ? 'root' : 'subagent'; s.agent.name = s === root ? 'root' : 'subagent'; s.agent.depth = depth(s); }
  return { product: 'opencode', title: root.meta.title || 'OpenCode session', version: root.meta.version, contextWindow: null,
    started: Math.min(...sessions.map(s => s.firstT)), ended: Math.max(...sessions.map(s => s.lastT)),
    agents: [root, ...sessions.filter(s => s !== root)].map(s => s.agent), files,
    notes: ['Native export parts are logged evidence, not an exact request payload. System prompt assembly, tool schemas and provider transformations require a network capture.',
      'Landscape context windows summarize logged history. They do not establish that every exported part was sent to a provider.', ...sessions.flatMap(s => s.notes)] };
}
