// Overlay screens: the long-press menu and Dock Settings. Back (or Esc in a desktop browser) closes the top screen.
// Each screen is a plain list: Up/Down to move, OK to act, Left/Right to change a value.
(function (D) {
  var root, panel, stack = [];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function items(def) { return typeof def.build === 'function' ? def.build() : def.items; }

  function render() {
    var def = stack[stack.length - 1];
    if (!def) { root.hidden = true; root.innerHTML = ''; return; }
    var list = items(def);
    def.index = Math.max(0, Math.min(def.index || 0, list.length - 1));
    var html = '<div class="panel"><h1>' + esc(def.title) + '</h1><div class="lw"><div class="list">';
    list.forEach(function (it, i) {
      html += '<div class="li' + (it.info ? ' info' : '') + (i === def.index ? ' on' : '') + '" data-i="' + i + '"><span class="lb">' + esc(it.label) + '</span>' +
        (it.value !== undefined ? '<span class="vl">' + esc(it.value) + '</span>' : '') + '</div>';
    });
    html += '</div></div><div class="hint">' + esc(def.hint || 'OK to choose   Back to close') + '</div></div>';
    root.innerHTML = html;
    root.hidden = false;
    keepInView(def);
  }

  // Long lists (like Edit Favourites) scroll inside the panel so the chosen row is always on screen.
  function keepInView(def) {
    var box = root.querySelector('.list'), wrap = root.querySelector('.lw'), on = root.querySelector('.li.on');
    if (!box || !on) return;
    var max = box.scrollHeight - box.clientHeight;
    if (max <= 0) { wrap.className = 'lw'; return; }
    var top = on.offsetTop - (box.clientHeight - on.offsetHeight) / 2;     // keep the selection near the middle
    box.scrollTop = Math.max(0, Math.min(max, top));
    wrap.className = 'lw' + (box.scrollTop > 2 ? ' up' : '') + (box.scrollTop < max - 2 ? ' down' : '');
  }

  function show(def) {
    stack.push(def);
    try { history.pushState({ dock: stack.length }, ''); } catch (e) { /* history unavailable */ }
    render();
  }

  function closeTo(depth) {
    while (stack.length > depth) stack.pop();
    render();
  }

  function selectable(def, dir) {
    var list = items(def), i = def.index || 0, n = list.length, guard = 0;
    do { i = (i + dir + n) % n; guard++; } while (list[i].info && guard <= n);
    def.index = i;
  }

  function act(def, which) {
    var it = items(def)[def.index || 0];
    if (!it || it.info) return;
    var fn = which === 'ok' ? it.onOk : which === 'left' ? it.onLeft : it.onRight;
    if (fn) fn(def, it);
    render();
  }

  // ----- screens -----
  function favEditor() {
    return {
      title: 'Edit Favourites', hint: 'OK add or remove    Left / Right move earlier or later    Back to close', index: 0,
      build: function () {
        var favs = D.ui.favs(), cat = D.catalog, out = [];
        var shown = favs.filter(function (id) { return !!cat.byId[id]; });
        shown.forEach(function (id, n) {
          out.push({ key: id, label: cat.byId[id].name, value: '★ ' + (n + 1) + (D.ui.installed(id) ? '' : '  (not installed)'),
            onOk: function (def) { D.ui.setFavs(favs.filter(function (x) { return x !== id; })); stay(def, id); },
            onLeft: function (def) { shift(def, id, -1, shown); }, onRight: function (def) { shift(def, id, 1, shown); } });
        });
        cat.list.filter(function (a) { return favs.indexOf(a.id) < 0 && D.ui.installed(a.id); })
          .sort(function (a, b) { return a.name < b.name ? -1 : 1; })
          .forEach(function (a) {
            out.push({ key: a.id, label: a.name, value: 'in Apps',
              onOk: function (def) { D.ui.setFavs(favs.concat([a.id])); stay(def, a.id); } });
          });
        return out;
      }
    };
  }
  function stay(def, id) { var l = items(def); for (var i = 0; i < l.length; i++) if (l[i].key === id) def.index = i; }
  // Swap with the neighbour in the list the user is looking at (hidden favourites are skipped over).
  function shift(def, id, dir, shownList) {
    var favs = D.ui.favs(), k = shownList.indexOf(id), other = shownList[k + dir];
    if (k < 0 || other === undefined) return;
    var i = favs.indexOf(id), j = favs.indexOf(other);
    favs[i] = other; favs[j] = id;
    D.ui.setFavs(favs, 'app:' + id);
    stay(def, id);
  }

  function cycleBackdrop(dir) {
    var order = ['auto', 2, 1, 0], cur = D.backdrop.mode(), i = order.indexOf(cur);
    D.backdrop.setMode(order[(i + dir + order.length) % order.length]);
  }
  function backdropText() {
    var m = D.backdrop.mode();
    return m === 'auto' ? 'Auto (' + D.backdrop.levelName() + ')' : D.backdrop.levelName(+m);
  }

  function settings() {
    return {
      title: 'Dock Settings', index: 0,
      build: function () {
        return [
          { label: 'Edit favourites', onOk: function () { show(favEditor()); } },
          { label: 'Clock time zone', value: D.clock.zoneMode() === 'tv' || !D.CONFIG.timeZone ? "TV's setting" : D.CONFIG.timeZone,
            onOk: function () { D.clock.setZoneMode(D.clock.zoneMode() === 'tv' ? 'cfg' : 'tv'); },
            onLeft: function () { D.clock.setZoneMode(D.clock.zoneMode() === 'tv' ? 'cfg' : 'tv'); },
            onRight: function () { D.clock.setZoneMode(D.clock.zoneMode() === 'tv' ? 'cfg' : 'tv'); } },
          { label: 'Backdrop animation', value: backdropText(),
            onOk: function () { cycleBackdrop(1); }, onLeft: function () { cycleBackdrop(-1); }, onRight: function () { cycleBackdrop(1); } },
          { label: 'Weather by the clock', value: D.weather.enabled() ? 'On' : 'Off',
            onOk: function () { D.weather.setEnabled(!D.weather.enabled()); },
            onLeft: function () { D.weather.setEnabled(!D.weather.enabled()); },
            onRight: function () { D.weather.setEnabled(!D.weather.enabled()); } },
          { label: 'Idle clock', value: D.idle.minutes() ? 'after ' + D.idle.minutes() + ' min' : 'Off',
            onOk: function () { D.idle.setMinutes(D.idle.minutes() ? 0 : D.CONFIG.idleMinutes); },
            onLeft: function () { D.idle.setMinutes(D.idle.minutes() ? 0 : D.CONFIG.idleMinutes); },
            onRight: function () { D.idle.setMinutes(D.idle.minutes() ? 0 : D.CONFIG.idleMinutes); } },
          { label: 'Sounds', value: D.sound.enabled() ? 'On (quiet)' : 'Off',
            onOk: function () { D.sound.setEnabled(!D.sound.enabled()); },
            onLeft: function () { D.sound.setEnabled(!D.sound.enabled()); },
            onRight: function () { D.sound.setEnabled(!D.sound.enabled()); } },
          { label: 'Little visitors', value: D.backdrop.visitors() ? 'On' : 'Off',
            onOk: function () { D.backdrop.setVisitors(!D.backdrop.visitors()); },
            onLeft: function () { D.backdrop.setVisitors(!D.backdrop.visitors()); },
            onRight: function () { D.backdrop.setVisitors(!D.backdrop.visitors()); } },
          { label: 'Casting from a phone', value: 'how-to', onOk: function () { show(cast()); } },
          { label: 'Run speed test', value: '10 seconds', onOk: function () { D.screens.speedTest(); } },
          { label: 'Refresh app list', value: 'after installing a new app', onOk: function () { D.ui.reload(false, function () { D.ui.toast('App list refreshed'); }, true); } },
          { label: 'Restore default favourites', onOk: function () { D.ui.setFavs(D.catalog.defaultFavs.slice()); D.ui.toast('Favourites restored'); } },
          { label: 'About', onOk: function () { show(about()); } }
        ];
      }
    };
  }

  function about() {
    var info = { model: '…', fw: '…', os: '…' };
    var def = {
      title: 'About Dock', hint: 'Back to close', index: 0,
      build: function () {
        return [
          { info: true, label: 'Version', value: D.CONFIG.version },
          { info: true, label: 'TV', value: info.model },
          { info: true, label: 'Software / webOS', value: info.fw + ' / ' + info.os },
          { info: true, label: 'Backdrop level', value: D.backdrop.levelName() },
          { info: true, label: 'Runs as', value: 'a Developer Mode app (renew it in the Developer Mode app)' },
          { info: true, label: D.LOGO_CREDIT || 'Logos: none' },
          { info: true, label: 'Weather data: Open-Meteo.com (CC BY 4.0)' }
        ];
      }
    };
    D.getSystemInfo(function (o) {
      if (o && o.returnValue !== false) { info.model = o.modelName || '?'; info.fw = o.firmwareVersion || '?'; info.os = o.sdkVersion || '?'; }
      else { info.model = 'unavailable'; info.fw = '-'; info.os = '-'; }
      if (stack[stack.length - 1] === def) render();
    });
    return def;
  }

  // AirPlay and screen sharing are built into the TV and start from the phone; there is no app to open for them.
  function cast() {
    var name = D.CONFIG.tvName || 'your TV';
    var lines = [
      'iPhone or iPad (AirPlay): open Control Center, tap Screen Mirroring, then pick "' + name + '". The AirPlay tile opens the TV side.',
      'Android (Smart View or Cast): pick the same TV name.',
      'The phone and the TV must be on the same Wi-Fi, and the TV must be on.',
      'If the TV does not show up, open TV Settings and look under Connection for AirPlay and Screen Share.'
    ];
    return {
      title: 'Cast to this TV', hint: 'Back to close', index: lines.length,
      build: function () {
        var out = lines.map(function (t) { return { info: true, label: t }; });
        out.push({ label: 'Open TV Settings', onOk: function () { history.back(); D.launch('com.palm.app.settings'); } });
        return out;
      }
    };
  }

  function menu(item) {
    var def = {
      title: item.name, hint: 'OK choose    Back to close', index: 0,
      build: function () {
        var favs = D.ui.favs(), vis = D.ui.visibleFavs(), i = vis.indexOf(item.id), out = [];
        if (favs.indexOf(item.id) < 0) out.push({ label: 'Add to Favourites', onOk: function () { D.ui.setFavs(favs.concat([item.id]), item.key); history.back(); } });
        else {
          out.push({ label: 'Remove from Favourites', onOk: function () { D.ui.setFavs(favs.filter(function (x) { return x !== item.id; })); history.back(); } });
          if (i > 0) out.push({ label: 'Move left', onOk: function (d) { shift(d, item.id, -1, vis); d.index = 0; } });
          if (i >= 0 && i < vis.length - 1) out.push({ label: 'Move right', onOk: function (d) { shift(d, item.id, 1, vis); d.index = 0; } });
        }
        out.push({ label: 'Open ' + item.name, onOk: function () { history.back(); D.ui.openItem(item); } });
        return out;
      }
    };
    return def;
  }

  D.screens = {
    init: function (rootEl) {
      root = rootEl;
      root.addEventListener('click', function (e) {
        var t = e.target, inPanel = false;
        while (t && t !== root && !(t.className && /\bli\b/.test(t.className))) {
          if (t.className && /\bpanel\b/.test(t.className)) inPanel = true;
          t = t.parentNode;
        }
        var def = stack[stack.length - 1];
        if (!def) return;
        if (!t || t === root) { if (!inPanel) history.back(); return; }   // only a click outside the panel closes it
        def.index = +t.getAttribute('data-i');
        act(def, 'ok');
      });
      window.addEventListener('popstate', function (e) {
        var depth = e.state && typeof e.state.dock === 'number' ? e.state.dock : 0;
        closeTo(depth);
      });
      try { history.replaceState({ dock: 0 }, ''); } catch (e) { /* ignore */ }
    },
    isOpen: function () { return stack.length > 0; },
    key: function (e) {
      var def = stack[stack.length - 1], k = e.keyCode;
      if (!def) return false;
      if (k === 38) { selectable(def, -1); render(); D.sound.play('move'); }
      else if (k === 40) { selectable(def, 1); render(); D.sound.play('move'); }
      else if (k === 37) act(def, 'left');
      else if (k === 39) act(def, 'right');
      else if (k === 27) history.back();
      return true;
    },
    ok: function () { var def = stack[stack.length - 1]; if (def) act(def, 'ok'); },
    openMenu: function (item) { show(menu(item)); },
    openSettings: function () { show(settings()); },
    openCast: function () { show(cast()); },
    closeAll: function () { if (stack.length) history.go(-stack.length); },
    speedTest: function () {
      D.screens.closeAll();
      var steps = [39, 39, 39, 39, 37, 37, 37, 37, 40, 39, 39, 38, 40, 40, 38, 38, 39, 39, 37, 37, 40, 38];
      setTimeout(function () {
        D.ui.toast('Speed test running…', 12000);
        D.perf.sample(8800, function (r) {
          var msg = 'Speed test: ' + r.fps + ' fps while moving, ' + r.slow + ' slow frames of ' + r.frames + ', worst ' + r.max + ' ms';
          D.log('INFO', 'speed test', { r: r, level: D.backdrop.level() });
          D.ui.toast(msg, 9000);
        });
        D.ui.moveScript(steps, function () {});
      }, 500);
    }
  };
})(window.Dock);
