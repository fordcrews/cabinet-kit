"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/engine.js");
const Sol = require("../js/solitaire.js");
const Eleven = require("../js/11up.js");
const Yacht = require("../js/yacht.js");
const runDef = require("../games/run21.json");
const elevenDef = require("../games/elevenup.json");
const yachtDef = require("../games/yacht.json");
require("../js/feel-engine.js");

function card(rank, suit) {
  return { rank, suit: suit || "♠" };
}

function seedRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function primedLanes() {
  const session = E.createRunLanesSession(runDef, seedRng(21));
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

function columnsGame(extra) {
  return Object.assign(
    {
      type: "columns21",
      columns: 4,
      skips: 3,
      maxCards: 5,
      target: 21,
      bustPenalty: 10,
      clearBonus: 0,
      thinDeck: 0,
      piece: "card",
    },
    extra || {}
  );
}

function primedColumns() {
  const session = E.createColumnsSession(columnsGame(), seedRng(11));
  session.deck = [card("2"), card("3"), card("4")];
  session.discard = [];
  session.score = 0;
  session.clears = 0;
  session.busts = 0;
  session.status = "playing";
  session.lastEvent = null;
  session.incoming = card("K");
  session.columns = session.columns.map(function () {
    return [];
  });
  return session;
}

function primedEleven() {
  const session = Eleven.createElevenSession(elevenDef, seedRng(11));
  session.grid = session.grid.map(function () {
    return null;
  });
  session.stock = [card("2"), card("3"), card("4")];
  session.score = 0;
  session.selected = null;
  session.status = "playing";
  session.lastEvent = null;
  return session;
}

test("canSkip is true with skips, false at 0", () => {
  const session = primedLanes();
  session.skipsLeft = 1;
  session.incoming = card("9");
  let snap = E.snapshotRunLanes(session);
  assert.equal(snap.canSkip, true);
  assert.equal(snap.score + " / " + snap.perfect, snap.score + " / 105");
  E.skipRunLane(session);
  snap = E.snapshotRunLanes(session);
  assert.equal(snap.skipsLeft, 0);
  assert.equal(snap.canSkip, false);
});

test("locked lane stays visible with outcome stay/bust/21", () => {
  const session = primedLanes();
  session.columns[0].cards = [card("K"), card("Q")];
  session.incoming = card("5");
  E.placeRunLane(session, 0);
  const bust = E.snapshotRunLanes(session).columns[0];
  assert.equal(bust.locked, true);
  assert.equal(bust.outcome, "bust");
  session.columns[1].cards = [card("8"), card("6")];
  session.incoming = card("7");
  E.placeRunLane(session, 1);
  const twenty = E.snapshotRunLanes(session).columns[1];
  assert.equal(twenty.locked, true);
  assert.equal(twenty.outcome, "21");
  session.columns[2].cards = [card("9")];
  E.stayRunLane(session, 2);
  const stay = E.snapshotRunLanes(session).columns[2];
  assert.equal(stay.locked, true);
  assert.equal(stay.outcome, "stay");
});

test("canSkip false at 0 remaining", () => {
  const session = primedColumns();
  session.skipsLeft = 1;
  session.incoming = card("9");
  assert.equal(E.snapshotColumns(session).canSkip, true);
  E.skipColumn(session);
  assert.equal(session.skipsLeft, 0);
  assert.equal(E.snapshotColumns(session).canSkip, false);
  assert.throws(function () {
    E.skipColumn(session);
  }, /no skips left/);
});

test("illegal pair records both cells", () => {
  const session = primedEleven();
  session.grid[18] = card("2");
  session.grid[19] = card("8");
  Eleven.tapEleven(session, 18);
  Eleven.tapEleven(session, 19);
  assert.equal(session.lastEvent.kind, "illegal");
  const snap = Eleven.snapshotEleven(session);
  assert.equal(snap.selected, null);
  assert.equal(snap.lastEvent.kind, "illegal");
  assert.equal(session.grid[18].rank, "2");
  assert.equal(session.grid[19].rank, "8");
});

test("thirteenth score ends cleanly and cannot score again", () => {
  const session = Yacht.createYachtSession(yachtDef, seedRng(13));
  Yacht.YACHT_CATEGORIES.forEach(function (id) {
    session.dice = [2, 3, 4, 5, 6];
    session.rollsUsed = 1;
    session.rollsLeft = 0;
    session.held = [true, false, false, false, false];
    Yacht.scoreYacht(session, id);
  });
  const snap = Yacht.snapshotYacht(session);
  assert.equal(snap.status, "done");
  assert.equal(snap.canRoll, false);
  assert.equal(snap.canScore, false);
  assert.equal(snap.turn, 13);
  assert.throws(function () {
    Yacht.scoreYacht(session, "chance");
  });
});
