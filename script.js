/* VARIABLES */
const playlist = "channels.m3u";

let channels = [];
let filteredChannels = [];
let currentChannel = null;
let currentCategory = "All";
let searchKeyword = "";
let currentHls = null;
let controlsTimeout;

/* ON INITIALIZATION */
document.addEventListener("DOMContentLoaded", () => {
  setupPlayerSync();
  setupControlAutohide();
  setupFullscreenChange();
  setupCategoryScrolling();
  loadPlaylist();
});

/* DETECT NATIVE FULLSCREEN EXIT TO UNLOCK ORIENTATION */
function setupFullscreenChange() {
  const events = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];
  events.forEach(event => {
    document.addEventListener(event, () => {
      const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
      if (!isFullscreen) {
        unlockOrientation();
      }
    });
  });

  // Release orientation lock and exit fullscreen if the browser window is minimized or hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      exitFullscreenAndUnlock();
    }
  });

  window.addEventListener("blur", () => {
    exitFullscreenAndUnlock();
  });
}

function exitFullscreenAndUnlock() {
  unlockOrientation();
  if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

/* SYNC VIDEO STATE WITH PLAY/PAUSE BUTTON */
function setupPlayerSync() {
  const video = document.getElementById("video");
  const playPauseBtn = document.querySelector(".play-pause-btn");

  video.addEventListener("play", () => {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  });

  video.addEventListener("pause", () => {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  });
  
  video.addEventListener("ended", () => {
    nextChannel();
  });
}

/* AUTO-HIDE PLAYER CONTROLS */
function setupControlAutohide() {
  const playerWrapper = document.querySelector(".player-wrapper");
  const controls = document.getElementById("customControls");

  function showControls() {
    controls.classList.add("visible");
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      controls.classList.remove("visible");
    }, 5000); // 5 seconds
  }

  playerWrapper.addEventListener("mousemove", showControls);
  playerWrapper.addEventListener("click", showControls);
  playerWrapper.addEventListener("touchstart", showControls);
}

/* LOAD M3U PLAYLIST */
function loadPlaylist() {
  const loader = document.getElementById("playerLoader");
  loader.classList.remove("hidden");
  loader.querySelector("span").innerText = "Loading playlist...";

  fetch(playlist)
    .then((response) => response.text())
    .then((data) => {
      const lines = data.split("\n");
      channels = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXTINF")) {
          const info = line;

          // Find the next non-empty line that doesn't start with '#'
          let url = "";
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            if (nextLine && !nextLine.startsWith("#")) {
              url = nextLine;
              break;
            }
          }

          if (!url) continue;

          // Extract name (part after the last comma)
          const nameParts = info.split(",");
          const name = nameParts[nameParts.length - 1].trim() || "Unknown Channel";

          let logo = "";
          const logoMatch = info.match(/tvg-logo="([^"]*)"/);
          if (logoMatch) {
            logo = logoMatch[1].trim();
          }

          let category = "Other";
          const groupMatch = info.match(/group-title="([^"]*)"/);
          if (groupMatch) {
            category = groupMatch[1].trim();
          }

          channels.push({
            name,
            url,
            logo,
            category
          });
        }
      }

      loader.classList.add("hidden");
      renderCategories();
      filterAndSearch();

      if (filteredChannels.length > 0) {
        playChannel(0);
      }
    })
    .catch(err => {
      console.error("Failed to load playlist", err);
      loader.querySelector("span").innerText = "Failed to load playlist ⚠️";
    });
}

