# OpenCode environment variables

OpenCode v1.18.34 reads 131 environment variables by name: 67 of its own and 64 that providers, the host or other tools define. Each was found where the code reads it (process.env, Bun.env, OpenCode's Flag helpers or Effect Config), and the reading code says what value it expects. Topics group them by what they control; whether one is set depends on the user's environment.

## Experimental features

### OPENCODE_EXPERIMENTAL

Read 2 times, in 2 files. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:12`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L12), [`core/src/tool/websearch.ts:79`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L79)

```typescript
return process.env[key] === undefined ? truthy("OPENCODE_EXPERIMENTAL") : truthy(key)
enableExa: truthy("OPENCODE_EXPERIMENTAL") || truthy("OPENCODE_ENABLE_EXA") || truthy("OPENCODE_EXPERIMENTAL_EXA"),
```

### OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS

Read once, in opencode/src/effect/runtime-flags.ts. Value: boolean: true when set to "true" or "1".

Source: [`opencode/src/effect/runtime-flags.ts:43`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L43)

```typescript
experimentalBackgroundSubagents: enabledByExperimental("OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS"),
```

### OPENCODE_EXPERIMENTAL_CODE_MODE

Read once, in opencode/src/effect/runtime-flags.ts. Value: boolean: true when set to "true" or "1".

Source: [`opencode/src/effect/runtime-flags.ts:48`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L48)

```typescript
experimentalCodeMode: enabledByExperimental("OPENCODE_EXPERIMENTAL_CODE_MODE"),
```

### OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT

Read 2 times, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:8`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L8), [`core/src/flag/flag.ts:44`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L44)

```typescript
const copy = process.env["OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
copy === undefined ? process.platform === "win32" : truthy("OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
```

### OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER

Read once, in core/src/flag/flag.ts. Value: boolean (Effect Config).

Source: [`core/src/flag/flag.ts:40`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L40)

```typescript
OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
```

### OPENCODE_EXPERIMENTAL_EVENT_SYSTEM

Read once, in opencode/src/effect/runtime-flags.ts. Value: boolean: true when set to "true" or "1".

Source: [`opencode/src/effect/runtime-flags.ts:49`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L49)

```typescript
experimentalEventSystem: enabledByExperimental("OPENCODE_EXPERIMENTAL_EVENT_SYSTEM"),
```

### OPENCODE_EXPERIMENTAL_EXA

Read once, in core/src/tool/websearch.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/tool/websearch.ts:79`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L79)

```typescript
enableExa: truthy("OPENCODE_EXPERIMENTAL") || truthy("OPENCODE_ENABLE_EXA") || truthy("OPENCODE_EXPERIMENTAL_EXA"),
```

### OPENCODE_EXPERIMENTAL_FILEWATCHER

Read once, in core/src/flag/flag.ts. Value: boolean (Effect Config).

Source: [`core/src/flag/flag.ts:37`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L37)

```typescript
OPENCODE_EXPERIMENTAL_FILEWATCHER: Config.boolean("OPENCODE_EXPERIMENTAL_FILEWATCHER").pipe(
```

### OPENCODE_EXPERIMENTAL_ICON_DISCOVERY

Read once, in opencode/src/effect/runtime-flags.ts. Value: boolean: true when set to "true" or "1".

Source: [`opencode/src/effect/runtime-flags.ts:51`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L51)

```typescript
experimentalIconDiscovery: enabledByExperimental("OPENCODE_EXPERIMENTAL_ICON_DISCOVERY"),
```

### OPENCODE_EXPERIMENTAL_LSP_TOOL

Read once, in opencode/src/effect/runtime-flags.ts. Value: boolean: true when set to "true" or "1".

Source: [`opencode/src/effect/runtime-flags.ts:45`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L45)

```typescript
experimentalLspTool: enabledByExperimental("OPENCODE_EXPERIMENTAL_LSP_TOOL"),
```

### OPENCODE_EXPERIMENTAL_OXFMT

Read once, in opencode/src/effect/runtime-flags.ts. Value: boolean: true when set to "true" or "1".

Source: [`opencode/src/effect/runtime-flags.ts:46`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L46)

```typescript
experimentalOxfmt: enabledByExperimental("OPENCODE_EXPERIMENTAL_OXFMT"),
```

### OPENCODE_EXPERIMENTAL_PARALLEL

Read once, in core/src/tool/websearch.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/tool/websearch.ts:80`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L80)

```typescript
enableParallel: truthy("OPENCODE_ENABLE_PARALLEL") || truthy("OPENCODE_EXPERIMENTAL_PARALLEL"),
```

### OPENCODE_EXPERIMENTAL_PLAN_MODE

Read once, in opencode/src/effect/runtime-flags.ts. Value: boolean: true when set to "true" or "1".

Source: [`opencode/src/effect/runtime-flags.ts:47`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L47)

```typescript
experimentalPlanMode: enabledByExperimental("OPENCODE_EXPERIMENTAL_PLAN_MODE"),
```

### OPENCODE_EXPERIMENTAL_REFERENCES

Read 2 times, in 2 files. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:58`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L58), [`opencode/src/effect/runtime-flags.ts:42`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L42)

```typescript
return enabledByExperimental("OPENCODE_EXPERIMENTAL_REFERENCES")
experimentalReferences: enabledByExperimental("OPENCODE_EXPERIMENTAL_REFERENCES"),
```

### OPENCODE_EXPERIMENTAL_WORKSPACES

Read 2 times, in 2 files. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:50`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L50), [`opencode/src/effect/runtime-flags.ts:50`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L50)

```typescript
OPENCODE_EXPERIMENTAL_WORKSPACES: enabledByExperimental("OPENCODE_EXPERIMENTAL_WORKSPACES"),
experimentalWorkspaces: enabledByExperimental("OPENCODE_EXPERIMENTAL_WORKSPACES"),
```

