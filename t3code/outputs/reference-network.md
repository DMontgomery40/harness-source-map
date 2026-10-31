# T3 Code Endpoints and update channels

Release v0.1.6-nightly.20261031.3956, commit `d92c437baa19409f99416a44f748f148f4317c65`. Pinned public source evidence, not observed model delivery. Runtime settings and tool capabilities control activation. Templates retain upstream substitutions; no local values or private sessions are inputs.

## CLOUD_CLI_OAUTH_LOOPBACK_PORT (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:22–22](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L22-L22) · SHA-256 `21e7fd643d739f7d288a223597f85208b9d42afbb9369cd06b7e5028b029e029`

```typescript
const CLOUD_CLI_OAUTH_LOOPBACK_PORT = 34338;
```

## CLOUD_CLI_OAUTH_SCOPES (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:23–24](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L23-L24) · SHA-256 `71cac2132f2aaa5236291fcba8f6546ccc98d87ed091244d3d347f43bbf4cba1`

```typescript
const CLOUD_CLI_OAUTH_SCOPES = CONNECT_OAUTH_SCOPES;

```

## validateRelayUrl (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:25–39](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L25-L39) · SHA-256 `fab9758901b7baca69d8f3b4d01cd82ebba0a32e8fc117e6f6959cac2be23660`

```typescript
function validateRelayUrl(value: string) {
  const relayUrl = normalizeSecureRelayUrl(value);
  return relayUrl === null
    ? Effect.fail(
        new Config.ConfigError(
          new Schema.SchemaError(
            new SchemaIssue.InvalidValue({
              message: "Relay URL must be a secure absolute HTTPS origin.",
            }),
          ),
        ),
      )
    : Effect.succeed(relayUrl);
}

```

## readBuildTimeValue (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:40–43](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L40-L43) · SHA-256 `6a3a718be8ff6d6f20de52d35b5d531620cc064967a60a03a36fc2dc0f4973ee`

```typescript
function readBuildTimeValue(value: string | undefined): string {
  return typeof value === "undefined" ? "" : value.trim();
}

```

## normalizeSecureUrl (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:44–52](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L44-L52) · SHA-256 `37a9e3fa8c71fc3774d4102fcd533fdb6c00409ff14e3a83fd272d349e9b631b`

```typescript
function normalizeSecureUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

```

## buildTimeRelayUrl (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:53–56](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L53-L56) · SHA-256 `10e5077439e3d62c6741c85112bb3ef1397881c83dfc138b015a161869a3ca6a`

```typescript
const buildTimeRelayUrl =
  typeof __T3CODE_BUILD_RELAY_URL__ === "undefined"
    ? ""
    : (normalizeSecureRelayUrl(__T3CODE_BUILD_RELAY_URL__) ?? "");
```

## buildTimeClerkPublishableKey (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:57–61](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L57-L61) · SHA-256 `968fe6f692a317e39726317c30b769adc2184d8abd866c061e24c5647760639d`

```typescript
const buildTimeClerkPublishableKey = readBuildTimeValue(
  typeof __T3CODE_BUILD_CLERK_PUBLISHABLE_KEY__ === "undefined"
    ? undefined
    : __T3CODE_BUILD_CLERK_PUBLISHABLE_KEY__,
);
```

## buildTimeClerkCliOAuthClientId (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:62–66](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L62-L66) · SHA-256 `c7364e5c6e2f90fd43fb8f09c7988a64b24db913f790eb27b9f529ea1d4c8571`

```typescript
const buildTimeClerkCliOAuthClientId = readBuildTimeValue(
  typeof __T3CODE_BUILD_CLERK_CLI_OAUTH_CLIENT_ID__ === "undefined"
    ? undefined
    : __T3CODE_BUILD_CLERK_CLI_OAUTH_CLIENT_ID__,
);
```

## buildTimeRelayClientTracing (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:67–84](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L67-L84) · SHA-256 `8c9b219b342b15ff5766764464fd3188e79e9352937d4b53b86431e4e98f3527`

```typescript
const buildTimeRelayClientTracing = {
  tracesUrl: readBuildTimeValue(
    typeof __T3CODE_BUILD_RELAY_CLIENT_OTLP_TRACES_URL__ === "undefined"
      ? undefined
      : __T3CODE_BUILD_RELAY_CLIENT_OTLP_TRACES_URL__,
  ),
  tracesDataset: readBuildTimeValue(
    typeof __T3CODE_BUILD_RELAY_CLIENT_OTLP_TRACES_DATASET__ === "undefined"
      ? undefined
      : __T3CODE_BUILD_RELAY_CLIENT_OTLP_TRACES_DATASET__,
  ),
  tracesToken: readBuildTimeValue(
    typeof __T3CODE_BUILD_RELAY_CLIENT_OTLP_TRACES_TOKEN__ === "undefined"
      ? undefined
      : __T3CODE_BUILD_RELAY_CLIENT_OTLP_TRACES_TOKEN__,
  ),
} as const;

```

## resolveRelayClientTracingConfig (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:85–102](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L85-L102) · SHA-256 `8f95e225ae01d326dd6680d390c383af499893e953dfd0f28aa8c6b6748ac4d9`

```typescript
export function resolveRelayClientTracingConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
  fallback = buildTimeRelayClientTracing,
) {
  if (!isRelayTracingEnabled(env)) {
    return null;
  }

  const tracesUrl = env.T3CODE_RELAY_CLIENT_OTLP_TRACES_URL?.trim() || fallback.tracesUrl;
  const tracesDataset =
    env.T3CODE_RELAY_CLIENT_OTLP_TRACES_DATASET?.trim() || fallback.tracesDataset;
  const tracesToken = env.T3CODE_RELAY_CLIENT_OTLP_TRACES_TOKEN?.trim() || fallback.tracesToken;
  const normalizedTracesUrl = normalizeSecureUrl(tracesUrl);
  return normalizedTracesUrl && tracesDataset && tracesToken
    ? { tracesUrl: normalizedTracesUrl, tracesDataset, tracesToken }
    : null;
}

```

## makeRelayUrlConfig (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:103–109](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L103-L109) · SHA-256 `636f982a180875c154620f03364912f307bbb5cce41b3a55ebda0566d98310f8`

```typescript
export function makeRelayUrlConfig(fallback = buildTimeRelayUrl) {
  const runtimeConfig = Config.NonEmptyString("T3CODE_RELAY_URL");
  return (fallback ? runtimeConfig.pipe(Config.withDefault(fallback)) : runtimeConfig).pipe(
    Config.mapEffect(validateRelayUrl),
  );
}

```

## relayUrlConfig (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:110–111](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L110-L111) · SHA-256 `6b0afabc0992fa706a3174c7b0d2841858bdcc71d0d79c91db9309434a7a5de0`

```typescript
export const relayUrlConfig = makeRelayUrlConfig();

```

## hostedAppUrlConfig (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:112–116](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L112-L116) · SHA-256 `6b860bad423f53c52efbb14a00f63493483e707fa37e2642e658b83292757f50`

```typescript
export const hostedAppUrlConfig = makePublicValueConfig(
  "T3CODE_HOSTED_APP_URL",
  DEFAULT_HOSTED_APP_URL,
).pipe(Config.mapEffect(validateHostedAppUrl));

```

## validateHostedAppUrl (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:117–144](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L117-L144) · SHA-256 `4a31fdd89d68999afc9ff474de6bfe4b791feed2ccc92ee0014610cf259f24e9`

```typescript
function validateHostedAppUrl(value: string) {
  try {
    const url = new URL(value);
    const isLoopbackHttp =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]");
    if (
      (url.protocol !== "https:" && !isLoopbackHttp) ||
      url.pathname !== "/" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      throw new Error("invalid hosted app origin");
    }
    return Effect.succeed(url.origin);
  } catch {
    return Effect.fail(
      new Config.ConfigError(
        new Schema.SchemaError(
          new SchemaIssue.InvalidValue({
            message: "Hosted app URL must be an absolute HTTPS origin (or HTTP loopback origin).",
          }),
        ),
      ),
    );
  }
}

```

## makePublicValueConfig (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:145–151](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L145-L151) · SHA-256 `8169a6ce502f6908dd434764e647c6d7dffa1c282bc5c1dbebb3c8f9f47d7e48`

```typescript
function makePublicValueConfig(name: string, fallback: string) {
  const runtimeConfig = Config.NonEmptyString(name);
  return (fallback ? runtimeConfig.pipe(Config.withDefault(fallback)) : runtimeConfig).pipe(
    Config.map((value) => value.trim()),
  );
}

```

## CloudCliOAuthConfig (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:152–160](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L152-L160) · SHA-256 `09847e5be6d5d8364b36752206a170a1d0e7660b2f5f7a9814d3f7efa53c5986`

```typescript
export interface CloudCliOAuthConfig {
  readonly tokenEndpoint: string;
  readonly deviceAuthorizationEndpoint: string;
  readonly clientId: string;
  readonly loopbackPort: number;
  readonly redirectUri: string;
  readonly scopes: typeof CLOUD_CLI_OAUTH_SCOPES;
}

```

## makeCloudCliOAuthConfig (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:161–204](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L161-L204) · SHA-256 `501e1783c5c0b512fa7e37dadd83d6cefcbd8b05334b4c573f1988a237f82103`

```typescript
export function makeCloudCliOAuthConfig({
  clerkPublishableKeyFallback = buildTimeClerkPublishableKey,
  clerkCliOAuthClientIdFallback = buildTimeClerkCliOAuthClientId,
}: {
  readonly clerkPublishableKeyFallback?: string;
  readonly clerkCliOAuthClientIdFallback?: string;
} = {}) {
  return Config.all({
    clerkPublishableKey: makePublicValueConfig(
      "T3CODE_CLERK_PUBLISHABLE_KEY",
      clerkPublishableKeyFallback,
    ),
    clientId: makePublicValueConfig(
      "T3CODE_CLERK_CLI_OAUTH_CLIENT_ID",
      clerkCliOAuthClientIdFallback,
    ),
  }).pipe(
    Config.mapEffect(({ clerkPublishableKey, clientId }) =>
      Effect.try({
        try: () => clerkFrontendApiUrlFromPublishableKey(clerkPublishableKey),
        catch: (cause) =>
          new Config.ConfigError(
            new ConfigProvider.SourceError({
              message: "Failed to derive Clerk Frontend API URL from the publishable key.",
              cause,
            }),
          ),
      }).pipe(
        Effect.map(
          (clerkFrontendApiUrl) =>
            ({
              tokenEndpoint: `${clerkFrontendApiUrl}/oauth/token`,
              deviceAuthorizationEndpoint: `${clerkFrontendApiUrl}/oauth/device_authorization`,
              clientId,
              loopbackPort: CLOUD_CLI_OAUTH_LOOPBACK_PORT,
              redirectUri: connectLoopbackRedirectUri(CLOUD_CLI_OAUTH_LOOPBACK_PORT),
              scopes: CLOUD_CLI_OAUTH_SCOPES,
            }) satisfies CloudCliOAuthConfig,
        ),
      ),
    ),
  );
}

```

## cloudCliOAuthConfig (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:205–206](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L205-L206) · SHA-256 `9738d8ffa04349c20015161f8e39ec90b011f3a1daffe34d023e00ad2869f806`

