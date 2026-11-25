/* Language changes carry only catalog identifiers and answer positions. */
(() => {
  function create(scenarios, meta, groups) {
    const byId = new Map(scenarios.map(item => [meta[item[0]].id, item]));
    const currentLanguage = document.documentElement.lang.split('-')[0];
    let encoded = '';

    function syncLink(link) {
      if (!link || link.hreflang.split('-')[0] === currentLanguage) return;
      const href = link.getAttribute('href');
      if (!href) return;
      const url = new URL(href, document.baseURI);
      if (encoded) url.searchParams.set('run', encoded);
      else url.searchParams.delete('run');
      const path = href.split(/[?#]/)[0];
      const next = path + url.search + url.hash;
      if (href !== next) link.setAttribute('href', next);
    }

    const languageLinks = 'a.locale-option[hreflang]';
    function refreshLinks() {
      for (const link of document.querySelectorAll(languageLinks)) syncLink(link);
    }
    // Keep the destination current for keyboard activation, middle-click and the context menu.
    for (const type of ['focusin', 'pointerdown', 'click', 'contextmenu']) {
      document.addEventListener(type, event => syncLink(event.target.closest?.(languageLinks)), true);
    }

    function write(route, run, position, answers) {
      const ids = run.map(item => meta[item[0]].id);
      encoded = ['1', route, position, answers.join('.'), ids.join('.')].join('~');
      refreshLinks();
    }
    function clear() {
      encoded = '';
      refreshLinks();
    }

    function read() {
      const url = new URL(location.href);
      const value = url.searchParams.get('run');
      if (value === null) return;
      url.searchParams.delete('run');
      try { history.replaceState(history.state, '', url.href); } catch { /* Limited file: URL history support. */ }
      if (!value || value.length > 4096) return;
      const parts = value.split('~');
      if (parts.length !== 5 || parts[0] !== '1') return;
      const [, route, at, choices, order] = parts;
      if (location.hash.startsWith('#practice-') && location.hash.slice(10) !== route) return;
      if (!/^\d+$/.test(at) || (choices && !/^\d+(\.\d+)*$/.test(choices))) return;
      const ids = order.split('.');
      if (ids.length > byId.size || new Set(ids).size !== ids.length) return;
      const run = ids.map(id => byId.get(id));
      if (run.some(item => !item)) return;
      if (route === 'quick') {
        if (run.length > 5) return;
      } else if (route.startsWith('topic-')) {
        if (run.some(item => item[5] !== route.slice(6))) return;
      } else if (!groups.includes(route) || run.some(item => meta[item[0]].group !== route)) {
        return;
      }
      const position = Number(at);
      const answers = choices ? choices.split('.').map(Number) : [];
      if (position > run.length || answers.length < position || answers.length > position + 1 ||
          answers.length > run.length || answers.some((answer, i) => answer >= run[i][2].length)) return;
      return { route, run, position, answers };
    }
    return { read, write, clear };
  }
  window.signalPracticeState = { create };
})();

