/* ============================================================
   Polpharma Biologics — ABOUT US prototype
   BEZ loadera (decyzja 2026-07-21): hero reveal gra od razu po load.
   hero (Figma 4473:7766) → unicorn (100vw, h auto) → journey:
   parallax obrazków + text swap (diament rotate) → overlap Purpose
   Systemy globalne 1:1 z home: line-reveal (#1), nav mask (#2).
   Docelowo: /core/gsap-config.js + /pages/about.js
   ============================================================ */

gsap.registerPlugin(ScrollTrigger, SplitText);

/* po refreshu strona ZAWSZE ładuje się na górze */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);


/* ============================================================
   MODUŁ STRONY — kontrakt Barba (_shared/smooth/BARBA-READY-CONTRACT.md)
   Cały plik żyje w IIFE: zero wycieków do globala. Dwie strony siedzą
   chwilę w pamięci naraz, a home i about miały OBIE globalne `const CONFIG`
   i `buildHeroReveal` — w globalu to SyntaxError i strona nie wstaje.
   Eksport: PPB.pages.about = { init({first, container}), destroy() }.
   ============================================================ */
(function () {
  var PPB = (window.PPB = window.PPB || {});
  PPB.pages = PPB.pages || {};

  /* ---------- scope zapytań DOM ----------
     PAGE_ROOT = kontener Barby tej strony. Elementy SITE-LEVEL (nav, maska,
     loader, svg-defs, mobilne menu) leżą POZA kontenerem i nie są podmieniane
     przy nawigacji — dla nich pytamy `document`. Reszta idzie przez kontener,
     żeby nigdy nie złapać DOM-u strony wychodzącej. */
  var PAGE_ROOT = document;
  var SITE_SEL = /(^|[\s,>])(\.loader_|\.nav_|\.nav-mask_|\.nav-mobile|\.svg-defs|#bottleMatch)/;
  function scopeFor(sel) { return SITE_SEL.test(sel) ? document : PAGE_ROOT; }
  function q(sel) { return scopeFor(sel).querySelector(sel); }
  function qa(sel) { return scopeFor(sel).querySelectorAll(sel); }

  /* ---------- rejestr sprzątania ----------
     gsap.context() zbiera tweeny i ScrollTriggery, ale NIE listenery okna ani
     ScrollTriggera. Bez tego rejestru każda nawigacja dokładałaby komplet
     handlerów resize/refresh, które przy kolejnym wejściu liczyłyby geometrię
     martwych już elementów. */
  var CLEANUP = [];
  function onWin(type, fn, opts) {
    window.addEventListener(type, fn, opts);
    CLEANUP.push(function () { window.removeEventListener(type, fn, opts); });
  }
  function onST(type, fn) {
    ScrollTrigger.addEventListener(type, fn);
    CLEANUP.push(function () { ScrollTrigger.removeEventListener(type, fn); });
  }
  function onTimer(id) { CLEANUP.push(function () { clearTimeout(id); }); }

  /* elementy UI reveala rozjeżdżają się na dwa światy: nav jest site-level,
     "Get in touch" i strzałka siedzą w kontenerze. Selektor-string w
     gsap.context() jest scope'owany do kontenera, więc NIE złapałby nava.

     NAV NIE MRUGA (2026-07-28, decyzja Tomka: „nav bar nigdy nie znika ani nie
     glitchuje"). Nav dołącza do reveala TYLKO przy świeżym dokumencie, kiedy
     FOUC guard `[data-reveal]{opacity:0}` faktycznie go chowa. Przy nawigacji
     Barbą nav jest już na ekranie — animowanie go od autoAlpha 0 zgasiłoby go
     na moment, i to na oczach użytkownika, bo zasłona leży POD navem. */
  var IS_FIRST = true;
  function uiRevealTargets() {
    var inPage = Array.prototype.slice.call(PAGE_ROOT.querySelectorAll('[data-reveal="ui"]'));
    if (!IS_FIRST) return inPage;
    return Array.prototype.slice
      .call(document.querySelectorAll('.nav_component[data-reveal="ui"]'))
      .concat(inPage);
  }
/* ---------- CONFIG — całe strojenie tutaj ---------- */
const CONFIG = {
  ease: {
    main: "power3.inOut",
    expand: "power4.inOut",
    out: "power2.out",
  },

  /* SYSTEM GLOBALNY #1 (line-reveal) config → PPB.config.reveal
     (_shared/gsap-config.js). Tu NIE duplikujemy — strojenie efektu tekstu
     jest globalne. Odwołania: window.PPB.config.reveal. */

  heroReveal: {
    uiBlur: 12,       // nav + Get in touch: blur-in zsynchronizowany z tekstem
  },

  /* ===== INTRO NA LOAD — KILKA WARIANTÓW (nic nie tracimy) =====
     Wszystkie wersje żyją równolegle; wybór = intro.variant. Każdy wariant
     ma własny podzestaw knobów. Runnery: runIntro_<variant>() w sekcji MASTER. */
  intro: {
    variant: "scroll-reveal",   // [KNOB] "scroll-reveal" | "brackets-fade" | "hero-collapse"

    /* WSPÓLNE: rozchodzenie się nawiasów (ghost-rows nad/pod tekstem) */
    brackets: {                 // animacja jak home key-pillars-intro (scaleX od brzegów)
      duration: 1.6,            // [KNOB] czas rozrostu nawiasów (s) — home: spread 1.6
      ease: "power3.out",       // [KNOB] home: power3.out
    },

    /* --- WARIANT C: "scroll-reveal" (AKTUALNY, nowa struktura) ---
       Hero = warstwa 100vh NAD unicornem (pinowanym full-screen za nią). Na LOAD
       tylko wejście: nawiasy → nav + text (unicorn stoi za hero). Odsłanianie
       unicorna robi SCROLL (hero odjeżdża), shrink startuje na hero "bottom top". */
    scrollReveal: {
      sequenceAt: 0,            // [KNOB] start nav+text względem KOŃCA nawiasów (s)
      unicorn: {                // unicorn pojawia się na LOAD: fade-in (opacity 0→1) + scale 1.1→1
        delay: 0.02,            // [KNOB] opóźnienie startu fade (s) — tło #043030 błyska zanim scena wejdzie
        fadeDuration: 1.0,      // [KNOB] czas fade-in (s)
        fadeEase: "sine.in",    // [KNOB] delikatny początek (wolniejszy start)
        scaleFrom: 1.1,         // scale 1.1 → 1
      },
    },

    /* --- WARIANT A: "brackets-fade" ---
       Nawiasy się rozchodzą; RÓWNOLEGLE od startu fade-in unicorna (w miejscu);
       po nawiasach (± sequenceAt) wchodzą nav reveal + text reveal. */
    bracketsFade: {
      sequenceAt: 0,            // [KNOB] start nav+text względem KOŃCA nawiasów (s): 0=zaraz, <0 zachodzi, >0 przerwa
      unicorn: {
        fadeDuration: 1.0,      // [KNOB] fade-in unicorna (s)
        fadeEase: "power2.out", // [KNOB]
        scaleFrom: 1.1,         // scale 1.1 → 1
      },
    },

    /* --- WARIANT B: "hero-collapse" ---
       Hero na full-screen (100vh) ZMNIEJSZA się do naturalnej wysokości i odsłania
       full-screen unicorn niżej. WSZYSTKO RÓWNOLEGLE od startu: hero collapse +
       unicorn fade (opacity SZYBKO / scale WOLNO) + nawiasy + text + navbar. */
    heroCollapse: {
      collapseDuration: 1.2,    // [KNOB] ile trwa zmniejszanie hero z 100vh do docelowej (s)
      collapseEase: "power3.inOut", // [KNOB]
      sequenceAt: 0,            // [KNOB] start nav + text reveal względem KOŃCA nawiasów (s): 0=zaraz, <0 zachodzi, >0 przerwa. (hero collapse + unicorn fade lecą od startu, niezależnie)
      unicorn: {
        opacityDuration: 0.6,   // [KNOB] szybki fade opacity 0→1 (s)
        opacityEase: "power2.out", // [KNOB]
        scaleFrom: 1.1,         // scale 1.1 → 1
        scaleDuration: 2.0,     // [KNOB] scale trwa dłużej niż opacity (s)
        scaleEase: "power2.out", // [KNOB]
      },
    },
  },

  // "kisiel": smoothing scruba journey
  scrubSmooth: 1.2,

  /* ===== JOURNEY (sticky stage, wzorzec We-know) =====
     Oś scruba w vh scrolla za "top top"; sekcja = (1 + pin + overlap)×100vh.
     Ostatnie overlapViewports×100vh = najazd Purpose (margin-top -100vh w CSS —
     SYNC!); w tym oknie timeline ma pusty ogon, gra osobny trigger overlapu. */
  journey: {
    /* (parallax hero/unicorn wyłączony „na razie" — hero i unicorn jedno pod drugim) */
    /* po dojściu do 0: KRÓTKI STICKY HOLD unicorna (pełny ekran, static) zanim ruszy shrink */
    stickyHoldVh: 5,          // [KNOB] vh sticky unicorna (stoi w miejscu) po dojściu do góry, przed shrinkiem
    showMomentIndicator: true, // [DEV] mały wskaźnik „momentu" na osi (liczony od startu exitu unicorna) — do referencji timingów
    pinViewports: 2.5,        // aktywna część (exit unicorna) — KRÓTSZA (sekcja krótsza)
    overlapViewports: 1.0,    // najazd Purpose (SYNC z margin-top -100vh w CSS!)

    /* unicorn: sticky u góry → shrink na scrubie ze ZMIANĄ RATIO do 332×432;
       scena w środku na COVER (utnie się). Poziomo: od lewej + ruch w prawo
       (ląduje 20% od lewej). Pionowo: kotwica GÓRA (zmniejsza się do góry). */
    unicorn: {
      len: 100,               // vh scrolla na pełny shrink
      targetW: 332,           // px — końcowe proporcje 332×432
      targetH: 432,
      xVw: 20,                // lądowanie: lewa krawędź 20% od lewej
      exitToVh: -120,         // parallax w górę — START w punkcie sync (koniec shrinku == tekst w centrum, oba na unicorn.len); okno: ten próg → koniec aktywnej osi
      introYPercent: -20,     // WEJŚCIE: start -20% → 0 gdy unicorn dotyka góry (wychodzi spod tekstu hero)
    },

    /* teksty stanów: reveal stanu 1 + swap na 2 (single-triggery, dwukierunkowe) */
    textIn: 55,               // vh — wcześniej o ~25vh (feedback Tomka; było 80)
    textCenterVh: 50,         // vh — środek headingu stanu 1 po settlingu (JS liczy z tego linię diamentu)
    textRise: { fromPercent: 45 },  // [KNOB] „From Zug" +45% niżej → 0 (centrum), LINEAR, pełny move (koniec ZSYNC z końcem shrinku)
    /* HOLD po shrinku: unicorn zeskalowany + tekst „From Zug" w centrum → przytrzymanie,
       potem dopiero exit unicorna + obrazki. Przesuwa exit/obrazki/swap o tę wartość. */
    postShrinkHoldVh: 5,      // [KNOB] vh holdu po shrinku (przed exitem/obrazkami)
    swapAt: 200,              // vh — podmiana 1 → 2 = POJAWIENIE się abstract (enter 200 = moment 100); +hold doliczany w kodzie
    purposeEnterMoment: 250,  // [KNOB] moment (od startu exitu) w którym zaczyna wjeżdżać Purpose — oś doklejana do tego

    /* wejście diamentu (razem z tekstem, próg textIn, dwukierunkowo):
       opacity 0 / scale 0.7 / rotate −180 (w lewo) → 1 / 1 / 0 */
    diamondIn: {
      fromScale: 0.7,
      fromRotate: -180,
      duration: 1,
      ease: "expo.out",       // spójnie z globalnym revealem
    },

    /* obrazki (parallax): RÓŻNE prędkości (len); kolejność/pozycje wg feedbacku:
       city później → vials (lewa krawędź) jeszcze później → abstract (prawa;
       jego pojawienie = SWAP) → scientist (lewa 15%, ~80px pod abstract:
       TA SAMA prędkość co abstract + enter o ~36 vh później = stały odstęp
       wysokość abstract 26vh + ~10vh≈80px) → hand */
    imageFromY: 100,          // [KNOB] START y KONTENERA (vh, tuż pod ekranem = moment ENTER)
    imageToY: -100,           // [KNOB] fallback KONIEC y (vh); DOMYŚLNIE (bez per-obraz toY) end = zniknięcie u góry (−wysokość kontenera)
    imageInnerShiftPercent: 9,// [KNOB] paralaks WEWNĄTRZ obrazu: inner zjeżdża 0→~10% w dół (obraz = 110% wys. kontenera)
    imageBaseTraverseVh: 180, // [KNOB] bazowy czas przelotu (dla speed 1); len obrazka = base / speed
    /* Obrazki wchodzą OD MOMENTU EXITU unicorna. Każdy: enter (start; stagger < len =
       OVERLAP z poprzednim) + speed (mnożnik prędkości: >1 szybciej / <1 wolniej;
       len = base / speed). Opcjonalnie per-obraz fromY/toY/len (override). */
    /* enter/len wg momentów z Tomka (moment = od startu exitu; enter = moment+100, len = koniec−start): */
    images: [
      { sel: ".is-img-city",      enter: 100, len: 200 },  // moment 0 → 200
      { sel: ".is-img-vials",     enter: 150, len: 180 },  // moment 50 → 230
      { sel: ".is-img-abstract",  enter: 200, len: 200 },  // moment 100 → 300; SWAP tekstu na jego enter
      { sel: ".is-img-hand",      enter: 250, len: 220 },  // moment 150 → 370
    ],
  },

  /* overlap Purpose: obrazki zwalniają (lekki drift do góry) + czarny overlay */
  overlap: {
    imagesShiftVh: -12,       // [KNOB] drift obrazków w górę podczas overlapu Purpose
    textShiftVh: -8,          // [KNOB] drift tekstu journey w górę (mniejszy — chowa się pod Purpose)
    overlayMax: 0.6,
  },

  /* swap tekstów = system #3 (_shared/swap.js) — efekt reveal/hide WSPÓLNY,
     strojony globalnie (PPB.config.reveal). Ozdoba diamentu = też ze SHARED
     (PPB.config.swapFx.diamond — jedno źródło dla About i We-know). */
  swapFx: PPB.config.swapFx,
};

/* ============================================================
   SYSTEM GLOBALNY #1 — LINE-REVEAL → _shared/reveal.js
   revealText / hideText / revealOnScroll / ensureLines / REDUCED_MOTION
   są globalne (ładowane raz z warstwy shared, config z PPB.config.reveal).
   Tu już NIE definiujemy ich lokalnie — jedna implementacja na projekt,
   zmiany animacji tekstu wchodzą globalnie (decyzja Tomka 2026-07-22).
   ============================================================ */

/* ---------- scroll lock (na czas intro unicorna) — BEZ JUMPA ----------
   NIE używamy overflow:hidden — to chowa scrollbar → strona rozszerza się
   o jego szerokość → poziomy "jump". Zamiast tego blokujemy INPUT scrolla
   (wheel/touch/klawisze) i pinujemy pozycję na 0. Layout nietknięty,
   scrollbar zostaje widoczny. */
const scrollLock = (() => {
  const NAV_KEYS = new Set([
    "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar",
  ]);
  const stop = (e) => e.preventDefault();
  const stopKeys = (e) => { if (NAV_KEYS.has(e.key)) e.preventDefault(); };
  const pin = () => window.scrollTo(0, 0);
  const wheelOpts = { passive: false };
  return {
    lock() {
      // Lenis obecny → używamy jego stop (spójne ze smooth scrollem); inaczej lock zdarzeniowy
      if (window.PPB_LENIS) { window.PPB_LENIS.stop(); return; }
      window.scrollTo(0, 0);
      window.addEventListener("wheel", stop, wheelOpts);
      window.addEventListener("touchmove", stop, wheelOpts);
      window.addEventListener("keydown", stopKeys, wheelOpts);
      window.addEventListener("scroll", pin, { passive: true });
    },
    unlock() {
      if (window.PPB_LENIS) { window.PPB_LENIS.start(); return; }
      window.removeEventListener("wheel", stop, wheelOpts);
      window.removeEventListener("touchmove", stop, wheelOpts);
      window.removeEventListener("keydown", stopKeys, wheelOpts);
      window.removeEventListener("scroll", pin, { passive: true });
    },
  };
})();

/* ============================================================
   INTRO UNICORNA (na load): pełny viewport + scale 1.1 →
   zsuwa się na swoje miejsce (pod hero) + scale 1.
   Offset mierzony z realnej pozycji PO inicie triggerów (uwzględnia
   yPercent -20 z intro-parallaxu). Kanał y wolny do progu textIn.
   ============================================================ */
/* NAWIASY — animacja JAK w home „key-pillars-intro": segmenty (ghost-cardy)
   rosną POZIOMO `scaleX 0→1` od ZEWNĘTRZNYCH krawędzi do środka (lewa karta
   origin left, prawa origin right → spotykają się na szwie). */
function buildBracketSpread() {
  const b = CONFIG.intro.brackets;
  const cards = qa(".about-hero_ghost-card");
  qa(".about-hero_ghost-row").forEach((row) => {
    const cs = row.querySelectorAll(".about-hero_ghost-card");
    gsap.set(cs[0], { transformOrigin: "left center" });   // lewa karta rośnie od lewej
    gsap.set(cs[1], { transformOrigin: "right center" });  // prawa karta rośnie od prawej
  });
  return gsap.fromTo(cards,
    { scaleX: 0 },
    { scaleX: 1, duration: b.duration, ease: b.ease });
}

/* [wariant A] UNICORN fade-in: stoi w miejscu, autoAlpha 0→1 + scale 1.1→1
   jednym tweenem. Kanał scale/opacity nie koliduje ze shrinkiem journey. */
function buildUnicornFade() {
  const u = CONFIG.intro.bracketsFade.unicorn;
  const unicorn = q(".about-journey_unicorn");
  return gsap.fromTo(unicorn,
    { autoAlpha: 0, scale: u.scaleFrom },
    { autoAlpha: 1, scale: 1, duration: u.fadeDuration, ease: u.fadeEase });
}

/* [wariant B] UNICORN fade-in ROZDZIELONY: opacity SZYBKO, scale WOLNO
   (dwa tweeny na tym samym elemencie, różne kanały, oba od 0). */
function buildUnicornFadeSlow() {
  const u = CONFIG.intro.heroCollapse.unicorn;
  const unicorn = q(".about-journey_unicorn");
  return gsap.timeline()
    .fromTo(unicorn, { autoAlpha: 0 }, { autoAlpha: 1, duration: u.opacityDuration, ease: u.opacityEase }, 0)
    .fromTo(unicorn, { scale: u.scaleFrom }, { scale: 1, duration: u.scaleDuration, ease: u.scaleEase }, 0);
}

/* [wariant B] HERO COLLAPSE: sekcja hero startuje na 100vh (zakrywa strefę nad
   unicornem) i zmniejsza się do swojej NATURALNEJ wysokości → odsłania unicorn
   niżej (flow: journey jedzie w górę do kadru). Naturalną wysokość mierzymy
   PRZED ustawieniem 100vh; po animacji clearProps → wraca do auto. */
function buildHeroCollapse() {
  const hc = CONFIG.intro.heroCollapse;
  const hero = q(".is-about-hero");
  const natural = hero.getBoundingClientRect().height;   // docelowa (naturalna) wysokość — mierz zanim ustawimy 100vh
  return gsap.fromTo(hero,
    { height: window.innerHeight },
    {
      height: natural,
      duration: hc.collapseDuration,
      ease: hc.collapseEase,
      onComplete: () => gsap.set(hero, { clearProps: "height" }),  // wróć do auto (naturalna)
    });
}

/* ============================================================
   HERO — reveal od razu po load (bez loadera)
   ============================================================ */
function buildHeroReveal() {
  const h = CONFIG.heroReveal;
  const tl = gsap.timeline();   // pozycję w sekwencji ustawia master (po nawiasach)

  // globalny line-reveal: heading → subtitle
  tl.add(revealText([".about-hero_heading", ".about-hero_subtitle"]));

  /* UI (nav + Get in touch): blur-in 1:1 z pierwszym tekstem.
     clearProps filter po animacji OBOWIĄZKOWE (backdrop-root!)
     BARBA: nav jest site-level (poza kontenerem), więc selektor-string
     scope'owany przez gsap.context() by go nie złapał — jawna lista. */
  tl.fromTo(
    uiRevealTargets(),
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      duration: PPB.config.reveal.duration,
      ease: PPB.config.reveal.ease,
    },
    "<"
  );

  return tl;
}

/* ============================================================
   JOURNEY — sticky stage: parallax obrazków + text swap
   ============================================================ */
function initJourney() {
  const c = CONFIG.journey;
  const section = q(".is-about-journey");
  const unicorn = section.querySelector(".about-journey_unicorn");
  const unicornInner = section.querySelector(".about-journey_unicorn-inner");
  const textWrap = section.querySelector(".about-journey_text-wrap");
  const diamond = section.querySelector(".about-journey_diamond");
  const state1 = section.querySelectorAll('[data-reveal="journey-1"]');
  const state2 = section.querySelectorAll('[data-reveal="journey-2"]');

  /* wysokość sekcji ustawiana PO zbudowaniu tl (z REALNEJ długości osi = tl.duration())
     → scrub 1:1 z scrollem, ZERO martwego ogona. Tu tylko referencje dla exitu. */
  const holdVh = c.postShrinkHoldVh || 0;                 // hold po shrinku (unicorn + tekst w centrum)
  const activeVh = c.pinViewports * 100 + holdVh;         // koniec exitu unicorna (obrazki mogą jechać dłużej)

  const heroSection = q(".is-about-hero");
  const vh = (n) => (window.innerHeight * n) / 100;

  /* unicorn PO PROSTU POD SPODEM — bez transformu początkowego (usunięty reveal parallax);
     wjeżdża od dołu naturalnym scrollem, potem pinuje się i shrink. */

  /* BEZ parallaxu hero/unicorna (decyzja Tomka „na razie"): hero i unicorn po prostu
     jedno pod drugim, naturalny scroll. Unicorn dochodzi do góry, pinuje się,
     stickyHoldVh (5) unicorn stoi, potem shrink. */

  /* split UPFRONT (jak We-know na home) — referencje nie mogą stale'ować */
  [...state1, ...state2].forEach(ensureLines);

  /* ---- POZYCJE DIAMENTU = środek slotu KAŻDEGO stanu ----
     Każdy stan wyśrodkowany osobno (flex center) → diament ma INNY Y dla stanu 1 i 2
     (bo różne wysokości heading/caption). Mierzymy środek slotu każdego stanu
     względem góry text-wrap; przy swapie diament jedzie transformem Y między nimi. */
  const stateEl1 = section.querySelector(".about-journey_state.is-state-1");
  const stateEl2 = section.querySelector(".about-journey_state.is-state-2");
  const slot1 = stateEl1.querySelector(".about-journey_diamond-slot");
  const slot2 = stateEl2.querySelector(".about-journey_diamond-slot");
  function slotY(slot) {
    const wr = textWrap.getBoundingClientRect();
    const sr = slot.getBoundingClientRect();
    return sr.top + sr.height / 2 - wr.top;   // środek slotu względem góry text-wrap
  }
  /* offset navbara: tekst centrujemy PONIŻEJ nava. --nav-offset (padding-top stanów) =
     dolna krawędź WIDOCZNEGO nava = bottom − padding-bottom (padding jest niewidoczny,
     ale zawyżałby wysokość). Liczone z żywego nava, więc responsywne. */
  const navEl = q(".nav_component:not(.is-dark)");
  function applyNavOffset() {
    if (!navEl) return;
    const r = navEl.getBoundingClientRect();
    const padB = parseFloat(getComputedStyle(navEl).paddingBottom) || 0;
    textWrap.style.setProperty("--nav-offset", `${Math.max(0, r.bottom - padB).toFixed(1)}px`);
  }
  applyNavOffset();
  let diaY1 = slotY(slot1), diaY2 = slotY(slot2);

  /* progi w onUpdate liczone z REALNEJ długości timeline (tl.duration()), nie totalVh —
     bo self.progress mapuje się na tl.duration() (obrazki wydłużają oś). Przypisane
     PO dodaniu wszystkich tweenów (na dole initJourney). */
  let textInAt = 1, swapAt = 1;   // init 1 (nie 0!) → zero przedwczesnego odpalenia przy refreshu; realne wartości niżej

  const f = CONFIG.swapFx;
  const d = c.diamondIn;

  /* diament: stan startowy — Y na slocie stanu 1 (yPercent -50 = centrowanie na tym Y).
     Wejście: fromTo scale/rotate/opacity (rotation ląduje na 0). Y rusza dopiero swap. */
  gsap.set(diamond, { xPercent: -50, yPercent: -50, y: diaY1, autoAlpha: 0, scale: d.fromScale, rotation: d.fromRotate });

  /* przelicz offset nava + Y slotów (fonty, resize wysokości — bo strona reloaduje
     się tylko przy zmianie SZEROKOŚCI; wysokość musimy przeliczyć sami). */
  function measureDiamond() {
    applyNavOffset();
    diaY1 = slotY(slot1); diaY2 = slotY(slot2);
    gsap.set(diamond, { y: diamondRotated ? diaY2 : diaY1 });
  }
  if (document.fonts?.ready) document.fonts.ready.then(measureDiamond);
  window.addEventListener("resize", measureDiamond);   // reaguje na zmianę wysokości (diament + gap się dostosowują)

  function showDiamond() {
    gsap.fromTo(diamond,
      { autoAlpha: 0, scale: d.fromScale, rotation: d.fromRotate },
      { autoAlpha: 1, scale: 1, rotation: 0, duration: d.duration, ease: d.ease, overwrite: "auto" });
  }
  function hideDiamond() {
    gsap.to(diamond, {
      autoAlpha: 0, scale: d.fromScale, rotation: d.fromRotate,
      duration: PPB.config.reveal.hide.duration, ease: PPB.config.reveal.hide.ease, overwrite: "auto",
    });
  }
  /* SWAP diamentu — RAZEM z podmianą tekstu: jedzie transformem Y do slotu drugiego
     stanu (tam gdzie diament wypada w wyśrodkowanym stanie 2) + rotate ±90°.
     +1 = 1→2 (Y→slot2, +90°), −1 = powrót (Y→slot1, −90°). */
  function swapDiamond(dir) {
    gsap.to(diamond, {
      y: dir > 0 ? diaY2 : diaY1,
      rotation: `${dir > 0 ? "+" : "-"}=${f.diamond.angle}`,
      duration: f.diamond.duration, ease: f.diamond.ease, overwrite: "auto",
    });
  }

  /* ---- TEKST = SYSTEM GLOBALNY #3: SWAP-IN-PLACE (_shared/swap.js) ----
     Wyśrodkowany tekst STOI w miejscu, treść podmienia się na scroll. Każdy
     stan WCHODZI przez revealText / WYCHODZI przez hideText = ten sam WSPÓLNY
     efekt (PPB.config.reveal), zgodnie z globalną zasadą systemu #3
     (README "Reveal & swap", animations-spec system #3). ZERO bespoke opts —
     strojenie efektu tekstu jest wyłącznie globalne.
     Sterowanie progressem: start:-1 → poniżej textIn nic; ≥textIn stan1;
     ≥swap stan2 (fromProgress w onUpdate). Diament = osobna ozdoba obok. */
  const textSwap = createSwap({
    states: [{ targets: state1 }, { targets: state2 }],
    start: -1,
  });

  /* tracking ozdób diamentu (tekst śledzi już createSwap) */
  let diamondShown = false;
  let diamondRotated = false;

  /* ---- WEJŚCIE unicorna (PRZED pinem): yPercent -20 → 0 na scrubie 1:1,
     zgrane z dojazdem sekcji do góry — unicorn "wychodzi spod" tekstu hero.
     Kanał yPercent ≠ y (exit parallax) ≠ width/height/x (shrink) — zero konfliktów. ----
     NA RAZIE WYŁĄCZONE (decyzja Tomka): bez ruchu unicorna w dół na scroll.
     Unicorn stoi na yPercent:0 (pozycja z końca intro). Przywrócić = odkomentować.
  gsap.fromTo(unicorn,
    { yPercent: c.unicorn.introYPercent },
    {
      yPercent: 0,
      ease: "none",
      scrollTrigger: { trigger: section, start: "top bottom", end: "top top", scrub: true },
    });
  */

  /* DEV: wskaźnik „momentu" — pozycja na osi liczona OD startu exitu unicorna
     (0 = unicorn zeskalowany do min i zaczyna iść w górę). Do referencji timingów. */
  const exitStartAxis = c.unicorn.len + holdVh;
  let momentEl = null;
  if (c.showMomentIndicator) {
    momentEl = document.createElement("div");
    momentEl.className = "journey-moment-indicator";
    momentEl.textContent = "moment: —";
    document.body.appendChild(momentEl);
  }

  /* SHRINK/journey scrub startuje DOPIERO gdy journey dojdzie do góry (TOP TOP)
     — czyli unicorn full-screen zapinowany. Start liczbowy (px) = pozycja
     journey w dokumencie + stickyHold (krótkie przytrzymanie). Do tego progu
     unicorn wjeżdża od dołu (progress 0, bez shrinku). Koniec = dół journey. */
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: () => (section.getBoundingClientRect().top + window.scrollY)   // journey top (= top top)
        + (window.innerHeight * c.stickyHoldVh / 100),                       // + hold (0 = dokładnie top top)
      end: "bottom bottom",
      scrub: CONFIG.scrubSmooth,
      onUpdate: (self) => {
        const p = self.progress;
        // TEKST: swap-in-place (system #3) — wspólny efekt reveal/hide (global config)
        textSwap.fromProgress(p, [textInAt, swapAt], true);
        // DIAMENT (ozdoba wspólna): pojawia się na textIn, rotate na swap — dwukierunkowo
        if (p >= textInAt && !diamondShown) { diamondShown = true; showDiamond(); }
        else if (p < textInAt && diamondShown) { diamondShown = false; hideDiamond(); }
        if (p >= swapAt && !diamondRotated) { diamondRotated = true; swapDiamond(1); }
        else if (p < swapAt && diamondRotated) { diamondRotated = false; swapDiamond(-1); }
        // DEV: moment na osi liczony od startu exitu unicorna
        if (momentEl) momentEl.textContent = "moment: " + Math.round(p * self.animation.duration() - exitStartAxis);
      },
    },
  });

  /* ---- unicorn: shrink ze ZMIANĄ RATIO (100vw×100vh → 332×432) ----
     Wrapper (overflow clip, kotwica top-left) animuje width/height + x;
     scena (inner, stałe 100vw×100vh) centrowana i COUNTER-SCALOWANA na
     COVER: s = max(w/vw, h/vh) → wypełnia okno, boki się utną.
     Pionowo top stoi (zmniejsza się DO GÓRY), poziomo idzie w prawo do xVw. */
  const u = c.unicorn;
  const dims = { w: window.innerWidth, h: window.innerHeight, x: 0 };
  function applyUnicorn() {
    unicorn.style.width = `${dims.w.toFixed(1)}px`;
    unicorn.style.height = `${dims.h.toFixed(1)}px`;
    const s = Math.max(dims.w / window.innerWidth, dims.h / window.innerHeight);
    gsap.set(unicorn, { x: dims.x });
    gsap.set(unicornInner, { xPercent: -50, yPercent: -50, scale: s });
  }
  applyUnicorn();
  tl.to(dims, {
    w: u.targetW,
    h: u.targetH,
    x: () => (window.innerWidth * u.xVw) / 100,
    ease: "none",
    duration: u.len,
    onUpdate: applyUnicorn,
  }, 0);

  /* textRise WYŁĄCZONY (decyzja Tomka): „From Zug…" pojawia się OD RAZU na środku
     (bez transformu Y wrappera). Wchodzi tylko line-revealem (system #1) na progu textIn. */

  /* ---- unicorn: idzie w górę (parallax exit) DOPIERO gdy skończy się shrink
     (unicorn.len) — tekst jest już wyśrodkowany (bez textRise).
     Do tego progu unicorn STOI przypięty do góry w docelowym małym rozmiarze;
     potem jedzie w górę do końca osi (a obrazki wchodzą od dołu).
     Kanał y — width/height/x shrinku nieruszone; wolniej niż obrazki. ---- */
  const unicornExitAt = c.unicorn.len + holdVh;   // shrink end + HOLD → dopiero potem exit
  tl.to(unicorn, {
    y: () => vh(c.unicorn.exitToVh),
    ease: "none",
    duration: activeVh - unicornExitAt,
  }, unicornExitAt);

  /* obrazki: KONTENER przelatuje przez viewport (fromY→toY) + OBRAZ (inner) ma paralaks
     WEWNĄTRZ maski (0→shift% w dół). Oba w oknie [enter, enter+len]. Per-obraz fromY/toY. */
  c.images.forEach((img) => {
    const el = section.querySelector(img.sel);
    if (!el) return;
    const inner = el.querySelector(".about-journey_image-inner");
    const fromY = img.fromY ?? c.imageFromY;
    const len = img.len ?? (c.imageBaseTraverseVh / (img.speed ?? 1));   // prędkość: len = base / speed
    const at = img.enter + holdVh;   // przesunięcie o hold (start po unicorn exit)
    /* moment START = kontener tuż POD ekranem (y=fromY, ~+100vh, jeszcze niewidoczny);
       moment END = kontener WŁAŚNIE zniknął u góry → dolna krawędź na górze ekranu
       (y = −wysokość kontenera). Funkcje = responsywne (przeliczane na refresh/resize). */
    tl.fromTo(el,
      { y: () => vh(fromY) },
      { y: () => (img.toY != null ? vh(img.toY) : -el.offsetHeight),
        ease: "none", duration: len, immediateRender: true },
      at);
    if (inner) {
      tl.fromTo(inner,
        { yPercent: 0 },
        { yPercent: c.imageInnerShiftPercent, ease: "none", duration: len, immediateRender: true },
        at);
    }
  });

  /* DOKLEJ oś do momentu wjazdu Purpose: Purpose wjeżdża na (dur − overlapVh);
     chcemy = purposeEnterMoment (raw = moment + exitStartAxis). Padding pustym
     tweenem, jeśli content krótszy — żeby moment Purpose zgadzał się z osią 1:1. */
  const overlapVh = c.overlapViewports * 100;
  const desiredAxis = (c.purposeEnterMoment + exitStartAxis) + overlapVh;
  if (tl.duration() < desiredAxis) tl.to({}, { duration: desiredAxis - tl.duration() }, tl.duration());

  /* REALNA długość osi (max koniec tweenów / doklejony ogon pod Purpose) */
  const dur = tl.duration() || activeVh;

  /* progi onUpdate = pozycje / dur → trafiają w tweeny (textIn/textRise, swap=abstract) */
  textInAt = c.textIn / dur;
  swapAt = (c.swapAt + holdVh) / dur;

  /* WYSOKOŚĆ SEKCJI = stage(100) + sticky hold + realna oś (dur) → scrub 1:1, bez
     martwego scrolla. Purpose (margin -100vh) nakłada się na ostatnie 100vh osi. */
  section.style.height = `${100 + c.stickyHoldVh + dur}vh`;
}

