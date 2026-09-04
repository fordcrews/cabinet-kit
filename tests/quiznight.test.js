"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/app-quiznight.js");
const def = require("../games/quiznight.json");

test("Quiz Night JSON id type title and bank", () => {
  assert.equal(def.id, "quiznight");
  assert.equal(def.type, "quiznight");
  assert.equal(def.title, "Quiz Night");
  const trivia = def.questions.filter(function (q) {
    return q.kind === "trivia";
  });
  const jumble = def.questions.filter(function (q) {
    return q.kind === "jumble";
  });
  assert.ok(trivia.length >= 20);
  assert.ok(jumble.length >= 8);
  def.questions.forEach(function (q) {
    assert.equal(q.choices.length, 4);
    assert.ok(q.answerIndex >= 0 && q.answerIndex < 4);
  });
});

test("correct answer increments score", () => {
  const session = E.createQuizSession(def, function () {
    return 0;
  });
  session.questions = [
    { q: "2+2?", choices: ["3", "4", "5", "6"], answerIndex: 1, kind: "trivia" },
  ];
  session.index = 0;
  session.locked = false;
  E.answerQuiz(session, 1);
  const snap = E.snapshotQuiz(session);
  assert.equal(snap.score, 10);
  assert.equal(snap.lastEvent.kind, "correct");
});

test("wrong answer does not increment", () => {
  const session = E.createQuizSession(def, function () {
    return 0;
  });
  session.questions = [
    { q: "2+2?", choices: ["3", "4", "5", "6"], answerIndex: 1, kind: "trivia" },
  ];
  session.index = 0;
  session.locked = false;
  E.answerQuiz(session, 0);
  const snap = E.snapshotQuiz(session);
  assert.equal(snap.score, 0);
  assert.equal(snap.lastEvent.kind, "wrong");
});

test("jumble uses jumblePoints", () => {
  const session = E.createQuizSession(def, function () {
    return 0;
  });
  session.questions = [
    { q: "ELPPA", choices: ["APPLE", "PEAR", "PLUM", "PEACH"], answerIndex: 0, kind: "jumble" },
  ];
  session.index = 0;
  session.locked = false;
  const pts = session.config.jumblePoints;
  assert.equal(pts, 15);
  E.answerQuiz(session, 0);
  const snap = E.snapshotQuiz(session);
  assert.equal(snap.score, pts);
  assert.equal(snap.jumblePoints, pts);
  assert.equal(snap.lastEvent.kind, "correct");
  assert.equal(snap.lastEvent.points, pts);
});


test("snapshot labels jumble vs trivia and sitting progress", () => {
  const session = E.createQuizSession(def, function () {
    return 0;
  });
  session.questions = [
    { q: "2+2?", choices: ["3", "4", "5", "6"], answerIndex: 1, kind: "trivia" },
    { q: "ELPPA", choices: ["APPLE", "PEAR", "PLUM", "PEACH"], answerIndex: 0, kind: "jumble" },
  ];
  session.index = 0;
  let snap = E.snapshotQuiz(session);
  assert.equal(snap.kind, "trivia");
  assert.equal(snap.choices.length, 4);
  assert.equal(snap.index, 0);
  assert.equal(snap.total, 2);
  E.answerQuiz(session, 1);
  E.quizNext(session);
  snap = E.snapshotQuiz(session);
  assert.equal(snap.kind, "jumble");
  assert.equal(snap.index, 1);
  assert.equal(snap.total, 2);
});
