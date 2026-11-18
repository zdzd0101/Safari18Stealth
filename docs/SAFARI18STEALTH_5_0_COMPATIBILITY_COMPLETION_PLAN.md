# Safari18Stealth 5.0 — Compatibility Completion Plan

Status: planning/acceptance contract. This document does not claim implementation or device validation is complete.

## Goal and hard boundary

Target high compatibility for a declared set of Safari 17/18 web-platform behaviors used by modern sites on iOS 16.2 / WebKit 614.3.7. A “99%” target may only mean 99% pass rate across the finite, versioned test matrix below. It does not mean 99% parity with WebKit 616/619, 99% of all websites, or replacement of the iOS system WebKit.

A jailbreak tweak and JavaScript injected at document start cannot safely replace WebKit's rendering engine, networking/TLS stack, process model, browser security policy, or private system frameworks. Unsupported native behavior must be reported as a limitation, not faked.

## Current verified state

- The 4.0 branch provides the current implementation baseline: native WKWebView injection, Bootstrap, Polyfills, ModernCompat, CSSCompat, and Diagnostics.
- The diagnostics-hardening change separates zero/opaque Resource Timing metadata from confirmed failures and captures bounded script/link/iframe load errors.
- GitHub Actions for commit `7344c31975ad7a3f8761264f41365f9f5e93288f` passed source-layout/native-safety checks, JavaScript syntax/tests, RootHide package build, package/resource metadata, and Mach-O checks.
- These checks do not execute Safari on an iPhone and do not prove PayPal/Amazon compatibility. No real-device pass is recorded here.

## Workstreams and required evidence

### A. Native injection and jailbreak integration
- Confirm Safari-only process/bundle filtering and exclude unrelated WKWebView host apps unless explicitly supported.
- Verify injection exactly once per content controller, in main frame and subframes as intended.
- Verify resource lookup under RootHide across rootless path mapping; fail closed and log missing resources.
- Audit hook coverage, initialization order, thread safety, autorelease behavior, process restarts, and interaction with other tweaks.
- Never spoof OS version or Safari user-agent to claim native feature parity.
- Evidence: source audit, static checks, package inspection, device logs, install/uninstall/upgrade/rollback on target iOS.

### B. JavaScript runtime and Web APIs
For each API, test presence, descriptors, argument validation, exceptions, return types, async timing, edge cases, and interoperability:
- Set methods: difference, intersection, union, symmetricDifference, isSubsetOf, isSupersetOf, isDisjointFrom.
- URL.parse including base URL, invalid input, and URL semantics.
- Blob/Request/Response/PushMessageData bytes() including body-used and stream edge cases.
- StorageManager: expose native support accurately; do not invent quota, persistence, or permission results.
- Promise/microtask behavior, AbortController/AbortSignal, structured clone, streams, fetch, Request/Response body lifecycle.
- Feature detection must distinguish native, polyfilled, partial, unsupported, and failed.

### C. DOM, HTML, CSS, and rendering behavior
- Popover API: auto/manual, invoker attributes, light dismiss, Escape, focus, nested popovers, toggle/beforetoggle timing, Shadow DOM event paths.
- Declarative Shadow DOM: parser timing, open/closed roots, nested templates, existing roots, malformed templates, dynamic insertion limitations.
- Dialog, inert, focus management, form controls, event propagation, MutationObserver/ResizeObserver/IntersectionObserver.
- CSS: dvh/svh/lvh, container queries, :has(), color-mix(), content-visibility, CSSOM, stylesheet loading and dynamic insertion.
- Rendering-only primitives such as View Transitions must remain explicitly unsupported when they cannot be faithfully emulated.
- Evidence: standards-oriented unit tests plus real Safari layout/interaction tests; no regex rewrite of arbitrary CSS.

### D. Page lifecycle, frames, and cross-origin behavior
- document start/end timing, navigation, back-forward cache, pagehide/pageshow, visibility changes, freeze/resume where exposed.
- iframe creation/removal/navigation, sandboxing, same-origin boundaries, postMessage origin/source validation and message ordering.
- Shadow DOM composed paths and event retargeting.
- Evidence: multi-frame fixtures and real-device navigation/recovery tests. Do not weaken same-origin or CSP protections.

### E. Network, storage, privacy, and system boundary
- Diagnose DNS, VPN/proxy, TLS/certificate, content blockers, cookie/ITP, storage partitioning, CSP/CORS, redirects, HTTP status and opaque timing separately.
- Do not hook or rewrite TLS, credentials, cookies, authorization headers, request/response bodies, or account data for diagnostics.
- Do not claim a JavaScript shim repairs NSURLSession/CFNetwork, TLS, DNS, WebKit networking, or OS-level injection conflicts.
- Evidence: sanitized status/error/timing metadata and controlled Wi-Fi vs cellular comparisons; no secrets in reports.

### F. Site acceptance: PayPal and Amazon
- PayPal settings: password update, email update, phone update, Data & Privacy, Identity Verification.
- PayPal chat: loader success/failure, SDK ready state, iframe creation/load, postMessage handshake, mount target, visible UI, send/receive interaction, rejection/timeout paths.
- Amazon: login/account pages, dynamic dialogs, search/product pages, cart/checkout rendering without bypassing site security.
- A global symbol existing is not proof of SDK readiness. A visible spinner disappearing is not proof of a successful transaction.
- Evidence: repeatable device-side tests using test accounts where appropriate; no collection of passwords, payment details, cookies, or tokens.

## Scoring and release gates

Use a versioned test matrix with explicit test IDs and results: PASS / PARTIAL / UNSUPPORTED / FAIL / NOT TESTED.

- 99% target: at least 99% PASS among tests explicitly marked supported and in-scope, with zero critical security regressions and no unresolved critical crashes.
- Report PARTIAL, UNSUPPORTED, FAIL, and NOT TESTED separately; do not hide them in the denominator.
- All security-boundary tests, injection-safety tests, and critical site workflows must pass; a high aggregate percentage cannot override a critical failure.
- CI green means the automated checks in that workflow passed. It does not equal real-device or website acceptance.
- Release requires: clean CI; reproducible package; install/upgrade/uninstall/rollback verification; target-device smoke tests; full PayPal and Amazon scenario evidence; memory/performance stability run; documented known limitations.

## Current status

The diagnostics-hardening PR is an initial diagnostic improvement only. Workstreams A–F remain to be audited and/or implemented and tested. Do not label the project 99% complete until the release gates above have evidence attached.