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
        "          if (node.textContent.indexOf('&') !== -1 || node.textContent.indexOf('@layer') !== -1) {"
        "            node.textContent = upgradeModernCSS(node.textContent);"
        "          }"
        "        }"
        "      }"
        "    }"
        "  });"
        "  observer.observe(document.documentElement, { childList: true, subtree: true });"
        "  window.addEventListener('DOMContentLoaded', () => {"
        "    const fix = document.createElement('style');"
        "    fix.textContent = 'main, [role=\"main\"], section { opacity: 1 !important; visibility: visible !important; } dialog[open], [role=\"dialog\"], [aria-modal=\"true\"] { display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 2147483647 !important; }';"
        "    (document.head || document.documentElement).appendChild(fix);"
        "  }, { once: true });"
        "})();";
    });
    return js;
}

%hook WKWebView

- (instancetype)initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)configuration {
    if (!configuration) {
        configuration = [[WKWebViewConfiguration alloc] init];
    }
    if (!configuration.userContentController) {
        configuration.userContentController = [[WKUserContentController alloc] init];
    }
    WKUserScript *stealthScript = [[WKUserScript alloc] initWithSource:GetStealthEngineJS()
                                                         injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                      forMainFrameOnly:NO];
    [configuration.userContentController addUserScript:stealthScript];
    configuration.preferences.javaScriptCanOpenWindowsAutomatically = YES;

    WKWebView *webView = %orig(frame, configuration);
    if (webView) {
        webView.customUserAgent = kStealthUA;
    }
    return webView;
}

- (void)setCustomUserAgent:(NSString *)customUserAgent {
    %orig(kStealthUA);
}

- (NSString *)customUserAgent {
    return kStealthUA;
}

%end
