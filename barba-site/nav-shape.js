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

  function waveTop(g) {
    return (
      "L" + f(g - W1) + " 0" +
      "C" + f(g - W2) + " 0 " + f(g - W3) + " " + f(Y1) + " " + f(g - W4) + " " + f(Y2) +
      "C" + f(g - W5) + " " + f(Y3) + " " + f(g - W6) + " " + f(Y4) + " " + f(g) + " " + f(Y4) +
      "C" + f(g + W6) + " " + f(Y4) + " " + f(g + W5) + " " + f(Y3) + " " + f(g + W4) + " " + f(Y2) +
      "C" + f(g + W3) + " " + f(Y1) + " " + f(g + W2) + " 0 " + f(g + W1) + " 0"
    );
  }

  function waveBottom(g) {
    var yA = f(H - Y1), yB = f(H - Y2), yC = f(H - Y3), yD = f(H - Y4);
    return (
      "L" + f(g + W1) + " " + H +
      "C" + f(g + W2) + " " + H + " " + f(g + W3) + " " + yA + " " + f(g + W4) + " " + yB +
      "C" + f(g + W5) + " " + yC + " " + f(g + W6) + " " + yD + " " + f(g) + " " + yD +
      "C" + f(g - W6) + " " + yD + " " + f(g - W5) + " " + yC + " " + f(g - W4) + " " + yB +
      "C" + f(g - W3) + " " + yA + " " + f(g - W2) + " " + H + " " + f(g - W1) + " " + H
    );
  }

  function buildPath(width, centers) {
    var d = "M" + R + " 0";
    centers.forEach(function (g) { d += waveTop(g); });
    d += "L" + f(width - R) + " 0" +
         "C" + f(width - R + K) + " 0 " + width + " " + f(R - K) + " " + width + " " + R +
         "C" + width + " " + f(R + K) + " " + f(width - R + K) + " " + H + " " + f(width - R) + " " + H;
    centers.slice().reverse().forEach(function (g) { d += waveBottom(g); });
    d += "L" + R + " " + H +
         "C" + f(R - K) + " " + H + " 0 " + f(R + K) + " 0 " + R +
         "C0 " + f(R - K) + " " + f(R - K) + " 0 " + R + " 0Z";
    return d;
  }

  function initMenu(menu, idx) {
    var links = Array.prototype.slice.call(menu.querySelectorAll(".nav_link"));
    var svg = menu.querySelector(".nav_menu-bg");
    var shape = menu.querySelector(".nav_menu-shape");
    var blur = menu.querySelector(".nav_menu-blur");
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

    function draw() {
      var width = menu.offsetWidth;
      if (!width) return;

      var centers = [];
      for (var i = 0; i < links.length - 1; i++) {
        var right = links[i].offsetLeft + links[i].offsetWidth;
        var left = links[i + 1].offsetLeft;
        centers.push((right + left) / 2);
      }

      var d = buildPath(f(width), centers);
      shape.setAttribute("d", d);
      clipShape.setAttribute("d", d);
      svg.setAttribute("width", width);
      svg.setAttribute("height", H);
      svg.setAttribute("viewBox", "0 0 " + width + " " + H);

      if (blur) {
        var c = 'path("' + d + '")';
        blur.style.clipPath = c;
        blur.style.webkitClipPath = c;
      }
    }

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(draw);
      ro.observe(menu);
      links.forEach(function (l) { ro.observe(l); });
    } else {
      window.addEventListener("resize", draw);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    draw();
  }

  Array.prototype.slice
    .call(document.querySelectorAll(".nav_menu"))
    .forEach(initMenu);
})();
