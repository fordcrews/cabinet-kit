  (function installExitConfirmHooks() {
    if (ui && ui.back) {
      const neu = ui.back.cloneNode(true);
      ui.back.parentNode.replaceChild(neu, ui.back);
      ui.back = neu;
      neu.addEventListener("click", function () {
        confirmLeaveToCabinet();
      });
    }
    if (typeof route !== "function" || route.__exitWrapped) return;
    const origRoute = route;
    route = function () {
      const hash = location.hash || "#/";
      rememberPlayHash(hash);
      const isCabinet = !/^#\/play\//.test(hash) && !/^#\/set\//.test(hash);
      if (exitBypass) {
        exitBypass = false;
        return origRoute.apply(this, arguments);
      }
      if (isCabinet && shouldGateExit()) {
        quietRestorePlayHash();
        confirmLeaveToCabinet();
        return;
      }
      return origRoute.apply(this, arguments);
    };
    route.__exitWrapped = true;
  })();
