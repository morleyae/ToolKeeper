#!/bin/bash

set -u
STATE_FILE="$1"
RESULT_FILE="${STATE_FILE}.result"
ARCHIVE="$(sed -n '1p' "$STATE_FILE")"
TARGET="$(sed -n '2p' "$STATE_FILE")"
VERSION="$(sed -n '3p' "$STATE_FILE")"

fail() {
  printf 'ERROR\n%s\n' "$1" >"$RESULT_FILE" 2>/dev/null || true
  exit 10
}

[[ -n "$ARCHIVE" && -n "$TARGET" && -f "$ARCHIVE" ]] || fail "The update archive or install path is missing."
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/toolkeeper-update.XXXXXX")" || fail "Could not create a temporary install folder."
if ! unzip -q "$ARCHIVE" -d "$WORK_DIR"; then
  rm -rf "$WORK_DIR"
  fail "Could not extract the update archive."
fi
PAYLOAD="$WORK_DIR/ToolKeeper"
BACKUP="${TARGET}.update-backup.$(date +%s)"
if [[ ! -f "$PAYLOAD/CSXS/manifest.xml" ]] || ! grep -q 'com.endlessaudios.toolkeeper' "$PAYLOAD/CSXS/manifest.xml"; then
  rm -rf "$WORK_DIR"
  fail "The update archive does not contain a valid ToolKeeper extension."
fi
if [[ -e "$TARGET" ]]; then
  mv "$TARGET" "$BACKUP" || { rm -rf "$WORK_DIR"; fail "Could not move the installed extension. Check permissions for: $TARGET"; }
fi
if ! mv "$PAYLOAD" "$TARGET"; then
  if [[ -e "$BACKUP" ]]; then mv "$BACKUP" "$TARGET"; fi
  rm -rf "$WORK_DIR"
  fail "Could not install files into: $TARGET. Check folder permissions."
fi
rm -rf "$BACKUP" "$WORK_DIR" "$ARCHIVE" "$STATE_FILE"
printf 'INSTALLED\n%s\n' "$VERSION" >"$RESULT_FILE" || exit 11
