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

// DOM refs
const coverEl = document.getElementById("cover");
const coverContainer = document.getElementById("coverContainer");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("playIcon");
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
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    if (sourceNode) sourceNode.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
}

let currentIndex = 0,
  isPlaying = false,
  isShuffle = false,
  repeatMode = "off";
let colorThief = null;

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
  audio.src = encodeURI(t.file);
  titleEl.textContent = t.title;
  const parts = t.title.split(" - ");
  artistEl.textContent = parts.length > 1 ? parts[0] : "Unknown Artist";
  document.title = `${parts.length > 1 ? parts[0] + " - " : ""}${t.title}`;
  coverEl.src = encodeURI(t.cover);
  try {
    localStorage.setItem("mp_lastIndex", String(idx));
  } catch (e) {}
  coverEl.onload = () => {
    try {
      if (window.ColorThief) {
        colorThief = colorThief || new ColorThief();
        const rgb = colorThief.getColor(coverEl);
        if (rgb)
          document.documentElement.style.setProperty(
            "--accent",
            `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
          );
      }
    } catch (e) {}
    tryInitVisualizer();
  };
  document
    .querySelectorAll("#playlist li")
    .forEach((li, i) => li.classList.toggle("bg-gray-800/30", i === idx));
}

function renderPlaylist() {
  playlistEl.innerHTML = "";
  tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/30 cursor-pointer";
    li.innerHTML = `<img src="${encodeURI(t.cover)}" class="w-12 h-12 rounded-md object-cover" /><div class="flex-1"><div class="font-medium">${t.title}</div></div><div class="text-sm text-gray-400">${i + 1}</div>`;
    li.addEventListener("click", () => crossfadeTo(i));
    playlistEl.appendChild(li);
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
    canvasCtx.fillStyle = "rgba(0,0,0,0.06)";
    canvasCtx.fillRect(0, 0, w, h);
    const barWidth = Math.max(2, (w / bufferLength) * 1.5);
    let x = 0;
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent") ||
      "#10b981";
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 255;
      const y = v * h;
      const grad = canvasCtx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, accent.trim());
      grad.addColorStop(1, "rgba(255,255,255,0.04)");
      canvasCtx.fillStyle = grad;
      canvasCtx.fillRect(x, h - y, barWidth, y);
      x += barWidth + 1;
    }
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
});
audio.addEventListener("pause", () => {
  isPlaying = false;
  playIcon.classList.remove("fa-pause");
  playIcon.classList.add("fa-play");
  coverEl.classList.remove("playing-rotate");
  if (coverContainer) coverContainer.classList.remove("cover-active");
});
audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
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
document
  .querySelectorAll("#playlist li")
  .forEach((li, i) =>
    li.classList.toggle("bg-gray-800/30", i === currentIndex),
  );
[playBtn, prevBtn, nextBtn, shuffleBtn, repeatBtn].forEach(
  (b) => b && b.setAttribute("tabindex", "0"),
);

// End of app.js
