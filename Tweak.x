#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <CoreGraphics/CoreGraphics.h>
#import <objc/runtime.h>
#import <objc/message.h>
#import <dlfcn.h>

typedef void (*MSHookFunction_t)(void *symbol, void *replace, void **result);

static CFTypeRef (*orig_MGCopyAnswer)(CFStringRef prop) = NULL;
static CFTypeRef hooked_MGCopyAnswer(CFStringRef prop) {
    if (prop) {
        CFStringRef pv = CFStringCreateWithCString(kCFAllocatorDefault, "ProductVersion", kCFStringEncodingUTF8);
        if (pv && CFEqual(prop, pv)) {
            CFRelease(pv);
            return CFStringCreateWithCString(kCFAllocatorDefault, "18.7", kCFStringEncodingUTF8);
        }
        if (pv) CFRelease(pv);

        CFStringRef bv = CFStringCreateWithCString(kCFAllocatorDefault, "BuildVersion", kCFStringEncodingUTF8);
        if (bv && CFEqual(prop, bv)) {
            CFRelease(bv);
            return CFStringCreateWithCString(kCFAllocatorDefault, "22H124", kCFStringEncodingUTF8);
        }
        if (bv) CFRelease(bv);
    }
    return orig_MGCopyAnswer ? orig_MGCopyAnswer(prop) : NULL;
}

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
            "  const uaVal = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';"
            "  const appVerVal = '5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';"
            "  try {"
            "    Object.defineProperty(Navigator.prototype, 'userAgent', { get: function userAgent() { return uaVal; }, enumerable: true, configurable: true });"
            "    Object.defineProperty(Navigator.prototype, 'appVersion', { get: function appVersion() { return appVerVal; }, enumerable: true, configurable: true });"
            "  } catch (_) {}"
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
        id ucc = ((id (*)(id, SEL))objc_msgSend)(cfg, sel_registerName("userContentController"));
        EnsureStealthScript(ucc);
    }
}

static IMP orig_ucc_init = NULL;
static id hooked_ucc_init(id self, SEL _cmd) {
    id ucc = ((id (*)(id, SEL))orig_ucc_init)(self, _cmd);
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
    MSHookFunction_t hookFn = (MSHookFunction_t)dlsym(RTLD_DEFAULT, "MSHookFunction");
    void *mgHandle = dlopen("/usr/lib/libMobileGestalt.dylib", RTLD_LAZY);
    void *mgSym = mgHandle ? dlsym(mgHandle, "MGCopyAnswer") : NULL;
    if (hookFn && mgSym) {
        hookFn(mgSym, (void *)hooked_MGCopyAnswer, (void **)&orig_MGCopyAnswer);
    }

    dlopen("/System/Library/Frameworks/WebKit.framework/WebKit", RTLD_LAZY);

    Class uccCls = objc_getClass("WKUserContentController");
    HookInstanceMethod(uccCls, "init", (IMP)hooked_ucc_init, &orig_ucc_init);

    Class wvCls = objc_getClass("WKWebView");
    HookInstanceMethod(wvCls, "_initWithFrame:configuration:", (IMP)hooked_wv_privInitWithFrame, &orig_wv_privInitWithFrame);
    HookInstanceMethod(wvCls, "initWithFrame:configuration:", (IMP)hooked_wv_initWithFrame, &orig_wv_initWithFrame);
    HookInstanceMethod(wvCls, "setCustomUserAgent:", (IMP)hooked_wv_setCustomUserAgent, &orig_wv_setCustomUserAgent);
    HookInstanceMethod(wvCls, "_setCustomUserAgent:", (IMP)hooked_wv_privSetCustomUserAgent, &orig_wv_privSetCustomUserAgent);

    Class reqCls = objc_getClass("NSMutableURLRequest");
    HookInstanceMethod(reqCls, "setValue:forHTTPHeaderField:", (IMP)hooked_req_setValueForHTTPHeaderField, &orig_req_setValueForHTTPHeaderField);
}
