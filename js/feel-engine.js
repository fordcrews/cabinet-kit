/**
 * Play-feel engine hooks: canSkip, illegal pair cells, Hoops linedUp.
 * Loaded after engine/solitaire/arcade. Node tests may require this file
 * to patch the cached engine module.
 */
(function () {
  "use strict";

  function patch(E) {
    if (!E || E.__cabinetFeel) return E;
    E.__cabinetFeel = true;
    if (typeof E.snapshotColumns === "function") {
      var sc = E.snapshotColumns;
      E.snapshotColumns = function (session) {
        var snap = sc(session);
        snap.canSkip =
          session.status === "playing" && session.skipsLeft > 0 && !!session.incoming;
        return snap;
      };
    }
    if (typeof E.snapshotRunLanes === "function") {
      var sr = E.snapshotRunLanes;
      E.snapshotRunLanes = function (session) {
        var snap = sr(session);
        snap.canSkip =
          session.status === "playing" && session.skipsLeft > 0 && !!session.incoming;
        return snap;
      };
    }
    if (typeof E.tapEleven === "function") {
      var te = E.tapEleven;
      E.tapEleven = function (session, index) {
        var a = session.selected;
        var out = te(session, index);
        if (
          session.lastEvent &&
          session.lastEvent.kind === "illegal" &&
          !session.lastEvent.cells
        ) {
          session.lastEvent.cells = [a, Number(index)];
        }
        return out;
      };
    }
    if (typeof E.snapshotHoops === "function") {
      var sh = E.snapshotHoops;
      E.snapshotHoops = function (session) {
        var snap = sh(session);
        snap.linedUp =
          session.aimX >= session.rimX - session.rimW &&
          session.aimX <= session.rimX + session.rimW;
        return snap;
      };
    }
    return E;
  }

  if (typeof module === "object" && module.exports) {
    var engine = require("./engine.js");
    try {
      require("./solitaire.js");
    } catch (e1) {}
    try {
      require("./arcade.js");
    } catch (e2) {}
    module.exports = patch(engine);
  } else if (typeof window !== "undefined" && window.CabinetEngine) {
    patch(window.CabinetEngine);
  }
})();
