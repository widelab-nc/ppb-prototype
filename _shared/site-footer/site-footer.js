/* ============================================================
   Polpharma Biologics — SITE FOOTER (globalny, _shared/site-footer)
   Choreografia wejścia footera. Wymaga (w tej kolejności):
     gsap → ScrollTrigger → SplitText → ../gsap-config.js → ../reveal.js
   Init: initSiteFooter();   (Barba: wołaj w afterEnter, patrz destroy())

   TRZY RZECZY:
   1. TEKST — wspólny system #1 (revealText/hideText z ../reveal.js),
      jedna kaskada ze staggerem: HQ → nawias → linki → legal → nawias → meta.
      Markup ma NAZWANY data-reveal="site-footer" → initReveals() go POMIJA
      (atrybut działa jako FOUC guard), choreografię prowadzi ten plik.
   2. NAWIASY — rosną z lewej do prawej (scaleX 0→1, origin left).
   3. KSZTAŁTY — na scrub rozjeżdżają się ze stanu koncentrycznego
      (nałożone na siebie) do docelowego (obok siebie, przerwa 1rem).
      Lewy STOI (trzyma się krawędzi kontenera), rusza się tylko PRAWY — w prawo.
      Zakres: footer „top bottom-=10rem" → „bottom bottom".

   Strojenie efektu tekstu (easing/duration/stagger) = NIE TUTAJ,
   tylko ../gsap-config.js → PPB.config.reveal (zmiana globalna).

   🔴 refreshPriority: -1 NA WSZYSTKICH TRIGGERACH — NIE USUWAĆ.
   Footer jest OSTATNIM elementem strony, a nad nim są sekcje PINOWANE
   (how-it-works, key-pillars). ScrollTrigger odświeża triggery w kolejności
   ich `refreshPriority`, a przy równym priorytecie — w kolejności tworzenia.
   Pin key-pillars powstaje w OSOBNYM load-listenerze (`key-pillars.js`),
   czyli PO tym module → przy refreshu footer mierzy się, zanim ten pin doda
   swoje pin-spacery. Efekt: start footera wypada o dokładnie tyle za wcześnie,
   ile wynosi dystans pinu (zmierzone na home: 3600 px) — animacje odgrywają
   się w całości poniżej ekranu i użytkownik widzi gotowy, „martwy" footer.
   `-1` = odśwież mnie NA KOŃCU, gdy wszystkie piny są już policzone.
   Zasada ogólna: element na dole strony + pinowane sekcje nad nim = ujemny
   refreshPriority. Dotyczy każdej nowej sekcji dopinanej pod pinami.
   ============================================================ */

