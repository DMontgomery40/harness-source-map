// net.ndjson and spans.idx.json, derived from a bundle's redacted span archives (Contract A v2). Nothing here reads
// T3's home: it reads machines/<id>/spans.ndjson[.gz] and peer-links.json and writes rows of these types:
//   meta       the edge kinds, this machine's coverage parts and peer links
//   peer-call  an HTTP span on a peer link, caller (client) or receiver (server), with Host and user agent
//   join       a caller span on this machine and its receiving span on another, (traceId, parentSpanId -> spanId),
//              with the clock offset bounds [s1 - c1, s0 - c0] (receiver minus caller, ms)
//   miss       a caller span with no receiving span, and whether it falls inside the receiver's coverage
//   wait       a forwarded-wait chunk (PeerMcpClient.call under PeerForwarding.waitForThread), with the thread and
//              command ids found in its OrchestratorMcpService.delegateTask subtree
//   bin        per minute and edge kind: spans and errors
import {fileBuffer, bufferLines} from './gz.mjs';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

// The seven edge kinds (design §7). `internal` is server work with no edge; `local` a probe of a local port that is
// not a peer link (port discovery, device hub); `external` an HTTP call to a host none of the kinds names.
export const EDGE_KINDS = ['client-server', 'peer-link', 't3-cloud', 'server-agent', 'agent-mcp', 'agent-model', 'server-provider'];
export const ROLES = [...EDGE_KINDS, 'internal', 'local', 'external'];

// Span names (no HTTP attributes) -> kind. Ordered; the first match wins. Names come from the pinned source
// (tools/t3/span-names.json); library spans (sqlite, sql.transaction) are internal.
const NAME_RULES = [
 ['peer-link', /^(?:Peer[A-Za-z]*|RemoteDelegation|RemoteOpenTargets|environmentHttpAuth|clientRuntime|ConnectionDriver|EnvironmentSupervisor|SshDeviceHost|SshPasswordPrompt|discoverDesktopSshHosts)(?:\.|$)|^orchestrationV2\.dispatch\.(?:remote|delegated)|^OrchestratorMcpService\.(?:readRemoteTask|awaitRemote)|^project\.fetchLiveOrchestrationSnapshot$/],
 ['t3-cloud', /^(?:AnalyticsService|Relay[A-Za-z]*|RelayEnvironmentDiscovery|ManagedRelayClient|managedRelay[A-Za-z]*|ManagedTunnelRecovery|CloudManagedEndpointRuntime|CloudPreferences|ConnectReachability|linkEnvironment|cloudflared|cloud|connection|GitHub[A-Za-z]*|gitHub[A-Za-z]*|GitLab[A-Za-z]*|gitLab[A-Za-z]*|Bitbucket[A-Za-z]*|AzureDevOps[A-Za-z]*|Forgejo[A-Za-z]*|GitCafe[A-Za-z]*|ServerUpdate|ServerSelfUpdate|DesktopUpdates|DesktopRemoteUpdates|DesktopAppUpdate|desktopUpdate|ElectronUpdater|NativeTelemetryClient|TelemetryIdentity|AttachmentUpload|GuestShareService|TransferBudget|ScheduledTaskService\.(?:dispatch|acceptImmediateWebhook|acceptWebhook|getWebhook|releaseWebhook)[A-Za-z]*)(?:\.|$)|^environment\.cloud\.|^desktop\.clerk\.|^Clerk|^cli\.connect\./],
 ['server-agent', /^(?:CodexAppServerProtocol|CodexAppServerClient|AcpClient|AcpAgent|effect-acp\/[A-Za-z]+|AcpMcpStdioBridge|AcpMcpOverAcpBridge|mcpOverAcpBridge|AcpSessionRuntime|AcpRuntimeModel|AcpRegistryProbe|AcpRegistryRuntimeCoordinator|PiRpc|OpenCode2Client|OpenCode2Server|ClaudeAgentSdkQueryRunner|ProviderSessionManager|ProviderSessionManagerV2|ProviderTurnControlService|ProviderTurnStartService)(?:\.|$)|^museLaunch$|^probeCodexAppServerProvider$/],
 ['agent-mcp', /^(?:McpHttpServer|McpServer|McpSessionRegistry|McpOAuth|McpAppRequests|McpToolAccess|McpAppModelContext|McpAppSnapshot|McpProviderSessions|OrchestratorMcpService|ThreadMetadataMcpService|WorktreeMcpService|PullRequestsToolkit|mcp)(?:\.|$)|^McpServer\./],
 ['server-provider', /^(?:[A-Za-z]+ProviderStatus|[A-Za-z]*UsageProbe|CursorAccountUsage|CursorUsageAccounts|ProviderLatestVersions|ManagedServerProvider|UsageLimitSources|ProviderAuthService|ProviderAuthFlow|providerAuthFlow|ProviderMaintenanceRunner|ProviderInstallation|AcpRegistryCatalog|AcpRegistryAuth|CliproxyApi)(?:\.|$)|^(?:fetchNpmLatestVersion|resolveLatestProviderVersion|invalidateLatestProviderVersion|readCursorAccountUsage|readCursorUsageLimits|readOpenCodeGoUsageLimits|check[A-Za-z]+ProviderStatus|checkAntigravityProvider)$/],
 ['client-server', /^(?:ws|EnvironmentRpc|RpcServer|RpcSessionFactory|SessionStore|EnvironmentAuth|EnvironmentCommands|http|environment|dpop|DeviceHubProxy|PreviewAutomationBroker|web)(?:\.|$)|^server\.(?!startup)|^handleStaticAndDevRequest$/],
];
export function classifyName(name) {
 for (const [kind, re] of NAME_RULES) if (re.test(name || '')) return kind;
 return 'internal';
}

