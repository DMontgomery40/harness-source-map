// OpenAI-compatible chat completions as actually captured: OpenRouter and
// direct Alibaba/Qwen, DeepSeek and Moonshot/Kimi. Bodies remain in the store;
// this summary keeps field names/counts and routing metadata, never prompt text.
import { bodyText, jsonOr, parseSSE, header } from './har.js';

const number = value => Number.isFinite(value) ? value : null;
const text = value => typeof value === 'string' ? value : '';
const readableText = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(p => text(p?.text)).join('') : '';
const chars = value => readableText(value).length;
const fields = ['reasoning', 'reasoning_content', 'reasoning_text'];

// One walk of the observed fields serves the summary and the separate reader.
// Structured text arrays keep their text parts in order; opaque data contributes
// its size and type only, never a made-up readable representation.
function* observedReasoning(message) {
  for (const field of fields) if (typeof message[field] === 'string' || Array.isArray(message[field])) {
    const value = readableText(message[field]);
    yield { field, type: 'text', chars: value.length, text: value, encrypted: false, format: null, index: null };
  }
  for (const detail of Array.isArray(message.reasoning_details) ? message.reasoning_details : []) {
    const encrypted = detail.type === 'reasoning.encrypted';
    const value = encrypted ? '' : readableText(detail.text || detail.summary);
    yield { field: 'reasoning_details', type: String(detail.type || 'unknown'),
      chars: encrypted ? text(detail.data).length : value.length, text: value,
      encrypted, format: detail.format || null, index: number(detail.index) };
  }
}

function chunks(entry) {
  const raw = bodyText(entry, 'response') || '';
  const streamed = /event-stream/i.test(entry.response?.content?.mimeType || header(entry.response?.headers, 'content-type') || '') || /^\s*(?:data|event):/m.test(raw.slice(0, 200));
  if (!streamed) return { stream: false, raw, events: [], values: [jsonOr(raw)].filter(Boolean), done: !!jsonOr(raw) };
  const events = parseSSE(raw);
  return { stream: true, raw, events, values: events.flatMap(e => e.json ? [e.json] : []), done: events.some(e => e.data.trim() === '[DONE]') };
}

