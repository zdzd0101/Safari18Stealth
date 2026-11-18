const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = vm.createContext({
  console, Date, URL, Reflect, WeakMap, Blob, Response,
  performance: {now: () => 1, getEntriesByType: () => []},
  MutationObserver: class { observe() {} },
  document: { querySelectorAll() { return []; } },
  CSSStyleSheet: class { insertRule(rule) { this.rule = rule; return 0; } replaceSync(text) { this.text = text; } replace(text) { this.text = text; return Promise.resolve(); } },
});
for (const relative of [
  '../Engine/Bootstrap.js',
  '../Polyfills/Polyfills.js',
  '../Polyfills/ModernCompat.js',
  '../CSS/CSSCompat.js',
  '../Diagnostics/Diagnostics.js'
]) vm.runInContext(fs.readFileSync(path.join(__dirname, relative), 'utf8'), context);

const result = vm.runInContext(`(() => {
  const api = globalThis.__Safari18Stealth__;
  if (!api || api.version !== '4.0 FINAL') throw new Error('bootstrap/version failure');
  if (typeof api.report !== 'function' || typeof api.selfTest !== 'function') throw new Error('diagnostics failure');
  const report = api.report();
  if (!report.modules.bootstrap || !report.modules.polyfills || !report.modules.css || !report.modules.diagnostics || !report.modules['modern-compat']) throw new Error('module report incomplete');
  const test = api.selfTest();
  if (!test.ok) throw new Error(JSON.stringify(test));
  if (!report.paypalChat || !report.paypalChat.nodeChat || report.paypalChat.frames !== 0) throw new Error('chat diagnostic snapshot missing');
  if (!Array.isArray(report.pageLifecycle) || !Array.isArray(report.contentSecurityPolicy)) throw new Error('lifecycle/CSP diagnostics missing');
  if (new Set([1,2]).difference(new Set([2])).size !== 1) throw new Error('Set.difference polyfill');
  if (typeof URL.parse !== 'function' || URL.parse('invalid') !== null) throw new Error('URL.parse compatibility');
  return {version: report.version, modules: Object.keys(report.modules).length};
})()`, context);
console.log('Runtime integration tests passed:', result);
