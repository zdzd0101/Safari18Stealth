# Changelog

## 2.1.0 — RootHide test candidate
- Switch build configuration from generic rootless to RootHide's `roothide` scheme.
- Target the `iphoneos-arm64e` package architecture for the iPhone 11 Pro A13 device.
- Resolve runtime JavaScript resources using RootHide `jbroot()` instead of a fixed `/var/jb` fallback.
- Use RootHide-maintained Theos in GitHub Actions.
- Declare ElleKit/Substrate runtime compatibility for Sileo package installation.
- Retain conservative JS/CSS compatibility behavior and diagnostics.
- Continue to avoid OS/UA spoofing, global modal overrides, and payment/security bypasses.

## 2.0.0 — source preview
- Added modular JavaScript compatibility resources and diagnostics.
- Removed version spoofing and broad CSS/modal overrides.
