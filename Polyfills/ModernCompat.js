(() => {
  'use strict';
  const state = globalThis.__Safari18Stealth__;
  if (!state) return;
  const has = (object, key) => object != null && key in object;
  const define = (target, key, value, moduleName) => {
    if (!target || key in target) {
      state.skipped.push(moduleName + '.' + key);
      return false;
    }
    try {
      Object.defineProperty(target, key, { value, configurable: true, writable: true, enumerable: false });
      state.applied.push(moduleName + '.' + key);
      return true;
    } catch (error) {
      state.errors.push({ module: moduleName, method: key, message: String(error) });
      return false;
    }
  };
  const record = (name, status, detail) => state.record(name, status, detail);

  // Safari 17 Set methods. Use the Set-like protocol where applicable.
  const getSetRecord = other => {
    if (other == null) throw new TypeError('Set-like argument is required');
    const size = Number(other.size);
    const hasMethod = other.has;
    const keysMethod = other.keys;
    if (!Number.isFinite(size) || size < 0 || typeof hasMethod !== 'function' || typeof keysMethod !== 'function') {
      throw new TypeError('Argument must be Set-like');
    }
    return { object: other, size, has: hasMethod, keys: keysMethod };
  };
  const setMethods = {
    difference(other) {
      const record = getSetRecord(other), result = new Set();
      for (const value of this) if (!Reflect.apply(record.has, record.object, [value])) result.add(value);
      return result;
    },
    intersection(other) {
      const record = getSetRecord(other), result = new Set();
      const source = this.size <= record.size ? this : record.object;
      if (source === this) {
        for (const value of this) if (Reflect.apply(record.has, record.object, [value])) result.add(value);
      } else {
        for (const value of record.keys.call(record.object)) if (this.has(value)) result.add(value);
      }
      return result;
    },
    union(other) {
      const record = getSetRecord(other), result = new Set(this);
      for (const value of record.keys.call(record.object)) result.add(value);
      return result;
    },
    symmetricDifference(other) {
      const record = getSetRecord(other), result = new Set(this);
      for (const value of record.keys.call(record.object)) {
        if (result.has(value)) result.delete(value);
        else result.add(value);
      }
      return result;
    },
    isSubsetOf(other) {
      const record = getSetRecord(other);
      if (this.size > record.size) return false;
      for (const value of this) if (!Reflect.apply(record.has, record.object, [value])) return false;
      return true;
    },
    isSupersetOf(other) {
      const record = getSetRecord(other);
      if (this.size < record.size) return false;
      for (const value of record.keys.call(record.object)) if (!this.has(value)) return false;
      return true;
    },
    isDisjointFrom(other) {
      const record = getSetRecord(other);
      const source = this.size <= record.size ? this : record.object;
      if (source === this) {
        for (const value of this) if (Reflect.apply(record.has, record.object, [value])) return false;
      } else {
        for (const value of record.keys.call(record.object)) if (this.has(value)) return false;
      }
      return true;
    }
  };
  for (const [name, method] of Object.entries(setMethods)) define(Set.prototype, name, method, 'Set');

  // Safari 18 URL.parse: null on parse failure, native URL parser semantics.
  if (typeof URL !== 'undefined') define(URL, 'parse', function parse(input, base) {
    try { return arguments.length > 1 ? new URL(input, base) : new URL(input); }
    catch (_) { return null; }
  }, 'URL');

  // The bytes() additions are convenience methods, not new Fetch implementations.
  if (typeof Blob !== 'undefined') define(Blob.prototype, 'bytes', async function bytes() {
    return new Uint8Array(await this.arrayBuffer());
  }, 'Blob');
  if (typeof Response !== 'undefined') define(Response.prototype, 'bytes', async function bytes() {
    return new Uint8Array(await this.arrayBuffer());
  }, 'Response');

  // Declarative Shadow DOM: only process templates when the native parser did
  // not already consume them. This is a bounded one-time scan, not a page-wide observer.
  const supportsDeclarativeShadowDOM = (() => {
    try {
      const host = document.createElement('div');
      host.innerHTML = '<template shadowrootmode="open"><span></span></template>';
      return !!host.shadowRoot;
    } catch (_) { return false; }
  })();
  const installDeclarativeShadowDOMFallback = () => {
    if (supportsDeclarativeShadowDOM || !document.querySelectorAll) {
      record('declarative-shadow-dom', 'skipped', 'native parser support detected or DOM unavailable');
      return;
    }
    let attached = 0;
    const templates = document.querySelectorAll('template[shadowrootmode]');
    for (const template of templates) {
      const host = template.parentElement;
      const mode = template.getAttribute('shadowrootmode');
      if (!host || host.shadowRoot || (mode !== 'open' && mode !== 'closed')) continue;
      try {
        const root = host.attachShadow({ mode });
        root.appendChild(template.content);
        template.remove();
        attached++;
      } catch (error) {
        state.errors.push({ module: 'declarative-shadow-dom', message: String(error) });
      }
    }
    record('declarative-shadow-dom', attached ? 'applied' : 'skipped',
      attached ? 'attached ' + attached + ' declarative shadow root(s); parser timing/serialization options are not emulated' :
      'no eligible templates found; dynamic templates and serialization extensions are not emulated');
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', installDeclarativeShadowDOMFallback, { once: true });
    } else {
      installDeclarativeShadowDOMFallback();
    }
  }

  // Popover fallback is deliberately limited. It does not emulate the browser
  // top layer, native light-dismiss ordering, or every popover event edge case.
  const nativePopover = typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.showPopover === 'function' &&
    typeof HTMLElement.prototype.hidePopover === 'function';
  if (!nativePopover && typeof HTMLElement !== 'undefined' && typeof document !== 'undefined') {
    const openPopovers = [];
    const isPopover = element => element && element.nodeType === 1 &&
      (element.getAttribute('popover') === 'auto' || element.getAttribute('popover') === 'manual' ||
       element.hasAttribute('popover'));
    const close = (element, reason) => {
      if (!element || !element.hasAttribute('data-s18s-popover-open')) return;
      element.removeAttribute('data-s18s-popover-open');
      element.hidden = true;
      const index = openPopovers.indexOf(element);
      if (index !== -1) openPopovers.splice(index, 1);
      try { element.dispatchEvent(new Event('toggle')); } catch (_) {}
      if (reason === 'escape') {
        try { element.dispatchEvent(new Event('beforetoggle')); } catch (_) {}
      }
    };
    define(HTMLElement.prototype, 'showPopover', function showPopover() {
      if (!isPopover(this) || !this.isConnected) throw new DOMException('Element is not a connected popover', 'InvalidStateError');
      if (this.hasAttribute('data-s18s-popover-open')) return;
      this.hidden = false;
      this.setAttribute('data-s18s-popover-open', '');
      if (this.getAttribute('popover') !== 'manual') {
        for (const item of openPopovers.slice()) if (item !== this && item.getAttribute('popover') !== 'manual') close(item, 'light-dismiss');
      }
      openPopovers.push(this);
      try { this.dispatchEvent(new Event('toggle')); } catch (_) {}
    }, 'Popover');
    define(HTMLElement.prototype, 'hidePopover', function hidePopover() {
      if (!isPopover(this)) throw new DOMException('Element is not a popover', 'InvalidStateError');
      close(this, 'api');
    }, 'Popover');
    define(HTMLElement.prototype, 'togglePopover', function togglePopover(force) {
      const open = this.hasAttribute('data-s18s-popover-open');
      if (arguments.length && !!force === open) return open;
      if (open) this.hidePopover(); else this.showPopover();
      return !open;
    }, 'Popover');
    document.addEventListener('click', event => {
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
      const top = openPopovers[openPopovers.length - 1];
      if (top && top.getAttribute('popover') !== 'manual' && !path.includes(top)) close(top, 'light-dismiss');
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const top = openPopovers[openPopovers.length - 1];
      if (top && top.getAttribute('popover') !== 'manual') close(top, 'escape');
    }, true);
    record('popover', 'applied', 'limited fallback; no native top layer or full spec event semantics');
  } else {
    record('popover', 'skipped', 'native popover support detected');
  }

  // Storage quota and persistence policy are browser-managed. Do not fabricate
  // estimate()/persist() results on engines that do not expose them.
  const storageManager = typeof navigator !== 'undefined' ? navigator.storage : null;
  record('storage-api', storageManager && typeof storageManager.estimate === 'function' &&
    typeof storageManager.persist === 'function' ? 'skipped' : 'limited',
    storageManager && typeof storageManager.estimate === 'function' ?
      'native storage manager detected; quota and eviction remain WebKit-controlled' :
      'no quota/persistence shim installed because synthetic values would be misleading');

  // View Transitions and modern CSS depend on rendering-engine primitives.
  // Never create a fake startViewTransition() or rewrite arbitrary CSS text.
  const css = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' ? {
    containerQueries: CSS.supports('container-type: inline-size'),
    contentVisibility: CSS.supports('content-visibility: auto'),
    viewTransitionName: CSS.supports('view-transition-name: s18s-probe'),
    hasSelector: CSS.supports('selector(:has(*))'),
    colorMix: CSS.supports('color: color-mix(in srgb, red, blue)')
  } : {};
  record('view-transitions', typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' ? 'skipped' : 'limited',
    'native rendering snapshots cannot be polyfilled; callers must retain a non-transition path');
  record('modern-css', 'limited', 'feature detection only; unsupported layout/rendering primitives are not text-rewritten');
  state.capabilities = Object.assign(state.capabilities || {}, {
    setMethods: Object.keys(setMethods).reduce((all, key) => { all[key] = typeof Set.prototype[key] === 'function'; return all; }, {}),
    urlParse: typeof URL !== 'undefined' && typeof URL.parse === 'function',
    blobBytes: typeof Blob !== 'undefined' && typeof Blob.prototype.bytes === 'function',
    responseBytes: typeof Response !== 'undefined' && typeof Response.prototype.bytes === 'function',
    nativePopover,
    declarativeShadowDOM: supportsDeclarativeShadowDOM,
    storageEstimate: !!(storageManager && typeof storageManager.estimate === 'function'),
    storagePersist: !!(storageManager && typeof storageManager.persist === 'function'),
    viewTransitions: typeof document !== 'undefined' && typeof document.startViewTransition === 'function',
    css
  });
})();