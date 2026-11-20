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


def filter_public_ui(staging: Path) -> None:
    index_path = staging / "index.html"
    index = index_path.read_text(encoding="utf-8")
    index = re.sub(
        r'\s*<button class="view-tab"[^>]*data-view="music".*?</button>',
        "",
        index,
        flags=re.DOTALL,
    )
    index = re.sub(
        r'\s*<section[^>]*data-view="music".*?</section>',
        "",
        index,
        flags=re.DOTALL,
    )
    index = re.sub(
        r'\s*<section[^>]*aria-labelledby="bad-heading".*?</section>',
        "",
        index,
        flags=re.DOTALL,
    )
    index = index.replace('<option value="music">Music</option>', '')
    index_path.write_text(index, encoding="utf-8")

    panel_path = staging / "assets" / "panel.js"
    panel = panel_path.read_text(encoding="utf-8")
    panel = re.sub(
        r"(?m)^[ \t]*\{ title: 'Find Bad Frames'.*?\},?[ \t]*\r?\n?",
        "",
        panel,
    )
    panel_path.write_text(panel, encoding="utf-8")


def include_toolkeeper_public_audio(staging: Path) -> None:
    beat_source = ROOT / "scripts" / "toolkeeper-dev-beat"
    assets = staging / "assets"
    bundle_source = beat_source / "dist" / "beat-tracker.js"
    bundle_target = assets / "beat-tracker.js"
    if bundle_source.exists():
        shutil.copy2(bundle_source, bundle_target)
    elif not bundle_target.exists():
        raise FileNotFoundError(f"Missing public Beat Tracker bundle: {bundle_source}")
    for source_name, target_name in (
        ("toolkeeper-dev-beats.js", "toolkeeper-dev-beats.js"),
        ("THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md"),
    ):
        shutil.copy2(beat_source / source_name, assets / target_name)

    host_path = staging / "jsx" / "hostscript.jsx"
    host = host_path.read_text(encoding="utf-8")
    host_marker = "function tkGetDevBeatAudioContext("
    if host_marker not in host:
        host += "\n\n" + (beat_source / "beat-host.jsx").read_text(encoding="utf-8")
        host_path.write_text(host, encoding="utf-8")

    html_path = staging / "index.html"
    html = html_path.read_text(encoding="utf-8")
    if "./assets/toolkeeper-dev-beats.js" not in html:
        scripts = (
            '  <script src="./assets/beat-tracker.js?v=20261120a"></script>\n'
            '  <script src="./assets/toolkeeper-dev-beats.js?v=20261120a"></script>\n'
        )
        html = html.replace("</body>", scripts + "</body>", 1)
        html_path.write_text(html, encoding="utf-8")


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
                ignore=shutil.ignore_patterns(
                    ".DS_Store",
                    "node_modules",
                    "__pycache__",
                    "package_release.py",
                    "install-dev.py",
                    "toolkeeper-dev-beat",
                ),
                    )
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)

    filter_public_ui(staging)
    include_toolkeeper_public_audio(staging)

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