## Model providers and credentials

### AICORE_DEPLOYMENT_ID

Read 2 times, in 2 files. Value: string, read as set.

Source: [`core/src/plugin/provider/sap-ai-core.ts:34`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/sap-ai-core.ts#L34), [`opencode/src/provider/provider.ts:628`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L628)

```typescript
? { deploymentId: process.env.AICORE_DEPLOYMENT_ID, resourceGroup: process.env.AICORE_RESOURCE_GROUP }
const deploymentId = process.env.AICORE_DEPLOYMENT_ID
```

### AICORE_RESOURCE_GROUP

Read 2 times, in 2 files. Value: string, read as set.

Source: [`core/src/plugin/provider/sap-ai-core.ts:34`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/sap-ai-core.ts#L34), [`opencode/src/provider/provider.ts:629`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L629)

```typescript
? { deploymentId: process.env.AICORE_DEPLOYMENT_ID, resourceGroup: process.env.AICORE_RESOURCE_GROUP }
const resourceGroup = process.env.AICORE_RESOURCE_GROUP
```

### AICORE_SERVICE_KEY

Read 5 times, in 2 files. Value: string, read as set.

Source: [`core/src/plugin/provider/sap-ai-core.ts:15`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/sap-ai-core.ts#L15), [`core/src/plugin/provider/sap-ai-core.ts:17`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/sap-ai-core.ts#L17), [`core/src/plugin/provider/sap-ai-core.ts:17`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/sap-ai-core.ts#L17), [`opencode/src/provider/provider.ts:620`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L620) and 1 more

```typescript
process.env.AICORE_SERVICE_KEY ??
if (serviceKey && !process.env.AICORE_SERVICE_KEY) process.env.AICORE_SERVICE_KEY = serviceKey
const envAICoreServiceKey = process.env.AICORE_SERVICE_KEY
```

### AWS_BEARER_TOKEN_BEDROCK

Read 5 times, in 2 files. Value: string, read as set.

Source: [`core/src/plugin/provider/amazon-bedrock.ts:96`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L96), [`core/src/plugin/provider/amazon-bedrock.ts:98`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L98), [`core/src/plugin/provider/amazon-bedrock.ts:98`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L98), [`opencode/src/provider/provider.ts:357`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L357) and 1 more

```typescript
process.env.AWS_BEARER_TOKEN_BEDROCK ??
if (bearerToken && !process.env.AWS_BEARER_TOKEN_BEDROCK) process.env.AWS_BEARER_TOKEN_BEDROCK = bearerToken
const envToken = process.env.AWS_BEARER_TOKEN_BEDROCK
```

### AWS_CONTAINER_CREDENTIALS_FULL_URI

Read 2 times, in 2 files. Value: string, read as set.

Source: [`core/src/plugin/provider/amazon-bedrock.ts:100`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L100), [`opencode/src/provider/provider.ts:369`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L369)

```typescript
process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI,
```

### AWS_CONTAINER_CREDENTIALS_RELATIVE_URI

Read 2 times, in 2 files. Value: string, read as set.

Source: [`core/src/plugin/provider/amazon-bedrock.ts:100`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L100), [`opencode/src/provider/provider.ts:369`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L369)

```typescript
process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI,
```

### AWS_PROFILE

Read once, in core/src/plugin/provider/amazon-bedrock.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/amazon-bedrock.ts:93`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L93)

```typescript
const profile = typeof options.profile === "string" ? options.profile : process.env.AWS_PROFILE
```

### AWS_REGION

Read 2 times, in core/src/plugin/provider/amazon-bedrock.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/amazon-bedrock.ts:94`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L94), [`core/src/plugin/provider/amazon-bedrock.ts:129`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L129)

```typescript
const region = typeof options.region === "string" ? options.region : (process.env.AWS_REGION ?? "us-east-1")
const region = typeof evt.options.region === "string" ? evt.options.region : process.env.AWS_REGION
```

### AZURE_COGNITIVE_SERVICES_RESOURCE_NAME

Read once, in core/src/plugin/provider/azure.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/azure.ts:63`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/azure.ts#L63)

```typescript
const resourceName = process.env.AZURE_COGNITIVE_SERVICES_RESOURCE_NAME
```

### AZURE_RESOURCE_NAME

Read 3 times, in 2 files. Value: string, read as set.

Source: [`core/src/plugin/provider/azure.ts:23`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/azure.ts#L23), [`opencode/src/plugin/azure.ts:46`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/azure.ts#L46), [`opencode/src/plugin/azure.ts:89`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/azure.ts#L89)

```typescript
typeof configured === "string" && configured.trim() !== "" ? configured : process.env.AZURE_RESOURCE_NAME
if (!process.env.AZURE_RESOURCE_NAME) {
const resourceName = inputs?.resourceName ?? process.env.AZURE_RESOURCE_NAME
```

### CF_AIG_TOKEN

Read once, in core/src/plugin/provider/cloudflare-ai-gateway.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/cloudflare-ai-gateway.ts:58`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-ai-gateway.ts#L58)

```typescript
const apiKey = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_AIG_TOKEN ?? stringOption(options, "apiKey")
```

### CLOUDFLARE_ACCOUNT_ID

Read 5 times, in 3 files. Value: string, read as set.

Source: [`core/src/plugin/provider/cloudflare-ai-gateway.ts:53`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-ai-gateway.ts#L53), [`core/src/plugin/provider/cloudflare-workers-ai.ts:50`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-workers-ai.ts#L50), [`core/src/plugin/provider/cloudflare-workers-ai.ts:76`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-workers-ai.ts#L76), [`opencode/src/plugin/cloudflare.ts:4`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/cloudflare.ts#L4) and 1 more

```typescript
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? stringOption(options, "accountId")
return process.env.CLOUDFLARE_ACCOUNT_ID ?? stringOption(options, "accountId")
return baseURL.replaceAll("${CLOUDFLARE_ACCOUNT_ID}", process.env.CLOUDFLARE_ACCOUNT_ID ?? "${CLOUDFLARE_ACCOUNT_ID}")
```

### CLOUDFLARE_API_KEY

Read once, in core/src/plugin/provider/cloudflare-workers-ai.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/cloudflare-workers-ai.ts:65`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-workers-ai.ts#L65)

```typescript
apiKey: process.env.CLOUDFLARE_API_KEY ?? options.apiKey,
```

### CLOUDFLARE_API_TOKEN

Read once, in core/src/plugin/provider/cloudflare-ai-gateway.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/cloudflare-ai-gateway.ts:58`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-ai-gateway.ts#L58)

```typescript
const apiKey = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_AIG_TOKEN ?? stringOption(options, "apiKey")
```

### CLOUDFLARE_GATEWAY_ID

Read 2 times, in 2 files. Value: string, read as set.

Source: [`core/src/plugin/provider/cloudflare-ai-gateway.ts:57`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-ai-gateway.ts#L57), [`opencode/src/plugin/cloudflare.ts:41`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/cloudflare.ts#L41)

```typescript
process.env.CLOUDFLARE_GATEWAY_ID ?? stringOption(options, "gatewayId") ?? stringOption(options, "gateway")
...(!process.env.CLOUDFLARE_GATEWAY_ID
```

### EXA_API_KEY

Read 3 times, in 2 files. Value: string, read as set.

Source: [`core/src/tool/websearch.ts:81`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L81), [`opencode/src/tool/mcp-websearch.ts:4`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/mcp-websearch.ts#L4), [`opencode/src/tool/mcp-websearch.ts:5`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/mcp-websearch.ts#L5)

```typescript
exaApiKey: process.env.EXA_API_KEY,
export const EXA_URL = process.env.EXA_API_KEY
? `https://mcp.exa.ai/mcp?exaApiKey=${encodeURIComponent(process.env.EXA_API_KEY)}`
```

### GCLOUD_PROJECT

Read 3 times, in core/src/plugin/provider/google-vertex.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/google-vertex.ts:13`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L13), [`core/src/plugin/provider/google-vertex.ts:127`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L127), [`core/src/plugin/provider/google-vertex.ts:147`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L147)

```typescript
process.env.GCLOUD_PROJECT
: (process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT ?? process.env.GCLOUD_PROJECT)
```

### GCP_PROJECT

Read 3 times, in core/src/plugin/provider/google-vertex.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/google-vertex.ts:12`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L12), [`core/src/plugin/provider/google-vertex.ts:126`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L126), [`core/src/plugin/provider/google-vertex.ts:147`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L147)

```typescript
process.env.GCP_PROJECT ??
: (process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT ?? process.env.GCLOUD_PROJECT)
```

### GITLAB_INSTANCE_URL

Read once, in core/src/plugin/provider/gitlab.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/gitlab.ts:19`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/gitlab.ts#L19)

```typescript
: (process.env.GITLAB_INSTANCE_URL ?? "https://gitlab.com"),
```

### GITLAB_TOKEN

Read once, in core/src/plugin/provider/gitlab.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/gitlab.ts:20`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/gitlab.ts#L20)

```typescript
apiKey: typeof evt.options.apiKey === "string" ? evt.options.apiKey : process.env.GITLAB_TOKEN,
```

### GOOGLE_CLOUD_LOCATION

Read 3 times, in core/src/plugin/provider/google-vertex.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/google-vertex.ts:21`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L21), [`core/src/plugin/provider/google-vertex.ts:130`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L130), [`core/src/plugin/provider/google-vertex.ts:151`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L151)

```typescript
process.env.GOOGLE_CLOUD_LOCATION ??
: (process.env.GOOGLE_CLOUD_LOCATION ?? process.env.VERTEX_LOCATION ?? "global")
```

### GOOGLE_CLOUD_PROJECT

Read 3 times, in core/src/plugin/provider/google-vertex.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/google-vertex.ts:11`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L11), [`core/src/plugin/provider/google-vertex.ts:125`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L125), [`core/src/plugin/provider/google-vertex.ts:147`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L147)

```typescript
process.env.GOOGLE_CLOUD_PROJECT ??
: (process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT ?? process.env.GCLOUD_PROJECT)
```

### GOOGLE_VERTEX_LOCATION

Read once, in core/src/plugin/provider/google-vertex.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/google-vertex.ts:20`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L20)

```typescript
process.env.GOOGLE_VERTEX_LOCATION ??
```

### GOOGLE_VERTEX_PROJECT

Read once, in core/src/plugin/provider/google-vertex.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/google-vertex.ts:10`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L10)

```typescript
process.env.GOOGLE_VERTEX_PROJECT ??
```

### MODAL_PROXY_TOKEN

Read once, in opencode/src/plugin/modal/modal.ts. Value: string, read as set.

Source: [`opencode/src/plugin/modal/modal.ts:9`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/modal/modal.ts#L9)

```typescript
const apiKey = ctx.auth?.type === "api" ? ctx.auth.key : process.env.MODAL_PROXY_TOKEN
```

### OPENCODE_API_KEY

Read once, in core/src/plugin/provider/opencode.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/opencode.ts:176`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/opencode.ts#L176)

```typescript
const hasKey = Boolean(process.env.OPENCODE_API_KEY || connected || item.provider.request.body.apiKey)
```

### OPENCODE_AUTH_CONTENT

Read 2 times, in opencode/src/auth/index.ts. Value: string, read as set.

Source: [`opencode/src/auth/index.ts:59`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/auth/index.ts#L59), [`opencode/src/auth/index.ts:61`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/auth/index.ts#L61)

```typescript
if (process.env.OPENCODE_AUTH_CONTENT) {
return JSON.parse(process.env.OPENCODE_AUTH_CONTENT)
```

### OPENCODE_CONSOLE_TOKEN

Read once, in opencode/src/config/config.ts. Value: string, read as set.

Source: [`opencode/src/config/config.ts:505`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/config/config.ts#L505)

```typescript
process.env["OPENCODE_CONSOLE_TOKEN"] = tokenOpt.value
```

### OPENCODE_ENABLE_EXA

Read once, in core/src/tool/websearch.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/tool/websearch.ts:79`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L79)

```typescript
enableExa: truthy("OPENCODE_EXPERIMENTAL") || truthy("OPENCODE_ENABLE_EXA") || truthy("OPENCODE_EXPERIMENTAL_EXA"),
```

### OPENCODE_ENABLE_PARALLEL

Read once, in core/src/tool/websearch.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/tool/websearch.ts:80`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L80)

```typescript
enableParallel: truthy("OPENCODE_ENABLE_PARALLEL") || truthy("OPENCODE_EXPERIMENTAL_PARALLEL"),
```

### OPENCODE_WEBSEARCH_PROVIDER

Read 4 times, in 2 files. Value: string, read as set.

Source: [`core/src/tool/websearch.ts:76`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L76), [`core/src/tool/websearch.ts:76`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L76), [`core/src/tool/websearch.ts:77`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L77), [`opencode/src/tool/websearch.ts:31`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L31)

```typescript
process.env.OPENCODE_WEBSEARCH_PROVIDER === "exa" || process.env.OPENCODE_WEBSEARCH_PROVIDER === "parallel"
? process.env.OPENCODE_WEBSEARCH_PROVIDER
const override = process.env.OPENCODE_WEBSEARCH_PROVIDER
```

### PARALLEL_API_KEY

Read 3 times, in 2 files. Value: string, read as set.

Source: [`core/src/tool/websearch.ts:82`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L82), [`opencode/src/tool/websearch.ts:56`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L56), [`opencode/src/tool/websearch.ts:57`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L57)

```typescript
parallelApiKey: process.env.PARALLEL_API_KEY,
if (!process.env.PARALLEL_API_KEY) return headers
return { ...headers, Authorization: `Bearer ${process.env.PARALLEL_API_KEY}` }
```

### SNOWFLAKE_CORTEX_PAT

Read once, in core/src/plugin/provider/snowflake-cortex.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/snowflake-cortex.ts:75`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/snowflake-cortex.ts#L75)

```typescript
process.env.SNOWFLAKE_CORTEX_PAT ??
```

### SNOWFLAKE_CORTEX_TOKEN

Read once, in core/src/plugin/provider/snowflake-cortex.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/snowflake-cortex.ts:74`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/snowflake-cortex.ts#L74)

```typescript
process.env.SNOWFLAKE_CORTEX_TOKEN ??
```

### VERTEX_LOCATION

Read 3 times, in core/src/plugin/provider/google-vertex.ts. Value: string, read as set.

Source: [`core/src/plugin/provider/google-vertex.ts:22`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L22), [`core/src/plugin/provider/google-vertex.ts:131`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L131), [`core/src/plugin/provider/google-vertex.ts:151`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L151)

```typescript
process.env.VERTEX_LOCATION ??
: (process.env.GOOGLE_CLOUD_LOCATION ?? process.env.VERTEX_LOCATION ?? "global")
```

## Configuration, data and paths

### OPENCODE_CONFIG

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:21`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L21)

```typescript
OPENCODE_CONFIG: process.env["OPENCODE_CONFIG"],
```

### OPENCODE_CONFIG_CONTENT

Read 3 times, in 2 files. Value: string, read as set.

Source: [`core/src/flag/flag.ts:22`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L22), [`opencode/src/config/config.ts:482`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/config/config.ts#L482), [`opencode/src/config/config.ts:484`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/config/config.ts#L484)

```typescript
OPENCODE_CONFIG_CONTENT: process.env["OPENCODE_CONFIG_CONTENT"],
if (process.env.OPENCODE_CONFIG_CONTENT) {
const next = yield* loadConfig(process.env.OPENCODE_CONFIG_CONTENT, {
```

### OPENCODE_CONFIG_DIR

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:64`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L64)

```typescript
return process.env["OPENCODE_CONFIG_DIR"]
```

### OPENCODE_DB

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:47`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L47)

```typescript
OPENCODE_DB: process.env["OPENCODE_DB"],
```

### OPENCODE_DISABLE_CHANNEL_DB

Read 2 times, in core/src/database/database.ts. Value: string, read as set.

Source: [`core/src/database/database.ts:50`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/database/database.ts#L50), [`core/src/database/database.ts:51`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/database/database.ts#L51)

```typescript
process.env.OPENCODE_DISABLE_CHANNEL_DB === "1" ||
process.env.OPENCODE_DISABLE_CHANNEL_DB === "true"
```

### OPENCODE_DISABLE_MODELS_FETCH

Read once, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:29`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L29)

```typescript
OPENCODE_DISABLE_MODELS_FETCH: truthy("OPENCODE_DISABLE_MODELS_FETCH"),
```

### OPENCODE_DISABLE_PROJECT_CONFIG

Read once, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:55`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L55)

```typescript
return truthy("OPENCODE_DISABLE_PROJECT_CONFIG")
```

### OPENCODE_MODELS_PATH

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:46`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L46)

```typescript
OPENCODE_MODELS_PATH: process.env["OPENCODE_MODELS_PATH"],
```

### OPENCODE_MODELS_URL

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:45`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L45)

```typescript
OPENCODE_MODELS_URL: process.env["OPENCODE_MODELS_URL"],
```

### OPENCODE_PERMISSION

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:70`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L70)

```typescript
return process.env["OPENCODE_PERMISSION"]
```

### OPENCODE_PLUGIN_META_FILE

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:73`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L73)

```typescript
return process.env["OPENCODE_PLUGIN_META_FILE"]
```

### OPENCODE_PURE

Read 2 times, in 2 files. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:67`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L67), [`opencode/src/index.ts:70`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L70)

```typescript
return truthy("OPENCODE_PURE")
process.env.OPENCODE_PURE = "1"
```

### OPENCODE_TEST_HOME

Read once, in core/src/global.ts. Value: string, read as set.

Source: [`core/src/global.ts:19`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/global.ts#L19)

```typescript
return process.env.OPENCODE_TEST_HOME ?? os.homedir()
```

### OPENCODE_TEST_MANAGED_CONFIG_DIR

Read once, in opencode/src/config/managed.ts. Value: string, read as set.

Source: [`opencode/src/config/managed.ts:32`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/config/managed.ts#L32)

```typescript
return process.env.OPENCODE_TEST_MANAGED_CONFIG_DIR || systemManagedConfigDir()
```

### OPENCODE_TUI_CONFIG

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:61`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L61)

```typescript
return process.env["OPENCODE_TUI_CONFIG"]
```

### OPENCODE_ZED_DB

Read once, in tui/src/editor-zed.ts. Value: string, read as set.

Source: [`tui/src/editor-zed.ts:189`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/editor-zed.ts#L189)

```typescript
process.env.OPENCODE_ZED_DB,
```

### XDG_CONFIG_HOME

Read once, in opencode/src/cli/cmd/uninstall.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/uninstall.ts:238`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/uninstall.ts#L238)

```typescript
const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, ".config")
```

## Server, sharing and GitHub

### AGENT

Read once, in opencode/src/index.ts. Value: string, read as set.

Source: [`opencode/src/index.ts:75`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L75)

```typescript
process.env.AGENT = "1"
```

### GITHUB_RUN_ID

Read once, in opencode/src/cli/cmd/github.handler.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/github.handler.ts:675`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L675)

```typescript
const value = process.env["GITHUB_RUN_ID"]
```

### GITHUB_TOKEN

Read once, in opencode/src/cli/cmd/github.handler.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/github.handler.ts:474`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L474)

```typescript
const githubToken = process.env["GITHUB_TOKEN"]
```

### MENTIONS

Read once, in opencode/src/cli/cmd/github.handler.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/github.handler.ts:747`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L747)

```typescript
const mentions = (process.env["MENTIONS"] || "/opencode,/oc")
```

### MODEL

Read once, in opencode/src/cli/cmd/github.handler.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/github.handler.ts:664`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L664)

```typescript
const value = process.env["MODEL"]
```

### OPENCODE_CALLER

Read 2 times, in opencode/src/ide/index.ts. Value: string, read as set.

Source: [`opencode/src/ide/index.ts:33`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/ide/index.ts#L33), [`opencode/src/ide/index.ts:33`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/ide/index.ts#L33)

```typescript
return process.env["OPENCODE_CALLER"] === "vscode" || process.env["OPENCODE_CALLER"] === "vscode-insiders"
```

### OPENCODE_CLIENT

Read 3 times, in 3 files. Value: string, read as set; default "cli".

Source: [`core/src/flag/flag.ts:76`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L76), [`opencode/src/cli/cmd/acp.ts:23`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/acp.ts#L23), [`opencode/src/effect/runtime-flags.ts:56`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L56)

```typescript
return process.env["OPENCODE_CLIENT"] ?? "cli"
process.env.OPENCODE_CLIENT = "acp"
client: Config.string("OPENCODE_CLIENT").pipe(Config.withDefault("cli")),
```

### OPENCODE_DISABLE_SHARE

Read 2 times, in opencode/src/share/share-next.ts. Value: string, read as set.

Source: [`opencode/src/share/share-next.ts:23`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/share/share-next.ts#L23), [`opencode/src/share/share-next.ts:23`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/share/share-next.ts#L23)

```typescript
const disabled = process.env["OPENCODE_DISABLE_SHARE"] === "true" || process.env["OPENCODE_DISABLE_SHARE"] === "1"
```

### OPENCODE_REPO_CLONE_GITHUB_BASE_URL

Read 2 times, in 2 files. Value: string, read as set.

Source: [`core/src/repository.ts:175`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/repository.ts#L175), [`opencode/src/util/repository.ts:100`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/util/repository.ts#L100)

```typescript
const base = process.env.OPENCODE_REPO_CLONE_GITHUB_BASE_URL
```

### OPENCODE_ROUTE

Read 2 times, in tui/src/app.tsx. Value: string, read as set.

Source: [`tui/src/app.tsx:277`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L277), [`tui/src/app.tsx:277`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L277)

```typescript
initialRoute: process.env.OPENCODE_ROUTE ? JSON.parse(process.env.OPENCODE_ROUTE) : undefined,
```

### OPENCODE_SERVER_PASSWORD

Read 3 times, in 3 files. Value: string, read as set.

Source: [`core/src/flag/flag.ts:32`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L32), [`opencode/src/effect/config-service.ts:33`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/config-service.ts#L33), [`server/src/auth.ts:53`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/server/src/auth.ts#L53)

```typescript
OPENCODE_SERVER_PASSWORD: process.env["OPENCODE_SERVER_PASSWORD"],
*     password: Config.string("OPENCODE_SERVER_PASSWORD").pipe(Config.option),
const password = credentials?.password ?? process.env.OPENCODE_SERVER_PASSWORD
```

### OPENCODE_SERVER_USERNAME

Read 3 times, in 3 files. Value: string, read as set; default "opencode".

Source: [`core/src/flag/flag.ts:33`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L33), [`opencode/src/effect/config-service.ts:34`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/config-service.ts#L34), [`server/src/auth.ts:56`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/server/src/auth.ts#L56)

```typescript
OPENCODE_SERVER_USERNAME: process.env["OPENCODE_SERVER_USERNAME"],
*     username: Config.string("OPENCODE_SERVER_USERNAME").pipe(Config.withDefault("opencode")),
return `Basic ${Buffer.from(`${credentials?.username ?? process.env.OPENCODE_SERVER_USERNAME ?? "opencode"}:${password}`).toString("base64")}`
```

### OPENCODE_WORKSPACE_ID

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:49`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L49)

```typescript
OPENCODE_WORKSPACE_ID: process.env["OPENCODE_WORKSPACE_ID"],
```

### PROMPT

Read once, in opencode/src/cli/cmd/github.handler.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/github.handler.ts:732`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L732)

```typescript
const customPrompt = process.env["PROMPT"]
```

### SHARE

Read once, in opencode/src/cli/cmd/github.handler.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/github.handler.ts:681`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L681)

```typescript
const value = process.env["SHARE"]
```

### USE_GITHUB_TOKEN

Read once, in opencode/src/cli/cmd/github.handler.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/github.handler.ts:689`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L689)

```typescript
const value = process.env["USE_GITHUB_TOKEN"]
```

### VARIANT

Read once, in opencode/src/cli/cmd/github.handler.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/github.handler.ts:408`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L408)

```typescript
const variant = process.env["VARIANT"] || undefined
```

## Logging, tracing and diagnostics

### OPENCODE_AUTO_HEAP_SNAPSHOT

Read once, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:19`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L19)

```typescript
OPENCODE_AUTO_HEAP_SNAPSHOT: truthy("OPENCODE_AUTO_HEAP_SNAPSHOT"),
```

### OPENCODE_DIRECT_TRACE

Read once, in opencode/src/cli/cmd/run/trace.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/run/trace.ts:58`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run/trace.ts#L58)

```typescript
if (!process.env.OPENCODE_DIRECT_TRACE) {
```

### OPENCODE_LOG_LEVEL

Read 3 times, in 3 files. Value: string, read as set.

Source: [`core/src/observability/logging.ts:57`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/observability/logging.ts#L57), [`opencode/src/index.ts:68`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L68), [`opencode/src/temporary.ts:28`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/temporary.ts#L28)

```typescript
const value = process.env.OPENCODE_LOG_LEVEL?.toUpperCase()
if (opts.logLevel) process.env.OPENCODE_LOG_LEVEL = opts.logLevel
```

### OPENCODE_PRINT_LOGS

Read 3 times, in 3 files. Value: string, read as set.

Source: [`core/src/observability/logging.ts:68`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/observability/logging.ts#L68), [`opencode/src/index.ts:67`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L67), [`opencode/src/temporary.ts:27`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/temporary.ts#L27)

```typescript
return process.env.OPENCODE_PRINT_LOGS === "1" ? [fileLogger(), stderrLogger] : [fileLogger()]
if (opts.printLogs) process.env.OPENCODE_PRINT_LOGS = "1"
```

### OPENCODE_SHOW_TTFD

Read once, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:27`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L27)

```typescript
OPENCODE_SHOW_TTFD: truthy("OPENCODE_SHOW_TTFD"),
```

### OTEL_EXPORTER_OTLP_ENDPOINT

Read 2 times, in 2 files. Value: string, read as set.

Source: [`core/src/flag/flag.ts:16`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L16), [`opencode/src/control-plane/workspace.ts:534`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/control-plane/workspace.ts#L534)

```typescript
OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
```

### OTEL_EXPORTER_OTLP_HEADERS

Read 2 times, in 2 files. Value: string, read as set.

Source: [`core/src/flag/flag.ts:17`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L17), [`opencode/src/control-plane/workspace.ts:533`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/control-plane/workspace.ts#L533)

```typescript
OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],
OTEL_EXPORTER_OTLP_HEADERS: process.env.OTEL_EXPORTER_OTLP_HEADERS,
```

### OTEL_RESOURCE_ATTRIBUTES

Read 2 times, in 2 files. Value: string, read as set.

Source: [`core/src/observability/otlp.ts:21`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/observability/otlp.ts#L21), [`opencode/src/control-plane/workspace.ts:535`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/control-plane/workspace.ts#L535)

```typescript
const value = process.env.OTEL_RESOURCE_ATTRIBUTES
OTEL_RESOURCE_ATTRIBUTES: process.env.OTEL_RESOURCE_ATTRIBUTES,
```

## Session and editor behavior

### CLAUDE_CODE_SSE_PORT

Read once, in tui/src/context/editor.ts. Value: string, read as set.

Source: [`tui/src/context/editor.ts:117`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/context/editor.ts#L117)

```typescript
const value = process.env.CLAUDE_CODE_SSE_PORT || process.env.OPENCODE_EDITOR_SSE_PORT
```

### OPENCODE_ACP_PROFILE

Read once, in opencode/src/acp/profile.ts. Value: string, read as set.

Source: [`opencode/src/acp/profile.ts:1`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/acp/profile.ts#L1)

```typescript
const enabled = process.env.OPENCODE_ACP_PROFILE === "1"
```

### OPENCODE_ALWAYS_NOTIFY_UPDATE

Read once, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:24`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L24)

```typescript
OPENCODE_ALWAYS_NOTIFY_UPDATE: truthy("OPENCODE_ALWAYS_NOTIFY_UPDATE"),
```

### OPENCODE_BUMP

Read once, in script/src/index.ts. Value: string, read as set.

Source: [`script/src/index.ts:22`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/script/src/index.ts#L22)

```typescript
OPENCODE_BUMP: process.env["OPENCODE_BUMP"],
```

### OPENCODE_CHANNEL

Read once, in script/src/index.ts. Value: string, read as set.

Source: [`script/src/index.ts:21`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/script/src/index.ts#L21)

```typescript
OPENCODE_CHANNEL: process.env["OPENCODE_CHANNEL"],
```

### OPENCODE_DISABLE_AUTOCOMPACT

Read once, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:28`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L28)

```typescript
OPENCODE_DISABLE_AUTOCOMPACT: truthy("OPENCODE_DISABLE_AUTOCOMPACT"),
```

### OPENCODE_DISABLE_AUTOUPDATE

Read once, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:23`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L23)

```typescript
OPENCODE_DISABLE_AUTOUPDATE: truthy("OPENCODE_DISABLE_AUTOUPDATE"),
```

### OPENCODE_DISABLE_FFF

Read 2 times, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:9`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L9), [`core/src/flag/flag.ts:34`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L34)

```typescript
const fff = process.env["OPENCODE_DISABLE_FFF"]
OPENCODE_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("OPENCODE_DISABLE_FFF"),
```

### OPENCODE_DISABLE_MOUSE

Read once, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:30`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L30)

```typescript
OPENCODE_DISABLE_MOUSE: truthy("OPENCODE_DISABLE_MOUSE"),
```

### OPENCODE_DISABLE_PRUNE

Read once, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:25`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L25)

```typescript
OPENCODE_DISABLE_PRUNE: truthy("OPENCODE_DISABLE_PRUNE"),
```

### OPENCODE_DISABLE_TERMINAL_TITLE

Read once, in core/src/flag/flag.ts. Value: boolean: true when set to "true" or "1".

Source: [`core/src/flag/flag.ts:26`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L26)

```typescript
OPENCODE_DISABLE_TERMINAL_TITLE: truthy("OPENCODE_DISABLE_TERMINAL_TITLE"),
```

### OPENCODE_EDITOR_SSE_PORT

Read once, in tui/src/context/editor.ts. Value: string, read as set.

Source: [`tui/src/context/editor.ts:117`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/context/editor.ts#L117)

```typescript
const value = process.env.CLAUDE_CODE_SSE_PORT || process.env.OPENCODE_EDITOR_SSE_PORT
```

### OPENCODE_FAKE_VCS

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:31`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L31)

```typescript
OPENCODE_FAKE_VCS: process.env["OPENCODE_FAKE_VCS"],
```

### OPENCODE_FAST_BOOT

Read once, in tui/src/app.tsx. Value: string, read as set.

Source: [`tui/src/app.tsx:278`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L278)

```typescript
skipInitialLoading: Boolean(process.env.OPENCODE_FAST_BOOT),
```

### OPENCODE_GIT_BASH_PATH

Read once, in core/src/flag/flag.ts. Value: string, read as set.

Source: [`core/src/flag/flag.ts:20`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L20)

```typescript
OPENCODE_GIT_BASH_PATH: process.env["OPENCODE_GIT_BASH_PATH"],
```

### OPENCODE_PID

Read once, in opencode/src/index.ts. Value: string, read as set.

Source: [`opencode/src/index.ts:77`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L77)

```typescript
process.env.OPENCODE_PID = String(process.pid)
```

### OPENCODE_RELEASE

Read once, in script/src/index.ts. Value: string, read as set.

Source: [`script/src/index.ts:24`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/script/src/index.ts#L24)

```typescript
OPENCODE_RELEASE: process.env["OPENCODE_RELEASE"],
```

### OPENCODE_VERSION

Read once, in script/src/index.ts. Value: string, read as set.

Source: [`script/src/index.ts:23`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/script/src/index.ts#L23)

```typescript
OPENCODE_VERSION: process.env["OPENCODE_VERSION"],
```

### VSCODE_EXTENSIONS

Read once, in opencode/src/lsp/server.ts. Value: string, read as set.

Source: [`opencode/src/lsp/server.ts:789`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/lsp/server.ts#L789)

```typescript
process.env.VSCODE_EXTENSIONS,
```

### ZED_TERM

Read 2 times, in 2 files. Value: string, read as set.

Source: [`tui/src/context/editor.ts:121`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/context/editor.ts#L121), [`tui/src/editor-zed.ts:198`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/editor-zed.ts#L198)

```typescript
const zedTerminal = process.env.ZED_TERM === "true" || process.env.TERM_PROGRAM?.toLowerCase() === "zed"
return process.env.ZED_TERM === "true" || process.env.TERM_PROGRAM?.toLowerCase() === "zed"
```

## Host environment

### COMSPEC

Read 2 times, in 2 files. Value: string, read as set.

Source: [`core/src/shell.ts:101`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/shell.ts#L101), [`core/src/tool/bash.ts:49`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/bash.ts#L49)

```typescript
[which("pwsh"), which("powershell"), gitbash(), process.env.COMSPEC || "cmd.exe"]
const defaultShell = () => (process.platform === "win32" ? (process.env.COMSPEC ?? "cmd.exe") : "/bin/sh")
```

### DISPLAY

Read once, in tui/src/app.tsx. Value: string, read as set.

Source: [`tui/src/app.tsx:270`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L270)

```typescript
: process.env.DISPLAY
```

### DOTNET_CLI_HOME

Read once, in opencode/src/lsp/server.ts. Value: string, read as set.

Source: [`opencode/src/lsp/server.ts:779`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/lsp/server.ts#L779)

```typescript
process.env.DOTNET_CLI_HOME ?? os.homedir(),
```

### EDITOR

Read once, in tui/src/editor.ts. Value: string, read as set.

Source: [`tui/src/editor.ts:27`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/editor.ts#L27)

```typescript
const editor = process.env.VISUAL || process.env.EDITOR
```

### GIT_ASKPASS

Read once, in opencode/src/ide/index.ts. Value: string, read as set.

Source: [`opencode/src/ide/index.ts:24`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/ide/index.ts#L24)

```typescript
const v = process.env["GIT_ASKPASS"]
```

### OIDC_BASE_URL

Read once, in opencode/src/cli/cmd/github.handler.ts. Value: string, read as set.

Source: [`opencode/src/cli/cmd/github.handler.ts:697`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L697)

```typescript
const value = process.env["OIDC_BASE_URL"]
```

### OPENCODE

Read once, in opencode/src/index.ts. Value: string, read as set.

Source: [`opencode/src/index.ts:76`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L76)

```typescript
process.env.OPENCODE = "1"
```

### PATH

Read once, in core/src/util/which.ts. Value: string, read as set.

Source: [`core/src/util/which.ts:6`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/util/which.ts#L6)

```typescript
const base = env?.PATH ?? env?.Path ?? process.env.PATH ?? process.env.Path ?? ""
```

### PATHEXT

Read once, in core/src/util/which.ts. Value: string, read as set.

Source: [`core/src/util/which.ts:11`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/util/which.ts#L11)

```typescript
pathExt: env?.PATHEXT ?? env?.PathExt ?? process.env.PATHEXT ?? process.env.PathExt,
```

### PWD

Read 2 times, in 2 files. Value: string, read as set.

Source: [`opencode/src/cli/cmd/run.ts:333`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L333), [`opencode/src/cli/cmd/tui.ts:66`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L66)

```typescript
const root = Filesystem.resolve(process.env.PWD ?? process.cwd())
export function resolveThreadDirectory(project?: string, envPWD = process.env.PWD, cwd = process.cwd()) {
```

### SHELL

Read 3 times, in 2 files. Value: string, read as set.

Source: [`core/src/shell.ts:207`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/shell.ts#L207), [`core/src/shell.ts:216`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/shell.ts#L216), [`opencode/src/cli/cmd/uninstall.ts:236`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/uninstall.ts#L236)

```typescript
defaultPreferred ??= select(process.env.SHELL)
defaultAcceptable ??= select(process.env.SHELL, { acceptable: true })
const shell = path.basename(process.env.SHELL || "bash")
```

### STY

Read 3 times, in 3 files. Value: string, read as set.

Source: [`tui/src/app.tsx:267`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L267), [`tui/src/clipboard.ts:27`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/clipboard.ts#L27), [`tui/src/util/system.ts:18`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L18)

```typescript
multiplexer: process.env.TMUX ? "tmux" : process.env.STY ? "screen" : undefined,
process.stdout.write(process.env.TMUX ? sequence + passthrough : process.env.STY ? passthrough : sequence)
const multiplexer = process.env.TMUX ? " in tmux" : process.env.STY ? " in screen" : ""
```

### TERM

Read 2 times, in 2 files. Value: string, read as set.

Source: [`opencode/src/cli/cmd/debug/index.ts:59`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L59), [`tui/src/util/system.ts:16`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L16)

```typescript
const terminal = [termProgram, process.env.TERM].filter((item): item is string => Boolean(item)).join(" / ")
const program = process.env.TERM_PROGRAM || process.env.TERM || "unknown"
```

### TERM_PROGRAM

Read 6 times, in 5 files. Value: string, read as set.

Source: [`opencode/src/cli/cmd/debug/index.ts:56`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L56), [`opencode/src/cli/cmd/debug/index.ts:57`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L57), [`opencode/src/ide/index.ts:23`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/ide/index.ts#L23), [`tui/src/context/editor.ts:121`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/context/editor.ts#L121) and 2 more

```typescript
const termProgram = process.env.TERM_PROGRAM
? `${process.env.TERM_PROGRAM}${process.env.TERM_PROGRAM_VERSION ? ` ${process.env.TERM_PROGRAM_VERSION}` : ""}`
if (process.env["TERM_PROGRAM"] === "vscode") {
```

### TERM_PROGRAM_VERSION

Read 4 times, in 2 files. Value: string, read as set.

Source: [`opencode/src/cli/cmd/debug/index.ts:57`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L57), [`opencode/src/cli/cmd/debug/index.ts:57`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L57), [`tui/src/util/system.ts:17`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L17), [`tui/src/util/system.ts:17`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L17)

```typescript
? `${process.env.TERM_PROGRAM}${process.env.TERM_PROGRAM_VERSION ? ` ${process.env.TERM_PROGRAM_VERSION}` : ""}`
const version = process.env.TERM_PROGRAM_VERSION ? ` ${process.env.TERM_PROGRAM_VERSION}` : ""
```

### TMUX

Read 3 times, in 3 files. Value: string, read as set.

Source: [`tui/src/app.tsx:267`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L267), [`tui/src/clipboard.ts:27`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/clipboard.ts#L27), [`tui/src/util/system.ts:18`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L18)

```typescript
multiplexer: process.env.TMUX ? "tmux" : process.env.STY ? "screen" : undefined,
process.stdout.write(process.env.TMUX ? sequence + passthrough : process.env.STY ? passthrough : sequence)
const multiplexer = process.env.TMUX ? " in tmux" : process.env.STY ? " in screen" : ""
```

### VIRTUAL_ENV

Read 2 times, in opencode/src/lsp/server.ts. Value: string, read as set.

Source: [`opencode/src/lsp/server.ts:445`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/lsp/server.ts#L445), [`opencode/src/lsp/server.ts:502`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/lsp/server.ts#L502)

```typescript
const potentialVenvPaths = [process.env["VIRTUAL_ENV"], path.join(root, ".venv"), path.join(root, "venv")].filter(
```

### VISUAL

Read once, in tui/src/editor.ts. Value: string, read as set.

Source: [`tui/src/editor.ts:27`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/editor.ts#L27)

```typescript
const editor = process.env.VISUAL || process.env.EDITOR
```

### WAYLAND_DISPLAY

Read 2 times, in 2 files. Value: string, read as set.

Source: [`tui/src/app.tsx:268`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L268), [`tui/src/clipboard.ts:102`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/clipboard.ts#L102)

```typescript
displayServer: process.env.WAYLAND_DISPLAY
const native = copyCommand(platform(), Boolean(process.env.WAYLAND_DISPLAY), (name) => Boolean(which(name)))
```
