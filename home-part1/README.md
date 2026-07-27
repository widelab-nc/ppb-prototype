# home-part1 — hero + pinned flow + apla (2026-07-26)

> Kopia `home-mobile/` **ucięta na wjeździe `.home-key-pillars-block`**. Kanon z całą stroną
> zostaje w `home-full/`, pełny prototyp mobile w `home-mobile/` — oba nietknięte.
>
> Uruchomienie: serwer statyczny z poziomu `_code/` (ścieżki `../_shared/` muszą działać),
> np. `python3 -m http.server` → `/home-part1/`.

## Stan — 2026-07-27

**To jest jedyny aktualny folder tego prototypu.** `home-part1-cap/` był tymczasową kopią
do oceny sufitu — sufit wszedł tutaj, kopia poszła do `_to_delete/`.

| # | rzecz | stan |
|---|---|---|
| 1 | We-know przypięty do kontenera, nie do krawędzi ekranu | ✅ zrobione |
| 2 | Nawiasy `[ ]` w tym samym wrapperze co tekst | ✅ zrobione |
| 3 | We-know `-15vh` poniżej 740 przy ≥992 | ❌ **niepotrzebne** — sufit to załatwił (pomiar niżej) |
| 4 | Sufit od wysokości | ✅ zrobione |
| 5 | Treść statsów („8" vs „2", literówka „worwide") | ⏳ czeka na Tomka |
| 6 | Hamburger w kopii maski nava | ✅ lokalnie · ⚠️ kanon `_shared/nav/nav.html` nadal bez |
| 7 | Przeliczanie animacji przy resize okna | ⏳ nieruszone — patrz „Dług" |

### Pomiar po zmianach (8 viewportów, 0 `pageerror`)

| viewport | rem | luz tekst↔diament | tekst We-know vs kontener | dziura kształt↔tekst |
|---|---|---|---|---|
| 1440×800 | 16 | +81 | **równo** | 418 |
| 1920×1080 | 19,2 | +214 | **równo** | 502 |
| 1920×800 | 16 | +80 | **równo** | 418 |
| 2300×830 | 16,6 | +83 | **równo** | 433 |
| 2560×900 | 18 | +90 | **równo** | 470 |
| 1440×740 | 14,8 | +74 | **równo** | 386 |
| 1440×660 | 13,2 | +66 | **równo** | 345 |

Wcześniej: kolizje na 1920×800 / 2300×830 / 2560×900 / 1440×660, tekst We-know do 386px
poza kontenerem, dziura rozjeżdżająca się do 915px.

**Nawiasy** mają teraz `y` i wysokość **identyczne z blokiem tekstu** na każdym viewporcie
(np. 1440×800: nawias `[200, 248]`, tekst `[200, 248]`) — czyli robią to, o co chodziło.

**Punkt 3 odpadł.** Odstępy wokół diamentu w We-know trzymają proporcję dzięki sufitowi:
57px @800 → 53 @740 → 50 @700 → 48 @660. Nic się nie nachodzi, więc `-15vh` nie jest potrzebne.

⚠️ **Jedna zmiana na artboardzie:** na 1440 kolumna tekstu We-know przesunęła się o **16px
w prawo** — dosunięta dokładnie do krawędzi kontenera (było 48px od ekranu przy gutterze 32).

## Zakres — jak odczytałem cięcie

Powiedziałeś „do momentu, aż wjeżdża sekcja Home Key/Pillars block, czyli te dwie pierwsze
sekcje". Te dwie rzeczy nie do końca się pokrywają, więc **poszedłem za granicą, którą nazwałeś
wprost** — bo jest precyzyjna, a „dwie" jest luźne. W DOM zostały trzy `<section>`:

```
is-home-hero            ← 1
is-home-how-it-works    ← 2  (pinned flow: maska, wideo, statsy, WHAT WE DO)
is-home-we-know         ← 3  (apla + handoff kształtu — czyli to, co kończy sekwencję)
```

`is-home-we-know` **nie jest osobnym rozdziałem**, tylko domknięciem pinned flow: nachodzi
na niego przez `margin-top: -100vh` i przejmuje kształt z handoffu. Ucięcie przed nim
zabrałoby aplę i cały finał, który zatwierdzałeś. Jeśli miałeś na myśli dosłownie dwie
sekcje — usunięcie `is-home-we-know` to jedno cięcie w `index.html`, powiedz.

**Usunięte Z DOM** (nie ukryte): `.home-key-pillars-block` (intro + key-pillars), concept,
wszystkie sekcje `wf-home` Maćka, insights, CTA, footer-bottle-reveal, site footer.
Razem z nimi wyleciały martwe skrypty i linki: `key-pillars.js`, `video-scrub.js`,
`site-footer.js/.css`, `home-insights/*`, `home-webflow-sections/style.scoped.css`, Swiper.

Skutek uboczny, ale ważny: **zniknęła cała klasa błędów, którą generowało `display: none`**
na tych sekcjach w `home-mobile` (ScrollTriggery liczone z zapadniętych boksów nadpisujące
maskę nava, `getTotalLength()` na nierenderowanym SVG). Dlatego `key-pillars.js` nie jest tu
w ogóle wczytywany i nie potrzebuje żadnego guarda.

## Smooth scroll — Lenis

**Nie było go** w `home-full` ani w `home-mobile`. Istniał tylko jako laboratorium
w `_code/_smooth-lenis/`, razem z rozstrzygniętym porównaniem (`COMPARISON.md`).
Nie wymyślałem konfiguracji — wziąłem kanon:

- `smooth-lenis.js` — **kopia 1:1** z `_code/_smooth-lenis/smooth-lenis.js`
- `vendor/lenis.min.js` — kopia stamtąd (bez CDN, tak jak w labie)
- wpięte **po** `gsap` + `ScrollTrigger`, **przed** warstwą globalną `_shared`

Model: Lenis wygładza natywny scroll okna, nie transformuje żadnego kontenera — dlatego
`position: fixed` na `.feature-shape_component` (handoff kształtu) działa bez zmian.
To była właśnie decydująca różnica w `COMPARISON.md` względem ScrollSmoothera, który
transformuje `#smooth-content` i tworzy nowy containing block dla `fixed`.

### Jedna zmiana wymuszona przez Lenisa: `scrub: true`

```js
scrubSmooth: window.Lenis ? true : PPB.config.scrubSmooth,   // było: 1.2
```

Prosto z `COMPARISON.md`: *„Double-scrub naprawiony: pinned flow zszedł z `scrub: 1.2` na
`scrub: true`. Smoothing bierze na siebie scroller (Lenis `lerp`), scrub wideo jest
bezpośredni → koniec «kisielu do kwadratu»."*

**Płynność stroisz teraz w jednym miejscu: `lerp` w `smooth-lenis.js` (start 0.1).**
Nie w `scrubSmooth`. Fallback: przy `prefers-reduced-motion` Lenis się nie włącza i
`scrubSmooth` wraca do wartości z `_shared/gsap-config.js`.

Dwie drobne konsekwencje, też załatwione:

- strzałka hero jechała `window.scrollTo({behavior:"smooth"})` — natywny smooth bije się
  z pętlą rAF Lenisa (skok + szarpnięcie). Teraz `PPB_LENIS.scrollTo(y)`, z fallbackiem.
- po loaderze wołane jest `PPB_SMOOTH.start()`.

## Zweryfikowane headless

Chromium, `375×676` i `1440×800`:

| | mobile | desktop |
|---|---|---|
| Lenis zainicjowany i działa | ✅ | ✅ |
| `CONFIG.scrubSmooth` | `true` | `true` |
| sekcje w `<main>` | hero, how-it-works, we-know | to samo |
| key-pillars / site footer w DOM | brak | brak |
| ScrollTriggery przed → po przejeździe tam i z powrotem | 9 → 9 | 10 → 10 |
| handoff kształtu | `[20, 325, 335, 331]` | `[476, 170, 486, 481]` |
| wideo pełnej szerokości w dojeździe | ✅ | ✅ |
| `pageerror` | **0** | **0** |

Zero kumulacji ScrollTriggerów przez wielokrotny przejazd. Strona kończy się dokładnie
na pełnej apli: `is-nav-covered = true`, `clipPath` maski = `inset(0px)` przy `scrollY = max`.

## Dług do posprzątania

- **Martwy CSS.** Reguły sekcji, które wyleciały z DOM (key-pillars, concept, CTA,
  footer-bottle-reveal — ok. 500 linii w `style.css`), zostały. Nic nie łapią, ale przed
  portem do Webflow warto je wyciąć. Nie robiłem tego hurtem, bo to kasowanie na ślepo.
- **Teksty We know / Our goal** są na ≤767 wygaszone — brak artboardu mobile.
- **Treść statsów** wciąż rozjeżdża się z designem: HTML ma „Approved biosimilars **8**"
  i „Partners **worwide** 8", screeny mówią „**2**" i „Partners worldwide **10+**".

## Pod port do Webflow — na co uważać

1. **Lenis w Webflow** wchodzi jako `<script>` w Site Settings → Footer, w tej samej
   kolejności: gsap → ScrollTrigger → lenis → smooth-lenis → skrypty stron. `smooth-lenis.js`
   to warstwa trwała — init RAZ, poza Barbą (`_smooth-lenis/BARBA-READY-CONTRACT.md`).
2. **`scrub: true` wszędzie w pinach.** Każde `scrub: <liczba>` dołożone później w Webflow
   przywróci double-scrub.
3. **Jeden arbiter stanu nava.** Dziś po `clipPath` nava piszą trzy niezależne kontrolery
   (`_shared/nav-mask.js` + dwa z `key-pillars.js`), trzymające się wyłącznie na
   rozłączności zakresów scrolla. Każde przestawienie sekcji łamie to cicho — właśnie
   dlatego logo migało w `home-mobile`. Do portu warto to skonsolidować.
4. **`_shared/nav/nav.html` nie ma hamburgera w kopii maski** — bug obecny na każdej stronie
   wklejającej nav z kanonu (opis: `home-mobile/MOBILE-PROTOTYPE.md`, punkt B).
5. **Gutter mobile = 20px** jest tu ustawiany lokalnie (`--container-gutter` + `.section`).
   Kanonicznie oznacza to zmianę `.section` @767 z 16 na 20 w `_shared/styleguide.css`.

---

## Dług — przeliczanie przy resize (punkt 7)

Dziś `resize` robi tylko `ScrollTrigger.refresh()` (debounce 200ms) + przelicza `SHAPE_DIMS`
i kadr wideo. **Nie** przelicza wartości zapieczonych w px przy inicie:
`maskStartPx` / `maskEndPx` / `maskProxy.offY` w `initHowItWorks` oraz `targetScale`,
`shapeLeftX`, pozycje duplikatów butelek w `initWeKnow`. Stąd „rozjechana maska" po zmianie
rozmiaru okna — do F5.

W produkcji to nie jest teoria: **pasek adresu na mobile chowa się i pokazuje, co zmienia
`innerHeight` i odpala `resize`.**

Trzy drogi, od najtańszej:

1. **Przeliczanie w `refreshInit`.** ScrollTrigger emituje to zdarzenie przed każdym refreshem —
   wystarczy wyciągnąć te stałe do funkcji i wołać ją stamtąd. Łata ~80% przypadków, kilka godzin.
2. **`gsap.matchMedia()` / `gsap.context()`** (GSAP 3.11+) — właściwe rozwiązanie: każdy init
   w kontekście, na resize `revert()` + budowa od nowa. Wymaga, żeby inity były idempotentne;
   to realny refaktor `script.js`, ale to jest docelowy wzorzec i tak samo zadziała po porcie.
3. **Jednostki względne zamiast px** tam, gdzie się da (vh/% zamiast wyliczonych pikseli) —
   wtedy nie ma czego przeliczać. Częściowe, ale każdy taki kawałek to jedno miejsce mniej.

Do tego niezależnie **guard na mobilny pasek adresu**: ignorować `resize`, w którym zmieniła się
tylko wysokość i o mniej niż ~150px. Bez tego przebudowa odpalałaby się przy każdym przewinięciu.