/* ============================================================
   OVERLAP — Purpose najeżdża na journey:
   obrazki zwalniają (drift do góry, powoli) + czarny overlay
   scrub 1:1 z krawędzią sekcji (bez kisielu — krawędź to natywny scroll)
   ============================================================ */
function initPurposeOverlap() {
  const purpose = q(".is-about-purpose");
  const images = q(".about-journey_images");
  const overlay = q(".about-journey_overlay");
  const textWrap = q(".about-journey_text-wrap");
  const svh = (n) => (window.innerHeight * n) / 100;

  gsap.timeline({
    scrollTrigger: {
      trigger: purpose,
      start: "top bottom",
      end: "top top",
      scrub: true,
    },
  })
    /* drift do góry gdy Purpose przykrywa: obrazki mocniej, tekst troszkę
       (oba chowane pod nadchodzącą sekcję). Unicorn ma własny exit na y (journey). */
    .to(images, { y: () => svh(CONFIG.overlap.imagesShiftVh), ease: "none" }, 0)
    .to(textWrap, { y: () => svh(CONFIG.overlap.textShiftVh), ease: "none" }, 0)
    .to(overlay, { opacity: CONFIG.overlap.overlayMax, ease: "none" }, 0);
}

/* ============================================================
   REVEALS — Purpose (screen 5): globalny system #1
   ============================================================ */
