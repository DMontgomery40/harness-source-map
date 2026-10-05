#!/usr/bin/env python3
"""Extract every file embedded in a Bun-compiled Claude Code binary (macOS Mach-O).

Reads the __BUN,__bun section, decodes Bun's standalone module table, and writes each
embedded file to work/extracted/ with work/embedded-manifest.json recording its absolute
byte offset in the binary, length, and SHA-256. zstd-compressed files are also
decompressed next to the original.

usage: extract/bun-extract.py [path/to/claude] [output-dir (default: work/)]
"""
import hashlib, json, os, struct, subprocess, sys

binary = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/.nvm/versions/node/v22.22.0/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe")
root = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "work")
data = open(binary, "rb").read()

# Locate the __BUN section through the Mach-O load commands.
ncmds = struct.unpack_from("<I", data, 16)[0]
offset, section = 32, None
for _ in range(ncmds):
    cmd, size = struct.unpack_from("<II", data, offset)
    if cmd == 0x19:  # LC_SEGMENT_64
        segname = data[offset + 8:offset + 24].rstrip(b"\0")
        nsects = struct.unpack_from("<I", data, offset + 64)[0]
        for i in range(nsects):
            s = offset + 72 + i * 80
            if data[s:s + 16].rstrip(b"\0") == b"__bun" and segname == b"__BUN":
                size_, fileoff = struct.unpack_from("<Q", data, s + 40)[0], struct.unpack_from("<I", data, s + 48)[0]
                section = (fileoff, size_)
    offset += size
if not section:
    sys.exit("no __BUN,__bun section found")

fileoff, _ = section
payload_len = struct.unpack_from("<Q", data, fileoff)[0]
payload_start = fileoff + 8
payload = data[payload_start:payload_start + payload_len]
trailer = payload.rfind(b"\n---- Bun! ----\n")
# Offsets struct: byte_count u64, modules {offset,len} u32 pair, entry u32, exec_argv {offset,len}, flags u32
byte_count, mod_off, mod_len = struct.unpack_from("<QII", payload, trailer - 32)

os.makedirs(os.path.join(root, "extracted"), exist_ok=True)
entries = []
for i in range(mod_len // 52):
    f = struct.unpack_from("<12I4B", payload, mod_off + i * 52)
    name = payload[f[0]:f[0] + f[1]].decode()
    body = payload[f[2]:f[2] + f[3]]
    rel = name.replace("/$bunfs/root/", "")
    path = os.path.join(root, "extracted", rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "wb").write(body)
    entry = {"name": name, "file_offset": payload_start + f[2], "length": f[3],
             "sha256": hashlib.sha256(body).hexdigest(), "bytecode_length": f[7], "flags": list(f[12:])}
    # Bun also stores a few .js assets as zstd frames without a .zst suffix. Detect the
    # frame header rather than trusting the filename, and retain the raw frame beside it.
    compressed = rel.endswith(".zst") or body.startswith(b"\x28\xb5\x2f\xfd")
    if compressed:
        raw_path = path if rel.endswith(".zst") else path + ".zst"
        if raw_path != path:
            open(raw_path, "wb").write(body)
        out = subprocess.run(["zstd", "-d", "-q", "-c", raw_path], capture_output=True, check=True).stdout
        expanded_rel = rel[:-4] if rel.endswith(".zst") else rel
        expanded_path = os.path.join(root, "extracted", expanded_rel)
        open(expanded_path, "wb").write(out)
        entry.update(compression="zstd", decompressed=expanded_rel,
                     decompressed_length=len(out), decompressed_sha256=hashlib.sha256(out).hexdigest())
    entries.append(entry)

json.dump({"binary": os.path.basename(binary), "binary_sha256": hashlib.sha256(data).hexdigest(), "files": entries},
          open(os.path.join(root, "embedded-manifest.json"), "w"), indent=1)
print(f"{len(entries)} embedded files from {binary}")
