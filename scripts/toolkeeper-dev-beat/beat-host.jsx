function tkGetDevBeatAudioContext(workAreaOnly) {
  var comp = tkSelectedComp();
  if (!comp) return { error: "Select a composition first." };
  if (comp.selectedLayers.length !== 1) return { error: "Select exactly one audio layer in the timeline." };

  var audio = comp.selectedLayers[0];
  if (!audio.hasAudio) return { error: "The selected layer has no audio." };
  if (audio.locked) return { error: "Unlock the selected audio layer first." };
  if (audio.timeRemapEnabled) return { error: "Disable time remapping on the selected audio layer first." };

  var source = audio.source;
  var file = source && source.file;
  if (!file || !file.fsName) return { error: "The selected audio layer must use a local audio or video file." };

  var compStart = audio.inPoint;
  var compEnd = audio.outPoint;
  if (workAreaOnly) {
    compStart = Math.max(compStart, comp.workAreaStart);
    compEnd = Math.min(compEnd, comp.workAreaStart + comp.workAreaDuration);
  }
  if (compEnd <= compStart) return { error: "The selected audio layer has no audio in this range." };

  var stretch = Number(audio.stretch);
  if (!stretch) return { error: "Could not read the selected audio layer's stretch value." };
  var sourceStart = (compStart - audio.startTime) * 100 / stretch;
  var sourceEnd = (compEnd - audio.startTime) * 100 / stretch;
  if (sourceEnd <= sourceStart) return { error: "Reverse audio playback is not supported." };

  return {
    path: file.fsName,
    sourceStart: sourceStart,
    sourceEnd: sourceEnd,
    compStart: compStart,
    compEnd: compEnd
  };
}

function tkGetDevBeatAudioSelection() {
  try {
    var comp = tkSelectedComp();
    if (!comp) return JSON.stringify({ name: "", error: "Select a composition" });
    if (comp.selectedLayers.length !== 1) {
      return JSON.stringify({ name: "", error: comp.selectedLayers.length ? "Select exactly one audio layer" : "Select one audio layer" });
    }
    var layer = comp.selectedLayers[0];
    return JSON.stringify({ name: layer.name, hasAudio: !!layer.hasAudio });
  } catch (error) {
    return JSON.stringify({ name: "", error: error.toString() });
  }
}

function tkGetDevBeatAudioInfo(workAreaOnly) {
  try {
    return JSON.stringify(tkGetDevBeatAudioContext(workAreaOnly));
  } catch (error) {
    return JSON.stringify({ error: error.toString() });
  }
}

function tkWriteDevBeatMarkers(beatTimes, replaceExisting) {
  try {
    var context = tkGetDevBeatAudioContext(false);
    if (context.error) return context.error;
    if (!(beatTimes instanceof Array) || !beatTimes.length) return "No beat times were provided.";

    var comp = tkSelectedComp();
    var audio = comp.selectedLayers[0];
    var marker = audio.property("ADBE Marker") || audio.property("Marker");
    if (!marker) return "The selected audio layer has no marker property.";

    tkBeginUndo("Add Beat Markers");
    var nextNumber = 1;
    if (replaceExisting) {
      for (var removeIndex = marker.numKeys; removeIndex >= 1; removeIndex--) {
        if (tkIsBeatMarker(marker.keyValue(removeIndex))) marker.removeKey(removeIndex);
      }
    } else {
      for (var existingIndex = 1; existingIndex <= marker.numKeys; existingIndex++) {
        var existing = marker.keyValue(existingIndex);
        if (!tkIsBeatMarker(existing)) continue;
        var existingNumber = Number(existing.comment);
        if (existingNumber >= nextNumber) nextNumber = existingNumber + 1;
      }
    }

    var frameDuration = 1 / comp.frameRate;
    var added = 0;
    for (var beatIndex = 0; beatIndex < beatTimes.length; beatIndex++) {
      var beatTime = Math.round(Number(beatTimes[beatIndex]) / frameDuration) * frameDuration;
      if (beatTime < context.compStart || beatTime > context.compEnd) continue;
      var nearest = marker.numKeys ? marker.nearestKeyIndex(beatTime) : 0;
      if (nearest && Math.abs(marker.keyTime(nearest) - beatTime) < frameDuration / 2) continue;

      var value = new MarkerValue(String(nextNumber));
      value.setParameters(["ToolKeeperBeat", "1"]);
      marker.setValueAtTime(beatTime, value);
      nextNumber++;
      added++;
    }
    tkEndUndo();
    return added ? "Added " + added + " beats to " + audio.name + "." : "No new beats were added.";
  } catch (error) {
    try { tkEndUndo(); } catch (undoError) {}
    return "ERROR: " + error.toString();
  }
}