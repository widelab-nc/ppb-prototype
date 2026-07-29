/* ============================================================
   HOME — INSIGHTS
   1) Swiper 12 — TYLKO >767px: snap co jedną kartę (bez free-drag),
      slidesPerView auto, slider ucięty w prawo. Karta jedzie za palcem,
      po puszczeniu dosuwa się do najbliższego slajdu (max 1 przeskok / gest).
      ≤767 (mobile landscape + portrait): artboard Figma `4473:6648` NIE MA
      slidera — karty leżą w kolumnie, Swiper jest niszczony.
   2) PARALLAX zawartości karty: elementy mają DŁUŻSZY DURATION niż sam slajd,
      więc zostają w tyle i doganiają. Trzy grupy:
        • date   — data (3 teksty + kropka), stagger w poprzek rzędu
        • title  — tytuł (jeden blok)
        • shapes — media ⌀182 + kwadrat „More"

   MECHANIKA:
   Na `transitionStart` znamy delta = (translate docelowy − z poprzedniej klatki).
   Slajd jedzie krzywą E przez D_card ms (= swiper speed). Element ma jechać
   TĄ SAMĄ krzywą, tylko dłużej. Element siedzi w karcie, więc jego transform
   to RÓŻNICA obu tweenów:

       offset(t) = ( E(t/D_el) − E(t/D_card) ) · delta

   Startuje w 0, kończy w 0 → zero akumulacji między gestami, zero skoku.
   E = cubic-bezier(0.22, 1, 0.36, 1), identyczna z dosuwaniem slidera
   (--swiper-wrapper-transition-timing-function w style.css) — krzywe się nakładają.

   SUPERPOZYCJA: gesty NAKŁADAJĄ się (lista tweenów, offset = suma). Gdyby nowy
   gest nadpisywał tween w locie, element miałby niezerowy offset a świeży tween
   startowałby od zera → skok. Suma jest ciągła, bo każdy tween wchodzi z zerem.

   KIERUNEK (krytyczne — inaczej elementy nachodzą na siebie):
   Dłuższy duration = większy dług = element odjeżdża dalej w tył. Musi go
   dostawać ten, który jest z TYŁU w kierunku ruchu. Dlatego ranking liczymy
   od CZOŁA ruchu, nie od lewej krawędzi:
     delta < 0 (elementy uciekają w prawo) → czoło po lewej  → rank = index
     delta > 0 (elementy uciekają w lewo)  → czoło po prawej → rank = n−1−index
   Duration rośnie z rankiem ⇒ odstępy w grupie zawsze rosną, nigdy nie maleją.

   Strojenie na żywo: panel z suwakami włącza atrybut `data-lag-tune` na sekcji
   albo `?tune` w URL. Panel wstrzykuje własne style, więc działa na każdej
   stronie bez dokładania CSS-a. Klawisz „P" chowa/pokazuje.
   ============================================================ */
