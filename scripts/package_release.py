#!/usr/bin/env python3
"""Build the user-facing ToolKeeper ZIP for a vX.Y.Z GitHub release tag."""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INCLUDED_PATHS = (
    "CSXS",
    "assets",
    "jsx",
    "scripts",
    "index.html",
    "install-macos.command",
    "install-windows.bat",
    "README.md",
)


def build_archive(tag: str) -> Path:
    version = tag[1:]
    dist = ROOT / "dist"
    staging = dist / "ToolKeeper"
    archive = dist / f"ToolKeeper-{tag}.zip"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    for item in INCLUDED_PATHS:
        source = ROOT / item
        if not source.exists():
            raise FileNotFoundError(f"Required release file is missing: {item}")
        destination = staging / item
        if source.is_dir():
            shutil.copytree(
                source,
                destination,
                ignore=shutil.ignore_patterns(".DS_Store", "node_modules", "__pycache__", "package_release.py"),
            )
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)

    manifest_path = staging / "CSXS" / "manifest.xml"
    manifest = manifest_path.read_text(encoding="utf-8")
    manifest = re.sub(r'(ExtensionBundleVersion=")[^"]+("?)', rf"\g<1>{version}\g<2>", manifest, count=1)
    manifest = re.sub(r'(<Extension Id="[^"]+" Version=")[^"]+("\s*/>)', rf"\g<1>{version}\g<2>", manifest, count=1)
    manifest_path.write_text(manifest, encoding="utf-8")

    update_config = {
        "currentVersion": version,
        "repository": os.environ.get("GITHUB_REPOSITORY", "morleyae/ToolKeeper"),
        "development": False,
    }
    config_path = staging / "assets" / "update-config.js"
    config_path.write_text(
        "window.ToolKeeperUpdateConfig = " + json.dumps(update_config) + ";\n",
        encoding="utf-8",
    )

    if archive.exists():
        archive.unlink()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(staging.rglob("*")):
            if path.is_file():
                bundle.write(path, Path("ToolKeeper") / path.relative_to(staging))
    print(f"Created {archive}")
    return archive


def main() -> int:
    if len(sys.argv) != 2 or not re.fullmatch(r"v\d+\.\d+\.\d+", sys.argv[1]):
        print("Usage: package_release.py vMAJOR.MINOR.PATCH", file=sys.stderr)
        return 2
    build_archive(sys.argv[1])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