/* RENDER CATEGORY FILTER PILLS */
function renderCategories() {
  const container = document.getElementById("categoryList");
  container.innerHTML = `<button class="category-pill active" data-category="All" onclick="filterCategory('All', this)">All Channels</button>`;

  // Extract unique categories
  const categories = [...new Set(channels.map(ch => ch.category))].filter(Boolean);

  // Sort: Bangla first, news/sports next, rest alphabetical
  categories.sort((a, b) => {
    const primaryCats = ["bangla", "sports", "news"];
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    const aIndex = primaryCats.indexOf(aLower);
    const bIndex = primaryCats.indexOf(bLower);
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    return a.localeCompare(b);
  });

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "category-pill";
    btn.innerText = cat;
    btn.dataset.category = cat;
    btn.onclick = (e) => filterCategory(cat, e.target);
    container.appendChild(btn);
  });

  // Trigger scroll button state update after loading elements
  const categoriesContainer = document.getElementById("categoriesContainer");
  if (categoriesContainer) {
    categoriesContainer.dispatchEvent(new Event("scroll"));
  }
}

/* FILTER BY CATEGORY */
function filterCategory(category, buttonEl) {
  currentCategory = category;

  document.querySelectorAll(".category-pill").forEach(pill => {
    pill.classList.remove("active");
  });

  if (buttonEl) {
    buttonEl.classList.add("active");
    buttonEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  } else {
    const target = document.querySelector(`.category-pill[data-category="${category}"]`);
    if (target) {
      target.classList.add("active");
      target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }

  filterAndSearch();
}

/* FILTER AND SEARCH CHANNELS */
function filterAndSearch() {
  filteredChannels = channels.filter(ch => {
    const matchesCategory = currentCategory === "All" || ch.category === currentCategory;
    const matchesSearch = ch.name.toLowerCase().includes(searchKeyword);
    return matchesCategory && matchesSearch;
  });

  renderChannels();

  const noResults = document.getElementById("noResults");
  if (filteredChannels.length === 0) {
    noResults.classList.remove("hidden");
  } else {
    noResults.classList.add("hidden");
  }
}

/* RENDER CHANNELS IN GRID */
function renderChannels() {
  const grid = document.getElementById("channelGrid");
  grid.innerHTML = "";

  filteredChannels.forEach((ch, index) => {
    const div = document.createElement("div");
    const isActive = currentChannel && currentChannel.url === ch.url;
    div.className = `channel ${isActive ? "active" : ""}`;
    div.dataset.index = index;

    const fallbackGradient = getFallbackGradient(ch.name);
    const initials = getInitials(ch.name);

    div.innerHTML = `
      <div class="channel-card-fallback" style="display: ${ch.logo ? "none" : "flex"}">
        <div class="channel-card-fallback-avatar" style="background: ${fallbackGradient}">${initials}</div>
        <div class="channel-card-fallback-name">${ch.name}</div>
      </div>
      ${ch.logo ? `<img src="${ch.logo}" alt="${ch.name}" onerror="handleCardLogoError(this, '${ch.name}')">` : ""}
    `;

    div.onclick = () => playChannel(index);
    grid.appendChild(div);
  });
}

/* PLAY CHANNEL STREAM */
function playChannel(index) {
  if (index < 0 || index >= filteredChannels.length) return;

  const video = document.getElementById("video");
  const loader = document.getElementById("playerLoader");
  const channel = filteredChannels[index];
  currentChannel = channel;

  // Show loader overlay
  loader.classList.remove("hidden");
  loader.querySelector("span").innerText = "Buffering stream...";

  // Destroy existing HLS instance
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }

  if (Hls.isSupported()) {
    currentHls = new Hls({
      maxMaxBufferLength: 10,
      enableWorker: true
    });
    currentHls.loadSource(channel.url);
    currentHls.attachMedia(video);

    currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(err => console.log("Autoplay blocked:", err));
    });

    currentHls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.warn("HLS fatal error, recovering...", data);
        loader.querySelector("span").innerText = "Re-connecting stream...";
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            currentHls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            currentHls.recoverMediaError();
            break;
          default:
            loader.querySelector("span").innerText = "Stream unavailable ⚠️";
            break;
        }
      }
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = channel.url;
    video.addEventListener("loadedmetadata", () => {
      video.play().catch(err => console.log("Autoplay blocked:", err));
    });
  } else {
    loader.querySelector("span").innerText = "HLS stream format not supported";
    return;
  }

  // Hook playing events to handle loaders
  video.onplaying = () => {
    loader.classList.add("hidden");
  };

  video.onwaiting = () => {
    loader.querySelector("span").innerText = "Buffering stream...";
    loader.classList.remove("hidden");
  };

  // Update active style in list
  document.querySelectorAll(".channel").forEach((el, idx) => {
    if (parseInt(el.dataset.index) === index) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });

  updateCurrentInfoCard(channel);
}

