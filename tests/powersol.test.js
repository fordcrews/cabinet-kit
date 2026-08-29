"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const E = require("../js/solitaire.js");
const def = require("../games/solitaire.json");

test("Power Solitaire catalog entry is gone", () => {
  const catalog = require("../games/index.json");
  const card = catalog.categories.find(function (c) {
    return c.id === "card";
  });
  assert.ok(card);
  assert.equal(card.games.indexOf("powersol.json"), -1);
  assert.ok(card.games.indexOf("solitaire.json") >= 0);
  const gone = path.join(__dirname, "../games/powersol.json");
  assert.equal(fs.existsSync(gone), false);
});

test("cabinet solitaire is Klondike stacks, not Jacks-high single-move", () => {
  assert.equal(def.id, "solitaire");
  assert.equal(def.type, "klondike");
  assert.equal(def.title, "Solitaire");
  assert.notEqual(def.moves, "single");
  const session = E.createKlondikeSession(def, function () {
    return 0.5;
  });
  let n = 0;
  session.tableau.forEach(function (col) {
    n += col.length;
  });
  n += session.stock.length + session.waste.length;
  assert.equal(n, 52);
  assert.equal(E.klondikeCanPlace({ rank: "K", suit: "♠" }, { kind: "tableau", top: null }), true);
  assert.equal(E.klondikeCanPlace({ rank: "J", suit: "♠" }, { kind: "tableau", top: null }), false);
});
