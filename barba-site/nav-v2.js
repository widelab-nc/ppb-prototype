/* ============================================================
   Polpharma Biologics — NAV v2 (2026-07-27, paczka nav)
   Zastępuje: _shared/nav/nav-mask.js + initConceptNavTheme +
   initWfNavThemes (key-pillars.js) — JEDNYM modułem.

   Dokumentacja działania + kontrakt HTML pod Webflow: docs/NAV.md.

   DWIE RZECZY:

   1) KLON MASKI — ciemna kopia nava (na jasne tła) NIE jest już
      utrzymywana ręcznie w HTML. Powstaje tu, przez cloneNode
      z bazowego nava. Jedno źródło markupu: edytujesz TYLKO bazowy
      nav (w Webflow: symbol), kopia zawsze matchuje 1:1 — hamburger,
      przyszłe linki, wszystko. Koszt: jednorazowy klon przy inicie
      (pojedyncze ms), w runtime DOM identyczny jak przy ręcznej kopii.

   2) JEDEN ARBITER MOTYWU — sekcje deklarują tło atrybutem
      data-nav-theme="light"|"dark" (w Webflow: custom attribute
      na sekcji). Moduł zbiera je w kolejności dokumentu, buduje
      styk tam, gdzie motyw się ZMIENIA, i na scrollu liczy JEDNĄ
      parę komplementarnych clip-pathów (krawędź sekcji tnie nav —
      efekt „cięcia"). Piszę do DOM wyłącznie ja — koniec czterech
      niezależnych pisarzy trzymających się na rozłączności zakresów.

   ZASADY (przeniesione ze starego systemu — patrz docs/NAV.md):
   - scrub: true, BEZ kisielu — krawędź sekcji to natywny scroll,
     clip musi jechać 1:1, inaczej krawędzie się rozjadą;
   - komplementarne clipy: żaden piksel nie renderuje obu wersji
     naraz (halo z antyaliasingu);
   - pełne zakrycie bazowego = klasa .is-nav-covered (opacity:0),
     NIE clip: clip-path zabija hit-testing, opacity nie → niewidoczny
     bazowy nav dalej łapie kliknięcia; kopia to tylko malowanie
     (pointer-events: none + inert);
   - NIE dotykać baseNav.style.opacity (FOUC guard [data-reveal] —
     szczegóły w docs/NAV.md „Pułapki").

   ŁADOWANIE: PRZED nav-shape.js i nav-menu.js (klon musi istnieć,
   zanim narysują pigułki i zepną dropdown — wtedy obie kopie dostają
   własne, unikalne clipPath-ID i wspólny stan dropdownu za darmo).
   Wymaga gsap + ScrollTrigger (arbiter; sam klon działa bez GSAP).
   ============================================================ */

/* ============================================================
   BARBA (2026-07-28) — podział na warstwę TRWAŁĄ i PER-STRONĘ.

   Nav jest SITE-LEVEL: leży POZA `[data-barba="container"]`, więc przy
   nawigacji NIE jest podmieniany. To celowe — klon maski powstaje raz
   (`cloneNode`), a warstwa backdrop-filter („frost") jest w Chrome
   kosztowna i krucha; przemontowywanie nava co nawigację gwarantowałoby
   powrót bugów z sekcji „FROST KICK" niżej.

   Co zostaje trwałe: klon maski, writeState/apply, scheduler frost-kicka.
   Co jest per-strona: STYKI MOTYWU — sekcje `[data-nav-theme]` żyją
   w kontenerze strony, więc ich ScrollTriggery trzeba zbudować przy
   wejściu i ZABIĆ przy wyjściu, inaczej kumulują się z każdą nawigacją.

   API: PPB.navV2.bind(root) / PPB.navV2.unbind() — woła je moduł strony.
   ⚠️ `PPB.navV2` jest teraz OBIEKTEM, nie `true`. Stare guardy w script.js
   i key-pillars.js sprawdzają truthiness (`if (!window.PPB || !PPB.navV2)`),
   więc działają bez zmian.
   ============================================================ */

