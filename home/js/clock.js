// Clock and date. Follows the TV's 12/24-hour setting; the time zone is the configured one or the TV's own.
(function (D) {
  var timeEl, dateEl, h12 = true, tz = null, last = '';
  var fTime, fDate;

  function build() {
    var opt = tz ? { timeZone: tz } : {};
    try {
      fTime = new Intl.DateTimeFormat('en-US', Object.assign({ hour: 'numeric', minute: '2-digit', hour12: h12 }, opt));
      fDate = new Intl.DateTimeFormat('en-US', Object.assign({ weekday: 'long', month: 'long', day: 'numeric' }, opt));
    } catch (e) {
      // time zone data missing: fall back to the TV's own zone
      D.log('INFO', 'clock', 'Intl time zone failed, using TV zone: ' + e);
      fTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: h12 });
      fDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
    last = '';
    tick();
  }

  function tick() {
    var now = new Date(), parts = fTime.formatToParts(now), hh = '', mm = '', ap = '', i;
    for (i = 0; i < parts.length; i++) {
      if (parts[i].type === 'hour') hh = parts[i].value;
      else if (parts[i].type === 'minute') mm = parts[i].value;
      else if (parts[i].type === 'dayPeriod') ap = parts[i].value;
    }
    var key = hh + ':' + mm + ap;
    if (key === last) return;
    last = key;
    timeEl.innerHTML = '';
    timeEl.appendChild(document.createTextNode(hh + ':' + mm));
    if (ap) { var s = document.createElement('span'); s.className = 'ap'; s.textContent = ap; timeEl.appendChild(s); }
    dateEl.textContent = fDate.format(now);
    var it = document.getElementById('itime'), id = document.getElementById('idate');   // the idle clock mirrors it
    if (it) it.innerHTML = timeEl.innerHTML;
    if (id) id.textContent = dateEl.textContent;
  }

  D.clock = {
    init: function (t, d) { timeEl = t; dateEl = d; tz = D.store.get('tz', 'cfg') === 'tv' ? null : D.CONFIG.timeZone; build(); setInterval(tick, 1000); },
    setH12: function (v) { h12 = v; build(); },
    // 'cfg' = the configured zone, 'tv' = whatever the TV is set to
    setZoneMode: function (mode) { D.store.set('tz', mode); tz = mode === 'tv' ? null : D.CONFIG.timeZone; build(); },
    zoneMode: function () { return D.store.get('tz', 'cfg'); }
  };
})(window.Dock);
