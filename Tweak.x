#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

static NSString *const kStealthUA = @"Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1";

static NSString *GetStealthEngineJS(void) {
    static NSString *js = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        js = @""
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
        "    if (!css) return css;"
        "    let out = css;"
        "    if (out.indexOf('dvh') !== -1 || out.indexOf('svh') !== -1 || out.indexOf('lvh') !== -1) {"
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
        "    fix.textContent = 'main, [role=\"main\"], section, [data-testid*=\"hero\"], [class*=\"hero\"] { opacity: 1 !important; visibility: visible !important; transform: none !important; } dialog[open], [role=\"dialog\"], [aria-modal=\"true\"], [class*=\"modal\"], [class*=\"drawer\"] { opacity: 1 !important; visibility: visible !important; }';"
        "    (document.head || document.documentElement).appendChild(fix);"
        "    window.dispatchEvent(new Event('resize'));"
        "  }, { once: true });"
        "})();";
    });
    return js;
}

static void InjectStealthIntoWebView(WKWebView *webView) {
    if (!webView) return;
    WKUserContentController *ucc = webView.configuration.userContentController;
    if (ucc) {
        BOOL alreadyAdded = NO;
        for (WKUserScript *s in ucc.userScripts) {
            if ([s.source containsString:@"__wk18_loaded"]) {
                alreadyAdded = YES;
                break;
            }
        }
        if (!alreadyAdded) {
            WKUserScript *stealthScript = [[WKUserScript alloc] initWithSource:GetStealthEngineJS()
                                                                 injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                              forMainFrameOnly:NO];
            [ucc addUserScript:stealthScript];
        }
    }
    webView.configuration.preferences.javaScriptCanOpenWindowsAutomatically = YES;
    if ([webView respondsToSelector:@selector(_setCustomUserAgent:)]) {
        [(id)webView _setCustomUserAgent:kStealthUA];
    }
}

%hook WKWebView

- (instancetype)initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)configuration {
    WKWebView *wv = %orig;
    InjectStealthIntoWebView(wv);
    return wv;
}

- (WKNavigation *)loadRequest:(NSURLRequest *)request {
    InjectStealthIntoWebView(self);
    if ([request isKindOfClass:[NSMutableURLRequest class]]) {
        [(NSMutableURLRequest *)request setValue:kStealthUA forHTTPHeaderField:@"User-Agent"];
    } else if (request) {
        NSMutableURLRequest *mutReq = [request mutableCopy];
        [mutReq setValue:kStealthUA forHTTPHeaderField:@"User-Agent"];
        return %orig(mutReq);
    }
    return %orig;
}

- (void)setCustomUserAgent:(NSString *)customUserAgent {
    %orig(kStealthUA);
}

- (void)_setCustomUserAgent:(NSString *)customUserAgent {
    %orig(kStealthUA);
}

- (NSString *)customUserAgent {
    return kStealthUA;
}

%end
