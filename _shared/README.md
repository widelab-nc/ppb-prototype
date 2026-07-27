# `_shared` — warstwa globalna prototypów (Polpharma Biologics)

> **Czytaj na starcie KAŻDEGO nowego czatu/sekcji.** Wszystko co wspólne żyje TU
> — prototypy sekcji/stron trzymają wyłącznie swoje: HTML bloku, custom CSS
> (namespace `[strona]-[sekcja]_*`), choreografię JS (`init[Sekcja]()`).
> Niczego stąd nie kopiuj do folderu sekcji i niczego nie redefiniuj.

## Pliki

| Plik | Co to | Odpowiednik w Webflow |
|---|---|---|
| `styleguide.css` | typografia `is-*`, kolory, `.section/.container`, FOUC guard, `.rv-*` | już istnieje (klasy + Variables) — przy porcie NIE przenosisz |
| `fonts/` | Concrette M Regular + Season Sans Medium (⚠️ brak: Season Sans 400/700) | Site settings → fonty |
| `gsap-config.js` | rejestracja pluginów, `PPB.config` (easingi, `reveal`, `scrubSmooth`) | `/core/gsap-config.js` |
| `reveal.js` | system #1: `revealText/hideText/revealOnScroll/ensureLines` + `initReveals()` (deklaratywnie po `data-reveal`/`data-reveal="load"`; gołe `data-reveal` = **bidirectional default**) | `/core/reveal.js` |
| `highlight.js` | **system #4: SCROLL HIGHLIGHT** — tekst doświetlany scrollem (`initHighlights` deklaratywnie po `data-highlight`; `highlightOnScroll` dla choreografii). Stan początkowy `.hl-unit` w `styleguide.css`, feeling w `gsap-config.js` → `highlight` | `/core/highlight.js` |
| `swap.js` | system #3: swap-in-place (`createSwap/progressToIndex/initSwaps`) — tekst stoi, treść podmienia się na scroll (staty) | `/core/swap.js` |
| `nav/nav.html` | partial: bazowy nav (dark) + maska z kopią (light) + Get in touch | komponent + embed |
| `nav/nav.css` | style navbara, maski, CTA (`--nav-*`) | klasy w Designerze |
| `nav/nav-shape.js` | generator gooey kształtu (multi-instance) | `/core` |
| `nav/nav-mask.js` | system #2: `initNavMask()` — sekcje jasne oznaczasz `data-nav-theme="light"` | `/core` |
| `smooth/` | Lenis (`smooth-lenis.js`) + Barba harness (`transition.js`) + **BARBA-READY-CONTRACT.md (obowiązkowa lektura)** | `/core` |
| `site-footer/` | **globalny footer serwisu** — partial `site-footer.html`, `site-footer.css`, `site-footer.js` (`initSiteFooter()`), standalone `index.html` + COMPONENT-NOTES.md. ⚠️ NIE mylić z `_code/footer/` (butelka→taśma, `home-footer_*`) | komponent + `/core/site-footer.js` |
| `video-scrub.js` | `createVideoScrub()` — jeden wzorzec wideo-na-scroll (enkodowanie `-g 1`!) | `/core` |
| `debug-labels.css` + `debug-labels.js` | **DEV** — nazwa elementu w jego lewym-dolnym rogu (opt-in `data-label="…"`) + toggle w prawym-dolnym rogu ekranu (pokazuje/chowa). NIE do produkcji. | — (tylko prototypy) |

## Szablon podpięcia w prototypie strony/sekcji