(function () {
  var PPB = (window.PPB = window.PPB || {});
  if (PPB.navV2) return;

  /* ---------- 1. KLON MASKI ---------- */
  function buildMaskClone() {
    var base = document.querySelector(".nav_component:not(.is-dark)");
    if (!base) return null;

    var wrap = document.querySelector(".nav-mask_component");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "nav-mask_component";
      base.parentElement.insertBefore(wrap, base.nextSibling);
    }
    wrap.innerHTML = ""; // zastąp ewentualną ręczną kopię (stary markup)
    wrap.setAttribute("aria-hidden", "true");
    wrap.inert = true; // nieklikalne i niefokusowalne w całości (nowoczesne przeglądarki; fallback: pointer-events w CSS + tabindex niżej)

    var inner = document.createElement("div");
    inner.className = "nav-mask_inner";

    var clone = base.cloneNode(true);
    clone.classList.add("is-dark");
    clone.removeAttribute("data-reveal"); // FOUC guard + reveal intro dotyczą TYLKO bazowego
    clone.removeAttribute("style");       // inline'y (GSAP) bazowego nie dotyczą kopii

    // wariant kolorystyczny: ciemne logo + paleta light-bg
    var logo = clone.querySelector(".nav_brand-logo");
    if (logo) logo.setAttribute("src", logo.getAttribute("src").replace("logo-white", "logo-dark"));
    var links = clone.querySelector(".nav_links-component");
    if (links) {
      links.classList.remove("is-dark-bg");
      links.classList.add("is-light-bg");
    }

    // higiena klona: bez duplikatów ID, bez fokusu z klawiatury (pas bezpieczeństwa obok inert)
    clone.querySelectorAll("[id]").forEach(function (el) { el.removeAttribute("id"); });
    clone.querySelectorAll("a, button").forEach(function (el) { el.setAttribute("tabindex", "-1"); });

    inner.appendChild(clone);
    wrap.appendChild(inner);
    return wrap;
  }

  var mask = buildMaskClone();
  var baseNav = document.querySelector(".nav_component:not(.is-dark)");
  if (!mask || !baseNav) return;

  /* ---------- 2. ARBITER MOTYWU ---------- */
  /* motyw startowy strony (hero): data-nav-theme-root na kontenerze strony,
     fallback <body>, domyślnie "dark" (= nav biały).
     BARBA: czytane per strona w bind(), bo home ma ciemne hero, a inna strona
     może mieć jasne. Atrybut na kontenerze wygrywa z tym na <body>. */
  var rootTheme = "dark";

  // styki: sekcje [data-nav-theme] w kolejności dokumentu, tylko tam gdzie motyw się ZMIENIA
  var boundaries = [];
  function collect(root) {
    boundaries = [];
    var prev = rootTheme;
    var els = root.querySelectorAll("[data-nav-theme]");
    Array.prototype.forEach.call(els, function (el) {
      if (el === document.body) return;
      var t = el.getAttribute("data-nav-theme");
      if (t !== "light" && t !== "dark") return;
      /* SEKCJA BEZ LAYOUTU NIE JEST STYKIEM (2026-07-28).
         Element z `display: none` ma zerowe wymiary i pozycję 0, więc ScrollTrigger
         zaczepiony na nim dostaje start ≈ 0 i `progress > 0` już przy scrollu 0.
         Arbiter niżej wybiera OSTATNI styk z progress > 0 — czyli od pierwszej klatki
         uznawał, że wjechała sekcja, która wcale nie istnieje na ekranie, i wymuszał
         jej motyw (na ≤991 `.is-join` jest schowana → nav był ciemny od samej góry
         strony, zamiast biały na ciemnym hero).
         `offsetParent === null` łapie `display: none` u siebie i u każdego przodka.
         Guard jest OGÓLNY, nie na konkretną sekcję — działa dla dowolnego układu,
         w którym któraś sekcja jest chowana na jakimś progu. */
      if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return;
      if (t !== prev) { boundaries.push({ el: el, theme: t, st: null }); prev = t; }
    });
  }

  /* JEDYNY writer clip-pathów. Stan = OSTATNI styk z progress > 0
     (styki wcześniejsze są „przejechane" — p=1 daje pełny stan ich motywu;
     jeszcze nieosiągnięte mają p=0 i nie liczą się). Rozstrzyga deterministycznie
     nawet przy nakładających się zakresach — dlatego pisarz może być jeden.

     HIGIENA WARSTW (frost!): do DOM piszemy TYLKO gdy wartość realnie się zmienia.
     Każda mutacja stylu na navie (nawet ta sama wartość) potrafi ubić świeżą
     warstwę backdrop-filter w Chrome — a apply() lata na każdym ticku scruba. */
  var _w = { maskClip: null, baseClip: null, covered: null }; // cache ostatnio zapisanych wartości
  function writeState(maskClip, baseClip, covered) {
    if (maskClip !== _w.maskClip) { mask.style.clipPath = maskClip; _w.maskClip = maskClip; }
    if (baseClip !== _w.baseClip) { baseNav.style.clipPath = baseClip; _w.baseClip = baseClip; }
    if (covered !== _w.covered) { baseNav.classList.toggle("is-nav-covered", covered); _w.covered = covered; }
  }

  function apply() {
    var active = null;
    for (var i = boundaries.length - 1; i >= 0; i--) {
      if (boundaries[i].st && boundaries[i].st.progress > 0) { active = boundaries[i]; break; }
    }

    var h = baseNav.offsetHeight;
    var ih = window.innerHeight;

    if (!active) {
      // stan bazowy strony (przed pierwszym stykiem)
      if (rootTheme === "dark") { // ciemne tło → biały (bazowy) nav, kopia schowana
        writeState("inset(100% 0px 0px 0px)", "none", false);
      } else {                    // jasny root → od razu ciemna kopia
        writeState("inset(0px 0px 0px 0px)", "none", true);
      }
      return;
    }

    var edge = (1 - active.st.progress) * ih; // górna krawędź wjeżdżającej sekcji (px od góry viewportu)

    if (active.theme === "light") {
      // wjeżdża JASNA sekcja: ciemna kopia widoczna PONIŻEJ krawędzi, biały bazowy POWYŻEJ
      var cut = Math.min(Math.max(h - edge, 0), h);
      writeState(
        "inset(" + edge.toFixed(1) + "px 0px 0px 0px)",
        cut >= h ? "none" : cut > 0 ? "inset(0px 0px " + cut.toFixed(1) + "px 0px)" : "none", // pełne zakrycie → klasa, nie clip (hit-testing!)
        cut >= h
      );
    } else {
      // wjeżdża CIEMNA sekcja: biały bazowy widoczny PONIŻEJ krawędzi, ciemna kopia POWYŻEJ
      var cutTop = Math.min(Math.max(edge, 0), h);
      writeState(
        "inset(0px 0px " + (ih - edge).toFixed(1) + "px 0px)",
        cutTop > 0 && cutTop < h ? "inset(" + cutTop.toFixed(1) + "px 0px 0px 0px)" : "none",
        cutTop >= h
      );
    }
  }

  /* ---------- 2b. BIND / UNBIND (per strona — kontrakt Barba) ----------
     bind(root): przeczytaj motyw bazowy strony, zbierz styki z KONTENERA
     (nie z document — w trakcie transition mógłby stać obok stary DOM),
     postaw ScrollTriggery, przelicz stan.
     unbind(): zabij WYŁĄCZNIE triggery styków (nie ruszaj cudzych) i zdejmij
     listener refresha. Bez tego każda nawigacja dokłada komplet triggerów. */
  var bound = false;

  function bind(root) {
    if (bound) unbind();
    root = root || document;

    var attrHost = root.nodeType === 1 && root.hasAttribute("data-nav-theme-root") ? root : document.body;
    rootTheme = attrHost.getAttribute("data-nav-theme-root") || "dark";

    collect(root);

    // stan początkowy NATYCHMIAST (nie czekamy na load — zero błysku kopii pod loaderem)
    apply();

    if (window.ScrollTrigger) {
      boundaries.forEach(function (b) {
        b.st = ScrollTrigger.create({
          trigger: b.el,
          start: "top bottom", // krawędź sekcji na dole ekranu
          end: "top top",      // sekcja zakryła viewport
          scrub: true,         // 1:1 z natywnym scrollem — patrz nagłówek
          onUpdate: apply,
        });
      });
      ScrollTrigger.addEventListener("refresh", apply); // po resize/refresh: przelicz z nowych wymiarów
    }
    bound = true;
  }

  function unbind() {
    if (window.ScrollTrigger) ScrollTrigger.removeEventListener("refresh", apply);
    boundaries.forEach(function (b) { if (b.st) { b.st.kill(); b.st = null; } });
    boundaries = [];
    /* wyczyść cache writera — nowa strona startuje od nieznanego stanu,
       inaczej writeState() uzna, że „wartość się nie zmieniła" i nic nie zapisze */
    _w.maskClip = _w.baseClip = _w.covered = null;
    bound = false;
  }

  PPB.navV2 = { bind: bind, unbind: unbind, apply: apply };
  PPB.navApplyTheme = apply; // debug/awaryjnie: ręczne przeliczenie stanu

  /* ---------- 3. FROST KICK — obudzenie backdrop-filter po starcie ----------
     Chrome trzyma STALE SNAPSHOT tła w warstwie backdrop-filter (frost pigułek).
     nav-menu.js ma na to rebuildBackdrop()/PPB.kickNavBackdrop() (świeży węzeł
     .nav_menu-blur = świeża warstwa), ALE dotychczasowe kicki odpalały się ZA
     WCZEŚNIE: kick z timeline'u loadera leci, gdy tween reveala nava (opacity na
     [data-reveal="ui"]) jeszcze pracuje — a KAŻDA mutacja stylu na przodku świeżej
     warstwy psuje ją z powrotem. Zmierzone headless (żywy canvas w hero):
     po load ratio blura 1.00 (martwy), po późnym kicku 0.00 (pełny frost);
     mrugnięcie opacity na navie ZABIJA świeży frost — stąd też writeState() wyżej.

     Plan: kick dopiero gdy JEDNOCZEŚNIE (a) loader zdjęty (display:none),
     (b) reveal nava zakończony (computed opacity == 1), (c) canvas hero żyje
     (Unicorn wstrzyknął <canvas>) LUB minęło 6 s (strona bez Unicorna / CDN padł).
     Pas bezpieczeństwa: pierwszy PRAWDZIWY gest użytkownika (wheel/touch/klawisz)
     też kicka — gest nie odpala się programowo, więc nie „spali się" przy inicie
     jak dawny listener scrolla (ScrollTrigger.refresh potrafi emitować scroll). */
  (function scheduleFrostKick() {
    var t0 = Date.now();
    function kick() {
      if (window.PPB && PPB.kickNavBackdrop) {
        requestAnimationFrame(function () { requestAnimationFrame(PPB.kickNavBackdrop); });
      }
    }
    function conditionsMet() {
      var loader = document.querySelector(".loader_component");
      var loaderGone = !loader || getComputedStyle(loader).display === "none";
      var navReady = parseFloat(getComputedStyle(baseNav).opacity) >= 1;
      var canvasLive = !!document.querySelector(".home-hero_background canvas");
      return loaderGone && navReady && (canvasLive || Date.now() - t0 > 6000);
    }
    /* SERIA kicków po spełnieniu warunków — ostatni głęboko w ciszy.
       Dlaczego seria, nie jeden: intro ma ogony (bgScale hero ~2 s po revealu),
       które potrafią ubić świeżą warstwę po pojedynczym kicku (zmierzone headless:
       ten sam kod raz działał przy 4.5 s, raz martwy przy 5 s). Ostatni kick
       (+4 s od warunków) ląduje po wszystkim. */
    var iv = setInterval(function () {
      if (!conditionsMet()) {
        if (Date.now() - t0 > 20000) clearInterval(iv); // poddaj się po 20 s
        return;
      }
      clearInterval(iv);
      [0, 1500, 4000].forEach(function (d) { setTimeout(kick, d); });
    }, 250);

    /* SAMOLECZENIE: po każdym USTANIU scrolla (debounce 700 ms, throttle 1.5 s)
       jeden kick. Leczy ubicia warstwy w biegu (clipy styków motywu, tweeny na
       przodkach, powrót z jasnej sekcji). W realnym Chrome świeży węzeł sampluje
       poprawnie (pomiar projektu 2026-07-25) — kick w spoczynku jest bezpieczny.
       ⚠️ Headless Chromium ma tu artefakt (stan potrafi się przerzucać przy swapie)
       — NIE weryfikować frostu headlessem, tylko w realnej przeglądarce. */
    var scrollT, lastHeal = 0;
    window.addEventListener("scroll", function () {
      clearTimeout(scrollT);
      scrollT = setTimeout(function () {
        if (Date.now() - lastHeal > 1500) { lastHeal = Date.now(); kick(); }
      }, 700);
    }, { passive: true });
  })();
})();
