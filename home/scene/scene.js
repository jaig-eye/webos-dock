// Pip's Dock: the animated home-screen scene. Plain ES2017 for Chromium 79; only transform/opacity animate.
// API: Scene.init(container, opts) | setLevel(0..2) | setPhase(name|null) | trigger(eventName) | notifyKey()
//      pause() | resume() | setWeather(kind) (stub for the weather step) | phase() | events()
// opts: { art: 'art/', plates: 'plates/', lat, lon, store: {get,set}, log: fn, visitors: true }
(function () {
  'use strict';
  var PHASES = ['dawn', 'day', 'golden', 'dusk', 'night'];
  var GLINT = {
    dawn: { src: 'glint-dawn.svg', x: 870, y: 436, w: 420, h: 120 },
    day: { src: 'glint-day.svg', x: 700, y: 440, w: 1220, h: 100 },
    golden: { src: 'glint-golden.svg', x: 760, y: 440, w: 900, h: 100 },
    dusk: { src: 'glint-dusk.svg', x: 880, y: 446, w: 600, h: 80 },
    night: { src: 'moonglade.svg', x: 988, y: 436, w: 200, h: 140 }
  };
  var o = {}, root, el = {}, level = 2, phase = null, forced = null, paused = false;
  var timers = [], beatTimer = null, blinkTimer = null, eventTimer = null, phaseTimer = null;
  var lastKey = 0, lookingDown = false, downTimer = null, backTimer = null, eventRunning = false, lastEvent = 0, hiddenAt = 0;
  var wx = { sky: 'clear', precip: 'none', wind: 0 }, rainTimer = null, flashTimer = null, released = false;

  // ---------- helpers ----------
  function later(fn, ms) { var t = setTimeout(function () { timers.splice(timers.indexOf(t), 1); fn(); }, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; clearTimeout(beatTimer); clearTimeout(blinkTimer); clearTimeout(eventTimer); clearTimeout(downTimer); clearTimeout(backTimer); clearTimeout(rainTimer); clearTimeout(flashTimer); downTimer = backTimer = null; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function art(f) { return (o.art || 'art/') + f; }
  function img(cls, src, parent, light) {
    var i = document.createElement('img');
    i.className = cls + (light ? ' sc-light' : '');
    i.alt = '';
    if (src) i.src = art(src);
    (parent || root).appendChild(i);
    return i;
  }
  function div(cls, parent) { var d = document.createElement('div'); d.className = cls; (parent || root).appendChild(d); return d; }
  function store(k, v) {
    try {
      if (o.store) { if (v === undefined) return o.store.get('scene.' + k, null); o.store.set('scene.' + k, v); return v; }
      if (v === undefined) { var r = localStorage.getItem('scene.' + k); return r === null ? null : JSON.parse(r); }
      localStorage.setItem('scene.' + k, JSON.stringify(v)); return v;
    } catch (e) { return null; }
  }
  function log(k, d) { if (o.log) try { o.log(k, d); } catch (e) { /* ignore */ } }
  function pulse(node, cls) {                                // run a one-shot CSS animation class
    node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
    node.addEventListener('animationend', function done() { node.classList.remove(cls); node.removeEventListener('animationend', done); });
  }

  // ---------- sun and moon (epoch time, so the TV's time zone setting doesn't matter) ----------
  var R = Math.PI / 180;
  function sunElevation(t) {
    var d = t / 86400000 + 2440587.5 - 2451545.0;
    var g = (357.529 + 0.98560028 * d) * R, q = 280.459 + 0.98564736 * d;
    var L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * R;   // ecliptic longitude
    var e = (23.439 - 0.00000036 * d) * R;
    var ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    var dec = Math.asin(Math.sin(e) * Math.sin(L));
    var gmst = (18.697374558 + 24.06570982441908 * d) % 24;
    var ha = (gmst * 15 + (o.lon || -74.0)) * R - ra;
    var lat = (o.lat || 40.7) * R;
    return Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)) / R;
  }
  function phaseAt(t) {
    var e = sunElevation(t), rising = sunElevation(t + 20 * 60000) > e;
    if (e <= -10) return 'night';
    if (rising) return e < 8 ? 'dawn' : 'day';
    if (e > 14) return 'day';
    return e > -1 ? 'golden' : 'dusk';
  }
  function moonSvg(t) {
    var syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
    var p = (((t / 86400000 - ref) % syn) + syn) % syn / syn;  // 0 new .. 0.5 full .. 1 new
    var r = 40, cx = 48, cy = 48, k = Math.abs(Math.cos(2 * Math.PI * p)) * r, waxing = p < 0.5, gibbous = p > 0.25 && p < 0.75;
    var lit;
    if (waxing) lit = 'M48 8 A40 40 0 0 1 48 88 A' + k.toFixed(1) + ' 40 0 0 ' + (gibbous ? 1 : 0) + ' 48 8Z';
    else lit = 'M48 8 A40 40 0 0 0 48 88 A' + k.toFixed(1) + ' 40 0 0 ' + (gibbous ? 0 : 1) + ' 48 8Z';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">' +
      '<defs><radialGradient id="g"><stop offset="0" stop-color="#F2EFE0" stop-opacity=".35"/><stop offset="1" stop-color="#F2EFE0" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="48" cy="48" r="48" fill="url(#g)"/><circle cx="48" cy="48" r="40" fill="#2a3552" fill-opacity=".55"/>' +
      '<path d="' + lit + '" fill="#F2EFE0"/></svg>';
    return { url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), lit: (1 - Math.cos(2 * Math.PI * p)) / 2 };
  }
  function pumpkinSeason(d) { return d.getMonth() === 9 && d.getDate() >= 20; }

  // ---------- building the scene ----------
  function build() {
    el.plateA = div('sc-plate a'); el.plateB = div('sc-plate b');
    el.gloom = div('sc-abs sc-gloom');                         // greys the sky and water when it's overcast or raining
    el.flash = img('sc-flashel', null);                         // a distant storm flash on the horizon
    el.flash.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 300" width="900" height="300"><defs><radialGradient id="f" cx=".5" cy=".75" r=".6"><stop offset="0" stop-color="#eef2ff" stop-opacity=".9"/><stop offset="1" stop-color="#eef2ff" stop-opacity="0"/></radialGradient></defs><rect width="900" height="300" fill="url(#f)"/></svg>');
    el.moon = img('sc-moon sc-hide', null);
    el.clouds = div('sc-abs sc-clouds'); el.clouds.style.backgroundImage = 'url(' + art('cloud-tile.svg') + ')';
    el.glint = img('sc-glint', null);
    el.glow = img('sc-glow', 'glow.svg');
    el.lantern = img('sc-lantern', 'lantern.svg', null, true);
    el.pumpkin = img('sc-pumpkin sc-hide', 'pumpkin.svg', null, true);
    // mooring line from the piling's tie (668, 483) to the dinghy's bow, with a little sag
    el.rope = img('sc-rope', null);
    el.rope.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 244 34" width="244" height="34"><path d="M4 7 Q120 32 240 20" fill="none" stroke="#5a4a3a" stroke-width="2.4" stroke-linecap="round"/><path d="M4 6 Q120 31 240 19" fill="none" stroke="#c9b48e" stroke-opacity=".55" stroke-width="1"/></svg>');
    el.dinghy = img('sc-dinghy', 'dinghy.svg', null, true);
    el.ripple = img('sc-ripple', 'ripple.svg');
    el.pip = div('sc-abs sc-pip sc-light');
    el.pipBody = img('body', 'pip-body.svg', el.pip);
    el.pipHeadWrap = div('sc-abs headwrap', el.pip);
    el.pipHead = img('head', 'pip-head.svg', el.pipHeadWrap);
    el.pipLids = img('lids', 'pip-lids.svg', el.pipHeadWrap);
    el.pipSleep = img('sc-pipsleep', 'pip-sleep.svg', null, true);
    el.gus = div('sc-abs sc-gus sc-light');
    el.gusBody = img('body', 'gus-body.svg', el.gus);
    el.gusHeadWrap = div('sc-abs headwrap', el.gus);
    el.gusHead = img('head', 'gus-head.svg', el.gusHeadWrap);
    el.gusSleep = img('sleep', 'gus-sleep.svg', el.gus);
    el.rod = img('sc-rod', 'pip-rod.svg', null, true);           // above Gus, so it never looks like it passes through him
    el.events = div('sc-events');
    // decode the swap-in head now so looking down never stalls a frame
    var pre = new Image(); pre.src = art('pip-head-down.svg');
  }

  function plateUrl(ph) { return (o.plates || 'plates/') + ph + '.jpg'; }

  function applyPhase(ph, instant) {
    if (ph === phase) return;
    var first = phase === null;
    phase = ph;
    PHASES.forEach(function (p) { root.classList.remove('sc-ph-' + p); });
    root.classList.add('sc-ph-' + ph);
    var g = GLINT[ph];
    el.glint.src = art(g.src);
    el.glint.style.left = g.x + 'px'; el.glint.style.top = g.y + 'px'; el.glint.style.width = g.w + 'px'; el.glint.style.height = g.h + 'px';
    var moon = moonSvg(Date.now());
    el.moon.src = moon.url;
    el.moon.classList.toggle('sc-hide', !((ph === 'night' || ph === 'dusk') && moon.lit > 0.06));
    var pumpkin = pumpkinSeason(new Date());
    el.lantern.classList.toggle('sc-hide', pumpkin);
    el.pumpkin.classList.toggle('sc-hide', !pumpkin);
    var url = 'url(' + plateUrl(ph) + ')';
    if (first || instant) { el.plateA.style.backgroundImage = url; return; }
    // slow 75 s crossfade into the new phase
    var pre = new Image();
    pre.onload = pre.onerror = function () {
      el.plateB.style.backgroundImage = url;
      el.plateB.className = 'sc-plate b fade';
      later(function () { el.plateA.style.backgroundImage = url; el.plateB.className = 'sc-plate b snap'; }, 76000);
    };
    pre.src = plateUrl(ph);
    log('phase', ph);
  }

  function checkPhase() { applyPhase(forced || phaseAt(Date.now()), false); }

  function setLevelClass() { root.classList.remove('sc-l0', 'sc-l1', 'sc-l2'); root.classList.add('sc-l' + level); }

  // ---------- beats (small idle moments at irregular times) ----------
  function sitting() { return phase !== 'night'; }
  function scheduleBlink() {
    clearTimeout(blinkTimer);
    blinkTimer = setTimeout(function () {
      if (!paused && level > 0 && sitting()) pulse(el.pipLids, Math.random() < 0.2 ? 'sc-blink2' : 'sc-blink');
      scheduleBlink();
    }, rnd(5000, 11000));
  }
  function scheduleBeat() {
    clearTimeout(beatTimer);
    beatTimer = setTimeout(function () {
      if (!paused && level > 0 && Date.now() - lastKey > 4000) {
        var r = Math.random();
        if (sitting() && !lookingDown && r < 0.45) pulse(el.pipHeadWrap, 'sc-tilt');
        else if (sitting() && !lookingDown && r < 0.7) pulse(el.pipHeadWrap, 'sc-sniff');
        else if (phase !== 'night' && r < 0.9) pulse(el.gusHeadWrap, 'sc-swivel');
        else if (phase !== 'night') pulse(el.gus, 'sc-fluff');
      }
      scheduleBeat();
    }, rnd(10000, 25000));
  }

  // ---------- looking at the rows while the remote is used ----------
  function lookDown() { if (!sitting() || lookingDown) return; lookingDown = true; el.pipHead.src = art('pip-head-down.svg'); el.pipLids.src = art('pip-lids-down.svg'); }
  function lookBack() { if (!lookingDown) return; lookingDown = false; el.pipHead.src = art('pip-head.svg'); el.pipLids.src = art('pip-lids.svg'); }

  // ---------- events ----------
  function sprite(cls, src, x, y, w, h, parent) {
    var i = img('ev ' + cls, src, parent || el.events);
    i.style.left = x + 'px'; i.style.top = y + 'px'; i.style.width = w + 'px'; i.style.height = h + 'px';
    i.addEventListener('animationend', function () { if (i.parentNode) i.parentNode.removeChild(i); });
    return i;
  }
  function ring(x, y) { sprite('ev-ring', 'ripple.svg', x, y, 90, 26); }
  var EVENTS = {
    manatee: { phases: ['dawn', 'day', 'golden'], weight: 3, cooldown: 12 * 60000, run: function () {
      var x = rnd(1110, 1220);
      sprite('ev-manatee', 'manatee.svg', x, 450, 150, 56);
      later(function () { sprite('ev-puff', 'puff.svg', x + 96, 428, 36, 36); ring(x + 30, 488); }, 1600);
      later(function () { sprite('ev-puff', 'puff.svg', x + 98, 426, 36, 36); }, 4200);
      return 7200;
    } },
    dolphins: { phases: ['dawn', 'golden', 'day'], weight: 2, cooldown: 25 * 60000, run: function () {
      var x = rnd(1260, 1480);
      [0, 520].forEach(function (delay, i) {
        later(function () {
          var w = div('ev ev-finwrap', el.events); w.style.left = (x + i * 70) + 'px'; w.style.top = '414px';
          img('', 'fin.svg', w).setAttribute('style', 'left:0;top:0;width:60px;height:44px');
          w.addEventListener('animationend', function () { if (w.parentNode) w.parentNode.removeChild(w); });
        }, delay);
      });
      later(function () { sprite('ev-puff', 'puff.svg', x + 20, 400, 30, 30); }, 700);
      return 2600;
    } },
    mullet: { phases: ['dawn', 'day', 'golden', 'dusk'], weight: 5, cooldown: 2 * 60000, run: function () {
      var x = rnd(1000, 1500), y = rnd(470, 520);
      sprite('ev-fish', 'fish.svg', x, y, 40, 22);
      later(function () { sprite('ev-splash', 'splash.svg', x + 70, y + 8, 60, 40); ring(x + 55, y + 30); }, 1150);
      return 2200;
    } },
    bite: { phases: ['day', 'dawn', 'golden'], weight: 4, cooldown: 6 * 60000, run: function () {
      pulse(el.rod, 'sc-bite');
      later(function () { pulse(el.pipHeadWrap, 'sc-tilt'); }, 150);
      later(function () { sprite('ev-splash', 'splash.svg', 759, 490, 60, 40); ring(744, 512); }, 520);
      if (Math.random() < 0.35) later(function () { sprite('ev-fish', 'fish.svg', 752, 500, 40, 22); }, 900);
      return 2600;
    } },
    star: { phases: ['night', 'dusk'], weight: 5, cooldown: 10 * 60000, run: function () {
      sprite('ev-star', 'star.svg', rnd(560, 1180), rnd(70, 230), 260, 6);
      return 1000;
    } },
    rocket: { phases: ['dawn', 'day', 'golden', 'dusk', 'night'], weight: 1, cooldown: 4 * 3600000, daily: 1, run: function () {
      var fade = div('ev ev-plumefade', el.events); fade.style.left = '330px'; fade.style.top = '52px';
      var box = div('ev ev-plumebox', fade); box.style.left = '0'; box.style.top = '0';
      img('', 'plume.svg', box);
      fade.addEventListener('animationend', function (e) { if (e.target === fade && fade.parentNode) fade.parentNode.removeChild(fade); });
      sprite('ev-rocket', 'rocket.svg', 322, 392, 16, 40);
      if (phase !== 'night') later(function () { pulse(el.gusHeadWrap, 'sc-lookup'); }, 3000);
      return 42000;
    } }
  };

  function dayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  // ---------- weather ----------
  function applyWeather() {
    root.classList.toggle('sc-wx-partly', wx.sky === 'partly');
    root.classList.toggle('sc-wx-overcast', wx.sky === 'overcast');
    root.classList.toggle('sc-wx-rain', wx.precip !== 'none');
    root.classList.toggle('sc-wx-windy', wx.wind > 0.5);
    startRain();
  }
  function startRain() {
    clearTimeout(rainTimer); clearTimeout(flashTimer);
    if (paused || level < 1 || wx.precip === 'none') return;
    (function drop() {                                      // a few small rings popping on the water
      rainTimer = setTimeout(function () {
        if (!paused) sprite('ev-rain', 'ripple.svg', rnd(640, 1560), rnd(468, 548), 60, 18);
        drop();
      }, rnd(450, 1300));
    })();
    if (wx.precip === 'storm') {
      (function flash() {
        flashTimer = setTimeout(function () { if (!paused) pulse(el.flash, 'sc-flash'); flash(); }, rnd(40000, 90000));
      })();
    }
  }

  function eligible(name) {
    var ev = EVENTS[name], now = Date.now();
    if (ev.phases.indexOf(phase) < 0) return false;
    if (name === 'rocket' && wx.precip !== 'none') return false;   // no launches in the rain
    if (name === 'star' && wx.sky === 'overcast') return false;    // no shooting stars behind cloud
    var seen = store('ev.' + name) || {};
    if (seen.at && now - seen.at < ev.cooldown) return false;
    if (ev.daily && seen.day === dayKey() && seen.count >= ev.daily) return false;
    return true;
  }
  function runEvent(name, forcedRun) {
    var ev = EVENTS[name];
    if (!ev || eventRunning) return false;
    if (!forcedRun && !eligible(name)) return false;
    eventRunning = true;
    var seen = store('ev.' + name) || {};
    store('ev.' + name, { at: Date.now(), day: dayKey(), count: (seen.day === dayKey() ? seen.count || 0 : 0) + 1 });
    var ms = ev.run();
    lastEvent = Date.now();
    log('event', name);
    later(function () { eventRunning = false; }, ms);
    return true;
  }
  function pickEvent() {
    var names = Object.keys(EVENTS).filter(eligible), total = 0, i;
    names.forEach(function (n) { total += EVENTS[n].weight; });
    var r = Math.random() * total;
    for (i = 0; i < names.length; i++) { r -= EVENTS[names[i]].weight; if (r <= 0) return names[i]; }
    return null;
  }
  function scheduleEvents() {
    clearTimeout(eventTimer);
    eventTimer = setTimeout(function () {
      var quiet = Date.now() - lastKey > 20000 && Date.now() - lastEvent > 90000;
      if (!paused && level >= 2 && o.visitors !== false && quiet && !eventRunning) {
        var n = pickEvent();
        if (n) runEvent(n);
      }
      scheduleEvents();
    }, rnd(30000, 60000));
  }

  // ---------- API ----------
  window.Scene = {
    init: function (container, opts) {
      o = opts || {};
      root = container;
      root.classList.add('sc');
      build();
      level = typeof o.level === 'number' ? o.level : 2;
      setLevelClass();
      applyPhase(forced || phaseAt(Date.now()), true);
      phaseTimer = setInterval(checkPhase, 60000);
      scheduleBlink(); scheduleBeat(); scheduleEvents();
    },
    setLevel: function (n) { level = Math.max(0, Math.min(2, n)); setLevelClass(); if (root) startRain(); },
    setPhase: function (name) { forced = PHASES.indexOf(name) >= 0 ? name : null; applyPhase(forced || phaseAt(Date.now()), true); },
    trigger: function (name) { return runEvent(name, true); },
    events: function () { return Object.keys(EVENTS); },
    phase: function () { return phase; },
    sunElevation: function () { return sunElevation(Date.now()); },
    notifyKey: function () {
      lastKey = Date.now();
      clearTimeout(backTimer);
      if (!lookingDown && !downTimer) downTimer = setTimeout(function () { downTimer = null; if (Date.now() - lastKey < 1600) lookDown(); }, 1500);
      backTimer = setTimeout(lookBack, 6000);
    },
    setVisitors: function (on) { o.visitors = !!on; },
    // w = { sky: 'clear'|'partly'|'overcast', precip: 'none'|'rain'|'storm', wind: 0..1 }
    setWeather: function (w) {
      w = w || {};
      var next = { sky: w.sky || 'clear', precip: w.precip || 'none', wind: +w.wind || 0 };
      if (JSON.stringify(next) === JSON.stringify(wx)) return;
      wx = next;
      if (root) applyWeather();
    },
    weather: function () { return wx; },
    // Drop the scene's images and layers while another app is on screen (budget TVs have very little free memory),
    // and bring them back when Dock is visible again.
    release: function () {
      window.Scene.pause();
      if (released) return;
      released = true;
      root.style.display = 'none';
      el.plateA.style.backgroundImage = 'none';
      el.plateB.style.backgroundImage = 'none';
      el.plateB.className = 'sc-plate b snap';
      el.clouds.style.backgroundImage = 'none';
      // empty every sprite <img> too, so their decoded pictures can be dropped (each remembers its source)
      var imgs = root.getElementsByTagName('img'), i;
      for (i = 0; i < imgs.length; i++) {
        var s = imgs[i].getAttribute('src');
        if (s) { imgs[i].setAttribute('data-src', s); imgs[i].removeAttribute('src'); }
      }
    },
    restore: function () {
      if (released) {
        released = false;
        var imgs = root.getElementsByTagName('img'), i;
        for (i = 0; i < imgs.length; i++) {
          var s = imgs[i].getAttribute('data-src');
          if (s) { imgs[i].setAttribute('src', s); imgs[i].removeAttribute('data-src'); }
        }
        el.clouds.style.backgroundImage = 'url(' + art('cloud-tile.svg') + ')';
        el.plateA.style.backgroundImage = 'url(' + plateUrl(phase) + ')';
        root.style.display = '';
      }
      window.Scene.resume();
    },
    pause: function () {
      if (paused) return;
      paused = true; hiddenAt = Date.now();
      root.classList.add('sc-paused');
      clearAll(); clearInterval(phaseTimer);
      eventRunning = false;
      while (el.events.firstChild) el.events.removeChild(el.events.firstChild);
    },
    resume: function () {
      if (!paused) return;
      paused = false;
      root.classList.remove('sc-paused');
      lookBack();                                           // a glance that was cut short by leaving ends here
      checkPhase();
      phaseTimer = setInterval(checkPhase, 60000);
      scheduleBlink(); scheduleBeat(); scheduleEvents(); startRain();
      // welcome back: after 2+ minutes away, sometimes a small visitor shows up soon
      if (Date.now() - hiddenAt > 120000 && level >= 2 && o.visitors !== false && Math.random() < 0.5) {
        later(function () { var n = pickEvent(); if (n && n !== 'rocket') runEvent(n); }, rnd(20000, 60000));
      }
    }
  };
})();
