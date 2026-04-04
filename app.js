// Advanced Music Player (Vanilla JS)
// Clean standalone script (uses same DOM ids as index.html)

const tracks = [
  {
    title: "Alan Walker - Darkside",
    file: "Music/Alan Walker - Darkside.mp3",
    cover: "Cover/Alan Walker - Darkside.jpg",
  },
  {
    title: "Criminal",
    file: "Music/Criminal.mp3",
    cover: "Cover/Criminal.webp",
  },
  {
    title: "Feel the Light",
    file: "Music/Feel the Light.mp3",
    cover: "Cover/Feel the Light.png",
  },
  { title: "For You", file: "Music/For You.mp3", cover: "Cover/For you.jpg" },
  {
    title: "Neoni - Darkside",
    file: "Music/Neoni - Darkside.mp3",
    cover: "Cover/Neoni - Darkside.jpg",
  },
  { title: "Tattoo", file: "Music/Tattoo.mp3", cover: "Cover/Tattoo.jpg" },
];

// Player state
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = "off"; // off | all | one
let aiEnabled = true;
let likedTracks = new Set();
try {
  const raw = localStorage.getItem("mp_likes");
  if (raw) JSON.parse(raw).forEach((k) => likedTracks.add(String(k)));
} catch (e) {}
const trackMood = {};

// Ensure known local tracks are present (useful if file was edited manually)
(() => {
  const required = [
    {
      title: "Matadora",
      file: "Music/MATADORA.mp3",
      cover: "Cover/MATADORA.jpg",
    },
    {
      title: "Rampampam",
      file: "Music/Rampampam.mp3",
      cover: "Cover/Rampampam.jpg",
    },
  ];
  required.forEach((r) => {
    const exists = tracks.some((t) => t.title === r.title && t.file === r.file);
    if (!exists) tracks.push(r);
  });
})();

// DOM refs
const coverEl = document.getElementById("cover");
const coverContainer = document.getElementById("coverContainer");
const coverCanvas = document.getElementById("coverVisualizer");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("playIcon");
const likeBtn = document.getElementById("likeBtn");
const likeIcon = document.getElementById("likeIcon");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const volumeEl = document.getElementById("volume");
const volMinus = document.getElementById("volMinus");
const volPlus = document.getElementById("volPlus");
const volumeWrap = document.getElementById("volumeWrap");
const playlistEl = document.getElementById("playlist");
const canvas = document.getElementById("visualizer");
const uploadInput = document.getElementById("uploadInput");
const aiAnalysisEl = document.getElementById("aiAnalysis");
const lyricsContainerEl = document.getElementById("lyricsContainer");
const lyricsContentEl = document.getElementById("lyricsContent");
const lyricsStatusEl = document.getElementById("lyricsStatus");
const toggleLyricsBtn = document.getElementById("toggleLyricsBtn");
// staticLyricsMode: when true, render static (non-synced) lyrics and disable highlight updates
let staticLyricsMode = true;
const lyricOffsetMinusBtn = document.getElementById("lyricOffsetMinus");
const lyricOffsetPlusBtn = document.getElementById("lyricOffsetPlus");
const lyricOffsetValueEl = document.getElementById("lyricOffsetValue");
const saveOffsetBtn = document.getElementById("saveOffsetBtn");
const autoTuneBtn = document.getElementById("autoTuneBtn");

if (toggleLyricsBtn && lyricsContentEl) {
  toggleLyricsBtn.addEventListener("click", () => {
    const hidden = lyricsContentEl.classList.toggle("hidden");
    toggleLyricsBtn.textContent = hidden ? "Show" : "Hide";
  });
}

// offset UI handlers (adjust sync offset per track)
function updateOffsetUI() {
  try {
    const t = tracks[currentIndex] || {};
    const v = Number(t._syncOffset || 0);
    if (lyricOffsetValueEl) lyricOffsetValueEl.textContent = `${v.toFixed(1)}s`;
  } catch (e) {}
}

// Persist offsets per-track using localStorage
function offsetStorageKeyForTrack(track) {
  if (!track) return null;
  // prefer filename if available, otherwise use normalized title
  const id =
    track.file ||
    track.src ||
    track.title ||
    track.name ||
    `track-${track.index}`;
  return `lyricsOffset::${id}`;
}

function saveOffsetForTrack(track) {
  try {
    const key = offsetStorageKeyForTrack(track);
    if (!key) return;
    const val = Number(track._syncOffset || 0);
    localStorage.setItem(key, String(val));
    if (lyricsStatusEl)
      lyricsStatusEl.textContent = `Offset saved: ${val.toFixed(2)}s`;
  } catch (e) {
    console.warn("saveOffsetForTrack failed", e);
  }
}

function loadOffsetForTrack(track) {
  try {
    const key = offsetStorageKeyForTrack(track);
    if (!key) return 0;
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const v = Number(raw);
    if (!isFinite(v)) return 0;
    track._syncOffset = v;
    return v;
  } catch (e) {
    return 0;
  }
}

if (lyricOffsetMinusBtn) {
  lyricOffsetMinusBtn.addEventListener("click", () => {
    try {
      const t = tracks[currentIndex] || {};
      t._syncOffset = Number((Number(t._syncOffset || 0) - 0.2).toFixed(3));
      updateOffsetUI();
      // refresh highlight immediately
      try {
        updateLyricsHighlight(audio.currentTime);
      } catch (e) {}
    } catch (e) {}
  });
}
if (lyricOffsetPlusBtn) {
  lyricOffsetPlusBtn.addEventListener("click", () => {
    try {
      const t = tracks[currentIndex] || {};
      t._syncOffset = Number((Number(t._syncOffset || 0) + 0.2).toFixed(3));
      updateOffsetUI();
      try {
        updateLyricsHighlight(audio.currentTime);
      } catch (e) {}
    } catch (e) {}
  });
}
// save offset to localStorage automatically when Save clicked
if (saveOffsetBtn) {
  saveOffsetBtn.addEventListener("click", () => {
    try {
      const t = tracks[currentIndex] || {};
      saveOffsetForTrack(t);
    } catch (e) {}
  });
}

