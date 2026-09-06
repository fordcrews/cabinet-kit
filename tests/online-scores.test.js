"use strict";

const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

function loadOnline() {
  delete require.cache[require.resolve("../js/online-scores.js")];
  return require("../js/online-scores.js");
}

let originalFetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("normalizeName trims and caps length", () => {
  const O = loadOnline();
  assert.equal(O.normalizeName("  Ada  "), "Ada");
  assert.equal(O.normalizeName("x".repeat(25)).length, 20);
  assert.equal(O.normalizeName("   "), "");
});

test("submitScore rejects invalid without fetch", async () => {
  let called = 0;
  globalThis.fetch = async () => {
    called += 1;
    return { ok: true, status: 201, headers: { get: () => "" }, text: async () => "" };
  };
  const O = loadOnline();
  const a = await O.submitScore("", "Ada", 10);
  const b = await O.submitScore("yacht", "", 10);
  const c = await O.submitScore("yacht", "Ada", 0);
  assert.equal(a.ok, false);
  assert.equal(b.ok, false);
  assert.equal(c.ok, false);
  assert.equal(called, 0);
});

test("submitScore posts and fail-softs on network error", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init && init.method, body: init && init.body });
    throw new Error("offline");
  };
  const O = loadOnline();
  const r = await O.submitScore("yacht", "Ada", 42);
  assert.equal(r.ok, false);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /game_scores/);
  assert.equal(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body);
  assert.equal(body.game_id, "yacht");
  assert.equal(body.player_name, "Ada");
  assert.equal(body.score, 42);
});

test("submitScore ok on 201", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 201,
    headers: { get: () => "" },
    text: async () => "",
  });
  const O = loadOnline();
  const r = await O.submitScore("hoops", "Kit", 9);
  assert.equal(r.ok, true);
});

test("topScores returns [] on failure", async () => {
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  const O = loadOnline();
  const rows = await O.topScores("yacht", 10);
  assert.deepEqual(rows, []);
});

test("friendBoard parses rows", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => [
      {
        player_name: "Ada",
        games_played: 3,
        total_score: 100,
        best_score: 50,
        last_played_at: "2026-01-01T00:00:00Z",
      },
    ],
    text: async () => "",
  });
  const O = loadOnline();
  const rows = await O.friendBoard(20);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].player_name, "Ada");
});

test("exposes supabase url constant", () => {
  const O = loadOnline();
  assert.match(O.SUPABASE_URL, /supabase\.co/);
});
