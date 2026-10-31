# T3 Code Injection settings and modes

Release v0.1.6-nightly.20261031.3956, commit `d92c437baa19409f99416a44f748f148f4317c65`. Pinned public source evidence, not observed model delivery. Runtime settings and tool capabilities control activation. Templates retain upstream substitutions; no local values or private sessions are inputs.

## DEFAULT_BROWSER_AUTO_SHOW_FLOATING_PREVIEW (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:291–296](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L291-L296) · SHA-256 `5d54f3881a11e4e8412239daa830099153b86f70f5ec688095bc0d9baf0f4312`

```typescript
export const DEFAULT_BROWSER_AUTO_SHOW_FLOATING_PREVIEW = true;
export {
  BROWSER_RECORDING_FRAME_RATES,
  BrowserRecordingFrameRate,
  DEFAULT_BROWSER_RECORDING_FRAME_RATE,
} from "./preview.ts";
```

## BrowserLinkTarget (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:297–297](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L297-L297) · SHA-256 `146cf5a252413de0bbd12c10114d1cb9f6ee3d413db5d490744f4f6ce5ef2625`

```typescript
export const BrowserLinkTarget = Schema.Literals(["system", "app"]);
```

## DEFAULT_BROWSER_LINK_TARGET (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:299–303](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L299-L303) · SHA-256 `0dc70918e0291220ace465e171e7df3bc4107a6240bd86ea522e480acf5992ad`

```typescript
export const DEFAULT_BROWSER_LINK_TARGET: BrowserLinkTarget = "system";
/**
 * What the address bar searches with when the input is not an address.
 * "custom" uses `browserCustomSearchUrl`, a template with `%s` for the query.
 */
```

## BrowserSearchEngine (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:304–312](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L304-L312) · SHA-256 `8d51283d470bee57321356a27b8016f77d31cd6da748df7b25a0cc53e12024a0`

```typescript
export const BrowserSearchEngine = Schema.Literals([
  "duckduckgo",
  "google",
  "bing",
  "brave",
  "kagi",
  "ecosia",
  "custom",
]);
```

## DEFAULT_BROWSER_SEARCH_ENGINE (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:314–314](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L314-L314) · SHA-256 `3d44b304b165fdb1391741149a451a1c25ff70bc6a3747d29e4a033678795a01`

```typescript
export const DEFAULT_BROWSER_SEARCH_ENGINE: BrowserSearchEngine = "duckduckgo";
```

## BrowserCustomSearchUrl (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:316–319](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L316-L319) · SHA-256 `ca8b6f6419116daa7efea2491b86884aaf1b21797f0bc2bcf1387aa9ae032896`

```typescript
export const BrowserCustomSearchUrl = Schema.String.check(
  Schema.isMaxLength(BROWSER_CUSTOM_SEARCH_URL_MAX_LENGTH),
);

```

## ClientSettingsSchema (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:351–525](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L351-L525) · SHA-256 `babfb565b8b4673baa9c1d9c82de1f3b3499ecfa83da14c1e934ea8bbab850ec`

```typescript
export const ClientSettingsSchema = Schema.Struct({
  notificationMode: NotificationMode.pipe(
    Schema.withDecodingDefault(Effect.succeed("off" as const)),
  ),
  inAppNotificationsEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  diffColorScheme: DiffColorScheme.pipe(
    Schema.withDecodingDefault(Effect.succeed("red-green" as const)),
  ),
  chatWidth: ChatWidth.pipe(Schema.withDecodingDefault(Effect.succeed("comfortable" as const))),
  effortDisplay: EffortDisplay.pipe(Schema.withDecodingDefault(Effect.succeed("label" as const))),
  loadBalancingEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  loadBalancingWeights: LoadBalancingWeights.pipe(Schema.withDecodingDefault(Effect.succeed({}))),
  appearanceContrast: AppearanceContrast.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_APPEARANCE_CONTRAST)),
  ),
  // Zero avoids per-frame layout work from width/height transitions.
  panelAnimationDurationMs: PanelAnimationDurationMs.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_PANEL_ANIMATION_DURATION_MS)),
  ),
  browserDefaultViewport: PreviewViewportSetting.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_BROWSER_VIEWPORT)),
  ),
  browserDefaultZoomFactor: PreviewZoomFactor.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_PREVIEW_ZOOM_FACTOR)),
  ),
  browserDefaultAppearance: PreviewAppearancePreference.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_PREVIEW_APPEARANCE)),
  ),
  browserRecordingFrameRate: BrowserRecordingFrameRate.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_BROWSER_RECORDING_FRAME_RATE)),
  ),
  browserRecordingShowKeyPresses: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  browserRecordingShowMousePresses: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),

  browserLinkTarget: BrowserLinkTarget.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_BROWSER_LINK_TARGET)),
  ),

  browserSearchEngine: BrowserSearchEngine.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_BROWSER_SEARCH_ENGINE)),
  ),

  // Kept when the engine is switched away from "custom" so switching back restores it.
  browserCustomSearchUrl: BrowserCustomSearchUrl.pipe(
    Schema.withDecodingDefault(Effect.succeed("")),
  ),

  browserAutoShowFloatingPreview: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_BROWSER_AUTO_SHOW_FLOATING_PREVIEW)),
  ),

  browserProfiles: Schema.Array(BrowserProfile).pipe(
    Schema.withDecodingDefault(Effect.succeed([])),
  ),

  browserDefaultProfileId: BrowserProfileId.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_BROWSER_PROFILE_ID)),
  ),

  confirmQuit: QuitConfirmationModeSetting.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_QUIT_CONFIRMATION_MODE)),
  ),
  confirmThreadArchive: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  confirmThreadDelete: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  confirmThreadUnpin: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  diffFilesCollapsed: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  diffIgnoreWhitespace: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  diffLayout: DiffLayout.pipe(Schema.withDecodingDefault(Effect.succeed(DEFAULT_DIFF_LAYOUT))),
  environmentIdentificationMode: EnvironmentIdentificationMode.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_ENVIRONMENT_IDENTIFICATION_MODE)),
  ),
  glassOpacity: GlassOpacity.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_GLASS_OPACITY)),
  ),
  fontSizeInterface: InterfaceFontSize.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_INTERFACE_FONT_SIZE)),
  ),
  fontSizePrompt: PromptFontSize.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_PROMPT_FONT_SIZE)),
  ),
  fontSizeCode: CodeFontSize.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_CODE_FONT_SIZE)),
  ),
  fontSizeTerminal: TerminalFontSize.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_TERMINAL_FONT_SIZE)),
  ),
  fontFamilyCode: FontFamilyPreference.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  fontFamilyComposer: FontFamilyPreference.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  fontFamilySans: FontFamilyPreference.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  fontFamilyTerminal: FontFamilyPreference.pipe(Schema.withDecodingDefault(Effect.succeed(""))),

  fontSmoothing: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  // Older installs also decode to null; onboarding must additionally require an empty workspace.
  onboardingCompletedAt: Schema.NullOr(Schema.String).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  persistComposerContextStrip: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),

  favorites: ModelFavorites.pipe(Schema.withDecodingDefault(Effect.succeed([]))),
  providerModelPreferences: ProviderModelPreferences.pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  pullRequestMergeMethodOverrides: Schema.Record(
    TrimmedNonEmptyString,
    PullRequestMergeMethod,
  ).pipe(Schema.withDecodingDefault(Effect.succeed({}))),

  pullRequestLinksOpenInApp: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),

  planModeEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  contextWindowMeterEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  composerRichTextEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  sendShortcut: Schema.Literals(["enter", "mod-enter-multiline", "mod-enter"]).pipe(
    Schema.withDecodingDefault(Effect.succeed("enter")),
  ),
  followUpBehavior: Schema.Literals(["queue", "steer"]).pipe(
    Schema.withDecodingDefault(Effect.succeed("steer")),
  ),
  proactivePanelsEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  showSkillsInSlashMenu: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  boringSidebarEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  boringSidebarMultilineRows: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  // Retired Labs toggle. Still read as the default for the Usage item in threadDetailsItems.
  threadDetailsUsageEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  // Sparse show/hide overrides for thread details card items. Missing ids use the client's
  // default, so new items appear for everyone and unknown ids survive a downgrade.
  threadDetailsItems: Schema.Record(Schema.String, Schema.Boolean).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  // Opt-in for the removed legacy sidebar. Still read so those users land in
  // the boring sidebar; the boring sidebar toggle clears it.
  legacySidebarEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  sidebarWorkingShelfEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  sidebarProjectGroupingMode: SidebarProjectGroupingMode.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_SIDEBAR_PROJECT_GROUPING_MODE)),
  ),
  sidebarProjectGroupingOverrides: Schema.Record(
    TrimmedNonEmptyString,
    SidebarProjectGroupingMode,
  ).pipe(Schema.withDecodingDefault(Effect.succeed({}))),
  sidebarProjectSortOrder: SidebarProjectSortOrder.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_SIDEBAR_PROJECT_SORT_ORDER)),
  ),
  sidebarThreadSortOrder: SidebarThreadSortOrder.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_SIDEBAR_THREAD_SORT_ORDER)),
  ),
  timestampFormat: TimestampFormat.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_TIMESTAMP_FORMAT)),
  ),
  snapShotEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  snapShotIncludeAccessibility: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(true)),
  ),
  snapShotShortcut: SnapShotShortcut.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_SNAP_SHOT_SHORTCUT)),
  ),
  snapShotPlaySound: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  snapShotSound: SnapShotSound.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_SNAP_SHOT_SOUND)),
  ),
  snapShotFlash: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  snapShotAnimations: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  wordWrap: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  // Opt-in TeX typesetting in rendered Markdown. Off keeps math parsing and
  // KaTeX out of the render path entirely.
  mathRenderingEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
});
```

## IDLE_COMPACTION_MODES (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:688–692](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L688-L692) · SHA-256 `702994c39065697d60260bf50d1b7117a829e25236197e96744952b0c67e3771`

```typescript
export const IDLE_COMPACTION_MODES = [
  { value: "onReturn", label: "When you return" },
  { value: "beforeCacheExpires", label: "Before the cache expires (beta)" },
  { value: "off", label: "Never" },
] as const;
```

## PROJECT_SCOPED_SERVER_SETTING_KEYS (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:1023–1050](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1023-L1050) · SHA-256 `c43606b7645c21fe577640e83437bc9a9c2d82cddeb6e34da32f738219d0ae3f`

```typescript
export const PROJECT_SCOPED_SERVER_SETTING_KEYS = [
  "worktreeCleanup",
  "defaultModelSelection",
  "defaultRuntimeMode",
  "defaultThreadEnvMode",
  "newWorktreesStartFromOrigin",
  "worktreeSubmodules",
  "defaultAutoPull",
  "defaultProjectScripts",
  "enableAgentBrowserAccess",
  "enableAgentDeviceAccess",
  "textGenerationModelSelection",
  "threadTitleInstructions",
  "sourceControlWriterModelSelection",
  "reviewGuideModelSelection",
  "reviewGuideInstructions",
  "sourceControlWritingStyle",
  "removeAgentCreditsOnMerge",
  "branchNamingMode",
  "branchNamePrefix",
  "branchNameInstructions",
  "pullRequestMergeMethod",
  "sidebarAutoSettleOnMerge",
  "sidebarAutoSettleAfterDays",
  "sidebarAutoSettleKeepPullRequests",
  "continueThreadsAfterServerUpdate",
  "responseStreamingMode",
] as const;
```

## ProjectSettingsOverrides (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:1060–1090](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1060-L1090) · SHA-256 `5ce09d3e2da95d7c28c6dfa10c4c7923fa1dfd21956f7a137197349add6c881a`

