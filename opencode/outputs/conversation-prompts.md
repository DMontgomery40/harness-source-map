# OpenCode Conversation and utility prompts

Release v1.18.34; commit aec0b9a6d8898f68f923aaf08b7306d931fd9d76. Every entry is exact public source. A pending classifier status is discovery work, not a claim that the occurrence reached a model.

## packages/opencode/src/server/routes/instance/httpapi/handlers/project-copy.ts:51 — Generate a short 2-3 word name that describes this task: n${text}

Record: `occ-089cf452b2761d24cc9dfe19`. Kind: prompt. Discovery: classified.

[packages/opencode/src/server/routes/instance/httpapi/handlers/project-copy.ts:51-51](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/server/routes/instance/httpapi/handlers/project-copy.ts#L51-L51) — source SHA-256 `b7116b6c493213d56057a0d0dac70e7ace9ecb9439c882ee6b080f06ea60ed08`; text SHA-256 `5fc5972733431536e7427fe655dc6a085c4ec661e8b76060ffb18ebe8c9bbf92`.

```text
Generate a short 2-3 word name that describes this task:\n${text}
```

## packages/tui/src/component/prompt/index.tsx:131 — system-reminder Note: The user opened the file "${selection.filePath}". …

Record: `occ-f6deaa3129869796d3c6d41e`. Kind: prompt. Discovery: classified.

[packages/tui/src/component/prompt/index.tsx:131-131](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/component/prompt/index.tsx#L131-L131) — source SHA-256 `12cba35a8ea899aa6b210e49f33b613dd4494cf0d777560784a10357d73505bf`; text SHA-256 `4f6cfdfb17f38d4d3e7c836fe51d91e782a1244d68524db6bc2c4f49d69a9550`.

```text
<system-reminder>Note: The user opened the file "${selection.filePath}". This may or may not be relevant to the current task.</system-reminder>\n
```

## packages/tui/src/component/prompt/move.tsx:15 — system-reminder The user has changed the current working directory to "$…

Record: `occ-4f0e5dd4807b5ee36f9a11d1`. Kind: prompt. Discovery: classified.

[packages/tui/src/component/prompt/move.tsx:15-15](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/component/prompt/move.tsx#L15-L15) — source SHA-256 `261de55683d53d90db910dc1b65942a880203e9aa63503fff7cc0f962494293c`; text SHA-256 `bce6ef05dccbf1511a71c678d13d3bf0e3d75bff7c1d897e0c0d4a91818d6de4`.

```text
<system-reminder>The user has changed the current working directory to "${directory}". This is still the same project but at a possibly new location; take this into account when working with any files from now on.</system-reminder>
```
