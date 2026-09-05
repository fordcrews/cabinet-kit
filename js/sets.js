/**
 * Cabinet Kit — Game Sets (balanced multi-game sittings).
 * Browser: window.CabinetSets. Node: module.exports.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.CabinetSets = api;
  } else if (typeof globalThis !== "undefined") {
    globalThis.CabinetSets = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BOARDS_KEY = "cabinet-kit-set-boards";
  const DEFAULT_SCALE = 1000;

  let parity = {
    scale: DEFAULT_SCALE,
    games: {},
  };

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

  function toNumber(n) {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  }

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  /** Pure: setPoints(raw, par, scale) = clamp(round((raw / par) * scale), 0, scale) */
  function setPoints(raw, par, scale) {
    const r = toNumber(raw);
    const p = toNumber(par);
    const s = toNumber(scale);
    const scaleSafe = s > 0 ? s : DEFAULT_SCALE;
    if (!(p > 0)) return 0;
    if (!(r > 0)) return 0;
    return clamp(Math.round((r / p) * scaleSafe), 0, scaleSafe);
  }

  function setParity(data) {
    if (!data || typeof data !== "object") return parity;
    const next = {
      scale: toNumber(data.scale) > 0 ? toNumber(data.scale) : DEFAULT_SCALE,
      games: {},
    };
    const src = data.games && typeof data.games === "object" ? data.games : {};
    Object.keys(src).forEach(function (id) {
      const row = src[id];
      if (row && typeof row === "object") {
        next.games[id] = { par: toNumber(row.par) };
      } else {
        next.games[id] = { par: toNumber(row) };
      }
    });
    parity = next;
    return parity;
  }

  function getParity() {
    return parity;
  }

  function parFor(gameId) {
    const row = parity.games && parity.games[gameId];
    if (!row) return 0;
    return toNumber(row.par);
  }

  function normalize(gameId, rawScore) {
    return setPoints(rawScore, parFor(gameId), parity.scale || DEFAULT_SCALE);
  }

  function defaultRng() {
    return Math.random();
  }

  /**
   * Pick `size` unique catalog ids (size 3|4|5).
   * Optional avoidOrder: if the shuffled pick matches that exact order, reshuffle once.
   */
  function pickSet(size, catalogIds, rng, avoidOrder) {
    const n = Number(size);
    const pool = Array.isArray(catalogIds) ? catalogIds.slice() : [];
    const roll = typeof rng === "function" ? rng : defaultRng;
    if (!(n === 3 || n === 4 || n === 5)) return [];
    if (pool.length < n) return [];

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(roll() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    }

    function sameOrder(a, b) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }

    let picked = shuffle(pool).slice(0, n);
    if (avoidOrder && sameOrder(picked, avoidOrder)) {
      picked = shuffle(pool).slice(0, n);
    }
    return picked;
  }

  function emptyBoards() {
    return { "3": [], "4": [], "5": [] };
  }

  function readBoards() {
    const store = storage();
    if (!store) return emptyBoards();
    try {
      const raw = store.getItem(BOARDS_KEY);
      if (!raw) return emptyBoards();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return emptyBoards();
      }
      const out = emptyBoards();
      ["3", "4", "5"].forEach(function (k) {
        if (Array.isArray(parsed[k])) out[k] = parsed[k].slice();
      });
      return out;
    } catch (e) {
      return emptyBoards();
    }
  }

  function writeBoards(boards) {
    const store = storage();
    if (!store) return;
    try {
      store.setItem(BOARDS_KEY, JSON.stringify(boards));
    } catch (e) {}
  }

  function listBoards(size) {
    const key = String(size);
    const boards = readBoards();
    const list = Array.isArray(boards[key]) ? boards[key].slice() : [];
    list.sort(function (a, b) {
      return toNumber(b.total) - toNumber(a.total);
    });
    return list.slice(0, 3);
  }

  /**
   * Insert entry, keep top 3 by total desc.
   * Returns { boards, rank } where rank is 1–3 or 0 if not on the board.
   */
  function recordBoard(size, entry) {
    const key = String(size);
    const boards = readBoards();
    const list = Array.isArray(boards[key]) ? boards[key].slice() : [];
    const row = {
      total: toNumber(entry && entry.total),
      parts: entry && Array.isArray(entry.parts) ? entry.parts.slice() : [],
      at: (entry && entry.at) || new Date().toISOString(),
      size: toNumber(size),
    };
    list.push(row);
    list.sort(function (a, b) {
      return toNumber(b.total) - toNumber(a.total);
    });
    const kept = list.slice(0, 3);
    boards[key] = kept;
    writeBoards(boards);

    let rank = 0;
    for (let i = 0; i < kept.length; i++) {
      if (kept[i] === row || (kept[i].at === row.at && kept[i].total === row.total)) {
        rank = i + 1;
        break;
      }
    }
    // Fallback: match by reference failed after slice copies — find by at+total
    if (!rank) {
      for (let i = 0; i < kept.length; i++) {
        if (kept[i].at === row.at && kept[i].total === row.total && kept[i].size === row.size) {
          rank = i + 1;
          break;
        }
      }
    }
    return { boards: boards, rank: rank };
  }

  return {
    BOARDS_KEY: BOARDS_KEY,
    setPoints: setPoints,
    setParity: setParity,
    getParity: getParity,
    normalize: normalize,
    pickSet: pickSet,
    listBoards: listBoards,
    recordBoard: recordBoard,
    readBoards: readBoards,
  };
});
