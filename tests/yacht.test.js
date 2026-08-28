"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/yacht.js");
const yachtDef = require("../games/yacht.json");

function seedRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function primed(dice, extra) {
  const session = E.createYachtSession(yachtDef, seedRng(1));
  session.dice = dice.slice();
  session.rollsUsed = 1;
  session.rollsLeft = 2;
  session.held = [false, false, false, false, false];
  if (extra) Object.assign(session, extra);
  return session;
}

test("Yacht JSON id type title knobs", () => {
  assert.equal(yachtDef.id, "yacht");
  assert.equal(yachtDef.type, "yacht");
  assert.equal(yachtDef.title, "Yacht");
  assert.equal(yachtDef.upperBonus, 35);
  assert.equal(yachtDef.upperThreshold, 63);
  assert.equal(yachtDef.fullHouse, 25);
  assert.equal(yachtDef.smallStraight, 30);
  assert.equal(yachtDef.largeStraight, 40);
  assert.equal(yachtDef.yacht, 50);
  assert.equal(yachtDef.labels.roll, "ROLL");
  assert.ok(yachtDef.labels.hold);
});

test("roll produces 5 dice 1-6", () => {
  const session = E.createYachtSession(yachtDef, seedRng(11));
  E.rollYacht(session);
  assert.equal(session.dice.length, 5);
  session.dice.forEach(function (d) {
    assert.ok(d >= 1 && d <= 6);
  });
  assert.equal(session.rollsUsed, 1);
  assert.equal(session.rollsLeft, 2);
  const snap = E.snapshotYacht(session);
  assert.equal(snap.type, "yacht");
  assert.equal(snap.status, "playing");
});

test("hold then roll keeps held faces", () => {
  const session = E.createYachtSession(yachtDef, seedRng(22));
  E.rollYacht(session);
  const heldFace = session.dice[0];
  const before = session.dice.slice();
  E.toggleHold(session, 0);
  assert.equal(session.held[0], true);
  E.rollYacht(session);
  assert.equal(session.dice[0], heldFace);
  assert.equal(session.rollsUsed, 2);
  assert.equal(session.rollsLeft, 1);
  let changed = false;
  for (let i = 1; i < 5; i++) {
    if (session.dice[i] !== before[i]) changed = true;
  }
  assert.equal(session.held[0], true);
  assert.ok(session.dice[0] === before[0]);
  void changed;
});

test("third roll then roll throws", () => {
  const session = E.createYachtSession(yachtDef, seedRng(33));
  E.rollYacht(session);
  E.rollYacht(session);
  E.rollYacht(session);
  assert.equal(session.rollsLeft, 0);
  assert.throws(function () {
    E.rollYacht(session);
  });
});

test("aces scores sum of ones", () => {
  const session = primed([1, 1, 3, 4, 1]);
  E.scoreYacht(session, "aces");
  assert.equal(session.scores.aces, 3);
  assert.equal(E.yachtPreview([1, 1, 3, 4, 1], "aces", yachtDef), 3);
  assert.equal(E.yachtPreview([2, 3, 4, 5, 6], "aces", yachtDef), 0);
});

test("full house 25 / junk 0", () => {
  assert.equal(E.yachtPreview([2, 2, 2, 5, 5], "fullhouse", yachtDef), 25);
  assert.equal(E.yachtPreview([6, 6, 3, 3, 3], "fullhouse", yachtDef), 25);
  assert.equal(E.yachtPreview([2, 2, 2, 2, 5], "fullhouse", yachtDef), 0);
  assert.equal(E.yachtPreview([1, 2, 3, 4, 6], "fullhouse", yachtDef), 0);
  assert.equal(E.yachtPreview([4, 4, 4, 4, 4], "fullhouse", yachtDef), 0);
  const ok = primed([3, 3, 3, 6, 6]);
  E.scoreYacht(ok, "fullhouse");
  assert.equal(ok.scores.fullhouse, 25);
  const junk = primed([1, 2, 3, 4, 6]);
  E.scoreYacht(junk, "fullhouse");
  assert.equal(junk.scores.fullhouse, 0);
});

test("small straight 30, large 40", () => {
  assert.equal(E.yachtPreview([1, 2, 3, 4, 6], "smallstraight", yachtDef), 30);
  assert.equal(E.yachtPreview([2, 3, 4, 5, 5], "smallstraight", yachtDef), 30);
  assert.equal(E.yachtPreview([1, 2, 3, 5, 6], "smallstraight", yachtDef), 0);
  assert.equal(E.yachtPreview([1, 2, 3, 4, 5], "largestraight", yachtDef), 40);
  assert.equal(E.yachtPreview([2, 3, 4, 5, 6], "largestraight", yachtDef), 40);
  assert.equal(E.yachtPreview([1, 2, 3, 4, 6], "largestraight", yachtDef), 0);
  assert.equal(E.yachtPreview([1, 2, 3, 4, 5], "smallstraight", yachtDef), 30);
});

test("yacht 50", () => {
  assert.equal(E.yachtPreview([4, 4, 4, 4, 4], "yacht", yachtDef), 50);
  assert.equal(E.yachtPreview([4, 4, 4, 4, 4], "five", yachtDef), 50);
  assert.equal(E.yachtPreview([4, 4, 4, 4, 3], "yacht", yachtDef), 0);
  const session = primed([2, 2, 2, 2, 2]);
  E.scoreYacht(session, "yacht");
  assert.equal(session.scores.yacht, 50);
});

test("cannot score same category twice", () => {
  const session = primed([1, 2, 3, 4, 5]);
  E.scoreYacht(session, "chance");
  assert.equal(session.scores.chance, 15);
  session.dice = [6, 6, 6, 6, 6];
  session.rollsUsed = 1;
  session.rollsLeft = 2;
  assert.throws(function () {
    E.scoreYacht(session, "chance");
  });
});

test("upper bonus at 63", () => {
  const session = E.createYachtSession(yachtDef, seedRng(63));
  const fills = [
    ["aces", [1, 1, 1, 2, 3], 3],
    ["twos", [2, 2, 2, 1, 3], 6],
    ["threes", [3, 3, 3, 1, 2], 9],
    ["fours", [4, 4, 4, 1, 2], 12],
    ["fives", [5, 5, 5, 1, 2], 15],
    ["sixes", [6, 6, 6, 1, 2], 18],
  ];
  fills.forEach(function (row) {
    session.dice = row[1].slice();
    session.rollsUsed = 1;
    session.rollsLeft = 2;
    session.held = [false, false, false, false, false];
    E.scoreYacht(session, row[0]);
    assert.equal(session.scores[row[0]], row[2]);
  });
  const snap = E.snapshotYacht(session);
  assert.equal(snap.upperSubtotal, 63);
  assert.equal(snap.upperBonus, 35);
  assert.equal(snap.total, 63 + 35);
});

test("13 scores then done", () => {
  const session = E.createYachtSession(yachtDef, seedRng(13));
  E.YACHT_CATEGORIES.forEach(function (id) {
    session.dice = [1, 2, 3, 4, 6];
    session.rollsUsed = 1;
    session.rollsLeft = 2;
    session.held = [false, false, false, false, false];
    E.scoreYacht(session, id);
  });
  assert.equal(session.status, "done");
  const snap = E.snapshotYacht(session);
  assert.equal(snap.status, "done");
  assert.equal(snap.turn, 13);
  E.YACHT_CATEGORIES.forEach(function (id) {
    assert.notEqual(session.scores[id], null);
  });
});
