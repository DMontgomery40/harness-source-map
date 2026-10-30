# What wins

For each value Claude Code decides, every source it checks, in the order it checks them, and which one takes effect. Set rungs on a card to see the outcome. {{count:decisions id=*}} decisions; rungs marked Tested were checked against the requests Claude Code actually sent, and the rest were read from code. {{count:decisions-index status=pending}} knobs sit in decisions that are not traced yet.

## Tools and output

### Advisor tool available

Whether the advisor tool, which lets Claude consult a stronger reviewer model, can be used. When it can, Claude gets it once an advisor model is chosen, for example with the advisorModel setting.

- Before the ladder: `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`. Checked before the ladder: no advisor, whatever is set below. 1, true, yes and on count as set.
- Before the ladder: `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`. Checked before the ladder: turning off experimental betas also removes the advisor. A HIPAA-restricted organization gets the same result. 1, true, yes and on count as set.

1. **env** `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL`: 1, true, yes or on (any case) makes the advisor available without Anthropic's flag. It also skips the model catalog check on which main and advisor models may pair. Any other value counts as unset. Read from code.
2. **remote** Anthropic's advisor flag turned on: A remote flag that is off by default in code. When Anthropic turns it on for you, the advisor becomes available without the variable. Anthropic can change it without a release. Read from code.
3. **default** Default: When nothing above turns it on: no advisor. Read from code.

* After the ladder: Not on Anthropic's API. Only on Anthropic's API; a custom ANTHROPIC\_BASE\_URL still counts. With any other provider, including Claude Code's cloud gateway, there is no advisor, whatever is set in the ladder.
* After the ladder: The API refused the advisor. When the API refuses the advisor during a session, Claude Code stops offering it, for this process or for that host.

Source: `chunk-exevr2hy.js` · offset 193328177 · sha256 `43ed2584…`

### Bash output limit

How many characters of a Bash or PowerShell command's output Claude receives in the tool result before the rest is saved to a file and replaced by a short preview.

1. **remote** Anthropic's per-tool threshold: A table Anthropic sends can set the inline threshold for each tool by name, replacing the setting's value or the 30,000 default, even past 128,000. The table is empty in the code, so nothing changes unless Anthropic sends a value, which it can do without a release. Output past the read-back size (the setting, the environment variable up to 150,000, or 30,000) is still saved to a file, so the limit goes no higher than that. Read from code.
2. **settings** `bashOutputMaxChars`: A whole number, used for both Bash and PowerShell. Values below 4,000 are raised to 4,000 and values above 128,000 are lowered to it; zero, negatives, fractions and non-numbers are dropped without a warning. When set, the environment variable is ignored. Read from code.
3. **env** `BASH_MAX_OUTPUT_LENGTH`: Used only when the setting is not set. It sizes how much output is read back from the command, so it can shrink the limit below 30,000 but cannot raise it past the 30,000 inline threshold unless Anthropic's per-tool table sets a higher one. Zero, negatives and non-numbers fall back to 30,000 with only a debug-log line; values above 150,000 are lowered to it. Read from code.
4. **default** Built-in default: 30,000 characters. Read from code.

* After the ladder: Inline size threshold. Output longer than what is read back, or longer than this threshold, is saved to a file, and Claude gets the first 2,000 characters plus the file's path instead. The threshold is the setting's value, at most 128,000, or 30,000 when the setting is not set, unless Anthropic's per-tool table replaces it; the environment variable does not change it.

Source: `chunk-ndtggfhd.js` · offset 194124068 · sha256 `a78f2853…`

### MCP output limit

How many tokens of an MCP tool's result Claude receives in the tool result before the result is saved to a file or cut short.

1. **env** `MAX_MCP_OUTPUT_TOKENS`: A whole number of tokens. Zero, negatives and non-numbers are skipped without a warning, and the lookup moves on to Anthropic's value rather than straight to the default. There is no upper cap. Read from code.
2. **remote** Anthropic's per-tool table (MCP entry): Anthropic can send a token limit for all MCP tools in the same per-tool table that sets the Bash threshold, under its own MCP entry. The code's default table is empty, so this rung answers only when Anthropic sends a positive number, which it can do without a release; zero, negatives and non-numbers are skipped. Read from code.
3. **default** Built-in default: 25,000 tokens. Read from code.

* After the ladder: Built-in IDE connection. Checked before the ladder. Results from the built-in IDE connection are passed through without this limit.
* After the ladder: Tool declares its own result size. Checked before the ladder. An MCP tool that declares a positive anthropic/maxResultSizeChars value in its metadata skips this token limit, unless the result contains images.
* After the ladder: What happens to a result over the limit. A result whose estimated size is at most half the limit passes, and one whose text alone is estimated at more than four times the limit is over it; in between, the tokens are counted through the API, falling back to the estimate if counting fails. A result over the limit is normally saved to a file, and Claude gets the file's path, its format and instructions for reading it. It is instead cut to four characters per token of the limit, followed by a truncation notice, when ENABLE\_MCP\_LARGE\_OUTPUT\_FILES is set to a false value, when the result contains images, or when saving fails in remote-storage sessions; in other sessions a failed save returns an error with no content.
* After the ladder: Saved-file instructions wording. MCP\_TRUNCATION\_PROMPT\_OVERRIDE only changes the wording of the reading instructions for a saved file, not the limit: legacy picks the older wording and any other value the newer one. When it is unset, a flag Anthropic can change without a release decides, and the code's default is the older wording.
* After the ladder: General tool-result size threshold. After this check, MCP results also pass the size check every tool uses. For a tool that does not declare its own size it is 50,000 characters, so a text result under the token limit but longer than that is still saved to a file with a short preview. Anthropic's per-tool table can set this threshold for a single MCP tool by name without a release.

Source: `chunk-bdw2aat4.js` · offset 214438092 · sha256 `5e973538…`

### Stalled-stream watchdog

Whether Claude Code gives up on a streaming response that goes silent. On Anthropic's API it sets a deadline for the first byte and aborts the stream when no bytes arrive for the idle timeout (3 minutes by default). Some routes get only the idle abort.

1. **env** `CLAUDE_ENABLE_BYTE_WATCHDOG`: 0, false, no or off turns the watchdog off; 1, true, yes or on turns it on. Case and surrounding spaces are ignored. Any other value counts as unset. On the gateway, a custom base URL or a custom AWS address, on means only the idle abort, with no first-byte deadline. Read from code.
2. **remote** Anthropic's watchdog flag turned off: A remote flag that is on by default in code, so the watchdog runs unless Anthropic turns it off. Anthropic can change it without a release. Read from code.
3. **default** Default: When nothing above answers: on. On the gateway, a custom base URL or a custom AWS address, that means only the idle abort. Read from code.

* After the ladder: Provider without the watchdog. Vertex, Foundry, Mantle, Anthropic on Google Cloud, and Bedrock without CLAUDE\_ENABLE\_BYTE\_WATCHDOG\_BEDROCK (1, true, yes or on) get no watchdog, whatever the ladder says.

Source: `chunk-qbbnj0qn.js` · offset 190524177 · sha256 `13963cdb…`

### Workflow tool available

Whether the Workflow tool (multi-agent workflows) is offered to Claude. Settings and organization policy are checked each time; the remote flag and CLAUDE\_CODE\_WORKFLOWS are read once per session.

- Before the ladder: `CLAUDE_CODE_DISABLE_WORKFLOWS`. Checked before the ladder: no Workflow tool, whatever is set below. 1, true, yes and on count as set.
- Before the ladder: `disableWorkflows`. Checked before the ladder: disableWorkflows set to true in any settings file turns the tool off, whatever is set below.

1. **managed** Organization policy denies workflows: Workflows are allowed unless your organization's policy denies them. When it does, nothing below can turn the tool back on. Read from code.
2. **remote** Anthropic's workflows flag turned off: A remote flag that is on by default in code. When Anthropic turns it off, the tool is gone even with CLAUDE\_CODE\_WORKFLOWS or enableWorkflows set. Read once per session. Anthropic can change it without a release. Read from code.
3. **env** `CLAUDE_CODE_WORKFLOWS`: 0, false, no or off turns the tool off, even with enableWorkflows set to true. 1, true, yes or on turns it on, including on the Pro plan, but enableWorkflows set to false still wins. Any other value counts as unset. Read from code.
4. **settings** `enableWorkflows`: From any settings file Claude Code loads, including managed settings. true turns the tool on, including on the Pro plan; false turns it off. Read from code.
5. **default** Default by plan: When nothing above answers: off on the Claude Pro plan, on for every other sign-in, including API keys. Read from code.

