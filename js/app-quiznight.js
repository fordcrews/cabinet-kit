/**
 * Quiz Night — own engine + view. Not mixed into arcade.js.
 */
(function (root, factory) {
  function loadEngine() {
    if (typeof require === "function") {
      try {
        return require("./engine.js");
      } catch (e) {}
    }
    if (typeof window !== "undefined" && window.CabinetEngine) return window.CabinetEngine;
    if (typeof globalThis !== "undefined" && globalThis.CabinetEngine) return globalThis.CabinetEngine;
    throw new Error("CabinetEngine missing");
  }
  const E = loadEngine();
  factory(E);
  if (typeof module === "object" && module.exports) {
    module.exports = E;
  }
  if (typeof window !== "undefined") {
    window.CabinetEngine = E;
  } else if (typeof globalThis !== "undefined") {
    globalThis.CabinetEngine = E;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (E) {
  "use strict";

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function defaultRng() {
    return Math.random;
  }
  const shuffle = E.shuffle;

  function normalizeQuestions(game) {
    const raw = (game && game.questions) || [];
    return raw.map(function (q) {
      return {
        q: String(q.q || q.prompt || ""),
        choices: (q.choices || []).slice(0, 4),
        answerIndex: num(q.answerIndex, 0),
        kind: q.kind === "jumble" ? "jumble" : "trivia",
      };
    });
  }

  function createQuizSession(game, rng) {
    const all = normalizeQuestions(game);
    const sitting = num(game && game.sitting, 12);
    const rand = rng || defaultRng();
    const shuffled = shuffle(all, rand);
    const picked = shuffled.slice(0, Math.min(sitting, shuffled.length));
    return {
      type: "quiznight",
      config: {
        type: "quiznight",
        triviaPoints: num(game && game.triviaPoints, 10),
        jumblePoints: num(game && game.jumblePoints, 15),
        sitting: sitting,
      },
      bank: all,
      questions: picked,
      index: 0,
      score: 0,
      asked: 0,
      locked: false,
      picked: null,
      status: "playing",
      lastEvent: { kind: "deal" },
    };
  }

  function currentQuiz(session) {
    return session.questions[session.index] || null;
  }

  function snapshotQuiz(session) {
    const q = currentQuiz(session);
    const last = session.index + 1 >= session.questions.length;
    return {
      type: "quiznight",
      status: session.status,
      score: session.score,
      index: session.index,
      total: session.questions.length,
      asked: session.asked,
      locked: session.locked,
      picked: session.picked,
      canNext: session.status === "playing" && session.locked && !last,
      canTake: session.status === "playing" && session.locked && last,
      question: q ? q.q : "",
      choices: q ? q.choices.slice() : [],
      kind: q ? q.kind : "trivia",
      answerIndex: q ? q.answerIndex : -1,
      triviaPoints: session.config.triviaPoints,
      jumblePoints: session.config.jumblePoints,
      lastEvent: session.lastEvent,
    };
  }

  function answerQuiz(session, i) {
    if (session.status !== "playing" || session.locked) return snapshotQuiz(session);
    const q = currentQuiz(session);
    if (!q) {
      session.status = "done";
      return snapshotQuiz(session);
    }
    const choice = Number(i);
    session.locked = true;
    session.picked = choice;
    session.asked += 1;
    const ok = choice === q.answerIndex;
    const pts = q.kind === "jumble" ? session.config.jumblePoints : session.config.triviaPoints;
    if (ok) session.score += pts;
    session.lastEvent = { kind: ok ? "correct" : "wrong", points: ok ? pts : 0, kindQ: q.kind };
    return snapshotQuiz(session);
  }

  function quizNext(session) {
    if (session.status !== "playing") return snapshotQuiz(session);
    if (!session.locked) return snapshotQuiz(session);
    if (session.index + 1 >= session.questions.length) {
      session.status = "done";
      session.lastEvent = { kind: "done" };
      return snapshotQuiz(session);
    }
    session.index += 1;
    session.locked = false;
    session.picked = null;
    session.lastEvent = { kind: "next" };
    return snapshotQuiz(session);
  }

  function takeQuiz(session) {
    session.status = "done";
    session.lastEvent = { kind: "take" };
    return snapshotQuiz(session);
  }

  function renderQuiz(ctx) {
    const snap = E.snapshotQuiz(ctx.session);
    const ui = ctx.ui;
    const label = ctx.label;
    const copy = ctx.copy;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("q", "Q") + " " + (snap.index + 1) + "/" + snap.total;
    ui.hudDeck.textContent = snap.kind === "jumble" ? "JUMBLE" : "TRIVIA";
    ui.next.textContent = label("next", "NEXT");
    ui.take.textContent = label("take", "TAKE SCORE");
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.back.textContent = label("back", "CABINET");
    const playing = snap.status === "playing";
    ui.next.classList.toggle("hidden", !snap.canNext);
    ui.take.classList.toggle("hidden", !(snap.canTake || snap.status === "done"));
    ui.deal.classList.toggle("hidden", snap.status !== "done");
    ui.next.disabled = !snap.canNext;
    ui.take.disabled = !(snap.canTake || snap.status === "done");
    ui.quizQ.textContent = snap.question || "";
    ui.quizChoices.replaceChildren();
    snap.choices.forEach(function (text, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-choice";
      btn.dataset.choice = String(i);
      btn.textContent = text;
      btn.disabled = !playing || snap.locked;
      if (snap.locked) {
        if (i === snap.answerIndex) btn.classList.add("is-correct");
        if (snap.picked === i && i !== snap.answerIndex) btn.classList.add("is-wrong");
      }
      ui.quizChoices.appendChild(btn);
    });
    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "done") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("done", "Sitting over. Deal again for a fresh twelve.") + " · " + snap.score;
    } else if (ev && ev.kind === "correct") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("correct", "Correct.") + " +" + ev.points;
    } else if (ev && ev.kind === "wrong") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("wrong", "Not that one.");
    } else {
      ui.banner.textContent = copy("playing", "Pick one of the four.");
    }
    if (window.CabinetPlay && window.CabinetPlay.notePlayHigh) {
      window.CabinetPlay.notePlayHigh(ctx, snap.score, snap);
    }
  }

  E.createQuizSession = createQuizSession;
  E.answerQuiz = answerQuiz;
  E.quizNext = quizNext;
  E.takeQuiz = takeQuiz;
  E.snapshotQuiz = snapshotQuiz;

  if (typeof window !== "undefined") {
    window.QuizNightPlay = { render: renderQuiz };
    if (window.CabinetPlay) window.CabinetPlay.renderQuiz = renderQuiz;
  }
});
