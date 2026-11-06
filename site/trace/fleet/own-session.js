// The files of one family agent's own native session, inside the bundle the family came from: the binding the agent
// was drawn from (a continuation opens its own later session, not its thread's first), read from exactly the members
// the bundle's manifest selected (fleet/bundle.js; a stale twin of a member is never among them). Pure.
// Returns { files, nativeId, product } or null.
export function ownSessionFiles(trace, agent, files) {
  if (!trace?.family || !files || !agent?.threadKey) return null;
  const th = trace.fleet?.threads?.find(t => t.key === agent.threadKey);
  if (!th) return null;
  const native = th.natives?.find(n => n.nativeId === agent.session && (!agent.nativeProduct || n.product === agent.nativeProduct))
    || (!agent.continuation && agent.session === th.native?.nativeId ? th.native : null);
  if (!native) return null;
  const dir = `machines/${th.environmentId}/agent-sessions/`, own = String(native.path || "").replace(/\.gz$/, ""), stem = own.replace(/\.jsonl$/, "");
  const allowed = new Set(trace.fleet.sessionMembers?.[th.environmentId] || []);
  const out = files.filter(f => {
    const i = f.path.lastIndexOf(dir);
    if (i < 0) return false;
    const rel = f.path.slice(i);
    if (!allowed.has(rel)) return false;
    const p = rel.slice(dir.length).replace(/\.gz$/, "");
    return native.product === "codex" ? /\/rollout-[^/]+\.jsonl$/.test(`/${p}`) : p === own || p.startsWith(`${stem}/`);
  });
  return out.length ? { files: out, nativeId: native.nativeId, product: native.product } : null;
}
