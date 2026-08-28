"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/engine.js");
const runDef = require("../games/run21.json");
const zipDef = require("../games/zip21.json");
const chugDef = require("../games/chug21.json");

function card(rank, suit) {
  return { rank, suit: suit || "\u2660" };
}

function seedRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function primed(extra) {
  const game = Object.assign({}, runDef, extra || {});
  const session = E.createRunLanesSession(game, seedRng(21));
  session.deck = [card("2"), card("3"), card("4"), card("5")];
  session.discard = [];
  session.status = "playing";
  session.lastEvent = null;
  session.incoming = card("7");
  session.skipsLeft = session.config.skips;
  session.columns = session.columns.map(function () {
    return { cards: [], locked: false, outcome: "open" };
  });
  return session;
}

test("5 columns from JSON", () => {
  const session = E.createRunLanesSession(runDef, seedRng(1));
  assert.equal(runDef.type, "runlanes");
  assert.equal(runDef.title, "Run 21");
  assert.equal(session.config.type, "runlanes");
  assert.equal(session.columns.length, 5);
  assert.equal(session.config.columns, 5);
  assert.equal(session.skipsLeft, 1);
  assert.equal(session.config.skips, 1);
  assert.equal(session.config.target, 21);
  assert.equal(session.config.perfect, 105);
  assert.equal(session.config.runBonus, 0);
  assert.equal(session.config.piece, "card");
  const snap = E.snapshotRunLanes(session);
  assert.equal(snap.columns.length, 5);
  assert.equal(snap.perfect, 105);
  assert.equal(snap.status, "playing");
  assert.ok(snap.incoming);
  snap.columns.forEach(function (col) {
    assert.equal(col.locked, false);
    assert.equal(col.outcome, "open");
    assert.equal(col.cards.length, 0);
  });
});

test("1 skip then skip at 0 throws", () => {
  const session = primed();
  session.skipsLeft = 1;
  session.incoming = card("9");
  E.skipRunLane(session);
  assert.equal(session.skipsLeft, 0);
  assert.equal(session.lastEvent.kind, "skip");
  assert.equal(session.incoming.rank, "5");
  assert.throws(function () {
    E.skipRunLane(session);
  }, /no skips left/);
  assert.equal(session.skipsLeft, 0);
  assert.equal(session.incoming.rank, "5");
});

test("place under 21 stays open", () => {
  const session = primed();
  session.incoming = card("K");
  E.placeRunLane(session, 0);
  assert.equal(session.columns[0].locked, false);
  assert.equal(session.columns[0].outcome, "open");
  assert.equal(session.columns[0].cards.length, 1);
  assert.equal(session.columns[0].cards[0].rank, "K");
  const snap = E.snapshotRunLanes(session);
  assert.equal(snap.columns[0].locked, false);
  assert.equal(snap.columns[0].total, 10);
  assert.equal(snap.score, 10);
  assert.equal(snap.status, "playing");
});

test("place to 21 locks, still shows cards, scores 21", () => {
  const session = primed();
  session.columns[0].cards = [card("K")];
  session.incoming = card("A");
  E.placeRunLane(session, 0);
  assert.equal(session.columns[0].locked, true);
  assert.equal(session.columns[0].outcome, "run");
  assert.equal(session.columns[0].cards.length, 2);
  const snap = E.snapshotRunLanes(session);
  assert.equal(snap.columns[0].cards.length, 2);
  assert.equal(snap.columns[0].locked, true);
  assert.equal(snap.columns[0].total, 21);
  assert.equal(snap.score, 21);
  assert.equal(snap.status, "playing");
});

test("three-card 21 locks as 21, not a run", () => {
  const session = primed();
  session.columns[1].cards = [card("8"), card("6")];
  session.incoming = card("7");
  E.placeRunLane(session, 1);
  assert.equal(session.columns[1].locked, true);
  assert.equal(session.columns[1].outcome, "21");
  assert.equal(session.columns[1].cards.length, 3);
  assert.equal(E.snapshotRunLanes(session).score, 21);
});

test("bust locks, that lane contributes 0", () => {
  const session = primed();
  session.columns[0].cards = [card("K"), card("Q")];
  session.columns[1].cards = [card("9")];
  session.incoming = card("5");
  E.placeRunLane(session, 0);
  assert.equal(session.columns[0].locked, true);
  assert.equal(session.columns[0].outcome, "bust");
  assert.equal(session.columns[0].cards.length, 3);
  assert.equal(session.columns[0].cards[2].rank, "5");
  const snap = E.snapshotRunLanes(session);
  assert.equal(snap.columns[0].cards.length, 3);
  assert.equal(snap.columns[0].locked, true);
  assert.equal(snap.score, 9);
});