```typescript
export const cloudCliOAuthConfig = makeCloudCliOAuthConfig();

```

## hasCloudPublicConfig (publicConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/publicConfig.ts:207–211](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/publicConfig.ts#L207-L211) · SHA-256 `14553a20d2b4c4b2dc2ed4ce1ecb0b3051f5177af2f64de5d271d30203b4c004`

```typescript
export const hasCloudPublicConfig = Boolean(
  (normalizeSecureRelayUrl(process.env.T3CODE_RELAY_URL ?? "") ?? buildTimeRelayUrl) &&
  (process.env.T3CODE_CLERK_PUBLISHABLE_KEY?.trim() || buildTimeClerkPublishableKey) &&
  (process.env.T3CODE_CLERK_CLI_OAUTH_CLIENT_ID?.trim() || buildTimeClerkCliOAuthClientId),
);
```

## BufferedAnalyticsEvent (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:25–31](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L25-L31) · SHA-256 `9f90af32441180e21ed8648201bde0562cab050284eb3fd73d0952c9b472bfc5`

```typescript
interface BufferedAnalyticsEvent {
  readonly uuid: string;
  readonly event: string;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly capturedAt: string;
}

```

## DeliveryState (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:32–40](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L32-L40) · SHA-256 `85fd71f0515857614a00398c8c834d0618310c3dc582b39e0e4309394ad31252`

```typescript
interface DeliveryState {
  readonly failedBatch: ReadonlyArray<BufferedAnalyticsEvent>;
  readonly batchAttempts: number;
  readonly firstFailedAt: number;
  readonly failures: number;
  readonly retryAt: number;
}

// Retry delays shorter than this still wait for the next background check.
```

## FLUSH_INTERVAL_MS (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:41–42](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L41-L42) · SHA-256 `07d1b2b74403c8dabe581cd9d004192c63b6d114d28a333cedf129333fa19bf7`

```typescript
const FLUSH_INTERVAL_MS = 10_000;
// A hung send would hold the flush lock, and with it the shutdown flush.
```

## SEND_TIMEOUT (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:43–46](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L43-L46) · SHA-256 `0a45af9051d6e2908360fd3f529438112adcff6bb35abb95ef3bf015108a34d7`

```typescript
const SEND_TIMEOUT = "10 seconds";
// A failed batch is tried again until it has failed for this long. Ingest answers 503 when it
// cannot store a batch, and a broken Cloudflare location can take about 5 minutes to fail over.
// The waiting batch holds newer events back; `maxBufferedEvents` bounds them meanwhile.
```

## MAX_BATCH_RETRY_MS (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:47–47](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L47-L47) · SHA-256 `50ef8d88b4ff7b5d06b6151c13600d586343890194847908a2f3a03115ffe2c2`

```typescript
const MAX_BATCH_RETRY_MS = 30 * 60_000;
```

## RETRY_BASE_DELAY_MS (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:48–51](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L48-L51) · SHA-256 `8d219603db7151d3c625fbfb2df04ae49af41a0213461a6761988334bd503d5d`

```typescript
const RETRY_BASE_DELAY_MS = 2_000;
// Clients can report any number of owner ids; past this many per observer, new ones
// are not sent. Each observer has its own cap, so client reports never crowd out the
// server's own.
```

## MAX_RECORDED_OWNERS (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:52–52](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L52-L52) · SHA-256 `c608916e57118db9ae572ff53d419d8e33f457ab61e8cb60ae8d4a179a31b237`

```typescript
const MAX_RECORDED_OWNERS = 1_000;
```

## RETRY_MAX_DELAY_MS (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:53–54](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L53-L54) · SHA-256 `4b4f16a9eac5b8a50becb2bf6cdf6e057fc70c7a7f107b957b90a2f6877cb85e`

```typescript
const RETRY_MAX_DELAY_MS = 300_000;
// These statuses reject the batch itself; unlike 408/429, retrying cannot help.
```

## REJECTED_BATCH_STATUSES (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:55–57](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L55-L57) · SHA-256 `29643c613d0cd2fb2d1a2516ec8dd00c5e89c731f5f5d174ef5dcf1e5ea07dba`

```typescript
const REJECTED_BATCH_STATUSES = new Set([400, 401, 413]);

/** `random` is in [0, 1). */
```

## retryDelayMs (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:58–62](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L58-L62) · SHA-256 `6ff32f01233aa545df18296abe163042baed27c0eeb7668a97aa02f81144f296`

```typescript
function retryDelayMs(failures: number, random: number): number {
  const ceiling = Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** (failures - 1));
  return Math.round(ceiling / 2 + (ceiling / 2) * random);
}

```

## TelemetryEnvConfig (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:63–77](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L63-L77) · SHA-256 `3b2354862c276a889dbe632b8126645048fc833955fc9019b1bf2f748aa7597d`

```typescript
const TelemetryEnvConfig = Config.all({
  posthogKey: Config.String("T3CODE_POSTHOG_KEY").pipe(
    Config.withDefault("phc_XOWci4oZP4VvLiEyrFqkFjP4CZn55mjYYBMREK5Wd6m"),
  ),
  posthogHost: Config.String("T3CODE_POSTHOG_HOST").pipe(
    Config.withDefault("https://ingest.t3.codes"),
  ),
  enabled: Config.Boolean("T3CODE_TELEMETRY_ENABLED").pipe(Config.withDefault(true)),
  flushBatchSize: Config.Number("T3CODE_TELEMETRY_FLUSH_BATCH_SIZE").pipe(Config.withDefault(20)),
  maxBufferedEvents: Config.Number("T3CODE_TELEMETRY_MAX_BUFFERED_EVENTS").pipe(
    Config.withDefault(1_000),
  ),
  wslDistroName: Config.String("WSL_DISTRO_NAME").pipe(Config.option),
});

```

## AnalyticsService (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:78–99](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L78-L99) · SHA-256 `7dc45327820d4c103a0a59b383857be6212234311c29f76c5a64bceca1dcbdbf`

```typescript
export class AnalyticsService extends Context.Service<
  AnalyticsService,
  {
    readonly record: (
      event: string,
      properties?: Readonly<Record<string, unknown>>,
    ) => Effect.Effect<void>;

    readonly flush: Effect.Effect<void>;

    /**
     * Records `install.owner_observed` for each owner of this install that the
     * server read itself or a connecting client reported. Each owner is sent once
     * per server process, so reconnects and repeated reads are free.
     */
    readonly recordOwners: (
      owners: ReadonlyArray<TelemetryOwner>,
      observedBy: "server" | "client",
    ) => Effect.Effect<void>;
  }
>()("t3/telemetry/AnalyticsService") {}

```

## serverOsFromNodePlatform (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:100–116](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L100-L116) · SHA-256 `1488b0c8aa1cca8b599273773e88defd5b7b3f92ed92b8f9ce920f5f7e5aa7c9`

```typescript
function serverOsFromNodePlatform(platform: string): ClientOs {
  switch (platform) {
    case "darwin":
      return "macOS";
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    case "android":
      return "Android";
    default:
      return "other";
  }
}

/** @public */
/** @public */
```

## make (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:117–334](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L117-L334) · SHA-256 `65d693e474dc341a856d4a6a33125949172d8f2fbc37804eee14a806c48f23eb`

```typescript
export const make = Effect.gen(function* () {
  const telemetryConfig = yield* TelemetryEnvConfig;
  const httpClient = yield* HttpClient.HttpClient;
  const serverConfig = yield* ServerConfig.ServerConfig;
  const { distinctId, installId } = yield* getTelemetryIdentity;
  const crypto = yield* Crypto.Crypto;
  const bufferRef = yield* Ref.make<ReadonlyArray<BufferedAnalyticsEvent>>([]);
  const deliveryRef = yield* Ref.make<DeliveryState>({
    failedBatch: [],
    batchAttempts: 0,
    firstFailedAt: 0,
    failures: 0,
    retryAt: 0,
  });
  const recordedOwnersRef = yield* Ref.make<
    Readonly<Record<"server" | "client", ReadonlySet<string>>>
  >({ server: new Set(), client: new Set() });
  // The background flush and the shutdown flush must not send the same batch at once.
  const flushLock = yield* Semaphore.make(1);
  const clientType = serverConfig.mode === "desktop" ? "desktop-app" : "cli-web-client";
  const hostPlatform = yield* HostProcess.Platform;
  const hostArchitecture = yield* HostProcess.Architecture;

  const enqueueBufferedEvent = (
    uuid: string,
    event: string,
    properties?: Readonly<Record<string, unknown>>,
  ) =>
    Effect.flatMap(DateTime.now, (now) =>
      Ref.modify(bufferRef, (current) => {
        const appended = [
          ...current,
          {
            uuid,
            event,
            ...(properties ? { properties } : {}),
            capturedAt: DateTime.formatIso(now),
          } satisfies BufferedAnalyticsEvent,
        ];

        const next =
          appended.length > telemetryConfig.maxBufferedEvents
            ? appended.slice(appended.length - telemetryConfig.maxBufferedEvents)
            : appended;

        return [
          {
            size: next.length,
            dropped: next.length !== appended.length,
          } as const,
          next,
        ] as const;
      }),
    );

  const sendBatch = Effect.fn("AnalyticsService.sendBatch")(function* (
    events: ReadonlyArray<BufferedAnalyticsEvent>,
  ) {
    if (!telemetryConfig.enabled || !distinctId) return;

    const payload = {
      api_key: telemetryConfig.posthogKey,
      batch: events.map((event) => ({
        uuid: event.uuid,
        event: event.event,
        distinct_id: distinctId,
        properties: {
          ...event.properties,
          ...(installId === null ? {} : { installId }),
          $process_person_profile: false,
          platform: hostPlatform,
          wsl: Option.getOrUndefined(telemetryConfig.wslDistroName),
          arch: hostArchitecture,
          t3CodeVersion: packageJson.version,
          telemetryChannel: ServerConfig.telemetryChannel,
          clientType,
          serverOs: serverOsFromNodePlatform(hostPlatform),
          serverArch: hostArchitecture,
          serverWslDistro: Option.getOrUndefined(telemetryConfig.wslDistroName),
          serverAppVersion: packageJson.version,
          serverMode: serverConfig.mode,
        },
        timestamp: event.capturedAt,
      })),
    };

    yield* HttpClientRequest.post(`${telemetryConfig.posthogHost}/batch/`).pipe(
      HttpClientRequest.bodyJson(payload),
      Effect.flatMap(httpClient.execute),
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.timeout(SEND_TIMEOUT),
    );
  });

  const takeBatch = Ref.modify(bufferRef, (current) => {
    const nextBatch = current.slice(0, telemetryConfig.flushBatchSize);
    return [nextBatch, current.slice(nextBatch.length)] as const;
  });

  // Back off even after dropping rejected batches so bad API keys cannot drain the queue in a tight loop.
  const flush: AnalyticsService["Service"]["flush"] = Effect.gen(function* () {
    while (true) {
      const delivery = yield* Ref.get(deliveryRef);
      const batch = delivery.failedBatch.length > 0 ? delivery.failedBatch : yield* takeBatch;
      if (batch.length === 0) {
        return;
      }

      const sent = yield* Effect.result(sendBatch(batch));
      if (Result.isSuccess(sent)) {
        yield* Ref.set(deliveryRef, {
          failedBatch: [],
          batchAttempts: 0,
          firstFailedAt: 0,
          failures: 0,
          retryAt: 0,
        });
        continue;
      }

      const now = yield* Clock.currentTimeMillis;
      const failures = delivery.failures + 1;
      const batchAttempts = delivery.batchAttempts + 1;
      const firstFailedAt = delivery.batchAttempts === 0 ? now : delivery.firstFailedAt;
      const retryAt = now + retryDelayMs(failures, yield* Random.next);
      const error = sent.failure;
      const rejected =
        error._tag === "HttpClientError" &&
        error.reason._tag === "StatusCodeError" &&
        REJECTED_BATCH_STATUSES.has(error.reason.response.status);
      if (!rejected && now - firstFailedAt < MAX_BATCH_RETRY_MS) {
        yield* Ref.set(deliveryRef, {
          failedBatch: batch,
          batchAttempts,
          firstFailedAt,
          failures,
          retryAt,
        });
        yield* Effect.logDebug("Failed to send telemetry batch; will retry", {
          attempt: batchAttempts,
          cause: error,
        });
        return;
      }
      yield* Ref.set(deliveryRef, {
        failedBatch: [],
        batchAttempts: 0,
        firstFailedAt: 0,
        failures,
        retryAt,
      });
      yield* Effect.logWarning(
        rejected
          ? "Dropped telemetry batch the endpoint rejected"
          : "Dropped telemetry batch after repeated send failures",
        { events: batch.length, attempts: batchAttempts, cause: error },
      );
      return;
    }
  }).pipe(flushLock.withPermit);

  const flushWhenDue = Effect.gen(function* () {
    const { retryAt } = yield* Ref.get(deliveryRef);
    if ((yield* Clock.currentTimeMillis) >= retryAt) {
      yield* flush;
    }
  });

  const record: AnalyticsService["Service"]["record"] = Effect.fn("AnalyticsService.record")(
    function* (event, properties) {
      if (!telemetryConfig.enabled || !distinctId) return;

      // Catch Node UUID defects too; best-effort telemetry drops events without UUIDs.
      const uuid = yield* Effect.exit(crypto.randomUUIDv7());
      if (Exit.isFailure(uuid)) return;

      const enqueueResult = yield* enqueueBufferedEvent(uuid.value, event, properties);
      if (enqueueResult.dropped) {
        yield* Effect.logDebug("analytics buffer full; dropping oldest event", {
          size: enqueueResult.size,
          event,
        });
      }
    },
  );

  const recordOwners: AnalyticsService["Service"]["recordOwners"] = Effect.fn(
    "AnalyticsService.recordOwners",
  )((owners, observedBy) =>
    Effect.forEach(
      owners,
      ({ source, ownerId }) =>
        Ref.modify(recordedOwnersRef, (recorded) => {
          const key = `${source}:${ownerId}`;
          const seen = recorded[observedBy];
          return seen.has(key) || seen.size >= MAX_RECORDED_OWNERS
            ? [false, recorded]
            : [true, { ...recorded, [observedBy]: new Set(seen).add(key) }];
        }).pipe(
          Effect.flatMap((isNew) =>
            isNew
              ? record("install.owner_observed", { ownerSource: source, ownerId, observedBy })
              : Effect.void,
          ),
        ),
      { discard: true },
    ),
  );

  yield* Effect.forever(Effect.sleep(FLUSH_INTERVAL_MS).pipe(Effect.andThen(flushWhenDue)), {
    disableYield: true,
  }).pipe(Effect.forkScoped);

  yield* Effect.addFinalizer(() => flush);

  return AnalyticsService.of({ record, flush, recordOwners });
});

```

