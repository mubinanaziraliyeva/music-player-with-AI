// Muzik player uchun JavaScript
// JS kodi oson tushunarli va izohlar bilan yozildi (O'zbek tilida izohlar)

// Playlist ma'lumotlari: mahalliy Music/ va Cover/ papkalaridagi fayllar
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
  {
    title: "For You",
    file: "Music/For You.mp3",
    cover: "Cover/For you.jpg",
  },
  {
    title: "Neoni - Darkside",
    file: "Music/Neoni - Darkside.mp3",
    cover: "Cover/Neoni - Darkside.jpg",
  },
  {
    title: "Tattoo",
    file: "Music/Tattoo.mp3",
    cover: "Cover/Tattoo.jpg",
  },
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

// DOM elementlar
const audio = new Audio();
audio.preload = "metadata";

// Web Audio API setup for gain (fade) and analyser (visualizer)
let audioCtx = null;
let trackSource = null;
let gainNode = null;
let analyser = null;
let dataArray = null;
let bufferLength = 0;

function ensureAudioContext(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    trackSource = audioCtx.createMediaElementSource(audio);
    gainNode = audioCtx.createGain();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    // Connect nodes: source -> gain -> analyser -> destination
    trackSource.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
}
const artistEl = document.getElementById("artist");
const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("playIcon");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
let colorThief = null;
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const volumeEl = document.getElementById("volume");
const playlistEl = document.getElementById("playlist");
const volToggle = document.getElementById("volToggle");
const volMinus = document.getElementById("volMinus");
const volPlus = document.getElementById("volPlus");
  audio.src = encodeURI(t.file);
const coverContainer = document.getElementById("coverContainer");

// Audio obyekti
const audio = new Audio();
audio.preload = "metadata";
  // Update document title for SEO / tab
  document.title = `${parts.length>1 ? parts[0] + ' - ' : ''}${t.title}`;

  // Save last played track
  try{ localStorage.setItem('mp_lastIndex', index); }catch(e){}

  // Update accent color when cover loads (use ColorThief if available)
  coverEl.onload = () => {
    try{
      if(window.ColorThief){
        colorThief = colorThief || new ColorThief();
        // getColor may throw if image not loaded or cross-origin
        const rgb = colorThief.getColor(coverEl);
        if(rgb && rgb.length>=3){
          const css = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          document.documentElement.style.setProperty('--accent', css);
          // update play button background subtly
          playBtn.style.background = css;
          playBtn.style.color = '#000';
        }
      }
    }catch(e){/* ignore color extraction errors */}
  };

// Holat (state)
let currentIndex = 0;
let isPlaying = false;
  ensureAudioContext();
  if (audioCtx.state === 'suspended') { audioCtx.resume(); }
  if (!isPlaying) {
    audio.play();
  } else {
    audio.pause();
  }
  const m = Math.floor(seconds / 60) || 0;
  const s = Math.floor(seconds % 60) || 0;
  return `${m}:${s.toString().padStart(2, "0")}`;
  // crossfade to next
  let nextIndex;
  if (isShuffle) nextIndex = Math.floor(Math.random() * tracks.length);
  else nextIndex = (currentIndex + 1) % tracks.length;
  crossfadeTo(nextIndex);
  titleEl.textContent = t.title;
  // artist - oddiy qilib fayl nomidan ajratamiz (agar format 'Artist - Title' bo'lsa)
  const parts = t.title.split(" - ");
  artistEl.textContent = parts.length > 1 ? parts[0] : "Unknown Artist";
  coverEl.src = encodeURI(t.cover);

    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
    crossfadeTo(prev);
  });
}