Source: `chunk-jn6cj5wp.js` · offset 190111174 · sha256 `b4ddaca2…`

## Permissions and security

### API credential

Which credential Claude Code sends with requests to the Anthropic API: a subscription OAuth token (as a bearer token, with no API key), an auth token, or an API key, and from which source.

- Before the ladder: `CLAUDE_CODE_USE_BEDROCK`. Checked before the ladder: with Bedrock, Vertex or another cloud provider selected, that provider's own credentials are used. Exception: with CLAUDE\_CODE\_SKIP\_VERTEX\_AUTH, or CLAUDE\_CODE\_SKIP\_BEDROCK\_AUTH and no AWS\_BEARER\_TOKEN\_BEDROCK (likewise the Mantle and Google Cloud skip-auth switches), the bearer header from ANTHROPIC\_AUTH\_TOKEN or apiKeyHelper is sent instead.

1. **env** `CLAUDE_CODE_OAUTH_TOKEN`: On the web and in the desktop app a subscription token is checked before any API key or auth token. It is sent as a bearer token and no API key goes with it. Read from code.
2. **env** `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR`: A subscription token read from an inherited file descriptor, or from a token file the host places at a fixed path. Read from code.
3. **default** Signed in with claude.ai (/login): The saved claude.ai login. Not read when the host manages provider credentials (CLAUDE\_CODE\_PROVIDER\_MANAGED\_BY\_HOST). Read from code.
4. **env** `ANTHROPIC_AUTH_TOKEN`: Sent as a bearer token, and in your terminal it turns subscription sign-in off. An API key found by a lower rung is still sent with it, as x-api-key. Read from code.
5. **env** `ANTHROPIC_API_KEY`: Always used with -p (unless the client is the VS Code extension) and in bare mode. In an interactive session it is used only after you approve it at the prompt; an unapproved or rejected key is skipped. A configured apiKeyHelper is still sent alongside it as the bearer token, unless ANTHROPIC\_AUTH\_TOKEN is set. Read from code.
6. **env** `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR`: An API key read from an inherited file descriptor, or from a key file the host places at a fixed path. Not read in bare mode. Read from code.
7. **settings** `apiKeyHelper`: The script's output is sent as the API key and, unless ANTHROPIC\_AUTH\_TOKEN is set, also as a bearer token; it is cached and re-run after CLAUDE\_CODE\_API\_KEY\_HELPER\_TTL\_MS (default 5 minutes). In bare mode only a helper passed with --settings counts, one from project settings waits for workspace trust, and it is ignored when the host manages provider credentials. Read from code.
8. **env** `CLAUDE_CODE_OAUTH_TOKEN`: A subscription token, sent as a bearer token with no API key. With ANTHROPIC\_UNIX\_SOCKET set it is checked before any API key; with ANTHROPIC\_UNIX\_SOCKET set and no CLAUDE\_CODE\_OAUTH\_TOKEN, subscription sign-in is off. Read from code.
9. **env** `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR`: A subscription token from an inherited file descriptor or a host-provided token file. It is read before a saved login, except when the host restored the token from a background snapshot. Read from code.
10. **default** Signed in with claude.ai (/login): The login /login saved in the keychain or credentials file. It must carry the inference scope; a Console login does not, so it falls through to the next rung. Read from code.
11. **default** API key saved by /login (Console): Read from the macOS keychain or Claude Code's config file. Not read when the host manages provider credentials. Read from code.

* After the ladder: `forceLoginOrgUUID`. Checked at sign-in and before cloud sessions, not a rung. If managed policy settings cannot be read the check fails before any credential is looked at, unless the only problem is a policy file Claude Code is not permitted to read, which is logged instead. When managed settings pin an organization, an API key, auth token or apiKeyHelper makes the check fail, and an OAuth token from another organization is refused.
* After the ladder: `forceLoginMethod`. Checked when you sign in, not a rung: a claude.ai or Console sign-in of the other kind is refused. It does not reorder the ladder.
* After the ladder: Allowed API providers (allowedProviders in managed settings). Checked at sign-in and before cloud sessions, ahead of the organization pin; not a rung. When managed settings list the API providers this machine may use, a provider that is not listed, or one pointed at an endpoint the list does not allow, is refused, and so is every provider while the policy file cannot be read. It does not reorder the ladder.

Source: `chunk-3t8w43qz.js` · offset 189343055 · sha256 `a4ab7522…`

### Starting permission mode

Which permission mode a session starts in: default, acceptEdits, plan, auto, dontAsk or bypassPermissions.

- Before the ladder: `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`. Checked before the ladder: the session starts in default and every flag, agent and setting below is ignored, with a warning if one asked for another mode. Set it to 0 to opt out.

1. **flag** `--dangerously-skip-permissions`: Asks for bypassPermissions. In a background session where the bypass disclaimer has not been accepted, it answers default instead. Read from code.
2. **flag** `--permission-mode <mode>`: manual means default. Any other value stops Claude Code with an error. bypassPermissions in a background session without the disclaimer accepted answers default. Read from code.
3. **agent** Agent frontmatter permissionMode: From the agent the session runs as, chosen with --agent or the agent setting. Passed over with a warning when it would widen a mode passed with --inherit-permission-mode. Read from code.
4. **settings** `permissions.defaultMode`: manual means default. On the web only acceptEdits, plan, default and auto are honored. Project and local settings cannot grant auto or widen an inherited mode, and a bypassPermissions they ask for starts the session in default unless a mode is inherited. VS Code extension sessions ignore this setting unless Anthropic turns it on remotely. In VS Code, bypass mode from settings also requires the extension allow-bypass consent or an explicit bypass flag; without it the session starts in default with a notice. Read from code.
5. **flag** `--inherit-permission-mode <mode>`: A hidden flag a parent session passes on. Used only when nothing above answers. manual means default, and bypassPermissions in a background session without the disclaimer accepted answers default. Read from code.
6. **env** `CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT`: Starts a Remote Control machine session in auto when nothing above answers, even while Anthropic's answer for your organization is still pending. Read from code.
7. **remote** Anthropic's auto-by-default rollout: Two remote flags, both on by default in code, start a session in auto when nothing above answers: one for every session, and a second that print mode and the Agent SDK also need (the VS Code extension does not). Never on Claude Code on the web. While Anthropic's answer on whether auto can be your organization's default is still pending, the session starts in default; an organization seen under HIPAA starts in default with a notice. Anthropic can change both flags without a release. Read from code.
8. **default** Built-in default: When nothing above answers, the session starts in default. Read from code.

* After the ladder: `permissions.disableBypassPermissionsMode`. When set to disable, any rung that answers bypassPermissions is passed over with a warning and the next rung answers.
* After the ladder: `permissions.disableAutoMode`. When set to disable, a session that would start in auto starts in default: an explicit auto from a flag, an agent or settings resolves to auto and is switched to default once Claude Code checks whether auto is available, and the fallback to auto is blocked. In a Remote Control machine session an auto from settings is passed over instead, so an inherited mode can still answer. The top-level disableAutoMode setting does the same. A startup mode selected by proactive is recalculated when auto becomes unavailable and can fall back to acceptEdits.
* After the ladder: Anthropic's auto-mode switch. A remote flag that leaves auto mode available by default in code. When Anthropic switches auto mode off, auto answers are passed over and the next rung answers, and a session already in auto is switched to default once Claude Code checks whether auto is available. Anthropic can change it without a release.
* After the ladder: `--proactivity <level>`. Proactivity can replace the selected baseline mode. With a non-default proactivity level and no explicit --permission-mode, --dangerously-skip-permissions or agent permissionMode, startup replaces the baseline chosen above: ask chooses auto when available and default otherwise; proactive chooses auto when available and acceptEdits otherwise. Pending organization policy or a HIPAA restriction can hold the start in default. If auto is denied later, a start selected by proactive can fall back to acceptEdits instead of default. These adjustments are read from code; the card above shows the baseline ladder.

Source: `chunk-4zgsft74.js` · offset 190129550 · sha256 `abfe3fe8…`

### Which permission rules apply

Which allow, deny and ask rules are in force for a session: every source adds its rules, and managed policy can shut most sources out.

