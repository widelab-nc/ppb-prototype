/* ============================================================
   Polpharma Biologics — home prototype (TYLKO choreografia strony)
   loader → hero reveal → scrub fade-outy tekstów → pinned flow
   (wideo scrub, rewersyjne statsy, sticky handoff)
   Warstwa globalna (_shared): gsap-config.js (pluginy + PPB.config),
   reveal.js (system #1: revealText/hideText/revealOnScroll/ensureLines),
   nav-shape.js + nav-mask.js (system #2). Ładowane PRZED tym plikiem.
   Docelowo: /pages/home.js (repo → jsDelivr)
   ============================================================ */

/* po refreshu strona ZAWSZE ładuje się na górze (loader gra od zera).
   ⚠️ 2026-07-28: PRAWDZIWE wyłączenie przywracania scrolla siedzi teraz w <head>
   (index.html). Tutaj jest już za późno — przeglądarka przywraca scroll i maluje
   klatkę, zanim dojdzie do skryptów na końcu <body>, i widać przeskok.
   Ta linia zostaje jako fallback dla trybu standalone (plik otwarty bez harnessu). */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);


/* ============================================================
   MODUŁ STRONY — kontrakt Barba (_shared/smooth/BARBA-READY-CONTRACT.md)
   Cały plik żyje w IIFE: zero wycieków do globala. Dwie strony siedzą
   chwilę w pamięci naraz, a home i about miały OBIE globalne `const CONFIG`
   i `buildHeroReveal` — w globalu to SyntaxError i strona nie wstaje.
   Eksport: PPB.pages.home = { init({first, container}), destroy() }.
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
/* ---------- CONFIG — strojenie STRONY tutaj ----------
   (easingi wspólne, reveal i kisiel scruba = PPB.config z _shared/gsap-config.js) */
const CONFIG = {
  ease: PPB.config.ease,

  loader: {
    holdStart: 0.5,
    converge: 0.8,
    holdMid: 0.25,
    expand: 1.0,
    holdFull: 0,          // s — PRZERWA na pełnym kolorze (po ekspansji, przed fade)
    fadeOut: 0.6,         // s — CZAS chowania solid coloru loadera
    fadeOutEase: "power1.out", // krzywa chowania (np. "power2.out", "expo.out", "sine.inOut")
    revealOverlap: 0.8,   // s — o tyle WCZEŚNIEJ (przed końcem fade) startują teksty+UI+tło (było 0.3, +0.3 na prośbę Tomka)
    expandScaleMargin: 1.1,
    /* Oś czasu: pełny kolor = holdStart+converge+holdMid+expand (2.55s);
       start tekstów = pełny kolor + holdFull + fadeOut − revealOverlap (teraz: +0.6s) */
  },

  /* SYSTEM #1 (line-reveal) — strojenie w _shared/gsap-config.js (PPB.config.reveal);
     tu tylko referencja, żeby dotychczasowe CONFIG.reveal.* działało bez zmian */
  reveal: PPB.config.reveal,

  heroReveal: {
    uiBlur: 12,             // px — nav/strzałka/CTA startują zblurowane i "odblurowują się"
    // timing UI = 1:1 z pierwszym tekstem (ten sam start, duration i ease z CONFIG.reveal)
    bgScaleFrom: 1.1,       // tło (Unicorn): start w zbliżeniu → dojazd do 1
    bgScaleDuration: 2,   // lekko dłużej niż tekst (1s)
    bgScaleEase: "sine.out",
  },

  heroParallax: {
    shift: 32, // yPercent tła — mniejszy = mniej ruchu Unicorna na scroll (było 22)
  },

  // overlay na Unicorn — narasta podczas scrolla (płynne przejście do ciemnej sekcji niżej)
  heroOverlay: {
    max: 0.5,        // docelowa krycie overlaya na końcu hero
  },

  /* wyjście tekstu hero — ZWYKŁY fade: na scrollu opacity całego bloku tekstu spada. */
  heroTextOut: {
    fadeStart: "top top",
    fadeEnd: "45% top",   // steeper — opacity spada szybciej po scrollu
  },

  // "kisiel": smoothing scruba — wartość wspólna z _shared/gsap-config.js
  scrubSmooth: PPB.config.scrubSmooth,

  howItWorks: {
    /* --- TRIGGER POINTS — stroić tutaj --- */
    textStart: "top 75%",     // wejście tekstu "We are swiss based..."
    maskStart: 32,            // rem — kształt wypełnia viewBox (~0.97×) → mniejszy start = ~ten sam widoczny ~500px
    maskPeek: 0.47,           // Figma: środek kształtu ~375px poniżej środka ekranu (375/800)
    contentViewports: 3.5,    // długość właściwej sekwencji (w ekranach scrolla)
    overlapViewports: 1.0,    // pełny viewport najazdu — WIDEO STOI do pełnego zakrycia (SYNC z margin-top sekcji We know w CSS!)
    overlapShift: 60,         // px — WHAT WE DO + stats idą lekko do góry na scrubie podczas najazdu
    expandPortion: 0.35,      // część CONTENTU na ekspansję maski
    headerOut: { portion: 0.75, y: -60 }, // chowanie headera: dłuższy end + ruch do góry (scrub, dwukierunkowy)
    statsIn: 0.33,           // progress CONTENTU: WHAT WE DO + set-1 ≈ klatka 160/481 (licznik fps30)
    statsSwap: 0.86,         // progress CONTENTU: swap set-1 → set-2 ≈ klatka 415/481
    overlayMaxAlpha: 0.55,   // ciemny overlay na wideo podczas najazdu
    frameCounter: true,      // DEV: mały licznik klatek wideo na dole (do podania dokładnego timingu) — wyłącz przed portem
    fps: 30,                 // klatki/s wideo (currentTime → numer klatki); popraw jeśli wideo ma inne

    /* --- MOBILE≤991 (2026-07-27; artboardy Figma 375×676, wzorzec home-part1) -----
       Desktop ma DWA takty: [WHAT WE DO + set-1 razem] → [set-2].
       Mobile ma TRZY, bo na 375 nie ma miejsca na WHAT WE DO obok statsów:
         1) WHAT WE DO samo, przy dolnej krawędzi          (4473:6139)
         2) set-1 — DWA staty przy dolnej krawędzi          (4473:6170)
         3) set-2 — DWA staty u GÓRY + dojazd kadru wideo   (4473:6199)
       Progi = progress fazy CONTENT (0..1), ta sama skala co statsIn/statsSwap. */
    mobile: {
      maskStart: 21,        // rem — peek diamentu ~335px szerokości na artboardzie 375 (4473:6118)
      whatWeDoIn: 0.28,     // takt 1
      set1In: 0.52,         // takt 2
      set2In: 0.80,         // takt 3

      /* WIDEO — dwie fazy:
         [0 … videoFitStart]             pełnoekranowy cover (wyśrodkowany)
         [videoFitStart … showAt]        dojazd kadru do kształtu 89.33vw na dolnym
                                         gutterze + narastający gradient u góry.
         Koniec = featureShape.showAt — na desktopie to moment handoffu do fixed
         overlaya; na mobile overlay jest wyłączony (CSS), końcowy kadr wideo SAM
         jest kształtem z artboardu 4473:6199. */
      videoFitStart: 0.78,
      videoFitEase: "power2.inOut",

      /* JEDEN ZEGAR (2026-07-28, wariant 1 wybrany przez Tomka): na mobile pin jedzie
         SUROWYM scrubem, bo w tej samej scence musi się zgadzać co do piksela geometria
         kadru wideo (jest w timeline pinu) z kształtem/aplą (zapięte na sztywno do scrolla).
         Kisiel 1,2 s na jednej z tych rzeczy dawał „najpierw w dół, potem w górę" i drganie.
         false = powrót do kisielu na mobile (do porównania odczucia). Desktop nietknięty. */
      rawScrub: true,

      /* ============ MOMENT HANDOFFU — ZMIERZONY NA KLATKACH (2026-07-28) ============
         Zgłoszenie Tomka: „koniec wideo, pojawia się kształt z butelką i zaczyna drgać,
         a kształt i wideo najpierw idą w dół".
         Pomiar bboxa jasnego obszaru w klatkach hero-seed.mp4 (ffmpeg + numpy), próg 200,
         środkowa kolumna — kształt DOJEŻDŻA do pozycji kalibracyjnej dopiero pod koniec:

           content   klatka   góra   wys      (kalibracja z CONFIG: góra 233, wys 641)
           0,891      343      209    690
           0,910      350      222    663
           0,930      358      229    650   ← TU pojawiała się nakładka (showAt)
           0,948      364      232    643
           0,966      372      233    640   ← dopiero tu kształt STOI
           0,985      379      234    638

         Czyli na 0,93 kształt w wideo był jeszcze 6 px (na ekranie) wyższy i W RUCHU
         w dół, a myśmy w tym momencie wstawiali nieruchomą, skalibrowaną kopię.
         Dwa nieco różne kształty na sobie, jeden w ruchu = dokładnie to drganie i „w dół".

         Dlatego na mobile: (1) odtwarzanie kończy się na `videoEndAt` — od tego miejsca
         NIE MA już żadnego seekowania wideo (koniec juddera dekodera), klatka jest
         zamrożona na tej, do której kształt dojechał; (2) kopia pojawia się dopiero na
         `showAt` (mobilny override), gdy klatka stoi. Desktop bez zmian (0,93 zostaje). */
      videoEndAt: 0.95,   // content, na którym kończy się odtwarzanie (klatka ~365 = kształt na miejscu)
      showAt: 0.96,       // content, na którym pojawia się kopia i kończy dojazd kadru (mobile)
    },
  },

  stats: {
    /* teksty statsów = globalny line-reveal (CONFIG.reveal) — tu tylko linie + rytm */
    lineDuration: 0.55, // dłuższy wjazd — zmiana 3 statów bardziej widoczna
    statStagger: 0.16,  // większy odstęp — 3 staty zmieniają się kaskadowo, nie naraz
    textDelay: 0.10,    // teksty startują po linii
  },

  // kształt (shape.svg + butelka) — pojawia się na końcu wideo, przeżywa handoff
  featureShape: {
    showAt: 0.93,  // progress CONTENTU pinned flow, od którego kształt jest widoczny
    /* KSZTAŁT = 1:1 z OSTATNIĄ KLATKĄ WIDEO (zmierzone z hero-seed.mp4, klatka 1920×1080):
       bbox x 635–1283, y 233–874. Rozmiar na ekranie liczony RESPONSYWNIE z mapowania
       object-fit: cover (skala = max(vw/1920, vh/1080)), przeliczane przy resize. */
    frame: { w: 1920, h: 1080, shapeW: 648, shapeH: 641, shapeCx: 959, shapeCy: 553.5 },
    /* MOBILE≤991 (2026-07-27): o rozmiarze kształtu NIE decyduje cover, tylko design —
       kształt = 335/375 szerokości ekranu (89.33vw), centrowany, dolna krawędź na
       gutterze 20/375 (4473:6199). Inset jako UŁAMEK szerokości (nie rem!), bo to
       proporcja ekranu z artboardu — kanon: proporcje ekranu w vw/%, dystanse w rem. */
    mobileInsetFrac: 20 / 375,
    /* --- ROZMIAR KSZTAŁTU per ORIENTACJA (2026-07-28, decyzja Tomka) --------------
       89,33vw to proporcja z artboardu 375×676 — tam kwadrat zajmuje ~połowę wysokości.
       Przeniesiona wprost na szersze ekrany zjada wszystko (przy 991 → 929 px, czyli
       ~90 % wysokości tabletu), a w POZIOMIE telefonu jest wręcz wyższa niż ekran.
       Dlatego: pełna szerokość TYLKO telefon w pionie, reszta pasma ≤991 dostaje
       ułamek `tabletFrac` — dodatkowo z sufitem od WYSOKOŚCI (`tabletMaxVh`), bo
       w poziomie ograniczeniem jest wysokość, nie szerokość. */
    phoneMaxWidth: 767,   // px — próg telefon/tablet; TEN SAM co reszta reguł ≤767 w style.css
    tabletFrac: 0.6,      // tablet + poziom: ułamek szerokości portretowej (0,6 × 89,33vw ≈ 53,6vw)
    tabletMaxVh: 0.6,     // ...ale kształt nie wyższy niż 60 % wysokości ekranu (ratuje poziom telefonu)
    /* OVERLAY GRADIENTU NAD WIDEO (2026-07-28, decyzja Tomka) — zastąpił maskę `--vfade`
       (tamta WYCINAŁA górę wideo; ta jest nakładką NA wideo, łatwiej dopasować kolor).
       Nakładka sięga od góry okna do `mobileTopFadeFrac` wysokości wideo i tam gaśnie
       do 0 %. Kolor: `--vfade-color` w style.css (#10373b). */
    mobileTopFadeFrac: 0.10,
  },

  weKnow: {
    pinViewports: 3.5,     // długość scruba za "top top" (JS ustawia wysokość sekcji = (1+pin)×100vh)
    /* 2026-07-27 FIX: było `rightGap: 890/1440` — pozycja kształtu jako ułamek szerokości
       EKRANU. Na szerokich oknach kształt zostawał przy lewej krawędzi, a kolumna tekstu
       uciekała na prawą → dziura między nimi rosła (758px na 2300 vs 402px na 1440).
       Teraz prawa krawędź kształtu to ułamek KONTENERA — tego samego, do którego przypięty
       jest tekst — więc odstęp trzyma proporcję z artboardu. 0.37645 wyprowadzone z 1440:
       (550 − 32) / 1376, gdzie 550 to dotychczasowa prawa krawędź. Na 1440 wynik IDENTYCZNY. */
    shapeRightInContainer: 0.37645,
    shapeTargetVh: 120,    // docelowa wielkość kształtu w vh (zależna od wysokości ekranu)

    /* REFAKTOR v3 (decyzja Tomka): WSZYSTKO siedzi w sticky stage'u, CAŁY CZAS
       w miejscach docelowych — na scrubie robimy tylko TRANSFER POZYCJI
       (y z dołu → 0, z kisielem; naturalny scroll odpadł, bo nie miał smoothingu
       i teksty wchodziły za szybko).
       Tytuł: wrapper CENTROWANY na linii titleTop (translateY -50%) → linia 2
       paragrafu ("programs") siada na środku tytułu → wp1 top = titleTop − 1.5 linii. */
    layout: {
      titleTop: 50,        // vh — linia tytułu "We know" (środek ekranu, centrowany)
      paraLine: 2.8,       // rem — 1 linia is-h-s (2.5rem × lh 1.12)
      wp1Height: 50,       // wysokość wp1 (vh)
    },

    /* segmenty scruba — w vh scrolla (timeline mapowana 1:1, ease none) */
    seg: {
      entrance: 50,        // shape w lewo + scale: [0 → 50] — 2x szybciej (było 100; decyzja Tomka 2026-07-22)
      textIn: 60,          // START transferu tekstów = KONIEC ruchu shape'a + 10vh przerwy (decyzja Tomka 2026-07-26)
      textLen: 100,        // długość transferu+shrinku; KONIEC = 160 = aplaStart
      aplaStart: 160,      // apla rusza z dołu (= koniec transferu); +10vh za textIn
      aplaLen: 100,        // pełna przy aplaStart+aplaLen → switch na Our goal
    },

    /* butelka kurczy się PODCZAS ruchu shape'a w lewo (entrance).
       scale MNOŻY się z rosnącą skalą rodzica (shape rośnie do targetScale) —
       niższa wartość = butelka realnie mniejsza mimo powiększania kształtu.
       Knob wzrokowy, zależny od ekranu (targetScale ~ wys. ekranu). */
    bottleEntranceScale: 0.5,

    /* tytuł "We know" — ZWYKŁY fade na scrub (bez global reveal), okno = [titleFadeFrom, 1]
       ułamka ruchu shape'a (entrance). titleFadeFrom 0.5 = od połowy ruchu do końca. */
    titleFadeFrom: 0.5,
    /* rozmiar startowy tytułu: pojawia się DUŻY, shrink do 2.5rem (CSS) dopiero
       w oknie wjazdu tekstu z prawej [enterAt, enterAt+travel] → na spotkaniu = docelowy. */
    titleBigSize: "10rem",

    /* parallax wejścia: yPercent Z GÓRY (wartości ujemne) → 0 przy locku (decyzja Tomka) */
    parallax: { note: -15, diamond: -30 },


    aplaSwapEnd: 0.5,      // span "They fail..." w pełni przełączony gdy apla w połowie ekranu

    /* PUNKT switcha We know → Our goal jako UŁAMEK wjazdu apli [aplaStart, aplaStart+aplaLen].
       1.0 = apla u góry (dawne zachowanie); 0.5 = POŁOWA wjazdu solidu (decyzja Tomka 2026-07-24,
       „Our goal wcześniej"). NIE rusza duplikacji butelek — ta kończy na aplaStart+aplaLen bez zmian. */
    goalSwitchFrac: 0.5,

    // SWITCH We know → Our goal: SINGLE TRIGGER gdy apla dojedzie do góry (top top)
    switchFx: {
      outDuration: 0.45,   // s — stare teksty: fade out + lekki move do góry
      inDuration: 0.5,     // s — nowe teksty: fade in z dołu
      overlap: 0.2,        // s — nachodzenie in na out
      yPercent: 30,        // wielkość ruchu (w % wysokości elementu)
      stagger: 0.08,
    },

    // butelka: tilt startowy = jak w ostatniej klatce wideo; potem rotate do pionu (scrub, 1. połowa apli)
    bottleTiltStart: 0,    // stopnie (nachylenie butelki na końcu wideo — dostrojone przez Tomka w inspect)
    bottleUpright: -25,    // stopnie; butelki wizualnie PIONOWE od razu (bez widocznego rotate — jak na początku)
    bottleScale: 0.588,     // szerokość butelki = ułamek szerokości kształtu; 298px / SHAPE_DIMS.w 507px @1289×845 (inspect Tomka)
    bottleY: -50,          // yPercent centrum butelki (-50 = środek shape'a; mniej ujemnie = niżej, z dala od logo)
    bottleBlur: 28,        // docelowy blur butelki (px) — jeszcze większy (decyzja Tomka 2026-07-26)
    bottleBlurOpacity: 0.50,// docelowa opacity butelek (weShape) — 50%, pojawia się gdy tekst rusza w górę
    bottleShowFrac: 1.0,   // fade+odkręcenie butelki na CAŁYM travel (start = enterAt, koniec = start dup)
    blurStart: 0.2,        // blur (i OBRÓT do pionu) startują po 20% ruchu shape'a (było od 0)
    // korekta pozycji butelki PO stanięciu pionowo (DOSTRÓJ wzrokowo, xPercent/yPercent):
    bottleUprightX: 42,     // przesunięcie POJEDYNCZEJ butelki w prawo (przed dup); NIE rusza klastra dup
    bottlePreDupX: -10,     // butelka o 10% w LEWO PRZED duplikacją; dup ustawia finał absolutnie → layout końcowy bez zmian
    bottleUprightY: 0,     // przesunięcie w pionie po obrocie

    // DUPLIKACJA butelek (layout "Our goal") — JAWNE pozycje per butelka (z bottle-dup-lab.html).
    // positions = lewo→prawo (xPercent, yPercent, scale); z-index automatycznie wg scale (większa = wyżej).
    dup: {
      at: 0,               // start dup = START apla (solid = progres duplikacji; koniec gdy apla na full)
      staggerFrac: 0.12,   // stagger STARTU (ułamek okna); WSZYSTKIE kończą w tym samym momencie (Our goal)
      groupScale: 0.405,   // OGÓLNY scale całego klastra (mniej = mniejszy; wokół środka klastra) — −10% (0.45×0.9)
      groupX: 15,          // przesunięcie całego klastra w PRAWO (xPercent) — DOSTRÓJ (−5% w lewo z 20)
      groupY: 0,           // przesunięcie całego klastra w pionie (yPercent)
      positions: [         // 4 butelki, lewa (0) największa/najwyżej z-index → prawa (3) najmniejsza
        { x: -113, y: -49, scale: 1.54 },
        { x: -54,  y: -49, scale: 1.30 },
        { x: -12,  y: -47, scale: 1.12 },
        { x: 29,   y: -47, scale: 0.92 },
      ],
    },

    /* --- MOBILE≤991 (2026-07-27) — STATYCZNY STACK (Figma 5177:3237) ----------
       Na 375 nie ma choreografii: artboard pokazuje DWA bloki jeden pod drugim,
       czyli STANY KOŃCOWE obu faz desktopu. Knoby tylko na to, czego nie da się
       wziąć z desktopu (tam wszystko wynika ze scruba i z geometrii wideo). */
    mobile: {
      bottleScale: 0.588,   // szerokość butelki = ułamek szerokości KARTY (desktop: ułamek kształtu z wideo)
      bottleY: -50,         // yPercent butelki na karcie 1 (−50 = środek)

      /* KLASTER KARTY 2 — 1:1 z artboardem 5177:3237 (grupa 4473:6280).
         Wyprowadzenie (karta 335, butelka bazowa w = 335 × bottleScale = 197,
         CSS bazy: left 48.5%, top 49.5%, transform-origin środek):
             środek butelki x = 0,485·335 + w/2 + (xPercent/100)·w = 260,975 + 1,97·xPercent
             szerokość końcowa = w · scale
         Z artboardu (środek x w % karty → px, szerokość w px):
             23,02 % → 77,1  · 158,95      →  x −93,34   scale 0,549
             34,09 % → 114,2 · 186,63      →  x −74,51   scale 0,644
             50,42 % → 168,9 · 223,52      →  x −46,74   scale 0,772   ← ŚRODEK
             66,09 % → 221,4 · 186,63      →  x −20,09   scale 0,644
             77,15 % → 258,4 · 158,95      →  x  −1,31   scale 0,549

         ⚠️ SKALE SĄ DOBRANE DO BBOXA PO OBROCIE, nie do szerokości obrazka. Liczby
         z Figmy (158,95 / 186,63 / 223,52) to wymiary KONTENERA, w którym obrazek
         siedzi obrócony o 12,12° — czyli już bounding box. Nasza butelka też jest
         obrócona (`bottleUpright`), więc porównywalna jest tylko szerokość bboxa.
         Pierwsze podejście brało te liczby jak szerokość obrazka i dało butelki
         1,47× za duże (oraz 20 px przewijania poziomego).
         Pionowo WSZYSTKIE mają wspólny środek (168,1 px = 50,2 % karty), więc y jest
         jedno: środek = 0,495·335 + 0,01·h = 165,8 + 0,01·h ≈ 168,1 przy y = −49.
         z-index leci ze skali (scale × 1000), więc środkowa jest najwyżej, a pary
         lewo/prawo mają równy — dokładnie gradacja z artboardu. */
      dup: {
        positions: [
          { x: -93.34, y: -49, scale: 0.549 },   // skrajna LEWA
          { x: -74.51, y: -49, scale: 0.644 },
          { x: -46.74, y: -49, scale: 0.772 },   // ŚRODEK — największa, najwyższy z-index
          { x: -20.09, y: -49, scale: 0.644 },
          { x:  -1.31, y: -49, scale: 0.549 },   // skrajna PRAWA
        ],
        /* ROZEJŚCIE NA SCRUB (decyzja Tomka): wszystkie butelki startują schowane pod
           środkową (jej pozycja i skala) i rozchodzą się na boki, gdy karta 2 wchodzi
           w ekran. `spread` = okno scrolla zaczepione o SAMĄ kartę — statyczny stack
           nie ma sticky, w którego oknie można by to liczyć. */
        spreadStart: "top 90%",
        spreadEnd: "top 35%",
        stagger: 0.06,        // środek rusza pierwszy, skrajne ostatnie
      },
      /* Karta 2 na desktopie siedzi W APLI i ma kształt BIAŁY (maska koloru).
         Na mobile apla jest tłem CAŁEJ sekcji (lab-white), więc biały kształt
         byłby niewidoczny → karta 2 dostaje ten sam zielony plik co karta 1.
         ⚠️ Do potwierdzenia wzrokowo (nie mam dostępu do artboardu 5177:3237). */
      aplaShapeSrc: "assets/shape.svg",
      revealStart: "top 80%", // próg wjazdu tekstów (globalny line-reveal, dwukierunkowy)

      /* HANDOFF wideo → apla (2026-07-28, decyzja Tomka; artboard 4473:6227).
         Na desktopie w momencie pojawienia się kształtu butelka jest JESZCZE UKRYTA
         (pokazuje się dopiero przy wjeździe tekstów). Na mobile ma być WIDOCZNA i OSTRA
         nad wideo, a biała apla, zakrywając wideo, ma odsłaniać kopię Z BLUREM.
         Czyli role odwrócone: desktop „apla zdejmuje blur", mobile „apla nakłada blur". */
      bottleBlur: 18,        // px — blur butelki w karcie 1 (kopia pod aplą). Desktop: 28. DOSTRÓJ WZROKOWO.
      /* EASE ruchu w górę (v4). WYNIKA Z ARYTMETYKI, nie z gustu: przed oknem shape set
         stoi (sticky → prędkość 0), po oknie jedzie ze stroną (prędkość 1:1 ze scrollem).
         `power1.in` ma pochodną startową 0 i końcową 2× średniej ≈ 1 → oba szwy gładkie.
         ⚠️ W architekturze v3 było odwrotnie (`power1.out`), bo tam trzymanie robił JS
         PRZED oknem. Zmiana kierunku easu to konsekwencja przejścia na sticky. */
      handoffEase: "power1.in",

      /* SLOT KSZTAŁTU W APLI: odstęp od góry apli do kształtu. TA SAMA liczba co
         `padding-top` stage'a w style.css (5rem) — z niej liczy się dystans ruchu w górę,
         więc pozycja końcowa kształtu i miejsce karty 1 w stacku nie mogą się rozjechać. */
      slotTopRem: 5,     // 80 px (artboard 5177:3237, karta 1 @ y80)
    },
  },
};