```typescript
export const ProjectSettingsOverrides = Schema.Struct({
  worktreeCleanup: Schema.optionalKey(WorktreeCleanup),
  defaultModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  defaultRuntimeMode: Schema.optionalKey(RuntimeMode),
  defaultThreadEnvMode: Schema.optionalKey(ThreadEnvMode),
  newWorktreesStartFromOrigin: Schema.optionalKey(Schema.Boolean),
  worktreeSubmodules: ForwardCompatibleOptional(WorktreeSubmodules),
  defaultAutoPull: Schema.optionalKey(Schema.Boolean),
  defaultProjectScripts: Schema.optionalKey(Schema.Array(ProjectScript)),
  enableAgentBrowserAccess: Schema.optionalKey(Schema.Boolean),
  enableAgentDeviceAccess: Schema.optionalKey(Schema.Boolean),
  textGenerationModelSelection: Schema.optionalKey(ModelSelection),
  threadTitleInstructions: Schema.optionalKey(TrimmedString),
  sourceControlWriterModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  reviewGuideModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  reviewGuideInstructions: Schema.optionalKey(TrimmedString),
  sourceControlWritingStyle: Schema.optionalKey(SourceControlWritingStyleSetting),
  removeAgentCreditsOnMerge: Schema.optionalKey(Schema.Boolean),
  branchNamingMode: Schema.optionalKey(BranchNamingMode),
  branchNamePrefix: Schema.optionalKey(TrimmedString),
  branchNameInstructions: Schema.optionalKey(TrimmedString),
  pullRequestMergeMethod: Schema.optionalKey(Schema.NullOr(PullRequestMergeMethod)),
  sidebarAutoSettleOnMerge: Schema.optionalKey(Schema.Boolean),
  sidebarAutoSettleAfterDays: Schema.optionalKey(Schema.NullOr(SidebarAutoSettleAfterDays)),
  sidebarAutoSettleKeepPullRequests: Schema.optionalKey(Schema.Boolean),
  continueThreadsAfterServerUpdate: Schema.optionalKey(Schema.Boolean),
  responseStreamingMode: Schema.optionalKey(ResponseStreamingMode),
  providerInstances: Schema.optionalKey(
    Schema.Record(ProviderInstanceId, ProjectProviderInstanceOverride),
  ),
} satisfies Record<ProjectScopedServerSettingKey | "providerInstances", unknown>);
```

## StorageCleanupReportEntry (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:1140–1150](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1140-L1150) · SHA-256 `6ca7f3010a70597b6bc7bf1f6f61a6bdbef8a648c94016c2ace59780bfa460ad`

```typescript
export const StorageCleanupReportEntry = Schema.Struct({
  kind: Schema.Literals(["worktree", "browser-artifacts", "logs"]),
  outcome: Schema.Literals(["removed", "kept", "failed"]),
  reason: Schema.String,
  path: Schema.NullOr(Schema.String),
  projectPath: Schema.NullOr(Schema.String).pipe(Schema.withDecodingDefault(Effect.succeed(null))),
  threadId: Schema.NullOr(ThreadId),
  threadTitle: Schema.NullOr(Schema.String),
  bytes: Schema.NullOr(Schema.Number).pipe(Schema.withDecodingDefault(Effect.succeed(null))),
  files: Schema.NullOr(Schema.Number).pipe(Schema.withDecodingDefault(Effect.succeed(null))),
});
```

## StorageCleanupSettings (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:1163–1178](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1163-L1178) · SHA-256 `91bd81d54be8692368ca1ba46e272aa1bba910594147f4275a0ed2e9e808cd8f`

```typescript
export const StorageCleanupSettings = Schema.Struct({
  worktreeKeepWhen: WorktreeKeepWhen.pipe(
    Schema.withDecodingDefault(Effect.succeed("uncommitted-changes")),
  ),
  worktreeAfterDays: StorageRetentionDays.pipe(Schema.withDecodingDefault(Effect.succeed(null))),
  worktreeSettledAfterDays: SettledWorktreeRetentionDays.pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  worktreeOnMerge: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  worktreeOnDelete: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  worktreeUnchanged: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  browserArtifactsAfterDays: StorageRetentionDays.pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  logsAfterDays: StorageRetentionDays.pipe(Schema.withDecodingDefault(Effect.succeed(null))),
});
```

## ServerSettings (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:1181–1364](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1181-L1364) · SHA-256 `683e5bb55c78ab36851150e62cbfc13e3002cc8c6a312165dc22b6141c0ed397`

```typescript
export const ServerSettings = Schema.Struct({
  // Null means unmigrated; empty is authoritative and must not resurrect cleared preferences.
  favorites: Schema.NullOr(ModelFavorites).pipe(Schema.withDecodingDefault(Effect.succeed(null))),
  providerModelPreferences: Schema.NullOr(ProviderModelPreferences).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  worktreeCleanup: WorktreeCleanup.pipe(Schema.withDecodingDefault(Effect.succeed(null))),
  storageCleanup: StorageCleanupSettings.pipe(
    Schema.withDecodingDefault(Effect.succeed(Schema.decodeSync(StorageCleanupSettings)({}))),
  ),

  worktreesDirectory: TrimmedString.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  /** Server-maintained history keeps old worktrees eligible for cleanup and review diffs. */
  previousWorktreesDirectories: Schema.Array(TrimmedString).pipe(
    Schema.withDecodingDefault(Effect.succeed([])),
  ),
  responseStreamingMode: ResponseStreamingMode.pipe(
    Schema.withDecodingDefault(Effect.succeed("paragraph" as const)),
  ),
  enableProviderUpdateChecks: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  continueThreadsAfterServerUpdate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(true)),
  ),

  enableAgentBrowserAccess: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  projectAgentBrowserAccessOverrides: Schema.Record(ProjectId, Schema.Boolean).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  defaultAutoPull: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  defaultProjectScripts: Schema.Array(ProjectScript).pipe(
    Schema.withDecodingDefault(Effect.succeed([])),
  ),
  projectScriptOverrides: Schema.Record(ProjectId, Schema.NullOr(Schema.Array(ProjectScript))).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  projectAutoPullOverrides: Schema.Record(ProjectId, Schema.Boolean).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  defaultModelSelection: Schema.NullOr(ModelSelection).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  fallbackModelSelection: Schema.NullOr(ModelSelection).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  defaultRuntimeMode: RuntimeMode.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_RUNTIME_MODE)),
  ),

  projectSettingsOverrides: Schema.Record(
    ProjectId,
    keepUnknownOverrideKeys(ProjectSettingsOverrides),
  ).pipe(Schema.withDecodingDefault(Effect.succeed({}))),
  /** Fold once so restarts cannot undo later UI resets. */
  projectSettingsFolded: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),

  enableAgentDeviceAccess: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  /** Enabling the Device panel must not grant providers device control. */
  enableDeviceSupport: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  deviceOnboardingCompleted: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  deviceHosts: SshDeviceHostConfigs.pipe(Schema.withDecodingDefault(Effect.succeed([]))),
  easDeviceHosts: EasDeviceHostConfigs.pipe(Schema.withDecodingDefault(Effect.succeed([]))),
  simlockDeviceHosts: SimlockDeviceHostConfigs.pipe(Schema.withDecodingDefault(Effect.succeed([]))),
  /** Alpha: Simlock device hosts. Off, the server ignores `simlockDeviceHosts`. */
  simlockDeviceHostsEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  sidebarAutoSettleAfterDays: Schema.NullOr(SidebarAutoSettleAfterDays).pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_SIDEBAR_AUTO_SETTLE_AFTER_DAYS)),
  ),
  compactIdleThreads: LegacyCompactIdleThreads.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  idleCompaction: Schema.optionalKey(IdleCompactionMode),
  snoozeLimitedThreads: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  autoResumeLimitedThreads: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  snoozePresets: SnoozePresetSettings.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_SNOOZE_PRESETS)),
  ),
  /** Beta: guest links for this machine's threads. Off refuses new links and pauses existing ones. */
  guestSharingEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  /**
   * Beta: links to the user's other machines, both ways. Off refuses new links, calls over links
   * and tasks on another machine; tasks already running there finish.
   */
  linkedEnvironmentsEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  sidebarAutoSettleKeepPullRequests: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  sidebarAutoSettleOnMerge: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  backgroundActivity: BackgroundActivitySettings,

  automaticGitFetchInterval: Schema.DurationFromMillis.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(Duration.toMillis(DEFAULT_AUTOMATIC_GIT_FETCH_INTERVAL)),
    ),
  ),
  providerHealthRefreshInterval: Schema.DurationFromMillis.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(Duration.toMillis(DEFAULT_PROVIDER_HEALTH_REFRESH_INTERVAL)),
    ),
  ),
  backgroundActivityProfile: BackgroundActivityProfile.pipe(
    Schema.withDecodingDefault(Effect.succeed(DEFAULT_BACKGROUND_ACTIVITY_PROFILE)),
  ),
  defaultTheme: DefaultThemePreference.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  /** Distinguishes repeated sets of the same theme so clients apply each one. */
  defaultThemeSetAt: Schema.String.check(Schema.isMaxLength(64)).pipe(
    Schema.withDecodingDefault(Effect.succeed("")),
  ),
  environmentIcon: ForwardCompatibleNullable(EnvironmentMachineKind).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  /** Null inherits t3.json, then local; omit it on the wire for older clients requiring a literal. */
  defaultThreadEnvMode: OmittedWhenNull(ThreadEnvMode),
  newWorktreesStartFromOrigin: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(true)),
  ),
  /** Null inherits t3.json, then recursive; unknown values decode to null for older clients. */
  worktreeSubmodules: ForwardCompatibleNullable(WorktreeSubmodules).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  addProjectBaseDirectory: TrimmedString.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  textGenerationModelSelection: ModelSelection.pipe(
    Schema.withDecodingDefault(
      Effect.succeed({
        instanceId: ProviderInstanceId.make("codex"),
        model: DEFAULT_TEXT_GENERATION_MODEL,
        options: [
          {
            id: "reasoningEffort",
            value: DEFAULT_TEXT_GENERATION_REASONING_EFFORT,
          },
        ],
      }),
    ),
  ),
  threadTitleInstructions: TrimmedString.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  branchNamingMode: BranchNamingMode.pipe(
    Schema.withDecodingDefault(Effect.succeed("static" as const)),
  ),
  branchNamePrefix: TrimmedString.pipe(Schema.withDecodingDefault(Effect.succeed("t3"))),
  branchNameInstructions: TrimmedString.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  removeAgentCreditsOnMerge: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  sourceControlWritingStyle: SourceControlWritingStyleSetting.pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  sourceControlWriterModelSelection: Schema.NullOr(ModelSelection).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  reviewGuidesEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  reviewGuideModelSelection: Schema.NullOr(ModelSelection).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  reviewGuideInstructions: TrimmedString.pipe(Schema.withDecodingDefault(Effect.succeed(""))),

  pullRequestMergeMethod: Schema.NullOr(PullRequestMergeMethod).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),

  // Schema.Unknown preserves unknown-driver configs across versions; see providerInstance.ts.
  providerInstances: Schema.Record(ProviderInstanceId, ProviderInstanceConfig).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  observability: ObservabilitySettings.pipe(Schema.withDecodingDefault(Effect.succeed({}))),
  sourceControlHosts: Schema.Record(Schema.String, SourceControlHostSettings).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  // User-chosen ids preserve rows across edits; undecodable entries round-trip untouched.
  usageLimitSources: Schema.Record(UsageLimitSourceId, UsageLimitSourceConfig).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  secretProviders: Schema.Record(SecretProviderId, SecretProviderConfig).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  cursorKeychainUsageEnabled: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),

  usagePriceOverrides: Schema.Record(TrimmedNonEmptyString, UsageModelPriceOverride).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),

  usageModelAliases: Schema.Record(TrimmedNonEmptyString, TrimmedNonEmptyString).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
});
```

## ServerSettingsPatch (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:1521–1681](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1521-L1681) · SHA-256 `00d3faa0f5971696506f5d6c9c91ddc44d6b456583caea0eb0568680f11230c5`