## layer (AnalyticsService.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/telemetry/AnalyticsService.ts:335–335](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/telemetry/AnalyticsService.ts#L335-L335) · SHA-256 `fbcaa04fda9e24d8a22473e1835004ce3e5e01a241799834158f1c73fd0b93f8`

```typescript
export const layer = Layer.effect(AnalyticsService, make);
```

## PREFLIGHT_TIMEOUT (selfUpdate.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/selfUpdate.ts:42–43](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/selfUpdate.ts#L42-L43) · SHA-256 `38ff460c920ef7e3d402b85336409a27a9922a926c3019f2a37f5fcf458e896b`

```typescript
const PREFLIGHT_TIMEOUT = Duration.seconds(30);

```

## resolveServerSelfUpdateCapability (selfUpdate.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/selfUpdate.ts:44–51](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/selfUpdate.ts#L44-L51) · SHA-256 `bf233830fe445db6920bf077461f944cfd96c70ee7ba2ea475a2246bd736ede3`

```typescript
export function resolveServerSelfUpdateCapability(input: {
  readonly desktopManaged: boolean;
  readonly launcherManaged: boolean;
}): ServerSelfUpdateCapability | null {
  if (input.desktopManaged) return "desktop-managed" as const;
  return input.launcherManaged ? ("boot-service" as const) : null;
}

```

## ServerSelfUpdate (selfUpdate.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/selfUpdate.ts:52–73](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/selfUpdate.ts#L52-L73) · SHA-256 `f841dd6a65772414ec58abda03856bfa0f3a454a2ef18b5560d840440d84fa51`

```typescript
export class ServerSelfUpdate extends Context.Service<
  ServerSelfUpdate,
  {
    readonly update: (
      input: ServerSelfUpdateInput,
      reportProgress?: (
        stage: ServerSelfUpdateProgressStage,
      ) => Effect.Effect<void, ServerSelfUpdateError>,
      onHandoffAccepted?: () => Effect.Effect<void>,
    ) => Effect.Effect<ServerSelfUpdateResult, ServerSelfUpdateError>;
    readonly commitDesktopUpdate: (
      requestId: string,
      onHandoffAccepted?: () => Effect.Effect<void>,
    ) => Effect.Effect<never, ServerSelfUpdateError>;
  }
>()("t3/cloud/selfUpdate/ServerSelfUpdate") {}

/**
 * A server starting from the runtime its launcher settled on means runtimes left by earlier
 * updates can go. The boot service says so through its IPC context. The SSH launcher and the
 * install script's `t3` start this home's pinned runtime directly, without one.
 */
```

## pruneRuntimesOnStart (selfUpdate.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/selfUpdate.ts:74–99](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/selfUpdate.ts#L74-L99) · SHA-256 `9bd2db949ffa58893edc761af04aa92392ce080a141c65ac884205d7811c87ab`

```typescript
export const pruneRuntimesOnStart = Effect.fn("cloud.server_self_update.prune_on_start")(
  function* (input: { readonly baseDir: string; readonly managed: boolean }) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const platform = yield* HostProcess.Platform;
    const executablePath = yield* HostProcess.ExecutablePath;
    const { entryPath } = pinnedRuntimePaths(path, input.baseDir, packageJson.version, platform);
    // The executable path is resolved, so it names the real path of a symlinked T3 home.
    const realEntryPath = yield* fs.realPath(entryPath).pipe(Effect.orElseSucceed(() => entryPath));
    if (!input.managed && executablePath !== entryPath && executablePath !== realEntryPath) {
      return [];
    }
    const removed = yield* prunePinnedRuntimes({
      baseDir: input.baseDir,
      keep: [packageJson.version],
    });
    if (removed.length > 0) {
      yield* Effect.logInfo("Removed unused t3 runtimes.", { versions: removed });
    }
    return removed;
  },
);

/** The client checks this when planning; the host checks again because its database may have
 * moved on since (another client updated it). Stable and Nightly each build their own commits,
 * so crossing tracks needs the target release to know every migration this database holds. */
```

## trackSwitchBlockReason (selfUpdate.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/selfUpdate.ts:100–116](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/selfUpdate.ts#L100-L116) · SHA-256 `b17f7e0f8062120871f58c1f6289fce319ea176686e26c0d25667725188b1226`

```typescript
export function trackSwitchBlockReason(input: {
  readonly serverVersion: string;
  readonly targetVersion: string;
  readonly targetDatabaseMigration: number | undefined;
  /** Read only for a crossing; undefined when the database cannot be read. */
  readonly databaseMigration: () => number | undefined;
}): string | null {
  if (!crossesReleaseTrack(input.serverVersion, input.targetVersion)) return null;
  const databaseMigration = input.databaseMigration();
  if (input.targetDatabaseMigration === undefined || databaseMigration === undefined) {
    return `Cannot confirm this database works with t3@${input.targetVersion}. Switch tracks from Settings → About → Update track, which checks it first.`;
  }
  return input.targetDatabaseMigration < databaseMigration
    ? `This database has changes t3@${input.targetVersion} does not support yet; it stays on this release.`
    : null;
}

```

## make (selfUpdate.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/selfUpdate.ts:117–307](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/selfUpdate.ts#L117-L307) · SHA-256 `8b4772232a3c057d0ad76aa4c8d3d80e7c122621eeccb5097a1cafb423d108d7`

