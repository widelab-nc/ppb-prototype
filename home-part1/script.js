/* ============================================================
   Polpharma Biologics — home prototype (TYLKO choreografia strony)
   loader → hero reveal → scrub fade-outy tekstów → pinned flow
   (wideo scrub, rewersyjne statsy, sticky handoff)
   Warstwa globalna (_shared): gsap-config.js (pluginy + PPB.config),
   reveal.js (system #1: revealText/hideText/revealOnScroll/ensureLines),
   nav-shape.js + nav-mask.js (system #2). Ładowane PRZED tym plikiem.
   Docelowo: /pages/home.js (repo → jsDelivr)
   ============================================================ */

/* po refreshu strona ZAWSZE ładuje się na górze (loader gra od zera) */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);   // Lenis jeszcze nie istnieje na tym etapie — natywny reset jest OK

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

  /* "kisiel": smoothing scruba.
     ⚠️ Z LENISEM `scrub: true`, NIE liczba. Kanon projektu (_smooth-lenis/COMPARISON.md):
     „Double-scrub naprawiony: pinned flow zszedł z scrub: 1.2 na scrub: true. Smoothing
     bierze na siebie scroller (Lenis lerp), scrub wideo jest bezpośredni → koniec
     kisielu do kwadratu." Strojenie płynności = `lerp` w smooth-lenis.js, nie tutaj.
     Bez Lenisa (prefers-reduced-motion) wracamy do wartości z _shared. */
  scrubSmooth: window.Lenis ? true : PPB.config.scrubSmooth,

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

    /* --- MOBILE ≤767 (artboard Figma 375×676) ---------------------------------
       Desktop ma DWA takty: [WHAT WE DO + set-1 razem] → [set-2].
       Mobile ma TRZY, bo na 375 nie ma miejsca na WHAT WE DO obok statsów:
         1) WHAT WE DO samo, przy dolnej krawędzi
         2) set-1 — DWA punkty przy dolnej krawędzi (WHAT WE DO znika)
         3) set-2 — DWA punkty przy GÓRNEJ krawędzi, i w tym momencie wjeżdża butelka
       Progi to progress fazy CONTENT (0..1), ta sama skala co statsIn/statsSwap. */
    mobile: {
      maskStart: 22,        // rem — diament wystający z dołu; zmierzone z artboardu 375 (~355px szerokości)
      whatWeDoIn: 0.28,     // takt 1
      set1In: 0.52,         // takt 2
      set2In: 0.80,         // takt 3 (butelka: CONFIG.featureShape.showAt = 0.93)

      /* WIDEO — dwie fazy (Tomek 2026-07-26):
         [0 … videoFitStart]              wideo pełnoekranowe, wyśrodkowane (zwykły cover)
         [videoFitStart … featureShape.showAt]  dojazd do kadru zgranego z kształtem
                                          (scale + zjazd w dół) + narastający gradient u góry
         Koniec = showAt, żeby handoff wideo → .feature-shape_component był 1:1. */
      videoFitStart: 0.78,
      videoFitEase: "power2.inOut",
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
    /* MOBILE: o rozmiarze kształtu NIE decyduje już cover, tylko design —
       shape ma być odsunięty o gutter z lewej, prawej i DOŁU (Figma 375: 20px),
       czyli szerokość = 100vw − 2×1.25rem = 100vw − 2.5rem. Skala wideo jest z tego
       WYPROWADZONA (patrz computeShapeDims), żeby handoff wideo→shape został 1:1. */
    mobileInsetRem: 1.25,
    /* długość gradientu rozpuszczającego górną krawędź wideo w deep-green;
       narasta razem z dojazdem kadru (0 → mobileFadeRem) */
    mobileFadeRem: 5,
  },

  weKnow: {
    pinViewports: 3.5,     // długość scruba za "top top" (JS ustawia wysokość sekcji = (1+pin)×100vh)
    /* 2026-07-27 FIX: było `rightGap: 890/1440` — pozycja kształtu jako ułamek szerokości
       EKRANU. Na szerokich oknach kształt zostawał przy lewej krawędzi ekranu, a kolumna
       tekstu uciekała na prawą → między nimi otwierała się dziura (758px na 2300 vs 402px
       na 1440). Teraz prawa krawędź kształtu jest ułamkiem KONTENERA — tego samego, do
       którego przypięty jest tekst — więc odległość między nimi trzyma proporcję z artboardu.
       0.37645 wyprowadzone z 1440: (550 − 32) / 1376, gdzie 550 to dzisiejsza prawa
       krawędź kształtu. Na 1440 daje IDENTYCZNY wynik co przedtem. */
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
  },
};

