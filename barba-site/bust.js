/* Podbija ?v= na WSZYSTKICH lokalnych plikach barba-site/ w obu HTML-ach.
   Pułapka 21 z STATUS-a: plik edytowany bez podbicia = przeglądarka serwuje starą wersję.

   ⚠️ KOREKTA AUDYTU (2026-07-29): wersja była ZASZYTA NA SZTYWNO ("20260728-barba6"),
   więc „node bust.js po każdej zmianie" NICZEGO nie podbijało — przepisywało tę samą
   wartość. Czyli pułapka 21 wróciłaby przy pierwszej edycji bez ręcznej zmiany stałej.
   Teraz wersja jest generowana z zegara przy każdym uruchomieniu. */
const fs = require("fs");
const d = new Date();
const p = (n) => String(n).padStart(2, "0");
const V = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
const LOCAL = ["style.css", "about.css", "root-scale.css", "track-record.css", "script.js", "about.js", "nav-v2.js",
               "key-pillars.js", "insights.js", "meet-swiper.js", "transition.js", "smooth-lenis.js", "loader-01d.js", "nav-shape.js"];
for (const f of ["index.html", "about.html"]) {
  let s = fs.readFileSync(f, "utf8"), n = 0;
  for (const file of LOCAL) {
    const re = new RegExp('((?:src|href)=")' + file.replace(".", "\\.") + '(\\?v=[^"]*)?(")', "g");
    s = s.replace(re, (m, a, q, z) => { n++; return a + file + "?v=" + V + z; });
  }
  fs.writeFileSync(f, s);
  console.log(f, "— podbitych:", n, "→ ?v=" + V);
}
