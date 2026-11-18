# Safari18Stealth 4.0 — Safari 18.6 compatibility target

## Release intent

4.0 targets observable web-platform capabilities of Safari 18.6 while keeping iOS 16.2 / RootHide / arm64e as the deployment baseline. This is a compatibility layer, not a replacement WebKit engine. It must not spoof OS/browser identity, bypass site security, fabricate browser-managed storage policy, or force payment/chat UI.

## Architecture baseline

- Preserve the 2.2.0 native injection safety model: Safari-only bundle filter, deferred installation after WKWebView construction, locked bootstrap assembly, RootHide resource resolution, and arm64e/Mach-O checks.
- Carry forward 3.3's fail-closed resource assembly, capability-gated compatibility, CSS observer idempotency, bounded diagnostics, and explicit limitations.
- Install each fallback only when the native capability is absent. Native support must remain untouched.
- Treat each feature as native / polyfilled / limited / unsupported / not tested, never as a blanket Safari 18 compatibility flag.

## Capability groups

| Group | Target capabilities | Policy |
|---|---|---|
| JavaScript runtime | Set methods, URL.parse, Blob.bytes, Response.bytes, Promise and modern built-ins | Spec-oriented polyfills only when missing; test semantics and edge cases |
| DOM | Popover, Declarative Shadow DOM, Dialog, Custom Elements, events | Limited fallback only where safely approximated; never claim top-layer equivalence |
| Storage | StorageManager estimate/persist, quota and eviction | Detect native behavior; do not synthesize quota, persistence grants, or eviction policy |
| CSS/layout | dvh/svh/lvh, :has, container queries, color-mix, content-visibility, transitions | Detect support; narrow fallback only; no broad stylesheet rewriting |
| WebKit lifecycle | document start, frames, navigation, pageshow, BFCache, resource loading | Preserve Safari lifecycle; instrument bounded timing/errors; avoid private WebKit internals |
| Website validation | PayPal, Amazon, T-Mobile chat | Real-device cases; isolate network, script, DOM and rendering failures |

## Required verification

1. Static checks: Safari-only filter, RootHide resource layout, arm64e, no unsafe initializer hook, no private WebKit APIs.
2. JavaScript tests: existing 2.2/3.3 tests plus every new API and native-capability no-op path.
3. Package checks: DEB metadata, staged resources, dylib Mach-O UUID/segments/sections/chained fixups.
4. Device checks on iPhone 11 Pro / iOS 16.2: repeated Safari launch, normal pages, iframe, modal/popover, Amazon, T-Mobile chat, PayPal help/chat entry point.
5. Regression comparison with tweak disabled. Green CI is not proof of real-site compatibility.

## Known platform boundary

JavaScript cannot upgrade JavaScriptCore/WebCore, networking, GPU/compositor, sandbox, browser process, native top layer, native View Transitions, or browser-managed storage quota/eviction. Those remain limited or unsupported unless iOS WebKit already implements them.
