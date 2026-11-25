'use strict';
(() => {
  const current=document.documentElement.lang;
  const options=Array.from(document.querySelectorAll('.locale-option'));
  function sync(){
    for(const option of options){
      const url=new URL(option.href,location.href);
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

