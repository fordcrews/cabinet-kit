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
