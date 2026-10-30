// No provider calls. Run before a manual build; watcher targets run it after extraction.
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { categories as codexCategories } from "../site/src/codex/catalog.mjs";
import { categories as claudeCategories } from "../site/src/claude-code/catalog.mjs";
import { advanceHistory, collectInventory, releaseId, updateReleaseTags } from "../site/src/shared/release-tags.mjs";

const root = path.resolve(import.meta.dirname, "..");
for (const [product, categories] of [["claude-code", claudeCategories], ["codex", codexCategories]]) {
  const sourceRoot = path.join(root, product);
  if (process.argv.includes("--seed-from-git")) {
    const git = args => execFileSync("git", args, { cwd: root, maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).toString();
    const commits = git(["log", "-30", "--format=%H", "--", `${product}/outputs/status.json`]).trim().split("\n");
    const snapshots = [], seen = new Set();
    for (const commit of commits) {
      const status = JSON.parse(git(["show", `${commit}:${product}/outputs/status.json`]));
      const id = releaseId(product, status);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      snapshots.push({ commit, id });
      if (snapshots.length === 4) break;
    }
    let history = null;
    for (const { commit, id } of snapshots.reverse()) {
      const read = async file => {
        try { return git(["show", `${commit}:${product}/${file}`]); }
        catch (error) { if (error.status === 128 && /does not exist|exists on disk, but not in/.test(String(error.stderr))) throw Object.assign(new Error("missing historical file"), { code: "ENOENT" }); throw error; }
      };
      history = advanceHistory(history, id, await collectInventory({ sourceRoot, categories, read, historical: true }));
    }
    const file = path.join(sourceRoot, "outputs/release-history.json");
    // Seeding is explicit and never overwrites an established ledger.
    if (await readFile(file).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; })) throw new Error(`${product}: release history already exists`);
    await writeFile(file, `${JSON.stringify(history, null, 2)}\n`);
  }
  const history = await updateReleaseTags({ product, sourceRoot, categories });
  console.log(`${product}: automatic New tags, last ${history.window} captured releases`);
}
