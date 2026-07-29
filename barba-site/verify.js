/* Weryfikacja statyczna barba-site/: składnia JS, istnienie zasobów,
   struktura kontenerów Barby, kontrakty init/destroy. */
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const DIR = process.cwd();
let fail = 0;
const bad = (m) => { console.log("  ❌ " + m); fail++; };
const ok = (m) => console.log("  ✅ " + m);

/* ---------- 1. składnia JS ---------- */
console.log("\n== 1. node --check ==");
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".js"))) {
  try { cp.execSync(`node --check "${f}"`, { stdio: "pipe" }); ok(f); }
  catch (e) { bad(f + " — " + String(e.stderr).split("\n")[1]); }
}

/* ---------- 2. zasoby linkowane z HTML ---------- */
console.log("\n== 2. src/href z HTML istnieją na dysku ==");
for (const page of ["index.html", "about.html"]) {
  const html = fs.readFileSync(page, "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
    .filter((u) => !/^(https?:|#|mailto:|data:)/.test(u));
  /* href="/cos" = placeholder stopki (strona jeszcze nie istnieje). Nie jest błędem,
     ALE Barba nie może go przechwycić — inaczej fetch 404 i user zostaje pod zasłoną. */
  const placeholders = refs.filter((u) => u.startsWith("/"));
  const local = refs.filter((u) => !u.startsWith("/"));
  const missing = local.filter((u) => !fs.existsSync(path.resolve(DIR, u.split("?")[0])));
  if (missing.length) bad(`${page}: brak ${missing.length} → ${[...new Set(missing)].join(", ")}`);
  else ok(`${page}: wszystkie ${local.length} lokalnych referencji istnieją`);
  if (placeholders.length) {
    const t = fs.readFileSync("transition.js", "utf8");
    const whitelisted = /var PAGES = \["index\.html", "about\.html"\]/.test(t) &&
                        /PAGES\.indexOf\(file\) === -1/.test(t);
    whitelisted
      ? ok(`${page}: ${placeholders.length} placeholderów stopki — Barba ich nie przechwytuje (whitelist PAGES)`)
      : bad(`${page}: ${placeholders.length} placeholderów, a transition.js NIE ma whitelisty → fetch 404`);
  }
}

/* ---------- 3. zasoby z CSS stron ---------- */
console.log("\n== 3. url() z CSS ==");
for (const [css, base] of [["style.css", DIR], ["about.css", DIR],
                           ["../track-record/style.css", path.resolve(DIR, "../track-record")],
                           ["../home-insights/section.css", path.resolve(DIR, "../home-insights")]]) {
  if (!fs.existsSync(css)) { bad(css + " nie istnieje"); continue; }
  const s = fs.readFileSync(css, "utf8");
  const urls = [...s.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1])
    .filter((u) => !/^(https?:|data:|#)/.test(u));   // url(#id) = referencja do filtra SVG, nie plik
  const missing = urls.filter((u) => !fs.existsSync(path.resolve(base, u.split("?")[0])));
  if (missing.length) bad(`${css}: brak → ${[...new Set(missing)].join(", ")}`);
  else ok(`${css}: ${urls.length} url() OK`);
}

/* ---------- 4. struktura Barby ---------- */
console.log("\n== 4. markup Barby ==");
for (const [page, ns] of [["index.html", "home"], ["about.html", "about"]]) {
  const h = fs.readFileSync(page, "utf8");
  /* liczymy ATRYBUTY w markupie, nie wystąpienia tekstu — te same ciągi
     pojawiają się teraz jako selektory CSS w <style> warstwy trwałej */
  const wrap = (h.match(/<div data-barba="wrapper"/g) || []).length;
  const cont = (h.match(/<div data-barba="container"/g) || []).length;
  const hasNs = h.includes(`data-barba-namespace="${ns}"`);
  if (wrap !== 1 || cont !== 1 || !hasNs) bad(`${page}: wrapper=${wrap} container=${cont} ns=${hasNs}`);
  else ok(`${page}: 1 wrapper, 1 container, namespace="${ns}"`);

  // nav / loader / maska MUSZĄ być przed kontenerem (warstwa site-level)
  const iCont = h.indexOf('data-barba="wrapper"');
  for (const sel of ['<header class="nav_component"', 'class="nav-mask_component"', 'class="nav-mobile"']) {
    const i = h.indexOf(sel);
    if (i < 0) bad(`${page}: brak ${sel}`);
    else if (i > iCont) bad(`${page}: ${sel} jest W kontenerze — powinien być site-level`);
  }
  // page CSS oznaczony
  const pageCss = (h.match(/data-page-css/g) || []).length;
  if (pageCss < 2) bad(`${page}: tylko ${pageCss} arkuszy z data-page-css`);
  else ok(`${page}: ${pageCss} arkuszy strony do swapu`);
}

/* ---------- 4b. CACHE-BUST (pułapka 21 z STATUS.md) ----------
   Plik edytowany bez podbicia ?v= = przeglądarka serwuje starą wersję i godzinę
   szuka się buga, którego już nie ma w kodzie. To NIE jest kosmetyka. */
console.log("\n== 4b. cache-bust na lokalnych plikach ==");
{
  const versions = new Set();
  let noVer = [];
  for (const page of ["index.html", "about.html"]) {
    const h = fs.readFileSync(page, "utf8");
    for (const m of h.matchAll(/(?:src|href)="(?!\.\.\/|https?:)([a-z0-9-]+\.(?:js|css))(\?v=([^"]+))?"/g)) {
      if (m[1] === "verify.js" || m[1] === "make-insights.js") continue;
      m[3] ? versions.add(m[3]) : noVer.push(`${page}:${m[1]}`);
    }
  }
  if (noVer.length) bad(`bez ?v= → ${noVer.join(", ")}`);
  else if (versions.size > 1) bad(`rozjechane wersje: ${[...versions].join(", ")}`);
  else ok(`wszystkie lokalne pliki na ?v=${[...versions][0]}`);
}

/* ---------- 4c. drabinka z-index przejścia ----------
   Zasłona ma leżeć POD navem (nav nie mruga) i NAD treścią. Żeby to trzymało,
   kontener musi być własnym kontekstem układania — inaczej sekcje z z-index 2000
   przebiją się nad zasłonę. */
console.log("\n== 4c. zasłona pod navem ==");
{
  const t = fs.readFileSync("transition.js", "utf8");
  const z = (t.match(/zIndex:\s*"(\d+)"/) || [])[1];
  const navZ = 50;
  if (!z) bad("transition.js: nie znalazłem zIndex overlaya");
  else if (+z >= navZ) bad(`overlay z-index ${z} >= nav ${navZ} — zasłona zakryje nav`);
  else ok(`overlay z-index ${z} < nav ${navZ}`);
  for (const page of ["index.html", "about.html"]) {
    const h = fs.readFileSync(page, "utf8");
    /isolation:\s*isolate/.test(h) && /\[data-barba="container"\]\s*{[^}]*z-index:\s*0/.test(h)
      ? ok(`${page}: kontener = kontekst układania`)
      : bad(`${page}: kontener BEZ isolation/z-index — treść przebije zasłonę`);
  }
}

/* ---------- 4d. WARSTWA TRWAŁA IDENTYCZNA + skala poza arkuszami stron ----------
   Nav jest site-level (nie podmienia się), a jest w rem i czyta --container-gutter.
   Jeśli root font-size albo padding nava siedzą w arkuszu STRONY, nav zmienia
   rozmiar w połowie przejścia. To był „glitch nawigacji" (changelog 54). */
console.log("\n== 4d. warstwa trwała ==");
{
  const persist = {};
  for (const page of ["index.html", "about.html"]) {
    const h = fs.readFileSync(page, "utf8");
    persist[page] = [...h.matchAll(/<link rel="stylesheet" href="([^"?]+)[^"]*"(?![^>]*data-page-css)[^>]*\/>/g)]
      .map((m) => m[1]).sort().join(" | ");
  }
  persist["index.html"] === persist["about.html"]
    ? ok("obie strony mają IDENTYCZNĄ warstwę trwałą CSS")
    : bad(`warstwa trwała się rozjeżdża:\n     home : ${persist["index.html"]}\n     about: ${persist["about.html"]}`);

  const st = fs.readFileSync("style.css", "utf8");
  /^html\s*{/m.test(st)
    ? bad("style.css (arkusz STRONY) ustawia html{} — root font-size zniknie na about")
    : ok("style.css nie ustawia root font-size");
  /^\.nav_component\s*{\s*padding/m.test(st)
    ? bad("style.css (arkusz STRONY) stylizuje .nav_component — nav zmieni się na about")
    : ok("style.css nie stylizuje nava");

  const rs = fs.existsSync("root-scale.css") ? fs.readFileSync("root-scale.css", "utf8") : "";
  /^html\s*{/m.test(rs) && /--container-gutter/.test(rs) && /^\.nav_component/m.test(rs)
    ? ok("root-scale.css niesie skalę, gutter i padding nava")
    : bad("root-scale.css nie ma kompletu (html / --container-gutter / .nav_component)");
}

/* ---------- 4e. PARYTET SKRYPTÓW między stronami (audyt 2026-07-29) ----------
   Barba NIE wykonuje skryptów z podmienianego dokumentu — okno ma na zawsze
   tylko skrypty strony WEJŚCIOWEJ. Różnica list = martwa strona po przejściu
   (brak modułu → `[ppb] brak modułu strony`, FOUC guard chowa wszystko).
   Zmierzone headlessem: home→about bez about.js w index.html = 0 triggerów,
   16/16 [data-reveal] ukrytych. */
console.log("\n== 4e. identyczne listy <script src> na obu stronach ==");
{
  const lists = {};
  for (const page of ["index.html", "about.html"]) {
    const h = fs.readFileSync(page, "utf8");
    lists[page] = [...h.matchAll(/<script src="([^"?]+)[^"]*"/g)].map((m) => m[1]).sort();
  }
  const a = lists["index.html"].join(" | "), b = lists["about.html"].join(" | ");
  if (a === b) ok(`obie strony ładują IDENTYCZNY zestaw ${lists["index.html"].length} skryptów`);
  else {
    const setA = new Set(lists["index.html"]), setB = new Set(lists["about.html"]);
    const onlyA = lists["index.html"].filter((s) => !setB.has(s));
    const onlyB = lists["about.html"].filter((s) => !setA.has(s));
    bad(`listy skryptów się rozjeżdżają → tylko index: [${onlyA}] | tylko about: [${onlyB}]`);
  }
}

/* ---------- 5. kontrakty init/destroy ---------- */
console.log("\n== 5. kontrakty modułów ==");
const contracts = {
  "script.js": "PPB.pages.home",
  "about.js": "PPB.pages.about",
  "key-pillars.js": "PPB.sections.keyPillars",
  "insights.js": "PPB.sections.insights",
  "meet-swiper.js": "PPB.sections.meetSwiper",
  "../track-record/script.js": "PPB.pages.trackRecord",
};
for (const [f, sym] of Object.entries(contracts)) {
  const s = fs.readFileSync(f, "utf8");
  const has = s.includes(sym + " = {") && /function destroy\s*\(/.test(s);
  has ? ok(`${f} → ${sym} { init, destroy }`) : bad(`${f}: brak ${sym} albo destroy()`);
}

/* ---------- 6. brak globalnego CONFIG (kolizja home×about) ---------- */
console.log("\n== 6. wycieki do globala ==");
for (const f of ["script.js", "about.js"]) {
  const s = fs.readFileSync(f, "utf8");
  const iIife = s.indexOf("(function () {");
  const iCfg = s.indexOf("const CONFIG = {");   // deklaracja, nie wzmianka w komentarzu
  if (iIife < 0 || iCfg < iIife) bad(`${f}: CONFIG poza IIFE (kolizja przy nawigacji!)`);
  else ok(`${f}: CONFIG wewnątrz IIFE (${iCfg} > ${iIife})`);
  if (/^window\.addEventListener\("load"/m.test(s)) bad(`${f}: został listener load na poziomie pliku`);
}

/* ---------- 7. resztki po starym bootowaniu ---------- */
console.log("\n== 7. listenery load w modułach ==");
for (const f of ["script.js", "about.js", "key-pillars.js", "insights.js", "meet-swiper.js"]) {
  const s = fs.readFileSync(f, "utf8");
  const n = (s.match(/addEventListener\("load"/g) || []).length;
  const guarded = (s.match(/if \(!window\.__PPB_BARBA__\)/g) || []).length;
  if (n > guarded) bad(`${f}: ${n} listenerów load, tylko ${guarded} za guardem __PPB_BARBA__`);
  else ok(`${f}: ${n} listener(ów) load, wszystkie za guardem standalone`);
}

/* ---------- 8. pułapka hoistingu `var PPB` (audyt 2026-07-29) ----------
   `var PPB = (window.PPB = ...)` na DOLE IIFE + użycie `PPB.` WYŻEJ w tym samym
   IIFE = hoisting robi z lokalnego PPB undefined → TypeError na starcie pliku,
   moduł nigdy się nie rejestruje. Dokładnie to ubiło key-pillars.js (w każdej
   przeglądarce): cały plik padał, PPB.sections.keyPillars nie istniało,
   home miał 17 triggerów zamiast 67. Deklaracja MUSI być przed użyciem. */
console.log("\n== 8. `var PPB` przed pierwszym użyciem ==");
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".js") && !["verify.js", "bust.js", "make-insights.js"].includes(f))) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  let decl = -1, firstUse = -1, inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    /* zdejmij komentarze — ze STANEM dla bloków /* … *​/ rozciągniętych na wiele linii
       (nagłówki tych plików wspominają PPB w opisach; to nie jest użycie w kodzie) */
    let line = "", s = lines[i];
    for (let j = 0; j < s.length; j++) {
      if (inBlock) { if (s[j] === "*" && s[j + 1] === "/") { inBlock = false; j++; } continue; }
      if (s[j] === "/" && s[j + 1] === "*") { inBlock = true; j++; continue; }
      if (s[j] === "/" && s[j + 1] === "/") break;                    // komentarz liniowy
      line += s[j];
    }
    if (decl < 0 && /\bvar PPB\s*=/.test(line)) decl = i + 1;
    if (firstUse < 0 && /\bPPB\s*[.[]/.test(line)) firstUse = i + 1;
  }
  if (decl > 0 && firstUse > 0 && firstUse < decl) bad(`${f}: użycie PPB w linii ${firstUse}, a \`var PPB\` dopiero w ${decl} (hoisting → undefined)`);
  else ok(`${f}${decl > 0 ? ` (deklaracja ${decl}, pierwsze użycie ${firstUse})` : " (bez lokalnego var PPB)"}`);
}

console.log(fail ? `\n🔴 BŁĘDÓW: ${fail}` : "\n🟢 Wszystkie kontrole statyczne przeszły");
process.exit(fail ? 1 : 0);
