"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const Slot = require("../js/slot.js");
const Orbit = require("../games/orbit/game.js");
const def = require("../games/orbit.json");

test("Orbit JSON id type title module", () => {
  assert.equal(def.id, "orbit");
  assert.equal(def.type, "slot");
  assert.equal(def.title, "Orbit");
  assert.equal(def.module, "games/orbit/game.js");
  assert.equal(def.shots, 12);
});

test("resolveModulePath uses module field or default games/<id>/game.js", () => {
  assert.equal(Slot.resolveModulePath({ id: "orbit", module: "games/orbit/game.js" }), "games/orbit/game.js");
  assert.equal(Slot.resolveModulePath({ id: "orbit" }), "games/orbit/game.js");
  assert.equal(Slot.resolveModulePath({ id: "neo", module: "./games/neo/game.js" }), "games/neo/game.js");
});

test("angle in wedge scores; out of wedge misses", () => {
  const half = 0.4;
  const center = 0;
  assert.equal(Orbit.angleInWedge(0, center, half), true);
  assert.equal(Orbit.angleInWedge(0.2, center, half), true);
  assert.equal(Orbit.angleInWedge(1.2, center, half), false);
  const hit = Orbit.shotPoints(0, center, half, 2, 3);
  assert.equal(hit.hit, true);
  assert.ok(hit.points >= 2);
  const miss = Orbit.shotPoints(2, center, half, 2, 3);
  assert.equal(miss.hit, false);
  assert.equal(miss.points, 0);
});

test("near center of wedge awards longPoints", () => {
  const half = 0.5;
  const near = Orbit.shotPoints(0.05, 0, half, 2, 3);
  assert.equal(near.hit, true);
  assert.equal(near.nearCenter, true);
  assert.equal(near.points, 3);
  const edge = Orbit.shotPoints(0.4, 0, half, 2, 3);
  assert.equal(edge.hit, true);
  assert.equal(edge.nearCenter, false);
  assert.equal(edge.points, 2);
});

test("shots decrement and done at 0", () => {
  const state = Orbit.createState({ shots: 12, wedgeHalf: 0.5, makePoints: 2, longPoints: 3 });
  assert.equal(state.shotsLeft, 12);
  assert.equal(state.status, "playing");
  state.puckAngle = 0;
  state.wedgeCenter = 0;
  for (let i = 0; i < 12; i++) {
    Orbit.applyShot(state);
  }
  assert.equal(state.shotsLeft, 0);
  assert.equal(state.status, "done");
  const scoreBefore = state.score;
  const extra = Orbit.applyShot(state);
  assert.equal(extra.done, true);
  assert.equal(state.score, scoreBefore);
  assert.equal(state.shotsLeft, 0);
});

test("miss does not add points but still spends a shot", () => {
  const state = Orbit.createState({ shots: 3, wedgeHalf: 0.2 });
  state.puckAngle = Math.PI;
  state.wedgeCenter = 0;
  const before = state.score;
  const result = Orbit.applyShot(state);
  assert.equal(result.hit, false);
  assert.equal(state.score, before);
  assert.equal(state.shotsLeft, 2);
  assert.equal(state.lastEvent.kind, "miss");
});
