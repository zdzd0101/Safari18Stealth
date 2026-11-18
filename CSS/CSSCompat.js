(() => {
  'use strict';
  const state = globalThis.__Safari18Stealth__;
  if (!state || typeof document === 'undefined') return;

  const viewportPattern = /(^|[;{]\s*)([a-zA-Z-]+\s*:\s*)([^;{}]*?)(\b(?:\d*\.)?\d+(?:dvh|svh|lvh)\b)(\s*!important)?(?=\s*[;}])/gi;
  const convertViewportUnits = css => {
    if (typeof css !== 'string' || !/(?:dvh|svh|lvh)\b/i.test(css)) return css;
    return css.replace(viewportPattern, (whole, prefix, declaration, before, unit, important) => {
      const fallback = unit.replace(/(?:dvh|svh|lvh)$/i, 'vh');
      return prefix + declaration + before + fallback + (important || '') + ';' +
             declaration + before + unit + (important || '');
    });
  };

  const fallbackValue = value => {
    if (typeof value !== 'string' || !/(?:dvh|svh|lvh)\b/i.test(value)) return null;
    return value.replace(/(\d*\.)?\d+(dvh|svh|lvh)\b/gi, match =>
      match.replace(/dvh|svh|lvh/ig, 'vh')
    );
  };

  const processStyle = node => {
    if (!node || node.nodeType !== 1 || node.tagName !== 'STYLE') return;
    const original = node.textContent || '';
    const updated = convertViewportUnits(original);
    if (updated !== original) node.textContent = updated;
  };

  const patchMethod = (prototype, method, transform) => {
    if (!prototype || typeof prototype[method] !== 'function') return;
    const original = prototype[method];
    if (original.__s18sWrapped) return;
    const wrapped = function (...args) { return Reflect.apply(original, this, transform(args)); };
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
    patchMethod(sheetProto, 'insertRule', args => {
      if (typeof args[0] === 'string') args[0] = convertViewportUnits(args[0]);
      return args;
    });
    patchMethod(sheetProto, 'replaceSync', args => {
      if (typeof args[0] === 'string') args[0] = convertViewportUnits(args[0]);
      return args;
    });
    patchMethod(sheetProto, 'replace', args => {
      if (typeof args[0] === 'string') args[0] = convertViewportUnits(args[0]);
      return args;
    });
    patchSetProperty();
    state.record('css', 'applied', 'viewport-unit fallback without private WebKit APIs');
  } catch (error) {
    state.fail('css', error);
  }
  state.skipped.push('private-webkit-apis', 'global-modal-forcing', 'css-parser-rewrite');
})();