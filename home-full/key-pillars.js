/* ============================================================
   Polpharma Biologics — KEY PILLARS (merge do home-full, TYLKO choreografia)
   Trzy sekcje doklejone na dole home-full (po is-home-we-know):
   1) INTRO „Swiss engineered…" — reveal tekstu + nawiasy (segmenty rosną poziomo od
      brzegów do środka, równo z revealem). Ręczna choreografia initIntro(section);
      tekst na named data-reveal="intro".
   2) KEY PILLARS — WEJŚCIE kolumny z góry per-element (line-reveal tekstów + scaleX
      linii kroków, prawa grupa rotate/scale) → sticky (pin) + scroll: wideo scrub,
      progress ring, aktywny krok + kropka; copy = SWAP-IN-PLACE (system #3, swap.js).
   3) CONCEPT „From concept…" — pojedynczy tekst (data-reveal="concept", obsłużony
      RĘCZNIE w initConcept przez revealOnScroll bidirectional) + kształty zbiegają się
      (bez sticky, koniec na bottom bottom).

   ⚠️ IIFE z LOKALNYM const CONFIG — home-full/script.js ma już własny top-level
   `const CONFIG`, więc ten plik NIE może deklarować drugiego w globalu (kolizja).
   Wszystko żyje w tym IIFE; referuje globalne gsap/ScrollTrigger/PPB/revealText/
   hideText/createSwap z warstwy _shared (ładowanej przed script.js).
   Ładowany PO script.js w home-full/index.html; ma WŁASNY load-listener.
   Home-full boot NIE woła initReveals() — dlatego concept obsłużony ręcznie tutaj.
   Docelowo: część /pages/home.js
   ============================================================ */

