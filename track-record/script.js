/* ============================================================
   Polpharma Biologics — Track record (choreografia sekcji)

   OŚ CZASU SCROLLA:
   ┌ intro heading — przewija się normalnie i znika u góry
   │
   ├ [A] KOLOROWANIE startuje, gdy pasmo wjeżdża (colorStartPct)
   ├ [B] STICKY — pasmo przykleja się WYŚRODKOWANE w pionie
   │     (CSS `position: sticky`, `top: (100vh − pasmo)/2` — NIE pin GSAP-a);
   │     KOLOROWANIE TRWA DALEJ i kończy się dopiero
   │     colorHoldVh (=20vh) PO przyklejeniu.  ← tor jeszcze STOI
   ├ [C] HORIZONTAL — dopiero teraz tor jedzie w lewo. Jedzie CAŁY:
   │     kolumna tekstu („Our efficient operating…" + diament) jest
   │     pierwszą kolumną toru, więc wyjeżdża razem z kartami
   │     (zmiana 2026-07-27, decyzja Tomka). Koniec: prawy brzeg
   │     ostatniej karty zrównany z prawą krawędzią pasma.
   ├ [D] HOLD — sekcja jeszcze przez endHoldVh (=20vh) zostaje przyklejona
   └ odklejenie — strona leci dalej w dół normalnie

   ⚠️ DLACZEGO CSS `position: sticky`, a NIE `pin: true` GSAP-a (2026-07-26,
   zgłoszenie Tomka „widać lekki skok przy przyklejeniu"):
   pin GSAP-a przełącza element na `position: fixed` z JS-a, czyli o klatkę PO
   tym, jak scroll już się przesunął. `anticipatePin: 1` próbuje to nadrobić
   przyklejając WCZEŚNIEJ, proporcjonalnie do prędkości — i to właśnie było
   widać jako skok. Pomiar (wheel 120 px/klatkę, log per requestAnimationFrame):
     pin + anticipatePin:1  -> pasmo przyklejało się 100 px ZA WCZEŚNIE
     pin + anticipatePin:0  -> 0.39 px (ale ryzyko spóźnienia o klatkę)
     CSS sticky             -> 0.00 px
   Sticky liczy przeglądarka na wątku kompozytora — JS nie bierze w tym udziału,
   więc skok jest niemożliwy z definicji. Bonus: dobrze współpracuje z Lenisem
   i jest 1:1 przenaszalne do Webflow (position: sticky jest w Designerze).

   Struktura (patrz style.css):
   - `.track-record_sticky` = wrapper dający DŁUGOŚĆ scrolla (zastępuje
     GSAP-owy pin-spacer). Wysokość = pasmo + `--tr-scroll` (JS: `syncLength`).
   - `.track-record_band`   = element `position: sticky` + okno przycinające tor.
   - Sekcja NIE MOŻE mieć `overflow: clip/hidden` — sticky przestaje działać
     pod takim przodkiem.
   - ScrollTrigger niczego nie pinuje: tylko mierzy i scrubuje `x` toru.
     Trigger = wrapper, NIE pasmo (pozycja przyklejonego elementu kłamie
     przy refreshu).

   Implementacja: JEDEN scrubowany proxy (0→1); progres mapujemy ręcznie na
   piksele (holdIn | dist | holdOut). Dzięki temu wszystkie wartości liczą się
   NA ŻYWO (resize / invalidateOnRefresh) i nie trzeba przebudowywać timeline'u.

   Barba-ready (patrz _shared/smooth/BARBA-READY-CONTRACT.md):
   - cała logika w init(), owinięta w gsap.context(root) → destroy() = ctx.revert()
   - moduł, zero wycieków do globala; selektory scope'owane do root
   - kisiel scruba z PPB.config (gsap-config.js), nie hardcode
   Docelowo w Webflow: /pages/track-record.js

   ⚠️ KOLOROWANIE TEKSTU NIE JEST JUŻ LOKALNE (zmiana 2026-07-27, decyzja Tomka):
   to SYSTEM GLOBALNY #4 — `_shared/highlight.js` + `PPB.config.highlight`.
   Tu tylko podajemy własny `end` (choreografia), bo domyślny procentowy koniec
   nie ma sensu przy sticky. Chcesz ten efekt gdzie indziej? Wystarczy
   `data-highlight` na elemencie + `initHighlights(scope)`. Opis: _shared/README.md.

   Teksty jadą globalnym systemem #1 (line-reveal): `data-reveal` + initReveals().
   Dywizory między kolumnami ROSNĄ z góry do dołu przy wejściu sekcji w kadr,
   w tym samym rytmie/easingu co reveal (PPB.config.reveal) — `growDividers`.
   ============================================================ */
