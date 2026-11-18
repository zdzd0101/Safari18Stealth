(() => {
  'use strict';
  const KEY = '__Safari18Stealth__';
  if (Object.prototype.hasOwnProperty.call(globalThis, KEY)) return;
  const state = {
    version: '2.1.1',
    mode: 'conservative',
    startedAt: Date.now(),
    applied: [],
    skipped: [],
    errors: []
  };
  try {
    Object.defineProperty(globalThis, KEY, {
      value: state, configurable: false, enumerable: false, writable: false
    });
  } catch (_) { return; }
  state.applied.push('bootstrap');
})();
