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

function loadSfx() {
  delete require.cache[require.resolve("../js/sfx.js")];
  return require("../js/sfx.js");
}

beforeEach(() => {
  globalThis.localStorage = fakeStorage();
});

test("cueFromEvent maps lastEvent kinds to cue names", () => {
  const { cueFromEvent } = loadSfx();
  assert.equal(cueFromEvent({ kind: "select" }), "tap");
  assert.equal(cueFromEvent({ kind: "hold" }), "tap");
  assert.equal(cueFromEvent({ kind: "set" }), "tap");
  assert.equal(cueFromEvent({ kind: "tap" }), "tap");
  assert.equal(cueFromEvent({ kind: "place" }), "place");
  assert.equal(cueFromEvent({ kind: "move" }), "move");
  assert.equal(cueFromEvent({ kind: "slide" }), "move");
  assert.equal(cueFromEvent({ kind: "clear" }), "clear");
  assert.equal(cueFromEvent({ kind: "pop" }), "pop");
  assert.equal(cueFromEvent({ kind: "pair" }), "pair");
  assert.equal(cueFromEvent({ kind: "run" }), "run");
  assert.equal(cueFromEvent({ kind: "21" }), "21");
  assert.equal(cueFromEvent({ kind: "foundation" }), "foundation");
  assert.equal(cueFromEvent({ kind: "complete" }), "run");
  assert.equal(cueFromEvent({ kind: "bust" }), "bust");
  assert.equal(cueFromEvent({ kind: "illegal" }), "illegal");
  assert.equal(cueFromEvent({ kind: "miss" }), "miss");
  assert.equal(cueFromEvent({ kind: "wrong" }), "wrong");
  assert.equal(cueFromEvent({ kind: "deal" }), "deal");
  assert.equal(cueFromEvent({ kind: "draw" }), "draw");
  assert.equal(cueFromEvent({ kind: "recycle" }), "recycle");
  assert.equal(cueFromEvent({ kind: "roll" }), "roll");
  assert.equal(cueFromEvent({ kind: "skip" }), "skip");
  assert.equal(cueFromEvent({ kind: "stay" }), "stay");
  assert.equal(cueFromEvent({ kind: "make" }), "make");
  assert.equal(cueFromEvent({ kind: "shoot" }), "shoot");
  assert.equal(cueFromEvent({ kind: "correct" }), "correct");
  assert.equal(cueFromEvent({ kind: "win" }), "win");
  assert.equal(cueFromEvent({ kind: "won" }), "win");
  assert.equal(cueFromEvent({ kind: "done" }), "done");
  assert.equal(cueFromEvent({ kind: "perfect" }), "perfect");
  assert.equal(cueFromEvent({ kind: "high" }), "high");
  assert.equal(cueFromEvent({ kind: "swap" }), "pop");
  assert.equal(cueFromEvent({ kind: "next" }), "draw");
  assert.equal(cueFromEvent({ kind: "pass" }), "skip");
  assert.equal(cueFromEvent({ kind: "take" }), "stay");
  assert.equal(cueFromEvent({ kind: "deselect" }), "tap");
  assert.equal(cueFromEvent({ kind: "small" }), "miss");
});

test("cueFromEvent sudoku digit clear is tap not success", () => {
  const { cueFromEvent } = loadSfx();
  assert.equal(cueFromEvent({ kind: "clear", digit: 0 }), "tap");
});

test("cueFromEvent yacht zero score is tap", () => {
  const { cueFromEvent } = loadSfx();
  assert.equal(cueFromEvent({ kind: "score", points: 0 }), "tap");
  assert.equal(cueFromEvent({ kind: "score", points: 25 }), "place");
});

test("cueFromEvent maps lastOutcome via extra", () => {
  const { cueFromEvent } = loadSfx();
  assert.equal(cueFromEvent(null, { outcome: "bust" }), "bust");
  assert.equal(cueFromEvent(null, { outcome: "run" }), "run");
  assert.equal(cueFromEvent(null, { outcome: "stay" }), "stay");
});

test("cueFromEvent unknown kind is null", () => {
  const { cueFromEvent } = loadSfx();
  assert.equal(cueFromEvent(null), null);
  assert.equal(cueFromEvent({}), null);
  assert.equal(cueFromEvent({ kind: "nope" }), null);
});

test("default unmuted and mute persists in localStorage", () => {
  const S = loadSfx();
  assert.equal(S.isMuted(), false);
  assert.equal(S.MUTE_KEY, "cabinet-kit-muted");
  S.setMuted(true);
  assert.equal(S.isMuted(), true);
  assert.equal(globalThis.localStorage.getItem("cabinet-kit-muted"), "1");
  const S2 = loadSfx();
  assert.equal(S2.isMuted(), true);
  S2.setMuted(false);
  assert.equal(globalThis.localStorage.getItem("cabinet-kit-muted"), "0");
  const S3 = loadSfx();
  assert.equal(S3.isMuted(), false);
});

test("toggle flips mute flag", () => {
  const S = loadSfx();
  assert.equal(S.toggle(), true);
  assert.equal(S.isMuted(), true);
  assert.equal(S.toggle(), false);
  assert.equal(S.isMuted(), false);
});

test("fromEvent does not throw without AudioContext", () => {
  const S = loadSfx();
  assert.doesNotThrow(() => S.fromEvent({ kind: "bust" }));
  assert.doesNotThrow(() => S.fromEvent({ kind: "win" }, { status: "won" }));
  assert.doesNotThrow(() => S.fromEvent(null, { status: "done", outcome: "stay" }));
  assert.doesNotThrow(() => S.play("win"));
  assert.doesNotThrow(() => S.play("unknown"));
  assert.doesNotThrow(() => S.play("tap"));
  assert.doesNotThrow(() => S.unlock());
});

test("fromEvent dedupes the same lastEvent object", () => {
  const S = loadSfx();
  const ev = { kind: "place" };
  const session = { lastEvent: ev };
  assert.doesNotThrow(() => S.fromEvent(ev, { session: session, status: "playing" }));
  assert.equal(session._sfxSeen, ev);
  assert.doesNotThrow(() => S.fromEvent(ev, { session: session, status: "playing" }));
  assert.equal(session._sfxSeen, ev);
});

test("fromEvent respects ev.seq for dedupe", () => {
  const S = loadSfx();
  const session = {};
  const a = { kind: "pop", seq: 4 };
  const b = { kind: "pop", seq: 4 };
  S.fromEvent(a, { session: session, status: "playing" });
  assert.equal(session._sfxSeq, 4);
  S.fromEvent(b, { session: session, status: "playing" });
  assert.equal(session._sfxSeq, 4);
});

test("play no-ops when muted and never throws", () => {
  const S = loadSfx();
  S.setMuted(true);
  assert.doesNotThrow(() => S.play("tap"));
  assert.doesNotThrow(() => S.fromEvent({ kind: "make" }, { status: "playing" }));
});
