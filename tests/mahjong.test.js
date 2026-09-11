"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/mahjong.js");
const def = require("../games/mahjong.json");

test("Mahjong JSON id type title and scoring knobs", () => {
  assert.equal(def.id, "mahjong");
  assert.equal(def.type, "mahjong");
  assert.equal(def.title, "Mahjong");
  assert.equal(def.layout, "turtle");
  assert.ok(def.pairScore > 0);
  assert.ok(def.clearBonus > 0);
});

test("full pack is 144 and turtle layout is 144", () => {
  assert.equal(E.mahjongBuildFullPack().length, 144);
  assert.equal(E.mahjongLayoutTurtle().length, 144);
});

test("facesMatch: identical, flowers, seasons", () => {
  assert.equal(E.mahjongFacesMatch("mj-dots-3", "mj-dots-3"), true);
  assert.equal(E.mahjongFacesMatch("mj-dots-3", "mj-dots-4"), false);
  assert.equal(E.mahjongFacesMatch("mj-flower-1", "mj-flower-3"), true);
  assert.equal(E.mahjongFacesMatch("mj-season-2", "mj-season-4"), true);
  assert.equal(E.mahjongFacesMatch("mj-flower-1", "mj-season-1"), false);
});

test("create session deals 144 live tiles", () => {
  const session = E.createMahjongSession(def, 42);
  const snap = E.snapshotMahjong(session);
  assert.equal(snap.total, 144);
  assert.equal(snap.remaining, 144);
  assert.equal(snap.status, "playing");
  assert.ok(snap.tiles.some((t) => t.free));
});

test("blocked tile cannot be selected for match", () => {
  const session = E.createMahjongSession(def, 7);
  const live = session.tiles.filter((t) => !t.removed);
  const blocked = live.find((t) => !E.mahjongIsFreeTile(t, live));
  assert.ok(blocked, "expected a blocked tile in turtle");
  E.tapMahjong(session, blocked.id);
  assert.equal(session.selected, null);
  assert.equal(session.lastEvent.kind, "blocked");
});

test("free identical pair matches and scores", () => {
  const session = E.createMahjongSession(def, 99);
  const free = session.tiles.filter((t) => E.mahjongIsFreeTile(t, session.tiles.filter((x) => !x.removed)));
  assert.ok(free.length >= 2);
  const a = free[0];
  const b = free[1];
  a.face = "mj-dots-5";
  b.face = "mj-dots-5";
  E.tapMahjong(session, a.id);
  assert.equal(session.selected, a.id);
  E.tapMahjong(session, b.id);
  assert.equal(a.removed, true);
  assert.equal(b.removed, true);
  assert.equal(session.score, def.pairScore);
  assert.equal(session.lastEvent.kind, "pair");
});

test("undo restores a matched pair", () => {
  const session = E.createMahjongSession(def, 11);
  const free = session.tiles.filter((t) => E.mahjongIsFreeTile(t, session.tiles.filter((x) => !x.removed)));
  free[0].face = "mj-bam-1";
  free[1].face = "mj-bam-1";
  E.tapMahjong(session, free[0].id);
  E.tapMahjong(session, free[1].id);
  assert.equal(session.pairs, 1);
  E.undoMahjong(session);
  assert.equal(free[0].removed, false);
  assert.equal(free[1].removed, false);
  assert.equal(session.score, 0);
  assert.equal(session.lastEvent.kind, "undo");
});

test("win when all tiles cleared", () => {
  const session = E.createMahjongSession({ type: "mahjong", layout: "pagoda", pairScore: 10, clearBonus: 50, timeBudget: 900, timeBonusPerSec: 0 }, 3);
  session.tiles.forEach((t, i) => {
    if (i > 1) t.removed = true;
  });
  session.tiles[0].face = "mj-char-9";
  session.tiles[1].face = "mj-char-9";
  session.tiles[0].x = 0;
  session.tiles[0].y = 0;
  session.tiles[0].z = 0;
  session.tiles[1].x = 4;
  session.tiles[1].y = 0;
  session.tiles[1].z = 0;
  E.tapMahjong(session, 0);
  E.tapMahjong(session, 1);
  const snap = E.snapshotMahjong(session);
  assert.equal(snap.status, "won");
  assert.equal(snap.remaining, 0);
  assert.ok(snap.score >= 10 + 50);
});

test("hint highlights a free pair", () => {
  const session = E.createMahjongSession(def, 5);
  const free = session.tiles.filter((t) => E.mahjongIsFreeTile(t, session.tiles.filter((x) => !x.removed)));
  free[0].face = "mj-wind-e";
  free[1].face = "mj-wind-e";
  E.hintMahjong(session);
  assert.ok(session.hint);
  assert.equal(session.hint.length, 2);
});
