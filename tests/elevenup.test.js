"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/11up.js");
const elevenDef = require("../games/elevenup.json");

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

function primed(extra) {
  const game = Object.assign({}, elevenDef, extra || {});
  const session = E.createElevenSession(game, seedRng(11));
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

test("11 Up JSON id type title and scoring knobs", () => {
  assert.equal(elevenDef.id, "elevenup");
  assert.equal(elevenDef.type, "elevenup");
  assert.equal(elevenDef.title, "11 Up");
  const session = E.createElevenSession(elevenDef, seedRng(1));
  assert.equal(session.config.type, "elevenup");
  assert.equal(session.config.pairScore, 2000);
  assert.equal(session.config.passPenalty, 1000);
  assert.equal(session.config.clearBonus, 25000);
  assert.equal(session.config.dealCount, 18);
  assert.equal(session.config.cells, 18);
  assert.equal(session.config.stacks, 3);
  assert.equal(session.config.pyramidRows, 3);
  assert.equal(session.config.rounds, 2);
  assert.equal(session.grid.length, 18);
  const filled = session.grid.filter(Boolean).length;
  assert.equal(filled, 18);
  assert.equal(session.stock.length, 34);
  const snap = E.snapshotEleven(session);
  assert.equal(snap.type, "elevenup");
  assert.equal(snap.status, "playing");
  assert.equal(snap.stockCount, 34);
  assert.equal(snap.round, 1);
  assert.equal(snap.rounds, 2);
});

test("pair 5+6 legal", () => {
  assert.equal(E.elevenPairLegal(card("5"), card("6")), true);
  assert.equal(E.elevenValue(card("5")), 5);
  assert.equal(E.elevenValue("6"), 6);
});

test("A+10 legal", () => {
  assert.equal(E.elevenValue("A"), 1);
  assert.equal(E.elevenValue(card("10")), 10);
  assert.equal(E.elevenPairLegal(card("A"), card("10")), true);
  assert.equal(E.elevenPairLegal(card("10"), card("A")), true);
});

test("2+8 illegal", () => {
  assert.equal(E.elevenPairLegal(card("2"), card("8")), false);
  assert.equal(E.elevenValue("2") + E.elevenValue("8"), 10);
});

test("two Jacks legal", () => {
  assert.equal(E.elevenPairLegal(card("J", "♠"), card("J", "♥")), true);
  assert.equal(E.elevenPairLegal(card("Q", "♠"), card("Q", "♦")), true);
  assert.equal(E.elevenPairLegal(card("K", "♣"), card("K", "♥")), true);
});

test("J+Q illegal", () => {
  assert.equal(E.elevenPairLegal(card("J"), card("Q")), false);
  assert.equal(E.elevenPairLegal(card("J"), card("10")), false);
  assert.equal(E.elevenPairLegal(card("K"), card("A")), false);
});

test("tap removes a legal pair and scores pairScore", () => {
  const session = primed();
  session.grid[0] = card("5", "♠");
  session.grid[1] = card("6", "♥");
  E.tapEleven(session, 0);
  assert.equal(session.selected, 0);
  E.tapEleven(session, 1);
  assert.equal(session.grid[0], null);
  assert.equal(session.grid[1], null);
  assert.equal(session.score, 11);
  assert.equal(session.selected, null);
  assert.equal(session.lastEvent.kind, "pair");
});

test("illegal second tap deselects without removing", () => {
  const session = primed();
  session.grid[0] = card("2");
  session.grid[1] = card("8");
  E.tapEleven(session, 0);
  E.tapEleven(session, 1);
  assert.equal(session.grid[0].rank, "2");
  assert.equal(session.grid[1].rank, "8");
  assert.equal(session.selected, null);
  assert.equal(session.score, 0);
  assert.equal(session.lastEvent.kind, "illegal");
});

test("next fills empty and penalizes", () => {
  const session = primed({ passPenalty: 5 });
  session.grid[0] = card("9");
  session.stock = [card("A", "♦"), card("K", "♣")];
  const before = session.stock.length;
  E.nextEleven(session);
  const filled = session.grid.findIndex(function (c) {
    return c && c.rank === "K";
  });
  assert.ok(filled >= 0);
  assert.equal(session.grid[filled].suit, "♣");
  assert.equal(session.stock.length, before - 1);
  assert.equal(session.score, -5);
  assert.equal(session.lastEvent.kind, "next");
  assert.equal(session.lastEvent.points, -5);
  const snap = E.snapshotEleven(session);
  assert.equal(snap.canNext, true);
});

test("next places into the first empty cell", () => {
  const session = primed();
  session.grid = session.grid.map(function () {
    return card("7");
  });
  session.grid[3] = null;
  session.stock = [card("A")];
  E.nextEleven(session);
  assert.equal(session.grid[3].rank, "A");
});

test("take score on clear adds bonus", () => {
  const session = primed({ clearBonus: 50, pairScore: 11, rounds: 1 });
  session.grid[0] = card("5");
  session.grid[1] = card("6");
  E.tapEleven(session, 0);
  E.tapEleven(session, 1);
  assert.equal(session.score, 11);
  session.grid = session.grid.map(function () {
    return null;
  });
  E.takeEleven(session);
  assert.equal(session.status, "done");
  assert.equal(session.score, 61);
  assert.equal(session.lastEvent.kind, "clear");
  assert.equal(session.lastEvent.points, 50);
  const snap = E.snapshotEleven(session);
  assert.equal(snap.status, "done");
  assert.equal(snap.score, 61);
});

test("take without a clear banks current score only", () => {
  const session = primed({ rounds: 1 });
  session.grid[0] = card("4");
  session.score = 22;
  E.takeEleven(session);
  assert.equal(session.status, "done");
  assert.equal(session.score, 22);
  assert.equal(session.lastEvent.kind, "take");
});

test("cannot next if full", () => {
  const session = primed();
  session.grid = session.grid.map(function () {
    return card("3");
  });
  session.stock = [card("A"), card("2")];
  assert.equal(session.grid.every(Boolean), true);
  assert.throws(function () {
    E.nextEleven(session);
  }, /grid full/);
  assert.equal(session.stock.length, 2);
  assert.equal(session.score, 0);
  const snap = E.snapshotEleven(session);
  assert.equal(snap.canNext, false);
});

test("only uncovered pyramid cards are open", () => {
  const session = primed({ rounds: 1 });
  session.grid = session.grid.map(function () {
    return card("7");
  });
  assert.equal(E.elevenIsOpen(session, 5), true);
  assert.equal(E.elevenIsOpen(session, 4), true);
  assert.equal(E.elevenIsOpen(session, 3), true);
  assert.equal(E.elevenIsOpen(session, 0), false);
  session.grid[3] = null;
  session.grid[4] = null;
  assert.equal(E.elevenIsOpen(session, 1), true);
});

test("cannot next on empty stock", () => {
  const session = primed();
  session.stock = [];
  session.grid[0] = null;
  assert.throws(function () {
    E.nextEleven(session);
  }, /empty stock/);
});

test("clearing the table redeals from the same stock", () => {
  const session = primed({ pairScore: 11, clearBonus: 50, dealCount: 16, rounds: 1 });
  session.grid = session.grid.map(function () {
    return null;
  });
  session.grid[0] = card("5");
  session.grid[1] = card("6");
  session.stock = [card("A"), card("2"), card("3")];
  E.tapEleven(session, 0);
  E.tapEleven(session, 1);
  assert.equal(session.status, "playing");
  assert.equal(session.score, 61);
  assert.equal(session.lastEvent.kind, "clear");
  const filled = session.grid.filter(Boolean).length;
  assert.equal(filled, 3);
  assert.equal(session.stock.length, 0);
});

test("take score starts a second round then done", () => {
  const session = primed({ rounds: 2, dealCount: 12, cells: 12 });
  session.score = 4000;
  session.grid[0] = card("4");
  E.takeEleven(session);
  assert.equal(session.status, "playing");
  assert.equal(session.round, 2);
  assert.equal(session.lastEvent.kind, "round");
  assert.equal(session.score, 4000);
  assert.equal(session.grid.filter(Boolean).length, 18);
  E.takeEleven(session);
  assert.equal(session.status, "done");
  assert.equal(session.lastEvent.kind, "take");
});
