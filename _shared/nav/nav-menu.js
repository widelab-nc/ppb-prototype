/* ============================================================
   Polpharma Biologics — NAV MENU (_shared)
   Interakcje navbara:
   1) Dropdown "Company" (Figma 5051:3580) — hover (desktop) + klik
      (touch/klawiatura), a11y (aria-expanded), Esc, klik poza.
      Stan .is-open synchronizowany na WSZYSTKIE .nav_drop
      (base + kopia w masce) → poprawne motywowanie nad jasną sekcją.
   2) Mobile (≤991px) — hamburger → pełnoekranowy overlay
      (Figma 4473:6772), close/Esc/klik w link, blokada scrolla.
   Wymaga: nav.html + nav.css. Ładowany po nav-shape.js.
   ============================================================ */

(function () {
  var OPEN = "is-open";

  /* ---------- 1. Dropdown ---------- */
  var allDrops = Array.prototype.slice.call(document.querySelectorAll(".nav_drop"));
  var baseDrop = document.querySelector(".nav_component:not(.is-dark) .nav_drop");
  var trigger = baseDrop ? baseDrop.querySelector(".nav_link.is-drop") : null;
  var canHover = !window.matchMedia || window.matchMedia("(hover: hover)").matches;
  var hoverTimer;

  function setDrop(open) {
    allDrops.forEach(function (d) { d.classList.toggle(OPEN, open); });
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (baseDrop) {
    baseDrop.addEventListener("mouseenter", function () {
      clearTimeout(hoverTimer);
      setDrop(true);
    });
    baseDrop.addEventListener("mouseleave", function () {
      hoverTimer = setTimeout(function () { setDrop(false); }, 120);
    });

    if (trigger) {
      trigger.addEventListener("click", function (e) {
        e.preventDefault();
        if (!canHover) setDrop(!baseDrop.classList.contains(OPEN)); // touch: klik = toggle
      });
    }

    // klik poza dropdownem → zamknij
    document.addEventListener("click", function (e) {
      if (baseDrop.classList.contains(OPEN) && !baseDrop.contains(e.target)) setDrop(false);
    });
  }

  /* ---------- 2. Mobile overlay ---------- */
  var burger = document.querySelector(".nav_hamburger");
  var overlay = document.getElementById("navMobile");
  var closeBtn = overlay ? overlay.querySelector(".nav-mobile_close") : null;

  function setMobile(open) {
    if (!overlay) return;
    overlay.classList.toggle(OPEN, open);
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    if (burger) burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.documentElement.classList.toggle("nav-mobile-open", open);
    document.body.classList.toggle("nav-mobile-open", open);
  }

  // jeden przycisk = toggle (morph hamburger⇄X; bazowy nav wynoszony nad
  // overlay przez CSS html.nav-mobile-open — patrz nav.css MOBILE v2)
  if (burger) burger.addEventListener("click", function () {
    setMobile(!(overlay && overlay.classList.contains(OPEN)));
  });
  if (closeBtn) closeBtn.addEventListener("click", function () { setMobile(false); });
  if (overlay) {
    Array.prototype.slice
      .call(overlay.querySelectorAll(".nav-mobile_link, .nav-mobile_cta"))
      .forEach(function (a) { a.addEventListener("click", function () { setMobile(false); }); });
  }

  // powrót do desktopu z otwartym menu → zamknij + odblokuj scroll
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 992 && overlay && overlay.classList.contains(OPEN)) setMobile(false);
  });

  /* ---------- wspólne: Esc zamyka co otwarte ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" && e.key !== "Esc") return;
    setDrop(false);
    setMobile(false);
  });

  /* ============================================================
     rebuildBackdrop — DETERMINISTYCZNE odświeżenie frostu.

     Diagnoza (potwierdzona pomiarem, 2026-07-25): warstwa backdrop-filter
     w Chrome trzyma STALE SNAPSHOT tła — gdy tło maluje się PO namalowaniu
     nava (loader z-100 znika → dopiero wtedy maluje się hero), warstwa
     dalej pokazuje stary (pusty/ostry) backdrop i NIE unieważnia się.
     Przełączanie stylów na TYM SAMYM elemencie (backdrop-filter off/on,
     transform toggle, display toggle — stary kickBackdrop) NIE budzi
     warstwy. ŚWIEŻY element próbkuje tło poprawnie.

     Fix: podmieniamy węzeł .nav_menu-blur na klon (cloneNode niesie klasę
     i inline clip-path) → kompozytor tworzy nową warstwę i próbkuje
     AKTUALNE tło. Swap jest atomowy w ramach klatki — zero migotania.
     Element jest pustym <div aria-hidden> bez listenerów → podmiana jest
     bezpieczna. nav-shape.js odpytuje .nav_menu-blur na każdym draw()
     (nie cache'uje referencji), więc resize po podmianie działa.

     Triggery: load, fonts.ready, zniknięcie loadera (MutationObserver),
     pierwszy scroll — oraz NAJPEWNIEJSZY: jawne wywołanie
     PPB.kickNavBackdrop() z timeline'u loadera strony (script.js), już po
     .set(loader,{display:'none'}), gdy hero na pewno jest namalowane.

     Frost nad ŻYWYM canvas/wideo może i tak zamrażać się między klatkami
     (ograniczenie Chrome) — dlatego pigułki mają samodzielne wypełnienie
     12% (nav.css) i blur jest tylko enhancementem, nie nośnikiem czytelności.
     ============================================================ */
  function rebuildBackdrop() {
    Array.prototype.slice
      .call(document.querySelectorAll(".nav_menu-blur"))
      .forEach(function (b) {
        var c = b.cloneNode(true); // niesie klasę + inline clip-path
        c.__clipD = b.__clipD;     // znacznik geometrii nav-shape.js (draw nie podmienia bez potrzeby)
        b.parentElement.replaceChild(c, b);
      });
  }

  window.addEventListener("load", rebuildBackdrop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuildBackdrop);

  // po zniknięciu loadera (fallback, gdy strona nie woła PPB.kickNavBackdrop())
  var loader = document.querySelector(".loader_component");
  if (loader && "MutationObserver" in window) {
    var mo = new MutationObserver(function () {
      var s = getComputedStyle(loader);
      if (s.display === "none" || +s.opacity === 0 || s.visibility === "hidden") {
        mo.disconnect();
        requestAnimationFrame(rebuildBackdrop);
      }
    });
    mo.observe(loader, { attributes: true, attributeFilter: ["style", "class"] });
  }

  // pierwszy scroll też odświeża (na wszelki wypadek)
  window.addEventListener("scroll", function once() {
    rebuildBackdrop();
    window.removeEventListener("scroll", once);
  }, { passive: true });

  // ekspozycja — NAJPEWNIEJSZY trigger: script.js woła w callbacku
  // kończącym loader (po .set(loader,{display:'none'}))
  (window.PPB = window.PPB || {}).kickNavBackdrop = rebuildBackdrop;
})();
