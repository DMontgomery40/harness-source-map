// The navigator draws the actual terrain meshes with a second camera. It never
// invents its own lanes, heights or record positions.
import * as THREE from './vendor/three.module.min.js';

export function fitMapOverview(box, aspect, direction, points) {
  const center = box.getCenter(new THREE.Vector3());
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 10000);
  camera.position.copy(center).addScaledVector(direction, box.getSize(new THREE.Vector3()).length() + 10);
  camera.lookAt(center); camera.updateMatrixWorld();
  if (!points) {
    points=[];
    for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) points.push(new THREE.Vector3(x,y,z));
  }
  let x0=Infinity, x1=-Infinity, y0=Infinity, y1=-Infinity;
  const v=new THREE.Vector3();
  for (const p of points) {
    v.copy(p).applyMatrix4(camera.matrixWorldInverse);
    x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);
  }
  const halfH=Math.max(1,(y1-y0)/2,(x1-x0)/2/aspect)*1.07, halfW=halfH*aspect;
  camera.position.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),(x0+x1)/2);
  camera.position.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),(y0+y1)/2);
  camera.updateMatrixWorld();
  Object.assign(camera, {left:-halfW, right:halfW, top:halfH, bottom:-halfH});
  camera.updateProjectionMatrix();
  return camera;
}

export function requestAtMapPoint(layout, agentId, x, width) {
  const xs = layout.info.get(agentId)?.xs;
  if (!xs?.length) return null;
  let reqIdx = 0, distance = Infinity;
  for (let i=0; i<xs.length; i++) {
    const d = Math.abs(xs[i] * width - x);
    if (d < distance) { reqIdx=i; distance=d; }
  }
  return {agentId, reqIdx};
}

// Clip the ground rectangle to the camera's *uncovered* viewport. Unlike four
// ray/plane intersections, polygon clipping also works when the horizon is visible.
export function visibleMapGround(camera, box, safe = {x0:-1,x1:1,y0:-1,y1:1}) {
  camera.updateMatrixWorld();
  const crop = new THREE.Matrix4().set(
    2/(safe.x1-safe.x0),0,0,-(safe.x1+safe.x0)/(safe.x1-safe.x0),
    0,2/(safe.y1-safe.y0),0,-(safe.y1+safe.y0)/(safe.y1-safe.y0),
    0,0,1,0, 0,0,0,1);
  const matrix = crop.multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(matrix);
  let points = [[box.min.x,box.min.z],[box.max.x,box.min.z],[box.max.x,box.max.z],[box.min.x,box.max.z]].map(([x,z]) => new THREE.Vector3(x,0,z));
  for (const plane of frustum.planes) {
    const next = [];
    for (let i=0; i<points.length; i++) {
      const a=points[i], b=points[(i+1)%points.length], da=plane.distanceToPoint(a), db=plane.distanceToPoint(b);
      if (da>=0) next.push(a);
      if ((da>=0)!==(db>=0)) next.push(a.clone().lerp(b,da/(da-db)));
    }
    points=next;
  }
  return points;
}

export function overviewAgentData(source, agents, lens) {
  const count = agents.length;
  const data = new Float32Array(Math.max(1, count) * 8);
  data.set(source.subarray(0,count*4));
  agents.forEach((agent,i) => { data[(count+i)*4] = lens === 'agents' && agent.kind === 'root' ? .35 : 1; });
  return data;
}

export function createMapOverview({meshes, bounds, points, direction, layout, agents, width, onPick}) {
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0,0);
  const canvas = renderer.domElement;
  canvas.className = 'map-terrain';
  canvas.setAttribute('aria-label','Session map. Click terrain to go to that request.');
  canvas.title = 'Click the terrain to go there';
  const scene = new THREE.Scene();
  for (const mesh of meshes) scene.add(mesh);
  const ns = 'http://www.w3.org/2000/svg';
  const overlay = document.createElementNS(ns,'svg');
  overlay.classList.add('map-viewport'); overlay.setAttribute('aria-hidden','true');
  const windowShape = document.createElementNS(ns,'polygon'); windowShape.classList.add('map-window');
  const marker = document.createElementNS(ns,'circle'); marker.setAttribute('r','3'); marker.classList.add('map-position');
  overlay.append(windowShape, marker);
  const wrap = document.createElement('div'); wrap.className='map-terrain-wrap'; wrap.append(canvas,overlay);
  const caption = document.createElement('div'); caption.className='map-caption'; caption.textContent='';
  const ray = new THREE.Raycaster();
  let camera, w=0, h=0, selected=null, container, stale=true, drawnContent, drawnWindow='';
  function hit(e) {
    if (!camera) return null;
    const r=canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
    const face=ray.intersectObjects(meshes,false)[0];
    if (!face) return null;
    const agentAttribute=face.object.geometry.getAttribute('aAgent');
    if (!agentAttribute) return face.object.userData.pickInstance?.(face.instanceId) || null;
    const agentId=agents[Math.round(agentAttribute.getX(face.face.a))]?.id;
    return requestAtMapPoint(layout,agentId,face.point.x,width);
  }
  canvas.addEventListener('click', e => { const p=hit(e); if (p) onPick(p); });
  canvas.addEventListener('pointermove', e => {
    const p=hit(e), a=p && layout.info.get(p.agentId)?.agent;
    caption.textContent=p ? `${a?.kind==='root'?'Main thread':a?.name || 'Agent'} · request ${p.reqIdx+1}` : '';
    canvas.style.cursor=p?'pointer':'default';
  });
  canvas.addEventListener('pointerleave',()=>{caption.textContent='';});
  return {
    mount(host, nextWidth, nextHeight, point) {
      if (wrap.parentNode!==host) host.replaceChildren(wrap,caption);
      container=host; selected=point; stale=true;
      if (w!==nextWidth || h!==nextHeight) {
        w=nextWidth; h=nextHeight;
        renderer.setSize(w,h); overlay.setAttribute('viewBox',`0 0 ${w} ${h}`);
        camera=fitMapOverview(bounds,w/h,direction,points);
      }
    },
    // The terrain is redrawn only when `content` (what it shows besides its fixed geometry) differs from the
    // last drawing, or after a mount; the viewport outline is SVG and changes only when its points do.
    // Returns whether the terrain was drawn. This runs on every frame the camera moves, so it reads no layout
    // (a clientWidth check here forced one per frame): the mounted size stands for the container's.
    render(mainCamera, safe, content) {
      if (!camera || !container || container.hidden || !(w>0 && h>0)) return false;
      const project=p=>{const q=p.clone().project(camera);return [(q.x+1)*w/2,(1-q.y)*h/2];};
      const shape=visibleMapGround(mainCamera,bounds,safe).map(p=>project(p).join(',')).join(' ');
      const redraw=stale || content!==drawnContent;
      if (shape!==drawnWindow) { windowShape.setAttribute('points',shape); drawnWindow=shape; }
      if (!redraw) return false;
      renderer.render(scene,camera);
      stale=false; drawnContent=content;
      marker.style.display=selected?'':'none';
      if (selected) {const [x,y]=project(selected);marker.setAttribute('cx',x);marker.setAttribute('cy',y);}
      return true;
    },
    dispose() { renderer.dispose(); wrap.remove(); caption.remove(); }
  };
}
