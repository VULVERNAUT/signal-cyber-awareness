'use strict';
(() => {
  const current=document.documentElement.lang;
  // Keep the browser's normal navigation, focus, anchor jumps and back/forward restoration.
  const entry=performance.getEntriesByType('navigation')[0];
  if(entry?.type==='navigate' && !location.hash && /^https?:$/.test(location.protocol) && document.referrer){
    try{
      if(new URL(document.referrer).origin===location.origin)
        document.documentElement.classList.add('page-arrived');
    }catch{}
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