// Play/Pause toggle
  // use gain node if available for smooth control
  if(gainNode){
    gainNode.gain.setValueAtTime(v, audioCtx.currentTime);
  } else {
    audio.volume = v;
  }
  try{ localStorage.setItem('mp_volume', v); }catch(e){}
  if (!isPlaying) {
    audio.play();
  } else {
function fadeTo(value, duration = 0.4){
  if(!gainNode || !audioCtx) return;
  const now = audioCtx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(value, now + duration);
}

function crossfadeTo(index){
  ensureAudioContext();
  if(!gainNode) { loadTrack(index); audio.play(); return; }
  // fade out current
  fadeTo(0.0001, 0.25);
  setTimeout(()=>{
    currentIndex = index;
    loadTrack(currentIndex);
    // ensure audio context resumed
    if(audioCtx.state === 'suspended') audioCtx.resume();
    // set initial tiny volume and play
    if(gainNode) gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    audio.play().then(()=>{
      // fade in to last saved volume or 0.8
      const vol = parseFloat(localStorage.getItem('mp_volume') || volumeEl.value || 0.8);
      fadeTo(vol, 0.4);
    }).catch(()=>{});
  }, 260);
}
    audio.pause();
  }
}

// Next track
function nextTrack() {
  if (isShuffle) {
    currentIndex = Math.floor(Math.random() * tracks.length);
  } else {
    currentIndex = (currentIndex + 1) % tracks.length;
  }
  loadTrack(currentIndex);
  audio.play();
}

// Previous track
      // crossfade to chosen
      crossfadeTo(i);
  } else {
    currentIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentIndex);
    audio.play();
  }
}

// Toggle shuffle
function toggleShuffle() {
  setVolume(parseFloat(e.target.value));
  shuffleBtn.classList.toggle("text-green-400", isShuffle);
}

// Toggle repeat
function toggleRepeat() {
  if (repeatMode === "off") {
    repeatMode = "all";
    repeatBtn.classList.add("text-green-400");
    repeatBtn.title = "Repeat: All";
  } else if (repeatMode === "all") {
  // ensure audio context active
  try{ ensureAudioContext(); if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }catch(e){}
    repeatMode = "one";
    repeatBtn.title = "Repeat: One";
  } else {
    repeatMode = "off";
    repeatBtn.classList.remove("text-green-400");
    repeatBtn.title = "Repeat: Off";
  }
}

// Progress update
function updateProgress() {
  if (audio.duration) {
    const percent = (audio.currentTime / audio.duration) * 100;
    progress.value = percent;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
  }
}

// Seek
function seekTo(value) {
  if (audio.duration) {
    const time = (value / 100) * audio.duration;
    audio.currentTime = time;
  }
}

// Volume
function setVolume(v) {
  audio.volume = v;
}

// Show volume UI briefly (used when +/- pressed)
let _volHideTimer = null;
function showVolumeTemporarily() {
  volumeWrap.classList.remove("hidden");
  clearTimeout(_volHideTimer);
  _volHideTimer = setTimeout(() => volumeWrap.classList.add("hidden"), 2000);
}


// Load saved volume/index from localStorage
try{
  const savedIndex = parseInt(localStorage.getItem('mp_lastIndex'));
  if(!isNaN(savedIndex) && savedIndex >=0 && savedIndex < tracks.length){ currentIndex = savedIndex; loadTrack(currentIndex); }
}catch(e){}
try{
  const savedV = parseFloat(localStorage.getItem('mp_volume'));
  if(!isNaN(savedV)){
    volumeEl.value = savedV;
  }
}catch(e){}
setVolume(parseFloat(volumeEl.value));

// Init visualizer if possible
tryInitVisualizer();

