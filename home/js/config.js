// Dock: shared settings and namespace. Plain ES2017 only: the webOS 6 engine is Chromium 79 (no ?., ??, flex gap, inset).
window.Dock = window.Dock || {};
Dock.CONFIG = {
  version: '1.0.3',
  // Clock time zone (IANA name, e.g. 'America/Chicago'). null = use the TV's own time zone setting.
  // Set this if your TV's time zone is wrong; Dock Settings can switch between the two.
  timeZone: null,
  // YOUR location, rounded to about 0.1 degree: drives the weather and the scene's sunrise/sunset.
  // The default is an example (New York City) - change it.
  weather: { lat: 40.7, lon: -74.0, label: 'New York, NY' },
  idleMinutes: 15,
  sounds: { enabled: true, volume: 0.2 },
  // The name phones show when casting (see the TV's own network/device name). '' = say "your TV".
  tvName: '',
  // Startup: draw the rows first from last run's saved data, then bring the backdrop animation in step by step.
  stagedStart: true,
  rotateMs: 3 * 60 * 1000,
  fadeMs: 1500,
  // Development builds report errors and speed-test results to the PC. Removed from the final build.
  debugLogger: null
};

Dock.log = function (status, key, detail) {
  if (!Dock.CONFIG.debugLogger) return;
  try {
    var d = typeof detail === 'string' ? detail : JSON.stringify(detail);
    fetch(Dock.CONFIG.debugLogger, {
      method: 'POST', mode: 'no-cors',
      body: JSON.stringify({ run: 0, t: new Date().toISOString(), status: status, key: key, detail: (d || '').slice(0, 700) })
    }).catch(function () {});
  } catch (e) { /* logger is optional */ }
};

window.addEventListener('error', function (e) { Dock.log('FAIL', 'js error', e.message + ' @' + e.filename + ':' + e.lineno); });
