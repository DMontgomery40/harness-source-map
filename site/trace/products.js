// Product names shared by the viewer, worker, help and harness layer.
// Keep these names aligned with the public site's SITE.products labels.
const LABELS = { 'claude-code': 'Claude Code', codex: 'Codex/ChatGPT', opencode: 'OpenCode' };
export const productLabel = product => LABELS[product] || product;
