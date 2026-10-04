import { escapeHtml } from "./render.mjs";

// Whole-harness entry points use the routes supplied by the rendered catalog.
// Highlighted persistence passages remain a secondary path into the full reference.

const highlight = /<section class="[^"]*\breview-focus\b[^"]*" id="([^"]+)">\s*<div class="review-tag">([^<]*)<\/div>/g;

function themes(content) {
  const found = [...content.matchAll(highlight)].map(([, id, tag]) => ({
    id,
    theme: tag.split(" · ")[0].replace(/^Historical (\w)/, (_, letter) => letter.toUpperCase())
  }));
  return { first: found[0]?.id, count: found.length, names: [...new Set(found.map(item => item.theme))] };
}

const entryGroups = [
  { title: "Current reference", entries: [
    ["key-findings", "Current key findings", "The source-backed map of the current harness"],
    ["devday-update", "Dev Day changes", "Announcements alongside shipped evidence and open questions"],
    ["gpt-6-1-sol-base-instructions", "GPT-6.1 Sol instructions", "The current model's captured base instructions"]
  ] },
  { title: "Instructions and conditional modules", entries: [
    ["collaboration-modes", null, "Plan and Default instructions, selection and catalog overrides"],
    ["astra-base-instructions", null, "Captured model instructions"],
    ["sol-base-instructions", null, "Captured model instructions"],
    ["luna-base-instructions", null, "Captured model instructions"],
    ["conditional-instruction-modules", null, "Text selected by features, settings and task context"],
    ["three-model-prompt-comparison", null, "Compare the published model records"]
  ] },
  { title: "App actions and Page prompts", entries: [
    ["chatgpt-work-prompts", null, "Work setup, review requests, writing style and action prompts"],
    ["chatgpt-sites-artifacts-prompts", null, "Sites, artifacts, editor actions and GIF comments"],
    ["chatgpt-conversation-prompts", null, "Conversation actions and context"],
    ["desktop-model-facing-text", null, "Desktop text assembled for the model"],
    ["chatgpt-gpt-builder-prompts", null, "GPT creation and editing"],
    ["chatgpt-finance-health-prompts", null, "Domain-specific app prompts"]
  ] },
  { title: "Tools, plugins and computer use", entries: [
    ["tool-manifest", null, "Shipped tool descriptions and parameters"],
    ["chatgpt-bundled-plugins", null, "Bundled plugin instructions and surfaces"],
    ["computer-use-prompts", null, "Browser and desktop interaction instructions"],
    ["bundled-codex-voice-prompts", null, "Voice coordination and tool instructions"],
    ["chatgpt-learning-blocks", null, "Structured visualization content and its sources"]
  ] },
  { title: "Configuration and the CLI", entries: [
    ["codex-config", null, "Configuration keys and the behavior they select"],
    ["codex-env-vars", null, "Environment variables and activation conditions"],
    ["codex-cli-prompts", null, "CLI prompt templates and assembly"],
    ["codex-cli-bundled-skills", null, "Skills shipped with the CLI"]
  ] },
  { title: "Build evidence and the archive", entries: [
    ["devday-surface-coverage", null, "Every reviewed surface, its shipped evidence and disposition"],
    ["package-scan", null, "Packages present in the current build"],
    ["binwalk-scan", null, "Current binary and asset scan"],
    ["prompt-provenance-inventory", null, "Source files and extraction coverage"],
    ["capture-and-verification-metadata", null, "Capture identity and verification metadata"],
    ["key-findings-2026-09-24", "Earlier key findings", "Historical snapshot retained for comparison"],
    ["earlier-aeon-core-prompt", null, "Historical prompt evidence"],
    ["earlier-assembled-prompt", null, "Historical assembled prompt evidence"]
  ] }
];

function linkRow(href, title, meta, primary = false) {
  return `<li${primary ? ' class="is-primary"' : ""}><a href="${escapeHtml(href)}"><span class="start-here-doc">${escapeHtml(title)}</span><span class="start-here-meta">${escapeHtml(meta)}</span></a></li>`;
}