```typescript
export const ServerSettingsPatch = Schema.Struct({
  setModelFavorites: Schema.optionalKey(
    Schema.Array(Schema.Struct({ ...ModelFavorite.fields, favorite: Schema.Boolean })),
  ),
  setModelsHidden: Schema.optionalKey(
    Schema.Array(Schema.Struct({ ...ModelFavorite.fields, hidden: Schema.Boolean })),
  ),
  setProviderModelOrder: Schema.optionalKey(
    Schema.Struct({ provider: ProviderInstanceId, modelOrder: Schema.Array(TrimmedString) }),
  ),
  favorites: Schema.optionalKey(ModelFavorites),
  providerModelPreferences: Schema.optionalKey(ProviderModelPreferences),
  // Applied under the settings service's write lock, only while still unset.
  migrateModelPreferences: Schema.optionalKey(
    Schema.Struct({
      favorites: Schema.optionalKey(ModelFavorites),
      providerModelPreferences: Schema.optionalKey(ProviderModelPreferences),
    }),
  ),
  worktreeCleanup: Schema.optionalKey(
    Schema.NullOr(
      Schema.Union([
        Schema.Struct({ mode: Schema.Literal("off") }),
        Schema.Struct({
          mode: Schema.Literal("custom"),
          rules: Schema.Struct({
            worktreeKeepWhen: Schema.optionalKey(WorktreeKeepWhen),
            worktreeAfterDays: Schema.optionalKey(StorageRetentionDays),
            worktreeSettledAfterDays: Schema.optionalKey(SettledWorktreeRetentionDays),
            worktreeOnMerge: Schema.optionalKey(Schema.Boolean),
            worktreeOnDelete: Schema.optionalKey(Schema.Boolean),
            worktreeUnchanged: Schema.optionalKey(Schema.Boolean),
          }),
        }),
      ]),
    ),
  ),
  storageCleanup: Schema.optionalKey(
    Schema.Struct({
      worktreeKeepWhen: Schema.optionalKey(WorktreeKeepWhen),
      worktreeAfterDays: Schema.optionalKey(StorageRetentionDays),
      worktreeSettledAfterDays: Schema.optionalKey(SettledWorktreeRetentionDays),
      worktreeOnMerge: Schema.optionalKey(Schema.Boolean),
      worktreeOnDelete: Schema.optionalKey(Schema.Boolean),
      worktreeUnchanged: Schema.optionalKey(Schema.Boolean),
      browserArtifactsAfterDays: Schema.optionalKey(StorageRetentionDays),
      logsAfterDays: Schema.optionalKey(StorageRetentionDays),
    }),
  ),
  worktreesDirectory: Schema.optionalKey(TrimmedString),
  responseStreamingMode: Schema.optionalKey(ResponseStreamingMode),
  enableProviderUpdateChecks: Schema.optionalKey(Schema.Boolean),
  continueThreadsAfterServerUpdate: Schema.optionalKey(Schema.Boolean),
  enableAgentBrowserAccess: Schema.optionalKey(Schema.Boolean),
  projectAgentBrowserAccessOverrides: Schema.optionalKey(
    Schema.Record(ProjectId, Schema.NullOr(Schema.Boolean)),
  ),
  defaultAutoPull: Schema.optionalKey(Schema.Boolean),
  defaultProjectScripts: Schema.optionalKey(Schema.Array(ProjectScript)),
  projectScriptOverrides: Schema.optionalKey(
    Schema.Record(ProjectId, Schema.NullOr(Schema.Array(ProjectScript))),
  ),
  projectAutoPullOverrides: Schema.optionalKey(
    Schema.Record(ProjectId, Schema.NullOr(Schema.Boolean)),
  ),
  defaultModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  defaultRuntimeMode: Schema.optionalKey(RuntimeMode),
  fallbackModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  /** Replaces each project's override set; null removes it. Omitted providerInstances retains its stored value. */
  projectSettingsOverrides: Schema.optionalKey(
    Schema.Record(
      ProjectId,
      Schema.NullOr(
        keepUnknownOverrideKeys(
          Schema.Struct({
            ...ProjectSettingsOverrides.fields,
            sourceControlWritingStyle: Schema.optionalKey(SourceControlWritingStyleSettings),
          }),
        ),
      ),
    ),
  ),
  enableAgentDeviceAccess: Schema.optionalKey(Schema.Boolean),
  enableDeviceSupport: Schema.optionalKey(Schema.Boolean),
  deviceOnboardingCompleted: Schema.optionalKey(Schema.Boolean),
  deviceHosts: Schema.optionalKey(SshDeviceHostConfigs),
  easDeviceHosts: Schema.optionalKey(EasDeviceHostConfigs),
  simlockDeviceHosts: Schema.optionalKey(SimlockDeviceHostConfigs),
  simlockDeviceHostsEnabled: Schema.optionalKey(Schema.Boolean),
  sidebarAutoSettleAfterDays: Schema.optionalKey(Schema.NullOr(SidebarAutoSettleAfterDays)),
  compactIdleThreads: Schema.optionalKey(LegacyCompactIdleThreads),
  idleCompaction: Schema.optionalKey(IdleCompactionMode),
  sidebarAutoSettleKeepPullRequests: Schema.optionalKey(Schema.Boolean),
  sidebarAutoSettleOnMerge: Schema.optionalKey(Schema.Boolean),
  autoResumeLimitedThreads: Schema.optionalKey(Schema.Boolean),
  snoozeLimitedThreads: Schema.optionalKey(Schema.Boolean),
  snoozePresets: Schema.optionalKey(SnoozePresetSettings),
  guestSharingEnabled: Schema.optionalKey(Schema.Boolean),
  linkedEnvironmentsEnabled: Schema.optionalKey(Schema.Boolean),
  backgroundActivity: Schema.optionalKey(
    Schema.Struct({
      schemaVersion: Schema.optionalKey(Schema.Literal(1)),
      profile: Schema.optionalKey(BackgroundActivityProfileSelection),
      baseProfile: Schema.optionalKey(BackgroundActivityProfile),
      overrides: Schema.optionalKey(BackgroundActivityOverrides),
    }),
  ),
  automaticGitFetchInterval: Schema.optionalKey(Schema.DurationFromMillis),
  providerHealthRefreshInterval: Schema.optionalKey(Schema.DurationFromMillis),
  backgroundActivityProfile: Schema.optionalKey(BackgroundActivityProfile),
  environmentIcon: Schema.optionalKey(Schema.NullOr(EnvironmentMachineKind)),
  defaultThreadEnvMode: Schema.optionalKey(Schema.NullOr(ThreadEnvMode)),
  newWorktreesStartFromOrigin: Schema.optionalKey(Schema.Boolean),
  worktreeSubmodules: Schema.optionalKey(Schema.NullOr(WorktreeSubmodules)),
  addProjectBaseDirectory: Schema.optionalKey(TrimmedString),
  textGenerationModelSelection: Schema.optionalKey(ModelSelectionPatch),
  threadTitleInstructions: Schema.optionalKey(TrimmedString),
  branchNamingMode: Schema.optionalKey(BranchNamingMode),
  branchNamePrefix: Schema.optionalKey(TrimmedString),
  branchNameInstructions: Schema.optionalKey(TrimmedString),
  removeAgentCreditsOnMerge: Schema.optionalKey(Schema.Boolean),
  sourceControlWritingStyle: Schema.optionalKey(
    Schema.Struct({
      mode: Schema.optionalKey(SourceControlWritingStyleMode),
      customInstructions: Schema.optionalKey(TrimmedString),
      followChangeRequestTemplates: Schema.optionalKey(Schema.Boolean),
    }),
  ),
  sourceControlWriterModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  reviewGuidesEnabled: Schema.optionalKey(Schema.Boolean),
  reviewGuideModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  reviewGuideInstructions: Schema.optionalKey(TrimmedString),
  pullRequestMergeMethod: Schema.optionalKey(Schema.NullOr(PullRequestMergeMethod)),
  observability: Schema.optionalKey(
    Schema.Struct({
      otlpTracesUrl: Schema.optionalKey(TrimmedString),
      otlpMetricsUrl: Schema.optionalKey(TrimmedString),
      otlpLogsUrl: Schema.optionalKey(TrimmedString),
    }),
  ),
  /** Merges per host, replacing patched fields whole; redaction markers retain secrets, empty or omitted secrets remove them. */
  sourceControlHosts: Schema.optionalKey(Schema.Record(Schema.String, SourceControlHostSettings)),
  // Replace whole maps to avoid half-merged driver configs.
  providerInstances: Schema.optionalKey(Schema.Record(ProviderInstanceId, ProviderInstanceConfig)),
  // Merge per source to avoid racing other edits; null removes an entry.
  usageLimitSources: Schema.optionalKey(
    Schema.Record(UsageLimitSourceId, Schema.NullOr(UsageLimitSourceConfig)),
  ),
  secretProviders: Schema.optionalKey(
    Schema.Record(SecretProviderId, Schema.NullOr(SecretProviderConfigWrite)),
  ),
  cursorKeychainUsageEnabled: Schema.optionalKey(Schema.Boolean),

  usagePriceOverrides: Schema.optionalKey(
    Schema.Record(TrimmedNonEmptyString, Schema.NullOr(UsageModelPriceOverride)),
  ),

  usageModelAliases: Schema.optionalKey(
    Schema.Record(TrimmedNonEmptyString, Schema.NullOr(TrimmedNonEmptyString)),
  ),
});
```

## ClientSettingsPatch (settings.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/settings.ts:1721–1798](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1721-L1798) · SHA-256 `6e66d94b1515c555623374ad07ff623eebb0e3a1767a1af3fc85d07ea3de12b3`

```typescript
export const ClientSettingsPatch = Schema.Struct({
  notificationMode: Schema.optionalKey(NotificationMode),
  inAppNotificationsEnabled: Schema.optionalKey(Schema.Boolean),
  diffColorScheme: Schema.optionalKey(DiffColorScheme),
  chatWidth: Schema.optionalKey(ChatWidth),
  effortDisplay: Schema.optionalKey(EffortDisplay),
  loadBalancingEnabled: Schema.optionalKey(Schema.Boolean),
  loadBalancingWeights: Schema.optionalKey(LoadBalancingWeights),
  appearanceContrast: Schema.optionalKey(AppearanceContrast),
  panelAnimationDurationMs: Schema.optionalKey(PanelAnimationDurationMs),
  browserDefaultViewport: Schema.optionalKey(PreviewViewportSetting),
  browserDefaultZoomFactor: Schema.optionalKey(PreviewZoomFactor),
  browserDefaultAppearance: Schema.optionalKey(PreviewAppearancePreference),
  browserRecordingFrameRate: Schema.optionalKey(BrowserRecordingFrameRate),
  browserRecordingShowKeyPresses: Schema.optionalKey(Schema.Boolean),
  browserRecordingShowMousePresses: Schema.optionalKey(Schema.Boolean),
  browserLinkTarget: Schema.optionalKey(BrowserLinkTarget),
  browserSearchEngine: Schema.optionalKey(BrowserSearchEngine),
  browserCustomSearchUrl: Schema.optionalKey(BrowserCustomSearchUrl),
  browserAutoShowFloatingPreview: Schema.optionalKey(Schema.Boolean),
  browserProfiles: Schema.optionalKey(Schema.Array(BrowserProfile)),
  browserDefaultProfileId: Schema.optionalKey(BrowserProfileId),
  confirmQuit: Schema.optionalKey(QuitConfirmationMode),
  confirmThreadArchive: Schema.optionalKey(Schema.Boolean),
  confirmThreadDelete: Schema.optionalKey(Schema.Boolean),
  confirmThreadUnpin: Schema.optionalKey(Schema.Boolean),
  diffFilesCollapsed: Schema.optionalKey(Schema.Boolean),
  diffIgnoreWhitespace: Schema.optionalKey(Schema.Boolean),
  diffLayout: Schema.optionalKey(DiffLayout),
  environmentIdentificationMode: Schema.optionalKey(EnvironmentIdentificationMode),
  glassOpacity: Schema.optionalKey(GlassOpacity),
  onboardingCompletedAt: Schema.optionalKey(Schema.NullOr(Schema.String)),
  fontSizeInterface: Schema.optionalKey(InterfaceFontSize),
  fontSizePrompt: Schema.optionalKey(PromptFontSize),
  fontSizeCode: Schema.optionalKey(CodeFontSize),
  fontSizeTerminal: Schema.optionalKey(TerminalFontSize),
  fontFamilyCode: Schema.optionalKey(FontFamilyPreference),
  fontFamilyComposer: Schema.optionalKey(FontFamilyPreference),
  fontFamilySans: Schema.optionalKey(FontFamilyPreference),
  fontFamilyTerminal: Schema.optionalKey(FontFamilyPreference),
  fontSmoothing: Schema.optionalKey(Schema.Boolean),
  persistComposerContextStrip: Schema.optionalKey(Schema.Boolean),
  favorites: Schema.optionalKey(ModelFavorites),
  providerModelPreferences: Schema.optionalKey(ProviderModelPreferences),
  pullRequestMergeMethodOverrides: Schema.optionalKey(
    Schema.Record(TrimmedNonEmptyString, PullRequestMergeMethod),
  ),
  pullRequestLinksOpenInApp: Schema.optionalKey(Schema.Boolean),
  planModeEnabled: Schema.optionalKey(Schema.Boolean),
  contextWindowMeterEnabled: Schema.optionalKey(Schema.Boolean),
  composerRichTextEnabled: Schema.optionalKey(Schema.Boolean),
  sendShortcut: Schema.optionalKey(Schema.Literals(["enter", "mod-enter-multiline", "mod-enter"])),
  followUpBehavior: Schema.optionalKey(Schema.Literals(["queue", "steer"])),
  proactivePanelsEnabled: Schema.optionalKey(Schema.Boolean),
  showSkillsInSlashMenu: Schema.optionalKey(Schema.Boolean),
  boringSidebarEnabled: Schema.optionalKey(Schema.Boolean),
  boringSidebarMultilineRows: Schema.optionalKey(Schema.Boolean),
  threadDetailsUsageEnabled: Schema.optionalKey(Schema.Boolean),
  threadDetailsItems: Schema.optionalKey(Schema.Record(Schema.String, Schema.Boolean)),
  legacySidebarEnabled: Schema.optionalKey(Schema.Boolean),
  sidebarWorkingShelfEnabled: Schema.optionalKey(Schema.Boolean),
  sidebarProjectGroupingMode: Schema.optionalKey(SidebarProjectGroupingMode),
  sidebarProjectGroupingOverrides: Schema.optionalKey(
    Schema.Record(TrimmedNonEmptyString, SidebarProjectGroupingMode),
  ),
  sidebarProjectSortOrder: Schema.optionalKey(SidebarProjectSortOrder),
  sidebarThreadSortOrder: Schema.optionalKey(SidebarThreadSortOrder),
  timestampFormat: Schema.optionalKey(TimestampFormat),
  snapShotEnabled: Schema.optionalKey(Schema.Boolean),
  snapShotIncludeAccessibility: Schema.optionalKey(Schema.Boolean),
  snapShotShortcut: Schema.optionalKey(SnapShotShortcut),
  snapShotPlaySound: Schema.optionalKey(Schema.Boolean),
  snapShotSound: Schema.optionalKey(SnapShotSound),
  snapShotFlash: Schema.optionalKey(Schema.Boolean),
  snapShotAnimations: Schema.optionalKey(Schema.Boolean),
  wordWrap: Schema.optionalKey(Schema.Boolean),
  mathRenderingEnabled: Schema.optionalKey(Schema.Boolean),
});
```

