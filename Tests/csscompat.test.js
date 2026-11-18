const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const observed = [];
let observerInstance;
class MockMutationObserver {
  constructor(callback) { this.callback = callback; observerInstance = this; }
  observe(target, options) { observed.push({ target, options }); }
}
class MockStyleSheet {
  insertRule(rule) { this.rule = rule; return 0; }
  replaceSync(text) { this.text = text; }
  replace(text) { this.text = text; return Promise.resolve(); }
}
class MockStyleDeclaration {
  constructor() { this.calls = []; }
  setProperty(property, value, priority) { this.calls.push([property, value, priority]); }
}

const document = {
  nodeType: 9,
  documentElement: null,
  querySelectorAll() { return []; }
};

const context = vm.createContext({
  document,
  MutationObserver: MockMutationObserver,
  CSSStyleSheet: MockStyleSheet,
  CSSStyleDeclaration: MockStyleDeclaration,
  Reflect,
  WeakMap,
  console
});

vm.runInContext(
  "globalThis.__Safari18Stealth__ = {" +
  "applied: [], skipped: [], errors: [], modules: {}," +
  "record(name, status, detail) { this.modules[name] = {status, detail: detail || null}; }," +
  "fail(name, error) { this.errors.push({module:name, message:String(error)}); }" +
  "};",
  context
);

const source = fs.readFileSync(path.join(__dirname, '..', 'CSS', 'CSSCompat.js'), 'utf8');
vm.runInContext(source, context);

const result = vm.runInContext(
  "(() => {" +
  "const sheet = new CSSStyleSheet();" +
  "sheet.insertRule('.panel { height: 100dvh; }');" +
  "const style = new CSSStyleDeclaration();" +
  "style.setProperty('height', 'calc(100dvh - 12px)');" +
  "return {rule: sheet.rule, calls: style.calls, errors: globalThis.__Safari18Stealth__.errors};" +
  "})()",
  context
);

if (!result.rule.includes('height: 100vh') || !result.rule.includes('height: 100dvh')) {
  throw new Error('insertRule should include vh fallback followed by modern unit');
}
if (result.calls.length !== 2 || !result.calls[0][1].includes('100vh') || !result.calls[1][1].includes('100dvh')) {
  throw new Error('setProperty should try legacy fallback then the modern value');
}
if (observed.length !== 1 || observed[0].target !== document) {
  throw new Error('document-start CSS compatibility must observe Document before documentElement exists');
}

// Reproduce the observer seeing its own STYLE textContent update. The second
// pass must be idempotent and must not append another fallback declaration.
let writes = 0;
let text = '.panel { height: 100dvh; }';
const styleNode = {
  nodeType: 1,
  tagName: 'STYLE',
  get textContent() { return text; },
  set textContent(value) { writes++; text = value; },
  querySelectorAll() { return []; }
};
observerInstance.callback([{type:'childList', target:styleNode, addedNodes:[]}]);
const once = text;
observerInstance.callback([{type:'childList', target:styleNode, addedNodes:[]}]);
observerInstance.callback([{type:'childList', target:styleNode, addedNodes:[]}]);
if (writes !== 1) throw new Error('STYLE observer reprocessed its own write');
if ((text.match(/height:\s*100vh/g) || []).length !== 1) {
  throw new Error('repeated observer passes must not duplicate vh fallback declarations');
}
if (!once.includes('height: 100vh') || !once.includes('height: 100dvh')) {
  throw new Error('STYLE fallback must preserve modern declaration');
}
if (result.errors.length) throw new Error(JSON.stringify(result.errors));

const nativeObserved = [];
class NativeMockMutationObserver {
  constructor(callback) { this.callback = callback; }
  observe(target, options) { nativeObserved.push({target, options}); }
}
class NativeMockStyleSheet {
  insertRule(rule) { this.rule = rule; return 0; }
}
const nativeContext = vm.createContext({
  document: {nodeType:9, querySelectorAll() { return []; }},
  CSS: {supports(value) { return /100(dvh|svh|lvh)/.test(value); }},
  MutationObserver: NativeMockMutationObserver,
  CSSStyleSheet: NativeMockStyleSheet,
  CSSStyleDeclaration: MockStyleDeclaration,
  Reflect,
  console
});
vm.runInContext(
  "globalThis.__Safari18Stealth__ = {applied:[], skipped:[], errors:[], modules:{}, " +
  "record(name,status,detail){this.modules[name]={status,detail:detail||null};}, " +
  "fail(name,error){this.errors.push({module:name,message:String(error)});}};",
  nativeContext
);
vm.runInContext(source, nativeContext);
const nativeResult = vm.runInContext(
  "({status:globalThis.__Safari18Stealth__.modules.css.status, " +
  "skipped:globalThis.__Safari18Stealth__.skipped.slice(), " +
  "wrapped:!!CSSStyleSheet.prototype.insertRule.__s18sWrapped})",
  nativeContext
);
if (nativeResult.status !== 'skipped') throw new Error('native viewport support should skip fallback module');
if (nativeObserved.length !== 0) throw new Error('native viewport support must not install document-wide MutationObserver');
if (nativeResult.wrapped) throw new Error('native viewport support must not patch CSSOM methods');


console.log('CSS compatibility tests passed, including observer idempotency');
