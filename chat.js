'use strict';
(() => {
  const form=document.querySelector('#chat-form');
  if(!form)return;
  const lang=document.documentElement.lang==='kk'?'kk':'ru';
  const kk=lang==='kk';
  const say=(ru,kz)=>kk?kz:ru;
  const field=$('#question'), messages=$('#messages'), mode=$('#mode');
  const resizeButton=dialog.querySelector('.chat-resize');
  if(resizeButton){
    const expandLabel=resizeButton.getAttribute('aria-label');
    resizeButton.addEventListener('click',()=>{
      const atBottom=messages.scrollHeight-messages.clientHeight-messages.scrollTop<=2;
      const expanded=dialog.classList.toggle('is-expanded');
      const label=expanded?say('Вернуть обычный размер','Бастапқы өлшемге қайтару'):expandLabel;
      resizeButton.setAttribute('aria-label',label);
      resizeButton.title=label;
      if(atBottom)messages.scrollTop=messages.scrollHeight;
    });
  }
  let active=false, gemini=false, busy=false, challenge='', widget=null, verification=false, continuation='';
  let lastRoutes=[];
  let retryButton=null;
  const navigation=window.signalNav;
  const response={
    private:say('Уберите из вопроса личные данные, пароли и коды подтверждения.','Сұрағыңыздан дербес деректерді, құпиясөздер мен растау кодтарын алып тастаңыз.'),
    denied:say('Я могу объяснить принцип угрозы и помочь с защитой, обнаружением или восстановлением доступа.','Қатердің қалай жұмыс істейтінін түсіндіріп, одан қорғануға, оны анықтауға немесе аккаунтты қалпына келтіруге көмектесемін.'),
    unknown:say('Пока не удалось подобрать тему. Что произошло? Например, напишите «пришла ссылка на оплату» или выберите раздел ниже.','Әзірге сәйкес тақырып табылмады. Не болды? Мысалы, «төлем жасауға сілтеме келді» деп жазыңыз немесе төмендегі бөлімді таңдаңыз.'),
    length:say('Введите от 1 до 1200 символов.','Сұрағыңыз 1–1200 таңбадан тұруы керек.')
  };
  function bubble(value,who='bot'){
    const node=el('div', value, 'bubble '+who);messages.append(node);return node;
  }
  function greeting(){
    return gemini?say('Что хотите узнать об информационной безопасности? Можем разобрать конкретный случай или обсудить, как устроена технология.','Ақпараттық қауіпсіздік туралы не білгіңіз келеді? Нақты жағдайды талдай аламыз немесе технологияның қалай жұмыс істейтінін талқылаймыз.'):say('Здравствуйте! Я помогу найти ответ в справочнике «Сигнала». Опишите ситуацию или выберите один из вопросов ниже.','Сәлеметсіз бе! «Сигнал» анықтамалығынан жауап табуға көмектесемін. Жағдайды сипаттаңыз немесе төмендегі сұрақтардың бірін таңдаңыз.');
  }
  function guidePrompt(question){
    const words=question.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    const salutation=/^(?:привет(?:ик|ствую)?|здравствуй(?:те)?|доброе утро|добрый (?:день|вечер)|с[әа]лем(?:етсіз(?:дер)? бе)?|сәлеметсің бе|қайырлы (?:таң|күн|кеш)|ассалаумағалейкум|hello|hi)(?: |$)/u;
    const remainder=words.replace(salutation,'');
    if(remainder!==words&&/^(?:|всем|бот|помощник|сигнал|көмекші)$/u.test(remainder)){
      return say('Привет! Что у вас случилось? Могу подсказать, как проверить подозрительную ссылку, защитить аккаунт или пройти практикум.','Сәлем! Не болды? Күмәнді сілтемені тексеру, аккаунтты қорғау немесе практикумға өту жолын көрсете аламын.');
    }
    if(/^(?:помощь|что (?:ты |вы )?(?:умеешь|умеете|можешь|можете)|чем (?:ты |вы )?(?:можешь|можете) помочь|как (?:ты |вы )?(?:работаешь|работаете)|кто ты|не істей аласың|не істей аласыз|қалай көмектесе аласың|қалай көмектесе аласыз|көмек)$/u.test(remainder)){
      return say('Я подбираю материалы сайта по вашей ситуации. Могу открыть карточку угрозы, найти первые шаги после инцидента или показать тренировку.','Жағдайыңызға сай сайт материалдарын табамын. Қатер туралы карточканы, оқиғадан кейінгі алғашқы қадамдарды немесе жаттығуды көрсете аламын.');
    }
    return response.unknown;
  }
  function reset(){continuation='';lastRoutes=[];retryButton=null;messages.replaceChildren();bubble(greeting());}
  function label(){
    mode.textContent=verification&&!challenge?say('Для ИИ нужна проверка','ЖИ үшін тексеруден өтіңіз'):gemini?say('Gemini · ИИ-ассистент','Gemini · ЖИ көмекші'):active?say('Подбор темы с ИИ','Тақырыпты ЖИ таңдайды'):say('Режим справочника','Анықтамалық режимі');
  }
  function verify(siteKey){
    verification=true;
    const holder=el('div',null,'chat-verification');form.before(holder);
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.onload=()=>{if(window.turnstile)widget=window.turnstile.render(holder,{
      sitekey:siteKey,action:'signal_assistant',language:kk?'auto':'ru',theme:'dark',size:'flexible',appearance:'interaction-only',
      callback:token=>{challenge=token;label();},'expired-callback':()=>{challenge='';label();},
      'error-callback':()=>{challenge='';label();return true;}
    });};
    document.head.append(script);
  }
  function renderCard(id){
    const t=topics.find(item=>item.id===id);
    if(!t){bubble(response.unknown);return;}
    const container=bubble(null);
    container.append(el('strong',t.title),el('p',t.lead));
    const list=el('ol');t.steps.forEach(step=>list.append(el('li',step)));
    const refs=el('p',null,'sources');t.sources.forEach(key=>refs.append(link(...sources[key])));
    refs.append(link(say('Открыть карточку','Тақырыпты ашу'),'guide.html#'+t.id));
    const plan=plans.find(p=>p.id===t.plan||p.topic===id);
    if(plan)refs.append(link(say('Что делать сейчас','Қазір не істеу керек?'),'response.html#'+plan.id));
    container.append(list,refs);
  }
  function destinations(container,ids,question){
    const routes=ids.filter(id=>Object.hasOwn(navigation.entries,id)).slice(0,2);
    if(routes.length){
      const refs=el('p',null,'sources');
      for(const id of routes){
        const item=navigation.entries[id];
        let href=item.href;
        const years=question?.match(/\b20(?:20|21|22|23|24|25)\b/g)||[];
        if(years.length===1&&['table','charts','data'].includes(id))href=href.replace('data.html','data.html?year='+years[0]);
        const a=link(item.label,href);
        a.addEventListener('click',()=>dialog.close());refs.append(a);
      }
      container.append(refs);
    }
    lastRoutes=routes;
  }
  function renderAnswer(data,question){
    const container=bubble(null);
    container.append(el('strong',data.mode==='sources'?say('Поиск по источникам','Дереккөздерден іздеу'):say('Ответ Gemini','Gemini жауабы')));
    const body=el('p',data.answer.replace(/\*\*([^*]+)\*\*/g,'$1'),'generated-answer');
    container.append(body);
    destinations(container,data.routes||[],question);
    if(data.references?.length){
      const refs=el('p',null,'sources');
      for(const source of data.references){
        const publisher=window.signalPublisher(source.url);
        if(!publisher || typeof source.title!=='string')continue;
        const item=link(publisher+' · '+source.title,source.url);
        item.target='_blank';item.rel='noopener noreferrer';
        refs.append(item);
      }
      container.append(refs);
    }
  }
  const isStatic=location.protocol==='file:'||/\.(github\.io|chatgpt\.site)$/.test(location.hostname);
  async function detect(){
    if(isStatic)return;
    try{
      const ret=await fetch('/api/status',{signal:AbortSignal.timeout(2200)});
      if(!ret.ok||!ret.headers.get('content-type')?.includes('application/json'))return;
      const status=await ret.json();
      active=status.provider===true;gemini=active&&status.gemini===true;
      if(status.siteKey&&active)verify(status.siteKey);
      if(gemini){
        const note=$('.chat-note');
        note.prepend(document.createTextNode(say('Диалог передаётся Google. При поиске тема запроса передаётся выбранным официальным источникам. В ответе появятся ссылки на найденные публикации. ','Диалог Google қызметіне жіберіледі. Іздеу кезінде сұрау тақырыбы таңдалған ресми дереккөздерге жіберіледі. Жауапта табылған жарияланымдарға сілтемелер беріледі. ')));
        const about=$('.chat-side p');
        if(about)about.textContent=say('Gemini формулирует ответ на ваш вопрос и учитывает уточнения в этом диалоге. Подходящие материалы справочника можно открыть отдельно.','Gemini сұрағыңызға жауап құрастырады және осы әңгімедегі нақтылауларыңызды ескереді. Байланысты материалдарды анықтамалықтан бөлек аша аласыз.');
        const quick=$$('.quick button');
        const examples=kk?['Хэштеу мен шифрлаудың айырмашылығы неде?','Үй желісінде қонақтарға бөлек Wi-Fi не үшін керек?','Қазақстанда фишинг туралы ресми дереккөздерді тап']:['Чем хеширование отличается от шифрования?','Зачем дома отдельный Wi-Fi для гостей?','Найди официальные источники о фишинге в Казахстане'];
        quick.forEach((button,index)=>{if(examples[index])button.textContent=examples[index];});
      }
      label();if(messages.childElementCount===1)messages.firstChild.textContent=greeting();
    }catch{}
  }
  reset();
  const ready=detect();
  function offerRetry(question,reason){
    if(reason==='expired'){
      continuation='';lastRoutes=[];
      bubble(say('Срок хранения контекста истёк или сервер перезапустился. Отправьте предыдущий вопрос и свой ответ одним сообщением, чтобы продолжить разбор.','Әңгімені сақтау мерзімі аяқталды немесе сервер қайта іске қосылды. Талдауды жалғастыру үшін алдыңғы сұрақ пен жауабыңызды бір хабарламаға жазыңыз.'));
      return;
    }
    let notice=say('Не удалось получить ответ Gemini.','Gemini-ден жауап алу мүмкін болмады.');
    if(reason==='quota')notice=say('Gemini сообщил о лимите запросов.','Gemini сұраулар шегіне жеткенін хабарлады.');
    if(reason==='limit')notice=say('Достигнут лимит запросов демонстрации.','Демонстрациядағы сұраулар шегіне жеттіңіз.');
    if(reason==='verification')notice=say('Для ответа Gemini пройдите проверку в окне чата.','Gemini жауап беруі үшін чаттағы тексеруден өтіңіз.');
    const container=bubble(continuation?notice+say(' Можно повторить эту реплику в том же диалоге.',' Осы хабарламаны сол әңгімеде қайта жіберуге болады.'):notice);
    const action=el('button',say('Повторить отправку','Қайта жіберу'),'chip');
    action.type='button';
    action.addEventListener('click',()=>{void send(question,false,container);});
    retryButton=action;
    const controls=el('p',null,'sources');controls.append(action);container.append(controls);
    if(!continuation){
      const routes=navigation.suggested(question);
      if(routes.length)destinations(container,routes,question);
    }
  }
  async function send(question,focus=true,retryNotice=null){
    question=question.trim();
    if(busy||!question)return;
    busy=true;
    retryButton?.remove();retryButton=null;
    retryNotice?.remove();
    const buttons=[...$$('.quick button'),$('.send'),$('#reset-chat')];
    buttons.forEach(b=>{b.disabled=true;});
    const result=decide(question);
    if(messages.childElementCount>=31)messages.replaceChildren(...[...messages.children].slice(-27));
    if(!retryNotice){
      field.value='';
      bubble(result.state==='private'?say('Вопрос скрыт из-за возможных личных данных.','Сұрақта жеке деректер болуы мүмкін, сондықтан ол жасырылды.'):question,'user');
    }
    let pending=null, attempted=false;
    try{
      if(!['match','unknown'].includes(result.state)){bubble(response[result.state]);return;}
      await ready;
      const id=result.ids?.[0];
      if(gemini&&verification&&!challenge){offerRetry(question,'verification');return;}
      if(active&&(gemini||(result.ids?.length||0)>1)&&(!verification||challenge)){
        pending=bubble(say('Готовлю ответ…','Жауап дайындап жатырмын…'));messages.scrollTop=messages.scrollHeight;
        const body={question,lang,conversation:continuation,page:document.body.dataset.page};
        if(verification){body.verification=challenge;challenge='';}
        attempted=true;
        let data=null;
        try{
          const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(gemini?40500:6500)});
          if(r.ok)data=await r.json();
        }catch{}
        pending.remove();pending=null;
        if(['gemini','sources'].includes(data?.mode)&&typeof data.answer==='string'){
          continuation=data.conversation;renderAnswer(data,question);return;
        }
        if(data?.mode==='provider'&&data.id){renderCard(data.id);return;}
        if(gemini){offerRetry(question,data?.reason);return;}
      }
      const routes=navigation.suggested(question,lastRoutes);
      if(routes.length){
        const item=navigation.entries[routes[0]];
        const result=bubble(item.detail||say('Откройте раздел «','«')+item.label+say('».','» бөлімін ашыңыз.'));
        destinations(result,routes,question);
      }else{
        lastRoutes=[];
        if(id)renderCard(id);
        else destinations(bubble(guidePrompt(question)),['guide','lab'],question);
      }
    }finally{
      pending?.remove();
      if(attempted&&verification&&widget!==null){window.turnstile.reset(widget);label();}
      buttons.forEach(b=>{b.disabled=false;});busy=false;
      messages.scrollTop=messages.scrollHeight;
      if(dialog.open)(focus?field:messages).focus({preventScroll:true});
    }
  }
  form.addEventListener('submit',e=>{e.preventDefault();void send(field.value);});
  $$('.quick button').forEach(b=>b.addEventListener('click',()=>void send(b.textContent,false)));
  $('#reset-chat').addEventListener('click',()=>{reset();field.focus();});
  if(location.hash==='#chat'&&document.body.dataset.page==='assistant')openers[0]?.click();
})();