## RuntimeMode (providerPolicy.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/providerPolicy.ts:25–30](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerPolicy.ts#L25-L30) · SHA-256 `a41d8b79b9982ee9b8277e3dea1a2dc2f1418912c6b36ab7433cb3f5251c42ea`

```typescript
export const RuntimeMode = Schema.Literals([
  "approval-required",
  "auto-accept-edits",
  "auto",
  "full-access",
]);
```

## DEFAULT_RUNTIME_MODE (providerPolicy.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/providerPolicy.ts:32–33](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerPolicy.ts#L32-L33) · SHA-256 `cb8ec03d53a5173039c038a8c0d4d09d42745900b450cbb40faa45ed390ab383`

```typescript
export const DEFAULT_RUNTIME_MODE: RuntimeMode = "full-access";

```

## ProviderInteractionMode (providerPolicy.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/providerPolicy.ts:34–34](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerPolicy.ts#L34-L34) · SHA-256 `c8325b191917b546d0a43208afd1c16bd4211e03d0ea68d5eed037a15a76766a`

```typescript
export const ProviderInteractionMode = Schema.Literals(["default", "plan"]);
```

## DEFAULT_PROVIDER_INTERACTION_MODE (providerPolicy.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[packages/contracts/src/providerPolicy.ts:36–37](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerPolicy.ts#L36-L37) · SHA-256 `b3d41d6ead792bb3810ac18e5089e245764ddb643fb815325a84c97e3e02434c`

```typescript
export const DEFAULT_PROVIDER_INTERACTION_MODE: ProviderInteractionMode = "default";

```

## McpCredentialRequest (McpSessionRegistry.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpSessionRegistry.ts:15–23](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpSessionRegistry.ts#L15-L23) · SHA-256 `b4c9bdb8cf9d3f13f73a57a9f5aaa70ac7bd51f300647b81c955b99fd0b2d3d4`

```typescript
export interface McpCredentialRequest {
  readonly threadId: ThreadId;
  readonly providerInstanceId: ProviderInstanceId;
  /** False omits the preview capability wherever the token is honored. Defaults to full access. */
  readonly browserToolsAvailable?: boolean;
  readonly capabilities?: ReadonlySet<McpInvocationContext.McpCapability>;
  readonly subagent?: boolean;
}

```

## makeWithOptions (McpSessionRegistry.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpSessionRegistry.ts:76–192](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpSessionRegistry.ts#L76-L192) · SHA-256 `14f2ac985283301afcd60d94b67acae02141c5fd40970840f0f47dc17126d949`

```typescript
const makeWithOptions = Effect.fn("McpSessionRegistry.make")(function* (
  options: McpSessionRegistryOptions = {},
) {
  const crypto = yield* Crypto.Crypto;
  const environment = yield* ServerEnvironment.ServerEnvironment;
  const environmentId = yield* environment.getEnvironmentId;
  const httpServer = yield* HttpServer.HttpServer;
  const state = yield* SynchronizedRef.make<RegistryState>({ records: new Map() });
  const currentTimeMillis = options.now ? Effect.sync(options.now) : Clock.currentTimeMillis;
  const livenessWindowMs = options.livenessWindowMs ?? DEFAULT_LIVENESS_WINDOW_MS;
  const endpoint = NetAddress.isInetAddress(httpServer.address)
    ? `http://${getHttpMcpEndpointHost(httpServer.address.address)}:${httpServer.address.port}/mcp`
    : "http://127.0.0.1/mcp";

  const hashToken = (token: string) =>
    crypto
      .digest("SHA-256", new TextEncoder().encode(token))
      .pipe(Effect.map(bytesToHex), Effect.orDie);

  const issue: McpSessionRegistryShape["issue"] = Effect.fn("McpSessionRegistry.issue")(
    function* (request) {
      const issuedAt = yield* currentTimeMillis;
      const providerSessionId = yield* crypto.randomUUIDv4().pipe(Effect.orDie);
      const rawToken = yield* crypto.randomBytes(32).pipe(Effect.map(tokenFromBytes), Effect.orDie);
      const tokenHash = yield* hashToken(rawToken);
      const browserToolsAvailable = request.browserToolsAvailable ?? true;
      const scope: McpInvocationContext.McpThreadInvocationScope = {
        environmentId,
        requestNamespace: providerSessionId,
        thread: {
          threadId: ThreadId.make(request.threadId),
          providerSessionId,
          providerInstanceId: ProviderInstanceId.make(request.providerInstanceId),
          subagent: request.subagent === true,
        },
        client: undefined,
        capabilities: new Set<McpInvocationContext.McpCapability>([
          "orchestration",
          "worktree",
          "pull-requests",
          ...(request.capabilities ?? (browserToolsAvailable ? (["preview"] as const) : [])),
        ]),
        issuedAt,
      };
      yield* SynchronizedRef.update(state, ({ records }) => {
        const next = new Map(records);
        next.set(tokenHash, { tokenHash, scope, lastAliveAt: issuedAt });
        return { records: next };
      });
      return {
        config: {
          environmentId,
          threadId: scope.thread.threadId,
          providerSessionId,
          providerInstanceId: scope.thread.providerInstanceId,
          endpoint,
          authorizationHeader: `Bearer ${rawToken}`,
          browserToolsAvailable: scope.capabilities.has("preview"),
          capabilities: scope.capabilities,
        },
      };
    },
  );

  const resolve: McpSessionRegistryShape["resolve"] = Effect.fn("McpSessionRegistry.resolve")(
    function* (rawToken) {
      if (rawToken.length === 0) return undefined;
      const tokenHash = yield* hashToken(rawToken);
      const timestamp = yield* currentTimeMillis;
      return yield* SynchronizedRef.modify(state, ({ records }) => {
        const record = records.get(tokenHash);
        if (!record || timestamp - record.lastAliveAt > livenessWindowMs) {
          return [undefined, { records }] as const;
        }
        const next = new Map(records);
        next.set(tokenHash, { ...record, lastAliveAt: timestamp });
        return [record.scope, { records: next }] as const;
      });
    },
  );

  const touch: McpSessionRegistryShape["touch"] = Effect.fn("McpSessionRegistry.touch")(
    function* (threadId) {
      const timestamp = yield* currentTimeMillis;
      yield* SynchronizedRef.update(state, ({ records }) => {
        const next = new Map(records);
        for (const [tokenHash, record] of records) {
          if (record.scope.thread.threadId === threadId) {
            next.set(tokenHash, { ...record, lastAliveAt: timestamp });
          }
        }
        return { records: next };
      });
    },
  );

  const revokeWhere = (predicate: (record: CredentialRecord) => boolean) =>
    SynchronizedRef.update(state, ({ records }) => ({
      records: new Map(Array.from(records).filter(([, record]) => !predicate(record))),
    }));

  return McpSessionRegistry.of({
    issue,
    resolve,
    touch,
    revokeProviderSession: Effect.fn("McpSessionRegistry.revokeProviderSession")(
      function* (providerSessionId) {
        yield* revokeWhere((record) => record.scope.thread.providerSessionId === providerSessionId);
      },
    ),
    revokeThread: Effect.fn("McpSessionRegistry.revokeThread")(function* (threadId) {
      yield* revokeWhere((record) => record.scope.thread.threadId === threadId);
    }),
    revokeAll: SynchronizedRef.set(state, { records: new Map() }),
  });
});

```

## mcpResourceMetadataUrl (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:81–86](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L81-L86) · SHA-256 `80061860fe0d9ed557ef68c624f6e4e24d183c67ac15fbe1d75caefb83c62980`

```typescript
const mcpResourceMetadataUrl = (request: HttpServerRequest.HttpServerRequest) =>
  HttpServerRequest.toURL(request).pipe(
    Option.map((url) => `${url.origin}/.well-known/oauth-protected-resource/mcp`),
  );

/** Launched agents cannot open OAuth browsers; OAuth would mint credentials outliving their session. */
```

## decodeModeLimit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:157–159](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L157-L159) · SHA-256 `1454520f645af22165002e64533cbc6483e353ba9a6b11570ea788db323a2f2a`

```typescript
const decodeModeLimit = Schema.decodeUnknownOption(
  Schema.Struct({ runtimeMode: RuntimeMode, interactionMode: ProviderInteractionMode }),
);
```

## parseModeLimit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:160–164](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L160-L164) · SHA-256 `fc894b444ef6a61fa0ea34c8ed08353d3696f1163ba338bcf7fa9c05ebb237b8`

```typescript
const parseModeLimit = (value: string) => {
  const [runtimeMode, interactionMode, ...rest] = value.trim().split("/");
  return rest.length === 0 ? decodeModeLimit({ runtimeMode, interactionMode }) : Option.none();
};

```

## invalidModeLimit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:165–173](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L165-L173) · SHA-256 `6b38059034f568a4efea7298d28b5a856965d19baa790021d3422cc654396873`

```typescript
const invalidModeLimit = HttpServerResponse.jsonUnsafe(
  {
    error: "invalid_mode_limit",
    message: "T3-Mode-Limit must be <runtimeMode>/<interactionMode>, e.g. auto/default.",
  },
  { status: 400, headers: { "cache-control": "no-store" } },
);

/** Applies a client's requested mode limit; undefined when the header is malformed. */
```

## withModeLimit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:174–186](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L174-L186) · SHA-256 `4806110eb9c233b27b374c39213d1c9146d9f04be6bc23b786b7cf718150d728`

```typescript
const withModeLimit = (
  invocation: McpInvocationContext.McpInvocationScope,
  request: HttpServerRequest.HttpServerRequest,
): McpInvocationContext.McpInvocationScope | undefined => {
  const header = request.headers[McpInvocationContext.MODE_LIMIT_HEADER];
  if (header === undefined || invocation.client === undefined) return invocation;
  const limit = parseModeLimit(header);
  return Option.isNone(limit)
    ? undefined
    : { ...invocation, client: { ...invocation.client, narrowedTo: limit.value } };
};