function initStaticReveals() {
  const purpose = q(".is-about-purpose");

  // heading + intro: gdy sekcja realnie zakrywa viewport (overlap!), nie na "top 75%"
  revealOnScroll(purpose, [".about-purpose_heading"], { start: "top 40%" });
  revealOnScroll(purpose.querySelector(".about-purpose_intro"),
    [".about-purpose_intro [data-reveal]"], { start: "top 75%" });
  revealOnScroll(purpose.querySelector(".about-purpose_grid"),
    ['.about-purpose_grid [data-reveal="purpose-list"]'], { start: "top 75%", stagger: 0.08 });
}

/* ============================================================
   NAV MASK — SYSTEM GLOBALNY #2 (jedna krawędź, 1:1 z home)
   Krawędź JASNEJ sekcji Purpose odsłania ciemny nav; komplementarne
   clipy (zero podwójnego renderowania = zero halo AA).
   scrub: true (BEZ kisielu!) — krawędź sekcji to natywny scroll.
   ============================================================ */
function initNavMask() {
  const mask = q(".nav-mask_component");
  const baseNav = q(".nav_component:not(.is-dark)");
  const purpose = q(".is-about-purpose");

  const proxy = { p: 0 };
  function applyClips() {
    const edge = (1 - proxy.p) * window.innerHeight; // krawędź jasnej sekcji w px od góry
    mask.style.clipPath = `inset(${edge.toFixed(1)}px 0px 0px 0px)`;
    const h = baseNav.offsetHeight;
    const cut = Math.min(Math.max(h - edge, 0), h);
    baseNav.style.clipPath = cut > 0 ? `inset(0px 0px ${cut.toFixed(1)}px 0px)` : "none";
  }
  applyClips();

  gsap.to(proxy, {
    p: 1,
    ease: "none",
    onUpdate: applyClips,
    scrollTrigger: { trigger: purpose, start: "top bottom", end: "top top", scrub: true },
  });
}