/* ---------- scroll lock ---------- */
const lockScroll = () => (document.documentElement.style.overflow = "hidden");
const unlockScroll = () => (document.documentElement.style.overflow = "");

/* ---------- SHAPE_DIMS — rozmiar/pozycja kształtu 1:1 z ostatnią klatką wideo ----------
   Mapowanie object-fit: cover → RESPONSYWNE (liczone z aktualnego viewportu).
   Wynik zapisywany globalnie, używany przy inicie timelines. */
const SHAPE_DIMS = { w: 0, h: 0, dx: 0, dy: 0, scale: 1 };

/* jedno miejsce na próg mobile — ten sam co w @media (max-width: 767px) w style.css */
const MOBILE_MQ = "(max-width: 767px)";
const isMobile = () => window.matchMedia(MOBILE_MQ).matches;

function computeShapeDims() {
  const f = CONFIG.featureShape.frame;
  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  let s;

  if (isMobile()) {
    /* MOBILE — kierunek liczenia jest ODWRÓCONY względem desktopu.
       Desktop: skala bierze się z cover-a wideo, a kształt z niej wynika.
       Mobile:  kształt jest DANY z designu (100vw − 2.5rem), a skala wideo z niego wynika.
       Konsekwencja geometryczna, świadoma: przy 375×676 wychodzi s ≈ 0.517, czyli wideo
       992×558 px — szersze niż ekran (przycinamy) i NIŻSZE niż ekran. Pas nad wideo
       wypełnia deep-green z .home-how-it-works_media (patrz style.css @767). */
    const inset = CONFIG.featureShape.mobileInsetRem * remPx;
    s = (window.innerWidth - 2 * inset) / f.shapeW;
    SHAPE_DIMS.w = f.shapeW * s;
    SHAPE_DIMS.h = f.shapeH * s;
    SHAPE_DIMS.dx = 0;                                                  // wyśrodkowany w poziomie
    SHAPE_DIMS.dy = window.innerHeight / 2 - inset - SHAPE_DIMS.h / 2;  // dolna krawędź = gutter od dołu

    /* Kadr wideo = interpolacja między DWOMA JAWNYMI BOKSAMI, nie transform elementu.
       ⚠️ Dlaczego nie transform (błąd z pierwszego podejścia): wideo ma `object-fit: cover`,
       które PRZYCINA treść do boxa elementu. Skalowanie elementu zmniejszało więc także
       OKNO na wideo → kadr zwężał się i pojawiały się zielone pasy po bokach.
       Tu element dostaje dokładne width/height (aspekt klatki zachowany, więc `fill`
       nie zniekształca) i jest szerszy od ekranu w OBU stanach — pełna szerokość na całej
       długości dojazdu.
         stan 0 (cover): klatka wypełnia ekran, wyśrodkowana
         stan 1 (fit):   skala taka, że shape ma 100vw − 2.5rem i siedzi na dolnym gutterze */
    const sCover = Math.max(window.innerWidth / f.w, window.innerHeight / f.h);
    VIDEO_FIT.w0 = f.w * sCover;
    VIDEO_FIT.h0 = f.h * sCover;
    VIDEO_FIT.l0 = (window.innerWidth - VIDEO_FIT.w0) / 2;
    VIDEO_FIT.t0 = (window.innerHeight - VIDEO_FIT.h0) / 2;
    VIDEO_FIT.w1 = f.w * s;
    VIDEO_FIT.h1 = f.h * s;
    VIDEO_FIT.l1 = window.innerWidth / 2 + SHAPE_DIMS.dx - f.shapeCx * s;
    VIDEO_FIT.t1 = window.innerHeight / 2 + SHAPE_DIMS.dy - f.shapeCy * s;
    VIDEO_FIT.fade = CONFIG.featureShape.mobileFadeRem * remPx;
  } else {
    s = Math.max(window.innerWidth / f.w, window.innerHeight / f.h); // cover scale
    SHAPE_DIMS.w = f.shapeW * s;
    SHAPE_DIMS.h = f.shapeH * s;
    SHAPE_DIMS.dx = (f.shapeCx - f.w / 2) * s; // offset środka kształtu od środka viewportu
    SHAPE_DIMS.dy = (f.shapeCy - f.h / 2) * s;
  }
  SHAPE_DIMS.scale = s;
}