```html
<head>
  <link rel="preload" href="../_shared/fonts/ConcretteM-Regular.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="../_shared/fonts/SeasonSans-Medium.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="../_shared/styleguide.css" />
  <link rel="stylesheet" href="../_shared/nav/nav.css" />
  <link rel="stylesheet" href="style.css" />   <!-- TYLKO custom sekcji/strony -->
</head>
<body>
  <!-- partial z _shared/nav/nav.html (svg-defs + nav + maska + Get in touch) -->
  ...sekcje...
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script>
  <script src="../_shared/gsap-config.js"></script>
  <script src="../_shared/reveal.js"></script>
  <script src="../_shared/swap.js"></script>          <!-- swap-in-place (po reveal.js) -->
  <script src="../_shared/nav/nav-shape.js"></script>
  <script src="../_shared/nav/nav-mask.js"></script>
  <script src="script.js"></script>              <!-- TYLKO choreografia strony -->
</body>
```

## Zasady (skrót kontraktu sekcji — pełny: restructure-plan.md §6)

1. HTML sekcji = jeden blok `<section class="section is-[strona]-[sekcja]">`,
   z zewnątrz tylko klasy `is-*`/`.container` + data-atrybuty.
2. CSS sekcji = tylko własny namespace. Zero redefinicji `is-*`/@font-face/resetu.
3. JS = jedna funkcja `init[Sekcja]()`, selektory scope'owane, Barba-ready
   (patrz `smooth/BARBA-READY-CONTRACT.md`).
4. Reveale: `data-reveal` (in-view) / `data-reveal="load"` — deklaratywnie przez
   `initReveals()`; nazwane wartości (`"ui"`, `"our-goal"`…) = manualna choreografia.
   Default trigger: `top 75%` (w `PPB.config.reveal.start`).
5. Jasne sekcje: `data-nav-theme="light"` → maska nav działa sama po `initNavMask()`.
6. Strojenie efektu reveal / easingów / kisielu = TYLKO `gsap-config.js`.

## Reveal & swap — zasady globalne (2026-07-22)

> Trzy zachowania tekstu na scroll = trzy proste reguły. Efekt wjazdu/wyjazdu
> i jego strojenie są WSPÓLNE (`PPB.config.reveal` w `gsap-config.js`).
> Chcesz zmienić feeling globalnie (szybciej, inny easing, rytm wyjazdu)?
> **Tylko `gsap-config.js` → blok `reveal`.** Zmiana leci na całą stronę i wszystkie strony.