```typescript
export const make = Effect.fn("cloud.server_self_update.make")(function* () {
  const serverConfig = yield* ServerConfig.ServerConfig;
  const desktopAppUpdate = yield* DesktopAppUpdate.DesktopAppUpdate;
  const launcher = yield* ServiceLauncherClient.ServiceLauncherClient;
  const runner = yield* ProcessRunner.ProcessRunner;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const platform = yield* HostProcess.Platform;
  const arch = yield* HostProcess.Architecture;
  const httpClient = yield* HttpClient.HttpClient;
  const releaseBaseUrl = Option.getOrUndefined(
    yield* Config.String(CLI_RELEASE_BASE_URL_ENV).pipe(Config.option),
  );
  const inFlight = yield* Ref.make(false);

  yield* pruneRuntimesOnStart({ baseDir: serverConfig.baseDir, managed: launcher.managed }).pipe(
    Effect.forkScoped,
  );

  const capability: ServerSelfUpdateCapability | null =
    serverConfig.mode === "desktop" ? "desktop-managed" : launcher.managed ? "boot-service" : null;
  const failWith = (reason: string, cause?: unknown) =>
    cause === undefined
      ? new ServerSelfUpdateError({ reason })
      : new ServerSelfUpdateError({ reason, cause });

  const crossesTrackUnsafely = (input: ServerSelfUpdateInput) =>
    trackSwitchBlockReason({
      serverVersion: packageJson.version,
      targetVersion: input.targetVersion,
      targetDatabaseMigration: input.targetDatabaseMigration,
      databaseMigration: () => databaseMigrationHead(serverConfig.dbPath),
    });

  const update: ServerSelfUpdate["Service"]["update"] = Effect.fn(
    "cloud.server_self_update.update",
  )(function* (input, reportProgress = () => Effect.void, onHandoffAccepted = () => Effect.void) {
    if (capability === "desktop-managed") {
      const unsafeCrossing = input.channel === undefined ? null : crossesTrackUnsafely(input);
      if (unsafeCrossing !== null) return yield* failWith(unsafeCrossing);
      if (desktopAppUpdate.available) {
        return yield* desktopAppUpdate.run(
          reportProgress,
          input.channel === undefined
            ? undefined
            : { channel: input.channel, targetVersion: input.targetVersion },
        );
      }
      return yield* failWith(
        "This server is managed by the T3 Code desktop app on its machine; update the desktop app to update it.",
      );
    }
    if (capability === null) {
      return yield* failWith(
        "Remote updates require the T3 Code background service. Run `t3 service install` on the server machine.",
      );
    }

    const unsafeCrossing = crossesTrackUnsafely(input);
    if (unsafeCrossing !== null) return yield* failWith(unsafeCrossing);
    const targetVersion = input.targetVersion.trim();
    if (!isExactServiceVersion(targetVersion)) {
      return yield* failWith(`'${targetVersion}' is not an exact t3 version.`);
    }
    if (yield* Ref.getAndSet(inFlight, true)) {
      return yield* failWith("A server update is already in progress.");
    }

    return yield* Effect.gen(function* () {
      yield* reportProgress("downloading");
      const paths = yield* ensurePinnedRuntimeInstalled({
        baseDir: serverConfig.baseDir,
        version: targetVersion,
        fs,
        path,
        runner,
        httpClient,
        platform,
        arch,
        releaseBaseUrl,
        validate: (runtime) =>
          runner
            .run({
              command: pinnedRuntimeCommand(runtime).command,
              args: [
                ...pinnedRuntimeCommand(runtime).args,
                "__service-preflight",
                "--database-path",
                serverConfig.dbPath,
                "--launcher-protocol",
                String(SERVICE_LAUNCHER_PROTOCOL),
              ],
              timeout: PREFLIGHT_TIMEOUT,
            })
            .pipe(
              Effect.mapError(
                (cause) =>
                  new PinnedRuntimeInstallError({
                    step: "running the staged service preflight",
                    cause,
                  }),
              ),
              Effect.flatMap(
                (
                  result,
                ): Effect.Effect<
                  void,
                  PinnedRuntimeInstallError | PinnedRuntimePreflightBlockedError
                > => {
                  if (result.code !== 0) {
                    return Effect.fail(
                      new PinnedRuntimeInstallError({
                        step: "running the staged service preflight",
                        exitCode: Number(result.code),
                        stdoutLength: result.stdout.length,
                        stderrLength: result.stderr.length,
                      }),
                    );
                  }
                  let parsed: unknown;
                  try {
                    parsed = JSON.parse(result.stdout.trim());
                  } catch (cause) {
                    return Effect.fail(
                      new PinnedRuntimeInstallError({
                        step: "decoding the staged service preflight",
                        cause,
                      }),
                    );
                  }
                  const preflight = decodeServicePreflightResult(parsed);
                  if (preflight === undefined || preflight.version !== targetVersion) {
                    return Effect.fail(
                      new PinnedRuntimeInstallError({
                        step: "verifying the staged service preflight",
                      }),
                    );
                  }
                  return preflight.status === "ready"
                    ? Effect.void
                    : Effect.fail(
                        new PinnedRuntimePreflightBlockedError({
                          version: targetVersion,
                          reason: preflight.reason,
                        }),
                      );
                },
              ),
            ),
      }).pipe(
        Effect.mapError((error) =>
          error._tag === "PinnedRuntimePreflightBlockedError"
            ? failWith(error.reason, error)
            : failWith(`Could not prepare t3@${targetVersion}.`, error),
        ),
      );

      yield* reportProgress("installing");
      const updateId = yield* Effect.uninterruptible(
        launcher.requestUpdate({ targetVersion, dbPath: serverConfig.dbPath }).pipe(
          Effect.mapError((error) =>
            failWith(
              error._tag === "ServiceLauncherRejectedError"
                ? error.reason
                : "Could not ask the service launcher to activate the prepared update.",
              error,
            ),
          ),
          Effect.tap(() => onHandoffAccepted()),
        ),
      );

      yield* Effect.logInfo("Server update prepared; handing off to the service launcher.", {
        updateId,
        targetVersion,
        runtimePath: paths.entryPath,
      });
      return { targetVersion, method: "boot-service" as const, updateId };
    }).pipe(Effect.onError(() => Ref.set(inFlight, false)));
  });

  return ServerSelfUpdate.of({
    update,
    commitDesktopUpdate: Effect.fn("ServerSelfUpdate.commitDesktopUpdate")(
      function (requestId, onHandoffAccepted) {
        return desktopAppUpdate.commit(requestId, onHandoffAccepted);
      },
    ),
  });
});

```

## layer (selfUpdate.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/selfUpdate.ts:308–312](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/selfUpdate.ts#L308-L312) · SHA-256 `8f89661e37cf7de7c80a3c3d2dea1e97ab09e9b43f6b853b8d0b01f478820c7a`

```typescript
export const layer = Layer.effect(ServerSelfUpdate, make()).pipe(
  Layer.provide(ProcessRunner.layer),
);

// The update outlives client sockets; progress offers to a closed queue are ignored.
```

## updateProgressStream (selfUpdate.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/server/src/cloud/selfUpdate.ts:313–331](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/cloud/selfUpdate.ts#L313-L331) · SHA-256 `ce71ddfc2e2ae41203dc431f1757389165ff4ccb8dc834c593384db4e7d0f6d6`

```typescript
export const updateProgressStream = (
  selfUpdate: ServerSelfUpdate["Service"],
  input: ServerSelfUpdateInput,
) =>
  Stream.callback<ServerSelfUpdateProgressEvent, ServerSelfUpdateError>((queue) => {
    const offer = (event: ServerSelfUpdateProgressEvent) =>
      Queue.offer(queue, event).pipe(Effect.ignore);

    return selfUpdate
      .update(input, (stage) => offer({ type: "progress", stage }))
      .pipe(
        Effect.flatMap((result) => offer({ type: "complete", result })),
        Effect.catchTags({
          ServerSelfUpdateError: (error) => Queue.fail(queue, error).pipe(Effect.ignore),
        }),
        Effect.andThen(Queue.end(queue).pipe(Effect.ignore)),
        Effect.forkDetach,
      );
  });
```

## PRERELEASE_VERSION_PATTERN (updateChannels.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/updates/updateChannels.ts:2–3](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/updates/updateChannels.ts#L2-L3) · SHA-256 `340d7bd2f73185f2e2e0473bd47c28edbf7c6c8d258050bceb572f99728c9157`

```typescript
const PRERELEASE_VERSION_PATTERN = /^[^-+]+-(?:nightly|preview)\.\d{8}\.\d+$/;

```

## isNightlyDesktopVersion (updateChannels.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/updates/updateChannels.ts:4–6](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/updates/updateChannels.ts#L4-L6) · SHA-256 `a5e7e1f6886ad8b87498b97fb6d04a4a887edb17a21b84f2c1891677bc476458`

```typescript
export function isNightlyDesktopVersion(version: string): boolean {
  return PRERELEASE_VERSION_PATTERN.test(version);
}
```

## AutoUpdater (ElectronUpdater.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/electron/ElectronUpdater.ts:9–10](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/electron/ElectronUpdater.ts#L9-L10) · SHA-256 `6e5b707528dca2981794503685e8b6f15c1d68fd9417643ddc91ea67e4cf0485`

```typescript
type AutoUpdater = typeof autoUpdater;

```

## ElectronUpdaterFeedUrl (ElectronUpdater.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/electron/ElectronUpdater.ts:11–12](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/electron/ElectronUpdater.ts#L11-L12) · SHA-256 `748f274b83d3f77f4cfce53becee0ee2388903a589ed7f696e8171748c3e90cc`

```typescript
export type ElectronUpdaterFeedUrl = Parameters<AutoUpdater["setFeedURL"]>[0];

```

## ElectronUpdaterCheckForUpdatesError (ElectronUpdater.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/electron/ElectronUpdater.ts:13–24](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/electron/ElectronUpdater.ts#L13-L24) · SHA-256 `c696a8b3b29f9ca8d2f0db1f67fd808c3907faec004168c6ead954c44a702c24`

```typescript
export class ElectronUpdaterCheckForUpdatesError extends Schema.TaggedError<ElectronUpdaterCheckForUpdatesError>()(
  "ElectronUpdaterCheckForUpdatesError",
  {
    channel: Schema.NullOr(Schema.String),
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Electron updater failed to check for updates on channel ${this.channel ?? "default"}.`;
  }
}

```

## ElectronUpdaterDownloadUpdateError (ElectronUpdater.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/electron/ElectronUpdater.ts:25–36](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/electron/ElectronUpdater.ts#L25-L36) · SHA-256 `c4067b992a13a7a2c785ef9bdc5be8bdf072ce28376001d3045939cebc8588cf`

```typescript
export class ElectronUpdaterDownloadUpdateError extends Schema.TaggedError<ElectronUpdaterDownloadUpdateError>()(
  "ElectronUpdaterDownloadUpdateError",
  {
    channel: Schema.NullOr(Schema.String),
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Electron updater failed to download the update on channel ${this.channel ?? "default"}.`;
  }
}

```

## ElectronUpdaterQuitAndInstallError (ElectronUpdater.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/electron/ElectronUpdater.ts:37–50](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/electron/ElectronUpdater.ts#L37-L50) · SHA-256 `38902b36e35243a06e61f7897b10eb564790e64f386426e3bbf2c91162330e4c`

```typescript
export class ElectronUpdaterQuitAndInstallError extends Schema.TaggedError<ElectronUpdaterQuitAndInstallError>()(
  "ElectronUpdaterQuitAndInstallError",
  {
    channel: Schema.NullOr(Schema.String),
    isSilent: Schema.Boolean,
    isForceRunAfter: Schema.Boolean,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Electron updater failed to quit and install the update on channel ${this.channel ?? "default"} (silent: ${this.isSilent}, force run after: ${this.isForceRunAfter}).`;
  }
}

```

## ElectronUpdaterError (ElectronUpdater.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/electron/ElectronUpdater.ts:51–55](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/electron/ElectronUpdater.ts#L51-L55) · SHA-256 `6fedffb387f4702baf15d94cf4a6e02451cf6e1050bef78e6b2a0f4e7c6763c5`

```typescript
export const ElectronUpdaterError = Schema.Union([
  ElectronUpdaterCheckForUpdatesError,
  ElectronUpdaterDownloadUpdateError,
  ElectronUpdaterQuitAndInstallError,
]);
```

## ElectronUpdater (ElectronUpdater.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/electron/ElectronUpdater.ts:58–83](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/electron/ElectronUpdater.ts#L58-L83) · SHA-256 `7124713b9bc204341aafcc9058d75e89eb88efa7b9a0a6c6edc1494c9f0ebce8`

```typescript
export class ElectronUpdater extends Context.Service<
  ElectronUpdater,
  {
    readonly setFeedURL: (options: ElectronUpdaterFeedUrl) => Effect.Effect<void>;
    readonly setAutoDownload: (value: boolean) => Effect.Effect<void>;
    readonly setAutoInstallOnAppQuit: (value: boolean) => Effect.Effect<void>;
    readonly setChannel: (channel: string) => Effect.Effect<void>;
    readonly setAllowPrerelease: (value: boolean) => Effect.Effect<void>;
    readonly allowDowngrade: Effect.Effect<boolean>;
    readonly setAllowDowngrade: (value: boolean) => Effect.Effect<void>;
    readonly setFullChangelog: (value: boolean) => Effect.Effect<void>;
    readonly setDisableDifferentialDownload: (value: boolean) => Effect.Effect<void>;
    readonly checkForUpdates: Effect.Effect<void, ElectronUpdaterCheckForUpdatesError>;
    readonly downloadUpdate: Effect.Effect<void, ElectronUpdaterDownloadUpdateError>;
    readonly quitAndInstall: (options: {
      readonly isSilent: boolean;
      readonly isForceRunAfter: boolean;
    }) => Effect.Effect<void, ElectronUpdaterQuitAndInstallError>;
    readonly on: <Args extends ReadonlyArray<unknown>>(
      eventName: string,
      listener: (...args: Args) => void,
    ) => Effect.Effect<void, never, Scope.Scope>;
  }
