/**
 * Cabinet Kit — Blast, Triple, Chime, Signal (browser + Node).
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

  const SIGNAL_CRATE = 8;

  function colorAt(grid, i, colors) {
    const v = grid[i];
    return v >= 1 && v <= colors ? v : 0;
  }

  function goalsMet(goals) {
    if (!goals) return false;
    for (let i = 0; i < goals.length; i++) {
      if (goals[i] > 0) return false;
    }
    return true;
  }

  function findColorRuns(grid, cols, rows, colors, minLine) {
    const need = minLine || 3;
    const runs = [];
    for (let r = 0; r < rows; r++) {
      let run = [];
      let color = 0;
      for (let c = 0; c <= cols; c++) {
        const v = c < cols ? colorAt(grid, idx(r, c, cols), colors) : 0;
        if (v && v === color) {
          run.push(idx(r, c, cols));
        } else {
          if (run.length >= need) runs.push({ cells: run, len: run.length, axis: "h", color: color });
          run = v ? [idx(r, c, cols)] : [];
          color = v;
        }
      }
    }
    for (let c = 0; c < cols; c++) {
      let run = [];
      let color = 0;
      for (let r = 0; r <= rows; r++) {
        const v = r < rows ? colorAt(grid, idx(r, c, cols), colors) : 0;
        if (v && v === color) {
          run.push(idx(r, c, cols));
        } else {
          if (run.length >= need) runs.push({ cells: run, len: run.length, axis: "v", color: color });
          run = v ? [idx(r, c, cols)] : [];
          color = v;
        }
      }
    }
    return runs;
  }

  function swapPair(grid, power, a, b) {
    swapCells(grid, a, b);
    const t = power[a];
    power[a] = power[b];
    power[b] = t;
  }

  function gravitySignal(grid, power, cols, rows, colors, rng) {
    for (let c = 0; c < cols; c++) {
      const kept = [];
      for (let r = rows - 1; r >= 0; r--) {
        const i = idx(r, c, cols);
        if (grid[i]) kept.push({ v: grid[i], p: power[i] || 0 });
      }
      let k = 0;
      for (let r = rows - 1; r >= 0; r--) {
        const i = idx(r, c, cols);
        if (k < kept.length) {
          grid[i] = kept[k].v;
          power[i] = kept[k].p;
          k += 1;
        } else {
          grid[i] = randColor(colors, rng);
          power[i] = 0;
        }
      }
    }
  }

  function signalHasMove(grid, power, cols, rows, colors, minLine) {
    for (let i = 0; i < grid.length; i++) {
      if (power[i]) return true;
    }
    for (let i = 0; i < grid.length; i++) {
      const r = (i / cols) | 0;
      const c = i % cols;
      if (c + 1 < cols) {
        swapPair(grid, power, i, i + 1);
        const ok = findColorRuns(grid, cols, rows, colors, minLine).length > 0;
        swapPair(grid, power, i, i + 1);
        if (ok) return true;
      }
      if (r + 1 < rows) {
        swapPair(grid, power, i, i + cols);
        const ok = findColorRuns(grid, cols, rows, colors, minLine).length > 0;
        swapPair(grid, power, i, i + cols);
        if (ok) return true;
      }
    }
    return false;
  }

  function placeCrates(grid, power, count, cols) {
    let left = count | 0;
    for (let i = grid.length - 1; i >= 0 && left > 0; i--) {
      const r = (i / cols) | 0;
      const c = i % cols;
      if (r < 3 && c < 3) continue;
      grid[i] = SIGNAL_CRATE;
      power[i] = 0;
      left -= 1;
    }
  }

  function configSignal(game) {
    const colors = Math.max(3, Math.min(5, num(game && game.colors, 5)));
    const raw = game && Array.isArray(game.levels) ? game.levels : [];
    const levels = (raw.length ? raw : [{ moves: 16, goals: [8, 8, 0, 0, 0], crates: 0, brief: "Gather glyphs." }]).map(function (level) {
      const goals = [];
      const src = level.goals || [];
      for (let i = 0; i < colors; i++) goals.push(Math.max(0, num(src[i], 0)));
      return {
        moves: Math.max(1, num(level.moves, 16)),
        goals: goals,
        crates: Math.max(0, num(level.crates, 0)),
        brief: level.brief || "",
      };
    });
    return {
      type: "signal",
      cols: Math.max(4, num(game && game.cols, 7)),
      rows: Math.max(4, num(game && game.rows, 7)),
      colors: colors,
      minLine: 3,
      gemScore: Math.max(0, num(game && game.gemScore, 10)),
      crateScore: Math.max(0, num(game && game.crateScore, 5)),
      moveBonus: Math.max(0, num(game && game.moveBonus, 20)),
      levels: levels,
    };
  }

  function loadSignalLevel(session, index) {
    const config = session.config;
    const level = config.levels[index];
    const n = config.cols * config.rows;
    const grid = new Array(n);
    const power = new Array(n);
    for (let i = 0; i < n; i++) power[i] = 0;
    ensureTripleBoard(grid, config.cols, config.rows, config.colors, session.rng, config.minLine);
    placeCrates(grid, power, level.crates, config.cols);
    if (!signalHasMove(grid, power, config.cols, config.rows, config.colors, config.minLine)) {
      stampTripleSwap(grid, config.cols);
    }
    session.grid = grid;
    session.power = power;
    session.levelIndex = index;
    session.goals = level.goals.slice();
    session.goalsLeft = level.goals.slice();
    session.movesLeft = level.moves;
    session.brief = level.brief;
    session.selected = null;
  }

  function resolveSignal(session, anchors) {
    const cols = session.config.cols;
    const rows = session.config.rows;
    const colors = session.config.colors;
    const minLine = session.config.minLine;
    let combo = 0;
    let cleared = 0;
    let points = 0;
    const popped = [];
    let useAnchors = anchors;
    const maxWaves = Math.max(8, cols * rows);
    while (combo < maxWaves) {
      const runs = findColorRuns(session.grid, cols, rows, colors, minLine);
      const clear = {};
      const spawn = {};
      for (let s = 0; s < runs.length; s++) {
        const run = runs[s];
        let spec = 0;
        if (run.len >= 5) spec = 3;
        else if (run.len === 4) spec = run.axis === "h" ? 1 : 2;
        if (spec) {
          let at = -1;
          if (useAnchors) {
            for (let a = 0; a < useAnchors.length; a++) {
              if (run.cells.indexOf(useAnchors[a]) >= 0) {
                at = useAnchors[a];
                break;
              }
            }
          }
          if (at < 0) at = run.cells[(run.len / 2) | 0];
          if (!spawn[at] || spec > spawn[at]) spawn[at] = spec;
        }
        for (let k = 0; k < run.cells.length; k++) clear[run.cells[k]] = 1;
      }
      Object.keys(spawn).forEach(function (k) { delete clear[k]; });
      const queue = [];
      Object.keys(clear).forEach(function (k) {
        if (session.power[+k]) queue.push(+k);
      });
      if (useAnchors) {
        for (let a = 0; a < useAnchors.length; a++) {
          const an = useAnchors[a];
          if (session.power[an]) {
            queue.push(an);
            clear[an] = 1;
            delete spawn[an];
          }
        }
      }
      useAnchors = null;
      const blasted = {};
      while (queue.length) {
        const i = queue.pop();
        if (blasted[i]) continue;
        blasted[i] = 1;
        const p = session.power[i];
        const add = function (j) {
          if (spawn[j] != null) return;
          if (!clear[j] && session.power[j] && !blasted[j]) queue.push(j);
          clear[j] = 1;
        };
        const r = (i / cols) | 0;
        const c = i % cols;
        if (p === 1) {
          for (let cc = 0; cc < cols; cc++) add(idx(r, cc, cols));
        } else if (p === 2) {
          for (let rr = 0; rr < rows; rr++) add(idx(rr, c, cols));
        } else if (p === 3) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const rr = r + dr;
              const cc = c + dc;
              if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
              add(idx(rr, cc, cols));
            }
          }
        }
      }
      const extras = [];
      Object.keys(clear).forEach(function (k) {
        const i = +k;
        const r = (i / cols) | 0;
        const c = i % cols;
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let n = 0; n < near.length; n++) {
          const rr = r + near[n][0];
          const cc = c + near[n][1];
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
          const j = idx(rr, cc, cols);
          if (session.grid[j] === SIGNAL_CRATE && !clear[j]) extras.push(j);
        }
      });
      for (let n = 0; n < extras.length; n++) clear[extras[n]] = 1;
      const clearKeys = Object.keys(clear);
      const spawnKeys = Object.keys(spawn);
      if (!clearKeys.length && !spawnKeys.length) break;
      combo += 1;
      for (let k = 0; k < clearKeys.length; k++) {
        const i = +clearKeys[k];
        const colr = colorAt(session.grid, i, colors);
        if (colr && session.goalsLeft[colr - 1] > 0) session.goalsLeft[colr - 1] -= 1;
        const gain = session.grid[i] === SIGNAL_CRATE ? session.config.crateScore : (colr ? session.config.gemScore : 0);
        points += gain * combo;
        if (session.grid[i]) {
          cleared += 1;
          popped.push(i);
        }
        session.grid[i] = 0;
        session.power[i] = 0;
      }
      for (let k = 0; k < spawnKeys.length; k++) {
        const i = +spawnKeys[k];
        if (colorAt(session.grid, i, colors)) session.power[i] = spawn[i];
      }
      gravitySignal(session.grid, session.power, cols, rows, colors, session.rng);
    }
    return { combo: combo, cleared: cleared, points: points, popped: popped };
  }

  function createSignalSession(game, rng) {
    const config = configSignal(game);
    const session = {
      type: "signal",
      config: config,
      rng: resolveRng(rng),
      grid: [],
      power: [],
      score: 0,
      movesLeft: 0,
      status: "playing",
      outcome: "",
      selected: null,
      levelIndex: 0,
      goals: [],
      goalsLeft: [],
      brief: "",
      lastEvent: { kind: "deal" },
    };
    loadSignalLevel(session, 0);
    return session;
  }

  function finishSignalMove(session, a, b, wave) {
    session.score += wave.points;
    session.movesLeft -= 1;
    session.selected = null;
    let advance = false;
    if (goalsMet(session.goalsLeft)) {
      session.score += session.movesLeft * session.config.moveBonus;
      const next = session.levelIndex + 1;
      if (next < session.config.levels.length) {
        loadSignalLevel(session, next);
        advance = true;
        session.status = "playing";
        session.outcome = "";
      } else {
        session.status = "done";
        session.outcome = "won";
      }
    } else if (session.movesLeft <= 0) {
      session.movesLeft = 0;
      session.status = "done";
      session.outcome = "stall";
    } else if (!signalHasMove(session.grid, session.power, session.config.cols, session.config.rows, session.config.colors, session.config.minLine)) {
      const keepGoals = session.goalsLeft.slice();
      const keepMoves = session.movesLeft;
      const keepLevel = session.levelIndex;
      loadSignalLevel(session, keepLevel);
      session.goalsLeft = keepGoals;
      session.movesLeft = keepMoves;
      session.lastEvent = { kind: "swap", a: a, b: b, combo: wave.combo, cleared: wave.cleared, points: wave.points, popped: wave.popped, shuffle: true };
      return;
    }
    session.lastEvent = {
      kind: "swap",
      a: a,
      b: b,
      combo: wave.combo,
      cleared: wave.cleared,
      points: wave.points,
      popped: wave.popped,
      advance: advance,
      outcome: session.outcome,
    };
  }

  function tapSignal(session, index) {
    if (session.status !== "playing") return snapshotSignal(session);
    const cols = session.config.cols;
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= session.grid.length || session.grid[i] === SIGNAL_CRATE) {
      session.lastEvent = { kind: "illegal" };
      return snapshotSignal(session);
    }
    if (session.selected == null) {
      session.selected = i;
      session.lastEvent = { kind: "select", index: i };
      return snapshotSignal(session);
    }
    const a = session.selected;
    if (a === i) {
      session.selected = null;
      session.lastEvent = { kind: "deselect" };
      return snapshotSignal(session);
    }
    if (!adjacent(a, i, cols)) {
      session.selected = i;
      session.lastEvent = { kind: "select", index: i };
      return snapshotSignal(session);
    }
    const b = i;
    swapPair(session.grid, session.power, a, b);
    const runs = findColorRuns(session.grid, cols, session.config.rows, session.config.colors, session.config.minLine);
    const armed = session.power[a] || session.power[b];
    if (!runs.length && !armed) {
      swapPair(session.grid, session.power, a, b);
      session.selected = null;
      session.lastEvent = { kind: "illegal", a: a, b: b };
      return snapshotSignal(session);
    }
    const wave = resolveSignal(session, [a, b]);
    finishSignalMove(session, a, b, wave);
    return snapshotSignal(session);
  }

  function snapshotSignal(session) {
    return {
      type: "signal",
      status: session.status,
      outcome: session.outcome,
      score: session.score,
      grid: copyGrid(session.grid),
      power: session.power.slice(),
      cols: session.config.cols,
      rows: session.config.rows,
      colors: session.config.colors,
      movesLeft: session.movesLeft,
      moves: session.config.levels[session.levelIndex].moves,
      levelIndex: session.levelIndex,
      levelCount: session.config.levels.length,
      goals: session.goals.slice(),
      goalsLeft: session.goalsLeft.slice(),
      brief: session.brief,
      selected: session.selected,
      lastEvent: session.lastEvent,
    };
  }

  function createMatchSession(game, rng) {
    const type = game && game.type;
    if (type === "triple") return createTripleSession(game, rng);
    if (type === "chime") return createChimeSession(game, rng);
    if (type === "signal") return createSignalSession(game, rng);
    return createBlastSession(game, rng);
  }

  function tapMatch(session, index) {
    if (!session) return null;
    if (session.type === "triple") return tapTriple(session, index);
    if (session.type === "chime") return tapChime(session, index);
    if (session.type === "signal") return tapSignal(session, index);
    return tapBlast(session, index);
  }

  function snapshotMatch(session) {
    if (!session) return null;
    if (session.type === "triple") return snapshotTriple(session);
    if (session.type === "chime") return snapshotChime(session);
    if (session.type === "signal") return snapshotSignal(session);
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
  E.createSignalSession = createSignalSession;
  E.tapSignal = tapSignal;
  E.snapshotSignal = snapshotSignal;
  E.createMatchSession = createMatchSession;
  E.tapMatch = tapMatch;
  E.snapshotMatch = snapshotMatch;
  E.findMatchBlob = findBlob;
  E.findLineMatches = findLineMatches;
});
