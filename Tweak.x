#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <CoreGraphics/CoreGraphics.h>
#import <objc/runtime.h>
#import <objc/message.h>
#import <dlfcn.h>

static NSString *gStealthUA = nil;
static NSString *gStealthJS = nil;

static NSString *GetStealthUA(void) {
    if (!gStealthUA) {
        gStealthUA = [NSString stringWithUTF8String:"Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1"];
    }
    return gStealthUA;
}

static NSString *GetStealthEngineJS(void) {
    if (!gStealthJS) {
        gStealthJS = [NSString stringWithUTF8String:
            "(() => {"
            "  'use strict';"
            "  if (window.__wk18_loaded) return;"
            "  Object.defineProperty(window, '__wk18_loaded', { value: true, enumerable: false, configurable: false, writable: false });"

            "  const nativeMap = new WeakMap();"
            "  const origToString = Function.prototype.toString;"
            "  const proxiedToString = new Proxy(origToString, {"
            "    apply(target, thisArg, args) {"
            "      if (typeof thisArg === 'function' && nativeMap.has(thisArg)) return nativeMap.get(thisArg);"
            "      return Reflect.apply(target, thisArg, args);"
            "    }"
            "  });"
            "  nativeMap.set(proxiedToString, 'function toString() { [native code] }');"
            "  Object.defineProperty(Function.prototype, 'toString', { value: proxiedToString, enumerable: false, configurable: true, writable: true });"

            "  function defineNative(obj, prop, fn) {"
            "    if (!obj || prop in obj) return;"
            "    nativeMap.set(fn, `function ${prop}() { [native code] }`);"
            "    Object.defineProperty(obj, prop, { value: fn, enumerable: false, configurable: true, writable: true });"
            "  }"

            "  const uaVal = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';"
            "  const appVerVal = '5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';"
            "  const getUA = function userAgent() { return uaVal; };"
            "  const getAppVer = function appVersion() { return appVerVal; };"
            "  nativeMap.set(getUA, 'function get userAgent() { [native code] }');"
            "  nativeMap.set(getAppVer, 'function get appVersion() { [native code] }');"
            "  try {"
            "    Object.defineProperty(Navigator.prototype, 'userAgent', { get: getUA, enumerable: true, configurable: true });"
            "    Object.defineProperty(Navigator.prototype, 'appVersion', { get: getAppVer, enumerable: true, configurable: true });"
            "  } catch (_) {}"

            "  defineNative(Object, 'hasOwn', function hasOwn(o, p) {"
            "    if (o == null) throw new TypeError('Cannot convert undefined or null to object');"
            "    return Object.prototype.hasOwnProperty.call(Object(o), p);"
            "  });"
            "  defineNative(Object, 'groupBy', function groupBy(items, cb) {"
            "    const res = Object.create(null); let i = 0;"
            "    for (const item of items) { const k = cb(item, i++); (res[k] ||= []).push(item); }"
            "    return res;"
            "  });"
            "  defineNative(Map, 'groupBy', function groupBy(items, cb) {"
            "    const res = new Map(); let i = 0;"
            "    for (const item of items) { const k = cb(item, i++); const a = res.get(k); if (a) a.push(item); else res.set(k, [item]); }"
            "    return res;"
            "  });"
            "  defineNative(Promise, 'withResolvers', function withResolvers() {"
            "    let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; });"
            "    return { promise, resolve, reject };"
            "  });"
            "  defineNative(URL, 'canParse', function canParse(u, b) {"
            "    try { new URL(u, b); return true; } catch (_) { return false; }"
            "  });"
            "  defineNative(Array.prototype, 'toSorted', function toSorted(fn) { return this.slice().sort(fn); });"
            "  defineNative(Array.prototype, 'toReversed', function toReversed() { return this.slice().reverse(); });"
            "  defineNative(Array.prototype, 'toSpliced', function toSpliced(s, d, ...it) { const c = this.slice(); c.splice(s, d, ...it); return c; });"
            "  defineNative(Array.prototype, 'with', function withFn(i, v) {"
            "    const c = this.slice(); const idx = i < 0 ? c.length + i : i;"
            "    if (idx < 0 || idx >= c.length) throw new RangeError('Invalid index'); c[idx] = v; return c;"
            "  });"
            "  defineNative(Array.prototype, 'at', function at(n) {"
            "    const len = this.length >>> 0; let k = Math.trunc(n) || 0; if (k < 0) k += len;"
            "    return (k < 0 || k >= len) ? undefined : this[k];"
            "  });"

            "  function upgradeModernCSS(css) {"
            "    if (!css || typeof css !== 'string') return css;"
            "    let out = css;"
            "    if (out.indexOf('vh') !== -1) {"
            "      out = out.replace(/(\\d+(?:\\.\\d+)?)(?:dvh|svh|lvh)/g, '$1vh');"
            "    }"
            "    if (out.indexOf('@layer') !== -1) {"
            "      out = out.replace(/@layer\\s+[^{;]+\\{/g, '@media all {');"
            "    }"
            "    if (out.indexOf('&') !== -1) {"
            "      out = out.replace(/([^{}]+)\\{([^{}]*?&[^{}]*\\{[^{}]*\\}[^{}]*)\\}/g, (_, pSel, inner) => {"
            "        let extra = '';"
            "        const cleaned = inner.replace(/(&[^{}]*)\\{([^{}]*)\\}/g, (__, nSel, props) => {"
            "          const resolved = pSel.split(',').map(p => nSel.replace(/&/g, p.trim())).join(', ');"
            "          extra += '\\n' + resolved + ' { ' + props + ' }';"
            "          return '';"
            "        });"
            "        return pSel + ' { ' + cleaned + ' }' + extra;"
            "      });"
            "    }"
            "    return out;"
            "  }"

            "  const origInsertRule = CSSStyleSheet.prototype.insertRule;"
            "  const patchedInsertRule = function insertRule(rule, index) {"
            "    try { return origInsertRule.call(this, upgradeModernCSS(rule), index); }"
            "    catch (e) { return 0; }"
            "  };"
            "  nativeMap.set(patchedInsertRule, 'function insertRule() { [native code] }');"
            "  CSSStyleSheet.prototype.insertRule = patchedInsertRule;"

            "  const observer = new MutationObserver((muts) => {"
            "    for (let i = 0; i < muts.length; i++) {"
            "      const added = muts[i].addedNodes;"
            "      for (let j = 0; j < added.length; j++) {"
            "        const node = added[j];"
            "        if (node.nodeName === 'STYLE' && node.textContent) {"
            "          const txt = node.textContent;"
            "          if (txt.indexOf('&') !== -1 || txt.indexOf('@layer') !== -1 || txt.indexOf('vh') !== -1) {"
            "            node.textContent = upgradeModernCSS(txt);"
            "          }"
            "        }"
            "      }"
            "    }"
            "  });"
            "  observer.observe(document.documentElement, { childList: true, subtree: true });"

            "  window.addEventListener('DOMContentLoaded', () => {"
            "    const fix = document.createElement('style');"
            "    fix.textContent = 'main, [role=\"main\"], section, [data-testid*=\"hero\"], [class*=\"hero\"] { opacity: 1 !important; visibility: visible !important; } dialog[open], [role=\"dialog\"], [aria-modal=\"true\"], [class*=\"modal\"], [class*=\"drawer\"] { opacity: 1 !important; visibility: visible !important; z-index: 2147483647 !important; }';"
            "    (document.head || document.documentElement).appendChild(fix);"
            "    window.dispatchEvent(new Event('resize'));"
            "  }, { once: true });"
            "})();"
        ];
    }
    return gStealthJS;
}

