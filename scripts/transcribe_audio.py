#!/usr/bin/env python3
"""Transcribe one prepared audio file and print caption timing JSON to stdout."""

import json
import re
import sys
from difflib import SequenceMatcher
from statistics import median
from contextlib import redirect_stdout


def split_timed_text(text, start, end):
    tokens = re.findall(r"\S+", text)
    if not tokens:
        return []
    weights = [max(1, len(token.strip(".,!?;:…\"'()[]{}"))) for token in tokens]
    total_weight = sum(weights)
    duration = max(0.0, float(end) - float(start))
    elapsed_weight = 0
    result = []
    for token, weight in zip(tokens, weights):
        word_start = float(start) + duration * elapsed_weight / total_weight
        elapsed_weight += weight
        word_end = float(start) + duration * elapsed_weight / total_weight
        result.append({"word": token, "start": word_start, "end": word_end})
    return result


def _valid_time(value):
    try:
        number = float(value)
        return number if number >= 0 else None
    except (TypeError, ValueError):
        return None


def normalize_language_code(language, whisper_module):
    value = str(language or "").strip()
    if not value:
        return ""
    tokenizer = getattr(whisper_module, "tokenizer", None)
    languages = getattr(whisper_module, "LANGUAGES", {}) or getattr(tokenizer, "LANGUAGES", {}) or {}
    lowered = value.lower()
    if lowered in languages:
        return lowered
    for code, name in languages.items():
        if str(name).strip().lower() == lowered:
            return str(code).lower()
    aliases = getattr(whisper_module, "TO_LANGUAGE_CODE", {}) or getattr(tokenizer, "TO_LANGUAGE_CODE", {}) or {}
    return str(aliases.get(lowered, value)).lower()


