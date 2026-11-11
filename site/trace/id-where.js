// Where each product shows the ID or link to paste. Only actions found in the shipped app or CLI: T3 Code's thread
// actions menu, Claude Code's and Codex CLI's /status card, the Codex/ChatGPT app's "Copy deeplink" command
// (Mac: ⌘⌥L), and `opencode session list`. Cursor's row is the file fallback: no Cursor copy-ID action was verified.
// Shown under the paste box and in Help's "Open a session".
import { el } from "./panels.js";

const k = (t) => el("kbd", { text: t });
const c = (t) => el("code", { text: t });
// each row builds fresh nodes: the list appears in two places
const ID_WHERE = [
  ["T3 Code", () => ["Thread title → Copy → Thread ID"]],
  ["Codex/ChatGPT app", () => ["Mac: ", k("⌘⌥L"), " Copy deeplink"]],
  ["Codex CLI", () => [c("/status"), " → Session"]],
  ["Claude Code", () => [c("/status"), " → Session ID"]],
  ["OpenCode", () => [c("opencode session list")]],
  ["Cursor", () => ["Open its session export with Files"]],
];

export function idWhereList() {
  return el("dl", { class: "id-where-list" }, ID_WHERE.flatMap(([product, how]) => [el("dt", { text: product }), el("dd", {}, how())]));
}
