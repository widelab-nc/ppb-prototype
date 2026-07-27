# Site footer — notatki komponentu

> Globalny footer serwisu. Żyje w `_shared/`, bo idzie na **wszystkie strony**.
> ⚠️ Nie mylić z `_code/footer/` — tam jest sekcja **butelka → taśma** z dołu
> homepage (namespace `home-footer_*`). To są dwie różne rzeczy.

**Figma:** desktop `4572:7327` (1440×799) · mobile `4677:8902` (375×971),
file „Polpharma Biologics - Webflow Starter" (`eamVOAaNZDwHQKofLeV2Il`).

## Pliki

| Plik | Co to |
|---|---|
| `site-footer.html` | partial — blok `<footer class="section is-site-footer">` do wklejenia na końcu strony |
| `site-footer.css` | custom namespace `site-footer_*` + combo `.is-site-footer` |
| `site-footer.js` | `initSiteFooter()` — kaskada reveala, otwieranie „nawiasów", rozjazd kształtów |
| `index.html` | standalone podgląd (spacer 120vh + footer). Otwórz przez Live Server |

## Podpięcie

```html
<link rel="stylesheet" href="../styleguide.css" />
<link rel="stylesheet" href="site-footer.css" />
...
<script src="…gsap.min.js"></script>
<script src="…ScrollTrigger.min.js"></script>
<script src="…SplitText.min.js"></script>
<script src="../gsap-config.js"></script>
<script src="../reveal.js"></script>
<script src="site-footer.js"></script>
<script>initSiteFooter(); ScrollTrigger.refresh();</script>
```

Barba: `initSiteFooter()` w `afterEnter`; zwracany obiekt ma `destroy()`
(re-init sam zabija poprzednie triggery, więc `destroy()` jest opcjonalny).

**Wpięte w `home-full/`** (backupy: `index.html.bak-sitefooter`, `script.js.bak-sitefooter`):
link CSS + `<script>` w grupie `_shared`, blok `<footer>` zaraz po `</main>` (przed
overlayem `feature-shape_component`), `if (window.initSiteFooter) initSiteFooter();`
w masterze po `initWeKnow()`. Guard celowo — bez niego literówka w ścieżce wywaliłaby
CAŁY master (loader, hero, we-know), nie tylko footer.

ℹ️ `home-full/` linkuje **bezpośrednio** do `../_shared/site-footer/*` — zmiana w CSS/JS
tutaj działa na home od razu, bez kopiowania. Jedyna kopia to blok HTML (wklejony
w `index.html` home-full), więc **zmiana markupu wymaga ręcznego przeniesienia.**
⚠️ `home-full-live/` ma WŁASNĄ kopię `_shared/` — tam trzeba przegrać osobno.

## Zgodność ze style guide

- Typografia **wyłącznie** z tokenów Figmy → klasy systemowe:
  - „Headquaters" i linki nawigacji = `Title Small` → **`is-t-s`**
  - adres, legal, copyright = `Body Medium` → **`is-b-m`** + `is-text-o50`
- Kolory: `--deep-green` (tło), `--lab-white` (tekst), `is-text-o50` na 50%.
  Zero nowych klas typo/koloru.
- Jednostki `rem` (px/16). W px zostają tylko: `border 1px`, `border-radius` (10/8).
- Struktura: `section → container → component`, klasy systemowe przed custom.
- `@media` tylko na **zmianę layoutu** (≤991: dwie kolumny → jedna), nie na wymiary
  — skalowanie robi fluid root font-size.

### ⚠️ Rozbieżność w Figmie (do sprawdzenia po Waszej stronie)
Na węźle **desktop** body-text ma token `Body Medium (Emphasis)` (= Bold 700),
na **mobile** ten sam tekst ma `Body Medium` (400) — a „Privacy policy" jako jedyny
element w kolumnie ma tam Bold. To wygląda na przeklik w Figmie (bez plików
Season Sans 400/700 oba renderują się identycznie). **Zbudowane na `is-b-m` (400)**,
zgodnie z wersją mobile. Jeśli ma być Bold — dorzuć `is-emphasis` obok `is-b-m`.

## Animacje

Wszystko jedzie na wspólnym systemie #1 (`../reveal.js`). Strojenie efektu
(easing / duration / stagger / punkt startu) = **`../gsap-config.js` → `PPB.config.reveal`**,
nie w tym pliku. Lokalny `CONFIG` w `site-footer.js` trzyma tylko rzeczy własne footera.

