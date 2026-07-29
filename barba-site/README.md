# barba-site — home + about z page transitions (Barba.js) i smooth scrollem (Lenis)

> Utworzony 2026-07-28. Kopie robocze, **kanony nietknięte**:
> `home-rwd-resize-1/` (stan zaakceptowany) i `about/` są bez zmian.
> Tu wolno eksperymentować.

## Odpalanie

Barba pobiera kolejną stronę fetchem, więc **`file://` nie zadziała**:

```bash
cd _code
bash barba-site/serve.sh
# → http://localhost:8000/barba-site/
```

## 🔍 AUDYT 2026-07-29 — pierwszy test W BIEGU (headless Chromium) + korekty

Niezależna weryfikacja wpisów 51–55 (changelog **56**). Strona po raz pierwszy
URUCHOMIONA (nie tylko statyka): pełne cykle home↔about w headless Chromium.

**Znalezione i naprawione (obie rzeczy były niewidoczne dla statyki):**

1. **`key-pillars.js` padał na starcie w KAŻDEJ przeglądarce.** Kopia dostała
   `var PPB = (window.PPB = …)` na dole IIFE (rejestracja kontraktu), a linia 28
   używa `PPB.config` — hoisting `var` robi z lokalnego `PPB` `undefined` →
   TypeError, cały plik martwy, `PPB.sections.keyPillars` nie istniało.
   Zmierzone: home miał **17 triggerów zamiast 67** (key pillars / concept /
   CTA / footer-bottle-reveal — wszystko martwe). Po naprawie: **67, jak kanon**.
   Deklaracja przeniesiona na górę IIFE; pilnuje `verify.js` sekcja 8.
2. **Zestawy skryptów obu stron się różniły — przejście dawało MARTWĄ stronę.**
   Barba nie wykonuje skryptów z pobranego dokumentu; okno ma na zawsze tylko
   skrypty strony WEJŚCIOWEJ. `index.html` nie ładował `about.js` → home→about
   = `[ppb] brak modułu strony`, 0 triggerów, wszystko schowane pod FOUC guardem
   (zmierzone). Teraz OBA HTML-e ładują IDENTYCZNĄ unię modułów (moduły tylko
   rejestrują kontrakty — DOM ruszają w `init()`); pilnuje `verify.js` sekcja 4e.
   ⚠️ Objaw był dotąd MASKOWANY przez degradacje do pełnego przeładowania —
   gdyby transitions „zadziałały" wcześniej, zobaczylibyśmy puste strony.

**Korekty do diagnozy z wpisu 55 (timeout + serwer):**

- `python3 -m http.server` jest **WIELOwątkowy od Pythona 3.7** (CLI używa
  `ThreadingHTTPServer`; tamten check `issubclass(HTTPServer, ThreadingMixIn)`
  sprawdzał złą klasę). Pomiar: GET `about.html` przy 6 równoległych strumieniach
  wideo = **1,9 ms** (stock) vs **4,65 s** (wymuszony jednowątkowy). Diagnoza
  „XHR czekał za wideo" trzyma się tylko przy Pythonie <3.7 — **sprawdź
  `python3 --version`**. `serve.sh` zostaje (nagłówki `no-store` są cenne).