// The Linked environments beta is off here: links wait until it is on again.
```

## makeMcpAuthMiddleware (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:195–238](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L195-L238) · SHA-256 `1ab3645e2a11d15a24836d705b1133bd47bb62566550e1991ef28da609095260`

```typescript
const makeMcpAuthMiddleware = Effect.gen(function* () {
  const registry = yield* McpSessionRegistry.McpSessionRegistry;
  const clients = yield* Effect.serviceOption(McpClientAuthenticator);
  const serverSettings = yield* ServerSettings.ServerSettingsService;
  const linksEnabled = serverSettings.getSettings.pipe(
    Effect.map((settings) => settings.linkedEnvironmentsEnabled),
    Effect.orElseSucceed(() => false),
  );
  return Effect.fn("McpHttpServer.authenticateRequest")(function* (httpEffect) {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const authorization = request.headers.authorization;
    const token =
      authorization?.startsWith("Bearer ") === true
        ? authorization.slice("Bearer ".length).trim()
        : "";
    const invocation =
      (yield* registry.resolve(token)) ??
      (Option.isSome(clients) && token.length > 0
        ? yield* clients.value.authenticate(request)
        : undefined);
    if (!invocation) {
      yield* Effect.logWarning("rejected MCP request with an unusable credential", {
        reason: token.length === 0 ? "missing_bearer_token" : "unknown_or_expired_token",
      });
      return unauthorized({
        request,
        presentedToken: token.length > 0,
        offerOAuth: Option.isSome(clients) && !looksLikeProviderToken(token),
      });
    }
    const limited = withModeLimit(invocation, request);
    if (limited === undefined) return invalidModeLimit;
    const linkedEnvironments = yield* linksEnabled;
    if (limited.client?.linked === true && !linkedEnvironments) return linkedEnvironmentsOff;
    return yield* httpEffect.pipe(
      Effect.provideService(McpInvocationContext.McpInvocationContext, {
        ...limited,
        linkedEnvironments,
      }),
      Effect.map(normalizeMcpHttpResponse),
    );
  }) satisfies McpAuthMiddleware;
}).pipe(Effect.withSpan("McpHttpServer.makeAuthMiddleware"));

```

## saveScreenshot (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:427–446](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L427-L446) · SHA-256 `1b96b41201e74ec2dfb3d995c923fbf18172bb338b1c92f06ff3a35b069e50c2`

```typescript
const saveScreenshot = Effect.fn("McpHttpServer.saveScreenshot")(function* (
  pageUrl: string,
  data: Uint8Array,
) {
  const config = yield* ServerConfig.ServerConfig;
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const millis = yield* Clock.currentTimeMillis;
  const crypto = yield* Crypto.Crypto;
  const unique = (yield* crypto.randomUUIDv4().pipe(Effect.orDie)).slice(0, 8);
  const fileName = `browser-screenshot-${screenshotSiteSlug(pageUrl)}-${millis.toString(36)}-${unique}.png`;
  const screenshotPath = path.join(config.browserArtifactsDir, fileName);
  yield* fileSystem.makeDirectory(config.browserArtifactsDir, { recursive: true }).pipe(
    Effect.andThen(fileSystem.writeFile(screenshotPath, data)),
    Effect.mapError((cause) => new PreviewScreenshotSaveError({ screenshotPath, cause })),
  );
  return screenshotPath;
});

/** Decode with the advertised JSON codec, which permits null for optional fields that the raw schema rejects. */
```

## decodeAsAdvertised (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:447–455](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L447-L455) · SHA-256 `44cea0ce282fa74df971a103bf9b9132eef8cb9ea9eb50553bf3ff132c9086dc`

```typescript
const decodeAsAdvertised = <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>,
): Toolkit.Toolkit<Tools> =>
  Toolkit.make(
    ...Object.values(toolkit.tools).map((tool) =>
      tool.setParameters(Schema.toCodecJson(tool.parametersSchema)),
    ),
  ) as unknown as Toolkit.Toolkit<Tools>;

```

## previewSnapshotFailure (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:458–494](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L458-L494) · SHA-256 `469eb5202a2a9fc82c3f43b91518bd45b7b9a531cc99cd60f98528afc6595d8f`

```typescript
const previewSnapshotFailure = Effect.fn("previewSnapshotFailure")(function <E>(
  cause: Cause.Cause<E>,
) {
  if (Cause.hasInterrupts(cause) || cause.reasons.some(Cause.isDieReason)) {
    return Effect.failCause(cause).pipe(Effect.orDie);
  }
  const failures = cause.reasons.filter(Cause.isFailReason);
  const firstFailure = failures[0]?.error;
  const errorTag =
    typeof firstFailure === "object" &&
    firstFailure !== null &&
    "_tag" in firstFailure &&
    typeof firstFailure._tag === "string"
      ? firstFailure._tag
      : "PreviewSnapshotError";
  // Preview errors contain server-authored recovery guidance, never page output.
  const message = isPreviewAutomationError(firstFailure) ? firstFailure.message : undefined;
  const result = new McpSchema.CallToolResult({
    isError: true,
    structuredContent: {
      error: {
        _tag: errorTag,
        operation: "snapshot",
        failureCount: failures.length,
        ...(message === undefined ? {} : { message }),
      },
    },
    // Some clients show only the text content and others only structuredContent, so both carry it.
    content: [{ type: "text", text: `Preview snapshot failed: ${message ?? `${errorTag}.`}` }],
  });
  return Effect.logWarning("preview snapshot failed", {
    operation: "snapshot",
    errorTag,
    failureCount: failures.length,
  }).pipe(Effect.as(result));
});

```

## registerPreviewSnapshot (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:495–610](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L495-L610) · SHA-256 `5834347c43154088b638e31e85c005a66c657d567ec39e935c4965b3a22ab46b`

```typescript
const registerPreviewSnapshot = Effect.fn("McpHttpServer.registerPreviewSnapshot")(function* () {
  const server = yield* McpServer.McpServer;
  const broker = yield* PreviewAutomationBroker.PreviewAutomationBroker;
  const threads = yield* ThreadManagementService.ThreadManagementService;
  const saveServices = yield* Effect.context<
    ServerConfig.ServerConfig | FileSystem.FileSystem | Path.Path | Crypto.Crypto
  >();
  const built = yield* decodeAsAdvertised(PreviewSnapshotToolkit);
  const tool = PreviewSnapshotTool;
  yield* server.addTool({
    tool: new McpSchema.Tool({
      name: tool.name,
      description: Tool.getDescription(tool),
      inputSchema: advertisedJsonSchema(tool),
      annotations: {
        ...Context.getOption(tool.annotations, Tool.Title).pipe(
          Option.map((title) => ({ title })),
          Option.getOrUndefined,
        ),
        readOnlyHint: Context.get(tool.annotations, Tool.Readonly),
        destructiveHint: Context.get(tool.annotations, Tool.Destructive),
        idempotentHint: Context.get(tool.annotations, Tool.Idempotent),
        openWorldHint: Context.get(tool.annotations, Tool.OpenWorld),
      },
    }),
    annotations: tool.annotations,
    handle: (payload) =>
      Effect.withFiber((fiber) => {
        const invocation = Context.getUnsafe(
          fiber.context,
          McpInvocationContext.McpInvocationContext,
        );
        return built.handle("preview_snapshot", payload).pipe(
          Stream.unwrap,
          Stream.run(Sink.last()),
          Effect.flatMap(Effect.fromOption),
          Effect.provideService(PreviewAutomationBroker.PreviewAutomationBroker, broker),
          Effect.provideService(ThreadManagementService.ThreadManagementService, threads),
          Effect.provideService(McpInvocationContext.McpInvocationContext, invocation),
          Effect.flatMap(({ encodedResult }) =>
            Effect.gen(function* () {
              const snapshot = encodedResult as SnapshotMetadata & {
                readonly url: string;
                readonly screenshot: {
                  readonly mimeType: "image/png";
                  readonly data: string;
                  readonly width: number;
                  readonly height: number;
                };
              };
              const { screenshot, ...page } = snapshot;
              const png = new Uint8Array(Buffer.from(screenshot.data, "base64"));
              const screenshotPath =
                payload?.save === true ? yield* saveScreenshot(snapshot.url, png) : undefined;
              // Providers replay images on later requests, and some reject them; include images only when requested.
              const includeImage = payload?.includeImage === true;
              if (screenshotPath !== undefined && !includeImage) {
                const saved = {
                  url: cutText(snapshot.url, MAX_SNAPSHOT_IDENTIFIER_CHARS),
                  screenshotPath,
                };
                return new McpSchema.CallToolResult({
                  isError: false,
                  structuredContent: saved,
                  content: [{ type: "text", text: encodeJsonText(saved) }],
                });
              }
              const metadata = {
                ...page,
                screenshot: {
                  mimeType: screenshot.mimeType,
                  width: screenshot.width,
                  height: screenshot.height,
                },
                ...(screenshotPath === undefined ? {} : { screenshotPath }),
              };
              const bounded = boundSnapshotMetadata(metadata);
              return new McpSchema.CallToolResult({
                isError: false,
                structuredContent:
                  bounded.omitted.length === 0
                    ? bounded.value
                    : { ...bounded.value, omitted: bounded.omitted },
                content: [
                  {
                    type: "text",
                    text: encodeJsonText({
                      url: cutText(snapshot.url, MAX_SNAPSHOT_IDENTIFIER_CHARS),
                    }),
                  },
                  { type: "text", text: bounded.text },
                  ...(bounded.omitted.length === 0
                    ? []
                    : [
                        {
                          type: "text" as const,
                          text: `Snapshot text was bounded. Omitted: ${bounded.omitted.join("; ")}.`,
                        },
                      ]),
                  ...(includeImage
                    ? [{ type: "image" as const, data: png, mimeType: screenshot.mimeType }]
                    : []),
                ],
              });
            }),
          ),
          Effect.provide(saveServices),
          Effect.matchCauseEffect({
            onFailure: previewSnapshotFailure,
            onSuccess: Effect.succeed,
          }),
        );
      }),
  });
});

```

## ImageToolResult (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:611–621](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L611-L621) · SHA-256 `ab04c2dd61c1156a009bcc931dd9551c3e2629ecb8bb1fb6ffdb8e4928c2336f`

```typescript
interface ImageToolResult {
  readonly screenshot: {
    readonly mimeType: "image/png";
    readonly data: string;
    readonly width: number;
    readonly height: number;
  };
  readonly [key: string]: unknown;
}

/** Expose only undescribed failures' tags; remote messages may contain renderer or device output. */
```

## imageToolFailure (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:622–669](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L622-L669) · SHA-256 `47b5607b6ec42ce928b21765136e2d23dea83a352acc572bd82a4e4d6e455ba3`

```typescript
const imageToolFailure =
  <E>(toolName: string, operation: string, failureText: string | ((error: E) => string)) =>
  (cause: Cause.Cause<E>) => {
    if (Cause.hasInterrupts(cause) || cause.reasons.some(Cause.isDieReason)) {
      return Effect.failCause(cause).pipe(Effect.orDie);
    }
    const failures = cause.reasons.filter(Cause.isFailReason);
    const firstFailure = failures[0]?.error;
    const errorTag =
      typeof firstFailure === "object" &&
      firstFailure !== null &&
      "_tag" in firstFailure &&
      typeof firstFailure._tag === "string"
        ? firstFailure._tag
        : `${toolName}Error`;
    const message =
      typeof failureText === "string" || failures[0] === undefined
        ? undefined
        : failureText(failures[0].error);
    const result = new McpSchema.CallToolResult({
      isError: true,
      structuredContent: {
        error: {
          _tag: errorTag,
          operation,
          failureCount: failures.length,
          ...(message === undefined ? {} : { message }),
        },
      },
      // Some clients show only the text content and others only structuredContent, so both carry it.
      content: [
        {
          type: "text",
          text: typeof failureText === "string" ? failureText : (message ?? `${toolName} failed.`),
        },
      ],
    });
    return Effect.logWarning(`${toolName} failed`, {
      operation,
      errorTag,
      failureCount: failures.length,
    }).pipe(Effect.as(result));
  };

/**
 * `McpServer.toolkit` serializes every result as JSON text, which is the wrong
 * shape for a screenshot: the model needs image content.
 */
