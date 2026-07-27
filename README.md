# ppb-prototype — statyczny prototyp homepage Polpharma Biologics

Podgląd do review. **To nie jest paczka pod Webflow** — ta żyje osobno w
[`ppb-wf-code`](https://github.com/widelab-nc/ppb-wf-code) i zostaje bez zmian.
Tutaj leży prototyp w formie, w jakiej powstaje: HTML + CSS + GSAP, uruchamialny
jako zwykła strona statyczna.

Źródło: `_code/` w vaulcie projektu. To repo jest **kopią do publikacji**, nie miejscem pracy.

## Podgląd

Otwórz `index.html` — jest tam rozpiska i linki. Trzy wejścia:

| | co to |
|---|---|
| `home-full/` | cała homepage, od loadera po footer |
| `home-part1/` | hero → pinned flow → apla; **pełna warstwa mobile + Lenis** |
| `_responsive-check.html` | obie wersje obok siebie, przełącznik 7 rozmiarów okna |

Lokalnie: `python3 -m http.server 8000` z katalogu repo → `http://localhost:8000/`.
Musi być przez serwer, nie przez dwuklik — `_responsive-check.html` czyta iframe'y
i wymaga tego samego origin.

## GitHub Pages

Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
Po minucie strona jest pod `https://<user>.github.io/<repo>/`.
Repo może zostać prywatne — Pages działa na prywatnych repo w planach Team/Enterprise;
na darmowym trzeba je upublicznić. Dodałem `<meta name="robots" content="noindex">`
na stronie startowej, ale to nie jest zabezpieczenie, tylko prośba do wyszukiwarek.

## Odświeżenie po zmianach w vaulcie

Repo jest kopią, więc po zmianach w `_code/` trzeba je zsynchronizować:

```bash
SRC="…/polpharma-biologics/_code"
DST="…/polpharma-biologics/_review-site"
for d in _shared home-full home-part1 home-webflow-sections home-insights; do
  rsync -a --delete --exclude '*.bak*' --exclude '.DS_Store' \
        --exclude '_to_delete' --exclude '_archive' --exclude '.git' "$SRC/$d" "$DST/"
done
cp "$SRC/_responsive-check.html" "$DST/"
```

Potem zwykłe `git add -A && git commit && git push`.

## Co siedzi w środku

- **`_shared/`** — warstwa globalna: `gsap-config.js` (easingi + config systemów),
  `reveal.js` (#1 line-reveal), `nav/` (#2 maska nava), `swap.js` (#3 swap-in-place),
  `highlight.js` (#4 scroll highlight), `styleguide.css` (typografia `is-*`, kolory,
  `.section`/`.container`), fonty, site-footer.
- **`home-full/`** — kanon homepage.
- **`home-part1/`** — wycinek pod port: hero + pinned flow + apla, z warstwą mobile
  i smooth scrollem (Lenis). Szczegóły w `home-part1/README.md`.
- **`home-webflow-sections/`**, **`home-insights/`** — sekcje wpięte w `home-full`.

## Znane braki

- **Fonty Season Sans Regular 400 + Bold 700** nie są wgrane — body renderuje się na
  Medium, `is-emphasis` jest faux-bold.
- **Sekcje poniżej „We know" nie mają warstwy mobile** — mobile jest zrobione w `home-part1`
  dla hero + pinned flow + apla.
- **Wideo to placeholdery**; finalne wymagają enkodowania `-g 1` (keyframe na klatkę,
  bez tego scrub po `currentTime` skacze).
- `home-full` ładuje GSAP, SplitText, Lottie i Swiper **z CDN** → podgląd wymaga internetu.
  `home-part1` ma Lenisa lokalnie w `vendor/`.

## Licencja

Prywatne, klient pod NDA. Nie publikować poza zespołem projektu.
