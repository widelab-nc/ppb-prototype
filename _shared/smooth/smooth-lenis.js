/* ============================================================
   Smooth scroll — LENIS (warstwa trwala, init RAZ, poza Barba)
   Spiete z GSAP tickerem + ScrollTrigger. Bez scrollerProxy —
   Lenis smootuje natywny scroll okna, wiec piny/fixed dzialaja natywnie.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof Lenis === "undefined") {
    window.PPB_SMOOTH = { toTop: function () { window.scrollTo(0, 0); }, refresh: function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); } };
    return;
  }

  var lenis = new Lenis({
    lerp: 0.1,          // 0..1 — nizej = bardziej "kisiel". STROIC tutaj.
    smoothWheel: true,
    smoothTouch: false, // touch zostaje natywny (dobra praktyka)
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  window.PPB_LENIS = lenis;
  window.PPB_SMOOTH = {
    toTop: function () { lenis.scrollTo(0, { immediate: true }); },
    refresh: function () { ScrollTrigger.refresh(); },
    stop: function () { lenis.stop(); },
    start: function () { lenis.start(); },
  };
})();
