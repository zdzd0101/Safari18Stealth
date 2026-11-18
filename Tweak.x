#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import <objc/runtime.h>
#import <roothide.h>

static NSString * const S18SVersion = @"2.1.0";
static const void *S18SInjectedKey = &S18SInjectedKey;

// RootHide randomizes the bootstrap root. Never assume /var/jb exists.
static NSString *S18SReadResource(NSString *name) {
    NSString *virtualPath = [NSString stringWithFormat:
        @"/Library/Application Support/Safari18Stealth/%@.js", name];
    NSString *path = jbroot(virtualPath);
    NSError *error = nil;
    NSString *source = [NSString stringWithContentsOfFile:path
                                                  encoding:NSUTF8StringEncoding
                                                     error:&error];
    if (!source && error) {
        NSLog(@"[Safari18Stealth] resource %@ unavailable at %@: %@",
              name, path, error.localizedDescription);
    }
    return source;
}

static NSString *S18SBuildBootstrap(void) {
    static NSString *script = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        NSMutableArray<NSString *> *parts = [NSMutableArray array];
        for (NSString *file in @[@"Bootstrap", @"Polyfills", @"CSSCompat", @"Diagnostics"]) {
            NSString *part = S18SReadResource(file);
            if (part.length) [parts addObject:part];
        }
        script = [parts componentsJoinedByString:@"\n;\n"] ?: @"";
        if (script.length == 0) {
            NSLog(@"[Safari18Stealth] no JavaScript resources loaded; injection disabled");
        }
    });
    return script;
}

static void S18SInstallOnController(WKUserContentController *controller) {
    if (!controller) return;
    @synchronized (controller) {
        if ([objc_getAssociatedObject(controller, S18SInjectedKey) boolValue]) return;
        NSString *source = S18SBuildBootstrap();
        if (source.length == 0) return;
        WKUserScript *userScript = [[WKUserScript alloc] initWithSource:source
                                                         injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                      forMainFrameOnly:NO];
        [controller addUserScript:userScript];
        objc_setAssociatedObject(controller, S18SInjectedKey, @YES, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
        NSLog(@"[Safari18Stealth] %@ installed (main frame + child frames; conservative mode)", S18SVersion);
    }
}

%hook WKWebView
- (instancetype)initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)configuration {
    if (configuration) S18SInstallOnController(configuration.userContentController);
    return %orig(frame, configuration);
}

- (instancetype)initWithCoder:(NSCoder *)coder {
    WKWebView *view = %orig;
    if (view) S18SInstallOnController(view.configuration.userContentController);
    return view;
}
%end

%hook WKUserContentController
- (instancetype)init {
    WKUserContentController *controller = %orig;
    if (controller) S18SInstallOnController(controller);
    return controller;
}
%end
