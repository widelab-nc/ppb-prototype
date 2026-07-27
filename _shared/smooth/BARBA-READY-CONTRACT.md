# Barba-ready contract — jak pisac sekcje w INNYCH czatach

> TL;DR: TAK, to ze robimy page transitions Barba.js wplywa na to, jak budujesz
> teraz strony w innych czatach. Trzymaj sie 4 zasad ponizej, a merge transition
> bedzie darmowy. Zignoruj je → kazda nowa interakcja bedzie wymagac przeróbki.

## Dlaczego (w skrocie)

Barba nawiguje BEZ przeladowania: DOM sie podmienia, ale okno JS zyje dalej.
To lamie 3 zalozenia, na ktorych stoja obecne prototypy:
- `window.load` odpala sie RAZ (przy pierwszym wejsciu), nie przy kazdej nawigacji
- skrypty obu stron wspolistnieja w pamieci → globalne `const CONFIG` = kolizja
- ScrollTriggery starej strony nie znikaja same → nakladaja sie na nowej

## 4 zasady (kosztuja grosze teraz, drogo pozniej)

### 1. Cala logika strony w JEDNEJ funkcji `init()`, nie na `window.load`
Nowa interakcja = kolejne wywolanie WEWNATRZ `init()`, nie osobny
`window.addEventListener("load", ...)`. Init musi dac sie odpalic na zadanie.

### 2. Cale GSAP/ScrollTrigger owijaj w `gsap.context(..., root)` + `destroy()`
To jest NAJWAZNIEJSZE. Jeden `ctx.revert()` sprząta wszystko (tweeny, piny,
pin-spacery, ScrollTriggery) przy wyjsciu ze strony. Bez tego triggery sie
kumuluja z kazda nawigacja.
```js
let ctx;
function init(opts){
  const root = document.querySelector('[data-barba-namespace="X"]') || document;
  ctx = gsap.context(() => {
    /* ...wszystkie initXxx() tutaj... */
  }, root);
}
function destroy(){ ctx && ctx.revert(); }
```

### 3. Zero wyciekow do globala
Owijaj skrypt strony w moduł (`window.PPB.<page> = (function(){ ... })()`).
`CONFIG`, `revealText` itp. maja zyc w scope strony. Dwie strony w pamieci na raz
= dwa `const CONFIG` w globalu = SyntaxError, cala strona pada.

### 4. Zapytania DOM scope'uj do kontenera strony, nie do `document`
W trakcie transition stara i nowa strona moga chwilowo wspolistniec.
`root.querySelector(...)` zamiast `document.querySelector(...)` = nie zlapiesz
elementow wychodzacej strony.

## Czego NIE musisz robic

- Nie musisz sam wpinac Barby ani pisac transition.js — to jest gotowy,
  page-agnostic harness. Ty dbasz tylko o to, zeby strona miala czyste
  `init()`/`destroy()` i nie srała do globala.
- `location.reload()` na resize moze zostac na czas prototypu (to swiadomy reload).

## Bonus (pod pozniejszy Webflow)
- Nav / contact-cta to komponenty wspoldzielone — docelowo jeden CSS globalny,
  nie kopia w kazdym style.css. Teraz transition chowa swap CSS za zaslona,
  wiec nie boli, ale przy porcie warto rozdzielic core vs page.
