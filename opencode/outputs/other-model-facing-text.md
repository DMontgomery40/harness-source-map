# OpenCode Other discovered model-facing text

Release v1.18.34; commit aec0b9a6d8898f68f923aaf08b7306d931fd9d76. Every entry is exact public source. A pending classifier status is discovery work, not a claim that the occurrence reached a model.

## packages/codemode/src/tool-runtime.ts:554 — This is a restricted JavaScript language for calling tools, not a genera…

Record: `occ-af5df28a3049240504f4e008`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:554-554](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L554-L554) — source SHA-256 `b90cd6d8330c77ecad5e3813a2ec7c19361d49847a2137a3f6a14bef4cac40e2`; text SHA-256 `81bfc0417f0210231c2fa5d32c1a976774ae3d6a8aa866221e725affa2378b50`.

```text
This is a restricted JavaScript language for calling tools, not a general-purpose runtime.
```

## packages/codemode/src/tool-runtime.ts:557 — This is a restricted JavaScript language for calling tools, not a genera…

Record: `occ-5167487bf9785cd52881c35e`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:557-557](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L557-L557) — source SHA-256 `06dc96180334468b427005cc607a890fc5a9911f408832758e9b07897c1f1cfe`; text SHA-256 `035c9e568ff98db60c63113d6389d660de64b853be4c65c10cac7a1ac094f6da`.

```text
This is a restricted JavaScript language for calling tools, not a general-purpose runtime. Inside the confined interpreter, `tools` contains the Code Mode tools listed or searchable below and internal runtime tools; surrounding agent tools are not available.
```

## packages/codemode/src/tool-runtime.ts:560 — Do not infer or normalize tool names; use only exact signatures shown be…

Record: `occ-85e25e05263f45e45c1b1fbb`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:560-560](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L560-L560) — source SHA-256 `4f0218271248e0ed32c9e19318dfabbddc36e91e6aff2ed95a2a64050027eb0a`; text SHA-256 `e76d55682abb3cefbf93449c44faeaa0f2786b8056653aff43b8e37265c3895e`.

```text
Do not infer or normalize tool names; use only exact signatures shown below or returned by search.
```

## packages/codemode/src/tool-runtime.ts:573 — 1. Pick a tool from the list under     Available tools  - each line is t…

Record: `occ-fffa2c532b34b8a025f5cfe4`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:573-573](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L573-L573) — source SHA-256 `bea127dc53f6f2e07739d31871d613c434971417c4b5b458a5e950e35cd60b39`; text SHA-256 `9de71de1d586b4c8612661bc6a9f37cb441002922d2cebd4c913b9563bfaf723`.

