# OpenCode environment variables

Release: v1.18.34. Upstream commit: aec0b9a6d8898f68f923aaf08b7306d931fd9d76.

These records derive only from public upstream source. Conditions describe possible harness behavior; they do not establish that any text was sent in a session. Runtime configuration, plugins, MCP servers, provider catalogs and SDK serialization can change a request. Private recordings are not inputs to this extractor. Source excerpts are copyright (c) 2025 opencode, under the [upstream MIT license](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/LICENSE); its notice is preserved in upstream-license.txt.

Read structurally from every non-test source file in the pinned workspace closure. 131 records.

## Other variables

### AGENT

AGENT is read once through process.env in packages/opencode/src/index.ts.

Read through: process.env.

- [packages/opencode/src/index.ts:75](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L75)

### AICORE_DEPLOYMENT_ID

AICORE_DEPLOYMENT_ID is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/plugin/provider/sap-ai-core.ts:34](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/sap-ai-core.ts#L34)
- [packages/opencode/src/provider/provider.ts:628](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L628)

### AICORE_RESOURCE_GROUP

AICORE_RESOURCE_GROUP is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/plugin/provider/sap-ai-core.ts:34](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/sap-ai-core.ts#L34)
- [packages/opencode/src/provider/provider.ts:629](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L629)

### AICORE_SERVICE_KEY

AICORE_SERVICE_KEY is read 5 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/plugin/provider/sap-ai-core.ts:15](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/sap-ai-core.ts#L15)
- [packages/core/src/plugin/provider/sap-ai-core.ts:17](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/sap-ai-core.ts#L17)
- [packages/core/src/plugin/provider/sap-ai-core.ts:17](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/sap-ai-core.ts#L17)
- [packages/opencode/src/provider/provider.ts:620](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L620)
- [packages/opencode/src/provider/provider.ts:623](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L623)

### AWS_BEARER_TOKEN_BEDROCK

AWS_BEARER_TOKEN_BEDROCK is read 5 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/plugin/provider/amazon-bedrock.ts:96](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L96)
- [packages/core/src/plugin/provider/amazon-bedrock.ts:98](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L98)
- [packages/core/src/plugin/provider/amazon-bedrock.ts:98](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L98)
- [packages/opencode/src/provider/provider.ts:357](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L357)
- [packages/opencode/src/provider/provider.ts:360](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L360)

### AWS_CONTAINER_CREDENTIALS_FULL_URI

AWS_CONTAINER_CREDENTIALS_FULL_URI is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/plugin/provider/amazon-bedrock.ts:100](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L100)
- [packages/opencode/src/provider/provider.ts:369](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L369)

### AWS_CONTAINER_CREDENTIALS_RELATIVE_URI

AWS_CONTAINER_CREDENTIALS_RELATIVE_URI is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/plugin/provider/amazon-bedrock.ts:100](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L100)
- [packages/opencode/src/provider/provider.ts:369](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L369)

### AWS_PROFILE

AWS_PROFILE is read once through process.env in packages/core/src/plugin/provider/amazon-bedrock.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/amazon-bedrock.ts:93](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L93)

### AWS_REGION

