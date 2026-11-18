# Changelog

## 2.1.2 — arm64e startup-stability candidate
- Recovered the original 2.1.1 Actions artifact and matched its Mach-O UUID to the three MobileSafari crash reports.
- Removed the WKUserContentController initializer hook; the shared controller is no longer modified during early Safari startup.
- Deferred user-script installation until after WKWebView construction.
- Removed the native bootstrap's one-time dispatch block and Objective-C array/constant-string literal construction.
- Replaced NSArray assembly with sequential mutable-string appends and an os_unfair_lock-protected cache.
- Added Mach-O regression checks for arm64e, chained fixups, section bounds, and absence of __cfstring.
- Fixed CSS compatibility startup when documentElement is not yet available.
- Added CSSStyleDeclaration.setProperty fallback for simple dynamic viewport units.
- Reduced diagnostics to module/runtime state without collecting user-agent or language fields.
- Kept injection restricted to com.apple.mobilesafari.

## 2.1.1 — RootHide candidate
- Added Safari-only bundle filtering and arm64e package verification.
- Known issue: repeatable MobileSafari launch crash on the reported iOS 16.2 device. Do not reinstall.

## 2.1.0 — RootHide test candidate
- Switched to RootHide's roothide package scheme and jbroot() resource resolution.
- Added selected JavaScript polyfills, CSS fallback, and diagnostics.