def build_captions(result, fallback_result=None, pause_seconds=0.85):
    raw_groups = []
    fallback_segments = (fallback_result or {}).get("segments", [])
    for segment_index, segment in enumerate(result.get("segments", [])):
        words = segment.get("words") or []
        if words:
            fallback_words = fallback_segments[segment_index].get("words", []) if segment_index < len(fallback_segments) else []
            for word_index, word in enumerate(words):
                word_text = word.get("word", "")
                word_start = _valid_time(word.get("start"))
                word_end = _valid_time(word.get("end"))
                if word_start is None or word_end is None or word_end <= word_start:
                    fallback_word = fallback_words[word_index] if word_index < len(fallback_words) else {}
                    word_start = _valid_time(fallback_word.get("start"))
                    word_end = _valid_time(fallback_word.get("end"))
                if word_start is None or word_end is None or word_end <= word_start:
                    word_start = _valid_time(segment.get("start"))
                    word_end = _valid_time(segment.get("end"))
                if word_start is None or word_end is None or word_end <= word_start:
                    continue
                group = split_timed_text(
                    word_text,
                    word_start,
                    word_end,
                )
                if group:
                    for timed_word in group:
                        timed_word["alignmentOutlier"] = bool(word.get("_alignmentOutlier"))
                    raw_groups.append(group)
        else:
            text = (segment.get("text") or "").strip()
            if text:
                group = split_timed_text(
                    text,
                    segment.get("start", 0),
                    segment.get("end", segment.get("start", 0)),
                )
                if group:
                    # If a WhisperX segment had no usable word alignment,
                    # these proportional estimates are only placeholders.
                    # Send them through the sentence-level review alignment.
                    for timed_word in group:
                        timed_word["alignmentOutlier"] = fallback_result is not None
                    raw_groups.append(group)

    words = []
    recent_context = []
    punctuation = set(".,!?;:…")
    for original_group in raw_groups:
        group = original_group
        if recent_context and group[0]["start"] - recent_context[-1]["end"] > max(5.0, pause_seconds * 4):
            recent_context = []
        # Some segment-level fallback entries repeat the transcript accumulated
        # in the previous segment. Check across sentence boundaries too, so a
        # repeated prefix cannot become the first word of the next sentence.
        if len(group) > 1 and recent_context:
            max_overlap = min(len(recent_context), len(group))
            overlap = 0
            for overlap_size in range(max_overlap, 0, -1):
                previous = [item["word"].lower().strip(".,!?;:…") for item in recent_context[-overlap_size:]]
                current = [item["word"].lower().strip(".,!?;:…") for item in group[:overlap_size]]
                if previous == current:
                    overlap = overlap_size
                    break
            if overlap:
                group = group[overlap:]
        for item in group:
            text = (item.get("word") or "").strip()
            if not text:
                continue
            start = float(item.get("start", 0))
            end = float(item.get("end", start))
            if end <= start:
                continue
            if all(character in punctuation for character in text) and words:
                words[-1]["word"] += text
                words[-1]["end"] = max(words[-1]["end"], end)
                if recent_context:
                    recent_context[-1]["word"] += text
                    recent_context[-1]["end"] = max(recent_context[-1]["end"], end)
            else:
                normalized = {
                    "word": text,
                    "start": start,
                    "end": end,
                    "alignmentOutlier": bool(item.get("alignmentOutlier")),
                }
                words.append(normalized)
                recent_context.append(normalized)
                if len(recent_context) > 32:
                    recent_context = recent_context[-32:]

    sentences = []
    current = []
    for index, word in enumerate(words):
        current.append(word)
        next_word = words[index + 1] if index + 1 < len(words) else None
        ends_with_sentence_mark = word["word"][-1:] in ".!?…"
        has_long_pause = next_word and next_word["start"] - word["end"] >= pause_seconds
        if ends_with_sentence_mark or has_long_pause or next_word is None:
            sentences.append(current)
            current = []

    captions = []
    for sentence_index, sentence in enumerate(sentences):
        next_sentence_start = (
            sentences[sentence_index + 1][0]["start"]
            if sentence_index + 1 < len(sentences)
            else None
        )
        phrase = []
        for word_index, word in enumerate(sentence):
            phrase.append(word["word"])
            if word_index + 1 < len(sentence):
                end = max(word["end"], sentence[word_index + 1]["start"])
            elif next_sentence_start is not None:
                end = max(word["end"], next_sentence_start)
            else:
                end = word["end"]
            captions.append(
                {
                    "start": float(word["start"]),
                    "end": float(end),
                    "text": " ".join(phrase),
                    "word": word["word"],
                    "sentenceStart": word_index == 0,
                    "alignmentOutlier": bool(word.get("alignmentOutlier")),
                }
            )
    return captions


def _word_key(word):
    return re.sub(r"[^\w']", "", str(word or "").lower(), flags=re.UNICODE)


def _fallback_word_map(aligned_words, fallback_words):
    if len(aligned_words) == len(fallback_words):
        return {index: index for index in range(len(aligned_words))}
    aligned_keys = [_word_key(word.get("word")) for word in aligned_words]
    fallback_keys = [_word_key(word.get("word")) for word in fallback_words]
    mapping = {}
    previous_aligned = 0
    previous_fallback = 0
    blocks = SequenceMatcher(None, aligned_keys, fallback_keys, autojunk=False).get_matching_blocks()
    for block in blocks:
        aligned_gap = list(range(previous_aligned, block.a))
        fallback_gap = list(range(previous_fallback, block.b))
        for offset in range(min(len(aligned_gap), len(fallback_gap))):
            mapping[aligned_gap[offset]] = fallback_gap[offset]
        for offset in range(block.size):
            mapping[block.a + offset] = block.b + offset
        previous_aligned = block.a + block.size
        previous_fallback = block.b + block.size
    return mapping