1. **settings** `permissions.allow in ~/.claude/settings.json or --settings`: Allow rules from your user settings file and from --settings. Each file's rules are read on their own and keep their source; --setting-sources can leave the user file out. Read from code.
2. **settings** `permissions.allow in .claude/settings.json`: Dropped with a warning until the workspace is trusted, unless the project folder is your home folder. Deny and ask rules from the same file still apply. Read from code.
3. **settings** `permissions.allow in .claude/settings.local.json`: Allow rules from the local project file. In a workspace that is not yet trusted these can be dropped too, depending on how the file is tracked. Read from code.
4. **settings** `permissions.deny`: Deny rules from the user, project, local and --settings files; --setting-sources can leave the user, project or local file out. Not gated by workspace trust. Read from code.
5. **settings** `permissions.ask`: Ask rules from the user, project, local and --settings files; --setting-sources can leave the user, project or local file out. Not gated by workspace trust. Read from code.
6. **managed** permissions.allow in managed settings: Allow rules set by an administrator. Always loaded. Read from code.
7. **managed** permissions.deny and ask in managed settings: Deny and ask rules set by an administrator. Always loaded. Read from code.
8. **flag** `--allowedTools, --allowed-tools <tools...>`: Allow rules from the command line. A rule naming a tool that does not exist is skipped with a warning. Read from code.
9. **flag** `--disallowedTools, --disallowed-tools <tools...>`: Deny rules from the command line. Read from code.
10. **agent** allowed-tools of managed or bundled skills and vouched-for plugins: While a skill or custom command runs, its allowed-tools frontmatter adds allow rules. Under managed-only rules, managed and bundled skills keep theirs, and a plugin keeps its own only on a channel an admin or Anthropic vouches for, such as host-delivered --plugin-dir plugins, the official marketplace, claude.ai-synced plugins Anthropic attests, your organization's claude.ai marketplaces, or marketplaces and npm packages that managed extraKnownMarketplaces or strictKnownMarketplaces name. Read from code.
11. **agent** allowed-tools of user, project or --add-dir skills and commands: Frontmatter from your own, project or --add-dir skills and commands, including plugins found inside those skill folders, and from plugins no managed setting vouches for. Read from code.
12. **session** Approvals given during this session: Allow rules added when you answer a permission prompt with a don't-ask-again-this-session choice. They last only for this session. Under managed-only rules the prompt does not offer that choice, and reloading settings clears these rules. Read from code.
13. **env** `CLAUDE_BG_SESSION_PERMISSION_RULES`: Background sessions only: the allow list from a JSON value that must carry both an allow and a deny list, or the whole value is skipped. Read from code.
14. **env** `CLAUDE_BG_SESSION_PERMISSION_RULES`: Background sessions only: the deny list from the same JSON value. Read from code.
15. **flag** `--tools <tools...>`: Built-in tools left out of --tools are withheld as deny rules. The launch tool list is frozen and also checked when tools are offered later, including family tools; MCP tools and exempt tool classes have their own rules. Read from code.

* After the ladder: `allowManagedPermissionRulesOnly`. allowManagedPermissionRulesOnly, counted only when set in managed settings: rules from every other settings file, --allowedTools, session allow rules (background-session rules and in-session approvals), user or project skill frontmatter and the frontmatter of plugins no managed setting vouches for are ignored. Deny rules from the command line and the session still apply.
* After the ladder: `CLAUDE_CODE_EVAL_CONFINED`. Drops every allow rule read from a settings file, managed policy included. Command-line and frontmatter allow rules are unaffected.
* After the ladder: `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG`. Restricted personal configuration withholds personal skill grants. allowed-tools is withheld from user or unspecified sources, and from plugins classified as personal: personal claude.ai marketplaces, plugins without a known identity, unattested synced plugins, and plugins discovered in skill folders. Host-catalog entries bypass this personal-source restriction. The managed-only check still applies to them. Project sources are not classified as personal by this check.

Source: `chunk-54hw721d.js` · offset 191123897 · sha256 `b721d77c…`

### Sandbox network proxy

Which proxy a sandboxed command's network traffic is sent to: none, a proxy you already run on a local port, or Claude Code's built-in proxy.

- Before the ladder: `CLAUDE_CODE_EVAL_CONFINED`. Checked before the ladder: when set, Claude Code ignores both proxy-port settings and uses its built-in proxy.

1. **default** Sandbox without network rules: When the sandbox has no domain list, no proxy settings reach the command. Read from code.
2. **settings** `sandbox.network.httpProxyPort`: Sends HTTP traffic to a proxy you already run on this localhost port, and Claude Code adds no proxy credentials to the proxy URLs. On Linux, commands inside the sandbox see localhost:3128, bridged to this port. Read from code.
3. **settings** `sandbox.network.socksProxyPort`: Sends SOCKS traffic to a proxy you already run on this localhost port. If the HTTP proxy port is not also set, the SOCKS proxy URLs still carry Claude Code's per-session credentials, so your proxy receives them. On Linux, commands inside the sandbox see localhost:1080, bridged to this port. Read from code.
4. **default** Claude Code's built-in proxy: Otherwise Claude Code starts one proxy that serves both HTTP and SOCKS on a random localhost port. It adds per-session credentials to the proxy URLs unless the HTTP proxy port setting is set. Read from code.

Source: `chunk-4nf5xfe5.js` · offset 192126645 · sha256 `c25b0b1c…`

## Prompt caching and context

### Auto-compact window

Whether Claude Code compacts the conversation automatically, and the window it compacts against: compaction starts once the conversation reaches the window minus room for the reply (up to 20,000 tokens) and a 13,000-token buffer.

- Before the ladder: `DISABLE_COMPACT`. Checked before the ladder: no automatic compaction, and the /compact command is turned off too.
- Before the ladder: `DISABLE_AUTO_COMPACT`. Checked before the ladder: no automatic compaction. /compact still works.
- Before the ladder: `autoCompactEnabled`. Checked before the ladder when set to false. Read from the highest-priority settings file that sets it, then from the older global config the /config toggle wrote; on by default.

1. **env** `CLAUDE_CODE_AUTO_COMPACT_WINDOW`: Any whole number of tokens: below 100,000 is raised to 100,000 and above 1,000,000 is lowered to 1,000,000. A value that is not a positive number is skipped with a debug-log message. Read from code.
2. **flag** `--autocompact`: auto, or a window from 100,000 to 1,000,000 tokens written as a number, with k or m, or as 100 to 1000 meaning thousands (500k, 200000 or 200). auto ignores the autoCompactWindow settings below and leaves the window to the rungs after them. Any other value is rejected with an error. Read from code.
3. **settings** `modelSettings.<model>.autoCompactWindow`: A window for one model, keyed by model name; the canonical name also matches its dated, \[1m\], Bedrock and Vertex spellings. auto means the window tuned for the model: the top-level autoCompactWindow is ignored for that model and the rungs below decide. Within one settings file it replaces the top-level value for that model, but a higher-priority file that sets the top-level value discards per-model values from lower-priority files. /autocompact saves here, in user settings. A value outside 100,000 to 1,000,000 is dropped when settings load. Read from code.
4. **settings** `autoCompactWindow`: The top-level value, used for every model that has no value of its own above. The highest-priority settings file that sets it wins. A value outside 100,000 to 1,000,000 is dropped when settings load. Read from code.
5. **remote** Anthropic's per-account window: Anthropic can send a window per model with your account data, or with your organization's startup data when you use Anthropic's API directly. None is sent by default in code. Anthropic can change it without a release. Read from code.
6. **remote** Anthropic's Opus 4.8 window experiment: Claude Opus 4.8 in an interactive session only; print mode (-p) and the Agent SDK skip it. Two remote flags, empty by default in code, can set a window. Anthropic can change them without a release. Read from code.
7. **remote** Anthropic's desktop app window experiment: Claude desktop app only, for a model whose 1M-token window is native here, when the Opus 4.8 experiment sets nothing. A remote flag, empty by default in code, can pick 600K or 500K. Anthropic can change it without a release. Read from code.
8. **default** Built-in 200K window: Claude Sonnet 4.6, Opus 4.6, Opus 4.8, Opus 5 and Opus 5.5 compact at 200K when their context window is under 1M. Other 1M-capable models get the same when CLAUDE\_CODE\_DISABLE\_1M\_CONTEXT is set or long-context credits are blocked. Read from code.
9. **default** Built-in window for Claude Sonnet 5: 1M tokens, or 500K in Cowork and local-agent sessions. Skipped when Anthropic's organization startup data lists the model. Read from code.
10. **default** Model with a native 1M window: A model whose 1M-token window is native here uses all of it. Skipped when Anthropic's organization startup data lists the model. Read from code.
11. **default** Unrecognized model: A model Claude Code does not recognize compacts at its full context window. CLAUDE\_CODE\_DISABLE\_UNKNOWN\_MODEL\_WINDOW\_ENFORCEMENT skips this rung. Read from code.
12. **default** No window configured: Nothing above answers, so there is no threshold: Claude Code compacts when the API rejects a prompt as too long. On Claude Code on the web a remote flag, off by default in code, decides; while it is off, compaction runs at the full context window. Read from code.

