/* VARIABLES */

// const playlistOnline = "channels.m3u";
const playlistOnline = "https://raw.githubusercontent.com/Shariar-Ahamed/online-tv-streaming-platform/main/channels.m3u";
const playlistLocal = "channels.m3u";

let channels = [];
let filteredChannels = [];
let currentChannel = null;
let currentCategory = "All";
let favorites = [];
try {
  const saved = localStorage.getItem("alpha_tv_favorites");
  if (saved) {
    favorites = JSON.parse(saved);
  }
} catch(e) {
  console.warn("Could not load favorites from localStorage:", e);
}
let searchKeyword = "";
let currentHls = null;
let hlsInitInterval = null;
let controlsTimeout;

/* ON INITIALIZATION */
document.addEventListener("DOMContentLoaded", () => {
  setupPlayerSync();
  setupControlAutohide();
  setupFullscreenChange();
  setupCategoryScrolling();
  loadPlaylist();
  setupLiveStats();
  setupOrientationExitFullscreen();
  setupExternalLinks();
  setupBackToTop();
  setupFooterFeatures();
  setupViewModeToggle();
  setupMobileAppBanner();
  checkForUpdates();
  checkDisclaimer();
  setupPictureInPicture();
  setupVolumeControl();
});

/* DETECT NATIVE FULLSCREEN EXIT TO UNLOCK ORIENTATION & HANDLE BACK BUTTON */
function setupFullscreenChange() {
  const events = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];
  events.forEach(event => {
    document.addEventListener(event, () => {
      const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
      if (isFullscreen) {
        // Push state to history for back button handling if not already pushed
        if (!history.state || !history.state.fullscreen) {
          history.pushState({ fullscreen: true }, "");
        }
      } else {
        unlockOrientation();
        // If we exited manually (e.g. exit button), go back in history to clean up
        if (history.state && history.state.fullscreen) {
          history.back();
        }
      }
    });
  });

  // Listen to browser/hardware back button popstate
  window.addEventListener("popstate", (event) => {
    const isFullscreen = document.fullscreenElement || 
                         document.webkitFullscreenElement || 
                         document.mozFullScreenElement || 
                         document.msFullscreenElement;
    if (isFullscreen) {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  });
}

/* EXIT FULLSCREEN ON PORTRAIT ROTATION */
function setupOrientationExitFullscreen() {
  window.addEventListener("resize", () => {
    if (window.innerHeight > window.innerWidth) {
      const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
      if (isFullscreen) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }
  });
}

/* OPEN EXTERNAL LINKS IN IN-APP BROWSER OVERLAY */
function setupExternalLinks() {
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest("a.social-btn, a.developer-name");
    if (anchor) {
      const url = anchor.getAttribute("href");
      if (url && url.startsWith("http")) {
        e.preventDefault();
        openExternalUrl(url);
      }
    }
  });
}

function openExternalUrl(url) {
  const cap = window.Capacitor;
  if (cap && cap.Plugins && cap.Plugins.Browser) {
    cap.Plugins.Browser.open({ url: url })
      .catch(err => {
        console.error("Failed to open URL in browser plugin, falling back...", err);
        window.open(url, "_blank");
      });
  } else {
    window.open(url, "_blank");
  }
}

/* SYNC VIDEO STATE WITH PLAY/PAUSE BUTTON */
function setupPlayerSync() {
  const video = document.getElementById("video");
  const playPauseBtn = document.querySelector(".play-pause-btn");

  if (!video || !playPauseBtn) return;

  video.addEventListener("play", () => {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    if (window.AndroidPiP) {
      window.AndroidPiP.setVideoPlaying(true);
    }
  });

  video.addEventListener("pause", () => {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (window.AndroidPiP) {
      window.AndroidPiP.setVideoPlaying(false);
    }
  });
  
  video.addEventListener("ended", () => {
    if (window.AndroidPiP) {
      window.AndroidPiP.setVideoPlaying(false);
    }
    nextChannel();
  });
}

