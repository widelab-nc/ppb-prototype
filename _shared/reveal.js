/* ============================================================
   Polpharma Biologics — SYSTEM GLOBALNY #1 v2: LINE-REVEAL (_shared)
   Jedna implementacja + jeden config (PPB.config.reveal z gsap-config.js).
   Initial state daje CSS (styleguide.css):
     [data-reveal] { opacity: 0; visibility: hidden }  (zero FOUC)
   Struktura per linia: .rv-line (maska) > .rv-line-in (animowany wrapper).
   Podział: SplitText (type "lines") — RAZ per element, cache na elemencie.
   ⚠️ Split fragmentuje nested spany → selektory do wnętrza tekstu ZAWSZE
   querySelectorAll PO splicie, w momencie użycia.

   API (globalne — shared singleton, ładowany raz per strona):
     revealText(targets, opts)  — kierunek = ZNAK opts.y/yPercent (ujemny: z góry)
     hideText(targets, opts)    — opts.sign: -1 → wyjście do góry
     revealOnScroll(trigger, targets, opts) — single trigger / bidirectional
     ensureLines(el)            — split + cache
     initReveals(scope?)        — warstwa DEKLARATYWNA (data-atrybuty, patrz niżej)

   TAKSONOMIA data-reveal:
     data-reveal=""      → deklaratywnie: single-interaction in-view reveal.
                           DOMYŚLNIE DWUKIERUNKOWY (decyzja Tomka 2026-07-22):
                           wjazd linia-po-linii przy wejściu (start "top 75%");
                           CHOWANIE (reset) DOPIERO gdy element cały zniknie z ekranu
                           przy scrollu w górę (marker hideStart "top bottom") — hide
                           NIEWIDOCZNY; re-fire przy ponownym zjeździe w dół.
                           = feeling "Pure play biosimilar developer". To jest
                           DOMYŚLNA reguła dla każdej pojedynczej interakcji tekstu.
     data-reveal="load"  → deklaratywnie: reveal zaraz po load/loaderze (bez kierunku)
     data-reveal="<inne>" (np. "ui", "text", "hiw-text", "our-goal")
                         → MANUALNIE: choreografia strony woła revealText/hideText;
                           initReveals te elementy POMIJA (atrybut = FOUC guard + split)
     modyfikatory (tylko deklaratywne):
       data-reveal-start="top 60%"   (default: PPB.config.reveal.start = "top 75%")
       data-reveal-once              → odpala RAZ i zostaje (opt-out z bidirectional)
       data-reveal-bidirectional     → alias/no-op (bidirectional jest już default)
   ============================================================ */