/* ============================================================
   MASTER — bez loadera: init + reveal od razu
   ============================================================ */
function initPage(opts) {
  scrollLock.lock();

  initJourney();
  initPurposeOverlap();
  initStaticReveals();
  /* NAV: od 2026-07-28 about jedzie na TYM SAMYM arbitrze co home (nav-v2.js).
     Lokalny initNavMask() zostaje w pliku tylko jako fallback — był jednym
     z „czterech pisarzy" clip-pathów, których v2 zastąpiła. Styk jasnej sekcji
     deklaruje teraz data-nav-theme="light" na .is-about-purpose w about.html. */
  if (window.PPB && PPB.navV2 && PPB.navV2.bind) PPB.navV2.bind(PAGE_ROOT);
  else initNavMask();

  /* sekcja Track record — moduł ma już własny kontrakt init/destroy
     (PPB.pages.trackRecord) i pod Barbą NIE bootuje się sam. */
  if (PPB.pages && PPB.pages.trackRecord) PPB.pages.trackRecord.init({ container: PAGE_ROOT });

  /* responsywność: istotna zmiana szerokości = reload (pattern z home) */
  let lastW = window.innerWidth;
  onWin("resize", () => {
    if (Math.abs(window.innerWidth - lastW) > 80) location.reload();
  });

  /* INTRO — dispatch po wariancie (nic nie tracimy; wszystkie runnery niżej) */
  const INTROS = {
    "scroll-reveal": runIntro_scrollReveal,
    "brackets-fade": runIntro_bracketsFade,
    "hero-collapse": runIntro_heroCollapse,
  };
  (INTROS[CONFIG.intro.variant] || runIntro_scrollReveal)();
}

