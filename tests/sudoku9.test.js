"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/arcade.js");
const def = require("../games/sudoku9.json");

test("Sudoku 9 JSON id type title and five 81-cell puzzles", () => {
  assert.equal(def.id, "sudoku9");
  assert.equal(def.type, "sudoku9");
  assert.equal(def.title, "Sudoku 9");
  assert.ok(def.puzzles.length >= 5);
  def.puzzles.forEach(function (p) {
    assert.equal(p.puzzle.length, 81);
    assert.equal(p.solution.length, 81);
    assert.match(p.puzzle, /^[0-9]+$/);
    assert.match(p.solution, /^[1-9]+$/);
  });
});

test("9x9 given cell is not editable", () => {
  const session = E.createSudokuSession(def);
  assert.equal(session.size, 9);
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

test("9x9 duplicate in row is invalid", () => {
  const session = E.createSudokuSession(def);
  let givenDigit = 0;
  let emptyIdx = -1;
  for (let c = 0; c < 9; c++) {
    const i = c;
    if (session.grid[i] && !givenDigit) givenDigit = session.grid[i];
    if (!session.grid[i] && emptyIdx < 0) emptyIdx = i;
  }
  assert.ok(givenDigit >= 1);
  assert.ok(emptyIdx >= 0);
  E.tapSudokuCell(session, emptyIdx);
  E.setSudokuDigit(session, givenDigit);
  assert.equal(session.grid[emptyIdx], givenDigit);
  assert.equal(E.sudokuValid(session), false);
});

test("9x3 box rejects a duplicate", () => {
  const grid = new Array(81).fill(0);
  grid[0] = 1;
  grid[1 * 9 + 2] = 1;
  assert.equal(E.sudokuValid(grid), false);
  const ok = new Array(81).fill(0);
  ok[0] = 1;
  ok[1 * 9 + 3] = 1;
  assert.equal(E.sudokuValid(ok), true);
});

test("complete 9x9 grid wins", () => {
  const session = E.createSudokuSession(def, { puzzleIndex: 0 });
  for (let i = 0; i < 81; i++) {
    if (session.given[i]) continue;
    E.tapSudokuCell(session, i);
    E.setSudokuDigit(session, session.solution[i]);
  }
  const snap = E.snapshotSudoku(session);
  assert.equal(snap.status, "won");
  assert.ok(snap.score >= 1);
  assert.equal(E.sudokuValid(session), true);
});

test("digit-first ink fills the next empty cell", () => {
  const session = E.createSudokuSession(def);
  const empty = session.given.findIndex(function (g) {
    return !g;
  });
  E.setSudokuDigit(session, 5);
  assert.equal(session.ink, 5);
  E.tapSudokuCell(session, empty);
  assert.equal(session.grid[empty], 5);
});
