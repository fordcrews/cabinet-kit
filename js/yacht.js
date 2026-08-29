/**
 * Cabinet Kit — Yacht five-dice scorecard (browser + Node).
 * Public-domain predecessor scoring. Extends CabinetEngine; patches CabinetPlay when present.
 * Node: require this file to get the combined API.
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

  const UPPER_IDS = ["aces", "twos", "threes", "fours", "fives", "sixes"];
  const LOWER_IDS = [
    "threekind",
    "fourkind",
    "fullhouse",
    "smallstraight",
    "largestraight",
    "yacht",
    "chance",
  ];
  const YACHT_CATEGORIES = UPPER_IDS.concat(LOWER_IDS);
  const UPPER_FACE = {
    aces: 1,
    twos: 2,
    threes: 3,
    fours: 4,
    fives: 5,
    sixes: 6,
  };
  const CAT_ALIASES = {
    ones: "aces",
    five: "yacht",
    "5kind": "yacht",
    fivekind: "yacht",
    "3kind": "threekind",
    "4kind": "fourkind",
    threeofakind: "threekind",
    fourofakind: "fourkind",
    full: "fullhouse",
    small: "smallstraight",
    large: "largestraight",
  };

  const DEFAULT_YACHT = Object.freeze({
    type: "yacht",
    dice: 5,
    rolls: 3,
    turns: 13,
    upperBonus: 35,
    upperThreshold: 63,
    fullHouse: 25,
    smallStraight: 30,
    largeStraight: 40,
    yacht: 50,
  });

  function configFromYachtGame(game) {
    const src = game && typeof game === "object" ? game : {};
    return {
      type: "yacht",
      dice: 5,
      rolls: Math.max(1, Math.floor(num(src.rolls, DEFAULT_YACHT.rolls))),
      turns: YACHT_CATEGORIES.length,
      upperBonus: num(src.upperBonus, DEFAULT_YACHT.upperBonus),
      upperThreshold: num(src.upperThreshold, DEFAULT_YACHT.upperThreshold),
      fullHouse: num(src.fullHouse, DEFAULT_YACHT.fullHouse),
      smallStraight: num(src.smallStraight, DEFAULT_YACHT.smallStraight),
      largeStraight: num(src.largeStraight, DEFAULT_YACHT.largeStraight),
      yacht: num(src.yacht, DEFAULT_YACHT.yacht),
    };
  }

  function normalizeCat(id) {
    if (id == null) return "";
    const key = String(id).trim().toLowerCase().replace(/[\s_-]+/g, "");
    if (CAT_ALIASES[key]) return CAT_ALIASES[key];
    if (YACHT_CATEGORIES.indexOf(key) >= 0) return key;
    return key;
  }

  function emptyScores() {
    const scores = {};
    YACHT_CATEGORIES.forEach(function (id) {
      scores[id] = null;
    });
    return scores;
  }

  function emptyHeld() {
    return [false, false, false, false, false];
  }

  function blankDice() {
    return [0, 0, 0, 0, 0];
  }

  function copyDice(dice) {
    return (dice || blankDice()).map(function (d) {
      return Number(d) || 0;
    });
  }

  function copyHeld(held) {
    return (held || emptyHeld()).map(function (h) {
      return !!h;
    });
  }

  function diceReady(dice) {
    if (!dice || dice.length !== 5) return false;
    return dice.every(function (d) {
      return d >= 1 && d <= 6;
    });
  }

  function faceCounts(dice) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    dice.forEach(function (d) {
      if (d >= 1 && d <= 6) c[d] += 1;
    });
    return c;
  }

  function sumDice(dice) {
    return dice.reduce(function (s, d) {
      return s + (Number(d) || 0);
    }, 0);
  }

  function maxCount(counts) {
    let m = 0;
    for (let i = 1; i <= 6; i++) if (counts[i] > m) m = counts[i];
    return m;
  }

  function hasStraight(dice, length) {
    const seen = {};
    dice.forEach(function (d) {
      if (d >= 1 && d <= 6) seen[d] = true;
    });
    const uniq = [];
    for (let f = 1; f <= 6; f++) if (seen[f]) uniq.push(f);
    if (uniq.length < length) return false;
    for (let start = 0; start <= uniq.length - length; start++) {
      let ok = true;
      for (let k = 1; k < length; k++) {
        if (uniq[start + k] !== uniq[start] + k) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  }

  function isFullHouse(counts) {
    let three = false;
    let two = false;
    for (let i = 1; i <= 6; i++) {
      if (counts[i] === 3) three = true;
      else if (counts[i] === 2) two = true;
    }
    return three && two;
  }

  function yachtPreview(dice, categoryId, config) {
    const cfg = configFromYachtGame(config);
    const cat = normalizeCat(categoryId);
    const faces = copyDice(dice);
    if (!diceReady(faces)) return 0;
    const counts = faceCounts(faces);
    const face = UPPER_FACE[cat];
    if (face) {
      return counts[face] * face;
    }
    if (cat === "threekind") {
      return maxCount(counts) >= 3 ? sumDice(faces) : 0;
    }
    if (cat === "fourkind") {
      return maxCount(counts) >= 4 ? sumDice(faces) : 0;
    }
    if (cat === "fullhouse") {
      return isFullHouse(counts) ? cfg.fullHouse : 0;
    }
    if (cat === "smallstraight") {
      return hasStraight(faces, 4) ? cfg.smallStraight : 0;
    }
    if (cat === "largestraight") {
      return hasStraight(faces, 5) ? cfg.largeStraight : 0;
    }
    if (cat === "yacht") {
      return maxCount(counts) >= 5 ? cfg.yacht : 0;
    }
    if (cat === "chance") {
      return sumDice(faces);
    }
    return 0;
  }

  function filledCount(scores) {
    let n = 0;
    YACHT_CATEGORIES.forEach(function (id) {
      if (scores[id] != null) n += 1;
    });
    return n;
  }

  function upperSubtotal(scores) {
    return UPPER_IDS.reduce(function (s, id) {
      const v = scores[id];
      return s + (v == null ? 0 : v);
    }, 0);
  }

  function upperBonus(scores, config) {
    return upperSubtotal(scores) >= config.upperThreshold ? config.upperBonus : 0;
  }

  function grandTotal(scores, config) {
    let t = 0;
    YACHT_CATEGORIES.forEach(function (id) {
      if (scores[id] != null) t += scores[id];
    });
    return t + upperBonus(scores, config);
  }

  function startTurn(session) {
    session.rollsLeft = session.config.rolls;
    session.rollsUsed = 0;
    session.held = emptyHeld();
    session.dice = blankDice();
    session.turn = Math.min(filledCount(session.scores) + 1, session.config.turns);
  }

  function createYachtSession(game, rng) {
    const config = configFromYachtGame(game);
    const session = {
      config: config,
      rng: rng || defaultRng(),
      dice: blankDice(),
      held: emptyHeld(),
      rollsLeft: config.rolls,
      rollsUsed: 0,
      scores: emptyScores(),
      status: "playing",
      turn: 1,
      lastEvent: null,
    };
    return session;
  }

  function rollDie(rng) {
    const r = rng();
    return Math.floor(r * 6) + 1;
  }

  function rollYacht(session) {
    if (session.status !== "playing") {
      throw new Error("roll only while playing");
    }
    if (session.rollsLeft <= 0) {
      throw new Error("no rolls left");
    }
    const first = session.rollsUsed === 0;
    const rng = session.rng || defaultRng();
    const next = copyDice(session.dice);
    const held = copyHeld(session.held);
    for (let i = 0; i < 5; i++) {
      if (first || !held[i]) {
        next[i] = rollDie(rng);
      }
    }
    session.dice = next;
    if (first) session.held = emptyHeld();
    session.rollsLeft -= 1;
    session.rollsUsed += 1;
    session.lastEvent = { kind: "roll", rollsLeft: session.rollsLeft };
    return session;
  }

  function toggleHold(session, i) {
    if (session.status !== "playing") {
      throw new Error("hold only while playing");
    }
    const idx = Number(i);
    if (!Number.isInteger(idx) || idx < 0 || idx > 4) {
      throw new Error("bad die");
    }
    if (!session.rollsUsed || !diceReady(session.dice)) {
      return session;
    }
    session.held = copyHeld(session.held);
    session.held[idx] = !session.held[idx];
    session.lastEvent = { kind: "hold", index: idx, held: session.held[idx] };
    return session;
  }

  function scoreYacht(session, categoryId) {
    if (session.status !== "playing") {
      throw new Error("score only while playing");
    }
    const cat = normalizeCat(categoryId);
    if (YACHT_CATEGORIES.indexOf(cat) < 0) {
      throw new Error("bad category");
    }
    if (session.scores[cat] != null) {
      throw new Error("category filled");
    }
    if (!session.rollsUsed || !diceReady(session.dice)) {
      throw new Error("roll first");
    }
    const points = yachtPreview(session.dice, cat, session.config);
    session.scores[cat] = points;
    const n = filledCount(session.scores);
    session.lastEvent = { kind: "score", category: cat, points: points };
    if (n >= session.config.turns) {
      session.status = "done";
      session.rollsLeft = 0;
      session.turn = session.config.turns;
    } else {
      startTurn(session);
    }
    return session;
  }

  function snapshotYacht(session) {
    const cfg = session.config;
    const scores = {};
    YACHT_CATEGORIES.forEach(function (id) {
      scores[id] = session.scores[id];
    });
    const ready = diceReady(session.dice);
    const previews = {};
    YACHT_CATEGORIES.forEach(function (id) {
      if (scores[id] != null) {
        previews[id] = scores[id];
      } else if (ready && session.rollsUsed > 0) {
        previews[id] = yachtPreview(session.dice, id, cfg);
      } else {
        previews[id] = null;
      }
    });
    const sub = upperSubtotal(scores);
    const bonus = upperBonus(scores, cfg);
    return {
      type: "yacht",
      status: session.status,
      dice: copyDice(session.dice),
      held: copyHeld(session.held),
      rollsLeft: session.rollsLeft,
      rollsUsed: session.rollsUsed,
      turn: session.turn,
      turnsTotal: cfg.turns,
      scores: scores,
      previews: previews,
      upperSubtotal: sub,
      upperBonus: bonus,
      upperThreshold: cfg.upperThreshold,
      total: grandTotal(scores, cfg),
      lastEvent: session.lastEvent,
      categories: YACHT_CATEGORIES.slice(),
      upper: UPPER_IDS.slice(),
      lower: LOWER_IDS.slice(),
      canRoll: session.status === "playing" && session.rollsLeft > 0,
      canHold: session.status === "playing" && session.rollsUsed > 0 && ready,
      canScore: session.status === "playing" && session.rollsUsed > 0 && ready,
    };
  }

  E.DEFAULT_YACHT = DEFAULT_YACHT;
  E.YACHT_CATEGORIES = YACHT_CATEGORIES;
  E.YACHT_UPPER = UPPER_IDS;
  E.YACHT_LOWER = LOWER_IDS;
  E.configFromYachtGame = configFromYachtGame;
  E.createYachtSession = createYachtSession;
  E.rollYacht = rollYacht;
  E.toggleHold = toggleHold;
  E.scoreYacht = scoreYacht;
  E.snapshotYacht = snapshotYacht;
  E.yachtPreview = yachtPreview;

  const PIP_FACE = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };

  const CAT_FALLBACK = {
    aces: "ACES",
    twos: "TWOS",
    threes: "THREES",
    fours: "FOURS",
    fives: "FIVES",
    sixes: "SIXES",
    threekind: "3 OF A KIND",
    fourkind: "4 OF A KIND",
    fullhouse: "FULL HOUSE",
    smallstraight: "SMALL STRAIGHT",
    largestraight: "LARGE STRAIGHT",
    yacht: "YACHT",
    chance: "CHANCE",
  };

  function dieButton(face, held, i, canHold) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "yacht-die" +
      (held ? " is-held" : "") +
      (face >= 1 && face <= 6 ? " face-" + face : " is-blank");
    btn.dataset.die = String(i);
    btn.disabled = !canHold;
    const label = face >= 1 && face <= 6 ? String(face) : "blank";
    btn.setAttribute("aria-label", (held ? "Held " : "") + "die " + label);
    btn.setAttribute("aria-pressed", held ? "true" : "false");
    if (face >= 1 && face <= 6) {
      const pips = PIP_FACE[face];
      for (let p = 1; p <= 9; p++) {
        const span = document.createElement("span");
        span.className = "pip" + (pips.indexOf(p) >= 0 ? " on" : "");
        span.setAttribute("aria-hidden", "true");
        btn.appendChild(span);
      }
    } else {
      const mark = document.createElement("span");
      mark.className = "die-blank";
      mark.textContent = "·";
      btn.appendChild(mark);
    }
    return btn;
  }

  function scoreRow(opts) {
    const row = document.createElement(opts.button ? "button" : "div");
    if (opts.button) row.type = "button";
    row.className = "yacht-row" + (opts.cls ? " " + opts.cls : "");
    if (opts.cat) row.dataset.cat = opts.cat;
    if (opts.button) row.disabled = !!opts.disabled;
    const name = document.createElement("span");
    name.className = "yacht-row-name";
    name.textContent = opts.name;
    const val = document.createElement("span");
    val.className = "yacht-row-val" + (opts.preview ? " is-preview" : "");
    val.textContent = opts.value;
    row.appendChild(name);
    row.appendChild(val);
    return row;
  }

  function renderYacht(ctx) {
    const snap = ctx.E.snapshotYacht(ctx.session);
    const ui = ctx.ui;
    const label = ctx.label;
    const copy = ctx.copy;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.total);
    ui.hudRound.textContent =
      label("turn", "TURN") + " " + snap.turn + "/" + snap.turnsTotal;
    ui.hudDeck.textContent =
      label("rolls", "ROLLS LEFT") + " " + snap.rollsLeft;
    if (ui.roll) {
      ui.roll.textContent = label("roll", "ROLL");
      ui.roll.classList.toggle("hidden", snap.status !== "playing");
      ui.roll.disabled = !snap.canRoll;
    }
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.deal.classList.toggle("hidden", snap.status !== "done");
    ui.back.textContent = label("back", "CABINET");
    ui.yachtDice.replaceChildren();
    snap.dice.forEach(function (face, i) {
      ui.yachtDice.appendChild(dieButton(face, snap.held[i], i, snap.canHold));
    });
    const card = ui.yachtCard;
    card.replaceChildren();
    const upperHead = document.createElement("div");
    upperHead.className = "yacht-section";
    upperHead.textContent = label("upper", "UPPER");
    card.appendChild(upperHead);
    snap.upper.forEach(function (id) {
      const filled = snap.scores[id] != null;
      const preview = snap.previews[id];
      const value = filled
        ? String(snap.scores[id])
        : preview == null
          ? "—"
          : String(preview);
      card.appendChild(
        scoreRow({
          button: !filled && snap.canScore,
          cat: id,
          name: label(id, CAT_FALLBACK[id]),
          value: value,
          preview: !filled && preview != null,
          disabled: filled || !snap.canScore,
          cls: filled ? "is-filled" : snap.canScore ? "is-open" : "",
        })
      );
    });
    card.appendChild(
      scoreRow({
        name: label("subtotal", "SUBTOTAL"),
        value: String(snap.upperSubtotal),
        cls: "is-meta",
      })
    );
    card.appendChild(
      scoreRow({
        name: label("bonus", "BONUS"),
        value: String(snap.upperBonus),
        cls: "is-meta" + (snap.upperBonus ? " is-bonus" : ""),
      })
    );
    const lowerHead = document.createElement("div");
    lowerHead.className = "yacht-section";
    lowerHead.textContent = label("lower", "LOWER");
    card.appendChild(lowerHead);
    snap.lower.forEach(function (id) {
      const filled = snap.scores[id] != null;
      const preview = snap.previews[id];
      const value = filled
        ? String(snap.scores[id])
        : preview == null
          ? "—"
          : String(preview);
      card.appendChild(
        scoreRow({
          button: !filled && snap.canScore,
          cat: id,
          name: label(id, CAT_FALLBACK[id]),
          value: value,
          preview: !filled && preview != null,
          disabled: filled || !snap.canScore,
          cls: filled ? "is-filled" : snap.canScore ? "is-open" : "",
        })
      );
    });
    card.appendChild(
      scoreRow({
        name: label("total", "TOTAL"),
        value: String(snap.total),
        cls: "is-meta is-total",
      })
    );
    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "done") {
      ui.banner.classList.add("run");
      ui.banner.textContent =
        copy("done", "Card complete.") + " · " + snap.total;
    } else if (ev && ev.kind === "score") {
      const nm = label(ev.category, CAT_FALLBACK[ev.category] || ev.category);
      if (ev.points > 0) ui.banner.classList.add("run");
      ui.banner.textContent = nm + " +" + ev.points;
    } else if (!snap.rollsUsed) {
      ui.banner.textContent = copy("idle", "ROLL to throw five dice.");
    } else if (snap.canRoll) {
      ui.banner.textContent = copy(
        "playing",
        "Tap dice to HOLD, ROLL again, or tap a category."
      );
    } else {
      ui.banner.textContent = copy("mustScore", "Pick a category. Zero is allowed.");
    }
    if (window.CabinetPlay && typeof window.CabinetPlay.notePlayHigh === "function") {
      window.CabinetPlay.notePlayHigh(ctx, snap.total, snap);
    }
  }

  if (typeof window !== "undefined" && window.CabinetPlay) {
    const Play = window.CabinetPlay;
    const prevAttach = Play.attachUi;
    Play.renderYacht = renderYacht;
    Play.attachUi = function (ui) {
      if (typeof prevAttach === "function") prevAttach(ui);
      const $ = function (id) {
        return document.getElementById(id);
      };
      ui.playYacht = $("play-yacht");
      ui.yachtDice = $("yacht-dice");
      ui.yachtCard = $("yacht-card");
      ui.roll = $("btn-roll");
    };
  }
});
