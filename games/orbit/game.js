/**
 * Orbit — canvas slot game. Keep the puck in the scoring wedge.
 * Browser: window.CabinetSlotGames.orbit. Node: module.exports pure helpers.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.CabinetSlotGames = window.CabinetSlotGames || {};
    window.CabinetSlotGames.orbit = {
      mount: api.mount,
    };
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TAU = Math.PI * 2;

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeAngle(a) {
    let x = a % TAU;
    if (x < 0) x += TAU;
    return x;
  }

  function angleDelta(a, b) {
    let d = normalizeAngle(a) - normalizeAngle(b);
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }

  function angleInWedge(puckAngle, wedgeCenter, wedgeHalfWidth) {
    const half = Math.abs(num(wedgeHalfWidth, 0));
    if (half <= 0) return false;
    return Math.abs(angleDelta(puckAngle, wedgeCenter)) <= half;
  }

  function shotPoints(puckAngle, wedgeCenter, wedgeHalfWidth, makePoints, longPoints) {
    const half = Math.abs(num(wedgeHalfWidth, 0));
    if (!angleInWedge(puckAngle, wedgeCenter, half)) {
      return { hit: false, points: 0, nearCenter: false };
    }
    const centerHalf = half * 0.35;
    const near = Math.abs(angleDelta(puckAngle, wedgeCenter)) <= centerHalf;
    const pts = near ? num(longPoints, 3) : num(makePoints, 2);
    return { hit: true, points: pts, nearCenter: near };
  }

  function createState(def) {
    const shots = Math.max(1, Math.floor(num(def && def.shots, 12)));
    return {
      score: 0,
      shots: shots,
      shotsLeft: shots,
      status: "playing",
      puckAngle: 0,
      puckSpeed: num(def && def.puckSpeed, 1.55),
      wedgeCenter: num(def && def.wedgeCenter, 0),
      wedgeSpeed: num(def && def.wedgeSpeed, 0.35),
      wedgeHalf: num(def && def.wedgeHalf, 0.42),
      makePoints: num(def && def.makePoints, 2),
      longPoints: num(def && def.longPoints, 3),
      lastEvent: { kind: "deal" },
      particles: [],
    };
  }

  function applyShot(state) {
    if (!state || state.status !== "playing" || state.shotsLeft <= 0) {
      return { hit: false, points: 0, nearCenter: false, done: state && state.status === "done" };
    }
    const result = shotPoints(
      state.puckAngle,
      state.wedgeCenter,
      state.wedgeHalf,
      state.makePoints,
      state.longPoints
    );
    state.shotsLeft -= 1;
    if (result.hit) {
      state.score += result.points;
      state.lastEvent = {
        kind: "make",
        points: result.points,
        nearCenter: result.nearCenter,
      };
    } else {
      state.lastEvent = { kind: "miss", points: 0 };
    }
    if (state.shotsLeft <= 0) {
      state.status = "done";
      state.shotsLeft = 0;
    }
    return {
      hit: result.hit,
      points: result.points,
      nearCenter: result.nearCenter,
      done: state.status === "done",
    };
  }

  function mount(ctx) {
    const def = (ctx && ctx.def) || {};
    const canvas = ctx.canvas;
    const root = ctx.root;
    let state = createState(def);
    let raf = 0;
    let lastTs = 0;
    let running = true;
    const labels = def.labels || {};
    const copy = def.copy || {};

    function syncHud() {
      ctx.score.set(state.score);
      const taken = state.shots - state.shotsLeft;
      ctx.hud.round((labels.shots || "SHOTS") + " " + taken + "/" + state.shots);
      ctx.hud.deck("");
      if (state.status === "done") {
        ctx.banner.set((copy.done || "Twelve taps. Deal again.") + " · " + state.score, "run");
      } else if (state.lastEvent && state.lastEvent.kind === "make") {
        ctx.banner.set(
          (copy.make || "In the wedge.") + " +" + state.lastEvent.points,
          "run"
        );
      } else if (state.lastEvent && state.lastEvent.kind === "miss") {
        ctx.banner.set(copy.miss || "Outside.", "bust");
      } else {
        ctx.banner.set(copy.playing || "Tap when the puck is in the gold wedge.", "");
      }
    }

    function spawnSparkles(cx, cy) {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * TAU;
        const sp = 40 + Math.random() * 120;
        state.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.45 + Math.random() * 0.35,
          age: 0,
        });
      }
    }

    function resize() {
      if (window.CabinetSlot && typeof window.CabinetSlot.sizeCanvas === "function") {
        window.CabinetSlot.sizeCanvas(canvas);
      } else {
        const parent = canvas.parentElement || canvas;
        const rect = parent.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width || 320));
        const h = Math.max(1, Math.floor(rect.height || 240));
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        const g = canvas.getContext("2d");
        if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    function draw() {
      const g = canvas.getContext("2d");
      if (!g) return;
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 240;
      g.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.52;
      const R = Math.min(w, h) * 0.34;

      const felt = g.createRadialGradient(cx, cy * 0.7, 10, cx, cy, Math.max(w, h) * 0.7);
      felt.addColorStop(0, "#145c45");
      felt.addColorStop(0.55, "#0c2f24");
      felt.addColorStop(1, "#071c16");
      g.fillStyle = felt;
      g.fillRect(0, 0, w, h);

      g.save();
      g.strokeStyle = "rgba(212, 175, 55, 0.35)";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, cy, R + 18, 0, TAU);
      g.stroke();
      g.restore();

      // scoring wedge
      g.save();
      g.translate(cx, cy);
      g.rotate(state.wedgeCenter);
      const half = state.wedgeHalf;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, R + 8, -half, half);
      g.closePath();
      const wedgeGrad = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R + 8);
      wedgeGrad.addColorStop(0, "rgba(255, 220, 120, 0.55)");
      wedgeGrad.addColorStop(1, "rgba(212, 175, 55, 0.12)");
      g.fillStyle = wedgeGrad;
      g.fill();
      g.strokeStyle = "rgba(255, 214, 120, 0.9)";
      g.lineWidth = 2.5;
      g.shadowColor = "rgba(255, 200, 80, 0.65)";
      g.shadowBlur = 12;
      g.beginPath();
      g.arc(0, 0, R + 8, -half, half);
      g.stroke();
      g.restore();

      // center ring
      g.save();
      g.shadowColor = "rgba(212, 175, 55, 0.45)";
      g.shadowBlur = 10;
      g.strokeStyle = "#d4af37";
      g.lineWidth = 4;
      g.beginPath();
      g.arc(cx, cy, R * 0.22, 0, TAU);
      g.stroke();
      g.fillStyle = "#0a1f18";
      g.beginPath();
      g.arc(cx, cy, R * 0.14, 0, TAU);
      g.fill();
      g.restore();

      // orbit path
      g.save();
      g.strokeStyle = "rgba(239, 230, 210, 0.18)";
      g.lineWidth = 1.5;
      g.setLineDash([6, 8]);
      g.beginPath();
      g.arc(cx, cy, R, 0, TAU);
      g.stroke();
      g.restore();

      // puck
      const px = cx + Math.cos(state.puckAngle) * R;
      const py = cy + Math.sin(state.puckAngle) * R;
      g.save();
      g.shadowColor = "rgba(0,0,0,0.55)";
      g.shadowBlur = 10;
      g.shadowOffsetY = 3;
      const puckGrad = g.createRadialGradient(px - 4, py - 5, 2, px, py, 14);
      puckGrad.addColorStop(0, "#f4efe2");
      puckGrad.addColorStop(0.45, "#e2b84a");
      puckGrad.addColorStop(1, "#8a5a18");
      g.fillStyle = puckGrad;
      g.beginPath();
      g.arc(px, py, 13, 0, TAU);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.35)";
      g.lineWidth = 1.5;
      g.stroke();
      g.restore();

      // particles
      state.particles.forEach(function (p) {
        const t = 1 - p.age / p.life;
        if (t <= 0) return;
        g.save();
        g.globalAlpha = Math.max(0, t);
        g.fillStyle = "#ffe08a";
        g.shadowColor = "#ffd060";
        g.shadowBlur = 8;
        g.beginPath();
        g.arc(p.x, p.y, 2.5 + 2 * t, 0, TAU);
        g.fill();
        g.restore();
      });
    }

    function tick(ts) {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (state.status === "playing") {
        state.puckAngle = normalizeAngle(state.puckAngle + state.puckSpeed * dt);
        state.wedgeCenter = normalizeAngle(state.wedgeCenter + state.wedgeSpeed * dt);
      }
      state.particles = state.particles.filter(function (p) {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 80 * dt;
        return p.age < p.life;
      });
      draw();
      raf = requestAnimationFrame(tick);
    }

    function onShoot(ev) {
      if (ev) {
        ev.preventDefault();
      }
      if (state.status !== "playing") return;
      const result = applyShot(state);
      syncHud();
      ctx.onScore(state.score);
      if (result.hit) {
        ctx.sfx.play("make");
        const w = canvas.clientWidth || 320;
        const h = canvas.clientHeight || 240;
        const cx = w * 0.5;
        const cy = h * 0.52;
        const R = Math.min(w, h) * 0.34;
        spawnSparkles(cx + Math.cos(state.puckAngle) * R, cy + Math.sin(state.puckAngle) * R);
      } else {
        ctx.sfx.play("miss");
      }
      if (result.done) {
        ctx.onDone(state.score);
      }
    }

    function onResize() {
      resize();
      draw();
    }

    resize();
    syncHud();
    canvas.addEventListener("pointerdown", onShoot);
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(tick);

    return {
      unmount: function () {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        canvas.removeEventListener("pointerdown", onShoot);
        window.removeEventListener("resize", onResize);
        state.particles = [];
      },
      reset: function () {
        state = createState(def);
        lastTs = 0;
        syncHud();
        ctx.onScore(0);
      },
      getScore: function () {
        return state.score;
      },
      getStatus: function () {
        return state.status;
      },
    };
  }

  return {
    normalizeAngle: normalizeAngle,
    angleDelta: angleDelta,
    angleInWedge: angleInWedge,
    shotPoints: shotPoints,
    createState: createState,
    applyShot: applyShot,
    mount: mount,
  };
});
