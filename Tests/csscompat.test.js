const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const observed = [];
class MockMutationObserver {
  constructor(callback) { this.callback = callback; }
  observe(target, options) { observed.push({ target, options }); }
}
class MockStyleSheet {
  insertRule(rule) { this.rule = rule; return 0; }
  replaceSync(text) { this.text = text; }
}
class MockStyleDeclaration {
  constructor() { this.calls = []; }
  setProperty(property, value, priority) { this.calls.push([property, value, priority]); }
}
const document = { nodeType: 9, documentElement: null, querySelectorAll() { return []; } };
const context = vm.createContext({
  document, MutationObserver: MockMutationObserver,
  CSSStyleSheet: MockStyleSheet, CSSStyleDeclaration: MockStyleDeclaration,
  Reflect, WeakMap, console
});
vm.runInContext("globalThis.__Safari18Stealth__ = { applied: [], skipped: [], errors: [] };", context);
const source = fs.readFileSync(path.join(__dirname, '..', 'CSS', 'CSSCompat.js'), 'utf8');
vm.runInContext(source, context);
const result = vm.runInContext([
  "(() => {",
  " const sheet = new CSSStyleSheet(); sheet.insertRule('.panel { height: 100dvh; }');",
  " const style = new CSSStyleDeclaration(); style.setProperty('height', 'calc(100dvh - 12px)');",
  " return { rule: sheet.rule, calls: style.calls, errors: globalThis.__Safari18Stealth__.errors };",
  "})()"
].join("\\n"), context);
if (!result.rule.includes('height: 100vh') || !result.rule.includes('height: 100dvh')) {
  throw new Error('insertRule should include vh fallback followed by modern unit');
}
if (result.calls.length !== 2 || !result.calls[0][1].includes('100vh') || !result.calls[1][1].includes('100dvh')) {
  throw new Error('setProperty should try legacy fallback then the modern value');
}
if (observed.length !== 1 || observed[0].target !== document) {
  throw new Error('document-start CSS compatibility must observe Document before documentElement exists');
}
if (result.errors.length) throw new Error(JSON.stringify(result.errors));
console.log('CSS compatibility tests passed');
