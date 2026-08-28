"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/arcade.js");
const def = require("../games/hoops.json");

test("Hoops JSON id type title", () => {
  assert.equal(def.id, "hoops");
  assert.equal(def.type, "hoops");
  assert.equal(def.title, "Hoops");
  assert.ok(!/hoop jones/i.test(def.title));
});

test("shoot inside window scores", () => {
  const session = E.createHoopsSession(def);
  session.aimX = 50;
  session.rimX = 50;
  session.rimW = 8;
  session.distance = 1;
  E.hoopsShoot(session);
  const snap = E.snapshotHoops(session);
  assert.equal(snap.lastEvent.kind, "make");
  assert.ok(snap.score >= 2);
  assert.equal(snap.shotsTaken, 1);
});

test("shoot outside window misses", () => {
  const session = E.createHoopsSession(def);
  session.aimX = 10;
  session.rimX = 50;
  session.rimW = 8;
  const before = session.score;
  E.hoopsShoot(session);
  const snap = E.snapshotHoops(session);
  assert.equal(snap.lastEvent.kind, "miss");
  assert.equal(snap.score, before);
  assert.equal(snap.shotsTaken, 1);
});

test("ten shots ends the sitting", () => {
  const session = E.createHoopsSession(def);
  session.aimX = 50;
  session.rimX = 50;
  session.rimW = 8;
  for (let i = 0; i < 10; i++) {
    E.hoopsShoot(session);
  }
  const snap = E.snapshotHoops(session);
  assert.equal(snap.shotsTaken, 10);
  assert.equal(snap.status, "done");
  const scoreBefore = snap.score;
  E.hoopsShoot(session);
  assert.equal(session.score, scoreBefore);
  assert.equal(session.shotsTaken, 10);
});


test("linedUp is true inside the window and false outside", () => {
  const session = E.createHoopsSession(def);
  session.aimX = 50;
  session.rimX = 50;
  session.rimW = 8;
  let snap = E.snapshotHoops(session);
  assert.equal(snap.linedUp, true);
  assert.equal(snap.shotsTaken, 0);
  session.aimX = 10;
  snap = E.snapshotHoops(session);
  assert.equal(snap.linedUp, false);
});
