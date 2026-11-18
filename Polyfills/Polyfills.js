(() => {
  'use strict';
  const state = globalThis.__Safari18Stealth__;
  if (!state) return;
  const hasOwn = (o, p) => Object.prototype.hasOwnProperty.call(o, p);
  const define = (target, key, value) => {
    if (key in target) { state.skipped.push(String(key)); return; }
    Object.defineProperty(target, key, { value, configurable: true, writable: true, enumerable: false });
    state.applied.push(String(key));
  };
  const toObject = value => {
    if (value == null) throw new TypeError('Cannot convert undefined or null to object');
    return Object(value);
  };
  const toIntegerOrInfinity = value => {
    const n = Number(value);
    if (Number.isNaN(n) || n === 0) return 0;
    if (!Number.isFinite(n)) return n;
    return Math.trunc(n);
  };
  const toLength = value => Math.min(Math.max(toIntegerOrInfinity(value), 0), Number.MAX_SAFE_INTEGER);

  define(Object, 'hasOwn', function hasOwnPropertyCompat(object, property) {
    return hasOwn(toObject(object), property);
  });

  define(Object, 'groupBy', function groupBy(items, callback) {
    if (typeof callback !== 'function') throw new TypeError('callback must be callable');
    const result = Object.create(null);
    let index = 0;
    for (const value of items) {
      if (index >= Number.MAX_SAFE_INTEGER) throw new TypeError('Too many items');
      const key = callback(value, index++);
      const propertyKey = typeof key === 'symbol' ? key : String(key);
      if (!hasOwn(result, propertyKey)) Object.defineProperty(result, propertyKey, { value: [], configurable: true, enumerable: true, writable: true });
      result[propertyKey].push(value);
    }
    return result;
  });

  define(Map, 'groupBy', function mapGroupBy(items, callback) {
    if (typeof callback !== 'function') throw new TypeError('callback must be callable');
    const result = new Map();
    let index = 0;
    for (const value of items) {
      const key = callback(value, index++);
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(value);
    }
    return result;
  });

  define(Promise, 'withResolvers', function withResolvers() {
    let resolve, reject;
    const promise = new this((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  });

  define(URL, 'canParse', function canParse(url, base) {
    try { if (arguments.length > 1) new URL(url, base); else new URL(url); return true; }
    catch (_) { return false; }
  });

  define(Array.prototype, 'at', function at(index) {
    const object = toObject(this);
    const length = toLength(object.length);
    let relative = toIntegerOrInfinity(index);
    if (relative === -Infinity) relative = -length;
    const k = relative < 0 ? length + relative : relative;
    return k < 0 || k >= length ? undefined : object[k];
  });

  define(Array.prototype, 'toReversed', function toReversed() {
    const object = toObject(this), length = toLength(object.length), result = new Array(length);
    for (let k = 0; k < length; k++) result[k] = object[length - k - 1];
    return result;
  });

  define(Array.prototype, 'toSorted', function toSorted(compareFn) {
    if (compareFn !== undefined && typeof compareFn !== 'function') throw new TypeError('comparison function must be callable');
    const object = toObject(this), length = toLength(object.length), values = [];
    for (let k = 0; k < length; k++) values.push(object[k]);
    return values.sort(compareFn);
  });

  define(Array.prototype, 'toSpliced', function toSpliced(start, deleteCount) {
    const object = toObject(this), length = toLength(object.length);
    const relativeStart = toIntegerOrInfinity(start);
    const actualStart = relativeStart === -Infinity ? 0 : (relativeStart < 0 ? Math.max(length + relativeStart, 0) : Math.min(relativeStart, length));
    let actualDelete;
    if (arguments.length === 1) actualDelete = length - actualStart;
    else actualDelete = Math.min(Math.max(toIntegerOrInfinity(deleteCount), 0), length - actualStart);
    const items = Array.prototype.slice.call(arguments, 2);
    const newLength = length + items.length - actualDelete;
    if (newLength > 0xFFFFFFFF) throw new TypeError('Invalid array length');
    const result = new Array(newLength);
    let n = 0;
    for (let k = 0; k < actualStart; k++) result[n++] = object[k];
    for (const item of items) result[n++] = item;
    for (let k = actualStart + actualDelete; k < length; k++) result[n++] = object[k];
    return result;
  });

  define(Array.prototype, 'with', function withIndex(index, value) {
    const object = toObject(this), length = toLength(object.length);
    let relative = toIntegerOrInfinity(index);
    if (relative === -Infinity) relative = -length;
    const actual = relative < 0 ? length + relative : relative;
    if (actual < 0 || actual >= length) throw new RangeError('Invalid index');
    const result = new Array(length);
    for (let k = 0; k < length; k++) result[k] = k === actual ? value : object[k];
    return result;
  });
})();
