(() => {
  'use strict';
  const state = globalThis.__Safari18Stealth__;
  if (!state || !document.documentElement) return;

  // Conservative fallback for simple dynamic viewport-unit declarations.
  // Keep the modern declaration after the fallback so modern WebKit wins.
  const viewportPattern = /(^|[;{]\s*)([a-zA-Z-]+\s*:\s*)([^;{}]*?)(\b(?:\d*\.)?\d+(?:dvh|svh|lvh)\b)(\s*!important)?(?=\s*[;}])/gi;
  const convert = css => {
    if (typeof css !== 'string' || !/(?:dvh|svh|lvh)\b/i.test(css)) return css;
    return css.replace(viewportPattern, (whole, prefix, declaration, before, unit, important) => {
      const fallback = unit.replace(/(?:dvh|svh|lvh)$/i, 'vh');
      return `${prefix}${declaration}${before}${fallback}${important || ''};${declaration}${before}${unit}${important || ''}`;
    });
  };

  const lastProcessed = new WeakMap();
  const processStyle = node => {
    if (!node || node.nodeType !== 1 || node.tagName !== 'STYLE') return;
    const original = node.textContent || '';
    if (lastProcessed.get(node) === original) return;
    const updated = convert(original);
    lastProcessed.set(node, updated);
    if (updated !== original) node.textContent = updated;
  };

  const patchCSSOM = (prototype, method) => {
    if (!prototype || typeof prototype[method] !== 'function') return;
    const original = prototype[method];
    if (original.__s18sWrapped) return;
    const wrapped = function (...args) {
      if (typeof args[0] === 'string') args[0] = convert(args[0]);
      return Reflect.apply(original, this, args);
    };
    try {
      Object.defineProperty(wrapped, '__s18sWrapped', { value: true });
      Object.defineProperty(prototype, method, { value: wrapped, configurable: true, writable: true });
    } catch (error) {
      state.errors.push({ module: 'cssom', method, message: String(error) });
    }
  };

  try {
    document.querySelectorAll('style').forEach(processStyle);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') processStyle(record.target && record.target.parentElement);
        for (const node of record.addedNodes || []) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'STYLE') processStyle(node);
          if (node.querySelectorAll) node.querySelectorAll('style').forEach(processStyle);
        }
        if (record.type === 'childList' && record.target && record.target.nodeType === 1 && record.target.tagName === 'STYLE') {
          processStyle(record.target);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    const sheetProto = typeof CSSStyleSheet !== 'undefined' ? CSSStyleSheet.prototype : null;
    patchCSSOM(sheetProto, 'insertRule');
    patchCSSOM(sheetProto, 'replaceSync');
    state.applied.push('css-dynamic-viewport-fallback');
  } catch (error) {
    state.errors.push({ module: 'css', message: String(error) });
  }

  state.skipped.push('css-layer-rewrite-disabled', 'css-nesting-rewrite-disabled', 'global-modal-forcing-disabled');
})();