(function () {
  var PPB = (window.PPB = window.PPB || {});

  var CONFIG = {
    /* „nawiasy" — otwieranie z lewej do prawej */
    rule: { duration: 1.1, ease: "expo.out" },

    /* kaskada: offsety na wspólnym timelinie (sekundy) */
    seq: { hq: 0, ruleTop: 0.14, links: 0.26, legal: 0.4, ruleBottom: 0.5, meta: 0.6 },

    /* rozjazd kształtów.
       start = "top bottom-=<startOffsetRem>rem" (ScrollTrigger nie parsuje rem
       w stringu — przeliczamy po computed root font-size, więc działa też
       z fluid rem; funkcja przelicza się przy każdym refreshu).

       ⚠️ ZNAK: dodatni = marker WYŻEJ w viewporcie → footer musi już wjechać
       o tyle w ekran → animacja rusza PÓŹNIEJ.
       Ujemny = marker POD krawędzią ekranu → rusza WCZEŚNIEJ, zanim footer
       w ogóle się pokaże. Chcesz „wcześniej"? Wpisz -10. */
    shapes: { startOffsetRem: 10, end: "bottom bottom", scrub: 0.6 },
  };

  function growRule(el) {
    return gsap.fromTo(
      el,
      { scaleX: 0 },
      { scaleX: 1, duration: CONFIG.rule.duration, ease: CONFIG.rule.ease, overwrite: "auto" }
    );
  }

  function initSiteFooter(scope) {
    var root = (scope || document).querySelector(".is-site-footer");
    if (!root) return null;

    /* re-init (Barba / hot reload) — sprzątamy poprzednie triggery */
    if (root._sfTriggers) root._sfTriggers.forEach(function (t) { t.kill(); });
    var triggers = (root._sfTriggers = []);

    var r = PPB.config.reveal;
    var s = CONFIG.seq;

    var hq = root.querySelectorAll('.site-footer_hq [data-reveal="site-footer"]');
    var links = root.querySelectorAll(".site-footer_link");
    var legal = root.querySelectorAll(".site-footer_legal-link");
    var meta = root.querySelectorAll(".site-footer_meta-item");
    var ruleTop = root.querySelector(".site-footer_rule:not(.is-flipped)");
    var ruleBottom = root.querySelector(".site-footer_rule.is-flipped");
    var rules = [ruleTop, ruleBottom].filter(Boolean);

    var allText = [].concat(
      Array.prototype.slice.call(hq),
      Array.prototype.slice.call(links),
      Array.prototype.slice.call(legal),
      Array.prototype.slice.call(meta)
    );

    /* ---------- 1+2. kaskada tekstu i nawiasów ---------- */
    function play() {
      var tl = gsap.timeline();
      tl.add(revealText(hq), s.hq)
        .add(growRule(ruleTop), s.ruleTop)
        .add(revealText(links), s.links)
        .add(revealText(legal), s.legal)
        .add(growRule(ruleBottom), s.ruleBottom)
        .add(revealText(meta), s.meta);
      return tl;
    }

    function reset() {
      hideText(allText);
      gsap.to(rules, { scaleX: 0, duration: r.hide.duration, ease: r.hide.ease, overwrite: "auto" });
    }

    if (window.REDUCED_MOTION) {
      gsap.set(allText, { autoAlpha: 1 });
      gsap.set(rules, { scaleX: 1 });
    } else {
      /* reveal przy wejściu (globalny punkt startu z PPB.config.reveal) */
      triggers.push(
        ScrollTrigger.create({ trigger: root, start: r.start, refreshPriority: -1, onEnter: play })
      );
      /* reset dopiero gdy footer zniknie z ekranu przy scrollu w górę
         (hide niewidoczny — zasada globalna, PPB.config.reveal.hideStart) */
      triggers.push(
        ScrollTrigger.create({ trigger: root, start: r.hideStart, refreshPriority: -1, onLeaveBack: reset })
      );
    }

    /* ---------- 3. kształty: koncentryczne → obok siebie ---------- */
    var square = root.querySelector(".site-footer_square");
    var circle = root.querySelector(".site-footer_circle");

    if (square && circle) {
      /* Kształt z LEWEJ stoi (kotwica), rusza się TYLKO ten z PRAWEJ — startuje
         nałożony na lewy (koncentrycznie) i jedzie w prawo na swoje miejsce.
         Który jest który zależy od breakpointu (na mobile `order` odwraca
         kolejność), więc ustalamy to pomiarem, a nie na sztywno.
         ⚠️ Mierzymy przez getBoundingClientRect przy WYZEROWANYCH transformach —
         kwadrat jest <svg>, a SVGElement NIE MA offsetLeft/offsetWidth. */
      var mover = null;   /* element z prawej — jedyny, który się animuje */
      var delta = 0;      /* pełny dystans między środkami w stanie docelowym */
      function measureShapes() {
        gsap.set([square, circle], { x: 0 });
        var r1 = square.getBoundingClientRect();
        var r2 = circle.getBoundingClientRect();
        var c1 = r1.left + r1.width / 2;
        var c2 = r2.left + r2.width / 2;
        mover = c2 >= c1 ? circle : square;
        delta = Math.abs(c2 - c1);
      }
      measureShapes();

      if (window.REDUCED_MOTION) {
        gsap.set([square, circle], { x: 0 });
      } else {
        var c = CONFIG.shapes;
        var shapesStart = function () {
          var rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
          return "top bottom-=" + c.startOffsetRem * rootPx;
        };
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: shapesStart,
            end: c.end,
            scrub: c.scrub,
            invalidateOnRefresh: true,   /* przelicz przy resize/breakpoincie */
            refreshPriority: -1,        /* patrz nagłówek pliku — NIE USUWAĆ */
            onRefreshInit: measureShapes,
          },
        });
        /* oba tweeny zostają (breakpoint może zamienić role przy refreshu),
           ale ten na kotwicy ma dystans 0 → stoi w miejscu */
        tl.fromTo(square, { x: function () { return mover === square ? -delta : 0; } }, { x: 0, ease: "none" }, 0)
          .fromTo(circle, { x: function () { return mover === circle ? -delta : 0; } }, { x: 0, ease: "none" }, 0);
        if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);
      }
    }

    return { root: root, destroy: function () { triggers.forEach(function (t) { t.kill(); }); root._sfTriggers = null; } };
  }

  PPB.siteFooter = { config: CONFIG, init: initSiteFooter };
  window.initSiteFooter = initSiteFooter;
})();
