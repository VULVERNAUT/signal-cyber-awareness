(()=>{
  const picker=document.getElementById('course-picker');
  if(!picker) return;
  const {scenarios,scenarioMeta,topics,sources}=window.signal;
  const panel=document.getElementById('exercise');
  const names={quick:'Быстрый раунд',messages:'Сообщения и звонки',accounts:'Аккаунты',devices:'Устройства',money:'Деньги и покупки'};
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
  function button(label,css,fn){
    const b=el('button',label,css);b.type='button';b.addEventListener('click',fn);return b;
  }
  function start(id,items){
    route=id;run=items;position=score=0;misses=[];answered=false;
    picker.hidden=true;panel.hidden=false;render();
  }
  function exit(){
    panel.hidden=true;picker.hidden=false;
    picker.querySelector('[data-route="'+route+'"]')?.focus();
    if(location.hash.startsWith('#practice-')) history.replaceState(null,'',location.pathname+location.search);
  }
  function render(){
    answered=false;
    panel.replaceChildren();
    const bar=el('div',null,'round-head');
    bar.append(el('strong',names[route],'kicker'),button('К выбору темы','chip',exit));
    panel.append(bar);
    if(position===run.length){
      const h=el('h2','Верных решений — '+score+' из '+run.length);h.tabIndex=-1;
      panel.append(h);
      if(misses.length){
        panel.append(el('h3','Что повторить'));
        const ul=el('ul',null,'review-topics');
        for(const id of new Set(misses.map(item=>item[5]))){
          const t=topics.find(topic=>topic.id===id);const li=el('li');li.append(link(t.title,'guide.html#'+id));ul.append(li);
        }
        panel.append(ul,button('Повторить ошибки','button primary',()=>start(route,[...misses])));
      }else{
        panel.append(el('p','Вы выбрали безопасное действие в каждой ситуации.'),button('Выбрать другую тему','button primary',exit));
      }
      h.focus();return;
    }
    const item=run[position];
    const [name,question,options,correct,explanation,topic]=item;
    const h=el('h2',name);h.tabIndex=-1;
    const progress=el('progress');progress.max=run.length;progress.value=position;progress.setAttribute('aria-label','Завершено заданий');
    panel.append(el('p','Задание '+(position+1)+' из '+run.length,'round-count'),progress,h,el('p',question));
    const answers=el('div',null,'choices');panel.append(answers);
    options.forEach((s,i)=>{
      const choice=button(s,'choice',()=>{
        if(answered) return;
        answered=true;
        if(i===correct)score++;else misses.push(item);
        progress.value=position+1;
        Array.from(answers.children).forEach((a,j)=>{a.disabled=true;a.classList.toggle('correct',j===correct);a.classList.toggle('incorrect',j===i&&j!==correct);});
        const feedback=el('div',null,'feedback');
        const title=el('strong',i===correct?'Верно':'Безопасное действие — вариант '+String.fromCharCode(1040+correct));title.tabIndex=-1;
        const refs=el('div',null,'sources');
        for(const key of scenarioMeta[name].sources)refs.append(link(...sources[key]));
        feedback.append(title,el('p',explanation),link('Карточка угрозы','guide.html#'+topic,'text-link'),refs);
        panel.append(feedback,button(position+1===run.length?'Посмотреть результат':'Дальше','button primary',()=>{position++;render();}));
        title.focus();
      });
      choice.prepend(el('span',String.fromCharCode(1040+i)));answers.append(choice);
    });
    h.focus();
  }
  function openRoute(id){
    if(!Object.hasOwn(names,id))return;
    start(id,id==='quick'?quickRound():shuffled(buckets[id]));
  }
  for(const b of picker.querySelectorAll('[data-route]'))b.addEventListener('click',()=>openRoute(b.dataset.route));
  if(location.hash.startsWith('#practice-'))openRoute(location.hash.slice(10));
  window.addEventListener('hashchange',()=>{
    if(location.hash.startsWith('#practice-')) openRoute(location.hash.slice(10));
    else if(!location.hash){panel.hidden=true;picker.hidden=false;}
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
    if(!selected.some(Boolean)){result.textContent='Сначала выберите хотя бы один фрагмент.';return;}
    const right=selected.every((on,i)=>on===(i>=2));
    fragments.forEach((f,i)=>{f.classList.toggle('clue-correct',i>=2&&selected[i]);f.classList.toggle('clue-missed',i>=2&&!selected[i]);});
    result.replaceChildren(el('strong',right?'Вы нашли оба признака.':'Проверьте две последние фразы.'),el('p','Угроза отмены торопит с решением. Просьба ввести карту через ссылку переносит оплату за пределы знакомого приложения. Откройте заказ самостоятельно и сверьте сумму.'),link(...sources.ftc));
  });
})();

