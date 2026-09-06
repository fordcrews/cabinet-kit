"use strict";

const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

function fakeStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

function loadScores() {
  delete require.cache[require.resolve("../js/highscore.js")];
  return require("../js/highscore.js");
}

beforeEach(() => {
  globalThis.localStorage = fakeStorage();
});

test("get empty is 0", () => {
  const S = loadScores();
  assert.equal(S.get("runlanes"), 0);
  assert.equal(S.get("missing"), 0);
  assert.equal(S.get(""), 0);
});

test("record first positive is a new high", () => {
  const S = loadScores();
  const r = S.record("zip21", 42);
  assert.equal(r.high, 42);
  assert.equal(r.isNew, true);
  assert.equal(S.get("zip21"), 42);
});

test("do not treat a first 0 as a new high", () => {
  const S = loadScores();
  const r = S.record("chug21", 0);
  assert.equal(r.high, 0);
  assert.equal(r.isNew, false);
  assert.equal(S.get("chug21"), 0);
});

test("no-update when lower", () => {
  const S = loadScores();
  S.record("yacht", 50);
  const r = S.record("yacht", 40);
  assert.equal(r.high, 50);
  assert.equal(r.isNew, false);
  assert.equal(S.get("yacht"), 50);
});

test("equal score is not a new high", () => {
  const S = loadScores();
  S.record("hoops", 12);
  const r = S.record("hoops", 12);
  assert.equal(r.high, 12);
  assert.equal(r.isNew, false);
});

test("beat high sets isNew", () => {
  const S = loadScores();
  S.record("quiznight", 10);
  const r = S.record("quiznight", 25);
  assert.equal(r.high, 25);
  assert.equal(r.isNew, true);
  assert.equal(S.get("quiznight"), 25);
});

test("games are independent keys", () => {
  const S = loadScores();
  S.record("powersol", 80);
  S.record("sudoku6", 3);
  assert.equal(S.get("powersol"), 80);
  assert.equal(S.get("sudoku6"), 3);
  assert.equal(S.get("reversi"), 0);
});

test("safe if localStorage throws", () => {
  globalThis.localStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  const S = loadScores();
  assert.equal(S.get("run21"), 0);
  const r = S.record("run21", 99);
  assert.equal(r.high, 99);
  assert.equal(r.isNew, true);
});

test("NAME_KEY and normalizeName", () => {
  const S = loadScores();
  assert.equal(S.NAME_KEY, "cabinet-kit-player-name");
  assert.equal(S.MAX_NAME_LEN, 20);
  assert.equal(S.normalizeName("  Ada  "), "Ada");
  assert.equal(S.normalizeName("a".repeat(25)), "a".repeat(20));
  assert.equal(S.normalizeName("   "), "");
  assert.equal(S.normalizeName(null), "");
});

test("player name get/set/has", () => {
  const S = loadScores();
  assert.equal(S.hasPlayerName(), false);
  assert.equal(S.getPlayerName(), "");
  const bad = S.setPlayerName("   ");
  assert.equal(bad.ok, false);
  assert.equal(S.hasPlayerName(), false);
  const ok = S.setPlayerName("  Ford  ");
  assert.equal(ok.ok, true);
  assert.equal(ok.name, "Ford");
  assert.equal(S.getPlayerName(), "Ford");
  assert.equal(S.hasPlayerName(), true);
  assert.equal(globalThis.localStorage.getItem("cabinet-kit-player-name"), "Ford");
});

test("record stores player name when set; get still returns number", () => {
  const S = loadScores();
  S.setPlayerName("Ada");
  const r = S.record("yacht", 50);
  assert.equal(r.isNew, true);
  assert.equal(r.high, 50);
  assert.equal(r.name, "Ada");
  assert.equal(S.get("yacht"), 50);
  const entry = S.getEntry("yacht");
  assert.equal(entry.score, 50);
  assert.equal(entry.name, "Ada");
});

test("legacy numeric scores still read; getEntry name empty", () => {
  globalThis.localStorage.setItem(
    "cabinet-kit-highscores",
    JSON.stringify({ hoops: 12 })
  );
  const S = loadScores();
  assert.equal(S.get("hoops"), 12);
  assert.equal(S.getEntry("hoops").score, 12);
  assert.equal(S.getEntry("hoops").name, "");
});

test("beating a legacy score with name upgrades entry", () => {
  globalThis.localStorage.setItem(
    "cabinet-kit-highscores",
    JSON.stringify({ blast: 5 })
  );
  const S = loadScores();
  S.setPlayerName("Kit");
  const r = S.record("blast", 9);
  assert.equal(r.isNew, true);
  assert.equal(S.get("blast"), 9);
  assert.equal(S.getEntry("blast").name, "Kit");
});
