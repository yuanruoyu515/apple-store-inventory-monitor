#!/usr/bin/env python3
"""Merge verified macOS app bundles and build a drag-to-Applications DMG.

Requires macOS command-line tools and dmgbuild==1.6.7. No Finder automation is
used: dmgbuild writes icon locations and window settings directly to .DS_Store.
"""
import argparse
import filecmp
import plistlib
import subprocess
import tempfile
from pathlib import Path

import dmgbuild


def run(*args):
    subprocess.run(args, check=True)


def package(arm_app: Path, intel_app: Path, output: Path):
    for app in (arm_app, intel_app):
        run("codesign", "--verify", "--deep", "--strict", str(app))
    info = plistlib.loads((arm_app / "Contents/Info.plist").read_bytes())
    if info != plistlib.loads((intel_app / "Contents/Info.plist").read_bytes()):
        raise ValueError("Architecture bundles must have identical app identity and version")
    relative_binary = Path("Contents/MacOS") / info["CFBundleExecutable"]
    for app, required in ((arm_app, "arm64"), (intel_app, "x86_64")):
        arches = subprocess.check_output(["lipo", "-archs", str(app / relative_binary)], text=True).split()
        if arches != [required]:
            raise ValueError(f"Expected {required} input, got {arches}")
    # Bundled resources must match; never silently discard a platform-specific file.
    def resources(app):
        return {p.relative_to(app) for p in app.rglob("*") if p.is_file()
                and "_CodeSignature" not in p.parts and p.relative_to(app) != relative_binary}
    if resources(arm_app) != resources(intel_app):
        raise ValueError("Architecture bundles contain different resources")
    for path in resources(arm_app):
        if not filecmp.cmp(arm_app / path, intel_app / path, shallow=False):
            raise ValueError(f"Architecture resource mismatch: {path}")
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="apw-universal-") as temp:
        app = Path(temp) / arm_app.name
        run("ditto", str(arm_app), str(app))
        binary = app / relative_binary
        run("lipo", "-create", str(arm_app / relative_binary), str(intel_app / relative_binary), "-output", str(binary))
        arches = subprocess.check_output(["lipo", "-archs", str(binary)], text=True).split()
        if set(arches) != {"arm64", "x86_64"}:
            raise ValueError(f"Universal binary has unexpected architectures: {arches}")
        run("codesign", "--force", "--deep", "--sign", "-", str(app))
        run("codesign", "--verify", "--deep", "--strict", str(app))
        dmgbuild.build_dmg(str(output), "果到雷达 · 美加阿版", settings={
            "format": "UDZO", "filesystem": "HFS+", "files": [str(app)],
            "symlinks": {"Applications": "/Applications"},
            "background": str(Path(__file__).resolve().parent / "dmg-background.png"),
            "icon_locations": {app.name: (190, 210), "Applications": (530, 210)},
            "window_rect": ((200, 160), (720, 440)), "icon_size": 100, "text_size": 12,
            "default_view": "icon-view",
            "include_icon_view_settings": True,
            "show_toolbar": False, "show_status_bar": False, "show_sidebar": False,
            "show_pathbar": False, "show_tab_view": False,
        })
    run("hdiutil", "verify", str(output))
    with tempfile.TemporaryDirectory(prefix="apw-dmg-verify-") as temp:
        mount = Path(temp) / "mounted"
        mount.mkdir()
        run("hdiutil", "attach", "-readonly", "-nobrowse", "-mountpoint", str(mount), str(output))
        try:
            run("codesign", "--verify", "--deep", "--strict", str(mount / arm_app.name))
            if (mount / "Applications").readlink() != Path("/Applications"):
                raise ValueError("DMG Applications link must point to /Applications")
        finally:
            run("hdiutil", "detach", str(mount))
    print(f"Created universal macOS installer: {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--arm-app", type=Path, required=True)
    parser.add_argument("--intel-app", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    package(args.arm_app.resolve(), args.intel_app.resolve(), args.output)
