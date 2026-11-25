'use strict';
(() => {
  const sensitive = /(?:\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\d[\s-]?){11,}|(?:пароль|құпиясөз|құпия сөз|растау коды|код|token|api[_ -]?key)\s*[:=]\s*\S+|(?:^|\D)\d{4,8}(?:\D|$))/iu;
  const prohibited = /взлом|украсть|обойд|обойти|эксплойт|инструкц.{0,20}атак|созда.{0,30}(фишинг|вредонос)|\bhack\b|\bexploit\b|bypass|\bsteal(?:s|ing)?\b|malware code/iu;
  const recovery = /взломали\s+(мой|меня|мою)|мой\s+аккаунт.{0,16}взломали|как восстановить|что делать.{0,18}взлом|после взлома|взломали (почту|аккаунт|телеграм)|скомпрометирован/iu;
  const harmfulKk=/(?:құпиясөз.{0,14}(?:ұрла(?!й\s+ма)|бұз)|(?:біреудің|басқаның).{0,30}(?:бұз|бұзып кір)|фишинг.{0,22}(?:жаса|құр)|вирусты қалай жаз|қорғанысты.{0,15}айналып өт)/iu;
  const recoveryKk=/(?:аккаунтым[ағды]*.{0,24}(?:бұзып|бұзылды|бөтен|кіріп кетті)|(?:поштамды|аккаунтымды).{0,12}(?:қалпына|қайтар))/iu;
  function decide(input,topics) {
    if(typeof input!=='string')return {state:'length'};
    const q = input.normalize('NFKC').trim().toLowerCase().replaceAll('ё','е');
    if (!q || q.length > 1200) return {state:'length'};
    const credentialLike=/(?:\b(?:sk-(?:proj-)?|gh[pousr]_|github_pat_|aq\.|aiza)[a-z0-9_-]{12,}|\bbearer\s+[a-z0-9._~+\/-]{10,}|\beyj[a-z0-9_-]{6,}\.[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}|(?:cvv|cvc)\s*[:=\s]\s*\d{3,4}\b)/i;
    const privacyText=q.replace(/\b(?:iso(?:\/iec)?|iec|nist\s+sp|rfc|cve)[ -]+\d{3,5}(?:[-:]\d{2,7})?\b/giu,'standard');
    if (sensitive.test(privacyText)||credentialLike.test(q)) return {state:'private'};
    if (harmfulKk.test(q)) return {state:'denied'};
    if (recoveryKk.test(q)) return {state:'match',ids:['incident']};
    const educational=/^(?:что такое|что значит|как (?:распознать|обнаружить|предотвратить|защититься от)|какие признаки)\s/iu.test(q) && !/(?:как (?:сделать|написать|взломать|обойти)|дай (?:код|пример эксплойта)|пошагов)/iu.test(q);
    if (prohibited.test(q) && !recovery.test(q) && !educational) return {state:'denied'};
    if (recovery.test(q) && !/обойти|украсть|эксплойт|bypass|\bsteal(?:s|ing)?\b/iu.test(q)) return {state:'match',ids:['incident']};
    const hasKey = key => key.toLowerCase() === 'rat' ? /(?:^|[^a-z])rat(?:$|[^a-z])/i.test(q) : q.includes(key.toLowerCase().replaceAll('ё','е'));
    const ranked = topics.map(t => [t.id, t.keys.reduce((score, key) => score + (hasKey(key) ? key.length : 0),0)]).filter(([,score])=>score).sort((a,b)=>b[1]-a[1]);
    if (!ranked.length) return {state:'unknown'};
    return {state:'match',ids:ranked.slice(0,3).map(([id])=>id)};
  }
  if(typeof module!=='undefined') module.exports=decide;
  else window.signalDecide=decide;
})();
