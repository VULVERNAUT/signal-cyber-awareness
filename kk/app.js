'use strict';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const { topics, stats, sources, scenarios, plans, decide } = window.signal;
function kazakhNumbers(options) {
  const formatter = new Intl.NumberFormat(['kk-KZ', 'en-US'], options);
  // Browser locale data can differ on decimal and grouping marks.
  const separators = { group: '\u00a0', decimal: ',' };
  return { format: number => formatter.formatToParts(number).map(part => separators[part.type] ?? part.value).join('') };
}
const number = kazakhNumbers();
function el(tag, value, className) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  if (className) node.className = className;
  return node;
}
function link(text, href, className) {
  const node = el('a',text,className);
  node.href = href;
  return node;
}
const gallery = $('.stories');
if (gallery) {
  const episodes = $$('.story-episode');
  const switches = $$('.story-select');
  const videos = episodes.map(episode => episode.querySelector('video'));
  for (const video of videos) {
    if (typeof VTTCue === 'function') {
      const language = document.documentElement.lang.split('-')[0];
      const captionLabel = video.dataset.captionLabel || { kk: 'Қазақша', ru: 'Русский' }[language] || language;
      const track = video.addTextTrack('captions',captionLabel,language);
      for (const [start,end,text] of JSON.parse(video.dataset.captions)) {
        track.addCue(new VTTCue(start,end,text));
      }
      track.mode = 'hidden';
    }
    const play = video.parentElement.querySelector('.film-start');
    play.hidden = false;
    play.addEventListener('click',() => { void video.play().catch(() => video.focus()); });
    video.addEventListener('play',() => {
      if (document.activeElement === play) video.focus();
      play.hidden = true;
      videos.filter(item => item !== video).forEach(item => item.pause());
    });
    video.addEventListener('ended',() => { play.hidden = false; });
  }
  function selectEpisode(hash) {
    const selected = episodes.find(episode => '#'+episode.id === hash) || episodes[0];
    for (const episode of episodes) {
      episode.hidden = episode !== selected;
      if (episode.hidden) episode.querySelector('video').pause();
    }
    for (const item of switches) {
      if (item.hash === '#'+selected.id) item.setAttribute('aria-current','true');
      else item.removeAttribute('aria-current');
    }
  }
  switches.forEach(item => item.addEventListener('click',event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectEpisode(item.hash);
    if (location.hash !== item.hash) history.pushState(null,'',item.hash);
    if (matchMedia('(max-width: 760px)').matches) {
      document.getElementById(item.hash.slice(1)).scrollIntoView({block:'start'});
    }
  }));
  window.addEventListener('hashchange',() => selectEpisode(location.hash));
  selectEpisode(location.hash);
}


const dialog = $('#chat-dialog');
const openers = $$('[data-chat-open]');
let opener = null;
if (dialog && typeof dialog.showModal==='function') {
  openers.forEach(button=>{
    button.hidden = false;
    button.addEventListener('click',()=>{
      if (dialog.open) return;
      opener = button;
      dialog.showModal();
      openers.forEach(control=>control.setAttribute('aria-expanded','true'));
      $('[data-chat-close]').focus({preventScroll:true});
      const log = $('#messages');
      log.scrollTop = log.scrollHeight;
      dialog.dispatchEvent(new Event('chatopen'));
    });
  });
  $('[data-chat-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    if (event.target !== dialog) return;
    const b = dialog.getBoundingClientRect();
    if(event.clientX<b.left || event.clientX>b.right || event.clientY<b.top || event.clientY>b.bottom) dialog.close();
  });
  dialog.addEventListener('close',()=>{
    openers.forEach(control=>control.setAttribute('aria-expanded','false'));
    opener?.focus({preventScroll:true});
    opener=null;
  });
}
const filters = $$('[data-filter]');
const guideQuery = $('#guide-query');
const guideItems = $$('.guide-item');
let selectedGroup = 'all';
const normalize = input => input.toLowerCase().trim().replaceAll('ё','е');
function filterGuide() {
  const words=normalize(guideQuery.value).split(/\s+/).filter(Boolean);
  filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===selectedGroup)));
  let visible=0;
  guideItems.forEach((article,index)=>{
    const topic=topics[index];
    const searchable=normalize([article.textContent,...topic.keys].join(' '));
    const match=(selectedGroup==='all'||article.dataset.group===selectedGroup)&&words.every(word=>searchable.includes(word));
    article.hidden=!match;
    if(match) visible++;
  });
  $('#guide-status').textContent='Барлығы '+number.format(guideItems.length)+' тақырып. Көрсетілгені: '+number.format(visible);
  $('#guide-empty').hidden=visible!==0;
}
function openGuideAnchor() {
  const article=document.getElementById(location.hash.slice(1));
  if (!article?.matches('.guide-item')) return;
  selectedGroup='all';
  guideQuery.value='';
  filterGuide();
  article.querySelector('details').open=true;
  article.scrollIntoView({block:'start'});
}
if(guideQuery) {
  filters.forEach(button=>button.addEventListener('click',()=>{
    selectedGroup=button.dataset.filter;
    filterGuide();
  }));
  guideQuery.addEventListener('input',filterGuide);
  filterGuide();
  openGuideAnchor();
  addEventListener('hashchange',openGuideAnchor);
}
const planCards=$$('[data-plan]');
if(planCards.length) {
  function selectPlan(scroll=false) {
    const active=planCards.find(card=>location.hash==='#'+card.id)||planCards[0];
    planCards.forEach(card=>{card.hidden=card!==active;});
    $$('[data-plan-link]').forEach(item=>{
      if(item.hash==='#'+active.id) item.setAttribute('aria-current','location');
      else item.removeAttribute('aria-current');
    });
    if(scroll) active.scrollIntoView({block:'start'});
  }
  selectPlan(Boolean(location.hash));
  addEventListener('hashchange',()=>selectPlan(true));
}