export function renderGuide(documents) {
  if (!documents.length) return "";
  const groups = entryGroups.map(group => {
    const rows = group.entries.flatMap(([slug, label, description]) => {
      const document = documents.find(item => item.slug === slug);
      return document ? [linkRow(`${document.slug}/`, label ?? document.title, description, group.title === "Current reference")] : [];
    });
    return rows.length ? `<div class="start-here-group"><h3 class="start-here-group-title">${escapeHtml(group.title)}</h3><ul class="start-here-list">${rows.join("")}</ul></div>` : "";
  }).join("");

  const passageRows = documents.flatMap(document => {
    const { first, count, names } = themes(document.content);
    if (!first) return [];
    const meta = names.length > 3 ? `${count} highlighted passages` : names.join(" · ");
    return [linkRow(`#${first}`, document.title, meta)];
  });
  const tagged = documents.map(document => [document, document.filterVocabulary?.find(tag => tag.id === "persistent-mode")?.count]).filter(([, count]) => count);
  if (tagged.length) {
    const [first] = tagged[0];
    const meta = tagged.map(([document, count]) => `${count.toLocaleString("en-US")} ${/env/i.test(document.title) ? "env vars" : "config keys"}`).join(" · ");
    passageRows.push(linkRow(`${first.slug}/?tags=persistent-mode`, "Persistent-mode config and env vars", meta));
  }
  const persistent = documents.find(document => document.slug === "persistent-mode-instructions");
  if (persistent && !passageRows.some(row => row.includes(escapeHtml(persistent.title)))) {
    passageRows.push(linkRow(`${persistent.slug}/`, persistent.title, "The mode's dedicated developer instructions"));
  }
  const cli = documents.find(document => document.path === "outputs/codex-cli-prompts.md");
  const cliAnchor = cli?.outline?.find(item => item.text === "Persistent mode")?.id;
  if (cliAnchor) passageRows.push(linkRow(`#${cliAnchor}`, "CLI persistent-mode fallback", "Used when a model record has no text of its own"));
  const passages = passageRows.length ? `<div class="start-here-group start-here-persistence"><h3 class="start-here-group-title">Persistent mode and continuity</h3><p>Follow the dedicated instructions, conditional text and configuration behind this mode. Links into the full reference target the <span class="start-here-swatch" aria-hidden="true"></span>blue highlighted passages.</p><ul class="start-here-list">${passageRows.join("")}</ul></div>` : "";

  return `
        <section class="start-here" aria-labelledby="start-here-title">
          <h2 class="start-here-title" id="start-here-title">Explore the harness</h2>
          <p>Read the text Codex/ChatGPT sends to the model, where it comes from, and the settings or actions that activate it. Choose a part of the harness below to explore its source text, conditions and evidence.</p>
          ${groups}
          ${passages}
          <p class="start-here-rest">The complete reference follows below, with full prompt text, raw records, tool definitions, configuration and extraction evidence.</p>
        </section>`;
}

export const guideStyles = `
    .start-here{margin:56px 0 0;padding:26px 28px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);text-align:left}
    .start-here-title{margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:600}
    .start-here p{margin:0 0 16px;color:#d3d5cf;font-size:16px;line-height:1.58}
    .start-here-group-title{margin:24px 0 8px;font-size:16px;line-height:1.4;font-weight:600;color:var(--text)}
    .start-here-persistence{margin-top:24px;padding-top:2px;border-top:1px solid var(--line)}
    .start-here-persistence p{font-size:15px;color:#a3a79f}
    .start-here-swatch{display:inline-block;width:14px;height:14px;margin:0 6px -2px 0;border:1px solid #355266;border-left:3px solid #83bfd8;border-radius:2px;background:#17252b}
    .start-here-list{margin:4px 0 18px;padding:0;list-style:none;border-top:1px solid var(--line)}
    .start-here-list li{margin:0;border-bottom:1px solid var(--line)}
    .start-here-list a{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 16px;padding:11px 2px;text-decoration:none}
    .start-here-list a:hover .start-here-doc,.start-here-list a:focus-visible .start-here-doc{color:var(--link)}
    .start-here-doc{color:var(--text);font-size:16px;font-weight:550}
    .start-here-meta{color:#a3a79f;font-size:14px}
    .start-here-list .is-primary a{margin-left:-2px;padding-left:12px;border-left:3px solid #83bfd8;background:linear-gradient(115deg,#17252b,#172022 65%,#171816)}
    .start-here-list .is-primary .start-here-meta{color:#a9d8e6}
    .start-here p.start-here-rest{color:#a3a79f;font-size:15px}
    @media(max-width:800px){.start-here{margin-top:40px;padding:22px 18px 4px}}`;
