(() => {
  'use strict';
  const state = globalThis.__Safari18Stealth__;
  if (!state) return;
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
        capabilities: {
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
        }
      }),
      enumerable: true, configurable: false, writable: false
    });
    Object.defineProperty(state, 'selfTest', {
      value: () => {
        const checks = [];
        const check = (name, fn) => { try { checks.push({name, ok: !!fn()}); } catch (e) { checks.push({name, ok:false, error:String(e)}); } };
        check('state', () => globalThis.__Safari18Stealth__ === state);
        check('Object.hasOwn', () => Object.hasOwn({x:1}, 'x'));
        check('Array.at', () => [1,2,3].at(-1) === 3);
        return {ok: checks.every(x => x.ok), checks};
      },
      enumerable: true, configurable: false, writable: false
    });
    state.record('diagnostics', 'applied', 'report and self-test available');
  } catch (error) {
    state.fail('diagnostics', error);
  }
})();
