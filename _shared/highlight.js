/* ============================================================
   Polpharma Biologics — SYSTEM GLOBALNY #4: SCROLL HIGHLIGHT (_shared)
   „Tekst doświetlany scrollem": tekst stoi w miejscu, jest przygaszony,
   i rozjaśnia się jednostka po jednostce w rytm scrolla (scrub).
   Jedna implementacja + jeden config (PPB.config.highlight z gsap-config.js).

   TO NIE JEST system #1 (line-reveal). Różnica:
     #1 reveal    — tekst WJEŻDŻA spod maski, raz, z własnym easingiem.
     #4 highlight — tekst JUŻ JEST na ekranie i tylko zmienia intensywność,
                    sterowany bezpośrednio pozycją scrolla (scrub).
   Oba mogą działać na tym samym elemencie: najpierw wjeżdża (#1),
   potem doświetla się (#4). Kolejność w HTML: `data-reveal` + `data-highlight`.

   Stan początkowy daje CSS (styleguide.css):
     .hl-unit { opacity: var(--hl-from) }   ← zero FOUC, ta sama wartość co config

   API (globalne — shared singleton, ładowany raz per strona):
     initHighlights(scope?)        — warstwa DEKLARATYWNA (data-atrybuty, niżej)
     highlightOnScroll(el, opts)   — forma programowa dla choreografii sekcji
     ensureUnits(el, unit)         — podział + cache na elemencie

   TAKSONOMIA data-highlight:
     data-highlight=""       → słowo po słowie (domyślne)
     data-highlight="char"   → litera po literze (gęstszy, „ciekłe" przejście)
     data-highlight="word"   → jawnie słowa
     modyfikatory:
       data-highlight-start="top 70%"   (default: PPB.config.highlight.start)
       data-highlight-end="top 30%"     (default: PPB.config.highlight.end)

   Przykład (to wystarczy — reszta jedzie z configu):
     <h3 class="is-t-l is-text-deep-green" data-highlight>Our efficient operating…</h3>
     …i wywołanie initHighlights(scope) w script.js strony.

   Strojenie feelingu (globalnie, na wszystkich stronach):
     gsap-config.js → blok `highlight`. NIE strój tego per sekcja.

   ⚠️ Podział NISZCZY zagnieżdżone spany w treści (bierzemy czysty textContent).
   Jeśli tekst musi mieć <span>/<a> w środku — nie używaj tego systemu na nim.
   ============================================================ */

(function () {
  var PPB = (window.PPB = window.PPB || {});
  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cfg() {
    return (PPB.config && PPB.config.highlight) || {
      unit: "word", from: 0.22, start: "top 82%", end: "top 35%", ease: "none", stagger: 1,
    };
  }

  /* dzieli element na jednostki (raz) i zwraca tablicę spanów .hl-unit.
     Przy "char" litery są dodatkowo owinięte w .hl-word (nowrap), żeby
     łamanie wierszy dalej działało na wyrazach, a nie w środku słowa. */
  function ensureUnits(el, unit) {
    if (el._hlUnits) return el._hlUnits;
    unit = unit || cfg().unit || "word";

    var words = el.textContent.replace(/\s+/g, " ").trim().split(" ");
    el.textContent = "";
    var units = [];

    words.forEach(function (word, i) {
      if (unit === "char") {
        var wrap = document.createElement("span");
        wrap.className = "hl-word";
        word.split("").forEach(function (ch) {
          var u = document.createElement("span");
          u.className = "hl-unit";
          u.textContent = ch;
          wrap.appendChild(u);
          units.push(u);
        });
        el.appendChild(wrap);
      } else {
        var u2 = document.createElement("span");
        u2.className = "hl-unit";
        u2.textContent = word;
        el.appendChild(u2);
        units.push(u2);
      }
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });

    el._hlUnits = units;
    return units;
  }

  /* wpięcie pod scroll (scrub).
     opts:
       trigger  — element wyzwalacza (default: sam el)
       start/end— jak w ScrollTriggerze; end MOŻE być funkcją (choreografie
                  z pinem/sticky liczą go w px na żywo)
       unit     — "word" | "char"
       from     — opacity bazy (default z configu)
     zwraca timeline (ma .scrollTrigger) */
  function highlightOnScroll(el, opts) {
    opts = opts || {};
    var h = cfg();
    var units = ensureUnits(el, opts.unit || h.unit);

    if (REDUCED_MOTION) { gsap.set(units, { opacity: 1 }); return null; }

    return gsap.timeline({
      scrollTrigger: {
        trigger: opts.trigger || el,
        start: opts.start || h.start,
        end: opts.end || h.end,
        scrub: true,                 /* highlight ZAWSZE 1:1 ze scrollem, bez kisielu */
        invalidateOnRefresh: true,
      },
    }).fromTo(units,
      { opacity: opts.from != null ? opts.from : h.from },
      {
        opacity: 1,
        ease: opts.ease || h.ease || "none",
        stagger: { each: opts.stagger != null ? opts.stagger : h.stagger, from: "start" },
      }, 0);
  }

  /* ---------- warstwa DEKLARATYWNA ----------
     Skanuje scope po [data-highlight] i sam podpina scrub. */
  function initHighlights(scope) {
    var root = scope || document;
    root.querySelectorAll("[data-highlight]").forEach(function (el) {
      if (el._hlDone) return;
      el._hlDone = true;
      var mode = el.getAttribute("data-highlight");
      highlightOnScroll(el, {
        unit: mode === "char" ? "char" : "word",
        start: el.getAttribute("data-highlight-start") || undefined,
        end: el.getAttribute("data-highlight-end") || undefined,
      });
    });
  }

  /* eksport: namespace + aliasy globalne (spójnie z reveal.js) */
  PPB.highlight = {
    REDUCED_MOTION: REDUCED_MOTION,
    ensureUnits: ensureUnits,
    highlightOnScroll: highlightOnScroll,
    initHighlights: initHighlights,
  };
  window.ensureUnits = ensureUnits;
  window.highlightOnScroll = highlightOnScroll;
  window.initHighlights = initHighlights;
})();
