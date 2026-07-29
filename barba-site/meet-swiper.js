/* ============================================================
   MEET THE TEAM — slider sekcji z buildu Webflow.

   BARBA (2026-07-28): to był INLINE <script> na dole index.html.
   Barba nie wykonuje skryptów z podmienianego kontenera, a inline
   na poziomie strony odpaliłby się tylko raz — po powrocie na home
   slider byłby martwy, a stara instancja Swipera trzymałaby autoplay
   na wyrzuconym DOM-ie. Stąd osobny moduł z init/destroy.
   ============================================================ */
(function () {
  var PPB = (window.PPB = window.PPB || {});
  PPB.sections = PPB.sections || {};

  var instances = [];

  function init(root) {
    root = root || document;
    if (typeof Swiper === "undefined") return;

    /* MOBILE≤991 (2026-07-28): `.wf-home` jest `display:none` (patrz style.css, blok
       „TYLKO PROTOTYP"). Swiper na ukrytym kontenerze liczy szerokości = 0 i odpala
       autoplay w tle bez sensu — nie inicjalizujemy go w ogóle na tej warstwie. */
    if (window.matchMedia("(max-width: 991px)").matches) return;

    Array.prototype.forEach.call(root.querySelectorAll(".wf-home .meet_swiper .swiper"), function (el) {
      instances.push(new Swiper(el, {
        slidesPerView: 1.25, spaceBetween: 20, centeredSlides: true, loop: true, speed: 1800,
        autoplay: { delay: 3000, pauseOnMouseEnter: true },
        breakpoints: {
          768: { slidesPerView: 2, centeredSlides: false },
          992: { slidesPerView: 4, centeredSlides: false },
        },
        pagination: {
          el: el.closest(".swiper_wrap").querySelector(".swiper_pagination"),
          clickable: true,
          bulletClass: "swiper_pagination_dot",
          bulletActiveClass: "is-active",
        },
      }));
    });
  }

  function destroy() {
    instances.forEach(function (sw) { try { sw.destroy(true, true); } catch (e) {} });
    instances = [];
  }

  PPB.sections.meetSwiper = { init: init, destroy: destroy };

  if (!window.__PPB_BARBA__) {
    window.addEventListener("load", function () { init(document); });
  }
})();
