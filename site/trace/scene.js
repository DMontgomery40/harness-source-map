// The three.js landscape. L0: each agent is a ridge whose front face is its context over time,
// layered by stratum. L1: the focused agent's requests stand up as instanced core samples.
// L2: one core is lifted out with its strata labelled. L3 keeps L2 and lights one stratum.
// All text is HTML (CSS2D labels, only for what is in focus); picking is analytic, not raycast.
import * as THREE from "./vendor/three.module.min.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "./vendor/CSS2DRenderer.js";
import { STRATA, STRATUM_INDEX, STATUS, fmtTok, fmtClock, fmtDur, fmtTick, spansDays, freshTokens, unloggedShrinks, agentStats, clip } from "./panels.js";
import { createMapOverview, overviewAgentData } from "./map-overview.js";
import { zoomCamera, panCameraTo, anchorView, fitView } from "./map-camera.js";
import { buildEvents } from "./director.js";
import { fitNearPlane, unitsPerPixel, binExponent, clusterStable } from "./render-quality.js";
import { blockPart } from "./model.js";
import { createGeometry, topsOf } from "./landscape-geometry.js";
import { BASE_H, landscapeRule, crestEvents, placeLabel, modelSwitches, mapDetail, cappedMarkerHeight, terrainPlacement, playheadEnd, cutXAt, agentPlayhead } from "./scene-rules.js";
import { shouldRefreshDetail, shouldRedrawNavigator } from "./scene-rules.js";

const H = BASE_H;         // world height of the tallest context
const STAGE_Z0 = 15;
const { subDepth: SUB_DEPTH, sideZ: SIDE_Z, laneZ } = terrainPlacement();
const MASSIF = Number(new URLSearchParams(location.search).get("massif") ?? 2); // main ridge: slope depth per unit of height
const VIEW = (() => { const q = new URLSearchParams(location.search); return { az: Number(q.get("az") ?? -25), el: Number(q.get("el") ?? 40), fov: Number(q.get("fov") ?? 34), paz: Number(q.get("paz") ?? -32), pel: Number(q.get("pel") ?? 42), caz: Number(q.get("caz") ?? -16), cel: Number(q.get("cel") ?? 22), cpaz: Number(q.get("cpaz") ?? -30), cpel: Number(q.get("cpel") ?? 30) }; })();
const SP = 0.62, CORE_R = 0.24, H1 = 12, LIFT_R = 1.25, LIFT_H = 13;
const RINGS = 9;
const FOG = new THREE.Color("#0a141e");
const LIGHT = new THREE.Vector3(-0.38, 0.62, 0.69).normalize();

