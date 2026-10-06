"""Shots of the findings video (SCRIPT.md). Run: DPR=2 python3 shots.py <shot> [...]  (or `all`).
DPR=1 makes a fast preview (<shot>_p outputs; a final is never replaced). Needs the tour's viewer
(video/tour/capture/viewer.py) on :8860.

Reuses the tour's recorder (video/tour/capture: rec.py, shot.py, cam.py and its shots), with footage and frames
written under private/video/findings/ instead of the tour's folders.

Inputs (paths stay in the environment, never in this file):
  TRACE_CC_SESSION        the frozen Claude Code session the tour filmed (see video/common.py)
  TRACE_NET_CC_SESSION    a captured Claude Code run's session .jsonl, and
  TRACE_NET_CC_HAR        its HAR (the flags shots)
  TRACE_CX_HANDOFF        the Codex/ChatGPT rollout of the handoff finding
  TRACE_CC_CANCEL         the Claude Code session of the cancelled-job finding
  TRACE_LEAK_VALUES       private JSON list: the tour's values plus this video's extras (blurred in the edit)

Never press `h` or `c` and never click "Harness": the harness layer is not part of this video.
"""
import asyncio, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "tour", "capture"))
sys.path.insert(0, os.path.join(HERE, "..", ".."))
from common import private_dir, net_inputs  # noqa: E402
import rec as _rec  # noqa: E402
import shot as _shot  # noqa: E402

# This video's footage and frames, not the tour's.
_rec.FOOTAGE = _shot.FOOTAGE = private_dir("video", "findings", "footage")
_rec.FRAMES = private_dir("video", "findings", "frames")

from shot import Shot, rec, session, setcam, at, W, H, main_of  # noqa: E402
from rec import cc_files  # noqa: E402
from cam import path, ease_io  # noqa: E402
import shots_trace as tour  # noqa: E402
import shots_net as net  # noqa: E402

ease = ease_io
PAN_JS = "([id,i])=>window.__trace.scene.panToRequest(id,i)"
# The HUD title is the session's first prompt or AI title: not part of any finding, so it's hidden.
NO_TITLE = ".hud h1, .hud .title, #session-title{visibility:hidden!important}"


async def open_session(r, files, clean=False):
    """shot.session, but waits for the scene (and its camera hook) first: a large session builds it late."""
    from rec import CAM_JS
    for attempt in range(3):   # a viewer request is sometimes reset and the scene never builds: load again
        await r.load(files)
        for _ in range(300):
            if await r.js("()=>!!window.__rec"): break
            await r.page.wait_for_timeout(100)
        else:
            print("  the scene never came up: reloading"); continue
        break
    else:
        raise SystemExit("the scene never came up")
    await r.step(10)
    await r.js(CAM_JS)
    await r.js("window.__cam.save()")
    if clean: await r.clean()
    await r.page.mouse.move(W - 2, H - 2)


def env(name):
    v = os.environ.get(name)
    if not v: raise SystemExit(f"set {name} (see the docstring)")
    return v


async def glide(r, a, b, i, n):
    u = ease(min(1, max(0, i / max(1, n))))
    await r.page.mouse.move(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)


async def typed(s, t0, text, ev, rate=0.07):
    """Type `text` one character per `rate` s from t0 (s), visibly; returns the end time."""
    for k, ch in enumerate(text):
        async def one(i, ch=ch): await s.r.page.keyboard.type(ch)
        ev[at(t0 + rate * k)] = one
    return t0 + rate * len(text)


# Scroll the nearest scrolling ancestor of the text `needle` (inside `sel`) so it sits `frac` down the scroller.
SCROLL_TO_TEXT_JS = r"""([sel, needle, frac]) => {
  const root = [...document.querySelectorAll(sel)].reverse().find(e => (e.innerText || '').includes(needle));
  if (!root) return null;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) { if (n.data.includes(needle)) break; }
  if (!n) return null;
  let sc = n.parentElement;
  while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
  if (!sc) return null;
  const k = n.data.indexOf(needle), rg = document.createRange(); rg.setStart(n, k); rg.setEnd(n, k + needle.length);
  const y = rg.getBoundingClientRect().top - sc.getBoundingClientRect().top;
  const want = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, sc.scrollTop + y - sc.clientHeight * frac));
  sc.dataset.__scroll = '1';
  return [sc.scrollTop, want];
}"""
SET_TEXT_SCROLL_JS = "v => { const sc = document.querySelector('[data-__scroll]'); if (sc) sc.scrollTop = v; }"


