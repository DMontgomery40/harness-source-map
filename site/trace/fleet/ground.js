// Fleet ground (design §4, approach B): the same landscape with its lanes grouped into one terrace per machine
// (minimap.js buildLayout groupBy "machine"). Each terrace is a pale slab of ground, its front edge a fine line of
// light (the machine's T3 server); the floor outside the machine's collected span windows is hatched dark. Each
// forwarded 50 s wait is a rib of light from the caller's kerb to the receiver's at the chunk's start: this
// family's own lit, another family's or an unattributed one dim. The machine names are the only new words.
//
// Reached only from the family landscape by its switch or key; never on at open, from a URL or from a saved view
// (landscapeState below strips it from any restored state).
import * as THREE from "../vendor/three.module.min.js";

export const GROUND_KEY = "ground";
const MAX_PARTS = 8; // collected parts per machine the floor shades (a machine is collected a few times at most)
// The state a view restores: never the fleet ground.
export function landscapeState(state) {
  if (!state || !(GROUND_KEY in state)) return state;
  const { [GROUND_KEY]: _, ...rest } = state;
  return rest;
}
// Restoring any view (Back, Forward) leaves the fleet ground: the grouping is switched off and, when it was on, the
// caller rebuilds the ungrouped landscape (app.js restoreView). Returns { view, rebuild }.
export function restoreLandscape(S, view) {
  const rebuild = !!S[GROUND_KEY];
  S[GROUND_KEY] = false;
  return { view: { ...view, state: landscapeState(view.state) }, rebuild };
}

// ctx: { L (with L.terraces), W, laneZ, subDepth, rootBack, shared, haze, coverage: machine -> [{ since, until }],
//        label(text, cls, pos, center), cut(material) }
export function buildGround({ L, W, laneZ, subDepth, rootBack, shared, haze, coverage, label, cut }) {
  const group = new THREE.Group();
  const terraces = [];
  const kerbZ = t => laneZ(t.lane1) + 1.9;
  const backZ = (t, i) => (i === 0 ? -rootBack - 3 : laneZ(t.lane0) - subDepth - 1.4);
  const slab = (tint, cov) => new THREE.ShaderMaterial({
    uniforms: { uFog: shared.uFog, uFocusDist: shared.uFocusDist, uTint: { value: new THREE.Color(tint) }, uFade: { value: 0 }, uCov: { value: cov } },
    vertexShader: `varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${haze} uniform vec3 uFog; uniform vec3 uTint; uniform float uFade; uniform vec2 uCov[${MAX_PARTS}]; varying vec3 vW; varying float vD;
      void main(){
        // outside every collected span window of the machine the floor is hatched dark: nothing was collected there
        float out0 = 1.0;
        for (int k = 0; k < ${MAX_PARTS}; k++) if (vW.x >= uCov[k].x && vW.x <= uCov[k].y) out0 = 0.0;
        float s = fract((vW.x + vW.z) * 0.9); float line = 1.0 - smoothstep(0.06, 0.16, abs(s - 0.5));
        vec3 c = out0 > 0.5 ? mix(vec3(0.020, 0.025, 0.034), vec3(0.20, 0.23, 0.28), line * 0.45) : uTint;
        gl_FragColor = vec4(mix(c, uFog, haze(vW, vD)), 0.92 * (1.0 - 0.6 * uFade));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false
  });
  (L.terraces || []).forEach((t, i) => {
    const z0 = backZ(t, i), z1 = kerbZ(t);
    // each collected part's window (v2 machines have several, with gaps between them), as world x ranges
    const parts = (coverage?.[t.machine] || []).filter(p => p.since != null).sort((a, b) => a.since - b.since).slice(0, MAX_PARTS);
    const cov = Array.from({ length: MAX_PARTS }, (_, k) => parts[k] ? new THREE.Vector2(L.X(parts[k].since) * W, parts[k].until ? L.X(parts[k].until) * W + 0.01 : 1e9) : new THREE.Vector2(1e9, -1e9));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 10, z1 - z0).rotateX(-Math.PI / 2), slab(i % 2 ? "#0e151e" : "#101923", cov));
    floor.position.set(W / 2, 0.005, (z0 + z1) / 2);
    floor.renderOrder = -1;
    const kerb = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-4, 0.06, z1), new THREE.Vector3(W + 5, 0.06, z1)]),
      new THREE.LineBasicMaterial({ color: "#8fd8c4", transparent: true, opacity: 0.5 }));
    group.add(floor, kerb);
    const name = label(t.machine, "row quiet", new THREE.Vector3(-4.5, 0, z1 - 0.6), [1, 0.5]);
    terraces.push({ ...t, z0, z1, floor, kerb, name });
  });
  const kerbOf = m => terraces.find(t => t.machine === m)?.z1;
  const ribs = new THREE.Group();
  group.add(ribs);
  return {
    group, terraces,
    // waits: [{ from, to (machine names), t0, family }] from the worker (fleet/net.js attributeWaits)
    setRibs(waits) {
      ribs.clear();
      const lit = [], dim = [];
      for (const w of waits) {
        const za = kerbOf(w.from), zb = kerbOf(w.to);
        if (za == null || zb == null) continue;
        const x = L.X(w.t0) * W, dz = zb - za, peak = 2.4 + 0.16 * Math.abs(dz), list = w.family ? lit : dim, N = 18;
        for (let k = 0; k < N; k++) {
          const u0 = k / N, u1 = (k + 1) / N;
          list.push(x, 0.08 + 4 * peak * u0 * (1 - u0), za + dz * u0, x, 0.08 + 4 * peak * u1 * (1 - u1), za + dz * u1);
        }
      }
      // all the ribs in two draws, additive; playback lights them up to the playhead (cut)
      const mesh = (pts, color, opacity) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        const m = new THREE.LineSegments(geo, cut(new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })));
        m.renderOrder = 3; m.frustumCulled = false;
        return m;
      };
      if (dim.length) ribs.add(mesh(dim, "#6f7c8f", 0.16));
      if (lit.length) ribs.add(mesh(lit, "#9fe6ff", 0.3));
    },
    // follow the machine filter: a terrace the filter leaves out dims with its kerb
    fade(match) {
      for (const t of terraces) {
        const on = match({ machine: t.machine });
        t.floor.material.uniforms.uFade.value = on ? 0 : 1;
        t.kerb.material.opacity = on ? 0.5 : 0.12;
      }
    },
    // bounds for the overview fit: every terrace from its back to its kerb, and room for the names on the left
    points() {
      const pts = [];
      for (const t of terraces) pts.push(new THREE.Vector3(-14, 0, t.z1), new THREE.Vector3(W + 3, 0, t.z1), new THREE.Vector3(-14, 0, t.z0));
      return pts;
    }
  };
}
