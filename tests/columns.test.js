"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/engine.js");
const zipDef = require("../games/zip21.json");
const chugDef = require("../games/chug21.json");

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

function primed(extra) {
  const session = E.createColumnsSession(columnsGame(extra), seedRng(11));
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

test("zip21 JSON drives 4 columns, 3 skips, card pieces", () => {
  const session = E.createColumnsSession(zipDef, seedRng(1));
  assert.equal(session.config.type, "columns21");
  assert.equal(session.columns.length, 4);
  assert.equal(session.config.columns, 4);
  assert.equal(session.skipsLeft, 3);
  assert.equal(session.config.skips, 3);
  assert.equal(session.config.piece, "card");
  assert.equal(session.config.maxCards, 5);
  assert.equal(session.config.target, 21);
  assert.ok(session.incoming);
  assert.equal(session.status, "playing");
});

test("chug21 JSON drives 5 columns, 1 skip, mug pieces", () => {
  const session = E.createColumnsSession(chugDef, seedRng(2));
  assert.equal(session.columns.length, 5);
  assert.equal(session.config.columns, 5);
  assert.equal(session.skipsLeft, 1);
  assert.equal(session.config.skips, 1);
  assert.equal(session.config.piece, "mug");
  const snap = E.snapshotColumns(session);
  assert.equal(snap.piece, "mug");
  assert.equal(snap.columns.length, 5);
});

test("exact 21 clears the column and scores target + clearBonus", () => {
  const session = primed({ clearBonus: 0 });
  session.columns[0] = [card("10")];
  session.incoming = card("A");
  E.placeColumn(session, 0);
  assert.equal(session.columns[0].length, 0);
  assert.equal(session.score, 21);
  assert.equal(session.clears, 1);
  assert.equal(session.busts, 0);
  assert.equal(session.lastEvent.kind, "clear");
  assert.equal(session.lastEvent.reason, "target");
  assert.equal(session.lastEvent.points, 21);
  assert.equal(session.incoming.rank, "4");
});

test("exact 21 with clearBonus adds target plus bonus", () => {
  const session = primed({ clearBonus: 5 });
  session.columns[1] = [card("K")];
  session.incoming = card("A");
  E.placeColumn(session, 1);
  assert.equal(session.score, 26);
  assert.equal(session.columns[1].length, 0);
  assert.equal(session.lastEvent.points, 26);
});

test("five cards under 21 clear and score that total", () => {
  const session = primed();
  session.columns[2] = [card("2"), card("3"), card("4"), card("5")];
  session.incoming = card("4");
  E.placeColumn(session, 2);
  assert.equal(session.columns[2].length, 0);
  assert.equal(session.score, 18);
  assert.equal(session.clears, 1);
  assert.equal(session.lastEvent.kind, "clear");
  assert.equal(session.lastEvent.reason, "maxCards");
  assert.equal(session.lastEvent.total, 18);
  assert.equal(session.lastEvent.points, 18);
});

test("bust penalty empties the column and consumes the incoming card", () => {
  const session = primed({ bustPenalty: 10 });
  session.columns[0] = [card("K"), card("Q")];
  session.incoming = card("5");
  E.placeColumn(session, 0);
  assert.equal(session.columns[0].length, 0);
  assert.equal(session.score, -10);
  assert.equal(session.busts, 1);
  assert.equal(session.clears, 0);
  assert.equal(session.lastEvent.kind, "bust");
  assert.equal(session.lastEvent.points, -10);
  const leftInPlay = session.columns.flat().concat(session.incoming ? [session.incoming] : []);
  assert.equal(
    leftInPlay.some(function (c) {
      return c.rank === "5";
    }),
    false
  );
  assert.ok(
    session.discard.some(function (c) {
      return c.rank === "5";
    })
  );
});

test("skip discards incoming, draws next, decrements skipsLeft", () => {
  const session = primed({ skips: 3 });
  session.skipsLeft = 3;
  session.incoming = card("9");
  E.skipColumn(session);
  assert.equal(session.skipsLeft, 2);
  assert.equal(session.incoming.rank, "4");
  assert.equal(session.lastEvent.kind, "skip");
  assert.ok(
    session.discard.some(function (c) {
      return c.rank === "9";
    })
  );
});

test("cannot skip at 0", () => {
  const session = primed({ skips: 0 });
  session.skipsLeft = 0;
  session.incoming = card("7");
  assert.throws(function () {
    E.skipColumn(session);
  }, /no skips left/);
  assert.equal(session.skipsLeft, 0);
  assert.equal(session.incoming.rank, "7");
});

test("soft ace in a column counts 11 unless that busts the column", () => {
  const session = primed();
  session.columns[0] = [card("9"), card("5")];
  session.incoming = card("A");
  E.placeColumn(session, 0);
  assert.equal(session.busts, 0);
  assert.equal(session.columns[0].length, 3);
  assert.equal(E.handValue(session.columns[0], 21), 15);
  assert.equal(session.lastEvent.kind, "place");
  assert.equal(session.lastEvent.total, 15);
});

test("soft ace can still zip a column at 21", () => {
  const session = primed();
  session.columns[3] = [card("K")];
  session.incoming = card("A");
  E.placeColumn(session, 3);
  assert.equal(session.clears, 1);
  assert.equal(session.score, 21);
  assert.equal(session.columns[3].length, 0);
});

test("player can tap a column to take a bust when skips are gone", () => {
  const session = primed({ skips: 0 });
  session.skipsLeft = 0;
  session.columns = [
    [card("K"), card("9")],
    [card("Q"), card("9")],
    [card("J"), card("8")],
    [card("10"), card("10")],
  ];
  session.incoming = card("K");
  E.placeColumn(session, 0);
  assert.equal(session.busts, 1);
  assert.equal(session.columns[0].length, 0);
  assert.equal(session.columns[1].length, 2);
  assert.equal(session.score, -10);
});

test("empty shoe after consuming incoming sets status done", () => {
  const session = primed();
  session.deck = [];
  session.columns[0] = [card("10")];
  session.incoming = card("5");
  E.placeColumn(session, 0);
  assert.equal(session.status, "done");
  assert.equal(session.incoming, null);
  const snap = E.snapshotColumns(session);
  assert.equal(snap.status, "done");
  assert.equal(snap.incoming, null);
});

test("run21 exports still create HIT/STAY sessions", () => {
  const session = E.createSession({ type: "run21", thinDeck: 0 }, seedRng(4));
  session.deck = [card("9"), card("8")];
  E.deal(session);
  E.stay(session);
  assert.equal(session.status, "stay");
  assert.equal(session.score, 17);
  assert.equal(typeof E.hit, "function");
  assert.equal(typeof E.createColumnsSession, "function");
});
