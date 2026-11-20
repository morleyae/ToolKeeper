(() => {
  // node_modules/fourier-transform/index.js
  var TWO_PI = 6.283185307179586;
  var cache = /* @__PURE__ */ new Map();
  var lastN = 0;
  var lastEntry = null;
  function init(N) {
    const half = N >>> 1;
    const x = new Float64Array(N);
    const spectrum = new Float64Array(half);
    const im = new Float64Array(half + 1);
    const re = x.subarray(0, half + 1);
    const complex = [re, im];
    const bSi = 2 / N;
    const bits = 31 - Math.clz32(N);
    const perm = new Uint32Array(N);
    for (let i = 0; i < N; i++) {
      let rev = 0, v = i;
      for (let j = 0; j < bits; j++) {
        rev = rev << 1 | v & 1;
        v >>= 1;
      }
      perm[i] = rev;
    }
    let total = 0, n2 = 2, nn = half;
    const stages = [];
    while (nn = nn >>> 1) {
      n2 = n2 << 1;
      const n8 = n2 >>> 3;
      const count = n8 > 1 ? n8 - 1 : 0;
      stages.push({ offset: total, count });
      total += count;
    }
    const tw = new Float64Array(total << 2);
    n2 = 2;
    nn = half;
    let si = 0;
    while (nn = nn >>> 1) {
      n2 = n2 << 1;
      const n8 = n2 >>> 3;
      const e = TWO_PI / n2;
      const off = stages[si].offset << 2;
      for (let j = 1; j < n8; j++) {
        const a = j * e;
        const s = Math.sin(a), c = Math.cos(a);
        const idx = off + (j - 1 << 2);
        tw[idx] = c;
        tw[idx + 1] = s;
        tw[idx + 2] = 4 * c * (c * c - 0.75);
        tw[idx + 3] = 4 * s * (0.75 - s * s);
      }
      si++;
    }
    const entry = { x, spectrum, complex, bSi, tw, stages, perm };
    cache.set(N, entry);
    return entry;
  }
  function getEntry(N) {
    if (N === lastN) return lastEntry;
    const entry = cache.get(N) || init(N);
    lastN = N;
    lastEntry = entry;
    return entry;
  }
  function transform(input) {
    const N = input.length;
    if (N < 2 || N & N - 1) throw Error("Input length must be a power of 2 (>= 2).");
    const entry = getEntry(N);
    const { x, tw, stages, perm } = entry;
    for (let i = 0; i < N; i++) x[i] = input[perm[i]];
    for (let ix = 0, id = 4; ix < N; id *= 4) {
      for (let i0 = ix; i0 < N; i0 += id) {
        const t = x[i0] - x[i0 + 1];
        x[i0] += x[i0 + 1];
        x[i0 + 1] = t;
      }
      ix = 2 * (id - 1);
    }
    let n2 = 2, nn = N >>> 1, si = 0;
    while (nn = nn >>> 1) {
      let ix = 0;
      n2 = n2 << 1;
      let id = n2 << 1;
      const n4 = n2 >>> 2;
      const n8 = n2 >>> 3;
      do {
        if (n4 !== 1) {
          for (let i0 = ix; i0 < N; i0 += id) {
            let i1 = i0, i2 = i1 + n4, i3 = i2 + n4, i4 = i3 + n4;
            let t1 = x[i3] + x[i4];
            x[i4] -= x[i3];
            x[i3] = x[i1] - t1;
            x[i1] += t1;
            i1 += n8;
            i2 += n8;
            i3 += n8;
            i4 += n8;
            t1 = x[i3] + x[i4];
            let t2 = x[i3] - x[i4];
            t1 = -t1 * Math.SQRT1_2;
            t2 *= Math.SQRT1_2;
            const st1 = x[i2];
            x[i4] = t1 + st1;
            x[i3] = t1 - st1;
            x[i2] = x[i1] - t2;
            x[i1] += t2;
          }
        } else {
          for (let i0 = ix; i0 < N; i0 += id) {
            const i1 = i0, i3 = i1 + 2, i4 = i3 + 1;
            const t1 = x[i3] + x[i4];
            x[i4] -= x[i3];
            x[i3] = x[i1] - t1;
            x[i1] += t1;
          }
        }
        ix = (id << 1) - n2;
        id = id << 2;
      } while (ix < N);
      const { offset, count } = stages[si];
      for (let j = 0; j < count; j++) {
        const ti = offset + j << 2;
        const cc1 = tw[ti], ss1 = tw[ti + 1], cc3 = tw[ti + 2], ss3 = tw[ti + 3];
        ix = 0;
        id = n2 << 1;
        do {
          for (let i0 = ix; i0 < N; i0 += id) {
            const i1 = i0 + j + 1;
            const i2 = i1 + n4;
            const i3 = i2 + n4;
            const i4 = i3 + n4;
            const i5 = i0 + n4 - j - 1;
            const i6 = i5 + n4;
            const i7 = i6 + n4;
            const i8 = i7 + n4;
            let t2 = x[i7] * cc1 - x[i3] * ss1;
            let t1 = x[i7] * ss1 + x[i3] * cc1;
            let t4 = x[i8] * cc3 - x[i4] * ss3;
            let t3 = x[i8] * ss3 + x[i4] * cc3;
            const st1 = t2 - t4;
            t2 += t4;
            t4 = st1;
            x[i8] = t2 + x[i6];
            x[i3] = t2 - x[i6];
            const st2 = t3 - t1;
            t1 += t3;
            t3 = st2;
            x[i4] = t3 + x[i2];
            x[i7] = t3 - x[i2];
            x[i6] = x[i1] - t1;
            x[i1] += t1;
            x[i2] = t4 + x[i5];
            x[i5] -= t4;
          }
          ix = (id << 1) - n2;
          id = id << 2;
        } while (ix < N);
      }
      si++;
    }
    return entry;
  }
  function rfft(input, output) {
    const entry = transform(input);
    const N = input.length;
    const { x, spectrum, bSi } = entry;
    const out = output || spectrum;
    let i = N >>> 1;
    while (--i) {
      const rval = x[i], ival = x[N - i];
      out[i] = bSi * Math.sqrt(rval * rval + ival * ival);
    }
    out[0] = Math.abs(bSi * x[0]);
    return out;
  }

  // node_modules/window-function/util.js
  var { cos, sin, abs, exp, sqrt, PI, cosh, acosh, acos, pow, log10 } = Math;
  var PI2 = 2 * PI;

  // node_modules/window-function/hann.js
  function hann(i, N) {
    return 0.5 - 0.5 * cos(PI2 * i / (N - 1));
  }

  // node_modules/@audio/onset/index.js
  var ODF = /* @__PURE__ */ Symbol.for("@audio/onset:odf");
  function spectralFlux(data, opts) {
    let fs = (opts == null ? void 0 : opts.fs) || 44100;
    let frameSize = (opts == null ? void 0 : opts.frameSize) || 2048;
    let hopSize = (opts == null ? void 0 : opts.hopSize) || 512;
    let nFrames = Math.floor((data.length - frameSize) / hopSize) + 1;
    if (nFrames < 2) return { odf: new Float64Array(0), nFrames: 0, hopSize, frameSize, fs };
    let frame = new Float64Array(frameSize);
    let win = new Float64Array(frameSize);
    for (let i = 0; i < frameSize; i++) win[i] = hann(i, frameSize);
    let odf = new Float64Array(nFrames);
    let prevMag = null;
    for (let f = 0; f < nFrames; f++) {
      let offset = f * hopSize;
      for (let i = 0; i < frameSize; i++) frame[i] = (data[offset + i] || 0) * win[i];
      let mag = new Float64Array(rfft(frame));
      if (prevMag) {
        let flux = 0;
        for (let i = 0; i < mag.length; i++) {
          let diff = mag[i] - prevMag[i];
          if (diff > 0) flux += diff;
        }
        odf[f] = flux;
      }
      prevMag = mag;
    }
    let hasEnergy = false;
    for (let i = 0; i < odf.length; i++) {
      if (odf[i] > 0) {
        hasEnergy = true;
        break;
      }
    }
    if (!hasEnergy) return { odf: new Float64Array(0), nFrames: 0, hopSize, frameSize, fs };
    return { odf, nFrames, hopSize, frameSize, fs };
  }
  function peakPick(odf, opts) {
    if (!(odf instanceof Float64Array)) throw new TypeError("odf must be a Float64Array");
    let windowSize = (opts == null ? void 0 : opts.windowSize) || 8;
    let delta = (opts == null ? void 0 : opts.delta) || 1.4;
    let hopSize = (opts == null ? void 0 : opts.hopSize) || 512;
    let fs = (opts == null ? void 0 : opts.fs) || 44100;
    let n = odf.length;
    let onsets2 = [];
    if (n > 1 && odf[0] > 0 && odf[0] >= odf[1]) {
      let start = 0, end = Math.min(n, windowSize + 1), sum = 0;
      for (let i = start; i < end; i++) sum += odf[i];
      let mean = sum / (end - start);
      if (odf[0] > mean * delta) onsets2.push(0);
    }
    for (let f = 1; f < n - 1; f++) {
      let start = Math.max(0, f - windowSize);
      let end = Math.min(n, f + windowSize + 1);
      let sum = 0;
      for (let i = start; i < end; i++) sum += odf[i];
      let mean = sum / (end - start);
      if (odf[f] > mean * delta && odf[f] > odf[f - 1] && odf[f] >= odf[f + 1]) {
        onsets2.push(f * hopSize / fs);
      }
    }
    return new Float64Array(onsets2);
  }
  function energyFlux(data, opts) {
    let fs = (opts == null ? void 0 : opts.fs) || 44100;
    let frameSize = (opts == null ? void 0 : opts.frameSize) || 2048;
    let hopSize = (opts == null ? void 0 : opts.hopSize) || 512;
    let nFrames = Math.floor((data.length - frameSize) / hopSize) + 1;
    if (nFrames < 2) return { odf: new Float64Array(0), nFrames: 0, hopSize, frameSize, fs };
    let energy = new Float64Array(nFrames);
    for (let f = 0; f < nFrames; f++) {
      let offset = f * hopSize, sum = 0;
      for (let i = 0; i < frameSize; i++) {
        let s = data[offset + i] || 0;
        sum += s * s;
      }
      energy[f] = Math.sqrt(sum / frameSize);
    }
    let odf = new Float64Array(nFrames);
    let hasEnergy = false;
    let maxE = 0;
    for (let f = 0; f < nFrames; f++) if (energy[f] > maxE) maxE = energy[f];
    if (maxE > 0 && energy[0] > maxE * 0.05) {
      odf[0] = energy[0];
      hasEnergy = true;
    }
    for (let f = 1; f < nFrames; f++) {
      let diff = energy[f] - energy[f - 1];
      if (diff > 0) {
        odf[f] = diff;
        hasEnergy = true;
      }
    }
    if (!hasEnergy) return { odf: new Float64Array(0), nFrames: 0, hopSize, frameSize, fs };
    return { odf, nFrames, hopSize, frameSize, fs };
  }

  // node_modules/@audio/beat-tempo/validate.js
  function isPow2(n) {
    return n > 0 && (n & n - 1) === 0;
  }
  function validate(data, opts) {
    if (data != null && !(data instanceof Float32Array) && !(data instanceof Float64Array))
      throw new TypeError("data must be Float32Array or Float64Array");
    if ((opts == null ? void 0 : opts.fs) != null && opts.fs <= 0)
      throw new RangeError("fs must be > 0");
    if ((opts == null ? void 0 : opts.frameSize) != null && !isPow2(opts.frameSize))
      throw new RangeError("frameSize must be a power of 2");
    if ((opts == null ? void 0 : opts.hopSize) != null && (opts == null ? void 0 : opts.frameSize) != null && opts.hopSize >= opts.frameSize)
      throw new RangeError("hopSize must be < frameSize");
    if ((opts == null ? void 0 : opts.minBpm) != null && (opts == null ? void 0 : opts.maxBpm) != null && opts.minBpm >= opts.maxBpm)
      throw new RangeError("minBpm must be < maxBpm");
  }

  // node_modules/@audio/beat-tempo/comb.js
  function combTempo(data, opts) {
    validate(data, opts);
    let odf, nFrames, hopSize, fs;
    if (opts == null ? void 0 : opts[ODF]) {
      ;
      ({ odf, nFrames, hopSize, fs } = opts[ODF]);
    } else {
      ;
      ({ odf, nFrames, hopSize, fs } = spectralFlux(data, opts));
    }
    if (nFrames < 2) return { bpm: 0, confidence: 0 };
    let minBpm = (opts == null ? void 0 : opts.minBpm) || 60;
    let maxBpm = (opts == null ? void 0 : opts.maxBpm) || 200;
    let topN = (opts == null ? void 0 : opts.candidates) || 1;
    let odfRate = fs / hopSize;
    let beta = 0.5 * odfRate;
    let mean = 0;
    for (let i = 0; i < nFrames; i++) mean += odf[i];
    mean /= nFrames;
    let x = new Float64Array(nFrames);
    for (let i = 0; i < nFrames; i++) x[i] = odf[i] - mean;
    let maxLag = Math.min(nFrames - 1, Math.ceil(4 * odfRate * 60 / minBpm) + 4);
    let acf = new Float64Array(maxLag + 2);
    for (let k = 0; k <= maxLag; k++) {
      let s = 0;
      for (let i = 0; i + k < nFrames; i++) s += x[i] * x[i + k];
      acf[k] = s / (nFrames - k);
    }
    let at = (t) => {
      let k = Math.floor(t), f = t - k;
      return k + 1 > maxLag ? 0 : acf[k] * (1 - f) + acf[k + 1] * f;
    };
    let scores = [];
    let maxScore = 0;
    for (let bpm = minBpm; bpm <= maxBpm; bpm++) {
      let period = odfRate * 60 / bpm;
      let score = 0;
      for (let a = 1; a <= 4; a++)
        for (let b = 1 - a; b <= a - 1; b++) score += at(a * period + b) / (2 * a - 1);
      score = Math.max(0, score) * period / beta * Math.exp(-0.5 * ((period / beta) ** 2 - 1));
      scores.push({ bpm, confidence: score });
      if (score > maxScore) maxScore = score;
    }
    if (maxScore > 0) {
      for (let s of scores) s.confidence /= maxScore;
    }
    scores.sort((a, b) => b.confidence - a.confidence);
    let filtered = [];
    for (let s of scores) {
      let dup = false;
      for (let f of filtered) {
        let ratio = s.bpm / f.bpm;
        if (ratio > 0.95 && ratio < 1.05) {
          dup = true;
          break;
        }
        if (ratio > 1.95 && ratio < 2.05) {
          dup = true;
          break;
        }
        if (ratio > 0.45 && ratio < 0.55) {
          dup = true;
          break;
        }
      }
      if (!dup) filtered.push(s);
      if (filtered.length >= topN) break;
    }
    if (!filtered.length) return { bpm: 0, confidence: 0 };
    let best = filtered[0];
    let result = { bpm: best.bpm, confidence: best.confidence };
    if (topN > 1) result.candidates = filtered;
    return result;
  }

  // node_modules/@audio/beat-onset/validate.js
  function isPow22(n) {
    return n > 0 && (n & n - 1) === 0;
  }
  function validate2(data, opts) {
    if (data != null && !(data instanceof Float32Array) && !(data instanceof Float64Array))
      throw new TypeError("data must be Float32Array or Float64Array");
    if ((opts == null ? void 0 : opts.fs) != null && opts.fs <= 0)
      throw new RangeError("fs must be > 0");
    if ((opts == null ? void 0 : opts.frameSize) != null && !isPow22(opts.frameSize))
      throw new RangeError("frameSize must be a power of 2");
    if ((opts == null ? void 0 : opts.hopSize) != null && (opts == null ? void 0 : opts.frameSize) != null && opts.hopSize >= opts.frameSize)
      throw new RangeError("hopSize must be < frameSize");
    if ((opts == null ? void 0 : opts.minBpm) != null && (opts == null ? void 0 : opts.maxBpm) != null && opts.minBpm >= opts.maxBpm)
      throw new RangeError("minBpm must be < maxBpm");
  }

  // node_modules/@audio/beat-onset/index.js
  function onsets(data, opts) {
    validate2(data, opts);
    let { odf, hopSize, fs } = spectralFlux(data, opts);
    if (!odf.length) return new Float64Array(0);
    return peakPick(odf, { hopSize, fs, ...opts });
  }

  // node_modules/@audio/beat-onset/energy.js
  function energyOnsets(data, opts) {
    validate2(data, opts);
    let { odf, hopSize, fs } = energyFlux(data, opts);
    if (!odf.length) return new Float64Array(0);
    return peakPick(odf, { hopSize, fs, ...opts });
  }

  // node_modules/@audio/beat-onset/band.js
  function bandOnsets(data, opts) {
    validate2(data, opts);
    let fs = (opts == null ? void 0 : opts.fs) || 44100;
    let frameSize = (opts == null ? void 0 : opts.frameSize) || 2048;
    let hopSize = (opts == null ? void 0 : opts.hopSize) || 512;
    let bands = (opts == null ? void 0 : opts.bands) || 4;
    let nFrames = Math.floor((data.length - frameSize) / hopSize) + 1;
    if (nFrames < 2) return new Float64Array(0);
    let win = new Float64Array(frameSize);
    for (let i = 0; i < frameSize; i++) win[i] = hann(i, frameSize);
    let nBins = frameSize / 2;
    let bandEdges = [0];
    let maxHz = fs / 2;
    let logMin = Math.log(20), logMax = Math.log(maxHz);
    for (let b = 1; b <= bands; b++) {
      let hz = Math.exp(logMin + (logMax - logMin) * b / bands);
      bandEdges.push(Math.min(nBins, Math.max(bandEdges[b - 1] + 1, Math.round(hz / maxHz * nBins))));
    }
    bandEdges[bands] = nBins;
    let bandOdfs = Array.from({ length: bands }, () => new Float64Array(nFrames));
    let prevMag = null;
    for (let f = 0; f < nFrames; f++) {
      let offset = f * hopSize;
      let frame = new Float64Array(frameSize);
      for (let i = 0; i < frameSize; i++) frame[i] = (data[offset + i] || 0) * win[i];
      let mag = new Float64Array(rfft(frame));
      if (prevMag) {
        for (let b = 0; b < bands; b++) {
          let lo = bandEdges[b], hi = bandEdges[b + 1], flux = 0;
          for (let i = lo; i < hi; i++) {
            let diff = mag[i] - prevMag[i];
            if (diff > 0) flux += diff;
          }
          bandOdfs[b][f] = flux;
        }
      }
      prevMag = mag;
    }
    let minGap = hopSize / fs;
    let all = [];
    for (let b = 0; b < bands; b++) {
      let hasEnergy = false;
      for (let i = 0; i < nFrames; i++) if (bandOdfs[b][i] > 0) {
        hasEnergy = true;
        break;
      }
      if (!hasEnergy) continue;
      let ons = peakPick(bandOdfs[b], { hopSize, fs, ...opts });
      for (let t of ons) all.push(t);
    }
    if (!all.length) return new Float64Array(0);
    all.sort((a, b) => a - b);
    let deduped = [all[0]];
    for (let i = 1; i < all.length; i++)
      if (all[i] - deduped[deduped.length - 1] > minGap) deduped.push(all[i]);
    return new Float64Array(deduped);
  }

  // node_modules/@audio/beat-track/validate.js
  function isPow23(n) {
    return n > 0 && (n & n - 1) === 0;
  }
  function validate3(data, opts) {
    if (data != null && !(data instanceof Float32Array) && !(data instanceof Float64Array))
      throw new TypeError("data must be Float32Array or Float64Array");
    if ((opts == null ? void 0 : opts.fs) != null && opts.fs <= 0)
      throw new RangeError("fs must be > 0");
    if ((opts == null ? void 0 : opts.frameSize) != null && !isPow23(opts.frameSize))
      throw new RangeError("frameSize must be a power of 2");
    if ((opts == null ? void 0 : opts.hopSize) != null && (opts == null ? void 0 : opts.frameSize) != null && opts.hopSize >= opts.frameSize)
      throw new RangeError("hopSize must be < frameSize");
    if ((opts == null ? void 0 : opts.minBpm) != null && (opts == null ? void 0 : opts.maxBpm) != null && opts.minBpm >= opts.maxBpm)
      throw new RangeError("minBpm must be < maxBpm");
  }

  // node_modules/@audio/beat-track/track.js
  function beatTrack(data, opts) {
    validate3(data, opts);
    let sf = (opts == null ? void 0 : opts[ODF]) || spectralFlux(data, opts);
    let fs = sf.fs || (opts == null ? void 0 : opts.fs) || 44100;
    let { odf, nFrames, hopSize } = sf;
    if (nFrames < 2) return { beats: new Float64Array(0), bpm: 0, confidence: 0 };
    let odfRate = fs / hopSize;
    let targetBpm = (opts == null ? void 0 : opts.bpm) || combTempo(data, { ...opts, [ODF]: sf }).bpm || 120;
    let targetPeriod = odfRate * 60 / targetBpm;
    let mean = 0;
    for (let i = 0; i < nFrames; i++) mean += odf[i];
    mean /= nFrames;
    let variance = 0;
    for (let i = 0; i < nFrames; i++) {
      let d = odf[i] - mean;
      variance += d * d;
    }
    let std = Math.sqrt(variance / nFrames) || 1;
    let odfN = new Float64Array(nFrames);
    for (let i = 0; i < nFrames; i++) odfN[i] = (odf[i] - mean) / std;
    let alpha = (opts == null ? void 0 : opts.tightness) ?? 680;
    let score = new Float64Array(nFrames);
    let prev = new Int32Array(nFrames).fill(-1);
    for (let i = 0; i < nFrames; i++) score[i] = odfN[i];
    let minGap = Math.max(1, Math.floor(targetPeriod * 0.5));
    let maxGap = Math.ceil(targetPeriod * 2);
    for (let i = 1; i < nFrames; i++) {
      let lo = Math.max(0, i - maxGap);
      let hi = Math.max(0, i - minGap);
      for (let j = lo; j < hi; j++) {
        let logR = Math.log((i - j) / targetPeriod);
        let s = score[j] + odfN[i] - alpha * logR * logR;
        if (s > score[i]) {
          score[i] = s;
          prev[i] = j;
        }
      }
    }
    let endLo = Math.max(0, nFrames - Math.floor(targetPeriod));
    let bestEnd = endLo;
    for (let i = endLo + 1; i < nFrames; i++) {
      if (score[i] > score[bestEnd]) bestEnd = i;
    }
    let frames = [];
    for (let cur = bestEnd; cur >= 0; cur = prev[cur]) frames.push(cur);
    frames.reverse();
    let beatIntervalSec = targetPeriod * hopSize / fs;
    let beatTimes = frames.map((f) => f * hopSize / fs);
    if (beatTimes.length > 0 && beatTimes[0] > beatIntervalSec * 0.25) {
      let extra = [];
      for (let t = beatTimes[0] - beatIntervalSec; t > -beatIntervalSec * 0.5; t -= beatIntervalSec)
        extra.unshift(Math.max(0, t));
      beatTimes = [...extra, ...beatTimes];
    }
    let beats = new Float64Array(beatTimes);
    let confidence = 0;
    if (beats.length >= 2) {
      let beatSet = new Set(frames);
      let onBeat = 0, total = 0;
      for (let i = 0; i < nFrames; i++) {
        total += odf[i];
        if (beatSet.has(i)) onBeat += odf[i];
      }
      confidence = total > 0 ? onBeat / total : 0;
    }
    return { beats, bpm: targetBpm, confidence };
  }

  // src/beat-tracker-entry.js
  window.KeeperSuiteBeatTrack = beatTrack;
  window.KeeperSuiteOnsets = onsets;
  window.KeeperSuiteBandOnsets = bandOnsets;
  window.KeeperSuiteEnergyOnsets = energyOnsets;
})();
