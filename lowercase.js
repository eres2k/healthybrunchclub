/* Force all visible text to lowercase (incl. dynamically loaded content) */
(() => {
  const LOCALE = 'de-AT';
  const EXCLUDE_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','IFRAME','SVG']);
  const EXCLUDE_SELECTOR = '[data-keep-case], .keep-case, [contenteditable="true"]';

  const hasUpper = /[A-ZÄÖÜẞ]/;

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return true;
    const s = getComputedStyle(el);
    return s && s.visibility !== 'hidden' && s.display !== 'none';
  }

  function shouldSkip(node) {
    let el = node.parentElement;
    if (el && el.closest(EXCLUDE_SELECTOR)) return true;
    while (el) {
      if (EXCLUDE_TAGS.has(el.nodeName)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function lowerTextNode(n) {
    const t = n.nodeValue;
    if (!t || !hasUpper.test(t)) return;
    n.nodeValue = t.toLocaleLowerCase(LOCALE);
  }

  function walkAndLower(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !hasUpper.test(node.nodeValue)) return NodeFilter.FILTER_SKIP;
        if (!isVisible(node.parentElement)) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const toProcess = [];
    while (walker.nextNode()) toProcess.push(walker.currentNode);
    toProcess.forEach(lowerTextNode);
  }

  function lowerUsefulAttributes(root) {
    root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
      const ph = el.getAttribute('placeholder');
      if (ph) el.setAttribute('placeholder', ph.toLocaleLowerCase(LOCALE));
    });
    root.querySelectorAll('img[alt]').forEach(el => {
      const alt = el.getAttribute('alt');
      if (alt) el.setAttribute('alt', alt.toLocaleLowerCase(LOCALE));
    });
    root.querySelectorAll('[title]').forEach(el => {
      const tt = el.getAttribute('title');
      if (tt) el.setAttribute('title', tt.toLocaleLowerCase(LOCALE));
    });
  }

  function process(root = document.body) {
    walkAndLower(root);
    lowerUsefulAttributes(root);
  }

  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 1) process(n);
          else if (n.nodeType === 3) lowerTextNode(n);
        });
      } else if (m.type === 'characterData') {
        lowerTextNode(m.target);
      } else if (m.type === 'attributes') {
        const el = m.target;
        const val = el.getAttribute(m.attributeName);
        if (!val) continue;
        if (m.attributeName === 'placeholder' || m.attributeName === 'title' || m.attributeName === 'alt') {
          el.setAttribute(m.attributeName, val.toLocaleLowerCase(LOCALE));
        }
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    process();
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder','title','alt']
    });
  });

  // optional: allow manual re-run
  window.forceLowercase = { process };
})();
