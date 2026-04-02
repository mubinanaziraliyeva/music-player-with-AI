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
];

// DOM elementlar
const coverEl = document.getElementById("cover");
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
const playlistEl = document.getElementById("playlist");
const volToggle = document.getElementById("volToggle");
const volMinus = document.getElementById("volMinus");
const volPlus = document.getElementById("volPlus");
const volumeWrap = document.getElementById("volumeWrap");
const coverContainer = document.getElementById("coverContainer");

// Audio obyekti
const audio = new Audio();
audio.preload = "metadata";

// Holat (state)
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = "off"; // off, one, all

// Yordamchi funksiyalar
function formatTime(seconds) {
  const m = Math.floor(seconds / 60) || 0;
  const s = Math.floor(seconds % 60) || 0;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Trackni yuklash
function loadTrack(index) {
  const t = tracks[index];
  // file pathlarni safe qilib encode qilish (agar fayl nomlarida bo'shliq bo'lsa)
  audio.src = encodeURI(t.file);
  titleEl.textContent = t.title;
  // artist - oddiy qilib fayl nomidan ajratamiz (agar format 'Artist - Title' bo'lsa)
  const parts = t.title.split(" - ");
  artistEl.textContent = parts.length > 1 ? parts[0] : "Unknown Artist";
  coverEl.src = encodeURI(t.cover);

  // playlistda current itemni ko'rsatish
  document.querySelectorAll("#playlist li").forEach((li, i) => {
    li.classList.toggle("bg-gray-800/30", i === index);
  });
}

// Play/Pause toggle
function togglePlay() {
  if (!isPlaying) {
    audio.play();
  } else {
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
function prevTrack() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
  } else {
    currentIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentIndex);
    audio.play();
  }
}

// Toggle shuffle
function toggleShuffle() {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle("text-green-400", isShuffle);
}

// Toggle repeat
function toggleRepeat() {
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

// Playlist rendering
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