(function () {
  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cfg = function () { return window.PPB.config.reveal; };

  /* dzieli element na linie (raz) i zwraca animowalne wrappery .rv-line-in */
  function ensureLines(el) {
    if (el._rvLines) return el._rvLines;
    var split = new SplitText(el, { type: "lines", linesClass: "rv-line" });
    el._rvLines = split.lines.map(function (line) {
      var inner = document.createElement("span");
      inner.className = "rv-line-in";
      while (line.firstChild) inner.appendChild(line.firstChild);
      line.appendChild(inner);
      return inner;
    });
    return el._rvLines;
  }

  /* pokazanie: linie wyjeżdżają spod maski (stagger per linia, przez wszystkie targety) */
  function revealText(targets, opts) {
    opts = opts || {};
    var r = cfg();
    var els = gsap.utils.toArray(targets);
    if (REDUCED_MOTION) return gsap.to(els, { autoAlpha: 1, duration: 0.3, overwrite: "auto" });

    var lines = els.flatMap(ensureLines);
    var amp = opts.yPercent != null ? opts.yPercent : (opts.y != null ? opts.y : 1);
    var fromY = (amp < 0 ? -1 : 1) * r.lineY;

    var tl = gsap.timeline();
    tl.set(els, { autoAlpha: 1 })
      .fromTo(lines, { yPercent: fromY }, {
        yPercent: 0,
        duration: opts.duration != null ? opts.duration : r.duration,
        stagger: opts.stagger != null ? opts.stagger : r.stagger,
        ease: opts.ease || r.ease,
        overwrite: "auto",
      }, 0);
    return tl;
  }

  /* schowanie: linie wracają pod maskę; sign=-1 → wyjście DO GÓRY */
  function hideText(targets, opts) {
    opts = opts || {};
    var r = cfg();
    var h = r.hide;
    var els = gsap.utils.toArray(targets);
    if (REDUCED_MOTION) return gsap.to(els, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });

    var lines = els.flatMap(ensureLines);
    return gsap.to(lines, {
      yPercent: (opts.sign != null ? opts.sign : 1) * r.lineY,
      duration: opts.duration != null ? opts.duration : h.duration,
      stagger: opts.stagger != null ? opts.stagger : h.stagger,
      ease: opts.ease || h.ease,
      overwrite: "auto",
    });
  }

  /* wpięcie pod scroll:
     - NIE-bidirectional → single-trigger (once): reveal przy wejściu i tyle.
     - bidirectional → DWA triggery:
         (1) reveal przy wejściu na `start` (domyślnie "top 75%") — feeling wejścia bez zmian,
         (2) CHOWANIE (reset) na osobnym markerze `hideStart` ("top bottom") przez onLeaveBack:
             odpala się DOPIERO gdy element cały zniknie z ekranu przy scrollu w górę
             (górna krawędź na dole viewportu) → hide NIEWIDOCZNY. Zjazd w dół = reveal od nowa.
       Rozdzielenie reveal/hide na dwa markery, bo w jednym triggerze onEnter i onLeaveBack
       dzielą ten sam punkt `start` — a chowanie ma być poza ekranem, nie w miejscu wejścia. */
  function revealOnScroll(trigger, targets, opts) {
    opts = opts || {};
    var r = cfg();
    var stReveal = ScrollTrigger.create({
      trigger: trigger,
      start: opts.start || r.start,
      once: !opts.bidirectional,
      onEnter: function () { revealText(targets, opts); },
    });
    if (opts.bidirectional) {
      ScrollTrigger.create({
        trigger: trigger,
        start: opts.hideStart || r.hideStart || "top bottom",
        onLeaveBack: function () { hideText(targets, opts); },
      });
    }
    return stReveal;
  }

  /* ---------- warstwa DEKLARATYWNA ----------
     Skanuje scope po data-reveal="" / "load" i sam podpina triggery.
     Elementy z nazwanym data-reveal (choreografie stron) POMIJA. */
  function initReveals(scope) {
    var root = scope || document;
    root.querySelectorAll("[data-reveal]").forEach(function (el) {
      var mode = el.getAttribute("data-reveal");
      if (mode !== "" && mode !== "load") return; // nazwane wartości = manualna choreografia strony

      var opts = {};
      if (el.hasAttribute("data-reveal-start")) opts.start = el.getAttribute("data-reveal-start");

      if (mode === "load") {
        revealText(el, opts);   // wjazd raz po load/loaderze (bez kierunku scrolla)
        return;
      }

      // gołe data-reveal = single-interaction in-view.
      // DOMYŚLNIE dwukierunkowy (re-fire) — opt-out: data-reveal-once.
      opts.bidirectional = !el.hasAttribute("data-reveal-once");
      revealOnScroll(el, el, opts);
    });
  }

  /* eksport: namespace + aliasy globalne (kompatybilność z prototypami) */
  var PPB = (window.PPB = window.PPB || {});
  PPB.reveal = {
    REDUCED_MOTION: REDUCED_MOTION,
    ensureLines: ensureLines,
    revealText: revealText,
    hideText: hideText,
    revealOnScroll: revealOnScroll,
    initReveals: initReveals,
  };
  window.REDUCED_MOTION = REDUCED_MOTION;
  window.ensureLines = ensureLines;
  window.revealText = revealText;
  window.hideText = hideText;
  window.revealOnScroll = revealOnScroll;
  window.initReveals = initReveals;
})();