const LOOPBACK = /^(?:127\.\d+\.\d+\.\d+|localhost|::1|\[::1\])$/i;
const T3_CLOUD_HOST = /(?:^|\.)(?:t3\.codes|t3coderelay\.com|t3\.gg|clerk\.[a-z.]+|clerk\.com|clerk\.accounts\.dev|github\.com|githubusercontent\.com|gitlab\.com|bitbucket\.org|dev\.azure\.com|cloudflare\.com|trycloudflare\.com)$/i;
const PROVIDER_HOST = /(?:^|\.)(?:anthropic\.com|claude\.ai|claude\.com|openai\.com|chatgpt\.com|googleapis\.com|google\.com|grok\.com|x\.ai|meta\.ai|npmjs\.org|npmjs\.com|cursor\.com|cursor\.sh|openrouter\.ai|opencode\.ai|antigravity\.google|githubcopilot\.com)$/i;
const PEER_PATH = /^\/(?:mcp|\.well-known\/t3\/environment|api\/orchestration\/)/;

// One span's role. ctx.peerHosts: Set of "host:port" from this machine's peer links (and relay hosts that are).
export function classifySpan(s, ctx = {}) {
 const a = s.attributes || {};
 const method = a['http.request.method'];
 const host = a['server.address'], port = a['server.port'];
 if (method && s.kind === 'client' && host) {
  const hp = `${host}:${port ?? ''}`;
  if (ctx.peerHosts?.has(hp)) return 'peer-link';
  if (LOOPBACK.test(host)) return port && ctx.ownPort && Number(port) === Number(ctx.ownPort) ? 'client-server' : 'local';
  if (/t3coderelay\.com$/i.test(host) && PEER_PATH.test(a['url.path'] || '')) return 'peer-link';
  if (T3_CLOUD_HOST.test(host)) return 't3-cloud';
  if (PROVIDER_HOST.test(host)) return 'server-provider';
  return 'external';
 }
 if (method && s.kind === 'server') {
  const ua = a['user_agent.original'] || '';
  if (ua === 'node') return 'peer-link';
  if ((a['url.path'] || a['http.route'] || '').startsWith('/mcp')) return 'agent-mcp';
  return 'client-server';
 }
 return classifyName(s.name);
}

const nanos = v => {try {return BigInt(v);} catch {return null;}};
const msOf = v => {const n = nanos(v); return n === null ? null : Number(n / 1000n) / 1000;};
const isError = s => (s.exit && s.exit._tag && s.exit._tag !== 'Success') || Number(s.attributes?.['http.response.status_code']) >= 400;
const iso = ms => new Date(ms).toISOString();

