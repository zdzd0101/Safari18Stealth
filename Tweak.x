#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import <objc/runtime.h>

// 声明 WebKit 私有接口，彻底消除 ARC 编译报错
@interface WKWebView (StealthPrivate)
@property (nonatomic, copy, setter=_setCustomUserAgent:) NSString *_customUserAgent;
@property (nonatomic, copy, setter=_setApplicationNameForUserAgent:) NSString *_applicationNameForUserAgent;
@end

@interface WKPreferences (StealthPrivate)
@property (nonatomic, setter=_setAllowFileAccessFromFileURLs:) BOOL _allowFileAccessFromFileURLs;
@end

static NSString *const kStealthUA = @"Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1";
static NSString *const kAppNameUA = @"Version/18.7 Mobile/15E148 Safari/604.1";

static NSString *GetStealthEngineJS(void) {
    static NSString *js = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        js = @""
        "(() => {"
        "  'use strict';"
        "  if (window.__wk18_loaded) return;"
        "  Object.defineProperty(window, '__wk18_loaded', { value: true, enumerable: false, configurable: false, writable: false });"

        // 1. 原生代码签名保护器 ([native code])
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

        // 2. Navigator 核心指纹锁死（与 HTTP Header 100% 同步）
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

        // 3. 补齐现代 JS 引擎标准库（防止 PayPal / 银行 React 19 前端崩溃白屏）
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

        // 4. 高性能现代 CSS 降级翻译器（零卡顿处理 dvh/svh、@layer 与 & 嵌套）
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

        // 劫持动态插入的 CSS 规则（如 styled-components / Emotion / PayPal CSS-in-JS）
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

        // 5. 修复 PayPal 英雄区隐身与 Help 抽屉弹窗层级
        "  window.addEventListener('DOMContentLoaded', () => {"
        "    const fix = document.createElement('style');"
        "    fix.textContent = 'main, [role=\"main\"], section, [data-testid*=\"hero\"], [class*=\"hero\"] { opacity: 1 !important; visibility: visible !important; } dialog[open], [role=\"dialog\"], [aria-modal=\"true\"], [class*=\"modal\"], [class*=\"drawer\"] { opacity: 1 !important; visibility: visible !important; z-index: 2147483647 !important; }';"
        "    (document.head || document.documentElement).appendChild(fix);"
        "    window.dispatchEvent(new Event('resize'));"
        "  }, { once: true });"
        "})();";
    });
    return js;
}

static void ApplyStealthToWebView(WKWebView *webView) {
    if (!webView) return;
    WKUserContentController *ucc = webView.configuration.userContentController;
    if (ucc) {
        BOOL exists = NO;
        for (WKUserScript *s in ucc.userScripts) {
            if ([s.source containsString:@"__wk18_loaded"]) {
                exists = YES;
                break;
            }
        }
        if (!exists) {
            WKUserScript *script = [[WKUserScript alloc] initWithSource:GetStealthEngineJS()
                                                          injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                       forMainFrameOnly:NO];
            [ucc addUserScript:script];
        }
    }
    webView.configuration.preferences.javaScriptCanOpenWindowsAutomatically = YES;
    webView.customUserAgent = kStealthUA;
    if ([webView respondsToSelector:@selector(_setCustomUserAgent:)]) {
        [webView _setCustomUserAgent:kStealthUA];
    }
    if ([webView respondsToSelector:@selector(_setApplicationNameForUserAgent:)]) {
        [webView _setApplicationNameForUserAgent:kAppNameUA];
    }
}

%hook WKWebView

- (instancetype)initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)configuration {
    WKWebView *wv = %orig;
    ApplyStealthToWebView(wv);
    return wv;
}

- (WKNavigation *)loadRequest:(NSURLRequest *)request {
    ApplyStealthToWebView(self);
    if ([request isKindOfClass:[NSMutableURLRequest class]]) {
        [(NSMutableURLRequest *)request setValue:kStealthUA forHTTPHeaderField:@"User-Agent"];
    } else if (request) {
        NSMutableURLRequest *mut = [request mutableCopy];
        [mut setValue:kStealthUA forHTTPHeaderField:@"User-Agent"];
        return %orig(mut);
    }
    return %orig;
}

- (void)setCustomUserAgent:(NSString *)customUserAgent {
    %orig(kStealthUA);
}

- (void)_setCustomUserAgent:(NSString *)customUserAgent {
    %orig(kStealthUA);
}

- (void)_setApplicationNameForUserAgent:(NSString *)applicationNameForUserAgent {
    %orig(kAppNameUA);
}

- (NSString *)customUserAgent {
    return kStealthUA;
}

%end

%hook NSMutableURLRequest

- (void)setValue:(NSString *)value forHTTPHeaderField:(NSString *)field {
    if ([field caseInsensitiveCompare:@"User-Agent"] == NSOrderedSame) {
        %orig(kStealthUA, field);
        return;
    }
    %orig;
}

%end
