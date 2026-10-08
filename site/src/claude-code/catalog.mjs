// Every document has a pinned slug so shared links survive title changes. `data` is the
// machine-readable companion published under /data/.
export const categories = [
  {
    label: "Overview",
    files: [
      { path: "outputs/request-anatomy.md", format: "markdown", title: "What a request contains", slug: "request-anatomy", defaultOpen: true }
    ]
  },
  {
    label: "Prompts",
    files: [
      {
        path: "outputs/system-prompt.md",
        format: "markdown",
        title: "Main system prompt",
        slug: "system-prompt",
        summary: "Every section of the main system prompt, its conditions, and rendered examples.",
        data: "outputs/system-prompt.json",
        promptText: true,
        defaultOpen: true
      },
      {
        path: "outputs/system-reminders.md",
        format: "markdown",
        title: "System reminders and injections",
        slug: "system-reminders",
        summary: "Text injected mid-conversation, what triggers it, and where it lands.",
        data: "outputs/system-reminders.json",
        promptText: true,
        defaultOpen: false
      },
      {
        path: "outputs/utility-prompts.md",
        format: "markdown",
        title: "Background and utility prompts",
        slug: "utility-prompts",
        summary: "Compaction, titles, memory, hook evaluators, auto mode, and other background prompts.",
        data: "outputs/utility-prompts.json",
        promptText: true,
        defaultOpen: false
      },
      {
        path: "outputs/other-model-text.md",
        format: "markdown",
        title: "Other model-facing text",
        slug: "other-model-text",
        summary: "Tool results, errors, and other text the model reads that no other page covers.",
        data: "outputs/other-model-text.json",
        promptText: true,
        defaultOpen: false
      }
    ]
  },
  {
    label: "Tools and features",
    files: [
      { path: "outputs/feature-notes-2.1.295.md", format: "markdown", title: "New and unnamed mechanisms (2.1.295)", slug: "feature-notes-2-1-295", summary: "Compaction variants, Chrome setup, plugin publishing, personal permissions, hook failures, and dormant HTTP MCP serving.", defaultOpen: true },
      {
        path: "outputs/tools.md",
        format: "markdown",
        title: "Tools",
        slug: "tools",
        summary: "Each tool's exact description, parameters, and when it is available.",
        data: "outputs/tools.json",
        promptText: true,
        defaultOpen: false
      },
      {
        path: "outputs/agents.md",
        format: "markdown",
        title: "Built-in agents",
        slug: "agents",
        summary: "Built-in subagents: when they are used, their tools, and their system prompts.",
        data: "outputs/agents.json",
        promptText: true,
        defaultOpen: false
      },
      {
        path: "outputs/skills.md",
        format: "markdown",
        title: "Bundled skills",
        slug: "skills",
        summary: "Bundled skills and their reference files.",
        data: "outputs/skills.json",
        promptText: true,
        defaultOpen: false
      }
    ]
  },
  {
    label: "Configuration",
    files: [
      {
        path: "outputs/what-wins.md",
        format: "markdown",
        title: "What wins",
        slug: "what-wins",
        summary: "For each value Claude Code decides, every source it checks, in order, and which one takes effect.",
        data: "outputs/decisions.json",
        ladders: "outputs/decisions.json",
        filters: { records: "outputs/decisions.json", tags: "outputs/decisions-tags.json" },
        defaultOpen: false
      },
      {
        path: "outputs/environment-variables.md",
        format: "markdown",
        title: "Environment variables",
        slug: "env-vars",
        summary: "Every environment variable Claude Code reads or sets, documented or not.",
        data: "outputs/environment-variables.json",
        filters: { records: "outputs/environment-variables.json", tags: "outputs/environment-variables-tags.json" },
        defaultOpen: false
      },
      {
        path: "outputs/settings.md",
        format: "markdown",
        title: "Settings",
        slug: "settings",
        summary: "Every settings.json key, with types, defaults, and scopes.",
        data: "outputs/settings.json",
        filters: { records: "outputs/settings.json", tags: "outputs/settings-tags.json" },
        defaultOpen: false
      },
      {
        path: "outputs/hooks.md",
        format: "markdown",
        title: "Hooks",
        slug: "hooks",
        summary: "Hook events, payload fields, and handler types.",
        data: "outputs/hooks.json",
        defaultOpen: false
      },
      {
        path: "outputs/cli.md",
        format: "markdown",
        title: "CLI commands and flags",
        slug: "cli",
        summary: "Commands and flags, including hidden ones.",
        data: "outputs/cli.json",
        filters: { records: "outputs/cli.json", tags: "outputs/cli-tags.json" },
        defaultOpen: false
      },
      {
        path: "outputs/slash-commands.md",
        format: "markdown",
        title: "Slash commands",
        slug: "slash-commands",
        summary: "Built-in slash commands and bundled skill commands.",
        data: "outputs/slash-commands.json",
        defaultOpen: false
      }
    ]
  },
  {
    label: "Build intel",
    files: [
      { path: "outputs/binwalk-scan.md", format: "markdown", title: "Binwalk scan (this release)", slug: "binwalk-scan", summary: "Embedded payloads binwalk finds in the Claude Code binary, carved, decoded and diffed against the previous release." },
      { path: "outputs/package-scan.md", format: "markdown", title: "Package scan (this release)", slug: "package-scan", summary: "Every file in the release, the binary's signing, entitlements and linking, native-code strings and embedded addons, diffed against the previous release." }
    ]
  },
  {
    label: "Evidence and archive",
    files: [
      { path: "outputs/other-model-text-2.1.289.md", format: "markdown", title: "Other model-facing text archive (2.1.289)", slug: "other-model-text-2-1-289", summary: "Previous-release source and classifier judgments, retained with their original build provenance.", promptText: true, defaultOpen: false },
      {
        path: "outputs/provenance.md",
        format: "markdown",
        title: "Method and inventory",
        slug: "provenance",
        summary: "How this was extracted and how to verify it.",
        data: "outputs/inventory.json",
        dataDownload: "inventory.json.gz",
        records: false,
        defaultOpen: false
      }
    ]
  }
];
