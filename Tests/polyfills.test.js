const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { URL } = require('node:url');

const context = vm.createContext({ console, URL });
vm.runInContext(`
  globalThis.__Safari18Stealth__ = { applied: [], skipped: [], errors: [] };
  delete Object.hasOwn;
  delete Object.groupBy;
  delete Map.groupBy;
  delete Promise.withResolvers;
  delete URL.canParse;
  delete Array.prototype.at;
  delete Array.prototype.toReversed;
  delete Array.prototype.toSorted;
  delete Array.prototype.toSpliced;
  delete Array.prototype.with;
`, context);

const source = fs.readFileSync(path.join(__dirname, '..', 'Polyfills', 'Polyfills.js'), 'utf8');
vm.runInContext(source, context);

const result = vm.runInContext(`(() => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const original = [1, 2, 3, 4];
  assert(Object.hasOwn({ a: 1 }, 'a'), 'Object.hasOwn');
  assert(Object.groupBy([1, 2, 3], x => x % 2)['1'].length === 2, 'Object.groupBy');
  assert(Map.groupBy([1, 2, 3], x => x % 2).get(0).length === 1, 'Map.groupBy');
  assert(JSON.stringify(original.toSpliced(1)) === '[1]', 'toSpliced(start) removes tail');
  assert(JSON.stringify(original.toSpliced(1, 1, 9)) === '[1,9,3,4]', 'toSpliced replacement');
  assert(JSON.stringify(original.toSpliced(-1, 1)) === '[1,2,3]', 'toSpliced negative start');
  assert(JSON.stringify(original.with(-1, 8)) === '[1,2,3,8]', 'with negative index');
  assert(original.toReversed()[0] === 4, 'toReversed');
  assert(original.toSorted((a, b) => b - a)[0] === 4, 'toSorted comparator');
  assert(original.at(-1) === 4, 'at negative index');
  assert(URL.canParse('https://example.com'), 'URL.canParse valid URL');
  assert(!URL.canParse('not a URL'), 'URL.canParse invalid URL');
  const deferred = Promise.withResolvers();
  deferred.resolve('ok');
  return { applied: globalThis.__Safari18Stealth__.applied.length, deferred: deferred.promise };
})()`, context);

result.deferred.then(value => {
  if (value !== 'ok') throw new Error('Promise.withResolvers');
  console.log(`Polyfill tests passed (${result.applied} APIs installed)`);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
