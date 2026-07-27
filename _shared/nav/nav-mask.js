/* ============================================================
   Polpharma Biologics — NAV MASK (system #2, _shared)
   Maska koloru na overlayu: krawędź JASNEJ sekcji najeżdżającej
   na ciemne tło odsłania jasną wersję nav (kopia w .nav-mask_component).

   Sekcje deklarują jasne tło atrybutem:  data-nav-theme="light"
   (strona nie musi znać implementacji — wiesza atrybut i woła initNavMask()).

   KOMPLEMENTARNE clipy (fix halo AA — finalna wersja z home):
   - kopia (mask): widoczna PONIŻEJ krawędzi jasnej sekcji
   - bazowy nav:   widoczny POWYŻEJ krawędzi (clip w px WŁASNEGO boxa)
   Żaden piksel nie renderuje obu wersji naraz.

   UWAGA 1: scrub: true (BEZ kisielu!) — krawędź sekcji to natywny scroll,
   clip musi jechać 1:1, inaczej krawędzie się rozjadą.
   UWAGA 2: clip-path, NIE overflow+kontr-transform (ghost composited warstw).

   OGRANICZENIE (świadome): obsługiwana jest PIERWSZA sekcja
   [data-nav-theme="light"] na stronie — semantyka 1:1 z obecnego home
   (nav zostaje jasny od jej krawędzi w dół). Generalizacja na wiele
   naprzemiennych sekcji → przy przepinaniu about (ma wersję 1-krawędziową).
   ============================================================ */

(function () {
  function initNavMask() {
    var mask = document.querySelector(".nav-mask_component");
    var baseNav = document.querySelector(".nav_component:not(.is-dark)");
    var section = document.querySelector('[data-nav-theme="light"]');
    if (!mask || !baseNav || !section) return;

    var proxy = { p: 0 };
    function applyClips() {
      var edge = (1 - proxy.p) * window.innerHeight; // krawędź jasnej sekcji w px od góry
      mask.style.clipPath = "inset(" + edge.toFixed(1) + "px 0px 0px 0px)";
      var h = baseNav.offsetHeight;                  // clip bazowego liczony w JEGO boxie
      var cut = Math.min(Math.max(h - edge, 0), h);
      if (cut >= h) {
        /* jasna sekcja zakrywa CAŁY nav — bazowy chowamy przez KLASĘ, NIE clip:
           clip-path usuwa też hit-testing, a klikalny jest tylko bazowy nav
           (kopia w masce = pointer-events:none). Klasa zachowuje strefę klikania. */
        baseNav.style.clipPath = "none";
        baseNav.classList.add("is-nav-covered");
      } else {
        /* ⚠️ NIE dotykać baseNav.style.opacity! Bazowy nav ma [data-reveal="ui"], a
           styleguide.css robi na tym FOUC guard `[data-reveal]{opacity:0}`. Widoczny
           jest WYŁĄCZNIE dzięki inline'owi opacity:1 od GSAP-a (intro hero). Reset
           `style.opacity=""` kasował tego inline'a → wracał guard → bazowy nav ginął
           NA STAŁE (widać było tylko kopię w masce, czyli nav wyłącznie na jasnych
           sekcjach). Dlatego widocznością steruje osobny kanał: klasa .is-nav-covered. */
        baseNav.classList.remove("is-nav-covered");
        baseNav.style.clipPath = cut > 0 ? "inset(0px 0px " + cut.toFixed(1) + "px 0px)" : "none";
      }
    }
    applyClips();

    gsap.to(proxy, {
      p: 1,
      ease: "none",
      onUpdate: applyClips,
      scrollTrigger: {
        trigger: section,
        start: "top bottom", // krawędź jasnej sekcji na dole ekranu
        end: "top top",      // jasna sekcja zakryła cały viewport
        scrub: true,         // 1:1 z natywnym scrollem — patrz UWAGA 1
      },
    });
  }

  var PPB = (window.PPB = window.PPB || {});
  PPB.initNavMask = initNavMask;
  window.initNavMask = initNavMask;
})();
