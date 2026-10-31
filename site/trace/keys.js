// Trace's keyboard map: one table drives the key handler, the "?" sheet and the palette's commands,
// so what the sheet says is what the keys do. `bind` maps KeyboardEvent.key to the argument the
// action (palette.js ACTIONS[id]) receives. Rows marked `app` are handled by app.js's own onKey and
// are listed here so the sheet is complete.
export const KEYS = [
  { id: "search", group: "Find", keys: ["/", "⌘K"], label: "Search this session", bind: { "/": 0 } },
  { id: "trail", group: "Find", keys: ["n", "⇧N"], label: "Next / previous result of the last search", bind: { n: 1, N: -1 } },
  { id: "help", group: "Find", keys: ["?"], label: "Show these shortcuts", command: "Keyboard shortcuts", bind: { "?": 0 } },
  { app: true, group: "Move", keys: ["←", "→"], label: "Previous / next request (hold ⇧ to jump 10)" },
  { id: "ends", group: "Move", keys: ["Home", "End"], label: "First / last request", bind: { Home: -1, End: 1 } },
  { id: "agent", group: "Move", keys: ["[", "]"], label: "Previous / next agent", bind: { "[": -1, "]": 1 } },
  { id: "ask", group: "Move", keys: ["a", "⇧A"], label: "Next / previous thing you asked", bind: { a: 1, A: -1 } },
  { id: "copies", group: "Move", keys: ["c", "⇧C"], label: "Next / previous copy of the open harness text (then n / ⇧N walk them)", bind: { c: 1, C: -1 } },
  { id: "panel", group: "Move", keys: ["j", "k"], label: "Step through the panel's items (Enter opens)", bind: { j: 1, k: -1 } },
  { app: true, group: "Move", keys: ["Enter"], label: "Go into the session or the selected agent" },
  { app: true, group: "Move", keys: ["Esc"], label: "Back out one step" },
  { id: "overview", group: "Move", keys: ["o"], label: "Session overview", command: "Session overview", bind: { o: 0 } },
  { app: true, group: "Explore", keys: ["1", "2", "3", "4", "5", "6"], label: "Switch between the questions, then what went over the wire (while a network capture is attached) and everything on this machine" },
  { id: "zoom", group: "View", keys: ["+", "−"], label: "Zoom the map in / out", bind: { "+": 1, "=": 1, "-": -1, "_": -1 } },
  { id: "reset", group: "View", keys: ["r"], label: "Reset the camera", command: "Reset the camera", bind: { r: 0 } },
  { id: "mode", group: "View", keys: ["v"], label: "Switch between the 3D and 2D view", command: "Switch 3D / 2D view", bind: { v: 0 } },
  { id: "harness", group: "View", keys: ["h"], label: "Show or hide the harness layer", command: "Show / hide the harness layer", bind: { h: 0 } },
  { id: "landmarks", group: "View", keys: ["l"], label: "Show or hide landmark labels", command: "Show / hide landmarks", bind: { l: 0 } },
  { app: true, group: "View", keys: ["m", "⇧M"], label: "In a T3 family: light the next / previous machine (Esc lights all)" },
  { id: "widen", group: "View", keys: ["w"], label: "Expand or compact the reader", command: "Expand / compact the reader", bind: { w: 0 } },
  { id: "play", group: "Playback", keys: ["Space"], label: "Play or pause", command: "Play or pause", detail: "Playback", bind: { " ": 0 } },
  { id: "stepBack", group: "Playback", keys: [","], label: "Previous request", command: "Previous request", detail: "Playback", bind: { ",": -1 } },
  { id: "stepOn", group: "Playback", keys: ["."], label: "Next request", command: "Next request", detail: "Playback", bind: { ".": 1 } },
  { id: "slower", group: "Playback", keys: ["<"], label: "Slower", command: "Slower", detail: "Playback", bind: { "<": -1 } },
  { id: "faster", group: "Playback", keys: [">"], label: "Faster", command: "Faster", detail: "Playback", bind: { ">": 1 } },
  { id: "follow", group: "Playback", keys: ["f"], label: "Camera follows the playhead, or stops following", command: "Follow the playhead", detail: "Playback", bind: { f: 0 } }
];

const BY_KEY = new Map();
for (const row of KEYS) for (const [key, arg] of Object.entries(row.bind || {})) BY_KEY.set(key, { row, arg });

// The row and argument for a plain key press (no Ctrl, Alt or ⌘), or null. Space is the playback
// key only where spacePlays says so; anywhere else it belongs to the focused element. pressedMap: what
// pressLeavesSpace said of the last pointer press (true before any).
export function keyFor(e, pressedMap = true) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key === " " && !spacePlays(e.target, pressedMap)) return null;
  return BY_KEY.get(e.key) || null;
}

// Space plays from the landscape, the minimap and the transport's scrub. A control there still presses
// natively, and everywhere else (a reader, the panel, a field) Space pages or types as usual. From the
// page itself (focus on the body) it plays only when the last pointer press left it to playback.
const PRESSES = "button, summary, a[href], select, textarea, input:not([type=range]), [contenteditable]:not([contenteditable=false]), [role=button], [role=checkbox], [role=switch], [role=tab], [role=option], [role=menuitem]";
const MAP = "#stage, #playback, #minimap";
const isPage = t => t.tagName === "BODY" || t.tagName === "HTML";
export function spacePlays(target, pressedMap = true) {
  if (!target || !target.closest || isPage(target)) return pressedMap;
  return !target.closest(PRESSES) && !!target.closest(MAP);
}
// Whether a pointer press on `target` leaves the page's Space to playback. Only a press into a scrolling
// text region takes it away: the side column (the panel, its block readers, the request nav) and the 2D
// view, which take no focus, so after a click there focus stays on the body and Space pages what was
// clicked, as the browser does. A press anywhere else (the landscape, the minimap, the transport, the
// header, the zoom and view toolbars, the bare page) leaves Space to playback.
const READERS = ".side, #flat";
export function pressLeavesSpace(target) {
  return !target || !target.closest || !target.closest(READERS);
}
// The transport's own controls: its scrub is a field, but it still answers the playback keys.
export function inTransport(target) {
  return !!(target && target.closest && target.closest("#playback"));
}

// ⌘K on a Mac, Ctrl+K elsewhere (either works everywhere).
export function isSearchChord(e) {
  return (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && String(e.key).toLowerCase() === "k";
}

// Fields that take typed keys. The request slider owns its arrows, Home and End.
export function typingInto(target) {
  return !!(target && target.closest && target.closest("input, textarea, select, [contenteditable=true], [role=separator]"));
}
