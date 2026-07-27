# home-webflow-sections — sekcje homepage z Webflow (build Maćka)

Sekcje **strony Home** z Webflow (`polpharmaxwidehue`, site `6a55f3bb4b824306906ca274`),
wyciągnięte z oficjalnego **Export Code** i zgrane ze wspólnym style guide Vaulta.
Cel: połączyć je z prototypem GSAP w `_code/home` w jedną homepage.

> To są sekcje, których **nie ma** w prototypie `_code/` — statyczne, budowane bezpośrednio
> w Webflow. Nav/footer nie ma w eksporcie (macie je osobno w `_shared`).

## Co jest w środku

- `index.html` — 4 sekcje pod sobą, podgląd samodzielny (podpięte `_shared/styleguide.css` + Swiper).
- `style.css` — tokeny + klasy sekcji z Webflow (`how_*`, `join_*`, `pipeline_*`, `meet_*`, `content_*`,
  `eyebrow_*`, `elipse-cta*`, `header_*`, `header-1_*`, `primary-button`, `readmore_*`, `team-m_*`, `swiper_*`…).
- `images/` — obrazy + logotypy użyte na home (how_image, join_img, meet_paco, 6 logo SVG).

### Sekcje (kolejność jak na stagingu)

1. **How it works** — `section is-dark is-100dvh` (deep-green). „We cover the full biosimilar lifecycle",
   4 kategorie (Development / Regulatory / Commercial supply / Lifecycle management), diamenty + wiersze 1.1–4.3, CTA „Work with us".
2. **Join / Careers** — `section is-join` (light-green). „Biosimilars don't move themselves…", CTA „View open positions" + elipse „Join us".
3. **Biosimilars pipeline** — `section is-pipeline`. Nagłówek z dividerami + tabela 5 molekuł (Ranibizumab, Natalizumab, Vedolizumab, Ocrelizumab, Guselkumab) + pas logotypów „trusted worldwide".
4. **Meet the team** — `section is-padding-off`. Nagłówek + slider Swiper z 5 kartami zespołu.

> Na Webflow home są jeszcze **3 puste sekcje** (`section` z samym `section-name-layout`) — pominięte (nic w środku).

## Zgranie ze style guide — decyzje

Pytanie było: skoro style tekstowe z Webflow mamy już w `_shared`, jak to zgrać. Zrobione tak:

- **Typografia = jedno źródło.** Klasy `is-h-*/is-t-*/is-b-*/is-caption/is-emphasis` **usunięte** z tego CSS —
  pochodzą z `../_shared/styleguide.css` (kanon, 1:1 z Figmą). Wartości w eksporcie były identyczne, więc render bez zmian.
- **Fonty z `_shared`** (jedna kopia). `@font-face` z eksportu usunięte; zmienne rodzin (`--heading-family` itd.)
  przemapowane na nazwy z `_shared` (`"Concrette M"`, `"Season Sans"`) na końcu `style.css`.
- **Płynny `rem` z `<head>` Webflow celowo pominięty** → baza `16px` (jak w całym `_code/home`). Dzięki temu sekcje
  skalują się tak samo jak reszta prototypu, a nie wg viewportu.
- **Kolory / siatka / spacing / `.section` / `.container` — zostają z buildu Webflow** (to nie typografia, poza zakresem
  zgrania), żeby sekcje wyglądały 1:1 ze stagingiem.
- **Nazwy klas Maćka zostawione** (`how_*`, `join_*`, bez prefiksu strony). Przemapowanie na kanon
  `[strona]-[sekcja]_[element]` to **otwarta decyzja Tomek+Maciek** (`restructure-plan.md §12`) — nie ruszałem.
- **Emoji w nazwach tokenów** (`--_🟢-colors---…`) znormalizowane do `--_g-colors---…` — emoji w nazwie custom
  property nie renderowało tła/koloru (`.section.is-dark` wychodziło przezroczyste). Zmiana konsekwentna (def + ref).

## Do decyzji / uwagi (flagi)

- ⚠️ **Title Large letter-spacing rozjazd:** `_shared/styleguide.css` ma `.is-t-l` = `-0.01em` (oznaczone jako prowizorka),
  a Webflow/Figma = **`-0.03em`**. Na home `is-t-l` nie jest używane, więc teraz zero wpływu — ale warto zsynchronizować `_shared`.
- ⚠️ **Tokeny layoutu ≠ kanon `_shared`:** Webflow `container-width` = `120rem` (1920px), a `_shared .container` = `84rem` (1344px);
  Webflow `section-padding` = `2rem`, a `_shared .section` = `5rem 3rem`. Te sekcje trzymają wartości Webflow. Przy wklejaniu do
  `_code/home` trzeba zdecydować, który `.section`/`.container` wygrywa (te sekcje czy kanon home).
- **Meet the team = Swiper** (nie GSAP). Na żywo inicjalizuje go custom skrypt Webflow czytający `data-swiper-*`; tu dołożony
  minimalny init z CDN Swiper (`index.html`). Wymaga sieci (CDN). W sandboxie headless CDN nie działa → w podglądzie karty się „rozjeżdżają"; w realnej przeglądarce jest OK.
- **Placeholdery:** karty zespołu = „Full Name / Role or position" + `meet_paco.webp` ×5; wszystkie CTA linkują do `#`.

## Jak złączyć z `_code/home`

1. Wklej wybrane bloki `<section class="section is-…">…</section>` z `index.html` w docelowe miejsce homepage.
2. `style.css` dołóż do CSS strony (albo scal do stylu home). `_shared/styleguide.css` linkuj **raz** (już jest w home).
3. Rozstrzygnij override `.section`/`.container` (patrz flagi wyżej).
4. Swiper: jeśli Meet ma zostać, dociągnij Swiper (CDN lub host) + init; docelowo do portu na Webflow wróci custom skrypt Maćka.

## Źródło
Export Webflow → `index.html` (strona Home) + `css/polpharmaxwidehue-staging.webflow.css`. Pełny export leży w `_downloads/` (jeśli wgrany).

---

## ✅ Wstrzyknięte do `_code/home-full` (2026-07-24)

Sekcje wpięte do najnowszego home (`home-full/index.html`) **po sekcji `is-home-concept`,
przed `is-home-cta`** — owinięte w `<div class="wf-home">`, podpięty **`style.scoped.css`**
(scoped do `.wf-home`, więc reszta home-full jest nietknięta) + Swiper (CSS/JS/init) dla Meet.
Obrazy linkowane z `../home-webflow-sections/images/`. Backup oryginału:
`home-full/index.before-wf-merge.bak.html`.

⚠️ **Szerokość:** wewnątrz `.wf-home` obowiązuje kontener Webflow (`120rem`), a reszta home-full
używa kanonu `84rem`. Na bardzo szerokich ekranach sekcje Webflow będą szersze. Jeśli mają być
zunifikowane do szerokości home — mały follow-up (rebase na `.section/.container` z `_shared`;
uwaga na siatkę `grid-custom`, która liczy kolumny z tokenów Webflow).