/* UPDATE PLAYER DETAILS INFO CARD */
function updateCurrentInfoCard(channel) {
  const title = document.getElementById("currentChannelTitle");
  const category = document.getElementById("currentChannelCategory");
  const logo = document.getElementById("currentChannelLogo");
  const fallback = document.getElementById("currentChannelFallback");

  title.innerText = channel.name;
  category.innerText = channel.category;

  if (channel.logo) {
    logo.src = channel.logo;
    logo.classList.remove("hidden");
    fallback.classList.add("hidden");
  } else {
    logo.classList.add("hidden");
    fallback.innerText = getInitials(channel.name);
    fallback.style.background = getFallbackGradient(channel.name);
    fallback.classList.remove("hidden");
  }
}

/* PLAY NEXT CHANNEL IN ACTIVE LIST */
function nextChannel() {
  if (filteredChannels.length === 0) return;

  let index = filteredChannels.findIndex(ch => currentChannel && ch.url === currentChannel.url);
  index++;
  if (index >= filteredChannels.length) {
    index = 0;
  }
  playChannel(index);
}

/* PLAY PREVIOUS CHANNEL IN ACTIVE LIST */
function prevChannel() {
  if (filteredChannels.length === 0) return;

  let index = filteredChannels.findIndex(ch => currentChannel && ch.url === currentChannel.url);
  index--;
  if (index < 0) {
    index = filteredChannels.length - 1;
  }
  playChannel(index);
}

/* PLAY / PAUSE TOGGLE */
function togglePlay() {
  const video = document.getElementById("video");
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

/* SEARCH HANDLERS */
function searchChannels() {
  const input = document.getElementById("search");
  searchKeyword = input.value.toLowerCase();

  const clearBtn = document.getElementById("clearSearch");
  if (searchKeyword.length > 0) {
    clearBtn.style.display = "flex";
  } else {
    clearBtn.style.display = "none";
  }

  filterAndSearch();
}

function clearSearchInput() {
  const input = document.getElementById("search");
  input.value = "";
  searchKeyword = "";
  document.getElementById("clearSearch").style.display = "none";
  filterAndSearch();
}

/* ERROR HANDLERS FOR LOGOS */
function handleCardLogoError(img, name) {
  const fallbackHtml = `
    <div class="channel-card-fallback" style="display: flex">
      <div class="channel-card-fallback-avatar" style="background: ${getFallbackGradient(name)}">${getInitials(name)}</div>
      <div class="channel-card-fallback-name">${name}</div>
    </div>
  `;
  const parent = img.parentElement;
  if (parent) {
    parent.innerHTML = fallbackHtml;
  }
}

function handleCurrentLogoError() {
  const logo = document.getElementById("currentChannelLogo");
  const fallback = document.getElementById("currentChannelFallback");
  if (currentChannel) {
    logo.classList.add("hidden");
    fallback.innerText = getInitials(currentChannel.name);
    fallback.style.background = getFallbackGradient(currentChannel.name);
    fallback.classList.remove("hidden");
  }
}

/* AVATAR AND GRADIENT GENERATORS FOR FALLBACKS */
function getInitials(name) {
  if (!name) return "📺";
  const cleanName = name.replace(/[^\w\s]/gi, "").trim();
  const parts = cleanName.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase().substring(0, 2);
  }
  return cleanName.substring(0, 2).toUpperCase() || "📺";
}