/* ---------- scroll lock ---------- */
const lockScroll = () => (document.documentElement.style.overflow = "hidden");
const unlockScroll = () => (document.documentElement.style.overflow = "");

/* ---------- SHAPE_DIMS — rozmiar/pozycja kształtu 1:1 z ostatnią klatką wideo ----------
   Mapowanie object-fit: cover → RESPONSYWNE (liczone z aktualnego viewportu).
   Wynik zapisywany globalnie, używany przy inicie timelines. */
const SHAPE_DIMS = { w: 0, h: 0, dx: 0, dy: 0 };

/* jedno miejsce na próg mobile — TEN SAM co @media (max-width: 991px) w style.css
   i hamburger nava (_shared/nav/nav.css). 2026-07-27 MOBILE≤991, wzorzec home-part1
   (tam 767; tu próg podniesiony do 991 — decyzja: jeden próg dla nava i layoutu).
   ⚠️ Decyzja czytana przy inicie; przejście przez 991 w trakcie życia strony = F5. */
const MOBILE_MQ = "(max-width: 991px)";
const isMobile = () => window.matchMedia(MOBILE_MQ).matches;

/* MOBILE≤991 (2026-07-27): kto dostaje geometrię z ostatniej klatki wideo (SHAPE_DIMS).
   Desktop: fixed overlay + obie kopie kształtu w We-know (wszystkie 1:1 z klatką).
   Mobile: WYŁĄCZNIE fixed overlay (i tak display:none) — karty We-know są statyczne
   i mają wymiary z CSS (100% szerokości kontenera + aspect-ratio 1:1). Wpisanie im
   SHAPE_DIMS + xPercent/yPercent/x/y rozjechałoby cały stack z artboardu 5177:3237. */
/* 2026-07-28 (wersja 3 handoffu): na mobile geometrii z wideo NIE dostaje NIKT.
   Karty We-know i ostra kopia handoffu mają wymiary z CSS (`--shape-w` + aspect-ratio
   648/641), a pozycję z flow sekcji — patrz komentarz przy `.feature-shape_component`
   w bloku @991. Wpisywanie im SHAPE_DIMS przez GSAP rozjeżdżałoby te dwa źródła. */
/* MOMENT HANDOFFU (progress fazy CONTENT) — jedno źródło dla setShapeState, końca dojazdu
   kadru i długości fazy trzymania. Mobile ma własną wartość, bo kształt w klatkach wideo
   dojeżdża później niż zakładał desktopowy 0,93 (pomiar: CONFIG.howItWorks.mobile). */
const handoffAt = () => {
  const m = CONFIG.howItWorks.mobile;
  return isMobile() && m.showAt != null ? m.showAt : CONFIG.featureShape.showAt;
};

const shapeDimSel = () =>
  isMobile() ? "" : ".feature-shape_component, .home-we-know_shape";

function computeShapeDims() {
  const f = CONFIG.featureShape.frame;
  let s;

  if (isMobile()) {
    /* MOBILE≤991 — kierunek liczenia ODWRÓCONY względem desktopu.
       Desktop: skala bierze się z cover-a wideo, kształt z niej wynika.
       Mobile:  kształt jest DANY z designu (89.33vw, dolna krawędź na gutterze
       20/375 ekranu — 4473:6199), a skala wideo z niego WYNIKA. Wideo robi się
       węższe/niższe niż ekran — pas nad nim wypełnia deep-green z
       .home-how-it-works_media (style.css @991), szew rozpuszcza nakładka gradientu
       (.home-how-it-works_video-fade, applyTopFade). */
    /* ⚠️ SZEROKOŚĆ LAYOUTU, nie innerWidth (2026-07-28). Kształt handoffu musi nakryć się
       1:1 z kartą 1 We-know, a ta ma `width: 100%` kontenera = szerokość LAYOUTU.
       `innerWidth` wlicza klasyczny pasek przewijania (macOS w iframe, Windows) → przy
       15 px paska nakładka wychodziła o 14 px większa i butelka skakała na krawędzi apli
       (zmierzone: dH −14, dBottleW −8). Na telefonie obie liczby są równe. */
    const vwPx = document.documentElement.clientWidth || window.innerWidth;
    const fs = CONFIG.featureShape;
    const inset = vwPx * fs.mobileInsetFrac;

    /* szerokość kształtu: pełna tylko TELEFON W PIONIE; tablet i poziom → ułamek
       + sufit od wysokości ekranu (patrz CONFIG.featureShape → ROZMIAR per ORIENTACJA) */
    /* matchMedia, nie porównanie liczby: media query liczy szerokość layoutu (bez paska
       przewijania) DOKŁADNIE tak, jak reguły ≤767 w style.css → jedna semantyka progu. */
    const phonePortrait = window.matchMedia(
      `(max-width: ${fs.phoneMaxWidth}px) and (orientation: portrait)`
    ).matches;
    const wPortrait = vwPx - 2 * inset;
    const shapeW = phonePortrait
      ? wPortrait
      : Math.min(fs.tabletFrac * wPortrait,
                 fs.tabletMaxVh * window.innerHeight * (f.shapeW / f.shapeH));

    s = shapeW / f.shapeW;
    SHAPE_DIMS.w = f.shapeW * s;
    SHAPE_DIMS.h = f.shapeH * s;
    /* JEDNO ŹRÓDŁO SZEROKOŚCI dla JS i CSS: karty We-know czytają `--shape-w`
       (style.css @991). Bez tego karta (width:100% kontenera) i nakładka (SHAPE_DIMS)
       rozjeżdżałyby się przy każdej zmianie zasad rozmiaru — a handoff stoi na tym,
       że nakrywają się 1:1. */
    document.documentElement.style.setProperty("--shape-w", SHAPE_DIMS.w.toFixed(2) + "px");
    /* hak dla CSS: kształt ZMNIEJSZONY (tablet / poziom) → kolumna tekstu jest znacznie
       szersza niż karta, więc teksty We-know centrujemy (decyzja Tomka 2026-07-28).
       Klasa na <html>, żeby dało się nią sterować układem w dowolnej sekcji. */
    document.documentElement.classList.toggle("is-shape-compact", !phonePortrait);
    SHAPE_DIMS.dx = 0;                                                  // wyśrodkowany w poziomie
    SHAPE_DIMS.dy = window.innerHeight / 2 - inset - SHAPE_DIMS.h / 2;  // dolna krawędź = gutter od dołu

    /* Kadr wideo = interpolacja między DWOMA JAWNYMI BOKSAMI, nie transform elementu.
       ⚠️ Dlaczego nie transform (błąd z pierwszego podejścia w home-part1): wideo ma
       object-fit, które przycina treść do BOXA elementu — skalowanie elementu zwężało
       też okno na wideo (zielone pasy po bokach). Tu element dostaje dokładne
       width/height (aspekt klatki zachowany → `fill` nie zniekształca):
         stan 0 (cover): klatka wypełnia ekran, wyśrodkowana
         stan 1 (fit):   skala taka, że shape ma 89.33vw i siedzi na dolnym gutterze
       RESIZE-FIX: boksy przeliczane TUTAJ przy każdym refreshInit (computeShapeDims),
       a applyVideoFit renderuje z aktualnego progresu — wartości zawsze świeże. */
    const sCover = Math.max(vwPx / f.w, window.innerHeight / f.h);
    VIDEO_FIT.w0 = f.w * sCover;
    VIDEO_FIT.h0 = f.h * sCover;
    VIDEO_FIT.l0 = (vwPx - VIDEO_FIT.w0) / 2;
    VIDEO_FIT.t0 = (window.innerHeight - VIDEO_FIT.h0) / 2;
    VIDEO_FIT.w1 = f.w * s;
    VIDEO_FIT.h1 = f.h * s;
    VIDEO_FIT.l1 = vwPx / 2 + SHAPE_DIMS.dx - f.shapeCx * s;
    VIDEO_FIT.t1 = window.innerHeight / 2 + SHAPE_DIMS.dy - f.shapeCy * s;
  } else {
    document.documentElement.classList.remove("is-shape-compact"); // hak dotyczy tylko pasma mobile
    s = Math.max(window.innerWidth / f.w, window.innerHeight / f.h); // cover scale
    SHAPE_DIMS.w = f.shapeW * s;
    SHAPE_DIMS.h = f.shapeH * s;
    SHAPE_DIMS.dx = (f.shapeCx - f.w / 2) * s; // offset środka kształtu od środka viewportu
    SHAPE_DIMS.dy = (f.shapeCy - f.h / 2) * s;
  }
}

/* Kadr wideo na mobile — INTERPOLOWANY (p = 0 cover … 1 kadr zgrany z kształtem).
   Nakładka gradientu (.home-how-it-works_video-fade) narasta razem z p — szew nad wideo
   POWSTAJE dopiero przy zjeździe, przy coverze nie ma czego rozpuszczać.
   Desktop: czyścimy inline i wracamy do czystego CSS-owego object-fit: cover. */
