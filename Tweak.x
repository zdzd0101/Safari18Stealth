#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

static NSString *GetStealthEngineJS(void) {
    static NSString *js;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        js =
        @"(() => {"
        @"'use strict';"
        @"if (window.__Safari18StealthFinal32) return;"
        @"Object.defineProperty(window,'__Safari18StealthFinal32',{value:true,configurable:false});"

        // Additive-only compatibility: never replace APIs that WebKit already provides.
        @"const install=(obj,key,fn)=>{"
          @"if(!obj||key in obj)return;"
          @"try{Object.defineProperty(obj,key,{value:fn,configurable:true,writable:true,enumerable:false})}catch(_){}"
        @"};"
        @"install(Object,'hasOwn',function hasOwn(o,p){"
          @"if(o==null)throw new TypeError('Cannot convert undefined or null to object');"
          @"return Object.prototype.hasOwnProperty.call(Object(o),p)"
        @"});"
        @"install(Object,'groupBy',function groupBy(items,cb){"
          @"const out=Object.create(null);let i=0;"
          @"for(const item of items){const k=cb(item,i++);(out[k]||(out[k]=[])).push(item)}"
          @"return out"
        @"});"
        @"install(Map,'groupBy',function groupBy(items,cb){"
          @"const out=new Map();let i=0;"
          @"for(const item of items){const k=cb(item,i++),a=out.get(k);if(a)a.push(item);else out.set(k,[item])}"
          @"return out"
        @"});"
        @"install(Promise,'withResolvers',function withResolvers(){"
          @"let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return{promise,resolve,reject}"
        @"});"
        @"install(URL,'canParse',function canParse(u,b){try{new URL(u,b);return true}catch(_){return false}});"
        @"install(Array.prototype,'at',function at(n){const a=this,l=a.length;let i=Math.trunc(n)||0;if(i<0)i+=l;return i<0||i>=l?undefined:a[i]});"
        @"install(Array.prototype,'toSorted',function toSorted(fn){return Array.from(this).sort(fn)});"
        @"install(Array.prototype,'toReversed',function toReversed(){return Array.from(this).reverse()});"
        @"install(Array.prototype,'toSpliced',function toSpliced(s,d,...items){const a=Array.from(this);a.splice(s,d,...items);return a});"
        @"install(Array.prototype,'with',function withFn(i,v){const a=Array.from(this),n=i<0?a.length+i:i;if(n<0||n>=a.length)throw new RangeError('Invalid index');a[n]=v;return a});"

        // Preserve the device/browser locale; do not invent a region-language combination.
        // Native Safari/WebKit supplies the authoritative locale signals.
        // Native iOS 18 WebKit already supports modern viewport units. Do not rewrite CSS.
        // Only expose a stable viewport value for pages that explicitly need it.
        @"const updateViewport=()=>{"
          @"try{"
            @"const h=window.visualViewport?window.visualViewport.height:window.innerHeight;"
            @"document.documentElement.style.setProperty('--s18-viewport-height',h+'px');"
          @"}catch(_){}"
        @"};"
        @"if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateViewport,{once:true});else updateViewport();"
        @"window.addEventListener('resize',updateViewport,{passive:true});"
        @"if(window.visualViewport)window.visualViewport.addEventListener('resize',updateViewport,{passive:true});"

        // Recover only semantically-open dialogs that are accidentally inert/hidden.
        @"const recoverOpenUI=()=>{"
          @"try{"
            @"for(const el of document.querySelectorAll('dialog[open],[role=dialog][aria-modal=\"true\"])){"
              @"if(el.hasAttribute('inert'))el.removeAttribute('inert');"
              @"const cs=getComputedStyle(el);"
              @"if(cs.visibility==='hidden'&&el.getAttribute('aria-hidden')!=='true')el.style.setProperty('visibility','visible','important');"
              @"if(cs.pointerEvents==='none')el.style.setProperty('pointer-events','auto','important');"
            @"}"
          @"}catch(_){}"
        @"};"
        @"if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',recoverOpenUI,{once:true});else recoverOpenUI();"
        @"try{"
          @"let timer=0;"
          @"new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(recoverOpenUI,120)}).observe(document.documentElement||document,{subtree:true,childList:true,attributes:true,attributeFilter:['open','aria-modal','aria-hidden','inert']});"
        @"}catch(_){}"

        @"})();";
    });
    return js;
}
static void PR_InstallScript(WKUserContentController *ucc) {
    if (!ucc) return;
    for (WKUserScript *script in ucc.userScripts) {
        if ([script.source containsString:@"__Safari18StealthFinal32"]) return;
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
        view.configuration.preferences.javaScriptCanOpenWindowsAutomatically = YES;
    }
    return view;
}

- (instancetype)_initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)configuration {
    WKWebView *view = %orig;
    if (view) {
        PR_InstallScript(view.configuration.userContentController);
        view.configuration.preferences.javaScriptCanOpenWindowsAutomatically = YES;
    }
    return view;
}

%end
