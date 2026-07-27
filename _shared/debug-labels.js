/* ============================================================
   Polpharma Biologics — DEBUG LABELS (_shared, globalne, opt-in)
   Pokazuje nazwę elementu w jego LEWYM DOLNYM rogu (plakietka jako
   DZIECKO elementu → jedzie 1:1 z jego transformami/pinami, bez RAF)
   + toggle w prawym dolnym rogu ekranu (pokazuje/chowa wszystkie).

   Zasada globalna: element opt-in przez `data-label="nazwa"`.
   Auto-init po DOMContentLoaded; można też wołać ręcznie
   `initDebugLabels(scope)` (np. po dołożeniu elementów dynamicznie).

   Uwagi projektowe (żeby było reużywalne i bezpieczne):
   - Plakietka = <span class="dbg-label"> DOPISANY do elementu; klasa spoza
     konwencji projektu (żaden selektor buildu jej nie łapie), `pointer-events:none`,
     `aria-hidden` → nie wpływa na layout/JS/dostępność. Idempotentne (flaga _dbgLabeled).
   - Element static → ustawiamy `position:relative` (BEZ offsetów = zero ruchu w layoutcie),
     żeby plakietka absolutna kotwiczyła się do niego.
   - Stan (widoczne/schowane) trzymany klasą na <html> + localStorage (best-effort).
   - Toggle tworzony RAZ.
   ⚠️ Znane ograniczenie: plakietka żyje w stackingu swojego elementu → element
      nachodzący z wyższym z-index może ją zasłonić (akceptowalne dla debugu).
   ============================================================ */

(function () {
  var STATE_KEY = "ppbDbgLabelsHidden";
  var root = document.documentElement;

  function getStored() {
    try { return localStorage.getItem(STATE_KEY) === "1"; } catch (e) { return false; }
  }
  function setStored(hidden) {
    try { localStorage.setItem(STATE_KEY, hidden ? "1" : "0"); } catch (e) {}
  }

  function label(el) {
    if (el._dbgLabeled) return;
    el._dbgLabeled = true;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    var badge = document.createElement("span");
    badge.className = "dbg-label";
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = el.getAttribute("data-label") || "";
    el.appendChild(badge);
  }

  function ensureToggle() {
    if (document.querySelector(".dbg-toggle")) return;
    var btn = document.createElement("button");
    btn.className = "dbg-toggle";
    btn.type = "button";
    var txt = document.createElement("span");   // kropkę stanu robi CSS ::before
    btn.appendChild(txt);

    function apply(hidden) {
      root.classList.toggle("dbg-hidden", hidden);
      txt.textContent = hidden ? "labels: off" : "labels: on";
      setStored(hidden);
    }
    apply(getStored());
    btn.addEventListener("click", function () {
      apply(!root.classList.contains("dbg-hidden"));
    });
    document.body.appendChild(btn);
  }

  function initDebugLabels(scope) {
    var rootEl = scope || document;
    rootEl.querySelectorAll("[data-label]").forEach(label);
    ensureToggle();
  }

  // eksport + auto-init
  window.PPB = window.PPB || {};
  window.PPB.initDebugLabels = initDebugLabels;
  window.initDebugLabels = initDebugLabels;

  if (document.readyState !== "loading") initDebugLabels();
  else document.addEventListener("DOMContentLoaded", function () { initDebugLabels(); });
})();
