(() => {
  'use strict';
  const state = globalThis.__Safari18Stealth__;
  if (!state) return;
  try {
    const report = () => ({
      version: state.version,
      mode: state.mode,
      startedAt: state.startedAt,
      applied: state.applied.slice(),
      skipped: state.skipped.slice(),
      errors: state.errors.slice()
    });
    Object.defineProperty(state, 'report', { value: report, enumerable: true, configurable: false, writable: false });
    state.applied.push('diagnostics-report');
  } catch (error) {
    state.errors.push({ module: 'diagnostics', message: String(error) });
  }
})();