(function () {
  /* ---------- CONFIG — strojenie SEKCJI tutaj (LOKALNE dla tego IIFE) ----------
     (easingi wspólne + line-reveal = PPB.config z _shared/gsap-config.js;
     reveale pojedynczych tekstów są deklaratywne — bez configu tutaj) */
  const CONFIG = {
    ease: PPB.config.ease,          // = home CONFIG.ease

    /* ===== SECTION-SPECIFIC ===== */
    /* INTRO — nawias: segmenty rosną POZIOMO od BRZEGÓW do środka, RÓWNO z reveal'em
       tekstu (dłużej niż tekst). Zatwierdzony wariant. */
    introBrackets: {
      revealStart: "top 45%",   // mniejszy % = później (global reveal = "top 75%")
      spread: 1.6,              // s — nawias wjeżdża równo z revealem, kończy po nim
      ease: "power3.out",
    },
    keyPillars: {
      steps: 4,               // liczba pillarów / kroków / kropek / stanów swapa
      pinViewports: 4.0,      // długość scrolla pinu (w ekranach) — ~1 ekran na krok
      scrubSmooth: 1.0,       // „kisiel" — wygładzenie scruba (NIE scrub:true)
      videoTail: 0.04,        // margines końca wideo (s)
      clickToScroll: true,    // klik w krok przewija do jego segmentu
      /* WEJŚCIE kolumny (scroll z góry): teksty = globalny line-reveal, linie kroków =
         scaleX grow (jak home-how-it-works_stat-line). Rytm 1:1 z home statsami. */
      entry: {
        /* KAŻDY element odpala się na SWOIM triggerze (kaskada pozycyjna góra→dół).
           ⚠️ Sekcja jest pinowana i CENTROWANA w 100vh — dolne kroki siedzą ~82% ekranu,
           więc literalne "top 75%" by ich nie złapało (pin je zamraża zanim dojadą do 75%).
           "top 85%" łapie wszystkie w oknie wjazdu, przed pinem. */
        itemStart: "top 85%",
        labelDur: 0.4,        // fade kropki „key pillars"
        lineDuration: 0.5,    // rozrost linii kroku (scaleX 0→1)
        ctaDur: 0.5,          // fade CTA „Work with us"
        textStagger: 0.08,    // stagger linii W obrębie jednego reveala tekstu
        stageRotate: -45,     // start rotate prawej grupy (ring / pager)
        stageScale: 0.8,      // start scale
        stageDur: 0.9,        // czas reveala prawej grupy
      },
    },
    concept: {
      /* REWERS: START wyśrodkowane (x:0 = złączony znak) → KONIEC rozsunięte tak, że
         GAP między kółkiem a kwadratem = 2.625rem (42px). W rem (skaluje się z root-fontem):
         gap = (squareEnd − circleEnd) − (14.9375 + 15.625) = 33.1875 − 30.5625 = 2.625rem. */
      circleEndRem: -16.59375,
      squareEndRem: 16.59375,
      shapesStart: "top 50%",       // start zbiegania (góra sekcji na środku ekranu)
      shapesEnd: "bottom bottom",   // koniec zbiegania — dół sekcji na dole ekranu
      bgShiftPercent: -16.667,      // subtelny parallax gradientu (−20vh z 120vh)
      scrubSmooth: 1.0,
    },

    /* NACHODZENIE (2026-07-24): blok key-pillars wjeżdża na We know (CSS: intro margin-top
       -100vh + z:20). Tu: solidny overlay rosnący na We know + lekki dryf butelek w górę. */
    entryOverlap: {
      coverOffsetVh: 0,            // overlay/dryf startują RAZEM z wjazdem bloku (przerwa jest teraz w margin-top bloku)
      overlayMaxAlpha: 0.5,        // docelowe krycie overlaya (0..1)
      driftVh: 6,                  // o ile CAŁA We-know (sticky stage) jedzie w GÓRĘ — parallax-out
    },

    /* CTA (Figma 4473:4736) — okręgi tła: start lekko oddalone → dojazd do pozycji z Figmy
       gdy sekcja się pojawia (top bottom) → jest pełna (top top). */
    cta: {
      circleSpread: 100,           // px — o tyle każdy okrąg jest DALEJ na starcie (góra ↑, dół ↓)
      bottleGap: "8rem",           // odstęp tekstu CTA od czubka butelki → CSS --cta-bottle-gap.
                                   // Rezerwa na dole sekcji = wysokość butelki + ten odstęp.
    },

    /* FOOTER BOTTLE REVEAL — przeniesione z labu _code/cta-bottle-reveal/ (2026-07-26).
       Pełne uzasadnienie każdej wartości: README tego labu. */
    bottle: {
      /* --- ŹRÓDŁA (sync liczony w CZASIE, więc zmiana fps pliku nic tu nie wymaga) --- */
      nTop: 16,                    // klatek sekwencji PNG
      seqDir: "assets/sequence-2x",// "assets/sequence" = 200×250 (oryginał z AE),
                                   // "assets/sequence-2x" = 400×500 (Lanczos) — zdejmuje z przeglądarki
                                   // jej własny upscale na retinie (+10,7 % ostrości na renderze)
      seqFps: 24,                  // fps, w którym wyrenderowana jest sekwencja (AE Comp 1, klatki 24–39)
      fallbackDuration: 1.9167,    // długość taśmy (s) — zanim wideo zgłosi metadane
      frameOffset: 0,              // ± klatka, gdy render z AE ma przesunięcie startu

      /* --- ZAKRES SCROLLA --- */
      start: "bottom 85%",         // trigger = butelka: jej DÓŁ na 85 % ekranu
      end: "bottom 50%",           // endTrigger = widoczny pasek taśmy: jego DÓŁ na 50 %
      scrubSmooth: 1.0,            // „kisiel" — sekundy doganiania

      /* --- USTAWIENIE BUTELKI --- */
      width: 14,                   // % szerokości WIDEO (zmierzone dopasowanie do fiolek: 13,96 %).
                                   // ⚠️ NIE ograniczaj maxem w px — butelka musi rosnąć razem z taśmą.
      nudgeY: "0%",                // + = w górę (% wysokości wideo)

      /* --- SZEW sekwencja ↔ taśma ---
         PNG jest w sRGB, taśma w H.264: przeglądarka renderuje je inną ścieżką koloru.
         Zmierzone regresją na styku: różnica to GAMMA (błąd ~1/255), nie jasność (~4/255). */
      gamma: 0.874,                // filtr #bottleMatch w index.html (feComponentTransfer)
      tone: 1.0,                   // dostrajacz jasności na wierzchu gammy (1 = wyłączony)
      overlapPct: 0,               // o ile % swojej wysokości butelka wchodzi NA wideo
      featherPct: 0,               // rozmycie dolnej krawędzi (≤ overlapPct)

      /* --- TRANSFER ---
         createVideoScrub ściąga CAŁĄ taśmę do bloba (6,3 MB). Ta sekcja jest OSTATNIA na
         stronie, więc nie startujemy tego przy load — dopiero blisko sekcji. "" = od razu. */
      lazyPrefetch: "top bottom+=150%",
    },
  };

  /* SYSTEMY GLOBALNE → _shared: #1 line-reveal (reveal.js), #3 swap-in-place (swap.js).
     Concept „From concept…" = data-reveal="concept" → RĘCZNY revealOnScroll(bidirectional)
     w initConcept (home-full NIE woła initReveals). Intro „Swiss…" = RĘCZNA choreografia
     (nawiasy) → initIntro(section); tekst na named data-reveal="intro". */

  /* ============================================================
     1) INTRO — nawias: segmenty rosną POZIOMO od BRZEGÓW do środka (origin is-a left /
        is-b right), RÓWNO z reveal'em tekstu, ale dłużej (spread). Chowanie/re-fire wg
        globalnej reguły off-screen (reset gdy sekcja cała zniknie przy scrollu w górę).
     ============================================================ */
  function initIntro(section) {
    if (!section) return;
    const cfg = CONFIG.introBrackets;

    const segs = section.querySelectorAll(".home-key-pillars-intro_line-seg");
    const texts = section.querySelectorAll('[data-reveal="intro"]');
    const reduced = window.REDUCED_MOTION;

    // origin skalowania na BRZEGACH (GSAP domyślnie 50%, ustawiamy jawnie):
    // is-a od lewej (zewnętrznej) krawędzi, is-b od prawej → oba rosną do środka.
    gsap.set(section.querySelectorAll(".home-key-pillars-intro_line-seg.is-a"), { transformOrigin: "left center" });
    gsap.set(section.querySelectorAll(".home-key-pillars-intro_line-seg.is-b"), { transformOrigin: "right center" });

    let isOpen = false;

    function collapse() {
      gsap.set(segs, { scaleX: 0 });
      isOpen = false;
    }

    // nawias (scaleX 0→1 od brzegów) wjeżdża RÓWNO z revealem tekstu, ale trwa dłużej
    function open() {
      if (isOpen) return;
      isOpen = true;
      if (reduced) { revealText(texts); gsap.set(segs, { scaleX: 1 }); return; }
      gsap.timeline()
        .add(revealText(texts), 0)
        .to(segs, { scaleX: 1, duration: cfg.spread, ease: cfg.ease }, 0);
    }

    collapse();

    // reveal przy wejściu (re-fire — bidirectional). start per wariant (lokalny knob)
    ScrollTrigger.create({ trigger: section, start: cfg.revealStart, onEnter: open });
    // chowanie NIEWIDOCZNE: reset dopiero gdy sekcja cała zniknie górą (scroll w górę)
    ScrollTrigger.create({
      trigger: section,
      start: PPB.config.reveal.hideStart,
      onLeaveBack: function () { hideText(texts); collapse(); },
    });
  }

  /* ============================================================
     2) KEY PILLARS — pin + scrub (copy = swap-in-place)
     ============================================================ */
  function initKeyPillars() {
    const c = CONFIG.keyPillars;
    const section = document.querySelector(".is-home-key-pillars");
    if (!section) return;

    const pin = section.querySelector(".home-key-pillars_pin");
    const video = section.querySelector(".home-key-pillars_video");
    const ring = section.querySelector(".home-key-pillars_ring-progress");
    const copies = section.querySelectorAll(".home-key-pillars_copy-item");
    const steps = section.querySelectorAll(".home-key-pillars_step");
    const dots = section.querySelectorAll(".home-key-pillars_dot");

    video.pause();

    const ringLen = ring.getTotalLength();
    ring.style.strokeDasharray = ringLen;
    ring.style.strokeDashoffset = ringLen;

    /* SWAP-IN-PLACE (system #3 → swap.js): copy stoi w miejscu, na scrub pinu
       podmienia się treść. Każdy stan wchodzi/wychodzi wspólnym line-revealem
       (revealText/hideText). Stackowanie = CSS (.home-key-pillars_copy-item absolute).
       start:-1 = na starcie NIC (pierwszy pillar odsłania WEJŚCIE, nie load). */
    const swap = createSwap({
      states: Array.from(copies).map((el) => ({
        el,
        targets: el.querySelectorAll(".home-key-pillars_heading, .home-key-pillars_paragraph"),
      })),
      start: -1,
    });

    let activeIndex = -1;
    let entered = false;      // scrub steruje swapem DOPIERO po wjeździe kolumny
    function setActive(i) {
      if (i === activeIndex) return;
      activeIndex = i;
      swap.setState(i);                                          // copy: line-reveal swap
      steps.forEach((el, n) => el.classList.toggle("is-active", n === i));
      dots.forEach((el, n) => el.classList.toggle("is-active", n === i));
    }

    /* ---------- WEJŚCIE kolumny (scroll z góry) — PER-ELEMENT ----------
       KAŻDY element ma WŁASNY ScrollTrigger (start = entry.itemStart) i sam się aktywuje,
       gdy wjeżdża w kadr → naturalna kaskada pozycyjna (góra→dół), bez skryptowanego staggeru.
         teksty (label, labele kroków, copy) = globalny line-reveal,
         linie kroków = scaleX 0→1 (wzorzec home-how-it-works_stat-line),
         kropka + CTA = fade, prawa grupa (ring+wideo) i pager = rotate/scale/opacity.
       Re-fire: pojedynczy reset na reveal.hideStart (sekcja cała zniknie górą) zeruje
       flagi „shown" i chowa wszystko → przy ponownym zjeździe elementy grają od nowa. */
    const e = c.entry;
    const reduced = window.REDUCED_MOTION;
    const ease = CONFIG.ease.out;
    const labelDot = section.querySelector(".home-key-pillars_label-dot");
    const labelText = section.querySelector(".home-key-pillars_label-text");
    const cta = section.querySelector(".home-key-pillars_cta");
    const stepLines = section.querySelectorAll(".home-key-pillars_step-line");
    const stepLabels = section.querySelectorAll(".home-key-pillars_step-label");
    const stage = section.querySelector(".home-key-pillars_stage");   // ring + wideo z maską
    const pager = section.querySelector(".home-key-pillars_pager");   // diament + kropki
    const rightEls = [stage, pager];
    const introTexts = [labelText].concat(Array.from(stepLabels)); // wszystkie teksty kolumny (do reset)
    gsap.set(stepLines, { scaleX: 0, transformOrigin: "left center" });

    /* helper: element odpala playFn RAZ na swoim itemStart (guard shown);
       reset() zeruje flagę → re-fire po resetEntry. */
    const items = [];
    function addItem(trigger, playFn) {
      let shown = false;
      ScrollTrigger.create({
        trigger: trigger,
        start: e.itemStart,
        onEnter: function () { if (!shown) { shown = true; playFn(); } },
      });
      items.push(function () { shown = false; });
    }

    function revealRight(el) {
      if (reduced) { gsap.set(el, { autoAlpha: 1, rotation: 0, scale: 1 }); return; }
      gsap.fromTo(el,
        { rotation: e.stageRotate, scale: e.stageScale, autoAlpha: 0 },
        { rotation: 0, scale: 1, autoAlpha: 1, duration: e.stageDur, ease: ease });
    }

    // LABEL (kropka fade + tekst line-reveal)
    addItem(section.querySelector(".home-key-pillars_label"), function () {
      if (reduced) { gsap.set(labelDot, { autoAlpha: 1 }); revealText(labelText); return; }
      gsap.to(labelDot, { autoAlpha: 1, duration: e.labelDur, ease: ease });
      revealText(labelText);
    });
    // COPY pierwszego pillara — odsłania pillar 0 + WŁĄCZA scrub (entered)
    addItem(section.querySelector(".home-key-pillars_copy"), function () {
      setActive(0);
      entered = true;
    });
    // CTA fade
    addItem(cta, function () {
      if (reduced) { gsap.set(cta, { autoAlpha: 1 }); return; }
      gsap.to(cta, { autoAlpha: 1, duration: e.ctaDur, ease: ease });
    });
    // KROKI — każdy krok osobno: linia scaleX + label line-reveal
    steps.forEach(function (step) {
      const line = step.querySelector(".home-key-pillars_step-line");
      const label = step.querySelector(".home-key-pillars_step-label");
      addItem(step, function () {
        if (reduced) { gsap.set(line, { scaleX: 1 }); revealText(label); return; }
        gsap.to(line, { scaleX: 1, duration: e.lineDuration, ease: ease, overwrite: "auto" });
        revealText(label, { stagger: e.textStagger });
      });
    });
    // PRAWA GRUPA — stage i pager osobno (naturalny stagger z pozycji: stage wyżej → wcześniej)
    addItem(stage, function () { revealRight(stage); });
    addItem(pager, function () { revealRight(pager); });

    /* RESET (re-fire): sekcja cała zniknie górą (scroll w górę) — zeruje flagi shown
       i chowa wszystko; przy ponownym zjeździe każdy element gra od nowa na swoim triggerze. */
    function resetEntry() {
      entered = false;
      items.forEach(function (reset) { reset(); });
      setActive(-1);                                  // chowa pillar + kasuje aktywny krok/kropkę
      hideText(introTexts);                           // label + labele kroków pod maskę
      gsap.set([labelDot, cta], { autoAlpha: 0 });
      gsap.set(stepLines, { scaleX: 0 });
      gsap.set(rightEls, { autoAlpha: 0 });
    }
    ScrollTrigger.create({ trigger: section, start: PPB.config.reveal.hideStart, onLeaveBack: resetEntry });

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: `+=${c.pinViewports * 100}%`,
      pin: pin,
      scrub: c.scrubSmooth,
      onUpdate: (self) => {
        const p = self.progress;
        // wideo scrub — 25% wideo na 25% scrolla
        if (video.duration) {
          video.currentTime = Math.min(p * video.duration, video.duration - c.videoTail);
        }
        ring.style.strokeDashoffset = ringLen * (1 - p);          // okrąg płynnie
        const idx = Math.min(Math.floor(p * c.steps), c.steps - 1);
        if (entered) setActive(idx);                              // dopiero po wjeździe kolumny
      },
    });

    if (c.clickToScroll) {
      steps.forEach((stepEl, i) => {
        stepEl.addEventListener("click", () => {
          const segMid = (i + 0.5) / c.steps;
          const target = st.start + (st.end - st.start) * segMid;
          window.scrollTo({ top: target, behavior: "smooth" });
        });
      });
    }
  }

  /* ============================================================
     3) CONCEPT — BEZ sticky: kształty zbiegają się na scrollu,
        ŁĄCZĄ się na końcu sekcji (bottom bottom). Sekcja = 100vh.
        Tekst „From concept…" = data-reveal="concept" → RĘCZNY reveal (bidirectional),
        bo home-full boot NIE woła globalnego initReveals.
     ============================================================ */
  function initConcept() {
    const c = CONFIG.concept;
    const section = document.querySelector(".is-home-concept");
    if (!section) return;

    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const bg = section.querySelector(".home-concept_bg");
    const circle = section.querySelector(".home-concept_circle");
    const square = section.querySelector(".home-concept_square");

    // Tekst „From concept…" — ODPOWIEDNIK gołego data-reveal (bidirectional default),
    // ale obsłużony RĘCZNIE tu (initReveals nie jest wołany w home-full). Named
    // data-reveal="concept" = FOUC guard + split; reszta = ten revealOnScroll.
    const conceptTexts = section.querySelectorAll('[data-reveal="concept"]');
    revealOnScroll(section, conceptTexts, { bidirectional: true });

    // GRADIENT: subtelny parallax tła podczas przejścia sekcji przez ekran.
    gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        scrub: c.scrubSmooth,
      },
    }).fromTo(bg, { yPercent: 0 }, { yPercent: c.bgShiftPercent, ease: "none" }, 0);

    // KSZTAŁTY: zbiegają się od shapesStart i ŁĄCZĄ się na shapesEnd (bottom bottom).
    gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: c.shapesStart,
        end: c.shapesEnd,
        scrub: c.scrubSmooth,
      },
    })
      .fromTo(circle, { x: 0 }, { x: c.circleEndRem * remPx, ease: "none" }, 0)
      .fromTo(square, { x: 0 }, { x: c.squareEndRem * remPx, ease: "none" }, 0);
  }

  /* ============================================================
     NACHODZENIE — solidny overlay na We know rośnie, gdy blok key-pillars (od intro)
     nasuwa się na nią. Overlap geometrię daje CSS (intro margin-top -100vh + z:20);
     tu tylko krycie overlaya mapowane na wjazd intro: intro „top bottom" (dolna krawędź
     ekranu) → „top top" (intro zakrywa cały ekran) = overlay 0 → max. Solid, scrub 1:1.
     ============================================================ */
  function initEntryOverlap() {
    const cfg = CONFIG.entryOverlap;
    const weKnow = document.querySelector(".is-home-we-know");
    const block = document.querySelector(".home-key-pillars-block");   // element NACHODZĄCY (intro + key-pillars)
    if (!weKnow || !block) return;

    /* PRZYKRYWANIE rusza z 5vh „przerwą" (coverOffsetVh) od wejścia bloku (top bottom)
       i TRWA aż blok w CAŁOŚCI zakryje We-know (end: "top top"). */
    const startFn = () => "top bottom-=" + (window.innerHeight * cfg.coverOffsetVh / 100);

    // OVERLAY — od razu gdy zaczyna przykrywać (po 5vh offsetcie), szybko do maksa
    const overlay = weKnow.querySelector(".home-we-know_overlay");
    if (overlay) {
      gsap.set(overlay, { autoAlpha: 0 });
      gsap.to(overlay, {
        autoAlpha: cfg.overlayMaxAlpha,
        ease: "none",
        scrollTrigger: { trigger: block, start: startFn, end: "top top", scrub: true, invalidateOnRefresh: true },
      });
    }

    // DRYF — CAŁA We-know (sticky stage: shape+apla+teksty+tytuły+butelki) lekko w GÓRĘ, szybko
    const stage = weKnow.querySelector(".home-we-know_stage");
    if (stage) {
      gsap.to(stage, {
        y: () => -(window.innerHeight * cfg.driftVh / 100),
        ease: "none",
        scrollTrigger: { trigger: block, start: startFn, end: "top top", scrub: true, invalidateOnRefresh: true },
      });
    }
  }

  /* ============================================================
     CONCEPT — MASKA NAV (system #2, ODWRÓCONA, page-scoped).
     Sekcje intro/key-pillars są JASNE → nav został CIEMNY (maska We-know otwarta).
     Concept jest CIEMNY → nav musi wrócić na BIAŁY. Odtwarzam ten sam mechanizm
     komplementarnych clip-pathów co _shared/nav-mask.js, ale ODWRÓCONY:
       - ciemny nav (mask) widoczny NAD krawędzią concept (jasne key-pillars),
       - biały nav (base) widoczny POD krawędzią (ciemny concept).
     Robione lokalnie (nie ruszam _shared; nav-mask.js obsługuje tylko 1. jasną sekcję).
     Zakresy scrolla We-know i concept są ROZŁĄCZNE → clipy się nie biją.
     ============================================================ */
  function initConceptNavTheme() {
    const concept = document.querySelector(".is-home-concept");
    const mask = document.querySelector(".nav-mask_component");
    const baseNav = document.querySelector(".nav_component:not(.is-dark)");
    if (!concept || !mask || !baseNav) return;

    function applyConceptClips(p) {
      const edge = (1 - p) * window.innerHeight;                 // krawędź concept (px od góry)
      const bottomCut = window.innerHeight - edge;               // ciemny nav (mask) widoczny NAD krawędzią
      mask.style.clipPath = "inset(0px 0px " + bottomCut.toFixed(1) + "px 0px)";
      const h = baseNav.offsetHeight;                            // biały nav (base) widoczny POD krawędzią
      const cutTop = Math.min(Math.max(edge, 0), h);
      /* pełne zakrycie = klasa (patrz nav-mask.js: NIE ruszamy inline opacity — FOUC guard).
         Bez tego bazowy nav zostawał niewidoczny po We-know i concept odsłaniał pustkę. */
      baseNav.classList.toggle("is-nav-covered", cutTop >= h);
      baseNav.style.clipPath = cutTop > 0 && cutTop < h ? "inset(" + cutTop.toFixed(1) + "px 0px 0px 0px)" : "none";
    }

    ScrollTrigger.create({
      trigger: concept,
      start: "top bottom",   // krawędź concept na dole ekranu — nav wciąż CIEMNY (stan z We-know)
      end: "top top",        // concept zakrył viewport → nav BIAŁY
      scrub: true,           // 1:1 z krawędzią (bez kisielu — jak system #2)
      onUpdate: (self) => applyConceptClips(self.progress),
    });
  }

  /* ============================================================
     4) CTA — „The right partner changes everything" (Figma 4473:4736).
     Tekst = data-reveal="cta" (ręcznie, jak concept). Button = fade.
     OKRĘGI: start lekko oddalone (góra ↑ o circleSpread, dół ↓) → dojazd do pozycji
     z Figmy (y:0) gdy sekcja się pojawia (top bottom) → jest pełna (top top).
     ============================================================ */
  function initCta() {
    const section = document.querySelector(".is-home-cta");
    if (!section) return;
    const cfg = CONFIG.cta;
    const R = PPB.config.reveal;

    // TEKST — ręczny reveal (bidirectional), bo home-full nie woła initReveals
    const texts = section.querySelectorAll('[data-reveal="cta"]');
    revealOnScroll(section, texts, { bidirectional: true });

    // BUTTON — prosty fade (FOUC guard opacity:0 w CSS), dwukierunkowo jak reszta
    const btn = section.querySelector(".home-cta_cta");
    if (btn) {
      ScrollTrigger.create({
        trigger: section,
        start: R.start,
        onEnter: () => gsap.to(btn, { autoAlpha: 1, duration: R.duration, ease: R.ease, overwrite: "auto" }),
        onLeaveBack: () => gsap.to(btn, { autoAlpha: 0, duration: R.hide.duration, ease: R.hide.ease, overwrite: "auto" }),
      });
    }

    // OKRĘGI — start oddalone → dojazd do Figmy przy wjeździe sekcji (scrub 1:1)
    const topC = section.querySelector(".home-cta_circle.is-top");
    const botC = section.querySelector(".home-cta_circle.is-bottom");
    if (topC && botC) {
      const stCfg = { trigger: section, start: "top bottom", end: "top top", scrub: true };
      gsap.fromTo(topC, { y: -cfg.circleSpread }, { y: 0, ease: "none", scrollTrigger: stCfg });
      gsap.fromTo(botC, { y: cfg.circleSpread }, { y: 0, ease: "none", scrollTrigger: stCfg });
    }
  }

  /* ============================================================
     MASKA NAV — uogólnienie na naprzemienne sekcje PO We-know (page-scoped).
     _shared/nav-mask.js obsluguje tylko 1. jasna sekcje (We-know -> nav ciemny).
     Tu dokladam styki dalej, po kolorze tla: pod CIEMNA sekcja nav BIALY, pod JASNA
     nav CIEMNY. Ten sam mechanizm komplementarnych clip-pathow co system #2 (scrub 1:1).
     initConceptNavTheme robi concept; initWfNavThemes: how->join (jasna) i meet->cta (ciemna).
     ============================================================ */
  function navTransition(section, incoming, mask, baseNav) {
    if (!section) return;
    function apply(p) {
      const ih = window.innerHeight;
      const edge = (1 - p) * ih;               // gorna krawedz wjezdzajacej sekcji (px od gory)
      const h = baseNav.offsetHeight;
      if (incoming === "dark") {
        mask.style.clipPath = "inset(0px 0px " + (ih - edge).toFixed(1) + "px 0px)"; // ciemny nav NAD krawedzia
        const cut = Math.min(Math.max(edge, 0), h);
        baseNav.classList.toggle("is-nav-covered", cut >= h);   // pelne zakrycie = klasa, nie clip (hit-testing)
        baseNav.style.clipPath = cut > 0 && cut < h ? "inset(" + cut.toFixed(1) + "px 0px 0px 0px)" : "none"; // bialy nav POD
      } else {
        mask.style.clipPath = "inset(" + edge.toFixed(1) + "px 0px 0px 0px)"; // ciemny nav POD krawedzia
        const cut = Math.min(Math.max(h - edge, 0), h);
        baseNav.classList.toggle("is-nav-covered", cut >= h);
        baseNav.style.clipPath = cut > 0 && cut < h ? "inset(0px 0px " + cut.toFixed(1) + "px 0px)" : "none"; // bialy nav NAD
      }
    }
    ScrollTrigger.create({ trigger: section, start: "top bottom", end: "top top", scrub: true, onUpdate: (self) => apply(self.progress) });
  }

  function initWfNavThemes() {
    const mask = document.querySelector(".nav-mask_component");
    const baseNav = document.querySelector(".nav_component:not(.is-dark)");
    if (!mask || !baseNav) return;
    navTransition(document.querySelector(".wf-home .is-join"), "light", mask, baseNav); // how(ciemna)->join(jasna): nav CIEMNY
    navTransition(document.querySelector(".is-home-cta"), "dark", mask, baseNav);       // meet(jasna)->cta(ciemna): nav BIALY
  }

  /* ============================================================
     KNOBY BUTELKI → zmienne CSS. Wołane przy boot, na każdym ScrollTrigger.refresh()
     i na resize, bo --bottle-h musi iść z REALNEJ wysokości butelki (vw nie wystarczy:
     vw zawiera szerokość scrollbara, a % szerokości wideo już nie).
     ============================================================ */
  function setBottleGamma(g) {
    var f = document.querySelector("#bottleMatch feComponentTransfer");
    if (!f) return;
    var v = Array.isArray(g) ? g : [g, g, g];
    ["feFuncR", "feFuncG", "feFuncB"].forEach(function (tag, i) {
      var el = f.querySelector(tag);
      if (el) el.setAttribute("exponent", v[i]);
    });
  }

  function applyBottleKnobs() {
    var c = CONFIG.bottle;
    var r = document.documentElement.style;
    r.setProperty("--bottle-size", parseFloat(c.width));
    r.setProperty("--bottle-nudge-y", c.nudgeY);
    r.setProperty("--bottle-tone", c.tone);
    r.setProperty("--bottle-feather", c.featherPct + "%");
    r.setProperty("--cta-bottle-gap", CONFIG.cta.bottleGap);
    setBottleGamma(c.gamma);

    var el = document.querySelector(".footer-bottle-reveal_bottle");
    if (el) {
      var h = el.getBoundingClientRect().height;
      if (h) {
        r.setProperty("--bottle-overlap", (h * c.overlapPct / 100).toFixed(2) + "px");
        r.setProperty("--bottle-h", Math.round(h) + "px");
      }
    }
  }

  /* ============================================================
     FOOTER BOTTLE REVEAL — sekwencja butelki (16 PNG) + tasma (wideo), OSTATNIA sekcja.
     Sekwencja 1:1 z 1. 16 klatkami wideo, potem wideo samo (video-scrub.js). Zakres:
     dol butelki 85% ekranu -> dol wideo 50%. (z _code/footer-bottle-reveal/script.js)
     ============================================================ */
  function initFooterBottleReveal() {
    var section = document.querySelector(".is-footer-bottle-reveal");
    if (!section) return;
    var bottle = section.querySelector(".footer-bottle-reveal_bottle");
    var video = section.querySelector(".footer-bottle-reveal_video");
    if (!bottle || !video) return;

    var cfg = CONFIG.bottle;
    var N_TOP = cfg.nTop;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var FR = [];
    for (var i = 0; i < N_TOP; i++) { var im = new Image(); im.src = cfg.seqDir + "/top_" + pad(i) + ".png"; FR.push(im); }
    bottle.src = FR[0].src;

    /* TRANSFER: fallback = zwykły seek po sieci; po pobraniu bloba podmieniamy na wersję
       z pamięci. Dzięki temu 6,3 MB startuje dopiero blisko sekcji, a nie przy load strony. */
    var makeScrub = (window.PPB && window.PPB.createVideoScrub) || window.createVideoScrub;
    var scrubVideo = function (p) { if (video.duration) video.currentTime = Math.min(p * video.duration, video.duration - 0.01); };
    var prefetched = false;
    function prefetchTape() {
      if (prefetched || !makeScrub) return;
      prefetched = true;
      scrubVideo = makeScrub(video);
    }
    if (cfg.lazyPrefetch) {
      ScrollTrigger.create({
        trigger: section, start: cfg.lazyPrefetch, once: true,
        onEnter: prefetchTape,
        onRefresh: function (self) { if (self.progress > 0) prefetchTape(); },
      });
    } else {
      prefetchTape();
    }

    var curFrame = -1;
    function apply(p) {
      if (p < 0) p = 0; else if (p > 1) p = 1;

      /* SYNC W CZASIE — sekwencja i taśma muszą pokazywać ten sam MOMENT. scrubVideo ustawia
         currentTime = p * duration, więc klatkę sekwencji liczymy z tego samego zegara:
         floor(t * seqFps). Wcześniej było round(p * (nBot-1)) — inny denominator i inne
         zaokrąglenie niż to, co realnie robi wideo → do ~1 klatki dryfu w środku zakresu. */
      var dur = video.duration || cfg.fallbackDuration;
      var ti = Math.floor(p * dur * cfg.seqFps) + cfg.frameOffset;
      if (ti < 0) ti = 0; else if (ti > N_TOP - 1) ti = N_TOP - 1;

      if (ti !== curFrame) { bottle.src = FR[ti].src; curFrame = ti; }
      scrubVideo(p);
    }

    video.addEventListener("loadedmetadata", function () {
      video.pause();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, { once: true });

    /* endTrigger = KLIP (widoczny pasek taśmy), nie samo <video> — po zoomie na mobile
       wideo jest wyższe niż kadr, więc jego dolna krawędź leży poza ekranem. */
    var tapeBox = section.querySelector(".footer-bottle-reveal_video-clip") || video;
    ScrollTrigger.create({
      trigger: bottle,
      start: cfg.start,
      endTrigger: tapeBox,
      end: cfg.end,
      scrub: cfg.scrubSmooth,
      onUpdate: function (self) { apply(self.progress); },
      onRefresh: function (self) { apply(self.progress); },
    });
    apply(0);
  }

  /* ============================================================
     FIT-TEXT — na NISKICH ekranach desktopowych (≥992px width) tekst LEWEJ kolumny
     nie mieści się nawet po zjechaniu gapu (space-between). Skalujemy WYŁĄCZNIE lewą
     kolumnę (transform), gdy jej treść przerasta box — BEZ ruszania szerokości/centrowania
     względem navbara (stage + prawa grupa zostają). origin left top = kotwica przy gutterze.
     Ciągłej skali od wysokości viewportu nie da się policzyć czystym CSS-em → stąd JS.
     ============================================================ */
  function fitKeyPillarsLeft() {
    const left = document.querySelector(".home-key-pillars_left");
    if (!left) return;
    left.style.transform = "";                 // reset → czysty pomiar
    if (window.innerWidth < 992) return;       // tylko desktop
    const avail = left.clientHeight;           // box = --kp-h
    const needed = left.scrollHeight;          // treść (z min-gapem)
    if (needed <= avail + 1) return;           // mieści się — bez skalowania
    const scale = Math.max(0.6, avail / needed);
    left.style.transformOrigin = "left top";
    left.style.transform = "scale(" + scale + ")";
  }

  /* ============================================================
     BOOT — własny load-listener (PO script.js). NIE woła initReveals().
     ============================================================ */
  window.addEventListener("load", function () {
    initIntro(document.querySelector(".is-home-key-pillars-intro"));  // nawiasy + reveal intro
    initKeyPillars();       // swap-in-place copy + pin/scrub
    initConcept();          // kształty + gradient + ręczny reveal concept
    initEntryOverlap();     // solidny overlay We know + dryf butelek przy nachodzeniu
    initConceptNavTheme();  // nav: ciemny (jasne key-pillars) → biały (ciemny concept)
    initWfNavThemes();      // nav: how(ciemna)→join(jasna=ciemny nav), meet(jasna)→cta(ciemna=biały nav)
    applyBottleKnobs();     // zmienne CSS butelki/taśmy (rezerwa w CTA, gamma szwu) PRZED initami
    initCta();              // sekcja CTA: reveal tekstu + interakcja okręgów tła
    initFooterBottleReveal(); // footer: sekwencja butelki + scrub taśmy (OSTATNIA sekcja)
    const wf = document.querySelector(".wf-home");
    if (wf && window.initReveals) initReveals(wf);  // globalny text-reveal na sekcjach Webflow (nagłówki/tytuły)
    ScrollTrigger.refresh();

    // niskie desktopy: skaluj TYLKO tekst lewej kolumny (init + refresh + resize na rAF)
    fitKeyPillarsLeft();
    ScrollTrigger.addEventListener("refresh", fitKeyPillarsLeft);
    ScrollTrigger.addEventListener("refresh", applyBottleKnobs);   // --bottle-h z realnego pomiaru
    let kpRaf = null;
    window.addEventListener("resize", function () {
      if (kpRaf) return;
      kpRaf = requestAnimationFrame(function () { kpRaf = null; fitKeyPillarsLeft(); applyBottleKnobs(); });
    });

    const video = document.querySelector(".home-key-pillars_video");
    if (video && !video.duration) {
      video.addEventListener("loadedmetadata", () => ScrollTrigger.refresh(), { once: true });
    }
  });
})();
