// Luna service calls (webOS system bus) through PalmServiceBridge, with a small mock so the page also runs in a desktop browser.
(function (D) {
  var hasBridge = typeof window.PalmServiceBridge !== 'undefined';
  D.isTV = hasBridge;

  var MOCK_MISSING = { 'com.movenetworks.app.sling-tv-sling-production': 1, 'com.webos.app.discovery': 1 };
  function mock(uri, p) {
    if (/getAppLoadStatus/.test(uri)) return { returnValue: true, exist: !MOCK_MISSING[p.appId] };
    if (/getAllInputStatus/.test(uri)) {
      return { returnValue: true, devices: [
        { id: 'HDMI_1', label: 'HDMI 1', port: 1, connected: true, hdmiPlugIn: false, appId: 'com.webos.app.hdmi1' },
        { id: 'HDMI_2', label: 'Game console', port: 2, connected: true, hdmiPlugIn: true, appId: 'com.webos.app.hdmi2' }
      ] };
    }
    if (/getPreferences/.test(uri)) return { returnValue: true, timeFormat: 'HH12' };
    if (/getSystemInfo/.test(uri)) return { returnValue: true, modelName: 'MOCK TV', firmwareVersion: '0.0', sdkVersion: '0.0' };
    if (/launch/.test(uri)) return { returnValue: true };
    return { returnValue: false, errorText: 'mock: unknown ' + uri };
  }

  // One call; cb fires exactly once with the parsed reply or {returnValue:false, error:...}.
  D.luna = function (uri, params, cb) {
    var finished = false, bridge = null, timer = null;
    function done(o) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { if (bridge && bridge.cancel) bridge.cancel(); } catch (e) { /* ignore */ }
      try { cb(o); } catch (e) { D.log('FAIL', 'luna callback', String(e)); }
    }
    timer = setTimeout(function () { done({ returnValue: false, error: 'timeout' }); }, 6000);
    if (!hasBridge) { setTimeout(function () { done(mock(uri, params || {})); }, 25); return; }
    try {
      bridge = new window.PalmServiceBridge();
      bridge.onservicecallback = function (msg) {
        var o;
        try { o = JSON.parse(msg); } catch (e) { o = { returnValue: false, error: 'bad reply' }; }
        done(o);
      };
      bridge.call(uri, JSON.stringify(params || {}));
    } catch (e) {
      done({ returnValue: false, error: 'exception ' + e });
    }
  };

  D.launch = function (id, cb) {
    D.luna('luna://com.webos.applicationManager/launch', { id: id }, cb || function () {});
  };

  D.isInstalled = function (id, cb) {
    D.luna('luna://com.webos.applicationManager/getAppLoadStatus', { appId: id }, function (o) {
      cb(o.returnValue === false ? null : o.exist === true);
    });
  };

  D.getInputs = function (cb) {
    D.luna('luna://com.webos.service.eim/getAllInputStatus', {}, function (o) {
      cb(o && o.devices ? o.devices : null);
    });
  };

  D.getTimeFormat = function (cb) {
    D.luna('luna://com.palm.systemservice/getPreferences', { keys: ['timeFormat'] }, function (o) { cb(o && o.timeFormat); });
  };

  D.getSystemInfo = function (cb) {
    D.luna('luna://com.webos.service.tv.systemproperty/getSystemInfo', { keys: ['modelName', 'firmwareVersion', 'sdkVersion'] }, cb);
  };
})(window.Dock);
