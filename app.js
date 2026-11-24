'use strict';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const { topics, stats, sources, scenarios, plans, decide } = window.signal;
const number = new Intl.NumberFormat('ru-RU');
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
      const track = video.addTextTrack('captions','Русский','ru');
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
  $('#guide-status').textContent='Показано '+visible+' из '+guideItems.length;
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
const form=$('#chat-form');
if(form) {
  const field=$('#question');
  const messages=$('#messages');
  const replies={
    private:'Похоже, в сообщении есть личные данные или код. Переформулируйте вопрос без них.',
    denied:'Помощник подсказывает, как защищать учётные записи и реагировать на угрозы. Спросите о профилактике или восстановлении доступа.',
    unknown:'В справочнике пока нет ответа. Уточните, что случилось: подозрительное сообщение, вход в аккаунт, QR-код, пароль или обновление устройства.',
    length:'Введите вопрос длиной до 280 символов.'
  };
  let busy=false;
  let endpointActive=false;
  function message(text,who) {
    const result=el('div',text,'bubble '+who);
    messages.append(result);
    return result;
  }
  function reset() {
    messages.replaceChildren();
    message('Здравствуйте! Опишите ситуацию или выберите готовый вопрос. Я подберу шаги из справочника.','bot');
  }
  function showTopic(id) {
    const item=topics.find(t=>t.id===id);
    const bubble=message(null,'bot');
    bubble.append(el('strong',item.title),el('p',item.lead));
    const list=el('ol');
    item.steps.forEach(step=>list.append(el('li',step)));
    const refs=el('p',null,'sources');
    item.sources.forEach(key=>refs.append(link(...sources[key])));
    refs.append(link('Открыть карточку','guide.html#'+id));
    const plan=plans.find(entry=>entry.id===item.plan||entry.topic===id);
    if(plan) refs.append(link('Что делать сейчас','response.html#'+plan.id));
    bubble.append(list,refs);
  }
  async function choose(question,ids) {
    if(!endpointActive) return ids[0];
    try {
      const ret=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal:AbortSignal.timeout(3600)});
      if(!ret.ok) return ids[0];
      const data=await ret.json();
      if(data.mode!=='provider') return ids[0];
      return ids.includes(data.id)?data.id:ids[0];
    } catch { return ids[0]; }
  }
  async function send(input, focusInput=true) {
    if(busy||!input.trim()) return;
    busy=true;
    const controls=[...$$('.quick button'),$('.send'),$('#reset-chat')];
    controls.forEach(button=>{button.disabled=true;});
    field.value='';
    if(messages.childElementCount>=31) messages.replaceChildren(...[...messages.children].slice(-29));
    const result=decide(input);
    message(result.state==='private'?'Вопрос скрыт из-за возможных личных данных.':input.trim(),'user');
    if(result.state==='match') showTopic(await choose(input.trim(),result.ids));
    else message(replies[result.state],'bot');
    messages.scrollTop=messages.scrollHeight;
    controls.forEach(button=>{button.disabled=false;});
    busy=false;
    if(dialog.open) (focusInput?field:messages).focus({preventScroll:true});
  }
  form.addEventListener('submit',event=>{event.preventDefault();void send(field.value);});
  $$('.quick button').forEach(button=>button.addEventListener('click',()=>{void send(button.textContent,false);}));
  $('#reset-chat').addEventListener('click',()=>{reset();field.focus();});
  reset();
  const staticHost = /\.(github\.io|chatgpt\.site)$/.test(location.hostname);
  if(location.protocol!=='file:' && !staticHost) dialog.addEventListener('chatopen',()=>{
    void fetch('/api/status',{signal:AbortSignal.timeout(1500)})
    .then(ret=>ret.ok&&ret.headers.get('content-type')?.includes('application/json')?ret.json():{})
    .then(status=>{
      endpointActive=status.provider===true;
      if(endpointActive) $('#mode').textContent='Подбор с ИИ · ответы из справочника';
    }).catch(()=>{});
  },{once:true});
}