# The flags table sits in two folds of the network panel ("Betas, flags & client_data", then "Flags & experiments").
OPEN_FLAGS_JS = r"""() => { for (const s of document.querySelectorAll('#panel summary')) { const t = s.textContent.trim();
  if (t.startsWith('Betas, flags') || t.startsWith('Flags & experiments')) s.parentElement.open = true; } }"""
SCROLL_FLAGS_JS = r"""() => { const p = document.querySelector('#panel');
  const s = [...p.querySelectorAll('summary')].find(x => x.textContent.trim().startsWith('Flags & experiments'));
  if (s) p.scrollTop += s.getBoundingClientRect().top - p.getBoundingClientRect().top - 10; }"""
# The text search runs in a worker on real time: wait (real time, no frames pass) until its count is final.
COUNT_JS = r"""() => { const m = document.body.innerText.match(/\b([\d,]+) match(es)?\b/); return m ? m[0] : null; }"""


async def search_done(r, timeout=30):
    import time
    t = time.time()
    while time.time() - t < timeout:
        c = await r.js(COUNT_JS)
        if c: await r.step(2); return c
        await r.page.wait_for_timeout(150)
    print("  search did not finish"); return None


# ------------------------------------------------------------------------------------- tour shots, refilmed

async def f_loader(): await _named(tour.t_loader, "f_loader")
async def f_open(): await _named(tour.t_open, "f_open")
async def f_close(): await _named(tour.t_close, "f_close")


async def _named(fn, name):
    """Run a tour shot under this video's name (the tour shot names its own take; rename it after)."""
    old = fn.__name__.replace("f_", "t_")
    await fn()
    tag = lambda n: n if _shot.DPR == 2 else f"{n}_p"
    for ext in (".mp4", ".json"):
        src = os.path.join(_rec.FOOTAGE, tag(old) + ext)
        if os.path.exists(src): os.replace(src, os.path.join(_rec.FOOTAGE, tag(name) + ext))
    import glob
    for d in glob.glob(os.path.join(_rec.FRAMES, tag(old) + "_*")):
        os.replace(d, d.replace(os.sep + tag(old) + "_", os.sep + tag(name) + "_"))


# ------------------------------------------------------------------------------------- 3. the nudge

async def f_nudge():
    """`/` "hasn't heard": the match count; Enter: the reminder in the reader. 10 s. The main thread's log only: the
    session's subagents include this project's own research agents, whose tool output quotes the reminder."""
    async with rec() as r:
        await session(r, cc_files()[:1])
        await r.step(20)
        s = Shot(r, "f_nudge")
        ev = {}
        ev[at(0.3)] = lambda i: s.key(i, "/")
        t = await typed(s, 0.8, "hasn't heard", ev)
        async def results(i):
            c = await search_done(r)
            print("  count:", c)
            await s.rect("count", "body", c or "matches", None, i)
            await s.elem("row", ".pal-row", "silent_turn_reminder", i)
            s.mark("results", i)
        ev[at(t + 0.6)] = results
        async def enter(i): await s.key(i, "Enter"); s.mark("enter", i)
        ev[at(t + 3.2)] = enter
        async def reader(i):
            await s.elem("side", ".side", None, i)
            await s.rect("reader_text", ".side", "say in a few words", None, i)
            await s.rect("reader_head", ".side", "The user", "say in a few words", i)
            s.mark("reader", i)
        ev[at(t + 4.2)] = reader
        await s.run(at(10), ev)


# ------------------------------------------------------------------------------------- 4/5. the served flags

