(function (global) {
  const configuredBase = String(global.__PULSE_API_BASE__ || "").trim();
  const apiBase = configuredBase.endsWith("/") ? configuredBase.slice(0, -1) : configuredBase;

  global.__PULSE_API_BASE__ = apiBase;
  global.PulseApi = {
    isNative: global.location.protocol === "capacitor:" || global.location.protocol === "ionic:",
    buildUrl(pathname) {
      const path = String(pathname || "");
      if (/^https?:\/\//i.test(path) || !apiBase) {
        return path;
      }
      return path.startsWith("/") ? `${apiBase}${path}` : `${apiBase}/${path}`;
    },
    fetch(pathname, options) {
      return global.fetch(this.buildUrl(pathname), { credentials: "include", ...options });
    }
  };
})(window);
