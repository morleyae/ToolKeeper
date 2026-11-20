#!/usr/bin/env python3
"""Align a corrected caption transcript to audio and return word timings as JSON."""

import json
import re
import sys
from contextlib import redirect_stdout
from difflib import SequenceMatcher


def word_key(word):
    return re.sub(r"[^\w']", "", str(word or "").lower(), flags=re.UNICODE)


def map_words(expected, aligned):
    if len(expected) == len(aligned):
        return {index: index for index in range(len(expected))}
    expected_keys = [word_key(word) for word in expected]
    aligned_keys = [word_key(word.get("word")) for word in aligned]
    mapping = {}
    expected_cursor = 0
    aligned_cursor = 0
    blocks = SequenceMatcher(None, expected_keys, aligned_keys, autojunk=False).get_matching_blocks()
    for block in blocks:
        expected_gap = list(range(expected_cursor, block.a))
        aligned_gap = list(range(aligned_cursor, block.b))
        for offset in range(min(len(expected_gap), len(aligned_gap))):
            mapping[expected_gap[offset]] = aligned_gap[offset]
        for offset in range(block.size):
            mapping[block.a + offset] = block.b + offset
        expected_cursor = block.a + block.size
        aligned_cursor = block.b + block.size
    return mapping


def run_alignment(audio_path, language, request):
    from whisperx import align, load_align_model, load_audio

    sentences = request.get("sentences", [])
    if not sentences:
        raise ValueError("No reviewed sentence text was provided.")
    if not language:
        raise ValueError("The transcript language is unknown.")

    print("TK_PROGRESS:Loading the language alignment model…", file=sys.stderr, flush=True)
    audio = load_audio(audio_path)
    align_model, metadata = load_align_model(language_code=language, device="cpu")
    segments = []
    for sentence in sentences:
        words = sentence.get("words", [])
        text = " ".join(str(word).strip() for word in words if str(word).strip())
        start = max(0.0, float(sentence.get("start", 0.0)))
        end = min(float(request.get("duration", 0.0)), float(sentence.get("end", 0.0)))
        if text and end > start:
            segments.append({"start": start, "end": end, "text": text})

    if len(segments) != len(sentences):
        raise ValueError("A sentence has no usable audio time range.")
    print("TK_PROGRESS:Aligning the corrected preview text to the audio…", file=sys.stderr, flush=True)
    aligned_result = align(
        segments,
        align_model,
        metadata,
        audio,
        "cpu",
        return_char_alignments=False,
    )
    output_sentences = []
    for sentence_index, sentence in enumerate(sentences):
        expected_words = sentence.get("words", [])
        aligned_words = aligned_result["segments"][sentence_index].get("words", [])
        word_map = map_words(expected_words, aligned_words)
        output_words = []
        for word_index in range(len(expected_words)):
            aligned_index = word_map.get(word_index)
            aligned_word = aligned_words[aligned_index] if aligned_index is not None and aligned_index < len(aligned_words) else {}
            try:
                start = float(aligned_word.get("start"))
                end = float(aligned_word.get("end"))
                if end <= start:
                    raise ValueError("Invalid aligned word range")
            except (TypeError, ValueError):
                start = None
                end = None
            output_words.append({"start": start, "end": end})
        output_sentences.append({"words": output_words})
    return {"sentences": output_sentences}


def main():
    if len(sys.argv) < 3:
        print("Usage: align_reviewed_captions.py AUDIO_FILE LANGUAGE", file=sys.stderr)
        return 2
    audio_path, language = sys.argv[1], sys.argv[2]
    try:
        request = json.load(sys.stdin)
        with redirect_stdout(sys.stderr):
            result = run_alignment(audio_path, language, request)
    except Exception as error:
        print("Reviewed-text alignment failed: " + str(error), file=sys.stderr)
        return 3
    sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
