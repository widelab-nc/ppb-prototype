/* ============================================================
   Polpharma Biologics — VIDEO SCRUB helper (_shared)
   Jeden wzorzec wideo-na-scroll dla całego projektu (patrz _code/README.md):
   1. plik enkodowany ffmpeg -g 1 (keyframe co klatkę), sufiks -g1.mp4
   2. markup: <video src="...-g1.mp4" muted playsinline preload="auto">
      (NIGDY autoplay/loop — odtwarzaniem steruje wyłącznie scroll)
   3. użycie w ScrollTriggerze:
        var scrubVideo = createVideoScrub(videoEl);
        onUpdate: (self) => scrubVideo(Math.min(self.progress / portion, 1))
   ============================================================ */

(function () {
  function createVideoScrub(video) {
    // scrub przez currentTime po HTTP renderuje tylko 1. klatkę → wczytujemy plik do PAMIĘCI (blob),
    // wtedy seek jest natychmiastowy (działa też na hostingu, nie tylko z file://).
    try {
      var src = video && video.getAttribute("src");
      if (src && src.indexOf("blob:") !== 0) {
        fetch(src).then(function (r) { return r.blob(); })
          .then(function (b) { video.src = URL.createObjectURL(b); video.load(); }).catch(function () {});
      }
    } catch (e) {}
    return function (p) {
      if (!video.duration) return;
      video.currentTime = Math.min(p * video.duration, video.duration - 0.01);
    };
  }

  var PPB = (window.PPB = window.PPB || {});
  PPB.createVideoScrub = createVideoScrub;
  window.createVideoScrub = createVideoScrub;
})();
