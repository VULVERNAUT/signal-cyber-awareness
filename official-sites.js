'use strict';
// Shared by the demo server and the browser when displaying external citations.
(() => {
  const hosts = {
    'www.gov.kz': 'GOV.KZ', 'cert.gov.kz': 'KZ-CERT',
    'www.nist.gov': 'NIST', 'csrc.nist.gov': 'NIST',
    'www.gov.uk': 'GOV.UK', 'learn.microsoft.com': 'Microsoft Learn'
  };
  function publisher(address) {
    try {
      const url = new URL(address);
      if (url.protocol !== 'https:' || url.port || url.username || url.password || !Object.hasOwn(hosts, url.hostname)) return '';
      if (url.hostname === 'learn.microsoft.com' && /\/(?:answers|users|shows|training\/modules)\//i.test(url.pathname)) return '';
      return hosts[url.hostname];
    } catch { return ''; }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = publisher;
  else window.signalPublisher = publisher;
})();
