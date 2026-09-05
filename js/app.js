(function () {
  "use strict";
  function boot(parts) {
    var s = document.createElement("script");
    s.textContent = parts.join("\n");
    document.body.appendChild(s);
  }
  Promise.all(
    ["js/app-a.js", "js/app-sets-ui.js", "js/app-b.part0.js", "js/app-b.part1.js", "js/app-b.part2.js"].map(function (url) {
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error("Missing " + url);
        return res.text();
      });
    })
  )
    .then(boot)
    .catch(function (err) {
      var list = document.getElementById("game-list");
      if (list) {
        list.innerHTML = '<li class="status-error"></li>';
        list.querySelector("li").textContent = String(err.message || err);
      }
    });
})();
