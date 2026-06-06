/* VARIABLES */
const playlistOnline = "https://raw.githubusercontent.com/Shariar-Ahamed/online-tv-streaming-platform/main/channels.m3u";
const playlistLocal = "channels.m3u";

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
  setupLiveStats();
  setupOrientationExitFullscreen();
  setupExternalLinks();
  setupBackToTop();
  setupFooterFeatures();
  setupViewModeToggle();
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

  fetch(playlistOnline)
    .then(response => {
      if (!response.ok) {
        throw new Error("Online playlist response error");
      }
      return response.text();
    })
    .catch(err => {
      console.log("Could not load online playlist, falling back to local file...", err);
      return fetch(playlistLocal).then(response => response.text());
    })
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

          let categories = ["Other"];
          const groupMatch = info.match(/group-title="([^"]*)"/);
          if (groupMatch) {
            categories = groupMatch[1].split(",").map(c => c.trim()).filter(Boolean);
            if (categories.length === 0) {
              categories = ["Other"];
            }
          }

          channels.push({
            name,
            url,
            logo,
            categories
          });
        }
      }

      loader.classList.add("hidden");
      renderCategories();
      filterAndSearch();

      if (filteredChannels.length > 0) {
        const defaultIndex = filteredChannels.findIndex(c => c.name.toLowerCase().includes("channel i"));
        playChannel(defaultIndex !== -1 ? defaultIndex : 0);
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
  container.innerHTML = `<button class="category-pill active" data-category="All" onclick="filterCategory('All', this)">All Channels <span class="category-count">${allCount}</span></button>`;

  const categories = Object.keys(categoryCounts);

  // Sort categories by user defined custom order
  categories.sort((a, b) => {
    const customOrder = [
      "bangla",
      "sports",
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
    const matchesCategory = currentCategory === "All" || (ch.categories && ch.categories.includes(currentCategory));
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
      ${ch.logo ? `<img src="${ch.logo}" alt="${ch.name}" loading="lazy" onerror="handleCardLogoError(this, '${ch.name}')">` : ""}
    `;

    div.onclick = () => playChannel(index);
    grid.appendChild(div);
  });
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

  if (Hls.isSupported()) {
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

  // 1. Total Visits Logic (Persist using localStorage)
  const baseVisits = 9850; // Started around 10k as requested
  let storedVisits = localStorage.getItem("alpha_tv_total_visits_v2");
  
  if (!storedVisits) {
    storedVisits = baseVisits;
  } else {
    storedVisits = parseInt(storedVisits, 10);
  }
  
  // Increment visit by 1 for current session/page load
  storedVisits += 1;
  localStorage.setItem("alpha_tv_total_visits_v2", storedVisits);
  updateTotalUI(storedVisits);

  // 2. Live Watching Logic (Simulate realistic fluctuations)
  // Start with a random number between 85 and 145
  let liveCount = Math.floor(Math.random() * (145 - 85 + 1)) + 85;
  updateLiveUI(liveCount);

  // Update live watching stats every 4 seconds (fluctuate between -3 and +3)
  setInterval(() => {
    const change = Math.floor(Math.random() * 7) - 3; // -3, -2, -1, 0, 1, 2, 3
    liveCount += change;
    
    // Keep count in a realistic active range (e.g. 70 to 180)
    if (liveCount < 70) liveCount = 70;
    if (liveCount > 180) liveCount = 180;
    
    updateLiveUI(liveCount);

    // Occasional global visit increment simulation (e.g. 35% chance every 4s)
    if (Math.random() < 0.35) {
      storedVisits += 1;
      localStorage.setItem("alpha_tv_total_visits_v2", storedVisits);
      updateTotalUI(storedVisits);
    }
  }, 4000);
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
