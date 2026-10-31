# T3 Code: an orchestrator over other harnesses

T3 Code runs Claude Code, Codex/ChatGPT, OpenCode, Cursor, Pi, Muse and ACP providers. It adds orchestration instructions and a capability-filtered t3-code MCP server to their own harness context.

## Delivery is provider-specific

Claude Code receives a preset system-prompt append and device guidance through a SubagentStart hook. Codex/ChatGPT receives numbered application developer-context sections below the per-entry cap. OpenCode receives system text; ACP and Cursor prepend instructions to the user request. Pi loads the MCP extension source. Runtime identity and PR-linking text accompany the applicable provider paths.

## Source and observation

Release v0.1.6-nightly.20261031.3956, commit `d92c437baa19409f99416a44f748f148f4317c65`. Pinned public source evidence, not observed model delivery. Runtime settings and tool capabilities control activation. Templates retain upstream substitutions; no local values or private sessions are inputs. The source inventory accounts for the public runtime workspace closure. The discovery ledger reports unanswered classification separately.

## Tools and infrastructure

The tool catalog preserves every Tool.make declaration and its parameter-schema source dependencies. Server settings and per-launch capabilities filter the catalog. Build intel records relay, Clerk, telemetry and update configuration; build-time placeholders do not establish an installed destination. See the pinned source links on each record.