static void EnsureStealthScript(id ucc) {
    if (!ucc) return;
    NSArray *scripts = ((id (*)(id, SEL))objc_msgSend)(ucc, sel_registerName("userScripts"));
    NSString *marker = [NSString stringWithUTF8String:"__wk18_loaded"];
    for (id s in scripts) {
        NSString *src = ((id (*)(id, SEL))objc_msgSend)(s, sel_registerName("source"));
        if (src && [src containsString:marker]) return;
    }
    Class scriptCls = objc_getClass("WKUserScript");
    if (scriptCls) {
        id allocObj = ((id (*)(id, SEL))objc_msgSend)((id)scriptCls, sel_registerName("alloc"));
        id script = ((id (*)(id, SEL, id, NSInteger, BOOL))objc_msgSend)(
            allocObj,
            sel_registerName("initWithSource:injectionTime:forMainFrameOnly:"),
            GetStealthEngineJS(),
            0,
            NO
        );
        if (script) {
            ((void (*)(id, SEL, id))objc_msgSend)(ucc, sel_registerName("addUserScript:"), script);
        }
    }
}

static void ConfigureWebView(id wv) {
    if (!wv) return;
    ((void (*)(id, SEL, id))objc_msgSend)(wv, sel_registerName("setCustomUserAgent:"), GetStealthUA());
    id cfg = ((id (*)(id, SEL))objc_msgSend)(wv, sel_registerName("configuration"));
    if (cfg) {
        id prefs = ((id (*)(id, SEL))objc_msgSend)(cfg, sel_registerName("preferences"));
        if (prefs) {
            ((void (*)(id, SEL, BOOL))objc_msgSend)(prefs, sel_registerName("setJavaScriptCanOpenWindowsAutomatically:"), YES);
        }
        id ucc = ((id (*)(id, SEL))objc_msgSend)(cfg, sel_registerName("userContentController"));
        EnsureStealthScript(ucc);
    }
}