async def _flags_setup(r):
    await session(r, net_inputs("cc"))
    await r.js(net.HIDE_STATUS_JS)
    kb = r.page.keyboard
    await kb.press("5"); await r.step(20)
    await kb.press("w"); await r.step(30)
    await r.js(OPEN_FLAGS_JS); await r.step(5)
    await r.js(SCROLL_FLAGS_JS); await r.step(5)
    await r.page.click(".net-flag-search")
    await r.page.mouse.move(W - 2, H - 2)
    await r.step(10)


async def f_flag():
    """Flags: type "hushed": tengu_hushed_lark_text's value is the reminder; click it: the source map opens with
    the flag searched; Enter opens the Silent-turn reminder: the app's own words, and the flag that overrides them. 15 s."""
    async with rec() as r:
        await r.page.add_init_script(net.KEEP_HIGHLIGHT_INIT)
        await _flags_setup(r)
        s = Shot(r, "f_flag")
        plan = net.Plan(r, s)
        ev = {}
        t = await typed(s, 0.4, "hushed", ev, rate=0.09)
        for f, fn in ev.items(): plan.acts.setdefault(f, []).append(fn)

        async def after_nav(where):
            await r.page.add_style_tag(content=_rec.NO_TRANSITIONS)
            await r.js(net.NO_INTRO_JS)
            await r.page.evaluate("window.__vt.enable()")
            await r.step(30)
            await r.page.mouse.move(W - 2, H - 2)
            await r.leaks(where)

        async def filtered(i):
            await r.js("()=>document.activeElement && document.activeElement.blur()")
            s.mark("filtered", i)
            await s.elem("flag_row", "#panel .net-flags tr:not([hidden])", "tengu_hushed_lark_text", i)
            await s.rect("flag_value", "#panel .net-flags tr:not([hidden])", "say in a few words", None, i)
            await s.rect("flag_name", "#panel .net-flags tr:not([hidden])", "tengu_hushed_lark_text", None, i)
            await s.rect("flag_count", "#panel p.note", "of ", None, i)
            await net.leak(r, "f_flag:filtered")
        async def hover(i):
            s.mark("hover", i)
            await r.page.hover("#panel a.net-doc:text-is('tengu_hushed_lark_text')")
        async def click(i):
            s.mark("click", i)
            async with r.page.expect_navigation(wait_until="load"):
                await r.page.click("#panel a.net-doc:text-is('tengu_hushed_lark_text')")
            await after_nav("f_flag:landing")
            await r.page.wait_for_selector(".ds-pal .ds-row", timeout=30000)
            await r.step(20)
            s.mark("landing", i)
            await s.elem("palette", ".ds-pal", None, i)
            await s.elem("result", ".ds-row", "Silent-turn", i)
        async def down(i):
            await s.key(i, "ArrowDown", "↓")
            await s.elem("result_sel", ".ds-row", "Silent-turn", i)
        async def enter(i):
            s.mark("enter", i)
            try:
                async with r.page.expect_navigation(wait_until="load", timeout=15000):
                    await s.key(i, "Enter")
            except Exception as e:
                print("  Enter did not navigate (same-page anchor?):", str(e)[:120])
            await after_nav("f_flag:entry")
            s.mark("entry", i)
            await s.rect("entry_title", "body", "Silent-turn reminder", None, i)
            await s.rect("entry_flag", "body", "tengu_hushed_lark_text", None, i)
            await s.rect("entry_text", "body", "As you continue, keep them updated", None, i)
            await s.elem("entry_pre", "pre", "As you continue, keep them updated", i)

        plan.do(t + 0.4, filtered)
        plan.do(t + 3.6, hover)
        plan.do(t + 4.6, click)
        plan.do(t + 6.6, down)
        plan.do(t + 7.4, enter)
        await s.run(at(15), plan.events(at(15)))


