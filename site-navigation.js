'use strict';
(function(){
  function create(catalog,lang){
    const kk=lang==='kk',t=(ru,kz)=>kk?kz:ru;
    const entries={};
    const put=(id,label,href,detail='')=>{entries[id]={id,label,href,detail};};
    const {scenarios,scenarioMeta,topics,plans}=catalog;
    put('home',t('Главная','Басты бет'),'index.html',t('Три видеоистории с озвучкой и субтитрами.','Дыбысталған және субтитрі бар үш бейне оқиға.'));
    put('lab',t('Практикум','Практикум'),'lab.html',t('В практикуме '+scenarios.length+' ситуаций. Выберите тематический или смешанный раунд, ответьте и прочитайте разбор. В конце можно повторить ошибки.','Практикумда '+scenarios.length+' жағдай бар. Тақырыптық немесе аралас раундты таңдап, жауап пен түсіндірмені қараңыз. Соңында қателескен тапсырмаларды қайталауға болады.'));
    put('quick',t('Начать быстрый раунд','Жылдам раундты бастау'),'lab.html#practice-quick',t('Пять ситуаций из разных тем.','Әртүрлі тақырыптағы бес жағдай.'));
    const names={messages:t('Сообщения и звонки','Хабарламалар мен қоңыраулар'),accounts:t('Аккаунты','Аккаунттар'),devices:t('Устройства','Құрылғылар'),money:t('Деньги и покупки','Ақша және сатып алу')};
    for(const [key,name] of Object.entries(names)){
      const n=scenarios.filter(([title])=>scenarioMeta[title].group===key).length;
      put('round-'+key,name,'lab.html#practice-'+key,t('Тематический раунд, заданий: ','Тақырыптық раунд, тапсырмалар саны: ')+n);
    }
    put('clues',t('Найти признаки обмана в SMS','SMS-тен алаяқтық белгілерін табу'),'lab.html#investigation-title');
    put('guide',t('Справочник угроз','Қатерлер анықтамалығы'),'guide.html',t('Поиск, фильтры и '+topics.length+' карточки угроз.','Іздеу, сүзгілер және '+topics.length+' қатер карточкасы.'));
    put('sources',t('Официальные источники','Ресми дереккөздер'),'guide.html#sources');
    put('response',t('После инцидента','Оқиғадан кейін'),'response.html',t('Пять планов первых действий после инцидента.','Оқиғадан кейінгі алғашқы әрекеттерге арналған бес жоспар.'));
    put('data',t('Данные FBI IC3','FBI IC3 деректері'),'data.html',t('Годовые итоги, графики и таблицы по выбранным категориям; отчёты IC3 охватывают разные страны.','Жылдық қорытынды, графиктер және таңдалған санаттар кестесі; IC3 есептері түрлі елдерді қамтиды.'));
    put('charts',t('Графики потерь','Шығын графиктері'),'data.html#loss-charts');
    put('table',t('Таблица и выгрузка CSV','Кесте және CSV жүктеу'),'data.html#records-title');
    put('assistant',t('О помощнике','Көмекші туралы'),'assistant.html');
    for(const [key,name] of [['delivery',t('Доплата за посылку','Сәлемдеме үшін қосымша ақы')],['code',t('Назовите код','Кодты айтыңыз')],['link',t('Ссылка на фото','Фотосурет сілтемесі')]])put('film-'+key,name,'index.html#film-'+key);
    for(const p of plans)put('plan-'+p.id,p.label,'response.html#'+p.id);
    for(const topic of topics)put('topic-'+topic.id,topic.title,'guide.html#'+topic.id);
    return entries;
  }
  function suggested(question,previous=[]){
    const q=question.toLowerCase().replaceAll('ё','е');
    const onsite=/(?:на (?:самом )?сайте|ваш(?:ем|его)? (?:сайт|проект)|эт(?:ого|ом) сайт|на платформе|здесь|тут|где (?:на|можно|найти|посмотр)|сайтта|сайттағы|осы сайт|қайдан|қай бөлім)/u.test(q);
    if(/(?:практикум|потренир|закрепить знания|пройти.{0,20}(?:практик|раунд|тест|задани)|быстрый раунд|жаттығ|білім.{0,16}бекіт|раунд|практикадан)/u.test(q)||onsite&&/(практик|задани|тренажер|тапсырма|тәжірибе)/u.test(q)){
      if(/(?:признак|белгі).{0,20}(?:sms|смс|хабарлама)|(?:sms|смс).{0,24}(?:признак|белгі)/iu.test(q))return ['clues','lab'];
      const specific=/сообщен|звонк|қоңырау|хабарлама/u.test(q)?'messages':/аккаунт|учетн/u.test(q)?'accounts':/устройств|құрылғы/u.test(q)?'devices':/покупк|деньг|ақша/u.test(q)?'money':'';
      return specific?['round-'+specific,'lab']:['lab','quick'];
    }
    if(/график|диаграмм|графиг|шығын.{0,10}кесте|кесте.{0,10}шығын/u.test(q))return ['charts'];
    if(/(?:выгруз|скачать|жүкте|кесте).{0,12}csv|csv/iu.test(q))return ['table'];
    if(/ic3/iu.test(q)||onsite&&/статистик|данные|потер|шығын|дерек/u.test(q))return ['data'];
    if(onsite&&/видео|ролик|бейне/u.test(q))return [/фото|сурет/u.test(q)?'film-link':/код/u.test(q)?'film-code':'film-delivery'];
    if(onsite&&/источник|дереккөз/u.test(q))return ['sources'];
    if(onsite&&/инцидент|оқиға/u.test(q))return ['response'];
    if(onsite&&/угроз|справочник|қатер|анықтам/u.test(q))return ['guide'];
    if(onsite&&previous.length&&q.length<65&&/есть|самом сайте|мұнда бар|сайтта бар/u.test(q)&&!/(форум|сертификат|тіркел|чат-бот)/u.test(q))return previous;
    return [];
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={create,suggested};
  else window.signalNav={entries:create(window.signal,document.documentElement.lang),suggested};
})();
