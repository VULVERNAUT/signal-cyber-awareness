(()=>{
  const dataset=window.signalResearch;
  if(!dataset)return;
  const {years,reports,categories}=dataset;
  const year=$('#data-year'),metric=$('#compare-metric'),category=$('#compare-type'),body=$('#data-rows'),query=$('#query'),group=$('#data-group');
  let sort='complaints',direction=-1;
  const num=new Intl.NumberFormat('ru-RU');
  const percent=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
  function refreshGraph(){
    const selected=categories.find(c=>c.id===category.value);
    const key=metric.value;const isLoss=key==='loss';
    const values=years.map(y=>selected.years[y][key]);
    $('#compare-heading').textContent=selected.label;
    const bars=$('#compare-bars');bars.replaceChildren();
    const max=Math.max(...values,1);
    for(const [i,y] of years.entries()){
      const row=el('div',null,'compare-row');
      const caption=el('div');caption.append(el('span',String(y)),el('strong',num.format(values[i])+(isLoss?' $':'')));
      const meter=document.createElement('meter');meter.min=0;meter.max=max;meter.value=values[i];meter.setAttribute('aria-label',y+' — '+metric.selectedOptions[0].text);
      row.append(caption,meter);bars.append(row);
    }
    const diff=values[1]-values[0];
    $('#compare-delta').textContent=diff===0?'За два года показатель не изменился.':
      (isLoss?'Заявленные потери':'Число обращений')+' в '+years[1]+' году '+(diff>0?'выше':'ниже')+' на '+num.format(Math.abs(diff))+(isLoss?' $':'')+
      (values[0]?' ('+percent.format(100*Math.abs(diff)/values[0])+'%).':'.');
  }
  function currentRows(){
    const term=normalize(query.value);
    return categories.filter(c=>(group.value==='all'||c.group===group.value)&&normalize(c.label+' '+c.years[year.value].english).includes(term))
      .sort((a,b)=>direction*(sort==='label'?a.label.localeCompare(b.label,'ru'):a.years[year.value][sort]-b.years[year.value][sort]));
  }
  function refresh(){
    const chosen=year.value,report=reports[chosen],rows=currentRows();
    $('#total-count').textContent=num.format(report.totalComplaints);
    $('#total-loss').textContent=num.format(report.lossBillions)+' млрд $';
    $('#year-insight').textContent=report.insight;
    body.replaceChildren();
    for(const c of rows){
      const v=c.years[chosen],row=el('tr'),label=el('th',c.label);label.scope='row';
      label.append(el('span',v.english));row.append(label,el('td',num.format(v.complaints)),el('td',num.format(v.loss)));body.append(row);
    }
    if(!rows.length){const row=el('tr'),td=el('td','Совпадений нет. Измените запрос или группу.');td.colSpan=3;row.append(td);body.append(row);}
    $('#table-status').textContent=chosen+' год · Показано '+rows.length+' из '+categories.length+' категорий';
    $('#export').disabled=rows.length===0;
    for(const th of $$('[data-head]')){
      const active=th.dataset.head===sort;
      if(active)th.setAttribute('aria-sort',direction>0?'ascending':'descending');
      else th.removeAttribute('aria-sort');
      th.querySelector('span').textContent=active?(direction>0?'↑':'↓'):'↕';
    }
  }
  for(const b of $$('[data-sort]'))b.addEventListener('click',()=>{
    const k=b.dataset.sort;direction=k===sort?-direction:(k==='label'?1:-1);sort=k;refresh();
  });
  $('#export').addEventListener('click',()=>{
    const chosen=year.value;
    const records=[['Год','Категория','Оригинальное название','Обращения','Потери, долл. США'],...currentRows().map(c=>{
      const v=c.years[chosen];return [chosen,c.label,v.english,v.complaints,v.loss];
    })];
    const csv='\ufeff'+records.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=link('CSV',url);a.download='signal-ic3-'+chosen+'.csv';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  [metric,category].forEach(x=>x.addEventListener('change',refreshGraph));
  [year,group].forEach(x=>x.addEventListener('change',refresh));query.addEventListener('input',refresh);
  refreshGraph();refresh();
})();

