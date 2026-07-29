/* ============================================================
   Polpharma Biologics — PAGE TRANSITIONS (Barba.js)

   Warstwa page-agnostic: overlay wipe (Deep Green) chowa moment swapu
   (DOM + CSS), po czym odsłania nową stronę. Init/destroy per strona
   wisi na hookach Barby, nie na window.load.

   Kontrakt strony: PPB.pages[<namespace>] = { init({first, container}), destroy() }
   — opis i 4 zasady: _shared/smooth/BARBA-READY-CONTRACT.md.

   ⚠️ Wymaga SERWERA (fetch nowej strony). `file://` nie zadziała:
      python3 -m http.server 8000  →  http://localhost:8000/barba-site/
   ============================================================ */
(function () {
  "use strict";

  var COVER_MS = 0.55;         // czas jednej połowy wipe'a (in / out)
  var EASE = "power3.inOut";
  var OVERLAY_BG = "#005453";  // Deep Green (docelowo: dobrać wg refów designera)

  /* ---------- PRZYTRZYMANIE ZASŁONY (2026-07-28, zgłoszenie Tomka) ----------
     Zasłona schodziła natychmiast po wstawieniu DOM-u, a scena Unicorn Studio
     potrzebuje jeszcze chwili na pierwszą klatkę — pod nią jest białe tło `body`,
     więc widać było mignięcie wyglądające jak glitch.
     Zamiast sztywnego opóźnienia czekamy na FAKT: pojawienie się <canvas>
     w embedzie. Sztywne są tylko widełki — minimum (żeby zieleń zdążyła
     „oddechnąć") i sufit (żeby padnięte CDN nie zablokowało strony). */
  var HOLD_MS = 200;           // [KNOB] minimalne przytrzymanie zieleni po wejściu
  var CANVAS_WAIT_MS = 1500;   // [KNOB] sufit czekania na canvas Unicorna
  var CANVAS_TAIL_MS = 120;    // [KNOB] oddech po pojawieniu się canvasu (pierwsza klatka)

  /* ---------- overlay (persistuje poza kontenerem Barby) ---------- */
  var overlay = document.createElement("div");
  overlay.className = "ppb-transition";
  overlay.setAttribute("aria-hidden", "true");
  /* Z-INDEX 40 — CELOWO POD NAVEM (2026-07-28, decyzja Tomka: „żeby nav bar
     nigdy nie znikał ani nie glitchował").
     Drabinka: treść strony (uwięziona w kontekście układania kontenera, z-index 0)
     < ZASŁONA 40 < nav 50 < maska nava 51 < menu mobilne 80/90 < loader 100.
     Kontener dostaje `isolation: isolate` w <style> obu stron — bez tego elementy
     z `z-index: 2000` (sekcje Webflow) i `9999` (wskaźnik DEV na about) przebijałyby
     się nad zasłonę. */
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: OVERLAY_BG,
    zIndex: "40",
    transform: "translateY(100%)",
    willChange: "transform",
    pointerEvents: "none",
  });
  document.body.appendChild(overlay);

  /* ---------- gotowość nowej strony do odsłonięcia ---------- */
  function waitForPagePaint(container) {
    var minHold = new Promise(function (res) { setTimeout(res, HOLD_MS); });
    var embed = container && container.querySelector("[data-us-project]");
    if (!embed) return minHold;

    var canvasReady = new Promise(function (res) {
      var t0 = Date.now();
      (function poll() {
        if (embed.querySelector("canvas")) {
          log("canvas Unicorna gotowy po", Date.now() - t0, "ms");
          return setTimeout(res, CANVAS_TAIL_MS);
        }
        if (Date.now() - t0 > CANVAS_WAIT_MS) {
          log("⚠️ canvas Unicorna NIE pojawił się w", CANVAS_WAIT_MS, "ms — odsłaniam mimo to");
          return res();
        }
        requestAnimationFrame(poll);
      })();
    });
    return Promise.all([minHold, canvasReady]);
  }

  function coverIn() {
    return gsap.to(overlay, { y: "0%", duration: COVER_MS, ease: EASE }).then();
  }
  function coverOut() {
    return gsap.to(overlay, { y: "-100%", duration: COVER_MS, ease: EASE })
      .then(function () { gsap.set(overlay, { y: "100%" }); });
  }

  /* ---------- swap CSS specyficznego dla strony (za zasłoniętą zasłoną) ----------
     Linkowane jako <link data-page-css>. Home i about mają OSOBNE arkusze,
     które nadpisują te same reguły (m.in. blok FLUID ROOT ustawiający
     html{font-size}) — gdyby leżały obok siebie, wygrywałby ten wstawiony
     później i strona skalowałaby się źle. */
  function swapPageCSS(nextHtml) {
    var doc = new DOMParser().parseFromString(nextHtml, "text/html");
    var nextLinks = Array.prototype.slice.call(doc.querySelectorAll("link[data-page-css]"));
    document.querySelectorAll("link[data-page-css]").forEach(function (l) { l.remove(); });
    // dodaj nowe i poczekaj aż się załadują (żeby nie odsłonić niestylowanej strony)
    return Promise.all(nextLinks.map(function (l) {
      return new Promise(function (res) {
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = l.getAttribute("href");
        link.setAttribute("data-page-css", "");
        link.onload = res;
        link.onerror = res;
        document.head.appendChild(link);
      });
    }));
  }

  /* ---------- TARCZA NA WYJĄTKI ----------
     Barba (v2, `i.page`) ma fallback: jeśli obietnica przejścia ZOSTANIE ODRZUCONA,
     woła `force(url)` → `window.location.assign()`, czyli PEŁNE PRZEŁADOWANIE.
     Skutkiem błędu w naszym hooku nie jest więc czytelny wyjątek w konsoli, tylko
     cicha twarda nawigacja — a na home objawia się to zagraniem loadera (`once`,
     `first: true`). Diagnozowaliśmy tak trzy iteracje.
     Dlatego KAŻDE wywołanie kodu strony idzie przez `safe()`: błąd jest głośno
     logowany i połykany, więc przejście dochodzi do końca zamiast degradować się
     do przeładowania. Konsola mówi wtedy WPROST, co pękło. */
  function safe(label, fn) {
    try { return fn(); }
    catch (e) {
      if (window.console) {
        console.error(
          "%c[ppb] BŁĄD w " + label + "%c\nBez tej tarczy Barba zrobiłaby z tego TWARDE " +
          "przeładowanie (i loader na home). Przejście leci dalej — napraw poniższe:",
          "color:#fff;background:#c0392b;font-weight:700;padding:2px 6px", "color:inherit"
        );
        console.error(e);
      }
      return null;
    }
  }

  function startPage(ns, container, first) {
    var mod = window.PPB && window.PPB.pages && window.PPB.pages[ns];
    if (mod && typeof mod.init === "function") {
      safe("init strony „" + ns + "”", function () {
        mod.init({ first: !!first, container: container });
      });
    } else if (window.console) {
      console.warn("[ppb] brak modułu strony dla namespace:", ns);
    }
  }
  function stopPage(ns) {
    var mod = window.PPB && window.PPB.pages && window.PPB.pages[ns];
    if (mod && typeof mod.destroy === "function") {
      safe("destroy strony „" + ns + "”", function () { mod.destroy(); });
    }
  }

  /* ---------- Barba ---------- */
  /* strony, które ten harness naprawdę ma. Wszystko inne (linki-placeholdery `#`,
     hashe, ślepe ścieżki ze stopki typu `/about-us`, `/privacy-policy`) MUSI
     zostać przy natywnej nawigacji — Barba próbowałaby je pobrać fetchem,
     dostała 404 i zostawiła użytkownika pod zasłoną wipe'a. */
  var PAGES = ["index.html", "about.html"];

  /* ---------- DIAGNOSTYKA (prototyp) ----------
     Odróżnia „przejście Barbą" od „twardego przeładowania". Bez tego oba
     wyglądają na ekranie podobnie, a diagnozuje się je zupełnie inaczej:
     jeśli po kliknięciu w konsoli NIE ma linii `leave → enter`, to znaczy,
     że Barba nie przechwyciła linku i przeglądarka zrobiła pełne żądanie.
     Wyciszenie: dopisz `?debug=0` do adresu. */
  var DEBUG = !/[?&]debug=0/.test(location.search);
  function log() {
    if (!DEBUG || !window.console) return;
    console.log.apply(console, ["%c[ppb]", "color:#16ABA9;font-weight:700"].concat([].slice.call(arguments)));
  }

  /* Czy poprzedni dokument to INNA strona TEGO serwisu?
     Używane do rozpoznania „przyszliśmy tu pełnym żądaniem, choć nie powinniśmy". */
  function cameFromOwnSite() {
    if (!document.referrer) return false;
    try {
      var from = new URL(document.referrer), here = new URL(location.href);
      if (from.origin !== here.origin) return false;
      var dir = here.pathname.replace(/[^/]*$/, "");   // katalog barba-site/
      return from.pathname.indexOf(dir) === 0 && from.pathname !== here.pathname;
    } catch (e) { return false; }
  }
  window.PPB_NAV = { cameFromOwnSite: cameFromOwnSite };

  barba.init({
    /* ============================================================
       TIMEOUT — TO BYŁA PRAWDZIWA PRZYCZYNA (2026-07-28).

       Barba pobiera następną stronę XHR-em z domyślnym limitem **2000 ms**
       (`vendor/barba.umd.js`: `void 0===n && (n=2e3)`; `f.timeout=n`).
       Po przekroczeniu leci `onRequestError`, a tam:
           "click" === e && this.force(r)      →  window.location.assign()
       czyli CICHE PEŁNE PRZEŁADOWANIE. Żadnego wyjątku, żadnego logu.

       Home ciągnie ~23 MB wideo (`preload="auto"`) + 32 PNG sekwencji.
       `python3 -m http.server` jest JEDNOWĄTKOWY — obsługuje jedno żądanie
       naraz — więc XHR po kolejną stronę czekał w kolejce za strumieniem wideo
       i przekraczał 2 s. Efekt: KAŻDE kliknięcie kończyło się pełnym
       przeładowaniem. Stąd loader na home (`once` → `first: true`) i mruganie
       nava na about (świeży dokument → FOUC guard → intro).

       ⚠️ Serwer TEŻ do zmiany na wielowątkowy — komenda w README.

       KOREKTA AUDYTU (2026-07-29): `python3 -m http.server` jest od Pythona 3.7
       WIELOwątkowy (CLI używa ThreadingHTTPServer, nie HTTPServer — tamten
       issubclass-check sprawdzał złą klasę). Pomiar: GET about.html przy
       6 równoległych strumieniach wideo = 1,9 ms (stock) vs 4,65 s (wymuszony
       jednowątkowy). Diagnoza „serwer jednowątkowy" trzyma się więc TYLKO przy
       Pythonie <3.7 — sprawdź u siebie `python3 --version`. serve.sh zostaje
       (nagłówki no-store są realnie cenne przy pułapce ?v=), ale NIE traktuj
       go jako potwierdzonej przyczyny objawów.

       Timeout z 20 s ZBITY DO 8 s: przekroczenie limitu i tak kończy się
       twardym przeładowaniem (patrz niżej), a użytkownik czeka wtedy pod
       zasłoną wipe'a przez CAŁY limit. 8 s to wciąż 4× domyślne 2 s, ale
       ogranicza najgorszy scenariusz „zielony ekran". */
    timeout: 8000,

    /* Pierwsza strona ląduje w cache, więc powrót na nią nie jest kolejnym
       żądaniem konkurującym o serwer z wideo. */
    cacheFirstPage: true,

    /* ⚠️ KOREKTA AUDYTU (2026-07-29): `return false` NIE blokuje przeładowania.
       W Barbie są DWIE ścieżki do force():
         1. onRequestError:  `this.B && !1===this.B(...) || "click"===e && this.force(r)`
            — tę faktycznie zwiera zwrócenie false;
         2. handler odrzuconej obietnicy przejścia w go():
            `function(){ 0===d.getLevel() && s.force(t.next.url.href) }`
            — a promise żądania (funkcja M w vendorze) ZAWSZE jest odrzucany po
            timeoutcie/404 (`s(r)` po wywołaniu callbacka). Przy domyślnym
            logLevel „off" (0) ścieżka 2 odpala się MIMO naszego false.
       Czyli: timeout/404 nadal kończy się twardym przeładowaniem — i DOBRZE
       (alternatywa to user uwięziony pod zasłoną wipe'a). Zostawiamy `false`,
       żeby nie robić location.assign DWA razy, a log traktujemy jako
       diagnostykę: przy przeładowaniu konsola znika, ale ostrzeżenie
       „NAWIGACJA NIE POSZŁA PRZEZ BARBĘ" w hooku `once` (referrer) wskaże,
       że poprzednia nawigacja spadła do pełnego żądania. Pas bezpieczeństwa
       na loaderze (arrivedByNavigation w script.js) pilnuje, żeby taka
       degradacja NIE odpalała loadera. */
    requestError: function (trigger, action, url, response) {
      if (window.console) {
        console.error(
          "%c[ppb] ŻĄDANIE STRONY NIE POWIODŁO SIĘ%c\n" +
          "url: " + url + "\nakcja: " + action + "\n" +
          "Barba za chwilę zrobi TWARDE przeładowanie (fallback force() — patrz " +
          "komentarz w transition.js). Loader NIE powinien zagrać (pas na referrerze).",
          "color:#fff;background:#c0392b;font-weight:700;padding:2px 6px", "color:inherit"
        );
        console.error(response);
      }
      return false;   // zwiera ścieżkę 1 (nie dubluj location.assign); ścieżka 2 i tak przeładuje
    },

    prevent: function (data) {
      var href = data.el.getAttribute("href");
      if (!href || href.charAt(0) === "#") return true;
      var file = href.split("?")[0].split("#")[0].split("/").pop();
      var blocked = PAGES.indexOf(file) === -1;   // true = NIE przechwytuj
      if (blocked) log("link POZA harnessem → natywna nawigacja:", href);
      return blocked;
    },
    transitions: [
      {
        name: "ppb-wipe",

        /* pierwsze wejście na dowolną stronę (bez transition).
           first: true → home odpala loader. Przy każdej kolejnej nawigacji
           first jest false i home startuje od razu od reveala hero
           (decyzja Tomka 2026-07-28). */
        once: function (data) {
          /* ⚠️ Ta linia w konsoli oznacza PEŁNE ŁADOWANIE DOKUMENTU.
             Przy poprawnym przejściu Barbą widzisz `leave` + `enter`, NIE `once`. */
          log("once (pełne ładowanie dokumentu) →", data.next.namespace);

          /* Skąd się tu wzięliśmy? To rozstrzyga, czy przejście Barby zadziałało.
             `navigation.type` + referrer dają jednoznaczną odpowiedź zamiast domysłów. */
          var navType = "";
          try {
            var nav = performance.getEntriesByType("navigation")[0];
            navType = nav ? nav.type : "";
          } catch (e) {}
          if (navType !== "reload" && cameFromOwnSite() && window.console) {
            console.warn(
              "%c[ppb] ⚠️ NAWIGACJA NIE POSZŁA PRZEZ BARBĘ%c\n" +
              "Wylądowaliśmy tu PEŁNYM ŻĄDANIEM, a przyszliśmy z " + document.referrer + ".\n" +
              "Znaczy to jedno z dwóch: link nie został przechwycony, albo hook rzucił wyjątkiem " +
              "i zadziałał fallback `force()` Barby. Szukaj czerwonego [ppb] BŁĄD wyżej.",
              "color:#fff;background:#b8860b;font-weight:700;padding:2px 6px", "color:inherit"
            );
          }
          /* ============================================================
             MOMENT STARTU (audyt 2026-07-29, otwarty punkt (d) z wpisu 55).
             Hook `once` odpala się na końcu parsowania <body> — PRZED
             załadowaniem obrazów, wideo i fontów. Kanon (`home-rwd-resize-1/`)
             wisiał na `window.load`, więc initPage mierzył GOTOWY layout.
             Zmierzone headlessem: init z `once` = 8× ostrzeżenie GSAP
             „SplitText called before fonts loaded" (łamanie linii liczone na
             fallbackowym foncie). Dlatego przy świeżym dokumencie czekamy na
             `load` + `document.fonts.ready` — dokładnie jak kanon. FOUC guard
             `[data-reveal]{opacity:0}` i tak chowa treść do tego momentu.
             Przy nawigacji Barbą (hook `enter`) init leci od razu — fonty są
             już załadowane, a geometrię obrazów domyka ScrollTrigger.refresh()
             w hooku `after` + refreshInit. */
          var startFirst = function () {
            var go = function () { startPage(data.next.namespace, data.next.container, true); };
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(go, go);
            } else { go(); }
          };
          if (document.readyState === "complete") startFirst();
          else window.addEventListener("load", startFirst, { once: true });
        },

        // stara strona wychodzi: zasłoń ekran, potem posprzątaj GSAP
        leave: function (data) {
          log("leave →", data.current.namespace);
          return coverIn().then(function () {
            stopPage(data.current.namespace);
            /* zwolnij scenę WebGL wychodzącej strony — kontekstów WebGL
               przeglądarka daje ~16 na kartę, więc przy kilku przejściach
               tam i z powrotem najstarsze zaczęłyby padać */
            if (window.UnicornStudio && typeof UnicornStudio.destroy === "function") {
              try { UnicornStudio.destroy(); } catch (e) {}
            }
          });
        },

        // nowa strona wchodzi (ekran zasłonięty): swap CSS → scroll top → init
        enter: function (data) {
          log("enter →", data.next.namespace, "| first=false (bez loadera)");
          return swapPageCSS(data.next.html).then(function () {
            if (window.PPB_SMOOTH) window.PPB_SMOOTH.toTop(); else window.scrollTo(0, 0);
            startPage(data.next.namespace, data.next.container, false);

            /* UNICORN STUDIO — RE-INIT (2026-07-28).
               Oficjalny snippet skanuje `[data-us-project]` RAZ, przy ładowaniu
               dokumentu. Embed nowej strony to świeży DOM, którego nikt już nie
               obejrzy → scena nigdy by się nie załadowała, a pod nią jest białe
               tło `body`. To była prawdziwa przyczyna „glitcha", nie samo tempo. */
            if (window.UnicornStudio && typeof UnicornStudio.init === "function") {
              try { UnicornStudio.init(); } catch (e) { log("UnicornStudio.init() rzucił:", e); }
            }
            if (window.ScrollTrigger) log("triggery po wejściu:", ScrollTrigger.getAll().length);
          });
        },

        // odsłoń nową stronę — dopiero gdy jest CO odsłaniać
        after: function (data) {
          /* ScrollTrigger liczył geometrię pod zasłoną — po odsłonięciu
             obrazki/wideo mogą już mieć realne wymiary. Jeden refresh jest
             tańszy niż rozjechany pin. */
          if (window.ScrollTrigger) ScrollTrigger.refresh();
          return waitForPagePaint(data.next.container).then(coverOut);
        },
      },
    ],
  });
})();
