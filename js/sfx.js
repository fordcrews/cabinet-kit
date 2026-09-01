/**
 * Cabinet Kit — procedural arcade SFX (Web Audio, no files).
 * Browser: window.CabinetSfx. Node: module.exports (cueFromEvent + mute helpers).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.CabinetSfx = api;
  } else if (typeof globalThis !== "undefined") {
    globalThis.CabinetSfx = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MUTE_KEY = "cabinet-kit-muted";
  const PEAK = 0.12;

  const KIND_TO_CUE = {
    tap: "tap",
    select: "tap",
    hold: "tap",
    set: "tap",
    deselect: "tap",
    locked: "tap",
    place: "place",
    move: "move",
    slide: "move",
    swap: "pop",
    clear: "clear",
    pop: "pop",
    pair: "pair",
    run: "run",
    "21": "21",
    foundation: "foundation",
    complete: "run",
    bust: "bust",
    illegal: "illegal",
    miss: "miss",
    wrong: "wrong",
    small: "miss",
    deal: "deal",
    draw: "draw",
    recycle: "recycle",
    roll: "roll",
    next: "draw",
    skip: "skip",
    stay: "stay",
    pass: "skip",
    take: "stay",
    score: "place",
    make: "make",
    shoot: "shoot",
    correct: "correct",
    win: "win",
    won: "win",
    done: "done",
    perfect: "perfect",
    high: "high",
    hit: "tap",
  };

  const CUES = {
    tap: 1,
    place: 1,
    move: 1,
    clear: 1,
    pop: 1,
    pair: 1,
    run: 1,
    "21": 1,
    foundation: 1,
    bust: 1,
    illegal: 1,
    miss: 1,
    wrong: 1,
    deal: 1,
    draw: 1,
    recycle: 1,
    roll: 1,
    skip: 1,
    stay: 1,
    make: 1,
    shoot: 1,
    correct: 1,
    win: 1,
    done: 1,
    perfect: 1,
    high: 1,
  };

  let muted = false;
  let ctx = null;
  let lastPlayedRef = null;
  let lastPlayedSeq = null;
  const muteListeners = [];

  function storage() {
    try {
      if (typeof localStorage !== "undefined") return localStorage;
    } catch (e) {}
    try {
      if (typeof globalThis !== "undefined" && globalThis.localStorage) {
        return globalThis.localStorage;
      }
    } catch (e) {}
    return null;
  }

  function readMuted() {
    const store = storage();
    if (!store) return false;
    try {
      return store.getItem(MUTE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function writeMuted(value) {
    const store = storage();
    if (!store) return;
    try {
      store.setItem(MUTE_KEY, value ? "1" : "0");
    } catch (e) {}
  }

  muted = readMuted();

  function notifyMute() {
    for (let i = 0; i < muteListeners.length; i++) {
      try {
        muteListeners[i](muted);
      } catch (e) {}
    }
  }

  function isMuted() {
    return !!muted;
  }

  function setMuted(value) {
    muted = !!value;
    writeMuted(muted);
    notifyMute();
    return muted;
  }

  function toggle() {
    return setMuted(!muted);
  }

  function onMuteChange(fn) {
    if (typeof fn === "function") muteListeners.push(fn);
  }

  function audioContextCtor() {
    try {
      if (typeof window === "undefined") return null;
      return window.AudioContext || window.webkitAudioContext || null;
    } catch (e) {
      return null;
    }
  }

  function unlock() {
    try {
      const Ctor = audioContextCtor();
      if (!Ctor) return;
      if (!ctx) ctx = new Ctor();
      if (ctx && ctx.state === "suspended" && typeof ctx.resume === "function") {
        ctx.resume().catch(function () {});
      }
    } catch (e) {}
  }

  function tone(freq, type, duration, peak, delay) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.value = freq;
    const now = ctx.currentTime + (delay || 0);
    const dur = duration || 0.1;
    const vol = peak == null ? PEAK : peak;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  function noise(duration, peak, delay) {
    if (!ctx) return;
    const dur = duration || 0.08;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    const now = ctx.currentTime + (delay || 0);
    const vol = peak == null ? PEAK * 0.55 : peak;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  function arpeggio(freqs, type, noteDur) {
    for (let i = 0; i < freqs.length; i++) {
      tone(freqs[i], type || "square", noteDur || 0.09, PEAK * 0.9, i * 0.07);
    }
  }

  function playCue(name) {
    switch (name) {
      case "tap":
        tone(880, "square", 0.08, PEAK * 0.7);
        break;
      case "place":
        tone(392, "triangle", 0.12, PEAK);
        break;
      case "move":
        tone(330, "triangle", 0.11, PEAK * 0.9);
        break;
      case "clear":
      case "pop":
        noise(0.05, PEAK * 0.45);
        arpeggio([523.25, 659.25, 783.99], "square", 0.09);
        break;
      case "pair":
      case "run":
      case "21":
      case "foundation":
        arpeggio([587.33, 739.99, 880], "square", 0.1);
        break;
      case "bust":
      case "illegal":
      case "miss":
      case "wrong":
        tone(110, "square", 0.18, PEAK);
        noise(0.12, PEAK * 0.4);
        break;
      case "deal":
      case "draw":
      case "recycle":
        noise(0.045, PEAK * 0.35);
        tone(262, "triangle", 0.08, PEAK * 0.7);
        break;
      case "roll":
        noise(0.06, PEAK * 0.4);
        tone(196, "square", 0.09, PEAK * 0.65);
        break;
      case "skip":
        tone(494, "triangle", 0.1, PEAK * 0.75);
        break;
      case "stay":
        tone(349, "triangle", 0.14, PEAK * 0.8);
        break;
      case "make":
      case "shoot":
        tone(660, "square", 0.09, PEAK, 0);
        tone(880, "square", 0.11, PEAK, 0.08);
        break;
      case "correct":
        tone(1320, "triangle", 0.16, PEAK * 0.85);
        break;
      case "win":
      case "done":
      case "perfect":
        arpeggio([261.63, 329.63, 392], "triangle", 0.14);
        break;
      case "high":
        arpeggio([784, 988, 1175, 1568], "square", 0.08);
        break;
      default:
        break;
    }
  }

  function play(name) {
    try {
      if (muted) return;
      if (!name || !CUES[name]) return;
      if (!ctx) return;
      playCue(name);
    } catch (e) {}
  }

  function cueFromEvent(ev, extra) {
    extra = extra || {};
    if (ev && ev.kind != null && ev.kind !== "") {
      const kind = String(ev.kind);
      if (kind === "clear" && ev.digit === 0) return "tap";
      if (kind === "score") return ev.points > 0 ? "place" : "tap";
      if (KIND_TO_CUE[kind]) return KIND_TO_CUE[kind];
      if (CUES[kind]) return kind;
      return null;
    }
    if (extra.outcome && KIND_TO_CUE[extra.outcome]) return KIND_TO_CUE[extra.outcome];
    return null;
  }

  function alreadyPlayed(ev, extra) {
    const session = extra && extra.session;
    if (ev && ev.seq != null) {
      if (session && session._sfxSeq === ev.seq) return true;
      if (lastPlayedSeq === ev.seq) return true;
      return false;
    }
    if (ev && session && session._sfxSeen === ev) return true;
    if (ev && ev === lastPlayedRef) return true;
    if ((!ev || !session || session.lastEvent !== ev) && session) {
      const stamp =
        "k:" +
        ((ev && ev.kind) || extra.outcome || "") +
        "@" +
        (extra.status || session.status || "");
      if (session._sfxSeen === stamp) return true;
    }
    return false;
  }

  function markPlayed(ev, extra) {
    const session = extra && extra.session;
    if (ev && ev.seq != null) {
      lastPlayedSeq = ev.seq;
      if (session) session._sfxSeq = ev.seq;
    }
    lastPlayedRef = ev || lastPlayedRef;
    if (session) {
      if (ev && session.lastEvent === ev) {
        session._sfxSeen = ev;
      } else {
        session._sfxSeen =
          "k:" +
          ((ev && ev.kind) || extra.outcome || "") +
          "@" +
          (extra.status || session.status || "");
      }
    }
  }

  function fromEvent(ev, extra) {
    extra = extra || {};
    try {
      if (alreadyPlayed(ev, extra)) return;
      const cue = cueFromEvent(ev, extra);
      const status = extra.status;
      const ended = status === "done" || status === "won";
      const winCue =
        cue === "win" || cue === "done" || cue === "perfect" || cue === "won";
      markPlayed(ev, extra);
      if (cue) play(cue);
      if (ended && !winCue) play("win");
      if (extra.isNew) play("high");
    } catch (e) {}
  }

  return {
    MUTE_KEY: MUTE_KEY,
    KIND_TO_CUE: KIND_TO_CUE,
    cueFromEvent: cueFromEvent,
    play: play,
    fromEvent: fromEvent,
    unlock: unlock,
    isMuted: isMuted,
    setMuted: setMuted,
    toggle: toggle,
    onMuteChange: onMuteChange,
  };
});