/* VOLUME & MUTE CONTROL LOGIC */
function setupVolumeControl() {
  const video = document.getElementById("video");
  if (!video) return;
  const isMutedSaved = localStorage.getItem("alpha_tv_muted") === "true";
  video.muted = isMutedSaved;
  updateVolumeButtonState(isMutedSaved);

  video.addEventListener("volumechange", () => {
    updateVolumeButtonState(video.muted);
  });
}

function toggleMute() {
  const video = document.getElementById("video");
  if (!video) return;
  video.muted = !video.muted;
  localStorage.setItem("alpha_tv_muted", video.muted);
}

function updateVolumeButtonState(isMuted) {
  const volumeBtn = document.getElementById("volumeBtn");
  if (!volumeBtn) return;
  const icon = volumeBtn.querySelector("i");
  if (icon) {
    if (isMuted) {
      icon.className = "fa-solid fa-volume-xmark";
      volumeBtn.title = "Unmute";
    } else {
      icon.className = "fa-solid fa-volume-high";
      volumeBtn.title = "Mute";
    }
  }
}

/* AUTO-HIDE PLAYER CONTROLS */
function setupControlAutohide() {
  const playerWrapper = document.querySelector(".player-wrapper");
  const controls = document.getElementById("customControls");

  if (!playerWrapper || !controls) return;

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

/* PARSE M3U PLAYLIST DATA */
function parseM3U(data) {
  const lines = data.split("\n");
  const parsedChannels = [];

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

      let categories = ["Other"];
      const groupMatch = info.match(/group-title="([^"]*)"/);
      if (groupMatch) {
        categories = groupMatch[1].split(",").map(c => c.trim()).filter(Boolean);
        if (categories.length === 0) {
          categories = ["Other"];
        }
      }

      parsedChannels.push({
        name,
        url,
        logo,
        categories
      });
    }
  }
  return parsedChannels;
}

/* LOAD M3U PLAYLIST (Instant local load, background online update) */
function loadPlaylist() {
  const loader = document.getElementById("playerLoader");
  if (!loader) return;
  loader.classList.remove("hidden");
  loader.querySelector("span").innerText = "Loading playlist...";

  // 1. Fetch the bundled local playlist immediately (instant, offline-capable)
  fetch(playlistLocal)
    .then(response => {
      if (!response.ok) throw new Error("Local playlist response error");
      return response.text();
    })
    .then(localData => {
      const parsedLocal = parseM3U(localData);
      if (parsedLocal.length > 0) {
        channels = parsedLocal;
        loader.classList.add("hidden");
        renderCategories();
        filterAndSearch();

        // Start playing the default channel
        if (filteredChannels.length > 0) {
          const defaultIndex = filteredChannels.findIndex(c => c.name.toLowerCase().includes("channel i"));
          playChannel(defaultIndex !== -1 ? defaultIndex : 0);
        }
      }
      // 2. Fetch remote online playlist in the background
      fetchOnlinePlaylistInBackground();
    })
    .catch(err => {
      console.warn("Failed to load local playlist first, attempting online fetch directly:", err);
      // Fallback: try online playlist directly if local fails
      fetch(`${playlistOnline}?t=${new Date().getTime()}`)
        .then(response => {
          if (!response.ok) throw new Error("Online playlist response error");
          return response.text();
        })
        .then(onlineData => {
          const parsedOnline = parseM3U(onlineData);
          if (parsedOnline.length > 0) {
            channels = parsedOnline;
          }
          loader.classList.add("hidden");
          renderCategories();
          filterAndSearch();
          if (filteredChannels.length > 0) {
            const defaultIndex = filteredChannels.findIndex(c => c.name.toLowerCase().includes("channel i"));
            playChannel(defaultIndex !== -1 ? defaultIndex : 0);
          }
        })
        .catch(finalErr => {
          console.error("Failed to load playlist entirely", finalErr);
          loader.querySelector("span").innerText = "Failed to load playlist ⚠️";
        });
    });
}

