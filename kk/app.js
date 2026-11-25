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
const form=$('#chat-form');
if(form) {
  const field=$('#question');
  const messages=$('#messages');
  const replies={
    private:'Хабарламада дербес деректер немесе растау коды бар сияқты. Оларды алып тастап, сұрағыңызды қайта жазыңыз.',
    denied:'Көмекші аккаунтты қорғау және қауіп төнгенде не істеу керегін түсіндіреді. Қатердің алдын алу немесе аккаунтқа қайта кіру туралы сұраңыз.',
    unknown:'Анықтамалықтан жауап табылмады. Не болғанын нақтылаңыз. Мысалы, күмәнді хабарлама, аккаунтқа кіру, QR-код, құпиясөз немесе құрылғыны жаңарту туралы жаза аласыз.',
    length:'Сұрағыңыз 280 таңбадан аспауы керек.'
  };
  let busy=false;
  let endpointActive=false;
  let geminiActive=false;
  let challengeRequired=false;
  let challengeToken='';
  let widgetId;
  function enableVerification(siteKey) {
    challengeRequired=true;
    const modeLabel=$('#mode');
    const localLabel='Анықтамалық · ЖИ көмегін қосу үшін тексеруден өтіңіз';
    const holder=el('div',null,'chat-verification');
    form.before(holder);
    modeLabel.textContent=localLabel;
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.onload=()=>{
      if(!window.turnstile) return;
      widgetId=window.turnstile.render(holder,{
        sitekey:siteKey,action:'signal_assistant',language:'auto',theme:'dark',size:'flexible',appearance:'interaction-only',
        callback:token=>{challengeToken=token;modeLabel.textContent='ЖИ тақырыпты таңдайды · жауаптар анықтамалықтан';},
        'expired-callback':()=>{challengeToken='';modeLabel.textContent=localLabel;},
        'error-callback':()=>{challengeToken='';modeLabel.textContent='Анықтамалық режимі';return true;}
      });
    };
    script.onerror=()=>{modeLabel.textContent='Анықтамалық режимі';};
    document.head.append(script);
  }
  function message(text,who) {
    const result=el('div',text,'bubble '+who);
    messages.append(result);
    return result;
  }
  function reset() {
    messages.replaceChildren();
    message('Сәлеметсіз бе! Не болғанын жазыңыз немесе дайын сұрақты таңдаңыз. Анықтамалықтан тиісті нұсқауды тауып беремін.','bot');
  }
  function showTopic(id) {
    const item=topics.find(t=>t.id===id);
    const bubble=message(null,'bot');
    bubble.append(el('strong',item.title),el('p',item.lead));
    const list=el('ol');
    item.steps.forEach(step=>list.append(el('li',step)));
    const refs=el('p',null,'sources');
    item.sources.forEach(key=>refs.append(link(...sources[key])));
    refs.append(link('Тақырыпты ашу','guide.html#'+id));
    const plan=plans.find(entry=>entry.id===item.plan||entry.topic===id);
    if(plan) refs.append(link('Қазір не істеу керек?','response.html#'+plan.id));
    bubble.append(list,refs);
  }
  async function choose(question,ids) {
    if(!endpointActive||(!geminiActive&&ids.length<2)||(challengeRequired&&!challengeToken)) return ids[0];
    const payload = { question, lang: 'kk' };
    if (challengeRequired) payload.verification = challengeToken;
    if(challengeRequired) challengeToken='';
    try {
      const ret=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(geminiActive?17000:challengeRequired?5500:3600)});
      if(!ret.ok) return ids[0];
      const data=await ret.json();
      if(data.mode!=='provider') return ids[0];
      if(data.id==='unrelated') return null;
      return topics.some(topic=>topic.id===data.id)?data.id:ids[0];
    } catch { return ids[0]; }
    finally {
      if(challengeRequired&&widgetId!==undefined) {
        $('#mode').textContent='Анықтамалық · ЖИ көмегін қосу үшін тексеруден өтіңіз';
        window.turnstile.reset(widgetId);
      }
    }
  }
  async function send(input, focusInput=true) {
    if(busy||!input.trim()) return;
    busy=true;
    const controls=[...$$('.quick button'),$('.send'),$('#reset-chat')];
    controls.forEach(button=>{button.disabled=true;});
    field.value='';
    if(messages.childElementCount>=31) messages.replaceChildren(...[...messages.children].slice(-29));
    const result=decide(input);
    message(result.state==='private'?'Сұрақта дербес деректер болуы мүмкін. Сондықтан ол көрсетілмеді.':input.trim(),'user');
    if(result.state==='match'||(geminiActive&&result.state==='unknown')) {
      const id=await choose(input.trim(),result.ids||[]);
      if(id)showTopic(id);else message(replies.unknown,'bot');
    }
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
      geminiActive=endpointActive&&status.gemini===true;
      if(geminiActive){
        const notice=el('p','Тақырыпты таңдау үшін сұрақ мәтіні Google қызметіне жіберіледі. Жеке деректеріңізді жазбаңыз.','provider-notice');
        form.before(notice);
      }
      if(endpointActive&&status.siteKey) enableVerification(status.siteKey);
      else if(geminiActive) $('#mode').textContent='Тақырыпты Gemini таңдайды · жауаптар анықтамалықтан';
      else if(endpointActive) $('#mode').textContent='ЖИ тақырыпты таңдайды · жауаптар анықтамалықтан';
    }).catch(()=>{});
  },{once:true});
}