```

## registerImageTool (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:670–752](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L670-L752) · SHA-256 `ad4592a652e848c95bfc59c740514eff0a25ddf4b7c46d205d7a078bb8ddfc11`

```typescript
const registerImageTool = Effect.fn("McpHttpServer.registerImageTool")(function* <
  T extends Tool.Any,
  E,
  R,
>(
  tool: T,
  handle: (payload: Tool.Parameters<T>) => Effect.Effect<{ readonly encodedResult: unknown }, E, R>,
  provide: (
    effect: Effect.Effect<{ readonly encodedResult: unknown }, E, R>,
  ) => Effect.Effect<
    { readonly encodedResult: unknown },
    E,
    McpInvocationContext.McpInvocationContext
  >,
  operation: string,
  failureText: string | ((error: E) => string),
) {
  const server = yield* McpServer.McpServer;
  yield* server.addTool({
    tool: new McpSchema.Tool({
      name: tool.name,
      description: Tool.getDescription(tool),
      inputSchema: advertisedJsonSchema(tool),
      annotations: {
        ...Context.getOption(tool.annotations, Tool.Title).pipe(
          Option.map((title) => ({ title })),
          Option.getOrUndefined,
        ),
        readOnlyHint: Context.get(tool.annotations, Tool.Readonly),
        destructiveHint: Context.get(tool.annotations, Tool.Destructive),
        idempotentHint: Context.get(tool.annotations, Tool.Idempotent),
        openWorldHint: Context.get(tool.annotations, Tool.OpenWorld),
      },
    }),
    annotations: tool.annotations,
    handle: (payload) =>
      Effect.withFiber((fiber) => {
        const invocation = Context.getUnsafe(
          fiber.context,
          McpInvocationContext.McpInvocationContext,
        );
        return provide(handle(payload as Tool.Parameters<T>)).pipe(
          Effect.provideService(McpInvocationContext.McpInvocationContext, invocation),
          Effect.matchCauseEffect({
            onFailure: imageToolFailure(tool.name, operation, failureText),
            onSuccess: ({ encodedResult }) => {
              const { screenshot, ...rest } = encodedResult as ImageToolResult;
              const includeImage =
                (payload as { readonly includeImage?: boolean } | undefined)?.includeImage !==
                false;
              const metadata = {
                ...rest,
                screenshot: {
                  mimeType: screenshot.mimeType,
                  width: screenshot.width,
                  height: screenshot.height,
                },
              };
              return Effect.succeed(
                new McpSchema.CallToolResult({
                  isError: false,
                  structuredContent: metadata,
                  content: [
                    { type: "text", text: JSON.stringify(metadata) },
                    ...(includeImage
                      ? [
                          {
                            type: "image" as const,
                            data: new Uint8Array(Buffer.from(screenshot.data, "base64")),
                            mimeType: screenshot.mimeType,
                          },
                        ]
                      : []),
                  ],
                }),
              );
            },
          }),
        );
      }),
  });
});

```

## registerDeviceScreenshot (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:753–779](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L753-L779) · SHA-256 `6b2bbc837d0ada6e10f10b685d225d6d8bdd27fd245757bbb5eba3518f4b4cf7`

```typescript
const registerDeviceScreenshot = Effect.fn("McpHttpServer.registerDeviceScreenshot")(function* () {
  const devices = yield* DeviceService.DeviceService;
  const threads = yield* ThreadManagementService.ThreadManagementService;
  const built = yield* decodeAsAdvertised(DeviceScreenshotToolkit);
  yield* registerImageTool(
    DeviceScreenshotTool,
    (payload) =>
      built
        .handle("device_screenshot", payload)
        .pipe(Stream.unwrap, Stream.run(Sink.last()), Effect.flatMap(Effect.fromOption)),
    (effect) =>
      effect.pipe(
        Effect.provideService(DeviceService.DeviceService, devices),
        Effect.provideService(ThreadManagementService.ThreadManagementService, threads),
      ),
    "screenshot",
    (error) => {
      if (!isDeviceToolError(error)) {
        return isOrchestratorMcpFailure(error) ? error.message : "Device screenshot failed.";
      }
      return error._tag === "DeviceOperationError" && error.reason === "hub_rejected"
        ? `${error.message} Call device_list to check the device state, and device_open if it needs to be reopened.`
        : error.message;
    },
  );
});

```

## isDeviceToolError (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:781–782](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L781-L782) · SHA-256 `e0ec4a8b50516b89501989b69c44124c19f541a4f987af0a397dce273bab76be`

```typescript
const isDeviceToolError = Schema.is(DeviceToolError);

```

## registerHtmlPreview (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:783–810](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L783-L810) · SHA-256 `d04440719133ef3addccb889c5ba307a684014b732e8055ab24748dc2bcf069e`

```typescript
const registerHtmlPreview = Effect.fn("McpHttpServer.registerHtmlPreview")(function* () {
  const htmlRender = yield* HtmlRender.HtmlRender;
  const threads = yield* ThreadManagementService.ThreadManagementService;
  const built = yield* decodeAsAdvertised(HtmlPreviewToolkit);
  yield* registerImageTool(
    HtmlPreviewTool,
    (payload) =>
      built
        .handle("html_preview", payload)
        .pipe(Stream.unwrap, Stream.run(Sink.last()), Effect.flatMap(Effect.fromOption)),
    (effect) =>
      effect.pipe(
        Effect.provideService(HtmlRender.HtmlRender, htmlRender),
        Effect.provideService(ThreadManagementService.ThreadManagementService, threads),
      ),
    "preview",

    (error) =>
      isOrchestratorMcpFailure(error) || AiError.isAiError(error)
        ? error.message
        : "HTML preview failed.",
  );
});

/**
 * Tools that hand work to another thread's agent: they create it, message it,
 * steer it, or move context into it. Their events name the receiving agent too.
 */
```

## HANDOFF_TOOLS (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:811–821](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L811-L821) · SHA-256 `126b5a8de1a1c8cc2919d1da1bf9410382dd92017805743aba0bf11c6a8bc111`

```typescript
const HANDOFF_TOOLS: ReadonlySet<string> = new Set([
  "delegate_task",
  "create_threads",
  "t3_thread_launch",
  "t3_thread_send",
  "t3_thread_send_attachments",
  "schedule_task",
  "run_scheduled_task_now",
]);

/** Tool actions that hand work over with only a `{ sequence }` result; the input names the thread. */
```

## INPUT_TARGET_ACTIONS (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:822–827](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L822-L827) · SHA-256 `2b2fa65d9a8dcd54cc5c023035b1670fbe241167aee74f610137a4aac3b31ca0`

```typescript
const INPUT_TARGET_ACTIONS: Readonly<Record<string, ReadonlySet<string>>> = {
  t3_queue: new Set(["edit", "promote_to_steer"]),
  t3_pending_request: new Set(["respond"]),
};

/** Tool actions that hand work over and name the receiving thread in their result. */
```

## hasAction (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:832–839](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L832-L839) · SHA-256 `4946e25a7d7c8953685a9e8fc4124992b9260c3a26f41fd7bb4d5a871c5f6f35`

```typescript
const hasAction = (
  actions: Readonly<Record<string, ReadonlySet<string>>>,
  tool: string,
  args: unknown,
) =>
  actions[tool]?.has(String((args as { readonly action?: unknown } | null | undefined)?.action)) ===
  true;

```

## isInputTargetHandoff (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:840–842](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L840-L842) · SHA-256 `05844659e4bce8e97c073a6fa4db7147f7965b53f18f7b2da076c7e08b3c12de`

```typescript
const isInputTargetHandoff = (tool: string, args: unknown) =>
  hasAction(INPUT_TARGET_ACTIONS, tool, args);

```

## resultThreadKeys (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:843–845](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L843-L845) · SHA-256 `d84e020c4f3f910dbd0f893a2fbc38edef0ac9185a519180203b0c8fa1186df5`

```typescript
const resultThreadKeys = ["childThreadId", "targetThreadId", "boundThreadId", "threadId"] as const;

/** Thread ids a handoff tool result names: the thread that received the work. */
```

## handoffTargetIds (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:858–869](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L858-L869) · SHA-256 `559508427bb5754c82531ff5d1653f7d759880d214abbc138ce4955ddbe04a69`

```typescript
const handoffTargetIds = (
  tool: string,
  args: unknown,
  result: McpSchema.CallToolResult | undefined,
): ReadonlyArray<string> => {
  if (!isInputTargetHandoff(tool, args)) return resultThreadIds(result?.structuredContent);
  if (result === undefined || toolOutcome(result).outcome !== "ok") return [];
  const threadId = (args as { readonly threadId?: unknown } | null | undefined)?.threadId;
  return typeof threadId === "string" ? [threadId] : [];
};

/** Tool analytics must never include IDs, prompts or free text. */
```

## withToolAnalytics (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:870–1013](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L870-L1013) · SHA-256 `8b63120bb0e8c12c8fadbb0bee827c29d5bc87348a547fdef77389eea2e5b7d5`

```typescript
const withToolAnalytics =
  /* Request instrumentation already owns the span; keep this helper in that context. */
  Effect.fnUntraced(function* <A, E, R>(registration: Effect.Effect<A, E, R>) {
    const server = yield* McpServer.McpServer;
    const analytics = yield* Effect.serviceOption(AnalyticsService.AnalyticsService);
    if (Option.isNone(analytics)) return yield* registration;
    const registry = yield* Effect.serviceOption(ProviderRegistry.ProviderRegistry);
    const threads = yield* Effect.serviceOption(ThreadManagementService.ThreadManagementService);
    const shellOf = (threadId: string) =>
      Option.isNone(threads)
        ? Effect.succeed(null)
        : threads.value
            .getThreadShell(ThreadId.make(threadId))
            .pipe(Effect.orElseSucceed(() => null));
    // Delegation depth: parents walked from the caller, capped.
    const depthOf =
      /* Request instrumentation already owns the span; keep this helper in that context. */
      Effect.fnUntraced(function* (thread: AgentThread) {
        let depth = 0;
        let parentId =
          thread.lineage.relationshipToParent === "subagent" ? thread.lineage.parentThreadId : null;
        while (parentId !== null && depth < MAX_REPORTED_DEPTH) {
          depth += 1;
          const parent = yield* shellOf(parentId);
          parentId =
            parent?.lineage.relationshipToParent === "subagent"
              ? parent.lineage.parentThreadId
              : null;
        }
        return depth;
      });
    // Whether the caller's active run was started by a scheduled task.
    const scheduledRunOf = (threadId: string, runId: RunId | null) =>
      Option.isNone(threads) || runId === null
        ? Effect.succeed(false)
        : threads.value
            .getThreadRecords(ThreadId.make(threadId), ["runs", "messages"], {
              runIds: [runId],
              messageRoles: ["user"],
            })
            .pipe(
              Effect.map((records) => {
                const run = records.runs.find((candidate) => candidate.id === runId);
                return records.messages.some(
                  (message) =>
                    message.id === run?.userMessageId && message.scheduledTaskId !== undefined,
                );
              }),
              Effect.orElseSucceed(() => false),
            );
    const record =
      /* Request instrumentation already owns the span; keep this helper in that context. */
      Effect.fnUntraced(
        function* (
          tool: string,
          args: unknown,
          result: McpSchema.CallToolResult | undefined,
          durationMs: number,
        ) {
          const handoff =
            HANDOFF_TOOLS.has(tool) ||
            isInputTargetHandoff(tool, args) ||
            hasAction(RESULT_TARGET_ACTIONS, tool, args);
          const outcome = toolOutcome(result);
          // Agents call status, read, and preview tools in tight loops, so an
          // event per successful call floods analytics. Only failures count there.
          if (!handoff && outcome.outcome === "ok") return;
          // Client credentials (no calling thread) report an unknown caller.
          const invocation = Option.getOrUndefined(
            yield* Effect.serviceOption(McpInvocationContext.McpInvocationContext),
          )?.thread;
          const providers = Option.isSome(registry) ? yield* registry.value.getProviders : [];
          // Only handoff tools pay for thread lookups; the rest report the
          // caller's provider from the credential.
          const caller =
            handoff && invocation !== undefined
              ? ((yield* shellOf(invocation.threadId)) ?? undefined)
              : undefined;
          const targetIds = handoff
            ? [...new Set(handoffTargetIds(tool, args, result))].filter(
                (threadId) => threadId !== invocation?.threadId,
              )
            : [];
          const targets = yield* Effect.forEach(targetIds, shellOf);
          for (const properties of agentToolProperties({
            tool,
            providers,
            caller,
            ...(invocation === undefined
              ? {}
              : { callerProviderInstanceId: invocation.providerInstanceId }),
            ...(caller === undefined || invocation === undefined
              ? {}
              : {
                  callerDepth: yield* depthOf(caller),
                  callerScheduledRun: yield* scheduledRunOf(
                    invocation.threadId,
                    caller.activeRunId,
                  ),
                }),
            targets: targets.filter((thread) => thread !== null),
            outcome,
            ...(handoff
              ? { settings: handoffSettings(tool, args, result?.structuredContent) }
              : {}),
            durationMs,
          })) {
            yield* analytics.value.record("mcp.tool.invoked", properties);
          }
        },
        (effect, _tool, _args, _result, _durationMs) => effect.pipe(Effect.ignoreCause),
      );
    const recordingServer = McpServer.McpServer.of({
      ...server,
      addTool: Effect.fn("McpServer.addTool")(function (options) {
        return server.addTool({
          ...options,
          handle:
            /* Request instrumentation already owns the span; keep this helper in that context. */
            Effect.fnUntraced(function* (payload) {
              const startedAt = yield* Clock.currentTimeMillis;
              return yield* options.handle(payload).pipe(
                Effect.onExit((exit) => {
                  const result = exit._tag === "Success" ? exit.value : undefined;
                  // A call that asks for input is retried with it, and that call is the one counted.
                  if (result instanceof McpSchema.InputRequired) return Effect.void;
                  // Handoff tools look up threads to record; the response must not wait on them.
                  return Clock.currentTimeMillis.pipe(
                    Effect.flatMap((endedAt) =>
                      record(options.tool.name, payload, result, endedAt - startedAt),
                    ),
                    Effect.forkDetach,
                    Effect.asVoid,
                  );
                }),
              );
            }),
        });
      }),
    });
    return yield* registration.pipe(Effect.provideService(McpServer.McpServer, recordingServer));
  });

