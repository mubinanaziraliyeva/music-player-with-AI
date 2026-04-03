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
    // create nodes: eq chain -> gain -> analyser -> destination
    gainNode = audioCtx.createGain();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
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

let currentIndex = 0,
  isPlaying = false,
  isShuffle = false,
  repeatMode = "off";
let colorThief = null;
let aiEnabled = true;
// Liked tracks set
let likedTracks = new Set();
try {
  const raw = localStorage.getItem("mp_likes");
  if (raw) {
    JSON.parse(raw).forEach((i) => likedTracks.add(i));
  }
} catch (e) {}
// mood cache per track index
const trackMood = {};

function formatTime(s) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${sec}`;
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
  document
    .querySelectorAll("#playlist li")
    .forEach((li, i) => li.classList.toggle("bg-gray-800/30", i === idx));
}

function renderPlaylist() {
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
      // avoid click when pressing like button
      if (e.target.closest(".track-like")) return;
      crossfadeTo(i);
    });
    playlistEl.appendChild(li);
  });
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
  }
}
function seekTo(v) {
  if (!audio.duration) return;
  audio.currentTime = (v / 100) * audio.duration;
}

// Visualizer
let canvasCtx = null;
function initVisualizer() {
  if (!canvas) return;
  ensureAudioContext();
  if (!analyser) return;
  canvasCtx = canvas.getContext("2d");
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.floor(r.width);
    canvas.height = 90;
  };
  resize();
  window.addEventListener("resize", resize);
  function draw() {
    requestAnimationFrame(draw);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    const w = canvas.width,
      h = canvas.height;
    // clear with subtle fade for smoother motion
    canvasCtx.fillStyle = "rgba(0,0,0,0.06)";
    canvasCtx.fillRect(0, 0, w, h);
    // create gradient from accent to neon cyan and add glow
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent") ||
      "#10b981";
    const neon = "#00fff7";
    const grad = canvasCtx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, accent.trim());
    grad.addColorStop(1, neon);
    canvasCtx.shadowBlur = 18;
    canvasCtx.shadowColor = neon;

    // draw a frequency-reactive wave
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = grad;
    canvasCtx.beginPath();
    const sliceWidth = w / bufferLength;
    let x = 0;
    let bassSum = 0;
    const bassCount = Math.max(4, Math.floor(bufferLength * 0.08));
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 255; // 0..1
      const y = h / 2 + (v - 0.5) * h * 0.9; // center wave
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
      x += sliceWidth;
      if (i < bassCount) bassSum += dataArray[i];
    }
    canvasCtx.stroke();

    // draw filled area with gradient and low alpha (reduce shadow)
    canvasCtx.shadowBlur = 6;
    canvasCtx.shadowColor = neon;
    canvasCtx.lineTo(w, h);
    canvasCtx.lineTo(0, h);
    canvasCtx.closePath();
    canvasCtx.fillStyle = "rgba(16,185,129,0.06)";
    canvasCtx.fill();

    // compute bass level (0..1)
    const bassAvg = bassSum / (bassCount * 255);
    const bass = Math.min(1, Math.max(0, bassAvg * 1.6));
    document.documentElement.style.setProperty(
      "--bass",
      String(bass.toFixed(3)),
    );
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