/* koniec KAŻDEGO intro: odblokuj scroll + przelicz triggery (hero wróciło do auto) */
function finishIntro() {
  scrollLock.unlock();
  ScrollTrigger.refresh();
}

/* WARIANT C (AKTUALNY): "scroll-reveal" — nowa struktura (hero 100vh = warstwa
   nad unicornem pinowanym za nią). Na LOAD tylko wejście: nawiasy → nav + text.
   Unicorn stoi za hero (opacity 1, bez fade). Odsłonięcie + shrink robi SCROLL. */
function runIntro_scrollReveal() {
  const u = CONFIG.intro.scrollReveal.unicorn;
  const unicorn = q(".about-journey_unicorn");
  return gsap.timeline()
    .add(buildBracketSpread(), 0)                                        // NAWIAS
    .add(buildHeroReveal(), 0)                                           // nav + text — TEN SAM moment co nawias
    .fromTo(unicorn,                                                     // unicorn: fade-in (opacity 0→1) + scale 1.1→1, delay 0.02s
      { autoAlpha: 0, scale: u.scaleFrom },
      { autoAlpha: 1, scale: 1, duration: u.fadeDuration, ease: u.fadeEase }, u.delay)
    .call(finishIntro);
}

/* WARIANT A: nawiasy rozchodzą się + unicorn fade w miejscu (od startu);
   nav + text reveal PO nawiasach (± sequenceAt). */