/* Kadr wideo na mobile — INTERPOLOWANY, nie ustawiany na sztywno.
     p = 0  → zwykły cover: wideo pełnoekranowe, wyśrodkowane
     p = 1  → kadr zgrany z kształtem: skala taka, że shape z ostatniej klatki ma
              dokładnie 100vw − 2.5rem, i siedzi na dolnym gutterze
   Gradient (--vfade, użyty w mask-image w style.css) narasta razem z p, bo szew nad
   wideo POWSTAJE dopiero przy zjeździe — przy coverze nie ma czego rozpuszczać.
   Desktop: czyścimy inline i wracamy do czystego CSS-owego object-fit: cover. */
const VIDEO_FIT = { w0: 0, h0: 0, l0: 0, t0: 0, w1: 0, h1: 0, l1: 0, t1: 0, fade: 0, p: 0 };

function applyVideoFit(p) {
  const video = document.querySelector(".home-how-it-works_video");
  if (!video) return;
  if (!isMobile()) { video.style.cssText = ""; return; }   // desktop wraca do CSS-owego cover

  const F = VIDEO_FIT;
  F.p = p = Math.min(1, Math.max(0, p));
  const lerp = (a, b) => a + (b - a) * p;
  video.style.width = lerp(F.w0, F.w1).toFixed(2) + "px";
  video.style.height = lerp(F.h0, F.h1).toFixed(2) + "px";
  video.style.left = lerp(F.l0, F.l1).toFixed(2) + "px";
  video.style.top = lerp(F.t0, F.t1).toFixed(2) + "px";
  video.style.setProperty("--vfade", (F.fade * p).toFixed(1) + "px");
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
  const loader = document.querySelector(".loader_component");
  const captionL = loader.querySelector(".loader_caption.is-left");
  const captionR = loader.querySelector(".loader_caption.is-right");
  const lottieEl = loader.querySelector(".loader_lottie");

  /* LOADER = Lottie 01D (zastąpiła 2 kształty). Ruch: fade-in → zbieżność → ekspansja
     koła do deep-green cover. Klatki 480→620 (comp op 721). Dane inline window.LOADER_01D
     (loader-01d.js), lib lottie-web (CDN). Odtwarzane przez SCRUB klatek w GSAP
     (ease:none = natywne tempo Lottie) → zachowany overlap z hero + fade loadera. */
  const LO_START = 0, LO_END = 140;   // klatki LOTTIE (0-based, 0..241); 0=comp480 (start), 140=comp620 (green cover)
  let anim = null;
  if (window.lottie && window.LOADER_01D && lottieEl) {
    anim = lottie.loadAnimation({
      container: lottieEl,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: window.LOADER_01D,
      rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
    });
    anim.goToAndStop(LO_START, true);
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
    // frost: po zdjęciu loadera hero jest JUŻ namalowane — deterministyczny
    // rebuild warstw backdrop-filter nava (stale snapshot, patrz nav-menu.js)
    .call(function () { if (window.PPB && PPB.kickNavBackdrop) PPB.kickNavBackdrop(); });

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
  tl.fromTo(
    '[data-reveal="ui"]',
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
     2026-07-26: cel to .home-hero_copy — wrapper WOKÓŁ heading+subtitle, bez data-reveal.
     Dlaczego nie sam komponent i nie same teksty:
       • .home-hero_component — bo CTA siedzi teraz w środku (patrz index.html) i ma
         własny, późniejszy trigger; gasłoby na desktopie wcześniej niż dotąd.
       • .home-hero_heading / _subtitle — PUŁAPKA: oba mają data-reveal, więc ich stanem
         początkowym jest FOUC guard `[data-reveal]{opacity:0;visibility:hidden}`.
         ScrollTrigger ze scrubem zapisuje wartość START przy pierwszym renderze — łapał
         zero z guarda, robił tween 0→0 i wypisywał go INLINE, nadpisując `opacity:1`
         od reveala. Efekt: tekst znikał po pierwszym ruchu scrolla i już nie wracał
         (desktop i mobile). Neutralny wrapper nie ma tego stanu. */
  /* MOBILE (Tomek 2026-07-26): hero NIE reaguje na scroll — blok tekstu po prostu
     odjeżdża razem z sekcją, bez scrubowanego fade'u. Desktop bez zmian.
     ⚠️ Decyzja czytana z breakpointu przy inicie: przejście przez 767 podczas
     działania strony wymaga F5 (jak reszta zapieczonych wymiarów w tym pliku). */
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
  ScrollTrigger.create({
    trigger: ".is-home-how-it-works",   // znikają dopiero gdy NASTĘPNA sekcja wjeżdża (top 65%)
    start: "top 65%",
    onEnter: () => gsap.to([".home-hero_arrow", ".contact-cta_component"], { autoAlpha: 0, duration: 0.3, ease: "power1.out", overwrite: "auto" }),
    onLeaveBack: () => gsap.to([".home-hero_arrow", ".contact-cta_component"], { autoAlpha: 1, duration: 0.4, ease: CONFIG.reveal.ease, overwrite: "auto" }),
  });

  /* strzałka hero → smooth-scroll do momentu, gdy „pure play" jest w pełni widoczne
     (górna krawędź sekcji How it works na górze viewportu). */
  const heroArrow = document.querySelector(".home-hero_arrow");
  const hiwSection = document.querySelector(".is-home-how-it-works");
  if (heroArrow && hiwSection) {
    heroArrow.style.cursor = "pointer";
    heroArrow.addEventListener("click", () => {
      const y = hiwSection.getBoundingClientRect().top + window.scrollY;
      /* Lenis przejmuje kółko/scroll — natywny `behavior: "smooth"` biłby się z jego
         pętlą rAF (skok + szarpnięcie). Gdy Lenis jest aktywny, jedziemy jego API. */
      if (window.PPB_LENIS) PPB_LENIS.scrollTo(y);
      else window.scrollTo({ top: y, behavior: "smooth" });
    });
  }
}

/* ============================================================
   STATS — pokazywanie/chowanie (rewersyjne)
   linia rośnie + stagger fade tekstów pod nią
   ============================================================ */
/* Na mobile trzeci stat jest wygaszony CSS-em (display:none, patrz @767).
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
  const section = document.querySelector(".is-home-how-it-works");
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

  /* MOBILE: desktopowe <br> w nagłówku dają na 375 pięć linii zamiast czterech
     z artboardu. Zdejmujemy je ZANIM SplitText podzieli tekst na linie — po splicie
     jest za późno (kontener jest już przebudowany, CSS na <br> nic nie zmienia). */
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
     Stan to teraz PARA { wwd, set }, nie jedna liczba, bo desktop i mobile
     inaczej wiążą WHAT WE DO ze statsami:
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
        hideText(whatWeDoTexts, { stagger: 0 });
      }
    }
    statsState = next;
  }

  /* mapowanie progressu fazy CONTENT na stan — jedyne miejsce, gdzie takty
     desktopu i mobile się rozjeżdżają */
  function stageFor(pc) {
    if (isMobile()) {
      const m = c.mobile;
      if (pc >= m.set2In) return { wwd: false, set: 2 };   // takt 3: dwa punkty u GÓRY + butelka
      if (pc >= m.set1In) return { wwd: false, set: 1 };   // takt 2: dwa punkty u DOŁU
      if (pc >= m.whatWeDoIn) return { wwd: true, set: 0 }; // takt 1: WHAT WE DO samo
      return { wwd: false, set: 0 };
    }
    if (pc >= c.statsSwap) return { wwd: true, set: 2 };
    if (pc >= c.statsIn) return { wwd: true, set: 1 };
    return { wwd: false, set: 0 };
  }

  /* --- feature shape: pojawia się na końcu wideo (rewersyjnie) --- */
  const shape = document.querySelector(".feature-shape_component");
  let shapeShown = false;
  function setShapeState(pc) {
    if (pc >= CONFIG.featureShape.showAt && !shapeShown) {
      shapeShown = true;
      gsap.to(shape, { autoAlpha: 1, duration: 0.5, ease: CONFIG.ease.out, overwrite: "auto" });
    } else if (pc < CONFIG.featureShape.showAt && shapeShown) {
      shapeShown = false;
      gsap.to(shape, { autoAlpha: 0, duration: 0.3, ease: "power1.in", overwrite: "auto" });
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
  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  // 32rem = 512px to na 375-ce więcej niż szerokość ekranu — mobile ma własny start
  // (22rem ≈ 355px, zmierzone z artboardu „Your pure-play…").
  const maskStartPx = (isMobile() ? c.mobile.maskStart : c.maskStart) * remPx;
  const maskEndPx = (window.innerWidth + window.innerHeight) * 1.6; // z zapasem → diament > viewport
  const maskProxy = { size: maskStartPx, offY: window.innerHeight * c.maskPeek };
  const MASK_AR = 810 / 851; // proporcje diamentu z Figmy — radius rośnie proporcjonalnie z kształtem
  function applyMask() {
    const sz = `${maskProxy.size}px ${maskProxy.size * MASK_AR}px`;
    media.style.webkitMaskSize = sz;
    media.style.maskSize = sz;
    const pos = `center calc(50% + ${maskProxy.offY}px)`;
    media.style.webkitMaskPosition = pos;
    media.style.maskPosition = pos;
  }
  applyMask();

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: `+=${total * 100}%`,
      pin: pin,
      scrub: CONFIG.scrubSmooth,
      onUpdate: (self) => handleProgress(self.progress),
    },
  });

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

  tl.to(maskProxy, {
      size: maskEndPx,     // diament rośnie do pełnego odsłonięcia; rotacja (SVG) NIE animowana
      offY: 0,             // + jednocześnie podnosi się z peeku do środka
      ease: "none",
      duration: expandDur,
      onUpdate: applyMask,
    })
    // wideo zostaje zwykłym fullscreenem (nie skalujemy) — rosnąca maska odsłania jego fragment
    // scrub wideo przez CAŁĄ fazę content (wygładzony)
    .to(videoProxy, { p: 1, ease: "none", duration: contentPortion, onUpdate: syncVideo }, 0)
    // header: do góry + fade, dłuższy end (scrub — działa w dwie strony)
    .to(header, {
      autoAlpha: 0,
      y: c.headerOut.y,
      ease: "none",
      duration: expandDur * c.headerOut.portion,
    }, 0)
    .to({}, { duration: Math.max(0.001, 1 - contentPortion) }, contentPortion);

  /* MOBILE: dojazd kadru wideo do kształtu — dopiero na końcu fazy content.
     Kończy się DOKŁADNIE na featureShape.showAt, czyli w klatce, w której pojawia się
     .feature-shape_component — dzięki temu handoff jest 1:1 i nie widać podmiany. */
  if (isMobile()) {
    const fitStart = c.mobile.videoFitStart;
    const fitEnd = CONFIG.featureShape.showAt;
    const fitProxy = { p: 0 };
    applyVideoFit(0);
    tl.to(fitProxy, {
      p: 1,
      ease: c.mobile.videoFitEase,
      duration: Math.max(0.001, (fitEnd - fitStart) * contentPortion),
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
function initWeKnow() {
  const c = CONFIG.weKnow;
  const L = c.layout;
  const section = document.querySelector(".is-home-we-know");
  const wp1 = section.querySelector(".home-we-know_wp1");
  const titleWrap = section.querySelector(".home-we-know_title-wrap");
  const fixedShape = document.querySelector(".feature-shape_component");
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
  let targetScale = (window.innerHeight * (c.shapeTargetVh / 100)) / SHAPE_DIMS.w;

  /* pozycja X kształtu: prawa krawędź jako ułamek KONTENERA (nie ekranu — patrz komentarz
     przy shapeRightInContainer). Kontener liczony tak samo jak --container-gutter w CSS. */
  const scaledW = window.innerHeight * (c.shapeTargetVh / 100); // = SHAPE_DIMS.w × targetScale
  // środek elementu = 50vw + x; prawa krawędź = środek + scaledW/2
  // (prawa krawędź z shapeRightEdge() — TEN SAM wzór, którego używa dok tytułu)
  let shapeLeftX = shapeRightEdge() - scaledW / 2 - window.innerWidth / 2;

  /* MOBILE (prototyp 2026-07-26): zjazd kształtu w lewo + skalowanie do 120vh to
     kompozycja DESKTOPOWA — robi miejsce na kolumnę tekstu „We know" po prawej.
     Na 375 nie ma tej kolumny (teksty wygaszone, patrz style.css @767), a shape
     wyjechałby poza ekran. Zostawiamy go tam, gdzie skończył handoff: wyśrodkowany,
     szerokość 100vw − 2.5rem, dolna krawędź na gutterze.
     ⚠️ Do zastąpienia właściwą kompozycją mobile, gdy powstanie artboard We know. */
  if (isMobile()) {
    targetScale = 1;
    shapeLeftX = 0;
  }

  // apla: pozycja startowa przez GSAP (yPercent), żeby tween yPercent: 0 działał
  gsap.set(section.querySelector(".home-we-know_bg"), { yPercent: 100 });

  /* kopie shape'a (rozmiar/pozycja 1:1 z klatką wideo — ustawione w master):
     - weShape (blur, pod aplą): ukryta do handoffu (podmiana z fixed na starcie pinu)
     - aplaShape (ostra, W apli): kontr-transform (-100vh względem bazowej pozycji)
       równoważy startowe przesunięcie apli → wizualnie stoi w miejscu */
  gsap.set(weShape, { autoAlpha: 0 });
  gsap.set(aplaShape, { y: SHAPE_DIMS.dy - window.innerHeight });

  // butelki (włącznie z tą w fixed overlay) — rozmiar 1:1 do kształtu (SHAPE_DIMS) + centrowanie + tilt startowy
  const allBottles = gsap.utils.toArray(document.querySelectorAll(".feature-shape_bottle"));
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
     krawędzią ekranu (y = 100vh − top wp1 w px) i dojeżdża do miejsca docelowego */
  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const wp1TopPx = window.innerHeight * (L.titleTop / 100) - 1.5 * L.paraLine * remPx;
  const transferY = window.innerHeight - wp1TopPx; // start: górna krawędź wp1 = dół ekranu
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
  /* 2026-07-27 FIX: liczyło `innerWidth * (1 - c.rightGap)`. Po przepięciu kształtu na
     kotwicę kontenerową klucz `rightGap` przestał istnieć → `undefined` → NaN → `left: NaNpx`
     → tytuł „We know" uciekał na lewą krawędź ekranu. Teraz prawa krawędź kształtu liczona
     jest DOKŁADNIE tak samo jak przy jego pozycjonowaniu (jedna funkcja, jedno źródło). */
  function shapeRightEdge() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const gutter = Math.max(2 * rem, (window.innerWidth - 86 * rem) / 2);
    return gutter + c.shapeRightInContainer * (window.innerWidth - 2 * gutter);
  }
  function titleMidX() {
    const textLeft = wp1.getBoundingClientRect().left;         // lewa krawędź kolumny tekstu
    return (shapeRightEdge() + textLeft) / 2;
  }
  /* ============ HIGHLIGHT akapitu — SYSTEM GLOBALNY #4 ============
     Zastąpił własną maszynkę (split na litery + tween `color` wpięty w wielki timeline
     We-know). Okno scrolla jest DOKŁADNIE to samo co przedtem: [enterAt, enterAt+travel]
     w vh za "top top" sekcji — czyli highlight kończy się, gdy tekst siada na miejscu.
     Forma programowa (nie `initHighlights`), bo sekcja jest sticky i procentowy `end`
     nie miałby sensu — wzorzec 1:1 z track-record/.
     ⚠️ _shared/README.md pisze przy systemie #4, że ten akapit ma feeling „char" — to już
     nieaktualne (decyzja Tomka 2026-07-27: wyraz). Do poprawienia w README przy okazji.
     Feeling (przygaszenie bazy, gęstość, ease) = gsap-config.js → blok `highlight`.
     NIE strój tego tutaj. */
  if (window.highlightOnScroll) {
    highlightOnScroll(para, {
      /* BEZ `unit` — bierze domyślną z gsap-config.js (word). Decyzja Tomka 2026-07-27:
         ten sam feeling co track-record, czyli po WYRAZIE, nie po literze. */
      trigger: section,
      start: () => `top top-=${(enterAt / 100) * window.innerHeight}`,
      end: () => `+=${(travel / 100) * window.innerHeight}`,
    });
  }

  titleWrap.style.left = `${titleMidX()}px`;
  const titleCenterX = window.innerWidth / 2 - titleMidX();    // offset dok → środek ekranu (entrance)
  window.addEventListener("resize", () => { titleWrap.style.left = `${titleMidX()}px`; });

  /* split tekstów We-know UPFRONT (nie lazy) — line-reveal (tytuł/notka/goal) + akapit na litery */
  [title, note, ...goalEls].forEach(ensureLines);
  gsap.set(title, { autoAlpha: 0 });   // ukryty do SINGLE-TRIGGER reveala (po zakończeniu ruchu shape'a)
  /* AKAPIT "that most…" — split ZAGNIEŻDŻONY (2026-07-26): "lines,chars" daje JEDNOCZEŚNIE
     linie (pod globalny line-reveal revealText/hideText) i litery (pod scroll-driven
     kolorowanie szarość → #005453). Wcześniej był sam "chars" → akapit NIE mieścił się
     w systemie #1 i musiał być chowany ręcznym fade'em = inny efekt niż tytuł/notka.
     ⚠️ ensureLines() NIE może tu wejść (zrobiłby DRUGI split na "lines" i zjadł litery),
     więc cache _rvLines budujemy ręcznie w DOKŁADNIE tym samym kształcie co ensureLines
     (linia .rv-line = maska, wrapper .rv-line-in = animowany; litery jadą w środku). */
  /* 2026-07-27: akapit przepięty na SYSTEM GLOBALNY #4 (_shared/highlight.js).
     Kolejność jest istotna: NAJPIERW jednostki highlightu (ensureUnits przebudowuje element
     z czystego textContent), DOPIERO POTEM podział na linie — split "lines" tylko OPAKOWUJE
     istniejące dzieci, więc spany .hl-word/.hl-unit przeżywają. Odwrotna kolejność by je skasowała.

     Linie robi WSPÓLNY ensureLines() z reveal.js, nie ręczny SplitText. Wcześniej stał tu
     jego ręczny duplikat — był potrzebny, bo split musiał być "lines,chars" (litery pod własne
     kolorowanie), a ensureLines robi tylko "lines". Teraz litery daje system #4, więc duplikat
     jest zbędny — i był źródłem rozjazdu: element przechodził przez dwie różne ścieżki podziału
     i w DOM lądowały 140 jednostek zamiast 70 (co druga pusta), a cache `_hlUnits` wskazywał
     tylko połowę z nich → highlight animował nie te węzły, które widać. */
  ensureUnits(para);   // jednostka z configu (PPB.config.highlight.unit = "word")
  ensureLines(para);
  /* Sprzątanie po podziale na linie: SplitText potrafi zostawić PUSTE `.hl-unit` (efekt uboczny
     wrapowania). Nic nie renderują i nie ma ich w cache `_hlUnits`, więc animacja i tak ich nie
     dotyka — ale martwe spany w DOM to śmieć, który przy porcie do Webflow zaczyna żyć własnym życiem. */
  para.querySelectorAll(".hl-unit").forEach((u) => { if (!u.textContent) u.remove(); });
  /* stan początkowy liter daje CSS (.hl-unit { opacity: .22 } w styleguide.css) — zero FOUC.
     Dawne `gsap.set(paraChars, { color: "rgba(0,84,83,0.18)" })` już niepotrzebne. */

  /* --- DUPLIKACJA: skalowanie całego klastra (groupScale) wokół jego środka + okno czasu ---
     groupScale skaluje ROZMIARY i ODSTĘPY jednolicie wokół centroidu klastra (layout bez zmian,
     tylko mniejszy/większy). Okno dup KOŃCZY się dokładnie na aplaStart+aplaLen = moment gdy
     apla (solid) dochodzi do góry i pojawia się "Our goal". */
  const _gS = c.dup.groupScale != null ? c.dup.groupScale : 1;
  const _gX = c.dup.groupX || 0, _gY = c.dup.groupY || 0;
  const _cx = c.dup.positions.reduce((a, p) => a + p.x, 0) / c.dup.positions.length;
  const _cy = c.dup.positions.reduce((a, p) => a + p.y, 0) / c.dup.positions.length;
  const dupPos = c.dup.positions.map((p) => ({
    x: _cx + (p.x - _cx) * _gS + _gX,   // scale wokół centroidu + przesunięcie grupy
    y: _cy + (p.y - _cy) * _gS + _gY,
    scale: p.scale * _gS,
  }));
  const dupStart = s.aplaStart + s.aplaLen * c.dup.at;
  const dupEnd = s.aplaStart + s.aplaLen;                 // = moment "Our goal" (apla topi)
  const dupSpan = Math.max(0.01, dupEnd - dupStart);
  const dupStagger = dupSpan * c.dup.staggerFrac;         // stagger tylko STARTU

  tl
    // kształt w lewo + skala (scrub) — weShape + aplaShape + fixedShape identycznie (fixedShape tylko dla ciągłości handoffu)
    .to([weShape, aplaShape, fixedShape], { x: shapeLeftX, scale: targetScale, duration: s.entrance, ease: "none" }, 0)
    // butelki (weShape, wszystkie 4) blurrują się PODCZAS ruchu w lewo — start OPÓŹNIONY o blurStart
    .to(weShapeBottles, { filter: `blur(${c.bottleBlur}px)`, ease: "none",
      duration: s.entrance * (1 - c.blurStart) }, s.entrance * c.blurStart)
    // butelki (grupa) POJAWIAJĄ SIĘ gdy tekst rusza w górę: opacity 0 → 40% (blur gotowy); koniec = start dup
    .to(weShapeBottleWrap, { opacity: c.bottleBlurOpacity, ease: "none",
      duration: travel * c.bottleShowFrac }, enterAt)
    // gdy zaczyna się blur → butelka ZACZYNA OBRÓT do pionu + korekta pozycji (uprightX/Y)
    .to(allBottles, {
      rotation: c.bottleUpright,
      xPercent: -50 + c.bottleUprightX + c.bottlePreDupX,
      yPercent: c.bottleY + c.bottleUprightY,
      ease: "none", duration: s.entrance * (1 - c.blurStart),
    }, s.entrance * c.blurStart)
    // butelka JUŻ SIĘ ZMNIEJSZA podczas ruchu w lewo (scale mnoży się z rosnącym shape'em)
    .fromTo(allBottles, { scale: 1 },
      { scale: c.bottleEntranceScale, ease: "none", duration: s.entrance, immediateRender: true }, 0)
    /* TRANSFER POZYCJI wp1 — z dołu ekranu do miejsca docelowego (scrub = kisiel działa) */
    .fromTo(wp1, { y: transferY },
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
    .fromTo(title, { x: titleCenterX },
      { x: 0, ease: "none", duration: travel / 2, immediateRender: true }, enterAt + travel / 2)
    // apla (mist) wjeżdża z dołu; span switch gra na single trigger (onUpdate)
    .to(bg, { yPercent: 0, ease: "none", duration: s.aplaLen }, s.aplaStart)
    // kontr-transform ostrej kopii: stoi w miejscu, apla odkrywa ją swoją krawędzią
    .to(aplaShape, { y: SHAPE_DIMS.dy, ease: "none", duration: s.aplaLen }, s.aplaStart)
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
    tl.to(pair, {
      xPercent: dupPos[i].x, yPercent: dupPos[i].y, scale: dupPos[i].scale,
      ease: "none", duration: durI,
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
}

/* NAV MASK — SYSTEM GLOBALNY #2 → _shared/nav/nav-mask.js
   (initNavMask globalny; sekcję-trigger wskazuje atrybut
   data-nav-theme="light" na .is-home-we-know w index.html) */

/* ============================================================
   MASTER
   ============================================================ */
window.addEventListener("load", () => {
  // lockScroll();  // TYMCZASOWO wyłączone — brak blokady scrolla na czas loadera (prośba Tomka)

  // kształt 1:1 z ostatnią klatką wideo — RESPONSYWNIE (cover-mapping z viewportu)
  computeShapeDims();
  applyShapeDims(document.querySelectorAll(".feature-shape_component, .home-we-know_shape"));
  applyVideoFit(0);   // start: wideo pełnoekranowe (cover); dojazd robi timeline how-it-works

  // Unicorn Studio init jest w index.html (onload skryptu) — tu nic nie trzeba
  initHeroScroll();
  initHowItWorks();
  initWeKnow();
  /* (site footer poza zakresem home-part1 — sekcja usunięta z DOM) */
  initNavMask();

  /* responsywność (TESTOWO 2026-07-24 — BEZ reloadu, żeby dało się testować skalowanie):
     zamiast przeładowania robimy tylko ScrollTrigger.refresh() (debounced) → layout i fluid
     scaling reflowują na żywo, bez loadera. ⚠️ Część animacji z zapieczonymi wymiarami px
     (shape We-know, transfery tekstu, maska how-it-works) może być lekko rozjechana do ręcznego
     F5 — akceptowalne do testów responsywności. Reload przywrócisz odkomentowując location.reload(). */
  let lastW = window.innerWidth, _rzT;
  window.addEventListener("resize", () => {
    clearTimeout(_rzT);
    _rzT = setTimeout(() => {
      lastW = window.innerWidth;
      // przeliczenie kształtu i zoomu wideo — inaczej po przejściu przez próg 767
      // shape zostaje w skali „tamtego" trybu i handoff się rozjeżdża
      computeShapeDims();
      applyShapeDims(document.querySelectorAll(".feature-shape_component, .home-we-know_shape"));
      applyVideoFit(VIDEO_FIT.p);   // przelicz kadr, zachowując aktualny progres dojazdu
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      // location.reload();  // <- odkomentuj, żeby wrócić do twardego reloadu przy zmianie szerokości
    }, 200);
  });

  const master = gsap.timeline();
  master
    .add(buildLoaderTimeline())
    .add(buildHeroReveal(), `-=${CONFIG.loader.revealOverlap}`)
    .call(() => {
      unlockScroll();
      if (window.PPB_SMOOTH && PPB_SMOOTH.start) PPB_SMOOTH.start();   // Lenis rusza po loaderze
      ScrollTrigger.refresh();
    });
});
