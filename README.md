# Nova TV - Modern Online Live TV Streaming Platform

A premium, modern online live TV streaming platform featuring local and international channels with dynamic categorized browsing, search filtering, animated cyberpunk design system, and a responsive glassmorphic streaming interface.

🔗 **Live View:** [https://shariar-ahamed.github.io/online-tv-streaming-platform/](https://shariar-ahamed.github.io/online-tv-streaming-platform/)

---

## 🌟 Key Features

- **Responsive Split Layout**: Split panel desktop layout (sticky player sidebar on the left, channel section on the right) that automatically transforms into a clean stacked list on tablet and mobile viewports.
- **Dynamic Category Filtering**: Dynamically parses the M3U playlist file headers to build horizontal scroll-to-center category pills (e.g. Bangla, News, Sports, Documentary, Kids, etc.).
- **Live Stream Buffering Loaders**: Integrates HLS play states (`waiting`, `playing`) with a custom neon rotating loader overlay to indicate buffer status.
- **Search Bar with Clear controls**: Real-time channel name search with instant input clearing functionality.
- **Robust Logo Fallbacks**: Generates beautiful, distinct initials-based avatars with randomized color gradients in case channel logo URLs fail to resolve or are missing.
- **Glassmorphic Cyber-Dark Aesthetics**: Implements fluid animated radial gradient mesh background blobs, glowing interactive border selections, and glass effects.
- **Smart Next/Prev controls**: Next and Previous playback controls navigate relatively within the currently filtered category or search result list.

## 🛠️ Technology Stack

- **Structure**: HTML5 Semantic elements
- **Styling**: Vanilla CSS3 (Custom Variables, Keyframe Animations, backdrop-filters)
- **Logic**: Vanilla Javascript (ES6+, Fetch API, HTML5 Video events)
- **Streaming**: [hls.js](https://github.com/video-dev/hls.js/) (HTTP Live Streaming Library)

## 📂 File Structure

```text
online-tv-streaming-platform/
│
├── index.html        # App layout and structure
├── style.css         # Custom stylesheet (Glassmorphic dark design)
├── script.js        # Stream parsing, filtering, and playback logic
├── channels.m3u      # Parsed live channel list M3U playlist file
└── README.md         # Project documentation
```

## 🚀 How to Run Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/Shariar-Ahamed/online-tv-streaming-platform.git
   ```
2. Open the directory:
   ```bash
   cd online-tv-streaming-platform
   ```
3. Run using any local development server (like VS Code **Live Server**, Python simple HTTP server, or Node `http-server`):
   ```bash
   # Example using Python:
   python -m http.server 8000
   ```
4. Access the web page at `http://localhost:8000`.
