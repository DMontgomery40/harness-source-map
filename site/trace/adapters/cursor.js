// Cursor Agent CLI stream-json and the exact JSON-message projection exported
// from a real Cursor desktop v1 chat store. Stored text remains behind source
// references; opaque desktop blobs are never decoded or represented as events.
import { newAgent, addBlock, finalizeAgent, classifyCommand, partText, RANK } from '../model.js';

const decoder = new TextDecoder();
const finite = value => Number.isFinite(value) ? value : 0;
const zeroTokens = () => ({ context: 0, cacheRead: 0, cacheWrite: 0, uncached: 0, output: 0, reasoning: 0, fresh: 0 });
const tokens = value => {
  const input = finite(value?.inputTokens), read = finite(value?.cacheReadTokens), write = finite(value?.cacheWriteTokens), output = finite(value?.outputTokens);
  return { context: input + read + write, cacheRead: read, cacheWrite: write, uncached: input, output, reasoning: 0, fresh: input + write + output };
};

export function isCursorAgentRow(value) {
  return !!(value && value.type === 'system' && value.subtype === 'init' && typeof value.session_id === 'string' &&
    typeof value.model === 'string' && typeof value.cwd === 'string');
}

export function isCursorDesktopExport(value) {
  return !!(value && value.version === 1 && value.product === 'cursor' && value.surface === 'desktop' && typeof value.info?.id === 'string' && (
    (value.format === 'trace-cursor-desktop-export' && Array.isArray(value.messages)) ||
    (value.format === 'trace-cursor-desktop-transcript-export' && Array.isArray(value.rows))));
}

function lines(bytes) {
  const out = [];
  for (let offset = 0; offset < bytes.length;) {
    let end = bytes.indexOf(10, offset);
    if (end < 0) end = bytes.length;
    let length = end - offset;
    if (length && bytes[offset + length - 1] === 13) length--;
    if (length) out.push({ offset, length, text: decoder.decode(bytes.subarray(offset, offset + length)) });
    offset = end + 1;
  }
  return out;
}