test("stay locks at current total", () => {
  const session = primed();
  session.columns[2].cards = [card("K"), card("8")];
  E.stayRunLane(session, 2);
  assert.equal(session.columns[2].locked, true);
  assert.equal(session.columns[2].outcome, "stay");
  assert.equal(session.columns[2].cards.length, 2);
  const snap = E.snapshotRunLanes(session);
  assert.equal(snap.columns[2].total, 18);
  assert.equal(snap.score, 18);
  assert.equal(snap.status, "playing");
  assert.ok(snap.incoming);
});

test("cannot place on locked", () => {
  const session = primed();
  session.columns[0].cards = [card("10")];
  E.stayRunLane(session, 0);
  session.incoming = card("2");
  assert.throws(function () {
    E.placeRunLane(session, 0);
  }, /locked/);
  assert.equal(session.columns[0].cards.length, 1);
  assert.equal(session.incoming.rank, "2");
});

test("when all 5 locked, status done, score = sum", () => {
  const session = primed();
  session.columns[0].cards = [card("10"), card("8")];
  session.columns[1].cards = [card("K"), card("A")];
  session.columns[1].locked = true;
  session.columns[1].outcome = "run";
  session.columns[2].cards = [card("9"), card("9")];
  session.columns[3].cards = [card("7")];
  session.columns[4].cards = [card("K"), card("Q"), card("5")];
  session.columns[4].locked = true;
  session.columns[4].outcome = "bust";
  session.incoming = card("3");
  E.stayRunLane(session, 0);
  E.stayRunLane(session, 2);
  E.stayRunLane(session, 3);
  assert.equal(session.status, "done");
  const snap = E.snapshotRunLanes(session);
  assert.equal(snap.status, "done");
  assert.equal(snap.score, 64);
  assert.equal(snap.sessionScore, 64);
  assert.equal(snap.rounds, 1);
});

test("deal again resets lanes", () => {
  const session = primed();
  session.columns.forEach(function (col, i) {
    col.cards = [card(String(i + 2))];
    col.locked = true;
    col.outcome = "stay";
  });
  session.status = "done";
  session.rounds = 1;
  session.sessionScore = 20;
  session.incoming = null;
  E.dealRunLanes(session);
  const snap = E.snapshotRunLanes(session);
  assert.equal(snap.status, "playing");
  assert.equal(snap.columns.length, 5);
  snap.columns.forEach(function (col) {
    assert.equal(col.cards.length, 0);
    assert.equal(col.locked, false);
    assert.equal(col.outcome, "open");
  });
  assert.ok(snap.incoming);
  assert.equal(snap.skipsLeft, 1);
  assert.equal(snap.score, 0);
  assert.equal(snap.rounds, 1);
  assert.equal(snap.sessionScore, 20);
  assert.equal(snap.deckCount, 51);
});

test("shoe empty locks remaining open lanes at current totals", () => {
  const session = primed();
  session.deck = [];
  session.columns[0].cards = [card("9")];
  session.columns[1].cards = [card("8")];
  session.incoming = card("2");
  E.placeRunLane(session, 0);
  assert.equal(session.status, "done");
  const snap = E.snapshotRunLanes(session);
  assert.equal(snap.incoming, null);
  assert.equal(snap.columns[0].locked, true);
  assert.equal(snap.columns[0].outcome, "stay");
  assert.equal(snap.columns[0].total, 11);
  assert.equal(snap.columns[1].locked, true);
  assert.equal(snap.columns[1].outcome, "stay");
  assert.equal(snap.columns[1].total, 8);
  assert.equal(snap.score, 19);
});

test("two-card 21 is worth 21 when runBonus is 0", () => {
  const session = primed({ runBonus: 0 });
  session.columns[0].cards = [card("A")];
  session.incoming = card("K");
  E.placeRunLane(session, 0);
  assert.equal(session.columns[0].outcome, "run");
  assert.equal(E.snapshotRunLanes(session).score, 21);
});

test("runBonus adds only on a two-card 21", () => {
  const session = primed({ runBonus: 5 });
  session.columns[0].cards = [card("A")];
  session.incoming = card("K");
  E.placeRunLane(session, 0);
  assert.equal(E.snapshotRunLanes(session).score, 26);
});

test("HIT/STAY run21 helpers still exist", () => {
  const session = E.createSession({ type: "run21", thinDeck: 0 }, seedRng(4));
  session.deck = [card("9"), card("8")];
  E.deal(session);
  E.stay(session);
  assert.equal(session.status, "stay");
  assert.equal(typeof E.hit, "function");
  assert.equal(typeof E.createRunLanesSession, "function");
});

test("Zip and Chug stay type columns21", () => {
  assert.equal(zipDef.type, "columns21");
  assert.equal(chugDef.type, "columns21");
  const zip = E.createColumnsSession(zipDef, seedRng(1));
  const chug = E.createColumnsSession(chugDef, seedRng(2));
  assert.equal(zip.config.type, "columns21");
  assert.equal(chug.config.type, "columns21");
});