/* FETCH REMOTE PLAYLIST IN BACKGROUND AND SILENTLY UPDATE UI */
function fetchOnlinePlaylistInBackground() {
  fetch(`${playlistOnline}?t=${new Date().getTime()}`)
    .then(response => {
      if (!response.ok) throw new Error("Background online playlist fetch failed");
      return response.text();
    })
    .then(onlineData => {
      const parsedOnline = parseM3U(onlineData);
      if (parsedOnline.length === 0) return;

      // Compare online playlist length and entries to detect differences
      const isDifferent = channels.length !== parsedOnline.length ||
                          channels.some((c, idx) => !parsedOnline[idx] || c.url !== parsedOnline[idx].url || c.name !== parsedOnline[idx].name);

      if (isDifferent) {
        console.log("Online playlist updates detected. Updating channels list in background.");
        channels = parsedOnline;

        // Re-render categories list and channels grid
        renderCategories();
        filterAndSearch();
      } else {
        console.log("Background check complete. Playlist is up-to-date.");
      }
    })
    .catch(err => {
      console.warn("Background online playlist fetch failed:", err);
    });
}

/* RENDER CATEGORY FILTER PILLS */
function renderCategories() {
  const container = document.getElementById("categoryList");
  
  // Extract unique categories and count channels in each
  const categoryCounts = {};
  channels.forEach(ch => {
    if (ch.categories) {
      ch.categories.forEach(cat => {
        if (cat) {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      });
    }
  });

  const allCount = channels.length;
  container.innerHTML = `
    <button class="category-pill" data-category="Favorites" onclick="filterCategory('Favorites', this)">
      <i class="fa-solid fa-star" style="color: #ffcc00; font-size: 10px; margin-right: 4px;"></i> Favorites <span class="category-count" id="favoritesCategoryCount">${favorites.length}</span>
    </button>
    <button class="category-pill active" data-category="All" onclick="filterCategory('All', this)">All Channels <span class="category-count">${allCount}</span></button>
  `;

  const categories = Object.keys(categoryCounts);

  // Sort categories by user defined custom order
  categories.sort((a, b) => {
    const customOrder = [
      "fifa 2026",
      "sports",
      "bangla",
      "news",
      "kids",
      "indian bangla",
      "entertainment",
      "movies",
      "english",
      "religious",
      "hindi",
      "infotainment",
      "musics",
      "drama",
      "weather",
      "other"
    ];
    const aIndex = customOrder.indexOf(a.toLowerCase().trim());
    const bIndex = customOrder.indexOf(b.toLowerCase().trim());
    
    const aVal = aIndex !== -1 ? aIndex : 999;
    const bVal = bIndex !== -1 ? bIndex : 999;
    
    if (aVal !== bVal) {
      return aVal - bVal;
    }
    return a.localeCompare(b);
  });

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "category-pill";
    btn.innerHTML = `${cat} <span class="category-count">${categoryCounts[cat]}</span>`;
    btn.dataset.category = cat;
    btn.onclick = () => filterCategory(cat, btn);
    container.appendChild(btn);
  });

  // Trigger scroll button state update after loading elements
  const categoriesContainer = document.getElementById("categoriesContainer");
  if (categoriesContainer) {
    categoriesContainer.dispatchEvent(new Event("scroll"));
  }
}

function updateFavoritesCount() {
  const countSpan = document.getElementById("favoritesCategoryCount");
  if (countSpan) {
    countSpan.innerText = favorites.length;
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
    let matchesCategory = false;
    if (currentCategory === "All") {
      matchesCategory = true;
    } else if (currentCategory === "Favorites") {
      matchesCategory = favorites.includes(ch.url);
    } else {
      matchesCategory = ch.categories && ch.categories.includes(currentCategory);
    }
    const matchesSearch = ch.name.toLowerCase().includes(searchKeyword);
    return matchesCategory && matchesSearch;
  });

  renderChannels();

  const noResults = document.getElementById("noResults");
  if (filteredChannels.length === 0) {
    if (currentCategory === "Favorites") {
      noResults.innerHTML = `
        <span class="empty-icon" style="color: #ffcc00; font-size: 2.2rem; filter: drop-shadow(0 0 10px rgba(255, 204, 0, 0.45)); animation: starPulse 0.3s ease-in-out;"><i class="fa-regular fa-star"></i></span>
        <p>No favorite channels added yet. Click the star icon on any channel card to add it here.</p>
      `;
    } else {
      noResults.innerHTML = `
        <span>📺</span>
        <p>No channels found matching your search</p>
      `;
    }
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
    const isFav = favorites.includes(ch.url);

    div.innerHTML = `
      <button class="fav-btn ${isFav ? "is-favorite" : ""}" onclick="toggleFavorite(event, '${ch.url}')">
        <i class="fa-${isFav ? "solid" : "regular"} fa-star"></i>
      </button>
      <div class="channel-card-fallback" style="display: ${ch.logo ? "none" : "flex"}">
        <div class="channel-card-fallback-avatar" style="background: ${fallbackGradient}">${initials}</div>
        <div class="channel-card-fallback-name">${ch.name}</div>
      </div>
      ${ch.logo ? `<img src="${ch.logo}" alt="${ch.name}" loading="lazy" onerror="handleCardLogoError(this, '${ch.name}')">` : ""}
    `;

    div.onclick = () => playChannel(index);
    grid.appendChild(div);
  });
}

