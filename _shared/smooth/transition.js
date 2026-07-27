/* ============================================================
   Polpharma Biologics — PAGE TRANSITIONS (Barba.js)
   Warstwa page-agnostic: overlay wipe (Deep Green) chowa moment
   swapu (DOM + CSS), po czym odslania nowa strone. Init/destroy
   per strona wisi na hookach Barby, nie na window.load.
   ============================================================ */
(function () {
  "use strict";

  var COVER_MS = 0.55;         // czas jednej polowy wipe'a (in / out)
  var EASE = "power3.inOut";
  var OVERLAY_BG = "#005453";  // Deep Green (docelowo: dobrac wg refow designera)

  /* ---------- overlay (persistuje poza kontenerem Barby) ---------- */
  var overlay = document.createElement("div");
  overlay.className = "ppb-transition";
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: OVERLAY_BG,
    zIndex: "99999",
    transform: "translateY(100%)",
    willChange: "transform",
    pointerEvents: "none",
  });
  document.body.appendChild(overlay);

  function coverIn() {
    return gsap.to(overlay, { y: "0%", duration: COVER_MS, ease: EASE }).then();
  }
  function coverOut() {
    return gsap.to(overlay, { y: "-100%", duration: COVER_MS, ease: EASE })
      .then(function () { gsap.set(overlay, { y: "100%" }); });
  }

  /* ---------- swap CSS specyficznego dla strony (za zaslonieta zaslona) ---------- */
  function swapPageCSS(nextHtml) {
    var doc = new DOMParser().parseFromString(nextHtml, "text/html");
    var nextLinks = Array.prototype.slice.call(doc.querySelectorAll('link[data-page-css]'));
    // usun aktualne
    document.querySelectorAll('link[data-page-css]').forEach(function (l) { l.remove(); });
    // dodaj nowe i poczekaj az sie zaladuja (zeby nie odslonic niestylowanej strony)
    return Promise.all(nextLinks.map(function (l) {
      return new Promise(function (res) {
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = l.getAttribute("href");
        link.setAttribute("data-page-css", "");
        link.onload = res;
        link.onerror = res;
        document.head.appendChild(link);
      });
    }));
  }

  function startPage(ns, first) {
    var mod = window.PPB && window.PPB[ns];
    if (mod && typeof mod.init === "function") mod.init({ first: !!first });
  }
  function stopPage(ns) {
    var mod = window.PPB && window.PPB[ns];
    if (mod && typeof mod.destroy === "function") mod.destroy();
  }

  /* ---------- Barba ---------- */
  barba.init({
    // nie przechwytuj linkow-placeholderow (#) ani hashy
    prevent: function (data) {
      var href = data.el.getAttribute("href");
      return !href || href === "#" || href.charAt(0) === "#";
    },
    transitions: [
      {
        name: "ppb-wipe",

        // pierwsze wejscie na dowolna strone (bez transition)
        once: function (data) {
          startPage(data.next.namespace, true);
        },

        // stara strona wychodzi: zaslon ekran, potem posprzataj GSAP
        leave: function (data) {
          return coverIn().then(function () {
            stopPage(data.current.namespace);
          });
        },

        // nowa strona wchodzi (ekran zasloniety): swap CSS -> scroll top -> init
        enter: function (data) {
          return swapPageCSS(data.next.html).then(function () {
            if (window.PPB_SMOOTH) window.PPB_SMOOTH.toTop(); else window.scrollTo(0, 0);
            startPage(data.next.namespace, false);
          });
        },

        // odslon nowa strone
        after: function () {
          return coverOut();
        },
      },
    ],
  });
})();
