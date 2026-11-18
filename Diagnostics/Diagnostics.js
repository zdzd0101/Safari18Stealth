(() => {
  'use strict';
  const state = globalThis.__Safari18Stealth__;
  if (!state) return;

  const MAX_ERRORS = 30;
  const MAX_LONG_TASKS = 40;
  const MAX_LAYOUT_SHIFTS = 40;
  const MAX_RESOURCES = 80;
  const errors = [];
  const longTasks = [];
  const layoutShifts = [];
  const resources = [];
  const lifecycle = [];
  const policyViolations = [];
  const crossOriginMessages = [];
  const pushBounded = (array, value, limit) => {
    array.push(value);
    if (array.length > limit) array.shift();
  };
  const topFrame = (() => {
    try { return globalThis === globalThis.top; } catch (_) { return false; }
  })();

  const safeHost = name => {
    try { return new URL(name, location.href).host; } catch (_) { return ''; }
  };
  const safeMessage = value => String(value || 'unknown')
    .replace(/https?:\/\/[^\s)]+/gi, raw => {
      try { const u = new URL(raw); return u.origin + u.pathname; } catch (_) { return '[url]'; }
    })
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .slice(0, 200);

  // Snapshot-only PayPal/chat diagnostics: no network interception, DOM mutation,
  // SDK method calls, page text, cookies, headers, request bodies or query strings.
  const paypalChatSnapshot = () => {
    const snapshot = {
      nodeChat: { exists: false, type: 'undefined' },
      messagingScripts: [], messagingResources: [],
      frames: 0, shadowRoots: 0, chatLikeNodes: [], popovers: [], dialogs: []
    };
    try {
      const chat = globalThis.nodeChat;
      snapshot.nodeChat.exists = typeof chat !== 'undefined' && chat !== null;
      snapshot.nodeChat.type = chat === null ? 'null' : typeof chat;
    } catch (_) {}
    try {
      const scripts = document.scripts || [];
      for (let i = 0; i < scripts.length && snapshot.messagingScripts.length < 12; i++) {
        const src = scripts[i].src || '';
        if (!/paypalobjects\.com\/messaging|paypal\.com\/.*messag/i.test(src)) continue;
        try { const u = new URL(src, location.href); snapshot.messagingScripts.push({host:u.host, path:u.pathname}); } catch (_) {}
      }
    } catch (_) {}
    try {
      const entries = performance.getEntriesByType('resource') || [];
      for (let i = Math.max(0, entries.length - 160); i < entries.length && snapshot.messagingResources.length < 20; i++) {
        const entry = entries[i];
        if (!/paypalobjects\.com\/messaging|paypal\.com\/.*messag/i.test(entry.name || '')) continue;
        let host = '', path = '';
        try { const u = new URL(entry.name, location.href); host = u.host; path = u.pathname; } catch (_) {}
        snapshot.messagingResources.push({host, path, initiator: String(entry.initiatorType || '').slice(0,24),
          durationMs: Math.round(entry.duration || 0), transferBytes: entry.transferSize || 0,
          decodedBytes: entry.decodedBodySize || 0,
          responseStatus: Number.isFinite(entry.responseStatus) ? entry.responseStatus : null});
      }
    } catch (_) {}
    try {
      const all = document.querySelectorAll ? document.querySelectorAll('*') : [];
      const candidates = [];
      for (let i = 0; i < all.length && i < 240; i++) {
        const el = all[i];
        try { if (el.shadowRoot) snapshot.shadowRoots++; } catch (_) {}
        if (snapshot.frames < 30 && String(el.tagName || '').toLowerCase() === 'iframe') snapshot.frames++;
        if (candidates.length < 40) {
          const tag = String(el.tagName || '').toLowerCase();
          const id = String(el.id || '').toLowerCase();
          const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
          const role = String(el.getAttribute && el.getAttribute('role') || '').toLowerCase();
          const popover = el.hasAttribute && el.hasAttribute('popover');
          if (/chat|messag|support|help.?center/.test(id + ' ' + cls) || popover || role === 'dialog' || role === 'alertdialog') {
            let visible = null;
            try { const style = getComputedStyle(el); visible = !el.hidden && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0; } catch (_) {}
            const item = {tag, role: role || null, visible, hidden: !!el.hidden, ariaHidden: el.getAttribute && el.getAttribute('aria-hidden'), hasShadowRoot: !!el.shadowRoot};
            if (/chat|messag|support|help.?center/.test(id + ' ' + cls)) snapshot.chatLikeNodes.push(item);
            if (popover) snapshot.popovers.push({open: el.hasAttribute('data-s18s-popover-open') || !el.hidden, type: el.getAttribute('popover') || 'auto', visible});
            if (role === 'dialog' || role === 'alertdialog') snapshot.dialogs.push(item);
          }
        }
      }
      snapshot.chatLikeNodes = snapshot.chatLikeNodes.slice(0, 12);
      snapshot.popovers = snapshot.popovers.slice(0, 12);
      snapshot.dialogs = snapshot.dialogs.slice(0, 12);
    } catch (_) {}
    return snapshot;
  };

  // Collect low-volume, bounded diagnostics only in the top-level page.
  // No resource URLs, query strings, form values, or page text are retained.
  if (topFrame && typeof addEventListener === 'function') {
    addEventListener('error', event => {
      pushBounded(errors, {
        type: 'error',
        message: safeMessage(event && event.message || 'script/resource error'),
        time: Math.round(performance.now())
      }, MAX_ERRORS);
    }, true);

    addEventListener('unhandledrejection', event => {
      const reason = event && event.reason;
      pushBounded(errors, {
        type: 'unhandledrejection',
        message: safeMessage(reason && reason.message || reason || 'unhandled rejection'),
        time: Math.round(performance.now())
      }, MAX_ERRORS);
    });

    const recordLifecycle = type => pushBounded(lifecycle, {type, time:Math.round(performance.now()),
      visibility: typeof document !== 'undefined' ? document.visibilityState || 'unknown' : 'unknown'}, 24);
    ['pageshow','pagehide','focus','blur','online','offline'].forEach(type => addEventListener(type, () => recordLifecycle(type)));
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => recordLifecycle('visibilitychange'));
    }
    addEventListener('message', event => {
      let origin = '';
      try { origin = new URL(event.origin).origin; } catch (_) { origin = 'null'; }
      pushBounded(crossOriginMessages, {origin, dataType:typeof event.data,
        ports:event.ports && Number.isFinite(event.ports.length) ? event.ports.length : 0,
        sourceWindow:!!event.source, time:Math.round(performance.now())}, 30);
    });
    addEventListener('securitypolicyviolation', event => {
      let blockedHost = '';
      try { blockedHost = event.blockedURI && event.blockedURI !== 'inline' && event.blockedURI !== 'eval' ? safeHost(event.blockedURI) : ''; } catch (_) {}
      pushBounded(policyViolations, {directive:String(event.effectiveDirective || '').slice(0,80),
        blockedHost, disposition:String(event.disposition || '').slice(0,24), time:Math.round(performance.now())}, 20);
    });

    if (typeof PerformanceObserver === 'function') {
      const observe = (type, callback) => {
        try {
          const observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) callback(entry);
          });
          observer.observe({type, buffered:true});
          return true;
        } catch (_) { return false; }
      };

      observe('longtask', entry => pushBounded(longTasks, {
        start: Math.round(entry.startTime),
        duration: Math.round(entry.duration)
      }, MAX_LONG_TASKS));

      observe('layout-shift', entry => {
        if (!entry.hadRecentInput && entry.value > 0) {
          pushBounded(layoutShifts, {
            start: Math.round(entry.startTime),
            value: Math.round(entry.value * 10000) / 10000
          }, MAX_LAYOUT_SHIFTS);
        }
      });

      observe('resource', entry => pushBounded(resources, {
        host: safeHost(entry.name),
        type: String(entry.initiatorType || '').slice(0, 32),
        start: Math.round(entry.startTime),
        duration: Math.round(entry.duration),
        transferBytes: entry.transferSize || 0,
        decodedBytes: entry.decodedBodySize || 0
      }, MAX_RESOURCES));
    }
  }

  const performanceReport = () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resourceEntries = performance.getEntriesByType('resource');
    const resourceTotals = {count:resourceEntries.length, failedOrOpaque:0, transferBytes:0};
    for (const entry of resourceEntries) {
      if (entry.transferSize === 0 && entry.decodedBodySize === 0) resourceTotals.failedOrOpaque++;
      resourceTotals.transferBytes += entry.transferSize || 0;
    }
    return {
      topFrame,
      navigation: navigation ? {
        domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
        loadMs: Math.round(navigation.loadEventEnd),
        responseMs: Math.round(navigation.responseEnd - navigation.requestStart),
        transferBytes: navigation.transferSize || 0
      } : null,
      resources: resourceTotals,
      longTasks: {count:longTasks.length, maxMs:longTasks.reduce((m,x)=>Math.max(m,x.duration),0), recent:longTasks.slice(-12)},
      layoutShifts: {count:layoutShifts.length, total:Math.round(layoutShifts.reduce((s,x)=>s+x.value,0)*10000)/10000, recent:layoutShifts.slice(-12)},
      recentResources: resources.slice(-20),
      runtimeErrors: errors.slice(-20),
      memory: performance.memory ? {
        usedBytes: performance.memory.usedJSHeapSize,
        totalBytes: performance.memory.totalJSHeapSize
      } : null
    };
  };

  try {
    Object.defineProperty(state, 'report', {
      value: () => ({
        version: state.version,
        mode: state.mode,
        startedAt: state.startedAt,
        ageMs: Math.max(0, Date.now() - state.startedAt),
        modules: JSON.parse(JSON.stringify(state.modules)),
        applied: state.applied.slice(),
        skipped: state.skipped.slice(),
        errors: state.errors.slice(),
        capabilities: Object.assign({
          objectHasOwn: typeof Object.hasOwn === 'function',
          objectGroupBy: typeof Object.groupBy === 'function',
          mapGroupBy: typeof Map.groupBy === 'function',
          promiseWithResolvers: typeof Promise.withResolvers === 'function',
          urlCanParse: typeof URL !== 'undefined' && typeof URL.canParse === 'function',
          arrayAt: typeof Array.prototype.at === 'function',
          arrayToReversed: typeof Array.prototype.toReversed === 'function',
          arrayToSorted: typeof Array.prototype.toSorted === 'function',
          arrayToSpliced: typeof Array.prototype.toSpliced === 'function',
          arrayWith: typeof Array.prototype.with === 'function'
        }, state.capabilities || {}),
        performance: performanceReport(),
        paypalChat: paypalChatSnapshot(),
        pageLifecycle: lifecycle.slice(-16),
        contentSecurityPolicy: policyViolations.slice(-12),
        crossOriginMessages: crossOriginMessages.slice(-20)
      }),
      enumerable: true, configurable: false, writable: false
    });
    Object.defineProperty(state, 'selfTest', {
      value: () => {
        const checks = [];
        const check = (name, fn) => { try { checks.push({name, ok:!!fn()}); } catch (error) { checks.push({name, ok:false, error:String(error)}); } };
        check('state', () => globalThis.__Safari18Stealth__ === state);
        check('Object.hasOwn', () => Object.hasOwn({x:1}, 'x'));
        check('Array.at', () => [1,2,3].at(-1) === 3);
        check('Promise', () => Promise.resolve(1) instanceof Promise);
        check('performance-report', () => {
          const report = performanceReport();
          return !!report && Array.isArray(report.recentResources) && Array.isArray(report.runtimeErrors);
        });
        return {ok:checks.every(x=>x.ok), checks};
      },
      enumerable: true, configurable: false, writable: false
    });
    state.record('diagnostics', 'applied', 'bounded runtime/performance diagnostics plus read-only chat SDK, DOM, frame, popover, CSP, cross-origin message metadata and page-lifecycle snapshots');
  } catch (error) {
    state.fail('diagnostics', error);
  }
})();