// Visualizer: Canvas drawing using analyser
const canvas = document.getElementById('visualizer');
let canvasCtx = null;
function initVisualizer(){
  if(!canvas) return;
  canvasCtx = canvas.getContext('2d');
  canvasCtx.clearRect(0,0,canvas.width, canvas.height);
  function draw(){
    requestAnimationFrame(draw);
    if(!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    const w = canvas.width;
    const h = canvas.height;
    canvasCtx.fillStyle = 'rgba(0,0,0,0.08)';
    canvasCtx.fillRect(0,0,w,h);
    const barWidth = (w / bufferLength) * 1.5;
    let x = 0;
    for(let i=0;i<bufferLength;i++){
      const v = dataArray[i] / 255;
      const y = v * h;
      // gradient using accent color
      const grad = canvasCtx.createLinearGradient(0,0,0,h);
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#10b981';
      grad.addColorStop(0, accent.trim());
      grad.addColorStop(1, 'rgba(255,255,255,0.04)');
      canvasCtx.fillStyle = grad;
      canvasCtx.fillRect(x, h - y, barWidth, y);
      x += barWidth + 1;
    }
  }
  draw();
}

// Kickstart visualizer when analyser exists
function tryInitVisualizer(){
  ensureAudioContext();
  if(analyser){
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    // set canvas width based on element computed width
    if(canvas){
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = 90;
      initVisualizer();
    }
  }
}
function renderPlaylist() {
  playlistEl.innerHTML = "";
  tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/30 cursor-pointer";
    li.innerHTML = `
      <img src="${encodeURI(t.cover)}" class="w-12 h-12 rounded-md object-cover" />
      <div class="flex-1">
        <div class="font-medium">${t.title}</div>
      </div>
      <div class="text-sm text-gray-400">${i + 1}</div>
    `;
    li.addEventListener("click", () => {
      currentIndex = i;
      loadTrack(currentIndex);
      audio.play();
    });
    playlistEl.appendChild(li);
  });
}

// DOM eventlar
playBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", nextTrack);
prevBtn.addEventListener("click", prevTrack);
shuffleBtn.addEventListener("click", toggleShuffle);
repeatBtn.addEventListener("click", toggleRepeat);

progress.addEventListener("input", (e) => {
  seekTo(e.target.value);
});
volumeEl.addEventListener("input", (e) => {
  setVolume(parseFloat(e.target.value));
});

// Volume toggle and +/- buttons behavior
if (volToggle) {
  volToggle.addEventListener("click", (ev) => {
    ev.stopPropagation();
    volumeWrap.classList.toggle("hidden");
  });
}
if (volMinus) {
  volMinus.addEventListener("click", () => {
    const v = Math.max(0, Math.round((audio.volume - 0.05) * 100) / 100);
    setVolume(v);
    volumeEl.value = v;
    showVolumeTemporarily();
  });
}
if (volPlus) {
  volPlus.addEventListener("click", () => {
    const v = Math.min(1, Math.round((audio.volume + 0.05) * 100) / 100);
    setVolume(v);
    volumeEl.value = v;
    showVolumeTemporarily();
  });
}

// Click outside will hide volume UI
document.addEventListener("click", (e) => {
  if (volumeWrap && volToggle) {
    if (!volumeWrap.contains(e.target) && !volToggle.contains(e.target)) {
      volumeWrap.classList.add("hidden");
    }
  }
});

// Audio eventlar
audio.addEventListener("play", () => {
  isPlaying = true;
  playIcon.classList.remove("fa-play");
  playIcon.classList.add("fa-pause");
  // cover rotation qo'shamiz
  coverEl.classList.add("playing-rotate");
  // enlarge & center cover while playing
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
  // Repeat behavior
  if (repeatMode === "one") {
    audio.currentTime = 0;
    audio.play();
    return;
  }
  if (isShuffle) {
    currentIndex = Math.floor(Math.random() * tracks.length);
    loadTrack(currentIndex);
    audio.play();
    return;
  }
  // normal next
  if (repeatMode === "all") {
    nextTrack();
  } else {
    // off
    if (currentIndex < tracks.length - 1) {
      nextTrack();
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }
});

// Boshlang'ich yuklash
renderPlaylist();
loadTrack(currentIndex);
setVolume(parseFloat(volumeEl.value));

// Ensure initial volume UI state is hidden
if (volumeWrap) {
  volumeWrap.classList.add("hidden");
}

// If audio was already playing due to autoplay, reflect UI
if (!audio.paused) {
  if (coverContainer) coverContainer.classList.add("cover-active");
}

// Accessibility: klaviatura qisqacha boshqaruvlar
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  }
  if (e.code === "ArrowRight") {
    nextTrack();
  }
  if (e.code === "ArrowLeft") {
    prevTrack();
  }
});

// Qo'shimcha: responsive HUD va kichik UX takomillashlari bo'lishi mumkin