function toggleFavorite(event, url) {
  event.stopPropagation(); // Prevent playing channel on bookmark tap
  
  const index = favorites.indexOf(url);
  if (index === -1) {
    favorites.push(url);
  } else {
    favorites.splice(index, 1);
  }
  
  localStorage.setItem("alpha_tv_favorites", JSON.stringify(favorites));
  updateFavoritesCount();
  filterAndSearch();
}

/* SHOW BROWSER-ONLY HTTP INSECURE CONTENT WARNING MODAL */
function showHttpWarning() {
  // Hide loading overlays
  const loader = document.getElementById("playerLoader");
  if (loader) loader.classList.add("hidden");

  // Open warning modal
  const modal = document.getElementById("warningModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // Disable body scroll
  }
}

/* CLOSE WARNING MODAL */
function closeWarningModal() {
  const modal = document.getElementById("warningModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; // Restore body scroll
  }
}

/* RESET PLAYER LOADER TO NORMAL BUFFERING STATE */
function resetPlayerLoader() {
  const loader = document.getElementById("playerLoader");
  const spinner = loader.querySelector(".spinner");
  const span = loader.querySelector("span");

  if (spinner) spinner.classList.remove("hidden");
  if (span) {
    span.classList.remove("hidden");
    span.innerText = "Buffering stream...";
  }
}

