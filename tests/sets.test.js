"use strict";

const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

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

function loadSets() {
  delete require.cache[require.resolve("../js/sets.js")];
  return require("../js/sets.js");
}

beforeEach(() => {
  globalThis.localStorage = fakeStorage();
});

test("normalize: sudoku raw 1 par 1 → 1000", () => {
  const S = loadSets();
  const parity = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../games/set-parity.json"), "utf8")
  );
  S.setParity(parity);
  assert.equal(S.normalize("sudoku9", 1), 1000);
  assert.equal(S.normalize("sudoku6", 1), 1000);
});

test("normalize: quiz 120/120 → 1000", () => {
  const S = loadSets();
  S.setParity({
    scale: 1000,
    games: { quiznight: { par: 120 } },
  });
  assert.equal(S.normalize("quiznight", 120), 1000);
});

test("normalize: eleven 165/165 → 1000", () => {
  const S = loadSets();
  S.setParity({
    scale: 1000,
    games: { elevenup: { par: 165 } },
  });
  assert.equal(S.normalize("elevenup", 165), 1000);
});

test("normalize: raw 0 → 0", () => {
  const S = loadSets();
  S.setParity({ scale: 1000, games: { blast: { par: 400 } } });
  assert.equal(S.normalize("blast", 0), 0);
});

test("normalize: over-par clamps to 1000", () => {
  const S = loadSets();
  S.setParity({ scale: 1000, games: { hoops: { par: 24 } } });
  assert.equal(S.normalize("hoops", 48), 1000);
  assert.equal(S.setPoints(200, 100, 1000), 1000);
});

test("setPoints pure helper", () => {
  const S = loadSets();
  assert.equal(S.setPoints(90, 90, 1000), 1000);
  assert.equal(S.setPoints(45, 90, 1000), 500);
  assert.equal(S.setPoints(-5, 90, 1000), 0);
});

test("pickSet(3) length 3 unique", () => {
  const S = loadSets();
  const ids = ["a", "b", "c", "d", "e"];
  const pick = S.pickSet(3, ids, () => 0.5);
  assert.equal(pick.length, 3);
  assert.equal(new Set(pick).size, 3);
  pick.forEach((id) => assert.ok(ids.includes(id)));
});

test("pickSet(5) from small pool", () => {
  const S = loadSets();
  const ids = ["a", "b", "c", "d", "e"];
  let i = 0;
  const seq = [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6, 0.4, 0.5];
  const pick = S.pickSet(5, ids, () => seq[i++ % seq.length]);
  assert.equal(pick.length, 5);
  assert.equal(new Set(pick).size, 5);
  assert.deepEqual(pick.slice().sort(), ids.slice().sort());
});

test("pickSet rejects bad size or short pool", () => {
  const S = loadSets();
  assert.deepEqual(S.pickSet(2, ["a", "b", "c"]), []);
  assert.deepEqual(S.pickSet(3, ["a", "b"]), []);
});

test("recordBoard keeps top 3, drops 4th; higher total ranks first", () => {
  const S = loadSets();
  const r1 = S.recordBoard(3, { total: 1000, parts: [], at: "2026-01-01T00:00:00.000Z" });
  assert.equal(r1.rank, 1);
  const r2 = S.recordBoard(3, { total: 3000, parts: [], at: "2026-01-02T00:00:00.000Z" });
  assert.equal(r2.rank, 1);
  const r3 = S.recordBoard(3, { total: 2000, parts: [], at: "2026-01-03T00:00:00.000Z" });
  assert.equal(r3.rank, 2);
  const r4 = S.recordBoard(3, { total: 500, parts: [], at: "2026-01-04T00:00:00.000Z" });
  assert.equal(r4.rank, 0);
  const top = S.listBoards(3);
  assert.equal(top.length, 3);
  assert.equal(top[0].total, 3000);
  assert.equal(top[1].total, 2000);
  assert.equal(top[2].total, 1000);
});

test("boards are per size", () => {
  const S = loadSets();
  S.recordBoard(3, { total: 111, at: "a" });
  S.recordBoard(5, { total: 999, at: "b" });
  assert.equal(S.listBoards(3)[0].total, 111);
  assert.equal(S.listBoards(5)[0].total, 999);
  assert.equal(S.listBoards(4).length, 0);
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
  const S = loadSets();
  assert.deepEqual(S.listBoards(3), []);
  const r = S.recordBoard(3, { total: 42, at: "x" });
  assert.ok(r.rank === 1 || r.rank === 0);
});
