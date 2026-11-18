#!/bin/bash

set -u
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/ToolKeeper"

fail() {
  printf '\nINSTALLATION STOPPED\n%s\n' "$1"
  exit 1
}

printf 'ToolKeeper Installer for macOS\n'
printf '===============================\n\n'
[[ -f "$SOURCE_DIR/CSXS/manifest.xml" ]] || fail "Extract the release ZIP and run this installer from its ToolKeeper folder."
[[ "$SOURCE_DIR" != "$TARGET_DIR" ]] || fail "Run this installer from a freshly extracted release ZIP, not the installed extension folder."
printf 'Installing for this macOS user at:\n%s\n\n' "$TARGET_DIR"
mkdir -p "$(dirname "$TARGET_DIR")" || fail "Could not create the CEP extensions folder."
ditto "$SOURCE_DIR" "$TARGET_DIR" || fail "Could not copy ToolKeeper. Check folder permissions and try again."
defaults write com.adobe.CSXS.11 PlayerDebugMode 1 || fail "Files were copied, but CEP could not be enabled for this user."
printf '\nINSTALLATION COMPLETE\nOpen Window > Extensions (Legacy) > ToolKeeper in After Effects.\n'
