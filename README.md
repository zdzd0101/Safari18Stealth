# Safari18Stealth 2.1.0 — RootHide test candidate

This branch targets **Dopamine RootHide + Sileo** and the iPhone 11 Pro (A13 / arm64e) on iOS 16.2. It is a test candidate, not a claim that every modern website or PayPal flow is fixed.

## What this project does

- Injects a document-start compatibility script into Safari/WebKit main frames and child frames.
- Adds selected missing JavaScript APIs only when the native implementation is absent.
- Adds a conservative fallback for simple dynamic viewport-unit declarations.
- Exposes `window.__Safari18Stealth__.report()` for diagnostics.
- Resolves the resource directory through RootHide's `jbroot()` API rather than assuming a fixed `/var/jb` path.
- Builds a RootHide package with the RootHide-maintained Theos fork.

## What it deliberately does not do

- It does not claim to upgrade the iOS 16.2 WebKit engine to iOS 18.
- It does not spoof the operating-system version or User-Agent.
- It does not proxy `Function.prototype.toString` or conceal injected code.
- It does not force all dialogs, drawers, or page sections to be visible.
- It does not disable CSP, same-origin policy, authentication, payment protections, or site security checks.
- It does not auto-click, submit, or alter payment transactions.

Some browser features are implemented in WebKit itself and cannot be recreated reliably by a JavaScript polyfill. CSS parsing and popup/window lifecycle compatibility also cannot be universally repaired from a document-start user script.

## Build

The GitHub Actions workflow uses a macOS runner and RootHide's Theos fork. It builds for the RootHide package scheme and uploads a `.deb` artifact. The package architecture is set to `iphoneos-arm64e` for the A13/arm64e target.

The workflow result must be green before installing. A successful compile only proves the package builds; it does not prove the tweak loads on the device or fixes a particular website.

## Install on the test device

1. Keep a way to remove the package from Sileo and retain a copy of the previous working state.
2. Download the `.deb` artifact from the successful GitHub Actions run.
3. Transfer it to the iPhone and open it with Sileo/Filza's package installer.
4. Confirm Sileo accepts the package architecture and dependencies. Do not force-install if it reports an architecture or dependency conflict.
5. Respring only if Sileo requests it, then open Safari.

## Test sequence

1. Open a neutral static page and a normal interactive page.
2. In Safari Web Inspector, evaluate `window.__Safari18Stealth__?.report?.()`.
3. Test PayPal Help navigation and the help drawer/popup without initiating a payment.
4. Test account pages and sign-in separately; do not use real payment submission as a smoke test.
5. Compare with the tweak disabled. Record the URL, exact action, console error, and report output for each failure.

## Runtime resources

The build workflow stages JavaScript under `layout/Library/Application Support/Safari18Stealth/`. RootHide's `jbroot()` API resolves the randomized bootstrap path at runtime.


## Candidate status

This branch has passed local JavaScript syntax and polyfill smoke checks. Native Theos compilation, package inspection on the GitHub runner, injection on the target device, and PayPal page behavior remain pending until the Actions run and on-device test complete. Do not treat a green JavaScript test as proof of device compatibility.