static IMP orig_systemVersion = NULL;
static NSString *hooked_systemVersion(id self, SEL _cmd) {
    return [NSString stringWithUTF8String:"18.7"];
}

static IMP orig_operatingSystemVersion = NULL;
static NSOperatingSystemVersion hooked_operatingSystemVersion(id self, SEL _cmd) {
    NSOperatingSystemVersion ver = {18, 7, 0};
    return ver;
}

static IMP orig_operatingSystemVersionString = NULL;
static NSString *hooked_operatingSystemVersionString(id self, SEL _cmd) {
    return [NSString stringWithUTF8String:"Version 18.7 (Build 22H124)"];
}

static IMP orig_ucc_init = NULL;
static id hooked_ucc_init(id self, SEL _cmd) {
    id ucc = ((id (*)(id, SEL))orig_ucc_init)(self, _cmd);
    EnsureStealthScript(ucc);
    return ucc;
}

static IMP orig_ucc_initWithCoder = NULL;
static id hooked_ucc_initWithCoder(id self, SEL _cmd, NSCoder *coder) {
    id ucc = ((id (*)(id, SEL, NSCoder *))orig_ucc_initWithCoder)(self, _cmd, coder);
    EnsureStealthScript(ucc);
    return ucc;
}

static IMP orig_wv_privInitWithFrame = NULL;
static id hooked_wv_privInitWithFrame(id self, SEL _cmd, CGRect frame, id cfg) {
    id wv = ((id (*)(id, SEL, CGRect, id))orig_wv_privInitWithFrame)(self, _cmd, frame, cfg);
    ConfigureWebView(wv);
    return wv;
}

static IMP orig_wv_initWithFrame = NULL;
static id hooked_wv_initWithFrame(id self, SEL _cmd, CGRect frame, id cfg) {
    id wv = ((id (*)(id, SEL, CGRect, id))orig_wv_initWithFrame)(self, _cmd, frame, cfg);
    ConfigureWebView(wv);
    return wv;
}

static IMP orig_wv_loadRequest = NULL;
static id hooked_wv_loadRequest(id self, SEL _cmd, NSURLRequest *request) {
    ConfigureWebView(self);
    NSString *uaHeader = [NSString stringWithUTF8String:"User-Agent"];
    if ([request isKindOfClass:[NSMutableURLRequest class]]) {
        [(NSMutableURLRequest *)request setValue:GetStealthUA() forHTTPHeaderField:uaHeader];
    } else if (request) {
        NSMutableURLRequest *mut = [request mutableCopy];
        [mut setValue:GetStealthUA() forHTTPHeaderField:uaHeader];
        return ((id (*)(id, SEL, NSURLRequest *))orig_wv_loadRequest)(self, _cmd, mut);
    }
    return ((id (*)(id, SEL, NSURLRequest *))orig_wv_loadRequest)(self, _cmd, request);
}

static IMP orig_wv_setCustomUserAgent = NULL;
static void hooked_wv_setCustomUserAgent(id self, SEL _cmd, NSString *ua) {
    if (orig_wv_setCustomUserAgent) {
        ((void (*)(id, SEL, NSString *))orig_wv_setCustomUserAgent)(self, _cmd, GetStealthUA());
    }
}

static IMP orig_wv_privSetCustomUserAgent = NULL;
static void hooked_wv_privSetCustomUserAgent(id self, SEL _cmd, NSString *ua) {
    if (orig_wv_privSetCustomUserAgent) {
        ((void (*)(id, SEL, NSString *))orig_wv_privSetCustomUserAgent)(self, _cmd, GetStealthUA());
    }
}

static IMP orig_wv_privSetAppName = NULL;
static void hooked_wv_privSetAppName(id self, SEL _cmd, NSString *appName) {
    if (orig_wv_privSetAppName) {
        NSString *verStr = [NSString stringWithUTF8String:"Version/18.7 Mobile/15E148 Safari/604.1"];
        ((void (*)(id, SEL, NSString *))orig_wv_privSetAppName)(self, _cmd, verStr);
    }
}

