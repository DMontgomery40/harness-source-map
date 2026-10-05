// Redirects the two retired hosts into the one site, path for path.
//   ccprompts.dtmont.com/<p>  -> https://harness.dtmont.com/claude-code/<p>
//   gpt6aeon.dtmont.com/<p>   -> https://harness.dtmont.com/codex/<p>
//   <either>/trace/<p>        -> https://harness.dtmont.com/trace/<p>   (one Trace serves both)
// Query strings are kept; browsers carry the #fragment across a redirect themselves.
import { SITE, siteOrigin } from "../src/shared/site.mjs";

const SECTION_BY_HOST = new Map(Object.values(SITE.products).map(p => [p.legacyHost, p.path]));

export function redirectTarget(url) {
  const u = new URL(url);
  const section = SECTION_BY_HOST.get(u.hostname);
  if (!section) return null;
  const shared = u.pathname === "/trace" || u.pathname.startsWith("/trace/");
  const movedInventory = section === "claude-code" && u.pathname === "/data/inventory.json";
  const path = shared ? u.pathname : `/${section}${u.pathname}${movedInventory ? ".gz" : ""}`;
  return `${siteOrigin()}${path}${u.search}`;
}

export default {
  async fetch(request) {
    const target = redirectTarget(request.url);
    if (!target) return new Response("Not found", { status: 404 });
    return Response.redirect(target, 301);
  }
};
