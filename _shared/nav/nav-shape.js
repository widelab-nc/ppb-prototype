/* ============================================================
   Navbar — generator kształtu Union (Figma 3885:3087 / 4473:6894)
   Rysuje pigułki + "gooey" łączniki jako jedną ścieżkę SVG,
   na podstawie realnych pozycji linków (flex, auto-szerokość).
   Punkty kontrolne fal wyciągnięte 1:1 z eksportu SVG z Figmy.
   Obsługuje wiele instancji .nav_menu (warianty dark/light).
   ============================================================ */

(function () {
  var NS = "http://www.w3.org/2000/svg";

  var H = 42;          // wysokość kształtu
  var R = 21;          // promień końców pigułek
  var K = 11.59797;    // R * 0.5523 — cubic approx ćwiartki okręgu

  // Fala łącznika: stałe offsety punktów kontrolnych względem
  // środka odstępu (g), z SVG Figmy. Góra: y 0 → 15 → 0.
  var W1 = 26,     W2 = 18.571, W3 = 12.043, W4 = 8.31, W5 = 6.43, W6 = 3.483;
  var Y1 = 3.85831, Y2 = 9.68036, Y3 = 12.6126, Y4 = 15;

  function f(n) { return Math.round(n * 1000) / 1000; }

  /* buildPath z parametrem s — JEDNOLITA skala całej geometrii (x i y).
     Wysokość pigułki to 2.625rem przy FLUID rem (root font-size płynie
     z viewportem), więc realna wysokość ≠ 42px. Ścieżka jest generowana
     OD RAZU w realnych px: wszystkie stałe (promienie, fale) × s, gdzie
     s = hReal/42. Dzięki temu:
     - końcówki pigułek to idealne półokręgi przy każdym remie
       (wcześniej: SVG rozciągany tylko pionowo → elipsy),
     - clip-path blura = DOSŁOWNIE ta sama ścieżka co kształt
       (clip-path i tak nie skaluje się z elementem — musi być w realnych px). */
  function buildPath(width, centers, s) {
    var r = R * s, k = K * s, h = H * s;
    var w1 = W1 * s, w2 = W2 * s, w3 = W3 * s, w4 = W4 * s, w5 = W5 * s, w6 = W6 * s;
    var y1 = Y1 * s, y2 = Y2 * s, y3 = Y3 * s, y4 = Y4 * s;
    function waveTop(g) {
      return (
        "L" + f(g - w1) + " 0" +
        "C" + f(g - w2) + " 0 " + f(g - w3) + " " + f(y1) + " " + f(g - w4) + " " + f(y2) +
        "C" + f(g - w5) + " " + f(y3) + " " + f(g - w6) + " " + f(y4) + " " + f(g) + " " + f(y4) +
        "C" + f(g + w6) + " " + f(y4) + " " + f(g + w5) + " " + f(y3) + " " + f(g + w4) + " " + f(y2) +
        "C" + f(g + w3) + " " + f(y1) + " " + f(g + w2) + " 0 " + f(g + w1) + " 0"
      );
    }
    function waveBottom(g) {
      var yA = f(h - y1), yB = f(h - y2), yC = f(h - y3), yD = f(h - y4), yH = f(h);
      return (
        "L" + f(g + w1) + " " + yH +
        "C" + f(g + w2) + " " + yH + " " + f(g + w3) + " " + yA + " " + f(g + w4) + " " + yB +
        "C" + f(g + w5) + " " + yC + " " + f(g + w6) + " " + yD + " " + f(g) + " " + yD +
        "C" + f(g - w6) + " " + yD + " " + f(g - w5) + " " + yC + " " + f(g - w4) + " " + yB +
        "C" + f(g - w3) + " " + yA + " " + f(g - w2) + " " + yH + " " + f(g - w1) + " " + yH
      );
    }
    var yH = f(h);
    var d = "M" + f(r) + " 0";
    centers.forEach(function (g) { d += waveTop(g); });
    d += "L" + f(width - r) + " 0" +
         "C" + f(width - r + k) + " 0 " + width + " " + f(r - k) + " " + width + " " + f(r) +
         "C" + width + " " + f(r + k) + " " + f(width - r + k) + " " + yH + " " + f(width - r) + " " + yH;
    centers.slice().reverse().forEach(function (g) { d += waveBottom(g); });
    d += "L" + f(r) + " " + yH +
         "C" + f(r - k) + " " + yH + " 0 " + f(r + k) + " 0 " + f(r) +
         "C0 " + f(r - k) + " " + f(r - k) + " 0 " + f(r) + " 0Z";
    return d;
  }

  function initMenu(menu, idx) {
    var links = Array.prototype.slice.call(menu.querySelectorAll(".nav_link"));
    var svg = menu.querySelector(".nav_menu-bg");
    var shape = menu.querySelector(".nav_menu-shape");
    if (!svg || !shape || !links.length) return;

    // clipPath z tym samym kształtem — przycina stroke do środka (inside)
    // i jest reużywany przez CSS clip-path warstwy blur
    var clipId = "navShapeClip-" + idx;
    var defs = document.createElementNS(NS, "defs");
    var clip = document.createElementNS(NS, "clipPath");
    clip.setAttribute("id", clipId);
    var clipShape = document.createElementNS(NS, "path");
    clip.appendChild(clipShape);
    defs.appendChild(clip);
    svg.appendChild(defs);
    shape.setAttribute("clip-path", "url(#" + clipId + ")");
    // 1:1 mapowanie viewBox→piksele (nigdy nie skaluj ścieżki przy zmianie szer.)
    svg.setAttribute("preserveAspectRatio", "none");

    function draw() {
      var width = menu.offsetWidth;
      var hReal = menu.getBoundingClientRect().height;
      if (!width || !hReal) return;

      var centers = [];
      for (var i = 0; i < links.length - 1; i++) {
        var right = links[i].offsetLeft + links[i].offsetWidth;
        var left = links[i + 1].offsetLeft;
        centers.push((right + left) / 2);
      }

      var d = buildPath(f(width), centers, hReal / H);
      shape.setAttribute("d", d);
      clipShape.setAttribute("d", d);
      svg.setAttribute("width", width);
      svg.setAttribute("height", hReal);
      svg.setAttribute("viewBox", "0 0 " + width + " " + hReal);

      // Clip blura = DOSŁOWNIE ta sama ścieżka (już w realnych px).
      // Wspólny początek układu (blur: top/left=0, wystaje tylko bottom).
      //
      // ⚠️ ZASADA: clip-path NIGDY nie jest mutowany na żywym elemencie
      // z backdrop-filter — zmiana clipa (albo stylów w ogóle) na istniejącej
      // warstwie backdrop-filter psuje ją w Chrome do najbliższego twardego
      // repaintu (frost znika / rozjeżdża się przy resize). Każda zmiana
      // geometrii = ŚWIEŻY węzeł, który wchodzi do DOM już z gotowym clipem
      // (świeża warstwa próbkuje tło poprawnie). Odpytywany na każdym draw,
      // bo nav-menu.js (rebuildBackdrop) też podmienia ten węzeł.
      var blur = menu.querySelector(".nav_menu-blur");
      if (blur && blur.__clipD !== d) {
        var nb = blur.cloneNode(false);
        var c = 'path("' + d + '")';
        nb.style.clipPath = c;
        nb.style.webkitClipPath = c;
        nb.__clipD = d;
        blur.parentElement.replaceChild(nb, blur);
      }
    }

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(draw);
      ro.observe(menu);
      links.forEach(function (l) { ro.observe(l); });
    }
    // zawsze też na resize okna — ResizeObserver nie odpala, jeśli box menu
    // się nie zmienia, a chcemy pewność że viewBox==szerokość po każdej zmianie
    window.addEventListener("resize", draw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    draw();
  }

  Array.prototype.slice
    .call(document.querySelectorAll(".nav_menu"))
    .forEach(initMenu);
})();