/* PLAY CHANNEL STREAM */
function playChannel(index) {
  if (index < 0 || index >= filteredChannels.length) return;

  // Clear any pending HLS loading intervals
  if (hlsInitInterval) {
    clearInterval(hlsInitInterval);
    hlsInitInterval = null;
  }

  const video = document.getElementById("video");
  const loader = document.getElementById("playerLoader");
  const channel = filteredChannels[index];
  currentChannel = channel;

  // Reset loader & error state
  resetPlayerLoader();
  video.onerror = null;

  // Show loader overlay
  loader.classList.remove("hidden");

  // Destroy existing HLS instance
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }

  if (typeof Hls !== "undefined" && Hls.isSupported()) {
    currentHls = new Hls({
      maxMaxBufferLength: 10,
      enableWorker: true
    });
    currentHls.loadSource(channel.url);
    currentHls.attachMedia(video);

    currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(err => {
        console.log("Autoplay blocked:", err);
        loader.querySelector("span").innerHTML = 'Stream paused. Click Play to watch!<br><span class="paused-play-icon" onclick="togglePlay()">▶</span>';
        const spinner = loader.querySelector(".spinner");
        if (spinner) spinner.classList.add("hidden");
      });
    });

    currentHls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.warn("HLS fatal error, recovering...", data);

        // Check if browser-only HTTP stream mixed content block
        const isHttpsPage = window.location.protocol === 'https:';
        const isHttpStream = channel.url.startsWith('http://');
        const isBrowser = !window.Capacitor;

        if (isBrowser && isHttpsPage && isHttpStream && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          showHttpWarning();
          return;
        }

        loader.querySelector("span").innerText = "Re-connecting stream...";
        const spinner = loader.querySelector(".spinner");
        if (spinner) spinner.classList.remove("hidden");
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

    // Listen to native errors for Safari mixed-content blocks
    video.onerror = () => {
      const isHttpsPage = window.location.protocol === 'https:';
      const isHttpStream = channel.url.startsWith('http://');
      const isBrowser = !window.Capacitor;

      if (isBrowser && isHttpsPage && isHttpStream) {
        showHttpWarning();
      } else {
        loader.querySelector("span").innerText = "Stream unavailable ⚠️";
        const spinner = loader.querySelector(".spinner");
        if (spinner) spinner.classList.add("hidden");
      }
    };

    video.addEventListener("loadedmetadata", () => {
      video.play().catch(err => {
        console.log("Autoplay blocked:", err);
        loader.querySelector("span").innerHTML = 'Stream paused. Click Play to watch!<br><span class="paused-play-icon" onclick="togglePlay()">▶</span>';
        const spinner = loader.querySelector(".spinner");
        if (spinner) spinner.classList.add("hidden");
      });
    });
  } else {
    // If HLS library is not loaded yet, wait and retry
    if (typeof Hls === "undefined") {
      loader.querySelector("span").innerText = "Initializing player...";
      hlsInitInterval = setInterval(() => {
        if (typeof Hls !== "undefined") {
          clearInterval(hlsInitInterval);
          hlsInitInterval = null;
          playChannel(index);
        }
      }, 100);
      return;
    }
    loader.querySelector("span").innerText = "HLS stream format not supported";
    return;
  }

  // Hook playing events to handle loaders
  video.onplaying = () => {
    loader.classList.add("hidden");
    resetPlayerLoader();
  };

  video.onwaiting = () => {
    resetPlayerLoader();
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
  category.innerText = channel.categories ? channel.categories.join(", ") : "";

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
  
  if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
    // Enter Fullscreen
    if (video.requestFullscreen) {
      video.requestFullscreen()
        .then(() => {
          lockOrientation();
        })
        .catch(err => {
          console.error("Error entering fullscreen:", err);
        });
    } else if (video.webkitRequestFullscreen) { /* Chrome/Safari on Desktop/Android */
      video.webkitRequestFullscreen();
      setTimeout(lockOrientation, 150);
    } else if (video.msRequestFullscreen) { /* IE/Edge */
      video.msRequestFullscreen();
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

/* LIVE VISITOR AND TOTAL VISITS STATS LOGIC */
function setupLiveStats() {
  const liveCountEl = document.getElementById("liveCount");
  const headerLiveCountEl = document.getElementById("headerLiveCount");
  const totalCountEl = document.getElementById("totalCount");
  const headerTotalCountEl = document.getElementById("headerTotalCount");
  
  if (!totalCountEl) return;

  const updateLiveUI = (val) => {
    if (liveCountEl) liveCountEl.innerText = val.toLocaleString();
    if (headerLiveCountEl) headerLiveCountEl.innerText = val.toLocaleString();
  };

  const updateTotalUI = (val) => {
    if (totalCountEl) totalCountEl.innerText = val.toLocaleString();
    if (headerTotalCountEl) headerTotalCountEl.innerText = val.toLocaleString();
  };

  // 1. Total Visits (Deterministic time-based growth - identical for all users)
  const baseVisits = 9850;
  const baseTime = new Date("2026-06-05T00:00:00Z").getTime(); // Fixed start date
  const visitIntervalMs = 90000; // 1 visit every 90 seconds (1.5 minutes)

  const calculateTotalVisits = () => {
    const elapsed = Date.now() - baseTime;
    return baseVisits + Math.max(0, Math.floor(elapsed / visitIntervalMs));
  };
  
  let currentTotalVisits = calculateTotalVisits();
  updateTotalUI(currentTotalVisits);

  // 2. Live Watching (Deterministic wave fluctuations - identical for all users)
  const baseLive = 110;
  
  const calculateLiveWatching = () => {
    const timeMs = Date.now();
    // Slow wave: completes a full cycle every ~62.8 minutes, fluctuates +/- 25
    const slowWave = Math.sin(timeMs / 600000) * 25;
    // Fast wave (noise): completes a cycle every 20 seconds, fluctuates +/- 4
    const fastNoise = Math.sin(timeMs / 3183) * 4; 
    
    let count = Math.round(baseLive + slowWave + fastNoise);
    if (count < 70) count = 70;
    if (count > 160) count = 160;
    return count;
  };

  let currentLiveCount = calculateLiveWatching();
  updateLiveUI(currentLiveCount);

  // Update UI values dynamically every 3 seconds
  setInterval(() => {
    const newTotalVisits = calculateTotalVisits();
    if (newTotalVisits !== currentTotalVisits) {
      currentTotalVisits = newTotalVisits;
      updateTotalUI(currentTotalVisits);
    }

    const newLiveCount = calculateLiveWatching();
    if (newLiveCount !== currentLiveCount) {
      currentLiveCount = newLiveCount;
      updateLiveUI(currentLiveCount);
    }
  }, 3000);
}

/* BACK TO TOP BUTTON LOGIC */
function setupBackToTop() {
  const btn = document.getElementById("backToTopBtn");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      btn.classList.remove("hidden");
    } else {
      btn.classList.add("hidden");
    }
  });

  btn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