def stabilize_aligned_word_timings(aligned_result, fallback_result, outlier_seconds=0.6):
    aligned_segments = aligned_result.get("segments", [])
    fallback_segments = fallback_result.get("segments", [])
    pairs = []

    for segment_index, aligned_segment in enumerate(aligned_segments):
        aligned_words = aligned_segment.get("words") or []
        fallback_words = fallback_segments[segment_index].get("words", []) if segment_index < len(fallback_segments) else []
        index_map = _fallback_word_map(aligned_words, fallback_words)
        for word_index, word in enumerate(aligned_words):
            fallback_index = index_map.get(word_index)
            fallback_word = fallback_words[fallback_index] if fallback_index is not None and fallback_index < len(fallback_words) else {}
            aligned_start = _valid_time(word.get("start"))
            aligned_end = _valid_time(word.get("end"))
            fallback_start = _valid_time(fallback_word.get("start"))
            fallback_end = _valid_time(fallback_word.get("end"))
            if fallback_start is not None and fallback_end is not None and fallback_end > fallback_start:
                pairs.append({
                    "segment": segment_index,
                    "word": word_index,
                    "start": aligned_start,
                    "end": aligned_end,
                    "fallback_start": fallback_start,
                    "fallback_end": fallback_end,
                    "delta": aligned_start - fallback_start if aligned_start is not None else None,
                })

    repairs = 0
    low_confidence_words = 0
    # WhisperX exposes a per-word alignment score. A low score means the
    # transcript could not be placed confidently inside that speech region.
    # Mark those words so the review step can realign their complete sentence
    # with extra audio context instead of silently trusting a bad timestamp.
    for segment in aligned_segments:
        for word in segment.get("words") or []:
            try:
                score = float(word.get("score"))
            except (TypeError, ValueError):
                continue
            if score < 0.25:
                word["_alignmentOutlier"] = True
                low_confidence_words += 1
    original_deltas = [pair["delta"] for pair in pairs]
    for pair_index, pair in enumerate(pairs):
        if pair["delta"] is None:
            continue
        nearby = [
            original_deltas[other_index]
            for other_index in range(len(pairs))
            if other_index != pair_index
            and abs(other_index - pair_index) <= 4
            and original_deltas[other_index] is not None
        ]
        if len(nearby) >= 3 and abs(pair["delta"] - median(nearby)) > outlier_seconds:
            aligned_words = aligned_segments[pair["segment"]].get("words") or []
            aligned_words[pair["word"]]["start"] = pair["fallback_start"]
            aligned_words[pair["word"]]["end"] = pair["fallback_end"]
            aligned_words[pair["word"]]["_alignmentOutlier"] = True
            pair["start"] = pair["fallback_start"]
            pair["end"] = pair["fallback_end"]
            pair["delta"] = 0.0
            repairs += 1

    previous_start = None
    pair_lookup = {(pair["segment"], pair["word"]): pair for pair in pairs}
    for segment_index, aligned_segment in enumerate(aligned_segments):
        for word_index, word in enumerate(aligned_segment.get("words") or []):
            start = _valid_time(word.get("start"))
            end = _valid_time(word.get("end"))
            if start is None or end is None or end <= start:
                continue
            if previous_start is not None and start < previous_start:
                pair = pair_lookup.get((segment_index, word_index))
                if pair and pair["fallback_start"] >= previous_start and pair["fallback_end"] > pair["fallback_start"]:
                    start = pair["fallback_start"]
                    end = pair["fallback_end"]
                    word["start"], word["end"] = start, end
                    word["_alignmentOutlier"] = True
                if start < previous_start:
                    start = previous_start
                    end = max(end, start + 0.02)
                    word["start"], word["end"] = start, end
                    word["_alignmentOutlier"] = True
                repairs += 1
            previous_start = start

    return {"repairs": repairs, "lowConfidenceWords": low_confidence_words}


