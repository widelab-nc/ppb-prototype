# Fonts — Polpharma Biologics (prototyp)

Wrzuć tutaj pliki fontów. Preferowany format: **`.woff2`** (fallback `.woff`).

## Potrzebne kroje (wg style-guide.md)

| Rola CSS var | Krój docelowy | Wagi używane w projekcie |
|---|---|---|
| `--heading-family` | **Concrette M** (Medium) | 500 (headings h-l/m/s) |
| `--body-family` / title / caption | **Season Sans** | 400 (body/caption), 500 (title), 700 (emphasis/bold) |

## Co mi podać przy wgraniu

Dla każdego pliku: **nazwa pliku + rodzina + waga + styl** (np. `SeasonSans-Bold.woff2 → Season Sans, 700, normal`).
Wtedy dopisuję `@font-face`, podmieniam zmienne `--heading-family` / `--body-family` w `style.css` (linia ~19) i usuwam Inter z Google Fonts.

## Nazewnictwo (sugestia)

```
Concrette-Medium.woff2
SeasonSans-Regular.woff2
SeasonSans-Medium.woff2
SeasonSans-Bold.woff2
```
