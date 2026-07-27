# Navbar — Navigation Links (2 warianty)

Prototyp navbaru z "gooey" kształtem tła. Kształt (pigułki + faliste łączniki) jest
**generowany w JS na podstawie realnych pozycji linków** — responsywny: dowolna
liczba itemów, dowolna długość tekstów, przerysowuje się po załadowaniu fontów
(`ResizeObserver` + `document.fonts.ready`).

## Źródła w Figmie (Polpharma Biologics - Webflow Starter, `eamVOAaNZDwHQKofLeV2Il`)

- Wariant **dark-bg** (na ciemnym tle): node `3885:3085`, Union `3885:3087`
- Wariant **light-bg** (na jasnym tle): node `4473:6892`, Union `4473:6894`

## Przełączanie wariantów

Klasa na `.nav_links-component`:

- `.is-dark-bg` — fill Mist `#E6EFEF` 7% + inner shadow (FFFFFF 15%, X −1.13,
  Y 1.13, blur 2.26) + background blur (Figma 30.39 → CSS `blur(15.1956px)`)
  + tekst Lab White
- `.is-light-bg` — fill Lab White 100% + stroke `#E5E5E5` 1px inside
  (SVG: stroke-width 2 + clip do kształtu), bez efektów, tekst Deep Green

Docelowo zmiana klasy w zależności od sekcji pod navbarem — do ustalenia
(prawdopodobnie ScrollTrigger + toggle klasy).

## Pliki

- `index.html` — obie wersje na demo-sekcjach (Deep Green / białej)
- `style.css` — tokeny, motywy (zmienne `--nav-*`), typografia `is-*` (subset)
- `script.js` — generator ścieżki; wiele instancji `.nav_menu` obsługiwane
- `fonts/` — **TODO: wrzucić SeasonSans-Regular + SeasonSans-Bold (woff2/otf)**;
  @font-face już czeka. Bez nich szerokości pigułek liczone z fallbacku
  (kształt i tak się dopasuje — generator mierzy realny tekst).

## Geometria (stałe w script.js, 1:1 z eksportu SVG z Figmy)

- Wysokość 42, promień końców 21, gap między itemami 10
- Fala łącznika: szerokość 52 (±26 od środka odstępu), siodło y=15/27 (pas 12px)
- Punkty kontrolne: W: 26 / 18.571 / 12.043 / 8.31 / 6.43 / 3.483,
  Y: 3.85831 / 9.68036 / 12.6126 / 15
- Wygenerowana ścieżka dla 544px = identyczna z eksportem Figmy (zweryfikowane)

## CTA

`btn - cta`: h 42, padding 10/22, radius 20, bg Red `#F55D5D`, tekst Bold 14,
Lab White — identyczny w obu wariantach.

## Dropdown "Company" (desktop, Figma 5051:3580)

Pierwszy link navu = **"Company"** (trigger, `.nav_link.is-drop`), rozwija w dół
dwie pigułki: **About us** + **What we do** (`.nav_dropdown-link`). Każda to
samodzielna pigułka (NIE gooey union): h42, padding 0/22, radius pełny, gap 10px,
wyrównane pod lewą krawędzią pigułki "Company".

- **dark-bg:** fill Mist 7% `rgba(230,239,239,.07)` + inner shadow
  (FFFFFF 15%, X −1.13 Y 1.13, blur 2.26) + `backdrop-filter: blur(15.196px)`
- **light-bg:** fill Lab White + stroke `#E5E5E5` 1px, bez blur/shadow
- Motyw dziedziczy z wariantu `.nav_links-component` (zmienne `--nav-drop-*`).

Struktura: trigger + panel opakowane w `<span class="nav_drop">` (flex item **bez
position**) → `.nav_link` mierzy offset względem `.nav_menu` (nav-shape.js działa
bez zmian), a `.nav_dropdown` pozycjonuje się absolutnie też względem `.nav_menu`.
`.nav_dropdown-link` NIE ma klasy `.nav_link` → generator union ich nie liczy.

## Mobile (≤991px, Figma closed 4473:6110 / open 4473:6772)

Desktopowy nav (`.nav_links-component`) + pływające "Get in touch" chowają się;
pokazuje się **hamburger** (czerwona pigułka 60×36, `.nav_hamburger`). Klik →
pełnoekranowy **overlay** `.nav-mobile` (Deep Green, z-80): logo + close (biała
pigułka z X), płaska lista 7 itemów z dekoracyjnymi łącznikami (górna+prawa
krawędź, róg TR, 20%), CTA "Get in touch" (czerwony, dół). Overlay jest
motyw-niezależny (zawsze Deep Green) → NIE potrzebuje maski.

Uwaga: "Company" na mobile jest **rozbite** na 2 osobne itemy (About us,
What we do) — na liście nie ma dropdownu.