AWS_REGION is read 2 times through process.env in packages/core/src/plugin/provider/amazon-bedrock.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/amazon-bedrock.ts:94](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L94)
- [packages/core/src/plugin/provider/amazon-bedrock.ts:129](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/amazon-bedrock.ts#L129)

### AZURE_COGNITIVE_SERVICES_RESOURCE_NAME

AZURE_COGNITIVE_SERVICES_RESOURCE_NAME is read once through process.env in packages/core/src/plugin/provider/azure.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/azure.ts:63](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/azure.ts#L63)

### AZURE_RESOURCE_NAME

AZURE_RESOURCE_NAME is read 3 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/plugin/provider/azure.ts:23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/azure.ts#L23)
- [packages/opencode/src/plugin/azure.ts:46](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/azure.ts#L46)
- [packages/opencode/src/plugin/azure.ts:89](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/azure.ts#L89)

### CF_AIG_TOKEN

CF_AIG_TOKEN is read once through process.env in packages/core/src/plugin/provider/cloudflare-ai-gateway.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:58](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-ai-gateway.ts#L58)

### CLAUDE_CODE_SSE_PORT

CLAUDE_CODE_SSE_PORT is read once through process.env in packages/tui/src/context/editor.ts.

Read through: process.env.

- [packages/tui/src/context/editor.ts:117](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/context/editor.ts#L117)

### CLOUDFLARE_ACCOUNT_ID

CLOUDFLARE_ACCOUNT_ID is read 5 times through process.env in 3 files.

Read through: process.env.

- [packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:53](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-ai-gateway.ts#L53)
- [packages/core/src/plugin/provider/cloudflare-workers-ai.ts:50](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-workers-ai.ts#L50)
- [packages/core/src/plugin/provider/cloudflare-workers-ai.ts:76](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-workers-ai.ts#L76)
- [packages/opencode/src/plugin/cloudflare.ts:4](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/cloudflare.ts#L4)
- [packages/opencode/src/plugin/cloudflare.ts:31](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/cloudflare.ts#L31)

### CLOUDFLARE_API_KEY

CLOUDFLARE_API_KEY is read once through process.env in packages/core/src/plugin/provider/cloudflare-workers-ai.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/cloudflare-workers-ai.ts:65](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-workers-ai.ts#L65)

### CLOUDFLARE_API_TOKEN

CLOUDFLARE_API_TOKEN is read once through process.env in packages/core/src/plugin/provider/cloudflare-ai-gateway.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:58](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-ai-gateway.ts#L58)

### CLOUDFLARE_GATEWAY_ID

CLOUDFLARE_GATEWAY_ID is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:57](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/cloudflare-ai-gateway.ts#L57)
- [packages/opencode/src/plugin/cloudflare.ts:41](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/cloudflare.ts#L41)

### COMSPEC

COMSPEC is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/shell.ts:101](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/shell.ts#L101)
- [packages/core/src/tool/bash.ts:49](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/bash.ts#L49)

### DISPLAY

DISPLAY is read once through process.env in packages/tui/src/app.tsx.

Read through: process.env.

- [packages/tui/src/app.tsx:270](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L270)

### DOTNET_CLI_HOME

DOTNET_CLI_HOME is read once through process.env in packages/opencode/src/lsp/server.ts.

Read through: process.env.

- [packages/opencode/src/lsp/server.ts:779](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/lsp/server.ts#L779)

### EDITOR

EDITOR is read once through process.env in packages/tui/src/editor.ts.

Read through: process.env.

- [packages/tui/src/editor.ts:27](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/editor.ts#L27)

### EXA_API_KEY

EXA_API_KEY is read 3 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/tool/websearch.ts:81](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L81)
- [packages/opencode/src/tool/mcp-websearch.ts:4](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/mcp-websearch.ts#L4)
- [packages/opencode/src/tool/mcp-websearch.ts:5](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/mcp-websearch.ts#L5)

### GCLOUD_PROJECT

GCLOUD_PROJECT is read 3 times through process.env in packages/core/src/plugin/provider/google-vertex.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/google-vertex.ts:13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L13)
- [packages/core/src/plugin/provider/google-vertex.ts:127](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L127)
- [packages/core/src/plugin/provider/google-vertex.ts:147](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L147)

### GCP_PROJECT

GCP_PROJECT is read 3 times through process.env in packages/core/src/plugin/provider/google-vertex.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/google-vertex.ts:12](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L12)
- [packages/core/src/plugin/provider/google-vertex.ts:126](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L126)
- [packages/core/src/plugin/provider/google-vertex.ts:147](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L147)

### GIT_ASKPASS

GIT_ASKPASS is read once through process.env in packages/opencode/src/ide/index.ts.

Read through: process.env.

- [packages/opencode/src/ide/index.ts:24](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/ide/index.ts#L24)

### GITHUB_RUN_ID

GITHUB_RUN_ID is read once through process.env in packages/opencode/src/cli/cmd/github.handler.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/github.handler.ts:675](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L675)

### GITHUB_TOKEN

GITHUB_TOKEN is read once through process.env in packages/opencode/src/cli/cmd/github.handler.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/github.handler.ts:474](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L474)

### GITLAB_INSTANCE_URL

GITLAB_INSTANCE_URL is read once through process.env in packages/core/src/plugin/provider/gitlab.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/gitlab.ts:19](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/gitlab.ts#L19)

### GITLAB_TOKEN

GITLAB_TOKEN is read once through process.env in packages/core/src/plugin/provider/gitlab.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/gitlab.ts:20](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/gitlab.ts#L20)

### GOOGLE_CLOUD_LOCATION

GOOGLE_CLOUD_LOCATION is read 3 times through process.env in packages/core/src/plugin/provider/google-vertex.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/google-vertex.ts:21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L21)
- [packages/core/src/plugin/provider/google-vertex.ts:130](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L130)
- [packages/core/src/plugin/provider/google-vertex.ts:151](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L151)

### GOOGLE_CLOUD_PROJECT

GOOGLE_CLOUD_PROJECT is read 3 times through process.env in packages/core/src/plugin/provider/google-vertex.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/google-vertex.ts:11](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L11)
- [packages/core/src/plugin/provider/google-vertex.ts:125](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L125)
- [packages/core/src/plugin/provider/google-vertex.ts:147](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L147)

### GOOGLE_VERTEX_LOCATION

GOOGLE_VERTEX_LOCATION is read once through process.env in packages/core/src/plugin/provider/google-vertex.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/google-vertex.ts:20](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L20)

### GOOGLE_VERTEX_PROJECT

GOOGLE_VERTEX_PROJECT is read once through process.env in packages/core/src/plugin/provider/google-vertex.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/google-vertex.ts:10](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L10)

### MENTIONS

MENTIONS is read once through process.env in packages/opencode/src/cli/cmd/github.handler.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/github.handler.ts:747](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L747)

### MODAL_PROXY_TOKEN

MODAL_PROXY_TOKEN is read once through process.env in packages/opencode/src/plugin/modal/modal.ts.

Read through: process.env.

- [packages/opencode/src/plugin/modal/modal.ts:9](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/plugin/modal/modal.ts#L9)

### MODEL

MODEL is read once through process.env in packages/opencode/src/cli/cmd/github.handler.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/github.handler.ts:664](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L664)

### OIDC_BASE_URL

OIDC_BASE_URL is read once through process.env in packages/opencode/src/cli/cmd/github.handler.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/github.handler.ts:697](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L697)

### OPENCODE

OPENCODE is read once through process.env in packages/opencode/src/index.ts.

Read through: process.env.

- [packages/opencode/src/index.ts:76](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L76)

### OTEL_EXPORTER_OTLP_ENDPOINT

OTEL_EXPORTER_OTLP_ENDPOINT is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/flag/flag.ts:16](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L16)
- [packages/opencode/src/control-plane/workspace.ts:534](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/control-plane/workspace.ts#L534)

### OTEL_EXPORTER_OTLP_HEADERS

OTEL_EXPORTER_OTLP_HEADERS is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/flag/flag.ts:17](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L17)
- [packages/opencode/src/control-plane/workspace.ts:533](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/control-plane/workspace.ts#L533)

### OTEL_RESOURCE_ATTRIBUTES

OTEL_RESOURCE_ATTRIBUTES is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/observability/otlp.ts:21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/observability/otlp.ts#L21)
- [packages/opencode/src/control-plane/workspace.ts:535](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/control-plane/workspace.ts#L535)

### PARALLEL_API_KEY

PARALLEL_API_KEY is read 3 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/tool/websearch.ts:82](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L82)
- [packages/opencode/src/tool/websearch.ts:56](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L56)
- [packages/opencode/src/tool/websearch.ts:57](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L57)

### PATH

PATH is read once through process.env in packages/core/src/util/which.ts.

Read through: process.env.

- [packages/core/src/util/which.ts:6](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/util/which.ts#L6)

### PATHEXT

PATHEXT is read once through process.env in packages/core/src/util/which.ts.

Read through: process.env.

- [packages/core/src/util/which.ts:11](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/util/which.ts#L11)

### PROMPT

PROMPT is read once through process.env in packages/opencode/src/cli/cmd/github.handler.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/github.handler.ts:732](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L732)

### PWD

PWD is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/opencode/src/cli/cmd/run.ts:333](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L333)
- [packages/opencode/src/cli/cmd/tui.ts:66](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L66)

### SHARE

SHARE is read once through process.env in packages/opencode/src/cli/cmd/github.handler.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/github.handler.ts:681](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L681)

### SHELL

SHELL is read 3 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/shell.ts:207](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/shell.ts#L207)
- [packages/core/src/shell.ts:216](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/shell.ts#L216)
- [packages/opencode/src/cli/cmd/uninstall.ts:236](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/uninstall.ts#L236)

### SNOWFLAKE_CORTEX_PAT

SNOWFLAKE_CORTEX_PAT is read once through process.env in packages/core/src/plugin/provider/snowflake-cortex.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/snowflake-cortex.ts:75](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/snowflake-cortex.ts#L75)

### SNOWFLAKE_CORTEX_TOKEN

SNOWFLAKE_CORTEX_TOKEN is read once through process.env in packages/core/src/plugin/provider/snowflake-cortex.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/snowflake-cortex.ts:74](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/snowflake-cortex.ts#L74)

### STY

STY is read 3 times through process.env in 3 files.

Read through: process.env.

- [packages/tui/src/app.tsx:267](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L267)
- [packages/tui/src/clipboard.ts:27](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/clipboard.ts#L27)
- [packages/tui/src/util/system.ts:18](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L18)

### TERM

TERM is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/opencode/src/cli/cmd/debug/index.ts:59](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L59)
- [packages/tui/src/util/system.ts:16](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L16)

### TERM_PROGRAM

TERM_PROGRAM is read 6 times through process.env in 5 files.

Read through: process.env.

- [packages/opencode/src/cli/cmd/debug/index.ts:56](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L56)
- [packages/opencode/src/cli/cmd/debug/index.ts:57](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L57)
- [packages/opencode/src/ide/index.ts:23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/ide/index.ts#L23)
- [packages/tui/src/context/editor.ts:121](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/context/editor.ts#L121)
- [packages/tui/src/editor-zed.ts:198](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/editor-zed.ts#L198)
- [packages/tui/src/util/system.ts:16](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L16)

### TERM_PROGRAM_VERSION

TERM_PROGRAM_VERSION is read 4 times through process.env in 2 files.

Read through: process.env.

- [packages/opencode/src/cli/cmd/debug/index.ts:57](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L57)
- [packages/opencode/src/cli/cmd/debug/index.ts:57](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L57)
- [packages/tui/src/util/system.ts:17](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L17)
- [packages/tui/src/util/system.ts:17](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L17)

### TMUX

TMUX is read 3 times through process.env in 3 files.

Read through: process.env.

- [packages/tui/src/app.tsx:267](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L267)
- [packages/tui/src/clipboard.ts:27](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/clipboard.ts#L27)
- [packages/tui/src/util/system.ts:18](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/util/system.ts#L18)

### USE_GITHUB_TOKEN

USE_GITHUB_TOKEN is read once through process.env in packages/opencode/src/cli/cmd/github.handler.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/github.handler.ts:689](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L689)

### VARIANT

VARIANT is read once through process.env in packages/opencode/src/cli/cmd/github.handler.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/github.handler.ts:408](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.handler.ts#L408)

### VERTEX_LOCATION

VERTEX_LOCATION is read 3 times through process.env in packages/core/src/plugin/provider/google-vertex.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/google-vertex.ts:22](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L22)
- [packages/core/src/plugin/provider/google-vertex.ts:131](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L131)
- [packages/core/src/plugin/provider/google-vertex.ts:151](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/google-vertex.ts#L151)

### VIRTUAL_ENV

VIRTUAL_ENV is read 2 times through process.env in packages/opencode/src/lsp/server.ts.

Read through: process.env.

- [packages/opencode/src/lsp/server.ts:445](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/lsp/server.ts#L445)
- [packages/opencode/src/lsp/server.ts:502](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/lsp/server.ts#L502)

### VISUAL

VISUAL is read once through process.env in packages/tui/src/editor.ts.

Read through: process.env.

- [packages/tui/src/editor.ts:27](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/editor.ts#L27)

### VSCODE_EXTENSIONS

VSCODE_EXTENSIONS is read once through process.env in packages/opencode/src/lsp/server.ts.

Read through: process.env.

- [packages/opencode/src/lsp/server.ts:789](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/lsp/server.ts#L789)

### WAYLAND_DISPLAY

WAYLAND_DISPLAY is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/tui/src/app.tsx:268](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L268)
- [packages/tui/src/clipboard.ts:102](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/clipboard.ts#L102)

### XDG_CONFIG_HOME

XDG_CONFIG_HOME is read once through process.env in packages/opencode/src/cli/cmd/uninstall.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/uninstall.ts:238](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/uninstall.ts#L238)

### ZED_TERM

ZED_TERM is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/tui/src/context/editor.ts:121](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/context/editor.ts#L121)
- [packages/tui/src/editor-zed.ts:198](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/editor-zed.ts#L198)

## OpenCode variables

### OPENCODE_ACP_PROFILE

OPENCODE_ACP_PROFILE is read once through process.env in packages/opencode/src/acp/profile.ts.

Read through: process.env.

- [packages/opencode/src/acp/profile.ts:1](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/acp/profile.ts#L1)

### OPENCODE_ALWAYS_NOTIFY_UPDATE

OPENCODE_ALWAYS_NOTIFY_UPDATE is read once through flag helper in packages/core/src/flag/flag.ts.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:24](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L24)

### OPENCODE_API_KEY

OPENCODE_API_KEY is read once through process.env in packages/core/src/plugin/provider/opencode.ts.

Read through: process.env.

- [packages/core/src/plugin/provider/opencode.ts:176](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/provider/opencode.ts#L176)

### OPENCODE_AUTH_CONTENT

OPENCODE_AUTH_CONTENT is read 2 times through process.env in packages/opencode/src/auth/index.ts.

Read through: process.env.

- [packages/opencode/src/auth/index.ts:59](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/auth/index.ts#L59)
- [packages/opencode/src/auth/index.ts:61](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/auth/index.ts#L61)

### OPENCODE_AUTO_HEAP_SNAPSHOT

OPENCODE_AUTO_HEAP_SNAPSHOT is read once through flag helper in packages/core/src/flag/flag.ts.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:19](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L19)

### OPENCODE_BUMP

OPENCODE_BUMP is read once through process.env in packages/script/src/index.ts.

Read through: process.env.

- [packages/script/src/index.ts:22](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/script/src/index.ts#L22)

### OPENCODE_CALLER

OPENCODE_CALLER is read 2 times through process.env in packages/opencode/src/ide/index.ts.

Read through: process.env.

- [packages/opencode/src/ide/index.ts:33](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/ide/index.ts#L33)
- [packages/opencode/src/ide/index.ts:33](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/ide/index.ts#L33)

### OPENCODE_CHANNEL

OPENCODE_CHANNEL is read once through process.env in packages/script/src/index.ts.

Read through: process.env.

- [packages/script/src/index.ts:21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/script/src/index.ts#L21)

### OPENCODE_CLIENT

OPENCODE_CLIENT is read 3 times through Effect Config, process.env in 3 files.

Read through: Effect Config, process.env.

- [packages/core/src/flag/flag.ts:76](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L76)
- [packages/opencode/src/cli/cmd/acp.ts:23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/acp.ts#L23)
- [packages/opencode/src/effect/runtime-flags.ts:56](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L56)

### OPENCODE_CONFIG

OPENCODE_CONFIG is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L21)

### OPENCODE_CONFIG_CONTENT

OPENCODE_CONFIG_CONTENT is read 3 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/flag/flag.ts:22](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L22)
- [packages/opencode/src/config/config.ts:482](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/config/config.ts#L482)
- [packages/opencode/src/config/config.ts:484](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/config/config.ts#L484)

### OPENCODE_CONFIG_DIR

OPENCODE_CONFIG_DIR is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:64](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L64)

### OPENCODE_CONSOLE_TOKEN

OPENCODE_CONSOLE_TOKEN is read once through process.env in packages/opencode/src/config/config.ts.

Read through: process.env.

- [packages/opencode/src/config/config.ts:505](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/config/config.ts#L505)

### OPENCODE_DB

OPENCODE_DB is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:47](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L47)

### OPENCODE_DIRECT_TRACE

OPENCODE_DIRECT_TRACE is read once through process.env in packages/opencode/src/cli/cmd/run/trace.ts.

Read through: process.env.

- [packages/opencode/src/cli/cmd/run/trace.ts:58](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run/trace.ts#L58)

### OPENCODE_DISABLE_AUTOCOMPACT

OPENCODE_DISABLE_AUTOCOMPACT is read once through flag helper in packages/core/src/flag/flag.ts.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:28](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L28)

### OPENCODE_DISABLE_AUTOUPDATE

OPENCODE_DISABLE_AUTOUPDATE is read once through flag helper in packages/core/src/flag/flag.ts.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L23)

### OPENCODE_DISABLE_CHANNEL_DB

OPENCODE_DISABLE_CHANNEL_DB is read 2 times through process.env in packages/core/src/database/database.ts.

Read through: process.env.

- [packages/core/src/database/database.ts:50](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/database/database.ts#L50)
- [packages/core/src/database/database.ts:51](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/database/database.ts#L51)

### OPENCODE_DISABLE_FFF

OPENCODE_DISABLE_FFF is read 2 times through flag helper, process.env in packages/core/src/flag/flag.ts.

Read through: flag helper, process.env.

- [packages/core/src/flag/flag.ts:9](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L9)
- [packages/core/src/flag/flag.ts:34](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L34)

### OPENCODE_DISABLE_MODELS_FETCH

OPENCODE_DISABLE_MODELS_FETCH is read once through flag helper in packages/core/src/flag/flag.ts.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:29](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L29)

### OPENCODE_DISABLE_MOUSE

OPENCODE_DISABLE_MOUSE is read once through flag helper in packages/core/src/flag/flag.ts.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:30](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L30)

### OPENCODE_DISABLE_PROJECT_CONFIG

OPENCODE_DISABLE_PROJECT_CONFIG is read once through flag helper in packages/core/src/flag/flag.ts.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:55](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L55)

### OPENCODE_DISABLE_PRUNE

OPENCODE_DISABLE_PRUNE is read once through flag helper in packages/core/src/flag/flag.ts.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:25](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L25)

### OPENCODE_DISABLE_SHARE

OPENCODE_DISABLE_SHARE is read 2 times through process.env in packages/opencode/src/share/share-next.ts.

Read through: process.env.

- [packages/opencode/src/share/share-next.ts:23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/share/share-next.ts#L23)
- [packages/opencode/src/share/share-next.ts:23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/share/share-next.ts#L23)

### OPENCODE_DISABLE_TERMINAL_TITLE

OPENCODE_DISABLE_TERMINAL_TITLE is read once through flag helper in packages/core/src/flag/flag.ts.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:26](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L26)

### OPENCODE_EDITOR_SSE_PORT

OPENCODE_EDITOR_SSE_PORT is read once through process.env in packages/tui/src/context/editor.ts.

Read through: process.env.

- [packages/tui/src/context/editor.ts:117](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/context/editor.ts#L117)

### OPENCODE_ENABLE_EXA

OPENCODE_ENABLE_EXA is read once through flag helper in packages/core/src/tool/websearch.ts.

Read through: flag helper.

- [packages/core/src/tool/websearch.ts:79](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L79)

### OPENCODE_ENABLE_PARALLEL

OPENCODE_ENABLE_PARALLEL is read once through flag helper in packages/core/src/tool/websearch.ts.

Read through: flag helper.

- [packages/core/src/tool/websearch.ts:80](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L80)

### OPENCODE_EXPERIMENTAL

OPENCODE_EXPERIMENTAL is read 2 times through flag helper in 2 files.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:12](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L12)
- [packages/core/src/tool/websearch.ts:79](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L79)

### OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS

OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS is read once through flag helper in packages/opencode/src/effect/runtime-flags.ts.

Read through: flag helper.

- [packages/opencode/src/effect/runtime-flags.ts:43](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L43)

### OPENCODE_EXPERIMENTAL_CODE_MODE

OPENCODE_EXPERIMENTAL_CODE_MODE is read once through flag helper in packages/opencode/src/effect/runtime-flags.ts.

Read through: flag helper.

- [packages/opencode/src/effect/runtime-flags.ts:48](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L48)

### OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT

OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT is read 2 times through flag helper, process.env in packages/core/src/flag/flag.ts.

Read through: flag helper, process.env.

- [packages/core/src/flag/flag.ts:8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L8)
- [packages/core/src/flag/flag.ts:44](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L44)

### OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER

OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER is read once through Effect Config in packages/core/src/flag/flag.ts.

Read through: Effect Config.

- [packages/core/src/flag/flag.ts:40](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L40)

### OPENCODE_EXPERIMENTAL_EVENT_SYSTEM

OPENCODE_EXPERIMENTAL_EVENT_SYSTEM is read once through flag helper in packages/opencode/src/effect/runtime-flags.ts.

Read through: flag helper.

- [packages/opencode/src/effect/runtime-flags.ts:49](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L49)

### OPENCODE_EXPERIMENTAL_EXA

OPENCODE_EXPERIMENTAL_EXA is read once through flag helper in packages/core/src/tool/websearch.ts.

Read through: flag helper.

- [packages/core/src/tool/websearch.ts:79](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L79)

### OPENCODE_EXPERIMENTAL_FILEWATCHER

OPENCODE_EXPERIMENTAL_FILEWATCHER is read once through Effect Config in packages/core/src/flag/flag.ts.

Read through: Effect Config.

- [packages/core/src/flag/flag.ts:37](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L37)

### OPENCODE_EXPERIMENTAL_ICON_DISCOVERY

OPENCODE_EXPERIMENTAL_ICON_DISCOVERY is read once through flag helper in packages/opencode/src/effect/runtime-flags.ts.

Read through: flag helper.

- [packages/opencode/src/effect/runtime-flags.ts:51](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L51)

### OPENCODE_EXPERIMENTAL_LSP_TOOL

OPENCODE_EXPERIMENTAL_LSP_TOOL is read once through flag helper in packages/opencode/src/effect/runtime-flags.ts.

Read through: flag helper.

- [packages/opencode/src/effect/runtime-flags.ts:45](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L45)

### OPENCODE_EXPERIMENTAL_OXFMT

OPENCODE_EXPERIMENTAL_OXFMT is read once through flag helper in packages/opencode/src/effect/runtime-flags.ts.

Read through: flag helper.

- [packages/opencode/src/effect/runtime-flags.ts:46](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L46)

### OPENCODE_EXPERIMENTAL_PARALLEL

OPENCODE_EXPERIMENTAL_PARALLEL is read once through flag helper in packages/core/src/tool/websearch.ts.

Read through: flag helper.

- [packages/core/src/tool/websearch.ts:80](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L80)

### OPENCODE_EXPERIMENTAL_PLAN_MODE

OPENCODE_EXPERIMENTAL_PLAN_MODE is read once through flag helper in packages/opencode/src/effect/runtime-flags.ts.

Read through: flag helper.

- [packages/opencode/src/effect/runtime-flags.ts:47](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L47)

### OPENCODE_EXPERIMENTAL_REFERENCES

OPENCODE_EXPERIMENTAL_REFERENCES is read 2 times through flag helper in 2 files.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:58](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L58)
- [packages/opencode/src/effect/runtime-flags.ts:42](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L42)

### OPENCODE_EXPERIMENTAL_WORKSPACES

OPENCODE_EXPERIMENTAL_WORKSPACES is read 2 times through flag helper in 2 files.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:50](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L50)
- [packages/opencode/src/effect/runtime-flags.ts:50](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/runtime-flags.ts#L50)

### OPENCODE_FAKE_VCS

OPENCODE_FAKE_VCS is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:31](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L31)

### OPENCODE_FAST_BOOT

OPENCODE_FAST_BOOT is read once through process.env in packages/tui/src/app.tsx.

Read through: process.env.

- [packages/tui/src/app.tsx:278](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L278)

### OPENCODE_GIT_BASH_PATH

OPENCODE_GIT_BASH_PATH is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:20](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L20)

### OPENCODE_LOG_LEVEL

OPENCODE_LOG_LEVEL is read 3 times through process.env in 3 files.

Read through: process.env.

- [packages/core/src/observability/logging.ts:57](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/observability/logging.ts#L57)
- [packages/opencode/src/index.ts:68](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L68)
- [packages/opencode/src/temporary.ts:28](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/temporary.ts#L28)

### OPENCODE_MODELS_PATH

OPENCODE_MODELS_PATH is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:46](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L46)

### OPENCODE_MODELS_URL

OPENCODE_MODELS_URL is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:45](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L45)

### OPENCODE_PERMISSION

OPENCODE_PERMISSION is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:70](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L70)

### OPENCODE_PID

OPENCODE_PID is read once through process.env in packages/opencode/src/index.ts.

Read through: process.env.

- [packages/opencode/src/index.ts:77](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L77)

### OPENCODE_PLUGIN_META_FILE

OPENCODE_PLUGIN_META_FILE is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:73](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L73)

### OPENCODE_PRINT_LOGS

OPENCODE_PRINT_LOGS is read 3 times through process.env in 3 files.

Read through: process.env.

- [packages/core/src/observability/logging.ts:68](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/observability/logging.ts#L68)
- [packages/opencode/src/index.ts:67](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L67)
- [packages/opencode/src/temporary.ts:27](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/temporary.ts#L27)

### OPENCODE_PURE

OPENCODE_PURE is read 2 times through flag helper, process.env in 2 files.

Read through: flag helper, process.env.

- [packages/core/src/flag/flag.ts:67](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L67)
- [packages/opencode/src/index.ts:70](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/index.ts#L70)

### OPENCODE_RELEASE

OPENCODE_RELEASE is read once through process.env in packages/script/src/index.ts.

Read through: process.env.

- [packages/script/src/index.ts:24](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/script/src/index.ts#L24)

### OPENCODE_REPO_CLONE_GITHUB_BASE_URL

OPENCODE_REPO_CLONE_GITHUB_BASE_URL is read 2 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/repository.ts:175](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/repository.ts#L175)
- [packages/opencode/src/util/repository.ts:100](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/util/repository.ts#L100)

### OPENCODE_ROUTE

OPENCODE_ROUTE is read 2 times through process.env in packages/tui/src/app.tsx.

Read through: process.env.

- [packages/tui/src/app.tsx:277](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L277)
- [packages/tui/src/app.tsx:277](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/app.tsx#L277)

### OPENCODE_SERVER_PASSWORD

OPENCODE_SERVER_PASSWORD is read 3 times through Effect Config, process.env in 3 files.

Read through: Effect Config, process.env.

- [packages/core/src/flag/flag.ts:32](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L32)
- [packages/opencode/src/effect/config-service.ts:33](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/config-service.ts#L33)
- [packages/server/src/auth.ts:53](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/server/src/auth.ts#L53)

### OPENCODE_SERVER_USERNAME

OPENCODE_SERVER_USERNAME is read 3 times through Effect Config, process.env in 3 files.

Read through: Effect Config, process.env.

- [packages/core/src/flag/flag.ts:33](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L33)
- [packages/opencode/src/effect/config-service.ts:34](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/effect/config-service.ts#L34)
- [packages/server/src/auth.ts:56](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/server/src/auth.ts#L56)

### OPENCODE_SHOW_TTFD

OPENCODE_SHOW_TTFD is read once through flag helper in packages/core/src/flag/flag.ts.

Read through: flag helper.

- [packages/core/src/flag/flag.ts:27](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L27)

### OPENCODE_TEST_HOME

OPENCODE_TEST_HOME is read once through process.env in packages/core/src/global.ts.

Read through: process.env.

- [packages/core/src/global.ts:19](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/global.ts#L19)

### OPENCODE_TEST_MANAGED_CONFIG_DIR

OPENCODE_TEST_MANAGED_CONFIG_DIR is read once through process.env in packages/opencode/src/config/managed.ts.

Read through: process.env.

- [packages/opencode/src/config/managed.ts:32](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/config/managed.ts#L32)

### OPENCODE_TUI_CONFIG

OPENCODE_TUI_CONFIG is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:61](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L61)

### OPENCODE_VERSION

OPENCODE_VERSION is read once through process.env in packages/script/src/index.ts.

Read through: process.env.

- [packages/script/src/index.ts:23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/script/src/index.ts#L23)

### OPENCODE_WEBSEARCH_PROVIDER

OPENCODE_WEBSEARCH_PROVIDER is read 4 times through process.env in 2 files.

Read through: process.env.

- [packages/core/src/tool/websearch.ts:76](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L76)
- [packages/core/src/tool/websearch.ts:76](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L76)
- [packages/core/src/tool/websearch.ts:77](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L77)
- [packages/opencode/src/tool/websearch.ts:31](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L31)

### OPENCODE_WORKSPACE_ID

OPENCODE_WORKSPACE_ID is read once through process.env in packages/core/src/flag/flag.ts.

Read through: process.env.

- [packages/core/src/flag/flag.ts:49](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/flag/flag.ts#L49)

### OPENCODE_ZED_DB

OPENCODE_ZED_DB is read once through process.env in packages/tui/src/editor-zed.ts.

Read through: process.env.

- [packages/tui/src/editor-zed.ts:189](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/editor-zed.ts#L189)
