'use strict';
(() => {
  // Only compare what the visitor typed. Links in a message never become network requests.
  const brands = [
    {name:'Wildberries', label:'wildberries', mention:/wildberries|вайлдбер|вайлбер|вайлдб/i, domains:['wildberries.ru','wildberries.kz']},
    {name:'Kaspi', label:'kaspi', mention:/kaspi|каспи/i, domains:['kaspi.kz']},
    {name:'eGov', label:'egov', mention:/egov|егов/i, domains:['egov.kz']}
  ];
  function hostsIn(text) {
    const tokens = text.match(/(?:https?:\/\/|www\.)[^\s<>"«»]+|(?:[\p{L}0-9-]+\.)+[\p{L}]{2,24}(?:[/?#][^\s<>"«»]*)?/giu) || [];
    const found = new Set();
    for (const token of tokens) {
      try {
        const clean = token.replace(/[).,;!?]+$/u,'');
        const url = new URL(/^https?:\/\//i.test(clean) ? clean : 'https://' + clean);
        const host = url.hostname.toLowerCase().replace(/\.$/,'');
        if (host.includes('.') && !/\.(?:exe|apk|zip|pdf|docx?|xlsx?|rar|mp[34]|jpg|png)$/u.test(host)) found.add(host);
      } catch { /* Ignore text that isn't an address. */ }
    }
    return [...found];
  }
  function difference(actual, expected) {
    if (actual === expected || Math.abs(actual.length - expected.length) > 1) return null;
    let i = 0;
    while (actual[i] === expected[i]) i++;
    if (actual.length === expected.length) {
      if (actual.slice(i+1) === expected.slice(i+1)) return {kind:'letter', from:actual[i], to:expected[i]};
      if (actual[i] === expected[i+1] && actual[i+1] === expected[i] && actual.slice(i+2) === expected.slice(i+2)) return {kind:'transpose'};
    } else if (actual.length > expected.length && actual.slice(i+1) === expected.slice(i)) {
      return {kind:'extra', from:actual[i]};
    } else if (actual.length < expected.length && actual.slice(i) === expected.slice(i+1)) {
      return {kind:'missing', to:expected[i]};
    }
    return null;
  }
  function identify(host, question) {
    const labels = host.split('.');
    for (const brand of brands) {
      if (brand.domains.some(domain => host === domain || host.endsWith('.'+domain))) return {brand, kind:'known'};
    }
    for (const brand of brands) {
      if (labels.includes(brand.label) || labels.some(label => label.includes(brand.label))) return {brand, kind:'embedded'};
    }
    for (const brand of brands) {
      for (const label of labels.slice(0,-1)) {
        const change = difference(label,brand.label);
        if (change) return {brand, ...change};
      }
    }
    return {brand:brands.find(brand => brand.mention.test(question)), kind:'unknown'};
  }
  function describe(host, question, t) {
    const {brand,kind,from,to} = identify(host,question);
    const name = brand?.name;
    switch (kind) {
      case 'letter': return t('В адресе «'+host+'» стоит «'+from+'» там, где в названии '+name+' должна быть «'+to+'». Так ссылки-двойники могут с первого взгляда показаться знакомыми.', '«'+host+'» мекенжайында «'+from+'» әрпі тұр. '+name+' атауында осы орында «'+to+'» болуы керек. Бір әріп өзгерсе де, сілтеме бір қарағанда таныс болып көрінуі мүмкін.');
      case 'extra': return t('Присмотритесь к «'+host+'». По сравнению с '+name+' в названии есть лишний символ «'+from+'». Это признак возможной подмены адреса.', '«'+host+'» мекенжайын '+name+' атауымен салыстырсаңыз, артық «'+from+'» таңбасын көресіз. Бұл мекенжайдың әдейі өзгертілгенін білдіруі мүмкін.');
      case 'missing': return t('В «'+host+'» пропущен символ «'+to+'» из названия '+name+'. Этого достаточно, чтобы адрес вёл на другой сайт.', '«'+host+'» мекенжайында '+name+' атауындағы «'+to+'» таңбасы түсіп қалған. Осындай бір өзгеріс сілтемені басқа сайтқа бағыттауы мүмкін.');
      case 'transpose': return t('В «'+host+'» две соседние буквы из названия '+name+' поменялись местами. Такой адрес легко принять за знакомый.', '«'+host+'» мекенжайында '+name+' атауындағы қатар тұрған екі әріптің орны ауысқан. Сондықтан оны таныс мекенжаймен шатастыру оңай.');
      case 'embedded': return t('В «'+host+'» видно название '+name+'. Прочитайте адрес до конца: знакомое слово может быть частью чужого домена. Совпадения одного слова недостаточно, чтобы доверять этой ссылке.', '«'+host+'» мекенжайында '+name+' атауы кездеседі. Мекенжайды соңына дейін оқыңыз: таныс сөз бөтен доменнің бір бөлігі болуы мүмкін. Бір сөздің сәйкес келуі сілтемеге сенуге жеткіліксіз.');
      case 'known': return t('В «'+host+'» написание домена совпадает с известным адресом '+name+'. По одному адресу нельзя подтвердить предложение или установить, кто прислал сообщение.', '«'+host+'» мекенжайындағы домен '+name+' сервисінің белгілі доменімен сәйкес келеді. Тек мекенжайға қарап ұсыныстың рас екенін немесе хабарламаны кім жібергенін анықтау мүмкін емес.');
      default: return t('По названию «'+host+'» нельзя установить, кто управляет сайтом.'+(name?' Упоминание '+name+' в сообщении этого не подтверждает.':''), '«'+host+'» доменінің атауына қарап сайтты кім басқаратынын анықтау мүмкін емес.'+(name?' Хабарламада '+name+' атауының кездесуі де оны растамайды.':''));
    }
  }
  // Separate completed actions from requests, hypotheticals and negated actions.
  function actions(q) {
    const done = new Set();
    for (const clause of q.split(/[,.!?;\n]+|\s+(?:но|а вот|зато|бірақ|алайда)\s+/u)) {
      if (/если|могу ли|что будет|допустим|что если|егер|болса|болар|енгізсем|айтсам|төлесем/u.test(clause)) continue;
      if (/(?:мне|нам) (?:сказали|сообщили|передали|отправили|назвали)|маған (?:айтты|жіберді)/u.test(clause) && !/(?:я|мен)\s/u.test(clause)) continue;
      const positive = clause.replace(/(?:^|\s)(?:не|не успел[аи]?|не стал[аи]?)\s+(?:(?:все-таки|даже)\s+)?[а-яё-]+/gu,' ').replace(/(?:^|\s)(?:енгізбедім|жібермедім|айтпадым|төлемедім|ашпадым|өтпедім|бермедім)(?=\s|$)/gu,' ');
      const entered = /(?:^|[^\p{L}])(?:ввел[аи]?|вводил[аи]?|вбил[аи]?|диктовал[аи]?|продиктовал[аи]?|сообщил[аи]?|сказал[аи]?|назвал[аи]?|отправил[аи]?|указал[аи]?|передал[аи]?|енгіздім|тердім|айттым|жібердім|бердім)(?=$|[^\p{L}])/u.test(positive);
      if (entered && /карт|cvv|cvc/u.test(positive)) done.add('card');
      if (entered && /парол|құпия\s?сөз/u.test(positive)) done.add('password');
      if (entered && /код/u.test(positive)) done.add('code');
      if (entered && /данные|деректер/u.test(positive) && !/карт|код|парол|құпия\s?сөз/u.test(positive)) done.add('details');
      if (/файл|установщик|приложени|бағдарлама|қолданба/u.test(positive)) {
        if (/скачал[аи]?|жүктедім|жүктеп алдым/u.test(positive)) done.add('download');
        if (/запустил[аи]?|установил[аи]?|іске қостым|орнаттым/u.test(positive)) done.add('installed');
      }
      if (/(?:^|\s)(?:оплатил[аи]?|заплатил[аи]?|перевел[аи]?\s+(?:деньги|им|сумму)|деньги\s+перевел[аи]?|ақша\s+аудардым|төледім)(?=$|\s)/u.test(positive)) done.add('paid');
      if (/(?:открыл[аи]?|переш[её]л|перешла|нажал[аи]?|посмотрел[аи]?|аштым|бастым|сілтемеге өттім)(?=$|\s)/u.test(positive)) done.add('opened');
      if (/(?:не\s+(?:переходил[аи]?|открывал[аи]?|нажимал[аи]?)|сілтемені ашпадым|сілтемеге өтпедім)/u.test(clause)) done.add('unopened');
      if (/(?:ничего не (?:вводил[аи]?|ввел[аи]?)|ештеңе енгізбедім)/u.test(clause)) done.add('noInput');
      if (/(?:не (?:вводил[аи]?|ввел[аи]?|называл[аи]?|сообщал[аи]?|платил[аи]?|оплачивал[аи]?)|енгізбедім|айтпадым|төлемедім)/u.test(clause)) done.add('deniedAction');
    }
    return done;
  }
  function advise(question, lang, previous=null) {
    const t=(ru,kk)=>lang==='kk'?kk:ru;
    const q=question.normalize('NFKC').toLowerCase().replaceAll('ё','е');
    const hosts=hostsIn(question);
    const sale=/скидк|распродаж|акци[яюи]|жеңілдік|науқан/u.test(q);
    const parcel=/посылк|доставк|сәлемдеме|жеткіз/u.test(q) && /доплат|оплат|платеж|ақы|төле/u.test(q);
    const call=/позвонил|звонят|звонил|по телефону|қоңырау|телефон соқты/u.test(q) && /код/u.test(q);
    const linkMessage=/(?:прислали|пришла|получил|скинул|пришел|кинули|жіберді|келді)/u.test(q) && /ссылк|сілтеме/u.test(q);
    const done=actions(q);
    if (previous?.steps?.includes('details')) {
      const answer=q.replace(/^(?:только|лишь|тек)\s+/u,'').replace(/[.!?]+$/u,'').trim();
      if (/^(?:пароль|құпия\s?сөз(?:ді)?)$/u.test(answer)) done.add('password');
      if (/^(?:(?:смс[- ]?|бір реттік )?код(?:ты)?|код из смс)$/u.test(answer)) done.add('code');
      if (/^(?:карт[ау]|(?:номер|данные|реквизиты) карты|карта (?:деректерін?|нөмірін?))$/u.test(answer)) done.add('card');
    }
    const confirmed=['paid','card','password','code','details'].some(step=>done.has(step));
    const nextQuestion=/^(?:(?:а |ну |ал )?(?:почему|почему так|что дальше|что (?:мне |теперь )?делать|как проверить|неге|енді не істеймін))[?!. ]*$/u.test(q);
    const isFollow=!!previous && !hosts.length && !parcel && !call && !linkMessage && !sale &&
      (done.size>0 || nextQuestion);
    if (!hosts.length && !sale && !parcel && !call && !linkMessage && !isFollow && !confirmed) return null;
    if (!hosts.length && sale && !linkMessage && !/(?:мне|скинули|присла|пишут|увидел|ссылк|маған|жібер|көрдім|сілтеме)/u.test(q)) return null;
    if (hosts.length>1) return {paragraphs:[t('В сообщении несколько адресов. Какой именно был в ссылке из сообщения? Напишите только домен, без части после косой черты.', 'Хабарламада бірнеше мекенжай бар. Хабарламадағы сілтемеде нақты қайсысы тұрды? Қиғаш сызықтан кейінгі бөлігін алып тастап, тек доменді жазыңыз.')], topic:'phishing', source:'ftc', state:null};
    const host=hosts[0] || (isFollow?previous.host:'');
    const brand=hosts.length?identify(host,q).brand?.name:isFollow?previous.brand:brands.find(b=>b.mention.test(q))?.name;
    const kind=isFollow?previous.kind:call?'call':parcel?'parcel':sale?'sale':'link';
    if (isFollow && nextQuestion && !done.size) for (const step of previous.steps||[]) done.add(step);
    const state={host,brand,kind,steps:[...done]};
    const topic=kind==='call'?'voice':'phishing';
    const paragraphs=[];
    const result=(source,plan)=>({paragraphs,topic,source,plan,state});
    if (host && (!isFollow || !done.size)) paragraphs.push(describe(host,q,t));
    if (done.has('paid') || done.has('card')) paragraphs.push(done.has('paid')?
      t('Свяжитесь с банком прямо сейчас через его приложение или по номеру на карте. Назовите операцию и попросите проверить, можно ли остановить или оспорить перевод. Сохраните чек и переписку.', 'Банктің өз қолданбасы арқылы немесе картадағы нөмірге қоңырау шалып, банкке дереу хабарласыңыз. Қай операция екенін айтып, аударымды тоқтатуға немесе оған дау айтуға болатынын сұраңыз. Түбіртек пен хат алмасуды сақтаңыз.'):
      t('Раз вы ввели данные карты, заблокируйте её в банковском приложении и свяжитесь с банком по номеру на карте. Сообщите, какие реквизиты могли попасть посторонним, и проверьте последние операции.', 'Карта деректерін енгізген болсаңыз, картаны банк қолданбасында бұғаттап, картадағы нөмір арқылы банкке хабарласыңыз. Қандай деректерді енгізгеніңізді банкке айтып, соңғы операцияларды тексеріңіз.'));
    if (done.has('password')) paragraphs.push(t('Откройте сервис через его приложение и смените введённый пароль. Завершите чужие сеансы в настройках безопасности. Если этот пароль был и у почты, смените его также в почте.', 'Сервистің өз қолданбасын ашып, енгізген құпиясөзді ауыстырыңыз. Қауіпсіздік баптауларында бөтен сеанстарды аяқтаңыз. Сол құпиясөзді поштада да қолдансаңыз, оны сол жерде де ауыстырыңыз.'));
    if (done.has('code')) paragraphs.push(t('Прочитайте в исходном SMS, что подтверждал код. Если это платёж, сразу позвоните в банк по номеру на карте. Если это вход, откройте сам сервис, проверьте устройства и завершите незнакомые сеансы. Сам код сюда не пишите.', 'Бастапқы SMS-тен кодтың нені растағанын оқыңыз. Төлемге қатысты болса, картадағы нөмірге дереу қоңырау шалыңыз. Жүйеге кіру коды болса, сервистің өзінен құрылғылар тізімін қарап, бөтен сеанстарды аяқтаңыз. Кодтың өзін мұнда жазбаңыз.'));
    if (done.has('card') || done.has('paid')) return result('scammed','payment');
    if (done.has('password') || done.has('code')) return result('recover','account');
    if (done.has('download') || done.has('installed')) {
      paragraphs.push(done.has('installed')?
        t('Если вы запустили файл из сообщения, отключите устройство от сети и проверьте его встроенным средством защиты. Входите в важные аккаунты с другого устройства, которому доверяете.', 'Хабарламадан жүктелген файлды іске қоссаңыз, құрылғыны желіден ажыратып, кіріктірілген қорғаныс құралымен тексеріңіз. Маңызды аккаунттарға өзіңіз сенетін басқа құрылғыдан кіріңіз.'):
        t('Если файл только скачался, оставьте его закрытым. Удалите его из загрузок и запустите проверку встроенным средством защиты устройства.', 'Файл тек жүктелген болса, оны ашпаңыз. Оны жүктеулерден өшіріп, құрылғының кіріктірілген қорғаныс құралымен тексеріңіз.'));
      return result('ftc','device');
    }
    if (done.has('details')) {
      paragraphs.push(t('Что именно вы ввели: пароль, одноразовый код или реквизиты карты? Достаточно назвать тип данных. Цифры, пароль и номер карты сюда не присылайте.', 'Нені енгіздіңіз: құпиясөзді, бір реттік кодты немесе карта деректерін бе? Деректің түрін ғана айтыңыз. Цифрларды, құпиясөзді немесе карта нөмірін мұнда жібермеңіз.'));
      return result('scammed','link');
    }
    if (done.has('opened') || done.has('noInput')) {
      paragraphs.push(t('Если вы только посмотрели страницу, закрыли её и ничего не вводили, сам переход ещё не означает, что кто-то получил доступ к карте или аккаунту. Важно, скачивался ли файл и просила ли страница установить что-нибудь или разрешить уведомления.', 'Бетті қарап, ештеңе енгізбей жапсаңыз, сілтемені ашудың өзі біреу картаңызға немесе аккаунтыңызға кірді дегенді білдірмейді. Файл жүктелді ме, бет бірдеңе орнатуды немесе хабарландыруға рұқсат беруді сұрады ма — соны тексеріңіз.'));
      return result('ftc','link');
    }
    if (isFollow && done.has('deniedAction') && !done.has('unopened')) {
      paragraphs.push(kind==='call'?t('Тогда завершите звонок. Если собеседник представился сотрудником банка, перезвоните по номеру на карте.', 'Онда қоңырауды аяқтаңыз. Егер ол өзін банк қызметкері деп таныстырса, картадағы нөмірге өзіңіз қоңырау шалыңыз.'):t('В таком случае закройте страницу. Вы успели сделать что-нибудь ещё, например подтвердить платёж или скачать файл?', 'Онда бетті жабыңыз. Басқа әрекет жасадыңыз ба, мысалы, төлемді растадыңыз ба немесе файл жүктедіңіз бе?'));
      return result('ftc',null);
    }
    if (kind==='call') {
      paragraphs.push(t('Звонящий просит код. Посмотрите, для какой операции он прислан: код входа может дать человеку доступ к вашему аккаунту. Завершите звонок и сами свяжитесь с организацией через её приложение.', 'Қоңырау шалған адам код сұрап тұр. SMS-тен кодтың қандай әрекетке арналғанын оқыңыз. Кіру кодын айтсаңыз, басқа адам аккаунтыңызға кіре алады. Қоңырауды аяқтап, ұйымға өз қолданбасы арқылы хабарласыңыз.'));
      paragraphs.push(t('Вы уже назвали код или он пока только у вас?', 'Кодты айтып қойдыңыз ба, әлде оны әлі ешкімге айтпадыңыз ба?'));
      return result('bank',null);
    }
    if (kind==='sale') {
      const amount=question.match(/(?:^|[^\d])(\d{1,2}|100)\s*%/u)?.[1];
      paragraphs.push(t((amount?'Скидка '+amount+'%':'Большая скидка')+' сама по себе ничего не доказывает. Откройте '+(brand?'приложение '+brand:'приложение магазина')+' с главного экрана телефона и найдите тот же товар. Сравните продавца и цену там, до оплаты.', (amount?amount+'% жеңілдік':'Үлкен жеңілдік')+' ұсыныстың шын екенін дәлелдемейді. Телефонның негізгі экранынан '+(brand?brand+' қолданбасын':'дүкеннің өз қолданбасын')+' ашып, сол тауарды табыңыз. Төлем жасамас бұрын сатушы мен бағаны сол жерден салыстырыңыз.'));
    } else if (kind==='parcel') {
      paragraphs.push(t('Сумму доплаты можно проверить в самом заказе. Закройте сообщение, откройте приложение доставки с главного экрана и зайдите в историю заказов. Если там указано 0 ₸, платить по ссылке из сообщения не нужно.', 'Қосымша ақыны тапсырыстың өзінен тексеріңіз. Хабарламаны жауып, негізгі экраннан жеткізу қолданбасын ашыңыз да, тапсырыстар тарихына кіріңіз. Онда 0 ₸ көрсетілсе, хабарламадағы сілтеме арқылы төлем жасамаңыз.'));
    } else {
      paragraphs.push(t('Если сообщение ведёт к оплате или входу, откройте '+(brand?'приложение '+brand:'нужный сервис через своё приложение или закладку')+' и проверьте, есть ли там такой запрос.', 'Хабарлама төлем жасауды немесе аккаунтқа кіруді сұраса, '+(brand?brand+' қолданбасын':'сервистің өз қолданбасын немесе сақталған бетбелгіні')+' ашып, сол сұраудың бар-жоғын тексеріңіз.'));
    }
    if (!done.has('unopened')) paragraphs.push(t('Вы только увидели ссылку, уже открыли страницу или успели ввести там данные?', 'Сілтемені ғана көрдіңіз бе, бетті аштыңыз ба, әлде деректеріңізді енгізіп қойдыңыз ба?'));
    return result(kind==='sale'?'market':'ftc',null);
  }
  if (typeof module!=='undefined' && module.exports) module.exports=advise;
  else window.signalCaseAdvice=advise;
})();
