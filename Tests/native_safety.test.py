#!/usr/bin/env python3
"""Static regression checks for the 2.1.1 Safari startup crash path."""
from __future__ import annotations
import argparse
import pathlib
import re
import struct
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]


def check_source() -> list[str]:
    source = (ROOT / "Tweak.x").read_text(encoding="utf-8")
    failures = []
    code = re.sub(r"/\*.*?\*/|//[^\n]*", "", source, flags=re.S)
    if re.search(r'(?<!%)@"', code):
        failures.append("Tweak.x contains an Objective-C constant NSString literal")
    if re.search(r"@\s*\[", code):
        failures.append("Tweak.x contains an Objective-C array literal")
    if "dispatch_once" in code:
        failures.append("Tweak.x still uses dispatch_once in the bootstrap path")
    if re.search(r"%hook\s+WKUserContentController", code):
        failures.append("Tweak.x still hooks WKUserContentController initialization")
    if "%hook WKWebView" not in code:
        failures.append("WKWebView injection hooks are missing")
    if "initWithFrame:" not in code or "initWithCoder:" not in code:
        failures.append("One or more WKWebView construction paths are missing")
    if re.search(r"%hook\\s+WKUserContentController|_initWithFrame:", code):
        failures.append("Unsafe controller/private WebKit initialization hook found")
    if re.search(r"customUserAgent|systemVersion|operatingSystemVersion", code):
        failures.append("Native OS or Safari user-agent identity override found")
    if re.search(r"javaScriptCanOpenWindowsAutomatically", code):
        failures.append("Global automatic popup permission override found")
    required = [
        ROOT / "Engine" / "Bootstrap.js",
        ROOT / "Polyfills" / "Polyfills.js",
        ROOT / "CSS" / "CSSCompat.js",
        ROOT / "Diagnostics" / "Diagnostics.js",
    ]
    for resource in required:
        if not resource.is_file() or resource.stat().st_size == 0:
            failures.append(f"Required runtime resource missing or empty: {resource.relative_to(ROOT)}")
    return failures


def parse_macho(path: pathlib.Path) -> dict:
    data = path.read_bytes()
    if len(data) < 32 or data[:4] != b"\xcf\xfa\xed\xfe":
        raise ValueError("not a little-endian 64-bit Mach-O image")
    _, cputype, cpusubtype, _, ncmds, _, _, _ = struct.unpack_from("<IiiIIIII", data, 0)
    offset = 32
    sections, segments = [], []
    uuid, chained = None, False
    for _ in range(ncmds):
        cmd, cmdsize = struct.unpack_from("<II", data, offset)
        if cmdsize < 8 or offset + cmdsize > len(data):
            raise ValueError("malformed Mach-O load command")
        if cmd == 0x19:
            values = struct.unpack_from("<II16sQQQQiiII", data, offset)
            segname = values[2].split(b"\0", 1)[0].decode("ascii", "replace")
            vmaddr, vmsize = values[3], values[4]
            segments.append((segname, vmaddr, vmsize))
            section_offset = offset + 72
            for _section in range(values[9]):
                sect = struct.unpack_from("<16s16sQQIIIIIIII", data, section_offset)
                sectname = sect[0].split(b"\0", 1)[0].decode("ascii", "replace")
                owner = sect[1].split(b"\0", 1)[0].decode("ascii", "replace")
                sections.append((owner, sectname, sect[2], sect[3]))
                section_offset += 80
        elif cmd == 0x1B:
            raw = data[offset + 8:offset + 24].hex().upper()
            uuid = "-".join((raw[:8], raw[8:12], raw[12:16], raw[16:20], raw[20:]))
        elif cmd == 0x80000034:
            chained = True
        offset += cmdsize
    return {"size": len(data), "cputype": cputype, "cpusubtype": cpusubtype,
            "uuid": uuid, "segments": segments, "sections": sections, "chained": chained}


def check_binary(path: pathlib.Path) -> list[str]:
    info = parse_macho(path)
    failures = []
    if info["cputype"] != 0x0100000C:
        failures.append(f"unexpected CPU type: {info['cputype']:#x}")
    if (info["cpusubtype"] & 0x00FFFFFF) != 2:
        failures.append(f"unexpected ARM64 subtype: {info['cpusubtype']:#x}")
    if not info["uuid"]:
        failures.append("LC_UUID is missing")
    if not info["chained"]:
        failures.append("LC_DYLD_CHAINED_FIXUPS is missing")
    if any(name == "__cfstring" for _, name, _, _ in info["sections"]):
        failures.append("__cfstring section exists; native constant NSString objects were emitted")
    for segname, sectname, addr, size in info["sections"]:
        owner = next((s for s in info["segments"] if s[0] == segname), None)
        if owner is None or addr < owner[1] or addr + size > owner[1] + owner[2]:
            failures.append(f"section {segname},{sectname} lies outside its segment")
    print(f"Mach-O: arm64e UUID={info['uuid']} file_size={info['size']} bytes")
    print("Segments:", "; ".join(f"{n}@{a:#x}+{s:#x}" for n, a, s in info["segments"]))
    print("Sections:", ", ".join(f"{seg},{sec}" for seg, sec, _, _ in info["sections"]))
    return failures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--binary", type=pathlib.Path)
    args = parser.parse_args()
    failures = check_source()
    if args.binary:
        failures.extend(check_binary(args.binary))
    if failures:
        for failure in failures:
            print(f"FAIL: {failure}", file=sys.stderr)
        return 1
    print("Native safety checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
