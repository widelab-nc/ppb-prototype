/* ============================================================
   Polpharma Biologics — GSAP CONFIG (globalny, _shared)
   Rejestracja pluginów + WSPÓLNE easingi + config systemów
   globalnych. JEDYNE miejsce strojenia rzeczy współdzielonych.
   Docelowo w Webflow: /core/gsap-config.js (repo → jsDelivr).

   Ładowanie (po CDN gsap/ScrollTrigger/SplitText, przed reveal.js):
     <script src="../_shared/gsap-config.js"></script>
   ============================================================ */

(function () {
  if (window.gsap) {
    var plugins = [];
    if (window.ScrollTrigger) plugins.push(window.ScrollTrigger);
    if (window.SplitText) plugins.push(window.SplitText);
    if (window.CustomEase) plugins.push(window.CustomEase);
    if (plugins.length) gsap.registerPlugin.apply(gsap, plugins);
  }

  /* Globalny namespace projektu (Barba-ready: strony NIE dopisują tu
     swoich CONFIG-ów — tylko moduły stron: window.PPB.pages.<strona>) */
  var PPB = (window.PPB = window.PPB || {});
  PPB.pages = PPB.pages || {};

  PPB.config = {
    /* wspólne easingi (odpowiednik CustomEase w Webflow /core) */
    ease: {
      main: "power3.inOut",
      expand: "power4.inOut",
      out: "power2.out",
    },

    /* "kisiel" scruba (sekundy doganiania) — pinned flow, We know itd.
       UWAGA: maska nav (system #2) ZAWSZE scrub: true, bez kisielu! */
    scrubSmooth: 1.2,

    /* ===== SYSTEM #1 v2: LINE-REVEAL (docelowy efekt Tomka) =====
       Linie spod maski, stagger per linia. Zmiana efektu = TYLKO tutaj
       (po decyzji z home-reveal-lab podmieniamy wartości w tym bloku). */
    reveal: {
      ease: "expo.out",   // = cubic-bezier(.19,1,.22,1)
      duration: 1,
      stagger: 0.1,       // 100 ms na LINIĘ
      lineY: 115,         // % wysokości linii — start pod maską
      /* default trigger point revealOnScroll — jak na homepage */
      start: "top 75%",
      /* CHOWANIE bidirectional: reset DOPIERO gdy element cały zniknie z ekranu
         przy scrollu w górę (górna krawędź na dole viewportu) — hide niewidoczny.
         Decyzja Tomka 2026-07-22. */
      hideStart: "top bottom",
      hide: {             // "znika od razu, miękko dogasa" (decyzja 2026-07-19)
        ease: "power2.out",
        duration: 0.35,
        stagger: 0,       // JEDNOLITY wyjazd — wszystkie linie znikają naraz
                          // (decyzja Tomka 2026-07-22: feeling "We produce impact").
                          // Chcesz rytm przy wyjeździe? Podnieś tutaj (globalnie).
      },
    },

    /* ===== SYSTEM #4: SCROLL HIGHLIGHT (tekst doświetlany scrollem) =====
       „Tekst stoi, rozjaśnia się jednostka po jednostce w rytm scrolla."
       Implementacja: _shared/highlight.js. Strojenie feelingu — TYLKO TU.
       ⚠️ `from` musi być zgodne z `.hl-unit { opacity }` w styleguide.css
       (CSS trzyma stan początkowy = zero FOUC). */
    highlight: {
      unit: "word",       // "word" | "char" (char = gęstsze, „ciekłe" przejście)
      from: 0.22,         // opacity bazy (przygaszenie)
      start: "top 82%",   // domyślny start deklaratywny
      end: "top 35%",     // domyślny koniec deklaratywny
      ease: "none",       // liniowo — highlight ma być 1:1 ze scrollem
      stagger: 1,         // rytm jednostek wewnątrz scruba (each)
    },

    /* ===== SWAP-IN-PLACE — ozdoby wspólne (system #3) =====
       Rotacja diamentu przy zamianie tekstu w tym samym miejscu (About journey,
       We-know → Our goal). Efekt: rotacja WZGLĘDNA ±angle° (w prawo przy 0→1,
       w lewo przy powrocie). Strojenie easing/duration TYLKO tutaj. */
    swapFx: {
      diamond: { angle: 90, duration: 0.8, ease: "power3.inOut" },
    },
  };
})();