```text
1. Pick a tool from the list under `## Available tools` - each line is the exact call signature; use it as-is rather than guessing segments.
```

## packages/codemode/src/tool-runtime.ts:574 — 2. Call it using the exact signature shown:  const result = await tools.…

Record: `occ-0e462507bd7511228d83e914`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:574-574](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L574-L574) — source SHA-256 `c73fefa62b5612d30e308b14ea0becbf71bc42e49d882cda0ea316aed09199b2`; text SHA-256 `065575671ea3efb9bc517c822f17148efccd31643a68fc53510af5300061ad6f`.

```text
2. Call it using the exact signature shown: `const result = await tools.<namespace>.<tool>(input)`; bracket notation and quotes are part of the path.
```

## packages/codemode/src/tool-runtime.ts:575 — 3. Return only the fields you need from structured results; narrow unkno…

Record: `occ-1806ca1ead9c2a582fd78407`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:575-575](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L575-L575) — source SHA-256 `52b9958ebf6c6e1f04a8136bf76ee692aa013c60427004d0261108857d6560c8`; text SHA-256 `34f9491f2756cfe38bb8e0777280ccd56d2098d376d48631f486ee9c801bb32a`.

```text
3. Return only the fields you need from structured results; narrow unknown results before reading fields, and avoid returning large raw payloads.
```

## packages/codemode/src/tool-runtime.ts:578 — 1. If needed, discover tools:  return await tools.$codemode.search({ que…

Record: `occ-464fc25605220a9aa116ca27`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:578-578](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L578-L578) — source SHA-256 `da739dce150eeadc76b8bcad5125eb9373b51830703e998f7008efeb18a83ded`; text SHA-256 `8cf41a6295219ec5c2f70756db95bbdbabd1a22367ee9f71d4d3ed28f1a407dd`.

```text
1. If needed, discover tools: `return await tools.$codemode.search({ query: "<intent + key nouns>" })`.
```

## packages/codemode/src/tool-runtime.ts:579 — 2. In the next execution, copy a returned path exactly, call it, and ret…

Record: `occ-773488df04dddea70bd91400`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:579-579](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L579-L579) — source SHA-256 `f0ec92d5674e79c49adaa40a807595d23fd9812389d2519e2106a2f3e33d6902`; text SHA-256 `d32ef1189f944692438162941e2d99496f77674a6e14a50d2fe82a0878de2354`.

```text
2. In the next execution, copy a returned path exactly, call it, and return only the needed fields.
```

## packages/codemode/src/tool-runtime.ts:590 — - Only Code Mode tools listed here and internal runtime tools are availa…

Record: `occ-d359689b7b74873b2291e798`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:590-590](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L590-L590) — source SHA-256 `6687231124879e4a711b350a8c8d5e85ad89daf30eb16c0c65dae3e564d8177f`; text SHA-256 `498b5d8e66f420870a6e64ad6302405761d2400cb374be15d84422dce6ea1045`.

```text
- Only Code Mode tools listed here and internal runtime tools are available; surrounding agent tools are not implicitly exposed.
```

## packages/codemode/src/tool-runtime.ts:591 — - Only Code Mode tools listed here or returned by  tools.$codemode.searc…

Record: `occ-3c2cb8c45c22b3ca1ee8fba0`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:591-591](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L591-L591) — source SHA-256 `30c091b1caebb27060e1c2bcebcddc299f6ee98b25fee2006f9d53f923c5fb68`; text SHA-256 `55c38f5912ba4cbac32687db0afc16e537a0a7f1310a284922457f030a983ded`.

```text
- Only Code Mode tools listed here or returned by `tools.$codemode.search` and internal runtime tools are available; surrounding agent tools are not implicitly exposed.
```

## packages/codemode/src/tool-runtime.ts:592 — - Filter, aggregate, and transform collections in code - never return th…

Record: `occ-26f8cd145f2ef78ed4b46aa3`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:592-592](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L592-L592) — source SHA-256 `271f6fee1f7c28379883c3de1fcc9af42b9b5c66a486d3b020032dacdeef38ae`; text SHA-256 `afe859ea3202d0b252bba69c348b47333a74b2fa7b0aa689952d7e13a783524f`.

```text
- Filter, aggregate, and transform collections in code - never return them raw or call a tool per item across messages.
```

## packages/codemode/src/tool-runtime.ts:593 — - A result typed  Promise unknown   may be structured data or text. Befo…

Record: `occ-22b1e1108f0cb4e3fde4b842`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:593-593](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L593-L593) — source SHA-256 `cd3318b49580f427b1f6c560a8b914ad7e3540e23446c0cb64c2da2a58b118ec`; text SHA-256 `8ec85de203ed4623152d1e7e0cf2f90c10efdf5b6b3d165e5ad3d740e0d016f6`.

```text
- A result typed `Promise<unknown>` may be structured data or text. Before reading fields, check that it is a non-null object and not an array; otherwise handle the returned text or primitive directly.
```

## packages/codemode/src/tool-runtime.ts:608 — Use common JavaScript data operations, functions, control flow, selected…

Record: `occ-b02dde996dc294388f41cd13`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:608-608](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L608-L608) — source SHA-256 `4d13037dc1baba53a230e492c1860413aa103d5e7167f94dd325b91f8c87b225`; text SHA-256 `c519742a24c4eb9945d8da5aa49b8e4a4e8871b9b4cf5265344f03374c3ae125`.

```text
Use common JavaScript data operations, functions, control flow, selected standard-library methods, and awaited tool calls. Built-ins include Date, RegExp, Map, Set, URL, URLSearchParams, and URI encoding helpers.
```

## packages/codemode/src/tool-runtime.ts:609 — Modules/imports, classes, generators, timers, fetch, eval, prototype acc…

Record: `occ-a9e27fc42c761553c57e78e2`. Kind: prompt. Discovery: classified.

[packages/codemode/src/tool-runtime.ts:609-609](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/codemode/src/tool-runtime.ts#L609-L609) — source SHA-256 `17e5ab7255d2a3d978a481c7746245538f497e2aa366f80e932d93fd89e26a1a`; text SHA-256 `dbbcf52f304679d51769ccc95347ab8204b6451f8f9dc5dcb1346a6e5bd2907a`.

```text
Modules/imports, classes, generators, timers, fetch, eval, prototype access, unlisted methods, and promise chaining are unavailable. Use Code Mode tools for external operations. Use await with try/catch.
```
