/**
 * Cabinet Kit — per-game high scores + local player name (localStorage, no backend).
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
  const NAME_KEY = "cabinet-kit-player-name";
  const MAX_NAME_LEN = 20;

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

  function normalizeName(raw) {
    if (raw == null) return "";
    let s = String(raw).replace(/\s+/g, " ").trim();
    if (s.length > MAX_NAME_LEN) s = s.slice(0, MAX_NAME_LEN).trim();
    return s;
  }

  function getPlayerName() {
    const store = storage();
    if (!store) return "";
    try {
      return normalizeName(store.getItem(NAME_KEY) || "");
    } catch (e) {
      return "";
    }
  }

  function setPlayerName(raw) {
    const name = normalizeName(raw);
    if (!name) return { ok: false, name: "" };
    const store = storage();
    if (store) {
      try {
        store.setItem(NAME_KEY, name);
      } catch (e) {}
    }
    return { ok: true, name: name };
  }

  function hasPlayerName() {
    return getPlayerName().length > 0;
  }

  function entryScore(entry) {
    if (entry == null) return 0;
    if (typeof entry === "object" && !Array.isArray(entry)) {
      return toNumber(entry.score);
    }
    return toNumber(entry);
  }

  function entryName(entry) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return normalizeName(entry.name || "");
    }
    return "";
  }

  function get(id) {
    if (id == null || id === "") return 0;
    const map = readMap();
    return entryScore(map[id]);
  }

  function getEntry(id) {
    if (id == null || id === "") return { score: 0, name: "" };
    const map = readMap();
    const entry = map[id];
    return { score: entryScore(entry), name: entryName(entry) };
  }

  function record(id, score) {
    const val = toNumber(score);
    const prev = get(id);
    if (!(val > prev)) {
      return { high: prev, isNew: false };
    }
    const map = readMap();
    const player = getPlayerName();
    if (player) {
      map[String(id)] = { score: val, name: player };
    } else {
      map[String(id)] = val;
    }
    writeMap(map);
    return { high: val, isNew: true, name: player || "" };
  }

  return {
    KEY: KEY,
    NAME_KEY: NAME_KEY,
    MAX_NAME_LEN: MAX_NAME_LEN,
    normalizeName: normalizeName,
    getPlayerName: getPlayerName,
    setPlayerName: setPlayerName,
    hasPlayerName: hasPlayerName,
    get: get,
    getEntry: getEntry,
    record: record,
  };
});
