const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Polyfills', 'ModernCompat.js'), 'utf8');
const context = vm.createContext({
  URL, Blob, Response, Request, Set, Reflect, Object, Promise, Array, Map, Number, String, TypeError,
  document: {readyState:'complete', createElement(){return {innerHTML:'', shadowRoot:null};}, querySelectorAll(){return [];}, addEventListener(){}},
  navigator: {}, CSS: {supports(){return false;}}, console
});
vm.runInContext(`
  for (const key of ['difference','intersection','union','symmetricDifference','isSubsetOf','isSupersetOf','isDisjointFrom']) delete Set.prototype[key];
  delete URL.parse;
  globalThis.__Safari18Stealth__ = {applied:[], skipped:[], errors:[], modules:Object.create(null),
    record(name,status,detail){this.modules[name]={status,detail:detail||null};},
    fail(name,error){this.errors.push({module:name,message:String(error)});}};
`, context);
vm.runInContext(source, context);
const checks = vm.runInContext(`
(() => {
 const assert=(v,m)=>{if(!v)throw new Error(m);};
 const a=new Set([1,2,3]), b=new Set([3,4]);
 assert([...a.difference(b)].join(',')==='1,2','difference');
 assert([...a.intersection(b)].join(',')==='3','intersection');
 assert([...a.union(b)].join(',')==='1,2,3,4','union');
 assert([...a.symmetricDifference(b)].join(',')==='1,2,4','symmetricDifference');
 assert(new Set([1,2]).isSubsetOf(a),'isSubsetOf');
 assert(a.isSupersetOf(new Set([2,3])),'isSupersetOf');
 assert(new Set([1]).isDisjointFrom(new Set([2])),'isDisjointFrom');
 assert(URL.parse('https://example.com').hostname==='example.com','URL.parse valid');
 assert(URL.parse('invalid')===null,'URL.parse invalid');
 const s=globalThis.__Safari18Stealth__;
 assert(s.modules['storage-api'].status==='limited','Storage policy must not fabricate quota');
 assert(s.modules['modern-compat'].status==='applied','module record');
 assert(!s.errors.length,JSON.stringify(s.errors));
 return true;
})()
`, context);
if (!checks) throw new Error('ModernCompat tests failed');
(async()=>{
 const blob=await new Blob([new Uint8Array([1,2,3])]).bytes();
 const response=await new Response(new Uint8Array([4,5])).bytes();
 const request=await new Request('https://example.com', {method:'POST', body:'abc'}).bytes();
 if(Array.from(blob).join(',')!=='1,2,3') throw new Error('Blob.bytes');
 if(Array.from(response).join(',')!=='4,5') throw new Error('Response.bytes');
 if(new TextDecoder().decode(request)!=='abc') throw new Error('Request.bytes');
 console.log('ModernCompat tests passed: Set methods, URL.parse, Blob.bytes, Response.bytes, Request.bytes, Storage policy');
})().catch(e=>{console.error(e);process.exitCode=1;});
