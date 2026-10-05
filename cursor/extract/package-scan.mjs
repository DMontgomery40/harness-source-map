#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  SCHEMA_VERSION, loadCache, publishScan, renderPage, saveCache, scanTree, sortKeys
} from "../../tools/package-scan/core.mjs";
import { JEV_TEMPFAIL_EXIT } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { seaContainer } from "./binwalk-scan.mjs";

export const scrubHomes = value => JSON.parse(JSON.stringify(value)
  .replace(/\/(?:Users|home)\/[^/"\\]+\//g, "/<build home>/")
  .replace(/\/(?:private\/)?tmp\/buildkite-[^"\\\s]*/g, "/<build path>"));

export function isCursorFirstParty(rel) {
  const p = rel.split(path.sep).join("/");
  if (p === "desktop/Cursor.app/Contents/MacOS/Cursor") return true;
  if (/^desktop\/Cursor\.app\/Contents\/Resources\/app\/(?:bin\/cursor-tunnel|resources\/helpers\/(?:cursorsandbox|cursor-update-supervisor))$/.test(p)) return true;
  if (/^desktop\/Cursor\.app\/Contents\/Resources\/app\/node_modules\/(?:@anysphere\/[^/]+|cursor-proclist)\/.*\.(?:node|dylib)$/.test(p)) return true;
  if (/^desktop\/Cursor\.app\/Contents\/Resources\/app\/extensions\/cursor-[^/]+\/.*\/(?:@anysphere\/[^/]+|cursor-[^/]+)\/.*\.(?:node|dylib)$/.test(p)) return true;
  if (/^agent-cli\/package\/(?:cursor-agent-sea|cursor-agent-worker-sea|cursorsandbox|crepectl|file_service\.darwin-arm64\.node|merkle-tree-napi\.darwin-arm64\.node)$/.test(p)) return true;
  return false;
}

const withoutRange = (buf, range) => range
  ? Buffer.concat([buf.subarray(0, range.offset), Buffer.alloc(1), buf.subarray(range.offset + range.size)])
  : buf;

export async function main() {
  const started = Date.now();
  const repo = path.resolve(import.meta.dirname, "..");
  const current = JSON.parse(fs.readFileSync(path.join(repo, "work/current.json"), "utf8"));
  const releaseDir = path.join(repo, "work/releases", current.release);
  const acquisition = JSON.parse(fs.readFileSync(path.join(releaseDir, "acquisition.json"), "utf8"));
  const seaRanges = new Map();
  for (const rel of ["agent-cli/package/cursor-agent-sea", "agent-cli/package/cursor-agent-worker-sea"]) {
    const abs = path.join(releaseDir, rel);
    if (fs.existsSync(abs)) seaRanges.set(rel, seaContainer(abs));
  }
  const cacheFile = path.join(repo, "work/package-scan-cache.json");
  const cache = loadCache(cacheFile);
  const { inventory: scanned, texts } = scanTree(releaseDir, {
    cache,
    isThirdParty: rel => !isCursorFirstParty(rel),
    bytesFor: (rel, abs) => withoutRange(fs.readFileSync(abs), seaRanges.get(rel))
  });
  saveCache(cacheFile, cache);
  const inventory = scrubHomes(sortKeys({
    ...scanned,
    schema: SCHEMA_VERSION,
    product: "Cursor",
    source: {
      desktop: {
        version: acquisition.desktop.version,
        commit: acquisition.desktop.commit,
        distro: acquisition.desktop.distro,
        architecture: acquisition.desktop.architecture,
        tree_sha256: acquisition.desktop.tree_sha256,
        signed_team: acquisition.desktop.team,
        notarized: acquisition.desktop.notarized,
        official_urls: acquisition.desktop.official_urls
      },
      agent_cli: {
        version: acquisition.agent_cli.version,
        architecture: acquisition.agent_cli.architecture,
        archive_sha256: acquisition.agent_cli.sha256,
        tree_sha256: acquisition.agent_cli.tree_sha256,
        official_url: acquisition.agent_cli.official_url,
        sea_sections: Object.fromEntries([...seaRanges].map(([rel, sea]) => [path.basename(rel), { offset: sea.offset, size: sea.size, sha256: sea.sha256 }]))
      }
    }
  }));
  const page = renderPage(inventory, {
    title: "Cursor package scan",
    intro: "The complete file inventory for the pinned Cursor desktop app and Agent CLI package, including code signing, entitlements, linking, native addons, helpers, bundled dependency versions and interesting strings in Cursor-shipped first-party binaries. Generic Electron, Node and third-party dependencies remain hashed and inventoried without presenting their strings as Cursor behavior. The SEA executables retain their bundled Node runtime, so runtime strings in those hosts are inventory evidence rather than proof of Cursor behavior. SEA JavaScript blobs are excluded from this native-string view because the source and Binwalk pipelines account for those bytes separately. Credential-looking values are withheld by kind and hash.",
    sourceLine: `Source: Cursor desktop ${acquisition.desktop.version} (${acquisition.desktop.commit}), signed by team ${acquisition.desktop.team} and notarized: ${acquisition.desktop.notarized ? "yes" : "no"}; Agent CLI ${acquisition.agent_cli.version}, official archive SHA-256 \`${acquisition.agent_cli.sha256}\`. Paths are relative to the pinned two-distribution release directory.`
  });
  const summary = await publishScan({ product: "Cursor", repo, inventory, texts, page, started, triageOptions: { batched: true } });
  console.log(JSON.stringify({ ...summary, desktop: acquisition.desktop.version, agent_cli: acquisition.agent_cli.version }));
  if (summary.needs_local_review) process.exitCode = 2;
  else if (summary.pending) process.exitCode = JEV_TEMPFAIL_EXIT;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(`Cursor package scan: ${error.message}`); process.exit(1); });
