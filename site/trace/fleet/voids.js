// Voids (design §5, §9): a T3 family thread with nothing to draw a ridge from, drawn on its lane in the landscape's
// own forms. The span its provider log shows activity in is a pale hatched footprint; the span T3 still claims after
// the last evidence is a hollow frame over a faint hatched floor; a late hop (begun after its machine was collected)
// is a dark hatch, nothing collected. No words on the scene: pick() gives the hover its void.
import * as THREE from "../vendor/three.module.min.js";

const H = 1.6;         // a void's height: low, so it never hides a ridge
const MIN_W = 0.15;    // the narrowest a void is drawn (a 1.6 s failure still shows)

// ctx: { L (layout, with L.voids from buildLayout), W, laneZ, depth, shared (fog uniforms), haze (GLSL) }
export function buildVoids({ L, W, laneZ, depth, shared, haze }) {
  const group = new THREE.Group();
  const items = [];
  const hatch = (dark) => new THREE.ShaderMaterial({
    uniforms: { uFog: shared.uFog, uFocusDist: shared.uFocusDist, uFade: { value: 0 } },
    vertexShader: `varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${haze} uniform vec3 uFog; uniform float uFade; varying vec3 vW; varying float vD;
      void main(){ float s = fract((vW.x + vW.z + vW.y) * 1.6); float line = 1.0 - smoothstep(0.08, 0.22, abs(s - 0.5));
        vec3 c = mix(vec3(0.20, 0.24, 0.30), ${dark ? "vec3(0.36, 0.40, 0.46)" : "vec3(0.78, 0.84, 0.92)"}, line);
        float a = mix(${dark ? "0.22, 0.42" : "0.10, 0.62"}, line) * (1.0 - 0.85 * uFade);
        gl_FragColor = vec4(mix(c, uFog, haze(vW, vD)), a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide
  });
  const box = (x0, x1, z, h) => new THREE.BoxGeometry(Math.max(MIN_W, x1 - x0), h, depth).translate((x0 + x1) / 2, h / 2, z - depth / 2);
  for (const lv of L.voids || []) {
    const v = lv.void;
    const z = laneZ(lv.lane);
    const x0 = L.X(v.from) * W, x1 = Math.max(x0 + MIN_W, L.X(v.to) * W);
    // the silence the thread's own log records inside the claimed span (a hollow frame); evidence of activity is
    // pale hatch; a thread with no log, or one never collected, is dark hatch: nothing is known there
    const sil = v.silence && v.lastEvidence != null ? [Math.max(x0, L.X(v.silence.from) * W), Math.min(x1, L.X(v.silence.to) * W)] : null;
    const xe = sil ? sil[0] : x1;
    const meshes = [];
    if (v.lastEvidence == null) {
      meshes.push(new THREE.Mesh(box(x0, x1, z, H * 0.5), hatch(true)));
    } else {
      if (!sil || sil[0] - x0 > 0.05) meshes.push(new THREE.Mesh(box(x0, Math.max(sil ? sil[0] : x1, x0 + MIN_W), z, H), hatch(false)));
      if (sil && sil[1] - sil[0] > 0.3) {
        const frame = new THREE.LineSegments(new THREE.EdgesGeometry(box(sil[0], sil[1], z, H)), new THREE.LineBasicMaterial({ color: "#dfe8f2", transparent: true, opacity: 0.85 }));
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(sil[1] - sil[0], depth).rotateX(-Math.PI / 2).translate((sil[0] + sil[1]) / 2, 0.02, z - depth / 2), hatch(false));
        meshes.push(frame, floor);
        if (x1 - sil[1] > 0.05) meshes.push(new THREE.Mesh(box(sil[1], x1, z, H), hatch(false)));
      }
    }
    for (const m of meshes) { m.renderOrder = 2; group.add(m); }
    items.push({ void: v, lane: lv.lane, z, x0, x1, xe, top: H, meshes });
  }
  return {
    group, items,
    // follow the machine filter (match over { machine, lab }) and the level (hidden off the landscape)
    fade(match) {
      for (const it of items) {
        const on = match(it.void);
        for (const m of it.meshes) {
          if (m.material.uniforms?.uFade) m.material.uniforms.uFade.value = on ? 0 : 1;
          else m.material.opacity = on ? 0.85 : 0.12;
        }
      }
    },
    // the void under a ray (origin o, direction d), nearest first: its lane's front face plane, inside its box
    pick(o, d, match = () => true) {
      let best = null;
      for (const it of items) {
        if (!match(it.void)) continue;
        for (const back of [0, depth * 0.5]) {
          const t = (it.z - back - o.z) / d.z;
          if (!(t > 0)) continue;
          const x = o.x + d.x * t, y = o.y + d.y * t;
          if (x >= it.x0 - 0.2 && x <= it.x1 + 0.2 && y >= -0.1 && y <= it.top + 0.3 && (!best || t < best.t)) best = { t, item: it };
        }
      }
      return best;
    },
    points(match) {
      const pts = [];
      for (const it of items) if (match(it.void)) pts.push(new THREE.Vector3(it.x0, it.top, it.z), new THREE.Vector3(it.x1, 0, it.z - depth));
      return pts;
    }
  };
}