/** `McpServer.registerToolkit` advertises the full codec schema; agents get the compact one. */
```

## withAdvertisedSchemas (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1014–1047](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1014-L1047) · SHA-256 `13e648f3f134c5fd4db831117d75223234764f6c08371e2a0f4714cae4bef984`

```typescript
const withAdvertisedSchemas = Effect.fn("McpHttpServer.withAdvertisedSchemas")(function* <
  Tools extends Record<string, Tool.Any>,
  A,
  E,
  R,
>(toolkit: Toolkit.Toolkit<Tools>, registration: Effect.Effect<A, E, R>) {
  const server = yield* McpServer.McpServer;
  const tools: Record<string, Tool.Any> = toolkit.tools;
  const advertisingServer = McpServer.McpServer.of({
    ...server,
    addTool: Effect.fn("McpServer.addTool")(function (options) {
      const tool = tools[options.tool.name];
      return server.addTool(
        tool === undefined
          ? options
          : {
              ...options,
              tool: new McpSchema.Tool({
                ...options.tool,
                inputSchema: advertisedJsonSchema(tool),
              }),
            },
      );
    }),
  });
  return yield* registration.pipe(Effect.provideService(McpServer.McpServer, advertisingServer));
});

/**
 * `McpServer.toolkit` asks for every service its tools declare when it
 * registers them, but the auth middleware provides `McpInvocationContext` to
 * each request instead. Registration must not get one: the services it
 * captures would replace the request's.
 */
```

## toolkitRegistration (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1048–1065](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1048-L1065) · SHA-256 `936484cb62d73f32177563cf67d359f040448c163709474461eb822516b31c73`

```typescript
export const toolkitRegistration = <Tools extends Record<string, Tool.Any>, EX, RX>(
  toolkit: Toolkit.Toolkit<Tools>,
  handlers: McpToolAccess.HandlersLayer<Tools, EX, RX>,
) => {
  const registration = Layer.effectDiscard(
    withToolAnalytics(
      withAdvertisedSchemas(toolkit, McpServer.registerToolkit(decodeAsAdvertised(toolkit))),
    ),
  ).pipe(Layer.provide(McpServer.McpServer.layer));
  // @effect-diagnostics-next-line unsafeEffectTypeAssertion:off - the auth middleware provides it per request.
  const registered = registration as Layer.Layer<
    never,
    never,
    Exclude<Layer.Services<typeof registration>, McpInvocationContext.McpInvocationContext>
  >;
  return registered.pipe(Layer.provide(McpToolAccess.HandlersLayer.layer(handlers)));
};

```

## imageToolRegistration (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1066–1073](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1066-L1073) · SHA-256 `56ef045897749f04a73f225f915a294f22b5e6da10efcdd753e6f24364001d3b`

```typescript
const imageToolRegistration = <Tools extends Record<string, Tool.Any>, A, E, R, EX, RX>(
  register: Effect.Effect<A, E, R>,
  handlers: McpToolAccess.HandlersLayer<Tools, EX, RX>,
) =>
  Layer.effectDiscard(withToolAnalytics(register)).pipe(
    Layer.provide(McpToolAccess.HandlersLayer.layer(handlers)),
  );

```

## layerHtmlToolkit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1074–1078](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1074-L1078) · SHA-256 `4009ee930261e1fe23b1596c48e2ad2799f1b9a3a289e0706df4d169b52a8ec8`

```typescript
export const layerHtmlToolkit = Layer.mergeAll(
  toolkitRegistration(HtmlRenderToolkit, HtmlHandlers.layerRender),
  imageToolRegistration(registerHtmlPreview(), HtmlHandlers.layerPreview),
).pipe(Layer.provide(HtmlRender.layer));

```

## layerPreviewStandardToolkitRegistration (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1079–1083](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1079-L1083) · SHA-256 `53bed3207257cf9f140c241be32be73d66495507c1768dbfee93779b18da6c32`

```typescript
const layerPreviewStandardToolkitRegistration = toolkitRegistration(
  PreviewStandardToolkit,
  PreviewHandlers.layerStandard,
);

```

## layerPreviewSnapshotRegistration (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1084–1088](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1084-L1088) · SHA-256 `21019e6f01081d052d43acdbcb9ca0b4d9cfda146f4aaa533b59a36283b139cd`

```typescript
const layerPreviewSnapshotRegistration = imageToolRegistration(
  registerPreviewSnapshot(),
  PreviewHandlers.layerSnapshot,
);

```

## layerPreviewToolkit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1089–1093](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1089-L1093) · SHA-256 `cfbda299a88d5407309e343b14194b67d1a8f71e5b470264e3b0d4c683ea31f4`

```typescript
export const layerPreviewToolkit = Layer.mergeAll(
  layerPreviewStandardToolkitRegistration,
  layerPreviewSnapshotRegistration,
);

```

## layerOrchestratorToolkit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1094–1098](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1094-L1098) · SHA-256 `61a5040efe49acd0964c590be76a0b33c63aa5239c0365ddd8cd3738bba178ee`

```typescript
export const layerOrchestratorToolkit = toolkitRegistration(
  OrchestratorToolkit,
  OrchestratorHandlers.layer,
).pipe(Layer.provide(OrchestratorMcpService.layer), Layer.provide(ThreadMetadataMcpService.layer));

```

## layerThreadToolkit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1099–1100](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1099-L1100) · SHA-256 `d664c09a78b9188ef659d7e68ce54e68c3889ef218b2400f881f551959ed34b9`

```typescript
export const layerThreadToolkit = toolkitRegistration(ThreadToolkit, ThreadHandlers.layer);

```

## layerWorktreeToolkitRegistration (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1101–1105](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1101-L1105) · SHA-256 `0b3bbf781acd6beabb1bceb59f938a6e56dbe9ef0b5871f4692e80c802fce1e2`

```typescript
const layerWorktreeToolkitRegistration = toolkitRegistration(
  WorktreeToolkit,
  WorktreeHandlers.layer,
).pipe(Layer.provide(WorktreeMcpService.layer));

```

## layerPreviewControlsRegistration (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1106–1110](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1106-L1110) · SHA-256 `fa3ec46d17ee7e3de61b4c6e3b00fafb5fbadb093642b89f49048b9e337e5fd1`

```typescript
const layerPreviewControlsRegistration = toolkitRegistration(
  PreviewControlsToolkit,
  PreviewControlsHandlers.layer,
);

```

## layerEnvironmentToolkit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1111–1115](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1111-L1115) · SHA-256 `162cbf571e56a2c9d6973320bfd6a60b006c42adfa71ce6564a391c6d0d3a0a3`

```typescript
const layerEnvironmentToolkit = toolkitRegistration(
  EnvironmentToolkit,
  EnvironmentHandlers.layer,
).pipe(Layer.provide(ThreadCommandExecutor.layer));

```

## layerProjectRegistration (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1116–1117](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1116-L1117) · SHA-256 `6063fa5f80bf07592cbcb9444c5073ba6e8252f5ddb702fbda38a7f82c213656`

```typescript
export const layerProjectRegistration = toolkitRegistration(ProjectToolkit, ProjectHandlers.layer);

```

## layerAttachmentToolkit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1118–1122](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1118-L1122) · SHA-256 `edf338cefc42c35f3688988f2cb9682135befec935eb5c7b79a36e35273f8137`

```typescript
export const layerAttachmentToolkit = toolkitRegistration(
  AttachmentToolkit,
  AttachmentHandlers.layer,
);

```

## layerPullRequestsToolkit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1123–1127](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1123-L1127) · SHA-256 `7bac3ac9a1e26b45bf4ddf3a31b6027960e196ed847e4efa64de319d9ac1294a`

```typescript
export const layerPullRequestsToolkit = toolkitRegistration(
  PullRequestsToolkit,
  PullRequestsHandlers.layer,
);

```

## layerDeviceStandardToolkitRegistration (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1128–1132](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1128-L1132) · SHA-256 `3227463b2b6bc3db30b763e7a241f820a7f82e73bc178a80b34b4334455cca82`

```typescript
const layerDeviceStandardToolkitRegistration = toolkitRegistration(
  DeviceStandardToolkit,
  DeviceHandlers.layerStandard,
);

```

## layerDeviceScreenshotRegistration (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1133–1137](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1133-L1137) · SHA-256 `5623a24b4be9014ab0658ff4ba8d4030c7939b8b66aa25568136dc436af896a3`

```typescript
const layerDeviceScreenshotRegistration = imageToolRegistration(
  registerDeviceScreenshot(),
  DeviceHandlers.layerScreenshot,
);

```

## layerDeviceToolkit (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1138–1142](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1138-L1142) · SHA-256 `e0351f4baec04fa75b63141a6fe33953cc7bde82ec126b9bae6e92ef280cc92d`

```typescript
export const layerDeviceToolkit = Layer.mergeAll(
  layerDeviceStandardToolkitRegistration,
  layerDeviceScreenshotRegistration,
);

```

## layerMcpTransport (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1143–1151](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1143-L1151) · SHA-256 `8b2e29428d677a9ae36acffd7d6bb3ebe45eb285e8bf970752bf419b644cc004`

```typescript
export const layerMcpTransport = McpServer.layerHttp({
  name: "T3 Code",
  version: packageJson.version,
  path: "/mcp",
  protocols: [McpProtocol.v2025_06_18],
  allowSessionTermination: true,
}).pipe(Layer.provide(layerMcpAuthMiddleware));

/** Every tool the T3 MCP server advertises. AgentContextBudget.test.ts measures this set. */
```

## layerTools (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1152–1165](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1152-L1165) · SHA-256 `5c6d3d3d48716f8dde1a5dd81ce29760c392568f8adf5003728778ef2ebd86bf`

```typescript
export const layerTools = Layer.mergeAll(
  layerPreviewToolkit,
  layerOrchestratorToolkit,
  layerThreadToolkit,
  layerAttachmentToolkit,
  layerProjectRegistration,
  layerEnvironmentToolkit,
  layerPreviewControlsRegistration,
  layerWorktreeToolkitRegistration,
  layerPullRequestsToolkit,
  layerDeviceToolkit,
  layerHtmlToolkit,
);

```

## layer (McpHttpServer.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpHttpServer.ts:1166–1166](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpHttpServer.ts#L1166-L1166) · SHA-256 `4ca938907b5806abcc2b5f2f304a981ed98c3724d5cc3fcb67a28b33901e55c0`

```typescript
export const layer = layerTools.pipe(Layer.provideMerge(layerMcpTransport));
```

## builtHere (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:38–39](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L38-L39) · SHA-256 `68fb22bc68036ce8de7119116ad022b01ba9ce8036f508630d4ba2b7e99acae6`

```typescript
const builtHere: unique symbol = Symbol("t3/mcp/McpToolAccess/builtHere");