- **`requestError → false` NIE blokuje przeładowania.** W Barbie są dwie ścieżki
  do `force()`; druga (odrzucona obietnica przejścia w `go()`, aktywna przy
  domyślnym logLevel=off) odpala się mimo `false`. Timeout/404 nadal kończy się
  twardym przeładowaniem — i dobrze (lepsze niż user pod zasłoną); pas na
  referrerze pilnuje, żeby NIE grał wtedy loader. Komentarz w `transition.js`
  poprawiony, timeout zbity 20 s → **8 s** (tyle user maksymalnie czeka pod
  wipe'em zanim nastąpi degradacja).
- **Moment startu strony NAPRAWIONY** (otwarty punkt (d) z wpisu 55): hook
  `once` odpala się przed załadowaniem fontów/obrazów — zmierzone 8× „SplitText
  called before fonts loaded". Teraz przy świeżym dokumencie init czeka na
  `window.load` + `document.fonts.ready` (parytet z kanonem, który wisiał na
  `load`). Po poprawce: **0 ostrzeżeń**. Nawigacje Barbą inicjują od razu
  (fonty już są; geometrię domyka `ScrollTrigger.refresh()` w hooku `after`).

**Wyniki po poprawkach (headless, cykl home→about→home→about):**
triggery 67 → 6 → 67 → 6 (stabilne, zero kumulacji), zero pełnych ładowań,
zero błędów konsoli, oba kierunki wejścia (przez home i przez about) żywe.

**Czego headless NIE pokrył (do obejrzenia na żywo):** Unicorn (CDN odcięty
w sandboxie — sprawdź w konsoli `typeof UnicornStudio.destroy` → ma być
`"function"`, inaczej po ~8 przejściach padną konteksty WebGL), frost nava,
płynność wipe'a, wideo-scruby, fonty na renderze.

**Drobne:** `bust.js` miał wersję ZASZYTĄ NA SZTYWNO (nic nie podbijał) — teraz
generuje ją z zegara. Znane zachowanie: klik w link do BIEŻĄCEJ strony (logo na
home) = natywne przeładowanie z loaderem (Barba nie przechwytuje same-URL).

**Ocena architektury (skrót):** podział site-level/kontener i nav poza
kontenerem — zostaje; to właściwy układ i pod Webflow się mapuje. `data-page-css`
jest OK dla prototypu, ale w porcie do Webflow CSS ma być globalny (jeden
arkusz + namespace klas per strona) — runtime'owy swap arkuszy to najbardziej
kruchy element tej paczki (dwa z czterech bugów z 51–54 to jego skutki).
Kopie `insights.js`/`nav-v2.js`/`key-pillars.js` = dług jak dotąd; po
akceptacji zdiffować do kanonu (fix `var PPB` przenieść razem z nimi!).

## Odpowiedź na pytanie „smooth scroll jest już wgrany?"

**Lenis jest kanonem projektu** (`_shared/smooth/smooth-lenis.js`, wybrany
w porównaniu z ScrollSmootherem — `_smooth-lenis/COMPARISON.md`), ale rozkład
był nierówny:

| Gdzie | Lenis przed tą paczką |
|---|---|
| `about/` | ✅ był (CDN 1.1.19 + `_shared/smooth/smooth-lenis.js`) |
| `home-rwd-resize-1/`, `home-wf-rwd/`, `home-full/` | ❌ **nie było go wcale** |
| `home-part1/` | ✅ był (poligon pod port, własny `vendor/lenis.min.js`) |

Barby nie było **nigdzie** poza demem `_smooth-lenis/`. Harness
(`_shared/smooth/transition.js`) leżał gotowy od 2026-07-19 i czekał, aż strony
spełnią kontrakt. Tutaj obie warstwy są wpięte na obu stronach, z lokalnego
`vendor/` (bez CDN — jedna wersja dla obu stron, działa offline).

## Co realnie się zmieniło (i dlaczego)

Kontrakt: `_shared/smooth/BARBA-READY-CONTRACT.md`. Barba nawiguje bez
przeładowania — okno JS żyje dalej. To łamało trzy założenia prototypów:

**1. `window.addEventListener("load")` odpala się RAZ.** Oba skrypty stron
wisiały na `load`. Po nawigacji kod nowej strony by nie wystartował, a że
`[data-reveal]` ma `opacity: 0` (FOUC guard), dostalibyśmy pustą stronę.

**2. Globale się zderzały.** `script.js` i `about.js` miały **oba** globalne
`const CONFIG` i `buildHeroReveal`. Dwie strony chwilę współistnieją w pamięci
→ SyntaxError → nie wstaje nic.

**3. ScrollTriggery nie znikały.** Home ma ~67 triggerów. Home→about→home
dawałoby je trzykrotnie, z pinami na sobie.

### Moduły i ich kontrakty

| Plik | Eksport | Uwagi |
|---|---|---|
| `script.js` | `PPB.pages.home` | `init({first, container})` / `destroy()` |
| `about.js` | `PPB.pages.about` | j.w. |
| `key-pillars.js` | `PPB.sections.keyPillars` | miał własny listener `load` |
| `insights.js` | `PPB.sections.insights` | **kopia** `../home-insights/script.js` |
| `meet-swiper.js` | `PPB.sections.meetSwiper` | był inline'em w `index.html` |
| `nav-v2.js` | `PPB.navV2.bind/unbind` | podział na warstwę trwałą i per-stronę |
| `../track-record/script.js` | `PPB.pages.trackRecord` | **już miał kontrakt**, nic nie ruszane |

Każdy moduł ma fallback „standalone" za `if (!window.__PPB_BARBA__)`, więc
otwarty poza harnessem zachowuje się jak dawniej.

### Podział DOM: site-level vs kontener

```
<body>
  svg-defs · loader (tylko home) · nav · maska nava · mobilne menu   ← SITE-LEVEL
  <div data-barba="wrapper">
    <div data-barba="container" data-barba-namespace="home|about">   ← podmieniane
      …treść strony…
```

**Warstwa site-level musi być identyczna na obu stronach.** Barba jej nie
podmienia, więc cokolwiek się różni — zostanie ze strony, z której przyszedłeś.
Dwie konsekwencje, które już obsłużyłem:

- **„Get in touch"** był na about site-level (`fixed`), a na home w
  `.home-hero_component` (`absolute`). Przeniesiony do kontenera — inaczej
  na jednej ze stron by zniknął.
- **Ręczna kopia maski nava** w `about.html` została wycięta; nav-v2 robi klon
  z `cloneNode`. Przy okazji znika dług z STATUS-a („kopia maski bez hamburgera").

Nav został **site-level celowo**: klon maski powstaje raz, a warstwa
`backdrop-filter` („frost") jest w Chrome krucha — przemontowywanie nava co
nawigację ściągnęłoby z powrotem bugi z sekcji FROST KICK. Per-strona są tylko
**styki motywu** (`[data-nav-theme]`) — `bind()` je stawia, `unbind()` zabija.

### CSS: dwie warstwy

Arkusze stron mają `data-page-css` i `transition.js` podmienia je pod zasłoną
wipe'a. To **nie jest kosmetyka**: `style.css` (home) niesie blok FLUID ROOT
ustawiający `html { font-size }`, a `about.css` go nie ma. Gdyby oba arkusze
leżały obok siebie, wygrywałby wstawiony później i skalowanie by się rozjechało.

### Loader

Zgodnie z Twoją decyzją: `first === true` (pierwsze wejście w sesji) → pełny
loader. Każda nawigacja Barbą → `first === false` → od razu `buildHeroReveal()`
(line-reveal tekstów hero + scale unicorna), a zasłoną jest wipe. Loader jest
tylko w `index.html`; about go nie ma i nie potrzebuje.

## ⚠️ Czego NIE zweryfikowałem

**Sandbox nie ma przeglądarki ani headless Chromium.** Przeszło wszystko, co da
się sprawdzić statycznie (`node verify.js`): składnia, istnienie zasobów,
struktura kontenerów, kontrakty, brak globalnego `CONFIG`, brak niezguardowanych
listenerów `load`. **Zachowanie w biegu nie było uruchomione ani razu.**

```bash
cd barba-site && node verify.js     # kontrola statyczna, do powtarzania po zmianach
```

## Checklista do klikania (to jest robota dla Ciebie)

Konsola otwarta przez cały czas. Po każdej nawigacji w konsoli:

```js
ScrollTrigger.getAll().length
```

1. **Wejście na home** — loader gra pełny, nav się pojawia (biały na ciemnym
   hero). Zanotuj liczbę triggerów (odniesienie ze STATUS: **67** desktop).
2. **Home → About** — wipe zasłania, about wchodzi od góry. Nav **nie mrugnął**
   i nie zniknął. „Get in touch" jest na swoim miejscu.
3. **About → Home** — **loader NIE leci**, od razu reveal tekstów + scale
   unicorna. Liczba triggerów wraca do ~67, **nie rośnie**.
4. **Jeszcze dwa cykle tam i z powrotem** — licznik ma stać w miejscu. Jeśli
   rośnie, coś nie sprząta i trzeba znaleźć co.
5. **Frost na navie** — pigułki mają mrożone tło na obu stronach i po powrocie.
   To jest najbardziej podejrzany punkt całej paczki (patrz niżej).
6. **Styki motywu nava** — home: we-know / concept / join / insights / cta;
   about: purpose i track-record. Nav przełącza się na krawędzi sekcji.
7. **Key pillars, CTA, footer bottle reveal, Insights, Meet the team** — po
   POWROCIE na home wszystkie żyją (to były osobne listenery `load`).
8. **Smooth scroll** — „kisiel" działa na obu stronach. Strojenie: `lerp`
   w `smooth-lenis.js`.
9. **Resize** na obu stronach — bez dziur pod wideo, bez cofania choreografii.
10. **Placeholdery stopki** (`/about-us`, `/privacy-policy`) — kliknięcie ma dać
    zwykłe 404 serwera, **nie** zawieszenie pod zasłoną.

## Naprawione po pierwszym obejrzeniu (2026-07-28, zgłoszenie Tomka)

**(a) „Przeskok strony przy przeładowaniu".** `history.scrollRestoration = "manual"`
siedziało w `script.js`, czyli na dole `<body>`. Przeglądarka zdąża przywrócić stary
scroll i namalować klatkę, zanim dojdzie do skryptów końcowych — stąd widoczny skok.
Przeniesione do `<script>` w `<head>` obu stron. W `script.js`/`about.js` linia zostaje
jako fallback dla trybu standalone.

**(b) „Z about na home znowu leci loader".** To był `ctx.revert()`. Loader jest chowany
GSAP-em (`.to(autoAlpha:0)` + `.set(display:"none")`) **wewnątrz kontekstu strony**,
a `revert()` w `destroy()` cofa właśnie inline'y GSAP — więc wyjście z home go
**odchowywało**. Na about nie było tego widać, bo cały styl `.loader_component` siedzi
w `style.css`, odpiętym wtedy jako `data-page-css`; loader był tam nieostylowanym divem.
Po powrocie style wracały i loader znów zasłaniał ekran.
Naprawa: chowanie **klasą** `.is-done` (klasy nie są własnością GSAP, revert ich nie
rusza) + reguła w `<style>` w `<head>`, czyli w warstwie trwałej + flaga `PPB.loaderDone`.

> **Wzorzec do zapamiętania:** każdy element SITE-LEVEL animowany z kontekstu strony
> zostanie zrewertowany przy wyjściu z tej strony. Dotyczy to też **nava** — `buildHeroReveal()`
> zdejmuje mu `autoAlpha`, więc przy wyjściu wraca on do 0. Dziś to nie boli, bo każda
> strona odsłania nav we własnym intro, a wipe i tak zasłania moment przejścia. Ale jeśli
> kiedyś dołoży się stronę bez reveala nava — nav zniknie i to będzie ta sama przyczyna.

**(c) Poprawka (b) nie dojechała + biały prześwit na about — JEDNA przyczyna: cache.**
Nie podbiłem `?v=` na `script.js` i `nav-v2.js`, a `transition.js`/`insights.js`/
`meet-swiper.js`/`smooth-lenis.js` w ogóle go nie miały. Przeglądarka serwowała starą
`script.js`, więc fix (b) nie działał — a wtedy odchowany loader dawał **oba** objawy:
na about jest nieostylowanym blokiem **w normalnym flow** (bo `style.css` jest wtedy
odpięty), który spycha layout w dół → biały prześwit; na home `style.css` wraca i robi
z niego `position:fixed; inset:0; background:lab-white` → biały ekran wyglądający jak loader.

Naprawa trójwarstwowa:
1. Wszystkie lokalne pliki na wspólnym `?v=20260728-barba3`.
2. **`verify.js` ma teraz kontrolę cache-bustu** (sekcja 4b) — plik bez `?v=` albo
   rozjechane wersje = błąd. To pułapka 21 z `STATUS.md`, kosztowała już jedną iterację.
3. `.loader_component { position: fixed; inset: 0; z-index: 100 }` **w warstwie trwałej**
   (`<style>` w `<head>` obu stron) — loader nigdy nie bierze udziału w layoucie,
   niezależnie od tego, który arkusz jest wpięty.

**Diagnostyka.** `transition.js` loguje teraz hooki. Kluczowa linia:
`[ppb] once (pełne ładowanie dokumentu)` — jeśli widzisz ją **po kliknięciu w link**,
to Barba go nie przechwyciła i przeglądarka zrobiła pełne żądanie. Przy poprawnym
przejściu widzisz `leave → enter → triggery po wejściu: N`. Wyciszenie: `?debug=0`.

**Loader gra przy każdym świeżym dokumencie**, także przy twardym przeładowaniu
(decyzja Tomka) — pilnuje tego flaga `PPB.loaderDone` żyjąca w pamięci: przeżywa
nawigacje Barbą, ginie przy przeładowaniu. Świadomie BEZ `sessionStorage`.

**(d) Zasłona pod navem + biały błysk pod unicornem** (2026-07-28, propozycje Tomka).

**Nav już nie mruga.** Zasłona zeszła z `z-index: 99999` na **40** — pod nav (50).
Żeby to trzymało, kontener strony dostał `isolation: isolate; z-index: 0` (bez tego
sekcje Webflow z `z-index: 2000` i wskaźnik DEV na about z `9999` przebijałyby się
nad zasłonę). Drabinka: treść (0) < **zasłona (40)** < nav (50) < maska (51) <
menu mobilne (80/90) < loader (100).

Sama zmiana z-indeksu by nie wystarczyła — nav znikał z dwóch stron naraz:
`ctx.revert()` cofał jego reveal przy wyjściu, a wchodząca strona animowała go
od `autoAlpha: 0`. Teraz `destroy()` przywraca nav zaraz po revercie, a nav dołącza
do reveala **tylko przy świeżym dokumencie** (`IS_FIRST`), kiedy FOUC guard
faktycznie go chowa.

**Biały błysk to nie było tempo, tylko brak inicjalizacji.** Oficjalny snippet
Unicorn Studio skanuje `[data-us-project]` **raz, przy ładowaniu dokumentu**. Embed
wchodzącej strony to świeży DOM, którego nikt już nie oglądał → scena nigdy się nie
ładowała, a pod nią jest białe tło `body`. `transition.js` woła teraz `UnicornStudio.init()`
po podmianie kontenera i `destroy()` przy wyjściu (kontekstów WebGL przeglądarka daje
~16 na kartę — bez tego kilka przejść tam i z powrotem wysypałoby najstarsze sceny).

Zasłona schodzi dopiero, gdy jest **co** odsłonić: czekamy na pojawienie się `<canvas>`
w embedzie, nie na sztywne opóźnienie. Sztywne są tylko widełki — knoby na górze
`transition.js`: `HOLD_MS` 200 (minimum zieleni), `CANVAS_WAIT_MS` 1500 (sufit,
gdy CDN Unicorna padnie), `CANVAS_TAIL_MS` 120 (oddech na pierwszą klatkę).

**(e) Glitch nawigacji + „inne skalowanie na home" — UDOWODNIONE, nie zgadywane.**

`style.css` to arkusz **STRONY** (`data-page-css`), odpinany przy przejściu na about.
A siedziały w nim rzeczy **globalne**:

| reguła | home (style.css wpięty) | about (odpięty) |
|---|---|---|
| `html { font-size }` | drabinka fluid (`min(calc(…))`) | `styleguide.css` → **16px** |
| `--container-gutter` | `max(2rem, (100vw−86rem)/2)` | **niezdefiniowany** |
| `.nav_component { padding }` | z guttera | **brak reguły** |

Nav jest **site-level** (nie podmienia się) i cały jest w `rem`. Więc w połowie
przejścia zmieniał rozmiar i padding — na oczach użytkownika, odkąd zszedł spod
zasłony. To dokładnie „nawigacja robi jakiś glitch" i „na home inne skalowanie".

**Naprawa:** te reguły wyjechały z `style.css` do **`root-scale.css`**, linkowanego
**bez `data-page-css`** na obu stronach. Skala jest jedna dla całego serwisu.
`verify.js` sekcja **4d** pilnuje, żeby to nie wróciło: warstwa trwała musi być
identyczna na obu stronach, a `style.css` nie może ustawiać `html{}` ani nava.

> ⚠️ **DO OBEJRZENIA: about zmienia proporcje.** Był budowany przy sztywnym 16px,
> teraz dostaje drabinkę fluid. Przy **1440 to dokładnie 16 (bez zmian)**, ale
> szerzej rośnie (~19 @1889), węziej maleje. Innej drogi nie ma — dwa różne rooty
> i jeden wspólny nav wykluczają się nawzajem. To zresztą otwarta paczka #2
> ze `STATUS.md` („FLUID ROOT + sufit do `_shared`"), tylko zrobiona lokalnie.

**(f) Loader przy about → home: znaleziony mechanizm ciszy.**

Barba v2 (`i.page`) ma fallback: jeśli obietnica przejścia **zostanie odrzucona**,
woła `force(url)` → `window.location.assign()`, czyli **pełne przeładowanie**.
Błąd w naszym hooku nie objawiał się więc wyjątkiem w konsoli, tylko cichą twardą
nawigacją — a na home wygląda to jak zagranie loadera (`once`, `first: true`).
Trzy iteracje szukania wzięły się właśnie stąd: objaw był o dwa kroki dalej niż przyczyna.

Trzy rzeczy naraz:
1. **`safe()`** — każde wywołanie kodu strony (`init`/`destroy`) jest opakowane.
   Błąd leci **czerwono do konsoli** i jest połykany, więc przejście dochodzi do
   końca zamiast degradować się do przeładowania.
2. **Ostrzeżenie o niezłapanej nawigacji** — `once` sprawdza `navigation.type`
   i `document.referrer`. Jeśli przyszliśmy pełnym żądaniem z innej strony serwisu,
   konsola mówi to wprost (żółta ramka) zamiast zostawiać nas z samym objawem.
3. **Pas bezpieczeństwa na loaderze** — nawet gdy dojdzie do pełnego ładowania,
   loader NIE gra, jeśli referrer wskazuje inną stronę serwisu. Twarde
   przeładowanie tej samej strony (`navigation.type === "reload"`) gra normalnie.

**Jeśli loader nadal się pojawi** — w konsoli będzie teraz albo czerwony
`[ppb] BŁĄD w init strony „home"` z nazwą funkcji, albo żółte ostrzeżenie
o niezłapanej nawigacji. Jedno i drugie wskazuje palcem, zamiast kazać zgadywać.

## Znane ryzyka (kolejność = moje podejrzenia)

1. **Frost nava przy nawigacji.** `scheduleFrostKick` odpala się raz, przy
   pierwszym ładowaniu. Po powrocie na home warstwa `backdrop-filter` mogła
   zostać ubita przez swap DOM-u i nikt jej nie obudzi do pierwszego ustania
   scrolla (samoleczenie, ~700 ms). Jeśli frost wraca dopiero po scrollu —
   to jest to, i trzeba dołożyć kick w hooku `after` transition.js.
2. **Lenis + piny na home.** Home nigdy nie jechało na Lenisie —
   `home-part1/README.md` odnotowuje, że przy Lenisie piny wymagały
   `scrub: true` zamiast kisielu (double-scrub). Home ma scruby z kisielem
   (`scrubSmooth`). Jeśli scrub „pływa" albo się dubluje — to tutaj.
3. **`gsap.context()` scope'uje selektory-stringi do kontenera.** Wychwyciłem
   i naprawiłem `[data-reveal="ui"]` (nav jest poza kontenerem). Jeśli coś
   jeszcze zniknie na starcie — szukaj selektora-stringa celującego w element
   site-level.
4. **Pin-spacery po `ctx.revert()`.** GSAP powinien je zdjąć. Objaw, gdyby nie:
   rosnąca pusta przestrzeń na dole strony po kilku cyklach.
5. **`location.reload()` przy resize na about** — zostaje z prototypu
   (kontrakt na to pozwala), ale pod Barbą to twardy reload całej sesji.
   Do wycięcia, gdy about przestanie być prototypem.

## Dług

- `insights.js` to **kopia** `../home-insights/script.js`. Zmiana w kanonie
  wymaga przegenerowania (`outputs/make-insights.js`). Docelowo kanon powinien
  dostać kontrakt init/destroy i kopia znika.
- `nav-v2.js` i `key-pillars.js` też są kopiami — po akceptacji trzeba je
  zdiffować do `home-rwd-resize-1/` albo do kanonu `home-full/`.
- Warstwa mobile ≤991 nieruszana (jak w bazie).