(function () {
  "use strict";

  /* style panelu strojenia (wstrzykiwane tylko gdy panel jest włączony) */
  var PANEL_CSS = ".lag-panel {\n  position: fixed;\n  right: 1rem;\n  bottom: 1rem;\n  z-index: 9999;\n  width: 15rem;\n  padding: 0.875rem 1rem;\n  border-radius: 0.75rem;\n  background: rgba(22, 21, 23, 0.9);\n  color: #fff;\n  font: 400 12px/1.4 ui-monospace, monospace;\n  backdrop-filter: blur(8px);\n}\n.lag-panel[hidden] { display: none; }\n.lag-panel h4 { font-size: 12px; margin-bottom: 0.5rem; opacity: 0.6; font-weight: 400; }\n.lag-panel label { display: block; margin-bottom: 0.4rem; }\n.lag-panel input[type=\"range\"] { width: 100%; }\n.lag-panel .lag-panel_row { opacity: 0.55; margin-bottom: 0.6rem; }\n.lag-panel .lag-panel_group {\n  margin-bottom: 0.6rem;\n  padding-top: 0.5rem;\n  border-top: 1px solid rgba(255, 255, 255, 0.14);\n}\n.lag-panel .lag-panel_group i {\n  display: block;\n  font-style: normal;\n  margin-bottom: 0.35rem;\n  color: #16ABA9;\n}\n.lag-panel .lag-panel_hint { opacity: 0.45; margin-top: 0.5rem; }";

  /* duration w ms; `lead` = element na czole ruchu, `trail` = zamykający.
     Reszta grupy dostaje wartości interpolowane liniowo między nimi.
     `amount` = mnożnik amplitudy (1 = pełny efekt, 0.25 = ćwierć drogi).

     Tekst (data + tytuł) jedzie TYMI SAMYMI durationami co kształty, tylko
     z amplitudą 0.25 (zatwierdzone wzrokowo 2026-07-24). Dzięki wspólnym
     durationom cała karta uspokaja się w tym samym momencie; różni się
     wyłącznie dystans. (Gdyby tekst dostał krótszy duration zamiast mniejszej
     amplitudy, dochodziłby osobno i ruch by się rozjeżdżał.)
     Skalowanie amplitudy nie psuje reguły antykolizyjnej — offsety wewnątrz
     grupy skalują się proporcjonalnie, więc ich kolejność zostaje. */
  var CFG = {
    groups: {
      date:   { label: "data",     lead: 1150, trail: 1500, amount: 0.25 },
      title:  { label: "tytuł",    lead: 1150, trail: 1500, amount: 0.25 },
      shapes: { label: "kształty", lead: 1150, trail: 1500, amount: 1 }
    },
    /* px — sufit bezpieczeństwa. Ma NIGDY nie zadziałać w normalnym użyciu:
       twardy clamp robi kant w ruchu. Pojedynczy gest daje szczyt ~149px,
       ale przy nakładaniu gestów offsety się sumują — zmierzone 279px przy
       pięciu gestach pod rząd. 420 zostawia zapas i nie tnie nigdy. */
    max: 420
  };

  var sliderEl = document.querySelector(".home-insights_slider");
  if (!sliderEl || typeof Swiper === "undefined") return;

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- zebranie grup: nazwa → rank → [elementy ze wszystkich kart] ---------- */
  var sets = {};
  Array.prototype.forEach.call(sliderEl.querySelectorAll("[data-lag-group]"), function (g) {
    var name = g.getAttribute("data-lag-group");
    // element może być jednocześnie grupą i jedynym itemem (tytuł)
    var items = g.hasAttribute("data-lag")
      ? [g]
      : Array.prototype.slice.call(g.querySelectorAll("[data-lag]"));
    if (!items.length) return;
    if (!sets[name]) sets[name] = { ranks: [], n: 0 };
    var set = sets[name];
    items.forEach(function (el, i) {
      if (!set.ranks[i]) set.ranks[i] = [];
      set.ranks[i].push(el);
      el.style.willChange = "transform";
    });
    if (items.length > set.n) set.n = items.length;
  });

  /* ---------- easing: cubic-bezier identyczny jak w CSS ---------- */
  function cubicBezier(x1, y1, x2, y2) {
    function A(a, b) { return 1 - 3 * b + 3 * a; }
    function B(a, b) { return 3 * b - 6 * a; }
    function C(a) { return 3 * a; }
    function calcX(t) { return ((A(x1, x2) * t + B(x1, x2)) * t + C(x1)) * t; }
    function calcY(t) { return ((A(y1, y2) * t + B(y1, y2)) * t + C(y1)) * t; }
    function slopeX(t) { return 3 * A(x1, x2) * t * t + 2 * B(x1, x2) * t + C(x1); }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 6; i++) {
        var err = calcX(t) - x;
        if (Math.abs(err) < 1e-5) break;
        var d = slopeX(t);
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      return calcY(t);
    };
  }
  var EASE = cubicBezier(0.22, 1, 0.36, 1);

  /* ---------- stan parallaxu (deklarowany PRZED buildSlider) ---------- */
  var seen = 0;        // translate z poprzedniej klatki
  var tweens = [];     // [{ delta, t0 }] — nakładają się
  var applied = {};    // nazwa grupy → rank → ostatnio zapisany px
  Object.keys(sets).forEach(function (name) { applied[name] = []; });

  function resetLag() {
    Object.keys(sets).forEach(function (name) {
      sets[name].ranks.forEach(function (list, i) {
        for (var j = 0; j < list.length; j++) list[j].style.transform = "";
        applied[name][i] = 0;
      });
    });
  }

  function onTransitionStart() {
    if (!swiper || REDUCED) return;
    var delta = swiper.translate - seen;
    if (Math.abs(delta) < 1) return;
    tweens.push({ delta: delta, t0: performance.now() });
    if (tweens.length > 6) tweens.shift();   // sanity cap przy spamowaniu gestami
  }

  /* ============================================================
     SLIDER — tylko >767px.
     Poniżej Swiper jest NISZCZONY (destroy + cleanStyles), nie tylko wyłączany:
     inaczej zostawia inline transform na wrapperze i margin-right na slajdach,
     i statyczny stos się rozjeżdża.
     ============================================================ */
  var MQ_SLIDER = window.matchMedia("(min-width: 768px)");
  var swiper = null;

  /* Zero slidesOffsetBefore/After — slider siedzi w `.container`, więc jego box
     JEST obszarem roboczym. Swiper liczy max translate z szerokości swojego boxa,
     czyli przy skrajnym przewinięciu prawa krawędź ostatniej karty ląduje dokładnie
     na prawej krawędzi kontenera. Wcześniej slider bleedował marginesem do krawędzi
     okna i ostatnia karta dotykała viewportu. */
  function swiperOptions() {
    return {
      slidesPerView: "auto",
      spaceBetween: 16,
      grabCursor: true,
      resistanceRatio: 0.6,

      /* SNAP CO JEDNĄ KARTĘ — bez free-drag. */
      speed: 800,
      slidesPerGroup: 1,
      threshold: 4,
      longSwipesRatio: 0.25,
      longSwipesMs: 250,
      shortSwipes: true,
      followFinger: true,
      resistance: true,

      mousewheel: { forceToAxis: true, releaseOnEdges: true },
      keyboard: { enabled: true },
      on: {
        touchStart: function () { sliderEl.classList.add("is-dragging"); },
        touchEnd: function () { sliderEl.classList.remove("is-dragging"); },
        resize: function (sw) { sw.update(); },
        transitionStart: onTransitionStart
      }
    };
  }

  function buildSlider() {
    if (swiper) return;
    swiper = new Swiper(sliderEl, swiperOptions());
    seen = swiper.translate;
  }

  function destroySlider() {
    if (!swiper) return;
    swiper.destroy(true, true);
    swiper = null;
    tweens = [];
    resetLag();
    sliderEl.classList.remove("is-dragging");
  }

  function syncSlider() {
    if (MQ_SLIDER.matches) buildSlider();
    else destroySlider();
  }

  syncSlider();
  if (MQ_SLIDER.addEventListener) MQ_SLIDER.addEventListener("change", syncSlider);
  else MQ_SLIDER.addListener(syncSlider);           // Safari < 14

  if (REDUCED) return;   // slider działa, parallaxu nie ma

  /* ============================================================
     PARALLAX — pętla rAF
     ============================================================ */
  function clamp(v, m) { return v < -m ? -m : (v > m ? m : v); }

  function durationFor(cfg, rank, n) {
    if (n <= 1) return cfg.lead;
    return cfg.lead + (rank * (cfg.trail - cfg.lead)) / (n - 1);
  }

  function tick(now) {
    // slider zniszczony (mobile) → nic nie animujemy; CSS zeruje transformy
    if (!swiper) { requestAnimationFrame(tick); return; }

    var dCard = swiper.params.speed;

    // najdłuższy duration w całym configu → po nim tween nic już nie wnosi
    var longest = dCard;
    Object.keys(sets).forEach(function (name) {
      var c = CFG.groups[name];
      if (c) longest = Math.max(longest, c.lead, c.trail);
    });

    // odsiew wygasłych + policz pCard raz per tween (nie per element)
    var live = [];
    for (var k = 0; k < tweens.length; k++) {
      var elapsed = now - tweens[k].t0;
      if (elapsed < longest) {
        tweens[k].el = elapsed;
        tweens[k].pCard = EASE(Math.min(elapsed / dCard, 1));
        live.push(tweens[k]);
      }
    }
    tweens = live;

    Object.keys(sets).forEach(function (name) {
      var set = sets[name];
      var cfg = CFG.groups[name];
      if (!cfg) return;
      var n = set.n;

      for (var i = 0; i < set.ranks.length; i++) {
        var px = 0;
        for (var t = 0; t < live.length; t++) {
          var tw = live[t];
          // rank liczony od CZOŁA ruchu — osobno dla każdego tweenu,
          // bo mogą mieć przeciwne kierunki
          var rank = tw.delta < 0 ? i : (n - 1 - i);
          var d = durationFor(cfg, rank, n);
          px += (EASE(Math.min(tw.el / d, 1)) - tw.pCard) * tw.delta * cfg.amount;
        }
        px = clamp(px, CFG.max);

        if (Math.abs(px - (applied[name][i] || 0)) > 0.01) {
          var list = set.ranks[i];
          var s = px === 0 ? "" : "translate3d(" + px.toFixed(2) + "px,0,0)";
          for (var j = 0; j < list.length; j++) list[j].style.transform = s;
          applied[name][i] = px;
        }
      }
    });

    seen = swiper.translate;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ============================================================
     PANEL STROJENIA — tylko prototyp.
     Włącza się WYŁĄCZNIE gdy sekcja ma atrybut `data-lag-tune`
     (jest w `home-insights/index.html`, nie ma go w `home-full`).
     Dzięki temu ten sam plik JS idzie na stronę bez wycinania czegokolwiek.
     ============================================================ */
  var TUNE = document.querySelector(".is-home-insights[data-lag-tune]")
          || /[?&]tune\b/.test(location.search);
  if (!TUNE) return;

  /* Panel wstrzykuje WŁASNE style — dzięki temu wystarczy `data-lag-tune`
     na sekcji (albo `?tune` w URL) i działa na dowolnej stronie, bez
     linkowania dodatkowego CSS-a. Wcześniej style siedziały w CSS prototypu,
     więc na `home-full` panel wyrenderowałby się goły. */
  var css = document.createElement("style");
  css.textContent = PANEL_CSS;
  document.head.appendChild(css);

  var html = '<h4>parallax — „P" chowa</h4>' +
    '<div class="lag-panel_row">slajd (swiper speed): <b>800</b>ms</div>';

  Object.keys(sets).forEach(function (name) {
    var cfg = CFG.groups[name];
    if (!cfg) return;
    html += '<div class="lag-panel_group"><i>' + cfg.label + '</i>';
    html += '<label>siła (×): <b data-out="' + name + '.amount"></b>' +
            '<input type="range" data-cfg="' + name + '.amount" min="0" max="1.5" step="0.05"></label>';
    html += '<label>' + (sets[name].n > 1 ? "czoło" : "duration") +
            ': <b data-out="' + name + '.lead"></b>ms' +
            '<input type="range" data-cfg="' + name + '.lead" min="800" max="2600" step="25"></label>';
    if (sets[name].n > 1) {
      html += '<label>zamykający: <b data-out="' + name + '.trail"></b>ms' +
              '<input type="range" data-cfg="' + name + '.trail" min="800" max="3200" step="25"></label>';
    }
    html += '</div>';
  });

  html += '<label>max offset: <b data-out="max"></b>px' +
          '<input type="range" data-cfg="max" min="100" max="600" step="10"></label>' +
          '<div class="lag-panel_hint">role zamieniają się z kierunkiem ruchu, żeby elementy nie nachodziły na siebie</div>';

  var panel = document.createElement("div");
  panel.className = "lag-panel";
  panel.innerHTML = html;
  document.body.appendChild(panel);

  function ref(path) {
    var parts = path.split(".");
    return parts.length === 1
      ? { obj: CFG, key: parts[0] }
      : { obj: CFG.groups[parts[0]], key: parts[1] };
  }

  Array.prototype.forEach.call(panel.querySelectorAll("[data-cfg]"), function (input) {
    var path = input.getAttribute("data-cfg");
    var r = ref(path);
    input.value = r.obj[r.key];
    var out = panel.querySelector('[data-out="' + path + '"]');
    if (out) out.textContent = r.obj[r.key];
    input.addEventListener("input", function () {
      r.obj[r.key] = parseFloat(input.value);
      if (out) out.textContent = input.value;
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "p" || e.key === "P") panel.hidden = !panel.hidden;
  });
})();
