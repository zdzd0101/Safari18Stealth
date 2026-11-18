const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = vm.createContext({
  console, Date, URL, Reflect, WeakMap,
  performance: {now: () => 1, getEntriesByType: () => []},
  MutationObserver: class { observe() {} },
  document: { querySelectorAll() { return []; } },
  CSSStyleSheet: class { insertRule(rule) { this.rule = rule; return 0; } replaceSync(text) { this.text = text; } replace(text) { this.text = text; return Promise.resolve(); } },
});
for (const relative of [
  '../Engine/Bootstrap.js',
  '../Polyfills/Polyfills.js',
  '../CSS/CSSCompat.js',
  '../Diagnostics/Diagnostics.js'
]) vm.runInContext(fs.readFileSync(path.join(__dirname, relative), 'utf8'), context);

const result = vm.runInContext(`(() => {
  const api = globalThis.__Safari18Stealth__;
  if (!api || api.version !== '3.3 FINAL') throw new Error('bootstrap/version failure');
  if (typeof api.report !== 'function' || typeof api.selfTest !== 'function') throw new Error('diagnostics failure');
  const report = api.report();
  if (!report.modules.bootstrap || !report.modules.polyfills || !report.modules.css || !report.modules.diagnostics) throw new Error('module report incomplete');
  const test = api.selfTest();
  if (!test.ok) throw new Error(JSON.stringify(test));
  return {version: report.version, modules: Object.keys(report.modules).length};
})()`, context);
console.log('Runtime integration tests passed:', result);
