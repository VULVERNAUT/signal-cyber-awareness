(()=>{
  const picker=document.getElementById('course-picker');
  if(!picker) return;
  const {scenarios,scenarioMeta,topics,sources}=window.signal;
  const panel=document.getElementById('exercise');
  const names = { quick: 'Жылдам раунд', messages: 'Хабарламалар мен қоңыраулар', accounts: 'Аккаунттар', devices: 'Құрылғылар', money: 'Ақша және сауда' };
  names.quick = picker.querySelector('.practice-quick h2')?.textContent.trim() || names.quick;
  for (const button of picker.querySelectorAll('.practice-route[data-route]')) {
    const label = button.querySelector('strong')?.textContent.trim();
    if (label) names[button.dataset.route] = label;
  }
  const answerLabel = index => 'АӘБВГҒДЕ'[index] || number.format(index + 1);
  const buckets=Object.fromEntries(Object.keys(names).filter(id=>id!=='quick').map(id=>[id,scenarios.filter(([name])=>scenarioMeta[name].group===id)]));
  function shuffled(items){
    const copy=[...items];
    for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
    return copy;
  }
  function quickRound(){
    const first=Object.values(buckets).flatMap(pool=>shuffled(pool).slice(0,1));
    const rest=shuffled(scenarios.filter(s=>!first.includes(s)));
    return shuffled([...first,...rest.slice(0,5-first.length)]);
  }
  let run=[],position=0,score=0,misses=[],route='quick',answered=false;
  let picks=[];
  const transfer=window.signalPracticeState?.create(scenarios,scenarioMeta,Object.keys(buckets));
  function remember(){transfer?.write(route,run,position,picks);}
  function button(label,css,fn){
    const b=el('button',label,css);b.type='button';b.addEventListener('click',fn);return b;
  }
  function start(id,items,restored){
    route=id;run=items;position=restored?.position??0;score=0;misses=[];answered=false;
    picks=restored?.answers??[];
    for(let i=0;i<position;i++){
      if(picks[i]===run[i][3]) score++; else misses.push(run[i]);
    }
    picker.hidden=true;panel.hidden=false;render();
  }
  function exit(){
    panel.hidden=true;picker.hidden=false;
    transfer?.clear();
    const group=topics.find(topic=>'topic-'+topic.id===route)?.group||route;
    picker.querySelector('[data-route="'+group+'"]')?.focus();
    if(location.hash.startsWith('#practice-')) history.replaceState(null,'',location.href.split('#')[0]);
  }
  function render(){
    answered=false;
    remember();
    panel.replaceChildren();
    const bar=el('div',null,'round-head');
    const routeTitle=names[route]||topics.find(topic=>'topic-'+topic.id===route)?.title;
    bar.append(el('strong',routeTitle,'kicker'),button('Тақырып таңдауға оралу','chip',exit));
    panel.append(bar);
    if(position===run.length){
      const h=el('h2','Дұрыс жауаптар: '+number.format(score)+' / '+number.format(run.length));h.tabIndex=-1;
      panel.append(h);
      if(misses.length){
        panel.append(el('h3','Қайталауға арналған тақырыптар'));
        const ul=el('ul',null,'review-topics');
        for(const id of new Set(misses.map(item=>item[5]))){
          const t=topics.find(topic=>topic.id===id);const li=el('li');li.append(link(t.title,'guide.html#'+id));ul.append(li);
        }
        panel.append(ul,button('Қате кеткен тапсырмаларды қайталау','button primary',()=>start(route,[...misses])));
      }else{
        panel.append(el('p','Барлық жағдайда қауіпсіз әрекетті таңдадыңыз.'),button('Басқа тақырыпты таңдау','button primary',exit));
      }
      h.focus();return;
    }
    const item=run[position];
    const [name,question,options,correct,explanation,topic]=item;
    const h=el('h2',name);h.tabIndex=-1;
    const progress=el('progress');progress.max=run.length;progress.value=position;progress.setAttribute('aria-label','Орындалған тапсырмалар');
    panel.append(el('p','Тапсырма '+number.format(position+1)+' / '+number.format(run.length),'round-count'),progress,h,el('p',question));
    const answers=el('div',null,'choices');panel.append(answers);
    options.forEach((s,i)=>{
      const choice=button(s,'choice',()=>{
        if(answered) return;
        answered=true;
        if(picks.length===position) picks.push(i);
        remember();
        if(i===correct)score++;else misses.push(item);
        progress.value=position+1;
        Array.from(answers.children).forEach((a,j)=>{a.disabled=true;a.classList.toggle('correct',j===correct);a.classList.toggle('incorrect',j===i&&j!==correct);});
        const feedback=el('div',null,'feedback');
        const title=el('strong',i===correct?'Дұрыс жауап':'Қауіпсіз әрекет — '+answerLabel(correct)+' нұсқасы');title.tabIndex=-1;
        const refs=el('div',null,'sources');
        for(const key of scenarioMeta[name].sources)refs.append(link(...sources[key]));
        feedback.append(title,el('p',explanation),link('Қатер туралы анықтама','guide.html#'+topic,'text-link'),refs);
        panel.append(feedback,button(position+1===run.length?'Нәтижені көру':'Келесі тапсырма','button primary',()=>{position++;render();}));
        title.focus();
      });
      choice.prepend(el('span',answerLabel(i)));answers.append(choice);
    });
    if(picks.length>position) answers.children[picks[position]].click();
    else h.focus();
  }
  function openRoute(id){
    if(id.startsWith('topic-')){
      const matches=scenarios.filter(item=>item[5]===id.slice(6));
      if(matches.length) start(id,shuffled(matches));
      return;
    }
    if(!Object.hasOwn(names,id))return;
    start(id,id==='quick'?quickRound():shuffled(buckets[id]));
  }
  for(const b of picker.querySelectorAll('[data-route]'))b.addEventListener('click',()=>openRoute(b.dataset.route));
  const restored=transfer?.read();
  if(restored) start(restored.route,restored.run,restored);
  else if(location.hash.startsWith('#practice-')) openRoute(location.hash.slice(10));
  window.addEventListener('hashchange',()=>{
    if(location.hash.startsWith('#practice-')) openRoute(location.hash.slice(10));
    else if(!location.hash){panel.hidden=true;picker.hidden=false;transfer?.clear();}
  });
  const fragments=Array.from(document.querySelectorAll('[data-clue]'));
  const check=document.getElementById('grade-clues');
  const result=document.getElementById('clue-result');
  for(const b of fragments)b.addEventListener('click',()=>{
    b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));result.replaceChildren();
    for(const f of fragments)f.classList.remove('clue-missed','clue-correct');
  });
  check.addEventListener('click',()=>{
    const selected=fragments.map(b=>b.getAttribute('aria-pressed')==='true');
    if(!selected.some(Boolean)){result.textContent='Алдымен хабарламаның кемінде бір бөлігін таңдаңыз.';return;}
    const right=selected.every((on,i)=>on===(i>=2));
    fragments.forEach((f,i)=>{f.classList.toggle('clue-correct',i>=2&&selected[i]);f.classList.toggle('clue-missed',i>=2&&!selected[i]);});
    result.replaceChildren(el('strong',right?'Екі белгіні де таптыңыз.':'Соңғы екі сөйлемге назар аударыңыз.'),el('p','Тапсырыстың күшін жоямыз деген сөз сізді асықтырады. Карта деректерін хабарламадағы сілтеме арқылы енгізсеңіз, төлемді өзіңіз білетін қолданбадан тыс жерде жасайсыз. Жеткізу қолданбасын өзіңіз ашып, тапсырыстағы соманы тексеріңіз.'),link(...sources.ftc));
  });
})();