- The built-in 200K window also applies to other 1M-capable models when CLAUDE\_CODE\_DISABLE\_1M\_CONTEXT is set or long-context credits are blocked, which this ladder does not show: for those models auto-compaction starts near 200K tokens instead of waiting for the API to reject a prompt as too long.

* After the ladder: The model's context window. A window larger than the model's context window is cut down to it.
* After the ladder: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`. Leaves the window alone but moves the trigger earlier: any percent above 0 and up to 100 of the window after the reply room, never later than the usual trigger. Other values are ignored. On Claude Code on the web a remote flag, off by default in code, makes side questions and memory extraction ignore the percent while they are under the usual trigger. Anthropic can change it without a release.

Source: `chunk-qbbnj0qn.js` · offset 190570080 · sha256 `05726ca5…`

### Automatic memory

Whether Claude Code keeps automatic memory for the session: loads the project's memory folder into its instructions and may read and write files there.

- Before the ladder: `CLAUDE_CODE_SAFE_MODE`. Checked before the ladder: safe mode turns auto memory off, even with CLAUDE\_CODE\_DISABLE\_AUTO\_MEMORY=0. 1, true, yes and on count as set.
- Before the ladder: `--safe-mode`. Checked before the ladder: --safe-mode does the same as CLAUDE\_CODE\_SAFE\_MODE.

1. **flag** /pause-memory in this session: Checked first: once memory is paused for the session, nothing below turns it back on, not even CLAUDE\_CODE\_DISABLE\_AUTO\_MEMORY=0. Read from code.
2. **env** `CLAUDE_CODE_DISABLE_AUTO_MEMORY`: 1, true, yes or on turns auto memory off. 0, false, no or off forces it on and skips everything below, including autoMemoryEnabled set to false. Any other value counts as unset. Read from code.
3. **env** `CLAUDE_CODE_SIMPLE`: Bare mode turns auto memory off. CLAUDE\_CODE\_SIMPLE counts as set when it is 1, true, yes or on, and --bare sets the same switch. Read from code.
4. **env** `CLAUDE_CODE_REMOTE`: A remote session has no auto memory unless CLAUDE\_CODE\_REMOTE\_MEMORY\_DIR or CLAUDE\_COWORK\_MEMORY\_PATH\_OVERRIDE gives it a folder. CLAUDE\_CODE\_REMOTE counts as set when it is 1, true, yes or on. With either folder variable set, this rung does not answer. Read from code.
5. **remote** Anthropic's per-model memory switch: Two remote flags: a list of model names (empty by default in code) and a switch (off by default in code). When the switch is on and the session's model name contains a listed name, auto memory is off. CLAUDE\_CODE\_DISABLE\_AUTO\_MEMORY=0 skips this check. Anthropic can change both without a release. Read from code.
6. **settings** `autoMemoryEnabled`: Read from the merged settings, so any settings file Claude Code loads can set it. true turns auto memory on, false turns it off. The /memory toggle writes this key to your user settings. Read from code.
7. **default** Default: When nothing above answers, auto memory is on. Read from code.

- Auto memory is a folder of plain files on your machine. By default it is ~/.claude/projects/<project>/memory/, where <project> is the project's root folder path turned into a folder name, and MEMORY.md in it is the index Claude Code loads at the start of a session.
- CLAUDE\_CODE\_REMOTE\_MEMORY\_DIR replaces ~/.claude as the base of that default path. The folder itself can be moved: CLAUDE\_COWORK\_MEMORY\_PATH\_OVERRIDE wins, then autoMemoryDirectory from managed settings, --settings, local and project settings (only in a trusted folder or a non-interactive run), then user settings.
- Using the /memory toggle to turn auto memory on or off writes autoMemoryEnabled to your user settings file. Setting autoMemoryEnabled yourself in a settings file writes nothing else. /pause-memory turns auto memory off for the current session only.
- Memory stores are a separate decision: shared stores mounted next to your own memory, used when a remote flag (off by default in code) is on or CLAUDE\_MEMORY\_STORES is set. Whether Claude reaches memory through plain files or through memory tools is also decided separately, partly by another remote flag.
- A session that the app launching Claude Code marks as restricted also has no auto memory, whatever is set on this ladder.

Source: `chunk-3t8w43qz.js` · offset 189229624 · sha256 `8e861975…`

### Prompt cache TTL

How long Claude Code asks the API to keep a cached prompt prefix: 5 minutes or 1 hour, decided for every request.

- Before the ladder: `DISABLE_PROMPT_CACHING`. Checked before the ladder: no cache markers at all. The \_OPUS, \_SONNET, \_HAIKU, \_FABLE and \_MYTHOS variants do the same for one model family.

1. **env** `FORCE_PROMPT_CACHING_5M`: Forces 5 minutes. 0 and false count as off. Tested.
2. **env** `CLAUDE_CODE_PROMPT_CACHE_TTL`: Main-conversation requests only. Any other value is skipped without a warning. Tested.
3. **env** `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`: Every request that is not the main conversation. Any other value is skipped without a warning. Read from code.
4. **settings** `promptCacheTtl`: From any settings file Claude Code loads. Tested.
5. **settings** `subagentPromptCacheTtl`: From any settings file Claude Code loads. Read from code.
6. **agent** Agent frontmatter TTL: When the request comes from an agent that sets one. A 1h value is skipped while a subscriber is on extra usage. Read from code.
7. **env** `ENABLE_PROMPT_CACHING_1H`: Asks for 1 hour. Tested.
8. **env** `ENABLE_PROMPT_CACHING_1H_BEDROCK`: Bedrock only. Read from code.
9. **default** Not a subscriber, or on extra usage: API-key and provider sign-ins, and subscribers using extra usage, stop here. Read from code.
10. **remote** Anthropic's live-cache retention flag: A remote flag, off by default in code, keeps the automatic subscriber choice at 5 minutes when the last main-conversation request used the same model and a 5-minute TTL, is still the latest request, and is less than 5 minutes old. Explicit TTL choices above still win. Anthropic can change the flag without a release. Read from code.
11. **remote** Anthropic's 1-hour allowlist: A remote flag lists which request kinds get 1 hour; by default, the main conversation. Read once per session. Anthropic can change it without a release. Read from code.

Source: `chunk-bc48hzhc.js` · offset 197064852 · sha256 `a7d8e90b…`

### Tokens-left reminder budget

The number of tokens the padded-countdown reminder starts from, decided once when the session starts. It is used only when the reminder mode is padded-countdown.

1. **env** `CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET`: A number of tokens above zero, read from its leading digits: 2000000abc reads as 2,000,000 and fractions are cut off. Zero, negatives and values with no leading digits count as unset and the setting below decides. Read from code.
2. **settings** `totalTokensReminderBudget`: From any settings file Claude Code loads: a whole number of tokens above zero. The environment variable wins when both are set. Read from code.
3. **remote** Anthropic's per-account budget: Account data Claude Code downloads can set a whole number above zero. Nothing is set in the code, and any other value is ignored with a warning in the debug log. Anthropic can change it without a release. Read from code.
4. **remote** Anthropic's budget flag: A remote flag whose default in code is 15,000,000. A value that is not a number above zero also gives 15,000,000. Anthropic can change it without a release. Read from code.
5. **default** Default: When nothing above answers, 15,000,000 tokens. Read from code.

Source: `chunk-bc48hzhc.js` · offset 196399481 · sha256 `c4c2863b…`

### Total tokens reminder

Whether Claude is shown a tokens-left reminder, and which number it shows. The session mode is cached at startup, but an explicit request task budget forces padded-countdown. It is on by default for every sign-in, including API keys.

- Before the ladder: `CLAUDE_CODE_DISABLE_ATTACHMENTS`. Checked before the ladder: no reminder anywhere, neither in the system prompt nor after tool results or prompts. 1, true, yes and on count as set, in any case.
- Before the ladder: `CLAUDE_CODE_SIMPLE`. Checked before the ladder: simple mode drops the reminder everywhere, whatever is set below. 1, true, yes and on count as set, in any case.

1. **session** Explicit task budget on the request: A task budget passed on this request forces padded-countdown, even when the session environment or settings say off. The request budget replaces the session budget for the count. Disabling attachments or using simple mode still suppresses the reminder. Read from code.
2. **env** `CLAUDE_CODE_TOTAL_TOKENS_REMINDER`: Takes a mode name, not an on/off toggle: off, infinite, fixed, countdown or padded-countdown. Spaces around it are trimmed but case matters; 1, on, OFF or any other value counts as unset and the setting below decides. Read from code.
3. **settings** `totalTokensReminder`: From any settings file Claude Code loads. Takes the same mode names as the environment variable, which wins when both are set. Read from code.
4. **remote** Anthropic's per-account setting: Account data Claude Code downloads can pick a mode, or false to turn the reminder off. Nothing is set in the code, and any other value is ignored with a warning in the debug log. Anthropic can change it without a release. Read from code.
5. **remote** Anthropic's reminder flag: A remote flag whose default in code is padded-countdown. A value that is not a mode name also gives padded-countdown. Anthropic can change it without a release. Read from code.
6. **default** Default: When nothing above answers, padded-countdown: the system prompt shows the budget, and later reminders count down from it as tokens are used. The reminder appears in the system prompt, after each batch of tool results, and after each regular user prompt unless the after-user-turn switch is off. That switch is decided by its environment variable (1, true, yes or on; 0, false, no or off; anything else is unset), then its setting, then Anthropic's per-account data and remote flag, and is on by default. With it on, padded-countdown resets to the full budget at each user prompt; with it off, the count runs down across the whole session. Read from code.

* After the ladder: `totalTokensReminderBudget`. Where the padded countdown budget comes from Without an explicit request budget, the positive budget comes from CLAUDE\_CODE\_TOTAL\_TOKENS\_REMINDER\_BUDGET, then totalTokensReminderBudget in settings, then a positive integer in account data, then an Anthropic remote value. The built-in fallback is 15,000,000. Anthropic can change account data and the remote value without a release.

Source: `chunk-bc48hzhc.js` · offset 196399036 · sha256 `72d3f11e…`

## Models and reasoning

### Fast mode

Whether fast mode is available in a session and, if so, whether requests go out with it on.

- Before the ladder: `CLAUDE_CODE_DISABLE_FAST_MODE`. Checked before the ladder: fast mode is unavailable, whatever is set below.

1. **remote** Anthropic's fast-mode kill switch: A remote flag that is empty by default in code. When Anthropic sets it, fast mode is unavailable for everyone and the flag's text is shown as the reason. Anthropic can change it without a release. Read from code.
2. **settings** `availableModels leaves out Opus and the session model`: When availableModels leaves out Opus, fast mode is unavailable unless the session's own model is on the list and supports fast mode and the session isn't driven over Remote Control. Read from code.
3. **managed** `fastMode`: fastMode set to false in managed settings means your organization turned fast mode off. Nothing below turns it back on. Read from code.
4. **default** claude -p or the Agent SDK without the --settings opt-in: In claude -p and the Agent SDK, fast mode is unavailable unless fastMode is passed with --settings, which clears this gate. A fastMode setting in a settings file is not enough there. Checked before the organization check. Read from code.
5. **managed** Anthropic's server says your organization can't use fast mode: Claude Code asks Anthropic whether your organization may use fast mode. A no (no paid plan, turned off by an admin, or no usage credits) makes it unavailable, and fastMode in your user settings is cleared when that answer changes. Read from code.
6. **default** The organization check hasn't answered yet: Before the organization check has started, fast mode is unavailable. CLAUDE\_CODE\_SKIP\_FAST\_MODE\_ORG\_CHECK lifts this, and so does fastMode passed with --settings; both are ignored in cloud sessions. CLAUDE\_CODE\_SKIP\_FAST\_MODE\_NETWORK\_ERRORS does not. Read from code.
7. **default** The organization check failed or is still guessing: When the check fails on the network, or is still running with no earlier answer cached, fast mode is unavailable. CLAUDE\_CODE\_SKIP\_FAST\_MODE\_NETWORK\_ERRORS, CLAUDE\_CODE\_SKIP\_FAST\_MODE\_ORG\_CHECK or fastMode passed with --settings lifts this; all three are ignored in cloud sessions. Read from code.
8. **flag** /fast in this session: /fast turns fast mode on or off for the session and saves the choice to your user settings, unless you pick this session only. Turning it on switches to Opus when the current model can't run fast. When managed settings set fastModePerSessionOptIn, the this-session-only choice is refused. Read from code.
9. **flag** `fastMode: true passed with --settings`: fastMode set to true in the --settings flag is how claude -p and the Agent SDK opt in. It turns fast mode on at startup, even with fastModePerSessionOptIn in your own settings, but not when managed settings set fastModePerSessionOptIn. Outside cloud sessions it also lifts the organization-check blocks above. Read from code.
10. **managed** `fastModePerSessionOptIn`: Set in managed settings, every session starts with fast mode off, and only /fast (saved, not this-session-only) turns it on. Read from code.
11. **settings** `fastModePerSessionOptIn`: Set in any other settings file, a saved fastMode no longer carries over: each session starts off until you run /fast or pass fastMode with --settings. Read from code.
12. **settings** `fastMode`: fastMode from the merged settings files. true starts each interactive session with fast mode on; /fast writes this for you. Read from code.
13. **default** Default: When nothing above answers, fast mode is available but off. Read from code.
14. **env** `CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS`: Does not turn fast mode on. It only lifts the failed-check block above, not the wait before the check starts. Ignored in cloud sessions. Read from code.
15. **env** `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK`: Does not turn fast mode on. It skips the organization check and treats the organization as allowed, which lifts both organization-check blocks above. Ignored in cloud sessions. Read from code.

* After the ladder: fastMode: true passed with --settings. Passing fastMode: true with --settings clears the claude -p and Agent SDK gate, so the rungs below it decide.
* After the ladder: Not the Anthropic API. Fast mode only runs against the Anthropic API directly. On Bedrock, Vertex, Foundry or a gateway it is unavailable.
* After the ladder: Model can't run fast. Fast mode only applies to models that support it (Opus 5 family, Opus 4.8, or models the catalog marks as fast-capable). On any other model requests go out at normal speed.
* After the ladder: Fast-mode cooldown running. While a fast-mode cooldown is running, requests go out at normal speed; fast mode comes back on its own when the cooldown ends.
* After the ladder: The API refused fast mode for the fallback model. When the API refuses fast mode for the fallback model Claude Code switched to, requests to that model go out at normal speed for the rest of the session.

Source: `chunk-3t8w43qz.js` · offset 188963746 · sha256 `3f2e353f…`

### Main conversation model

Which model the main conversation sends its requests to.

1. **flag** /model during the session: Picking a model while the session runs replaces the startup choice for the rest of the session. Read from code.
2. **flag** `--model <model>`: Aliases such as sonnet, opus, haiku and fable become the current full id of that family, and a \[1m\] suffix asks for the 1M-token context version. --model default asks for the built-in default. Tested.
3. **agent** Model in the agent's frontmatter: When the session runs as an agent whose definition names a model, and --model is not given. A value of inherit is skipped. Read from code.
4. **env** `ANTHROPIC_MODEL`: Any model id or alias. It is checked before the model setting in every settings file. Tested.
5. **settings** `model`: From the merged settings files. An organization default model that overrides user choices can set aside a model from user or project settings; one from managed policy or --settings is kept. Tested.
6. **managed** Organization default model: A default model set for your organization, sent by Anthropic's servers with your account. It only applies when nothing above chose a model, and it can change without a release. Read from code.
7. **env** `ANTHROPIC_DEFAULT_MODEL`: Replaces the built-in default. The haiku and opusplan aliases, default and inherit are skipped without a warning, and it is ignored while enforceAvailableModels is on. Tested.
8. **default** Built-in default: Opus 5.5 for a plain API-key run. The code chooses between the Opus and Sonnet families by sign-in and provider, and ANTHROPIC\_DEFAULT\_OPUS\_MODEL or ANTHROPIC\_DEFAULT\_SONNET\_MODEL can change the id. Read from code.

* After the ladder: `availableModels`. A chosen model that is not on the list is dropped. An alias such as opus can become an allowed version of that family; otherwise the default is used, and lower rungs are not tried. An empty list allows no model.
* After the ladder: Managed policy's deniedModels blocks models. Read from managed policy only. A chosen model it blocks is dropped like one missing from availableModels: an alias can become a version of that family that is not blocked; otherwise the default is used, and lower rungs are not tried.
* After the ladder: `enforceAvailableModels`. With availableModels, the default is also kept on the list and ANTHROPIC\_DEFAULT\_MODEL is ignored. It is read from managed policy; when no managed policy exists, other settings files can set it. Set in policy without availableModels, it is turned off with a warning.

Source: `chunk-4zgsft74.js` · offset 190137956 · sha256 `8b946c9f…`

### Max output tokens

The max\_tokens a main-conversation request asks for: how many tokens the model may write in one response, thinking included.

1. **env** `CLAUDE_CODE_MAX_OUTPUT_TOKENS`: Any whole number up to the model's limit. Zero, negatives and non-numbers fall back to the default, with only a debug-log line; a value above the limit is lowered to it. Text after the leading digits is ignored, and 64,000 or 6.4e4 also parse. Tested.
2. **remote** Anthropic's served model list: On Anthropic's own API at its default address, a model list fetched from Anthropic can give each model a default output size. Nothing is set in the code, so the built-in table applies unless Anthropic sends one, which it can change without a release. Read from code.
3. **remote** Anthropic's per-account table: Account data can give a positive integer for this model. If it does not, Claude Code looks in the general account data's table by model name. The served model list still wins over both. Nothing is set in code, and Anthropic can change these values without a release. Read from code.
4. **default** Built-in default for the model: Claude Code's own table: 128,000 for Opus 5.5 and Sonnet 5.5, 64,000 for other current models, 32,000 for older ones and for models it does not recognize. Claude 3.5 models get 8,192. Read from code.

* After the ladder: Model's upper limit. Whatever the ladder picks is lowered to the model's limit: 128,000 for Opus 5.5, Sonnet 4.6 and later, Fable, Mythos and unrecognized models; 64,000 for Opus 4.5, Sonnet 4 and 4.5, Haiku 4.5 and Sonnet 3.7; 32,000 for Opus 4 and 4.1; 8,192 for Claude 3.5. On Anthropic's API the served model list can set a different limit.
* After the ladder: Claude Code lowers it for its own reasons. Some internal requests ask for a smaller cap, and after a context-overflow error the request is retried with what still fits. These can only lower the value, never raise it.

Source: `chunk-bc48hzhc.js` · offset 197213484 · sha256 `32880992…`

### Model id for a family on each provider

Which model id Claude Code sends when it resolves a model family (Opus, Sonnet, Haiku or Fable) on the active provider.

1. **env** `ANTHROPIC_DEFAULT_OPUS_MODEL`: Used exactly as written, on every provider, before any lookup. Read from code.
2. **env** `ANTHROPIC_DEFAULT_SONNET_MODEL`: Used exactly as written, on every provider, before any lookup. Read from code.
3. **env** `ANTHROPIC_DEFAULT_HAIKU_MODEL`: Used exactly as written, on every provider, before any lookup. Read from code.
4. **env** `ANTHROPIC_DEFAULT_FABLE_MODEL`: Used on every provider, before any lookup. Read from code.
5. **remote** Anthropic's served model catalog: Anthropic API only, with no custom ANTHROPIC\_BASE\_URL, and not for Fable. When the catalog names a model this version knows, that model's id still passes through modelOverrides, so a matching override key replaces it. Anthropic can change the catalog without a release. Read from code.
6. **settings** `modelOverrides`: The key must be the first-party id of the model this provider uses for the family, such as claude-sonnet-4-5 for Sonnet on Bedrock; the value replaces that model's provider id. A key naming any other model, such as claude-sonnet-5 on Bedrock, leaves this family's default alone. Read from code.
7. **default** Inference profile found in the AWS account: Bedrock only. Claude Code lists the account's inference profiles and uses the one for this model, preferring the region prefix from ANTHROPIC\_BEDROCK\_REGION\_PREFIX, otherwise your AWS region's prefix. us-gov regions always use us-gov. Read from code.
8. **default** Built-in model for this provider: The bundled model catalog names a model for each family and provider, and Claude Code sends that provider's id for it. On Bedrock the id carries a region prefix, and requests made before the profile lookup finishes land here. Read from code.

Source: `chunk-3t8w43qz.js` · offset 189051931 · sha256 `86c57773…`

### Reasoning effort

Which reasoning effort (low, medium, high, xhigh or max) Claude Code asks the API for, sent as output\_config.effort on each request.

1. **env** `CLAUDE_CODE_EXTRA_BODY`: An output\_config.effort inside CLAUDE\_CODE\_EXTRA\_BODY is sent as written. It is not checked or capped by maxEffortLevel. Read from code.
2. **agent** Effort supplied by a hook request: An explicit effort supplied by the hook request wins over the effort environment variable, per-turn effort and session settings. The normal model support and effort caps still apply. Read from code.
3. **env** `CLAUDE_CODE_EFFORT_LEVEL`: Case does not matter, and med means medium. Any other value is ignored without a warning. It wins over agent and skill effort, --effort and settings. Tested.
4. **env** `CLAUDE_CODE_EFFORT_LEVEL=auto`: auto or unset sends no effort, so the API uses its own default. If a maxEffortLevel cap is set, the model's default is sent instead. It shares its variable with the rung above, so only one of them can be set. Read from code.
5. **agent** Agent or skill effort: An agent's effort frontmatter applies to that agent's requests, and a skill's effort applies while the skill runs. Either wins over --effort and settings. Read from code.
6. **flag** `--effort <level>`: For this session. Case does not matter, med means medium and ultracode means xhigh. Any other value prints a warning and is ignored. Tested.
7. **session** Effort carried to the refusal fallback model: When a refusal switches the main conversation to its fallback model, carried effort holds inherited settings aside and wins over organization and model defaults. Explicit session, agent, skill or environment effort still wins. A per-model remote default disables the hold and the carry-over; a separate remote flag, off in code, also stops carry-over. Anthropic can change both flags without a release. Read from code.
8. **settings** `effortLevel in a project, local, --settings or managed file`: The highest-priority file that sets it wins, and it replaces the user file's value. It beats a modelSettings entry in a lower-priority file, such as a per-model choice saved in your user file. max is not accepted: the model's default is used. Tested.
9. **settings** `modelSettings.<model>.effortLevel`: An effortLevel for the model in use, keyed by its canonical name; Claude Code saves per-model effort choices here. Within one file it beats that file's effortLevel. max is not accepted; any other value means the model's default. Tested.
10. **settings** `effortLevel in the user settings file`: An older form: it applies only to models from before Claude Code started saving effort per model under modelSettings, and never to Opus 5.5 or Sonnet 5.5. On some older installs it also skips Opus 4.7, Opus 4.8 and Fable 5. Read from code.
11. **session** Carried fallback effort in an independent subagent: Independent subagents keep inherited effort settings ahead of carried fallback effort. If no explicit or inherited effort answers, carried effort wins over organization and model defaults. It is skipped when Anthropic sets a per-model remote default, or when Anthropic turns off carry-over remotely. Read from code.
12. **default** Your organization's default model: When your organization picks a default model with its own effort level and you are using that model. Anthropic provider only. Read from code.
13. **remote** Anthropic's per-model default: A remote flag can set a default effort per model. In code it sets none. Anthropic can change it without a release. Read from code.
14. **default** The model's default: The model's own default from Claude Code's model list: medium for Opus 5.5 and Sonnet 5.5, high for most others. A model with no listed default gets high. Read from code.

* After the ladder: Models without effort support get no effort at all. Models Claude Code does not treat as effort-capable, such as Claude 3, Opus 4.0 and 4.1, Sonnet 4.0 and 4.5 and Haiku 4.5, get no effort at all, even one put in CLAUDE\_CODE\_EXTRA\_BODY. CLAUDE\_CODE\_ALWAYS\_ENABLE\_EFFORT turns effort on for model IDs Claude Code does not recognize.
* After the ladder: `maxEffortLevel`. maxEffortLevel caps the result: a higher level is lowered to it. Across settings files the lowest cap wins, modelSettings.<model>.maxEffortLevel replaces it for one model, and an organization's cap for the model counts too. A cap of max changes nothing. It does not apply to CLAUDE\_CODE\_EXTRA\_BODY.
* After the ladder: max and xhigh become high on models that do not support them. Opus 5.5 and Sonnet 5.5 support both. Opus 4.6 and Sonnet 4.6 lack xhigh, and Opus 4.5 lacks both.
* After the ladder: With thinking turned off, levels above high become high on models that require it. Opus 5 is such a model. This also applies to a value from CLAUDE\_CODE\_EXTRA\_BODY.

Source: `chunk-4zgsft74.js` · offset 190126385 · sha256 `86db4552…`

### Thinking mode

Which thinking configuration Claude Code asks the API for on the main conversation's requests, sent as the thinking field: adaptive, budgeted (enabled with budget\_tokens), disabled, or no field at all.

1. **env** `CLAUDE_CODE_EXTRA_BODY`: A thinking object inside CLAUDE\_CODE\_EXTRA\_BODY replaces the one Claude Code built, even on models that reject disabled thinking and even with CLAUDE\_CODE\_DISABLE\_THINKING set. Extra keys on a disabled thinking object are stripped, leaving only type: disabled. The extra body is ignored when your organization's policy turns off experimental betas. Tested.
2. **env** `CLAUDE_CODE_DISABLE_THINKING`: Sends no thinking field at all, whatever --thinking, MAX\_THINKING\_TOKENS or settings say. The API then uses its own default for the model. Tested.
3. **flag** `--thinking <mode>`: A hidden flag. enabled means the same as adaptive: adaptive on models that support it, a default token budget on older models. disabled is sent only to Anthropic's API and only for models that accept it; Opus 5.5 and Sonnet 5.5 reject disabled thinking, so the field is left out instead. Tested.
4. **env** `MAX_THINKING_TOKENS`: A positive number turns thinking on. Models with adaptive thinking get adaptive and ignore the number; older models get it as budget\_tokens, kept between 1024 and one less than max\_tokens. 0, a negative number or anything that is not a number turns thinking off. Tested.
5. **flag** `--max-thinking-tokens <tokens>`: The older, hidden form of MAX\_THINKING\_TOKENS for -p runs, with the same meaning. It is ignored whenever MAX\_THINKING\_TOKENS is set, and a negative number is ignored. Tested.
6. **settings** `alwaysThinkingEnabled set to false`: Only false does anything: it turns thinking off. true is the same as leaving it unset. Interactive sessions can also switch thinking on or off for the session. Tested.
7. **default** Thinking on, shaped by the model: Thinking is on by default: adaptive on models that support it, a default token budget on older models, and no thinking field for Claude 3 models. In -p runs with text output the request also carries display omitted; interactive sessions send a display only when showThinkingSummaries is on. Reasoning effort does not change this choice. Subagent and side requests, such as the title request, pick thinking on a separate path that can turn it off. Read from code.

* After the ladder: Disabled thinking is sent only when the API and model accept it; otherwise no thinking field is sent. A disabled answer from --thinking, MAX\_THINKING\_TOKENS or alwaysThinkingEnabled becomes no field at all on Bedrock, Vertex or Foundry, on models without thinking, and on models that reject disabled thinking, such as Opus 5.5 and Sonnet 5.5. With thinking off, some models also lower a reasoning effort above high.

Source: `chunk-6nn5pbm0.js` · offset 204381062 · sha256 `d8ec8d60…`

## Privacy and interface

### Feedback survey

Whether Claude Code shows its session feedback survey and how often, checked again before each chance to show it. After you answer, it can also ask to share the transcript.

1. **remote** Anthropic's extension and desktop survey flag: VS Code extension and desktop app only. A remote flag that is off in code, so those apps get no survey unless Anthropic turns it on. Anthropic can change it without a release. Read from code.
2. **env** `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`: Turns the survey off everywhere, including in the extension and desktop app. 1, true, yes or on count, in any letter case; any other value is ignored. Read from code.
3. **env** `DISABLE_TELEMETRY`: Turning telemetry off also turns the survey off. Any value counts, even 0 or false. CLAUDE\_CODE\_ENABLE\_FEEDBACK\_SURVEY\_FOR\_OTEL undoes this. Read from code.
4. **env** `DO_NOT_TRACK`: Works like DISABLE\_TELEMETRY here, but only 1, true, yes or on count. CLAUDE\_CODE\_ENABLE\_FEEDBACK\_SURVEY\_FOR\_OTEL undoes this. Read from code.
5. **env** `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`: Turns the survey off. Any value counts, even 0 or false. CLAUDE\_CODE\_ENABLE\_FEEDBACK\_SURVEY\_FOR\_OTEL brings the survey back, but never the transcript ask. Read from code.
6. **managed** Organization policy denies product feedback: When your organization's policy denies product feedback, there is no survey and no transcript ask, whatever is set below. Read from code.
7. **env** `CLAUDE_FORCE_DISPLAY_SURVEY`: Terminal only. 1, true, yes or on shows the survey at the first chance in each session, skipping the model list, timing and rate below; after that the normal rules apply. Everything above still turns it off. Read from code.
8. **remote** Anthropic's survey model list: Terminal only. Anthropic's survey config lists the models the survey runs for; in code the list covers every model. Anthropic can change it without a release. Read from code.
9. **settings** `feedbackSurveyRate`: From any settings file Claude Code loads: the chance, from 0 to 1, that the survey appears at each prompt once the timing rules allow it. 0 turns it off. It replaces Anthropic's rate, including the rate passed to the extension and desktop app. Read from code.
10. **remote** Anthropic's survey rate: A remote config that is 0.005 in code: once the timing rules allow a survey, each prompt has a half-percent chance. In code the first chance comes after 10 minutes and 5 prompts, later ones at least an hour and 10 prompts apart, and never within about 28 hours of a survey in any session. Anthropic can change it without a release. Read from code.
11. **env** `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL`: Picks no rate itself. 1, true, yes or on stops DISABLE\_TELEMETRY, DO\_NOT\_TRACK and CLAUDE\_CODE\_DISABLE\_NONESSENTIAL\_TRAFFIC from turning the survey off, so the other rules decide. Read from code.

- As shipped, Claude Code never asks to share the transcript: after you answer bad, fine or good, the chance of asking is 0 in code for each answer.
- Anthropic can raise those chances remotely without a release.
- It never asks, whatever those chances are, when CLAUDE\_CODE\_DISABLE\_NONESSENTIAL\_TRAFFIC is set (even with CLAUDE\_CODE\_ENABLE\_FEEDBACK\_SURVEY\_FOR\_OTEL), when your organization's policy denies product feedback, when DISABLE\_FEEDBACK\_COMMAND or DISABLE\_BUG\_COMMAND is set, or after you choose don't ask again.
- Nothing is shared unless you answer yes.
- After the survey is typed over, it does not ask to share the transcript for that appearance, even if Anthropic enables the transcript-sharing chance.

Source: `chunk-bhz7hapx.js` · offset 216913438 · sha256 `861f6633…`

### Native terminal cursor

Whether Claude Code shows the terminal's own cursor at the input caret instead of drawing a block cursor, decided once per terminal.

1. **env** `CLAUDE_CODE_ACCESSIBILITY`: 1, true, yes or on (any case) turns the native cursor on, whatever is set below. Any other value counts as unset. Read from code.
2. **env** `CLAUDE_AX_SCREEN_READER`: Screen reader mode also turns the native cursor on. It comes from --ax-screen-reader, this variable, or the axScreenReader setting; 0, false, no or off here overrides the setting. A remote gate that is on by default in code can still keep screen reader mode off. Read from code.
3. **env** `CLAUDE_CODE_DECSTBM`: Turning on the scroll-region renderer keeps the drawn cursor. It only takes effect in an interactive terminal that supports it, and when other internal conditions allow. 0 or false does not turn the renderer off; it leaves the choice to Anthropic's flag below. Read from code.
4. **remote** Anthropic's scroll-region renderer flag turned on: A remote flag that is off by default in code. When Anthropic turns it on, the scroll-region renderer runs in supported terminals and the cursor stays drawn, even with CLAUDE\_CODE\_NATIVE\_CURSOR set. Anthropic can change it without a release. Read from code.
5. **env** `CLAUDE_CODE_NATIVE_CURSOR`: 1, true, yes or on (any case) turns the native cursor on. Only accessibility or screen reader mode beats it, and the scroll-region renderer above keeps the cursor drawn. Any other value counts as unset. Read from code.
6. **remote** Anthropic's native cursor flag turned on: A remote flag that is off by default in code. When Anthropic turns it on, you get the native cursor without setting anything. Anthropic can change it without a release. Read from code.
7. **default** Default: When nothing above answers: the drawn block cursor. Read from code.

Source: `chunk-fg8psmve.js` · offset 201234771 · sha256 `98d9567c…`

### Prompt suggestions

Whether Claude Code suggests your next prompt after a reply, decided when the session starts.

1. **flag** `--prompt-suggestions [value]`: Print mode and the Agent SDK only, where it is checked first. Given alone it means true. When true, the environment variable decides if it is set, otherwise the setting. Any other value stops Claude Code with an error. Read from code.
2. **default** Print mode without the flag: Print mode and the Agent SDK make no suggestions unless asked for them, even when the environment variable is on. Read from code.
3. **env** `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION`: Checked before Anthropic's flag, so on turns suggestions on even while the flag is off, and off turns them off everywhere. Case does not matter. Any other value is skipped without a warning. Read from code.
4. **remote** Anthropic's rollout flag: Interactive sessions only. A remote flag switches the feature on; in code it is off, so suggestions stay off unless the environment variable turns them on. Read when the session starts. Anthropic can change it without a release. Read from code.
5. **default** Agent-team teammate: A session running as a teammate in an agent team makes no suggestions. Read from code.
6. **settings** `promptSuggestionEnabled`: Your preference, from any settings file Claude Code loads. Only false turns suggestions off; leaving it out keeps them on. Read from code.
7. **default** Built-in default: Suggestions are on. Read from code.

Source: `chunk-5w49bkzy.js` · offset 202899973 · sha256 `b570842a…`

## What the model is told

### Git instructions and status

Whether Claude Code sends the model its built-in git commit and pull request instructions, and a snapshot of the repository's git status at the start of the conversation.

1. **env** `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS`: Checked first, in any letter case. 1, true, yes or on turns off both the instructions and the status snapshot; 0, false, no or off turns them on even when a setting says false. Any other value is ignored. Read from code.
2. **settings** `includeGitInstructions`: From any settings file Claude Code loads. false turns off both the instructions and the status snapshot. Read from code.
3. **default** Built-in default: Both are included. The instructions go in the Bash tool's description; the status snapshot (branch, main branch, git user, status and recent commits) goes in the session context. Turning them off also stops the remote-session notice about commit and pull request attribution, unless that notice has something else to report, such as a session link. Read from code.

- When the active directory is a different linked worktree of the main repository, the status collector pins its git commands to that worktree.

* After the ladder: `CLAUDE_CODE_REMOTE`. Remote session A remote session gets no new status snapshot. The git instructions still follow the ladder. A snapshot already announced earlier in the conversation, for example before a compaction or on resume, is carried forward instead.
* After the ladder: Custom system prompt. In non-interactive runs (claude -p and the SDK), a system prompt that replaces the default one gets no new status snapshot. A snapshot already announced earlier in the conversation, for example before a compaction or on resume, is carried forward instead.
* After the ladder: Explore or Plan subagent. The built-in Explore and Plan subagents get no new status snapshot. A snapshot already announced earlier in the conversation, for example before a compaction or on resume, is carried forward instead.
* After the ladder: Not a git repository. Outside a git repository, or when the git commands fail, there is no status snapshot.

Source: `chunk-bc48hzhc.js` · offset 195113008 · sha256 `e6b699b2…`

### To-do list reminders

Whether Claude Code reminds Claude about its to-do list or tasks when it has not used them for 10 turns, at most once every 10 turns.

1. **env** `CLAUDE_CODE_TODO_REMINDER_MODE`: Exactly baseline or off, in lower case; surrounding spaces are ignored. Any other value, such as 0 or false, counts as unset. Read from code.
2. **remote** Anthropic's reminder flag set to off: A remote flag that is baseline by default in code; only the value off turns reminders off. Anthropic can change it without a release. Read from code.
3. **default** Default: When nothing above answers: reminders on. Read from code.

Source: `chunk-bc48hzhc.js` · offset 198047535 · sha256 `85eadbf7…`

### Workflow size guideline

Which size guideline Claude is given for the multi-agent workflows it writes, fixed when the session starts and added to the Workflow tool's description whenever that tool is offered.

1. **settings** `workflowSizeGuideline`: From any settings file Claude Code loads, including managed settings. It beats the /config choice, and /config hides its row while a settings file sets the key. Any other value is ignored, so the /config choice applies even though its row stays hidden. Read from code.
2. **settings** Dynamic workflow size in /config: Your choice in /config, saved in the global config file (~/.claude.json). Changing it, or the settings key, during a session reaches Claude as a short note with your next prompt. A hand-edited value outside the four names is ignored. Read from code.
3. **default** Default by plan: When neither answers: small on the Claude Pro plan, medium for every other sign-in. Claude is told this is the default and that the user can raise or remove it in /config. Read from code.

Source: `chunk-8x7mtwfh.js` · offset 194420739 · sha256 `5255647d…`

## Settings and environment

### Where a setting's value comes from

Claude Code reads settings from five sources, over settings that plugins supply as the lowest layer. A single value comes from the highest source that sets it; lists combine across all of them.

1. **file** Managed policy (managed-settings.json): Set by an administrator. Always loaded. Read from code.
2. **file** --settings file or JSON: Loaded even when --setting-sources leaves the other files out. Read from code.
3. **file** .claude/settings.local.json: This project, this machine; not checked in. Read from code.
4. **file** .claude/settings.json: This project, shared with the team. Read from code.
5. **file** ~/.claude/settings.json: All your projects. Read from code.

- Credential-helper keys (apiKeyHelper, awsAuthRefresh, awsCredentialExport, gcpAuthRefresh, otelHeadersHelper, proxyAuthHelper) can be removed from a source before the merge, so for them the highest source that sets one does not always win.
- Some keys are read from particular sources rather than from this combined value, and can ignore the project files. Permission rules are one: see their own ladder.
- When managed policy requires managed read paths or managed domains, non-managed sandbox.allowRead and sandbox.network.allowedDomains entries trigger warnings. The warnings do not change the file precedence shown here.

* After the ladder: Managed policy's availableModels, enforceAvailableModels and modelPicker replace every other source's values. deniedModels is read only from managed policy; a value in any other source is dropped.

Source: `chunk-8mqjkh8a.js` · offset 188102527 · sha256 `6142ed07…`

### Where an environment variable's value comes from

When the shell, settings files and managed settings set the same environment variable, which value Claude Code runs with.

1. **env** Launch environment: When the desktop app or a runner starts the session, a variable already in the launch environment keeps its value. Every settings entry for it is ignored with a warning, managed settings included. Read from code.
2. **managed** `Managed settings env`: Applied last, so it overrides every settings file and the shell. Trusted before the trust prompt. Read from code.
3. **flag** `--settings env`: The env block of a --settings file or JSON string. Always read, even when --setting-sources leaves other files out, and trusted before the trust prompt. Tested.
4. **settings** `Local project settings env`: The env block in .claude/settings.local.json. Until the trust prompt is accepted only safe-list entries apply; the rest are applied once it is. Keys that pick folders or Claude Code's own plumbing are ignored here with a warning, except a few that are accepted when the value only turns something off and no higher source sets them. Read from code.
5. **settings** `Project settings env`: The env block in the project's .claude/settings.json. Same limits as the local file: safe-list entries only until the trust prompt is accepted, and folder or plumbing keys are ignored with a warning. Read from code.
6. **settings** `User settings env`: The env block in ~/.claude/settings.json. Trusted before the trust prompt. Not read when --setting-sources leaves user settings out. Tested.
7. **settings** Global config env (~/.claude.json): The env field in ~/.claude.json. Applied before any settings file, so it only overrides the shell. Read from code.
8. **env** Shell environment: The environment Claude Code was started with. Any settings source that sets the same variable overwrites it. Tested.

- For child processes of the background daemon, its injected FORCE\_COLOR=3 is removed unless a settings env block explicitly supplies FORCE\_COLOR. Those settings values are overlaid on the child environment.

Source: `chunk-5c0j5a0m.js` · offset 190201454 · sha256 `42d9f863…`
