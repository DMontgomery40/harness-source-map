import { readFileSync } from 'node:fs';
import { SECTIONS } from '../shared/sections.mjs';
const catalog = JSON.parse(readFileSync(new URL('../../../t3code/outputs/library-catalog.json', import.meta.url), 'utf8'));
const document = (id, title, options = {}) => ({ path: `outputs/${id}.md`, slug: id, anchor: id, navKey: id, format: 'markdown', title, defaultOpen: true, outlineDepth: 3, records: false, ...options });
const pages = [
  { section: 'Overview', page: document('key-findings', 'What T3 Code adds') },
  ...catalog.libraries.filter(library => library.count).map(library => ({ section: library.section, page: document(library.id, library.title, { records: { file: `outputs/${library.json}`, kind: library.kind } }) })),
  { section: 'Build intel', page: { path: 'outputs/capture-summary.json', slug: 'release-summary', anchor: 'release-summary', navKey: 'release-summary', title: 'Release and extraction scope', format: 'source', records: false } },
  { section: 'Evidence and archive', page: document('source-inventory', 'Pinned source inventory') },
  { section: 'Evidence and archive', page: document('discovery-status', 'Discovery and coverage status') },
  { section: 'Evidence and archive', page: { path: 'outputs/upstream-license.txt', slug: 'upstream-license', anchor: 'upstream-license', navKey: 'upstream-license', title: 'Upstream MIT license', format: 'source', records: false } },
];
for (const { section } of pages) if (!SECTIONS.some(s => s.label === section)) throw new Error(`T3 Code page has unknown section ${section}`);
export const categories = SECTIONS.map(section => ({ label: section.label, files: pages.filter(page => page.section === section.label).map(page => page.page) })).filter(section => section.files.length);
