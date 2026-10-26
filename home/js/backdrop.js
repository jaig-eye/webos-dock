// The living backdrop: "Pip's Dock" (scene/scene.js), run at one of three levels:
//   0 = still scene, 1 = + slow zoom, Pip breathing, rod, ripple, dinghy, lantern flicker, small idle moments,
//   2 = + drifting clouds, water sparkle and the occasional visitor (manatee, dolphins, fish, star, rocket).
// The auto-check measures frames on the TV and steps down a level by itself if the scene struggles.
(function (D) {
  var stage, level = 2, mode = 'auto', paused = false;
  var NAMES = ['Low', 'Medium', 'Full'];

  function setClass() {
    stage.className = stage.className.replace(/\bbd\d\b/g, '').trim() + ' bd' + level;
    if (window.Scene) window.Scene.setLevel(level);
  }

  // Frame-time sampler shared by the backdrop check and the speed test.
  function sample(ms, cb) {
    var ts = [], t0 = 0;
    function frame(t) {
      ts.push(t);
      if (!t0) t0 = t;
      if (t - t0 >= ms) { finish(); return; }
      requestAnimationFrame(frame);
    }
    function finish() {
      var d = [], i;
      for (i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
      var span = ts[ts.length - 1] - ts[0] || 1;
      var slow = d.filter(function (v) { return v > 34; }).length;
      var sorted = d.slice().sort(function (a, b) { return a - b; });
      cb({ fps: +((ts.length - 1) / (span / 1000)).toFixed(1), slow: slow, frames: d.length, max: +(sorted[sorted.length - 1] || 0).toFixed(0) });
    }
    requestAnimationFrame(frame);
  }

  var touched = 0, gen = 0, checkSeq = 0;
  // the saved automatic result, only while it is from this version and less than 7 days old
  function validSaved() {
    var s = D.store.get('bdAuto', null);
    return s && s.v === D.CONFIG.version && Date.now() - s.ts < 7 * 24 * 3600 * 1000 ? s : null;
  }
  function autoCheck(tries) {
    if (mode !== 'auto' || paused) return;
    var saved = validSaved();
    if (saved) { level = saved.level; setClass(); return; }
    var my = ++checkSeq, startTouch = touched, startGen = gen;
    sample(8000, function (r) {
      if (my !== checkSeq || mode !== 'auto') return;     // superseded, or a level was picked by hand meanwhile
      if (touched !== startTouch || paused || gen !== startGen) {   // remote used, or the app was hidden: try again later
        if ((tries || 0) < 3) setTimeout(function () { autoCheck((tries || 0) + 1); }, 20000);
        return;
      }
      var bad = r.fps < 48 || r.slow / Math.max(1, r.frames) > 0.04;
      D.log('INFO', 'backdrop check', { level: level, fps: r.fps, slow: r.slow, frames: r.frames, bad: bad, phase: window.Scene && window.Scene.phase() });
      if (bad && level > 0) { level--; setClass(); setTimeout(function () { autoCheck((tries || 0) + 1); }, 4000); return; }
      D.store.set('bdAuto', { level: level, ts: Date.now(), v: D.CONFIG.version });
    });
  }

  D.perf = { sample: sample, touch: function () { touched++; } };

  D.backdrop = {
    // staged: start still (level 0) and bring the animation in later with begin(), so the first screen isn't competing with layer setup
    init: function (stageEl, staged) {
      stage = stageEl;
      mode = D.store.get('bd', 'auto');
      // an expired or older-version result starts again from Full, so a level dropped once can recover
      level = mode === 'auto' ? ((validSaved() || { level: 2 }).level) : Math.max(0, Math.min(2, +mode));
      var target = level;
      if (staged) level = 0;
      try {
        window.Scene.init(document.getElementById('scene'), {
          art: 'scene/art/', plates: 'scene/plates/', level: level,
          lat: D.CONFIG.weather.lat, lon: D.CONFIG.weather.lon,
          store: D.store, visitors: D.store.get('visitors', true),
          log: function (k, d) { D.log('INFO', 'scene ' + k, d); }
        });
      } catch (e) { D.log('FAIL', 'scene init', String(e)); }
      setClass();
      level = target;
      if (!staged) setTimeout(function () { autoCheck(0); }, 5000);
    },
    begin: function () {                                  // staged start: step up to the target level, one layer group at a time
      var target = level;
      level = 0; setClass();
      setTimeout(function () { level = Math.min(1, target); setClass(); }, 1200);
      setTimeout(function () { level = target; setClass(); setTimeout(function () { autoCheck(0); }, 5000); }, 2700);
    },
    setMode: function (m) {                               // 'auto' or 0..2
      mode = m; D.store.set('bd', m);
      checkSeq++;                                         // cancel any check still sampling
      if (m === 'auto') { D.store.set('bdAuto', null); level = 2; setClass(); setTimeout(function () { autoCheck(0); }, 1500); }
      else { level = +m; setClass(); }
    },
    mode: function () { return mode; },
    level: function () { return level; },
    levelName: function (l) { return NAMES[l === undefined ? level : l]; },
    forceLevel: function (n) { level = n; setClass(); },  // test hook only: not saved
    notifyKey: function () { if (window.Scene) window.Scene.notifyKey(); },
    visitors: function () { return D.store.get('visitors', true); },
    setVisitors: function (on) { D.store.set('visitors', !!on); if (window.Scene) window.Scene.setVisitors(!!on); },
    pause: function () { paused = true; gen++; stage.className += ' paused'; if (window.Scene) window.Scene.pause(); },
    resume: function () { paused = false; stage.className = stage.className.replace(/\bpaused\b/g, '').trim(); if (window.Scene) window.Scene.resume(); }
  };
})(window.Dock);
