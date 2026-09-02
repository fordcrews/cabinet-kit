/**
 * Cabinet Kit — per-game high scores (localStorage, no backend).
 * Browser: window.CabinetScores. Node: module.exports.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.CabinetScores = api;
  } else if (typeof globalThis !== "undefined") {
    globalThis.CabinetScores = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const KEY = "cabinet-kit-highscores";

  function storage() {
    try {
      if (typeof localStorage !== "undefined") return localStorage;
    } catch (e) {}
    try {
      if (typeof globalThis !== "undefined" && globalThis.localStorage) {
        return globalThis.localStorage;
      }
    } catch (e) {}
    return null;
  }

  function readMap() {
    const store = storage();
    if (!store) return {};
    try {
      const raw = store.getItem(KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return parsed;
    } catch (e) {
      return {};
    }
  }

  function writeMap(map) {
    const store = storage();
    if (!store) return;
    try {
      store.setItem(KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function toNumber(n) {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  }

  function get(id) {
    if (id == null || id === "") return 0;
    const map = readMap();
    return toNumber(map[id]);
  }

  function record(id, score) {
    const val = toNumber(score);
    const prev = get(id);
    if (!(val > prev)) {
      return { high: prev, isNew: false };
    }
    const map = readMap();
    map[String(id)] = val;
    writeMap(map);
    return { high: val, isNew: true };
  }

  return {
    KEY: KEY,
    get: get,
    record: record,
  };
});
