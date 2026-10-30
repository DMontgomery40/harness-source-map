// Re-locate previously published complete strings without inventing a new classifier verdict.
export function publicationContinuity(previous, candidates) {
  const byText = new Map();
  for (const candidate of candidates) {
    const matches = byText.get(candidate.text) ?? [];
    matches.push(candidate);
    byText.set(candidate.text, matches);
  }
  return previous.items.map(item => ({
    item,
    source_version: previous.version,
    matches: byText.get(item.text) ?? [],
    status: byText.has(item.text) ? 'exact-text-relocated' : 'changed-or-absent'
  }));
}