// A machine's spans, light: what the derivations need, plus each span's byte range in the decompressed archive.
export function readSpans(dir) {
 const file = ['spans.ndjson.gz', 'spans.ndjson'].map(f => join(dir, f)).find(existsSync);
 if (!file) return {spans: [], index: {}};
 const spans = [], index = {};
 let offset = 0;
 for (const line of bufferLines(fileBuffer(file))) {
  const bytes = Buffer.byteLength(line, 'utf8') + 1;
  if (line) {
   let s; try {s = JSON.parse(line);} catch {s = null;}
   if (s?.spanId) {
    index[s.spanId] = [offset, offset + bytes - 1];
    const a = s.attributes || {};
    spans.push({name: s.name, kind: s.kind, traceId: s.traceId, spanId: s.spanId, parentSpanId: s.parentSpanId || null, start: msOf(s.startTimeUnixNano), end: msOf(s.endTimeUnixNano), durationMs: s.durationMs ?? null, error: !!isError(s),
     attributes: a['http.request.method'] || a['orchestration_v2.thread_id'] || a['orchestration_v2.command_id'] ? a : undefined});
   }
  }
  offset += bytes;
 }
 return {spans, index};
}

const readJson = f => {try {return JSON.parse(readFileSync(f, 'utf8'));} catch {return null;}};
function peerLinks(dir) {
 const rows = readJson(join(dir, 'peer-links.json')) || [];
 const hosts = new Map();
 for (const r of rows) for (const u of Array.isArray(r.urls_json) ? r.urls_json : []) {
  try {const url = new URL(u); hosts.set(`${url.hostname}:${url.port || (url.protocol === 'https:' ? 443 : 80)}`, {environmentId: r.environment_id, label: r.label, access: r.access, fenced: !!r.fenced});} catch {}
 }
 return {rows, hosts};
}

const WAIT_CHAIN = ['PeerForwarding.forward', 'PeerForwarding.waitForThread', 'RemoteDelegation.followOnce', 'RemoteDelegation.delegate', 'OrchestratorMcpService.delegateTask'];