def transcribe_audio(audio_path, model_name, language):
    if not ((3, 9) <= sys.version_info[:2] < (3, 14)):
        raise RuntimeError("WhisperX requires Python 3.9–3.13 here. Click Set up Whisper to create a supported environment.")
    if sys.version_info[:2] == (3, 9):
        try:
            from importlib.metadata import version as package_version
            urllib3_major = int(package_version("urllib3").split(".")[0])
            if urllib3_major >= 2:
                raise RuntimeError("Python 3.9 requires urllib3 1.x for LibreSSL. Click Set up Whisper to repair the environment.")
        except RuntimeError:
            raise
        except Exception:
            pass
    with redirect_stdout(sys.stderr):
        import warnings

        # pyannote (used by WhisperX's VAD) still touches TorchAudio APIs
        # deprecated in 2.8. On some Python environments the warning filter
        # promotes these warnings to exceptions and aborts transcription.
        warnings.filterwarnings("ignore", message=r".*has been deprecated.*", category=Warning)
        import whisper
        import whisperx

        language_code = normalize_language_code(language, whisper)
        print("TK_PROGRESS:Loading the WhisperX speech model and Silero voice detector…", file=sys.stderr, flush=True)
        audio = whisperx.load_audio(audio_path)
        # Pyannote's bundled VAD checkpoint can fail under newer PyTorch
        # weights-only deserialization. Silero is WhisperX's supported VAD
        # alternative and avoids loading that checkpoint.
        model = whisperx.load_model(model_name, device="cpu", compute_type="int8", vad_method="silero")
        print("TK_PROGRESS:Transcribing speech and finding speech regions…", file=sys.stderr, flush=True)
        result = model.transcribe(
            audio,
            batch_size=4,
            language=language_code or None,
        )
        fallback_result = result
        alignment_error_message = ""
        alignment_repairs = 0
        del model
        try:
            import gc

            gc.collect()
            alignment_language = normalize_language_code(result.get("language") or language_code, whisper)
            if not alignment_language:
                raise RuntimeError("Whisper did not detect a language for word alignment.")
            print("TK_PROGRESS:Aligning each recognized word to the audio…", file=sys.stderr, flush=True)
            align_model, metadata = whisperx.load_align_model(language_code=alignment_language, device="cpu")
            aligned_result = whisperx.align(
                result.get("segments", []),
                align_model,
                metadata,
                audio,
                "cpu",
                return_char_alignments=False,
            )
            if not aligned_result.get("segments"):
                raise RuntimeError("The aligner returned no timed words.")
            if not any(segment.get("words") for segment in aligned_result["segments"]):
                raise RuntimeError("The aligner returned no word-level timestamps.")
            alignment_quality = stabilize_aligned_word_timings(aligned_result, fallback_result)
            result = aligned_result
            alignment = "forced"
            del align_model
            gc.collect()
        except Exception as alignment_error:
            print("TK_PROGRESS:Forced alignment unavailable; keeping Whisper's original word timings.", file=sys.stderr, flush=True)
            print("TK_ALIGNMENT_FALLBACK: " + str(alignment_error), file=sys.stderr, flush=True)
            result = fallback_result
            alignment = "whisper"
            alignment_error_message = str(alignment_error)
        return {
            "language": normalize_language_code(result.get("language") or language_code, whisper),
            "alignment": alignment,
            "alignmentError": alignment_error_message,
            "alignmentRepairs": alignment_quality["repairs"] if alignment == "forced" else 0,
            "alignmentOutliers": alignment_quality["lowConfidenceWords"] if alignment == "forced" else 0,
            "captions": build_captions(result, fallback_result if alignment == "forced" else None),
        }


def main():
    if len(sys.argv) < 3:
        print("Usage: transcribe_audio.py AUDIO_FILE MODEL [LANGUAGE]", file=sys.stderr)
        return 2
    audio_path, model_name = sys.argv[1], sys.argv[2]
    language = (sys.argv[3] if len(sys.argv) > 3 else "").strip() or None
    try:
        payload = transcribe_audio(audio_path, model_name, language)
    except Exception as error:
        print("Whisper transcription failed: " + str(error), file=sys.stderr)
        return 4
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
