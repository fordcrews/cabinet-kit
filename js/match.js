/**
 * Cabinet Kit — Blast, Triple, Chime (browser + Node).
 * Original match-cabinet rules; not licensed clones.
 * Extends CabinetEngine; Node: require this file after engine.
 */
(function (root, factory) {
  function loadEngine() {
    if (typeof require === "function") {
      try {
        return require("./engine.js");
      } catch (e) {}
    }
    if (typeof window !== "undefined" && window.CabinetEngine) return window.CabinetEngine;
    if (typeof globalThis !== "undefined" && globalThis.CabinetEngine) return globalThis.CabinetEngine;
    throw new Error("CabinetEngine missing");
  }
  const E = loadEngine();
  factory(E);
  if (typeof module === "object" && module.exports) {
    module.exports = E;
  }
  if (typeof window !== "undefined") {
    window.CabinetEngine = E;
  } else if (typeof globalThis !== "undefined") {
    globalThis.CabinetEngine = E;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (E) {
  "use strict";

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function defaultRng() {
    return Math.random;
  }

  function resolveRng(rng) {
    if (typeof rng === "function") return rng;
    if (typeof rng === "number" && Number.isFinite(rng)) {
      let a = rng >>> 0 || 1;
      return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    return defaultRng();
  }

  function randColor(colors, rng) {
    const n = Math.max(1, colors | 0);
    return 1 + Math.floor(rng() * n);
  }

  function idx(r, c, cols) {
    return r * cols + c;
  }

  function copyGrid(grid) {
    return grid.slice();
  }

  function fillRandom(grid, colors, rng) {
    for (let i = 0; i < grid.length; i++) {
      grid[i] = randColor(colors, rng);
    }
    return grid;
  }

  function findBlob(grid, cols, rows, start) {
    const color = grid[start];
    if (!color) return [];
    const seen = {};
    const stack = [start];
    const out = [];
    while (stack.length) {
      const i = stack.pop();
      if (seen[i]) continue;
      if (grid[i] !== color) continue;
      seen[i] = 1;
      out.push(i);
      const r = (i / cols) | 0;
      const c = i % cols;
      if (c > 0) stack.push(i - 1);
      if (c < cols - 1) stack.push(i + 1);
      if (r > 0) stack.push(i - cols);
      if (r < rows - 1) stack.push(i + cols);
    }
    return out;
  }

  function blobsOfSize(grid, cols, rows, minSize) {
    const seen = {};
    const groups = [];
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i] || seen[i]) continue;
      const g = findBlob(grid, cols, rows, i);
      for (let k = 0; k < g.length; k++) seen[g[k]] = 1;
      if (g.length >= minSize) groups.push(g);
    }
    return groups;
  }

  function hasBlob(grid, cols, rows, minSize) {
    return blobsOfSize(grid, cols, rows, minSize).length > 0;
  }

  function gravityDownFill(grid, cols, rows, colors, rng) {
    for (let c = 0; c < cols; c++) {
      const kept = [];
      for (let r = rows - 1; r >= 0; r--) {
        const v = grid[idx(r, c, cols)];
        if (v) kept.push(v);
      }
      let k = 0;
      for (let r = rows - 1; r >= 0; r--) {
        if (k < kept.length) {
          grid[idx(r, c, cols)] = kept[k];
          k += 1;
        } else {
          grid[idx(r, c, cols)] = randColor(colors, rng);
        }
      }
    }
  }

  function blastPoints(n, config) {
    const mode = config.groupScore;
    let pts;
    if (mode === "n*10") {
      pts = n * 10;
    } else {
      pts = n * (n - 1);
    }
    const bigAt = Math.max(1, Math.floor(num(config.bigGroup, 5)));
    if (n >= bigAt) {
      pts += num(config.bigBonus, n * 5);
    }
    return pts;
  }

  function configBlast(game) {
    const src = game && typeof game === "object" ? game : {};
    return {
      type: "blast",
      cols: Math.max(2, Math.floor(num(src.cols, 8))),
      rows: Math.max(2, Math.floor(num(src.rows, 8))),
      colors: Math.max(2, Math.floor(num(src.colors, 5))),
      moves: Math.max(1, Math.floor(num(src.moves, 20))),
      minGroup: Math.max(2, Math.floor(num(src.minGroup, 2))),
      groupScore: src.groupScore === "n*10" ? "n*10" : "n*(n-1)",
      bigGroup: Math.max(1, Math.floor(num(src.bigGroup, 5))),
      bigBonus: num(src.bigBonus, 20),
    };
  }

  function configTriple(game) {
    const src = game && typeof game === "object" ? game : {};
    return {
      type: "triple",
      cols: Math.max(3, Math.floor(num(src.cols, 8))),
      rows: Math.max(3, Math.floor(num(src.rows, 8))),
      colors: Math.max(3, Math.floor(num(src.colors, 6))),
      moves: Math.max(1, Math.floor(num(src.moves, 20))),
      minLine: Math.max(3, Math.floor(num(src.minLine, 3))),
      gemScore: num(src.gemScore, 10),
    };
  }

  function configChime(game) {
    const src = game && typeof game === "object" ? game : {};
    return {
      type: "chime",
      cols: Math.max(3, Math.floor(num(src.cols, 6))),
      rows: Math.max(3, Math.floor(num(src.rows, 6))),
      colors: Math.max(3, Math.floor(num(src.colors, 6))),
      moves: Math.max(1, Math.floor(num(src.moves, 25))),
      minGroup: Math.max(3, Math.floor(num(src.minGroup, 3))),
      marbleScore: num(src.marbleScore, 10),
    };
  }

  function ensureBlastGroups(grid, cols, rows, colors, rng, minGroup) {
    for (let n = 0; n < 48; n++) {
      if (hasBlob(grid, cols, rows, minGroup)) return;
      fillRandom(grid, colors, rng);
    }
    grid[0] = 1;
    grid[1] = 1;
  }

  function createBlastSession(game, rng) {
    const config = configBlast(game);
    const random = resolveRng(rng);
    const grid = new Array(config.cols * config.rows);
    fillRandom(grid, config.colors, random);
    ensureBlastGroups(grid, config.cols, config.rows, config.colors, random, config.minGroup);
    return {
      type: "blast",
      config: config,
      rng: random,
      grid: grid,
      score: 0,
      movesLeft: config.moves,
      status: "playing",
      selected: null,
      lastEvent: { kind: "deal" },
    };
  }

  function tapBlast(session, index) {
    if (session.status !== "playing") return snapshotBlast(session);
    const cols = session.config.cols;
    const rows = session.config.rows;
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= session.grid.length) {
      session.lastEvent = { kind: "illegal" };
      return snapshotBlast(session);
    }
    const group = findBlob(session.grid, cols, rows, i);
    const minGroup = session.config.minGroup;
    if (group.length < minGroup) {
      session.lastEvent = { kind: "small", index: i, size: group.length };
      return snapshotBlast(session);
    }
    for (let k = 0; k < group.length; k++) session.grid[group[k]] = 0;
    const points = blastPoints(group.length, session.config);
    session.score += points;
    session.movesLeft -= 1;
    gravityDownFill(session.grid, cols, rows, session.config.colors, session.rng);
    let shuffled = false;
    if (session.movesLeft > 0) {
      const before = session.grid.slice();
      ensureBlastGroups(session.grid, cols, rows, session.config.colors, session.rng, minGroup);
      shuffled = session.grid.some(function (v, n) { return v !== before[n]; }) && !hasBlob(before, cols, rows, minGroup);
      if (!hasBlob(before, cols, rows, minGroup)) shuffled = true;
    }
    if (session.movesLeft <= 0) {
      session.movesLeft = 0;
      session.status = "done";
    }
    session.lastEvent = { kind: "pop", size: group.length, points: points, popped: group.slice(), shuffle: shuffled };
    if (session.status === "done") {
      session.lastEvent.kind = "pop";
      session.lastEvent.done = true;
    }
    return snapshotBlast(session);
  }

  function snapshotBlast(session) {
    return {
      type: "blast",
      status: session.status,
      score: session.score,
      grid: copyGrid(session.grid),
      cols: session.config.cols,
      rows: session.config.rows,
      colors: session.config.colors,
      movesLeft: session.movesLeft,
      moves: session.config.moves,
      minGroup: session.config.minGroup,
      groupScore: session.config.groupScore,
      selected: session.selected,
      lastEvent: session.lastEvent,
    };
  }

  function findLineMatches(grid, cols, rows, minLine) {
    const marked = {};
    const need = minLine || 3;
    for (let r = 0; r < rows; r++) {
      let run = 1;
      for (let c = 1; c <= cols; c++) {
        const prev = idx(r, c - 1, cols);
        const same = c < cols && grid[idx(r, c, cols)] && grid[idx(r, c, cols)] === grid[prev];
        if (same) {
          run += 1;
        } else {
          if (run >= need && grid[prev]) {
            for (let k = 0; k < run; k++) marked[prev - k] = 1;
          }
          run = 1;
        }
      }
    }
    for (let c = 0; c < cols; c++) {
      let run = 1;
      for (let r = 1; r <= rows; r++) {
        const prev = idx(r - 1, c, cols);
        const same = r < rows && grid[idx(r, c, cols)] && grid[idx(r, c, cols)] === grid[prev];
        if (same) {
          run += 1;
        } else {
          if (run >= need && grid[prev]) {
            for (let k = 0; k < run; k++) marked[idx(r - 1 - k, c, cols)] = 1;
          }
          run = 1;
        }
      }
    }
    const out = [];
    Object.keys(marked).forEach(function (k) { out.push(Number(k)); });
    return out;
  }

  function swapCells(grid, a, b) {
    const t = grid[a];
    grid[a] = grid[b];
    grid[b] = t;
  }

  function adjacent(a, b, cols) {
    const ra = (a / cols) | 0;
    const ca = a % cols;
    const rb = (b / cols) | 0;
    const cb = b % cols;
    return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
  }

  function hasLegalSwap(grid, cols, rows, minLine) {
    for (let i = 0; i < grid.length; i++) {
      const r = (i / cols) | 0;
      const c = i % cols;
      if (c + 1 < cols) {
        swapCells(grid, i, i + 1);
        const ok = findLineMatches(grid, cols, rows, minLine).length > 0;
        swapCells(grid, i, i + 1);
        if (ok) return true;
      }
      if (r + 1 < rows) {
        swapCells(grid, i, i + cols);
        const ok = findLineMatches(grid, cols, rows, minLine).length > 0;
        swapCells(grid, i, i + cols);
        if (ok) return true;
      }
    }
    return false;
  }

  function fillTripleSafe(grid, cols, rows, colors, rng, minLine) {
    for (let i = 0; i < grid.length; i++) {
      const r = (i / cols) | 0;
      const c = i % cols;
      let color = 1;
      for (let t = 0; t < 24; t++) {
        color = randColor(colors, rng);
        const horiz = c >= 2 && grid[i - 1] === color && grid[i - 2] === color;
        const vert = r >= 2 && grid[i - cols] === color && grid[i - 2 * cols] === color;
        if (!horiz && !vert) break;
      }
      grid[i] = color;
    }
    if (findLineMatches(grid, cols, rows, minLine).length) {
      fillRandom(grid, colors, rng);
    }
  }

  function stampTripleSwap(grid, cols) {
    grid[0] = 2;
    grid[1] = 1;
    grid[2] = 1;
    grid[cols] = 1;
    grid[cols + 1] = 2;
    grid[cols + 2] = 3;
    grid[cols * 2] = 3;
    grid[cols * 2 + 1] = 2;
    grid[cols * 2 + 2] = 3;
  }

  function ensureTripleBoard(grid, cols, rows, colors, rng, minLine) {
    for (let n = 0; n < 48; n++) {
      fillTripleSafe(grid, cols, rows, colors, rng, minLine);
      if (findLineMatches(grid, cols, rows, minLine).length) continue;
      if (hasLegalSwap(grid, cols, rows, minLine)) return;
    }
    fillTripleSafe(grid, cols, rows, colors, rng, minLine);
    stampTripleSwap(grid, cols);
  }

  function resolveTriple(session) {
    const cols = session.config.cols;
    const rows = session.config.rows;
    const minLine = session.config.minLine;
    const gemScore = session.config.gemScore;
    let combo = 0;
    let cleared = 0;
    let points = 0;
    const popped = [];
    const maxWaves = Math.max(8, cols * rows);
    while (combo < maxWaves) {
      const matches = findLineMatches(session.grid, cols, rows, minLine);
      if (!matches.length) break;
      combo += 1;
      for (let k = 0; k < matches.length; k++) {
        session.grid[matches[k]] = 0;
        popped.push(matches[k]);
      }
      cleared += matches.length;
      points += matches.length * gemScore * combo;
      gravityDownFill(session.grid, cols, rows, session.config.colors, session.rng);
    }
    return { combo: combo, cleared: cleared, points: points, popped: popped };
  }

  function createTripleSession(game, rng) {
    const config = configTriple(game);
    const random = resolveRng(rng);
    const grid = new Array(config.cols * config.rows);
    ensureTripleBoard(grid, config.cols, config.rows, config.colors, random, config.minLine);
    return {
      type: "triple",
      config: config,
      rng: random,
      grid: grid,
      score: 0,
      movesLeft: config.moves,
      status: "playing",
      selected: null,
      lastEvent: { kind: "deal" },
    };
  }

  function tapTriple(session, index) {
    if (session.status !== "playing") return snapshotTriple(session);
    const cols = session.config.cols;
    const rows = session.config.rows;
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= session.grid.length) {
      session.lastEvent = { kind: "illegal" };
      return snapshotTriple(session);
    }
    if (session.selected == null) {
      session.selected = i;
      session.lastEvent = { kind: "select", index: i };
      return snapshotTriple(session);
    }
    const a = session.selected;
    if (a === i) {
      session.selected = null;
      session.lastEvent = { kind: "deselect" };
      return snapshotTriple(session);
    }
    if (!adjacent(a, i, cols)) {
      session.selected = i;
      session.lastEvent = { kind: "select", index: i };
      return snapshotTriple(session);
    }
    swapCells(session.grid, a, i);
    const wave = resolveTriple(session);
    if (!wave.combo) {
      swapCells(session.grid, a, i);
      session.selected = null;
      session.lastEvent = { kind: "illegal", a: a, b: i };
      return snapshotTriple(session);
    }
    session.score += wave.points;
    session.movesLeft -= 1;
    session.selected = null;
    if (session.movesLeft > 0) {
      if (!hasLegalSwap(session.grid, cols, rows, session.config.minLine)) {
        ensureTripleBoard(session.grid, cols, rows, session.config.colors, session.rng, session.config.minLine);
        session.lastEvent = { kind: "swap", a: a, b: i, combo: wave.combo, cleared: wave.cleared, points: wave.points, popped: wave.popped, shuffle: true };
      } else {
        session.lastEvent = { kind: "swap", a: a, b: i, combo: wave.combo, cleared: wave.cleared, points: wave.points, popped: wave.popped };
      }
    } else {
      session.movesLeft = 0;
      session.status = "done";
      session.lastEvent = { kind: "swap", a: a, b: i, combo: wave.combo, cleared: wave.cleared, points: wave.points, popped: wave.popped, done: true };
    }
    return snapshotTriple(session);
  }

  function snapshotTriple(session) {
    return {
      type: "triple",
      status: session.status,
      score: session.score,
      grid: copyGrid(session.grid),
      cols: session.config.cols,
      rows: session.config.rows,
      colors: session.config.colors,
      movesLeft: session.movesLeft,
      moves: session.config.moves,
      minLine: session.config.minLine,
      gemScore: session.config.gemScore,
      selected: session.selected,
      lastEvent: session.lastEvent,
    };
  }

  function slideLine(grid, cols, rows, from, to) {
    const r0 = (from / cols) | 0;
    const c0 = from % cols;
    const r1 = (to / cols) | 0;
    const c1 = to % cols;
    if (r0 === r1 && c0 !== c1) {
      const shift = c1 - c0;
      const line = [];
      for (let c = 0; c < cols; c++) line.push(grid[idx(r0, c, cols)]);
      for (let c = 0; c < cols; c++) {
        const dest = (c + shift % cols + cols * 8) % cols;
        grid[idx(r0, dest, cols)] = line[c];
      }
      return { axis: "row", index: r0, shift: shift };
    }
    if (c0 === c1 && r0 !== r1) {
      const shift = r1 - r0;
      const line = [];
      for (let r = 0; r < rows; r++) line.push(grid[idx(r, c0, cols)]);
      for (let r = 0; r < rows; r++) {
        const dest = (r + shift % rows + rows * 8) % rows;
        grid[idx(dest, c0, cols)] = line[r];
      }
      return { axis: "col", index: c0, shift: shift };
    }
    return null;
  }

  function compactLine(grid, cols, rows, axis, index) {
    if (axis === "row") {
      const kept = [];
      for (let c = 0; c < cols; c++) {
        const v = grid[idx(index, c, cols)];
        if (v) kept.push(v);
      }
      for (let c = 0; c < cols; c++) {
        grid[idx(index, c, cols)] = c < kept.length ? kept[c] : 0;
      }
    } else {
      const kept = [];
      for (let r = 0; r < rows; r++) {
        const v = grid[idx(r, index, cols)];
        if (v) kept.push(v);
      }
      for (let r = 0; r < rows; r++) {
        grid[idx(r, index, cols)] = r < kept.length ? kept[r] : 0;
      }
    }
  }

  function fillEmpties(grid, colors, rng) {
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i]) grid[i] = randColor(colors, rng);
    }
  }

  function ensureChimeBoard(grid, cols, rows, colors, rng, minGroup) {
    for (let n = 0; n < 48; n++) {
      fillRandom(grid, colors, rng);
      if (!hasBlob(grid, cols, rows, minGroup)) return;
    }
    const palette = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i < grid.length; i++) {
      grid[i] = palette[i % Math.min(colors, palette.length)];
    }
  }

  function createChimeSession(game, rng) {
    const config = configChime(game);
    const random = resolveRng(rng);
    const grid = new Array(config.cols * config.rows);
    ensureChimeBoard(grid, config.cols, config.rows, config.colors, random, config.minGroup);
    return {
      type: "chime",
      config: config,
      rng: random,
      grid: grid,
      score: 0,
      movesLeft: config.moves,
      status: "playing",
      selected: null,
      lastEvent: { kind: "deal" },
    };
  }

  function tapChime(session, index) {
    if (session.status !== "playing") return snapshotChime(session);
    const cols = session.config.cols;
    const rows = session.config.rows;
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= session.grid.length) {
      session.lastEvent = { kind: "illegal" };
      return snapshotChime(session);
    }
    if (!session.grid[i] && session.selected == null) {
      session.lastEvent = { kind: "illegal", index: i };
      return snapshotChime(session);
    }
    if (session.selected == null) {
      session.selected = i;
      session.lastEvent = { kind: "select", index: i };
      return snapshotChime(session);
    }
    const a = session.selected;
    if (a === i) {
      session.selected = null;
      session.lastEvent = { kind: "deselect" };
      return snapshotChime(session);
    }
    const r0 = (a / cols) | 0;
    const c0 = a % cols;
    const r1 = (i / cols) | 0;
    const c1 = i % cols;
    if (r0 !== r1 && c0 !== c1) {
      session.selected = i;
      session.lastEvent = { kind: "select", index: i };
      return snapshotChime(session);
    }
    const moved = slideLine(session.grid, cols, rows, a, i);
    if (!moved) {
      session.selected = i;
      session.lastEvent = { kind: "select", index: i };
      return snapshotChime(session);
    }
    const groups = blobsOfSize(session.grid, cols, rows, session.config.minGroup);
    const popped = [];
    for (let g = 0; g < groups.length; g++) {
      for (let k = 0; k < groups[g].length; k++) {
        popped.push(groups[g][k]);
        session.grid[groups[g][k]] = 0;
      }
    }
    const points = popped.length * session.config.marbleScore;
    session.score += points;
    if (popped.length) {
      compactLine(session.grid, cols, rows, moved.axis, moved.index);
    }
    fillEmpties(session.grid, session.config.colors, session.rng);
    session.movesLeft -= 1;
    session.selected = null;
    if (session.movesLeft <= 0) {
      session.movesLeft = 0;
      session.status = "done";
    }
    session.lastEvent = {
      kind: popped.length ? "pop" : "slide",
      axis: moved.axis,
      index: moved.index,
      shift: moved.shift,
      size: popped.length,
      points: points,
      popped: popped,
      from: a,
      to: i,
    };
    return snapshotChime(session);
  }

  function snapshotChime(session) {
    return {
      type: "chime",
      status: session.status,
      score: session.score,
      grid: copyGrid(session.grid),
      cols: session.config.cols,
      rows: session.config.rows,
      colors: session.config.colors,
      movesLeft: session.movesLeft,
      moves: session.config.moves,
      minGroup: session.config.minGroup,
      marbleScore: session.config.marbleScore,
      selected: session.selected,
      lastEvent: session.lastEvent,
    };
  }

  function createMatchSession(game, rng) {
    const type = game && game.type;
    if (type === "triple") return createTripleSession(game, rng);
    if (type === "chime") return createChimeSession(game, rng);
    return createBlastSession(game, rng);
  }

  function tapMatch(session, index) {
    if (!session) return null;
    if (session.type === "triple") return tapTriple(session, index);
    if (session.type === "chime") return tapChime(session, index);
    return tapBlast(session, index);
  }

  function snapshotMatch(session) {
    if (!session) return null;
    if (session.type === "triple") return snapshotTriple(session);
    if (session.type === "chime") return snapshotChime(session);
    return snapshotBlast(session);
  }

  E.createBlastSession = createBlastSession;
  E.tapBlast = tapBlast;
  E.snapshotBlast = snapshotBlast;
  E.createTripleSession = createTripleSession;
  E.tapTriple = tapTriple;
  E.snapshotTriple = snapshotTriple;
  E.createChimeSession = createChimeSession;
  E.tapChime = tapChime;
  E.snapshotChime = snapshotChime;
  E.createMatchSession = createMatchSession;
  E.tapMatch = tapMatch;
  E.snapshotMatch = snapshotMatch;
  E.findMatchBlob = findBlob;
  E.findLineMatches = findLineMatches;
});
