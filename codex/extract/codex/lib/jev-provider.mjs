import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { privacyScan } from './privacy.mjs';

// The one Jev helper for every script in this repo: provider choice, the pinned model, retries,
// and verdict caches tagged with the model version that produced them.

// Bump JEV_VERSION with the pinned models; cached verdicts from another version are not reused.
export const JEV_VERSION = 'jev-1.13';
const DIRECT = { provider: 'TypeSafe', id: 'typesafe', endpoint: 'https://api.typesafe.ai/v1/systemone', model: 'jev-1.13.0', keyName: 'TYPESAFE_API_KEY', servedModel: /^jev-1\.13\.0(?:-|$)/ };
const ROUTER = { provider: 'OpenRouter', id: 'openrouter', endpoint: 'https://openrouter.ai/api/v1/systemone', model: 'typesafe/jev-1.13', keyName: 'OPENROUTER_API_KEY', servedModel: /^typesafe\/jev-1\.13(?:-|$)/ };
const PROVIDERS = Symbol('jev providers');
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

const cacheVersion = provider => `${JEV_VERSION}@${provider.id}/${provider.model}`;
const publicProvider = provider => ({ provider:provider.provider, endpoint:provider.endpoint, model:provider.model, configured:Boolean(provider.key) });
const selectProvider = (config, provider) => {
  Object.assign(config, { provider:provider.provider, endpoint:provider.endpoint, model:provider.model, key:provider.key, servedModel:provider.servedModel, cacheVersion:cacheVersion(provider) });
};

// Read credentials as data; never source the environment file or expose its contents.
// Automatic mode tries TypeSafe direct first, then the separately authorized OpenRouter route.
// Explicit JEV_PROVIDER values stay single-provider so operators can require one destination.
export function decisionConfig(env = process.env, read = () => fs.readFileSync(path.join(os.homedir(), '.env'), 'utf8')) {
  let text = '';
  try { text = read(); } catch { /* Environment variables can supply credentials. */ }
  const value = name => env[name] || text.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*["']?([^"'\\s]+)`, 'm'))?.[1];
  const direct = value('TYPESAFE_API_KEY');
  const router = value('OPENROUTER_API_KEY');
  if (env.JEV_PROVIDER && !['typesafe','openrouter'].includes(env.JEV_PROVIDER)) throw new JevRequestError(`Unknown JEV_PROVIDER ${env.JEV_PROVIDER}`);
  const available = [{...DIRECT,key:direct},{...ROUTER,key:router}];
  const providers = env.JEV_PROVIDER === 'typesafe' ? available.slice(0,1) : env.JEV_PROVIDER === 'openrouter' ? available.slice(1) : available;
  const initial = providers.find(provider => provider.key) ?? providers[0];
  const config = { version:JEV_VERSION, mode:env.JEV_PROVIDER ?? 'auto', providerChain:providers.map(publicProvider) };
  Object.defineProperty(config, PROVIDERS, { value:providers });
  selectProvider(config,initial);
  return config;
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504, 529]);
export const JEV_FALLBACK_HTTP_STATUSES = Object.freeze([401, 402, 403]);
const UNAVAILABLE = new Set(JEV_FALLBACK_HTTP_STATUSES);

export const isFallbackEligible = error => error instanceof JevUnavailableError;
export const servedModelMatches = (config, model) => typeof model === 'string' && config.servedModel.test(model);
const sleepMs = ms => new Promise(resolve => setTimeout(resolve, ms));

// Asks Jev `questions` about `state` and returns the parsed response ({ model, answers, usage }).
// Retries rate limits, server errors, timeouts and network failures with backoff; then throws
// JevUnavailableError. A malformed request throws JevRequestError.
export async function ask(config, { state, questions }, { fetchImpl = globalThis.fetch, attempts = 4, timeoutMs = 60_000, baseDelayMs = 1000, sleep = sleepMs } = {}) {
  const requestedModel=String(config?.model??'');
  const exactServedModel=new RegExp(`^${requestedModel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:-|$)`);
  const providers = config?.[PROVIDERS] ?? [{
    provider:config?.provider,
    id:config?.provider === 'OpenRouter' ? 'openrouter' : 'typesafe',
    endpoint:config?.endpoint,
    model:config?.model,
    key:config?.key,
    keyName:config?.provider === 'OpenRouter' ? 'OPENROUTER_API_KEY' : 'TYPESAFE_API_KEY',
    servedModel:config?.servedModel ?? exactServedModel
  }];
  // Build and scan every possible outbound body before the first request. A failover changes only
  // the pinned provider model; the already scanned state and questions are reused byte-for-byte.
  const requests = providers.map(provider => ({provider, body:JSON.stringify({model:provider.model,state,questions})}));
  privacyScan(new Map(requests.map(({provider,body})=>[`Jev request (${provider.provider})`,body])));
  const unavailable=[];
  for (const request of requests) {
    const {provider,body}=request;
    if (!provider.key) {unavailable.push(`no ${provider.keyName}`);continue;}
    try {
      const result=await askProvider(provider,body,questions,{fetchImpl,attempts,timeoutMs,baseDelayMs,sleep});
      selectProvider(config,provider);
      return {...result,jev_provider:provider.provider,requested_model:provider.model,served_model:result.model};
    } catch(error) {
      if (!isFallbackEligible(error) || requests.length===1) throw error;
      unavailable.push(error.reason);
    }
  }
  throw new JevUnavailableError(unavailable.join('; '));
}

async function askProvider(config, body, questions, { fetchImpl, attempts, timeoutMs, baseDelayMs, sleep }) {
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
    try { result = await response.json(); } catch { throw new JevAnswerShapeError(`${config.provider} returned invalid JSON`); }
    if (!result?.answers || typeof result.answers !== 'object') throw new JevAnswerShapeError(`${config.provider} answer without answers`);
    if (result.model !== undefined && !servedModelMatches(config,result.model)) throw new JevAnswerShapeError(`${config.provider} served unexpected model ${JSON.stringify(result.model)}`);
    for (const id of Object.keys(questions)) if (!(id in result.answers)) throw new JevAnswerShapeError(`${config.provider} answer is missing question ${id}`);
    return result;
  }
  throw new JevUnavailableError(`${reason} after ${attempts} attempts`);
}

// A verdict cache file whose keys carry the provider and pinned model as well as the Jev version.
// Passing the shared config makes the namespace follow the provider that actually answered: ask()
// updates config only after a valid response, so a direct outage cannot overwrite a direct verdict
// with the OpenRouter result. Old provider-blind entries remain preserved but are not reused by a
// provider-aware cache because their origin cannot be recovered safely.
export function openCache(file, { version = JEV_VERSION, config } = {}) {
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { raw = {}; }
  const entries = {};
  for (const [key, value] of Object.entries(raw)) entries[key.startsWith('jev-') ? key : `${LEGACY_VERSION}:${key}`] = value;
  const currentVersion = () => config?.cacheVersion ?? version;
  const full = key => `${currentVersion()}:${key}`;
  return {
    get version() { return currentVersion(); },
    has: key => full(key) in entries,
    get: key => entries[full(key)],
    set(key, value) { entries[full(key)] = value; return value; },
    get size() { return Object.keys(entries).length; },
    save() { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(entries)); }
  };
}
