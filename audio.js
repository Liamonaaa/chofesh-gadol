// YouTube background audio: F4K4IMcFY3I starting at 1:20
const VIDEO_ID = "F4K4IMcFY3I";
const START_SEC = 80;
const VOL_KEY = "chofesh-vol";

const panel = document.getElementById("audioPanel");
const muteBtn = document.getElementById("apMute");
const volSlider = document.getElementById("apVolume");

let player = null;
let ready = false;
let volume = parseInt(localStorage.getItem(VOL_KEY) ?? "55", 10);
let unmuted = false; // start muted to satisfy autoplay; user clicks to enable sound

if (volSlider) volSlider.value = volume;
if (panel) panel.dataset.muted = "true";

(function loadYT() {
  if (window.YT && window.YT.Player) { initPlayer(); return; }
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
})();

window.onYouTubeIframeAPIReady = initPlayer;

function initPlayer() {
  if (!window.YT || !window.YT.Player) return;
  if (player || !document.getElementById("ytPlayer")) return;
  player = new YT.Player("ytPlayer", {
    videoId: VIDEO_ID,
    playerVars: {
      autoplay: 1,
      mute: 1,
      controls: 0,
      start: START_SEC,
      playsinline: 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      disablekb: 1,
      fs: 0,
    },
    events: {
      onReady: () => {
        ready = true;
        try {
          player.setVolume(volume);
          player.mute();
          player.seekTo(START_SEC, true);
          player.playVideo();
        } catch {}
        applyState();
      },
      onStateChange: e => {
        // Loop back to 1:20 when video ends
        if (e.data === YT.PlayerState.ENDED) {
          try { player.seekTo(START_SEC, true); player.playVideo(); } catch {}
        }
      }
    }
  });
}

function isPlayerMuted() {
  return !player || (player.isMuted && player.isMuted());
}

function applyState() {
  if (!player || !ready) return;
  try {
    player.setVolume(volume);
    if (unmuted) player.unMute();
    else player.mute();
  } catch {}
  if (panel) panel.dataset.muted = unmuted ? "false" : "true";
}

muteBtn?.addEventListener("click", () => {
  unmuted = !unmuted;
  applyState();
  // Make sure playback is going (autoplay may have paused on some browsers).
  if (player && ready) {
    try { player.playVideo(); } catch {}
  }
});

volSlider?.addEventListener("input", () => {
  volume = parseInt(volSlider.value, 10);
  localStorage.setItem(VOL_KEY, String(volume));
  if (player && ready) { try { player.setVolume(volume); } catch {} }
  if (volume === 0 && unmuted) { unmuted = false; applyState(); }
});
