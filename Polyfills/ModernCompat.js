(() => {
  'use strict';
  const state = globalThis.__Safari18Stealth__;
  if (!state) return;
  const has = (object, key) => object != null && key in object;
  const define = (target, key, value, moduleName) => {
    if (!target) {
      state.skipped.push(moduleName + '.' + key);
      return false;
    }
    if (key in target) {
      record(moduleName + '.' + key, 'native', 'native implementation detected; no polyfill installed');
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
  if (typeof Request !== 'undefined') define(Request.prototype, 'bytes', async function bytes() {
    return new Uint8Array(await this.arrayBuffer());
  }, 'Request');
  if (typeof PushMessageData !== 'undefined') define(PushMessageData.prototype, 'bytes', async function bytes() {
    return new Uint8Array(await this.arrayBuffer());
  }, 'PushMessageData');

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
      record('declarative-shadow-dom', supportsDeclarativeShadowDOM ? 'native' : 'unsupported', supportsDeclarativeShadowDOM ? 'native parser consumed declarative shadow root; no fallback installed' : 'DOM unavailable; no fallback installed');
      return;
    }
    let attached = 0;
    const templates = document.querySelectorAll('template[shadowrootmode]');
    for (const template of templates) {
      const host = template.parentElement;
      const mode = template.getAttribute('shadowrootmode');
      const delegatesFocus = template.hasAttribute('shadowrootdelegatesfocus');
      const clonable = template.hasAttribute('shadowrootclonable');
      const serializable = template.hasAttribute('shadowrootserializable');
      if (!host || host.shadowRoot || (mode !== 'open' && mode !== 'closed')) continue;
      try {
        const root = host.attachShadow({ mode, delegatesFocus, clonable, serializable });
        root.appendChild(template.content);
        template.remove();
        attached++;
      } catch (error) {
        state.errors.push({ module: 'declarative-shadow-dom', message: String(error) });
      }
    }
    record('declarative-shadow-dom', attached ? 'applied' : 'limited',
      attached ? 'attached ' + attached + ' declarative shadow root(s); parser timing/serialization options are not emulated' :
      'native parser unavailable and no eligible templates were present; fallback is ready but no page templates were processed');
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', installDeclarativeShadowDOMFallback, { once: true });
    } else {
      installDeclarativeShadowDOMFallback();
    }
  }

  // Popover fallback: API methods plus the HTML invoker attributes used by Safari 17.
  // It intentionally cannot emulate the browser top layer, native focus navigation,
  // exact toggle-event task timing, or all light-dismiss rules.
  const nativePopover = typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.showPopover === 'function' &&
    typeof HTMLElement.prototype.hidePopover === 'function';
  if (!nativePopover && typeof HTMLElement !== 'undefined' && typeof document !== 'undefined') {
    const openPopovers = [];
    const invokers = new WeakMap();
    const isPopover = element => element && element.nodeType === 1 &&
      (element.getAttribute('popover') === 'auto' || element.getAttribute('popover') === 'manual' ||
       element.hasAttribute('popover'));
    const dispatchPopoverEvent = (element, type) => {
      try { element.dispatchEvent(new Event(type, {bubbles:false, cancelable:false})); } catch (_) {}
    };
    const close = (element, reason) => {
      if (!element || !element.hasAttribute('data-s18s-popover-open')) return;
      dispatchPopoverEvent(element, 'beforetoggle');
      element.removeAttribute('data-s18s-popover-open');
      element.hidden = true;
      const index = openPopovers.indexOf(element);
      if (index !== -1) openPopovers.splice(index, 1);
      dispatchPopoverEvent(element, 'toggle');
      if (reason === 'escape') {
        const invoker = invokers.get(element);
        if (invoker && typeof invoker.focus === 'function') {
          try { invoker.focus(); } catch (_) {}
        }
      }
    };
    define(HTMLElement.prototype, 'showPopover', function showPopover() {
      if (!isPopover(this) || !this.isConnected) throw new DOMException('Element is not a connected popover', 'InvalidStateError');
      if (this.hasAttribute('data-s18s-popover-open')) return;
      if (this.getAttribute('popover') !== 'manual') {
        for (const item of openPopovers.slice()) {
          if (item !== this && item.getAttribute('popover') !== 'manual') close(item, 'light-dismiss');
        }
      }
      dispatchPopoverEvent(this, 'beforetoggle');
      this.hidden = false;
      this.setAttribute('data-s18s-popover-open', '');
      openPopovers.push(this);
      dispatchPopoverEvent(this, 'toggle');
    }, 'Popover');
    define(HTMLElement.prototype, 'hidePopover', function hidePopover() {
      if (!isPopover(this)) throw new DOMException('Element is not a connected popover', 'InvalidStateError');
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
      // Implement popovertarget + popovertargetaction for invokers, including
      // invokers surfaced through an open ShadowRoot's composed event path.
      for (const node of path) {
        if (!node || typeof node.getAttribute !== 'function') continue;
        const targetId = node.getAttribute('popovertarget');
        if (!targetId) continue;
        const target = typeof document.getElementById === 'function' ? document.getElementById(targetId) : null;
        if (!isPopover(target)) continue;
        invokers.set(target, node);
        const action = node.getAttribute('popovertargetaction') || 'toggle';
        try {
          if (action === 'show') target.showPopover();
          else if (action === 'hide') target.hidePopover();
          else target.togglePopover();
        } catch (_) {}
        return;
      }
      const top = openPopovers[openPopovers.length - 1];
      if (top && top.getAttribute('popover') !== 'manual' && !path.includes(top)) close(top, 'light-dismiss');
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const top = openPopovers[openPopovers.length - 1];
      if (top && top.getAttribute('popover') !== 'manual') close(top, 'escape');
    }, true);
    record('popover', 'applied', 'API and popovertarget invoker fallback; no native top layer or complete focus/event semantics');
  } else {
    record('popover', 'native', 'native Popover API detected; no fallback installed');
  }

  // Storage quota and persistence policy are browser-managed. Do not fabricate
  // estimate()/persist() results on engines that do not expose them.
  const storageManager = typeof navigator !== 'undefined' ? navigator.storage : null;
  const storageEstimateNative = !!(storageManager && typeof storageManager.estimate === 'function');
  const storagePersistNative = !!(storageManager && typeof storageManager.persist === 'function');
  const storagePersistedNative = !!(storageManager && typeof storageManager.persisted === 'function');
  record('storage-estimate', storageEstimateNative ? 'native' : 'unsupported', storageEstimateNative ? 'native StorageManager.estimate detected' : 'not exposed by this WebKit; no synthetic quota values');
  record('storage-persist', storagePersistNative ? 'native' : 'unsupported', storagePersistNative ? 'native StorageManager.persist detected' : 'not exposed by this WebKit; no synthetic permission result');
  record('storage-persisted', storagePersistedNative ? 'native' : 'unsupported', storagePersistedNative ? 'native StorageManager.persisted detected' : 'not exposed by this WebKit; no synthetic persistence state');
  record('storage-api', storageEstimateNative && storagePersistNative && storagePersistedNative ? 'native' : 'limited',
    'native StorageManager methods are reported individually; quota and eviction remain WebKit-controlled');

  // View Transitions and modern CSS depend on rendering-engine primitives.
  // Never create a fake startViewTransition() or rewrite arbitrary CSS text.
  const css = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' ? {
    containerQueries: CSS.supports('container-type: inline-size'),
    contentVisibility: CSS.supports('content-visibility: auto'),
    viewTransitionName: CSS.supports('view-transition-name: s18s-probe'),
    hasSelector: CSS.supports('selector(:has(*))'),
    colorMix: CSS.supports('color: color-mix(in srgb, red, blue)')
  } : {};
  const nativeViewTransitions = typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
  record('view-transitions', nativeViewTransitions ? 'native' : 'unsupported',
    nativeViewTransitions ? 'native View Transitions API detected; no shim installed' : 'native rendering snapshots cannot be polyfilled; callers must retain a non-transition path');
  for (const [feature, supported] of Object.entries(css)) {
    record('css.' + feature, supported ? 'native' : 'unsupported', supported ? 'CSS.supports reports native support' : 'CSS.supports reports unsupported; no rendering-engine shim installed');
  }
  record('modern-css', 'limited', 'per-feature native support is recorded; unsupported layout/rendering primitives are not text-rewritten');
  record('modern-compat', 'applied', 'capability-gated compatibility checks and limited fallbacks initialized');
  state.capabilities = Object.assign(state.capabilities || {}, {
    setMethods: Object.keys(setMethods).reduce((all, key) => { all[key] = typeof Set.prototype[key] === 'function'; return all; }, {}),
    urlParse: typeof URL !== 'undefined' && typeof URL.parse === 'function',
    blobBytes: typeof Blob !== 'undefined' && typeof Blob.prototype.bytes === 'function',
    responseBytes: typeof Response !== 'undefined' && typeof Response.prototype.bytes === 'function',
    requestBytes: typeof Request !== 'undefined' && typeof Request.prototype.bytes === 'function',
    pushMessageDataBytes: typeof PushMessageData !== 'undefined' && typeof PushMessageData.prototype.bytes === 'function',
    nativePopover,
    declarativeShadowDOM: supportsDeclarativeShadowDOM,
    storageEstimate: storageEstimateNative,
    storagePersist: storagePersistNative,
    storagePersisted: storagePersistedNative,
    viewTransitions: nativeViewTransitions,
    css
  });
})();