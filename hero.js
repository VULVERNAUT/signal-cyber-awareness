'use strict';
(() => {
  const sequence = document.querySelector('.home-sequence');
  if (!sequence) return;
  const opening = sequence.querySelector('.home-opening');
  const receiver = sequence.querySelector('.receiver');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  let frame = 0;
  let end = 1;
  let inView = true;
  let tiltX = 0;
  let tiltY = 0;
  let lastProgress = -1;

  function ramp(value) {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
  }
  function render() {
    frame = 0;
    if (reduced.matches || !inView || document.hidden) return;
    const progress = Math.max(0, Math.min(1, window.scrollY / end));
    if (progress !== lastProgress) {
      sequence.style.setProperty('--progress', progress.toFixed(4));
      sequence.style.setProperty('--seat', ramp(progress / .73).toFixed(4));
      sequence.style.setProperty('--transmit', ramp((progress - .43) / .54).toFixed(4));
      lastProgress = progress;
    }
    receiver.style.setProperty('--tilt-x', (tiltX * (1 - progress)).toFixed(2) + 'deg');
    receiver.style.setProperty('--tilt-y', (tiltY * (1 - progress)).toFixed(2) + 'deg');
  }
  function queue() {
    if (!frame && inView && !document.hidden && !reduced.matches) frame = requestAnimationFrame(render);
  }
  function measure() {
    end = Math.max(170, Math.min(480, opening.offsetHeight * .66));
    lastProgress = -1;
    queue();
  }
  function preference() {
    sequence.classList.toggle('is-driven', !reduced.matches);
    if (reduced.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      for (const name of ['--seat','--transmit','--progress']) sequence.style.removeProperty(name);
      receiver.style.removeProperty('--tilt-x');
      receiver.style.removeProperty('--tilt-y');
    }
    measure();
  }
  opening.addEventListener('pointermove', event => {
    if (reduced.matches || !mouse.matches || event.pointerType !== 'mouse' || !inView) return;
    const box = opening.getBoundingClientRect();
    tiltX = ((event.clientX - box.left) / box.width - .5) * 6;
    tiltY = (.5 - (event.clientY - box.top) / box.height) * 4;
    queue();
  });
  opening.addEventListener('pointerleave', () => { tiltX = tiltY = 0; queue(); });
  window.addEventListener('scroll', queue, {passive:true});
  window.addEventListener('resize', measure, {passive:true});
  window.addEventListener('pageshow', measure);
  document.addEventListener('visibilitychange', queue);
  reduced.addEventListener('change', preference);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(opening);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView) queue(); },
      {rootMargin:'80px 0px'}).observe(sequence);
  }
  preference();
})();