function getFallbackGradient(name) {
  const gradients = [
    "linear-gradient(135deg, #ff007f 0%, #7928ca 100%)", // Pink -> Purple
    "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", // Cyan -> Blue
    "linear-gradient(135deg, #00ff87 0%, #60efff 100%)", // Neon Green -> Light Cyan
    "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)", // Red -> Pink
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", // Pink -> Yellow
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", // Green -> Mint
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"  // Blue -> Purple
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

/* TOGGLE FULLSCREEN WITH MULTI-DEVICE & AUTO-LANDSCAPE SUPPORT */
function toggleFullscreen() {
  const video = document.getElementById("video");
  const playerWrapper = document.querySelector(".player-wrapper");
  
  if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
    // Enter Fullscreen
    if (playerWrapper.requestFullscreen) {
      playerWrapper.requestFullscreen()
        .then(() => {
          lockOrientation();
        })
        .catch(err => {
          console.error("Error entering fullscreen:", err);
        });
    } else if (playerWrapper.webkitRequestFullscreen) { /* Chrome/Safari on Desktop/Android */
      playerWrapper.webkitRequestFullscreen();
      setTimeout(lockOrientation, 150);
    } else if (playerWrapper.msRequestFullscreen) { /* IE/Edge */
      playerWrapper.msRequestFullscreen();
      setTimeout(lockOrientation, 150);
    } else if (video.webkitEnterFullscreen) { /* iOS (iPhone) Support */
      // iOS webkitEnterFullscreen natively takes over screen and handles auto-rotation
      video.webkitEnterFullscreen();
    } else {
      alert("Fullscreen is not supported on this browser or device.");
    }
  } else {
    // Exit Fullscreen
    unlockOrientation();
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

/* LOCK ORIENTATION TO LANDSCAPE */
function lockOrientation() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape")
      .catch(err => {
        console.log("Landscape lock failed or not supported on this device:", err);
      });
  } else if (screen.lockOrientation) {
    screen.lockOrientation("landscape");
  } else if (screen.webkitLockOrientation) {
    screen.webkitLockOrientation("landscape");
  } else if (screen.mozLockOrientation) {
    screen.mozLockOrientation("landscape");
  } else if (screen.msLockOrientation) {
    screen.msLockOrientation("landscape");
  }
}

/* UNLOCK ORIENTATION */
function unlockOrientation() {
  if (screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock();
  } else if (screen.unlockOrientation) {
    screen.unlockOrientation();
  } else if (screen.webkitUnlockOrientation) {
    screen.webkitUnlockOrientation();
  } else if (screen.mozUnlockOrientation) {
    screen.mozUnlockOrientation();
  } else if (screen.msUnlockOrientation) {
    screen.msUnlockOrientation();
  }
}

/* HORIZONTAL CATEGORY SCROLL INDICATORS & SMOOTH BUTTON NAVIGATION */
function setupCategoryScrolling() {
  const container = document.getElementById("categoriesContainer");
  const leftBtn = document.getElementById("scrollLeftBtn");
  const rightBtn = document.getElementById("scrollRightBtn");
  const wrapper = document.querySelector(".categories-wrapper");
  
  if (!container || !leftBtn || !rightBtn || !wrapper) return;
  
  function updateScrollButtons() {
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    // Toggle Left Indicator
    if (scrollLeft <= 5) {
      leftBtn.classList.add("hidden");
      wrapper.classList.remove("scrolled-left");
    } else {
      leftBtn.classList.remove("hidden");
      wrapper.classList.add("scrolled-left");
    }
    
    // Toggle Right Indicator
    if (scrollLeft + clientWidth >= scrollWidth - 5) {
      rightBtn.classList.add("hidden");
      wrapper.classList.add("scrolled-right");
    } else {
      rightBtn.classList.remove("hidden");
      wrapper.classList.remove("scrolled-right");
    }
  }
  
  container.addEventListener("scroll", updateScrollButtons);
  window.addEventListener("resize", updateScrollButtons);
  
  // Set initial state after rendering categories (using timeout to allow rendering)
  setTimeout(updateScrollButtons, 500);
}

function scrollCategories(direction) {
  const container = document.getElementById("categoriesContainer");
  if (!container) return;
  
  const scrollAmount = 200;
  if (direction === "left") {
    container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  } else {
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }
}
