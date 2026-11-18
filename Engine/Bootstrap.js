(() => {
  'use strict';
  const KEY = '__Safari18Stealth__';
  if (Object.prototype.hasOwnProperty.call(globalThis, KEY)) return;
  const state = {
    version: '2.2.0',
    mode: 'compatibility',
    startedAt: Date.now(),
    modules: Object.create(null),
    applied: [],
    skipped: [],
    errors: []
  };
  state.record = (name, status, detail) => {
    state.modules[name] = { status, detail: detail || null };
    if (status === 'applied') state.applied.push(name);
    if (status === 'skipped') state.skipped.push(name);
  };
  state.fail = (module, error) => {
    state.errors.push({ module, message: error && error.message ? String(error.message) : String(error) });
    state.modules[module] = { status: 'error', detail: null };
  };
  try {
    Object.defineProperty(globalThis, KEY, {
      value: state, configurable: false, enumerable: false, writable: false
    });
    state.record('bootstrap', 'applied', 'runtime state initialized');
  } catch (_) {}
})();
