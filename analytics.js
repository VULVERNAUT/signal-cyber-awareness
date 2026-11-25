(()=>{
  const {years,reports,categories}=window.signalResearch;
  const kk=document.documentElement.lang==='kk';
  const t=(ru,kz)=>kk?kz:ru;
  const year=$('#data-year'),metric=$('#compare-metric'),category=$('#compare-type'),query=$('#query'),group=$('#data-group');
  const numberFormat=options=>kk?kazakhNumbers(options):new Intl.NumberFormat('ru-RU',options);
  const exact=numberFormat({maximumFractionDigits:3}),short=numberFormat({maximumFractionDigits:2});
  const countLabel=y=>y<=2022?t('Пострадавшие','Жәбірленушілер'):t('Обращения','Өтініштер');
  const unavailable=t('Нет отдельной строки','Жеке санат жоқ');
  let sort='complaints',direction=-1,rank='loss';
  function shown(value,key){
    if(value==null)return unavailable;
    return exact.format(value)+(key==='loss'?' $':'');
  }
  function filtered(){
    const term=normalize(query.value),y=year.value;
    return categories.filter(c=>(group.value==='all'||c.group===group.value)&&normalize(c.label+' '+c.years[y].english).includes(term))
      .sort((a,b)=>{
        if(sort==='label')return direction*a.label.localeCompare(b.label,kk?'kk':'ru');
        const left=a.years[y][sort],right=b.years[y][sort];
        if(left==null||right==null)return Number(left==null)-Number(right==null);
        return direction*(left-right);
      });
  }
  function compare(){
    const c=categories.find(x=>x.id===category.value),key=metric.value;
    const values=years.map(y=>c.years[y][key]),max=Math.max(1,...values.filter(v=>v!=null));
    $('#compare-heading').textContent=c.label;
    const bars=$('#compare-bars');bars.replaceChildren();
    for(const [i,y] of years.entries()){
      const v=values[i],row=el('div',null,'compare-row');
      const line=el('div');line.append(el('span',String(y)),el('strong',shown(v,key)));row.append(line);
      if(v!=null){
        const meter=document.createElement('meter');meter.min=0;meter.max=max;meter.value=v;
        meter.setAttribute('aria-label',y+' · '+(key==='loss'?t('Потери','Шығын'):countLabel(y)));
        meter.setAttribute('aria-valuetext',shown(v,key));row.append(meter);
      }else row.classList.add('unreported');
      bars.append(row);
    }
    const last=years.at(-1),prev=years.at(-2),a=c.years[prev][key],b=c.years[last][key];
    const diff=b-a,sign=diff>0?'+':diff<0?'−':'';
    const trend=prev+' → '+last+': '+sign+shown(Math.abs(diff),key)+(a?' ('+sign+short.format(100*Math.abs(diff)/a)+'%)':'')+'.';
    let note='';
    if(c.id==='phishing')note=t('До 2023 года здесь только фишинг. Подмена отправителя публиковалась отдельно.','2023 жылға дейін тек фишинг көрсетілген. Жіберушіні қолдан жасау бөлек санат болған.');
    if(['card-check','data-breach','real-estate','malware'].includes(c.id))note=t('Название или охват категории менялись. Исходное название приведено в таблице за выбранный год.','Санаттың атауы немесе қамту аясы өзгерген. Түпнұсқа атауы таңдалған жылдың кестесінде берілген.');
    if(key==='complaints')note+=' '+t('До 2023 года IC3 считал пострадавших, затем — обращения.','2023 жылға дейін IC3 жәбірленушілерді, кейін өтініштерді санаған.');
    $('#compare-delta').textContent=(a!=null&&b!=null?trend+' ':'')+note.trim();
  }
  function ranking(){
    const y=year.value,ranking=$('#rank-list');
    const rows=categories.filter(c=>c.years[y][rank]!=null).sort((a,b)=>b.years[y][rank]-a.years[y][rank]).slice(0,5);
    const maximum=rows[0].years[y][rank];ranking.replaceChildren();
    $('#rank-unit').textContent=y+' · '+(rank==='loss'?t('потери, долл. США','шығын, АҚШ доллары'):countLabel(y))+' · '+t('среди выбранных тем','таңдалған тақырыптар арасында');
    for(const c of rows){
      const value=c.years[y][rank];
      const a=link('', '#category-compare','rank-item');
      const header=el('span',null,'rank-caption');
      const suffix=rank==='loss'&&value>=1e9?t(' млрд $',' млрд $'):rank==='loss'&&value>=1e6?t(' млн $',' млн $'):'';
      const formatted=suffix?short.format(value/(value>=1e9?1e9:1e6))+suffix:shown(value,rank);
      header.append(el('span',c.label),el('strong',formatted));
      a.setAttribute('aria-label',c.label+' · '+shown(value,rank)+' · '+t('Сравнить по годам','Жылдар бойынша салыстыру'));
      const bar=document.createElement('progress');bar.max=maximum;bar.value=value;bar.setAttribute('aria-hidden','true');
      a.append(header,bar);a.addEventListener('click',()=>{
        category.value=c.id;metric.value=rank;compare();$('#category-title').focus({preventScroll:true});
      });ranking.append(a);
    }
    $$('[data-rank]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rank===rank)));
  }
  function table(){
    const y=year.value,rows=filtered(),body=$('#data-rows');body.replaceChildren();
    for(const c of rows){
      const v=c.years[y],row=el('tr'),label=el('th',c.label);label.scope='row';
      label.append(el('span',v.english||unavailable));row.append(label,el('td',v.complaints==null?'—':exact.format(v.complaints)),el('td',v.loss==null?'—':exact.format(v.loss)));body.append(row);
    }
    if(!rows.length){const row=el('tr'),td=el('td',t('Совпадений нет. Измените запрос или группу.','Ештеңе табылмады. Сұрауды немесе топты өзгертіңіз.'));td.colSpan=3;row.append(td);body.append(row);}
    $('#table-status').textContent=y+' · '+t('Показано тем: ','Көрсетілген тақырыптар: ')+rows.length+' / '+categories.length;
    $('#export').disabled=!rows.length;
    for(const th of $$('[data-head]')){
      const active=th.dataset.head===sort;
      if(active)th.setAttribute('aria-sort',direction>0?'ascending':'descending');else th.removeAttribute('aria-sort');
      th.querySelector('span').textContent=active?(direction>0?'↑':'↓'):'↕';
    }
    $('[data-head="complaints"] .sort-label').textContent=countLabel(y);
  }
  function selectYear(){
    const y=year.value,r=reports[y];$('#total-count').textContent=exact.format(r.totalComplaints);
    $('#total-loss').textContent=exact.format(r.lossBillions)+' млрд $';$('#year-insight').textContent=r.insight;
    $('#table-year').textContent=y;$$('[data-chart-year]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chartYear===y)));ranking();table();
  }
  $$('[data-chart-year]').forEach(b=>b.addEventListener('click',()=>{year.value=b.dataset.chartYear;selectYear();}));
  $$('[data-rank]').forEach(b=>b.addEventListener('click',()=>{rank=b.dataset.rank;ranking();}));
  $$('[data-sort]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.sort;direction=k===sort?-direction:k==='label'?1:-1;sort=k;table();}));
  $('#export').addEventListener('click',()=>{
    const y=year.value;
    const records=[[t('Год','Жыл'),t('Категория','Санат'),t('Оригинальное название','Түпнұсқа атауы'),countLabel(y),t('Потери, долл. США','Шығын, АҚШ доллары')],...filtered().map(c=>{const v=c.years[y];return [y,c.label,v.english,v.complaints??'',v.loss??''];})];
    const csv='\ufeff'+records.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=link('CSV',url);a.download='signal-ic3-'+y+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  year.addEventListener('change',selectYear);group.addEventListener('change',table);query.addEventListener('input',table);
  [metric,category].forEach(x=>x.addEventListener('change',compare));selectYear();compare();
})();
