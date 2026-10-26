// Boot and input routing.
(function (D) {
  var okDown = false, okConsumed = false, okTimer = null, refreshTimer = null, wokeWithOk = false;

  function onKeyDown(e) {
    var k = e.keyCode;
    if (D.idle.poke()) {                                  // the key only wakes the screen from the idle clock
      e.preventDefault();
      if (k === 13) wokeWithOk = true;
      D.sound.play('wake');
      return;
    }
    if (k === 13) {
      e.preventDefault();
      if (wokeWithOk) return;                            // still the press that woke the screen
      if (e.repeat || okDown) return;
      okDown = true; okConsumed = false;
      D.perf.touch();
      if (!D.screens.isOpen()) okTimer = setTimeout(function () { if (D.ui.longPress()) okConsumed = true; }, 550);
      return;
    }
    if (D.screens.isOpen()) { if (D.screens.key(e)) e.preventDefault(); return; }
    if (k === 27) return;
    if (D.ui.key(e)) e.preventDefault();
  }

  function onKeyUp(e) {
    if (e.keyCode !== 13) return;
    clearTimeout(okTimer);
    if (wokeWithOk) { wokeWithOk = false; okDown = false; return; }
    if (!okDown) return;
    okDown = false;
    if (okConsumed) return;
    if (D.screens.isOpen()) D.screens.ok(); else D.ui.activate();
  }

  function refreshSoon() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { D.ui.reload(false); }, 500);
  }

  // Startup timing (ms since the page started loading) and frame hitches in the first 6 seconds, sent to the dev logger.
  var marks = {};
  function mark(n) { marks[n] = Math.round(performance.now()); }
  function watchStartup() {
    var last = 0, n = 0, over34 = 0, over50 = 0, worst = 0, t0 = 0;
    function frame(t) {
      if (!t0) t0 = t;
      if (last) { var d = t - last; n++; if (d > 34) over34++; if (d > 50) over50++; if (d > worst) worst = d; }
      last = t;
      if (t - t0 < 6000) requestAnimationFrame(frame);
      else {
        D.log('INFO', 'startup', { staged: !!D.CONFIG.stagedStart, marks: marks, frames: n, over34: over34, over50: over50, worst: Math.round(worst), v: D.CONFIG.version });
        diagnostics();
      }
    }
    requestAnimationFrame(frame);
  }

  // What the page itself was doing: document timing, resource loads, long main-thread tasks, first paints.
  var longTasks = [];
  if (D.CONFIG.debugLogger) {
    try {
      new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { longTasks.push([Math.round(e.startTime), Math.round(e.duration)]); }); }).observe({ entryTypes: ['longtask'] });
    } catch (e) { /* not supported */ }
  }
  function diagnostics() {
    try {
      var nav = performance.getEntriesByType('navigation')[0] || performance.timing;
      var r = performance.getEntriesByType('resource').map(function (e) { return e.name.replace(/^.*\//, '') + '@' + Math.round(e.startTime) + '+' + Math.round(e.duration); });
      var paints = performance.getEntriesByType('paint').map(function (e) { return e.name + '@' + Math.round(e.startTime); });
      D.log('INFO', 'diag', { longTasks: longTasks.slice(0, 20), paints: paints, res: r.join(' '),
        nav: nav.domInteractive !== undefined ? { di: Math.round(nav.domInteractive), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd) } : 'n/a',
        heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 'n/a' });
    } catch (e) { D.log('FAIL', 'diag', String(e)); }
  }

  // Development test hook: `ares-launch com.jaigeye.home -p '{"scenePhase":"day","sceneEvent":"rocket","perf":1}'`
  // shows that phase, fires that visitor and logs a 10 s frame-rate sample. Not used in normal launches.
  function devRun() {
    var p = {};
    try { p = window.webOSSystem && window.webOSSystem.launchParams; p = typeof p === 'string' ? JSON.parse(p || '{}') : (p || {}); } catch (e) { p = {}; }
    if (!p.scenePhase && !p.perf) return;
    if (p.scenePhase && window.Scene) window.Scene.setPhase(p.scenePhase);
    if (p.perf) {
      // set the level first and let its layers settle, then start the visitor and measure
      setTimeout(function () { if (typeof p.level === 'number') D.backdrop.forceLevel(p.level); }, 5000);
      setTimeout(function () {
        if (p.sceneEvent && window.Scene) window.Scene.trigger(p.sceneEvent);
        D.perf.sample(10000, function (r) {
          D.log('INFO', 'perf run', { phase: window.Scene && window.Scene.phase(), event: p.sceneEvent || null, level: D.backdrop.level(), mode: D.backdrop.mode(), r: r });
        });
      }, 9000);
    }
  }

  function boot() {
    mark('boot');
    var stage = document.getElementById('stage');
    var staged = !!D.CONFIG.stagedStart;
    // The clock waits until the first frame is out (building Intl formatters is slow on TV CPUs).
    var clockStarted = false;
    function startClock() {
      if (clockStarted) return;
      clockStarted = true;
      D.clock.init(document.getElementById('time'), document.getElementById('date'));
      D.getTimeFormat(function (f) { if (f) D.clock.setH12(f !== 'HH24'); });
    }
    requestAnimationFrame(function () { setTimeout(startClock, 60); });
    setTimeout(startClock, 900);                          // in case frames are paused (app starts in the background)
    D.ui.init(document.getElementById('rows'), document.getElementById('toast'));
    D.screens.init(document.getElementById('overlay'));
    if (D.CONFIG.debugLogger) watchStartup();           // timing diagnostics only in development builds
    D.backdrop.init(stage, staged);
    D.weather.init(document.getElementById('wx'));
    D.idle.init(stage);
    var cached = staged && D.ui.fromCache();
    if (cached) mark('firstRender');
    D.ui.reload(!cached, function () {
      mark(cached ? 'dataRefreshed' : 'firstRender');
      D.log('INFO', 'rows', D.ui.summary());
      if (staged && !cached) D.backdrop.begin();
    });
    if (cached) D.backdrop.begin();
    devRun();
    D.log('INFO', 'start', { v: D.CONFIG.version, tv: D.isTV, staged: staged, cached: !!cached, w: innerWidth, h: innerHeight, dpr: devicePixelRatio });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('webOSRelaunch', refreshSoon);
    document.addEventListener('visibilitychange', function () {
      // another app is on screen: unload the scene so that app gets the memory (budget TVs have little free memory)
      if (document.visibilityState === 'hidden') { D.backdrop.release(); D.weather.pause(); D.idle.pause(); }
      else { D.backdrop.restore(); D.weather.resume(); D.idle.resume(); refreshSoon(); }
    });
    var lastPoint = 0;                                    // moving the Magic Remote pointer also counts as use
    document.addEventListener('mousemove', function () { if (Date.now() - lastPoint > 1000) { lastPoint = Date.now(); D.idle.poke(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.Dock);
