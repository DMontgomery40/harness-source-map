// Tests of a pinned release inspect the immutable snapshot, not an app that auto-updates.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const current=path.join(root,'work/current.json');
const release=fs.existsSync(current)?JSON.parse(fs.readFileSync(current)).release:null;
const snapshot=release?path.join(root,'work/releases',release):path.join(root,'work/unacquired');
export const desktop=process.env.CURSOR_DESKTOP_APP || path.join(snapshot,'desktop/Cursor.app');
export const archive=process.env.CURSOR_AGENT_ARCHIVE || path.join(snapshot,'agent-cli/agent-cli-package.tar.gz');
export const cli=process.env.CURSOR_AGENT_ROOT || path.join(snapshot,'agent-cli/package');
