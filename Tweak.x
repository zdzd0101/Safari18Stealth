#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import <objc/runtime.h>
#import <os/lock.h>
#import <roothide.h>
#include <stddef.h>

static const char S18SVersion[] = "2.1.2";
static const void *S18SInjectedKey = &S18SInjectedKey;
static os_unfair_lock S18SBootstrapLock = OS_UNFAIR_LOCK_INIT;
static NSString *S18SCachedBootstrap = nil;
static BOOL S18SBootstrapAttempted = NO;

// Runtime NSString construction avoids native __cfstring constants in this path.
static NSString *S18SString(const char *value) {
    if (value == NULL) return nil;
    return [[NSString alloc] initWithUTF8String:value];
}

// RootHide randomizes the bootstrap root. Never assume /var/jb exists.
static NSString *S18SReadResource(const char *resourceName) {
    NSString *name = S18SString(resourceName);
    NSString *prefix = S18SString("/Library/Application Support/Safari18Stealth/");
    NSString *suffix = S18SString(".js");
    if (!name || !prefix || !suffix) return nil;
    NSString *virtualPath = [[prefix stringByAppendingString:name] stringByAppendingString:suffix];
    NSString *path = jbroot(virtualPath);
    if (path.length == 0) return nil;

    NSError *error = nil;
    NSString *source = [NSString stringWithContentsOfFile:path encoding:NSUTF8StringEncoding error:&error];
    if (!source && error) {
        NSString *format = S18SString("[Safari18Stealth] resource %@ unavailable at %@: %@");
        if (format) NSLog(format, name, path, error.localizedDescription ?: S18SString("unknown error"));
    }
    return source;
}

static NSString *S18SBuildBootstrap(void) {
    os_unfair_lock_lock(&S18SBootstrapLock);
    if (S18SBootstrapAttempted) {
        NSString *cached = S18SCachedBootstrap;
        os_unfair_lock_unlock(&S18SBootstrapLock);
        return cached;
    }

    S18SBootstrapAttempted = YES;
    @try {
        // A C string table avoids NSArray retaining Objective-C constant-string
        // elements during native initialization.
        static const char * const resourceNames[] = {
            "Bootstrap", "Polyfills", "CSSCompat", "Diagnostics"
        };
        const size_t resourceCount = sizeof(resourceNames) / sizeof(resourceNames[0]);
        NSMutableString *combined = [NSMutableString string];
        NSString *separator = S18SString("\n;\n");
        for (size_t index = 0; index < resourceCount; index++) {
            NSString *part = S18SReadResource(resourceNames[index]);
            if (part.length == 0) continue;
            if (combined.length > 0 && separator) [combined appendString:separator];
            [combined appendString:part];
        }
        S18SCachedBootstrap = [combined copy];
        if (S18SCachedBootstrap.length == 0) {
            NSLog(@"%@", S18SString("[Safari18Stealth] no JavaScript resources loaded; injection disabled"));
        }
    } @catch (NSException *exception) {
        NSString *format = S18SString("[Safari18Stealth] bootstrap initialization exception: %@");
        if (format) NSLog(format, exception.reason ?: S18SString("unknown exception"));
        S18SCachedBootstrap = nil;
    } @finally {
        os_unfair_lock_unlock(&S18SBootstrapLock);
    }
    return S18SCachedBootstrap;
}

static void S18SInstallOnController(WKUserContentController *controller) {
    if (!controller) return;
    @synchronized (controller) {
        NSNumber *alreadyInstalled = objc_getAssociatedObject(controller, S18SInjectedKey);
        if (alreadyInstalled.boolValue) return;
        NSString *source = S18SBuildBootstrap();
        if (source.length == 0) return;
        WKUserScript *userScript = [[WKUserScript alloc] initWithSource:source
                                                         injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                      forMainFrameOnly:NO];
        if (!userScript) return;
        [controller addUserScript:userScript];
        objc_setAssociatedObject(controller, S18SInjectedKey,
                                 [NSNumber numberWithBool:YES],
                                 OBJC_ASSOCIATION_RETAIN_NONATOMIC);
        NSString *format = S18SString("[Safari18Stealth] %@ installed (main frame + child frames)");
        NSString *version = S18SString(S18SVersion);
        if (format) NSLog(format, version);
    }
}

%hook WKWebView
- (instancetype)initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)configuration {
    // Defer injection until a real WebView exists; do not mutate Safari's shared
    // controller during the early application-startup path.
    WKWebView *view = %orig(frame, configuration);
    if (view) S18SInstallOnController(view.configuration.userContentController);
    return view;
}
- (instancetype)initWithCoder:(NSCoder *)coder {
    WKWebView *view = %orig;
    if (view) S18SInstallOnController(view.configuration.userContentController);
    return view;
}
%end
