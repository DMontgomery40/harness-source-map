import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { privacyScan } from './privacy.mjs';

// The one Jev helper for every script in this repo: provider choice, the pinned model, retries,
// and verdict caches tagged with the model version that produced them.

// Bump JEV_VERSION with the pinned models; cached verdicts from another version are not reused.
export const JEV_VERSION = 'jev-1.13';
const DIRECT = { provider: 'TypeSafe', endpoint: 'https://api.typesafe.ai/v1/systemone', model: 'jev-1.13.0' };
const ROUTER = { provider: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/systemone', model: 'typesafe/jev-1.13' };
// Every cache written before pinning came from jev-1.13.0 (the classify caches record it per entry).
const LEGACY_VERSION = 'jev-1.13';
// Exit code a script uses when Jev is unavailable, so callers can retry later instead of failing.
export const JEV_TEMPFAIL_EXIT = 75;

// Jev could not answer: no key, rejected credentials, rate limit, server or network failure.
// Callers decide whether that blocks, skips, or retries later.
export class JevUnavailableError extends Error {
  constructor(reason) { super(`Jev unavailable: ${reason}`); this.name = 'JevUnavailableError'; this.reason = reason; }
}
// The request itself was wrong (a bug here, not an outage).
export class JevRequestError extends Error {
  constructor(message) { super(message); this.name = 'JevRequestError'; }
}
export class JevAnswerShapeError extends JevRequestError {
  constructor(message) { super(message); this.name = 'JevAnswerShapeError'; }
}

// Read credentials as data; never source the environment file or expose its contents.
// TypeSafe direct is the default; OpenRouter when JEV_PROVIDER=openrouter or no TypeSafe key exists.
export function decisionConfig(env = process.env, read = () => fs.readFileSync(path.join(os.homedir(), '.env'), 'utf8')) {
  let text = '';
  try { text = read(); } catch { /* Environment variables can supply credentials. */ }
  const value = name => env[name] || text.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*["']?([^"'\\s]+)`, 'm'))?.[1];
  const direct = value('TYPESAFE_API_KEY');
  const router = value('OPENROUTER_API_KEY');
  const useRouter = env.JEV_PROVIDER === 'openrouter' || (env.JEV_PROVIDER !== 'typesafe' && !direct && Boolean(router));
  return useRouter ? { ...ROUTER, key: router, version: JEV_VERSION } : { ...DIRECT, key: direct, version: JEV_VERSION };
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504, 529]);
const UNAVAILABLE = new Set([401, 402, 403]);
const sleepMs = ms => new Promise(resolve => setTimeout(resolve, ms));

// Asks Jev `questions` about `state` and returns the parsed response ({ model, answers, usage }).
// Retries rate limits, server errors, timeouts and network failures with backoff; then throws
// JevUnavailableError. A malformed request throws JevRequestError.
export async function ask(config, { state, questions }, { fetchImpl = globalThis.fetch, attempts = 4, timeoutMs = 60_000, baseDelayMs = 1000, sleep = sleepMs } = {}) {
  if (!config?.key) throw new JevUnavailableError(`no ${config?.provider === 'OpenRouter' ? 'OPENROUTER_API_KEY' : 'TYPESAFE_API_KEY'}`);
  const body = JSON.stringify({ model: config.model, state, questions });
  // Every Jev caller, including Claude Code's older classifiers, crosses this same outbound
  // boundary. Scan precisely the bytes sent; a caller's earlier filter is defense in depth.
  privacyScan(new Map([['Jev request',body]]));
  let reason = 'no attempt made', retryAfterMs = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt) await sleep(retryAfterMs ?? baseDelayMs * 2 ** (attempt - 1));
    retryAfterMs = null;
    let response;
    try {
      response = await fetchImpl(config.endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${config.key}`, 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (error) {
      reason = `${config.provider} request failed: ${error.name === 'TimeoutError' ? 'timed out' : error.message}`;
      continue;
    }
    if (RETRYABLE.has(response.status)) {
      const seconds = Number(response.headers?.get?.('retry-after'));
      if (Number.isFinite(seconds) && seconds > 0) retryAfterMs = Math.min(seconds, 60) * 1000;
      reason = `${config.provider} ${response.status}`;
      continue;
    }
    if (UNAVAILABLE.has(response.status)) throw new JevUnavailableError(`${config.provider} ${response.status}`);
    if (!response.ok) throw new JevRequestError(`${config.provider} ${response.status}: ${(await response.text().catch(() => '')).slice(0, 300)}`);
    let result;
    try { result = await response.json(); } catch { reason = `${config.provider} returned invalid JSON`; continue; }
    if (!result?.answers || typeof result.answers !== 'object') { reason = `${config.provider} answer without answers`; continue; }
    for (const id of Object.keys(questions)) if (!(id in result.answers)) throw new JevAnswerShapeError(`${config.provider} answer is missing question ${id}`);
    return result;
  }
  throw new JevUnavailableError(`${reason} after ${attempts} attempts`);
}

// A verdict cache file whose keys carry the model version: `<version>:<key>`. Entries written
// before pinning (no version prefix) were all produced by LEGACY_VERSION and are read as such, so
// pinning re-sends nothing. Saving rewrites every key with its prefix.
export function openCache(file, { version = JEV_VERSION } = {}) {
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { raw = {}; }
  const entries = {};
  for (const [key, value] of Object.entries(raw)) entries[key.startsWith('jev-') ? key : `${LEGACY_VERSION}:${key}`] = value;
  const full = key => `${version}:${key}`;
  return {
    version,
    has: key => full(key) in entries,
    get: key => entries[full(key)],
    set(key, value) { entries[full(key)] = value; return value; },
    get size() { return Object.keys(entries).length; },
    save() { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(entries)); }
  };
}