const VIDEO_FIT = { w0: 0, h0: 0, l0: 0, t0: 0, w1: 0, h1: 0, l1: 0, t1: 0, p: 0 };

function applyVideoFit(p) {
  const video = q(".home-how-it-works_video");
  if (!video) return;
  if (!isMobile()) {                       // desktop wraca do CSS-owego cover
    video.style.cssText = "";
    const fadeEl = q(".home-how-it-works_video-fade");
    if (fadeEl) { fadeEl.style.height = "0px"; fadeEl.style.opacity = "0"; }
    return;
  }

  const F = VIDEO_FIT;
  F.p = p = Math.min(1, Math.max(0, p));
  const lerp = (a, b) => a + (b - a) * p;
  video.style.width = lerp(F.w0, F.w1).toFixed(2) + "px";
  video.style.height = lerp(F.h0, F.h1).toFixed(2) + "px";
  video.style.left = lerp(F.l0, F.l1).toFixed(2) + "px";
  video.style.top = lerp(F.t0, F.t1).toFixed(2) + "px";
  applyTopFade();
}

/* NAKŁADKA GRADIENTU NAD WIDEO (2026-07-28) — od góry kadru mediów do
   `mobileTopFadeFrac` wysokości wideo; krycie narasta z dojazdem kadru.
   ⚠️ Wysokość liczona z REALNEGO rect-a wideo, nie z VIDEO_FIT — wideo dostaje jeszcze
   transform `y` w handoffie (jedzie w górę razem z kształtem), a nakładka musi trzymać
   się jego górnej krawędzi. Dlatego wołana też z onUpdate handoffu. */
function applyTopFade() {
  const fade = q(".home-how-it-works_video-fade");
  const video = q(".home-how-it-works_video");
  const media = q(".home-how-it-works_media");
  if (!fade || !video || !media) return;
  if (!isMobile()) { fade.style.height = "0px"; fade.style.opacity = "0"; return; }

  const v = video.getBoundingClientRect();
  const m = media.getBoundingClientRect();
  const h = (v.top - m.top) + v.height * CONFIG.featureShape.mobileTopFadeFrac;
  fade.style.height = Math.max(0, h).toFixed(1) + "px";
  fade.style.opacity = VIDEO_FIT.p.toFixed(3);
}

/* hooki do LEKKIEGO RELAYOUTU (bez ScrollTrigger.refresh) — ustawiane przy inicie sekcji.
   Potrzebne, bo applyMask żyje w zamknięciu initHowItWorks (czyta świeże wymiary). */
const RELAYOUT = { applyMask: null, invalidate: null };

/* GEOMETRIA BAZOWA — kanały, których NIE animuje żaden tween (width/height kształtów,
   y kopii nieanimowanych, szerokość butelek). Jedno miejsce, dwóch konsumentów:
   refreshInit (pełny refresh) i relayoutViewportHeight (lekki relayout wysokości). */
function applyBaseGeometry() {
  /* MOBILE≤991: karty We-know są statyczne (wymiary z CSS), a ich butelki skalują się od
     szerokości KARTY — liczy je layoutBottles (initWeKnowMobile). Wpisanie im SHAPE_DIMS
     zdmuchnęłoby stack z artboardu 5177:3237.
     ALE fixed overlay ZOSTAJE geometrią z wideo: od 2026-07-28 gra też na mobile jako
     kształt handoffu 1:1 z ostatnią klatką (patrz CONFIG.weKnow.mobile → HANDOFF).
     `y` overlaya NIE jest tu ustawiane — animuje je tween handoffu (fromTo z wartościami
     funkcyjnymi + invalidateOnRefresh), więc po refreshu i tak wyląduje świeże. */
  if (isMobile()) return;
  gsap.set(qa(".feature-shape_component, .home-we-know_shape"), {
    width: SHAPE_DIMS.w, height: SHAPE_DIMS.h,
  });
  // y bazowe: fixed + weShape (NIE animowane; aplaShape ma własny fromTo z kontr-transformem)
  gsap.set(qa(".feature-shape_component, .home-we-know_shape:not(.is-in-apla)"), {
    y: SHAPE_DIMS.dy,
  });
  gsap.set(qa(".feature-shape_bottle"), {
    width: SHAPE_DIMS.w * CONFIG.weKnow.bottleScale,
  });
}

/* ============================================================
   LEKKI RELAYOUT WYSOKOŚCI (2026-07-28, zgłoszenie Tomka: „przy skalowaniu ekranu
   powstaje pusta przestrzeń pod wideo")
   ------------------------------------------------------------
   PRZYCZYNA: ScrollTrigger pinując wpisuje przypiętemu elementowi WYSOKOŚĆ W PX
   (inline). Guard resize'a (niżej) świadomie POŁYKA zmiany samej wysokości < 160 px
   w kontekście dotykowym — pasek adresu na telefonie, ale TAK SAMO tryb device
   w DevTools (`ScrollTrigger.isTouch === 1`). Bez refresha pin zostaje na starej
   wysokości → pod wideo zostaje pusty pas (zmierzone: 844→950 px = dziura 106 px,
   TRWAŁA, nie przelotna).

   ROZWIĄZANIE: nie robimy pełnego refresha (przeliczyłby start/end pinu i szarpnął
   choreografią — dokładnie to, czego guard ma unikać), tylko dociągamy SAME BOKSY:
   wysokość pinu, geometrię bazową, kadr wideo i maskę — z zachowanym progresem.
   Świadomie NIE ruszamy pin-spacera ani start/end: długość scrolla sekcji zostaje
   policzona ze starej wysokości, więc choreografia nie skacze pod palcem.
   ============================================================ */
function relayoutViewportHeight() {
  const pin = q(".home-how-it-works_pin");
  /* ⚠️ ScrollTrigger pinując wpisuje inline PARĘ `height` + `max-height` (oba w px).
     Ustawienie samego `height` nic nie daje — stary `max-height` przycina element
     i dziura zostaje (zmierzone: inline height 1000px, computed 900px). */
  if (pin && pin.style.height) {
    pin.style.height = window.innerHeight + "px";
    if (pin.style.maxHeight) pin.style.maxHeight = window.innerHeight + "px";
  }
  computeShapeDims();
  applyBaseGeometry();
  if (RELAYOUT.invalidate) RELAYOUT.invalidate();  // handoff jedzie po świeżych liczbach (patrz initWeKnowMobile)
  applyVideoFit(VIDEO_FIT.p);          // mobile: kadr ze świeżych boksów; desktop: czyści inline
  if (RELAYOUT.applyMask) RELAYOUT.applyMask();
}

function applyShapeDims(targets) {
  gsap.set(targets, {
    width: SHAPE_DIMS.w,
    height: SHAPE_DIMS.h,
    xPercent: -50,
    yPercent: -50,
    x: SHAPE_DIMS.dx,
    y: SHAPE_DIMS.dy,
  });
}

/* SYSTEM GLOBALNY #1 v2 (line-reveal) → _shared/reveal.js
   (REDUCED_MOTION, ensureLines, revealText, hideText, revealOnScroll
   są globalne; config: PPB.config.reveal = CONFIG.reveal) */

/* ============================================================
   LOADER
   ============================================================ */
function buildLoaderTimeline() {
  const c = CONFIG.loader;
  const loader = q(".loader_component");
  const captionL = loader.querySelector(".loader_caption.is-left");
  const captionR = loader.querySelector(".loader_caption.is-right");
  const lottieEl = loader.querySelector(".loader_lottie");

  /* LOADER = Lottie 01D (zastąpiła 2 kształty). Ruch: fade-in → zbieżność → ekspansja
     koła do deep-green cover. Klatki 480→620 (comp op 721). Dane inline window.LOADER_01D
     (loader-01d.js), lib lottie-web (CDN). Odtwarzane przez SCRUB klatek w GSAP
     (ease:none = natywne tempo Lottie) → zachowany overlap z hero + fade loadera. */
  /* ⚡ FIX SAFARI (2026-07-28) — renderer CANVAS zamiast SVG.
     Animacja 01D ma TRACK MATTE (warstwa "S": tt:2 = alpha inverted matte).
     Renderer SVG realizuje to przez <mask> PLUS filtr SVG <feComponentTransfer>
     na <g> pokrywającym CAŁY viewport → WebKit filtruje ~6,5 Mpx CO KLATKĘ na CPU
     (~167 ms/klatkę = ~6 fps przez cały scrub). Renderer canvas robi matte przez
     globalCompositeOperation — zero filtrów. Pomiar: 25 fps → 57 fps.
     Szczegóły: _code/home-perf-safari/PERF-SAFARI.md */
  const LO_START = 0, LO_END = 140;   // klatki LOTTIE (0-based, 0..241); 0=comp480 (start), 140=comp620 (green cover)
  const LOADER_CLEANUP = [];          // listenery do zdjęcia po zniknięciu loadera
  let anim = null;
  if (window.lottie && window.LOADER_01D && lottieEl) {
    anim = lottie.loadAnimation({
      container: lottieEl,
      renderer: "canvas",
      loop: false,
      autoplay: false,
      animationData: window.LOADER_01D,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
        clearCanvas: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),   // sufit 2× — powyżej to czysty koszt
      },
    });
    anim.goToAndStop(LO_START, true);

    /* ⚠️ canvas NIE reflowuje się sam (SVG skalował się przez viewBox).
       Przy zmianie okna trzeba przeliczyć bitmapę i przerysować bieżącą klatkę —
       istotne przy pasku adresu na mobile, który potrafi strzelić resize
       w oknie życia loadera. Spójne z paczką „przeliczanie przy RESIZE". */
    var _loResize = function () {
      if (!anim) return;
      anim.resize();
      anim.goToAndStop(p.f, true);
    };
    window.addEventListener("resize", _loResize);
    LOADER_CLEANUP.push(function () { window.removeEventListener("resize", _loResize); });
  }
  const p = { f: LO_START };
  const renderLottie = () => { if (anim) anim.goToAndStop(p.f, true); };

  const tl = gsap.timeline({ delay: c.holdStart });

  tl.addLabel("go")
    .to(captionL, { top: "50%", yPercent: -50, duration: c.converge, ease: CONFIG.ease.main }, "go")
    .to(captionR, { bottom: "50%", yPercent: 50, duration: c.converge, ease: CONFIG.ease.main }, "go")
    .fromTo(p, { f: LO_START }, { f: LO_END, duration: (LO_END - LO_START) / 60, ease: "none", onUpdate: renderLottie }, "go")
    // holdFull = oddech na pełnym kolorze; potem fade całego loadera → odsłania hero
    .to(loader, { autoAlpha: 0, duration: c.fadeOut, ease: c.fadeOutEase }, `+=${c.holdFull}`)
    .set(loader, { display: "none" })
    /* BUG FIX 2026-07-28: chowanie loadera NA STAŁE musi iść poza GSAP.
       `.set(display:"none")` wyżej jest inline'em GSAP, więc ctx.revert() przy
       wyjściu z home cofał je i loader wracał. Klasa przeżywa revert.
       Flaga globalna dokłada pas bezpieczeństwa dla powrotów na stronę. */
    .call(function () {
      loader.classList.add("is-done");
      PPB.loaderDone = true;
    })
    // frost: po zdjęciu loadera hero jest JUŻ namalowane — deterministyczny
    // rebuild warstw backdrop-filter nava (stale snapshot, patrz nav-menu.js)
    .call(function () { if (window.PPB && PPB.kickNavBackdrop) PPB.kickNavBackdrop(); })
    /* loader zrobił swoje — zwolnij canvas Lottie i listenery.
       Canvas @2× na pełny ekran to ~13 MB bitmapy; trzymanie go do końca
       sesji to darmowy memory pressure w Safari. */
    .call(function () {
      LOADER_CLEANUP.forEach(function (fn) { try { fn(); } catch (e) {} });
      LOADER_CLEANUP.length = 0;
      if (anim) { try { anim.destroy(); } catch (e) {} anim = null; }
    });

  return tl;
}

/* ============================================================
   HERO — reveal po loaderze
   ============================================================ */
function buildHeroReveal() {
  const h = CONFIG.heroReveal;
  const tl = gsap.timeline();

  // tło w zbliżeniu JUŻ POD loaderem (set przy budowie master) — zero skoku przy fade-oucie loadera
  gsap.set(".home-hero_background", { scale: h.bgScaleFrom });

  // HERO — DOM line-reveal nagłówka + podtytułu (po loaderze). Water effect usunięty (archiwum).
  // "<" kolejnych tweenów (UI, bg-scale) referuje start tego reveala → timing 1:1 jak wcześniej.
  tl.add(revealText(gsap.utils.toArray('.home-hero_component [data-reveal="text"]')), 0);
  /* UI (nav + strzałka + Get in touch): start ZBLUROWANY → odblurowanie.
     Timing 1:1 z pierwszym tekstem: ten sam start ("<"), duration i ease.
     clearProps po animacji OBOWIĄZKOWE: blur(0px) to wciąż aktywny filter —
     tworzy backdrop-root i psuje backdrop-filter w nav/CTA na stałe */
  /* BARBA: selektor-string byłby scope'owany przez gsap.context() do kontenera
     strony, a nav leży POZA nim (site-level) — nav zostałby na autoAlpha 0
     z FOUC guarda [data-reveal] i byłby NIEWIDOCZNY. Stąd jawna lista elementów
     z obu światów zamiast stringa. */
  tl.fromTo(
    uiRevealTargets(),
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      duration: CONFIG.reveal.duration,
      ease: CONFIG.reveal.ease,
    },
    "<"
  );
  // tło (Unicorn): scale 1.1 → 1 — ten sam start co pierwszy tekst, lekko dłużej, sine.out
  // (scale ≠ yPercent parallaxu — osobne kanały, zero konfliktu ze scrubem)
  tl.to(".home-hero_background", {
    scale: 1,
    duration: h.bgScaleDuration,
    ease: h.bgScaleEase,
  }, "<");

  return tl;
}

/* ============================================================
   HERO — parallax tła + scrub fade-out tekstu
   ============================================================ */