// Derive every collected machine's rows. machines: [{environmentId, label, dir, parts, ownPort}]. Returns
// Map environmentId -> {rows, index}.
export function deriveNet(machines) {
 const loaded = machines.map(m => ({...m, ...readSpans(m.dir), links: peerLinks(m.dir)}));
 // Receiving spans everywhere, by the caller span id they name.
 const receivers = new Map();
 for (const m of loaded) for (const s of m.spans) if (s.kind === 'server' && s.parentSpanId && s.attributes?.['http.request.method']) {
  const list = receivers.get(s.parentSpanId) || [];
  list.push({m, s}); receivers.set(s.parentSpanId, list);
 }
 const coverage = new Map(machines.map(m => [m.environmentId, (m.parts || []).map(p => p.window).filter(w => w?.since && w?.until).map(w => [Date.parse(w.since), Date.parse(w.until)])]));
 const covered = (env, t) => (coverage.get(env) || []).some(([a, b]) => t >= a && t <= b);
 const out = new Map();
 for (const m of loaded) {
  const rows = [];
  const peerHosts = new Set(m.links.hosts.keys());
  const ctx = {peerHosts, ownPort: m.ownPort};
  const byId = new Map(m.spans.map(s => [s.spanId, s]));
  const children = new Map();
  for (const s of m.spans) if (s.parentSpanId) {const l = children.get(s.parentSpanId) || []; l.push(s); children.set(s.parentSpanId, l);}
  rows.push({type: 'meta', environmentId: m.environmentId, label: m.label || null, kinds: EDGE_KINDS, roles: ROLES, parts: m.parts || [], peerLinks: m.links.rows.map(r => ({environmentId: r.environment_id, label: r.label, urls: r.urls_json, access: r.access, fenced: !!r.fenced})), spans: m.spans.length});
  const bins = new Map();
  for (const s of m.spans) {
   const role = classifySpan(s, ctx);
   if (EDGE_KINDS.includes(role) && s.start !== null) {
    const minute = iso(Math.floor(s.start / 60000) * 60000);
    const k = `${minute} ${role}`;
    const b = bins.get(k) || {type: 'bin', minute, kind: role, count: 0, errors: 0};
    b.count++; if (s.error) b.errors++;
    bins.set(k, b);
   }
   if (role !== 'peer-link' || !s.attributes?.['http.request.method']) continue;
   const a = s.attributes;
   const host = `${a['server.address']}:${a['server.port'] ?? ''}`;
   const call = {type: 'peer-call', role: s.kind === 'server' ? 'receiver' : 'caller', traceId: s.traceId, spanId: s.spanId, parentSpanId: s.parentSpanId, name: s.name, method: a['http.request.method'], path: a['url.path'] || a['http.route'] || null,
    host, userAgent: a['user_agent.original'] || null, clientAddress: a['client.address'] || null, status: a['http.response.status_code'] ?? null, error: s.error, start: s.start, end: s.end, durationMs: s.durationMs};
   if (call.role === 'caller') call.to = m.links.hosts.get(host)?.environmentId || null;
   rows.push(call);
   if (call.role !== 'caller') continue;
   const recv = (receivers.get(s.spanId) || []).find(r => r.s.traceId === s.traceId && r.m.environmentId !== m.environmentId);
   if (recv) {
    const r = recv.s, ra = r.attributes || {};
    rows.push({type: 'join', traceId: s.traceId, caller: {environmentId: m.environmentId, spanId: s.spanId, start: s.start, end: s.end}, receiver: {environmentId: recv.m.environmentId, spanId: r.spanId, start: r.start, end: r.end},
     host: `${ra['server.address']}:${ra['server.port'] ?? ''}`, userAgent: ra['user_agent.original'] || null, path: call.path, offsetMs: {lo: r.end - s.end, hi: r.start - s.start}});
   } else {
    const to = call.to;
    rows.push({type: 'miss', traceId: s.traceId, caller: {environmentId: m.environmentId, spanId: s.spanId, start: s.start, end: s.end}, to, toCollected: !!to && coverage.has(to), inReceiverCoverage: !!to && covered(to, s.start) && covered(to, s.end ?? s.start)});
   }
  }
  // Forwarded waits.
  for (const s of m.spans) {
   if (s.name !== 'PeerMcpClient.call') continue;
   const chain = [];
   let p = byId.get(s.parentSpanId), guard = 0, task = null;
   while (p && guard++ < 32) {chain.push(p.name); if (p.name === 'OrchestratorMcpService.delegateTask') {task = p; break;} p = byId.get(p.parentSpanId);}
   const isWait = chain.includes('PeerForwarding.waitForThread') || (!task && (s.durationMs ?? 0) >= 40000);
   if (!isWait) continue;
   const post = (children.get(s.spanId) || []).find(c => c.kind === 'client' && c.attributes?.['url.path'] === '/mcp');
   const host = post ? `${post.attributes['server.address']}:${post.attributes['server.port'] ?? ''}` : null;
   const threadIds = new Set(), commandIds = new Set();
   if (task) {
    const stack = [task.spanId];
    let n = 0;
    while (stack.length && n++ < 200000) for (const c of children.get(stack.pop()) || []) {
     const ca = c.attributes || {};
     if (ca['orchestration_v2.thread_id']) threadIds.add(ca['orchestration_v2.thread_id']);
     if (ca['orchestration_v2.command_id']) commandIds.add(ca['orchestration_v2.command_id']);
     stack.push(c.spanId);
    }
   }
   const recv = post ? (receivers.get(post.spanId) || []).find(r => r.s.traceId === post.traceId) : null;
   rows.push({type: 'wait', traceId: s.traceId, spanId: s.spanId, postSpanId: post?.spanId || null, start: s.start, end: s.end, durationMs: s.durationMs, error: s.error,
    host, to: host ? m.links.hosts.get(host)?.environmentId || null : null, receiver: recv ? {environmentId: recv.m.environmentId, spanId: recv.s.spanId} : null,
    chain, chainComplete: WAIT_CHAIN.every(n => chain.includes(n)), delegateTaskSpanId: task?.spanId || null, threadIds: [...threadIds], commandIds: [...commandIds]});
  }
  rows.push(...[...bins.values()].sort((x, y) => x.minute < y.minute ? -1 : x.minute > y.minute ? 1 : x.kind < y.kind ? -1 : 1));
  out.set(m.environmentId, {rows, index: m.index});
 }
 return out;
}
