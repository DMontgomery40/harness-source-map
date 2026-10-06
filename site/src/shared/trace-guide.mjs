import { readFileSync } from "node:fs";
import { KEYS } from "../../trace/keys.js";
import { SITE, siteOrigin } from "./site.mjs";

export function renderTraceGuide() {
  const shortcuts = "| Group | Keys | Action |\n|---|---|---|\n" + KEYS.map(row => `| ${row.group} | ${row.keys.map(key => `\`${key}\``).join(" / ")} | ${row.label} |`).join("\n");
  return readFileSync(new URL("./trace-guide.md", import.meta.url), "utf8")
    .replaceAll("{{origin}}", siteOrigin())
    .replaceAll("{{repo}}", SITE.repo)
    .replaceAll("{{shortcuts}}", shortcuts);
}