1. **Tekst** — jedna kaskada ze staggerem: HQ → nawias górny → linki → legal →
   nawias dolny → copyright. Offsety: `CONFIG.seq`. Start: globalny `PPB.config.reveal.start`
   („top 75%").
   Markup ma **nazwany** `data-reveal="site-footer"` → `initReveals()` go pomija
   (atrybut zostaje jako FOUC guard), choreografię prowadzi `site-footer.js`.
   Bidirectional jak w kanonie: reset dopiero na `hideStart` (`top bottom`).

2. **„Nawiasy"** (Rectangle 34627839 / 34627888) — `scaleX 0 → 1`,
   `transform-origin: left` → rosną z lewej do prawej. `CONFIG.rule`.

3. **Kształty — STICKY.** `.site-footer_shapes` ma `position: sticky; bottom: 2rem`
   (pozycja spoczynkowa `align-self: end` = dół kolumny, 1:1 z Figmą). Dopóki dół
   komponentu jest poniżej ekranu, kształty są podciągane do 2rem nad krawędzią
   viewportu — czyli **widać je od góry footera i stoją w miejscu**, gdy footer wjeżdża;
   lądują dokładnie w miejscu z Figmy, bo `bottom` = `padding-bottom` sekcji.
   Na mobile sticky wyłączone (`position: relative`) — tam kształty są w normalnym
   flow pod treścią, zgodnie z Figmą.
   ⚠️ **`.is-site-footer` ma `overflow: clip`, NIE `hidden`.** `clip` nie tworzy
   scroll-containera, więc sticky działa względem viewportu. Zamiana na `hidden`
   (odruch przy „coś wystaje") **zabije sticky** — kształty przestaną się trzymać.
   ℹ️ Fizyczny limit: kształty mają 220 px + 2rem offsetu, więc pełna widoczność
   dopiero gdy ~252 px footera jest na ekranie (częściowa — po ~140 px). Wcześniej
   się nie da, dopóki żyją wewnątrz `<footer>`.

4. **Rozjazd kształtów** — na scrub rozjeżdżają się ze stanu **koncentrycznego**
   (nałożone na siebie) do docelowego (obok siebie).
   **Lewy kształt STOI** (trzyma się krawędzi kontenera), animuje się **tylko prawy**
   — startuje nałożony na lewy i jedzie w prawo. Który jest który wynika z POMIARU,
   nie ze sztywnego przypisania, bo na mobile `order` odwraca kolejność
   (desktop: stoi kwadrat, jedzie koło · mobile: stoi koło, jedzie kwadrat).
   Zakres: `top bottom-=10rem` → `bottom bottom` (`CONFIG.shapes`).
   `startOffsetRem` przeliczany po computed root font-size, więc działa też
   z fluid rem. **Znak:** dodatni = start PÓŹNIEJ (footer musi wjechać o tyle
   w ekran), ujemny = start WCZEŚNIEJ, zanim footer się pokaże.
   ⚠️ Pomiar dystansu idzie przez `getBoundingClientRect` przy wyzerowanych
   transformach — kwadrat jest `<svg>`, a **SVGElement nie ma `offsetLeft`/`offsetWidth`**
   (na tym się przejechałem: `delta` wychodziła `NaN` i animacja po prostu nie ruszała).

`prefers-reduced-motion` → wszystko ląduje od razu w stanie końcowym.

> ℹ️ **Parallax kolumny treści (wzorzec z wearemotto.com) był zbudowany i USUNIĘTY**
> (decyzja Tomka 2026-07-26). Razem z nim poszedł panel suwaków `tune-panel.js`.
> Pomiary, wzór i pułapki tamtego rozwiązania zostały w `CHANGELOG.md` — gdyby
> ktoś chciał do tego wrócić, nie trzeba tego robić drugi raz od zera.

## 🔴 refreshPriority: -1 — NIE USUWAĆ (i zasada dla nowych sekcji)

Wszystkie triggery footera mają `refreshPriority: -1`. Bez tego **animacje
odgrywają się w całości poniżej ekranu** i użytkownik dojeżdża do gotowego,
„martwego" footera.

Mechanizm: ScrollTrigger odświeża triggery w kolejności `refreshPriority`, a przy
równym priorytecie — w kolejności tworzenia. `initSiteFooter()` jest wołany w masterze
w `home-full/script.js`, natomiast pin `key-pillars` powstaje w **osobnym
load-listenerze** (`key-pillars.js`, ładowany po `script.js`) — czyli PÓŹNIEJ.
Przy refreshu footer mierzy się, zanim ten pin doda swoje pin-spacery, więc jego
`start` wypada za wcześnie o **dokładnie dystans pinu**.

Zmierzone na home (1440×900): `start` reveala **24995** zamiast **28595** → 3600 px
za wcześnie, co jest równe `dist` pinu `is-home-key-pillars` (8805→12405). Pin
`is-home-how-it-works` (4050) był policzony poprawnie, bo `initHowItWorks()` leci
w tym samym masterze PRZED footerem. Po dodaniu `refreshPriority: -1` — `start`
28595, czyli co do piksela tam, gdzie ma być.
⚠️ Ręczny `ScrollTrigger.refresh()` tego NIE naprawiał — bez priorytetu footer i tak
mierzy się przed pinem.

**Zasada ogólna dla projektu:** każda sekcja, która leży na stronie POD sekcjami
pinowanymi, a jej trigger powstaje w innym pliku/listenerze niż te piny, potrzebuje
ujemnego `refreshPriority`. Alternatywa (gorsza, bo zależy od kolejności `<script>`):
wołać init po wszystkich pinach.

## 🐛 Pułapka, o którą się potknąłem (dotyczy CAŁEGO projektu)

`revealText()` ustawia **inline `autoAlpha: 1`**, czyli `opacity: 1` na elemencie.
Jeżeli ten sam element ma `is-text-o50` (albo własne `opacity`), po revealu
**przezroczystość znika**. Dlatego tutaj `is-text-o50` siedzi zawsze na **rodzicu**
(`<address>`, `<li>`, `.site-footer_meta`), a `data-reveal` na dziecku.

⚠️ Ten sam błąd jest w `how-it-works/style.css` →
`.home-concept_subheading { opacity: .9 }` z `data-reveal="concept"` na tym samym
elemencie. Do sprawdzenia przy review.

## 🔴 Odstępstwa od Figmy — do zaakceptowania albo zniesienia

1. **Przerwa między kształtami = `1rem`** (decyzja Tomka, 2026-07-26).
   W Figmie kształty **nachodzą na siebie** (kwadrat 32–252, koło 148–358 → −104px).
   Zmiana: `gap` w `.site-footer_shapes`.
2. **Wypełnienie/obrys kształtów oszacowane z renderu** — MCP nie zwraca fillów
   boolean-op (ten sam problem co przy Insights, patrz `STATUS.md`).
   Teraz `fill .10 / stroke .22` (zmienne `--sf-shape-fill` / `--sf-shape-stroke`).
   Kanon z `home-concept` („From concept…") to `fill .05 / stroke .22` — jeśli
   kształty mają być identyczne w całym serwisie, zejdź na tamte wartości.
3. **Poziomy padding na mobile: 16px (kanon), w Figmie 20px.** Kanon projektu to
   32/24/16 — trzymam kanon. Do decyzji.
4. **Dolny padding: 2rem (32) na obu breakpointach**, w Figmie mobile ma 20.
5. **Hover linków nie ma w Figmie** — dodany minimalny (`site-footer_link:hover`
   → `--light-green`, legal → opacity 1). Do zatwierdzenia albo wycięcia.
6. **Promień „nawiasów" 10px / 8px** — zmierzone z Figmy, nie z tokenu
   (kolekcja „Layout and spacing" wciąż pusta).
7. **Sticky kształtów** — w Figmie tego nie ma, to decyzja Tomka (2026-07-26).

## Port do Webflow

- Footer jako **komponent** (jedno źródło, instancje na stronach) — patrz
  `style-guide.md` §„Zasady budowania" pkt 3.
- `site-footer.js` → `/core/site-footer.js` w repo `widelab-nc/ppb-wf-code`,
  dopisany do `snippets/site-footer.html` (Site settings → Footer code) **po**
  `reveal.js`, plus wywołanie `initSiteFooter()`.
  ⚠️ To samo ryzyko `refreshPriority` co na prototypie — jeśli footer pójdzie jako
  osobny plik ładowany po `pages/home.js`, objaw wróci 1:1.
- Kształty: `<svg>` inline w Embedzie (nie obrazek — kolory jadą z CSS vars).
- Linki nawigacji mają placeholderowe `href` (`/about-us`, `/what-we-do`,
  `/partnerships`, `/insights`, `/careers`) — podmienić na realne strony.
  „Cookie center" ma `href="#"` — podpiąć pod cookie banner.

## Zweryfikowane (Chromium 1440 / 1920 / 375, 2026-07-26)

Geometria vs Figma (desktop 1440, offsety od góry footera):
kolumna treści `x729 y60 679×707` · HQ `279×107` · nawias górny `y199 h20` ·
nawigacja `y251 332×180` (Figma 178) · copyright `y744` (Figma 745) ·
kwadrat `x32 y547 220` (Figma 32/548/220) · koło `y552 210` (Figma 553/210,36).
Odchyłki ≤2px = zaokrąglenia line-height.

Integracja z fluid rem z `home-full/style.css`: 1440 → root 16.00 / footer 799 ·
1920 → root 19.21 / footer 959 / kształty na `--container-gutter` 134 ·
375 → root 14.00. Zero overflow-x, zero błędów w konsoli.

Po usunięciu parallaxu (standalone i home-full, 1440×900): `translateY` kolumny
stale **0** · kształty `position: sticky`, lądują **32 px** nad krawędzią ·
lewy stale na **x32** · rozjazd 0 → 87 → **231** · reveal i nawiasy odpalają.
Mobile 375: kształty `relative`, lewy na x16, rozjazd 0 → **176**. Zero błędów.
