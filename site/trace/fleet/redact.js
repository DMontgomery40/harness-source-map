// What a T3 family's text goes through before the page shows it (fleet/load.js, worker.js): nothing. A family's
// trace, progress text, search snippets and reader text are exactly what its bundle recorded, credentials included
// (network/redact.js says why). Sources are never changed, so byte offsets hold. The interface stays for its
// callers: str and trace return what they are given, hits keeps every hit.
export function familyRedactor() {
  return {
    str: s => s,
    trace: t => t,
    hits: hits => hits,
  };
}