static IMP orig_wv_customUserAgent = NULL;
static NSString *hooked_wv_customUserAgent(id self, SEL _cmd) {
    return GetStealthUA();
}

static IMP orig_wv_privCustomUserAgent = NULL;
static NSString *hooked_wv_privCustomUserAgent(id self, SEL _cmd) {
    return GetStealthUA();
}

static IMP orig_req_setValueForHTTPHeaderField = NULL;
static void hooked_req_setValueForHTTPHeaderField(id self, SEL _cmd, NSString *value, NSString *field) {
    NSString *uaHeader = [NSString stringWithUTF8String:"User-Agent"];
    if (field && [field caseInsensitiveCompare:uaHeader] == NSOrderedSame) {
        ((void (*)(id, SEL, NSString *, NSString *))orig_req_setValueForHTTPHeaderField)(self, _cmd, GetStealthUA(), field);
        return;
    }
    ((void (*)(id, SEL, NSString *, NSString *))orig_req_setValueForHTTPHeaderField)(self, _cmd, value, field);
}

static void HookInstanceMethod(Class cls, const char *selName, IMP newImp, IMP *origOut) {
    if (!cls) return;
    SEL sel = sel_registerName(selName);
    Method m = class_getInstanceMethod(cls, sel);
    if (!m) return;
    const char *types = method_getTypeEncoding(m);
    IMP prev = method_getImplementation(m);
    if (origOut) *origOut = prev;
    if (!class_addMethod(cls, sel, newImp, types)) {
        method_setImplementation(m, newImp);
    }
}

__attribute__((constructor))
static void InitSafari18Stealth(void) {
    GetStealthUA();
    GetStealthEngineJS();
    dlopen("/System/Library/Frameworks/WebKit.framework/WebKit", RTLD_LAZY);

    Class devCls = objc_getClass("UIDevice");
    HookInstanceMethod(devCls, "systemVersion", (IMP)hooked_systemVersion, &orig_systemVersion);

    Class procCls = objc_getClass("NSProcessInfo");
    HookInstanceMethod(procCls, "operatingSystemVersion", (IMP)hooked_operatingSystemVersion, &orig_operatingSystemVersion);
    HookInstanceMethod(procCls, "operatingSystemVersionString", (IMP)hooked_operatingSystemVersionString, &orig_operatingSystemVersionString);

    Class uccCls = objc_getClass("WKUserContentController");
    HookInstanceMethod(uccCls, "init", (IMP)hooked_ucc_init, &orig_ucc_init);
    HookInstanceMethod(uccCls, "initWithCoder:", (IMP)hooked_ucc_initWithCoder, &orig_ucc_initWithCoder);

    Class wvCls = objc_getClass("WKWebView");
    HookInstanceMethod(wvCls, "_initWithFrame:configuration:", (IMP)hooked_wv_privInitWithFrame, &orig_wv_privInitWithFrame);
    HookInstanceMethod(wvCls, "initWithFrame:configuration:", (IMP)hooked_wv_initWithFrame, &orig_wv_initWithFrame);
    HookInstanceMethod(wvCls, "loadRequest:", (IMP)hooked_wv_loadRequest, &orig_wv_loadRequest);
    HookInstanceMethod(wvCls, "setCustomUserAgent:", (IMP)hooked_wv_setCustomUserAgent, &orig_wv_setCustomUserAgent);
    HookInstanceMethod(wvCls, "_setCustomUserAgent:", (IMP)hooked_wv_privSetCustomUserAgent, &orig_wv_privSetCustomUserAgent);
    HookInstanceMethod(wvCls, "_setApplicationNameForUserAgent:", (IMP)hooked_wv_privSetAppName, &orig_wv_privSetAppName);
    HookInstanceMethod(wvCls, "customUserAgent", (IMP)hooked_wv_customUserAgent, &orig_wv_customUserAgent);
    HookInstanceMethod(wvCls, "_customUserAgent", (IMP)hooked_wv_privCustomUserAgent, &orig_wv_privCustomUserAgent);

    Class reqCls = objc_getClass("NSMutableURLRequest");
    HookInstanceMethod(reqCls, "setValue:forHTTPHeaderField:", (IMP)hooked_req_setValueForHTTPHeaderField, &orig_req_setValueForHTTPHeaderField);
}
