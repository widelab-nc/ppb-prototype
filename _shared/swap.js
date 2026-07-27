/* ============================================================
   Polpharma Biologics — SYSTEM GLOBALNY #3: SWAP-IN-PLACE (_shared)
   "Tekst stoi w tym samym miejscu, a na scroll podmienia się treść."
   (feeling statów How-it-works: Approved biosimilars → Partners worldwide…)

   Zbudowane NA systemie #1: każdy stan wchodzi przez revealText()
   i wychodzi przez hideText() — więc efekt wjazdu/wyjazdu i jego
   strojenie są WSPÓLNE z resztą strony (PPB.config.reveal). Zmiana
   efektu globalnie = gsap-config.js, tak samo jak dla zwykłych reveali.

   Model: jeden SLOT trzyma N stanów ułożonych w tej samej pozycji
   (stackowanie = CSS sekcji, np. position:absolute — moduł tego NIE
   narzuca). Rewersyjna maszyna stanów: setState(i) chowa bieżący,
   pokazuje następny. Stan -1 = nic nie widać.

   Sterowanie (dwa tryby):
     • PROGRESS — sekcja podaje własny progress scruba (0..1) + progi;
       moduł liczy aktywny indeks. To wzorzec statów (pinned flow).
     • DEKLARATYWNY — initSwaps() podpina grupę [data-swap] pod jeden
       ScrollTrigger nad grupą; stany swapują się wg progów (równo albo
       data-swap-at). Dla prostych, niepinowanych swapów.

   Per-stan hooki onEnter/onLeave — na bespoke ozdoby (np. rosnąca
   linia statów) obok wspólnego reveala tekstu.

   API (globalne — shared singleton, ładowany PO reveal.js):
     createSwap(config)                 → kontroler { setState, getState, fromProgress, states }
     progressToIndex(p, thresholds, emptyBelow)  → indeks stanu dla progressu
     initSwaps(scope?)                  → warstwa deklaratywna ([data-swap])

   Ładowanie: <script src="../_shared/swap.js"></script>  (po reveal.js)
   ============================================================ */

