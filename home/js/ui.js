// Home screen: Favourites / Apps / TV rows, focus movement, launching.
(function (D) {
  var H = 1080, MARGIN_V = 64, LEFT = 120, RIGHT = 1800;
  var S = { rows: [], r: 0, c: [0, 0, 0], favs: [], installed: null, inputs: null };
  var rowsEl, toastEl, toastTimer = null;

  var GLYPH = {
    hdmi: '<path d="M8 14h32v14l-5 6H13l-5-6z"/><path d="M16 20h16M16 25h16"/>',
    tv: '<rect x="6" y="9" width="36" height="24" rx="3"/><path d="M16 40h16M24 33v7"/>',
    gear: '<circle cx="24" cy="24" r="6"/><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4"/>',
    home: '<path d="M8 22L24 8l16 14v18H8z"/><path d="M20 40V28h8v12"/>',
    sliders: '<path d="M8 14h32M8 24h32M8 34h32"/><circle cx="18" cy="14" r="3"/><circle cx="32" cy="24" r="3"/><circle cx="22" cy="34" r="3"/>',
    antenna: '<path d="M24 24v18M17 42h14"/><circle cx="24" cy="20" r="3"/><path d="M16 12a11 11 0 0 0 0 16M32 12a11 11 0 0 1 0 16M11 7a18 18 0 0 0 0 26M37 7a18 18 0 0 1 0 26"/>',
    airplay: '<path d="M15 33H9a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3h-6"/><path d="M24 27l9 13H15z"/>'
  };
  function svg(name) { return '<svg class="glyph" viewBox="0 0 48 48">' + GLYPH[name] + '</svg>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---------- data ----------
  function appItem(a) { return { kind: 'app', id: a.id, name: a.name, app: a, key: 'app:' + a.id }; }

  function inputItems() {
    var devs = S.inputs, out = [];
    if (!devs) {
      for (var p = 1; p <= 3; p++) out.push({ kind: 'input', id: 'HDMI_' + p, name: 'HDMI ' + p, appId: 'com.webos.app.hdmi' + p, status: null, key: 'in:HDMI_' + p });
      return out;
    }
    devs.filter(function (d) { return /^HDMI/i.test(d.id || ''); })
      .sort(function (a, b) { return (a.port || 0) - (b.port || 0); })
      .forEach(function (d) {
        // 'connected' is true for every port on webOS 6; 'hdmiPlugIn' is the real cable/device detection.
        out.push({ kind: 'input', id: d.id, name: d.label || d.id, appId: d.appId, status: d.hdmiPlugIn === true ? 'on' : d.hdmiPlugIn === false ? 'off' : null, key: 'in:' + d.id });
      });
    return out;
  }

  function buildRows() {
    var inst = S.installed;
    function isIn(id) { return inst === null || !!inst[id]; }
    var cat = D.catalog, favItems = [], appItems = [];
    S.favs.forEach(function (id) { if (cat.byId[id] && isIn(id)) favItems.push(appItem(cat.byId[id])); });
    cat.list.filter(function (a) { return isIn(a.id) && S.favs.indexOf(a.id) < 0; })
      .sort(function (a, b) { return a.name < b.name ? -1 : 1; })
      .forEach(function (a) { appItems.push(appItem(a)); });
    var tv = inputItems().concat([
      // Antenna = LG's Live TV app (the tuner). AirPlay lives in Home Dashboard on webOS 6.
      { kind: 'sys', id: 'livetv', name: 'Antenna', appId: 'com.webos.app.livetv', glyph: 'antenna', key: 'sys:livetv' },
      // The 'airplay' app itself is only the receiver (a black screen until a phone connects); the AirPlay screen
      // people open lives in Home Dashboard, which is what LG's own home uses.
      { kind: 'sys', id: 'airplay', name: 'AirPlay', sub: 'Home Dashboard', appId: 'com.webos.app.homeconnect', glyph: 'airplay', key: 'sys:airplay' },
      { kind: 'sys', id: 'settings', name: 'TV Settings', appId: 'com.palm.app.settings', glyph: 'gear', key: 'sys:settings' },
      { kind: 'sys', id: 'lghome', name: 'LG Home', appId: 'com.webos.app.home', glyph: 'home', key: 'sys:lghome' },
      { kind: 'dock', id: 'dock', name: 'Dock Settings', glyph: 'sliders', key: 'dock:settings' }
    ]);
    var rows = [];
    if (favItems.length) rows.push({ key: 'fav', title: 'Favourites', items: favItems });
    if (appItems.length) rows.push({ key: 'apps', title: 'Apps', items: appItems });
    rows.push({ key: 'tv', title: 'TV', items: tv });
    return rows;
  }

  // ---------- rendering ----------
  function tileHtml(row, it) {
    if (it.kind === 'app') {
      var a = it.app, logo = D.LOGOS && D.LOGOS[a.id];
      if (logo) {
        return '<div class="art" style="background:' + a.bg + '"><img class="logo' + (logo.tint === 'white' ? ' white' : '') +
          '" src="' + logo.src + '" style="width:' + (logo.w || 56) + '%;height:' + (logo.h || 50) + '%" alt=""></div>';
      }
      return '<div class="art" style="background:' + a.bg + ';color:' + a.fg + ';font-weight:' + a.fw + ';letter-spacing:' + a.ls + ';font-size:' + (row.key === 'fav' ? a.fs : Math.round(a.fs * 0.7)) + 'px"><span>' + esc(a.wm) + '</span></div>';
    }
    var sub = '';
    if (it.kind === 'input') sub = '<div class="sub"><i class="dot ' + (it.status || '') + '"></i>' + (it.status === 'on' ? 'Device detected' : it.status === 'off' ? 'No device' : '') + '</div>';
    else if (it.sub) sub = '<div class="sub">' + esc(it.sub) + '</div>';
    var glyph = it.kind === 'input' ? 'hdmi' : it.glyph;
    return '<div class="glass">' + svg(glyph) + '<div class="nm">' + esc(it.name) + '</div>' + sub + '</div>';
  }

  function render(keepKey) {
    S.rows = buildRows();
    var html = '';
    S.rows.forEach(function (row, r) {
      html += '<div class="row ' + row.key + '" data-r="' + r + '"><h2>' + row.title + '</h2><div class="track">';
      row.items.forEach(function (it, c) {
        html += '<div class="item" data-r="' + r + '" data-c="' + c + '"><div class="tile">' + tileHtml(row, it) + '<i class="ring"></i></div>' +
          (row.key !== 'tv' ? '<div class="label">' + esc(it.name) + '</div>' : '') + '</div>';
      });
      html += '</div></div>';
    });
    rowsEl.innerHTML = html;
    var rowEls = rowsEl.querySelectorAll('.row');
    S.rows.forEach(function (row, r) {
      row.el = rowEls[r];
      row.track = row.el.querySelector('.track');
      row.itemEls = row.el.querySelectorAll('.item');
      row.x = 0;
    });
    measure();
    var r0 = clamp(S.r, 0, S.rows.length - 1), c0 = S.c[r0] || 0;
    if (keepKey) {
      S.rows.forEach(function (row, r) { row.items.forEach(function (it, c) { if (it.key === keepKey) { r0 = r; c0 = c; } }); });
    }
    S.c = S.rows.map(function (row, r) { return r === r0 ? c0 : Math.min(S.c[r] || 0, row.items.length - 1); });
    S.r = r0;
    focus(r0, c0, true);
    rowsEl.className = 'ready';
  }

  function measure() {
    S.rows.forEach(function (row) { row.top = row.el.offsetTop; row.h = row.el.offsetHeight; row.hdr = row.el.firstChild.offsetHeight; });
  }

  // ---------- focus ----------
  function place(r, instant) {
    var row = S.rows[r], next = S.rows[r + 1];
    var peek = next ? next.hdr + 44 : 0;
    var ty = (H - MARGIN_V) - (row.top + row.h) - peek;
    if (instant) rowsEl.style.transition = 'none';
    rowsEl.style.transform = 'translate3d(0,' + Math.round(ty) + 'px,0)';
    if (instant) { void rowsEl.offsetHeight; rowsEl.style.transition = ''; }
  }

  function scrollTrack(r, c, instant) {
    var row = S.rows[r], el = row.itemEls[c];
    var left = el.offsetLeft, right = left + el.offsetWidth - parseInt(getComputedStyle(el).marginRight || 0, 10);
    var x = row.x;
    if (left + x < LEFT) x = LEFT - left;
    if (right + x > RIGHT) x = RIGHT - right;
    x = Math.min(0, x);
    if (x !== row.x || instant) {
      row.x = x;
      if (instant) row.track.style.transition = 'none';
      row.track.style.transform = 'translate3d(' + x + 'px,0,0)';
      if (instant) { void row.track.offsetHeight; row.track.style.transition = ''; }
    }
  }

  function focus(r, c, instant) {
    if (!S.rows.length) return;                         // nothing drawn yet (first ever start)
    r = clamp(r, 0, S.rows.length - 1);
    c = clamp(c, 0, S.rows[r].items.length - 1);
    var old = rowsEl.querySelector('.item.on');
    if (old) old.className = old.className.replace(' on', '');
    S.r = r; S.c[r] = c;
    S.rows.forEach(function (row, i) { row.el.className = 'row ' + row.key + (i === r ? ' cur' : i < r ? ' past' : ''); });
    var el = S.rows[r].itemEls[c];
    el.className += ' on';
    scrollTrack(r, c, instant);
    place(r, instant);
  }

  function current() { return S.rows[S.r] ? S.rows[S.r].items[S.c[S.r]] : null; }

  // ---------- actions ----------
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.className = 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = ''; }, ms || 2400);
  }

  function open(id, name) {
    toast('Opening ' + name + '…', 4000);
    D.launch(id, function (o) {
      if (!o || o.returnValue === false) {
        toast("Can't open " + name + (o && o.errorText ? ' (' + o.errorText + ')' : ''), 3500);
        D.log('FAIL', 'launch', { id: id, o: o });
      }
    });
  }

  // website shortcuts open in LG's own web browser
  function openWeb(url, name) {
    toast('Opening ' + name + '…', 4000);
    D.luna('luna://com.webos.applicationManager/launch', { id: 'com.webos.app.browser', params: { target: url } }, function (o) {
      if (!o || o.returnValue === false) { toast("Can't open " + name, 3500); D.log('FAIL', 'launch web', { url: url, o: o }); }
    });
  }

  function openItem(it) {
    if (!it) return;
    D.sound.play(it.kind === 'dock' || it.kind === 'info' ? 'menu' : 'open');
    if (it.kind === 'app' && it.app.web) openWeb(it.app.web, it.name);
    else if (it.kind === 'app') open(it.id, it.name);
    else if (it.kind === 'input') open(it.appId, it.name);
    else if (it.kind === 'sys') open(it.appId, it.name);
    else if (it.kind === 'dock') D.screens.openSettings();
    else if (it.kind === 'info') D.screens.openCast();
  }
  function activate() { openItem(current()); }

  // Returns true when a menu opened, so a long press on any other tile still counts as a normal press.
  function longPress() {
    var it = current();
    if (it && it.kind === 'app') { D.screens.openMenu(it); return true; }
    return false;
  }

  function key(e) {
    var k = e.keyCode;
    if (k < 37 || k > 40) return false;
    D.perf.touch();
    D.backdrop.notifyKey();                               // Pip glances down at the rows while you browse
    if (!S.rows.length) return true;
    var before = S.r + ',' + S.c[S.r];
    if (k === 37) focus(S.r, S.c[S.r] - 1);
    else if (k === 39) focus(S.r, S.c[S.r] + 1);
    else if (k === 38) { if (S.r > 0) focus(S.r - 1, S.c[S.r - 1] || 0); }      // top row: stay put
    else if (k === 40) { if (S.r < S.rows.length - 1) focus(S.r + 1, S.c[S.r + 1] || 0); }
    if (S.r + ',' + S.c[S.r] !== before) D.sound.play('move');
    return true;
  }

  // ---------- data loading ----------
  // Inputs are read every time (one call). The installed-apps scan (one call per catalogue app) only runs when forced,
  // on first ever start, or when the saved result is older than 30 minutes.
  var SCAN_TTL = 30 * 60 * 1000;
  function load(full, cb) {
    var ids = D.catalog.list.map(function (a) { return a.id; }), res = {}, pending = (full ? ids.length : 0) + 1, errors = 0;
    var prev = S.installed;
    function fin() {
      if (--pending > 0) return;
      if (full) { S.installed = errors === ids.length ? null : res; S.appsTs = Date.now(); }  // all calls failed: assume everything is installed
      D.store.set('cache', { installed: S.installed, inputs: S.inputs, appsTs: S.appsTs });
      cb();
    }
    // a few calls at a time instead of all at once, so the bridge doesn't burst
    var next = 0;
    function pump() {
      if (next >= ids.length) return;
      var id = ids[next++], entry = D.catalog.byId[id];
      if (entry && entry.web) { res[id] = true; fin(); pump(); return; }   // website shortcuts need no install check
      D.isInstalled(id, function (ok) {
        // a failed or timed-out check keeps what we knew before (or shows the app), rather than hiding it
        if (ok === null) { errors++; res[id] = prev && Object.prototype.hasOwnProperty.call(prev, id) ? prev[id] : true; }
        else res[id] = ok;
        fin(); pump();
      });
    }
    if (full) for (var w = 0; w < Math.min(3, ids.length); w++) pump();
    D.getInputs(function (devs) { if (devs) S.inputs = devs; fin(); });   // a failed read keeps the last known inputs
  }

  // true when the catalogue has apps the saved scan never checked (e.g. after an update added one)
  function catalogueChanged() {
    if (!S.installed) return false;
    return D.catalog.list.some(function (a) { return !Object.prototype.hasOwnProperty.call(S.installed, a.id); });
  }

  function sameData(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  D.ui = {
    init: function (rows, toastNode) {
      rowsEl = rows; toastEl = toastNode;
      S.favs = D.store.get('favs', D.catalog.defaultFavs.slice());
      rowsEl.addEventListener('click', function (e) {
        var t = e.target; while (t && t !== rowsEl && !(t.className && /\bitem\b/.test(t.className))) t = t.parentNode;
        if (!t || t === rowsEl) return;
        focus(+t.getAttribute('data-r'), +t.getAttribute('data-c'));
        activate();
      });
      var lastMove = 0;
      rowsEl.addEventListener('mousemove', function (e) {
        if (Date.now() - lastMove < 80) return;
        lastMove = Date.now();
        var t = e.target; while (t && t !== rowsEl && !(t.className && /\bitem\b/.test(t.className))) t = t.parentNode;
        if (!t || t === rowsEl) return;
        var r = +t.getAttribute('data-r'), c = +t.getAttribute('data-c');
        if (r !== S.r || c !== S.c[S.r]) focus(r, c);
      });
    },
    // Loads installed apps + inputs, then draws. On refresh, only redraws when something changed.
    reload: function (first, done, force) {
      var before = JSON.stringify([S.installed, S.inputs]);
      var full = !!(first || force || !S.appsTs || Date.now() - S.appsTs > SCAN_TTL || catalogueChanged());
      load(full, function () {
        var changed = first || before !== JSON.stringify([S.installed, S.inputs]);
        var keep = current() ? current().key : null;      // where the user is now, not where they were when loading began
        if (changed) render(keep);
        if (done) done(changed);
      });
    },
    // Draws right away from last run's saved data. Returns false when there is none (first ever start).
    fromCache: function () {
      var c = D.store.get('cache', null);
      if (!c || !c.inputs) return false;
      S.installed = c.installed; S.inputs = c.inputs; S.appsTs = c.appsTs || 0;
      render(null);
      return true;
    },
    summary: function () {
      return S.rows.map(function (r) {
        return r.key + ': ' + r.items.map(function (i) { return i.name + (i.status ? '(' + i.status + ')' : ''); }).join(', ');
      }).join(' | ');
    },
    render: render, key: key, activate: activate, openItem: openItem, longPress: longPress, toast: toast, current: current,
    favs: function () { return S.favs.slice(); },
    // favourites as shown on the home screen (installed and known), for moving cards left/right
    visibleFavs: function () {
      return S.favs.filter(function (id) { return D.catalog.byId[id] && (S.installed === null || !!S.installed[id]); });
    },
    setFavs: function (arr, keepKey) { S.favs = arr.slice(); D.store.set('favs', S.favs); render(keepKey); },
    // key of the item the settings screens should keep focus on
    installed: function (id) { return S.installed === null || !!S.installed[id]; },
    moveScript: function (steps, cb) {
      var i = 0;
      (function next() {
        if (i >= steps.length) { cb(); return; }
        var s = steps[i++];
        key({ keyCode: s });
        setTimeout(next, 380);
      })();
    }
  };
})(window.Dock);
