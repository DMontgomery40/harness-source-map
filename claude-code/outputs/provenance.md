# Method and inventory

## Source

Claude Code 2.1.289 from npm (`@anthropic-ai/claude-code` with its `darwin-arm64` binary), file `claude.exe`, SHA-256 `03d66745e3bb69ec727d66023696f3820bc0a00a8a5ba725eb6706d0c67cbe69`. Other platforms and versions are separate builds and can differ.

## Extraction

The binary is a Bun standalone executable. Its `__BUN,__bun` section holds a module table listing 2414 embedded files (JavaScript chunks, skills, and assets) with their offsets. `extract/bun-extract.py` decodes that table and writes each file out along with its absolute byte offset in `claude.exe` and its SHA-256. Every prompt and reference record on this site points back to one of those offsets, and the bytes at that offset are the text shown.

## Reading the code

The JavaScript is parsed with acorn rather than searched with regular expressions. Section conditions, tool availability, and injection triggers were read from the parsed code and cross-checked against two captured requests (see [What a request contains](#request-anatomy-md)). In the minified code, remote feature flags are read with their compiled default. This site names each flag and its default but does not claim what its server-side value is.

## Inventory

The parser found 4063 prose string and template literals of 200 characters or more. jev-1.13.0 (TypeSafe) judged who each one is written for. Of those literals:

- 844 are covered by a published document,
- 1328 were judged model-facing and are collected on [Other model-facing text](#other-model-text-md),
- 444 are developer documentation (SDK types and schema descriptions), 1076 are text shown to the person using the CLI, 2 are third-party library text, and 30 are other text such as fixtures,
- 339 were judged model-facing with less than 0.5 confidence; they are listed in `inventory.json` only.

`inventory.json` lists every literal with its offset, hash, verdict, confidence, and where it is published. Jev's verdicts are probabilities, not proof. Shorter strings are covered only where a document includes them.

## Not in the binary

Anything the server adds, remote feature-flag values, and text configured by users, projects, plugins, or MCP servers are not in the binary, so they are not on this site.

## Reproduce it

Install Claude Code 2.1.289, run `python3 extract/bun-extract.py` and the scripts in `extract/`, and compare the offsets and hashes against `data/*.json`.