```

## refuseOutsideConstruction (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:40–45](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L40-L45) · SHA-256 `bde2a654743a1f430eab495348f4a9027ad500560c0cad3cdab505fc9becfe8b`

```typescript
const refuseOutsideConstruction = (token: symbol) => {
  if (token !== builtHere) {
    throw new TypeError("Only McpToolAccess builds MCP tool declarations and handler layers.");
  }
};

```

## declare (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:46–55](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L46-L55) · SHA-256 `2688813c5c604b86435d2862a5dc9c599994b2d204770b7ada369093abeda00a`

```typescript
let declare: <P, A, E, R>(
  handle: (params: P) => Effect.Effect<A, E, R>,
  remote: RemoteCheck<P> | undefined,
) => Declaration<(params: P) => Effect.Effect<A, E, R>>;

/**
 * What a call bound for a linked environment checks here before it goes: the
 * caller, not the thread or project it names, which live there and are
 * checked there. `undefined` for tools that act as the calling thread itself.
 */
```

## handlersLayer (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:69–73](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L69-L73) · SHA-256 `82e28b14b4013ec38f9fb4dab9d71c85e771d8e810358d5982ea9765230af887`

```typescript
let handlersLayer: <Tools extends Record<string, Tool.Any>, EX, RX>(
  layer: Layer.Layer<Tool.HandlersFor<Tools>, EX, RX>,
) => HandlersLayer<Tools, EX, RX>;

/** t3code/no-raw-mcp-registration confines Effect's unchecked registration API to McpHttpServer. */
```

## refuseReadOnlyClient (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:93–106](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L93-L106) · SHA-256 `bbddc507e8483940cdbfccad87b2ff14475beea6fa4d680383bcc1ee426b5595`

```typescript
const refuseReadOnlyClient = McpInvocationContext.McpInvocationContext.pipe(
  Effect.flatMap((scope) =>
    scope.client?.access === "read-only"
      ? Effect.fail(
          new OrchestratorMcpFailure({
            code: "capability_denied",
            message:
              "This tool changes the environment, and this MCP client was approved for read-only access.",
          }),
        )
      : Effect.void,
  ),
);

```

## requireThreadCaller (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:117–120](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L117-L120) · SHA-256 `84110376a744fd3747b4cb59efb6cef2aed5d00b78930d819480bdebdc6a5435`

```typescript
const requireThreadCaller = McpInvocationContext.McpInvocationContext.pipe(
  Effect.flatMap((scope) => McpInvocationContext.requireThreadScope(scope, "This tool")),
);

```

## writes (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:145–165](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L145-L165) · SHA-256 `236e6603f35004359125efabd40199bb5ee528030e1736071caac885d9dee026`

```typescript
export const writes = <P, A, E, R>(
  handle: (params: P) => Effect.Effect<A, E, R>,
  options?: {
    /** Whether a linked caller may make it, as for uploads its own sends need. */
    readonly linkedCallers?: "allowed";
  },
) =>
  declare(
    (params: P) =>
      orchestratingCaller.pipe(
        Effect.tap((caller) =>
          options?.linkedCallers === "allowed"
            ? Effect.void
            : assertNotLinked(caller, "change this environment's scheduled tasks"),
        ),
        Effect.flatMap(() => handle(params)),
      ),
    () => orchestratingCaller,
  );

/** Requires handler capability checks, not thread control; linked work is refused the same way. */
```

## writesWithCapability (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:166–175](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L166-L175) · SHA-256 `c01457f29832df66ccd149789d4528ccc17040b250c59a827fea76675ffb9eee`

```typescript
export const writesWithCapability = <P, A, E, R>(handle: (params: P) => Effect.Effect<A, E, R>) =>
  declare(
    (params: P) =>
      writingCaller.pipe(
        Effect.tap((caller) => assertNotLinked(caller, "start work here that is not its link's")),
        Effect.flatMap(() => handle(params)),
      ),
    () => writingCaller,
  );

```

## escalationDenied (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:210–218](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L210-L218) · SHA-256 `e746a71049abc1ca5d0b5db317b7d7a92d318330e32df33b086cb6a2a0c9ad96`

```typescript
const escalationDenied = (refusal: DispatchModeRefusal) =>
  new OrchestratorMcpFailure({
    code:
      refusal.mode === "runtime"
        ? "runtime_mode_escalation_denied"
        : "interaction_mode_escalation_denied",
    message: `Thread ${refusal.threadId} now runs in ${refusal.runtimeMode}/${refusal.interactionMode} mode, above this caller's. Its user changed it while this call ran.`,
  });

```

## StartedModes (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:219–230](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L219-L230) · SHA-256 `bf1fa9d222d02ffd0b29fb804aec5522ebae3b793e26fb160dc2e2a034632cbf`

```typescript
export interface StartedModes {
  readonly runtimeMode: RuntimeMode;
  readonly interactionMode: ProviderInteractionMode;
  /** The linked environment the caller acts for. The thread must carry it. */
  readonly linkOrigin: OrchestrationV2LinkOrigin | undefined;
}

/**
 * Starts threads with the modes `modes` requests, which may not be broader
 * than the caller's. `linked` says what a linked caller gets: threads stamped
 * with its `linkOrigin`, or a refusal where the tool cannot carry one.
 */
```

## startsThreads (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:231–261](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L231-L261) · SHA-256 `d1c72f8fdff4b81eabb0d5fbc0be095a4927b091c13f1e9b2727c9ff7f80ba44`

```typescript
export const startsThreads = <P, A, E, R>(
  modes: (params: P) => {
    readonly runtimeMode?: RuntimeMode | undefined;
    readonly interactionMode?: ProviderInteractionMode | undefined;
  },
  handle: (params: P, modes: StartedModes) => Effect.Effect<A, E, R>,
  linked: "stamped" | { readonly refused: string },
) => {
  const started = Effect.fn("McpToolAccess.started")(function* (caller: Caller, params: P) {
    const requested = modes(params);
    return {
      runtimeMode: yield* resolveRuntimeMode(caller.limits.runtimeMode, requested.runtimeMode),
      interactionMode: yield* resolveInteractionMode(
        caller.limits.interactionMode,
        requested.interactionMode,
      ),
      linkOrigin: callerLinkOrigin(caller),
    } satisfies StartedModes;
  });
  return declare(
    (params: P) =>
      Effect.gen(function* () {
        const caller = yield* writingCaller;
        if (linked !== "stamped") yield* assertNotLinked(caller, linked.refused);
        return yield* handle(params, yield* started(caller, params));
      }),
    (params: P) => Effect.flatMap(writingCaller, (caller) => started(caller, params)),
  );
};

/** One tool with two access rules, picked per call, such as create versus update. */
```

## Handlers (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:327–330](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L327-L330) · SHA-256 `6879ef2a2c484b21451f607346173d07db84d4790258a29797a98ac0662febf1`

```typescript
export type Handlers<Tools extends Record<string, Tool.Any>> = Declarations<
  Toolkit.HandlersFrom<Tools>
>;

```

## HandlersLayer (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:331–349](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L331-L349) · SHA-256 `9a364c03a25a07c56c037277dfef63366531851adebd36d26a03074291d315c2`

```typescript
export class HandlersLayer<Tools extends Record<string, Tool.Any>, EX = never, RX = never> {
  readonly #layer: Layer.Layer<Tool.HandlersFor<Tools>, EX, RX>;
  private constructor(
    token: typeof builtHere,
    layer: Layer.Layer<Tool.HandlersFor<Tools>, EX, RX>,
  ) {
    refuseOutsideConstruction(token);
    this.#layer = layer;
  }
  static {
    handlersLayer = (layer) => new HandlersLayer(builtHere, layer);
  }
  static layer<Tools extends Record<string, Tool.Any>, EX, RX>(
    handlers: HandlersLayer<Tools, EX, RX>,
  ) {
    return handlers.#layer;
  }
}

```

## checkedHandlers (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:350–357](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L350-L357) · SHA-256 `9e8bab1b8a7f3bc5d96e7bac6ce0aabf92d55f76261422144608c27bd8622006`

```typescript
const checkedHandlers = <Handlers>(declarations: Declarations<Handlers>): Handlers =>
  Struct.map(declarations, checkedHandler);

/**
 * A tool runs in a linked environment when its parameters take this target
 * as `environmentId`. Other tools may name an environment for their own
 * reasons, such as the one to link or to move a thread to.
 */
```

## takesLinkedEnvironment (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:358–366](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L358-L366) · SHA-256 `6d3ad2718c013a6b8ee036e10431428b1eb92ae06fbdd92aaa63eeee41041c3a`

```typescript
const takesLinkedEnvironment = (tool: Tool.Any) => {
  const parameters: unknown = tool.parametersSchema;
  return (
    Predicate.hasProperty(parameters, "fields") &&
    Predicate.hasProperty(parameters.fields, "environmentId") &&
    parameters.fields.environmentId === OrchestratorMcpEnvironmentTarget
  );
};

```

## linksUnavailable (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:367–377](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L367-L377) · SHA-256 `03302ce9643b95be0e1c7c8c42544fc56532367a57c160e5eca1d39a2910ba76`

```typescript
const linksUnavailable = new OrchestratorMcpFailure({
  code: "orchestration_error",
  message: "This environment cannot reach linked environments.",
});

/**
 * Every tool that takes a linked environment runs there the same way: its
 * declaration checks the caller here, and the same call goes to the other
 * environment, which checks the rest. The handler here never sees
 * `environmentId`, so it cannot leak into what it writes.
 */
```

## routed (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:378–410](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L378-L410) · SHA-256 `80647ed952206b0b17b6e3a5438488316fa59b1c66b705a2f3e69b52c488094e`

```typescript
const routed = Effect.fn("McpToolAccess.routed")(function* <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>,
  declarations: Handlers<Tools>,
  checked: Toolkit.HandlersFrom<Tools>,
) {
  // Optional so toolkits that never leave this environment build without it.
  const forwarding = yield* Effect.serviceOption(PeerForwarding.PeerForwarding);
  const handlers: Record<string, unknown> = { ...checked };
  for (const [name, declaration] of Object.entries<Declaration<unknown>>(declarations)) {
    const tool = toolkit.tools[name];
    if (tool === undefined || !takesLinkedEnvironment(tool)) continue;
    const remote = remoteCheckOf(declaration);
    if (remote === undefined)
      return yield* Effect.die(
        `${name} takes a linked environment, but it acts as its calling thread, which is here.`,
      );
    const here = handlers[name] as (
      params: object,
    ) => Effect.Effect<unknown, Tool.Failure<Tools[keyof Tools]>>;
    handlers[name] = ({ environmentId, ...params }: { readonly environmentId?: EnvironmentId }) =>
      Effect.gen(function* () {
        const scope = yield* McpInvocationContext.McpInvocationContext;
        const target = PeerForwarding.remoteTarget(scope, environmentId);
        if (target === undefined) return yield* here(params);
        if (scope.linkedEnvironments === false) return yield* PeerForwarding.linkedEnvironmentsOff;
        yield* (remote as RemoteCheck<typeof params>)(params);
        if (Option.isNone(forwarding)) return yield* linksUnavailable;
        return yield* forwarding.value.call(scope, tool, target, { ...params, environmentId });
      });
  }
  return handlers as Toolkit.HandlersFrom<Tools>;
});

```

## toLayer (McpToolAccess.ts)

Complete configuration/selection declaration. Defaults and precedence are source expressions.

**When:** Server settings, thread policy and MCP launch capabilities select the available tools and injected text.

[apps/server/src/mcp/McpToolAccess.ts:411–423](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/McpToolAccess.ts#L411-L423) · SHA-256 `db7816eb1eda3da345968308234f57bcb4bf5cee1f9e4fa3cbf364bbd51741c9`

```typescript
export const toLayer = <Tools extends Record<string, Tool.Any>, EX = never, RX = never>(
  toolkit: Toolkit.Toolkit<Tools>,
  build: Handlers<Tools> | Effect.Effect<Handlers<Tools>, EX, RX>,
): HandlersLayer<Tools, EX, Exclude<RX, Scope.Scope>> => {
  // Checked as soon as they are given, so a forged declaration fails here.
  const withDeclarations = (declarations: Handlers<Tools>) =>
    routed(toolkit, declarations, checkedHandlers(declarations));
  return handlersLayer(
    toolkit.toLayer(
      Effect.isEffect(build) ? Effect.flatMap(build, withDeclarations) : withDeclarations(build),
    ),
  );
};
```