function callShape(toolCall = {}) {
  const hit = Object.entries(toolCall).find(([name, value]) => /ToolCall$/.test(name) && value && typeof value === 'object');
  if (!hit) return { key: null, name: 'tool', value: toolCall };
  const name = hit[0].replace(/ToolCall$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replaceAll(' ', '_');
  return { key: hit[0], name, value: hit[1] };
}

function actionClass(name, args = {}) {
  if (/(?:write|edit|patch|delete|rename)/i.test(name)) return 'write';
  if (/(?:shell|terminal|command|exec|run)/i.test(name)) return classifyCommand(args.command || args.cmd || '');
  if (/(?:web|http|browser|fetch)/i.test(name)) return 'outward';
  if (/(?:read|search|grep|glob|list|codebase|file)/i.test(name)) return 'read';
  return 'internal';
}

const headline = actions => actions.reduce((best, action) => !best || RANK[action.class] > RANK[best.class] ? action : best, null);
const actionGroup = actions => {
  const best = headline(actions);
  return best ? { ...best, ...(actions.length > 1 ? { all: actions } : {}) } : null;
};

export async function parseCursorAgentStream(source, fileIndex, { onProgress = () => {}, index = null } = {}) {
  const bytes = await source.slice(0, source.size);
  const records = lines(bytes).map(span => {
    try { return { ...span, row: JSON.parse(span.text) }; } catch { throw new Error('The Cursor Agent stream has an incomplete or invalid JSON event.'); }
  });
  if (!records.length || !isCursorAgentRow(records[0].row)) throw new Error('That JSONL is not Cursor Agent stream-json output.');
  const init = records[0].row, id = init.session_id;
  if (!records.every(record => record.row?.session_id === id)) throw new Error('The Cursor Agent stream contains more than one exact session id.');
  const agent = newAgent({ id, file: fileIndex, harnessSource: 'residual', name: 'root', model: init.model }, index);
  const notes = [];
  const actions = new Map(), orderedActions = [], reasoning = [];
  const ref = (record, path) => ({ file: fileIndex, offset: record.offset, length: record.length, path });
  const add = (record, kind, label, value, path) => addBlock(agent, { t: finite(record.row.timestamp_ms), kind, label, text: partText(value), ref: ref(record, path) });

  const resultIndex = records.findLastIndex(record => record.row.type === 'result');
  let suffixStart = resultIndex;
  while (suffixStart > 0 && records[suffixStart - 1].row.type === 'assistant') suffixStart--;
  const resultText = resultIndex >= 0 && typeof records[resultIndex].row.result === 'string' ? records[resultIndex].row.result : null;
  const suffixText = records.slice(suffixStart, resultIndex).flatMap(record => record.row.message?.content || []).map(part => part.text || '').join('');
  const resultCoversSuffix = resultText != null && resultText === suffixText;

  for (let i = 0; i < records.length; i++) {
    const record = records[i], row = record.row;
    if (row.type === 'user') {
      for (let ci = 0; ci < (row.message?.content || []).length; ci++) {
        const part = row.message.content[ci];
        if (part.type !== 'text' || typeof part.text !== 'string') continue;
        const block = add(record, 'you', 'user', part.text, ['message', 'content', ci, 'text']);
        agent.asks.push({ t: finite(row.timestamp_ms), block: block.i, from: 'human' });
      }
    } else if (row.type === 'thinking' && row.subtype === 'delta' && typeof row.text === 'string') {
      const block = add(record, 'model', 'reasoning', row.text, ['text']);
      block.reasoning = true; block.complete = false; reasoning.push(block.i);
    } else if (row.type === 'thinking' && row.subtype === 'completed') {
      const block = reasoning.length ? agent.blocks[reasoning.at(-1)] : null;
      if (block) block.complete = true;
    } else if (row.type === 'tool_call') {
      const shape = callShape(row.tool_call), id_ = row.call_id || shape.value?.toolCallId;
      if (row.subtype === 'started') {
        const path = shape.key ? ['tool_call', shape.key, 'args'] : ['tool_call'];
        const args = shape.key ? shape.value.args : row.tool_call;
        const block = add(record, 'model', `${shape.name} call`, args, path);
        const action = { kind: 'tool', tool: shape.name, class: actionClass(shape.name, args), target: null, args: block.ref, result: null,
          callId: id_ || null, modelCallId: row.model_call_id || null };
        orderedActions.push(action); if (id_) actions.set(id_, action);
      } else if (row.subtype === 'completed') {
        const action = id_ ? actions.get(id_) : null;
        const value = shape.key ? shape.value.result : row.tool_call;
        const path = shape.key ? ['tool_call', shape.key, 'result'] : ['tool_call'];
        const block = add(record, 'outside', `${shape.name} result`, value, path);
        if (action) action.result = block.ref;
        else notes.push('A completed tool event had no matching exact call ID in the stream.');
      }
    } else if (row.type === 'assistant' && !(resultCoversSuffix && i >= suffixStart && i < resultIndex)) {
      for (let ci = 0; ci < (row.message?.content || []).length; ci++) {
        const part = row.message.content[ci];
        if (part.type === 'text' && typeof part.text === 'string') add(record, 'model', 'assistant delta', part.text, ['message', 'content', ci, 'text']);
      }
    } else if (row.type === 'result' && typeof row.result === 'string') {
      add(record, 'model', row.subtype === 'success' ? 'assistant result' : 'assistant error', row.result, ['result']);
    }
    onProgress(record.offset + record.length, bytes.length);
  }

  const last = records.at(-1), result = records.findLast(record => record.row.type === 'result');
  const usage = result?.row.usage;
  const request = {
    i: 0, t: finite(init.timestamp_ms) || finite(records.find(record => record.row.timestamp_ms)?.row.timestamp_ms), model: init.model,
    provider: 'cursor', tokens: usage ? tokens(usage) : zeroTokens(), window: [0, agent.blocks.length - 1], strata: null,
    action: actionGroup(orderedActions), reasoning: reasoning.length ? { encrypted: false, readable: true, blocks: reasoning.slice(), block: reasoning.at(-1) } : null,
    requestId: result?.row.request_id || null, finish: result?.row.subtype || null,
    complete: result?.row.subtype === 'success' && result?.row.is_error !== true,
    evidence: 'Cursor Agent stream-json events', contextEvidence: 'streamed events; exact provider request unavailable without a network capture',
  };
  agent.requests.push(request);
  finalizeAgent(agent);
  return { agent, meta: { id, model: init.model, surface: 'agent-cli' }, firstT: finite(init.timestamp_ms), lastT: finite(last?.row.timestamp_ms),
    bytesRead: bytes.length, notes };
}

export async function parseCursorDesktopExport(source, fileIndex, { onProgress = () => {}, index = null } = {}) {
  const bytes = await source.slice(0, source.size);
  let native;
  try { native = JSON.parse(decoder.decode(bytes)); } catch { throw new Error('The Cursor desktop export is incomplete or invalid JSON.'); }
  if (!isCursorDesktopExport(native)) throw new Error('That JSON is not a Cursor desktop session export.');
  if (native.format === 'trace-cursor-desktop-transcript-export')
    return parseCursorDesktopTranscript(native, bytes, fileIndex, { onProgress, index });
  const info = native.info, agent = newAgent({ id: info.id, file: fileIndex, harnessSource: 'logged', name: 'root' }, index);
  const span = { file: fileIndex, offset: 0, length: bytes.length };
  const notes = [], pending = new Map();
  const created = finite(info.createdAtMs), updated = finite(info.updatedAtMs) || created;
  let model = null;
  const ref = path => ({ ...span, path });
  const add = (kind, label, value, path, t = created) => addBlock(agent, { t, kind, label, text: partText(value), ref: ref(path) });

  for (let mi = 0; mi < native.messages.length; mi++) {
    const message = native.messages[mi]?.value, base = ['messages', mi, 'value'];
    if (!message || typeof message.role !== 'string') { notes.push('A JSON blob without a native message role was skipped.'); continue; }
    const content = message.content;
    if (message.role === 'system' && typeof content === 'string') add('harness', 'system prompt (desktop store)', content, [...base, 'content']);
    else if (message.role === 'user') {
      if (typeof content === 'string') {
        const block = add('you', 'user', content, [...base, 'content']); agent.asks.push({ t: created, block: block.i, from: 'human' });
      } else for (let ci = 0; ci < (content || []).length; ci++) if (content[ci]?.type === 'text' && typeof content[ci].text === 'string') {
        const block = add('you', 'user', content[ci].text, [...base, 'content', ci, 'text']); agent.asks.push({ t: created, block: block.i, from: 'human' });
      }
    } else if (message.role === 'tool' && Array.isArray(content)) {
      for (let ci = 0; ci < content.length; ci++) {
        const part = content[ci]; if (part?.type !== 'tool-result') continue;
        const block = add('outside', `${part.toolName || 'tool'} result`, part.result, [...base, 'content', ci, 'result']);
        const action = typeof part.toolCallId === 'string' ? pending.get(part.toolCallId) : null;
        if (action) action.result = block.ref; else notes.push('A desktop tool result had no matching exact toolCallId.');
      }
    } else if (message.role === 'assistant' && Array.isArray(content)) {
      const actions = [], reasonings = [];
      const contextEnd = agent.blocks.length - 1;
      for (let ci = 0; ci < content.length; ci++) {
        const part = content[ci], partBase = [...base, 'content', ci];
        if (part?.type === 'reasoning' && typeof part.text === 'string') {
          const block = add('model', 'reasoning', part.text, [...partBase, 'text'], updated); block.reasoning = true; block.complete = true; reasonings.push(block.i);
        } else if (part?.type === 'text' && typeof part.text === 'string') {
          add('model', 'assistant', part.text, [...partBase, 'text'], updated);
          if (typeof part.providerOptions?.cursor?.modelName === 'string') model ||= part.providerOptions.cursor.modelName;
        } else if (part?.type === 'tool-call') {
          const block = add('model', `${part.toolName || 'tool'} call`, part.args, [...partBase, 'args'], updated);
          const action = { kind: 'tool', tool: part.toolName || 'tool', class: actionClass(part.toolName || 'tool', part.args), target: null,
            args: block.ref, result: null, callId: part.toolCallId || null };
          actions.push(action); if (action.callId) pending.set(action.callId, action);
        }
      }
      const cursor = message.providerOptions?.cursor || {};
      model ||= cursor.systemPromptFingerprint?.model || null;
      agent.requests.push({ i: agent.requests.length, t: updated, model, provider: 'cursor', tokens: zeroTokens(), window: [0, contextEnd], strata: null,
        action: actionGroup(actions), reasoning: reasonings.length ? { encrypted: false, readable: true, blocks: reasonings, block: reasonings.at(-1) } : null,
        requestId: cursor.requestId || null, messageId: message.id || cursor.modelProviderMessageId || null, finish: null, complete: true,
        evidence: 'Cursor desktop native JSON message blob', contextEvidence: 'persisted conversation; exact provider request unavailable without a network capture' });
    }
  }
  agent.model = model;
  finalizeAgent(agent);
  onProgress(bytes.length, bytes.length);
  if (info.opaqueBlobs) notes.push(`${info.opaqueBlobs} opaque native store blobs were counted by the exporter and not decoded or represented as messages.`);
  notes.push(`Legacy SQLite chat-store adapter first observed in Cursor ${info.persistenceObservedIn || '3.17.8'}${info.desktopVersion ? `; artifact labeled ${info.desktopVersion}` : '; exact artifact version was not supplied'}.`);
  return { agent, meta: { id: info.id, surface: 'desktop', version: info.desktopVersion || null }, firstT: created, lastT: updated, bytesRead: bytes.length, notes };
}

function parseCursorDesktopTranscript(native, bytes, fileIndex, { onProgress, index }) {
  const info = native.info, agent = newAgent({ id: info.id, file: fileIndex, harnessSource: 'logged', name: 'root' }, index);
  const span = { file: fileIndex, offset: 0, length: bytes.length };
  const notes = [
    'Current Cursor desktop agent transcript adapter. Native row order is used because timestamps are not persisted in this format.',
    'The native transcript does not persist request IDs, model identity, reasoning events, tool call IDs, or tool results; Trace leaves those fields empty.',
  ];
  const ref = path => ({ ...span, path });
  const add = (t, kind, label, value, path) => addBlock(agent, { t, kind, label, text: partText(value), ref: ref(path) });
  let requestStart = 0, actions = [], sawAssistant = false;
  const finishRequest = (t, finish, complete) => {
    if (!sawAssistant) return;
    agent.requests.push({
      i: agent.requests.length, t, model: null, provider: 'cursor', tokens: zeroTokens(), window: [0, requestStart - 1], strata: null,
      action: actionGroup(actions), reasoning: null, requestId: null, messageId: null, finish: typeof finish === 'string' ? finish : null,
      complete, evidence: 'Cursor desktop native agent transcript turn',
      contextEvidence: 'persisted transcript rows; exact provider request unavailable without an associated network capture',
    });
    actions = []; sawAssistant = false; requestStart = agent.blocks.length;
  };

  for (let ri = 0; ri < native.rows.length; ri++) {
    const row = native.rows[ri]?.value, base = ['rows', ri, 'value'];
    if (!row || (typeof row.role !== 'string' && row.type !== 'turn_ended')) { notes.push('An unrecognized transcript row was skipped.'); continue; }
    if (row.role === 'user') {
      finishRequest(ri, null, false);
      const content = row.message?.content;
      if (typeof content === 'string') {
        const block = add(ri, 'you', 'user', content, [...base, 'message', 'content']);
        agent.asks.push({ t: ri, block: block.i, from: 'human' });
      } else for (let ci = 0; ci < (content || []).length; ci++) {
        const part = content[ci];
        if (part?.type === 'text' && typeof part.text === 'string') {
          const block = add(ri, 'you', 'user', part.text, [...base, 'message', 'content', ci, 'text']);
          agent.asks.push({ t: ri, block: block.i, from: 'human' });
        }
      }
      requestStart = agent.blocks.length;
    } else if (row.role === 'assistant') {
      sawAssistant = true;
      const content = row.message?.content;
      if (typeof content === 'string') add(ri, 'model', 'assistant', content, [...base, 'message', 'content']);
      else for (let ci = 0; ci < (content || []).length; ci++) {
        const part = content[ci], partBase = [...base, 'message', 'content', ci];
        if (part?.type === 'text' && typeof part.text === 'string') add(ri, 'model', 'assistant', part.text, [...partBase, 'text']);
        else if (part?.type === 'tool_use' && typeof part.name === 'string') {
          const block = add(ri, 'model', `${part.name} call`, part.input, [...partBase, 'input']);
          actions.push({ kind: 'tool', tool: part.name, class: actionClass(part.name, part.input), target: null,
            args: block.ref, result: null, callId: null, modelCallId: null });
        }
      }
    } else if (row.type === 'turn_ended') finishRequest(ri, row.status, row.status === 'success');
    onProgress(Math.round(bytes.length * (ri + 1) / native.rows.length), bytes.length);
  }
  finishRequest(native.rows.length, null, false);
  finalizeAgent(agent);
  onProgress(bytes.length, bytes.length);
  return { agent, meta: { id: info.id, surface: 'desktop', version: info.desktopVersion || null }, firstT: 0,
    lastT: Math.max(0, native.rows.length - 1), bytesRead: bytes.length, notes };
}

export function buildCursorTrace(sessions, files) {
  const session = sessions[0];
  return { product: 'cursor', surface: session.meta.surface, title: session.meta.surface === 'desktop' ? 'Cursor desktop session' : 'Cursor Agent CLI session',
    version: session.meta.version || null, contextWindow: null, started: session.firstT, ended: session.lastT,
    agents: sessions.map(item => item.agent), files,
    notes: ['Cursor session artifacts are persisted or streamed evidence. Exact provider payloads and Cursor-mediated downstream routing require a network capture.', ...sessions.flatMap(item => item.notes)] };
}