export function chatCompletionsCall(entry, info, R, product) {
  const request = jsonOr(bodyText(entry, 'request'), {}) || {};
  const messages = Array.isArray(request.messages) ? request.messages : [];
  const parts = chunks(entry), reasoning = new Map(), content = new Map(), tools = new Map();
  const response = { complete: false, partial: false, id: null, model: null, provider: null, usage: null,
    finish: [], content: [], reasoning: [], toolCalls: [], error: null, events: parts.events.length };
  const providers = new Set(), finish = new Map();
  for (const value of parts.values) {
    if (value.id) response.id = R.str(String(value.id));
    if (value.model) response.model = R.str(String(value.model));
    if (typeof value.provider === 'string') providers.add(R.str(value.provider));
    if (value.usage) response.usage = R.json(value.usage);
    if (value.error) response.error = R.json({ type: value.error.type ?? null, code: value.error.code ?? null });
    for (const choice of value.choices || []) {
      const index = number(choice.index) ?? 0, message = choice.delta || choice.message || {};
      if (choice.finish_reason != null) finish.set(index, R.str(String(choice.finish_reason)));
      content.set(index, (content.get(index) || 0) + chars(message.content));
      for (const observed of observedReasoning(message)) {
        const { field, encrypted, format, index: ri } = observed, kind = R.str(observed.type);
        const key = `${index}:${field}:${kind}:${ri ?? ''}`;
        const item = reasoning.get(key) || { choice: index, field, type: kind, chars: 0, encrypted, format: format ? R.str(String(format)) : null, index: ri };
        item.chars += observed.chars; reasoning.set(key, item);
      }
      for (const tool of Array.isArray(message.tool_calls) ? message.tool_calls : []) {
        const key = `${index}:${tool.index ?? tool.id ?? tools.size}`;
        const item = tools.get(key) || { choice: index, id: null, name: null, argumentsChars: 0 };
        if (tool.id) item.id = R.str(String(tool.id));
        if (tool.function?.name) item.name = R.str(String(tool.function.name));
        item.argumentsChars += chars(tool.function?.arguments);
        tools.set(key, item);
      }
    }
  }
  response.provider = [...providers][0] || null;
  response.content = [...content].map(([choice, chars]) => ({ choice, chars }));
  response.reasoning = [...reasoning.values()];
  response.toolCalls = [...tools.values()];
  response.finish = [...finish].map(([choice, reason]) => ({ choice, reason }));
  response.complete = !info.partial && (parts.stream ? parts.done : info.status >= 200 && info.status < 300 && response.finish.length > 0);
  response.partial = info.partial || (parts.stream && (!parts.done || parts.events.some(e => e.partial && e.data.trim() !== '[DONE]')));
  const roles = {};
  for (const m of messages) roles[m.role || '?'] = (roles[m.role || '?'] || 0) + 1;
  const gateway = info.host === 'openrouter.ai';
  const model = typeof request.model === 'string' ? R.str(request.model) : null;
  return { product, protocol: 'chat-completions', transport: 'http', entry: info.i, t: info.t, status: info.status,
    kind: 'main', requestClass: 'chat completion', model,
    requestId: response.id || header(entry.response?.headers, 'x-request-id') || null,
    sessionId: header(entry.request?.headers, 'x-opencode-session-id') || null,
    association: info.association || 'unattributed',
    routing: { destination: info.host, gateway, modelNamespace: gateway && model?.includes('/') ? model.split('/')[0] : null,
      reportedProvider: response.provider, reportedProviders: [...providers], preferences: request.provider ? R.json(request.provider) : null,
      requestedModels: Array.isArray(request.models) ? R.json(request.models) : null, route: request.route ? R.str(String(request.route)) : null },
    system: messages.flatMap((m, i) => ['system', 'developer'].includes(m.role) ? [{ i, role: m.role, chars: chars(m.content) }] : []),
    messages: { count: messages.length, roles, parts: messages.map((m, i) => ({ i, role: m.role || '?', chars: chars(m.content),
      toolCalls: Array.isArray(m.tool_calls) ? m.tool_calls.length : 0,
      reasoning: [...observedReasoning(m)].filter(r => r.field !== 'reasoning_details').map(({ field, chars }) => ({ field, chars })),
      reasoningDetails: Array.isArray(m.reasoning_details) ? m.reasoning_details.length : 0 })) },
    tools: (Array.isArray(request.tools) ? request.tools : []).map(t => ({ name: R.str(String(t.function?.name || t.name || t.type || 'tool')),
      type: t.type || null, chars: JSON.stringify(t).length, descriptionChars: chars(t.function?.description), parameters: !!t.function?.parameters })),
    params: R.json(Object.fromEntries(['stream', 'reasoning', 'reasoning_effort', 'thinking', 'enable_thinking', 'include_reasoning', 'temperature', 'top_p', 'max_tokens', 'max_completion_tokens', 'tool_choice', 'response_format'].filter(key => key in request).map(key => [key, request[key]]))),
    response, usage: response.usage, betas: [], timings: info.timings, reqBytes: info.reqBytes, resBytes: info.resBytes, matched: [] };
}

// Readable reasoning stays available through the same lazy body reader. Preserve
// each received field; overlapping provider representations are not deduplicated
// into invented text. Opaque/encrypted data gets only its observed type and size.
export function chatReasoningText(entry, R) {
  const out = new Map();
  const append = (label, fragment) => out.set(label, (out.get(label) || '') + fragment);
  for (const value of chunks(entry).values) for (const choice of value.choices || []) {
    const message = choice.delta || choice.message || {};
    for (const observed of observedReasoning(message)) {
      const field = observed.field === 'reasoning_details' ? `${observed.field}: ${R.str(observed.type)}` : observed.field;
      const label = `${field} [choice ${choice.index ?? 0}${observed.index != null ? `, index ${observed.index}` : ''}]`;
      if (observed.encrypted) append(label, `[opaque data: ${observed.chars} characters; no readable reasoning]\n`);
      else if (observed.text) append(label, observed.text);
    }
  }
  return [...out].map(([label, value]) => `${label}\n${R.str(value)}`).join('\n\n');
}
