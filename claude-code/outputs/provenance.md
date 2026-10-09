# Method and inventory

## Source

Claude Code 2.1.295 from npm (`@anthropic-ai/claude-code` with its `darwin-arm64` binary), file `claude.exe`, SHA-256 `0116ee2e0a513900b633d9951367f18747686478e2b462805b8c31609f047f70`. Other platforms and versions are separate builds and can differ.

## Extraction

The binary is a Bun standalone executable. Its `__BUN,__bun` section holds a module table listing 2596 embedded files (JavaScript chunks, skills, and assets) with their offsets. `extract/bun-extract.py` decodes that table and writes each file out along with its absolute byte offset in `claude.exe` and its SHA-256. Most source spans point to text bytes at that offset. For a zstd-compressed module, provenance instead names the compressed blob's binary offset and hash plus the decoded text's offset and hash; the text is not stored verbatim at the binary offset.

## Reading the code

The JavaScript is parsed with acorn rather than searched with regular expressions. Section conditions, tool availability, and injection triggers were read from the parsed code and cross-checked against two captured requests (see [What a request contains](#request-anatomy-md)). In the minified code, remote feature flags are read with their compiled default. This site names each flag and its default but does not claim what its server-side value is.

## Inventory

The parser found 83877 JavaScript string and template literal occurrences with at least two words, prompt-bearing fields with one word, and exact contiguous spans from embedded Markdown and text assets. 229 text assets contributed 884 spans. gpt-6-luna judged 0 occurrences; exceptions remain visible in the inventory. Exact previously published strings retain current byte provenance and explicitly pending current source-role judgments. Prior probabilities belong only to their previous release. Of those occurrences:

- 5266 are covered by a published document,
- 746 are collected as current-source publication continuity with pending current role judgments on [Other model-facing text](#other-model-text-md),
- 0 are developer documentation (SDK types and schema descriptions), 0 are text shown to the person using the CLI, 0 are third-party library text, and 0 are other text such as fixtures,
- 0 were judged model-facing but fell below the 0.8 publication threshold; they are listed in `inventory.json` only.
- 83803 await a current provider judgment. Reviewed named records and explicit publication continuity may cover their source text; those publications do not turn a pending classifier judgment into a current verdict.
- 74 need local review because the privacy filter withheld their complete text or the request budget could not fit it. The public inventory retains source offsets and hashes without exposing withheld previews.
- 0 embedded JavaScript files did not parse; their filenames are recorded in the local candidate ledger.


`inventory.json` lists every selected literal with its offset, hash, verdict, confidence, and where it is published. Jev's verdicts are probabilities, not proof. The local candidate ledger states which literals were excluded; dynamic text assembled at run time requires separate evidence.

## Not in the binary

Anything the server adds, remote feature-flag values, and text configured by users, projects, plugins, or MCP servers are not in the binary, so they are not on this site.

## Reproduce it

Install Claude Code 2.1.295, run `python3 extract/bun-extract.py` and the scripts in `extract/`, and compare the offsets and hashes against `data/*.json`.
