# Safari18Stealth 2.1.2 — RootHide / arm64e stability candidate

Safari18Stealth is a conservative WebKit compatibility tweak for Dopamine RootHide. Current target: iPhone 11 Pro (A13 / arm64e), iOS 16.2. The injection filter is restricted to com.apple.mobilesafari.

**2.1.2 is a stability candidate, not a claim of verified device stability.** The original 2.1.1 Actions artifact was recovered and its Mach-O UUID matched all three MobileSafari crash reports. Static analysis identified the failing native initialization path. The new candidate removes that path and adds automated regression checks; real-device validation is still required.

## Native stability changes

- Removed the WKUserContentController -init hook so Safari's shared controller is not modified during early application startup.
- Install the user script only after a real WKWebView has been constructed, via initWithFrame:configuration: or initWithCoder:.
- Replaced the bootstrap's one-time dispatch block with an os_unfair_lock-protected cache.
- Replaced Objective-C constant-string and array literals in Tweak.x with C string tables and runtime-created NSString instances.
- Replaced NSArray assembly with sequential NSMutableString appends.
- Added build-time Mach-O checks for arm64e, chained fixups, segment/section bounds, and absence of __cfstring.

## Compatibility modules

| Module | Current behavior | Boundary |
|---|---|---|
| Bootstrap | Creates per-frame state and module report | Does not spoof OS version or User-Agent |
| Polyfills | Selected missing APIs: Object.hasOwn, Object.groupBy, Map.groupBy, Promise.withResolvers, URL.canParse, and selected Array methods | Does not replace native APIs already present |
| CSSCompat | Adds vh fallback for simple dvh/svh/lvh declarations in style elements and selected CSSOM entry points | Does not rewrite CSS nesting, cascade layers, arbitrary selectors, or the full CSS parser |
| Diagnostics | window.__Safari18Stealth__.report() returns version, mode, applied/skipped modules, and errors | Does not collect or transmit browsing history, account data, or page contents |

Inspect diagnostics in Safari Web Inspector:

    window.__Safari18Stealth__?.report?.()

## Explicit limitations

- It does not upgrade iOS 16.2 WebKit to the iOS 18 engine.
- It does not spoof OS version, device identity, or User-Agent.
- It does not conceal injection from applications or security tools.
- It does not bypass CSP, same-origin policy, authentication, payment protections, or site security checks.
- It does not auto-click, submit, or alter payment transactions.
- It does not force dialogs, drawers, or hidden page sections to appear.

Some browser capabilities are implemented inside WebKit and cannot be recreated reliably by JavaScript polyfills. Compatibility remains page- and API-specific.

## Build

The authoritative workflow is .github/workflows/build.yml. It uses Ubuntu 24.04 and RootHide's Theos fork to build an iphoneos-arm64e RootHide DEB. CI checks the Safari-only filter, JavaScript syntax/tests, package metadata/resources, and resulting Mach-O binary.

A green Actions run proves automated build checks passed; it does not prove Safari launches on the target phone. Do not reinstall 2.1.1. Install 2.1.2 only after the new workflow succeeds, and keep the package easy to uninstall from Sileo.

## Device validation

1. Keep a known recovery path and do not rely on Safari as the only way to reach package-management instructions.
2. Install the 2.1.2 DEB only after reviewing the successful Actions artifact and package metadata.
3. Launch Safari repeatedly before opening websites. Confirm there is no immediate termination.
4. Open a neutral page and an interactive page. Inspect window.__Safari18Stealth__?.report?.() in Web Inspector.
5. Test PayPal Help navigation/drawer without submitting a transaction.
6. Compare ordinary sites with the tweak enabled and disabled.
7. If Safari crashes, uninstall the tweak from Sileo/RootHide and preserve the new IPS. Do not repeatedly relaunch into a crash loop.

## Rollback

If Safari becomes unstable, disable or uninstall com.custom.safari18stealth from Sileo. The tweak is filtered to MobileSafari and is not intended to inject into unrelated applications.

## Target

- Device: iPhone 11 Pro / A13 / arm64e
- OS: iOS 16.2
- Jailbreak: Dopamine RootHide
- Package: com.custom.safari18stealth
- Version: 2.1.2
