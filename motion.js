'use strict';
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reveal(element) {
    if (!element || reduced.matches || !element.animate) return;
    element.animate([{opacity: .6, transform: 'translateY(5px)'}, {opacity: 1, transform: 'none'}],
      {duration: 230, easing: 'cubic-bezier(.22,1,.36,1)'});
  }
  const grid = document.querySelector('.guide-grid');
  if (grid) {
    const filters=document.querySelector('.filters');
    let previous = filters.querySelector('[aria-pressed="true"]')?.dataset.filter;
    filters.addEventListener('click', () => {
      const active=filters.querySelector('[aria-pressed="true"]')?.dataset.filter;
      if(active!==previous)reveal(grid);
      previous=active;
    });
  }
  const exercise = document.getElementById('exercise');
  if(exercise) {
    let last=null;
    new MutationObserver(() => {
      const heading = exercise.querySelector('h2');
      if(heading && heading!==last)reveal(exercise);
      last=heading;
    }).observe(exercise,{childList:true});
  }
})();
