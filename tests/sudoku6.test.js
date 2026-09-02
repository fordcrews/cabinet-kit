"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/arcade.js");
const def = require("../games/sudoku6.json");

test("Sudoku 6 JSON id type title and five puzzles", () => {
  assert.equal(def.id, "sudoku6");
  assert.equal(def.type, "sudoku6");
  assert.equal(def.title, "Sudoku 6");
  assert.ok(def.puzzles.length >= 5);
  def.puzzles.forEach(function (p) {
    assert.equal(p.puzzle.length, 36);
    assert.equal(p.solution.length, 36);
    assert.match(p.puzzle, /^[0-6]+$/);
    assert.match(p.solution, /^[1-6]+$/);
  });
});

test("given cell is not editable", () => {
  const session = E.createSudokuSession(def);
  const idx = session.given.findIndex(function (g) {
    return g;
  });
  assert.ok(idx >= 0);
  const before = session.grid[idx];
  E.tapSudokuCell(session, idx);
  E.setSudokuDigit(session, before === 1 ? 2 : 1);
  assert.equal(session.grid[idx], before);
  assert.equal(session.given[idx], true);
});

test("duplicate in row is invalid", () => {
  const session = E.createSudokuSession(def);
  const row = 0;
  let givenDigit = 0;
  let givenCol = -1;
  let emptyCol = -1;
  for (let c = 0; c < 6; c++) {
    const i = row * 6 + c;
    if (session.grid[i] && givenCol < 0) {
      givenDigit = session.grid[i];
      givenCol = c;
    }
    if (!session.grid[i] && emptyCol < 0) emptyCol = c;
  }
  assert.ok(givenDigit >= 1);
  assert.ok(emptyCol >= 0);
  const emptyIdx = row * 6 + emptyCol;
  E.tapSudokuCell(session, emptyIdx);
  E.setSudokuDigit(session, givenDigit);
  assert.equal(session.grid[emptyIdx], givenDigit);
  assert.equal(E.sudokuValid(session), false);
  assert.equal(E.sudokuValid(session.grid), false);
});

test("complete correct grid wins", () => {
  const session = E.createSudokuSession(def, { puzzleIndex: 0 });
  for (let i = 0; i < 36; i++) {
    if (session.given[i]) continue;
    E.tapSudokuCell(session, i);
    E.setSudokuDigit(session, session.solution[i]);
  }
  const snap = E.snapshotSudoku(session);
  assert.equal(snap.status, "won");
  assert.ok(snap.score >= 1);
  assert.equal(E.sudokuValid(session), true);
});

test("2x3 box rejects a duplicate", () => {
  const grid = new Array(36).fill(0);
  grid[0] = 1;
  grid[1 * 6 + 2] = 1;
  assert.equal(E.sudokuValid(grid), false);
  const ok = new Array(36).fill(0);
  ok[0] = 1;
  ok[1 * 6 + 3] = 1;
  assert.equal(E.sudokuValid(ok), true);
});


test("digit pad works before a cell is selected", () => {
  const session = E.createSudokuSession(def);
  const empty = session.given.findIndex(function (g) {
    return !g;
  });
  E.setSudokuDigit(session, 3);
  assert.equal(session.ink, 3);
  E.tapSudokuCell(session, empty);
  assert.equal(session.grid[empty], 3);
});

test("dealSudoku advances to the next puzzle", () => {
  const session = E.createSudokuSession(def, { puzzleIndex: 0 });
  assert.equal(session.puzzleIndex, 0);
  E.dealSudoku(session);
  assert.equal(session.puzzleIndex, 1);
  assert.equal(session.status, "playing");
  const snap = E.snapshotSudoku(session);
  assert.equal(snap.puzzleIndex, 1);
  assert.ok(snap.given.some(Boolean));
});
