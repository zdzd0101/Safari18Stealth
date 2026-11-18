(() => {
  'use strict';
  const state = globalThis.__Safari18Stealth__;
  if (!state || typeof document === 'undefined') return;

  const viewportPattern = /(^|[;{]\s*)([a-zA-Z-]+\s*:\s*)([^;{}]*?)(\b(?:\d*\.)?\d+(?:dvh|svh|lvh)\b)(\s*!important)?(?=\s*[;}])/gi;
  const convert = css => {
    if (typeof css !== 'string' || !/(?:dvh|svh|lvh)\b/i.test(css)) return css;
    return css.replace(viewportPattern, (whole, prefix, declaration, before, unit, important) => {
      const fallback = unit.replace(/(?:dvh|svh|lvh)$/i, 'vh');
      return prefix + declaration + before + fallback + (important || '') + ';' +
        declaration + before + unit + (important || '');
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

  const patchSetProperty = prototype => {
    if (!prototype || typeof prototype.setProperty !== 'function') return;
    const original = prototype.setProperty;
    if (original.__s18sWrapped) return;
    const wrapped = function (property, value, priority) {
      if (typeof value === 'string' && /(?:dvh|svh|lvh)\b/i.test(value)) {
        const fallback = value.replace(/((?:\d*\.)?\d+)(?:dvh|svh|lvh)\b/gi, '$1vh');
        Reflect.apply(original, this, [property, fallback, priority]);
      }
      return Reflect.apply(original, this, [property, value, priority]);
    };
    try {
      Object.defineProperty(wrapped, '__s18sWrapped', { value: true });
      Object.defineProperty(prototype, 'setProperty', { value: wrapped, configurable: true, writable: true });
    } catch (error) {
      state.errors.push({ module: 'cssom', method: 'setProperty', message: String(error) });
    }
  };

  try {
    // Document-start may precede documentElement; observe Document itself.
    document.querySelectorAll('style').forEach(processStyle);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') {
          processStyle(record.target && record.target.parentElement);
        }
        if (record.type === 'childList') {
          if (record.target && record.target.nodeType === 1 && record.target.tagName === 'STYLE') {
            processStyle(record.target);
          }
          for (const node of record.addedNodes || []) {
            if (node.nodeType !== 1) continue;
            if (node.tagName === 'STYLE') processStyle(node);
            if (node.querySelectorAll) node.querySelectorAll('style').forEach(processStyle);
          }
        }
      }
    });
    observer.observe(document, { childList: true, subtree: true, characterData: true });
    const sheetProto = typeof CSSStyleSheet !== 'undefined' ? CSSStyleSheet.prototype : null;
    patchCSSOM(sheetProto, 'insertRule');
    patchCSSOM(sheetProto, 'replaceSync');
    const declarationProto = typeof CSSStyleDeclaration !== 'undefined' ? CSSStyleDeclaration.prototype : null;
    patchSetProperty(declarationProto);
    state.applied.push('css-dynamic-viewport-fallback', 'cssom-viewport-fallback');
  } catch (error) {
    state.errors.push({ module: 'css', message: String(error) });
  }
  state.skipped.push('css-layer-rewrite-disabled', 'css-nesting-rewrite-disabled', 'global-modal-forcing-disabled');
})();