(function () {
  var g = function () { return window.gsap; };
  var reveal = function (t, o) { return window.revealText(t, o); };
  var hide = function (t, o) { return window.hideText(t, o); };

  /* progress (0..1) → indeks aktywnego stanu.
     thresholds = rosnąca lista progów wejścia.
       emptyBelow=true  → poniżej thresholds[0] indeks -1 (nic); N progów = N stanów.
       emptyBelow=false → od startu widać stan 0; N-1 progów między N stanami. */
  function progressToIndex(p, thresholds, emptyBelow) {
    var count = 0;
    for (var i = 0; i < thresholds.length; i++) if (p >= thresholds[i]) count++;
    return emptyBelow ? count - 1 : count;
  }

  /* normalizacja definicji stanu: element albo {el, targets, onEnter, onLeave} */
  function normalizeStates(list, defaultTargetSel) {
    return (list || []).map(function (s, i) {
      if (s && s.nodeType) s = { el: s };
      s = s || {};
      var el = s.el;
      var targets = s.targets;
      if (!targets && el) {
        var found = el.querySelectorAll(defaultTargetSel || "[data-swap-text]");
        targets = found.length ? found : [el];
      }
      return { el: el, targets: targets || [], onEnter: s.onEnter, onLeave: s.onLeave, index: i };
    });
  }

  function createSwap(config) {
    config = config || {};
    var states = normalizeStates(config.states, config.targetSelector);
    var revealOpts = config.revealOpts || {};
    /* DOMYŚLNIE stan WYCHODZI DO GÓRY (sign:-1), a nowy WCHODZI Z DOŁU (reveal default) →
       stary i nowy są po PRZECIWNYCH stronach maski linii = zero nakładania (czysty swap:
       stary znika górą, nowy pojawia się dołem). Bez tego oba lądują w dolnej połowie i
       zderzają się (widać dwa teksty naraz). Override: przekaż hideOpts.sign. */
    var hideOpts = Object.assign({ sign: -1 }, config.hideOpts || {});
    var current = config.start != null ? config.start : -1;
    /* revealStart=false → stan startowy jest JUŻ widoczny (pokazany wcześniej inną
       animacją, np. wjazdem sekcji) → nie re-animuj go na inicie, tylko ustaw current.
       Reszta stanów i tak chowana. Domyślnie true (klasyczny swap). */
    var revealStart = config.revealStart !== false;

    function show(s) {
      if (!s) return;
      if (s.onEnter) s.onEnter(s.el, s);
      reveal(s.targets, revealOpts);
    }
    function put(s) {
      if (!s) return;
      var t = hide(s.targets, hideOpts);
      /* STACKED SWAP: hideText chowa tylko linie pod maskę, ale zostawia ELEMENT
         widoczny (autoAlpha:1). Stany leżą na sobie (absolute) → przy przerwanym
         scrubie zamrożona linia nieaktywnego stanu prześwieca na aktywny. Dlatego po
         zejściu wymuszamy pełne ukrycie elementu. TYLKO onComplete: tween przerwany
         przez ponowny revealText NIE odpala tego (killed tween ≠ onComplete), więc
         ponownie pokazany stan nie zostaje błędnie schowany (bezpieczne na wyścig).
         Guard current !== index = dodatkowa asekuracja. */
      if (t && t.eventCallback) {
        t.eventCallback("onComplete", function () {
          if (current !== s.index && window.gsap) window.gsap.set(s.targets, { autoAlpha: 0 });
        });
      }
      if (s.onLeave) s.onLeave(s.el, s);
    }

    /* stan startowy: wszystko schowane natychmiast (bez animacji), poza ewentualnym start */
    states.forEach(function (s, i) {
      if (i === current) return;
      if (window.gsap && s.targets && s.targets.length) window.gsap.set(s.targets, { autoAlpha: 0 }); // guard: puste targets (swap na hookach) = brak warna
    });
    if (current >= 0 && revealStart) show(states[current]);

    function setState(next) {
      if (next === current) return;
      if (current >= 0 && current < states.length) put(states[current]);
      if (next >= 0 && next < states.length) show(states[next]);
      current = next;
    }

    return {
      setState: setState,
      getState: function () { return current; },
      states: states,
      /* wygodnie: podaj progress scruba i progi — reszta sama */
      fromProgress: function (p, thresholds, emptyBelow) {
        setState(progressToIndex(p, thresholds, emptyBelow));
      },
    };
  }

  /* ---------- warstwa DEKLARATYWNA ----------
     <div data-swap [data-swap-start] [data-swap-end] [data-swap-empty-below]>
       <div data-swap-state [data-swap-at="0.5"]> …tekst… </div>
       <div data-swap-state> …tekst… </div>
     </div>
     Grupa dostaje JEDEN ScrollTrigger (scrub) nad sobą; progi = data-swap-at
     na stanach albo równy podział. Dla prostych, NIEpinowanych swapów.
     Pinned/scrub-driven (staty) = createSwap + fromProgress w JS sekcji. */
  function initSwaps(scope) {
    var root = scope || document;
    if (!window.ScrollTrigger) return;
    root.querySelectorAll("[data-swap]").forEach(function (group) {
      var stateEls = Array.prototype.slice.call(group.querySelectorAll("[data-swap-state]"));
      if (!stateEls.length) return;
      var emptyBelow = group.hasAttribute("data-swap-empty-below");

      var swap = createSwap({ states: stateEls, emptyBelow: emptyBelow });

      /* progi: data-swap-at (0..1) na stanach, albo równy podział zakresu grupy */
      var n = stateEls.length;
      var thresholds = stateEls.map(function (el, i) {
        var at = el.getAttribute("data-swap-at");
        if (at != null) return parseFloat(at);
        return emptyBelow ? i / n : (i + 1) / (n + 1); // sensowny default
      });
      if (!emptyBelow) thresholds = thresholds.slice(1); // N-1 progów między N stanami

      window.ScrollTrigger.create({
        trigger: group,
        start: group.getAttribute("data-swap-start") || "top 60%",
        end: group.getAttribute("data-swap-end") || "bottom 40%",
        scrub: true,
        onUpdate: function (self) {
          swap.setState(progressToIndex(self.progress, thresholds, emptyBelow));
        },
      });
    });
  }

  /* eksport: namespace + aliasy globalne (spójnie z reveal.js) */
  var PPB = (window.PPB = window.PPB || {});
  PPB.swap = {
    createSwap: createSwap,
    progressToIndex: progressToIndex,
    initSwaps: initSwaps,
  };
  window.createSwap = createSwap;
  window.progressToIndex = progressToIndex;
  window.initSwaps = initSwaps;
})();