/* FOOTER INTERACTIVE FEATURES */
function setupFooterFeatures() {
  // Handle TV Category clicks from Footer
  document.querySelectorAll(".footer-cat-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const cat = link.getAttribute("data-category");
      filterCategory(cat);
      
      // Scroll smoothly to channels section
      const section = document.querySelector(".channels-section");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

/* SMOOTH SCROLL NAVIGATION HELPERS */
function scrollToPlayer(event) {
  if (event) event.preventDefault();
  const player = document.querySelector(".player-section");
  if (player) {
    player.scrollIntoView({ behavior: "smooth" });
  }
}

function scrollToCategories(event) {
  if (event) event.preventDefault();
  
  // Clear search input and search keyword
  const searchInput = document.getElementById("search");
  if (searchInput) searchInput.value = "";
  searchKeyword = "";
  const clearBtn = document.getElementById("clearSearch");
  if (clearBtn) clearBtn.style.display = "none";
  
  // Reset category filter to 'All'
  filterCategory('All');
  
  const categories = document.querySelector(".search-filter-sticky");
  if (categories) {
    categories.scrollIntoView({ behavior: "smooth" });
  }
}

function resetToDefaultApp(event) {
  if (event) event.preventDefault();
  
  // Clear search input and search keyword
  const searchInput = document.getElementById("search");
  if (searchInput) searchInput.value = "";
  searchKeyword = "";
  const clearBtn = document.getElementById("clearSearch");
  if (clearBtn) clearBtn.style.display = "none";
  
  // Reset category filter to 'All'
  filterCategory('All');
  
  // Play the default channel
  if (channels.length > 0) {
    const defaultIndex = channels.findIndex(c => c.name.toLowerCase().includes("channel i"));
    playChannel(defaultIndex !== -1 ? defaultIndex : 0);
  }
  
  // Scroll smoothly to player
  const player = document.querySelector(".player-section");
  if (player) {
    player.scrollIntoView({ behavior: "smooth" });
  }
}

/* PRIVACY POLICY & TERMS MODAL CUSTOM DIALOG */
function showTermsModal(type, event) {
  if (event) event.preventDefault();
  
  const title = type === "privacy" ? "Privacy Policy" : "Terms of Service";
  const text = type === "privacy" 
    ? "At Alpha TV, we value your privacy. We do not collect or store any personal data. All streams are sourced from third-party public playlists and played locally in your browser or application. Your preferences are saved only on your local device."
    : "Welcome to Alpha TV! Our services are provided free of charge for streaming live channels. We do not host any of the video content; all streams are sourced from publicly available public playlists. By using this app, you agree to comply with your local copyright and streaming laws.";
  
  const modal = document.getElementById("infoModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  
  if (modal && modalTitle && modalText) {
    modalTitle.textContent = title;
    modalText.textContent = text;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    
    // Disable body scroll when modal is open
    document.body.style.overflow = "hidden";
  }
}

function closeInfoModal() {
  const modal = document.getElementById("infoModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    
    // Restore body scroll
    document.body.style.overflow = "";
  }
}

// Close modal on Escape key press
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeInfoModal();
    closeWarningModal();
    closeUpdateModal();
  }
});

