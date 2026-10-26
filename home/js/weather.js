// Weather by the clock, and the scene's weather (clouds, rain rings on the water, distant flashes).
// Open-Meteo, free for personal use, no key; data CC BY 4.0 (credited in Dock Settings > About).
// One request every 30 minutes; the last good reading is kept for up to 3 hours if the internet drops.
(function (D) {
  var el = null, timer = null, last = null, inFlight = false, fails = 0, paused = false;
  var REFRESH = 30 * 60 * 1000, KEEP = 3 * 3600 * 1000;
  var NAMES = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog',
    51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
    71: 'Snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers',
    85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorms', 96: 'Thunderstorms', 99: 'Thunderstorms' };

  // WMO code -> what the scene should show
  function sceneWeather(w) {
    var c = w.code, precip = 'none', sky = 'clear';
    if (c >= 95) precip = 'storm';
    else if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) precip = 'rain';
    if (c === 2) sky = 'partly';
    else if (c === 3 || c === 45 || c === 48 || precip !== 'none' || (c >= 71 && c <= 86)) sky = 'overcast';
    return { sky: sky, precip: precip, wind: Math.max(0, Math.min(1, (w.wind - 8) / 20)) };
  }

  function show() {
    var on = D.store.get('weatherOn', true);
    var fresh = last && Date.now() - last.ts < KEEP;
    var text = on && fresh ? Math.round(last.temp) + '°  ' + (NAMES[last.code] || '') : '';
    if (el) el.textContent = text;
    var idle = document.getElementById('iwx');
    if (idle) idle.textContent = text;
    if (window.Scene) window.Scene.setWeather(on && fresh ? sceneWeather(last) : { sky: 'clear', precip: 'none', wind: 0 });
  }

  function fetchNow() {
    if (inFlight || !D.store.get('weatherOn', true)) return;
    inFlight = true;
    var c = D.CONFIG.weather;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon +
      '&current=temperature_2m,weather_code,is_day,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph';
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    fetch(url, ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var cur = j && j.current;
        if (!cur || typeof cur.temperature_2m !== 'number') throw new Error('no current');
        last = { ts: Date.now(), temp: cur.temperature_2m, code: cur.weather_code, wind: cur.wind_speed_10m || 0 };
        fails = 0;
        D.store.set('weather', last);
        D.log('INFO', 'weather', last);
      })
      .catch(function (e) { fails++; D.log('INFO', 'weather failed', String(e && e.message || e)); })
      .then(function () { clearTimeout(to); inFlight = false; show(); schedule(); });
  }

  // One timer, re-armed only when a request finishes (or on start/resume/turn-on): a reading every 30 minutes,
  // and after failures a growing wait (1, 2, 4 ... 30 minutes). Nothing runs while hidden or switched off.
  function schedule() {
    clearTimeout(timer); timer = null;
    if (paused || !D.store.get('weatherOn', true)) return;
    var due = last ? REFRESH - (Date.now() - last.ts) : 2000;
    if (fails) due = Math.max(due, Math.min(REFRESH, 60000 * Math.pow(2, fails - 1)));
    timer = setTimeout(fetchNow, Math.max(2000, due));
  }

  D.weather = {
    init: function (node) { el = node; last = D.store.get('weather', null); show(); schedule(); },
    pause: function () { paused = true; clearTimeout(timer); timer = null; },
    resume: function () { paused = false; schedule(); },
    enabled: function () { return D.store.get('weatherOn', true); },
    setEnabled: function (on) { D.store.set('weatherOn', !!on); show(); if (on) fetchNow(); else { clearTimeout(timer); timer = null; } },
    text: function () { return el ? el.textContent : ''; }
  };
})(window.Dock);
