(() => {
  'use strict';
  const state = globalThis.__Safari18Stealth__;
  if (!state || typeof document === 'undefined') return;

  // iOS 16.2's WebKit already supports all three viewport units. Do not add
  // global observers or wrap CSSOM when the native implementation is present.
  const nativeViewportUnits = typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('height: 100dvh') &&
    CSS.supports('height: 100svh') &&
    CSS.supports('height: 100lvh');
  if (nativeViewportUnits) {
    state.record('css', 'native', 'native dvh/svh/lvh support detected; no fallback hooks or CSSOM wrappers installed');
    state.record('css.viewport-units', 'native', 'dvh/svh/lvh are natively supported by this WebKit');
    state.skipped.push('private-webkit-apis', 'global-modal-forcing', 'css-parser-rewrite');
    return;
  }

  const viewportPattern = /(^|[;{]\s*)([a-zA-Z-]+\s*:\s*)([^;{}]*?)(\b(?:\d*\.)?\d+(?:dvh|svh|lvh)\b)(\s*!important)?(?=\s*[;}])/gi;
  const convertViewportUnits = cssText => {
    if (typeof cssText !== 'string' || !/(?:dvh|svh|lvh)\b/i.test(cssText)) return cssText;
    return cssText.replace(viewportPattern, (whole, prefix, declaration, before, unit, important, offset, source) => {
      const property = declaration.slice(0, declaration.indexOf(':')).trim().toLowerCase();
      const fallback = unit.replace(/(?:dvh|svh|lvh)$/i, 'vh');
      const preceding = source.slice(0, offset);
      const boundary = Math.max(preceding.lastIndexOf(';'), preceding.lastIndexOf('{'));
      const previous = preceding.slice(boundary + 1).trim();
      const colon = previous.indexOf(':');
      const previousProperty = colon < 0 ? '' : previous.slice(0, colon).trim().toLowerCase();
      const previousValue = colon < 0 ? '' : previous.slice(colon + 1).trim();
      const expected = (before + fallback + (important || '')).trim();
      if (previousProperty === property && previousValue === expected) return whole;
      return prefix + declaration + before + fallback + (important || '') + ';' +
        declaration + before + unit + (important || '');
    });
  };

  const fallbackValue = value => {
    if (typeof value !== 'string' || !/(?:dvh|svh|lvh)\b/i.test(value)) return null;
    return value.replace(/(\d*\.)?\d+(dvh|svh|lvh)\b/gi, match =>
      match.replace(/dvh|svh|lvh/ig, 'vh'));
  };

  // Remember the last text written by this module. MutationObserver will see
  // that write; the WeakMap makes that callback a no-op while still allowing
  // a site to replace the stylesheet later.
  const processedStyles = new WeakMap();
  const processStyle = node => {
    if (!node || node.nodeType !== 1 || node.tagName !== 'STYLE') return;
    const original = node.textContent || '';
    if (processedStyles.get(node) === original) return;
    const updated = convertViewportUnits(original);
    processedStyles.set(node, updated);
    if (updated !== original) node.textContent = updated;
  };

  const patchMethod = (prototype, method) => {
    if (!prototype || typeof prototype[method] !== 'function') return;
    const original = prototype[method];
    if (original.__s18sWrapped) return;
    const wrapped = function (...args) {
      if (typeof args[0] === 'string') args[0] = convertViewportUnits(args[0]);
      return Reflect.apply(original, this, args);
    };
    try {
      Object.defineProperty(wrapped, '__s18sWrapped', {value:true});
      Object.defineProperty(prototype, method, {value:wrapped, configurable:true, writable:true});
      state.applied.push('cssom-' + method);
    } catch (error) {
      state.errors.push({module:'cssom', method, message:String(error)});
    }
  };

  const patchSetProperty = () => {
    const prototype = typeof CSSStyleDeclaration !== 'undefined' ? CSSStyleDeclaration.prototype : null;
    if (!prototype || typeof prototype.setProperty !== 'function') return;
    const original = prototype.setProperty;
    if (original.__s18sWrapped) return;
    const wrapped = function(property, value, priority) {
      const fallback = fallbackValue(value);
      if (fallback && fallback !== value) {
        Reflect.apply(original, this, [property, fallback, priority]);
        return Reflect.apply(original, this, [property, value, priority]);
      }
      return Reflect.apply(original, this, arguments);
    };
    try {
      Object.defineProperty(wrapped, '__s18sWrapped', {value:true});
      Object.defineProperty(prototype, 'setProperty', {value:wrapped, configurable:true, writable:true});
      state.applied.push('cssom-setProperty');
    } catch (error) {
      state.errors.push({module:'cssom', method:'setProperty', message:String(error)});
    }
  };

  try {
    if (document.querySelectorAll) document.querySelectorAll('style').forEach(processStyle);
    if (typeof MutationObserver === 'function') {
      const observer = new MutationObserver(records => {
        for (const record of records) {
          if (record.type === 'characterData') processStyle(record.target && record.target.parentElement);
          if (record.type === 'childList') {
            if (record.target && record.target.nodeType === 1 && record.target.tagName === 'STYLE') processStyle(record.target);
            for (const node of record.addedNodes || []) {
              if (!node || node.nodeType !== 1) continue;
              if (node.tagName === 'STYLE') processStyle(node);
              if (node.querySelectorAll) node.querySelectorAll('style').forEach(processStyle);
            }
          }
        }
      });
      observer.observe(document, {childList:true, subtree:true, characterData:true});
      state.applied.push('css-style-observer');
    }
    const sheetProto = typeof CSSStyleSheet !== 'undefined' ? CSSStyleSheet.prototype : null;
    patchMethod(sheetProto, 'insertRule');
    patchMethod(sheetProto, 'replaceSync');
    patchMethod(sheetProto, 'replace');
    patchSetProperty();
    state.record('css', 'applied', 'legacy viewport-unit fallback with idempotent style processing');
    state.record('css.viewport-units', 'limited', 'legacy vh fallback added while preserving modern declarations');
  } catch (error) {
    state.fail('css', error);
  }
  state.skipped.push('private-webkit-apis', 'global-modal-forcing', 'css-parser-rewrite');
})();
