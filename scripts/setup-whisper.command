#!/bin/zsh
set -e

APP_SUPPORT="$HOME/Library/Application Support/ToolKeeper"
print "TK_SETUP_PROGRESS:5:Finding a compatible Python installation..."
PYTHON=""
for candidate_name in python3.13 python3.12 python3.11 python3.10 python3.9 python3; do
  candidate_path="$(command -v "$candidate_name" 2>/dev/null || true)"
  [[ -n "$candidate_path" ]] || continue
  if "$candidate_path" -c 'import sys; sys.exit(0 if (3,9) <= sys.version_info[:2] < (3,14) else 1)' >/dev/null 2>&1; then
    PYTHON="$candidate_path"
    PYTHON_VERSION="$("$candidate_path" -c 'import sys; print("%d%d" % sys.version_info[:2])')"
    break
  fi
done

if [[ -z "$PYTHON" ]]; then
  print -u2 "Python 3.9–3.13 was not found. Install Python 3.9 or newer, then run Set up Whisper again."
  exit 1
fi

print "TK_SETUP_PROGRESS:10:Preparing the local Python environment..."
VENV="$APP_SUPPORT/whisper-venv-py$PYTHON_VERSION"

mkdir -p "$APP_SUPPORT"
if [[ ! -x "$VENV/bin/python3" ]]; then
  print "TK_SETUP_PROGRESS:12:Creating the local Python environment..."
  "$PYTHON" -m venv "$VENV"
fi

print "TK_SETUP_PROGRESS:15:Updating Python package tools..."
"$VENV/bin/python3" -m pip install --upgrade pip
print "TK_SETUP_PROGRESS:18:Installing PyTorch audio support..."
"$VENV/bin/python3" -m pip install --upgrade "torch==2.8.0" "torchaudio==2.8.0"
print "TK_SETUP_PROGRESS:22:Installing Whisper and word alignment..."
if [[ "$PYTHON_VERSION" == "39" ]]; then
  "$VENV/bin/python3" -m pip install --upgrade openai-whisper "whisperx==3.6.2" "urllib3<2"
else
  "$VENV/bin/python3" -m pip install --upgrade openai-whisper "whisperx==3.8.6"
fi
print "TK_SETUP_PROGRESS:25:Whisper setup complete. Preparing captions..."
print "Local Whisper and forced word alignment are ready in Python $PYTHON_VERSION. Speech and alignment models download the first time you create captions."
