"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/arcade.js");
const def = require("../games/reversi.json");

test("Reversi JSON id type title", () => {
  assert.equal(def.id, "reversi");
  assert.equal(def.type, "reversi");
  assert.equal(def.title, "Reversi");
  assert.notEqual(def.title.toLowerCase(), "othello");
});

test("opening has four center discs", () => {
  const session = E.createReversiSession(def);
  const b = session.board;
  assert.equal(b.length, 64);
  let filled = 0;
  for (let i = 0; i < 64; i++) if (b[i]) filled += 1;
  assert.equal(filled, 4);
  assert.equal(b[27], 2);
  assert.equal(b[28], 1);
  assert.equal(b[35], 1);
  assert.equal(b[36], 2);
  const snap = E.snapshotReversi(session);
  assert.equal(snap.dark, 2);
  assert.equal(snap.light, 2);
  assert.equal(snap.turn, 1);
});

test("known opening flip at c4", () => {
  const session = E.createReversiSession(def);
  E.playReversi(session, 26);
  assert.equal(session.board[26], 1);
  assert.equal(session.board[27], 1);
  assert.equal(session.lastEvent.kind, "place");
  assert.ok(session.lastEvent.flipped.indexOf(27) >= 0);
});

test("illegal occupied reject", () => {
  const session = E.createReversiSession(def);
  const before = session.board.slice();
  E.playReversi(session, 27);
  assert.equal(session.lastEvent.kind, "illegal");
  assert.deepEqual(session.board, before);
  E.playReversi(session, 0);
  assert.equal(session.lastEvent.kind, "illegal");
  assert.deepEqual(session.board, before);
});

test("AI returns a legal index", () => {
  const session = E.createReversiSession(def);
  E.playReversi(session, 26);
  const pick = E.aiReversiPick(session);
  const legal = E.legalMoves(session);
  assert.ok(pick >= 0);
  assert.ok(legal.indexOf(pick) >= 0);
  const also = E.legalMoves(session.board, session.turn);
  assert.ok(also.indexOf(pick) >= 0);
});


test("legal moves, disc counts, and whose turn", () => {
  const session = E.createReversiSession(def);
  const snap = E.snapshotReversi(session);
  assert.ok(snap.legal.length > 0);
  snap.legal.forEach(function (i) {
    assert.equal(session.board[i], 0);
  });
  assert.equal(snap.dark, 2);
  assert.equal(snap.light, 2);
  assert.equal(snap.turn, 1);
  E.playReversi(session, snap.legal[0]);
  const after = E.snapshotReversi(session);
  assert.equal(after.turn, 2);
  assert.ok(after.dark >= 3);
});