/* 2D / 3D VIEW TOGGLE LOGIC */
function setViewMode(mode) {
  const body = document.body;
  const container = document.querySelector(".view-toggle-container");
  const btn3D = document.getElementById("btnToggle3D");
  const btn2D = document.getElementById("btnToggle2D");
  
  if (!container || !btn3D || !btn2D) return;
  
  // Temporarily disable transitions during layout mode switch
  body.classList.add('no-transition');
  
  if (mode === '2d') {
    body.classList.remove('mode-3d');
    body.classList.add('mode-2d');
    container.classList.add('mode-2d');
    btn2D.classList.add('active');
    btn3D.classList.remove('active');
    localStorage.setItem('viewMode', '2d');
  } else {
    body.classList.remove('mode-2d');
    body.classList.add('mode-3d');
    container.classList.remove('mode-2d');
    btn3D.classList.add('active');
    btn2D.classList.remove('active');
    localStorage.setItem('viewMode', '3d');
  }
  
  // Force reflow
  body.offsetHeight;
  
  // Re-enable transitions after the switch
  setTimeout(() => {
    body.classList.remove('no-transition');
  }, 150);
}

function setupViewModeToggle() {
  const savedMode = localStorage.getItem('viewMode') || '3d';
  setViewMode(savedMode);
}

/* MOBILE SMART APP BANNER & DYNAMIC APK DOWNLOAD */
let latestApkUrl = "https://github.com/Shariar-Ahamed/online-tv-streaming-platform/releases";

function setupMobileAppBanner() {
  if (window.Capacitor) return;

  fetch("https://api.github.com/repos/Shariar-Ahamed/online-tv-streaming-platform/releases/latest")
    .then(response => {
      if (!response.ok) throw new Error("GitHub API error");
      return response.json();
    })
    .then(data => {
      if (data && data.assets && data.assets.length > 0) {
        const apkAsset = data.assets.find(asset => asset.name.endsWith(".apk"));
        if (apkAsset && apkAsset.browser_download_url) {
          latestApkUrl = apkAsset.browser_download_url;
          document.querySelectorAll(".download-apk-link").forEach(link => {
            link.setAttribute("href", latestApkUrl);
          });
        }
      }
    })
    .catch(err => {
      console.warn("Failed to retrieve latest APK release from GitHub API, falling back to release page:", err);
    });

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  const isBannerHidden = localStorage.getItem("alpha_tv_hide_app_banner") === "true";

  if (isMobile && !isBannerHidden) {
    const banner = document.getElementById("mobileAppBanner");
    if (banner) {
      setTimeout(() => {
        banner.classList.remove("hidden");
      }, 2000);
    }
  }
}

function closeAppBanner() {
  const banner = document.getElementById("mobileAppBanner");
  if (banner) {
    banner.classList.add("hidden");
    localStorage.setItem("alpha_tv_hide_app_banner", "true");
  }
}

/* IN-APP UPDATE CHECKER (ANDROID APP ONLY) */
const currentBuildCode = 14; // Matches version 1.1.3 build code

function checkForUpdates() {
  if (!window.Capacitor) return;

  const configUrl = "https://raw.githubusercontent.com/Shariar-Ahamed/online-tv-streaming-platform/main/app-update.json";

  fetch(configUrl)
    .then(response => {
      if (!response.ok) throw new Error("Update config response error");
      return response.json();
    })
    .then(data => {
      if (data && data.buildCode && data.buildCode > currentBuildCode) {
        // Show the header notification badge whenever a new update is available
        showHeaderUpdateNotification(data);

        // Check if the user clicked "Later" for this exact build code in the last 36 hours
        const laterTime = localStorage.getItem("alpha_tv_update_later_time");
        const laterBuild = localStorage.getItem("alpha_tv_update_later_build");
        
        if (laterBuild && parseInt(laterBuild) === data.buildCode && laterTime) {
          const timeDiff = Date.now() - parseInt(laterTime);
          const waitTime = 36 * 60 * 60 * 1000; // 36 hours in milliseconds
          
          if (timeDiff < waitTime) {
            console.log("Update prompt skipped because user selected 'Later' in the last 36 hours.");
            return;
          }
        }
        
        showUpdateModal(data);
      } else {
        // If no update is available or already updated, hide the header badge
        hideHeaderUpdateNotification();
      }
    })
    .catch(err => {
      console.warn("Failed to check for remote app updates:", err);
    });
}