>()("@t3tools/desktop/electron/ElectronUpdater") {}

/** @public */
```

## make (ElectronUpdater.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/electron/ElectronUpdater.ts:84–185](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/electron/ElectronUpdater.ts#L84-L185) · SHA-256 `e705293d1c8eec5c933515ef2be098efc030762faff7d88dcd902b4fd64b0491`

```typescript
export const make = ElectronUpdater.of({
  setFeedURL: Effect.fn("ElectronUpdater.setFeedURL")(function (options) {
    return Effect.suspend(() => {
      autoUpdater.setFeedURL(options);
      return Effect.void;
    });
  }),
  setAutoDownload: Effect.fn("ElectronUpdater.setAutoDownload")(function (value) {
    return Effect.suspend(() => {
      autoUpdater.autoDownload = value;
      return Effect.void;
    });
  }),
  setAutoInstallOnAppQuit: Effect.fn("ElectronUpdater.setAutoInstallOnAppQuit")(function (value) {
    return Effect.suspend(() => {
      autoUpdater.autoInstallOnAppQuit = value;
      return Effect.void;
    });
  }),
  setChannel: Effect.fn("ElectronUpdater.setChannel")(function (channel) {
    return Effect.suspend(() => {
      autoUpdater.channel = channel;
      return Effect.void;
    });
  }),
  setAllowPrerelease: Effect.fn("ElectronUpdater.setAllowPrerelease")(function (value) {
    return Effect.suspend(() => {
      autoUpdater.allowPrerelease = value;
      return Effect.void;
    });
  }),
  allowDowngrade: Effect.sync(() => autoUpdater.allowDowngrade),
  setAllowDowngrade: Effect.fn("ElectronUpdater.setAllowDowngrade")(function (value) {
    return Effect.suspend(() => {
      autoUpdater.allowDowngrade = value;
      return Effect.void;
    });
  }),
  setFullChangelog: Effect.fn("ElectronUpdater.setFullChangelog")(function (value) {
    return Effect.suspend(() => {
      autoUpdater.fullChangelog = value;
      return Effect.void;
    });
  }),
  setDisableDifferentialDownload: Effect.fn("ElectronUpdater.setDisableDifferentialDownload")(
    function (value) {
      return Effect.suspend(() => {
        autoUpdater.disableDifferentialDownload = value;
        return Effect.void;
      });
    },
  ),
  checkForUpdates: Effect.suspend(() => {
    const channel = autoUpdater.channel;
    return Effect.tryPromise({
      try: () => autoUpdater.checkForUpdates(),
      catch: (cause) => new ElectronUpdaterCheckForUpdatesError({ channel, cause }),
    }).pipe(Effect.asVoid);
  }),
  downloadUpdate: Effect.suspend(() => {
    const channel = autoUpdater.channel;
    return Effect.tryPromise({
      try: () => autoUpdater.downloadUpdate(),
      catch: (cause) => new ElectronUpdaterDownloadUpdateError({ channel, cause }),
    }).pipe(Effect.asVoid);
  }),
  quitAndInstall: Effect.fn("ElectronUpdater.quitAndInstall")(function ({
    isSilent,
    isForceRunAfter,
  }) {
    return Effect.suspend(() => {
      const channel = autoUpdater.channel;
      return Effect.try({
        try: () => autoUpdater.quitAndInstall(isSilent, isForceRunAfter),
        catch: (cause) =>
          new ElectronUpdaterQuitAndInstallError({
            channel,
            isSilent,
            isForceRunAfter,
            cause,
          }),
      });
    });
  }),
  on: Effect.fn("ElectronUpdater.on")(function (eventName, listener) {
    const eventTarget = autoUpdater as unknown as {
      on: (eventName: string, listener: (...args: Array<unknown>) => void) => void;
      removeListener: (eventName: string, listener: (...args: Array<unknown>) => void) => void;
    };
    const untypedListener = listener as unknown as (...args: Array<unknown>) => void;
    return Effect.acquireRelease(
      Effect.sync(() => {
        eventTarget.on(eventName, untypedListener);
      }),
      () =>
        Effect.sync(() => {
          eventTarget.removeListener(eventName, untypedListener);
        }),
    ).pipe(Effect.asVoid);
  }),
});

```

## layer (ElectronUpdater.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/electron/ElectronUpdater.ts:186–186](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/electron/ElectronUpdater.ts#L186-L186) · SHA-256 `7b6bd747a901849574ea7054f8bd423a377d56df6e25227dc587ee62c44bf2dc`

```typescript
export const layer = Layer.succeed(ElectronUpdater, make);
```

## ClerkPublishableKeyPrefix (relayAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/relayAuth.ts:3–4](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/relayAuth.ts#L3-L4) · SHA-256 `0f60cd1909214a03067d64425b0775d39fa68a102f7c1554d3fd907c67876d0c`

```typescript
const ClerkPublishableKeyPrefix = Schema.Literals(["pk_test", "pk_live", "unknown"]);

```

## ClerkPublishableKeyDecodeError (relayAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/relayAuth.ts:5–16](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/relayAuth.ts#L5-L16) · SHA-256 `bbe87ed155704ba0b2e6f75957768facf0576eeca20d49d0a73fdf63d05802f2`

```typescript
export class ClerkPublishableKeyDecodeError extends Schema.TaggedError<ClerkPublishableKeyDecodeError>()(
  "ClerkPublishableKeyDecodeError",
  {
    keyPrefix: ClerkPublishableKeyPrefix,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Failed to decode Clerk publishable key (${this.keyPrefix}).`;
  }
}

```

## ClerkPublishableKeyFrontendApiError (relayAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/relayAuth.ts:17–30](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/relayAuth.ts#L17-L30) · SHA-256 `f9acb2350ae6f175b8497c639b2b26d43b7469a42800f6b85015d7b4dfc1e9b0`

```typescript
export class ClerkPublishableKeyFrontendApiError extends Schema.TaggedError<ClerkPublishableKeyFrontendApiError>()(
  "ClerkPublishableKeyFrontendApiError",
  {
    keyPrefix: ClerkPublishableKeyPrefix,
    frontendApi: Schema.String,
    reason: Schema.Literals(["empty", "contains-path", "invalid-url"]),
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Invalid Clerk frontend API decoded from publishable key (${this.keyPrefix}; ${this.reason}).`;
  }
}

```

## parseClerkFrontendApi (relayAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/relayAuth.ts:31–75](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/relayAuth.ts#L31-L75) · SHA-256 `d2547f5857e9f7c635664993882c64912c3a43b16adc4ecd7d03e7f25fd5d30e`

```typescript
function parseClerkFrontendApi(publishableKey: string): {
  readonly hostname: string;
  readonly url: string;
} {
  const keyPrefix = publishableKey.startsWith("pk_test_")
    ? "pk_test"
    : publishableKey.startsWith("pk_live_")
      ? "pk_live"
      : "unknown";
  const encodedFrontendApi = publishableKey.split("_").slice(2).join("_");
  let frontendApi: string;
  try {
    frontendApi = globalThis.atob(encodedFrontendApi).replace(/\$$/u, "");
  } catch (cause) {
    throw new ClerkPublishableKeyDecodeError({ keyPrefix, cause });
  }

  if (frontendApi.length === 0) {
    throw new ClerkPublishableKeyFrontendApiError({
      keyPrefix,
      frontendApi,
      reason: "empty",
    });
  }
  if (frontendApi.includes("/")) {
    throw new ClerkPublishableKeyFrontendApiError({
      keyPrefix,
      frontendApi,
      reason: "contains-path",
    });
  }

  const url = `https://${frontendApi}`;
  try {
    return { hostname: new URL(url).hostname, url };
  } catch (cause) {
    throw new ClerkPublishableKeyFrontendApiError({
      keyPrefix,
      frontendApi,
      reason: "invalid-url",
      cause,
    });
  }
}

```

## clerkFrontendApiUrlFromPublishableKey (relayAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/relayAuth.ts:76–79](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/relayAuth.ts#L76-L79) · SHA-256 `a7999712b5327f91558ec8b6bb920ae510845a666183a219cf4cb0ba5e58a8e1`

```typescript
export function clerkFrontendApiUrlFromPublishableKey(publishableKey: string): string {
  return parseClerkFrontendApi(publishableKey).url;
}

```

## clerkFrontendApiHostnameFromPublishableKey (relayAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/relayAuth.ts:80–83](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/relayAuth.ts#L80-L83) · SHA-256 `8500495f3463e687a38799b2aee86e8ad80a1fc5feb5ffc1adcc6ea0599709cf`

```typescript
export function clerkFrontendApiHostnameFromPublishableKey(publishableKey: string): string {
  return parseClerkFrontendApi(publishableKey).hostname;
}

```

## relayClerkTokenOptions (relayAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/relayAuth.ts:84–89](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/relayAuth.ts#L84-L89) · SHA-256 `ab11172171a23c1eca727f1f9aedd6211ea61207000cf9a6597fbbb338d32878`

```typescript
export function relayClerkTokenOptions(template: string) {
  return {
    template,
    skipCache: true,
  } as const;
}
```

## normalizeSecureRelayUrl (relayUrl.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/relayUrl.ts:1–19](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/relayUrl.ts#L1-L19) · SHA-256 `563ef03ff946f25d804bf62799a7b6ca3016c1db8ef28c67bc1e10a3deef20ba`

```typescript
export function normalizeSecureRelayUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.search.length > 0 ||
      url.hash.length > 0 ||
      !/^\/+$/u.test(url.pathname)
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

```

## isSecureRelayUrl (relayUrl.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/relayUrl.ts:20–22](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/relayUrl.ts#L20-L22) · SHA-256 `70c2ca5275b6d9e9b8e72b32c71b39406d9b2e443b927400794e0030ade3621a`

```typescript
export function isSecureRelayUrl(value: string): boolean {
  return normalizeSecureRelayUrl(value) !== null;
}
```

## CONNECT_AUTH_STATE_PARAM (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:3–3](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L3-L3) · SHA-256 `f7b31ee60c35196bba61d470306d8bda98ac7553cdef03a1016191f8d6dac209`

```typescript
const CONNECT_AUTH_STATE_PARAM = "state";
```

## CONNECT_AUTH_CHALLENGE_PARAM (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:4–4](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L4-L4) · SHA-256 `c7fd2676e5b03ab19c2e12b12b931c20e186bc09670a103e02688c26390a8c0c`

```typescript
const CONNECT_AUTH_CHALLENGE_PARAM = "challenge";
```

## CONNECT_AUTH_PORT_PARAM (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:5–5](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L5-L5) · SHA-256 `3fb463e244daf42b778ab316e501aecbfb67b70a2d08076ebcdbef836200039c`

```typescript
const CONNECT_AUTH_PORT_PARAM = "port";
```

## CONNECT_LOOPBACK_CALLBACK_PATH (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:6–7](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L6-L7) · SHA-256 `e35c8ac37d780be8dfa42a9b781d49216c8d5a8e05c11d1b603fc689e2ee07fc`

```typescript
const CONNECT_LOOPBACK_CALLBACK_PATH = "/callback";

