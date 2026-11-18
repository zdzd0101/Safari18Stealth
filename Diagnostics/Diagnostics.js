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

  // Collect low-volume, bounded diagnostics only in the top-level page.
  // No resource URLs, query strings, form values, or page text are retained.
  if (topFrame && typeof addEventListener === 'function') {
    addEventListener('error', event => {
      pushBounded(errors, {
        type: 'error',
        message: String(event && event.message || 'script/resource error').slice(0, 240),
        time: Math.round(performance.now())
      }, MAX_ERRORS);
    }, true);

    addEventListener('unhandledrejection', event => {
      const reason = event && event.reason;
      pushBounded(errors, {
        type: 'unhandledrejection',
        message: String(reason && reason.message || reason || 'unhandled rejection').slice(0, 240),
        time: Math.round(performance.now())
      }, MAX_ERRORS);
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
        },
        performance: performanceReport()
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
    state.record('diagnostics', 'applied', 'bounded top-frame runtime, resource, long-task and layout-shift diagnostics');
  } catch (error) {
    state.fail('diagnostics', error);
  }
})();
