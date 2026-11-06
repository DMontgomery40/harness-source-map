// The supported ways to record a future session with its network traffic, one table for every surface (the capture
// card and Help). A route is either the local recorder the resolver drives (kind "recorder") or a command run in a
// clone of the harness-source-map repository (kind "command"). Words are the route's name and its one next step.
const TASK = '"YOUR REAL TASK"';
export const CAPTURE_ROUTES = {
  codex: [
    { id: "desktop", label: "Desktop app", kind: "recorder", then: "Stop files it beside its session." },
    { id: "cli", label: "CLI", kind: "command", command: "tools/capture/capture.sh -- codex", then: "Reopen the session when it exits." },
  ],
  "claude-code": [
    { id: "cli", label: "CLI", kind: "command", command: "tools/capture/capture.sh -- claude", then: "Reopen the session when it exits." },
  ],
  cursor: [
    { id: "desktop", label: "Desktop app", kind: "command", command: "node tools/capture/cursor-desktop-capture.mjs --open", before: "Quit Cursor first.", then: "Quit the app it opens to finish; drop the recording folder here." },
    { id: "agent", label: "Agent CLI", kind: "command", command: `node tools/capture/cursor-agent-capture.mjs --open -- --mode ask --sandbox enabled ${TASK}`, then: "Drop the recording folder here." },
  ],
  opencode: [
    { id: "cli", label: "CLI", kind: "command", command: `node tools/capture/opencode-capture.mjs --open -- --model PROVIDER/MODEL ${TASK}`, then: "Drop the recording folder here." },
  ],
};
export const FILE_CAPTURE = "node tools/capture/file-capture.mjs capture.har";
export const RESOLVER = "npm --prefix site run trace:local";
export function routesFor(product) { return CAPTURE_ROUTES[product] || CAPTURE_ROUTES["claude-code"]; }