async def f_wick():
    """Flags: type "lantern_wick": the gate false, the mode off, and the served texts, one ending
    "Don't mention this to the user." 8 s."""
    async with rec() as r:
        await _flags_setup(r)
        s = Shot(r, "f_wick")
        ev = {}
        t = await typed(s, 0.4, "lantern_wick", ev, rate=0.07)
        async def filtered(i):
            await r.js("()=>document.activeElement && document.activeElement.blur()")
            s.mark("filtered", i)
            await s.elem("table", "#panel .net-flags", None, i)
            await s.elem("release_row", "#panel .net-flags tr:not([hidden])", "tengu_lantern_wick_release", i)
            await s.rect("release_value", "#panel .net-flags tr:not([hidden])", "Don't mention this to the user", None, i)
            await s.elem("text_row", "#panel .net-flags tr:not([hidden])", "tengu_lantern_wick_text", i)
            await s.elem("mode_row", "#panel .net-flags tr:not([hidden])", "tengu_lantern_wick_mode", i)
            rows = await r.js("()=>[...document.querySelectorAll('#panel .net-flags tr:not([hidden])')].map(t=>t.innerText.replace(/\\s+/g,' ').slice(0,160))")
            print("  rows:", *rows, sep="\n   ")
            v = await r.js(r"""()=>{const t=[...document.querySelectorAll('#panel .net-flags tr:not([hidden])')].find(t=>/tengu_lantern_wick\b(?!_)/.test(t.innerText.split(/\s/)[0]+' ')); if(!t) return null; const b=t.getBoundingClientRect(); return [b.left,b.top,b.right,b.bottom]}""")
            if v: s.meta["rects"]["gate_row"] = {"f": i, "r": [round(c * _shot.DPR, 1) for c in v]}
            await net.leak(r, "f_wick")
        ev[at(t + 0.4)] = filtered
        await s.run(at(8), ev)


# ------------------------------------------------------------------------------------- 6. connectors

async def f_connectors():
    """`/` "place_option_order": the match count; Enter: the deferred-tool list; it scrolls to the Robinhood
    order tools. 12 s."""
    async with rec() as r:
        await session(r, cc_files())
        await r.step(20)
        s = Shot(r, "f_connectors")
        plan = net.Plan(r, s)
        ev = {}
        plan.do(0.3, lambda i: s.key(i, "/"))
        t = await typed(s, 0.8, "place_option_order", ev, rate=0.06)
        for f, fn in ev.items(): plan.acts.setdefault(f, []).append(fn)
        async def results(i):
            print("  count:", await search_done(r))
            await s.rect("count", "body", "94 matches", None, i)
            await s.elem("row", ".pal-row", "deferred_tools_delta", i)
            s.mark("results", i)
        async def enter(i): await s.key(i, "Enter"); s.mark("enter", i)
        st = {}
        async def scroll0(i):
            v = await r.js(SCROLL_TO_TEXT_JS, [".side", "mcp__claude_ai_Robinhood__place_equity_order", 0.35])
            if not v: print("  scroll miss: Robinhood"); return
            st["v"] = (i, v)
        async def scrolling(i):
            if "v" not in st: return
            f0, (a, b) = st["v"]
            u = ease(min(1, (i - f0) / at(1.2)))
            await r.js(SET_TEXT_SCROLL_JS, a + (b - a) * u)
        async def tools(i):
            for n in ["place_equity_order", "place_option_order", "place_crypto_order", "place_advanced_order", "exercise_option"]:
                await s.rect(n, ".side", "mcp__claude_ai_Robinhood__" + n, None, i)
            await s.elem("side", ".side", None, i)
            await s.rect("trail", "body", "1 of 94", None, i)
            s.mark("tools", i)
        plan.do(t + 0.6, results)
        plan.do(t + 3.0, enter)
        plan.do(t + 4.0, scroll0)
        for k in range(at(1.25)): plan.acts.setdefault(at(t + 4.0) + 1 + k, []).append(scrolling)
        plan.do(t + 5.6, tools)
        await s.run(at(12), plan.events(at(12)))


# ------------------------------------------------------------------------------------- 7. Codex handoff

H_ASK, H_DONE = 5359, 5537   # the ask and the complaint (request numbers in Trace)


