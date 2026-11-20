(function () {
  var cep = window.__adobe_cep__ || window.cep;
  var button = document.querySelector('[data-action="add-markers"]');
  var status = document.getElementById("beat-placeholder");
  var target = document.getElementById("beat-marker-target") || status;
  if (!button || !status || !target) return;

  function evaluate(script) {
    return new Promise(function (resolve, reject) {
      if (!cep || typeof cep.evalScript !== "function") {
        reject(new Error("After Effects host is unavailable."));
        return;
      }
      cep.evalScript(script, function (result) {
        if (!result || result === "EvalScript error.") {
          reject(new Error("After Effects could not read the selected audio layer."));
          return;
        }
        resolve(String(result));
      });
    });
  }

  function readAudioFile(path) {
    var nodeRequire = window.require || (typeof require === "function" ? require : null);
    if (!nodeRequire) return Promise.reject(new Error("CEP file access is unavailable."));
    var fs = nodeRequire("fs");
    return new Promise(function (resolve, reject) {
      fs.readFile(path, function (error, buffer) {
        if (error) reject(error);
        else resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
      });
    });
  }

  function decodeAudio(arrayBuffer) {
    var AudioContextType = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextType) return Promise.reject(new Error("This CEP runtime cannot decode audio."));
    var context = new AudioContextType();
    return new Promise(function (resolve, reject) {
      var settled = false;
      function finish(callback, value) {
        if (settled) return;
        settled = true;
        context.close();
        callback(value);
      }
      try {
        var result = context.decodeAudioData(arrayBuffer, function (decoded) { finish(resolve, decoded); }, function (error) { finish(reject, error); });
        if (result && typeof result.then === "function") {
          result.then(function (decoded) { finish(resolve, decoded); }, function (error) { finish(reject, error); });
        }
      } catch (error) {
        finish(reject, error);
      }
    });
  }

  function toMono(audioBuffer) {
    var channelCount = audioBuffer.numberOfChannels;
    var first = audioBuffer.getChannelData(0);
    if (channelCount === 1) return first;
    var mono = new Float32Array(first.length);
    for (var channel = 0; channel < channelCount; channel++) {
      var samples = audioBuffer.getChannelData(channel);
      for (var i = 0; i < mono.length; i++) mono[i] += samples[i] / channelCount;
    }
    return mono;
  }

  function mergeOnsetTimes(detectorLists) {
    var combined = [];
    detectorLists.forEach(function (times) {
      Array.from(times).forEach(function (time) { combined.push(time); });
    });
    combined.sort(function (a, b) { return a - b; });

    var clusters = [];
    combined.forEach(function (time) {
      var cluster = null;
      for (var i = 0; i < clusters.length; i++) {
        if (Math.abs(clusters[i].medianTime - time) <= 0.04) {
          cluster = clusters[i];
          break;
        }
      }
      if (!cluster) {
        cluster = { times: [] };
        clusters.push(cluster);
      }
      cluster.times.push(time);
      cluster.medianTime = median(cluster.times);
    });

    var merged = [];
    clusters.forEach(function (cluster) {
      var support = 0;
      detectorLists.forEach(function (times) {
        for (var i = 0; i < times.length; i++) {
          if (Math.abs(times[i] - cluster.medianTime) <= 0.055) {
            support++;
            break;
          }
        }
      });
      if (support >= 2) merged.push(cluster.medianTime);
    });
    return merged;
  }

  function median(values) {
    if (!values.length) return 0;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function addDoubleBeatMarkers(beats, onsetTimes) {
    if (beats.length < 5 || onsetTimes.length < 3) return Array.from(beats);

    var intervals = [];
    for (var i = 1; i < beats.length; i++) {
      var interval = beats[i] - beats[i - 1];
      if (interval > 0.12 && interval < 3) intervals.push(interval);
    }
    var period = median(intervals);
    if (!period) return Array.from(beats);

    var gapHits = [];
    var gapCount = 0;

    for (var beatIndex = 0; beatIndex < beats.length - 1; beatIndex++) {
      var gapStart = beats[beatIndex];
      var gapEnd = beats[beatIndex + 1];
      var gap = gapEnd - gapStart;
      if (gap < period * 0.78 || gap > period * 1.22) continue;

      gapCount++;
      var searchRadius = Math.min(gap * 0.30, Math.max(0.075, period * 0.18));
      var nearest = null;
      var nearestDistance = Infinity;

      for (var onsetIndex = 0; onsetIndex < onsetTimes.length; onsetIndex++) {
        var onset = onsetTimes[onsetIndex];
        var relative = (onset - gapStart) / gap;
        if (relative < 0.20 || relative > 0.80) continue;

        var clusterOffset = gap * (relative - 0.5);
        var distance = Math.abs(clusterOffset);
        if (distance <= searchRadius && distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { time: onset, offset: relative - 0.5 };
        }
      }

      if (nearest) gapHits.push(nearest);
    }

    if (gapHits.length < 3) return Array.from(beats);

    var clusterSize = 0.15;
    var clusters = [];
    gapHits.forEach(function (hit) {
      var cluster = null;
      for (var clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
        if (Math.abs(clusters[clusterIndex].center - hit.offset) <= clusterSize) {
          cluster = clusters[clusterIndex];
          break;
        }
      }
      if (!cluster) {
        cluster = { offsets: [], times: [], center: hit.offset };
        clusters.push(cluster);
      }
      cluster.offsets.push(hit.offset);
      cluster.times.push(hit.time);
      cluster.center = median(cluster.offsets);
    });

    var bestCluster = null;
    clusters.forEach(function (cluster) {
      var spread = 0;
      cluster.offsets.forEach(function (offset) { spread += Math.abs(offset - cluster.center); });
      cluster.spread = cluster.offsets.length ? spread / cluster.offsets.length : 1;
      if (!bestCluster || cluster.offsets.length > bestCluster.offsets.length) bestCluster = cluster;
    });

    var requiredHits = Math.max(3, Math.ceil(gapCount * 0.40));
    if (!bestCluster || bestCluster.offsets.length < requiredHits || bestCluster.spread > 0.13) {
      return Array.from(beats);
    }

    var subdivisions = bestCluster.times.slice();
    var combined = Array.from(beats).concat(subdivisions);
    combined.sort(function (a, b) { return a - b; });
    var result = [];
    var duplicateTolerance = Math.max(0.025, period * 0.04);
    combined.forEach(function (time) {
      if (!result.length || time - result[result.length - 1] > duplicateTolerance) result.push(time);
    });
    return result;
  }

  function updateMarkerTarget() {
    evaluate("tkGetDevBeatAudioSelection()")
      .then(function (rawSelection) {
        var selection;
        try { selection = JSON.parse(rawSelection); } catch (error) { selection = null; }
        if (!selection) {
          target.textContent = "Select one audio layer";
          status.textContent = "Select one audio layer in the timeline.";
        } else if (!selection.name) {
          target.textContent = selection.error || "Select one audio layer";
          status.textContent = selection.error || "Select one audio layer in the timeline.";
        } else if (!selection.hasAudio) {
          target.textContent = selection.name;
          status.textContent = "Selected layer has no audio: " + selection.name;
        } else {
          target.textContent = selection.name;
          status.textContent = "Ready: " + selection.name;
        }
      })
      .catch(function () {
        target.textContent = "Select one audio layer";
        status.textContent = "Select one audio layer in the timeline.";
      });
  }

  function addMarkers() {
    var replaceExisting = document.getElementById("replace-markers").checked;
    status.textContent = "Reading selected audio...";

    evaluate("tkGetDevBeatAudioInfo(true)")
      .then(function (rawInfo) {
        var info = JSON.parse(rawInfo);
        if (info.error) throw new Error(info.error);
        return readAudioFile(info.path).then(decodeAudio).then(function (audioBuffer) {
          status.textContent = "Tracking beats...";
          var result = window.KeeperSuiteBeatTrack(toMono(audioBuffer), {
            fs: audioBuffer.sampleRate,
            minBpm: 40,
            maxBpm: 240,
            tightness: 350
          });
          var sourceDuration = info.sourceEnd - info.sourceStart;
          if (sourceDuration <= 0) throw new Error("This audio layer uses reverse or non-linear time remapping, which is not supported yet.");
          var scale = (info.compEnd - info.compStart) / sourceDuration;
          var mappedBeats = Array.from(result.beats).map(function (sourceTime) {
            return info.compStart + (sourceTime - info.sourceStart) * scale;
          }).filter(function (compTime) {
            return compTime >= info.compStart && compTime <= info.compEnd;
          });
          var compBeats = mappedBeats;
          if (!compBeats.length) throw new Error("The tracker did not find beats in the selected audio range.");
          var script = "tkWriteDevBeatMarkers([" + compBeats.map(function (time) { return time.toFixed(6); }).join(",") + "]," + replaceExisting + ")";
          return evaluate(script).then(function (message) {
            var confidence = Math.round(result.confidence * 100);
            status.textContent = Math.round(result.bpm) + " BPM, " + confidence + "% confidence. " + message;
          });
        });
      })
      .catch(function (error) {
        status.textContent = error && error.message ? error.message : "Beat tracking failed.";
      });
  }

  document.querySelectorAll('.view-tab[data-view="audio"]').forEach(function (tab) {
    tab.addEventListener("click", updateMarkerTarget);
  });
  window.setInterval(updateMarkerTarget, 2000);
  updateMarkerTarget();

  document.addEventListener("click", function (event) {
    var target = event.target.closest('[data-action="add-markers"]');
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    addMarkers();
  }, true);
})();