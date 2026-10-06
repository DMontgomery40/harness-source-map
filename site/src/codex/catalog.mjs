// `records` (optional) names the structured records the search index ties to a page's entry
// headings (site/src/shared/search-index.mjs recordSpec); tag-filter records count already.
export const categories = [
  {
    label: "Overview",
    files: [
      {
        path: "outputs/devday-update.md",
        anchor: "devday-update-md",
        slug: "devday-update",
        format: "markdown",
        title: "Dev Day: harness changes",
        defaultOpen: true
      },
      {
        path: "outputs/key-findings.md",
        anchor: "key-findings-md",
        slug: "key-findings",
        format: "markdown",
        title: "Key findings",
        defaultOpen: true
      },
      {
        path: "outputs/chatgpt-work-source-check-2026-09-24.md",
        anchor: "chatgpt-work-source-check-2026-09-24-md",
        slug: "chatgpt-work",
        snapshot: "September 24, 2026",
        format: "markdown",
        title: "ChatGPT Work",
        defaultOpen: true
      }
    ]
  },
  {
    label: "Model instructions",
    files: [
      {
        path: "outputs/collaboration-modes.md",
        anchor: "collaboration-modes-md",
        slug: "collaboration-modes",
        records: "outputs/collaboration-modes.json",
        format: "markdown",
        title: "Plan mode and Default mode",
        defaultOpen: true
      },
      {
        path: "outputs/persistent-instructions.md",
        anchor: "aeon-persistent-instructions-2026-09-24-md",
        slug: "persistent-mode-instructions",
        format: "markdown",
        title: "Persistent mode instructions",
        instructionProfile: "persistent",
        defaultOpen: true
      },
      {
        path: "outputs/gpt-6-astra-base-instructions.md",
        anchor: "gpt-6-astra-base-instructions-2026-09-24-md",
        slug: "astra-base-instructions",
        format: "markdown",
        title: "Astra base instructions",
        instructionProfile: "base",
        defaultOpen: true
      },
      {
        path: "outputs/gpt-6-sol-base-instructions.md",
        anchor: "gpt-6-sol-base-instructions-2026-09-24-md",
        slug: "sol-base-instructions",
        format: "markdown",
        title: "Sol base instructions",
        instructionProfile: "base",
        defaultOpen: false
      },
      {
        path: "outputs/gpt-6.1-sol-base-instructions.md",
        anchor: "gpt-6-1-sol-base-instructions-md",
        slug: "gpt-6-1-sol-base-instructions",
        format: "markdown",
        title: "GPT-6.1 Sol base instructions",
        instructionProfile: "base",
        defaultOpen: false
      },
      {
        path: "outputs/gpt-6-luna-base-instructions.md",
        anchor: "gpt-6-luna-base-instructions-2026-09-24-md",
        slug: "luna-base-instructions",
        format: "markdown",
        title: "Luna base instructions",
        instructionProfile: "base",
        defaultOpen: false
      },
      {
        path: "outputs/gpt-6-instruction-modules.md",
        anchor: "gpt-6-astra-instruction-modules-2026-09-24-md",
        slug: "conditional-instruction-modules",
        format: "markdown",
        title: "Conditional instruction modules",
        instructionProfile: "modules",
        defaultOpen: true
      },
      {
        path: "outputs/other-catalog-models.md",
        anchor: "other-catalog-models-md",
        slug: "other-catalog-models",
        format: "markdown",
        title: "Other models in the catalog",
        promptText: true,
        defaultOpen: false
      },
      {
        path: "outputs/model-comparison.json",
        anchor: "codex-gpt6-model-prompt-comparison-2026-09-24-json",
        slug: "three-model-prompt-comparison",
        format: "source",
        title: "Model prompt comparison",
        defaultOpen: false
      }
    ]
  },
  {
    label: "Prompts",
    files: [
      {
        path: "outputs/chatgpt-conversation-prompts.md",
        anchor: "chatgpt-conversation-prompts-md",
        slug: "chatgpt-conversation-prompts",
        records: "outputs/chatgpt-conversation-prompts.json",
        format: "markdown",
        title: "Conversation prompts",
        defaultOpen: false
      },
      {
        path: "outputs/chatgpt-gpt-builder-prompts.md",
        anchor: "chatgpt-gpt-builder-prompts-md",
        slug: "chatgpt-gpt-builder-prompts",
        records: "outputs/chatgpt-gpt-builder-prompts.json",
        format: "markdown",
        title: "GPT builder prompts",
        defaultOpen: false
      },
      {
        path: "outputs/chatgpt-work-prompts.md",
        anchor: "chatgpt-work-prompts-md",
        slug: "chatgpt-work-prompts",
        records: "outputs/chatgpt-work-prompts.json",
        format: "markdown",
        title: "Work prompts",
        defaultOpen: false
      },
      {
        path: "outputs/chatgpt-finance-health-prompts.md",
        anchor: "chatgpt-finance-health-prompts-md",
        slug: "chatgpt-finance-health-prompts",
        records: "outputs/chatgpt-finance-health-prompts.json",
        format: "markdown",
        title: "Finance and health prompts",
        defaultOpen: false
      },
      {
        path: "outputs/chatgpt-sites-artifacts-prompts.md",
        anchor: "chatgpt-sites-artifacts-prompts-md",
        slug: "chatgpt-sites-artifacts-prompts",
        records: "outputs/chatgpt-sites-artifacts-prompts.json",
        format: "markdown",
        title: "Sites and artifacts prompts",
        defaultOpen: false
      },
      {
        path: "outputs/voice-prompts.md",
        anchor: "codex-voice-prompts-2026-09-24-md",
        slug: "bundled-codex-voice-prompts",
        format: "markdown",
        title: "Bundled Codex/ChatGPT voice prompts",
        instructionProfile: "voice",
        defaultOpen: true
      },
      {
        path: "outputs/desktop-helper-prompts.md",
        anchor: "codex-desktop-helper-prompts-2026-09-24-md",
        slug: "codex-helper-prompt-inventory",
        format: "markdown",
        title: "Codex/ChatGPT helper prompt inventory",
        promptText: true,
        defaultOpen: false
      },
      {
        path: "outputs/desktop-model-facing-text.md",
        anchor: "desktop-model-facing-text-md",
        slug: "desktop-model-facing-text",
        records: "outputs/desktop-model-facing-text.json",
        format: "markdown",
        title: "Other model-facing text",
        defaultOpen: false
      },
      {
        path: "outputs/codex-cli-prompts.md",
        anchor: "codex-cli-prompts-md",
        slug: "codex-cli-prompts",
        records: "outputs/codex-cli-prompts.json",
        format: "markdown",
        title: "CLI prompt templates",
        defaultOpen: false
      }
    ]
  },
  {
    label: "Tools and features",
    files: [
      {
        path: "outputs/desktop-tool-manifest.md",
        anchor: "desktop-tool-manifest-md",
        slug: "tool-manifest",
        records: { file: "outputs/desktop-tool-manifest.json", list: "tools", kind: "tool" },
        format: "markdown",
        title: "Tool manifest (live)",
        defaultOpen: false
      },
      {
        path: "outputs/host-tool-registry-2026-10-04.json",
        anchor: "host-tool-registry-2026-10-04-json",
        slug: "host-tool-registry-2026-10-04",
        records: { file: "outputs/host-tool-registry-2026-10-04.json", lists: ["tools"], kind: "tool" },
        snapshot: "October 4, 2026",
        format: "source",
        title: "Host tool capture (October 4)",
        defaultOpen: false
      },
      {
        path: "outputs/current-host-tool-manifest-2026-09-24.json",
        anchor: "current-host-tool-manifest-2026-09-24-json",
        slug: "complete-host-tool-manifest",
        records: { file: "outputs/current-host-tool-manifest-2026-09-24.json", lists: ["tools", "direct_tools"], kind: "tool" },
        snapshot: "September 24, 2026",
        format: "source",
        title: "Host tool capture (September 24)",
        defaultOpen: false
      },
      {
        path: "outputs/aeon-native-tools-2026-09-24.md",
        anchor: "aeon-native-tools-2026-09-24-md",
        slug: "persistent-tool-signals",
        snapshot: "September 24, 2026",
        format: "markdown",
        title: "Persistent tool signals",
        defaultOpen: false
      },
      {
        path: "outputs/chatgpt-bundled-plugins.md",
        anchor: "chatgpt-bundled-plugins-md",
        slug: "chatgpt-bundled-plugins",
        records: { file: "outputs/chatgpt-bundled-plugins.json", kind: "skill" },
        format: "markdown",
        title: "Bundled plugins and skills",
        defaultOpen: false
      },
      {
        path: "outputs/codex-cli-bundled-skills.md",
        anchor: "codex-cli-bundled-skills-md",
        slug: "codex-cli-bundled-skills",
        records: { file: "outputs/codex-cli-prompts.json", kind: "skill" },
        format: "markdown",
        title: "CLI bundled skills",
        defaultOpen: false
      },
      {
        path: "outputs/computer-use-prompts.md",
        anchor: "computer-use-prompts-md",
        slug: "computer-use-prompts",
        records: "outputs/computer-use-prompts.json",
        format: "markdown",
        title: "Computer Use prompts and tool descriptions",
        defaultOpen: false
      },
      {
        path: "outputs/voice-tool-surface-2026-09-24.md",
        anchor: "voice-tool-surface-2026-09-24-md",
        slug: "voice-tools",
        snapshot: "September 24, 2026",
        format: "markdown",
        title: "Voice tools",
        defaultOpen: true
      },
      {
        path: "outputs/chatgpt-learning-blocks.md",
        anchor: "chatgpt-learning-blocks-md",
        slug: "chatgpt-learning-blocks",
        format: "markdown",
        title: "Math and science learning blocks",
        defaultOpen: false
      },
      {
        path: "outputs/gpt-live-telephony.md",
        anchor: "gpt-live-telephony-md",
        slug: "gpt-live-telephony",
        format: "markdown",
        title: "GPT-Live telephony and SIP",
        defaultOpen: false
      }
    ]
  },
  {
    label: "Configuration",
    files: [
      {
        path: "outputs/codex-config.md",
        anchor: "codex-config-md",
        slug: "codex-config",
        format: "markdown",
        title: "config.toml reference",
        filters: { records: "outputs/codex-config.json", tags: "outputs/codex-config-tags.json" },
        defaultOpen: false
      },
      {
        path: "outputs/codex-env-vars.md",
        anchor: "codex-env-vars-md",
        slug: "codex-env-vars",
        format: "markdown",
        title: "Environment variables",
        filters: { records: "outputs/codex-env-vars.json", tags: "outputs/codex-env-vars-tags.json" },
        defaultOpen: false
      }
    ]
  },
  {
    label: "Build intel",
    files: [
      { path: "outputs/devday-surface-coverage.md", anchor: "devday-surface-coverage-md", slug: "devday-surface-coverage", format: "markdown", title: "Dev Day surface coverage", defaultOpen: false },
      { path: "outputs/binwalk-scan.md", anchor: "binwalk-scan-md", slug: "binwalk-scan", format: "markdown", title: "Binwalk scan (this build)", defaultOpen: false },
      { path: "outputs/package-scan.md", anchor: "package-scan-md", slug: "package-scan", format: "markdown", title: "Package scan (this build)", defaultOpen: false }
    ]
  },
  {
    label: "Evidence and archive",
    files: [
      { path: "outputs/pr-body-hidden-markers.md", anchor: "pr-body-hidden-markers-md", slug: "pr-body-hidden-markers", format: "markdown", title: "Hidden PR body markers", defaultOpen: false },
      { path: "outputs/security-review-map-2026-09-24.md", anchor: "security-review-map-2026-09-24-md", slug: "key-findings-2026-09-24", snapshot: "September 24, 2026", format: "markdown", title: "Key findings, September 24", defaultOpen: false },
      { path: "outputs/devday-surface-coverage.json", anchor: "devday-surface-coverage-json", slug: "devday-surface-coverage-records", format: "source", title: "Dev Day surface records", defaultOpen: false },
      {
        path: "outputs/prompt-provenance-inventory.json",
        anchor: "codex-prompt-provenance-inventory-2026-09-24-json",
        slug: "prompt-provenance-inventory",
        format: "source",
        title: "Prompt provenance inventory",
        defaultOpen: false
      },
      {
        path: "outputs/codex-cli-prompts.json",
        anchor: "codex-cli-prompts-json",
        slug: "codex-cli-prompt-provenance",
        format: "source",
        title: "CLI prompt provenance",
        defaultOpen: false
      },
      {
        path: "outputs/capture-metadata.json",
        anchor: "gpt-6-astra-instruction-stack-2026-09-24-metadata-json",
        slug: "capture-and-verification-metadata",
        format: "source",
        title: "Capture and verification metadata",
        defaultOpen: false
      },
      {
        path: "outputs/gpt-6-astra-model-record.json",
        anchor: "gpt-6-astra-model-messages-2026-09-24-json",
        slug: "raw-captured-astra-record",
        format: "source",
        title: "Raw captured Astra record",
        defaultOpen: false
      },
      {
        path: "outputs/gpt-6-sol-model-record.json",
        anchor: "gpt-6-sol-model-messages-2026-09-24-json",
        slug: "raw-captured-sol-record",
        format: "source",
        title: "Raw captured Sol record",
        defaultOpen: false
      },
      {
        path: "outputs/gpt-6.1-sol-model-record.json",
        anchor: "gpt-6-1-sol-model-record-json",
        slug: "raw-captured-gpt-6-1-sol-record",
        format: "source",
        title: "Raw captured GPT-6.1 Sol record",
        defaultOpen: false
      },
      {
        path: "outputs/gpt-6-luna-model-record.json",
        anchor: "gpt-6-luna-model-messages-2026-09-24-json",
        slug: "raw-captured-luna-record",
        format: "source",
        title: "Raw captured Luna record",
        defaultOpen: false
      },
      {
        path: "outputs/chatgpt-work-gpt6-client-trace-2026-09-24.json",
        anchor: "chatgpt-work-gpt6-client-trace-2026-09-24-json",
        slug: "sanitized-gpt-6-work-client-trace",
        snapshot: "September 24, 2026",
        format: "source",
        title: "Sanitized GPT-6 Work client trace",
        defaultOpen: false
      },
      {
        path: "outputs/codex-luna-surface-check-2026-09-24.json",
        anchor: "codex-luna-surface-check-2026-09-24-json",
        slug: "astra-luna-source-check",
        snapshot: "September 24, 2026",
        format: "source",
        title: "Astra/Luna source check",
        defaultOpen: false
      },
      {
        path: "outputs/aeon-current-responses-2026-09-24.json",
        anchor: "aeon-current-responses-2026-09-24-json",
        slug: "current-response-samples",
        snapshot: "September 24, 2026",
        format: "source",
        title: "Current response samples",
        defaultOpen: false
      },
      {
        path: "outputs/aeon-tools-and-tool-calls.md",
        anchor: "aeon-tools-and-tool-calls-md",
        slug: "tool-and-call-inventory-notes",
        snapshot: "September 24, 2026",
        format: "markdown",
        title: "Tool and call inventory notes",
        defaultOpen: false
      },
      {
        path: "outputs/binwalk-aeon-daybreak-report.md",
        anchor: "binwalk-aeon-daybreak-report-md",
        slug: "binwalk-report",
        snapshot: "September 24, 2026",
        format: "markdown",
        title: "Binwalk report, September 24 (archive)",
        defaultOpen: false
      },
      {
        path: "outputs/binwalk-method-diff.json",
        anchor: "binwalk-method-diff-json",
        slug: "protocol-method-diff",
        snapshot: "September 24, 2026",
        format: "source",
        title: "Protocol method diff",
        defaultOpen: false
      },
      {
        path: "outputs/binwalk-codename-byte-scan.json",
        anchor: "binwalk-codename-byte-scan-json",
        slug: "model-alias-byte-scan",
        snapshot: "September 24, 2026",
        format: "source",
        title: "Model alias byte scan",
        defaultOpen: false
      },
      {
        path: "outputs/aeon-core-instructions.md",
        anchor: "aeon-core-instructions-md",
        slug: "earlier-aeon-core-prompt",
        format: "markdown",
        title: "Earlier Aeon core prompt",
        instructionProfile: "historical-core",
        defaultOpen: false
      },
      {
        path: "outputs/aeon-assembled-instructions.md",
        anchor: "aeon-assembled-instructions-md",
        slug: "earlier-assembled-prompt",
        format: "markdown",
        title: "Earlier assembled prompt",
        instructionProfile: "historical-assembled",
        defaultOpen: false
      }
    ]
  }
];