async def f_handoff():
    """A Codex/ChatGPT session: the overview (HUD), Landmarks on, a flight to the stretch between my ask and my
    complaint (three compaction drops), then `/` "handoff prompt": both of my messages. 16 s."""
    files = [env("TRACE_CX_HANDOFF")]
    async with rec() as r:
        await open_session(r, files)
        await r.page.add_style_tag(content=NO_TITLE)
        rid = await r.js("()=>window.__trace.S.layout.root.id")
        kb = r.page.keyboard
        await r.step(20)
        s = Shot(r, "f_handoff")
        plan = net.Plan(r, s)
        async def hud(i):
            for tag, needle in [("dur", "2 d 13 h"), ("reqs", "10,840")]:
                await s.rect(tag, ".hud, body", needle, None, i)
            s.mark("hud", i)
        async def landmarks(i): await s.key(i, "l", "l")
        async def pan(i): await r.js(PAN_JS, [rid, (H_ASK + H_DONE) // 2])
        async def plus(i): await kb.press("+")
        plan.do(0.2, hud)
        plan.do(1.6, pan)
        for k, tt in enumerate([2.2, 2.9]):
            plan.do(tt, plus)
            plan.do(tt + 0.25, pan)
        async def seams(i):
            s.mark("seams", i)
            labels = await r.js("()=>[...document.querySelectorAll('.lbl, .landmark, [class*=label]')].map(e=>e.innerText).filter(t=>/compact/i.test(t)).slice(0,8)")
            print("  compaction labels:", labels)
        plan.do(5.5, seams)
        ev = {}
        plan.do(8.4, lambda i: s.key(i, "/"))
        t = await typed(s, 8.9, "handoff prompt", ev, rate=0.07)
        for f, fn in ev.items(): plan.acts.setdefault(f, []).append(fn)
        async def results(i):
            print("  count:", await search_done(r))
            await s.elem("ask_row", ".pal-row", "gimme a quick little handoff prompt", i)
            await s.rect("ask", ".pal-row", "gimme a quick little handoff prompt", None, i)
            await s.elem("done_row", ".pal-row", "three times now", i)
            await s.rect("done", ".pal-row", "you have handed me the handoff prompt three times now", None, i)
            await s.rect("ask_when", ".pal-row", f"request {H_ASK}", None, i)
            await s.rect("done_when", ".pal-row", f"request {H_DONE}", None, i)
            s.mark("results", i)
        plan.do(t + 0.6, results)
        await s.run(at(16), plan.events(at(16)))


# ------------------------------------------------------------------------------------- 8. the cancelled job

async def f_cancel():
    """A Claude Code session: `/` "direction has shifted": the model's reading of a teammate note; then
    `/` "jobs cancel": the cancel it ran. 12 s."""
    files = [env("TRACE_CC_CANCEL")]
    async with rec() as r:
        await open_session(r, files)
        await r.page.add_style_tag(content=NO_TITLE)
        await r.step(20)
        s = Shot(r, "f_cancel")
        plan = net.Plan(r, s)
        ev = {}
        plan.do(0.3, lambda i: s.key(i, "/"))
        t = await typed(s, 0.8, "direction has shifted", ev, rate=0.06)
        async def r1(i):
            print("  count:", await search_done(r))
            await s.elem("shift_row", ".pal-row", "direction has shifted", i)
            await s.rect("shift", ".pal-row", "the user's direction has shifted again", None, i)
            s.mark("shift", i)
        async def clear(i):
            await s.key(i, "Escape", "Esc")
        ev2 = {}
        t2 = await typed(s, t + 4.2, "jobs cancel", ev2, rate=0.07)
        async def slash(i): await s.key(i, "/")
        async def r2(i):
            print("  count:", await search_done(r))
            await s.elem("cancel_row", ".pal-row", "cancel the off-direction", i)
            await s.rect("cancel", ".pal-row", "cancel the off-direction from-scratch job", None, i)
            s.mark("cancel", i)
        for f, fn in {**ev, **ev2}.items(): plan.acts.setdefault(f, []).append(fn)
        plan.do(t + 0.6, r1)
        plan.do(t + 3.6, clear)
        plan.do(t2 + 0.6, r2)
        await s.run(at(12), plan.events(at(12)))


SHOTS = {f.__name__: f for f in [f_loader, f_open, f_close, f_nudge, f_flag, f_wick, f_connectors, f_handoff, f_cancel]}

if __name__ == "__main__":
    asyncio.run(main_of(SHOTS))