function initHeroScroll() {
  gsap.to(".home-hero_background", {
    yPercent: CONFIG.heroParallax.shift,
    ease: "none",
    scrollTrigger: {
      trigger: ".is-home-hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  // overlay na Unicorn — narasta wraz ze scrollem hero
  gsap.to(".home-hero_overlay", {
    opacity: CONFIG.heroOverlay.max,
    ease: "none",
    scrollTrigger: {
      trigger: ".is-home-hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  /* wyjście tekstu hero — ZWYKŁY fade opacity na scrollu (bez ruchu linii).
     2026-07-27 MOBILE≤991: cel = .home-hero_copy (wrapper WOKÓŁ heading+subtitle),
     nie cały komponent — CTA „Get in touch" siedzi teraz W komponencie (index.html)
     i ma własny, późniejszy trigger; fade komponentu gasiłby je za wcześnie.
     ⚠️ NIE celować w heading/subtitle wprost: mają FOUC guard [data-reveal]
     (scrub nagrałby opacity 0 z guarda — szczegóły w home-part1). */
  /* MOBILE≤991: hero NIE reaguje na scroll — blok tekstu po prostu odjeżdża
     razem z sekcją, bez scrubowanego fade'u (decyzja z home-part1). */
  if (!isMobile()) {
    gsap.to(".home-hero_copy", {
      autoAlpha: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".is-home-hero",
        start: CONFIG.heroTextOut.fadeStart,
        end: CONFIG.heroTextOut.fadeEnd,
        scrub: true,
      },
    });
  }

  /* strzałka scrolla — znika na SINGLE TRIGGER przy pierwszym ruchu (zwykłe
     opacity, dwukierunkowo — wraca przy powrocie na samą górę); paczka 3 */
  const heroFadeTargets = () => isMobile()
    ? [".home-hero_arrow"]
    : [".home-hero_arrow", ".contact-cta_component"];
  ScrollTrigger.create({
    trigger: ".is-home-how-it-works",   // znikają dopiero gdy NASTĘPNA sekcja wjeżdża (top 65%)
    start: "top 65%",
    /* MOBILE≤991 (2026-07-28, zgłoszenie Tomka): „Get in touch" NIE gaśnie na scrollu.
       Na desktopie ta pigułka jest przyklejona do prawego dolnego rogu (`position:
       absolute`), więc zostałaby na ekranie na zawsze — dlatego trzeba ją zgasić.
       Na mobile blok ≤991 przestawia ją na `position: static`, czyli siedzi w zwykłym
       flow pod podtytułem hero i odjeżdża ze scrollem sama. Gaszenie jej tutaj znaczyło
       więc tylko tyle, że znikała NA OCZACH użytkownika, wciąż będąc w kadrze.
       Strzałka scrolla zostaje na obu warstwach — ta jest `absolute` też na mobile. */
    onEnter: () => gsap.to(heroFadeTargets(), { autoAlpha: 0, duration: 0.3, ease: "power1.out", overwrite: "auto" }),
    onLeaveBack: () => gsap.to(heroFadeTargets(), { autoAlpha: 1, duration: 0.4, ease: CONFIG.reveal.ease, overwrite: "auto" }),
  });

  /* strzałka hero → smooth-scroll do momentu, gdy „pure play" jest w pełni widoczne
     (górna krawędź sekcji How it works na górze viewportu). */
  const heroArrow = q(".home-hero_arrow");
  const hiwSection = q(".is-home-how-it-works");
  if (heroArrow && hiwSection) {
    heroArrow.style.cursor = "pointer";
    heroArrow.addEventListener("click", () => {
      const y = hiwSection.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  }
}

/* ============================================================
   STATS — pokazywanie/chowanie (rewersyjne)
   linia rośnie + stagger fade tekstów pod nią
   ============================================================ */
/* MOBILE≤991 (2026-07-27): trzeci stat jest wygaszony CSS-em (display:none, @991).
   SplitText na display:none zwraca zerowe linie, więc taki stat trzeba pominąć
   ZANIM trafi do reveala. Czytamy computed display, nie offsetParent — pin
   ScrollTriggera potrafi wrzucić przodka w position:fixed i wyzerować offsetParent. */
function liveStats(setEl) {
  return Array.from(setEl.querySelectorAll(".home-how-it-works_stat"))
    .filter((stat) => getComputedStyle(stat).display !== "none");
}
function liveStatParts(setEl, sel) {
  return liveStats(setEl).flatMap((stat) => Array.from(stat.querySelectorAll(sel)));
}

function showStats(setEl) {
  // ubij ewentualny hide w locie na tym secie (symetrycznie do hideStats)
  if (setEl._hideTl) { setEl._hideTl.kill(); setEl._hideTl = null; }
  const s = CONFIG.stats;
  const tl = gsap.timeline();
  liveStats(setEl).forEach((stat, i) => {
    const line = stat.querySelector(".home-how-it-works_stat-line");
    const texts = stat.querySelectorAll(".home-how-it-works_stat-label, .home-how-it-works_stat-value");
    // linia rośnie (efekt własny statsów) + teksty przez GLOBALNY line-reveal
    tl.to(line, { scaleX: 1, duration: s.lineDuration, ease: CONFIG.ease.out, overwrite: "auto" }, i * s.statStagger)
      .add(revealText(texts, { stagger: 0.12 }), i * s.statStagger + s.textDelay);
  });
  setEl._showTl = tl;   // zapamiętaj — hideStats musi móc go ubić (patrz niżej)
  return tl;
}

function hideStats(setEl) {
  /* SEDNO fixu resztek: timeline showStats ma OPÓŹNIONE .add(revealText, delay) — jeśli go
     nie ubijemy, po hide odpali reveal późniejszego statu (np. EMA·FDA) i tekst zostanie.
     Kill zatrzymuje zaplanowane reveale ZANIM powstaną. */
  if (setEl._showTl) { setEl._showTl.kill(); setEl._showTl = null; }
  const lines = liveStatParts(setEl, ".home-how-it-works_stat-line");
  const texts = liveStatParts(setEl, ".home-how-it-works_stat-label, .home-how-it-works_stat-value");
  const tl = gsap.timeline()
    .add(hideText(texts, { stagger: 0 }), 0)
    // linie chowają się w rytmie globalnego hide (sync z tekstami)
    .to(lines, { scaleX: 0, duration: CONFIG.reveal.hide.duration, ease: CONFIG.reveal.hide.ease, overwrite: "auto" }, 0);
  setEl._hideTl = tl;
  return tl;
}

/* ============================================================
   PINNED FLOW: How it works → Section-1 → Section-End
   ============================================================ */
function initHowItWorks() {
  const c = CONFIG.howItWorks;
  const section = q(".is-home-how-it-works");
  const pin = section.querySelector(".home-how-it-works_pin");
  const media = section.querySelector(".home-how-it-works_media");
  const video = section.querySelector(".home-how-it-works_video");
  /* scrub przez currentTime po HTTP renderuje tylko 1. klatkę (seek do niebuforowanego zakresu).
     Wczytujemy plik do PAMIĘCI (blob) → seek natychmiastowy, scrub działa też na hostingu. */
  (function preloadVideoBlob() {
    const src = video && video.getAttribute("src");
    if (!src || src.indexOf("blob:") === 0) return;
    fetch(src).then((r) => r.blob()).then((b) => { video.src = URL.createObjectURL(b); video.load(); }).catch(() => {});
  })();
  const header = section.querySelector(".home-how-it-works_header");
  const set1 = section.querySelector(".home-how-it-works_stats.is-set-1");
  const set2 = section.querySelector(".home-how-it-works_stats.is-set-2");
  const whatWeDo = section.querySelector(".home-how-it-works_what-we-do");
  // reveal/hide na JAWNYCH elementach tekstu (label + heading), jedną listą — gwarantuje,
  // że label z kropką i heading znikają/pojawiają się ZAWSZE tak samo (split kontenera
  // z mieszanymi blokami potrafił pominąć linię label przy hide).
  const whatWeDoTexts = [
    whatWeDo.querySelector(".home-how-it-works_label"),
    whatWeDo.querySelector(".home-how-it-works_label-heading"),
  ];
  const darkOverlay = section.querySelector(".home-how-it-works_dark-overlay");

  const total = c.contentViewports + c.overlapViewports;
  const contentPortion = c.contentViewports / total;

  /* --- stany startowe statsów (ukryte, JS steruje) --- */
  gsap.set(section.querySelectorAll(".home-how-it-works_stat-line"), { scaleX: 0 });
  gsap.set(section.querySelectorAll(".home-how-it-works_stat-label, .home-how-it-works_stat-value"), { autoAlpha: 0 });
  gsap.set(whatWeDo, { autoAlpha: 0 });

  /* MOBILE≤991 (2026-07-27): desktopowe <br> w nagłówku dają na 375 pięć linii zamiast
     czterech z artboardu (4473:6118). Zdejmujemy je ZANIM SplitText podzieli tekst —
     po splicie za późno (kontener przebudowany, CSS na <br> nic nie zmienia). */
  if (isMobile()) {
    section.querySelectorAll(".home-how-it-works_heading br").forEach((br) => br.replaceWith(" "));
  }

  /* --- wejście tekstu "Your pure-play…" — GLOBALNY line-reveal, DWUKIERUNKOWO:
         scroll w górę poza viewport chowa (onLeaveBack), ponowny scroll w dół
         odpala reveal OD NOWA (decyzja Tomka 2026-07-19); punkt: c.textStart --- */
  revealOnScroll(section, '[data-reveal="hiw-text"]', { start: c.textStart, bidirectional: true });

  /* --- nawias [ — na reveal ROŚNIE (scaleY 0→1 z środka) + fade, dwukierunkowo, ten sam próg co hiw-text.
         Wydzielony z grupy hiw-text (data-reveal="hiw-bracket"), więc revealText go nie rusza. --- */
  const brackets = section.querySelectorAll(".home-how-it-works_bracket");
  if (brackets.length) {
    const R = CONFIG.reveal;
    gsap.set(brackets, { autoAlpha: 0, scaleY: 0 });
    ScrollTrigger.create({
      trigger: section, start: c.textStart,
      onEnter: () => gsap.to(brackets, { autoAlpha: 1, scaleY: 1, duration: R.duration, ease: R.ease, overwrite: "auto" }),
      onLeaveBack: () => gsap.to(brackets, { autoAlpha: 0, scaleY: 0, duration: R.hide.duration, ease: R.hide.ease, overwrite: "auto" }),
    });
  }

  /* --- state machine statsów — REWERSYJNA --------------------------------
     MOBILE≤991 (2026-07-27): stan to PARA { wwd, set }, nie jedna liczba, bo desktop
     i mobile inaczej wiążą WHAT WE DO ze statsami:
       desktop  WHAT WE DO pojawia się RAZEM z set-1 i zostaje przez swap na set-2
       mobile   WHAT WE DO jest osobnym, PIERWSZYM taktem i znika, gdy wchodzi set-1
     Rozdzielenie tych dwóch osi to jedyna zmiana; przejścia (hide/show) zostają. */
  let statsState = { wwd: false, set: 0 };
  function setStatsState(next) {
    if (next.wwd === statsState.wwd && next.set === statsState.set) return;

    if (next.set !== statsState.set) {
      if (statsState.set === 1) hideStats(set1);
      if (statsState.set === 2) hideStats(set2);
      if (next.set === 1) showStats(set1);
      if (next.set === 2) showStats(set2);
    }

    // WHAT WE DO — label (z kropką) + heading znikają/pojawiają się razem, tą samą listą.
    // Kontener trzymamy widoczny; pokazywaniem/chowaniem steruje maska linii (rv-line).
    if (next.wwd !== statsState.wwd) {
      if (next.wwd) {
        gsap.set(whatWeDo, { autoAlpha: 1 });
        revealText(whatWeDoTexts, { duration: 0.35 }); // szybszy wjazd (było 0.45)
      } else {
        /* DOMKNIĘCIE STANU UKRYTEGO (2026-07-28, zgłoszenie Tomka: „czasami zostaje
           ostatnia linia «concept to end market»").
           Chowanie robi maska linii (`.rv-line` + transform na `.rv-line-in`) i samo
           w sobie jest poprawne — zmierzone: wszystkie trzy linie dostają ten sam
           transform 36,06 px przy masce 32,87 px, więc żadna nie ma prawa wystawać.
           Problem jest więc w MOMENCIE wywołania: ten stan przełącza się ze
           scrubowanego `onUpdate`, na mobile bez kisielu (`rawScrub`), więc przy
           powolnym scrollu wokół progu `whatWeDoIn` reveal i hide potrafią się
           przeplatać, a `overwrite: "auto"` rozstrzyga to zależnie od kolejności.
           Nie zgaduję, która to kolejność — zamiast tego domykam SKUTEK: po
           zakończeniu chowania kontener gaśnie, więc cokolwiek zostałoby w środku,
           i tak nie jest widoczne. Wyglądu to nie zmienia, bo fade leci DOPIERO gdy
           linie są już pod maską; jeśli hide zostanie przerwany revealem, `onComplete`
           nie odpali, a reveal i tak ustawia `autoAlpha: 1` na wejściu. */
        const tw = hideText(whatWeDoTexts, { stagger: 0 });
        // hideText nie przepuszcza callbacków — podpinamy do zwracanego tweenu,
        // zamiast rozszerzać wspólne _shared/reveal.js o parametr dla jednego miejsca
        if (tw && tw.eventCallback) {
          tw.eventCallback("onComplete", () => {
            if (!statsState.wwd) gsap.set(whatWeDo, { autoAlpha: 0 });
          });
        }
      }
    }
    statsState = next;
  }

  /* mapowanie progressu fazy CONTENT na stan — jedyne miejsce, gdzie takty
     desktopu i mobile się rozjeżdżają (progi: CONFIG.howItWorks.mobile) */
  function stageFor(pc) {
    if (isMobile()) {
      const m = c.mobile;
      if (pc >= m.set2In) return { wwd: false, set: 2 };    // takt 3: dwa staty u GÓRY
      if (pc >= m.set1In) return { wwd: false, set: 1 };    // takt 2: dwa staty u DOŁU
      if (pc >= m.whatWeDoIn) return { wwd: true, set: 0 }; // takt 1: WHAT WE DO samo
      return { wwd: false, set: 0 };
    }
    if (pc >= c.statsSwap) return { wwd: true, set: 2 };
    if (pc >= c.statsIn) return { wwd: true, set: 1 };
    return { wwd: false, set: 0 };
  }

  /* --- feature shape: pojawia się na końcu wideo (rewersyjnie) ---
     MOBILE≤991 v5: celem jest CAŁA warstwa `.feature-shape_layer` (ostra + rozmyta kopia
     razem), a nie sama ostra kopia. Warstwa powstaje w initWeKnowMobile, czyli PO tej
     funkcji — dlatego szukamy jej leniwie, przy każdym wywołaniu. */
  const shapeEl = () => q(".feature-shape_layer")
    || q(".feature-shape_component");
  let shapeShown = false;
  function setShapeState(pc) {
    if (pc >= handoffAt() && !shapeShown) {
      shapeShown = true;
      gsap.to(shapeEl(), { autoAlpha: 1, duration: 0.5, ease: CONFIG.ease.out, overwrite: "auto" });
    } else if (pc < handoffAt() && shapeShown) {
      shapeShown = false;
      gsap.to(shapeEl(), { autoAlpha: 0, duration: 0.3, ease: "power1.in", overwrite: "auto" });
    }
  }

  /* --- progress handler: stany statsów + shape + dark overlay (surowy scroll) ---
     UWAGA: wideo NIE jest tu — jedzie z wygładzonego timeline (proxy), żeby było "kisielowate" */
  function handleProgress(p) {
    const pc = Math.min(p / contentPortion, 1); // progress fazy CONTENT

    setStatsState(stageFor(pc));
    setShapeState(pc);

    // overlap: ciemny overlay narasta + WHAT WE DO i stats idą lekko do góry (scrub)
    const po = gsap.utils.clamp(0, 1, (p - contentPortion) / (1 - contentPortion));
    gsap.set(darkOverlay, { autoAlpha: po * c.overlayMaxAlpha });
    gsap.set([set1, set2, whatWeDo], { y: -po * c.overlapShift });
  }

  /* --- pin + scrub (z wygładzeniem — "kisiel") --- */
  const expandDur = c.expandPortion * contentPortion; // w skali całego pinu

  // MASKA (diament): startowy bok w px + peek z dołu; end = overshoot (pełne odsłonięcie viewportu).
  // Rotacja jest w SVG → nie animujemy jej. Wideo pod spodem zostaje pełnoekranowe.
  /* RESIZE-FIX (2026-07-27, home-rwd-resize-1): wymiary maski liczone NA ŻYWO przy każdym
     renderze (funkcje), nie raz przy inicie. Proxy trzyma tylko PROGRES 0→1; px wynikowe =
     interpolacja świeżych start/end w applyMask. Rem czytany przy wywołaniu, bo fluid root
     zmienia go przy KAŻDYM resize (także samej wysokości — sufit 2vh). Po refresh (resize)
     maska przerysowuje się z nowych wymiarów bez zmiany progresu. */
  const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  // MOBILE≤991: 32rem to na 375-ce więcej niż szerokość ekranu — mobile ma własny start
  // (21rem ≈ 335px z artboardu 4473:6118); wartość funkcyjna = świeża przy każdym renderze
  const maskStartPx = () => (isMobile() ? c.mobile.maskStart : c.maskStart) * remPx();
  const maskEndPx = () => (window.innerWidth + window.innerHeight) * 1.6; // z zapasem → diament > viewport
  const maskPeekPx = () => window.innerHeight * c.maskPeek;
  const maskProxy = { p: 0 }; // 0 = peek/start, 1 = pełne odsłonięcie
  const MASK_AR = 810 / 851; // proporcje diamentu z Figmy — radius rośnie proporcjonalnie z kształtem
  function applyMask() {
    const size = gsap.utils.interpolate(maskStartPx(), maskEndPx(), maskProxy.p);
    const offY = maskPeekPx() * (1 - maskProxy.p);
    const sz = `${size}px ${size * MASK_AR}px`;
    media.style.webkitMaskSize = sz;
    media.style.maskSize = sz;
    const pos = `center calc(50% + ${offY}px)`;
    media.style.webkitMaskPosition = pos;
    media.style.maskPosition = pos;
  }
  applyMask();
  RELAYOUT.applyMask = applyMask;                       // hook dla lekkiego relayoutu wysokości
  ScrollTrigger.addEventListener("refresh", applyMask); // po resize: to samo p, świeże px
  // MOBILE≤991: kadr wideo po refresh — te same świeże boksy (computeShapeDims w refreshInit),
  // ten sam progres dojazdu (VIDEO_FIT.p); na desktopie applyVideoFit tylko czyści inline
  ScrollTrigger.addEventListener("refresh", () => applyVideoFit(VIDEO_FIT.p));

  /* MOBILE≤991 v4 (2026-07-28, spec Tomka): pin robi CSS (`position: sticky` w style.css),
     nie GSAP. Bez pin-spacera trzeba jawnie podać wysokość sekcji.
     ⚠️ ARYTMETYKA STICKY: element trzyma się przez `wysokośćSekcji − 100vh`, więc żeby
     trzymał TYLE SAMO co dawny pin (total × 100vh), sekcja musi mieć o 100vh więcej.
     Efekt uboczny jest tu pożądany: sticky zwalnia się dokładnie w chwili, gdy krawędź
     apli dociera do góry ekranu (We-know ma margin-top −100vh) — czyli kształt zwalnia
     się równo ze swoim slotem i dalej jedzie z sekcją, bez przełączania w JS. */
  const cssSticky = isMobile();
  section.style.height = cssSticky ? `${(total + c.overlapViewports) * 100}vh` : "";

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: `+=${total * 100}%`,
      pin: cssSticky ? false : pin,
      /* ============ JEDEN ZEGAR NA MOBILE (2026-07-28, decyzja Tomka: wariant 1) ============
         Desktop: `scrubSmooth` (1,2 s kisielu) — klatka wideo płynie za palcem, tak jak było.
         Mobile: scrub SUROWY. Powód jest twardy, nie estetyczny: dojazd kadru wideo siedzi
         w TYM timeline (a więc pod kisielem), a kształt handoffu, jego kopie i apla są zapięte
         na sztywno do pozycji scrolla, bo muszą nakrywać się co do piksela. Dwa różne zegary
         w jednej scence = rozjazd nie do dostrojenia. Objaw zgłoszony przez Tomka: przy wejściu
         w aplę wideo z kształtem najpierw JECHAŁO W DÓŁ, a potem w górę — bo dojazd kadru
         przesuwa górną krawędź wideo o ~700 px w dół (−328 → +372 przy 375×844) i kisiel
         dociągał to jeszcze w trakcie apli; asymptotyczne dochodzenie dawało drganie.
         Knob: CONFIG.howItWorks.mobile.rawScrub (false = wróć do kisielu na mobile). */
      scrub: isMobile() && c.mobile.rawScrub ? true : CONFIG.scrubSmooth,
      onUpdate: (self) => handleProgress(self.progress),
    },
  });
  tl.scrollTrigger._ppbAnchor = true; // RESIZE-FIX: przy refresh zachowaj moment choreografii

  // DEV: licznik klatek wideo na dole ekranu (do podania dokładnego timingu wjazdów)
  let frameEl = null;
  if (c.frameCounter) {
    frameEl = document.createElement("div");
    frameEl.style.cssText = "position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;" +
      "font:12px/1 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.6);padding:5px 10px;" +
      "border-radius:6px;pointer-events:none;letter-spacing:.02em;white-space:nowrap;";
    document.body.appendChild(frameEl);
  }

  // proxy wideo — siedzi W wygładzonym timeline, więc currentTime też jest wygładzony
  const videoProxy = { p: 0 };
  function syncVideo() {
    if (video.duration) {
      video.currentTime = Math.min(videoProxy.p * video.duration, video.duration - 0.01);
      if (frameEl) {
        const fr = Math.round(video.currentTime * c.fps);
        const tot = Math.round(video.duration * c.fps);
        frameEl.textContent = `klatka ${fr} / ${tot}  ·  ${video.currentTime.toFixed(2)}s  ·  content ${(videoProxy.p * 100).toFixed(0)}%`;
      }
    }
  }

  tl.fromTo(maskProxy, { p: 0 }, {
      p: 1,                // diament rośnie do pełnego odsłonięcia + podnosi się z peeku; px liczy applyMask ze świeżych wymiarów
      ease: "none",
      duration: expandDur,
      onUpdate: applyMask,
    })
    /* wideo zostaje zwykłym fullscreenem (nie skalujemy) — rosnąca maska odsłania jego fragment.
       Desktop: scrub przez CAŁĄ fazę content. MOBILE: odtwarzanie kończy się na `videoEndAt`,
       więc od tego miejsca nie ma już ŻADNEGO ustawiania currentTime — klatka jest zamrożona
       na tej, w której kształt dojechał na miejsce (patrz pomiar klatek w CONFIG…mobile).
       To zdejmuje judder dekodera dokładnie tam, gdzie pojawia się nasza kopia. */
    .to(videoProxy, { p: 1, ease: "none", onUpdate: syncVideo,
      duration: contentPortion * (isMobile() && c.mobile.videoEndAt != null ? c.mobile.videoEndAt : 1),
    }, 0)
    // header: do góry + fade, dłuższy end (scrub — działa w dwie strony)
    .to(header, {
      autoAlpha: 0,
      y: c.headerOut.y,
      ease: "none",
      duration: expandDur * c.headerOut.portion,
    }, 0)
    .to({}, { duration: Math.max(0.001, 1 - contentPortion) }, contentPortion);

  /* MOBILE≤991 (2026-07-27): dojazd kadru wideo do kształtu — dopiero na końcu fazy
     content. Kończy się DOKŁADNIE w momencie handoffu (handoffAt = klatka, w której kształt
     w wideo już STOI — patrz pomiar klatek w CONFIG…mobile), czyli tam, gdzie pojawia się
     nasza kopia. RESIZE-FIX: proxy trzyma tylko PROGRES; px wynikowe liczy applyVideoFit
     z boksów VIDEO_FIT, które refreshInit odświeża w computeShapeDims — fromTo z jawnym
     startem, zero nagrywania „z połowy drogi". */
  if (isMobile()) {
    const fitStart = c.mobile.videoFitStart;
    const fitEnd = handoffAt();
    const fitProxy = { p: 0 };
    applyVideoFit(0);
    tl.fromTo(fitProxy, { p: 0 }, {
      p: 1,
      ease: c.mobile.videoFitEase,
      duration: Math.max(0.001, (fitEnd - fitStart) * contentPortion),
      immediateRender: false,
      onUpdate: () => applyVideoFit(fitProxy.p),
    }, fitStart * contentPortion);
  }
}

/* ============================================================
   WE KNOW (The problem) → OUR GOAL — REFAKTOR (paczka 2)
   sticky stage (tła) + teksty w naturalnym flow ze sticky:
   kształt dokuje w lewo (scrub), teksty WJEŻDŻAJĄ scrollem
   (parallax wejścia) i lockują równocześnie; apla → swap → Our goal
   ============================================================ */
/* FINALNE pozycje klastra 4 butelek: jawne dup.positions przeskalowane groupScale
   WOKÓŁ CENTROIDU klastra (layout bez zmian, tylko mniejszy/większy) + groupX/Y.
   JEDNO źródło tej liczby: desktop DOJEŻDŻA do tych wartości na scrubie, mobile
   ustawia je STATYCZNIE (artboard 5177:3237 = stan po duplikacji). */
function weKnowDupPositions() {
  const d = CONFIG.weKnow.dup;
  const gS = d.groupScale != null ? d.groupScale : 1;
  const gX = d.groupX || 0, gY = d.groupY || 0;
  const cx = d.positions.reduce((a, p) => a + p.x, 0) / d.positions.length;
  const cy = d.positions.reduce((a, p) => a + p.y, 0) / d.positions.length;
  return d.positions.map((p) => ({
    x: cx + (p.x - cx) * gS + gX,
    y: cy + (p.y - cy) * gS + gY,
    scale: p.scale * gS,
  }));
}

function initWeKnow() {
  // MOBILE≤991: zero sticky/scruba — statyczny stack z artboardu (osobna funkcja niżej)
  if (isMobile()) { initWeKnowMobile(); return; }

  const c = CONFIG.weKnow;
  const L = c.layout;
  const section = q(".is-home-we-know");
  const wp1 = section.querySelector(".home-we-know_wp1");
  const titleWrap = section.querySelector(".home-we-know_title-wrap");
  const fixedShape = q(".feature-shape_component");
  const weShape = section.querySelector(".home-we-know_shape:not(.is-in-apla)");
  const aplaShape = section.querySelector(".home-we-know_shape.is-in-apla");
  const weShapeBottles = gsap.utils.toArray(weShape.querySelectorAll(".feature-shape_bottle")); // 4, rozmyte (mirror aplaShape)
  const weShapeBottleWrap = weShape.querySelector(".feature-shape_bottles"); // wrapper grupy — opacity fade TU
  const title = section.querySelector(".home-we-know_title");
  const para = section.querySelector(".home-we-know_paragraph");
  const note = section.querySelector(".home-we-know_note");
  const diamond = section.querySelector(".home-we-know_diamond");

  /* ---- LAYOUT ze wspólnego configu (sync CSS↔JS w JEDNYM miejscu) ----
     Wszystko ABSOLUTE w stage'u, w miejscach DOCELOWYCH:
     tytuł centrowany na titleTop (translateY -50% w CSS) → jego linia = titleTop;
     linia 2 paragrafu ma siadać na titleTop → wp1 top = titleTop − 1.5 linii. */
  const totalVh = c.pinViewports * 100;
  section.style.height = `${100 + totalVh}vh`;
  wp1.style.top = `calc(${L.titleTop}vh - ${1.5 * L.paraLine}rem)`;
  wp1.style.height = `${L.wp1Height}vh`;
  titleWrap.style.top = `${L.titleTop}vh`;

  // skala docelowa zależna od WYSOKOŚCI ekranu (kształt ma mieć ~shapeTargetVh)
  // baza = rozmiar kształtu 1:1 z klatką wideo (SHAPE_DIMS, ustawione w master)
  /* RESIZE-FIX (2026-07-27): targetScale i shapeLeftX to FUNKCJE — GSAP przelicza je przy
     każdym refresh (invalidateOnRefresh na scrubie niżej), nie raz przy inicie. SHAPE_DIMS
     jest wtedy świeże, bo refreshInit w master woła computeShapeDims() PRZED pomiarami. */
  const targetScale = () => (window.innerHeight * (c.shapeTargetVh / 100)) / SHAPE_DIMS.w;

  /* pozycja X kształtu: prawa krawędź jako ułamek KONTENERA (nie ekranu).
     Kontener liczony tym samym wzorem co --container-gutter w CSS.
     shapeRightEdge() jest JEDNYM źródłem tej liczby — używa jej też dok tytułu niżej. */
  const shapeLeftX = () => {
    const scaledW = window.innerHeight * (c.shapeTargetVh / 100); // = SHAPE_DIMS.w × targetScale()
    return shapeRightEdge() - scaledW / 2 - window.innerWidth / 2;
  };

  // apla: pozycja startowa przez GSAP (yPercent), żeby tween yPercent: 0 działał
  gsap.set(section.querySelector(".home-we-know_bg"), { yPercent: 100 });

  /* kopie shape'a (rozmiar/pozycja 1:1 z klatką wideo — ustawione w master):
     - weShape (blur, pod aplą): ukryta do handoffu (podmiana z fixed na starcie pinu)
     - aplaShape (ostra, W apli): kontr-transform (-100vh względem bazowej pozycji)
       równoważy startowe przesunięcie apli → wizualnie stoi w miejscu */
  gsap.set(weShape, { autoAlpha: 0 });
  gsap.set(aplaShape, { y: SHAPE_DIMS.dy - window.innerHeight });

  // butelki (włącznie z tą w fixed overlay) — rozmiar 1:1 do kształtu (SHAPE_DIMS) + centrowanie + tilt startowy
  const allBottles = gsap.utils.toArray(qa(".feature-shape_bottle"));
  // 4 butelki w apli (3 is-dup + frontowa) — cała grupa duplikacji. z-index wg scale (większa = wyżej).
  const aplaBottles = gsap.utils.toArray(aplaShape.querySelectorAll(".feature-shape_bottle"));
  aplaBottles.forEach((b, i) => gsap.set(b, { zIndex: Math.round((c.dup.positions[i]?.scale || 1) * 1000) }));
  gsap.set(allBottles, {
    width: SHAPE_DIMS.w * c.bottleScale,
    xPercent: -50, yPercent: c.bottleY,
    rotation: c.bottleTiltStart,
  });
  // butelki w weShape: INDYWIDUALNIE widoczne+ostre, ale GRUPA (wrap) na opacity 0 —
  // butelki jadą/skalują/duplikują się jak dotąd, tylko ICH NIE WIDAĆ do momentu wjazdu tekstu.
  gsap.set(weShapeBottles, { autoAlpha: 1, filter: "blur(0px)" });
  gsap.set(weShapeBottleWrap, { opacity: 0 });
  // butelka w shape z KOŃCA WIDEO (feature-shape) — też ukryta; pokażemy dopiero przy wjeździe tekstu
  gsap.set(fixedShape.querySelectorAll(".feature-shape_bottle"), { opacity: 0 });
  // z-index weShape 1:1 z aplaShape (skrajna lewa na wierzchu) — żeby rozmyta warstwa nakładała się tak samo
  weShapeBottles.forEach((b, i) => gsap.set(b, { zIndex: Math.round((c.dup.positions[i]?.scale || 1) * 1000) }));

  /* --- CAŁY SCRUB NA JEDNEJ OSI (vh scrolla), ZERO GSAP-pinu — pin robi CSS sticky ---
     Timeline duration = totalVh, pozycje tweenów = vh scrolla za "top top".
     Ruch pionowy tekstów = NATURALNY scroll + sticky; GSAP dokłada tylko
     parallax (yPercent), shrink tytułu i tła. */
  const s = c.seg;

  /* okno transferu tekstów [textIn, textIn+textLen] — wp1 startuje POD dolną
     krawędzią ekranu (y = 100vh − top wp1 w px) i dojeżdża do miejsca docelowego.
     RESIZE-FIX: liczone NA ŻYWO — to jest para CSS↔JS: wp1.style.top (calc(vh−rem))
     przelicza się sam przy resize, więc dystans wjazdu też musi. Rem przy wywołaniu. */
  const transferY = () => {
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const wp1TopPx = window.innerHeight * (L.titleTop / 100) - 1.5 * L.paraLine * remPx;
    return window.innerHeight - wp1TopPx; // start: górna krawędź wp1 = dół ekranu
  };
  const enterAt = s.textIn;
  const travel = s.textLen;

  // progi swapów (progress scruba) — ustawiane po zbudowaniu timeline
  let switchAt = null;
  let titleRevealAt = null;
  let titleRevealed = false;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top", // = moment pełnego overlapu (biała sekcja zakrywa wideo)
      end: "bottom bottom", // = pinViewports×100vh (wysokość sekcji ustawia JS wyżej)
      scrub: CONFIG.scrubSmooth,
      /* RESIZE-FIX: przy refresh GSAP invaliduje timeline i przelicza wartości funkcyjne
         (targetScale/shapeLeftX/transferY/titleCenterX/SHAPE_DIMS.dy) — wszystkie dzieci
         są fromTo z JAWNYM startem, więc invalidate niczego nie nagrywa „z połowy drogi". */
      invalidateOnRefresh: true,
      // HANDOFF: na starcie pinu fixed overlay → kopie w sekcji (i z powrotem)
      // killTweensOf — setShapeState (0.5s fade) nie może wygrać wyścigu z setem
      // fixedShape jedzie TYM SAMYM scrubem co weShape (patrz entrance) → w każdej chwili mają
      // identyczną pozycję, więc swap widoczności = zero skoku (nawet przy szybkim scrollu).
      // kill TYLKO opacity/visibility — żeby nie ubić tweenu x/scale należącego do timeline.
      onEnter: () => {
        gsap.killTweensOf(fixedShape, "opacity,visibility");
        gsap.set(fixedShape, { autoAlpha: 0 });
        gsap.set(weShape, { autoAlpha: 1 });
      },
      onLeaveBack: () => {
        gsap.killTweensOf(fixedShape, "opacity,visibility");
        gsap.set(weShape, { autoAlpha: 0 });
        gsap.set(fixedShape, { autoAlpha: 1 });
      },
      onUpdate: (self) => {
        // tytuł "We know" — SINGLE TRIGGER globalny line-reveal po ZAKOŃCZENIU ruchu shape'a
        if (titleRevealAt !== null) {
          const show = self.progress >= titleRevealAt;
          if (show !== titleRevealed) { show ? revealText([title]) : hideText([title]); titleRevealed = show; }
        }
        // We know ↔ Our goal — swap.js (line-reveal) + rotacja diamentu + fade akapitu (litery)
        if (switchAt !== null) {
          const goal = self.progress >= switchAt;
          weGoalSwap.setState(goal ? 1 : 0);
          if (goal !== diamondRotated) { swapDiamond(goal); diamondRotated = goal; }
        }
      },
    },
  });

  const bg = section.querySelector(".home-we-know_bg");
  // TYTUŁ "Our goal" PIERWSZY → reveal go pokazuje razem z "is to keep…" (koniec delaya;
  // kolejność w revealText = kolejność stagger linii). Reszta = akapit + notka.
  const goalEls = [
    section.querySelector(".home-we-know_goal-title"),
    section.querySelector(".home-we-know_goal-paragraph"),
    section.querySelector(".home-we-know_goal-note"),
  ];

  /* DOCK "We know" = środek PRZERWY między prawą krawędzią shape'a a lewą krawędzią tekstu.
     title-wrap ma translate(-50%,-50%), więc wystarczy ustawić jego LEFT na midX → środek
     tytułu ląduje na midX = RÓWNE odstępy po obu stronach (niezależnie od szerokości tytułu).
     Responsywne: przeliczamy przy resize. Entrance: pojawia się na środku EKRANU → dojeżdża do midX. */
  /* prawa krawędź zadokowanego kształtu — JEDEN wzór dla pozycjonowania kształtu i doku tytułu.
     ⚠️ Rozdzielenie tych dwóch miejsc było źródłem buga: po przepięciu kształtu na kotwicę
     kontenerową dok dalej liczył ze starego `rightGap` → undefined → NaN → tytuł uciekał
     na lewą krawędź ekranu. */
  function shapeRightEdge() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const gutter = Math.max(2 * rem, (window.innerWidth - 86 * rem) / 2);
    return gutter + c.shapeRightInContainer * (window.innerWidth - 2 * gutter);
  }
  function titleMidX() {
    const textLeft = wp1.getBoundingClientRect().left;          // lewa krawędź kolumny tekstu
    return (shapeRightEdge() + textLeft) / 2;
  }
  /* ============ HIGHLIGHT akapitu — SYSTEM GLOBALNY #4 ============
     Okno scrolla DOKŁADNIE to samo co dawne kolorowanie: [enterAt, enterAt+travel] w vh
     za "top top" sekcji — highlight kończy się, gdy tekst siada na miejscu.
     Forma programowa (nie `initHighlights`), bo sekcja jest sticky i procentowy `end`
     nie miałby sensu — wzorzec 1:1 z track-record/.
     Feeling (przygaszenie, jednostka, ease) = gsap-config.js → blok `highlight`. NIE tutaj.
     ⚠️ _shared/README.md pisze przy systemie #4, że ten akapit ma feeling "char" — nieaktualne
     (decyzja Tomka 2026-07-27: WYRAZ, jak w track-record). Do poprawienia w README. */
  if (window.highlightOnScroll) {
    highlightOnScroll(para, {
      trigger: section,
      start: () => `top top-=${(enterAt / 100) * window.innerHeight}`,
      end: () => `+=${(travel / 100) * window.innerHeight}`,
    });
  }

  titleWrap.style.left = `${titleMidX()}px`;
  const titleCenterX = () => window.innerWidth / 2 - titleMidX(); // offset dok → środek ekranu (entrance); RESIZE-FIX: funkcja
  window.addEventListener("resize", () => { titleWrap.style.left = `${titleMidX()}px`; });

  /* split tekstów We-know UPFRONT (nie lazy) — line-reveal (tytuł/notka/goal) + akapit na litery */
  [title, note, ...goalEls].forEach(ensureLines);
  gsap.set(title, { autoAlpha: 0 });   // ukryty do SINGLE-TRIGGER reveala (po zakończeniu ruchu shape'a)
  /* AKAPIT "that most…" — SYSTEM GLOBALNY #4 (_shared/highlight.js), 2026-07-27.
     Zastąpił własną maszynkę (split "lines,chars" + tween `color` wpięty w timeline We-know).
     Kolejność jest istotna: NAJPIERW jednostki highlightu (ensureUnits przebudowuje element
     z czystego textContent), DOPIERO POTEM podział na linie — split "lines" tylko OPAKOWUJE
     istniejące dzieci, więc spany .hl-unit przeżywają. Odwrotna kolejność by je skasowała.
     Linie robi WSPÓLNY ensureLines() — ręczny duplikat był potrzebny tylko po to, żeby
     split mógł być "lines,chars". Litery/wyrazy daje teraz system #4. */
  ensureUnits(para);   // jednostka z configu (PPB.config.highlight.unit = "word")
  ensureLines(para);
  /* SplitText potrafi zostawić PUSTE `.hl-unit` (efekt uboczny wrapowania). Nic nie renderują
     i nie ma ich w cache `_hlUnits`, więc animacja ich nie dotyka — ale martwe spany w DOM
     to śmieć, który przy porcie do Webflow zaczyna żyć własnym życiem. */
  para.querySelectorAll(".hl-unit").forEach(function (u) { if (!u.textContent) u.remove(); });
  /* stan początkowy jednostek daje CSS (.hl-unit { opacity: .22 } w styleguide.css) — zero FOUC.
     Dawne `gsap.set(paraChars, { color: "rgba(0,84,83,0.18)" })` już niepotrzebne. */

  /* --- DUPLIKACJA: skalowanie całego klastra (groupScale) wokół jego środka + okno czasu ---
     groupScale skaluje ROZMIARY i ODSTĘPY jednolicie wokół centroidu klastra (layout bez zmian,
     tylko mniejszy/większy). Okno dup KOŃCZY się dokładnie na aplaStart+aplaLen = moment gdy
     apla (solid) dochodzi do góry i pojawia się "Our goal". */
  const dupPos = weKnowDupPositions();   // wspólne z mobile (statyczny stack) — patrz helper wyżej
  const dupStart = s.aplaStart + s.aplaLen * c.dup.at;
  const dupEnd = s.aplaStart + s.aplaLen;                 // = moment "Our goal" (apla topi)
  const dupSpan = Math.max(0.01, dupEnd - dupStart);
  const dupStagger = dupSpan * c.dup.staggerFrac;         // stagger tylko STARTU

  /* RESIZE-FIX: WSZYSTKIE dzieci timeline = fromTo z JAWNYM startem (zamiast .to).
     Powód: invalidateOnRefresh invaliduje cały timeline; .to nagrywałby start „z aktualnego
     stanu" — w środku scruba to wartość interpolowana = zepsuty zakres. Jawne starty =
     dokładnie stany z init-setów wyżej / końców poprzednich tweenów. immediateRender:false
     tam, gdzie stan startowy JUŻ stoi z init-setów (zachowanie 1:1 z wersją .to). */
  tl
    // kształt w lewo + skala (scrub) — weShape + aplaShape + fixedShape identycznie (fixedShape tylko dla ciągłości handoffu)
    .fromTo([weShape, aplaShape, fixedShape],
      { x: () => SHAPE_DIMS.dx, scale: 1 },
      { x: () => shapeLeftX(), scale: () => targetScale(), duration: s.entrance, ease: "none", immediateRender: false }, 0)
    // butelki (weShape, wszystkie 4) blurrują się PODCZAS ruchu w lewo — start OPÓŹNIONY o blurStart
    .fromTo(weShapeBottles, { filter: "blur(0px)" }, { filter: `blur(${c.bottleBlur}px)`, ease: "none",
      duration: s.entrance * (1 - c.blurStart), immediateRender: false }, s.entrance * c.blurStart)
    // butelki (grupa) POJAWIAJĄ SIĘ gdy tekst rusza w górę: opacity 0 → 40% (blur gotowy); koniec = start dup
    .fromTo(weShapeBottleWrap, { opacity: 0 }, { opacity: c.bottleBlurOpacity, ease: "none",
      duration: travel * c.bottleShowFrac, immediateRender: false }, enterAt)
    // gdy zaczyna się blur → butelka ZACZYNA OBRÓT do pionu + korekta pozycji (uprightX/Y)
    .fromTo(allBottles,
      { rotation: c.bottleTiltStart, xPercent: -50, yPercent: c.bottleY },
      {
        rotation: c.bottleUpright,
        xPercent: -50 + c.bottleUprightX + c.bottlePreDupX,
        yPercent: c.bottleY + c.bottleUprightY,
        ease: "none", duration: s.entrance * (1 - c.blurStart), immediateRender: false,
      }, s.entrance * c.blurStart)
    // butelka JUŻ SIĘ ZMNIEJSZA podczas ruchu w lewo (scale mnoży się z rosnącym shape'em)
    .fromTo(allBottles, { scale: 1 },
      { scale: c.bottleEntranceScale, ease: "none", duration: s.entrance, immediateRender: true }, 0)
    /* TRANSFER POZYCJI wp1 — z dołu ekranu do miejsca docelowego (scrub = kisiel działa) */
    .fromTo(wp1, { y: () => transferY() },
      { y: 0, ease: "none", duration: travel, immediateRender: true }, enterAt)
    /* PARALLAX WEJŚCIA — dodatkowy malejący ofset yPercent na notce/diamencie
       (osobny kanał niż y wrappera, zero konfliktów) */
    .fromTo(note, { yPercent: c.parallax.note },
      { yPercent: 0, ease: "none", duration: travel, immediateRender: true }, enterAt)
    .fromTo(diamond, { yPercent: c.parallax.diamond },
      { yPercent: 0, ease: "none", duration: travel, immediateRender: true }, enterAt)
    /* SHRINK tytułu: duży → 2.5rem (CSS) w oknie wjazdu tekstu z prawej [enterAt, enterAt+travel];
       na spotkaniu (dock wp1) tytuł ma już docelowy rozmiar = jak tekst z prawej. */
    .fromTo(title, { fontSize: c.titleBigSize },
      { fontSize: "2.5rem", ease: "none", duration: travel / 2, immediateRender: true }, enterAt + travel / 2)
    /* X tytułu: startuje WYCENTROWANY na ekranie (duży), wraca do docka (x:0) w tym samym
       oknie co shrink → na spotkaniu z tekstem z prawej stoi w docelowym miejscu. */
    .fromTo(title, { x: () => titleCenterX() },
      { x: 0, ease: "none", duration: travel / 2, immediateRender: true }, enterAt + travel / 2)
    // apla (mist) wjeżdża z dołu; span switch gra na single trigger (onUpdate)
    .fromTo(bg, { yPercent: 100 }, { yPercent: 0, ease: "none", duration: s.aplaLen, immediateRender: false }, s.aplaStart)
    // kontr-transform ostrej kopii: stoi w miejscu, apla odkrywa ją swoją krawędzią
    .fromTo(aplaShape, { y: () => SHAPE_DIMS.dy - window.innerHeight },
      { y: () => SHAPE_DIMS.dy, ease: "none", duration: s.aplaLen, immediateRender: false }, s.aplaStart)
    // (nav: białe → ciemne robi teraz NAV MASK — system #2, initNavMask)
    // (obrót do pionu robi się już podczas entrance, przy starcie bluru — patrz wyżej)
    // (DUPLIKACJA butelek — per-butelka niżej, poza chainem: WSPÓLNY koniec)
    // ogon do końca scruba (w tym oknie gra time-based switch na Our goal)
    .to({}, { duration: Math.max(0.001, totalVh - (s.aplaStart + s.aplaLen)) }, s.aplaStart + s.aplaLen);

  /* DUPLIKACJA: z jednej butelki wychodzą 4 — JAWNE pozycje (bottle-dup-lab.html) × groupScale + groupX/Y.
     Każda butelka = OSOBNY tween: start staggerowany (dupStagger·i), ale WSZYSTKIE kończą w dupEnd
     (= moment "Our goal") → zatrzymują się w tej samej chwili. */
  aplaBottles.forEach((b, i) => {
    const startI = dupStart + dupStagger * i;
    const durI = Math.max(0.01, dupEnd - startI);
    // ta sama pozycja dla ostrej (aplaShape) i rozmytej (weShape) kopii → apla tylko zdejmuje blur
    const pair = weShapeBottles[i] ? [b, weShapeBottles[i]] : b;
    // RESIZE-FIX: jawny start = stan butelek po entrance (upright + preDup + entranceScale)
    tl.fromTo(pair,
      { xPercent: -50 + c.bottleUprightX + c.bottlePreDupX, yPercent: c.bottleY + c.bottleUprightY, scale: c.bottleEntranceScale },
      {
        xPercent: dupPos[i].x, yPercent: dupPos[i].y, scale: dupPos[i].scale,
        ease: "none", duration: durI, immediateRender: false,
      }, startI);
  });


  /* --- SWAP We know ↔ Our goal — SYSTEM #3 (swap.js), efekt Z SHARED ---
     state 0 = We know (title + para + note), state 1 = Our goal (goalEls: goal-title/para/note).
     BEZ własnych revealOpts/hideOpts → wjazd/wyjazd = ten sam GLOBALNY line-reveal co wszędzie
     (PPB.config.reveal w gsap-config.js), nie osobny efekt. revealStart:false — stan 0 pokazuje
     WJAZD sekcji (fade tytułu + transfer wp1), swap steruje TYLKO przełączeniem. */
  const weGoalSwap = createSwap({
    states: [
      { targets: [title, para, note] },   // para W SWAPIE (split lines,chars) — ten sam line-reveal co reszta
      { targets: goalEls },
    ],
    start: 0,
    revealStart: false,
  });

  /* --- DIAMENT: rotate (ze SHARED) + CENTROWANIE między akapitem a notką (responsywnie) ---
     Rotacja = PPB.config.swapFx.diamond (jak About). Akapity We-know i Our goal mają RÓŻNĄ
     wysokość (różna liczba linii) → środek między akapitem a notką jest inny → przy swapie
     diament dodatkowo jedzie w Y o deltę. Delta z REALNYCH wysokości tekstu
     (getBoundingClientRect; transform wp1 się znosi, bo liczymy RÓŻNICĘ środków). */
  const _dfx = PPB.config.swapFx.diamond;
  const goalPara = section.querySelector(".home-we-know_goal-paragraph");
  const goalNote = section.querySelector(".home-we-know_goal-note");
  function diamondCenterDelta() {
    const mid1 = (para.getBoundingClientRect().bottom + note.getBoundingClientRect().top) / 2;       // We-know
    const mid2 = (goalPara.getBoundingClientRect().bottom + goalNote.getBoundingClientRect().top) / 2; // Our goal
    return mid2 - mid1;
  }
  let diamondDeltaY = diamondCenterDelta();
  let diamondRotated = false;
  function swapDiamond(goal) {
    gsap.to(diamond, {
      rotation: `${goal ? "+" : "-"}=${_dfx.angle}`,
      y: goal ? diamondDeltaY : 0,   // Our goal: środek niżej (akapit wyższy); We-know: pozycja naturalna (flex)
      duration: _dfx.duration, ease: _dfx.ease, overwrite: "auto",
    });
  }
  // responsywność: przelicz deltę po dociągnięciu fontów i przy resize (wysokość tekstu się zmienia)
  const _recalcDiamond = () => { diamondDeltaY = diamondCenterDelta(); if (diamondRotated) gsap.set(diamond, { y: diamondDeltaY }); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(_recalcDiamond);
  window.addEventListener("resize", _recalcDiamond);

  // progi swapów (progress scruba; oś = totalVh)
  titleRevealAt = s.entrance / tl.duration();           // KONIEC ruchu shape'a = reveal tytułu
  switchAt = (s.aplaStart + s.aplaLen * c.goalSwitchFrac) / tl.duration(); // POŁOWA wjazdu apli (knob goalSwitchFrac; dawniej: apla u góry)

  tl.scrollTrigger._ppbAnchor = true; // RESIZE-FIX: sticky sekcja NIE broni progresu sama — kotwiczymy przy refresh
}

/* ============================================================
   WE-KNOW — MOBILE≤991: STATYCZNY STACK (Figma 5177:3237, 375×1690)
   ------------------------------------------------------------
   Desktop trzyma tę sekcję na sticky stage'u i przez 3,5 viewportu scruba przenosi
   kształt w lewo, wjeżdża tekstami, nasuwa aplę, duplikuje butelki i podmienia
   „We know" → „Our goal". Artboard mobile pokazuje po prostu DWA BLOKI jeden pod
   drugim = STANY KOŃCOWE obu faz. Więc mobile NIE animuje choreografii, tylko ją
   USTAWIA (gsap.set) i dokłada zwykłe revealy tekstów:
     blok 1 (y80)   karta-diament z JEDNĄ butelką + „that most…" + diament + notka
     blok 2 (y873)  karta-diament z KLASTREM 4 butelek + „is to keep…" + diament + notka
   UKŁAD (kolumna, order, marginesy, ukryte tytuły/overlay) robi CSS @media ≤991.
   Tutaj: butelki, klon diamentu do bloku 2, highlight akapitu, revealy.

   ⚠️ CELOWO NIE ustawiamy section.style.height / wp1.style.top / titleWrap.style.left —
      to inline'y desktopowej choreografii w vh; na mobile wysokość daje TREŚĆ.
   ⚠️ margin-top:-100vh sekcji ZOSTAJE (apla z 4473:6227 nasuwa się na stojące wideo).
   ============================================================ */
function initWeKnowMobile() {
  const c = CONFIG.weKnow;
  const m = c.mobile;
  const section = q(".is-home-we-know");
  if (!section) return;
  const weShape = section.querySelector(".home-we-know_shape:not(.is-in-apla)");
  const aplaShape = section.querySelector(".home-we-know_shape.is-in-apla");
  const w2 = section.querySelector(".home-we-know_w2");
  const para = section.querySelector(".home-we-know_paragraph");
  const note = section.querySelector(".home-we-know_note");
  const diamond = section.querySelector(".home-we-know_diamond");
  const goalPara = section.querySelector(".home-we-know_goal-paragraph");
  const goalNote = section.querySelector(".home-we-know_goal-note");

  /* --- KARTA 2: wymiary z CSS (--shape-w + aspect-ratio); czyścimy inline'y po
     applyShapeDims na wypadek wejścia w mobile po desktopowym stanie (DevTools).
     ⚠️ v4: KARTA 1 (`weShape`) jest wyłączona (`display:none` @991) — jej rolę gra
     shape set trzymany na sticky w kontenerze wideo. */
  gsap.set([aplaShape], { clearProps: "all" });
  const aplaSvg = aplaShape.querySelector(".feature-shape_svg");
  if (aplaSvg && m.aplaShapeSrc) aplaSvg.setAttribute("src", m.aplaShapeSrc);

  /* --- BUTELKI ---------------------------------------------------------------
     Rozmiar liczony z REALNEJ szerokości karty (nie z SHAPE_DIMS — to cover-mapping
     wideo; na mobile karta ma szerokość kontenera; przy 375 obie liczby są równe,
     bo kadr wideo dojeżdża dokładnie do 335 = szerokość kontenera).
     Karta 1 = kopia POD APLĄ (to ją odsłania biała krawędź): butelka WIDOCZNA i ROZMYTA,
       geometria 1:1 z nakładką nad wideo → `bottleTiltStart` (nie `bottleUpright`!),
       bo taki jest przechył butelki w OSTATNIEJ KLATCE wideo. Trzy pozostałe kopie
       (mirror klastra) chowa CSS `display:none` — `autoAlpha` zostawiałby je w layoucie.
     Karta 2 = finalny layout duplikacji (weKnowDupPositions), butelki ostre, pionowe. */
  /* ============================================================
     KARTA 2 — KLASTER 5 BUTELEK (2026-07-28, artboard 5177:3237 → node 4473:6280)
     ------------------------------------------------------------
     Artboard mobile ma UKŁAD SYMETRYCZNY: butelka centralna + po dwie na boki,
     malejące od środka. Desktop ma swój, ASYMETRYCZNY szereg 4 butelek (rząd
     lewo→prawo) — to dwa różne projekty, więc mobile dostaje własne pozycje
     (`m.dup`), a `weKnowDupPositions()` z jego `groupScale/groupX` zostaje wyłącznie
     dla desktopu. Wcześniej mobile jechało na desktopowych liczbach.

     ⚠️ PIĄTA BUTELKA JEST KLONOWANA W JS, NIE DOPISANA DO MARKUPU. Markup jest
     WSPÓLNY dla obu warstw, więc piąty `<img>` trafiłby też na desktop, gdzie
     `CONFIG.weKnow.dup.positions` ma cztery wpisy → `dupPos[4] === undefined`
     i butelka wylądowałaby bez pozycji. Klon w gałęzi mobilnej nie dotyka desktopu.
     ============================================================ */
  const mDup = (m.dup && m.dup.positions) || null;
  if (mDup) {
    const holder = aplaShape.querySelector(".feature-shape_bottles") || aplaShape;
    let have = aplaShape.querySelectorAll(".feature-shape_bottle");
    while (have.length < mDup.length && have.length > 0) {
      const clone = have[have.length - 1].cloneNode(true);
      clone.classList.add("is-dup");
      clone.setAttribute("aria-hidden", "true");
      holder.appendChild(clone);
      have = aplaShape.querySelectorAll(".feature-shape_bottle");
    }
  }

  const aplaBottles = gsap.utils.toArray(aplaShape.querySelectorAll(".feature-shape_bottle"));
  const dupPos = weKnowDupPositions();

  /* ============ SHAPE SET (v4, 2026-07-28 — projekt Tomka) ============
     „Shape set" = DWIE kopie tego samego kształtu z butelką: OSTRA i ROZMYTA. Obie
     wkładamy do STICKY kontenera wideo (`.home-how-it-works_pin`), więc:
       • stoją w miejscu, bo trzyma je przeglądarka (sticky), a nie JS,
       • siedzą w JEDNYM układzie współrzędnych, więc nie mają jak się rozjechać.
     Ostra ma z-index 5 (pod sekcją We-know → biel ją zakrywa), rozmyta z-index 20
     (nad bielą, ale obcięta maską do obszaru poniżej krawędzi apli — patrz --apla-cut).
     Rozmyta to KLON ostrej: jedno źródło markupu, identyczna geometria z definicji. */
  const sharpShape = q(".feature-shape_component:not(.is-blur)");
  let blurShape = q(".feature-shape_component.is-blur");
  let shapeLayer = q(".feature-shape_layer");

  if (sharpShape) {
    if (!shapeLayer) {
      /* ⚠️ Warstwa MUSI być dzieckiem <body>: sekcja wideo ma `z-index: 1`, czyli tworzy
         kontekst układania, więc nic z jej wnętrza nie może trafić nad aplę (z-index 10).
         To był powód, dla którego w v4 nie było widać odkrywania blura. */
      shapeLayer = document.createElement("div");
      shapeLayer.className = "feature-shape_layer";
      shapeLayer.setAttribute("aria-hidden", "true");
      document.body.appendChild(shapeLayer);
    }
    if (!blurShape) {
      blurShape = sharpShape.cloneNode(true);
      blurShape.classList.add("is-blur");
      blurShape.setAttribute("aria-hidden", "true");
    }
    if (sharpShape.parentElement !== shapeLayer) shapeLayer.appendChild(sharpShape);
    if (blurShape.parentElement !== shapeLayer) shapeLayer.appendChild(blurShape);
    /* v5.2: RAMKA jako osobny, NIEmaskowany element — kształt ma zostać ciągły, gdy apla
       odcina butelkę. Wstawiona jako PIERWSZE dziecko warstwy, bo w kształcie jest
       okrąg-poświata, który ma być ZA butelką. */
    if (!shapeLayer.querySelector(".is-frame")) {
      const frame = sharpShape.cloneNode(true);
      frame.classList.remove("is-blur");
      frame.classList.add("is-frame");
      frame.setAttribute("aria-hidden", "true");
      shapeLayer.insertBefore(frame, shapeLayer.firstChild);
    }
    /* zdejmij geometrię z wideo (applyShapeDims) — wymiary i `top` daje teraz CSS
       (--shape-w, --shape-top, aspect-ratio); zostaje tylko poziome centrowanie */
    /* ⚠️ BUG v5.0–v5.2 (zgłoszenie Tomka „kształt się wgl nie pojawia"):
       `.feature-shape_component` ma w BAZOWYM CSS `opacity: 0; visibility: hidden` (na
       desktopie odsłania go `setShapeState`). Po przeniesieniu do warstwy widocznością
       steruje WARSTWA, więc każde jej dziecko musi być odsłonięte na stałe. Odsłaniałem
       jawnie tylko rozmytą butelkę — dlatego jedynie ona się pokazywała, a to, co było
       widać nad krawędzią apli, to kształt NAMALOWANY W WIDEO, nie nasz element.
       Stąd „brakuje kształtu na białym" w v5.0/5.1 i „kształtu nie ma wcale" w v5.2. */
    const layerKids = () => gsap.utils.toArray(shapeLayer.children);
    gsap.set(layerKids(), { clearProps: "all" });
    gsap.set(layerKids(), { xPercent: -50, yPercent: 0, x: 0, autoAlpha: 1 });
    gsap.set(shapeLayer, { autoAlpha: 0 });    // scenę odsłania setShapeState (na warstwie)
  }
  const shapeSet = [sharpShape, blurShape].filter(Boolean);
  const sharpBottles = sharpShape ? gsap.utils.toArray(sharpShape.querySelectorAll(".feature-shape_bottle")) : [];
  const blurBottles = blurShape ? gsap.utils.toArray(blurShape.querySelectorAll(".feature-shape_bottle")) : [];

  function layoutBottles() {
    /* rozmiar butelki liczony z REALNEJ szerokości kształtu handoffu (obie kopie mają ją
       z `--shape-w`); karta 1 stacku ma tę samą szerokość, więc jedna liczba wystarcza. */
    const cardW = (sharpShape || weShape || aplaShape).getBoundingClientRect().width;
    if (!cardW) return;                       // brak layoutu — poczekaj na fonts/refresh
    const w = cardW * m.bottleScale;
    // OSTRA kopia = butelka z ostatniej klatki wideo (przechył `bottleTiltStart`, bez bluru)
    gsap.set(sharpBottles, {
      autoAlpha: 1, width: w, xPercent: -50, yPercent: m.bottleY,
      rotation: c.bottleTiltStart, scale: 1, filter: "blur(0px)",
    });
    // ROZMYTA kopia w warstwie = TA SAMA geometria, tylko z blurem
    gsap.set(blurBottles, {
      autoAlpha: 1, width: w, xPercent: -50, yPercent: m.bottleY,
      rotation: c.bottleTiltStart, scale: 1, filter: `blur(${m.bottleBlur}px)`,
    });
    /* KARTA 1 STACKU (po handoffie) — ta sama rozmyta butelka, ta sama geometria.
       Warstwa handoffu jest `fixed`, więc nie umie odjechać ze scrollem; w momencie
       pełnego zakrycia apli podmieniamy warstwę na tę kartę (oba są wtedy w tym samym
       miejscu i statyczne względem sekcji → podmiana niewidoczna). */
    if (weShape) {
      gsap.set(weShape.querySelector(".feature-shape_bottles"), { opacity: 1 });
      gsap.set(weShape.querySelectorAll(".feature-shape_bottle"), { autoAlpha: 0 });
      gsap.set(weShape.querySelector(".feature-shape_bottle"), {
        autoAlpha: 1, width: w, xPercent: -50, yPercent: m.bottleY,
        rotation: c.bottleTiltStart, scale: 1, filter: `blur(${m.bottleBlur}px)`,
      });
    }
    aplaBottles.forEach((b, i) => {
      const p = mDup[i] || dupPos[i];
      if (!p) return;
      gsap.set(b, {
        autoAlpha: 1, width: w, rotation: c.bottleUpright, filter: "blur(0px)",
        xPercent: p.x, yPercent: p.y, scale: p.scale,
        zIndex: Math.round(p.scale * 1000),   // większa = wyżej; pary L/P mają równe
      });
    });
  }
  layoutBottles();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutBottles);
  ScrollTrigger.addEventListener("refresh", layoutBottles);  // jedno źródło resize'ów (RESIZE-FIX v2)

  /* ============================================================
     ROZEJŚCIE KLASTRA NA SCRUB (2026-07-28, decyzja Tomka)
     ------------------------------------------------------------
     Butelki startują JEDNA NA DRUGIEJ w pozycji środkowej i rozchodzą się na boki,
     gdy karta 2 wjeżdża w ekran. Stan KOŃCOWY to dokładnie to, co ustawia
     `layoutBottles()` — więc animujemy `fromTo` ze stanu „wszystkie jak środkowa"
     DO wartości z configu, zamiast trzymać drugi opis tego samego układu.
     `invalidateOnRefresh`, bo `layoutBottles` przelicza szerokości na resize.
     Stagger idzie OD ŚRODKA: środkowa rusza pierwsza, skrajne ostatnie. */
  if (mDup && aplaBottles.length === mDup.length) {
    const mid = (mDup.length - 1) / 2;                 // indeks środka (2 przy pięciu)
    const d = m.dup;
    gsap.timeline({
      scrollTrigger: {
        trigger: aplaShape,
        start: d.spreadStart,
        end: d.spreadEnd,
        scrub: true,
        invalidateOnRefresh: true,
      },
    }).fromTo(aplaBottles,
      { xPercent: mDup[mid].x, scale: mDup[mid].scale },
      {
        xPercent: (i) => mDup[i].x,
        scale: (i) => mDup[i].scale,
        ease: "none",
        stagger: { each: d.stagger, from: "center" },
      }, 0);
  }

  /* ============================================================
     HANDOFF WIDEO → APLA (2026-07-28, decyzja Tomka; artboardy 4473:6199 → 4473:6227)
     ------------------------------------------------------------
     Okno = DOKŁADNIE nasuwanie się białej sekcji na stojące wideo: „top bottom"
     (górna krawędź sekcji na dole ekranu) → „top top" (sekcja zakrywa ekran) = 100vh
     scrolla, czyli CONFIG.howItWorks.overlapViewports × 100vh (margin-top −100vh w CSS).

     Grają DWIE kopie tego samego kształtu, przez cały czas nałożone 1:1:
       • nakładka `.feature-shape_component` — NAD wideo (z-index 5), butelka OSTRA,
       • karta 1 stacku (`weShape`) — W SEKCJI, butelka ROZMYTA, przycięta krawędzią apli
         (`overflow: clip` na stage'u).
     Krawędź apli jedzie po nich → nad krawędzią widać ostrą, pod krawędzią rozmytą.
     To jest cały efekt „apla nakłada blur" ze screena Tomka. Zero masek, zero clip-pathów.

     MATEMATYKA (dlatego kontr-transform, a nie zwykły flow):
     karta w naturalnym flow jedzie z sekcją 1:1 ze scrollem (100vh na całe okno), a ma
     przejechać tylko z pozycji kształtu z wideo do swojego miejsca w stacku (padding-top
     stage'a). Kontr-transform zabiera różnicę:
       y(p=0) = topKształtuZWideo − vh − paddingTop      (karta stoi tam, gdzie wideo)
       y(p=1) = 0                                        (karta w naturalnym miejscu stacku)
     ⚠️ WERSJA 3 (2026-07-28): OBIE KOPIE W TYM SAMYM UKŁADZIE = JEDEN TWEEN.
     Ostra kopia nie jest już `position: fixed`, tylko leży w flow sekcji z tym samym
     `top` co karta (--we-stack-top), więc dostają identyczną wartość `y` z jednego
     fromTo. Dwie poprzednie próby padły na tym samym: v1 miała osobny tween dla kopii
     (po dodaniu easingu rozjazd 211 px w środku okna, bo pozycja karty = flow LINIOWY
     + kontr-transform EASOWANY), v2 dosuwała kopię co render do rect-a karty (poprawne
     statycznie, ale kopia `fixed` rusza się TYLKO gdy zadziała JS, a karta z flow —
     przy każdej klatce kompozytora; stąd glitch przy szybkim scrollu).

     scrub: true (BEZ kisielu) — sekcja jedzie surowym scrollem, więc kopie nie mogą
     mieć wygładzenia, inaczej rozjeżdżałyby się na krawędzi apli. Ta sama zasada co
     w masce nava (system #2).
     ============================================================ */
  const stage = section.querySelector(".home-we-know_stage");
  const video = q(".home-how-it-works_video");
  const mediaWrap = q(".home-how-it-works_media-wrapper");

  /* górna krawędź kształtu z OSTATNIEJ klatki wideo, w px od góry okna.
     To jest pozycja, w której shape set STOI (sticky) przed wjazdem apli. */
  const videoShapeTopPx = () => window.innerHeight / 2 + SHAPE_DIMS.dy - SHAPE_DIMS.h / 2;

  /* GEOMETRIA v4 — dwie liczby ustawiane przy każdym refreshu:
       --shape-top    = gdzie stoi shape set (== kształt w klatce wideo)
       --we-stack-top = SLOT w apli: 80 (odstęp górny) + wysokość kształtu + 40 (do tekstu)
     Druga wynika z pierwszej i z rozmiaru kształtu, więc obie liczy jedno miejsce. */
  const applyHandoffGeometry = () => {
    document.documentElement.style.setProperty("--shape-top", videoShapeTopPx().toFixed(2) + "px");
  };
  applyHandoffGeometry();
  ScrollTrigger.addEventListener("refresh", applyHandoffGeometry);

  /* ============================================================
     RUCH W GÓRĘ (v4) — jedyna animacja w tym handoffie
     ------------------------------------------------------------
     Okno = wjazd białej sekcji: „top bottom" → „top top" (100vh scrolla, bo
     margin-top −100vh). W tym oknie shape set i kadr wideo jadą do góry o
     `videoShapeTop − slotTop`, czyli dokładnie tyle, żeby kształt wylądował w swoim
     SLOCIE w apli (80 px od jej góry). Jeden tween, trzy cele (wideo + obie kopie),
     ta sama wartość, ta sama klatka.

     EASE = „in", nie „out" — i to wynika z arytmetyki, nie z gustu:
       • PRZED oknem kształt stoi (sticky) → prędkość 0,
       • PO oknie sticky się zwalnia i kształt jedzie ze stroną → prędkość 1:1 ze scrollem.
     Ease musi więc startować od zera i kończyć na prędkości scrolla. `power1.in` ma
     pochodną startową 0 i końcową 2× średniej ≈ 1 — czyli oba szwy są gładkie.
     (Poprzednia architektura wymagała odwrotnie, `power1.out`, bo trzymanie było PO
     stronie JS-a przed oknem, a nie po stronie sticky.)

     scrub: true — sekcja jedzie surowym scrollem, więc ruch też, bez kisielu.
     ============================================================ */
  const riseTargets = [mediaWrap, shapeLayer].filter(Boolean);
  /* dystans: z pozycji kształtu w klatce wideo do pozycji docelowej = `slotTopRem`
     od GÓRY OKNA (na końcu okna górna krawędź sekcji jest dokładnie na 0). */
  const risePx = () => videoShapeTopPx()
    - m.slotTopRem * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);

  /* --apla-cut = gdzie krawędź apli przecina ROZMYTĄ kopię (px od jej góry).
     JEDYNA liczba, którą JS pisze co klatkę. Pozycje elementów są w 100 % po stronie
     kompozytora (sticky + scroll), więc ewentualne spóźnienie JS-a przesuwa tylko
     granicę blur/ostrość o klatkę — a nie sam kształt. To była cała różnica. */
  const applyAplaCut = () => {
    if (!shapeLayer || !sharpShape) return;
    const edge = section.getBoundingClientRect().top;
    const r = sharpShape.getBoundingClientRect();
    const cut = gsap.utils.clamp(0, r.height, edge - r.top);
    shapeLayer.style.setProperty("--apla-cut", cut.toFixed(1) + "px");
    applyTopFade();
  };

  /* PODMIANA warstwa → karta 1 na KOŃCU okna (`onLeave`/`onEnterBack`).
     Warstwa jest `fixed`, więc po pełnym zakryciu nie umie odjechać ze scrollem; karta 1
     stacku jest w tym momencie w dokładnie tym samym miejscu (80 px pod krawędzią sekcji,
     a krawędź jest na 0) i statyczna względem sekcji → podmiana jest niewidoczna. */
  const swapToStack = (toStack) => {
    if (shapeLayer) { gsap.killTweensOf(shapeLayer, "opacity,visibility"); gsap.set(shapeLayer, { autoAlpha: toStack ? 0 : 1 }); }
    if (weShape) gsap.set(weShape, { autoAlpha: toStack ? 1 : 0 });
  };
  if (weShape) gsap.set(weShape, { autoAlpha: 0 });   // do handoffu widać warstwę, nie kartę

  const handoff = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top bottom",
      end: "top top",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: applyAplaCut,
      onRefresh: applyAplaCut,
      onLeave: () => swapToStack(true),
      onEnterBack: () => swapToStack(false),
    },
  });
  handoff.fromTo(riseTargets,
    { y: 0 },
    { y: () => -risePx(), ease: m.handoffEase, immediateRender: true }, 0);

  applyAplaCut();
  RELAYOUT.invalidate = () => { handoff.invalidate(); ScrollTrigger.update(); applyAplaCut(); };

  /* ============ HUD DEBUG (włącz `?debug` w URL-u) ============
     Powstał, bo harnessa pomiarowa nie rysuje klatek: mogę odczytać pozycje w danym
     punkcie scrolla, ale nie widzę animacji, więc glitche widoczne tylko w ruchu
     trzeba mierzyć NA URZĄDZENIU. HUD pokazuje co klatkę cztery liczby i zapala się
     na czerwono, gdy kształt ruszy się W DÓŁ (czyli objaw zgłaszany przez Tomka).
     Ostatnie 240 klatek jest w `window.PPB_DEBUG_LOG` — do skopiowania z konsoli. */
  if (/[?&]debug\b/.test(location.search)) {
    const hud = document.createElement("div");
    hud.style.cssText = "position:fixed;left:8px;top:8px;z-index:99999;pointer-events:none;" +
      "font:11px/1.35 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.72);" +
      "padding:6px 8px;border-radius:6px;white-space:pre;min-width:190px";
    document.body.appendChild(hud);
    const log = (window.PPB_DEBUG_LOG = []);
    let prevShape = null, worst = 0;
    const tick = () => {
      const edge = Math.round(section.getBoundingClientRect().top);
      const sh = sharpShape ? sharpShape.getBoundingClientRect().top : 0;
      const bl = blurShape ? blurShape.getBoundingClientRect().top : 0;
      const vr = video ? video.getBoundingClientRect() : null;
      const f = CONFIG.featureShape.frame;
      const sc = vr ? vr.width / f.w : 0;
      const inVid = vr ? vr.top + (f.shapeCy - f.shapeH / 2) * sc : 0;
      const d = prevShape == null ? 0 : sh - prevShape;
      if (d > worst) worst = d;                        // dodatnie = kształt pojechał W DÓŁ
      prevShape = sh;
      const row = { y: Math.round(window.scrollY), edge, shape: Math.round(sh),
        dKopie: Math.round(bl - sh), dKlatka: Math.round(inVid - sh), d: +d.toFixed(1) };
      log.push(row); if (log.length > 240) log.shift();
      hud.style.color = d > 0.6 ? "#F55D5D" : "#fff";
      hud.textContent =
        `scroll   ${row.y}\nkrawędź  ${row.edge}\nkształt  ${row.shape}  (Δ ${row.d})\n` +
        `kopie    ${row.dKopie}\nklatka   ${row.dKlatka}\nmax w dół ${worst.toFixed(1)}`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* --- DIAMENT w bloku 2 -----------------------------------------------------
     W HTML jest JEDEN (desktop trzyma go w w1 i przy swapie tylko obraca + przesuwa).
     Artboard mobile ma ikonę w OBU blokach → klon do w2, przed notką. */
  if (diamond && w2 && goalNote) {
    const diamond2 = diamond.cloneNode(true);
    diamond2.classList.add("is-goal");        // hak na wypadek osobnego stylowania
    w2.insertBefore(diamond2, goalNote);
  }

  /* --- AKAPIT „that most…" — SYSTEM #4 (highlight, doświetlanie scrollem) ----
     Ten sam efekt co desktop, tylko zakres liczony od SAMEGO akapitu (desktop liczy
     od sticky sekcji, bo tam tekst wjeżdża w oknie scruba). */
  /* AKAPIT KARTY 2 („is to keep every program…") — TEN SAM EFEKT (2026-07-28, decyzja
     Tomka: „niech nie ma reveala, tylko ten highlighting"). Oba akapity to ta sama rola
     w układzie (nagłówek is-h-s otwierający kartę), więc mają zachowywać się identycznie.
     Na mobile to dosłownie to samo wywołanie co dla karty 1 — okno zaczepione o SAM
     akapit, bo statyczny stack nie ma sticky, w którego oknie trzeba by je liczyć
     (desktop liczy od sekcji właśnie dlatego, że tam tekst wjeżdża w oknie scruba —
     i desktop ZOSTAJE bez zmian).
     ⚠️ `goalPara` ma w markupie `data-reveal="our-goal"`, a `[data-reveal]` to w
     styleguide FOUC-guard `opacity: 0; visibility: hidden`. Skoro nie idzie już przez
     revealText (który sam ustawia autoAlpha 1), musimy go odsłonić jawnie — inaczej
     zostałby niewidoczny na zawsze. Highlight steruje kryciem SPANÓW `.hl-unit`,
     nie całego elementu, więc te dwa kanały się nie gryzą. */
  const hlEls = [para, goalPara].filter(Boolean);
  gsap.set(goalPara, { autoAlpha: 1 });
  hlEls.forEach((el) => {
    ensureUnits(el);
    if (window.highlightOnScroll) {
      highlightOnScroll(el, { trigger: el, start: "top 85%", end: "top 40%" });
    } else {
      gsap.set(el.querySelectorAll(".hl-unit"), { opacity: 1 }); // brak systemu #4 → nie zostawiaj przygaszonego
    }
  });

  /* --- POZOSTAŁE TEKSTY: globalny line-reveal przy wejściu w ekran ------------
     Zero swapu — oba bloki żyją równocześnie. Stan startowy (autoAlpha 0) trzeba dać
     ręcznie: revealText sam ustawia autoAlpha 1, ale nic nie chowa na starcie
     (na desktopie robił to createSwap dla stanu „Our goal").
     `goalPara` NIE jest już na tej liście — poszedł do highlightu (wyżej). */
  const revealEls = [note, goalNote].filter(Boolean);
  gsap.set(revealEls, { autoAlpha: 0 });
  revealEls.forEach((el) => {
    ensureLines(el);
    revealOnScroll(el, el, { start: m.revealStart, bidirectional: true });
  });

  /* tytuły „We know" / „Our goal" i overlay key-pillars są wyłączone CSS-em (@991) —
     nie splitujemy ich, nie ma swapu, nie ma _ppbAnchor (brak scruba do kotwiczenia). */
}

/* NAV MASK — SYSTEM GLOBALNY #2 → _shared/nav/nav-mask.js
   (initNavMask globalny; sekcję-trigger wskazuje atrybut
   data-nav-theme="light" na .is-home-we-know w index.html) */

/* ============================================================
   MASTER
   ============================================================ */
function initPage(opts) {
  const first = !!(opts && opts.first);
  // lockScroll();  // TYMCZASOWO wyłączone — brak blokady scrolla na czas loadera (prośba Tomka)

  // kształt 1:1 z ostatnią klatką wideo — RESPONSYWNIE (cover-mapping z viewportu)
  computeShapeDims();
  /* MOBILE≤991: shapeDimSel() jest PUSTY (nikt nie dostaje geometrii z wideo — wymiary
     i pozycje idą z CSS). ⚠️ `querySelectorAll("")` rzuca SyntaxError, więc guard. */
  const _sdSel = shapeDimSel();
  if (_sdSel) applyShapeDims(qa(_sdSel));

  /* ============ RESIZE-FIX v2 (2026-07-27, paczka home-rwd-resize-1) ============
     1) RESIZE OBSŁUGUJEMY SAMI (autoRefreshEvents bez "resize").
        ⚠️ v1 używała ScrollTrigger.config({ ignoreMobileResize: true }) — ZA SZEROKIE:
        na kontekstach dotykowych (prawdziwy mobile, ale też DevTools responsive mode!)
        połykało KAŻDY resize samej wysokości → zero refreshy → pin zostawał na starej
        wysokości ("dziura" na dole) i SHAPE_DIMS nie przeliczane (zmierzone headless:
        isTouch=1, po resize 800→1000 pin dalej 800). Własny guard ignoruje TYLKO
        małe zmiany samej wysokości na dotyku (pasek adresu ~60–120px), resztę refreshuje.
     2) refreshInit (PRZED pomiarami każdego refresha): przelicz geometrię bazową —
        SHAPE_DIMS (cover-mapping ostatniej klatki wideo) + kanały STATYCZNE, których
        nie animuje żaden tween. Kanały ANIMOWANE (x/scale/y apli/blur/dup) przelicza
        GSAP: fromTo z wartościami funkcyjnymi + invalidateOnRefresh na scrubie We-know.
     3) KOTWICZENIE PROGRESU: layout jest w vh, więc zmiana WYSOKOŚCI okna przesuwa
        granice sekcji w px, a scroll użytkownika zostaje → po refresh choreografia
        "cofa się" (zmierzone headless: resize w We-know → ST progress 0.229 → 0).
        GSAP-owy pin how-it-works broni się sam; sticky We-know NIE — dlatego przy
        refresh przywracamy scroll tak, żeby AKTYWNA sekcja (0<progress<1) została
        w tym samym momencie choreografii. */
  ScrollTrigger.config({ autoRefreshEvents: "visibilitychange,DOMContentLoaded,load" });

  let _ppbAnchorState = null;
  onST("refreshInit", () => {
    computeShapeDims();
    applyBaseGeometry();   // MOBILE≤991: sam się wyłącza (karty statyczne) — patrz helper
    // kotwica: zapamiętaj progres aktywnej sekcji oznaczonej _ppbAnchor (ostatnia w DOM wygrywa)
    const active = ScrollTrigger.getAll().filter((t) => t._ppbAnchor && t.progress > 0 && t.progress < 1);
    _ppbAnchorState = active.length ? { t: active[active.length - 1], p: active[active.length - 1].progress } : null;
  });

  onST("refresh", () => {
    if (!_ppbAnchorState) return;
    const { t, p } = _ppbAnchorState;
    _ppbAnchorState = null;
    t.scroll(t.start + p * (t.end - t.start));  // ten sam moment choreografii w NOWYM layoucie
    ScrollTrigger.update();
    const tween = t.getTween && t.getTween();   // kisiel scruba: bez 1.2s doganiania po refresh
    if (tween) tween.progress(1);
  });

  /* własny debounced resize (jedyne źródło refreshy przy zmianie rozmiaru okna) */
  let _rzW = window.innerWidth, _rzH = window.innerHeight, _rzT;
  CLEANUP.push(() => clearTimeout(_rzT));   // nawigacja w trakcie debounce'u → nie odpalaj refresha na martwym layoucie
  onWin("resize", () => {
    clearTimeout(_rzT);
    _rzT = setTimeout(() => {
      const widthChanged = window.innerWidth !== _rzW;
      const dH = Math.abs(window.innerHeight - _rzH);
      /* pasek adresu na mobile: SAMA wysokość, mało, kontekst dotykowy → BEZ refresha
         (nie szarpiemy choreografią), ale 2026-07-28 dokładamy LEKKI RELAYOUT: sam
         refresh-less powrót pinu/kadru/maski do nowej wysokości. Bez tego pin trzymał
         starą wysokość w px i pod wideo zostawał TRWAŁY pusty pas (zgłoszenie Tomka;
         zmierzone 844→950 = 106 px dziury). ⚠️ Tryb device w DevTools też jest „touch". */
      if (!widthChanged && dH < 160 && ScrollTrigger.isTouch === 1) {
        _rzH = window.innerHeight;
        relayoutViewportHeight();
        return;
      }
      _rzW = window.innerWidth; _rzH = window.innerHeight;
      ScrollTrigger.refresh();
    }, 200);
  });

  // Unicorn Studio init jest w index.html (onload skryptu) — tu nic nie trzeba
  initHeroScroll();
  initHowItWorks();
  initWeKnow();
  if (window.initSiteFooter) initSiteFooter(PAGE_ROOT);   // globalny footer (_shared/site-footer) — ostatnia sekcja strony
  /* NAV v2 (paczka nav): motyw nava robi arbiter w nav-v2.js; stary system #2 tylko jako fallback.
     BARBA: nav jest site-level, ale STYKI MOTYWU są w kontenerze tej strony —
     bind(PAGE_ROOT) stawia je teraz, destroy() woła unbind(). */
  if (window.PPB && PPB.navV2 && PPB.navV2.bind) PPB.navV2.bind(PAGE_ROOT);
  else initNavMask();

  /* sekcje doklejone (osobne moduły) — wcześniej każda miała WŁASNY listener load,
     który przy nawigacji Barbą nigdy by się nie odpalił. Teraz woła je strona. */
  if (PPB.sections && PPB.sections.keyPillars) PPB.sections.keyPillars.init(PAGE_ROOT);
  if (PPB.sections && PPB.sections.insights) PPB.sections.insights.init(PAGE_ROOT);
  if (PPB.sections && PPB.sections.meetSwiper) PPB.sections.meetSwiper.init(PAGE_ROOT);

  /* RESIZE-FIX (2026-07-27): własny handler resize USUNIĘTY — był redundantny
     (ScrollTrigger sam nasłuchuje resize i robi zdebounce'owany refresh; nasz robił
     DRUGI refresh, a `lastW` nigdy nie było porównywane). Całą robotę robi teraz:
     refreshInit (geometria bazowa) + invalidateOnRefresh + wartości funkcyjne w tweenach
     + ignoreMobileResize (pasek adresu). Twardy reload przy resize (stary wariant
     awaryjny): window.addEventListener("resize", () => location.reload()). */

  /* ============ INTRO — loader TYLKO przy pierwszym wejściu ============
     Decyzja Tomka (2026-07-28): loader gra, gdy user ląduje na home jako
     na pierwszej stronie sesji. Przy POWROCIE na home (Barba) leci samo to,
     co po loaderze: line-reveal tekstów hero + scale unicorna (buildHeroReveal).
     Zasłoną przejścia jest wtedy wipe z transition.js, nie loader. */
  const master = gsap.timeline();

  /* ============ KIEDY LOADER MA ZAGRAĆ ============
     Decyzja Tomka (2026-07-28): loader gra przy KAŻDYM świeżym dokumencie —
     także przy twardym przeładowaniu, bo to normalne wejście na stronę.
     Nie gra tylko wtedy, gdy przyszliśmy przejściem Barby.

     · `first`          — hook `once`, czyli świeżo załadowany dokument
     · `PPB.loaderDone` — flaga W PAMIĘCI: przeżywa nawigacje Barbą (moduł jest
       ładowany raz na dokument), a ginie przy przeładowaniu — dokładnie tak,
       jak ma się zachowywać loader.

     ⚠️ Świadomie BEZ sessionStorage: przeżyłby przeładowanie i zabrałby loader
     tam, gdzie ma być.

     PAS BEZPIECZEŃSTWA (2026-07-28): gdyby mimo wszystko doszło do PEŁNEGO
     ładowania dokumentu przy przejściu z about (Barba nie przechwyciła linku
     albo zadziałał jej fallback `force()`), `first` byłoby true i loader by
     zagrał — mimo że dla użytkownika to zwykłe przejście między stronami.
     Rozróżniamy to twardo: `navigation.type` + referrer.
       · reload TEJ strony            → loader GRA (Twoja decyzja)
       · wejście z innej strony serwisu → loader NIE gra, to nawigacja */
  var navType = "";
  try {
    var navEntry = performance.getEntriesByType("navigation")[0];
    navType = navEntry ? navEntry.type : "";
  } catch (e) {}
  var arrivedByNavigation =
    navType !== "reload" &&
    !!(window.PPB_NAV && window.PPB_NAV.cameFromOwnSite && window.PPB_NAV.cameFromOwnSite());

  if (first && !PPB.loaderDone && !arrivedByNavigation) {
    master.add(buildLoaderTimeline())
          .add(buildHeroReveal(), `-=${CONFIG.loader.revealOverlap}`);
  } else {
    /* POWRÓT NA HOME. Loader jest site-level, więc przetrwał nawigację —
       ale ctx.revert() przy wyjściu z home cofnął mu inline'y GSAP i wrócił
       widoczny (na about niewidoczny, bo jego styl siedzi w odpiętym style.css).
       Chowamy klasą — jedyną rzeczą, której revert nie rusza. */
    const loaderEl = q(".loader_component");
    if (loaderEl) loaderEl.classList.add("is-done");
    master.add(buildHeroReveal());
  }

  master.call(() => {
    unlockScroll();
    ScrollTrigger.refresh();
  });
}

  /* ============================================================
     KONTRAKT BARBA — init / destroy
     ============================================================ */
  var ctx = null;

  function init(opts) {
    opts = opts || {};
    IS_FIRST = !!opts.first;
    PAGE_ROOT = opts.container ||
                document.querySelector('[data-barba-namespace="home"]') ||
                document;
    /* gsap.context(fn, root): zbiera WSZYSTKO, co powstanie w fn (tweeny, piny,
       pin-spacery, ScrollTriggery) i scope'uje selektory-stringi do kontenera.
       Jeden ctx.revert() w destroy() cofa to w całości. */
    ctx = gsap.context(function () { initPage(opts); }, PAGE_ROOT);
  }

  function destroy() {
    /* sekcje doklejone sprzątają SIĘ SAME, ale to strona je zawołała,
       więc to ona je ubija — i to PRZED własnym revertem (kolejność ma
       znaczenie: Swiper i pętla rAF nie mogą przeżyć wyrzucenia DOM-u). */
    if (PPB.sections) {
      if (PPB.sections.meetSwiper) PPB.sections.meetSwiper.destroy();
      if (PPB.sections.insights) PPB.sections.insights.destroy();
      if (PPB.sections.keyPillars) PPB.sections.keyPillars.destroy();
    }
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

  PPB.pages.home = { init: init, destroy: destroy };

  /* PROTOTYP STANDALONE — gdy plik jest otwarty bez harnessu Barby
     (np. stary podgląd sekcji), moduł sam się odpala jak dawniej. */
  if (!window.__PPB_BARBA__) {
    window.addEventListener("load", function () { init({ first: true }); });
  }
})();