## nav-menu.js (interakcje)

- Dropdown: hover (desktop) + klik (touch, `matchMedia('(hover:hover)')`),
  aria-expanded, Esc, klik poza. Stan `.is-open` synchronizowany na **oba**
  `.nav_drop` (base + kopia maski) → poprawne motywowanie nad jasną sekcją.
- Mobile: hamburger → overlay, close/Esc/klik-w-link, `resize`≥992 auto-close.
  Blokada scrolla: klasa `.nav-mobile-open` na html+body (`overflow:hidden`).
  ⚠️ Na stronach z Lenis dopisać `lenis.stop()/start()` — samo overflow nie
  zatrzyma smooth-scrolla.
- Ładowany PO `nav-shape.js`.

## Breakpoint

Hamburger/overlay: **≤991px** (Webflow tablet). Do zmiany na 767 jeśli tablet
ma mieć pełny nav — wtedy edytuj `@media` w `nav.css` (2 miejsca: 991/992).

## Lab / test

`_code/nav-lab/index.html` — dark hero + jasna sekcja, oba warianty dropdownu
i mobile menu. Otwórz w przeglądarce (file://) żeby zweryfikować wzrokowo.

## Port do Webflow

Struktura HTML → Designer (klasy jak w prototypie), `script.js` → custom code
(per konwencja projektu: repo → CDN). Filtr `#navInnerShadow` musi być raz
w DOM strony (embed z ukrytym `<svg>`).

## PRZENOSINY DO WEBFLOW (przygotowanie, 2026-07-26)

### Czy osobny `.nav-mobile` (fullscreen overlay) jest potrzebny?

Tak — projekt mobilny (Figma 4473:6772) to pełnoekranowe menu na Deep Green,
nie rozwijany dropdown, więc osobna warstwa musi istnieć. ALE buduje się ją
w Webflow **natywnie jako zwykły div-block** (fixed, inset 0, z-80) — bez
Navbar-widgetu Webflow. Widget odpada w ogóle: gooey kształt, system maski
i theming klasami nie mapują się na jego wbudowane zachowania.

### Struktura po MOBILE v2 (uproszczona pod Webflow)

- **Jeden przycisk** `.nav_hamburger` (60×36, czerwona pigułka, 3 linie) robi
  open i close. Przy otwarciu overlay'a bazowy `.nav_component` wjeżdża NAD
  overlay (`html.nav-mobile-open` → z-90) i służy za pasek (logo + przycisk),
  a linie morfują w X czystym CSS-em (stan = `[aria-expanded="true"]`).
- **`.nav-mobile_bar` (logo + osobny close wewnątrz overlaya) jest ZBĘDNY** —
  w prototypie ukryty CSS-em (markup został dla zgodności ze starymi stronami);
  w Webflow po prostu go NIE budować. Zostaje: overlay → lista linków → CTA.
- Overlay ma `overflow-y: auto` — na niskich ekranach lista + CTA się scrollują.

### Mapowanie 1:1

| Prototyp                          | Webflow                                        |
|-----------------------------------|------------------------------------------------|
| markup nava (nav.html)            | natywne div-blocki + combo klasy (`is-dark-bg`/`is-light-bg`) |
| `.nav-mobile` overlay             | div-block fixed + combo `.is-open`             |
| svg-defs `#navInnerShadow`        | Embed (raz, na początku body)                  |
| `nav.css`                         | style w Designerze LUB Head CSS (fluid rem MUSI być w Head) |
| `nav-shape.js`, `nav-menu.js`, `nav-mask.js` | Embed/Scripts przed `</body>` (zero zależności, vanilla) |
| `.nav_menu-bg` + `.nav_menu-blur` | puste divy z klasami — resztę robi JS          |

### Twarde zasady (nie łamać przy porcie)

1. Breakpoint 991px = tablet Webflow — zgodny z `@media` w nav.css.
2. **Fluid rem**: formuła root font-size (home-full/style.css §FLUID ROOT)
   musi trafić do Head CSS strony; generator kształtu liczy clip w realnych
   px z wysokości pigułki (`hReal/42`) — działa z dowolną skalą rema.
3. Klasy stanów są API komponentu: `.is-open`, `.is-nav-covered`,
   `html.nav-mobile-open`, `[aria-expanded]` — interakcje NIE przez
   Webflow Interactions, tylko przez dołączony `nav-menu.js` (IX2 nie
   toggluje dowolnych klas; mieszanie dwóch systemów = konflikty).
4. Kolejność skryptów: gsap → ScrollTrigger → nav-shape → nav-menu → nav-mask.
5. Frost: fill 12% to baza czytelności, blur = enhancement (patrz nav-menu.js
   rebuildBackdrop). Nie wracać do 7% + sam blur.
