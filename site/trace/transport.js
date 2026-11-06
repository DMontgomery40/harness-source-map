// The playback transport: play or pause, a scrub over the family clock's compressed time (clock.js), the speed,
// the recorded time the clock stands on, camera follow, and the activity at that time. It owns the one
// animation-frame loop that advances the clock while playing and reports every change through onClock, so the app
// can hand the cut to the scene and the 2D chart. It never touches what the inspector shows: playing, scrubbing and
// stepping change time only.
//
// Follow has three states: off; the family's time (the camera keeps the time cut in view); one named agent (set
// only by an explicit action on that agent). A manual camera gesture turns it off at once; Play never turns it on.
import { el } from "./panels.js";
import { clockLabel } from "./clock.js";
import { tip } from "./compact.js";

// The next speed of the button's cycle (the keys' faster and slower stop at the ends instead).
export function nextSpeed(clock) {
  const list = clock.speeds;
  return list.find(s => s > clock.speed) ?? list[0];
}

// host: the #playback element. onClock({ x, t, playing, atEnd }) runs on every change of the clock or its playing
// state; onFollow(follow) when follow changes; onActivity() when the activity action is chosen; activity(t) gives
// the compact count shown on that action ({ count, label } or null).
export function createTransport(host, { onClock = () => {}, onFollow = () => {}, onActivity = () => {}, activity = () => null, raf = f => requestAnimationFrame(f), caf = id => cancelAnimationFrame(id), now = () => performance.now(), maxDt = 100 } = {}) {
  let clock = null, frame = 0, last = 0, label = "", countAt = -Infinity, flat = false;
  let follow = { mode: "off", agentId: null, label: null };
  const play = el("button", { type: "button", class: "play", "aria-pressed": "false", "aria-label": "Play" }, el("i", { "aria-hidden": "true" }));
  tip(play, "Play or pause · Space");
  const scrub = el("input", { type: "range", class: "scrub", min: "0", max: "1", step: "0.0005", value: "1", "aria-label": "Family time" });
  const readout = el("output", { class: "readout", "aria-live": "off" });
  const speed = el("button", { type: "button", class: "speed", "aria-label": "Playback speed" });
  tip(speed, "Speed · < >");
  // follow and activity carry a full label and a short one; narrow screens show the short one (trace.css), and the
  // accessible name is always the full one
  const followLong = el("span", { class: "long" }), followShort = el("span", { class: "short", "aria-hidden": "true", text: "⌖" });
  const followBtn = el("button", { type: "button", class: "follow", "aria-pressed": "false" }, followLong, followShort);
  tip(followBtn, "Camera follows the time · f");
  const activityLong = el("span", { class: "long" }), activityShort = el("span", { class: "short", "aria-hidden": "true" });
  const activityBtn = el("button", { type: "button", class: "activity", "aria-haspopup": "true" }, activityLong, activityShort);
  tip(activityBtn, "Who has recorded activity at this time");
  host.replaceChildren(play, scrub, readout, speed, followBtn, activityBtn);
  host.setAttribute("data-playing", "false");

  play.addEventListener("click", () => api.toggle());
  // Scrubbing pauses: the thumb follows the pointer, not the clock.
  scrub.addEventListener("pointerdown", () => { if (clock?.playing) api.pause(); });
  scrub.addEventListener("input", () => { if (clock) { clock.seekFraction(Number(scrub.value)); push(); sync(); } });
  speed.addEventListener("click", () => { if (clock) { clock.setSpeed(nextSpeed(clock)); sync(); } });
  followBtn.addEventListener("click", () => api.toggleFollow());
  activityBtn.addEventListener("click", () => { if (clock) { api.pause(); onActivity(); } });

  function push() { if (clock) onClock({ x: clock.x, t: clock.t, playing: clock.playing, atEnd: clock.atEnd }); }
  function stop() { if (frame) caf(frame); frame = 0; }
  function loop(t) {
    frame = 0;
    if (!clock?.playing) return;
    const dt = Math.min(maxDt, t - last);
    last = t;
    clock.tick(dt);
    push();
    sync();
    if (clock.playing) frame = raf(loop);
  }
  function run() { if (clock?.playing && !frame) { last = now(); frame = raf(loop); } }

  function syncFollow() {
    const on = follow.mode !== "off";
    followBtn.hidden = flat || !clock;
    followBtn.setAttribute("aria-pressed", String(on));
    const text = follow.mode === "agent" ? `Following ${follow.label || "agent"}` : follow.mode === "time" ? "Following time" : "Follow";
    if (followLong.textContent !== text) { followLong.textContent = text; followBtn.setAttribute("aria-label", text); }
  }
  function syncActivity(force = false) {
    if (!clock) { activityBtn.hidden = true; return; }
    const t = now();
    if (!force && clock.playing && t - countAt < 250) return;
    countAt = t;
    const a = activity(clock.t);
    activityBtn.hidden = !a;
    if (!a) return;
    const text = a.label;
    if (activityLong.textContent !== text) { activityLong.textContent = text; activityShort.textContent = a.short || text; }
    activityBtn.setAttribute("aria-label", `${a.spoken || text}. Open the list at this time`);
  }
  // Redraws the controls from the clock. The readout and its spoken value change only when the text does.
  function sync() {
    host.hidden = !clock;
    if (!clock) return;
    const on = clock.playing;
    host.setAttribute("data-playing", String(on));
    play.setAttribute("aria-pressed", String(on));
    play.setAttribute("aria-label", on ? "Pause" : "Play");
    play.disabled = !clock.playable;
    scrub.disabled = !clock.playable;
    const f = clock.fraction;
    scrub.value = String(f);
    scrub.style.setProperty("--progress", `${(f * 100).toFixed(2)}%`);
    const text = clockLabel(clock.t);
    if (text !== label) {
      label = text;
      readout.textContent = text;
      scrub.setAttribute("aria-valuetext", text);
    }
    const s = `${clock.speed}×`;
    if (speed.textContent !== s) speed.textContent = s;
    speed.hidden = !clock.playable;
    syncFollow();
    syncActivity();
  }

  const setFollow = next => {
    const was = follow.mode + (follow.agentId || "");
    follow = { mode: next?.mode || "off", agentId: next?.mode === "agent" ? next.agentId : null, label: next?.mode === "agent" ? next.label || null : null };
    syncFollow();
    if (was !== follow.mode + (follow.agentId || "")) onFollow(follow);
  };

  const api = {
    // A new family's clock (or null): paused at its end, follow off. Nothing is pushed: the scene starts there.
    load(next) { stop(); clock = next || null; label = ""; follow = { mode: "off", agentId: null, label: null }; sync(); syncActivity(true); },
    get clock() { return clock; },
    get playing() { return !!clock?.playing; },
    toggle() { if (clock?.playing) api.pause(); else api.play(); },
    // Play changes time only: no selection, reader or follow change. At the end it starts over from the start.
    play() { if (!clock) return false; if (!clock.play()) return false; run(); push(); sync(); return true; },
    pause() { if (!clock) return; const was = clock.playing; clock.pause(); stop(); if (was) push(); sync(); syncActivity(true); },
    // Jump to a recorded time and stay paused (opening a request, stepping, history).
    seekTime(t) { if (!clock || !Number.isFinite(t)) return; stop(); clock.seekTime(t); push(); sync(); syncActivity(true); },
    seekX(x) { if (!clock || !Number.isFinite(x)) return; stop(); clock.seekX(x); push(); sync(); syncActivity(true); },
    step(d) { if (!clock) return; stop(); clock.step(d); push(); sync(); syncActivity(true); },
    toStart() { if (clock) api.seekTime(clock.t0); },
    toEnd() { if (clock) api.seekTime(clock.t1); },
    setSpeed(v) { if (!clock) return; clock.setSpeed(v); sync(); },
    faster() { if (!clock) return; clock.faster(); sync(); },
    slower() { if (!clock) return; clock.slower(); sync(); },
    get follow() { return { ...follow }; },
    setFollow,
    // The follow button and the f key: off becomes the family's time; any follow becomes off.
    toggleFollow() { setFollow(follow.mode === "off" ? { mode: "time" } : { mode: "off" }); },
    // The user moved the camera: follow lets go at once, whatever it was following.
    userCamera() { if (follow.mode !== "off") setFollow({ mode: "off" }); },
    // The 2D view has no camera to follow with; time, stepping and activity stay.
    setFlat(on) { flat = !!on; syncFollow(); },
    refreshActivity() { syncActivity(true); },
    sync,
    controls: { play, scrub, readout, speed, follow: followBtn, activity: activityBtn }
  };
  return api;
}

// On a phone, the clock's place between the top controls (lenses, the environment and lab filters, the crumbs) and the
// bottom ones (the sheet and what floats above it). It sits just above the bottom stack; where the two stacks leave it
// less than its own height, the sheet gives up the difference (the controls floating above the sheet follow the
// sheet's height), never below minSheet, so the clock is never drawn over the filters.
//   layout: { topLimit (the top stack's bottom, plus a gap), height (the clock's), edge() (where the clock's bottom
//   would be now: the bottom stack's top, minus a gap), sheet() (the sheet's height now), setSheet(px) }
//   -> the clock's bottom edge (a y), with the sheet set as needed.
export function fitPhoneClock({ topLimit, height, edge, sheet, setSheet, minSheet = 140 }) {
  let bottom = edge(), was = Infinity;
  for (let k = 0; k < 4 && bottom - height < topLimit; k++) {
    const next = Math.max(minSheet, Math.floor(Math.min(sheet(), was) - (topLimit - (bottom - height))));
    if (!(next < was)) break; // the sheet has nothing more to give
    setSheet(next); was = next;
    bottom = edge();
  }
  return bottom;
}
