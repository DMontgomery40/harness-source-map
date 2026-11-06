// A disk-backed File can become unreadable when an active session appends to it.
// Capture direct picks before awaiting network setup; a directory handle may stand in for a File that changed
// before this load read anything, never after.
//
// Generation ownership: one load reads one version of each file. A source fixes its File at its first read (the
// File it was given, or, when that one already changed before this load read any byte of it, one fresh File from
// the directory handle) and every later read, the snapshot included, is a slice of that same File. A File is the
// browser's snapshot of the file on disk: once the file changes (appended, rewritten, or swapped for another of the
// same size) the browser refuses to read it, and that refusal is this load's error (code TRACE_SOURCE_CHANGED, the
// browser's NotReadableError as its cause), never a silent read of the new bytes. Nothing is copied eagerly: only
// snapshot() (the loader's chosen session) copies its bytes into memory, from the same File.
const message = name => `${name || 'The session file'} could not be read. It changed or is unavailable; select it again.`;
export const SOURCE_CHANGED = 'TRACE_SOURCE_CHANGED';
const changed = (name, cause) => Object.assign(new Error(message(name), {cause}), {code: SOURCE_CHANGED});

// A direct pick that cannot be read is left as it is unless the hint names it: the loader then skips it
// with a note, or reports it when it was the only candidate. The hinted file itself must read.
export async function capturePickedFiles(files, root) {
  return Promise.all(files.map(async entry => {
    if (entry.handle || entry.frozen || !entry.file) return entry;
    const direct = !entry.path.includes('/');
    const primary = root && entry.path.toLowerCase().includes(root.toLowerCase());
    if (!direct && !primary) return entry;
    try {
      const file = new Blob([await entry.file.arrayBuffer()]);
      return {...entry, file, frozen: true};
    } catch (cause) {
      if (!primary) return entry;
      throw new Error(message(entry.path), {cause});
    }
  }));
}

const bytesOf = async (f, a, b) => new Uint8Array(await f.slice(a, b).arrayBuffer());
const stale = e => e?.name === 'NotReadableError';

export function fileSource(file, handle = null, frozen = false) {
  let stable = frozen ? file : null; // bytes in memory: a frozen pick, or this source's own snapshot
  let current = file; // the one File this load reads
  let readGiven = false; // whether the given File has served a read: from then on it is this load's File
  let fresh = null; // the one replacement, shared by the first reads that found the given File already changed
  let snapshotPromise = null;
  const size = file.size;
  const exact = async (f, a, end) => {
    const bytes = await bytesOf(f, a, end);
    if (bytes.length !== end - a) throw new DOMException('File size changed', 'NotReadableError');
    return bytes;
  };
  // the File this load fixed no longer reads: its file changed on disk after this load began reading it
  const fail = cause => (stale(cause) ? changed(file.name, cause) : new Error(message(file.name), {cause}));
  const source = {
    name: file.name,
    size,
    async slice(a, b) {
      if (stable) return bytesOf(stable, a, b);
      const end = Math.max(a, Math.min(b, size)), mine = current;
      try { const bytes = await exact(mine, a, end); if (mine === file) readGiven = true; return bytes; }
      catch (cause) {
        // the given File changed before it served this load anything (an active log appended between the pick and
        // this load): one fresh File from the handle, shared by every such read, which must still hold the size the
        // load planned with, and is this load's File from then on. Any other change is this load's error.
        if (!stale(cause) || !handle || mine !== file || readGiven) throw fail(cause);
        fresh ||= handle.getFile().then(f => { if (!(f.size >= size)) throw changed(file.name, new DOMException('File size changed', 'NotReadableError')); current = f; return f; },
          error => { throw error?.code ? error : new Error(message(file.name), {cause: error}); });
        const f = await fresh;
        try { return await exact(f, a, end); }
        catch (again) { throw fail(again); }
      }
    },
    async snapshot() {
      if (stable) return;
      snapshotPromise ||= source.slice(0, size).then(bytes => { stable = new Blob([bytes]); });
      await snapshotPromise;
    },
  };
  return source;
}