function runIntro_bracketsFade() {
  const bracketsDur = CONFIG.intro.brackets.duration;
  return gsap.timeline()
    .add(buildBracketSpread(), 0)                                        // nawiasy: od 0
    .add(buildUnicornFade(), 0)                                          // unicorn fade: RAZEM z nawiasami
    .add(buildHeroReveal(), bracketsDur + CONFIG.intro.bracketsFade.sequenceAt)  // nav + text: po nawiasach
    .call(finishIntro);
}

/* WARIANT B: hero (100vh) zmniejsza się i odsłania unicorn; WSZYSTKO RÓWNOLEGLE
   od startu: hero collapse + unicorn fade (opacity szybko / scale wolno) +
   nawiasy + text + navbar. */
function runIntro_heroCollapse() {
  const bracketsDur = CONFIG.intro.brackets.duration;
  return gsap.timeline()
    .add(buildHeroCollapse(), 0)       // hero 100vh → naturalna (odsłania unicorn) — od startu
    .add(buildUnicornFadeSlow(), 0)    // unicorn: opacity 0.6s / scale 2s — od startu
    .add(buildBracketSpread(), 0)      // nawiasy — od startu
    .add(buildHeroReveal(), bracketsDur + CONFIG.intro.heroCollapse.sequenceAt)  // nav + text: PO nawiasach
    .call(finishIntro);
}

  /* ============================================================
     KONTRAKT BARBA — init / destroy
     ============================================================ */
  var ctx = null;

  function init(opts) {
    opts = opts || {};
    IS_FIRST = !!opts.first;
    PAGE_ROOT = opts.container ||
                document.querySelector('[data-barba-namespace="about"]') ||
                document;
    /* gsap.context(fn, root): zbiera WSZYSTKO, co powstanie w fn (tweeny, piny,
       pin-spacery, ScrollTriggery) i scope'uje selektory-stringi do kontenera.
       Jeden ctx.revert() w destroy() cofa to w całości. */
    ctx = gsap.context(function () { initPage(opts); }, PAGE_ROOT);
  }

  function destroy() {
    if (PPB.pages.trackRecord) PPB.pages.trackRecord.destroy();
    CLEANUP.forEach(function (fn) { try { fn(); } catch (e) {} });
    CLEANUP.length = 0;
    if (window.PPB && PPB.navV2 && PPB.navV2.unbind) PPB.navV2.unbind();
    if (ctx) { ctx.revert(); ctx = null; }

    /* ctx.revert() cofa też reveal NAVA (jest site-level, ale animuje go strona),
       czyli zgasiłby go na czas przejścia. Zasłona leży pod navem, więc byłoby
       to widoczne. Przywracamy widoczność natychmiast po revercie. */
    var navEl = document.querySelector('.nav_component[data-reveal="ui"]');
    if (navEl) gsap.set(navEl, { autoAlpha: 1 });
  }

  PPB.pages.about = { init: init, destroy: destroy };

  /* PROTOTYP STANDALONE — gdy plik jest otwarty bez harnessu Barby
     (np. stary podgląd sekcji), moduł sam się odpala jak dawniej. */
  if (!window.__PPB_BARBA__) {
    window.addEventListener("load", function () { init({ first: true }); });
  }
})();