```

## CONNECT_AUTHORIZE_PATH (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:8–9](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L8-L9) · SHA-256 `24c0e276c4aa6bb14bcc0f56635c172f9f439d95dbe58698219be739043ee87d`

```typescript
const CONNECT_AUTHORIZE_PATH = "/connect";

```

## DEFAULT_HOSTED_APP_URL (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:10–11](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L10-L11) · SHA-256 `e038d60f8215db48b2c630277d9ec5e3791603f314bf281c7b286c11b581b35d`

```typescript
export const DEFAULT_HOSTED_APP_URL = "https://app.t3.codes";

```

## CONNECT_OAUTH_SCOPES (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:12–13](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L12-L13) · SHA-256 `03fcc5a599c64386d12756c4085e08ef67ff33fd9edd1308ffe07dbf24cd91d9`

```typescript
export const CONNECT_OAUTH_SCOPES = ["openid", "profile", "email", "offline_access"] as const;

```

## ConnectAuthorizeRequest (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:14–20](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L14-L20) · SHA-256 `a559e8bafac8837d13d9c171de7dd5e2cb93ed5bb1859f50f401ccf594b93ecf`

```typescript
export interface ConnectAuthorizeRequest {
  readonly state: string;
  readonly challenge: string;
  readonly loopbackPort: number;
}

/** Route through /connect because Clerk's signed-out redirect can lose OAuth query parameters. */
```

## buildConnectAuthorizeRequestUrl (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:21–35](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L21-L35) · SHA-256 `6a8b99a24e62021dabb803605f75d89988d806a31a67a9a28411c72940347739`

```typescript
export function buildConnectAuthorizeRequestUrl(input: {
  readonly hostedAppUrl: string;
  readonly state: string;
  readonly challenge: string;
  readonly loopbackPort: number;
}): string {
  const url = new URL(CONNECT_AUTHORIZE_PATH, input.hostedAppUrl);
  url.hash = new URLSearchParams([
    [CONNECT_AUTH_STATE_PARAM, input.state],
    [CONNECT_AUTH_CHALLENGE_PARAM, input.challenge],
    [CONNECT_AUTH_PORT_PARAM, String(input.loopbackPort)],
  ]).toString();
  return url.toString();
}

```

## readConnectAuthorizeRequest (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:36–46](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L36-L46) · SHA-256 `0bbfcbc027ff1a4d4d44b6a9d2217c8785f6a41f60eb7d62ef86220bc1c90987`

```typescript
export function readConnectAuthorizeRequest(url: URL): ConnectAuthorizeRequest | null {
  const params = readHashParams(url);
  const state = params.get(CONNECT_AUTH_STATE_PARAM)?.trim() ?? "";
  const challenge = params.get(CONNECT_AUTH_CHALLENGE_PARAM)?.trim() ?? "";
  const loopbackPort = parseLoopbackPort(params.get(CONNECT_AUTH_PORT_PARAM)?.trim() ?? "");
  if (!state || !challenge || loopbackPort === null) {
    return null;
  }
  return { state, challenge, loopbackPort };
}

```

## parseLoopbackPort (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:47–55](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L47-L55) · SHA-256 `a5ab01c643ca1a8c4f95a1aa1be480a1c5e63c65745079abd81004a43ef249aa`

```typescript
function parseLoopbackPort(value: string): number | null {
  if (!/^\d{1,5}$/.test(value)) {
    return null;
  }
  const port = Number(value);
  return port >= 1 && port <= 65535 ? port : null;
}

/** Must match the loopback redirect URI registered on the Clerk CLI OAuth app. */
```

## connectLoopbackRedirectUri (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:56–59](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L56-L59) · SHA-256 `43694469a0de1ea4b3cc7d6f70fa844a4c5925fb0174fc3cc485acce69abc317`

```typescript
export function connectLoopbackRedirectUri(port: number): string {
  return `http://127.0.0.1:${port}${CONNECT_LOOPBACK_CALLBACK_PATH}`;
}

```

## buildConnectClerkAuthorizeUrl (connectAuth.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/connectAuth.ts:60–77](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/connectAuth.ts#L60-L77) · SHA-256 `a190af4a07873c99fef73d004a54dd271321fbc6bacf061e27ff4bf6cafc033b`

```typescript
export function buildConnectClerkAuthorizeUrl(input: {
  readonly authorizationEndpoint: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scopes: ReadonlyArray<string>;
  readonly state: string;
  readonly challenge: string;
}): string {
  const url = new URL(input.authorizationEndpoint);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", input.scopes.join(" "));
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}
```

## CLI_RELEASE_REPOSITORY (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:6–6](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L6-L6) · SHA-256 `22d905f66349e3068b39a07b1b03dcb5966bb418e3ab91c325cbadd9c306be8a`

```typescript
const CLI_RELEASE_REPOSITORY = "pingdotgg/t3code";
```

## CLI_RELEASES_PAGE_URL (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:7–7](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L7-L7) · SHA-256 `2c6e99e8a3b9d4bfc36fd3d704d3293e320e16195f7b5248e7d45e4bad84e0a0`

```typescript
export const CLI_RELEASES_PAGE_URL = `https://github.com/${CLI_RELEASE_REPOSITORY}/releases`;
```

## CLI_RELEASE_CHECKSUMS_FILE (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:8–8](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L8-L8) · SHA-256 `bb1a18f2bb34ed83e9dae434da0a1b08eaf1e253f884d726f6f6c2779e93dc05`

```typescript
export const CLI_RELEASE_CHECKSUMS_FILE = "SHA256SUMS";
```

## CLI_RELEASE_BASE_URL_ENV (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:9–12](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L9-L12) · SHA-256 `27f4ae792c0866bace2a768617a06a7e6da3a42af2cd6920bcb2cd6f75178e02`

```typescript
export const CLI_RELEASE_BASE_URL_ENV = "T3CODE_RELEASE_BASE_URL";

// Keep archive keys aligned with the Linux matrix, Windows ARM64 build, and cli_archive rows in release.yml.
// Node single-executables do not support darwin-x64 and segfault at startup.
```

## CLI_ARCHIVE_PLATFORM_KEYS (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:13–19](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L13-L19) · SHA-256 `b28b367faf5b5b98d422ad6eb152738d42f121d909f3a9a2494d67f5e1250884`

```typescript
const CLI_ARCHIVE_PLATFORM_KEYS = [
  "darwin-arm64",
  "linux-arm64",
  "linux-x64",
  "win32-arm64",
  "win32-x64",
] as const;
```

## CliArchivePlatformKey (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:20–21](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L20-L21) · SHA-256 `27c829c59c3a832e99089c763a902855acbb3d082a1ab3e90360d662d2c44819`

```typescript
export type CliArchivePlatformKey = (typeof CLI_ARCHIVE_PLATFORM_KEYS)[number];

```

## cliArchivePlatformKey (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:22–30](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L22-L30) · SHA-256 `86d1b3598f05dbc7ec1b8e24192e7d4a72d4e61560ca928c46d1e79ec5ce05ae`

```typescript
export function cliArchivePlatformKey(
  platform: NodeJS.Platform,
  arch: string,
): CliArchivePlatformKey | undefined {
  const key = `${platform}-${arch}`;
  return CLI_ARCHIVE_PLATFORM_KEYS.find((candidate) => candidate === key);
}

/** Use System32 bsdtar on Windows; Git-for-Windows GNU tar cannot open zip archives. */
```

## cliArchiveTarCommand (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:31–39](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L31-L39) · SHA-256 `241bbc83aa51399bdc6f46316d6b8ff86862704fa8f28fd9775be9ecb3d6f602`

```typescript
export function cliArchiveTarCommand(
  platform: NodeJS.Platform,
  env: Readonly<Record<string, string | undefined>>,
): string {
  if (platform !== "win32") return "tar";
  const systemRoot = env["SystemRoot"] ?? env["windir"] ?? "C:\\Windows";
  return `${systemRoot}\\System32\\tar.exe`;
}

```

## cliArchiveFileName (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:40–43](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L40-L43) · SHA-256 `609afca92631973608b19e94fcd3dfb427ab881d88a6951acba07d133f304d07`

```typescript
export function cliArchiveFileName(version: string, platformKey: CliArchivePlatformKey): string {
  return `t3-${version}-${platformKey}.${platformKey.startsWith("win32") ? "zip" : "tar.gz"}`;
}

```

## CLI_RELEASE_DEFAULT_BASE_URL (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:44–45](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L44-L45) · SHA-256 `8eabb730b139ddb71a3c1dcc2e40dc4bf942e9fe4dac76979326764a1839c247`

```typescript
const CLI_RELEASE_DEFAULT_BASE_URL = `https://github.com/${CLI_RELEASE_REPOSITORY}/releases/download`;

```

## cliReleaseDownloadBaseUrl (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:46–52](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L46-L52) · SHA-256 `10e063f685bb3e467cd708c9b7d188cea6022a21cd68a969583a4df3c280fe7c`

```typescript
export function cliReleaseDownloadBaseUrl(
  version: string,
  baseUrl: string | undefined = CLI_RELEASE_DEFAULT_BASE_URL,
): string {
  return `${(baseUrl?.trim() || CLI_RELEASE_DEFAULT_BASE_URL).replace(/\/+$/, "")}/v${version}`;
}

```

## parseChecksums (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:53–63](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L53-L63) · SHA-256 `2faf7aeab01ed5343c428b30d070bf7bd2523ef8904ec4dbfccfc5fcc049840e`

```typescript
export function parseChecksums(text: string): ReadonlyMap<string, string> {
  const checksums = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^([0-9a-fA-F]{64})\s+\*?(\S.*)$/.exec(line.trim());
    if (match?.[1] !== undefined && match[2] !== undefined) {
      checksums.set(match[2], match[1].toLowerCase());
    }
  }
  return checksums;
}

```

## CliReleaseChannel (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:64–64](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L64-L64) · SHA-256 `a60d3d81950685064ad7be2ca2b380cdc9142dbb4ca41f6a042278071240d9d2`

```typescript
export type CliReleaseChannel = "stable" | "nightly" | "preview";
```

## CLI_RELEASE_CHANNELS (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:65–70](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L65-L70) · SHA-256 `0a243473b8335b639b6b5c5e76f52b774560b8aa024c04b5495c06011373e0b4`

```typescript
export const CLI_RELEASE_CHANNELS: ReadonlyArray<CliReleaseChannel> = [
  "stable",
  "nightly",
  "preview",
];

