/**
 * Cabinet Kit — online scores via Supabase REST (anon key, fail-soft).
 * Browser: window.CabinetOnline. Node: module.exports.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.CabinetOnline = api;
  } else if (typeof globalThis !== "undefined") {
    globalThis.CabinetOnline = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SUPABASE_URL = "https://gfpoxhrdsatnbmjyiqkm.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcG94aHJkc2F0bmJtanlpcWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NzYyNjMsImV4cCI6MjEwNDI1MjI2M30.yGeLkki30tuTKVPlQKuBH3waXY769Y9NF6GbGLaJmhM";

  function headers(extra) {
    const h = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };
    if (extra) {
      for (const k in extra) h[k] = extra[k];
    }
    return h;
  }

  function normalizeName(raw) {
    if (raw == null) return "";
    let s = String(raw).replace(/\s+/g, " ").trim();
    if (s.length > 20) s = s.slice(0, 20).trim();
    return s;
  }

  function toScore(n) {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  }

  function restFetch(path, opts) {
    opts = opts || {};
    const url = SUPABASE_URL + "/rest/v1/" + path;
    const init = {
      method: opts.method || "GET",
      headers: headers(opts.headers),
    };
    if (opts.body != null) init.body = JSON.stringify(opts.body);
    return fetch(url, init).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          const err = new Error(t || res.statusText || "request failed");
          err.status = res.status;
          throw err;
        });
      }
      if (res.status === 204) return null;
      const ct = res.headers.get("content-type") || "";
      if (ct.indexOf("application/json") >= 0) return res.json();
      return res.text();
    });
  }

  /**
   * Insert a score. Fail-soft: resolves { ok:false } on network/RLS errors.
   */
  function submitScore(gameId, playerName, score) {
    const gid = gameId == null ? "" : String(gameId);
    const name = normalizeName(playerName);
    const val = toScore(score);
    if (!gid || !name || !(val > 0)) {
      return Promise.resolve({ ok: false, reason: "invalid" });
    }
    return restFetch("game_scores", {
      method: "POST",
      body: { game_id: gid, player_name: name, score: val },
    })
      .then(function () {
        return { ok: true };
      })
      .catch(function (err) {
        return { ok: false, error: String((err && err.message) || err) };
      });
  }

  function topScores(gameId, limit) {
    const gid = gameId == null ? "" : String(gameId);
    const lim = Math.min(Math.max(Number(limit) || 10, 1), 50);
    if (!gid) return Promise.resolve([]);
    const q =
      "game_scores?select=player_name,score,created_at&game_id=eq." +
      encodeURIComponent(gid) +
      "&order=score.desc&limit=" +
      lim;
    return restFetch(q, {
      headers: { Prefer: "return=representation" },
    })
      .then(function (rows) {
        return Array.isArray(rows) ? rows : [];
      })
      .catch(function () {
        return [];
      });
  }

  function friendBoard(limit) {
    const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const q =
      "player_stats?select=player_name,games_played,total_score,best_score,last_played_at&order=total_score.desc&limit=" +
      lim;
    return restFetch(q, {
      headers: { Prefer: "return=representation" },
    })
      .then(function (rows) {
        return Array.isArray(rows) ? rows : [];
      })
      .catch(function () {
        return [];
      });
  }

  return {
    SUPABASE_URL: SUPABASE_URL,
    submitScore: submitScore,
    topScores: topScores,
    friendBoard: friendBoard,
    normalizeName: normalizeName,
  };
});