// Auto-tune: probe small offsets and choose the one minimizing distance to nearest lyric across sampled audio times
async function autoTuneOffset(track) {
  if (!track || !track.lyrics || !track.lyrics.length) return;
  const audioEl = audio;
  if (!audioEl || !audioEl.duration || !isFinite(audioEl.duration)) return;
  const candidates = [];
  for (let d = -0.6; d <= 0.6; d += 0.1) candidates.push(Number(d.toFixed(2)));
  // sample while playing for up to 2 seconds or until 12 samples
  const samples = [];
  const sampleCount = 12;
  const sampleInterval = Math.min(
    200,
    Math.max(80, (audioEl.duration * 1000) / 50),
  );
  // ensure playing during sampling
  const wasPaused = audioEl.paused;
  try {
    if (audioEl.paused) await audioEl.play().catch(() => {});
  } catch (e) {}
  for (let i = 0; i < sampleCount; i++) {
    samples.push(audioEl.currentTime);
    await new Promise((r) => setTimeout(r, 150));
  }
  // compute score for each candidate: sum of min distances from sample to nearest lyric time+offset
  const scores = candidates.map((off) => {
    let s = 0;
    for (const samp of samples) {
      let best = Infinity;
      for (const ln of track.lyrics) {
        if (typeof ln.time !== "number") continue;
        const diff = Math.abs(ln.time + off - samp);
        if (diff < best) best = diff;
      }
      s += best;
    }
    return { off, score: s };
  });
  scores.sort((a, b) => a.score - b.score);
  const best = scores[0];
  track._syncOffset = Number(best.off.toFixed(3));
  saveOffsetForTrack(track);
  updateOffsetUI();
  try {
    updateLyricsHighlight(audio.currentTime);
  } catch (e) {}
  // restore play/pause state
  try {
    if (wasPaused) audioEl.pause();
  } catch (e) {}
  return best;
}

if (autoTuneBtn) {
  autoTuneBtn.addEventListener("click", async () => {
    try {
      const t = tracks[currentIndex] || {};
      if (!t || !t.lyrics || !t.lyrics.length) return;
      if (lyricsStatusEl) lyricsStatusEl.textContent = "Auto-tuning...";
      const res = await autoTuneOffset(t);
      if (lyricsStatusEl && res)
        lyricsStatusEl.textContent = `Auto-tuned: ${res.off}s`;
    } catch (e) {
      if (lyricsStatusEl) lyricsStatusEl.textContent = "Auto-tune failed";
    }
  });
}

// Audio + WebAudio
const audio = new Audio();
audio.crossOrigin = "anonymous";
audio.preload = "metadata";
let audioCtx = null,
  sourceNode = null,
  gainNode = null,
  analyser = null,
  dataArray = null,
  bufferLength = 0;
let eqLow = null,
  eqMid = null,
  eqHigh = null;

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      sourceNode = audioCtx.createMediaElementSource(audio);
    } catch (e) {
      console.warn(e);
    }
    gainNode = audioCtx.createGain();
    analyser = audioCtx.createAnalyser();
    // Higher resolution and smooth movement for HD visualizer
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.85;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    // EQ nodes
    eqLow = audioCtx.createBiquadFilter();
    eqLow.type = "lowshelf";
    eqLow.frequency.value = 120;
    eqMid = audioCtx.createBiquadFilter();
    eqMid.type = "peaking";
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 1;
    eqHigh = audioCtx.createBiquadFilter();
    eqHigh.type = "highshelf";
    eqHigh.frequency.value = 3000;

    if (sourceNode) sourceNode.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
}

// Visualizer implementation (centered mirrored bars)
let canvasCtx = null;
function initVisualizer() {
  if (!canvas) return;
  ensureAudioContext();
  if (!analyser) return;
  canvasCtx = canvas.getContext("2d");
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const cssWidth = Math.floor(r.width);
    const cssHeight = 150; // fixed HD height
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";
    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);
    // set a device-pixel-ratio aware transform
    canvasCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  function draw() {
    requestAnimationFrame(draw);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.width / ratio,
      h = canvas.height / ratio;
    // clear fully each frame for crisp bars
    canvasCtx.clearRect(0, 0, w, h);

    // center point
    const cx = w / 2;

    // number of bars per side
    const barsPerSide = Math.min(80, Math.floor(bufferLength / 2));
    const maxBarWidth = Math.max(2, Math.floor(w / 2 / barsPerSide));

    // gradient from accent (bottom) to neon/white (top)
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent") ||
      "#10b981";
    const neon = "#e6fffb";
    const grad = canvasCtx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, accent.trim());
    grad.addColorStop(1, neon);

    canvasCtx.fillStyle = grad;
    canvasCtx.shadowBlur = 15;
    canvasCtx.shadowColor = neon;

    // draw mirrored bars from center outwards
    for (let i = 0; i < barsPerSide; i++) {
      const idx = Math.floor(i * (dataArray.length / (barsPerSide * 1.0)));
      const v = (dataArray[idx] || 0) / 255; // 0..1
      const barHeight = Math.min(h, v * h * 1.5);
      const barW = Math.max(
        2,
        Math.floor(maxBarWidth - i * (maxBarWidth / barsPerSide)),
      );

      // left bar
      const lx = Math.floor(cx - (i + 1) * (maxBarWidth + 1));
      const ly = Math.floor(h - barHeight);
      canvasCtx.fillRect(lx, ly, barW, barHeight);

      // right mirrored bar
      const rx = Math.floor(cx + i * (maxBarWidth + 1));
      canvasCtx.fillRect(rx, ly, barW, barHeight);
    }

    // compute approximate bass for other UI effects (use first few bins)
    const bassCount = Math.max(4, Math.floor(bufferLength * 0.06));
    let bassSum = 0;
    for (let b = 0; b < bassCount; b++) bassSum += dataArray[b] || 0;
    const bassAvg = bassSum / (bassCount * 255);
    const bass = Math.min(1, Math.max(0, bassAvg * 1.8));
    document.documentElement.style.setProperty(
      "--bass",
      String(bass.toFixed(3)),
    );
    // add subtle glow to cover when bass is present
    try {
      if (coverContainer) {
        if (bass > 0.06) coverContainer.classList.add("cover-glow");
        else coverContainer.classList.remove("cover-glow");
      }
    } catch (e) {}
  }
  draw();
}

