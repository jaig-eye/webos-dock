// Idle clock and soft navigation sounds.
// Idle clock: after N minutes with no remote use while Dock is on screen, the rows fade away and a big clock with the
// date and weather shows over the scene. Any key brings the rows back (that key does nothing else).
// Sounds: tiny clicks made in code (no sound files), played quietly through the TV's normal volume.
(function (D) {
  // ---------- idle clock ----------
  var stage, idleTimer = null, idle = false;
  function minutes() { return D.store.get('idleMin', D.CONFIG.idleMinutes); }
  function arm() {
    clearTimeout(idleTimer);
    var m = minutes();
    if (!m || document.visibilityState === 'hidden') return;
    idleTimer = setTimeout(function () {
      if (D.screens.isOpen()) { arm(); return; }            // never cover an open menu
      idle = true;
      stage.classList.add('idle');
      D.log('INFO', 'idle clock', 'on');
    }, m * 60000);
  }
  D.idle = {
    init: function (stageEl) { stage = stageEl; arm(); },
    // call on every key / pointer use; returns true when the key only woke the screen
    poke: function () {
      if (idle) { idle = false; stage.classList.remove('idle'); arm(); return true; }
      arm();
      return false;
    },
    pause: function () { clearTimeout(idleTimer); },
    resume: function () { if (idle) { idle = false; stage.classList.remove('idle'); } arm(); },
    minutes: minutes,
    setMinutes: function (m) { D.store.set('idleMin', m); arm(); }
  };

  // ---------- sounds ----------
  function wav(parts) {                                     // parts: [[freqHz, ms, gain], ...] played back to back
    var rate = 22050, n = 0, i, j;
    parts.forEach(function (p) { n += Math.floor(rate * p[1] / 1000); });
    var buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function str(o, s) { for (var k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    var off = 0;
    parts.forEach(function (p) {
      var len = Math.floor(rate * p[1] / 1000);
      for (j = 0; j < len; j++) {
        var env = Math.min(1, j / 60) * Math.pow(1 - j / len, 2);   // quick attack, soft decay
        v.setInt16(44 + (off + j) * 2, Math.round(Math.sin(2 * Math.PI * p[0] * j / rate) * 12000 * p[2] * env), true);
      }
      off += len;
    });
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  var SOUNDS = null, pools = {}, lastPlay = 0;
  function build() {
    SOUNDS = {
      move: wav([[1320, 28, 0.35]]),
      open: wav([[660, 45, 0.5], [990, 70, 0.5]]),
      menu: wav([[880, 40, 0.4]]),
      wake: wav([[520, 60, 0.35], [780, 80, 0.35]])
    };
    Object.keys(SOUNDS).forEach(function (k) {
      pools[k] = [0, 1, 2].map(function () { var a = new Audio(SOUNDS[k]); a.preload = 'auto'; return a; });
      pools[k].next = 0;
    });
  }
  D.sound = {
    enabled: function () { return D.store.get('soundsOn', D.CONFIG.sounds.enabled); },
    setEnabled: function (on) { D.store.set('soundsOn', !!on); if (on) D.sound.play('menu'); },
    play: function (name) {
      try {
        if (!D.sound.enabled()) return;
        var now = Date.now();
        if (name === 'move' && now - lastPlay < 60) return;   // holding an arrow key shouldn't machine-gun
        lastPlay = now;
        if (!SOUNDS) build();
        var pool = pools[name];
        if (!pool) return;
        var a = pool[pool.next]; pool.next = (pool.next + 1) % pool.length;
        a.volume = Math.max(0, Math.min(1, D.CONFIG.sounds.volume));
        a.currentTime = 0;
        var p = a.play();
        if (p && p.catch) p.catch(function () { /* autoplay refused: stay silent */ });
      } catch (e) { /* sound is optional */ }
    }
  };
})(window.Dock);