```

## cliReleaseChannelOf (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:71–77](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L71-L77) · SHA-256 `7a41cea973a61a2bc277aa81ab9f4f6e60469095327dc739785afa52cf9e8d84`

```typescript
export function cliReleaseChannelOf(version: string): CliReleaseChannel {
  const channel = /^[^-+]+-(nightly|preview)\.\d{8}\.\d+$/.exec(version)?.[1];
  return channel === "nightly" || channel === "preview" ? channel : "stable";
}

/** Whether updating between these versions crosses Stable and Nightly. Preview builds cross nothing.
 * Hosts refuse a crossing outside a track switch, which checks the database first. */
```

## crossesReleaseTrack (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:78–84](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L78-L84) · SHA-256 `50b3cfff9cb7d4a2060b5902aefa6d6c2d0652215720a9a97a176d6dd44b577c`

```typescript
export function crossesReleaseTrack(fromVersion: string, toVersion: string): boolean {
  const from = cliReleaseChannelOf(fromVersion);
  const to = cliReleaseChannelOf(toVersion);
  return from !== to && from !== "preview" && to !== "preview";
}

/** The desktop update track a build belongs to. Preview builds have no feed and read as Stable. */
```

## desktopUpdateChannelOf (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:85–90](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L85-L90) · SHA-256 `9875f4e2b2e2f95d7fc47c11edc6f957f38268c467021cb9d6f6003bea5efaed`

```typescript
export function desktopUpdateChannelOf(version: string): "latest" | "nightly" {
  return cliReleaseChannelOf(version) === "nightly" ? "nightly" : "latest";
}

/** Whether a track switch may install `found` after its database check cleared `checked`: any build
 * on the switch's track at least as new, since later releases only add migrations. */
```

## acceptsTrackSwitchRelease (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:91–102](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L91-L102) · SHA-256 `a6642d036881d54fd527ed406bd2a51b3ab6e2306c0e5193e3f0290aa2393a05`

```typescript
export function acceptsTrackSwitchRelease(
  found: string,
  channel: "latest" | "nightly",
  checked: string,
): boolean {
  return (
    cliReleaseChannelOf(found) === (channel === "nightly" ? "nightly" : "stable") &&
    compareSemverVersions(found, checked) >= 0
  );
}

/** Page until the channel matches; nightlies can push preview/stable releases past the first page. */
```

## cliReleaseIndexPageUrl (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:103–107](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L103-L107) · SHA-256 `c2be35ef199628f9e8c66d6acb8f4e228987f43acdafb6ffc0cbb06602fd1a43`

```typescript
export function cliReleaseIndexPageUrl(page: number): string {
  return `https://api.github.com/repos/${CLI_RELEASE_REPOSITORY}/releases?per_page=100&page=${page}`;
}

/** Draft assets are not downloadable. */
```

## newestCliReleaseVersion (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:108–123](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L108-L123) · SHA-256 `cd1bbf11f9c7cdf9dfbdacee9d35aa896d3e8252d96e5d52b292722fd55977ce`

```typescript
export function newestCliReleaseVersion(
  releases: ReadonlyArray<{
    readonly tag_name: string;
    readonly draft?: boolean | undefined;
  }>,
  channel: CliReleaseChannel,
): string | undefined {
  for (const release of releases) {
    if (release.draft) continue;
    const version = /^v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(release.tag_name)?.[1];
    if (version === undefined) continue;
    if (cliReleaseChannelOf(version) === channel) return version;
  }
  return undefined;
}

```

## NpmReleaseMigrationManifest (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:124–126](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L124-L126) · SHA-256 `ed7661a875d26a4d6f1d10253f3f38c437c4edfb1b3a1485db8b4c0556743f7b`

```typescript
const NpmReleaseMigrationManifest = Schema.Struct({
  t3code: Schema.Struct({ databaseMigration: Schema.Int }),
});
```

## decodeNpmReleaseMigrationManifest (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:127–129](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L127-L129) · SHA-256 `725269855b5ce206ce59c7c0ca4153afb6bec6783ea740b5814a8ce8ce78d8a6`

```typescript
const decodeNpmReleaseMigrationManifest = Schema.decodeUnknownOption(NpmReleaseMigrationManifest);

/** Highest database migration a release's server knows, from its npm `t3` manifest. */
```

## npmReleaseDatabaseMigration (cliRelease.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[packages/shared/src/cliRelease.ts:130–133](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/cliRelease.ts#L130-L133) · SHA-256 `99454cfc333805bbfef5345153b6e7c5ee32e4c6a1d7223b8169ea5ca0e951ac`

```typescript
export function npmReleaseDatabaseMigration(manifest: unknown): number | undefined {
  return Option.getOrUndefined(decodeNpmReleaseMigrationManifest(manifest))?.t3code
    .databaseMigration;
}
```

## trimNonEmptyOption (DesktopConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopConfig.ts:6–10](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopConfig.ts#L6-L10) · SHA-256 `b1e458bcb80817e9b737c15ca7199b83d292044775f8be9c45b40a56df587a74`

```typescript
const trimNonEmptyOption = (value: string): Option.Option<string> => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? Option.some(trimmed) : Option.none();
};

```

## trimmedString (DesktopConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopConfig.ts:11–13](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopConfig.ts#L11-L13) · SHA-256 `8b49fd6e35bbe1a39d0d60b11da4d8cc65bb40a81b265f901b30c5e3c3a57f08`

```typescript
const trimmedString = (name: string) =>
  Config.String(name).pipe(Config.option, Config.map(Option.flatMap(trimNonEmptyOption)));

```

## optionalBoolean (DesktopConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopConfig.ts:14–16](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopConfig.ts#L14-L16) · SHA-256 `e5baadbf0671429b2f6ef00ffb5a7d23784b7c978499c9b3c5ef3aede75d8153`

```typescript
const optionalBoolean = (name: string) =>
  Config.Boolean(name).pipe(Config.option, Config.map(Option.getOrElse(() => false)));

```

## commaSeparatedStrings (DesktopConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopConfig.ts:17–30](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopConfig.ts#L17-L30) · SHA-256 `eb5154420b4e98287a5ad4878671b001dc6858dc0e2ae7270ea2956d60ad4e49`

```typescript
const commaSeparatedStrings = (name: string) =>
  trimmedString(name).pipe(
    Config.map(
      Option.match({
        onNone: () => [],
        onSome: (value) =>
          value
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0),
      }),
    ),
  );

```

## compactEnv (DesktopConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopConfig.ts:31–35](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopConfig.ts#L31-L35) · SHA-256 `9697f58dd083bdfda5aa5a4c2573be48c0e301650a98bc75bbb3a4c7d5c56920`

```typescript
const compactEnv = (env: Readonly<Record<string, string | undefined>>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );

```

## DesktopConfig (DesktopConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopConfig.ts:36–66](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopConfig.ts#L36-L66) · SHA-256 `b070eb57d8deca67fcbfd2d99f355a681b549e8b68423bd7de9a57e1cc686381`

```typescript
export const DesktopConfig = Config.all({
  appDataDirectory: trimmedString("APPDATA"),
  xdgConfigHome: trimmedString("XDG_CONFIG_HOME"),
  xdgDataHome: trimmedString("XDG_DATA_HOME"),
  t3Home: trimmedString("T3CODE_HOME"),
  devServerUrl: Config.URL("VITE_DEV_SERVER_URL").pipe(Config.option),
  appUserModelIdOverride: trimmedString("T3CODE_DESKTOP_APP_USER_MODEL_ID"),
  devRemoteT3ServerEntryPath: trimmedString("T3CODE_DEV_REMOTE_T3_SERVER_ENTRY_PATH"),
  configuredBackendPort: Config.Port("T3CODE_PORT").pipe(Config.option),
  commitHashOverride: trimmedString("T3CODE_COMMIT_HASH"),
  desktopLanHostOverride: trimmedString("T3CODE_DESKTOP_LAN_HOST"),
  desktopHttpsEndpointUrls: commaSeparatedStrings("T3CODE_DESKTOP_HTTPS_ENDPOINTS"),
  otlpTracesUrl: trimmedString("T3CODE_OTLP_TRACES_URL"),
  otlpMetricsUrl: trimmedString("T3CODE_OTLP_METRICS_URL"),
  otlpLogsUrl: trimmedString("T3CODE_OTLP_LOGS_URL"),
  otlpExportIntervalMs: Config.Int("T3CODE_OTLP_EXPORT_INTERVAL_MS").pipe(
    Config.withDefault(10_000),
  ),
  otlpHeaders: Config.schema(OtlpHeadersFromString, "T3CODE_OTLP_HEADERS").pipe(Config.option),
  otlpProtocol: Config.schema(OtlpProtocol, "T3CODE_OTLP_PROTOCOL").pipe(
    Config.withDefault("http/json"),
  ),
  desktopLauncherPath: trimmedString("T3CODE_DESKTOP_LAUNCHER_PATH"),
  appImagePath: trimmedString("APPIMAGE"),
  disableAutoUpdate: optionalBoolean("T3CODE_DISABLE_AUTO_UPDATE"),
  mockUpdates: optionalBoolean("T3CODE_DESKTOP_MOCK_UPDATES"),
  mockUpdateServerPort: Config.Port("T3CODE_DESKTOP_MOCK_UPDATE_SERVER_PORT").pipe(
    Config.withDefault(3000),
  ),
});

```

## layerTest (DesktopConfig.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopConfig.ts:67–68](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopConfig.ts#L67-L68) · SHA-256 `43576ae4955eff12c5d10b9af7bcd8906cf01041a40081714d701d16adabd9bb`

```typescript
export const layerTest = (env: Readonly<Record<string, string | undefined>>) =>
  ConfigProvider.layer(ConfigProvider.fromEnv({ env: compactEnv(env) }));
```

## MakeDesktopEnvironmentInput (DesktopEnvironment.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopEnvironment.ts:21–32](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopEnvironment.ts#L21-L32) · SHA-256 `abd32a0eec1b3911ce9859c935df8eb23599f23af6d4c4fb59a97643cb9f50de`

```typescript
export interface MakeDesktopEnvironmentInput {
  readonly dirname: string;
  readonly homeDirectory: string;
  readonly platform: NodeJS.Platform;
  readonly processArch: string;
  readonly appVersion: string;
  readonly appPath: string;
  readonly isPackaged: boolean;
  readonly resourcesPath: string;
  readonly runningUnderArm64Translation: boolean;
}