function tryInitVisualizer() {
  ensureAudioContext();
  if (analyser) {
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    initVisualizer();
  }
}

function setVolume(v) {
  const val = Math.max(0, Math.min(1, Number(v)));
  if (gainNode && audioCtx) {
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(val, audioCtx.currentTime);
  } else audio.volume = val;
  try {
    localStorage.setItem("mp_volume", String(val));
  } catch (e) {}
}

function fadeTo(target, d = 0.35) {
  if (!gainNode || !audioCtx) return;
  const now = audioCtx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(Math.max(0.0001, target), now + d);
}

async function crossfadeTo(idx) {
  ensureAudioContext();
  if (!gainNode) {
    loadTrack(idx);
    await audio.play().catch(() => {});
    return;
  }
  fadeTo(0.0001, 0.25);
  await new Promise((r) => setTimeout(r, 260));
  currentIndex = idx;
  loadTrack(currentIndex);
  if (audioCtx.state === "suspended") await audioCtx.resume();
  gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  try {
    await audio.play();
  } catch (e) {}
  const saved =
    parseFloat(localStorage.getItem("mp_volume")) ||
    Number(volumeEl.value) ||
    0.8;
  fadeTo(saved, 0.45);
}

function loadTrack(idx) {
  const t = tracks[idx];
  // ensure a sync offset exists per-track
  if (typeof t._syncOffset === "undefined") t._syncOffset = 0;
  // load persisted offset if present
  try {
    loadOffsetForTrack(t);
  } catch (e) {}
  updateOffsetUI();
  // show skeleton while loading
  if (coverContainer) coverContainer.classList.add("loading");
  audio.src = encodeURI(t.file);
  titleEl.textContent = t.title;
  const parts = t.title.split(" - ");
  artistEl.textContent = parts.length > 1 ? parts[0] : "Unknown Artist";
  document.title = `${parts.length > 1 ? parts[0] + " - " : ""}${t.title}`;
  try {
    localStorage.setItem("mp_lastIndex", String(idx));
  } catch (e) {}
  // set cover; when cover image loads, extract color and stop skeleton
  coverEl.onload = () => {
    if (coverContainer) coverContainer.classList.remove("loading");
    try {
      if (window.ColorThief) {
        colorThief = colorThief || new ColorThief();
        const rgb = colorThief.getColor(coverEl);
        if (rgb) {
          document.documentElement.style.setProperty(
            "--accent",
            `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
          );
          document.documentElement.style.setProperty(
            "--accent-rgb",
            `${rgb[0]},${rgb[1]},${rgb[2]}`,
          );
          document.body.classList.add("dynamic-theme");
        }
      }
    } catch (e) {}
    tryInitVisualizer();
    tryInitCoverVisualizer();
    // update liked icon
    try {
      likeIcon.classList.toggle("liked", likedTracks.has(String(idx)));
    } catch (e) {}
    // mark recs for UI
    try {
      markRecommendations();
    } catch (e) {}
  };
  coverEl.src = encodeURI(t.cover);
  // load lyrics if available for this track
  try {
    loadLyricsForTrack(t);
  } catch (e) {}
  document
    .querySelectorAll("#playlist li")
    .forEach((li, i) => li.classList.toggle("bg-gray-800/30", i === idx));
}

// --- Lyrics: LRC parser, loader and renderer ---
function parseLRC(lrcText) {
  const lines = lrcText.split(/\r?\n/);
  const timeRe = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const out = [];
  for (const line of lines) {
    let match;
    const times = [];
    timeRe.lastIndex = 0;
    while ((match = timeRe.exec(line)) !== null) {
      // Use parseFloat for higher precision on seconds (handles decimals)
      const min = Number(match[1]);
      const secFloat = match[3]
        ? parseFloat(match[2] + "." + match[3].padEnd(3, "0"))
        : parseFloat(match[2]);
      const time = Number(min * 60) + Number(secFloat);
      times.push(time);
    }
    const text = line.replace(timeRe, "").trim();
    times.forEach((t) => out.push({ time: t, text }));
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

// If a lyrics file contains no time tags, approximate timestamps so lines
// can be highlighted live while the track plays. This distributes timestamps
// across the track duration with a small head/tail padding.
function assignApproxTimestamps(lyrics, duration) {
  if (
    !Array.isArray(lyrics) ||
    !lyrics.length ||
    !duration ||
    !isFinite(duration)
  )
    return lyrics;
  // Weight by text length so longer lines receive proportionally more time
  const weights = lyrics.map((l) => Math.max(1, String(l.text || "").length));
  const totalWeight = weights.reduce((s, w) => s + w, 0) || lyrics.length;
  const head = Math.min(1.0, duration * 0.04); // small head padding
  const tail = Math.min(1.0, duration * 0.04); // small tail padding
  const usable = Math.max(0.1, duration - head - tail);
  let cum = 0;
  return lyrics.map((ln, i) => {
    const w = weights[i];
    const frac = (cum + w / 2) / totalWeight; // center of weighted bin
    const t = head + usable * frac;
    cum += w;
    return { time: Number(t.toFixed(3)), text: ln.text || "" };
  });
}

function assignTimestampsIfNeeded(track, parsed) {
  if (!parsed || !parsed.length) return parsed;
  const hasTime = parsed.some(
    (p) => typeof p.time === "number" && !isNaN(p.time),
  );
  if (hasTime) return parsed;
  // mark track for later timestamping if duration unknown
  if (
    !audio ||
    !audio.duration ||
    !isFinite(audio.duration) ||
    audio.duration === 0
  ) {
    try {
      track._needsTimestamping = true;
    } catch (e) {}
    return parsed;
  }
  // assign approximate timestamps now
  const assigned = assignApproxTimestamps(parsed, audio.duration);
  try {
    track._needsTimestamping = false;
  } catch (e) {}
  return assigned;
}

async function loadLyricsForTrack(track) {
  // Try flexible matching for LRC files in /Lyrics by title or filename
  console.groupCollapsed &&
    console.groupCollapsed(`lyrics: trying to load for "${track.title}"`);
  console.debug &&
    console.debug("loadLyricsForTrack candidates helper running");
  const tryNames = [];
  tryNames.push(track.title || "");
  try {
    tryNames.push(
      (track.file || "")
        .split("/")
        .pop()
        .replace(/\.[^/.]+$/, ""),
    );
  } catch (e) {}

  function normalizeName(name) {
    if (!name) return "";
    return name
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  }

  // If there's an index of lyric filenames available, use it to find the
  // best match (handles typos/casing/spacing on disk). This avoids trying to
  // guess exact URLs when filenames differ slightly from track titles.
  try {
    const idxResp = await fetch("Lyrics/index.json");
    if (idxResp && idxResp.ok) {
      const list = await idxResp.json();
      if (Array.isArray(list) && list.length) {
        // build map by normalized basename -> filename
        const map = {};
        list.forEach((fn) => {
          const base = fn.replace(/\.[^/.]+$/, "");
          map[base.toLowerCase()] = fn;
          map[normalizeName(base)] = fn;
        });
        // try exact-ish matches from our tryNames
        for (const n of tryNames) {
          if (!n) continue;
          const keys = [
            n.toString(),
            n.toString().toLowerCase(),
            normalizeName(n),
          ];
          for (const k of keys) {
            if (map[k]) {
              const url = `Lyrics/${map[k]}`;
              try {
                const r = await fetch(url);
                if (r && r.ok) {
                  const txt = await r.text();
                  let parsed = parseLRC(txt);
                  if (!parsed || parsed.length === 0) {
                    const lines = txt
                      .split(/\r?\n/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    parsed = lines.map((line) => ({ time: null, text: line }));
                    if (lyricsStatusEl)
                      lyricsStatusEl.textContent = `Loaded: ${map[k]} (no timestamps)`;
                    console.info &&
                      console.info(
                        `lyrics: loaded via index ${map[k]} (no timestamps, ${parsed.length} lines)`,
                      );
                  } else {
                    if (lyricsStatusEl)
                      lyricsStatusEl.textContent = `Loaded: ${map[k]}`;
                    console.info &&
                      console.info(
                        `lyrics: loaded via index ${map[k]} (${parsed.length} lines)`,
                      );
                  }
                  // assign approximate timestamps if needed
                  parsed = assignTimestampsIfNeeded(track, parsed);
                  track.lyrics = parsed;
                  renderLyrics(parsed);
                  try {
                    updateOffsetUI();
                  } catch (e) {}
                  console.groupEnd && console.groupEnd();
                  return;
                }
              } catch (e) {
                console.warn &&
                  console.warn(
                    "lyrics fetch error via index for",
                    url,
                    e && e.message ? e.message : e,
                  );
              }
            }
          }
        }

        // fuzzy substring match: normalized title may contain the indexed key
        const primary = normalizeName(tryNames[0] || "");
        if (primary) {
          for (const mk of Object.keys(map)) {
            if (!mk) continue;
            const normMk = mk.toString();
            if (primary.includes(normMk) || normMk.includes(primary)) {
              const url = `Lyrics/${map[mk]}`;
              try {
                const r2 = await fetch(url);
                if (r2 && r2.ok) {
                  const txt2 = await r2.text();
                  let parsed2 = parseLRC(txt2);
                  if (!parsed2 || parsed2.length === 0) {
                    const lines2 = txt2
                      .split(/\r?\n/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    parsed2 = lines2.map((l) => ({ time: null, text: l }));
                    if (lyricsStatusEl)
                      lyricsStatusEl.textContent = `Loaded: ${map[mk]} (no timestamps)`;
                    console.info &&
                      console.info(
                        `lyrics: loaded via fuzzy index ${map[mk]} (no timestamps, ${parsed2.length} lines)`,
                      );
                  } else {
                    if (lyricsStatusEl)
                      lyricsStatusEl.textContent = `Loaded: ${map[mk]}`;
                    console.info &&
                      console.info(
                        `lyrics: loaded via fuzzy index ${map[mk]} (${parsed2.length} lines)`,
                      );
                  }
                  // assign approximate timestamps if needed
                  parsed2 = assignTimestampsIfNeeded(track, parsed2);
                  track.lyrics = parsed2;
                  renderLyrics(parsed2);
                  console.groupEnd && console.groupEnd();
                  return;
                }
              } catch (e) {
                console.warn &&
                  console.warn(
                    "lyrics fetch error via fuzzy index for",
                    url,
                    e && e.message ? e.message : e,
                  );
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // ignore index errors and fall back to candidate probing
  }

  const candidates = [];
  tryNames.forEach((n) => {
    if (!n) return;
    candidates.push(n);
    candidates.push(normalizeName(n));
    candidates.push(n.replace(/\s+/g, "_"));
    candidates.push(encodeURIComponent(n));
  });

  // dedupe
  const seen = new Set();
  const uniq = candidates.filter((c) => {
    if (!c) return false;
    const key = c.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let found = false;
  for (const c of uniq) {
    console.debug && console.debug("trying candidate", c, `-> Lyrics/${c}.lrc`);
    const url = `Lyrics/${c}.lrc`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.debug && console.debug("not found", url, res.status);
        continue;
      }
      const txt = await res.text();
      let parsed = parseLRC(txt);
      if (!parsed || parsed.length === 0) {
        const lines = txt
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        parsed = lines.map((line) => ({ time: null, text: line }));
        if (lyricsStatusEl)
          lyricsStatusEl.textContent = `Loaded: ${c}.lrc (no timestamps)`;
        console.info &&
          console.info(
            `lyrics: loaded ${c}.lrc (no timestamps, ${parsed.length} lines)`,
          );
      } else {
        if (lyricsStatusEl) lyricsStatusEl.textContent = `Loaded: ${c}.lrc`;
        console.info &&
          console.info(`lyrics: loaded ${c}.lrc (${parsed.length} lines)`);
      }
      // assign approximate timestamps if needed
      parsed = assignTimestampsIfNeeded(track, parsed);
      track.lyrics = parsed;
      renderLyrics(parsed);
      try {
        updateOffsetUI();
      } catch (e) {}
      found = true;
      break;
    } catch (e) {
      console.warn &&
        console.warn(
          "lyrics fetch error for",
          url,
          e && e.message ? e.message : e,
        );
      // ignore and try next
    }
  }

  if (!found) {
    try {
      const altUrl = `Lyrics/${encodeURIComponent(track.title)}.lrc`;
      const res2 = await fetch(altUrl);
      if (res2 && res2.ok) {
        const txt2 = await res2.text();
        let parsed2 = parseLRC(txt2);
        if (!parsed2 || parsed2.length === 0) {
          const lines2 = txt2
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
          parsed2 = lines2.map((l) => ({ time: null, text: l }));
          if (lyricsStatusEl)
            lyricsStatusEl.textContent = `Loaded: ${track.title}.lrc (no timestamps)`;
        } else if (lyricsStatusEl)
          lyricsStatusEl.textContent = `Loaded: ${track.title}.lrc`;
        parsed2 = assignTimestampsIfNeeded(track, parsed2);
        track.lyrics = parsed2;
        renderLyrics(parsed2);
        try {
          updateOffsetUI();
        } catch (e) {}
        found = true;
      }
    } catch (e) {}
  }

  if (!found) {
    track.lyrics = [];
    renderLyrics([]);
    try {
      updateOffsetUI();
    } catch (e) {}
    if (lyricsStatusEl) lyricsStatusEl.textContent = "No lyrics found";
  }
}

function renderLyrics(lyrics) {
  if (!lyricsContentEl) return;
  lyricsContentEl.innerHTML = "";
  if (!lyrics || !lyrics.length) {
    const p = document.createElement("div");
    p.className = "lyric-line muted";
    p.textContent = "No lyrics available";
    lyricsContentEl.appendChild(p);
    return;
  }
  if (staticLyricsMode) {
    // Render static, readable lyrics (one paragraph per line)
    const frag = document.createDocumentFragment();
    lyrics.forEach((ln) => {
      const p = document.createElement("div");
      p.className = "lyric-line";
      p.textContent = ln.text || "";
      frag.appendChild(p);
    });
    lyricsContentEl.appendChild(frag);
  } else {
    // interactive (legacy) rendering with clickable lines
    lyrics.forEach((ln, i) => {
      const div = document.createElement("div");
      div.className = "lyric-line";
      div.setAttribute("data-idx", String(i));
      div.textContent = ln.text || "";
      // click-to-seek: jump to lyric time when available
      div.style.cursor = "pointer";
      div.addEventListener("click", (e) => {
        try {
          if (typeof ln.time === "number" && isFinite(ln.time)) {
            const ttrack = tracks[currentIndex] || {};
            const off = Number(ttrack._syncOffset || 0);
            audio.currentTime = Math.max(0, ln.time + off);
            try {
              if (audio.paused) audio.play().catch(() => {});
            } catch (e) {}
          }
        } catch (e) {}
      });
      lyricsContentEl.appendChild(div);
    });
  }
  // reset current highlighted index when new lyrics loaded
  currentLyricIndex = -1;
  if (lyricsStatusEl && lyrics && lyrics.length) {
    // show approximate lines count
    // when static mode show total lines briefly in status
    if (staticLyricsMode) lyricsStatusEl.textContent = `${lyrics.length} lines`;
    else lyricsStatusEl.textContent = `${lyrics.length} lines`;
  }
}

let currentLyricIndex = -1;
function updateLyricsHighlight(currentTime) {
  const t = tracks[currentIndex];
  if (!t || !t.lyrics || !t.lyrics.length) return;
  const lyrics = t.lyrics;
  const offset = Number(t._syncOffset || 0);
  const effectiveTime =
    typeof currentTime === "number" ? currentTime - offset : currentTime;
  // find last index where time <= effectiveTime
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    const itemTime =
      typeof lyrics[i].time === "number" && !isNaN(lyrics[i].time)
        ? lyrics[i].time
        : Infinity;
    if (itemTime <= effectiveTime) idx = i;
    else break;
  }
  if (idx === currentLyricIndex) return;
  currentLyricIndex = idx;
  // update classes for all lines (past/active/future)
  try {
    const children =
      lyricsContentEl &&
      Array.from(lyricsContentEl.querySelectorAll(".lyric-line"));
    if (children && children.length) {
      children.forEach((el, i) => {
        el.classList.remove("active", "past", "future");
        if (i < idx) el.classList.add("past");
        else if (i === idx) el.classList.add("active");
        else el.classList.add("future");
      });
      // scroll active into center using scrollTo for precise control
      if (idx >= 0) {
        const activeEl = lyricsContentEl.querySelector(
          `.lyric-line[data-idx="${idx}"]`,
        );
        if (activeEl && lyricsContentEl) {
          try {
            const container = lyricsContentEl;
            const elTop = activeEl.offsetTop;
            const elCenter =
              elTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
            const maxTop = container.scrollHeight - container.clientHeight;
            const target = Math.max(0, Math.min(maxTop, elCenter));
            container.scrollTo({ top: target, behavior: "smooth" });
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
}

// Render playlist items into the sidebar
function renderPlaylist() {
  if (!playlistEl) return;
  playlistEl.innerHTML = "";
  tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/30 cursor-pointer transition-transform duration-200";
    const liked = likedTracks.has(String(i));
    li.innerHTML = `
      <img src="${encodeURI(t.cover)}" class="w-12 h-12 rounded-md object-cover" />
      <div class="flex-1">
        <div class="font-medium">${t.title}</div>
      </div>
      <div class="flex items-center gap-2">
        <button class="track-like btn btn-ghost text-sm" data-index="${i}" title="Like">
          <i class="${liked ? "fa-solid fa-heart liked" : "fa-regular fa-heart"}"></i>
        </button>
        <div class="text-sm text-gray-400">${i + 1}</div>
      </div>
    `;
    li.addEventListener("click", (e) => {
      if (e.target.closest(".track-like")) return;
      crossfadeTo(i);
    });
    playlistEl.appendChild(li);
  });
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(sec / 60);
  return `${m}:${s}`;
}

// TF-IDF recommendation helpers
let tfidfVectors = null;
let idf = null;
function buildTFIDF() {
  const docs = tracks.map((t) => (t.title || "").toLowerCase());
  const tokenized = docs.map((d) => d.split(/[^a-z0-9]+/).filter(Boolean));
  const df = {};
  tokenized.forEach((tokens) => {
    const seen = new Set();
    tokens.forEach((tok) => {
      if (!seen.has(tok)) {
        df[tok] = (df[tok] || 0) + 1;
        seen.add(tok);
      }
    });
  });
  idf = {};
  const N = docs.length;
  Object.keys(df).forEach((tok) => {
    idf[tok] = Math.log((N + 1) / (df[tok] + 1)) + 1;
  });
  tfidfVectors = tokenized.map((tokens) => {
    const tf = {};
    tokens.forEach((t) => (tf[t] = (tf[t] || 0) + 1));
    const vec = {};
    Object.keys(tf).forEach(
      (t) => (vec[t] = (tf[t] / tokens.length) * (idf[t] || 0)),
    );
    return vec;
  });
}

function cosineSim(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0,
    na = 0,
    nb = 0;
  keys.forEach((k) => {
    const va = a[k] || 0;
    const vb = b[k] || 0;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  });
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Simple AI recommendation: token overlap scoring
function tokenizeTitle(title) {
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
function getRecommendations(idx, limit = 3) {
  // Use TF-IDF cosine similarity as primary signal, then boost by likes/mood/artist overlap
  if (!tfidfVectors) buildTFIDF();
  const baseVec = tfidfVectors[idx] || {};
  const baseMood = trackMood[idx] || "neutral";
  const scores = tracks.map((t, i) => {
    if (i === idx) return { i, score: -1 };
    const sim = cosineSim(baseVec, tfidfVectors[i] || {});
    // token overlap fallback
    const tokens = tokenizeTitle(tracks[i].title);
    const common = tokenizeTitle(tracks[idx].title).filter((x) =>
      tokens.includes(x),
    ).length;
    const sameArtist =
      tracks[idx].title.split(" - ")[0] === tracks[i].title.split(" - ")[0]
        ? 1
        : 0;
    const likedBoost = likedTracks.has(String(i)) ? 0.9 : 0;
    const mood = trackMood[i] || "neutral";
    const moodBoost = mood === baseMood && baseMood !== "neutral" ? 0.6 : 0;
    const score =
      sim * 3 +
      common * 0.6 +
      sameArtist * 0.6 +
      likedBoost +
      moodBoost +
      Math.random() * 0.05;
    return { i, score };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, limit).map((s) => s.i);
}

// Toggle like for currently playing track via like button
function toggleLike(index) {
  const key = String(index);
  if (likedTracks.has(key)) {
    likedTracks.delete(key);
  } else {
    likedTracks.add(key);
  }
  try {
    localStorage.setItem("mp_likes", JSON.stringify(Array.from(likedTracks)));
  } catch (e) {}
  // update UI
  renderPlaylist();
  try {
    likeIcon.classList.toggle("liked", likedTracks.has(String(currentIndex)));
  } catch (e) {}
  markRecommendations();
}

// Expose AI toggle button behavior
const aiToggleBtn = document.getElementById("aiToggle");
if (aiToggleBtn) {
  aiToggleBtn.classList.toggle("text-green-400", aiEnabled);
  aiToggleBtn.addEventListener("click", () => {
    aiEnabled = !aiEnabled;
    aiToggleBtn.classList.toggle("text-green-400", aiEnabled);
  });
}

// Mark recommended items in playlist (visual aid)
function markRecommendations() {
  const recs = getRecommendations(currentIndex, 5);
  const lis = playlistEl.querySelectorAll("li");
  lis.forEach((li, i) => {
    // remove old badges and recommended marker
    li.querySelectorAll(".rec-badge").forEach((n) => n.remove());
    li.classList.remove("recommended-item");
    if (recs.includes(i)) {
      const span = document.createElement("span");
      span.className = "rec-badge text-xs text-green-300 ml-2";
      span.textContent = "Recommended";
      const flex = li.querySelector(".flex-1");
      if (flex) flex.appendChild(span);
      li.classList.add("recommended-item");
    }
    // visually mark liked tracks (if not handled during render)
    try {
      const idx = i;
      const likeIconEl = li.querySelector(".fa-heart");
      if (likeIconEl)
        likeIconEl.classList.toggle("liked", likedTracks.has(String(idx)));
    } catch (e) {}
  });
}

function updateProgress() {
  if (audio.duration) {
    const p = (audio.currentTime / audio.duration) * 100;
    progress.value = p;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
    // update synchronized lyrics highlight
    try {
      if (!staticLyricsMode) updateLyricsHighlight(audio.currentTime);
    } catch (e) {}
  }
}
function seekTo(v) {
  if (!audio.duration) return;
  audio.currentTime = (v / 100) * audio.duration;
}

function tryInitVisualizer() {
  ensureAudioContext();
  if (analyser) {
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    initVisualizer();
  }
}

// EQ slider wiring
const eqBassEl = document.getElementById("eqBass");
const eqMidEl = document.getElementById("eqMid");
const eqHighEl = document.getElementById("eqHigh");
function wireEQ() {
  if (!audioCtx) ensureAudioContext();
  if (!eqLow || !eqMid || !eqHigh) return;
  function update() {
    try {
      eqLow.gain.value = Number(eqBassEl.value);
    } catch (e) {}
    try {
      eqMid.gain.value = Number(eqMidEl.value);
    } catch (e) {}
    try {
      eqHigh.gain.value = Number(eqHighEl.value);
    } catch (e) {}
  }
  if (eqBassEl) eqBassEl.addEventListener("input", update);
  if (eqMidEl) eqMidEl.addEventListener("input", update);
  if (eqHighEl) eqHighEl.addEventListener("input", update);
  update();
}

// COVER VISUALIZER (circular bars around the cover)
let coverCtx = null;
function initCoverVisualizer() {
  if (!coverCanvas) return;
  ensureAudioContext();
  if (!analyser) return;
  coverCtx = coverCanvas.getContext("2d");
  const resize = () => {
    const r = coverCanvas.getBoundingClientRect();
    coverCanvas.width = Math.floor(r.width * devicePixelRatio);
    coverCanvas.height = Math.floor(r.height * devicePixelRatio);
    coverCtx.scale(devicePixelRatio, devicePixelRatio);
  };
  resize();
  window.addEventListener("resize", resize);
  drawCover();
}

function drawCover() {
  requestAnimationFrame(drawCover);
  if (!analyser || !coverCtx) return;
  analyser.getByteFrequencyData(dataArray);
  const rect = coverCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  coverCtx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2.3;
  const bars = Math.min(64, dataArray.length);
  for (let i = 0; i < bars; i++) {
    const v = dataArray[Math.floor(i * (dataArray.length / bars))] / 255;
    const angle = (i / bars) * Math.PI * 2;
    const len = radius * (0.25 + v * 0.85);
    const x1 = cx + Math.cos(angle) * radius;
    const y1 = cy + Math.sin(angle) * radius;
    const x2 = cx + Math.cos(angle) * (radius + len);
    const y2 = cy + Math.sin(angle) * (radius + len);
    const grad = coverCtx.createLinearGradient(x1, y1, x2, y2);
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent") ||
      "#10b981";
    grad.addColorStop(0, accent.trim());
    grad.addColorStop(1, "rgba(255,255,255,0.06)");
    coverCtx.strokeStyle = grad;
    coverCtx.lineWidth = 2;
    coverCtx.beginPath();
    coverCtx.moveTo(x1, y1);
    coverCtx.lineTo(x2, y2);
    coverCtx.stroke();
  }
}

function tryInitCoverVisualizer() {
  tryInitVisualizer();
  initCoverVisualizer();
}

// MOOD DETECTION: quick estimation using frequency centroid / energy
function computeMoodForIndex(idx) {
  if (!analyser) {
    if (aiAnalysisEl) aiAnalysisEl.textContent = "Mood: Unknown";
    return;
  }
  if (aiAnalysisEl) aiAnalysisEl.textContent = "Analyzing rhythm...";
  // sample a few frames quickly
  const sampleCount = 6;
  const tmp = new Uint8Array(analyser.frequencyBinCount);
  let sum = 0;
  for (let s = 0; s < sampleCount; s++) {
    analyser.getByteFrequencyData(tmp);
    // higher bins mean more energy in highs -> energetic
    const highStart = Math.floor(tmp.length * 0.5);
    let highSum = 0,
      total = 0;
    for (let i = 0; i < tmp.length; i++) {
      total += tmp[i];
      if (i >= highStart) highSum += tmp[i];
    }
    const ratio = total > 0 ? highSum / total : 0;
    sum += ratio;
  }
  const avg = sum / sampleCount;
  const mood = avg > 0.25 ? "energetic" : "calm";
  trackMood[idx] = mood;
  if (aiAnalysisEl)
    aiAnalysisEl.textContent = `Mood: ${mood.charAt(0).toUpperCase() + mood.slice(1)}`;
}

// Events
playBtn.addEventListener("click", async () => {
  ensureAudioContext();
  if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
  if (!isPlaying) {
    try {
      await audio.play();
    } catch (e) {}
  } else audio.pause();
});
nextBtn.addEventListener("click", () => {
  if (isShuffle) crossfadeTo(Math.floor(Math.random() * tracks.length));
  else crossfadeTo((currentIndex + 1) % tracks.length);
});
prevBtn.addEventListener("click", () => {
  if (audio.currentTime > 3) audio.currentTime = 0;
  else crossfadeTo((currentIndex - 1 + tracks.length) % tracks.length);
});
shuffleBtn.addEventListener("click", () => {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle("text-green-400", isShuffle);
});
repeatBtn.addEventListener("click", () => {
  if (repeatMode === "off") {
    repeatMode = "all";
    repeatBtn.classList.add("text-green-400");
    repeatBtn.title = "Repeat: All";
  } else if (repeatMode === "all") {
    repeatMode = "one";
    repeatBtn.title = "Repeat: One";
  } else {
    repeatMode = "off";
    repeatBtn.classList.remove("text-green-400");
    repeatBtn.title = "Repeat: Off";
  }
});
progress.addEventListener("input", (e) => seekTo(e.target.value));
volumeEl.addEventListener("input", (e) =>
  setVolume(parseFloat(e.target.value)),
);
if (volMinus)
  volMinus.addEventListener("click", () => {
    const v = Math.max(
      0,
      Math.round((Number(volumeEl.value) - 0.05) * 100) / 100,
    );
    volumeEl.value = v;
    setVolume(v);
  });
if (volPlus)
  volPlus.addEventListener("click", () => {
    const v = Math.min(
      1,
      Math.round((Number(volumeEl.value) + 0.05) * 100) / 100,
    );
    volumeEl.value = v;
    setVolume(v);
  });

// click outside hide volumeWrap
document.addEventListener("click", (e) => {
  if (volumeWrap && !volumeWrap.classList.contains("hidden")) {
    if (
      !volumeWrap.contains(e.target) &&
      e.target !== volMinus &&
      e.target !== volPlus
    )
      volumeWrap.classList.add("hidden");
  }
});

// keyboard
window.addEventListener("keydown", async (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (!isPlaying) await audio.play();
    else audio.pause();
  }
  if (e.code === "ArrowRight") nextBtn.click();
  if (e.code === "ArrowLeft") prevBtn.click();
  if (e.code === "KeyM") {
    setVolume(0);
    volumeEl.value = 0;
  }
});

// audio events
audio.addEventListener("play", () => {
  isPlaying = true;
  playIcon.classList.remove("fa-play");
  playIcon.classList.add("fa-pause");
  coverEl.classList.add("playing-rotate");
  if (coverContainer) coverContainer.classList.add("cover-active");
  // also expand the overall player card slightly for a cohesive zoom effect
  try {
    const card =
      coverContainer &&
      coverContainer.closest &&
      coverContainer.closest(".player-card");
    if (card) card.classList.add("player-card-expanded");
  } catch (e) {}
  try {
    playBtn.classList.add("playing");
  } catch (e) {}
  // compute mood shortly after playback starts (requires analyser)
  setTimeout(() => {
    try {
      computeMoodForIndex(currentIndex);
      markRecommendations();
    } catch (e) {}
  }, 300);
});
audio.addEventListener("pause", () => {
  isPlaying = false;
  playIcon.classList.remove("fa-pause");
  playIcon.classList.add("fa-play");
  coverEl.classList.remove("playing-rotate");
  if (coverContainer) coverContainer.classList.remove("cover-active");
  try {
    const card =
      coverContainer &&
      coverContainer.closest &&
      coverContainer.closest(".player-card");
    if (card) card.classList.remove("player-card-expanded");
  } catch (e) {}
  try {
    playBtn.classList.remove("playing");
  } catch (e) {}
});
audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
  // metadata loaded: remove skeleton if any and compute mood if possible
  try {
    if (coverContainer) coverContainer.classList.remove("loading");
  } catch (e) {}
  try {
    computeMoodForIndex(currentIndex);
  } catch (e) {}
  // If the currently loaded track had lyrics without timestamps, assign them now
  try {
    const t = tracks[currentIndex];
    if (t && t._needsTimestamping && t.lyrics && t.lyrics.length) {
      t.lyrics = assignApproxTimestamps(t.lyrics, audio.duration);
      t._needsTimestamping = false;
      renderLyrics(t.lyrics);
      if (lyricsStatusEl)
        lyricsStatusEl.textContent =
          t.lyrics && t.lyrics.length
            ? `${t.lyrics.length} lines (timestamps approx)`
            : "Loaded (timestamps approx)";
    }
  } catch (e) {}
});
audio.addEventListener("ended", () => {
  if (repeatMode === "one") {
    audio.currentTime = 0;
    audio.play();
    return;
  }
  if (isShuffle) {
    crossfadeTo(Math.floor(Math.random() * tracks.length));
    return;
  }
  // If AI recommendations enabled, pick a recommended next track
  if (aiEnabled) {
    const recs = getRecommendations(currentIndex, 5).filter(
      (i) => i !== currentIndex,
    );
    if (recs && recs.length > 0) {
      crossfadeTo(recs[0]);
      return;
    }
  }
  if (repeatMode === "all") {
    crossfadeTo((currentIndex + 1) % tracks.length);
  } else {
    if (currentIndex < tracks.length - 1) crossfadeTo(currentIndex + 1);
    else {
      audio.pause();
      audio.currentTime = 0;
    }
  }
});

// init
renderPlaylist();
buildTFIDF();
try {
  const si = parseInt(localStorage.getItem("mp_lastIndex"));
  if (!isNaN(si) && si >= 0 && si < tracks.length) currentIndex = si;
} catch (e) {}
loadTrack(currentIndex);
try {
  const sv = parseFloat(localStorage.getItem("mp_volume"));
  if (!isNaN(sv)) volumeEl.value = sv;
} catch (e) {}
setVolume(parseFloat(volumeEl.value) || 0.8);
tryInitVisualizer();
tryInitCoverVisualizer();
wireEQ();
markRecommendations();
document
  .querySelectorAll("#playlist li")
  .forEach((li, i) =>
    li.classList.toggle("bg-gray-800/30", i === currentIndex),
  );
[playBtn, prevBtn, nextBtn, shuffleBtn, repeatBtn].forEach(
  (b) => b && b.setAttribute("tabindex", "0"),
);

// requestAnimationFrame-based loop for smoother lyric sync and progress updates
let _rafId = null;
function rafTick() {
  try {
    if (audio && audio.duration) {
      // update progress UI (kept lightweight)
      try {
        const p = (audio.currentTime / audio.duration) * 100;
        if (progress) progress.value = p;
        if (currentTimeEl)
          currentTimeEl.textContent = formatTime(audio.currentTime);
        if (durationEl) durationEl.textContent = formatTime(audio.duration);
      } catch (e) {}
    }
    // update lyrics highlight each frame for smoother sync
    try {
      if (!staticLyricsMode && audio) updateLyricsHighlight(audio.currentTime);
    } catch (e) {}
  } catch (e) {}
  _rafId = requestAnimationFrame(rafTick);
}
// start RAF loop
try {
  if (!_rafId) _rafId = requestAnimationFrame(rafTick);
} catch (e) {}

// Like button for current track
if (likeBtn) {
  likeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleLike(currentIndex);
  });
}

// Delegated listener for per-track like buttons in playlist
if (playlistEl) {
  playlistEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".track-like");
    if (!btn) return;
    e.stopPropagation();
    const idx = Number(btn.getAttribute("data-index"));
    if (!isNaN(idx)) toggleLike(idx);
  });
}

// Upload handling: parse metadata via jsmediatags if available
if (typeof uploadInput !== "undefined" && uploadInput) {
  uploadInput.addEventListener("change", (e) => {
    const files = e.target.files || [];
    if (!files.length) return;
    if (aiAnalysisEl) aiAnalysisEl.textContent = "Adding your files...";
    Array.from(files).forEach((f) => {
      const objUrl = window.URL.createObjectURL(f);
      // try jsmediatags to extract metadata & cover
      if (window.jsmediatags) {
        try {
          window.jsmediatags.read(f, {
            onSuccess: function (tag) {
              const title = (tag.tags.title || f.name).toString();
              const artist = (tag.tags.artist || "").toString();
              if (tag.tags.picture) {
                const picture = tag.tags.picture;
                const byteArray = new Uint8Array(picture.data);
                const blob = new Blob([byteArray], { type: picture.format });
                const coverUrl = URL.createObjectURL(blob);
                addUploadedTrack(title, artist, objUrl, coverUrl, f.name);
              } else {
                addUploadedTrack(title, artist, objUrl, null, f.name);
              }
            },
            onError: function (err) {
              addUploadedTrack(
                f.name.replace(/\.[^/.]+$/, ""),
                "",
                objUrl,
                null,
                f.name,
              );
            },
          });
        } catch (err) {
          addUploadedTrack(
            f.name.replace(/\.[^/.]+$/, ""),
            "",
            objUrl,
            null,
            f.name,
          );
        }
      } else {
        addUploadedTrack(
          f.name.replace(/\.[^/.]+$/, ""),
          "",
          objUrl,
          null,
          f.name,
        );
      }
    });
    uploadInput.value = "";
  });
}

function addUploadedTrack(title, artist, fileUrl, coverUrl, originalName) {
  const t = artist ? artist + " - " + title : title;
  const track = {
    title: t,
    file: fileUrl,
    cover: coverUrl || "Cover/For you.jpg",
  };
  tracks.push(track);
  buildTFIDF();
  renderPlaylist();
  const newIndex = tracks.length - 1;
  crossfadeTo(newIndex);
  if (aiAnalysisEl) aiAnalysisEl.textContent = `Playing: ${track.title}`;
  markRecommendations();
}

// End of app.js
