'use strict';
(() => {
  const current=document.documentElement.lang;
  // file: pages have opaque origins. Document transitions require a shared HTTP origin.
  if((location.protocol==='https:' || location.protocol==='http:') && 'CSSViewTransitionRule' in window){
    const sheet=document.createElement('link');
    sheet.rel='stylesheet';
    sheet.media='(prefers-reduced-motion: no-preference)';
    sheet.href=(current==='kk'?'../':'')+'assets/navigation.css';
    document.head.append(sheet);
  }
  const options=Array.from(document.querySelectorAll('.locale-option'));
  function sync(){
    for(const option of options){
      const url=new URL(option.href,location.href);
      const year=document.querySelector('#data-year');
      if(year&&year.value)url.searchParams.set('year',year.value);
      url.hash=location.hash;
      option.href=url.href;
    }
  }
  sync();
  window.addEventListener('hashchange',sync);
  for(const option of options){
    option.addEventListener('click',event=>{
      sync();
      if(option.hreflang===current){
        event.preventDefault();
        return;
      }
      try {localStorage.setItem('signal.language',option.hreflang);}catch{}
    });
  }
  // Only bare directory visits use the saved preference. Explicit links keep their language.
  if(current==='ru'&&location.pathname.endsWith('/')&&!location.hash&&!location.search){
    try{
      if(localStorage.getItem('signal.language')==='kk'){
        location.replace(new URL(options.find(item=>item.hreflang==='kk').href));
      }
    }catch{}
  }
})();

