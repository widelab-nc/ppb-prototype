/* Buduje barba-site/insights.js z ../home-insights/script.js.
   Kanon home-insights/ NIE jest dotykany — to lokalna kopia pod harness Barby. */
const fs = require("fs");
const SRC = "../home-insights/script.js";
const OUT = "insights.js";

let s = fs.readFileSync(SRC, "utf8");
const before = s;

// --- 1. otwarcie IIFE → moduł + funkcja sekcji ---
s = s.replace(
  '(function () {\n  "use strict";',
  `(function () {
  "use strict";

  /* ============================================================
     BARBA (2026-07-28) — kopia lokalna \`../home-insights/script.js\`.
     Oryginał odpala się PRZY PARSOWANIU pliku, więc pod Barbą sekcja
     działałaby tylko przy pierwszym wejściu na home, a po wyjściu
     zostawałaby wieczna pętla rAF + żywy Swiper na wyrzuconym DOM-ie.
     Tu ta sama logika siedzi w initSection(root), a teardown() ubija
     Swipera, pętlę i listener media query.
     ⚠️ Rozjazd z kanonem: przy zmianach w home-insights/ trzeba
     przegenerować ten plik (outputs/make-insights.js).
     ============================================================ */
  var ROOT = document;
  var rafId = null;
  var teardown = null;

  function initSection() {`
);

// --- 2. scope zapytania o slider do kontenera strony ---
s = s.replace(
  'var sliderEl = document.querySelector(".home-insights_slider");',
  'var sliderEl = ROOT.querySelector(".home-insights_slider");'
);

// --- 3. pętla rAF pod kontrolą (żeby dało się ją zatrzymać) ---
s = s.split("requestAnimationFrame(tick);").join("rafId = requestAnimationFrame(tick);");

// --- 4. hak teardown zaraz po wpięciu listenera media query,
//        czyli PRZED wczesnym returnem dla prefers-reduced-motion ---
s = s.replace(
  '  else MQ_SLIDER.addListener(syncSlider);           // Safari < 14',
  `  else MQ_SLIDER.addListener(syncSlider);           // Safari < 14

  teardown = function () {
    destroySlider();
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (MQ_SLIDER.removeEventListener) MQ_SLIDER.removeEventListener("change", syncSlider);
    else if (MQ_SLIDER.removeListener) MQ_SLIDER.removeListener(syncSlider);
  };`
);

// --- 5. zamknięcie initSection + kontrakt init/destroy ---
if (!s.endsWith("})();\n") && !s.endsWith("})();")) throw new Error("nieoczekiwane zakończenie pliku");
s = s.replace(/\}\)\(\);\s*$/, `  }

  /* ---- kontrakt Barba: init(root) / destroy() ---- */
  function init(root) {
    ROOT = root || document;
    initSection();
  }
  function destroy() {
    if (teardown) { try { teardown(); } catch (e) {} teardown = null; }
  }

  var PPB = (window.PPB = window.PPB || {});
  PPB.sections = PPB.sections || {};
  PPB.sections.insights = { init: init, destroy: destroy };

  if (!window.__PPB_BARBA__) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { init(document); });
    else init(document);
  }
})();
`);

if (s === before) throw new Error("nic nie podmieniono — sprawdź kotwice");
fs.writeFileSync(OUT, s);
console.log("insights.js zbudowany");