function showHeaderUpdateNotification(updateData) {
  const badge = document.getElementById("headerUpdateNotification");
  const link = document.getElementById("headerUpdateLink");
  if (badge) {
    badge.classList.remove("hidden");
  }
  if (link && updateData.downloadUrl) {
    link.setAttribute("href", updateData.downloadUrl);
  }
}

function hideHeaderUpdateNotification() {
  const badge = document.getElementById("headerUpdateNotification");
  if (badge) {
    badge.classList.add("hidden");
  }
}

function showUpdateModal(updateData) {
  const modal = document.getElementById("updateModal");
  const changelog = document.getElementById("updateChangelog");
  const downloadLink = document.getElementById("updateDownloadLink");

  if (!modal) return;

  // Save the remote build code in a data-attribute so closeUpdateModal can access it
  modal.dataset.updateBuild = updateData.buildCode;

  if (changelog && updateData.changelog) {
    changelog.innerHTML = "";
    const lines = updateData.changelog.split("\n");
    lines.forEach(line => {
      if (line.trim()) {
        const p = document.createElement("p");
        p.className = "changelog-item";
        p.innerText = line;
        changelog.appendChild(p);
      }
    });
  }

  if (downloadLink && updateData.downloadUrl) {
    downloadLink.setAttribute("href", updateData.downloadUrl);
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeUpdateModal() {
  const modal = document.getElementById("updateModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    // Save skip state in localStorage if we skip this update
    const updateBuild = modal.dataset.updateBuild;
    if (updateBuild) {
      localStorage.setItem("alpha_tv_update_later_time", Date.now().toString());
      localStorage.setItem("alpha_tv_update_later_build", updateBuild);
    }
  }
}

function handleUpdateDownload(event) {
  event.preventDefault();
  const url = event.currentTarget.getAttribute("href");
  if (!url || url === "#") return;

  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
    window.Capacitor.Plugins.Browser.open({ url: url }).catch(err => {
      console.error("Failed to open URL via Capacitor Browser:", err);
      window.open(url, "_system");
    });
  } else {
    window.open(url, "_blank");
  }
}

/* DISCLAIMER POPUP MODAL LOGIC */
function checkDisclaimer() {
  const accepted = localStorage.getItem("alpha_tv_disclaimer_accepted");
  if (!accepted) {
    const modal = document.getElementById("disclaimerModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  }
}

function acceptDisclaimer() {
  localStorage.setItem("alpha_tv_disclaimer_accepted", "true");
  closeDisclaimerModal();
}

function showDisclaimerModal(event) {
  if (event) event.preventDefault();
  const modal = document.getElementById("disclaimerModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

function closeDisclaimerModal() {
  const modal = document.getElementById("disclaimerModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

/* AUTOMATIC PICTURE-IN-PICTURE (PIP) MODE SYNC */
function setupPictureInPicture() {
  const video = document.getElementById("video");

  // Web Browser native PiP event listeners
  video.addEventListener("enterpictureinpicture", () => {
    console.log("Web PiP Entered");
    document.body.classList.add("pip-active");
  });

  video.addEventListener("leavepictureinpicture", () => {
    console.log("Web PiP Exited");
    document.body.classList.remove("pip-active");
  });

  // Android capacitor wrapper callback
  window.onPiPModeChanged = function(isInPiP) {
    console.log("Android PiP Changed:", isInPiP);
    if (isInPiP) {
      document.body.classList.add("pip-active");
    } else {
      document.body.classList.remove("pip-active");
    }
  };
}
