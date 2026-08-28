/**
 * Cabinet Kit — Sudoku 6, Reversi, Hoops, Quiz Night (browser + Node).
 * Extends CabinetEngine; Node: require this file to get the combined API.
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

  function shuffle(list, rng) {
    const a = list.slice();
    const rand = rng || Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  const SUDOKU_N = 6;
  const SUDOKU_BOX_R = 2;
  const SUDOKU_BOX_C = 3;
  const SUDOKU_CELLS = 36;

  function parseSudokuString(s) {
    const out = [];
    const str = String(s || "");
    for (let i = 0; i < SUDOKU_CELLS; i++) {
      const ch = str.charAt(i);
      const d = ch ? Number(ch) : 0;
      out.push(d >= 1 && d <= 6 ? d : 0);
    }
    return out;
  }

  function normalizePuzzles(game) {
    const raw = (game && game.puzzles) || [];
    const sols = (game && game.solutions) || [];
    const list = [];
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      if (typeof item === "string") {
        list.push({
          puzzle: parseSudokuString(item),
          solution: parseSudokuString(sols[i] || item),
        });
      } else if (item && typeof item === "object") {
        const p = item.puzzle || item.grid || item.givens || "";
        const s = item.solution || item.sol || p;
        list.push({ puzzle: parseSudokuString(p), solution: parseSudokuString(s) });
      }
    }
    return list;
  }

  function sudokuUnitOk(vals) {
    const seen = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (!v) continue;
      if (v < 1 || v > 6) return false;
      if (seen[v]) return false;
      seen[v] = 1;
    }
    return true;
  }

  function sudokuValid(gridOrSession) {
    const grid = gridOrSession && gridOrSession.grid ? gridOrSession.grid : gridOrSession;
    if (!grid || grid.length < SUDOKU_CELLS) return false;
    for (let r = 0; r < SUDOKU_N; r++) {
      const row = [];
      for (let c = 0; c < SUDOKU_N; c++) row.push(grid[r * SUDOKU_N + c]);
      if (!sudokuUnitOk(row)) return false;
    }
    for (let c = 0; c < SUDOKU_N; c++) {
      const col = [];
      for (let r = 0; r < SUDOKU_N; r++) col.push(grid[r * SUDOKU_N + c]);
      if (!sudokuUnitOk(col)) return false;
    }
    for (let br = 0; br < SUDOKU_N; br += SUDOKU_BOX_R) {
      for (let bc = 0; bc < SUDOKU_N; bc += SUDOKU_BOX_C) {
        const box = [];
        for (let dr = 0; dr < SUDOKU_BOX_R; dr++) {
          for (let dc = 0; dc < SUDOKU_BOX_C; dc++) {
            box.push(grid[(br + dr) * SUDOKU_N + (bc + dc)]);
          }
        }
        if (!sudokuUnitOk(box)) return false;
      }
    }
    return true;
  }

  function sudokuConflicts(grid) {
    const bad = new Array(SUDOKU_CELLS).fill(false);
    function markDupes(idxs) {
      const map = {};
      idxs.forEach(function (i) {
        const v = grid[i];
        if (!v) return;
        if (!map[v]) map[v] = [];
        map[v].push(i);
      });
      Object.keys(map).forEach(function (k) {
        if (map[k].length > 1) {
          map[k].forEach(function (i) {
            bad[i] = true;
          });
        }
      });
    }
    for (let r = 0; r < SUDOKU_N; r++) {
      const idxs = [];
      for (let c = 0; c < SUDOKU_N; c++) idxs.push(r * SUDOKU_N + c);
      markDupes(idxs);
    }
    for (let c = 0; c < SUDOKU_N; c++) {
      const idxs = [];
      for (let r = 0; r < SUDOKU_N; r++) idxs.push(r * SUDOKU_N + c);
      markDupes(idxs);
    }
    for (let br = 0; br < SUDOKU_N; br += SUDOKU_BOX_R) {
      for (let bc = 0; bc < SUDOKU_N; bc += SUDOKU_BOX_C) {
        const idxs = [];
        for (let dr = 0; dr < SUDOKU_BOX_R; dr++) {
          for (let dc = 0; dc < SUDOKU_BOX_C; dc++) {
            idxs.push((br + dr) * SUDOKU_N + (bc + dc));
          }
        }
        markDupes(idxs);
      }
    }
    return bad;
  }

  function sudokuComplete(grid) {
    for (let i = 0; i < SUDOKU_CELLS; i++) {
      if (!grid[i]) return false;
    }
    return sudokuValid(grid);
  }

  function sudokuMatches(grid, solution) {
    if (!solution) return sudokuComplete(grid);
    for (let i = 0; i < SUDOKU_CELLS; i++) {
      if (grid[i] !== solution[i]) return false;
    }
    return true;
  }

  function loadSudokuPuzzle(session, index) {
    const puzzles = session.puzzles;
    const n = puzzles.length || 1;
    const i = ((index % n) + n) % n;
    const pack = puzzles[i] || { puzzle: new Array(SUDOKU_CELLS).fill(0), solution: new Array(SUDOKU_CELLS).fill(0) };
    session.puzzleIndex = i;
    session.grid = pack.puzzle.slice();
    session.solution = pack.solution.slice();
    session.given = pack.puzzle.map(function (v) {
      return v > 0;
    });
    session.selected = null;
    session.status = "playing";
    session.lastEvent = { kind: "deal" };
  }

  function createSudokuSession(game, opts) {
    const options = opts || {};
    const puzzles = normalizePuzzles(game);
    const session = {
      type: "sudoku6",
      config: { type: "sudoku6", clearScore: num(game && game.clearScore, 1) },
      puzzles: puzzles.length
        ? puzzles
        : [{ puzzle: new Array(SUDOKU_CELLS).fill(0), solution: new Array(SUDOKU_CELLS).fill(0) }],
      score: num(options.score, 0),
      cleared: num(options.cleared, 0),
      selected: null,
      lastEvent: null,
    };
    loadSudokuPuzzle(session, num(options.puzzleIndex, 0));
    return session;
  }

  function dealSudoku(session) {
    const next = (session.puzzleIndex || 0) + 1;
    loadSudokuPuzzle(session, next);
    return snapshotSudoku(session);
  }

  function tapSudokuCell(session, i) {
    const idx = Number(i);
    if (session.status !== "playing") return snapshotSudoku(session);
    if (idx < 0 || idx >= SUDOKU_CELLS) return snapshotSudoku(session);
    if (session.given[idx]) {
      session.selected = null;
      session.lastEvent = { kind: "locked" };
      return snapshotSudoku(session);
    }
    session.selected = idx;
    session.lastEvent = { kind: "select", index: idx };
    return snapshotSudoku(session);
  }

  function setSudokuDigit(session, digit) {
    const d = Number(digit);
    const val = d >= 1 && d <= 6 ? d : 0;
    if (session.status !== "playing") return snapshotSudoku(session);
    const idx = session.selected;
    if (idx == null || idx < 0 || idx >= SUDOKU_CELLS) return snapshotSudoku(session);
    if (session.given[idx]) {
      session.lastEvent = { kind: "locked" };
      return snapshotSudoku(session);
    }
    session.grid[idx] = val;
    if (sudokuMatches(session.grid, session.solution) || sudokuComplete(session.grid)) {
      session.status = "won";
      session.cleared += 1;
      session.score += session.config.clearScore;
      session.lastEvent = { kind: "won", points: session.config.clearScore };
    } else {
      session.lastEvent = { kind: val ? "set" : "clear", digit: val };
    }
    return snapshotSudoku(session);
  }

  function snapshotSudoku(session) {
    const conflicts = sudokuConflicts(session.grid);
    return {
      type: "sudoku6",
      status: session.status,
      score: session.score,
      cleared: session.cleared,
      grid: session.grid.slice(),
      given: session.given.slice(),
      selected: session.selected,
      conflicts: conflicts,
      valid: sudokuValid(session.grid),
      puzzleIndex: session.puzzleIndex,
      lastEvent: session.lastEvent,
    };
  }

  const REV_N = 8;
  const REV_CELLS = 64;
  const DARK = 1;
  const LIGHT = 2;
  const REV_DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  function revIdx(r, c) {
    return r * REV_N + c;
  }

  function flipsAt(board, index, color) {
    if (board[index] !== 0) return [];
    const r0 = (index / REV_N) | 0;
    const c0 = index % REV_N;
    const other = color === DARK ? LIGHT : DARK;
    const flipped = [];
    for (let d = 0; d < REV_DIRS.length; d++) {
      const dr = REV_DIRS[d][0];
      const dc = REV_DIRS[d][1];
      const line = [];
      let r = r0 + dr;
      let c = c0 + dc;
      while (r >= 0 && r < REV_N && c >= 0 && c < REV_N) {
        const v = board[revIdx(r, c)];
        if (v === other) {
          line.push(revIdx(r, c));
        } else if (v === color) {
          if (line.length) {
            for (let k = 0; k < line.length; k++) flipped.push(line[k]);
          }
          break;
        } else {
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return flipped;
  }

  function listLegal(board, color) {
    const moves = [];
    for (let i = 0; i < REV_CELLS; i++) {
      if (board[i] !== 0) continue;
      if (flipsAt(board, i, color).length) moves.push(i);
    }
    return moves;
  }

  function legalMoves(boardOrSession, color) {
    if (boardOrSession && boardOrSession.board) {
      const col = color == null ? boardOrSession.turn : color;
      return listLegal(boardOrSession.board, col);
    }
    return listLegal(boardOrSession, color == null ? DARK : color);
  }

  function discCounts(board) {
    let dark = 0;
    let light = 0;
    for (let i = 0; i < REV_CELLS; i++) {
      if (board[i] === DARK) dark += 1;
      else if (board[i] === LIGHT) light += 1;
    }
    return { dark: dark, light: light };
  }

  function applyReversi(session, index, color) {
    const flipped = flipsAt(session.board, index, color);
    session.board[index] = color;
    for (let i = 0; i < flipped.length; i++) session.board[flipped[i]] = color;
    return flipped;
  }

  function finishIfNeeded(session) {
    const darkMoves = listLegal(session.board, DARK);
    const lightMoves = listLegal(session.board, LIGHT);
    if (!darkMoves.length && !lightMoves.length) {
      session.status = "done";
      session.lastEvent = session.lastEvent || { kind: "done" };
    }
  }

  function passIfNeeded(session) {
    const mine = listLegal(session.board, session.turn);
    if (mine.length) return;
    const other = session.turn === DARK ? LIGHT : DARK;
    const theirs = listLegal(session.board, other);
    if (!theirs.length) {
      session.status = "done";
      session.lastEvent = { kind: "done" };
      return;
    }
    session.turn = other;
    session.lastEvent = { kind: "pass", color: other === DARK ? 1 : 2 };
  }

  function createReversiSession(game) {
    const board = new Array(REV_CELLS).fill(0);
    board[27] = LIGHT;
    board[28] = DARK;
    board[35] = DARK;
    board[36] = LIGHT;
    const session = {
      type: "reversi",
      config: { type: "reversi" },
      board: board,
      turn: DARK,
      status: "playing",
      lastEvent: { kind: "deal" },
      ai: game && game.ai === false ? false : true,
    };
    return session;
  }

  function playReversi(session, i) {
    const idx = Number(i);
    if (session.status !== "playing") return snapshotReversi(session);
    if (idx < 0 || idx >= REV_CELLS || session.board[idx] !== 0) {
      session.lastEvent = { kind: "illegal" };
      return snapshotReversi(session);
    }
    const color = session.turn;
    const flipped = flipsAt(session.board, idx, color);
    if (!flipped.length) {
      session.lastEvent = { kind: "illegal" };
      return snapshotReversi(session);
    }
    applyReversi(session, idx, color);
    session.lastEvent = { kind: "place", index: idx, color: color, flipped: flipped.slice() };
    session.turn = color === DARK ? LIGHT : DARK;
    passIfNeeded(session);
    finishIfNeeded(session);
    return snapshotReversi(session);
  }

  function aiReversiPick(session) {
    const color = session && session.turn != null ? session.turn : LIGHT;
    const board = session && session.board ? session.board : session;
    const moves = listLegal(board, color);
    if (!moves.length) return -1;
    let best = moves[0];
    let bestN = -1;
    for (let i = 0; i < moves.length; i++) {
      const n = flipsAt(board, moves[i], color).length;
      if (n > bestN) {
        bestN = n;
        best = moves[i];
      }
    }
    return best;
  }

  function snapshotReversi(session) {
    const counts = discCounts(session.board);
    const moves = listLegal(session.board, session.turn);
    return {
      type: "reversi",
      status: session.status,
      board: session.board.slice(),
      turn: session.turn,
      legal: moves.slice(),
      dark: counts.dark,
      light: counts.light,
      score: counts.dark,
      lastEvent: session.lastEvent,
    };
  }

  function createHoopsSession(game) {
    const shots = num(game && game.shots, 10);
    const baseW = num(game && game.rimW, 10);
    return {
      type: "hoops",
      config: {
        type: "hoops",
        shots: shots,
        makePoints: num(game && game.makePoints, 2),
        longPoints: num(game && game.longPoints, 3),
        longAt: num(game && game.longAt, 1.45),
      },
      shots: shots,
      shotsTaken: 0,
      makes: 0,
      score: 0,
      status: "playing",
      aimX: 50,
      rimX: 50,
      rimW: baseW,
      baseW: baseW,
      distance: 1,
      speed: num(game && game.speed, 0.0024),
      amp: num(game && game.amp, 36),
      t: 0,
      lastEvent: { kind: "deal" },
    };
  }

  function hoopsTick(session, t) {
    session.t = t;
    if (session.status !== "playing") return snapshotHoops(session);
    const speed = session.speed || 0.0024;
    const amp = session.amp || 36;
    session.rimX = 50 + amp * Math.sin((t || 0) * speed);
    const pulse = 0.5 + 0.5 * Math.sin((t || 0) * speed * 0.42);
    session.distance = 1 + pulse;
    session.rimW = session.baseW * (session.distance >= (session.config.longAt || 1.45) ? 0.72 : 1);
    return snapshotHoops(session);
  }

  function hoopsShoot(session) {
    if (session.status !== "playing") return snapshotHoops(session);
    const w = session.rimW;
    const lo = session.rimX - w;
    const hi = session.rimX + w;
    const make = session.aimX >= lo && session.aimX <= hi;
    session.shotsTaken += 1;
    if (make) {
      const long = session.distance >= (session.config.longAt || 1.45);
      const pts = long ? session.config.longPoints : session.config.makePoints;
      session.score += pts;
      session.makes += 1;
      session.lastEvent = { kind: "make", points: pts, long: long };
    } else {
      session.lastEvent = { kind: "miss", points: 0 };
    }
    if (session.shotsTaken >= session.shots) {
      session.status = "done";
    }
    return snapshotHoops(session);
  }

  function snapshotHoops(session) {
    return {
      type: "hoops",
      status: session.status,
      score: session.score,
      shots: session.shots,
      shotsTaken: session.shotsTaken,
      shotsLeft: Math.max(0, session.shots - session.shotsTaken),
      makes: session.makes,
      aimX: session.aimX,
      rimX: session.rimX,
      rimW: session.rimW,
      distance: session.distance,
      lastEvent: session.lastEvent,
    };
  }

  function normalizeQuestions(game) {
    const raw = (game && game.questions) || [];
    return raw.map(function (q) {
      return {
        q: String(q.q || q.prompt || ""),
        choices: (q.choices || []).slice(0, 4),
        answerIndex: num(q.answerIndex, 0),
        kind: q.kind === "jumble" ? "jumble" : "trivia",
      };
    });
  }

  function createQuizSession(game, rng) {
    const all = normalizeQuestions(game);
    const sitting = num(game && game.sitting, 12);
    const rand = rng || defaultRng();
    const shuffled = shuffle(all, rand);
    const picked = shuffled.slice(0, Math.min(sitting, shuffled.length));
    return {
      type: "quiznight",
      config: {
        type: "quiznight",
        triviaPoints: num(game && game.triviaPoints, 10),
        jumblePoints: num(game && game.jumblePoints, 15),
        sitting: sitting,
      },
      bank: all,
      questions: picked,
      index: 0,
      score: 0,
      asked: 0,
      locked: false,
      picked: null,
      status: "playing",
      lastEvent: { kind: "deal" },
    };
  }

  function currentQuiz(session) {
    return session.questions[session.index] || null;
  }

  function answerQuiz(session, i) {
    if (session.status !== "playing" || session.locked) return snapshotQuiz(session);
    const q = currentQuiz(session);
    if (!q) {
      session.status = "done";
      return snapshotQuiz(session);
    }
    const choice = Number(i);
    session.locked = true;
    session.picked = choice;
    session.asked += 1;
    const ok = choice === q.answerIndex;
    const pts = q.kind === "jumble" ? session.config.jumblePoints : session.config.triviaPoints;
    if (ok) session.score += pts;
    session.lastEvent = { kind: ok ? "correct" : "wrong", points: ok ? pts : 0, kindQ: q.kind };
    return snapshotQuiz(session);
  }

  function quizNext(session) {
    if (session.status !== "playing") return snapshotQuiz(session);
    if (!session.locked) return snapshotQuiz(session);
    if (session.index + 1 >= session.questions.length) {
      session.status = "done";
      session.lastEvent = { kind: "done" };
      return snapshotQuiz(session);
    }
    session.index += 1;
    session.locked = false;
    session.picked = null;
    session.lastEvent = { kind: "next" };
    return snapshotQuiz(session);
  }

  function takeQuiz(session) {
    session.status = "done";
    session.lastEvent = { kind: "take" };
    return snapshotQuiz(session);
  }

  function snapshotQuiz(session) {
    const q = currentQuiz(session);
    const last = session.index + 1 >= session.questions.length;
    return {
      type: "quiznight",
      status: session.status,
      score: session.score,
      index: session.index,
      total: session.questions.length,
      asked: session.asked,
      locked: session.locked,
      picked: session.picked,
      canNext: session.status === "playing" && session.locked && !last,
      canTake: session.status === "playing" && session.locked && last,
      question: q ? q.q : "",
      choices: q ? q.choices.slice() : [],
      kind: q ? q.kind : "trivia",
      answerIndex: q ? q.answerIndex : -1,
      triviaPoints: session.config.triviaPoints,
      jumblePoints: session.config.jumblePoints,
      lastEvent: session.lastEvent,
    };
  }

  E.createSudokuSession = createSudokuSession;
  E.dealSudoku = dealSudoku;
  E.tapSudokuCell = tapSudokuCell;
  E.setSudokuDigit = setSudokuDigit;
  E.snapshotSudoku = snapshotSudoku;
  E.sudokuValid = sudokuValid;
  E.sudokuConflicts = sudokuConflicts;

  E.createReversiSession = createReversiSession;
  E.playReversi = playReversi;
  E.legalMoves = legalMoves;
  E.snapshotReversi = snapshotReversi;
  E.aiReversiPick = aiReversiPick;

  E.createHoopsSession = createHoopsSession;
  E.hoopsTick = hoopsTick;
  E.hoopsShoot = hoopsShoot;
  E.snapshotHoops = snapshotHoops;

  E.createQuizSession = createQuizSession;
  E.answerQuiz = answerQuiz;
  E.quizNext = quizNext;
  E.takeQuiz = takeQuiz;
  E.snapshotQuiz = snapshotQuiz;
});
