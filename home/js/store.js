// Saved settings. localStorage can be missing or throw (private modes, previews), so everything is guarded.
(function (D) {
  var mem = {};
  function key(k) { return 'dock.' + k; }
  D.store = {
    get: function (k, dflt) {
      try {
        var raw = window.localStorage.getItem(key(k));
        if (raw !== null) return JSON.parse(raw);
      } catch (e) { /* fall through to memory */ }
      return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : dflt;
    },
    set: function (k, v) {
      mem[k] = v;
      try { window.localStorage.setItem(key(k), JSON.stringify(v)); } catch (e) { /* memory copy still works this session */ }
    }
  };
})(window.Dock);