(function () {
  "use strict";

  var PPB = (window.PPB = window.PPB || {});
  PPB.pages = PPB.pages || {};

  var CONFIG = {
    /* [A] gdzie zaczyna się kolorowanie — górna krawędź pasma na X% viewportu */
    colorStartPct: 82,
    /* [B] ile vh PO przyklejeniu kolorowanie jeszcze trwa (tor stoi) */
    colorHoldVh: 20,
    /* [D] ile vh sekcja zostaje przyklejona PO dojechaniu toru do prawej */
    endHoldVh: 20,
    /* mnożnik czasu rośnięcia dywizorów względem globalnego reveala
       (Tomek 2026-07-27: „niech będzie trzy razy dłuższa") */
    dividerDurationMul: 3,
    /* ⚠️ przygaszenie bazy i gęstość jednostek highlightu NIE są tutaj —
       to config globalny: gsap-config.js → blok `highlight`. */
  };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx;

  function initTrackRecord(root) {
    var wrap = root.querySelector(".track-record_sticky");
    if (!wrap) return;
    var band    = wrap.querySelector(".track-record_band");
    var track   = wrap.querySelector(".track-record_track");
    var heading = wrap.querySelector("[data-highlight]");
    if (!band || !track || !heading) return;

    /* system #1, warstwa DEKLARATYWNA — intro (jedzie normalnym flow, więc
       in-view per element działa tu poprawnie). */
    if (window.initReveals) initReveals(root);

    if (reduced) { gsap.set(track, { x: 0 }); return; }

    var scrub = (PPB.config && PPB.config.scrubSmooth) || 1;

    /* --- miary liczone NA ŻYWO (żadnych zamrożonych pikseli) --- */
    var vh      = function () { return window.innerHeight; };
    var dist    = function () { return Math.max(0, track.scrollWidth - band.clientWidth); };
    /* górna krawędź pasma w viewporcie po przyklejeniu (pasmo wyśrodkowane) */
    var bandTop = function () { return Math.max(0, (vh() - band.offsetHeight) / 2); };
    var holdIn  = function () { return vh() * CONFIG.colorHoldVh / 100; };   /* [B] */
    var holdOut = function () { return vh() * CONFIG.endHoldVh  / 100; };    /* [D] */
    var total   = function () { return holdIn() + dist() + holdOut(); };
    /* długość scrolla sekcji -> wysokość wrappera (CSS: pasmo + --tr-scroll) */
    var syncLength = function () { wrap.style.setProperty("--tr-scroll", total() + "px"); };

    /* ============ [B][C][D] STICKY + poziomy przesuw CAŁEGO toru ============ */
    syncLength();
    var prox = { p: 0 };

    function applyTrack() {
      var a = holdIn(), d = dist();
      var px = prox.p * total();                    /* ile scrolla przejechaliśmy */
      var moved = Math.min(Math.max(px - a, 0), d); /* [B] stoi -> [C] jedzie -> [D] stoi */
      gsap.set(track, { x: -moved });
    }

    gsap.to(prox, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: wrap,                                             /* NIE pasmo */
        start: function () { return "top " + bandTop() + "px"; },  /* = moment przyklejenia */
        end: function () { return "+=" + total(); },
        scrub: scrub,
        invalidateOnRefresh: true,
        onRefreshInit: syncLength,     /* wysokość wrappera USTAWIONA PRZED pomiarem */
        onRefresh: applyTrack,
      },
      onUpdate: applyTrack,
    });

    /* ============ [A][B] HIGHLIGHT — system globalny #4 ============
       `data-highlight` na headingu; tu podajemy tylko trigger i zakres.
       Start przed przyklejeniem, KONIEC = przyklejenie + colorHoldVh.
       End liczymy ABSOLUTNIE ("+=" px), bo po przyklejeniu pasmo nie zmienia
       pozycji i procentowy end nie miałby sensu. Dystans scrolla od startu
       highlightu do przyklejenia:
         (colorStartPct% × vh) − bandTop
       (pasmo przykleja się bandTop px poniżej górnej krawędzi ekranu, nie na 0).
       Feeling (gęstość jednostek, przygaszenie bazy) = gsap-config.js. */
    var toStick = function () {
      return Math.max(0, vh() * CONFIG.colorStartPct / 100 - bandTop());
    };
    if (window.highlightOnScroll) {
      highlightOnScroll(heading, {
        trigger: wrap,
        start: "top " + CONFIG.colorStartPct + "%",
        end: function () { return "+=" + (toStick() + holdIn()); },
      });
    }

    /* ============ WEJŚCIE SEKCJI: teksty + dywizory ============
       Teksty w torze mają NAZWANE `data-reveal="track-record"`, więc
       `initReveals` je pomija (atrybut zostaje FOUC-guardem i nośnikiem
       splitu) — choreografię odpalamy TU, z jednego triggera.
       ⚠️ DLACZEGO nie gołe `data-reveal`: tor jedzie transformem, więc
       in-view per element przestaje być deterministyczny — karta 2 ma tekst
       przy dolnej krawędzi, karty 3+ czekają poza kadrem w poziomie.
       Jeden trigger = wszystko wchodzi tą samą ręką i w tym samym momencie.

       Dywizory (pionowe kreski) ROSNĄ z góry do dołu w tym samym rytmie —
       skala Y 0→1 przez `--tr-div`, bo pseudo-elementu nie da się targetować
       bezpośrednio. Easing/duration/stagger = GLOBALNY reveal, żeby to była
       ta sama „ręka" co teksty, a nie osobny efekt do strojenia. */
    var r = (PPB.config && PPB.config.reveal) || {};
    var trackTexts = wrap.querySelectorAll('[data-reveal="track-record"]');
    var divCols    = wrap.querySelectorAll(".track-record_col + .track-record_col");
    var trim       = wrap.querySelectorAll(".track-record_dates, .track-record_diamond");

    gsap.set(trim, { autoAlpha: 0, y: 12 });

    ScrollTrigger.create({
      trigger: wrap,
      start: r.start || "top 75%",
      once: true,
      onEnter: function () {
        if (trackTexts.length && window.revealText) revealText(trackTexts);
        gsap.to(divCols, {
          "--tr-div": 1,
          /* 3× dłużej niż globalny reveal — kreska ma rosnąć spokojniej niż
             wjeżdża tekst. Easing i stagger dalej z configu (ta sama „ręka"). */
          duration: (r.duration != null ? r.duration : 1) * CONFIG.dividerDurationMul,
          ease: r.ease || "expo.out",
          stagger: r.stagger != null ? r.stagger : 0.1,
        });
        /* ozdoby (daty, diament) — ten sam easing, bez własnego strojenia */
        gsap.to(trim, {
          autoAlpha: 1, y: 0,
          duration: r.duration != null ? r.duration : 1,
          ease: r.ease || "expo.out",
          stagger: r.stagger != null ? r.stagger : 0.1,
        });
      },
    });

  }

  /* ---- kontrakt Barba: init() / destroy() ---- */
  function init(opts) {
    var root = (opts && opts.container) ||
               document.querySelector('[data-barba-namespace]') || document;
    ctx = gsap.context(function () { initTrackRecord(root); }, root);
  }
  function destroy() { if (ctx) { ctx.revert(); ctx = null; } }

  PPB.pages.trackRecord = { init: init, destroy: destroy };

  /* standalone prototyp (poza harnessem Barba) — sam się odpala */
  if (!window.__PPB_BARBA__) {
    var boot = function () { init(); if (window.ScrollTrigger) ScrollTrigger.refresh(); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
    /* zdjęcia zmieniają wysokość/szerokość toru po doczytaniu → przelicz */
    window.addEventListener("load", function () {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }
})();