```

## DesktopEnvironment (DesktopEnvironment.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopEnvironment.ts:33–88](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopEnvironment.ts#L33-L88) · SHA-256 `3655d63a04059957bb6221875ead9d39183b081d8d1060d48ff0a59dc7e5f6c7`

```typescript
export class DesktopEnvironment extends Context.Service<
  DesktopEnvironment,
  {
    readonly path: Path.Path;
    readonly dirname: string;
    readonly platform: NodeJS.Platform;
    readonly processArch: string;
    readonly isPackaged: boolean;
    readonly isDevelopment: boolean;
    readonly appVersion: string;
    readonly appPath: string;
    readonly resourcesPath: string;
    readonly homeDirectory: string;
    readonly appDataDirectory: string;
    readonly baseDir: string;
    readonly stateDir: string;
    readonly desktopSettingsPath: string;
    readonly clientSettingsPath: string;
    readonly savedEnvironmentRegistryPath: string;
    readonly serverSettingsPath: string;
    readonly logDir: string;
    readonly browserArtifactsDir: string;
    readonly rootDir: string;
    readonly appRoot: string;
    readonly serverRoot: string;
    readonly backendEntryPath: string;
    readonly clientAssetsDir: string;
    readonly backendCwd: string;
    readonly preloadPath: string;
    readonly compileCachePath: string;
    readonly appUpdateYmlPath: string;
    readonly devServerUrl: Option.Option<URL>;
    readonly devRemoteT3ServerEntryPath: Option.Option<string>;
    readonly configuredBackendPort: Option.Option<number>;
    readonly commitHashOverride: Option.Option<string>;
    readonly otlpTracesUrl: Option.Option<string>;
    readonly otlpMetricsUrl: Option.Option<string>;
    readonly otlpLogsUrl: Option.Option<string>;
    readonly otlpExportIntervalMs: number;
    readonly otlpHeaders: Option.Option<Record<string, string>>;
    readonly otlpProtocol: OtlpProtocol;
    readonly branding: DesktopAppBranding;
    readonly displayName: string;
    readonly appUserModelId: string;
    readonly linuxDesktopEntryName: string;
    readonly linuxWmClass: string;
    readonly linuxApplicationsDir: string;
    readonly desktopLauncherPath: Option.Option<string>;
    readonly appImagePath: Option.Option<string>;
    readonly defaultDesktopSettings: DesktopAppSettings.DesktopSettings;
    readonly runtimeInfo: DesktopRuntimeInfo;
    readonly resolvePickFolderDefaultPath: (rawOptions: unknown) => Option.Option<string>;
    readonly resolveResourcePathCandidates: (fileName: string) => readonly string[];
  }
>()("@t3tools/desktop/app/DesktopEnvironment") {}

```

## APP_BASE_NAME (DesktopEnvironment.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopEnvironment.ts:89–90](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopEnvironment.ts#L89-L90) · SHA-256 `a701b7e6195f83597e88e769c21af181921875e05065a2e01645289d15da1109`

```typescript
const APP_BASE_NAME = "T3 Code";

```

## resolveDesktopAppStageLabel (DesktopEnvironment.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopEnvironment.ts:91–101](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopEnvironment.ts#L91-L101) · SHA-256 `e05006292580bc4419cfbd883b4c6f3e8ea1cc643577dd77fe29b768351b58e1`

```typescript
function resolveDesktopAppStageLabel(input: {
  readonly isDevelopment: boolean;
  readonly appVersion: string;
}): DesktopAppStageLabel {
  if (input.isDevelopment) {
    return "Dev";
  }

  return isNightlyDesktopVersion(input.appVersion) ? "Nightly" : "Beta";
}

```

## resolveDesktopAppBranding (DesktopEnvironment.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopEnvironment.ts:102–113](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopEnvironment.ts#L102-L113) · SHA-256 `9831138c759631f8ccf701a14ce0aae79bbe43bca4eee3a3e32f5ad33f1b310c`

```typescript
export function resolveDesktopAppBranding(input: {
  readonly isDevelopment: boolean;
  readonly appVersion: string;
}): DesktopAppBranding {
  const stageLabel = resolveDesktopAppStageLabel(input);
  return {
    baseName: APP_BASE_NAME,
    stageLabel,
    displayName: `${APP_BASE_NAME} (${stageLabel})`,
  };
}

```

## normalizeDesktopArch (DesktopEnvironment.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopEnvironment.ts:114–119](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopEnvironment.ts#L114-L119) · SHA-256 `24c2c052e0a5654773645f2efa560bac52c65564b7956d9c66b825b3b0fea947`

```typescript
function normalizeDesktopArch(arch: string): DesktopRuntimeArch {
  if (arch === "arm64") return "arm64";
  if (arch === "x64") return "x64";
  return "other";
}

```

## resolveDesktopRuntimeInfo (DesktopEnvironment.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopEnvironment.ts:120–143](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopEnvironment.ts#L120-L143) · SHA-256 `8b9eb1355605226057290e1eeb0f9a83d67c8f520f82f5e069c92a978ba0e385`

```typescript
function resolveDesktopRuntimeInfo(input: {
  readonly platform: NodeJS.Platform;
  readonly processArch: string;
  readonly runningUnderArm64Translation: boolean;
}): DesktopRuntimeInfo {
  const appArch = normalizeDesktopArch(input.processArch);

  if (input.platform !== "darwin") {
    return {
      hostArch: appArch,
      appArch,
      runningUnderArm64Translation: false,
    };
  }

  const hostArch = appArch === "arm64" || input.runningUnderArm64Translation ? "arm64" : appArch;

  return {
    hostArch,
    appArch,
    runningUnderArm64Translation: input.runningUnderArm64Translation,
  };
}

```

## make (DesktopEnvironment.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopEnvironment.ts:144–278](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopEnvironment.ts#L144-L278) · SHA-256 `a330db56cbc712df4791b30c54c588cc3630c55cb5efc9959f37bca090d7c0ba`

```typescript
const make = Effect.fn("desktop.environment.make")(function* (
  input: MakeDesktopEnvironmentInput,
): Effect.fn.Return<DesktopEnvironment["Service"], Config.ConfigError, Path.Path> {
  const path = yield* Path.Path;
  const config = yield* DesktopConfig.DesktopConfig;
  const homeDirectory = input.homeDirectory;
  const devServerUrl = config.devServerUrl;
  const isDevelopment = Option.isSome(devServerUrl);
  const appDataDirectory =
    input.platform === "win32"
      ? Option.getOrElse(config.appDataDirectory, () =>
          path.join(homeDirectory, "AppData", "Roaming"),
        )
      : input.platform === "darwin"
        ? path.join(homeDirectory, "Library", "Application Support")
        : Option.getOrElse(config.xdgConfigHome, () => path.join(homeDirectory, ".config"));
  const baseDir = resolveDesktopBaseDir({
    homeDirectory,
    joinPath: path.join,
    t3Home: config.t3Home,
  });
  const rootDir = path.resolve(input.dirname, "../../..");
  const appRoot = input.isPackaged ? input.appPath : rootDir;
  const serverRoot =
    input.isPackaged && input.platform === "win32"
      ? path.join(input.resourcesPath, "server.asar")
      : appRoot;
  const branding = resolveDesktopAppBranding({
    isDevelopment,
    appVersion: input.appVersion,
  });
  const displayName = branding.displayName;
  const stateDir = resolveDesktopStateDir({
    baseDir,
    isDevelopment,
    joinPath: path.join,
    t3Home: config.t3Home,
  });
  const linuxApplicationsDir = path.join(
    Option.getOrElse(config.xdgDataHome, () => path.join(homeDirectory, ".local", "share")),
    "applications",
  );
  const resourcesPath = input.resourcesPath;

  return DesktopEnvironment.of({
    path,
    dirname: input.dirname,
    platform: input.platform,
    processArch: input.processArch,
    isPackaged: input.isPackaged,
    isDevelopment,
    appVersion: input.appVersion,
    appPath: input.appPath,
    resourcesPath,
    homeDirectory,
    appDataDirectory,
    baseDir,
    stateDir,
    desktopSettingsPath: path.join(stateDir, "desktop-settings.json"),
    clientSettingsPath: path.join(stateDir, "client-settings.json"),
    savedEnvironmentRegistryPath: path.join(stateDir, "saved-environments.json"),
    serverSettingsPath: path.join(stateDir, "settings.json"),
    logDir: path.join(stateDir, "logs"),
    browserArtifactsDir: path.join(stateDir, "browser-artifacts"),
    rootDir,
    appRoot,
    serverRoot,
    backendEntryPath: path.join(serverRoot, "apps/server/dist/bin.mjs"),
    clientAssetsDir: path.join(serverRoot, "apps/server/dist/client"),
    backendCwd: input.isPackaged ? homeDirectory : appRoot,
    preloadPath: path.join(input.dirname, "preload.cjs"),
    compileCachePath: path.join(input.dirname, "compileCache.cjs"),
    appUpdateYmlPath: input.isPackaged
      ? path.join(resourcesPath, "app-update.yml")
      : path.join(input.appPath, "dev-app-update.yml"),
    devServerUrl,
    devRemoteT3ServerEntryPath: config.devRemoteT3ServerEntryPath,
    configuredBackendPort: config.configuredBackendPort,
    commitHashOverride: config.commitHashOverride,
    otlpTracesUrl: config.otlpTracesUrl,
    otlpMetricsUrl: config.otlpMetricsUrl,
    otlpLogsUrl: config.otlpLogsUrl,
    otlpExportIntervalMs: config.otlpExportIntervalMs,
    otlpHeaders: config.otlpHeaders,
    otlpProtocol: config.otlpProtocol,
    branding,
    displayName,
    appUserModelId: Option.getOrElse(config.appUserModelIdOverride, () =>
      isDevelopment ? "com.t3tools.t3code.dev" : "com.t3tools.t3code",
    ),
    linuxDesktopEntryName: resolveLinuxDesktopEntryName(isDevelopment),
    linuxWmClass: isDevelopment ? "t3code-dev" : "t3code",
    linuxApplicationsDir,
    desktopLauncherPath: config.desktopLauncherPath,
    appImagePath: config.appImagePath,
    defaultDesktopSettings: DesktopAppSettings.resolveDefaultDesktopSettings(input.appVersion),
    runtimeInfo: resolveDesktopRuntimeInfo({
      platform: input.platform,
      processArch: input.processArch,
      runningUnderArm64Translation: input.runningUnderArm64Translation,
    }),
    resolvePickFolderDefaultPath: (rawOptions) => {
      if (typeof rawOptions !== "object" || rawOptions === null) {
        return Option.none();
      }

      const { initialPath } = rawOptions as { initialPath?: unknown };
      if (typeof initialPath !== "string") {
        return Option.none();
      }

      const trimmedPath = initialPath.trim();
      if (trimmedPath.length === 0) {
        return Option.none();
      }

      if (trimmedPath === "~") {
        return Option.some(homeDirectory);
      }

      if (trimmedPath.startsWith("~/") || trimmedPath.startsWith("~\\")) {
        return Option.some(path.join(homeDirectory, trimmedPath.slice(2)));
      }

      return Option.some(path.resolve(trimmedPath));
    },
    resolveResourcePathCandidates: (fileName) => [
      path.join(input.dirname, "../resources", fileName),
      path.join(input.dirname, "../prod-resources", fileName),
      path.join(resourcesPath, "resources", fileName),
      path.join(resourcesPath, fileName),
    ],
  });
});

```

## layer (DesktopEnvironment.ts)

Public endpoint/configuration source. Relay and Clerk origins can be supplied by build-time or runtime values; no installed endpoint is inferred.

**When:** Cloud/analytics/update feature enabled and configured; actual destinations require a runtime capture.

[apps/desktop/src/app/DesktopEnvironment.ts:279–280](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/desktop/src/app/DesktopEnvironment.ts#L279-L280) · SHA-256 `ae52d3b8f331f2e6816488a7c84ee6beb592d86563a3cf3393c62296d7f0a9c3`

```typescript
export const layer = (input: MakeDesktopEnvironmentInput) =>
  Layer.effect(DesktopEnvironment, make(input));
```
