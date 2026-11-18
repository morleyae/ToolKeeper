#!/usr/bin/env python3
"""Install or update a separate local ToolKeeper Dev CEP extension."""

from pathlib import Path
from shutil import copytree, ignore_patterns
import re


SOURCE = Path(__file__).resolve().parent.parent
TARGET = Path.home() / "Library/Application Support/Adobe/CEP/extensions/ToolKeeperDev"

if SOURCE.resolve() == TARGET.resolve():
    raise SystemExit("Run this script from the ToolKeeper source folder, not from ToolKeeper Dev.")

copytree(
    SOURCE,
    TARGET,
    dirs_exist_ok=True,
    ignore=ignore_patterns(".git", ".DS_Store", "dist", "__pycache__"),
)

manifest_path = TARGET / "CSXS/manifest.xml"
manifest = manifest_path.read_text(encoding="utf-8")
manifest = manifest.replace(
    "com.endlessaudios.toolkeeper", "com.endlessaudios.toolkeeper.dev"
).replace("<Menu>ToolKeeper</Menu>", "<Menu>ToolKeeper Dev</Menu>")
manifest_path.write_text(manifest, encoding="utf-8")

index_path = TARGET / "index.html"
index = index_path.read_text(encoding="utf-8")
index = index.replace("<title>ToolKeeper</title>", "<title>ToolKeeper Dev</title>", 1)
index = index.replace("<h1>ToolKeeper</h1>", "<h1>ToolKeeper Dev</h1>", 1)
index_path.write_text(index, encoding="utf-8")

config_path = TARGET / "assets/update-config.js"
config = config_path.read_text(encoding="utf-8")
config = re.sub(r'currentVersion:\s*"[^"]*"', 'currentVersion: "DEV"', config, count=1)
if re.search(r"\bdevelopment\s*:", config):
    config = re.sub(r"\bdevelopment\s*:\s*(?:true|false)", "development: true", config, count=1)
else:
    config = config.replace('currentVersion: "DEV",', 'currentVersion: "DEV",\n  development: true,', 1)
config_path.write_text(config, encoding="utf-8")

print(f"Installed ToolKeeper Dev at: {TARGET}")
