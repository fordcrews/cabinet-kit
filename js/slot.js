/**
 * Cabinet Kit — game-slot host. Drop-in canvas / custom JS modules.
 * Browser: window.CabinetSlot. Node: module.exports helpers.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.CabinetSlot = api;
    window.CabinetSlotGames = window.CabinetSlotGames || {};
  } else if (typeof globalThis !== "undefined") {
    globalThis.CabinetSlot = api;
    globalThis.CabinetSlotGames = globalThis.CabinetSlotGames || {};
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const scriptCache = Object.create(null);
  const cssCache = Object.create(null);

  let active = null;
  let activeHandle = null;
  let hostUi = null;
  let hostDef = null;
  let scoreValue = 0;
  let statusValue = "idle";
  let doneRecorded = false;

  function resolveModulePath(def) {
    if (!def) return "games/unknown/game.js";
    if (def.module) return String(def.module).replace(/^\.\//, "");
    const id = def.id || "unknown";
    return "games/" + id + "/game.js";
  }

  function resolveCssPath(def) {
    if (!def || !def.css) return null;
    return String(def.css).replace(/^\.\//, "");
  }

  function loadScript(url) {
    if (scriptCache[url]) return scriptCache[url];
    scriptCache[url] = new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = function () {
        resolve(url);
      };
      s.onerror = function () {
        delete scriptCache[url];
        reject(new Error("Could not load " + url));
      };
      document.head.appendChild(s);
    });
    return scriptCache[url];
  }

  function loadCss(url) {
    if (!url || cssCache[url]) return Promise.resolve(url);
    cssCache[url] = true;
    return new Promise(function (resolve) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.onload = function () {
        resolve(url);
      };
      link.onerror = function () {
        resolve(url);
      };
      document.head.appendChild(link);
    });
  }

  function gamesRegistry() {
    if (typeof window !== "undefined") {
      window.CabinetSlotGames = window.CabinetSlotGames || {};
      return window.CabinetSlotGames;
    }
    globalThis.CabinetSlotGames = globalThis.CabinetSlotGames || {};
    return globalThis.CabinetSlotGames;
  }

  function getModule(id) {
    const reg = gamesRegistry();
    return reg[id] || null;
  }

  function paintScore() {
    if (!hostUi || !hostUi.scoreValue) return;
    hostUi.scoreValue.textContent = String(scoreValue);
  }

  function paintBest() {
    if (!hostDef || !hostUi || !hostUi.scoreBest) return;
    if (!window.CabinetScores) return;
    const high = window.CabinetScores.get(hostDef.id);
    hostUi.scoreBest.textContent = high > 0 ? "BEST " + high : "";
  }

  function recordHigh(force) {
    if (!hostDef || !window.CabinetScores) return null;
    if (!force && statusValue !== "done" && !doneRecorded) {
      // mid-sitting rises still record
    }
    const result = window.CabinetScores.record(hostDef.id, scoreValue);
    paintBest();
    if (result && result.isNew && hostUi && hostUi.banner) {
      const t = hostUi.banner.textContent || "";
      if (t.indexOf("NEW HIGH") < 0) {
        hostUi.banner.textContent = t ? t + " \u00b7 NEW HIGH" : "NEW HIGH";
      }
    }
    return result;
  }

  function setDealVisible(show) {
    if (!hostUi || !hostUi.deal) return;
    hostUi.deal.classList.toggle("hidden", !show);
    if (show) {
      const labels = (hostDef && hostDef.labels) || {};
      hostUi.deal.textContent = labels.again || "DEAL AGAIN";
    }
  }

  function setBanner(text, kind) {
    if (!hostUi || !hostUi.banner) return;
    hostUi.banner.className = "banner" + (kind ? " " + kind : "");
    hostUi.banner.textContent = text || "";
  }

  function makeCtx(root, canvas, def) {
    const labels = (def && def.labels) || {};
    return {
      root: root,
      canvas: canvas,
      def: def,
      score: {
        set: function (n) {
          const v = Number(n);
          scoreValue = Number.isFinite(v) ? v : 0;
          paintScore();
        },
        get: function () {
          return scoreValue;
        },
      },
      banner: {
        set: function (text, kind) {
          setBanner(text, kind || "");
        },
      },
      hud: {
        round: function (text) {
          if (hostUi && hostUi.hudRound) hostUi.hudRound.textContent = text || "";
        },
        deck: function (text) {
          if (hostUi && hostUi.hudDeck) hostUi.hudDeck.textContent = text || "";
        },
      },
      sfx: {
        play: function (name) {
          if (window.CabinetSfx && typeof window.CabinetSfx.play === "function") {
            window.CabinetSfx.play(name);
          }
        },
      },
      onDone: function (score) {
        const v = Number(score);
        scoreValue = Number.isFinite(v) ? scoreValue : scoreValue;
        if (Number.isFinite(v)) scoreValue = v;
        statusValue = "done";
        paintScore();
        setDealVisible(true);
        if (!doneRecorded) {
          doneRecorded = true;
          recordHigh(true);
        }
      },
      onScore: function (score) {
        const v = Number(score);
        if (!Number.isFinite(v)) return;
        const rose = v > scoreValue;
        scoreValue = v;
        paintScore();
        if (rose) recordHigh(false);
      },
      requestDealAgain: function () {
        setDealVisible(true);
      },
    };
  }

  function sizeCanvas(canvas) {
    if (!canvas) return;
    const parent = canvas.parentElement || canvas;
    const rect = parent.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width || parent.clientWidth || 320));
    const h = Math.max(1, Math.floor(rect.height || parent.clientHeight || 240));
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clearRoot(root) {
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
  }

  function ensureCanvas(root) {
    let canvas = root.querySelector("canvas.slot-canvas") || document.getElementById("slot-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "slot-canvas";
      canvas.id = "slot-canvas";
      root.appendChild(canvas);
    } else if (canvas.parentElement !== root) {
      root.appendChild(canvas);
    }
    return canvas;
  }

  function unmount() {
    if (activeHandle) {
      if (typeof activeHandle.unmount === "function") {
        try {
          activeHandle.unmount();
        } catch (e) {}
      }
      activeHandle = null;
    }
    if (active && active.root) {
      const canvas = active.root.querySelector("canvas.slot-canvas");
      clearRoot(active.root);
      if (canvas) active.root.appendChild(canvas);
    }
    active = null;
    statusValue = "idle";
    scoreValue = 0;
    doneRecorded = false;
    setDealVisible(false);
  }

  function mountInto(def, ui) {
    hostUi = ui || hostUi;
    hostDef = def;
    const root = (hostUi && hostUi.playSlot) || document.getElementById("play-slot");
    if (!root) return Promise.reject(new Error("Missing #play-slot"));
    unmount();
    scoreValue = 0;
    statusValue = "playing";
    doneRecorded = false;
    paintScore();
    paintBest();
    setDealVisible(false);
    setBanner((def && def.copy && def.copy.playing) || "", "");
    if (hostUi && hostUi.scoreLabel) {
      const labels = (def && def.labels) || {};
      hostUi.scoreLabel.textContent = labels.score || "SCORE";
    }
    if (hostUi && hostUi.brand) hostUi.brand.textContent = (def && def.title) || "Game";
    if (hostUi && hostUi.sub) hostUi.sub.textContent = (def && def.tagline) || "";

    const modulePath = resolveModulePath(def);
    const cssPath = resolveCssPath(def);
    const id = def.id;

    return Promise.resolve()
      .then(function () {
        return cssPath ? loadCss(cssPath) : null;
      })
      .then(function () {
        if (getModule(id)) return null;
        return loadScript(modulePath);
      })
      .then(function () {
        const mod = getModule(id);
        if (!mod || typeof mod.mount !== "function") {
          throw new Error("Slot module missing for " + id);
        }
        const canvas = ensureCanvas(root);
        sizeCanvas(canvas);
        const ctx = makeCtx(root, canvas, def);
        active = { root: root, canvas: canvas, def: def, ctx: ctx };
        const handle = mod.mount(ctx);
        activeHandle = handle || {};
        if (typeof activeHandle.getScore === "function") {
          scoreValue = Number(activeHandle.getScore()) || 0;
          paintScore();
        }
        if (typeof activeHandle.getStatus === "function") {
          statusValue = activeHandle.getStatus() || "playing";
        }
        return activeHandle;
      });
  }

  function reset() {
    if (!hostDef) return Promise.resolve(null);
    setDealVisible(false);
    doneRecorded = false;
    scoreValue = 0;
    statusValue = "playing";
    paintScore();
    if (activeHandle && typeof activeHandle.reset === "function") {
      activeHandle.reset();
      if (typeof activeHandle.getScore === "function") {
        scoreValue = Number(activeHandle.getScore()) || 0;
        paintScore();
      }
      if (typeof activeHandle.getStatus === "function") {
        statusValue = activeHandle.getStatus() || "playing";
      }
      return Promise.resolve(activeHandle);
    }
    return mountInto(hostDef, hostUi);
  }

  function getScore() {
    if (activeHandle && typeof activeHandle.getScore === "function") {
      return Number(activeHandle.getScore()) || 0;
    }
    return scoreValue;
  }

  function getStatus() {
    if (activeHandle && typeof activeHandle.getStatus === "function") {
      return activeHandle.getStatus() || statusValue;
    }
    return statusValue;
  }

  function render(ui, def) {
    hostUi = ui || hostUi;
    if (def) hostDef = def;
    if (!active && hostDef) {
      return mountInto(hostDef, hostUi);
    }
    paintScore();
    const st = getStatus();
    statusValue = st;
    if (st === "done") setDealVisible(true);
    return Promise.resolve(activeHandle);
  }

  function attachUi(ui) {
    hostUi = ui;
    if (ui) {
      ui.playSlot = ui.playSlot || document.getElementById("play-slot");
      ui.slotCanvas = ui.slotCanvas || document.getElementById("slot-canvas");
    }
  }

  return {
    resolveModulePath: resolveModulePath,
    resolveCssPath: resolveCssPath,
    mount: mountInto,
    unmount: unmount,
    reset: reset,
    dealAgain: reset,
    getScore: getScore,
    getStatus: getStatus,
    render: render,
    attachUi: attachUi,
    sizeCanvas: sizeCanvas,
  };
});