**1. Pojedyncza interakcja (in-view, „Pure play")** — tekst pojawia się linia-po-linii
przy wejściu (`start` = „top 75%"). **Chowanie jest niewidoczne:** reset odpala się
DOPIERO gdy tekst cały zniknie z ekranu przy scrollu w górę (marker `hideStart` =
„top bottom" — górna krawędź na dole viewportu), więc użytkownik nigdy nie widzi
animacji chowania; przy ponownym zjeździe w dół tekst **wjeżdża od nowa**.
(Decyzja Tomka 2026-07-22. Mechanizm: dwa ScrollTriggery w `revealOnScroll` —
reveal na `start`, hide na `hideStart` przez `onLeaveBack`.)
```html
<h2 class="is-h-m ..." data-reveal>We know</h2>
```
Nic więcej — strona musi tylko wołać `initReveals(scope)`. `data-reveal` jest
**domyślnie dwukierunkowy**. Ma odpalić RAZ i zostać? → `data-reveal-once`.
Inny punkt startu? → `data-reveal-start="top 60%"`. Punkt chowania (globalnie) →
`gsap-config.js` → `reveal.hideStart`.
⚠️ Nazwane `data-reveal="cośtam"` (`"ui"`, `"hiw-text"`…) = ręczna choreografia
strony (`revealText/hideText` w `script.js`), `initReveals` je POMIJA.

**2. Wjazd rytmem / wyjazd naraz** — to nie osobny tryb, tylko konfiguracja #1.
Wjazd = stagger per linia (`reveal.stagger`), wyjazd = jednolity (`reveal.hide.stagger = 0`,
ustawione globalnie). To jest feeling „We produce impact".

**3. Swap-in-place (tekst stoi, treść się podmienia — staty)** → `swap.js`.
Slot trzyma N stanów w tej samej pozycji (stackowanie = **CSS sekcji**, np. `position:absolute`);
każdy stan wchodzi `revealText` / wychodzi `hideText` (ten sam wspólny efekt).
- **Pinned / scrub-driven** (jak staty How-it-works) — w `script.js` sekcji:
  ```js
  const sw = createSwap({
    states: [ {el: set1, targets: set1.querySelectorAll('.stat-label,.stat-value')},
              {el: set2, targets: set2.querySelectorAll('...')} ],
    start: -1,                        // -1 = nic na starcie
  });
  // w handlerze progresu pinu:
  sw.fromProgress(pc, [0.35, 0.72], /*emptyBelow*/ true);  // <0.35 nic, ≥0.35 set1, ≥0.72 set2
  ```
  Bespoke ozdoby stanu (rosnąca linia statów) → hooki `onEnter(el)/onLeave(el)` per stan.
- **Prosty, niepinowany** → deklaratywnie:
  ```html
  <div data-swap data-swap-empty-below>
    <div data-swap-state data-swap-at="0.30"> …stan A… </div>
    <div data-swap-state data-swap-at="0.65"> …stan B… </div>
  </div>
  ```
  + `initSwaps(scope)`. Progi = `data-swap-at` (0..1 progresu grupy) albo równy podział.

**Kierunek swapu (ważne):** `swap.js` domyślnie chowa stan **DO GÓRY** (`hideOpts.sign = -1`),
a nowy wchodzi Z DOŁU → stary i nowy są po PRZECIWNYCH stronach maski linii = **zero nakładania**
(stary znika górą, nowy pojawia się dołem). Bez tego (domyślny `hideText` w dół) oba lądują w
dolnej połowie i widać dwa teksty naraz. Override per swap: `hideOpts: { sign: 1 }`.

**„Użyj tych zasad tam"** = w nowej sekcji dopisz `data-reveal` (pojedyncze) lub
`data-swap` (swap) i wywołaj `initReveals()/initSwaps()`. Zero kopiowania efektu —
wszystko ciągnie z `_shared`.

⚠️ **Staty home NIE są jeszcze przepięte na `swap.js`** — działają na własnej maszynie
stanów w `home/script.js` (zaakceptowany pinned flow). Migracja = osobny krok z reviewem
wizualnym (moduł odtwarza tę logikę 1:1, potwierdzone testem, ale scrub warto obejrzeć na żywo).

## SYSTEM #4 — HIGHLIGHT: tekst doświetlany scrollem (2026-07-27)

> **„Dodaj mi tu ten efekt highlightu"** = dopisz `data-highlight` na elemencie
> i zawołaj `initHighlights(scope)`. Nic więcej. Implementacja i feeling są
> wspólne — zero kopiowania efektu między sekcjami.

**Co to jest.** Tekst **stoi w miejscu** i jest przygaszony (`opacity 0.22`),
a scroll go **doświetla** — słowo po słowie (albo litera po literze) aż do
pełnej intensywności. Sterowane bezpośrednio pozycją scrolla (`scrub: true`,
BEZ kisielu — highlight ma być 1:1 z palcem/kółkiem, inaczej „pływa").

**Czym się różni od systemu #1 (line-reveal).** To są dwie różne rzeczy i mogą
działać na tym samym elemencie:

| | #1 `data-reveal` | #4 `data-highlight` |
|---|---|---|
| co robi | tekst **wjeżdża** spod maski | tekst **już jest**, zmienia intensywność |
| jednostka | linia | słowo albo litera |
| napęd | jednorazowa animacja z easingiem | `scrub` — pozycja scrolla |
| kiedy | wejście elementu w kadr | przez zadany odcinek scrolla |

**Użycie deklaratywne** (99% przypadków):

```html
<h3 class="is-t-l is-text-deep-green" data-highlight>Our efficient operating model…</h3>
```

```html
<script src="../_shared/highlight.js"></script>   <!-- po gsap-config.js -->
```
```js
initHighlights(scope);   // w script.js strony
```

Warianty i modyfikatory:

- `data-highlight` / `data-highlight="word"` — słowo po słowie (domyślne)
- `data-highlight="char"` — litera po literze (gęstsze, „ciekłe" przejście;
  to jest feeling akapitu „that most…" z We-know na home)
- `data-highlight-start="top 70%"` — nadpisanie startu (default z configu)
- `data-highlight-end="top 30%"` — nadpisanie końca (default z configu)

**Użycie programowe** — gdy odcinek scrolla musi być policzony (sekcje z pinem
/ sticky, gdzie procentowy `end` nie ma sensu, bo element przestaje się ruszać):

```js
highlightOnScroll(el, {
  trigger: wrapper,                                   // element w normalnym flow
  start: "top 82%",
  end: function () { return "+=" + (toStick() + holdIn()); },  // px, liczone na żywo
});
```

**Strojenie — TYLKO `gsap-config.js` → blok `highlight`.** Zmiana leci na całą
stronę i wszystkie strony:

```js
highlight: {
  unit: "word",       // "word" | "char"
  from: 0.22,         // opacity bazy (przygaszenie)
  start: "top 82%",   // domyślny start deklaratywny
  end: "top 35%",     // domyślny koniec deklaratywny
  ease: "none",       // liniowo — highlight ma być 1:1 ze scrollem
  stagger: 1,         // rytm jednostek wewnątrz scruba
}
```

⚠️ `from` MUSI być zgodne z `.hl-unit { opacity }` w `styleguide.css` — CSS
trzyma stan początkowy, żeby nie było FOUC przed startem JS-a.

⚠️ Podział NISZCZY zagnieżdżone spany w treści (bierzemy czysty `textContent`).
Tekst z `<span>`/`<a>` w środku → nie ten system.

**Gdzie już działa:** `track-record/` (nagłówek „Our efficient operating model…",
z własnym `end`, bo sekcja jest sticky).
**Kandydat do migracji:** akapit „that most…" w `home-full` (We-know) robi
dokładnie to samo, ale na własnej maszynce w `script.js` i przez `color`
zamiast `opacity` — do przepięcia przy najbliższym dotknięciu tej sekcji.

## Uwagi

- **Lenis NIE jest jeszcze wpięty w prototypy** (leży tu gotowy) — wpięcie na
  osobną decyzję/review, bo zmienia feeling wszystkich scrubów.
- Maska nav: obsługuje PIERWSZĄ sekcję `data-nav-theme="light"` na stronie
  (semantyka 1:1 z home). Generalizacja na wiele naprzemiennych sekcji —
  przy przepinaniu about.
- Zmiana czegokolwiek tutaj = zmiana na WSZYSTKICH stronach. Przy większych
  zmianach: test na home + wpis w animations-spec.md.

## DEBUG LABELS (dev, zasada globalna)

Podgląd nazw elementów na stronie — do wygodnego opisywania „co jest czym".

**Użycie (3 kroki):**
1. Wepnij w `<head>`: `<link rel="stylesheet" href="../_shared/debug-labels.css">`
   i przed `</body>`: `<script src="../_shared/debug-labels.js"></script>`.
2. Na elementach, które chcesz nazwać, dodaj `data-label="nazwa"`.
3. Gotowe — nazwa pojawia się w LEWYM DOLNYM rogu elementu; **toggle** (prawy
   dolny róg ekranu) pokazuje/chowa wszystkie. Stan pamiętany (localStorage).

**Zasady:** opt-in (bez `data-label` = zero efektu); plakietka = dziecko elementu
(jedzie 1:1 z transformami/pinami); `pointer-events:none` + `aria-hidden` (nie
rusza layoutu/JS); auto-init po DOMContentLoaded (można też `initDebugLabels(scope)`).
⚠️ NIE trafia do produkcji/Webflow — tylko prototypy. Element nachodzący z wyższym
z-index może zasłonić plakietkę (akceptowalne dla debugu).
