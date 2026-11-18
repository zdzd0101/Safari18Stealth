#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

static NSString *const kStealthUA =
@"Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1";

static NSString *GetStealthEngineJS(void) {
    static NSString *js;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        js =
        @"(() => {"
        @"'use strict';"
        @"if (window.__Safari18Stealth_v230) return;"
        @"Object.defineProperty(window,'__Safari18Stealth_v230',{value:true,configurable:false});"

        // Keep native-looking function strings without replacing Function#toString itself.
        @"const nativeMap=new WeakMap();"
        @"const markNative=(fn,name)=>{try{nativeMap.set(fn,'function '+name+'() { [native code] }')}catch(_){}};"
        @"const install=(obj,key,fn,name)=>{"
          @"if(!obj||key in obj)return;"
          @"markNative(fn,name||key);"
          @"try{Object.defineProperty(obj,key,{value:fn,configurable:true,writable:true,enumerable:false})}catch(_){}"
        @"};"

        // Safe modern JS compatibility. Never replace an API which WebKit already has.
        @"install(Object,'hasOwn',function hasOwn(o,p){"
          @"if(o==null)throw new TypeError('Cannot convert undefined or null to object');"
          @"return Object.prototype.hasOwnProperty.call(Object(o),p)"
        @"},'hasOwn');"
        @"install(Object,'groupBy',function groupBy(items,cb){"
          @"const out=Object.create(null);let i=0;"
          @"for(const item of items){const k=cb(item,i++);(out[k]??=[]).push(item)}"
          @"return out"
        @"},'groupBy');"
        @"install(Map,'groupBy',function groupBy(items,cb){"
          @"const out=new Map();let i=0;"
          @"for(const item of items){const k=cb(item,i++),a=out.get(k);"
          @"if(a)a.push(item);else out.set(k,[item])}"
          @"return out"
        @"},'groupBy');"
        @"install(Promise,'withResolvers',function withResolvers(){"
          @"let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});"
          @"return{promise,resolve,reject}"
        @"},'withResolvers');"
        @"install(URL,'canParse',function canParse(u,b){try{new URL(u,b);return true}catch(_){return false}},'canParse');"
        @"install(Array.prototype,'at',function at(n){const a=this,l=a.length;let i=Math.trunc(n)||0;if(i<0)i+=l;return i<0||i>=l?undefined:a[i]},'at');"
        @"install(Array.prototype,'toSorted',function toSorted(fn){return Array.from(this).sort(fn)},'toSorted');"
        @"install(Array.prototype,'toReversed',function toReversed(){return Array.from(this).reverse()},'toReversed');"
        @"install(Array.prototype,'toSpliced',function toSpliced(s,d,...items){const a=Array.from(this);a.splice(s,d,...items);return a},'toSpliced');"
        @"install(Array.prototype,'with',function withFn(i,v){const a=Array.from(this),n=i<0?a.length+i:i;if(n<0||n>=a.length)throw new RangeError('Invalid index');a[n]=v;return a},'with');"

        // Browser identity is changed only at the web content layer.
        @"try{"
          @"const nav=Navigator.prototype;"
          @"const ua='Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';"
          @"const av='5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';"
          @"Object.defineProperty(nav,'userAgent',{get:()=>ua,configurable:true});"
          @"Object.defineProperty(nav,'appVersion',{get:()=>av,configurable:true});"
        @"}catch(_){}"

        // CSS compatibility: transform only the exact rule being inserted.
        @"const css=(s)=>{"
          @"if(typeof s!=='string'||s.length>200000)return s;"
          @"let x=s;"
          @"x=x.replace(/(\\d+(?:\\.\\d+)?)(?:dvh|svh|lvh)\\b/g,'$1vh');"
          // Do not rewrite @layer or nesting globally: complex rewrites can corrupt modern apps.
          @"return x"
        @"};"
        @"try{"
          @"const proto=CSSStyleSheet.prototype;"
          @"const original=proto.insertRule;"
          @"if(original&&!original.__Safari18Stealth230){"
            @"const wrapped=function insertRule(rule,index){"
              @"try{return original.call(this,css(rule),index)}catch(e){return original.call(this,rule,index)}"
            @"};"
            @"Object.defineProperty(wrapped,'__Safari18Stealth230',{value:true});"
            @"proto.insertRule=wrapped;"
          @"}"
        @"}catch(_){}"

        // Only process dynamically-added STYLE nodes once; never mutate the observer's own marker.
        @"try{"
          @"const seen=new WeakSet();"
          @"const process=(node)=>{"
            @"if(!node||node.nodeType!==1||node.tagName!=='STYLE'||seen.has(node))return;"
            @"seen.add(node);"
            @"const t=node.textContent||'';"
            @"if(t.indexOf('dvh')>=0||t.indexOf('svh')>=0||t.indexOf('lvh')>=0){"
              @"try{node.textContent=css(t)}catch(_){}"
            @"}"
          @"};"
          @"const start=()=>{"
            @"if(!document.documentElement)return;"
            @"const o=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)process(n)});"
            @"o.observe(document.documentElement,{childList:true,subtree:true});"
            @"for(const n of document.querySelectorAll('style'))process(n);"
          @"};"
          @"if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});"
        @"}catch(_){}"

        // Visual compatibility: do not globally override page layout or z-index.
        // Only normalize hidden native dialogs when they are actually open.
        @"const normalizeDialogs=()=>{"
          @"try{for(const d of document.querySelectorAll('dialog[open],[role=dialog][aria-modal=true]')){"
            @"const cs=getComputedStyle(d);"
            @"if(cs.visibility==='hidden'&&d.getAttribute('aria-hidden')!=='true')d.style.setProperty('visibility','visible','important');"
          @"}}catch(_){}"
        @"};"
        @"if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',normalizeDialogs,{once:true});"
        @"else normalizeDialogs();"

        @"})();";
    });
    return js;
}

static void PR_InstallScript(WKUserContentController *ucc) {
    if (!ucc) return;
    for (WKUserScript *script in ucc.userScripts) {
        if ([script.source containsString:@"__Safari18Stealth_v230"]) return;
    }
    WKUserScript *script = [[WKUserScript alloc]
        initWithSource:GetStealthEngineJS()
        injectionTime:WKUserScriptInjectionTimeAtDocumentStart
        forMainFrameOnly:NO];
    [ucc addUserScript:script];
}

%hook WKUserContentController
- (instancetype)init {
    WKUserContentController *ucc = %orig;
    PR_InstallScript(ucc);
    return ucc;
}
%end

%hook WKWebView
- (instancetype)initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)configuration {
    WKWebView *view = %orig;
    if (view) {
        PR_InstallScript(view.configuration.userContentController);
        view.customUserAgent = kStealthUA;
        view.configuration.preferences.javaScriptCanOpenWindowsAutomatically = YES;
    }
    return view;
}

- (instancetype)_initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)configuration {
    WKWebView *view = %orig;
    if (view) {
        PR_InstallScript(view.configuration.userContentController);
        view.customUserAgent = kStealthUA;
        view.configuration.preferences.javaScriptCanOpenWindowsAutomatically = YES;
    }
    return view;
}

- (void)setCustomUserAgent:(NSString *)customUserAgent {
    %orig(kStealthUA);
}

- (NSString *)customUserAgent {
    return kStealthUA;
}
%end