const VERT = /* glsl */`
attribute vec4 aB0;
attribute vec4 aB1;
attribute float aAgent;
attribute float aU;
uniform highp sampler2D uAgents;
varying vec4 vB0;
varying vec4 vB1;
varying float vY;
varying vec3 vN;
varying vec3 vW;
varying float vDepth;
varying vec4 vSolid;
varying vec4 vAg;
varying float vInst;
varying float vU;
void main() {
  vB0 = aB0; vB1 = aB1; vU = aU;
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  vInst = -1.0;
#ifdef USE_INSTANCING
  p = instanceMatrix * p;
  n = mat3(instanceMatrix) * n;
  vInst = float(gl_InstanceID);
#endif
  vY = position.y;
#ifdef AGENTS
  vSolid = texelFetch(uAgents, ivec2(int(aAgent + 0.5), 0), 0);
  vAg = texelFetch(uAgents, ivec2(int(aAgent + 0.5), 1), 0);
#else
  vSolid = vec4(0.0);
  vAg = vec4(1.0, 0.0, 0.0, 0.0);
#endif
  vec4 wp = modelMatrix * p;
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  vec4 mv = viewMatrix * wp;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

// Atmospheric haze grows with depth into the scene (world -z), plus a little with distance
// beyond the focus, so the root stays crisp and the subagent field recedes into mist.
const HAZE = /* glsl */`
uniform float uFocusDist;
float haze(vec3 w, float depth) {
  float a = 0.5 * smoothstep(16.0, 140.0, -w.z);
  float b = 0.5 * smoothstep(uFocusDist + 40.0, uFocusDist + 420.0, depth);
  return clamp(max(a, b), 0.0, 0.8);
}`;
const FRAG = /* glsl */`
${HAZE}
uniform vec3 uCol[7];
uniform float uEm[7];
uniform vec3 uFog;
uniform float uFogDensity;
uniform vec3 uLight;
uniform float uSel;
uniform float uCursor;
uniform float uHover;
uniform float uAgentEm;
varying vec4 vB0;
varying vec4 vB1;
varying float vY;
varying vec3 vN;
varying vec3 vW;
varying float vDepth;
varying vec4 vSolid;
varying vec4 vAg;
varying float vInst;
varying float vU;
uniform float uXray;
#ifdef CUT
// The playhead's cut: everything beyond uCutX is a ghost (fogged, still opaque and depth-writing).
uniform float uCutX;
#endif
uniform float uReflect;
float layerEm(int j) {
  float e = uEm[j];
  return uSel >= 0.0 && abs(float(j) - uSel) > 0.5 ? e * 0.2 : e;
}
void main() {
  if (vAg.y > 0.5) discard;
#ifdef XRAY
  // Second pass for subagent ridges, drawn only where something nearer hides them (depthFunc
  // GreaterDepth): a translucent silhouette through the main ridge, so every agent stays visible.
  if (vAg.z > 0.5) discard;
#endif
  float tops[7];
  tops[0] = vB0.x; tops[1] = vB0.y; tops[2] = vB0.z; tops[3] = vB0.w;
  tops[4] = vB1.x; tops[5] = vB1.y; tops[6] = vB1.z;
  float fw = max(fwidth(vY), 1e-5);
  // Stratum colour and emphasis are box-filtered over the pixel's footprint in height: each layer
  // contributes by how much of the pixel it covers. MSAA smooths polygon edges only, so picking one
  // layer per fragment leaves every layer edge a staircase and sub-pixel layers as speckle.
  float a0 = vY - 0.5 * fw, a1 = vY + 0.5 * fw;
  vec3 base = vec3(0.0);
  float em = 0.0, wsum = 0.0, bot = -1e6;
  float lo = 0.0, hi = tops[0], prev = 0.0, line = 0.0;
  for (int j = 0; j < 7; j++) {
    float top = j == 6 ? 1e6 : tops[j];
    float w = max(0.0, min(top, a1) - max(bot, a0));
    base += uCol[j] * w; em += layerEm(j) * w; wsum += w;
    bot = top;
    if (j == 6) break;
    if (vY > tops[j]) { lo = tops[j]; hi = tops[j + 1]; }
    // a dark hairline between layers, faded where the layers are only a few pixels thick
    if (tops[j] > 0.0 && tops[j] < tops[6]) {
      float room = smoothstep(2.5, 7.0, min(tops[j] - prev, tops[j + 1] - tops[j]) / fw);
      line = max(line, room * (1.0 - smoothstep(0.35, 1.15, abs(vY - tops[j]) / fw)));
    }
    prev = tops[j];
  }
  base /= max(wsum, 1e-6); em /= max(wsum, 1e-6);
  // Behind the face the slope is terrain, not data: toward its back foot, where every layer would
  // squeeze into a thin speckled rim, it weathers to the colour of the layer at its crest.
  if (vU > 0.0) {
    vec3 crestCol = uCol[0];
    float crestEm = layerEm(0), below = 0.0;
    for (int j = 0; j < 7; j++) { if (tops[j] > below + 1e-4) { crestCol = uCol[j]; crestEm = layerEm(j); } below = max(below, tops[j]); }
    float wx = smoothstep(0.3, 0.85, vU);
    base = mix(base, crestCol, wx); em = mix(em, crestEm, wx); line *= 1.0 - wx;
  }
  if (vB1.w > 0.5) { base = vec3(0.62, 0.68, 0.76); em = 1.0; lo = 0.0; hi = tops[6]; line = 0.0; }
  // Each layer is lit a little brighter toward its top, like a bedded stratum, where it is thick
  // enough on screen to read as a band; distant ridges stay flat rather than turning to stripes.
  float bed = mix(1.0, 0.88 + 0.18 * clamp((vY - lo) / max(hi - lo, 1e-5), 0.0, 1.0), smoothstep(5.0, 16.0, (hi - lo) / fw));
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  float diff = max(dot(N, uLight), 0.0);
  float hemi = 0.5 + 0.5 * N.y;
  vec3 V = normalize(cameraPosition - vW);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float spec = pow(max(dot(N, normalize(uLight + V)), 0.0), 48.0);
  float shade = (0.34 + 0.2 * hemi + 0.6 * diff) * mix(0.62, 1.0, smoothstep(0.0, 2.5, abs(vW.y))) * bed;
  vec3 col = base * shade + base * rim * 0.25 + vec3(1.0, 0.96, 0.9) * spec * 0.07;
#ifdef AGENTS
  // The face carries the data; the slope and cut ends behind it are terrain, a step quieter.
  if (N.z < 0.9) col *= 0.8;
#endif
  col *= 1.0 - 0.3 * line;
  // a bright crest line along the top edge of each front face
  if (N.z > 0.9 && tops[6] > 0.0) col = mix(col, vec3(1.0, 0.97, 0.92), 0.55 * (1.0 - smoothstep(0.6, 1.6, (tops[6] - vY) / fw)));
  float e = em * vAg.x * uAgentEm;
  // Injected text is a bright mineral vein: never thinner than ~2px on screen, total height unchanged.
  float ib = tops[2], it = tops[3];
  if (it > ib && vB1.w < 0.5) {
    float mid = 0.5 * (ib + it);
    float hw = max(0.5 * (it - ib), min(1.0 * fw, 0.06 * tops[6]));
    float v = 1.0 - smoothstep(hw - 0.5 * fw, hw + 0.5 * fw, abs(vY - mid));
    float ve = uEm[3] * vAg.x * uAgentEm * ((uSel >= 0.0 && abs(uSel - 3.0) > 0.5) ? 0.2 : 1.0);
    col = mix(col, uCol[3] * (0.95 + 0.35 * diff), v);
    e = mix(e, ve, v);
  }
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 dim = mix(uFog * 1.5, vec3(lum), 0.24);
  col = mix(dim, col, clamp(e, 0.0, 1.0));
  col = mix(col, vSolid.rgb * (0.42 + 0.5 * diff + 0.22 * hemi), vSolid.a);
  if (vInst >= 0.0) {
    if (abs(vInst - uCursor) < 0.5) col = col * 1.35 + vec3(0.05);
    else if (abs(vInst - uHover) < 0.5) col = col * 1.18;
  }
  float ghost = 0.0;
#ifdef CUT
  // a uniform branch: with no cut the colour is untouched, bit for bit
  if (uCutX < 1e29) {
    float fx = max(fwidth(vW.x), 1e-5);
    ghost = smoothstep(-0.5, 0.5, (vW.x - uCutX) / fx);
    // The future is a ghost: the layer colour without hairlines, vein or emphasis, mostly grey and
    // sunk into the fog, with a faint 1 px crest line in the layer's colour so the silhouette reads.
    vec3 g = base * shade;
    g = mix(g, vec3(dot(g, vec3(0.2126, 0.7152, 0.0722))), 0.7);
    g = mix(g, uFog, 0.85);
    float crestLine = N.z > 0.9 && tops[6] > 0.0 ? 1.0 - smoothstep(0.5, 1.5, (tops[6] - vY) / fw) : 0.0;
    g = mix(g, base, 0.35 * crestLine);
    col = mix(col, g, ghost);
  }
#endif
  col = mix(col, uFog, haze(vW, vDepth));
  // ridges other than the focused agent's recede almost to the ground while one agent is open
  col = mix(col, uFog, 0.85 * vAg.w);
#ifdef XRAY
  // Faint fill, crisp crest outline: a hidden ridge reads as an outline behind the one in front.
  float edge = tops[6] > 0.0 ? (1.0 - smoothstep(0.5, 1.5, abs(tops[6] - vY) / fw)) * (1.0 - 0.65 * ghost) : 0.0;
  gl_FragColor = vec4(mix(col, vec3(0.9, 0.94, 1.0), edge * 0.65), max(uXray, edge * 0.92));
#elif defined(REFLECT)
  // the polished floor's reflection: clearest at the waterline, gone a few units down
  gl_FragColor = vec4(col, uReflect * exp(vW.y * 0.75));
#else
  gl_FragColor = vec4(col, 1.0);
#endif
  #include <colorspace_fragment>
}`;

// Pins and flag poles are drawn in screen space: a shaft of constant pixel width in its class colour
// with a dark outline (so it holds 3:1 on any stratum), and an optional head at the top: a round
// beacon, or a pennant for the user's asks. Edges are coverage, not discard, so MSAA smooths them
// (alpha to coverage) and a shaft does not crawl a pixel at a time as the map pans.
const PIN_VERT = /* glsl */`
attribute vec3 iBase;
attribute float iLen;
attribute vec3 iColor;
attribute vec2 iPx;
uniform vec2 uRes;
uniform float uDpr;
uniform float uHead;
uniform float uMaxHeight;
uniform float uCutX;
varying vec3 vC;
varying vec2 vP;
varying float vW;
varying float vHalf;
void main() {
  if (iBase.x > uCutX) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vC = vec3(0.0); vP = vec2(0.0); vW = 0.0; vHalf = 1.0; return; }
  vec4 va = viewMatrix * vec4(iBase, 1.0);
  vec4 vb = viewMatrix * vec4(iBase + vec3(0.0, iLen, 0.0), 1.0);
  vec4 a = projectionMatrix * va;
  vec4 b = projectionMatrix * vb;
  float heightPx = length((b.xy / b.w - a.xy / a.w) * uRes * 0.5);
  float cap = min(1.0, uMaxHeight * uDpr / max(heightPx, 0.001));
  b.xy = mix(a.xy / a.w, b.xy / b.w, cap) * b.w;
  vC = iColor;
  vP = position.xy;
  if (uHead > 0.5) {
    // the head sits a fixed world distance in front of its top, never a fixed slice of depth range
    vec4 bz = projectionMatrix * (vb + vec4(0.0, 0.0, 0.35, 0.0));
    vW = iPx.y * uDpr;
    vec2 off = vec2(0.0);
    if (uHead > 1.5) { vHalf = vW * 0.62 + 1.5 * uDpr; off = vec2(vW * 0.5, -vW * 0.36); }
    else vHalf = vW + 5.0 * uDpr;
    gl_Position = b + vec4((position.xy * vHalf + off) / uRes * 2.0 * b.w, 0.0, 0.0);
    gl_Position.z = bz.z / bz.w * b.w;
  } else {
    vW = iPx.x * uDpr;
    vHalf = vW * 0.5 + 1.0 * uDpr;
    vec2 d = (b.xy / b.w - a.xy / a.w) * uRes;
    d = length(d) > 1e-3 ? normalize(d) : vec2(0.0, 1.0);
    vec4 p = mix(a, b, position.y);
    p.xy += vec2(-d.y, d.x) * position.x * vHalf * 2.0 / uRes * p.w;
    gl_Position = p;
  }
}`;
const PIN_FRAG = /* glsl */`
uniform float uHead;
uniform float uDpr;
varying vec3 vC;
varying vec2 vP;
varying float vW;
varying float vHalf;
float sdTri(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2, v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
void main() {
  // signed distance to the outline in device px: across the shaft, radially in a head, or to a pennant
  vec2 q = vP * vHalf;
  float dist;
  if (uHead > 1.5) {
    // pennant: attached at the pole's top, pointing right; q is relative to the quad centre
    vec2 o = vec2(vW * 0.5, -vW * 0.36);
    vec2 t = q + o;
    dist = sdTri(t, vec2(0.0, 0.0), vec2(0.0, -vW * 0.72), vec2(vW, -vW * 0.3));
  } else if (uHead > 0.5) dist = length(q) - vW;
  else dist = abs(q.x) - vW * 0.5;
  float cover = clamp(0.5 - dist, 0.0, 1.0);
  // a hairline dark rim keeps every marker 3:1 on any stratum; beacon heads glow softly beyond it
  float rim = smoothstep(-0.8 * uDpr - 0.5, -0.8 * uDpr + 0.5, dist);
  vec3 fill = mix(vC, vec3(0.004, 0.005, 0.008), rim);
  float d = max(dist, 0.0) / uDpr;
  float halo = uHead > 0.5 && uHead < 1.5 ? 0.42 * exp(-d * d / 5.0) : 0.0;
  float a = cover + (1.0 - cover) * halo;
  vec3 col = (cover * fill + (1.0 - cover) * halo * vC) / max(a, 1e-4);
  // a stem is a fine line of light, strongest at its beacon and fading into the terrain
  if (uHead < 0.5) a *= mix(0.72, 1.0, vP.y);
  if (a < 0.004) discard;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createScene(host, { trace, layout: L, reducedMotion, onHover, onPick, onMapFocus = () => {}, onViewChange = () => {} }) {
  // An open agent's cores stand in front of the whole subagent field, so the faded ridges of the
  // other agents never stand between the camera and the stage.
  const STAGE_Z = L.lanes ? Math.max(STAGE_Z0, laneZ(L.lanes - 1) + 10) : STAGE_Z0;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.append(renderer.domElement);
  renderer.domElement.className = "gl";
  const labels = new CSS2DRenderer();
  labels.domElement.className = "labels";
  host.append(labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.03, 4000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.09;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.35;
  controls.enableZoom = false; // optical map zoom below never drives the camera inside a ridge
  controls.zoomSpeed = 1.25;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.touches.ONE = THREE.TOUCH.PAN;
  controls.maxDistance = 900;
  controls.screenSpacePanning = true;

  // World width of the whole session: a single-agent session is a compact massif, at most 3:1.
  const rule = landscapeRule(L);
  const W = rule.width;
  const yScale = H / (L.yMax * 1.02);
  // Where every request sits on its ridge (landscape-geometry.js); the solid ridges are drawn from it.
  const geom = createGeometry({ trace, layout: L, W, yScale, rule, massif: MASSIF });
  const agents = trace.agents;
  const agentIndex = new Map(agents.map((a, i) => [a.id, i]));
  const rootInfo = L.info.get(L.root.id);

  // ---- per-agent state texture: row 0 = solid colour (rgb) + mix (a); row 1 = emphasis, hidden, x-ray skip, fade ----
  const AW = Math.max(1, agents.length);
  const agentData = new Float32Array(AW * 2 * 4);
  const agentTex = new THREE.DataTexture(agentData, AW, 2, THREE.RGBAFormat, THREE.FloatType);
  agentTex.minFilter = agentTex.magFilter = THREE.NearestFilter;
  for (let i = 0; i < AW; i++) {
    agentData[(AW + i) * 4] = 1;
    agentData[(AW + i) * 4 + 2] = agents[i].kind === "root" ? 1 : 0; // the x-ray pass skips the root
  }
  agentTex.needsUpdate = true;

  const shared = {
    uCol: { value: STRATA.map(s => new THREE.Color(s.color)) },
    uEm: { value: STRATA.map(() => 1) },
    uFog: { value: FOG.clone() },
    uFogDensity: { value: 0.0042 },
    uFocusDist: { value: 100 },
    uLight: { value: LIGHT.clone() },
    uAgents: { value: agentTex }
  };
  // The playhead's cut (see FRAG under CUT). Owned by the landscape's own materials only, never
  // `shared`: the navigator and the L1/L2 cores are not cut. Off by default (no cut at the end of the
  // session), so the overview is unchanged.
  const NO_CUT = 1e30;
  const cutU = { uCutX: { value: NO_CUT } };
  const strataMaterial = (defines = {}, own = {}) => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, defines,
    uniforms: { ...shared, uSel: { value: -1 }, uCursor: { value: -1 }, uHover: { value: -1 }, uAgentEm: { value: 1 }, uXray: { value: 0.24 }, uReflect: { value: 0.3 }, ...own },
    side: THREE.DoubleSide
  });

  // ---- row geometry ----
  // Each segment is a block: the front face is the data (exact context, layered by stratum), the
  // back slope and cut ends give it volume. The main ridge is a massif whose slope runs back in
  // proportion to its height; subagent ridges are shallow blocks in the field in front of it.
  const rows = []; // for picking: { z, depthOf(h), maxDepth, segs: [{ agent, inf, i0, i1, x0, x1, taper }] }
  const rowZ = geom.rowZ; // agent id -> [{ seg, zFront }]; ridges only
  const { rootDepth, subDepth, rootBack, profile } = geom;

  function buildRidges() {
    const front = { pos: [], nor: [], b0: [], b1: [], ag: [], idx: [], u: [] };
    const slope = { pos: [], nor: [], b0: [], b1: [], ag: [], idx: [], u: [] };
    const addSeg = (agent, inf, seg, zF, depthOf, taper) => {
      const ai = agentIndex.get(agent.id);
      const cols = [];
      const stepped = geom.stepped(agent);
      if (stepped) {
        // one flat tread per request, a riser between: the crest reads request by request
        for (let i = seg.i0; i <= seg.i1; i++) {
          const t = geom.tops(agent, i), [a, b] = geom.tread(agent, i);
          cols.push({ x: a, t }, { x: b, t });
        }
      } else {
        for (let i = seg.i0; i <= seg.i1; i++) cols.push({ x: geom.x(agent, i), t: geom.tops(agent, i) });
        // flat ends a little past the first and last request, so a one-request segment still has width
        cols.unshift({ x: cols[0].x - taper, t: cols[0].t });
        cols.push({ x: cols.at(-1).x + taper, t: cols.at(-1).t });
      }
      // front face
      let v0 = front.pos.length / 3;
      for (const c of cols) {
        for (const y of [0, c.t[6]]) {
          front.pos.push(c.x, y, zF); front.nor.push(0, 0, 1);
          front.b0.push(c.t[0], c.t[1], c.t[2], c.t[3]); front.b1.push(c.t[4], c.t[5], c.t[6], c.t[7] || 0); front.ag.push(ai); front.u.push(0);
        }
      }
      for (let c = 0; c < cols.length - 1; c++) {
        const a = v0 + c * 2, b = a + 2;
        front.idx.push(a, b, b + 1, a, b + 1, a + 1);
      }
      // slope rings behind the face
      const ring = c => {
        const depth = depthOf(c.t[6]);
        for (let r = 0; r <= RINGS; r++) {
          const u = r / RINGS;
          slope.pos.push(c.x, c.t[6] * profile(u), zF - u * depth); slope.nor.push(0, 1, 0);
          slope.b0.push(c.t[0], c.t[1], c.t[2], c.t[3]); slope.b1.push(c.t[4], c.t[5], c.t[6], c.t[7] || 0); slope.ag.push(ai); slope.u.push(Math.max(1e-3, u));
        }
      };
      const R = RINGS + 1;
      if (stepped) {
        // each tread and riser keeps its own vertices, so terraces stay crisp under the light
        for (let c = 0; c < cols.length - 1; c++) {
          v0 = slope.pos.length / 3;
          ring(cols[c]); ring(cols[c + 1]);
          for (let r = 0; r < RINGS; r++) { const a = v0 + r, b = a + R; slope.idx.push(a, b, b + 1, a, b + 1, a + 1); }
        }
      } else {
        v0 = slope.pos.length / 3;
        for (const c of cols) ring(c);
        for (let c = 0; c < cols.length - 1; c++) {
          for (let r = 0; r < RINGS; r++) {
            const a = v0 + c * R + r, b = a + R;
            slope.idx.push(a, b, b + 1, a, b + 1, a + 1);
          }
        }
      }
      // cut ends: the massif's cross-section, strata banded by height like the face
      for (const [c, sx] of [[cols[0], -1], [cols.at(-1), 1]]) {
        const depth = depthOf(c.t[6]);
        v0 = slope.pos.length / 3;
        for (let r = 0; r <= RINGS; r++) {
          const u = r / RINGS;
          for (const y of [0, c.t[6] * profile(u)]) {
            slope.pos.push(c.x, y, zF - u * depth); slope.nor.push(sx, 0, 0);
            slope.b0.push(c.t[0], c.t[1], c.t[2], c.t[3]); slope.b1.push(c.t[4], c.t[5], c.t[6], c.t[7] || 0); slope.ag.push(ai); slope.u.push(0);
          }
        }
        for (let r = 0; r < RINGS; r++) {
          const a = v0 + r * 2, b = a + 2;
          slope.idx.push(a, b, b + 1, a, b + 1, a + 1);
        }
      }
    };
    const rootSegs = [];
    for (const seg of rootInfo.segments) { addSeg(L.root, rootInfo, seg, 0, rootDepth, geom.rootTaper); rootSegs.push({ ...seg, inf: rootInfo, taper: geom.rootTaper }); }
    rows.push({ z: 0, depthOf: rootDepth, maxDepth: rootBack, segs: rootSegs });
    const laneRows = [];
    for (let k = 0; k < L.lanes; k++) laneRows.push({ z: laneZ(k), depthOf: subDepth, maxDepth: SUB_DEPTH, segs: [] });
    for (const [, inf] of L.info) {
      if (inf.agent.kind !== "subagent") continue;
      for (const seg of inf.segments) {
        addSeg(inf.agent, inf, seg, laneZ(seg.lane), subDepth, geom.subTaper);
        laneRows[seg.lane].segs.push({ ...seg, inf, taper: geom.subTaper });
      }
    }
    for (const r of laneRows) r.segs.sort((a, b) => a.x0 - b.x0);
    rows.push(...laneRows);
    const mk = (d, computeNormals) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(d.pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(d.nor, 3));
      g.setAttribute("aB0", new THREE.Float32BufferAttribute(d.b0, 4));
      g.setAttribute("aB1", new THREE.Float32BufferAttribute(d.b1, 4));
      g.setAttribute("aAgent", new THREE.Float32BufferAttribute(d.ag, 1));
      g.setAttribute("aU", new THREE.Float32BufferAttribute(d.u, 1));
      g.setIndex(d.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(d.idx, 1) : new THREE.Uint16BufferAttribute(d.idx, 1));
      if (computeNormals) g.computeVertexNormals();
      return g;
    };
    const mat = strataMaterial({ AGENTS: "", CUT: "" }, cutU);
    const fm = new THREE.Mesh(mk(front, false), mat);
    const sm = new THREE.Mesh(mk(slope, true), mat);
    // Neighbouring requests differ in height, so the slope's computed normals swing column by column;
    // at a pixel or less per request that reads as streaks. Keep the fall of the slope, soften the swing.
    const sn = sm.geometry.getAttribute("normal");
    for (let v = 0; v < sn.count; v++) {
      if (slope.nor[v * 3] !== 0) continue; // cut ends keep their true side normal
      const x = sn.getX(v) * 0.25, y = sn.getY(v), z = sn.getZ(v), l = Math.hypot(x, y, z) || 1;
      sn.setXYZ(v, x / l, y / l, z / l);
    }
    fm.frustumCulled = sm.frustumCulled = false;
    return [fm, sm, mat];
  }
  const [frontMesh, slopeMesh, ridgeMat] = buildRidges();
  const world = new THREE.Group();
  world.add(frontMesh, slopeMesh);
  // Keep occluded agent crests legible when the user orbits behind another row.
  const xrayMat = strataMaterial({ AGENTS: "", XRAY: "", CUT: "" }, cutU);
  Object.assign(xrayMat, { transparent: true, depthWrite: false, depthFunc: THREE.GreaterDepth, side: THREE.FrontSide });
  const xray = new THREE.Mesh(frontMesh.geometry, xrayMat);
  xray.frustumCulled = false;
  xray.renderOrder = 2;
  world.add(xray);
  // The floor is polished: the terrain stands on its own soft reflection instead of floating in the
  // dark. The floor writes no depth, so the mirrored copy below it shows through wherever nothing
  // above the floor is nearer; everything above the floor is always nearer along the same ray.
  const reflectMat = strataMaterial({ AGENTS: "", REFLECT: "", CUT: "" }, cutU);
  Object.assign(reflectMat, { transparent: true, depthWrite: false });
  const mirror = new THREE.Group();
  mirror.scale.y = -1;
  for (const m of [frontMesh, slopeMesh]) { const r = new THREE.Mesh(m.geometry, reflectMat); r.frustumCulled = false; r.renderOrder = -1; mirror.add(r); }
  world.add(mirror);
  scene.add(world);

  // ---- playhead ----
  // P is a float in the root's request space (1234.37 is 37% through request 1234); it defaults to the
  // end, the last request complete (playheadEnd), where nothing is cut and the landscape is exactly
  // today's. The lead agent is the root unless the view focuses a subagent ridge: its own request-space
  // playhead is what the director follows (leadScreenX) and getPlayhead reports.
  const rootN = L.root.requests.length;
  const rootEnd = playheadEnd(rootN);
  const play = { P: rootEnd, playing: false };
  let leadAgent = L.root;
  const playState = { uP: play.P, cutX: NO_CUT };
  const clampP = (P) => Math.max(0, Math.min(rootEnd, P));
  // The cut's world x (scene-rules cutXAt): no cut from the last request on.
  const rootX = i => xOf(L.root, i);
  const cutXOf = P => cutXAt(P, rootN, rootX, NO_CUT);
  // The focused agent's own request-space playhead (scene-rules agentPlayhead): a subagent past its last
  // request, or with no cut, stands at its end, the last request complete. agentView is reused, so the
  // per-frame call allocates nothing.
  const agentView = { agent: null, isRoot: false, n: 0, xAt: i => xOf(agentView.agent, i) };
  function agentP(agent, P, cutX) {
    if (agentView.agent !== agent) Object.assign(agentView, { agent, isRoot: agent === L.root, n: agent.requests.length });
    return agentPlayhead(P, cutX, agentView, NO_CUT);
  }
  const _pa = new THREE.Vector3();
  // Uniforms for this frame: the cut, on every ridge alike.
  function updatePlayhead() {
    const cutX = cutXOf(play.P);
    cutU.uCutX.value = cutX;
    playState.cutX = cutX;
    playState.uP = agentP(leadAgent, play.P, cutX);
  }

  const heightAt = geom.heightAtSeg; // (agent, inf, seg, x, taper): face height on one segment, -1 off it
  const nearestReq = (inf, seg, x) => {
    let best = seg.i0, bd = Infinity;
    let lo = seg.i0, hi = seg.i1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (inf.xs[m] * W <= x) lo = m; else hi = m; }
    for (const i of [lo, hi]) { const d = Math.abs(inf.xs[i] * W - x); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const crest = geom.crest, zOf = geom.z, xOf = geom.x;

  // ---- ground, gaps, ticks, ruler ----
  const backZ = -rootBack - 8;
  const fieldFront = L.lanes ? laneZ(L.lanes - 1) + 8 : SIDE_Z + 8;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W * 6, 1600).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uFog: shared.uFog, uFocusDist: shared.uFocusDist, uC: { value: new THREE.Vector3(W / 2, 0, (backZ + fieldFront) / 2) } },
    vertexShader: `varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mv=viewMatrix*w; vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `${HAZE} uniform vec3 uFog; uniform vec3 uC; varying vec3 vW; varying float vD;
      void main(){ vec2 d = (vW.xz - uC.xz) / vec2(${(W * 0.62).toFixed(1)}, ${Math.max(60, (fieldFront - backZ) * 0.6).toFixed(1)});
        float pool = exp(-dot(d,d)*1.6);
        vec3 c = mix(vec3(0.010,0.013,0.019), vec3(0.030,0.040,0.058), pool);
        // The floor thins out well beyond the terrain, into the stage's own glow: no hard horizon.
        float edge = 1.0 - smoothstep(1.1, 2.4, length(d));
        gl_FragColor = vec4(mix(c, uFog, haze(vW, vD)), edge);
        #include <colorspace_fragment>
      }`
  }));
  ground.position.y = -0.02;
  Object.assign(ground.material, { depthWrite: false, transparent: true });
  ground.renderOrder = -2;
  scene.add(ground);

  const gapMat = new THREE.MeshBasicMaterial({ color: "#2a3444" });
  for (const g of L.gaps) {
    const w = Math.max(0.25, (g.x1 - g.x0) * W * 0.5);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, SIDE_Z + 2.5).rotateX(-Math.PI / 2), gapMat);
    plane.position.set((g.x0 + g.x1) / 2 * W, 0.01, (SIDE_Z + 2.5) / 2 + 0.3);
    world.add(plane);
  }

  // ---- landmarks: flags (asks), pins (actions), instruction-like markers, cairns (side calls) ----
  const PIN_CAP = 36; // px: the tallest a beacon is drawn, whatever the zoom
  const pinUniforms = { uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uMaxHeight: { value: PIN_CAP } };
  // Instanced screen-space pins; set(list) with [{ x, y, z, len, color, w (shaft px), r (head px) }].
  // head: "dot" for beacons, "flag" for the pennant on an ask; maxHeight caps the drawn pole in px.
  function makePins(cap, withHeads, { head: shape = "dot", maxHeight, cut = false } = {}) {
    const n = Math.max(1, cap);
    const attrs = {
      iBase: new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), iLen: new THREE.InstancedBufferAttribute(new Float32Array(n), 1),
      iColor: new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), iPx: new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2)
    };
    const own = { ...(maxHeight ? { uMaxHeight: { value: maxHeight } } : {}), uCutX: cut ? cutU.uCutX : { value: NO_CUT } };
    const mk = head => {
      const g = new THREE.InstancedBufferGeometry();
      const y0 = head ? -1 : 0;
      g.setAttribute("position", new THREE.Float32BufferAttribute([-1, y0, 0, 1, y0, 0, 1, 1, 0, -1, 1, 0], 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      for (const [k, a] of Object.entries(attrs)) g.setAttribute(k, a);
      g.instanceCount = 0;
      const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: PIN_VERT, fragmentShader: PIN_FRAG, uniforms: { ...pinUniforms, ...own, uHead: { value: !head ? 0 : shape === "flag" ? 2 : 1 } }, side: THREE.DoubleSide, transparent: true }));
      mesh.frustumCulled = false;
      mesh.renderOrder = head ? 4 : 3;
      return mesh;
    };
    const group = new THREE.Group();
    const parts = withHeads ? [mk(false), mk(true)] : [mk(false)];
    group.add(...parts);
    const c = new THREE.Color();
    // Only an attribute whose values changed is uploaded: the same beacons at the same zoom touch no GL buffer.
    const stale = new Set();
    const put = (a, i, v) => { const f = Math.fround(v); if (!Object.is(a.array[i], f)) { a.array[i] = f; stale.add(a); } };
    group.userData.set = list => {
      list.forEach((p, k) => {
        put(attrs.iBase, k * 3, p.x); put(attrs.iBase, k * 3 + 1, p.y); put(attrs.iBase, k * 3 + 2, p.z); put(attrs.iLen, k, p.len);
        c.set(p.color); put(attrs.iColor, k * 3, c.r); put(attrs.iColor, k * 3 + 1, c.g); put(attrs.iColor, k * 3 + 2, c.b);
        put(attrs.iPx, k * 2, p.w); put(attrs.iPx, k * 2 + 1, p.r || 0);
      });
      for (const a of stale) a.needsUpdate = true;
      stale.clear();
      for (const m of parts) m.geometry.instanceCount = list.length;
    };
    return group;
  }
  const youHex = STRATA[STRATUM_INDEX.you].color;
  // The user's asks: a pole with a pennant, grouped by the same world bins as the beacons.
  function flagMeshes(items, cut = false) { // items: [{x,y,z,h}]; cut: hidden beyond the playhead (map flags, not the stage's)
    const g = makePins(items.length, true, { head: "flag", maxHeight: 40, cut });
    const asks = items.map((f, i) => ({ ...f, i, kind: "ask" }));
    g.userData.update = () => {
      const kept = clusterStable(asks, mapBin()).map(c => c.point).filter(f => inMap(projectMapPoint(new THREE.Vector3(f.x, f.y, f.z))));
      g.userData.set(kept.map(f => ({ x: f.x, y: f.y, z: f.z, len: f.h, color: youHex, w: 3, r: 12 })));
    };
    return g;
  }
  const rootAsks = L.root.asks.map(a => {
    const i = Math.min(Math.max(0, a.request), L.root.requests.length - 1);
    return { x: xOf(L.root, i), y: crest(L.root, i), z: -0.6, h: rule.compact ? 4.6 : 3.6 };
  });
  const flags = flagMeshes(rootAsks, true);
  world.add(flags);

  const allActs = [];
  for (const a of agents) {
    if (a.kind === "side" || a.kind === "guardian") continue;
    a.requests.forEach((r, i) => { if (r.action && STATUS[r.action.class]) allActs.push({ a, i, cls: r.action.class }); });
  }
  const pins = makePins(allActs.length, true, { cut: true });
  let beamCandidates = [];
  const beamPick = []; // [{a, i, x, y0, y1, z}]
  function layoutBeams(lens) {
    const list = [];
    beamPick.length = 0;
    for (const act of allActs) {
      // Every tool call is a pin on the crest: tall red beacons left the machine, amber wrote
      // locally, short blue read. The egress lens drops reads; the other lenses keep beacons only.
      const show = act.cls === "outward" || (act.cls === "write" && (lens === "context" || lens === "egress")) || (act.cls === "read" && lens === "context");
      if (!show) continue;
      const tall = act.cls === "outward" ? (lens === "egress" ? 16 : 11) : act.cls === "write" ? (lens === "egress" ? 5 : 3.4) : 1.9;
      const x = xOf(act.a, act.i), y = crest(act.a, act.i), z = zOf(act.a, act.i) - (act.a.kind === "root" ? 0.8 : 0.4);
      // shaft px include a hairline dark rim each side, so a fine stem still reads on any stratum
      // Only outward pins carry a head in a session with a subagent field, so hundreds of reads stay a fringe, not a fence.
      const head = act.cls === "outward" ? 3.6 : !rule.compact ? 0 : act.cls === "write" ? 2.8 : 2.4;
      list.push({ x, y, z, len: tall, color: STATUS[act.cls].color, w: act.cls === "outward" ? 3.4 : 3.2, r: head });
      beamPick.push({ a: act.a, i: act.i, kind: act.cls, x, y0: y, y1: y + tall, z });
    }
    beamCandidates = list.map((p, i) => ({ ...p, ...beamPick[i], kind: beamPick[i].kind }));
  }
  world.add(pins);

  // instruction-like inflow markers (lens 3)
  const flagged = [];
  for (const a of agents) {
    if (!rowZ.has(a.id)) continue;
    for (const b of a.blocks) {
      if (b.kind !== "outside" || !b.flags || !b.flags.includes("instruction-like")) continue;
      const i = a.requests.findIndex(r => r.window && r.window[1] >= b.i);
      if (i >= 0) flagged.push({ a, i, b });
    }
  }
  // Built-in materials (markers, event lines) learn the cut through onBeforeCompile: a vertex beyond
  // uCutX collapses to a point outside the clip volume.
  function cutByX(material, instanced = false) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uCutX = cutU.uCutX;
      const wx = instanced ? "(modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).x" : "(modelMatrix * vec4(position, 1.0)).x";
      shader.vertexShader = "uniform float uCutX;\n" + shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>\n  if (${wx} > uCutX) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);`);
    };
    material.customProgramCacheKey = () => `trace-cut-${instanced ? "i" : "v"}`;
    return material;
  }
  const warnMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.55), cutByX(new THREE.MeshBasicMaterial({ color: STATUS.flag.color, fog: false }), true), Math.max(1, flagged.length));
  {
    const m = new THREE.Matrix4();
    flagged.forEach((f, n) => { m.makeScale(1, 1.6, 1).setPosition(xOf(f.a, f.i), crest(f.a, f.i) + 1.6, zOf(f.a, f.i) - 0.4); warnMesh.setMatrixAt(n, m); });
    warnMesh.count = flagged.length;
    warnMesh.frustumCulled = false;
    warnMesh.visible = false;
    world.add(warnMesh);
  }

  // side calls and guardian reviews: small cores standing in front of the main ridge
  const sideAgents = agents.filter(a => a.kind === "side" || a.kind === "guardian");
  const sideReqs = [];
  for (const a of sideAgents) a.requests.forEach((r, i) => sideReqs.push({ a, i, x: L.X(r.t) * W }));
  const coreGeo = new THREE.CylinderGeometry(1, 1, 1, 18, 1).translate(0, 0.5, 0);
  // Side calls (advisor iterations, guardian reviews) are small outcrops beside the main ridge, not
  // spikes in it; their exact context is in the tooltip and panel, so they are not drawn to height scale.
  const outcropGeo = new THREE.CylinderGeometry(0.72, 1, 1, 6, 1).translate(0, 0.5, 0);
  const cairns = new THREE.InstancedMesh(outcropGeo, strataMaterial({ CUT: "" }, cutU), Math.max(1, sideReqs.length));
  {
    const b0 = new Float32Array(Math.max(1, sideReqs.length) * 4), b1 = new Float32Array(Math.max(1, sideReqs.length) * 4);
    const m = new THREE.Matrix4();
    sideReqs.forEach((s, n) => {
      const r = s.a.requests[s.i];
      const t = topsOf(r, 1 / Math.max(1, r.tokens.context || 1));
      b0.set([t[0], t[1], t[2], t[3]], n * 4); b1.set([t[4], t[5], 1, t[7]], n * 4);
      m.makeScale(0.55, 0.6 + 1.8 * Math.sqrt((r.tokens.context || 0) / L.yMax), 0.55).setPosition(s.x, 0, SIDE_Z);
      cairns.setMatrixAt(n, m);
    });
    cairns.geometry = outcropGeo.clone();
    cairns.geometry.setAttribute("aB0", new THREE.InstancedBufferAttribute(b0, 4));
    cairns.geometry.setAttribute("aB1", new THREE.InstancedBufferAttribute(b1, 4));
    cairns.count = sideReqs.length;
    cairns.frustumCulled = false;
    world.add(cairns);
  }

  // spawn and return links: luminous threads arcing over the valley. They are drawn at a constant
  // pixel width with an antialiased core and a soft halo, so they stay clean lines at every zoom
  // instead of sub-pixel strips that break into streaks; each fades in and out at its ends.
  function ribbons(list, widthOf, colorOf) {
    const pos = [], nxt = [], side = [], at = [], wpx = [], col = [], idx = [], ag = [], ev = [];
    const c = new THREE.Color();
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), pc = new THREE.Vector3();
    const bez = (t, out) => { const u = 1 - t; return out.set(u * u * p0.x + 2 * u * t * pc.x + t * t * p1.x, u * u * p0.y + 2 * u * t * pc.y + t * t * p1.y, u * u * p0.z + 2 * u * t * pc.z + t * t * p1.z); };
    const q = new THREE.Vector3(), qn = new THREE.Vector3();
    for (const l of list) {
      if (l.child.kind !== "subagent") continue;
      const ci = l.type === "spawn" ? l.seg.i0 : l.seg.i1;
      p0.set(xOf(l.parent, l.parentReq), crest(l.parent, l.parentReq), zOf(l.parent, l.parentReq) - (l.parent.kind === "root" ? 1.2 : 0.4));
      p1.set(xOf(l.child, ci), crest(l.child, ci), laneZ(Math.max(0, l.seg.lane)) - 0.3);
      pc.set((p0.x + p1.x) / 2, Math.max(p0.y, p1.y) + 0.6, (p0.z + p1.z) / 2);
      const w = widthOf(l);
      c.set(colorOf(l));
      const ai = agentIndex.get(l.child.id);
      const evX = Math.max(p0.x, p1.x); // the link appears once the playhead's cut has passed both ends
      const N = 32, v0 = pos.length / 3;
      for (let k = 0; k <= N; k++) {
        bez(k / N, q);
        // the next point along the curve gives the screen direction; the last one looks back and flips
        if (k < N) bez((k + 1) / N, qn); else { bez((k - 1) / N, qn); qn.sub(q).negate().add(q); }
        for (const sd of [-1, 1]) { pos.push(q.x, q.y, q.z); nxt.push(qn.x, qn.y, qn.z); side.push(sd); at.push(k / N); wpx.push(w); col.push(c.r, c.g, c.b); ag.push(ai); ev.push(evX); }
        if (k < N) { const a = v0 + k * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aNext", new THREE.Float32BufferAttribute(nxt, 3));
    g.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
    g.setAttribute("aT", new THREE.Float32BufferAttribute(at, 1));
    g.setAttribute("aW", new THREE.Float32BufferAttribute(wpx, 1));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("aAgent", new THREE.Float32BufferAttribute(ag, 1));
    g.setAttribute("aEventX", new THREE.Float32BufferAttribute(ev, 1));
    g.setIndex(idx);
    const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0.3 }, uHover: linkHover, uRes: pinUniforms.uRes, uDpr: pinUniforms.uDpr, uCutX: cutU.uCutX },
      vertexShader: `attribute vec3 color; attribute vec3 aNext; attribute float aSide; attribute float aT; attribute float aW; attribute float aAgent; attribute float aEventX;
        uniform float uHover; uniform vec2 uRes; uniform float uDpr; uniform float uCutX;
        varying vec3 vC; varying float vOn; varying float vSide; varying float vT; varying float vHalf; varying float vW;
        void main(){
          if (aEventX > uCutX) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vC = vec3(0.0); vOn = 0.0; vSide = 0.0; vT = 0.0; vHalf = 1.0; vW = 0.0; return; }
          vC = color; vOn = abs(aAgent - uHover) < 0.5 ? 1.0 : 0.0; vSide = aSide; vT = aT;
          vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec4 b = projectionMatrix * modelViewMatrix * vec4(aNext, 1.0);
          vec2 d = (b.xy / b.w - a.xy / a.w) * uRes;
          d = length(d) > 1e-4 ? normalize(d) : vec2(1.0, 0.0);
          vW = aW * uDpr * (1.0 + 0.5 * vOn);
          vHalf = vW * 0.5 + 2.0 * uDpr;
          a.xy += vec2(-d.y, d.x) * aSide * vHalf * 2.0 / uRes * a.w;
          gl_Position = a;
        }`,
      fragmentShader: `uniform float uOpacity; varying vec3 vC; varying float vOn; varying float vSide; varying float vT; varying float vHalf; varying float vW;
        void main(){
          float d = abs(vSide) * vHalf;
          float core = clamp(vW * 0.5 + 0.5 - d, 0.0, 1.0);
          float halo = 0.1 * exp(-d * d / max(1.0, vW * vW));
          float ends = mix(smoothstep(0.0, 0.14, vT) * smoothstep(1.0, 0.94, vT), 1.0, vOn);
          float a = max(core, halo) * mix(uOpacity, 1.0, vOn) * ends;
          if (a <= 0.002) discard;
          gl_FragColor = vec4(vC * (1.0 + 0.3 * vOn), a);
          #include <colorspace_fragment>
        }`,
      side: THREE.DoubleSide, transparent: true, depthWrite: false
    }));
    mesh.frustumCulled = false;
    return mesh;
  }
  const linkHover = { value: -1 };
  const maxReport = Math.max(1, ...L.links.map(l => l.size || 0));
  const spawnLinks = ribbons(L.links.filter(l => l.type === "spawn"), () => 1, () => "#aab8cc");
  const returnLinks = ribbons(L.links.filter(l => l.type === "return"), l => 1 + 2.4 * Math.sqrt((l.size || 0) / maxReport), () => STRATA[STRATUM_INDEX.agents].color);
  world.add(spawnLinks, returnLinks);

  // compaction and shrink markers (root ridge front)
  const markLines = [];
  let cliffLines = null;
  for (const c of L.root.compactions) markLines.push({ x: L.X(c.t) * W, y0: c.post * yScale, y1: c.pre * yScale, dashed: true, text: `compacted ${fmtTok(c.pre)} → ${fmtTok(c.post)}` });
  for (const s of unloggedShrinks(L.root)) markLines.push({ x: rootInfo.xs[s.request] * W, y0: s.to * yScale, y1: s.from * yScale, dashed: false, text: "context shrank; not logged as a compaction" });
  {
    const pts = [];
    for (const m of markLines) pts.push(m.x, m.y0, 0.08, m.x, m.y1 + 1.6, 0.08);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    cliffLines = new THREE.LineSegments(g, cutByX(new THREE.LineDashedMaterial({ color: "#eef1f5", dashSize: 0.5, gapSize: 0.35, fog: false })));
    cliffLines.computeLineDistances();
    world.add(cliffLines);
  }

  // Mid-session injections on the main thread: large blocks inserted after the first request (a
  // model switch, a skills list sent again, skills re-sent after a compaction), and any copy of the
  // user's own setup sent again. The standing harness (system prompt, tools) is not an event.
  // Labelled where they arrived, the largest first.
  // Sized as its row in that request's stratum list: the block's part in its own stratum (the product's
  // wording around the user's setup is Harness), on the scale of the request that first saw it.
  const events = crestEvents(L.root.blocks, b => blockPart(b, b.kind) * (L.root.requests[b.seenBy]?.scale?.[b.kind] ?? 1));
  for (const e of events) e.own = !!L.root.blocks[e.top].own;
  // A model switch is a landmark whether or not the log carries an instruction block for it.
  const switches = modelSwitches(L.root.requests);
  const switchAt = new Map(switches.map(s => [s.i, s]));
  const bareSwitches = switches.filter(s => !events.some(e => e.i === s.i)).slice(0, 6);
  const eventLines = new THREE.Group();
  {
    const pos = [], col = [], c = new THREE.Color();
    for (const e of [...events, ...bareSwitches]) {
      const x = xOf(L.root, e.i), y = crest(L.root, e.i);
      c.set(e.own ? STRATA[STRATUM_INDEX.you].color : e.top == null ? "#eef1f5" : STRATA[STRATUM_INDEX.injected].color);
      pos.push(x, y, 0.12, x, y + 2.2, 0.12);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    eventLines.add(new THREE.LineSegments(g, cutByX(new THREE.LineBasicMaterial({ vertexColors: true, fog: false }))));
  }
  world.add(eventLines);

  // ruler and hour ticks; the ruler stands at the main ridge's left end, wherever that starts
  const RX = (rootInfo.xs[rootInfo.segments[0]?.i0 ?? 0] || 0) * W - 3;
  const ruler = new THREE.Group();
  {
    const pts = [RX, 0, 0, RX, H, 0];
    const ticks = rulerTicks(L.yMax);
    for (const v of ticks) pts.push(RX - 0.6, v * yScale, 0, RX, v * yScale, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    ruler.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: "#8d97a6", fog: false })));
    if (trace.contextWindow && trace.contextWindow <= L.yMax * 1.2) {
      const y = trace.contextWindow * yScale;
      const cg = new THREE.BufferGeometry();
      cg.setAttribute("position", new THREE.Float32BufferAttribute([RX, y, 0.05, W + 2, y, 0.05], 3));
      const cl = new THREE.Line(cg, new THREE.LineDashedMaterial({ color: "#6f7a8a", dashSize: 1.2, gapSize: 0.9, fog: false }));
      cl.computeLineDistances();
      ruler.add(cl);
    }
  }
  world.add(ruler);

  // ---- labels (pooled per level; only what is in focus) ----
  let detailedLabels = false;
  let overviewDistance = 1, detail = mapDetail(1), mapZoom = 1;
  const labelGroups = { l0: new THREE.Group(), l1: new THREE.Group(), l2: new THREE.Group(), map: new THREE.Group() };
  Object.values(labelGroups).forEach(g => scene.add(g));
  const PRIO = { focus: 10, request: 6, agent: 5, cluster: 4, corehead: 9, stratum: 8, cursor: 8, cliff: 7, event: 6, row: 5, gap: 4, tick: 2 };
  function label(text, cls, pos, center = [0.5, 0.5], group = labelGroups.l0, onClick) {
    const div = document.createElement(onClick ? "button" : "div");
    div.className = `lbl ${cls || ""}`;
    div.textContent = text;
    if (onClick) { div.type = "button"; div.addEventListener("click", e => { e.stopPropagation(); onClick(); }); div.addEventListener("pointerdown", e => e.stopPropagation()); }
    const o = new CSS2DObject(div);
    o.center.set(center[0], center[1]);
    o.position.copy(pos);
    o.userData.prio = PRIO[(cls || "").split(" ")[0]] ?? 3;
    if ((cls || "").includes("time")) o.userData.prio = 1;
    group.add(o);
    return o;
  }
  // Hide lower-priority labels that would overlap others or sit under the HUD and panel, and landmark
  // and map labels that stand beyond the playhead's cut.
  const CUT_LABELS = /\b(event|cliff|cluster|request|focus|stratum|agent)\b/;
  const _v = new THREE.Vector3();
  let lastPlaced = new Set();
  function declutter() {
    const w = viewW, h = viewH; // as of the last resize: reading the host here, after the label writes, forced a layout every frame
    const items = [];
    for (const g of Object.values(labelGroups)) {
      if (!g.visible) continue;
      for (const o of g.children) {
        const e = o.element;
        if (!e._w || e.style.display === "none") continue;
        _v.setFromMatrixPosition(o.matrixWorld).project(camera);
        if (o.userData.cx0 === undefined) o.userData.cx0 = o.center.x;
        const beyond = (g === labelGroups.l0 || g === labelGroups.map) && o.position.x > cutU.uCutX.value && CUT_LABELS.test(e.className);
        items.push({ o, e, px: (_v.x + 1) / 2 * w, py: (1 - _v.y) / 2 * h, w: e._w, h: e._h, cx: o.userData.cx0, cy: o.center.y, flip: !!o.userData.flip, p: o.userData.prio || 0, beyond });
      }
    }
    // equal priorities: labels already on screen go first, so they are not traded back and forth
    const was = lastPlaced; lastPlaced = new Set();
    items.sort((a, b) => b.p - a.p || was.has(b.e.textContent) - was.has(a.e.textContent));
    // In a tall, narrow viewport the landscape keeps only its cliff and row labels.
    const sparse = level === 0 && w < h && detail.level === 0;
    const box = { x0: 2, x1: w - insets.right + 4, y0: insets.top - 8, y1: h - insets.bottom + 8 };
    const placed = [];
    let moved = false;
    for (const it of items) {
      // its own anchor first; a landmark label mirrors its anchor before it gives up its place
      const quietEvent = level === 0 && !detailedLabels && detail.level < 2 && it.e.classList.contains("event");
      const at = quietEvent || it.beyond || (sparse && it.p < 5) ? null : placeLabel(it, box, placed);
      const hide = !at;
      if ((it.e.style.visibility === "hidden") !== hide) it.e.style.visibility = hide ? "hidden" : "";
      if (!at) continue;
      placed.push(at); lastPlaced.add(it.e.textContent);
      if (at.cx !== it.o.center.x) { it.o.center.x = at.cx; moved = true; }
    }
    if (moved) labels.render(scene, camera);
  }
  // CSS2DRenderer.render re-places every label on each call; it runs only when something that places one changed:
  // the camera, the viewport, a label's presence, visibility, anchor or centre, or a refresh (labelsStale). A
  // label measured after its first placement keeps that placement until then, as the labels of the last map
  // refresh always stood at rest before the refresh was change-driven.
  let labelsStale = true, labelKeys = [], labelKeyCount = 0;
  function labelsMoved() {
    let k = 0, changed = labelsStale;
    const put = v => { if (labelKeys[k] !== v) { labelKeys[k] = v; changed = true; } k++; };
    for (const v of camera.matrixWorld.elements) put(v);
    for (const v of camera.projectionMatrix.elements) put(v);
    put(viewW); put(viewH);
    const walk = (o, shown) => {
      shown = shown && o.visible;
      if (o.isCSS2DObject) { const m = o.matrixWorld.elements; put(o.id); put(shown); put(m[12]); put(m[13]); put(m[14]); put(o.center.x); put(o.center.y); }
      for (const c of o.children) walk(c, shown);
    };
    walk(scene, true);
    if (k !== labelKeyCount) { labelKeyCount = k; changed = true; }
    labelsStale = false;
    return changed;
  }
  // Sizes for whole-pixel placement. A label measured here outside the map (the stage's) is re-placed on whole
  // pixels next frame, as the next drawn frame always did; a map label keeps the placement its refresh gave it
  // until something moves, and a reused one gets its size back.
  const measure = () => {
    for (const g of Object.values(labelGroups)) g.traverse(o => {
      const e = o.element;
      if (!o.isCSS2DObject || e._w !== undefined || !e.isConnected) return;
      if (o.userData.size) [e._w, e._h] = o.userData.size;
      else if (e.offsetWidth) {
        e._w = e.offsetWidth; e._h = e.offsetHeight;
        if (g !== labelGroups.map) { labelsStale = true; dirty = Math.max(dirty, 2); }
      }
    });
  };
  function buildL0Labels() {
    const g = labelGroups.l0;
    // Cliff labels near the right end hang inward; declutter may still mirror any of these before hiding it.
    for (const m of markLines) label(m.text, m.dashed ? "cliff" : "cliff soft", new THREE.Vector3(m.x, m.y1 + 1.8, 0.1), [m.x > W * 0.8 ? 1 : 0, 1], g).userData.flip = true;
    // "developer: model_switch.instructions" reads as "model switch"
    const name = l => l.replace(/^developer: /, "").replace(/\.instructions$/, "").replace(/_/g, " ");
    const models = s => `${s.from} → ${s.to}`;
    const cxAt = x => (x > W * 0.8 ? 1 : x < W * 0.2 ? 0 : 0.5);
    for (const e of events) {
      const b = L.root.blocks[e.top], sw = switchAt.get(e.i);
      const head = sw && /model.?switch/i.test(b.label || "") ? `model switch · ${models(sw)}` : clip(name(b.label || "block"), 34);
      const x = xOf(L.root, e.i), at = new THREE.Vector3(x, crest(L.root, e.i) + 2.3, 0.12);
      // Click: that request's stratum list with this block open.
      label(`${head} · ≈ ${fmtTok(e.topSize)}${b.resendOf != null ? (b.resendSame ? " · sent again, identical" : " · sent again, changed") : ""}`,
        `event${e.own ? " mine" : ""}`, at, [cxAt(x), 1], g, () => onPick({ level: 3, agentId: L.root.id, reqIdx: e.i, stratum: b.kind, block: e.top })).userData.flip = true;
      // The other blocks that arrived with it are counted, never folded into its number; shown only where there is room.
      if (e.n > 1) label(`+ ${e.n - 1} more · ≈ ${fmtTok(e.total - e.topSize)} in this request`, "event more", at, [cxAt(x), 2.12], g,
        () => onPick({ level: 2, agentId: L.root.id, reqIdx: e.i })).userData.prio = 4.5;
    }
    for (const s of bareSwitches) {
      const x = xOf(L.root, s.i);
      label(`model switch · ${models(s)}`, "event", new THREE.Vector3(x, crest(L.root, s.i) + 2.3, 0.12), [cxAt(x), 1], g,
        () => onPick({ level: 2, agentId: L.root.id, reqIdx: s.i })).userData.flip = true;
    }
    for (const gap of L.gaps) {
      const xm = (gap.x0 + gap.x1) / 2;
      // Gaps at either end of the axis (an idle head or tail) align inward so they stay on screen.
      label(`≈ ${fmtDur(gap.b - gap.a)} idle`, "gap", new THREE.Vector3(xm * W, 0, SIDE_Z + 3.2), [xm > 0.9 ? 1 : xm < 0.1 ? 0 : 0.5, 0], g);
    }
    for (const v of rulerTicks(L.yMax)) label(fmtTok(v), "tick", new THREE.Vector3(RX - 1, v * yScale, 0), [1, 0.5], g);
    label("context tokens", "tick cap", new THREE.Vector3(RX, H + 1.2, 0), [0.5, 1], g);
    if (trace.contextWindow && trace.contextWindow <= L.yMax * 1.2) label(`context window ${fmtTok(trace.contextWindow)}`, "tick", new THREE.Vector3(W + 2.5, trace.contextWindow * yScale, 0), [0, 0.5], g);
    const long = spansDays(trace);
    let last = -1e9;
    for (const t of L.hours) {
      const x = L.X(t) * W;
      if (x - last < W / (long ? 8 : 11) || L.gaps.some(g => Math.abs((g.x0 + g.x1) / 2 * W - x) < W / 28)) continue;
      last = x;
      label(fmtTick(t, long), "tick time", new THREE.Vector3(x, 0, SIDE_Z + 7.5), [0.5, 0], g);
    }
    const r0 = rootInfo.segments[0];
    if (r0) label(L.root.kind === "root" ? "main thread" : L.root.name, "row", new THREE.Vector3(rootInfo.xs[r0.i0] * W, crest(L.root, r0.i0) + 4, -1), [0.5, 1], g);
    const nSub = agents.filter(a => a.kind === "subagent").length;
    // A quiet label along the front edge of the subagent field.
    if (L.lanes) {
      // a T3 family's remote delegates are threads, not subagents
      label(`${trace.family ? "threads & subagents" : "subagents"} (${nSub})`, "row quiet", new THREE.Vector3(W * 0.5, 0, fieldFront), [0.5, 1], g);
    }
  }
  buildL0Labels();

  // ---- L1: core samples of the focused agent ----
  const cap = Math.max(1, ...agents.map(a => a.requests.length));
  const coreMat = strataMaterial();
  const cores = new THREE.InstancedMesh(coreGeo.clone(), coreMat, cap);
  cores.geometry.setAttribute("aB0", new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
  cores.geometry.setAttribute("aB1", new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
  cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cores.frustumCulled = false;
  cores.count = 0;
  scene.add(cores);
  // the cores stand on the same polished floor as the ridges
  const coreReflectMat = strataMaterial({ REFLECT: "" });
  Object.assign(coreReflectMat, { transparent: true, depthWrite: false });
  const coreMirror = new THREE.InstancedMesh(cores.geometry, coreReflectMat, cap);
  coreMirror.instanceMatrix = cores.instanceMatrix;
  coreMirror.frustumCulled = false;
  coreMirror.renderOrder = -1;
  const coreMirrorGroup = new THREE.Group();
  coreMirrorGroup.scale.y = -1;
  coreMirrorGroup.add(coreMirror);
  scene.add(coreMirrorGroup);
  const stage = { agent: null, n: 0, from: null, to: null, heights: null, t0: 0, dur: 0, lifted: -1, scale: 1, flags: null, beams: null };
  const stageX = i => W / 2 + (i - (stage.n - 1) / 2) * SP;

  function buildStage(agent, originIdx) {
    const n = agent.requests.length;
    stage.agent = agent; stage.n = n;
    const peak = Math.max(1, ...agent.requests.map(r => r.tokens.context || 0));
    stage.scale = H1 / peak;
    const b0 = cores.geometry.getAttribute("aB0"), b1 = cores.geometry.getAttribute("aB1");
    stage.from = new Float32Array(n * 4); stage.to = new Float32Array(n * 4);
    const inf = L.info.get(agent.id);
    const isRow = rowZ.has(agent.id);
    for (let i = 0; i < n; i++) {
      const r = agent.requests[i];
      const t = topsOf(r, 1 / Math.max(1, r.tokens.context || 1));
      b0.array.set([t[0], t[1], t[2], t[3]], i * 4);
      b1.array.set([t[4], t[5], 1, t[7]], i * 4);
      stage.from.set([inf ? inf.xs[i] * W : stageX(i), isRow ? zOf(agent, i) - 0.5 : SIDE_Z, Math.max(0.05, crest(agent, i)), 0.08], i * 4);
      stage.to.set([stageX(i), STAGE_Z, Math.max(0.05, (r.tokens.context || 0) * stage.scale), CORE_R], i * 4);
    }
    b0.needsUpdate = b1.needsUpdate = true;
    cores.count = n;
    stage.t0 = performance.now();
    stage.dur = reducedMotion ? 0 : 1100;
    stage.origin = originIdx ?? 0;
    stage.lifted = -1;
    // stage landmarks: asks as flags, actions as short beacons
    if (stage.flags) { cores.parent.remove(stage.flags); stage.flags = null; }
    stage.flags = flagMeshes(agent.asks.map(a => {
      const i = Math.min(Math.max(0, a.request), n - 1);
      return { x: stageX(i), y: (agent.requests[i]?.tokens.context || 0) * stage.scale, z: STAGE_Z, h: 1.5 };
    }));
    scene.add(stage.flags);
    placeCores(reducedMotion ? 1 : 0);
  }
  function placeCores(p) {
    const m = new THREE.Matrix4();
    const n = stage.n;
    for (let i = 0; i < n; i++) {
      // ripple outward from the clicked request
      const delay = Math.min(0.55, Math.abs(i - stage.origin) / 180);
      const k = ease(Math.min(1, Math.max(0, (p - delay) / (1 - delay))));
      const f = stage.from, t = stage.to, o = i * 4;
      const x = f[o] + (t[o] - f[o]) * k, z = f[o + 1] + (t[o + 1] - f[o + 1]) * k;
      const h = f[o + 2] + (t[o + 2] - f[o + 2]) * k, r = f[o + 3] + (t[o + 3] - f[o + 3]) * k;
      const hidden = i === stage.lifted;
      m.makeScale(hidden ? 0.0001 : r, hidden ? 0.0001 : h, hidden ? 0.0001 : r).setPosition(x, 0, z);
      cores.setMatrixAt(i, m);
    }
    cores.instanceMatrix.needsUpdate = true;
    if (stage.flags) stage.flags.visible = p >= 1 && level >= 1 && stage.agent != null;
  }

  // ---- L2: the lifted core ----
  const liftGeo = new THREE.CylinderGeometry(1, 1, 1, 56, 1).translate(0, 0.5, 0);
  const liftVerts = liftGeo.getAttribute("position").count;
  liftGeo.setAttribute("aB0", new THREE.Float32BufferAttribute(new Float32Array(liftVerts * 4), 4));
  liftGeo.setAttribute("aB1", new THREE.Float32BufferAttribute(new Float32Array(liftVerts * 4), 4));
  const liftMat = strataMaterial();
  const lifted = new THREE.Mesh(liftGeo, liftMat);
  lifted.visible = false;
  scene.add(lifted);
  const leaderGeo = new THREE.BufferGeometry();
  const leaders = new THREE.LineSegments(leaderGeo, new THREE.LineBasicMaterial({ color: "#c9d1dc", fog: false }));
  scene.add(leaders);
  const lift = { from: new THREE.Vector3(), to: new THREE.Vector3(), t0: 0, dur: 0, fromH: 1, fromR: 0.2, bounds: null };

  function setLifted(i) {
    const agent = stage.agent;
    if (!agent || i == null || i < 0) { lifted.visible = false; leaders.visible = false; stage.lifted = -1; placeCores(1); clearGroup(labelGroups.l2); return; }
    const r = agent.requests[i];
    const t = topsOf(r, 1 / Math.max(1, r.tokens.context || 1));
    lift.bounds = t;
    const b0 = liftGeo.getAttribute("aB0"), b1 = liftGeo.getAttribute("aB1");
    for (let v = 0; v < liftVerts; v++) { b0.array.set([t[0], t[1], t[2], t[3]], v * 4); b1.array.set([t[4], t[5], 1, t[7]], v * 4); }
    b0.needsUpdate = b1.needsUpdate = true;
    const x = stageX(i);
    lift.from.set(x, 0, STAGE_Z);
    lift.fromH = Math.max(0.05, (r.tokens.context || 0) * stage.scale); lift.fromR = CORE_R;
    lift.to.set(x, 1.4, STAGE_Z + 7);
    lift.t0 = performance.now(); lift.dur = reducedMotion ? 0 : 650;
    stage.lifted = i;
    placeCores(1);
    lifted.visible = true;
    stepLift(reducedMotion ? 1 : 0);
    // labels + leaders
    clearGroup(labelGroups.l2);
    const items = [];
    let prev = 0;
    STRATA.forEach((s, j) => {
      const v = r.strata?.[s.key] || 0;
      const lo = prev, hi = t[j];
      prev = hi;
      if (v <= 0) return;
      items.push({ j, s, v, mid: lift.to.y + (lo + hi) / 2 * LIFT_H });
    });
    // push labels apart so none overlap (1.25 world units ≈ one label height at L2 framing)
    const gapY = 1.3;
    for (let k = 1; k < items.length; k++) items[k].y = Math.max(items[k].mid, (items[k - 1].y ?? items[k - 1].mid) + gapY);
    if (items.length) items[0].y = items[0].y ?? items[0].mid;
    const over = items.length ? items.at(-1).y - (lift.to.y + LIFT_H) : 0;
    if (over > 0) items.forEach(it => { it.y -= over; });
    const pts = [];
    const lx = lift.to.x + LIFT_R + 2.2;
    for (const it of items) {
      pts.push(lift.to.x + LIFT_R + 0.05, it.mid, lift.to.z, lx - 0.15, it.y, lift.to.z);
      const o = label(`${it.s.name}  ≈ ${fmtTok(it.v)}  ${Math.round(it.v / (r.tokens.context || 1) * 100)}%`, `stratum s-${it.s.key}${selStratum === it.s.key ? " on" : ""}`,
        new THREE.Vector3(lx, it.y, lift.to.z), [0, 0.5], labelGroups.l2, () => onPick({ level: 3, agentId: agent.id, reqIdx: i, stratum: it.s.key }));
      o.element.style.setProperty("--c", it.s.color);
    }
    label(`request ${i + 1} · ${fmtTok(r.tokens.context)} tokens`, "corehead", new THREE.Vector3(lift.to.x - LIFT_R, lift.to.y + LIFT_H + 0.8, lift.to.z), [0, 1], labelGroups.l2);
    leaderGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    leaders.visible = true;
  }
  function stepLift(p) {
    const k = ease(Math.min(1, p));
    lifted.position.lerpVectors(lift.from, lift.to, k);
    const h = lift.fromH + (LIFT_H - lift.fromH) * k, r = lift.fromR + (LIFT_R - lift.fromR) * k;
    lifted.scale.set(r, h, r);
    labelGroups.l2.visible = k >= 1;
    leaders.visible = k >= 1;
  }
  function clearGroup(g) { for (const o of [...g.children]) { g.remove(o); o.element?.remove(); } }

  // ---- lenses ----
  let lens = "context";
  let selStratum = null;
  const spendRamp = [new THREE.Color("#23456f"), new THREE.Color("#5f9be6"), new THREE.Color("#d6ecff")];
  function setLens(next) {
    lens = next;
    const em = shared.uEm.value;
    for (let j = 0; j < 7; j++) em[j] = next === "context" ? 1 : next === "egress" ? 0.3 : next === "inflow" ? (STRATA[j].key === "outside" ? 1 : 0.25) : 1;
    // per-agent solid colour for the spend lens
    const fresh = agents.map(a => agentStats(a).fresh);
    const maxLog = Math.log10(Math.max(10, ...fresh.filter((_, i) => agents[i].kind === "subagent")));
    const c = new THREE.Color();
    agents.forEach((a, i) => {
      const o = i * 4;
      if (next === "agents" && a.kind === "subagent") {
        const f = Math.max(0, Math.log10(Math.max(1, fresh[i])) - 3) / Math.max(0.5, maxLog - 3);
        const t = Math.min(1, f);
        if (t < 0.5) c.copy(spendRamp[0]).lerp(spendRamp[1], t * 2); else c.copy(spendRamp[1]).lerp(spendRamp[2], (t - 0.5) * 2);
        agentData[o] = c.r; agentData[o + 1] = c.g; agentData[o + 2] = c.b; agentData[o + 3] = 1;
      } else agentData[o + 3] = 0;
      agentData[(AW + i) * 4] = next === "agents" && a.kind === "root" ? 0.35 : baseEm(a);
    });
    agentTex.needsUpdate = true;
    miniTex.image.data.set(overviewAgentData(agentData, agents, next));
    miniTex.needsUpdate = true;
    layoutBeams(next);
    flags.visible = next === "context" || next === "egress";
    warnMesh.visible = next === "inflow";
    // Arcs stay faint until their agent is hovered, except in the subagents lens.
    spawnLinks.material.uniforms.uOpacity.value = next === "agents" ? 0.85 : 0.1;
    returnLinks.material.uniforms.uOpacity.value = next === "agents" ? 0.95 : 0.14;
    navVersion++; detailAt = -Infinity; // the navigator's colours and the map's beacons follow the lens
    dirty = 3;
  }
  let focusAgentId = null;
  const baseEm = a => (focusAgentId && a.id !== focusAgentId ? 0.28 : 1);
  function applyFocusEmphasis(level) {
    agents.forEach((a, i) => {
      agentData[(AW + i) * 4] = level === 0 ? (lens === "agents" && a.kind === "root" ? 0.35 : 1) : 0.1;
      agentData[(AW + i) * 4 + 1] = level > 0 && a.id === focusAgentId ? 1 : 0;
      agentData[(AW + i) * 4 + 3] = level > 0 && a.id !== focusAgentId ? 1 : 0;
    });
    agentTex.needsUpdate = true;
    cairns.visible = level === 0;
    spawnLinks.visible = returnLinks.visible = level === 0;
    pins.visible = level === 0;
    flags.visible = level === 0 && (lens === "context" || lens === "egress");
    warnMesh.visible = level === 0 && lens === "inflow";
    labelGroups.l0.visible = level === 0;
    ruler.visible = level === 0;
    eventLines.visible = level === 0;
    xray.visible = level === 0 && detail.level < 2;
    labelGroups.map.visible = level === 0;
    cliffLines.visible = level === 0;
  }

  // ---- camera ----
  let insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const fly = { on: false, director: false, z1: null };
  // zoom: the optical zoom to end at (eased geometrically), or null to leave it. director: the playback
  // director's move, which user input cancels only once it really moves the camera (see userCamera).
  function flyTo(pos, tgt, dur = 950, zoom = null, director = false) {
    fly.director = director;
    if (reducedMotion || dur === 0) {
      camera.position.copy(pos); controls.target.copy(tgt);
      if (zoom != null) { camera.zoom = zoom; camera.updateProjectionMatrix(); }
      fly.on = false; controls.update(); dirty = 3; return;
    }
    Object.assign(fly, { on: true, t0: performance.now(), dur, p0: camera.position.clone(), p1: pos.clone(), q0: controls.target.clone(), q1: tgt.clone(), z0: camera.zoom, z1: zoom });
  }

  // ---- the playback director (director.js decides the shot; this applies it) ----
  // A shot eases the camera through flyTo, keeping its view direction and orbit distance: a follow shot
  // puts the leading column's top at its anchor in the free area at the zoom the director engaged at, a
  // box shot fits its box into the free area. The same id again, or a follow shot while a follow move
  // runs (the director re-aims at the moving column until the camera arrives), retargets: the move keeps
  // its timeline and its current position and heads for the new end; after the move has ended it is a
  // short RETARGET ms move. Manual and none stop any director move and leave the camera. User input (a
  // drag past 5 px, the wheel, a pinch, the zoom buttons and keys) stops the move and tells the app
  // (onUserCamera); the director's own moves never do.
  const RETARGET = 250, SHOT_PAD = { l: 20, r: 20, t: 26, b: 22 };
  let directorId = null, directorKind = null, onUserCam = null, directorEvents = null;
  // Aim the running move at a new end without a jump: re-base its start so that, at the current eased
  // fraction e, it still gives the camera's current state (in log zoom for the zoom).
  function retarget(goal, now) {
    const e = ease(Math.min(1, (now - fly.t0) / fly.dur));
    if (e > 0.97) { flyTo(goal.position, goal.target, RETARGET, goal.zoom, true); return; }
    const r = 1 / (1 - e);
    fly.p0.copy(camera.position).addScaledVector(goal.position, -e).multiplyScalar(r); fly.p1.copy(goal.position);
    fly.q0.copy(controls.target).addScaledVector(goal.target, -e).multiplyScalar(r); fly.q1.copy(goal.target);
    fly.z0 = Math.exp((Math.log(camera.zoom) - e * Math.log(goal.zoom)) * r); fly.z1 = goal.zoom;
  }
  function userCamera() {
    if (fly.on && fly.director) fly.on = false;
    directorId = directorKind = null;
    onUserCam?.();
  }
  function applyShot(shot) {
    if (!shot || !shot.box || shot.kind === "manual" || shot.kind === "none") { if (fly.director) fly.on = false; directorId = directorKind = null; return; }
    const w = host.clientWidth, h = host.clientHeight;
    if (level !== 0 || !(w > 0 && h > 0)) return;
    const b = shot.box;
    let goal;
    if (shot.zoom === "follow") {
      const [x, y, z] = shot.target || [b.x0, b.yTop, b.z0], [ax, ay] = shot.anchor || [0.5, 0.5];
      const fw = w - insets.left - insets.right, fh = h - insets.top - insets.bottom;
      const zoom = (shot.followZoom ?? mapZoom) * camera.position.distanceTo(controls.target) / overviewDistance;
      goal = anchorView(camera, controls.target, _pa.set(x, y, z), insets.left + ax * fw, insets.top + ay * fh, w, h, zoom);
    } else {
      const pts = [];
      for (const x of [b.x0, b.x1]) for (const y of [0, b.yTop]) for (const z of [b.z0, b.z1]) pts.push(new THREE.Vector3(x, y, z));
      goal = fitView(camera, controls.target, pts, safeNdc(SHOT_PAD));
    }
    if (!goal) return;
    const running = fly.on && fly.director && !reducedMotion, same = shot.id === directorId;
    if (running && (same || (shot.kind === "follow" && directorKind === "follow"))) retarget(goal, performance.now());
    else flyTo(goal.position, goal.target, same ? RETARGET : shot.ease ?? 600, goal.zoom, true);
    directorId = shot.id; directorKind = shot.kind;
  }
  // The leading column's top as a fraction across the free area (NaN off to the camera's side or behind).
  function leadScreenX() {
    const cx = cutXOf(play.P), agent = leadAgent, aP = agentP(agent, play.P, cx);
    const w = host.clientWidth - insets.left - insets.right;
    if (!(aP >= 0) || !(w > 0) || cx >= NO_CUT) return NaN;
    const i = Math.max(0, Math.min(agent.requests.length - 1, Math.floor(aP)));
    _pa.set(cx, crest(agent, i), zOf(agent, i)).project(camera);
    return _pa.z < -1 || _pa.z > 1 ? NaN : ((_pa.x + 1) / 2 * host.clientWidth - insets.left) / w;
  }
  // pad: extra px kept clear on each side, for HTML labels that hang off the fitted points
  const safeNdcAt = (width, height, pad = {}) => {
    const w = width || 1, h = height || 1;
    const l = insets.left + (pad.l || 0), r = insets.right + (pad.r || 0), t = insets.top + (pad.t || 0), b = insets.bottom + (pad.b || 0);
    return { x0: -1 + 2 * l / w, x1: 1 - 2 * r / w, y0: -1 + 2 * b / h, y1: 1 - 2 * t / h };
  };
  const safeNdc = (pad = {}) => safeNdcAt(host.clientWidth, host.clientHeight, pad);
  // Fit a box into the safe part of the viewport from a given view direction.
  function fit(box, dir, center, extra = [], pad) {
    camera.zoom = 1; camera.updateProjectionMatrix();
    const cam = camera.clone();
    const tgt = center.clone();
    const pts = [...extra];
    if (box) for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z));
    const safe = safeNdc(pad);
    const place = d => { cam.position.copy(tgt).addScaledVector(dir, d); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); };
    const bounds = () => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      const v = new THREE.Vector3();
      for (const p of pts) { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      return { x0, x1, y0, y1 };
    };
    let d = 50;
    for (let pass = 0; pass < 3; pass++) {
      let lo = 1, hi = 3000;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2; place(mid);
        const b = bounds();
        const fits = b.x1 - b.x0 <= safe.x1 - safe.x0 && b.y1 - b.y0 <= safe.y1 - safe.y0;
        if (fits) hi = mid; else lo = mid;
      }
      d = hi; place(d);
      const b = bounds();
      // pan so the projected box is centred in the safe rect
      const ox = ((safe.x0 + safe.x1) - (b.x0 + b.x1)) / 2, oy = ((safe.y0 + safe.y1) - (b.y0 + b.y1)) / 2;
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * d, halfW = halfH * cam.aspect;
      tgt.addScaledVector(right, -ox * halfW).addScaledVector(up, -oy * halfH);
    }
    return { pos: tgt.clone().addScaledVector(dir, d), tgt };
  }
  const dirFrom = (azDeg, elDeg) => {
    const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
    return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  };
  function frameL0(dur) {
    // Every vertex contributes to these bounds, including every subagent lane.
    const pts = [...terrainPoints];
    for (const x of [-6, W + 3]) pts.push(new THREE.Vector3(x, 0, SIDE_Z + 8));
    pts.push(new THREE.Vector3(RX, terrainBounds.max.y + 3, 0));
    // Portrait means the free area left beside the panel, not the whole canvas.
    const w = host.clientWidth - insets.left - insets.right, h = host.clientHeight - insets.top - insets.bottom;
    const portrait = w < h;
    const box = new THREE.Box3().setFromPoints(pts);
    // room for the ruler's tick labels and the row label on the left, flags and cliff labels on top
    const pad = { l: 60, r: 8, t: 26, b: 22 };
    // A single massif is seen nearly side-on, so its stepped profile reads the way the 2D chart does.
    const [az, el] = rule.compact ? (portrait ? [VIEW.cpaz, VIEW.cpel] : [VIEW.caz, VIEW.cel]) : (portrait ? [VIEW.paz, VIEW.pel] : [VIEW.az, VIEW.el]);
    const f = fit(null, dirFrom(az, el), box.getCenter(new THREE.Vector3()), pts, pad);
    // OrbitControls clamps the camera to maxDistance, so the overview distance the map zoom is measured
    // against must not exceed it (a phone's fit can ask for more, which read as 2.5x Agents at load)
    overviewDistance = Math.min(controls.maxDistance, f.pos.distanceTo(f.tgt));
    flyTo(f.pos, f.tgt, dur);
  }
  function frameL1(i, dur) {
    const x = stageX(i);
    const h = (stage.agent.requests[i]?.tokens.context || 0) * stage.scale;
    const span = host.clientWidth < 700 ? 16 : 34;
    // A short agent is fitted whole in the free area; a long one is framed around the cursor.
    const whole = (stage.n - 1) * SP + 2.4;
    const [x0, x1] = whole <= span ? [W / 2 - Math.max(whole, 14) / 2, W / 2 + Math.max(whole, 14) / 2] : [x - span / 2, x + span / 2];
    const box = new THREE.Box3(new THREE.Vector3(x0, 0, STAGE_Z - 1), new THREE.Vector3(x1, Math.max(H1, h) + 1, STAGE_Z + 1));
    const f = fit(box, dirFrom(-6, 16), new THREE.Vector3((x0 + x1) / 2, H1 / 2, STAGE_Z));
    flyTo(f.pos, f.tgt, dur);
  }
  function frameL2(dur) {
    const c = lift.to;
    const box = new THREE.Box3(new THREE.Vector3(c.x - LIFT_R - 0.5, c.y - 0.5, c.z - 1), new THREE.Vector3(c.x + LIFT_R + 13, c.y + LIFT_H + 1.5, c.z + 1));
    const f = fit(box, dirFrom(-4, 7), box.getCenter(new THREE.Vector3()));
    flyTo(f.pos, f.tgt, dur);
  }

  frontMesh.geometry.computeBoundingBox(); slopeMesh.geometry.computeBoundingBox();
  const terrainBounds = frontMesh.geometry.boundingBox.clone().union(slopeMesh.geometry.boundingBox);
  const terrainPoints = [];
  for (const row of rows) for (const seg of row.segs) {
    for (let i=seg.i0; i<=seg.i1; i++) {
      const h=crest(seg.agent,i), x=xOf(seg.agent,i);
      for (const edge of i===seg.i0 || i===seg.i1 ? [x-seg.taper,x+seg.taper] : [x]) {
        terrainPoints.push(new THREE.Vector3(edge,h,row.z),new THREE.Vector3(edge,0,row.z-row.depthOf(h)),new THREE.Vector3(edge,0,row.z));
      }
    }
  }
  for (const s of sideReqs) {
    const p=new THREE.Vector3(s.x,2.4,SIDE_Z+.55);
    terrainBounds.expandByPoint(p);terrainPoints.push(p);
  }
  // Everything the camera can see, for the near plane: terrain, the tallest beacon above it, and
  // the L1 stage and lifted core while an agent is open.
  const depthBox = new THREE.Box3();
  function fitDepth() {
    // padded for what hangs off the terrain: ruler and tick labels, the field's label, beacon heads
    depthBox.copy(terrainBounds).expandByScalar(12);
    depthBox.max.y += 18;
    if (level > 0 && stage.agent) {
      depthBox.expandByPoint(new THREE.Vector3(stageX(0) - 1, 0, STAGE_Z - 1));
      depthBox.expandByPoint(new THREE.Vector3(stageX(stage.n - 1) + 1, Math.max(H1, LIFT_H + 3), STAGE_Z + 9));
    }
    fitNearPlane(camera, depthBox, { floor: Math.max(0.05, camera.position.distanceTo(controls.target) * 0.01) });
  }
  // The overview shares the very same vertex buffers as the landscape. Its agent
  // texture stays visible when the inspector extracts an individual core.
  const miniData = new Float32Array(agentData.length);
  for (let i=0; i<AW; i++) miniData[(AW+i)*4]=1;
  const miniTex = new THREE.DataTexture(miniData, AW, 2, THREE.RGBAFormat, THREE.FloatType);
  miniTex.needsUpdate=true;
  const miniMat = strataMaterial({AGENTS:''}, {uAgents:{value:miniTex},uFocusDist:{value:10000}});
  const miniCairns = cairns.clone();
  miniCairns.userData.pickInstance = i => sideReqs[i] ? {agentId:sideReqs[i].a.id,reqIdx:sideReqs[i].i} : null;
  const navigator = createMapOverview({
    meshes:[new THREE.Mesh(frontMesh.geometry,miniMat),new THREE.Mesh(slopeMesh.geometry,miniMat),miniCairns],
    bounds:terrainBounds, points:terrainPoints, direction:dirFrom(rule.compact?VIEW.caz:VIEW.az,rule.compact?VIEW.cel:VIEW.el),
    layout:L, agents, width:W, onPick:p=>onPick({...p,intent:'locate'})
  });
  // What the navigator's terrain shows besides its fixed geometry: the lens (navVersion), the playhead's cut
  // (its cairns share the cut material) and the haze distance (their haze reads uFocusDist, to 0.001). It
  // redraws when that changes, at most 10 Hz while playing (shouldRedrawNavigator).
  let navVersion = 0, navShown = null, navRedraws = 0;
  function navigatorKey(now) {
    const key = `${navVersion}|${cutU.uCutX.value}|${Math.round(shared.uFocusDist.value * 1000)}`;
    const due = shouldRedrawNavigator(navShown, { t: now, key, playing: play.playing });
    if (due.redraw) navShown = { t: now, key };
    else if (due.pending) dirty = Math.max(dirty, 1);
    return navShown.key;
  }

  // ---- state ----
  let level = 0, cursor = -1, mapSelection = null;
  function show(S) {
    mapSelection = S.mapSelection || null;
    const agent = S.agentId ? agents[agentIndex.get(S.agentId)] : null;
    const prevLevel = level;
    detailAt = -Infinity; // level, selection and focus feed the map refresh
    if (S.level === 0 || S.level !== level || S.lens !== lens) sentFocusKey = "";
    level = S.level;
    selStratum = S.level >= 3 ? S.stratum : null;
    if (S.lens !== lens) setLens(S.lens);
    // the playhead leads on the root unless the view focuses a subagent ridge
    leadAgent = agent && agent.kind === "subagent" && rowZ.has(agent.id) ? agent : L.root;
    if (level === 0) {
      focusAgentId = null;
      applyFocusEmphasis(0);
      setLifted(null);
      cores.count = 0;
      // The L1 stage and its ask flags leave the scene entirely at L0.
      if (stage.flags) { scene.remove(stage.flags); stage.flags = null; }
      stage.agent = null;
      clearGroup(labelGroups.l1);
      rulerL1.visible = false;
      if (prevLevel !== 0 || S.refit) frameL0();
      dirty = 3;
      return;
    }
    focusAgentId = agent.id;
    applyFocusEmphasis(level);
    const idx = Math.max(0, Math.min(agent.requests.length - 1, S.reqIdx ?? 0));
    const newAgent = stage.agent !== agent;
    if (newAgent) buildStage(agent, idx);
    cursor = idx;
    coreMat.uniforms.uCursor.value = idx;
    updateL1Labels();
    if (level === 1) {
      setLifted(null);
      frameL1(idx, newAgent ? 1300 : prevLevel >= 2 ? 800 : 320);
    } else {
      if (stage.lifted !== idx || newAgent) setLifted(idx);
      liftMat.uniforms.uSel.value = level >= 3 && S.stratum ? STRATUM_INDEX[S.stratum] : -1;
      for (const o of labelGroups.l2.children) o.element.classList.toggle("on", !!S.stratum && o.element.classList.contains(`s-${S.stratum}`));
      if (prevLevel < 2 || newAgent || S.refit || lift.dur) frameL2(newAgent ? 1300 : 800);
    }
    dirty = 3;
  }
  function updateL1Labels() {
    clearGroup(labelGroups.l1);
    const agent = stage.agent;
    if (!agent) return;
    const r = agent.requests[cursor];
    label(`${cursor + 1} · ${fmtTok(r.tokens.context)} · ${fmtClock(r.t)}`, "cursor", new THREE.Vector3(stageX(cursor), (r.tokens.context || 0) * stage.scale + 0.6, STAGE_Z), [0.5, 1], labelGroups.l1);
    // compactions and unlogged shrinks near the cursor
    const near = i => Math.abs(i - cursor) < 40;
    for (const c of agent.compactions) {
      const i = agent.requests.findIndex(q => q.t >= c.t);
      if (i >= 0 && near(i)) label(`compacted ${fmtTok(c.pre)} → ${fmtTok(c.post)}`, "cliff", new THREE.Vector3(stageX(i) - SP / 2, H1 + 1.2, STAGE_Z), [0.5, 1], labelGroups.l1);
    }
    for (const s of unloggedShrinks(agent)) if (near(s.request)) label("context shrank; not logged as a compaction", "cliff soft", new THREE.Vector3(stageX(s.request) - SP / 2, H1 + 2.4, STAGE_Z), [0.5, 1], labelGroups.l1);
    // a three-tick ruler at the left of the view
    const x = stageX(Math.max(0, cursor - (host.clientWidth < 700 ? 11 : 24)));
    const peak = H1 / stage.scale;
    for (const f of [0.5, 1]) label(fmtTok(peak * f), "tick", new THREE.Vector3(x - 0.1, H1 * f, STAGE_Z), [1, 0.5], labelGroups.l1);
    labelGroups.l1.visible = level === 1;
    // the ruler line beside the tick labels
    rulerL1.geometry.setAttribute("position", new THREE.Float32BufferAttribute([x + 0.4, 0, STAGE_Z, x + 0.4, H1, STAGE_Z, x + 0.1, H1 * 0.5, STAGE_Z, x + 0.4, H1 * 0.5, STAGE_Z, x + 0.1, H1, STAGE_Z, x + 0.4, H1, STAGE_Z], 3));
    rulerL1.visible = level === 1;
  }
  const rulerL1 = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#8d97a6" }));
  rulerL1.visible = false;
  scene.add(rulerL1);

  // ---- map zoom: screen density, progressive labels and a stable viewport focus ----
  // The viewport size as of the last resize(): read on every frame and thousands of times per map refresh,
  // where host.clientWidth would force a layout after each round of label writes.
  let viewW = 1, viewH = 1;
  const _ml = new THREE.Vector3(), _mp = new THREE.Vector3();
  // A world point on screen (px from the canvas' top left) and its view depth, into `out`: the arithmetic of
  // Vector3.project (view matrix, then projection), without allocating.
  function projectInto(x, y, z, out) {
    _ml.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
    _mp.copy(_ml).applyMatrix4(camera.projectionMatrix);
    out.px = (_mp.x + 1) * viewW / 2; out.py = (1 - _mp.y) * viewH / 2; out.depth = -_ml.z;
    return out;
  }
  function projectMapPoint(v) { return projectInto(v.x, v.y, v.z, {}); }
  function inMap(p) {
    return p.depth > camera.near && p.px >= insets.left + 8 && p.px <= viewW - insets.right - 8 && p.py >= insets.top + 8 && p.py <= viewH - insets.bottom - 8;
  }
  function zoomMap(factor, screen) {
    onViewChange();
    userCamera();
    fly.on = false;
    const x = screen?.x ?? (insets.left + host.clientWidth - insets.right) / 2;
    const y = screen?.y ?? (insets.top + host.clientHeight - insets.bottom) / 2;
    const rect = renderer.domElement.getBoundingClientRect();
    const hit = level === 0 ? pickAt(rect.left + x, rect.top + y) : null;
    const anchor = hit?.t ? ray.ray.at(hit.t, new THREE.Vector3()) : undefined;
    zoomCamera(camera, controls.target, factor, x, y, host.clientWidth, host.clientHeight, anchor);
    controls.update(); dirty = 3;
  }
  const onWheel = e => {
    e.preventDefault();
    const rect = renderer.domElement.getBoundingClientRect();
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? host.clientHeight : 1);
    zoomMap(Math.exp(-Math.max(-400, Math.min(400, delta)) * 0.002), { x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  // Clickable map labels take pointer events; the wheel over one still zooms the map under it.
  labels.domElement.addEventListener('wheel', onWheel, { passive: false });
  const touchPoints = new Map();
  let pinchDistance = null;
  renderer.domElement.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
  renderer.domElement.addEventListener('pointermove', e => {
    if (!touchPoints.has(e.pointerId)) return;
    touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touchPoints.size !== 2) { pinchDistance = null; return; }
    const [a, b] = [...touchPoints.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDistance && d) { const rect = renderer.domElement.getBoundingClientRect(); zoomMap(d / pinchDistance, { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top }); }
    pinchDistance = d;
  });
  for (const event of ['pointerup', 'pointercancel']) renderer.domElement.addEventListener(event, e => { touchPoints.delete(e.pointerId); pinchDistance = null; });
  const mapLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#c8dfef', transparent: true, opacity: 0.16 }));
  scene.add(mapLines);
  let detailAt = -Infinity, lastFocusKey = '', focusSince = 0, sentFocusKey = '';
  // World size of one map-symbol cell at the current zoom, as a power of two with hysteresis.
  let binExp = NaN;
  const BEAM_RANK = { outward: 0, write: 1, read: 2 };
  function mapBin() {
    const upp = unitsPerPixel(camera, camera.position.distanceTo(controls.target), viewH || 1);
    binExp = binExponent(detail.cell * upp, binExp);
    return 2 ** binExp;
  }
  let shownRequests = new Set(), shownAgents = new Set(), heldFocus = null; // requests (the objects) and agent ids
  // The map refresh (beacons, cluster badges, map labels) runs only when shouldRefreshDetail says the view
  // changed since the last one (detailAt = -Infinity forces it); the rest of updateMapDetail runs on every
  // drawn frame and is cheap.
  let lastRefresh = null, mapRefreshes = 0, focusState = null, clusterCache = null, nearbyGeom = null, mapLinePoints = null;
  const requestTitles = new WeakMap();
  // Map labels are rebuilt by every refresh, but most stand again with the same text: those keep their element
  // and object (no new DOM node, listener or CSS2DObject) and are otherwise reset to a new label's state: the
  // new position and click, the centre they were made with, and no size, so they are placed and measured
  // exactly as a new label would be. The rest are removed. The group's children end in the order this refresh
  // made them (declutter breaks ties by that order).
  let mapPool = null, mapOrder = null;
  function poolMapLabels() {
    mapPool = new Map(); mapOrder = [];
    for (const o of labelGroups.map.children) {
      const list = mapPool.get(o.userData.key);
      if (list) list.push(o); else mapPool.set(o.userData.key, [o]);
    }
  }
  function mapLabel(text, cls, pos, center, onClick) {
    const key = `${cls}\u0001${text}\u0001${center}`;
    let o = mapPool.get(key)?.pop();
    if (o) {
      // placed as new (the percentage path) this frame; measure() then gives back its size, which the same text
      // and class keep, instead of reading it from the layout again
      const e = o.element;
      if (e._w !== undefined) { o.userData.size = [e._w, e._h]; e._w = e._h = undefined; }
      o.position.copy(pos); o.center.set(center[0], center[1]); o.userData.click = onClick;
    }
    else {
      o = label(text, cls, pos, center, labelGroups.map, () => o.userData.click());
      Object.assign(o.userData, { key, click: onClick });
    }
    mapOrder.push(o);
    return o;
  }
  function dropPooledLabels() {
    for (const list of mapPool.values()) for (const o of list) labelGroups.map.remove(o); // its element leaves the DOM
    labelGroups.map.children.splice(0, Infinity, ...mapOrder);
    mapPool = mapOrder = null;
  }
  const anchorWorld = [0, 1, 2, 3, 4].map(() => new THREE.Vector3()), _ar = new THREE.Vector3(), _au = new THREE.Vector3(), _q = { px: 0, py: 0, depth: 0 };
  // Fixed world points to watch the view by: the orbit target and four points at its depth near the corners.
  function anchorsPx() {
    const out = [];
    for (const a of anchorWorld) { projectInto(a.x, a.y, a.z, _q); out.push(_q.px, _q.py); }
    return out;
  }
  function captureAnchors() {
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(controls.target) / camera.zoom, halfW = halfH * camera.aspect;
    _ar.setFromMatrixColumn(camera.matrixWorld, 0); _au.setFromMatrixColumn(camera.matrixWorld, 1);
    anchorWorld[0].copy(controls.target);
    for (let k = 1; k < 5; k++) anchorWorld[k].copy(controls.target).addScaledVector(_ar, (k & 1 ? -0.9 : 0.9) * halfW).addScaledVector(_au, (k > 2 ? -0.9 : 0.9) * halfH);
  }
  function updateMapDetail(now) {
    camera.updateMatrixWorld();
    mapZoom = camera.zoom * overviewDistance / Math.max(0.001, camera.position.distanceTo(controls.target));
    detail = mapDetail(mapZoom, detail.level);
    if (host.dataset.mapDetail !== detail.name) host.dataset.mapDetail = detail.name;
    const status = document.querySelector('#zoom-status');
    const statusText = level === 0 ? `${mapZoom.toFixed(1)}× · ${detail.name}` : level === 1 ? 'Agent requests' : 'Request layers';
    if (status && status.textContent !== statusText) status.textContent = statusText;
    if (flags.visible) flags.userData.update();
    if (stage.flags?.visible) stage.flags.userData.update();
    if (level !== 0) { labelGroups.map.visible = mapLines.visible = false; return; }
    xray.visible = detail.level < 2;
    const linkFade = lens === "agents" ? 1 : Math.min(1, 1 / (mapZoom * mapZoom));
    spawnLinks.material.uniforms.uOpacity.value = (lens === "agents" ? 0.85 : 0.1) * linkFade;
    returnLinks.material.uniforms.uOpacity.value = (lens === "agents" ? 0.95 : 0.14) * linkFade;
    const next = { t: now, anchors: lastRefresh ? anchorsPx() : [], zoom: mapZoom, playing: play.playing, force: detailAt === -Infinity };
    const due = shouldRefreshDetail(lastRefresh, next);
    if (due.refresh) refreshMapDetail(now, next);
    else if (due.pending) dirty = Math.max(dirty, 2);
    // the map's focus goes to the app once it has held for 180 ms
    if (lastFocusKey !== sentFocusKey) {
      if (now - focusSince >= 180) { sentFocusKey = lastFocusKey; onMapFocus(focusState); }
      else dirty = Math.max(dirty, 2);
    }
  }
  // Every ridge request's x, crest and face z (+0.1), built once (the geometry never changes), in runs of 64
  // with their bounding box, so a run that cannot reach the map is passed over without projecting its requests.
  function nearbyRuns() {
    const runs = [];
    for (const agent of agents) {
      if (!rowZ.has(agent.id)) continue;
      for (let i0 = 0; i0 < agent.requests.length; i0 += 64) {
        const n = Math.min(64, agent.requests.length - i0), run = { agent, i0, x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n) };
        for (let k = 0; k < n; k++) { run.x[k] = xOf(agent, i0 + k); run.y[k] = crest(agent, i0 + k); run.z[k] = zOf(agent, i0 + k) + 0.1; }
        const lo = v => v.reduce((m, q) => Math.min(m, q), Infinity), hi = v => v.reduce((m, q) => Math.max(m, q), -Infinity);
        run.box = [lo(run.x), hi(run.x), 0, hi(run.y), lo(run.z), hi(run.z)];
        runs.push(run);
      }
    }
    return runs;
  }
  // Whether any point of a box [x0, x1, y0, y1, z0, z1] can land in the map: its projected corners' extent meets
  // the map area (1 px slack), or a corner is not in front of the near plane (then it is always visited).
  function runReachesMap([x0, x1, y0, y1, z0, z1]) {
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    for (let k = 0; k < 8; k++) {
      projectInto(k & 1 ? x1 : x0, k & 2 ? y1 : y0, k & 4 ? z1 : z0, _q);
      if (!(_q.depth > camera.near)) return true;
      a = Math.min(a, _q.px); b = Math.max(b, _q.px); c = Math.min(c, _q.py); d = Math.max(d, _q.py);
    }
    return b >= insets.left + 7 && a <= viewW - insets.right - 7 && d >= insets.top + 7 && c <= viewH - insets.bottom - 7;
  }
  // The groups in runs of 64, in order, each with the box of its base points (where inMap looks).
  function clusterRuns(list) {
    const runs = [];
    for (let k = 0; k < list.length; k += 64) {
      const part = list.slice(k, k + 64), box = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
      for (const { point: p } of part) {
        box[0] = Math.min(box[0], p.x); box[1] = Math.max(box[1], p.x); box[2] = Math.min(box[2], p.y0);
        box[3] = Math.max(box[3], p.y0); box[4] = Math.min(box[4], p.z); box[5] = Math.max(box[5], p.z);
      }
      runs.push({ list: part, box });
    }
    return runs;
  }
  function refreshMapDetail(now, next) {
    detailAt = now; mapRefreshes++; labelsStale = true;
    captureAnchors();
    lastRefresh = { t: now, anchors: anchorsPx(), zoom: next.zoom };
    // Grouped in world bins set by zoom alone: panning moves beacons, it never regroups them (so the groups
    // are kept until the bin or the lens changes).
    const bin = mapBin();
    if (clusterCache?.bin !== bin || clusterCache.of !== beamCandidates) clusterCache = { bin, of: beamCandidates, runs: clusterRuns(clusterStable(beamCandidates, bin, { rank: b => BEAM_RANK[b.kind] ?? 3 })) };
    const clusters = [];
    for (const run of clusterCache.runs) {
      if (!runReachesMap(run.box)) continue;
      for (const { point, count } of run.list) {
        projectInto(point.x, point.y0, point.z, _q);
        if (inMap(_q)) clusters.push({ count, point: { ...point, px: _q.px, py: _q.py, depth: _q.depth } });
      }
    }
    beamPick.length = 0;
    const draw = clusters.map(({ point: b, count }) => {
      const top = projectInto(b.x, b.y1, b.z, _q);
      const ratio = Math.min(1, PIN_CAP / Math.max(0.001, Math.hypot(top.px - b.px, top.py - b.py)));
      beamPick.push({ ...b, count, tipX: b.px + (top.px - b.px) * ratio, tipY: b.py + (top.py - b.py) * ratio });
      return b;
    });
    pins.userData.set(draw);
    const g = labelGroups.map; poolMapLabels(); g.visible = true;
    const grouped = beamPick.filter(b => b.count > 1).sort((a, b) => b.count - a.count).slice(0, detail.level ? 18 : 10);
    for (const b of grouped) {
      const top = projectMapPoint(new THREE.Vector3(b.x, b.y1, b.z));
      const height = cappedMarkerHeight(b.y1 - b.y0, Math.hypot(top.px - b.px, top.py - b.py), PIN_CAP);
      const o = mapLabel(String(b.count), 'cluster', new THREE.Vector3(b.x, b.y0 + height, b.z), [0.5, 1.2],
        () => zoomMap(1.55, { x: b.px, y: b.py }));
      const title = `${b.count} ${b.kind === 'outward' ? 'external actions' : b.kind === 'write' ? 'file changes' : 'reads'} · zoom to separate`;
      if (o.element.title !== title) { o.element.title = title; o.element.setAttribute('aria-label', title); }
    }
    mapLines.visible = detail.level >= 2;
    const center = { x: (insets.left + viewW - insets.right) / 2, y: (insets.top + viewH - insets.bottom) / 2 };
    const nearby = [];
    if (detail.level && !nearbyGeom) nearbyGeom = nearbyRuns();
    const a = { px: 0, py: 0, depth: 0 }, b = { px: 0, py: 0, depth: 0 };
    for (const run of detail.level ? nearbyGeom : []) {
      if (!runReachesMap(run.box)) continue;
      const { agent, i0, x, y, z } = run;
      for (let k = 0; k < x.length; k++) {
        // the point on the request's column (base to crest) nearest the viewport centre on screen
        const i = i0 + k;
        projectInto(x[k], 0, z[k], a); projectInto(x[k], y[k], z[k], b);
        if (a.depth <= camera.near || b.depth <= camera.near) continue;
        const dx = b.px - a.px, dy = b.py - a.py;
        const t = Math.max(0, Math.min(1, ((center.x - a.px) * dx + (center.y - a.py) * dy) / (dx * dx + dy * dy || 1)));
        const u = t * b.depth / ((1 - t) * a.depth + t * b.depth);
        const p = projectInto(x[k], 0 + (y[k] - 0) * u, z[k], _q);
        if (!inMap(p)) continue;
        // pos (the point, as a Vector3) and top are made only for the few items that get a label
        nearby.push({ agent, i, n: nearby.length, x: x[k], c: y[k], z: z[k], u, pos: null, top: null, px: p.px, py: p.py, depth: p.depth, score: Math.hypot(p.px - center.x, p.py - center.y) + p.depth * 0.025 });
      }
    }
    const placeOf = item => { if (!item.pos) { item.top = new THREE.Vector3(item.x, item.c, item.z); item.pos = new THREE.Vector3(item.x, 0, item.z).lerp(item.top, item.u); } return item; };
    // nearest first: score, then depth, then the order found (one pass here, one sort for the label order below)
    const byScore = (a, b) => a.score - b.score || a.depth - b.depth || a.n - b.n;
    const nearest = nearby.reduce((m, p) => (!m || byScore(p, m) < 0 ? p : m), null);
    const hit = detail.level ? pickAt(center.x, center.y, { left: 0, top: 0, width: viewW, height: viewH }) : null;
    let focus = nearby.find(p => p.agent.id === mapSelection?.agentId && p.i === mapSelection?.reqIdx) || nearby.find(p => p.agent.id === hit?.agentId && p.i === hit?.reqIdx) || nearest;
    const reqOf = item => item.agent.requests[item.i];
    // The centre crossing between two neighbouring columns does not flip the focus back and forth.
    const held = !mapSelection && focus && heldFocus && nearby.find(p => reqOf(p) === heldFocus);
    if (held && held !== focus && held.score <= focus.score + 14) focus = held;
    heldFocus = focus ? reqOf(focus) : null;
    if (focus) placeOf(focus);
    // Labels already on screen keep their place unless another is clearly closer to the centre, and
    // they are spaced by distance rather than by a screen grid, so a small pan does not swap them.
    const labelOrder = [focus, ...nearby.filter(item => item !== focus).map(item => ({ item, s: item.score - (shownRequests.has(reqOf(item)) ? 90 : 0) - (shownAgents.has(item.agent.id) ? 40 : 0) })).sort((a, b) => a.s - b.s || byScore(a.item, b.item)).map(e => e.item)].filter(Boolean);
    const agentSeen = new Set(), placedRequests = [];
    const linePoints = [];
    shownRequests = new Set();
    for (const item of labelOrder) {
      const { agent, i } = item, r = agent.requests[i];
      if (detail.level >= 1 && !agentSeen.has(agent.id) && agentSeen.size < 14) {
        const { pos } = placeOf(item);
        agentSeen.add(agent.id);
        const o = mapLabel(agent.kind === 'root' ? 'Main thread' : agent.name || agent.id, 'agent', pos.clone().add(new THREE.Vector3(0, 0.4, 0)), [0.5, 1.8], () => onPick({ level: 1, agentId: agent.id, reqIdx: i }));
        o.userData.flip = true;
      }
      if (detail.level < 2) continue;
      if (placedRequests.length >= detail.labelBudget || placedRequests.some(q => Math.abs(q.px - item.px) < 135 && Math.abs(q.py - item.py) < 48)) continue;
      placedRequests.push(item); shownRequests.add(r);
      const { pos } = placeOf(item);
      const action = r.action?.tool ? ` · ${r.action.tool.split('__').at(-1)}` : '';
      const text = detail.level >= 3 && action ? `${r.action.tool.split('__').at(-1)} ↗ · #${i + 1} · ${fmtTok(r.tokens.context)} context` : `#${i + 1} · ${fmtTok(r.tokens.context)} context`;
      const o = mapLabel(text, (mapSelection ? mapSelection.agentId === agent.id && mapSelection.reqIdx === i : item === focus) ? 'focus' : 'request', pos, [0.5, 1], () => onPick({ level: 2, agentId: agent.id, reqIdx: i, intent: detail.level >= 3 && r.action?.kind === 'tool' ? 'action' : 'request' }));
      o.userData.flip = true;
      let title = requestTitles.get(r); // fixed per request, and fmtClock is slow enough to show in every refresh
      if (title === undefined) requestTitles.set(r, title = `${agent.kind === 'root' ? 'Main thread' : agent.name} · request ${i + 1} · ${fmtClock(r.t)} · ${fmtTok(r.tokens.context)} tokens in context${r.action?.tool ? ` · Open ${r.action.tool} call` : ''}`);
      if (o.element.title !== title) o.element.title = title;
      linePoints.push(pos.x, 0, pos.z, pos.x, item.top.y, pos.z);
    }
    shownAgents = agentSeen;
    // a new buffer only when the leader lines changed
    if (!mapLinePoints || linePoints.length !== mapLinePoints.length || linePoints.some((v, k) => v !== mapLinePoints[k])) {
      mapLinePoints = linePoints;
      mapLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3));
      mapLines.geometry.computeBoundingSphere();
    }
    let stratum = null;
    // At Layers the stratum labels describe the column nearest the centre.
    let best = Infinity;
    const strataLabels = strataOf => {
      const r = strataOf.agent.requests[strataOf.i], tops = geom.tops(strataOf.agent, strataOf.i);
      let bottom = 0, placed = 0;
      STRATA.forEach((s, j) => {
        const top = tops[j], pos = new THREE.Vector3(strataOf.pos.x, (bottom + top) / 2, strataOf.pos.z + 0.05);
        bottom = top;
        if (!(r.strata?.[s.key] > 0)) return;
        const p = projectMapPoint(pos);
        if (!inMap(p)) return;
        const score = Math.hypot(p.px - center.x, p.py - center.y);
        if (score < best) { best = score; stratum = s.key; }
        const o = mapLabel(`${s.name} · ≈ ${fmtTok(r.strata[s.key])}`, `stratum s-${s.key}`, pos, [0, 0.5], () => onPick({ level: 3, agentId: strataOf.agent.id, reqIdx: strataOf.i, stratum: s.key }));
        if (!o.element.style.getPropertyValue('--c')) o.element.style.setProperty('--c', s.color);
        o.userData.flip = true;
        placed++;
      });
      return placed;
    };
    if (detail.level >= 3 && focus) strataLabels(focus);
    dropPooledLabels();
    const state = detail.level && focus ? { detail: detail.level, agentId: focus.agent.id, reqIdx: focus.i, stratum } : null;
    const key = state ? `${state.detail}:${state.agentId}:${state.detail > 1 ? state.reqIdx : ''}:${state.stratum || ''}` : 'overview';
    if (key !== lastFocusKey) { lastFocusKey = key; focusSince = now; }
    focusState = state;
  }

  // ---- picking ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  // rect: the canvas' client rect, measured here unless the caller has it (the map refresh passes the viewport
  // size of the last resize, so it forces no layout)
  function pickAt(clientX, clientY, rect = renderer.domElement.getBoundingClientRect()) {
    ndc.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (level >= 2 && lifted.visible) {
      const hit = ray.intersectObject(lifted, false)[0];
      if (hit) {
        const f = (hit.point.y - lifted.position.y) / lifted.scale.y;
        const j = lift.bounds.findIndex(v => f <= v + 1e-6);
        return { kind: "stratum", agentId: stage.agent.id, reqIdx: stage.lifted, stratum: STRATA[Math.max(0, j)].key };
      }
    }
    if (level >= 1 && stage.agent) {
      for (const dz of [CORE_R, 0]) {
        const t = (STAGE_Z + dz - o.z) / d.z;
        if (t <= 0) continue;
        const x = o.x + d.x * t, y = o.y + d.y * t;
        const i = Math.round((x - stageX(0)) / SP);
        if (i < 0 || i >= stage.n || Math.abs(x - stageX(i)) > CORE_R * 1.6) continue;
        const h = (stage.agent.requests[i].tokens.context || 0) * stage.scale;
        if (y >= -0.2 && y <= h + 0.4) return { kind: "core", agentId: stage.agent.id, reqIdx: i };
      }
      return null;
    }
    // L0: beacons and flags in screen space first, then rows front to back
    const px = (clientX - rect.left), py = (clientY - rect.top);
    const toScreen = v => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * rect.width, (1 - p.y) / 2 * rect.height]; };
    if (pins.visible) {
      let best = null, bd = 9;
      for (const b of beamPick) {
        const [ax, ay] = toScreen(new THREE.Vector3(b.x, b.y0, b.z));
        const bx = b.tipX, by = b.tipY;
        if (py > ay - 2) continue; // only the beam above the crest; the ridge face below belongs to the ridge
        const dd = segDist(px, py, ax, ay, bx, by);
        if (dd < bd) { bd = dd; best = b; }
      }
      if (best) return { kind: "action", agentId: best.a.id, reqIdx: best.i };
    }
    let best = null;
    // Slice each row with planes parallel to its face; a point on a slice is inside the block when it
    // is under the slope's height at that distance behind the face (the slope's depth varies with height).
    const test = (row, back, seg) => {
      const t = (row.z - back - o.z) / d.z;
      if (!(t > 0)) return;
      const x = o.x + d.x * t, y = o.y + d.y * t;
      if (x < seg.x0 * W - seg.taper || x > seg.x1 * W + seg.taper) return;
      const h = heightAt(seg.agent, seg.inf, seg, x, seg.taper);
      if (h < 0 || y < -0.1) return;
      const u = back / row.depthOf(h);
      if (u > 1 || y > h * profile(u) + 0.05) return;
      if (!best || t < best.t) best = { t, kind: "ridge", agentId: seg.agent.id, reqIdx: nearestReq(seg.inf, seg, x) };
    };
    for (const row of rows) {
      const t0 = (row.z - o.z) / d.z;
      const xr = o.x + d.x * t0;
      const reach = 30 + row.maxDepth * 3;
      for (const seg of row.segs) {
        if (xr < seg.x0 * W - reach || xr > seg.x1 * W + reach) continue;
        for (const f of [0, 0.1, 0.2, 0.32, 0.45, 0.6, 0.78]) test(row, row.maxDepth * f, seg);
      }
    }
    for (const s of sideReqs) {
      const t = (SIDE_Z + 0.55 - o.z) / d.z;
      if (!(t > 0)) continue;
      const x = o.x + d.x * t, y = o.y + d.y * t;
      const h = 0.6 + 1.8 * Math.sqrt((s.a.requests[s.i].tokens.context || 0) / L.yMax);
      if (Math.abs(x - s.x) < 0.8 && y >= 0 && y <= h + 0.2 && (!best || t < best.t)) best = { t, kind: "side", agentId: s.a.id, reqIdx: s.i };
    }
    return best;
  }
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }

  let down = null, hoverQueued = null;
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener("pointerup", e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; }
    down = null;
    const hit = pickAt(e.clientX, e.clientY);
    if (!hit) return;
    if (hit.kind === "stratum") onPick({ level: 3, agentId: hit.agentId, reqIdx: hit.reqIdx, stratum: hit.stratum });
    else if (hit.kind === "core") onPick({ level: 2, agentId: hit.agentId, reqIdx: hit.reqIdx });
    else if (hit.kind === "action") onPick({ level: 2, agentId: hit.agentId, reqIdx: hit.reqIdx, intent: 'action' });
    // A pin on the main thread opens its request; a subagent's pins belong to its ridge, which opens at L1 on that request.
    else if (hit.kind === "side" || (hit.kind === "action" && agents[agentIndex.get(hit.agentId)]?.kind !== "subagent")) onPick({ level: 2, agentId: hit.agentId, reqIdx: hit.reqIdx });
    else onPick({ level: 1, agentId: hit.agentId, reqIdx: hit.reqIdx });
  });
  cv.addEventListener("pointermove", e => { hoverQueued = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener("pointerleave", () => { hoverQueued = null; onHover(null); coreMat.uniforms.uHover.value = -1; linkHover.value = -1; dirty = 2; });

  // ---- loop ----
  let dirty = 3, raf = 0, bench = null;
  // a press cancels a level's flight at once; a director move only once the pointer really moves
  controls.addEventListener("start", () => { if (!fly.director) fly.on = false; });
  cv.addEventListener("pointermove", e => { if (down && !down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down.moved = true; userCamera(); } });
  controls.addEventListener("change", () => { dirty = Math.max(dirty, 2); onViewChange(); });
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (fly.on) {
      const k = ease(Math.min(1, (now - fly.t0) / fly.dur));
      camera.position.lerpVectors(fly.p0, fly.p1, k);
      controls.target.lerpVectors(fly.q0, fly.q1, k);
      if (fly.z1 != null) { camera.zoom = fly.z0 * Math.pow(fly.z1 / fly.z0, k); camera.updateProjectionMatrix(); }
      if (k >= 1) fly.on = false;
      dirty = 2;
    }
    if (stage.agent && stage.dur && now - stage.t0 <= stage.dur + 50) { placeCores((now - stage.t0) / stage.dur); dirty = 2; }
    if (lifted.visible && lift.dur && now - lift.t0 <= lift.dur + 50) { stepLift((now - lift.t0) / lift.dur); dirty = 2; }
    if (controls.update()) dirty = Math.max(dirty, 1);
    shared.uFocusDist.value = camera.position.distanceTo(controls.target);
    if (hoverQueued) {
      const h = hoverQueued; hoverQueued = null;
      const hit = pickAt(h.x, h.y);
      coreMat.uniforms.uHover.value = hit && hit.kind === "core" ? hit.reqIdx : -1;
      const hovAgent = hit && hit.kind === "ridge" ? agentIndex.get(hit.agentId) : -1;
      linkHover.value = hovAgent != null && agents[hovAgent]?.kind === "subagent" ? hovAgent : -1;
      onHover(hit ? { ...hit, x: h.x, y: h.y } : null);
      dirty = Math.max(dirty, 1);
    }
    if (bench) { bench.frames.push(now); dirty = 1; controls.target.x += 0; camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.0015); }
    if (play.playing) dirty = Math.max(dirty, 1);
    if (dirty > 0) {
      coreMirror.count = cores.count; coreMirror.visible = cores.visible;
      // Close in, a mirrored layer is big enough to be read as terrain that is not there: the floor's
      // reflection is an overview effect and fades out as the map zooms in.
      reflectMat.uniforms.uReflect.value = coreReflectMat.uniforms.uReflect.value = 0.3 * (1 - THREE.MathUtils.smoothstep(camera.zoom, 1.4, 4));
      mirror.visible = coreMirrorGroup.visible = reflectMat.uniforms.uReflect.value > 0.004;
      fitDepth();
      updateMapDetail(now);
      updatePlayhead();
      renderer.render(scene, camera);
      if (labelsMoved()) labels.render(scene, camera);
      if (navigator.render(camera, safeNdcAt(viewW, viewH), navigatorKey(now))) navRedraws++;
      measure();
      declutter();
      dirty--;
    }
  }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    viewW = w; viewH = h; detailAt = -Infinity;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`; renderer.domElement.style.height = `${h}px`;
    labels.setSize(w, h);
    renderer.getDrawingBufferSize(pinUniforms.uRes.value);
    pinUniforms.uDpr.value = renderer.getPixelRatio();
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    dirty = 3;
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(host);
  resize();
  setLens("context");
  frameL0(0);
  raf = requestAnimationFrame(frame);

  return {
    show,
    getView() { return { position: camera.position.toArray(), target: controls.target.toArray(), zoom: camera.zoom, overviewDistance }; },
    // The playback director (Task 10): see applyShot. getGeometry is this scene's own placement (with
    // ?massif=); getEvents is director.js's buildEvents on it, built once.
    setDirectorShot: applyShot,
    onUserCamera(cb) { onUserCam = typeof cb === "function" ? cb : null; },
    leadScreenX,
    getGeometry() { return geom; },
    getEvents() { return directorEvents ??= buildEvents(L, geom); },
    restoreView(view) {
      fly.on = false;
      const damping = controls.enableDamping; controls.enableDamping = false; controls.update();
      controls.enableDamping = damping;
      camera.position.fromArray(view.position); controls.target.fromArray(view.target);
      camera.zoom = view.zoom; overviewDistance = view.overviewDistance;
      camera.updateProjectionMatrix(); controls.update();
      detailAt = -Infinity; sentFocusKey = ''; dirty = 3;
    },
    panToRequest(agentId, index, reveal = false) {
      resize();
      const agent = agents[agentIndex.get(agentId)];
      if (level !== 0 || !agent?.requests[index]) return;
      fly.on = false;
      const damping = controls.enableDamping; controls.enableDamping = false; controls.update(); controls.enableDamping = damping;
      if (reveal) {
        const currentZoom = camera.zoom * overviewDistance / camera.position.distanceTo(controls.target);
        const wanted = agent.kind === 'subagent' ? 5.8 : 3.2;
        camera.zoom *= Math.max(1, wanted / currentZoom); camera.updateProjectionMatrix();
      }
      const point = new THREE.Vector3(xOf(agent, index), crest(agent, index) * 0.55, zOf(agent, index) + 0.1);
      panCameraTo(camera, controls.target, point, (insets.left + host.clientWidth - insets.right) / 2, (insets.top + host.clientHeight - insets.bottom) / 2, host.clientWidth, host.clientHeight);
      controls.update(); detailAt = -Infinity; dirty = 3; onViewChange();
    },
    mountMinimap(host, width, height, selection) {
      const a = selection?.agentId && agents[agentIndex.get(selection.agentId)];
      const i = selection?.reqIdx;
      const point = a?.requests[i] ? new THREE.Vector3(xOf(a,i),crest(a,i),zOf(a,i)) : null;
      navigator.mount(host,width,height,point); dirty=3;
    },
    zoom: zoomMap,
    setLabelDetail(value) { detailedLabels = !!value; dirty = 3; },
    setInsets(v, preserveView = false) {
      const changed = JSON.stringify(v) !== JSON.stringify(insets);
      insets = v;
      if (changed) detailAt = -Infinity; // the map's free area moved
      if (changed && level === 0 && !fly.on && !preserveView) frameL0(0);
    },
    refit() {
      // Reframe for the current level after the free area changes (window or panel resized).
      if (level === 0) frameL0(0);
      else if (level === 1 && stage.agent) frameL1(cursor, 350);
      else if (level >= 2 && lifted.visible) frameL2(350);
      dirty = 3;
    },
    // The playhead. P: root request space, clamped to [0, end] (the end, n - 1 + COMPLETE, is the last
    // request complete: nothing cut). playing: keep rendering every frame. Cheap and idempotent: it stores
    // state and asks for a frame; the cut follows in frame().
    setPlayhead({ P, playing } = {}) {
      if (P != null && Number.isFinite(+P)) play.P = clampP(+P);
      if (playing !== undefined) play.playing = !!playing;
      dirty = Math.max(dirty, 1);
    },
    getPlayhead() {
      return { P: play.P, playing: play.playing, n: rootN, cutX: playState.cutX, agentId: leadAgent.id, agentP: playState.uP };
    },
    stats() {
      const gl = renderer.getContext();
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown", labels: labels.domElement.childElementCount,
        playhead: { P: play.P, playing: play.playing, cutX: playState.cutX }, mapZoom,
        mapRefreshes, navRedraws // map refreshes and navigator terrain redraws since load
      };
    },
    bench(ms = 3000) {
      return new Promise(res => {
        bench = { frames: [] };
        setTimeout(() => {
          const f = bench.frames; bench = null;
          const dts = f.slice(1).map((t, i) => t - f[i]).sort((a, b) => a - b);
          res({ frames: f.length, fps: dts.length ? 1000 / (dts.reduce((s, v) => s + v, 0) / dts.length) : 0, p95ms: dts[Math.floor(dts.length * 0.95)] || 0, ...this.stats() });
        }, ms);
      });
    },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); navigator.dispose(); miniMat.dispose(); miniTex.dispose(); renderer.dispose(); host.replaceChildren(); }
  };
}

function rulerTicks(max) {
  const step = [2.5e4, 5e4, 1e5, 2.5e5, 5e5, 1e6].find(s => max / s <= 4.5) || 1e6;
  const out = [];
  for (let v = step; v <= max * 1.001; v += step) out.push(v);
  return out;
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch { return false; }
}
