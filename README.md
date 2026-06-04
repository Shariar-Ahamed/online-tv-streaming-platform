<p align="center">
  <img src="https://i.postimg.cc/bwR0VvDz/Done1.png" alt="Alpha TV Cover Page" width="100%" style="border-radius: 12px; margin-bottom: 20px;">
</p>

# 📺 Alpha TV - Premium Live Streaming Platform

<p align="center">
  <a href="https://github.com/Shariar-Ahamed/online-tv-streaming-platform/releases"><img src="https://img.shields.io/badge/Download-AlphaTV--v1.0.2.apk-brightgreen?style=for-the-badge&logo=android&logoColor=white" alt="Download APK"></a>
  <a href="https://shariar-ahamed.github.io/online-tv-streaming-platform/"><img src="https://img.shields.io/badge/Live-Web%20Demo-ff007f?style=for-the-badge&logo=livewire&logoColor=white" alt="Live Demo"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20Web-blue?style=flat-square&logo=capacitor&logoColor=white">
  <img src="https://img.shields.io/badge/UI-Neumorphic%20%2F%20Glassmorphism-violet?style=flat-square">
  <img src="https://img.shields.io/badge/Version-v1.0.2-brightgreen?style=flat-square">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square">
</p>

<p align="center">
  <img src="https://img.shields.io/github/repo-size/Shariar-Ahamed/online-tv-streaming-platform">
  <img src="https://img.shields.io/github/last-commit/Shariar-Ahamed/online-tv-streaming-platform">
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/Shariar-Ahamed/online-tv-streaming-platform?style=social">
  <img src="https://img.shields.io/github/forks/Shariar-Ahamed/online-tv-streaming-platform?style=social">
</p>

<p align="center">
  <a href="https://wakatime.com/badge/user/c7433bc5-6f12-4c97-baea-430790fa608c/project/d5fc1849-63b0-4df6-8d52-fe8d5b2162e8"><img src="https://wakatime.com/badge/user/c7433bc5-6f12-4c97-baea-430790fa608c/project/d5fc1849-63b0-4df6-8d52-fe8d5b2162e8.svg" alt="wakatime"></a>
</p>

---

## 📖 Overview

**Alpha TV** is a premium, modern, and highly responsive online Live TV streaming platform. It packages a cyber-dark, glassmorphic Web App into a lightweight native Android App using the Capacitor framework. Featuring a dual-mode layout (2D Flat & 3D Neumorphic), dynamic M3U parsing, HLS streaming playback, and an intelligent channel navigation system, Alpha TV brings local and international television straight to your pocket.

---

## 📱 App Specifications (Android & Play Store Info)

Below are the technical specifications of the native Android application package:

| Specification | Details |
|---|---|
| 📦 **App Name** | `AlphaTV-v1.0.2.apk` |
| 🆔 **Package Name** | `com.alphatv.app` |
| 🏷️ **Current Version** | `1.0.2` (Build Code `3`) |
| 📂 **App Size** | ~3.5 MB |
| ⚙️ **Minimum OS Support** | Android 7.0 (Nougat - API Level 24) or higher |
| 🎯 **Target SDK** | Android 15 / 16 (API Level 36) |
| 🎮 **Category** | Entertainment / Live TV Streaming |
| 🌍 **Supported Architectures** | `universal` (arm64-v8a, armeabi-v7a, x86, x86_64) |
| 🚀 **Releases Directory** | [GitHub Releases](https://github.com/Shariar-Ahamed/online-tv-streaming-platform/releases) |

---

## 🌟 Key Features

### 🎛️ 2D / 3D Layout Toggle Switch
- Toggle instantly between a **Modern 2D Glow UI** and a **Tactile 3D Soft Neumorphic UI** directly from the header.
- Features custom color-reversed slider gradients:
  - **3D Mode:** Pink-to-Purple (`#ff007f` to `#9b51e0`) with soft outset highlights and inset cutouts.
  - **2D Mode:** Purple-to-Pink (`#9b51e0` to `#ff007f`) with neon glow shadows.
- Incorporates a **Zero-Flash layout switch mechanism** that disables CSS border transition delays during layout changes while keeping the slider animation smooth.

### 📱 Tailored Mobile Layout
- **Clean Header:** The top header on mobile is kept neat and spacious, placing the logo on the left and the 2D/3D toggle cleanly on the right.
- **Header Live Counter:** Relocated to the active channel details card, sitting horizontally side-by-side with the green `LIVE` badge on the top row of the card for a cohesive, balanced mobile interface.

### 📺 Integrated HLS Player
- Native HLS `.m3u8` live stream decoding powered by `HLS.js`.
- Features built-in smart playback controls (Next, Previous, Play/Pause, Fullscreen).
- Includes dynamic loading spinners and live status badges.

### 🗂️ Smart M3U Playlist Parsing & Categories
- Automatically parses [channels.m3u](file:///e:/Git%20All%20Repo/online-tv-streaming-platform/channels.m3u) on startup.
- Dynamically generates categories and sorts items with an inline swipeable category pill carousel.
- Rounded picture logo formatting (`border-radius: 10px`) across both 2D and 3D states.
- Beautiful custom-generated gradient avatars as fallback icons for channels with broken logo links.

---

## 🛠️ Technology Stack

- **Frontend Core:** HTML5, Vanilla CSS3 (Glassmorphism & Neumorphic Shadow Systems), ES6+ JavaScript.
- **Streaming engine:** `HLS.js` library.
- **Icons:** FontAwesome v6.
- **Native Wrapper:** Capacitor CLI + Capacitor Android Core.

---

## 🖥️ Responsive Preview

### 💻 Laptop & Desktop View
<p align="center">
  <img src="https://i.postimg.cc/Dz267Gkc/laptop.png" alt="Laptop Preview" width="80%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
</p>

### 📲 Tablet & Mobile View
<p align="center">
  <img src="https://i.postimg.cc/3xhVDd5P/tab.png" width="45%" alt="Tablet Preview" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://i.postimg.cc/7LVBzVM2/phone.png" width="28%" alt="Mobile Preview" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
</p>

---

## 📂 Project Directory Structure

```bash
online-tv-streaming-platform/
│
├── 📂 android/               # Native Android Studio Project
│   └── app/build.gradle      # Android compilation & SDK target configurations
│
├── 📂 www/                   # Web Build Output directory
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── 📄 channels.m3u           # M3U Playlist containing channels & groups
├── 📄 index.html             # Source HTML structure
├── 📄 script.js              # Application core logic & parser
├── 📄 style.css              # Custom layout stylesheet
├── 📄 build.js               # Node.js builder to clean and package the Web directory
└── 📄 package.json           # Node scripts and Capacitor core dependencies
```

---

## ⚙️ Getting Started (Local Development)

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Shariar-Ahamed/online-tv-streaming-platform.git
cd online-tv-streaming-platform
```

### 2️⃣ Run locally with Live Server
1. Open the project in Visual Studio Code.
2. Ensure you have the **Live Server** extension installed.
3. Right-click inside `index.html` and select **Open with Live Server**.
4. Access the web app at `http://127.0.0.1:5500`.

### 3️⃣ Build and Sync to Android (Capacitor)
If you want to package the app and prepare it for Android builds:
```bash
# Install node dependencies
npm install

# Run the project builder script (copies files to www/)
node build.js

# Sync built files to the native Android directory
npx cap sync

# Open the Android Studio project to compile the APK
npx cap open android
```

---

## 🔗 Useful Links

- **Latest APK Release:** [Download AlphaTV-v1.0.2.apk](https://github.com/Shariar-Ahamed/online-tv-streaming-platform/releases)
- **Live Web App:** [Alpha TV Live Web App](https://shariar-ahamed.github.io/online-tv-streaming-platform/)
- **Source Code Repository:** [GitHub Repository](https://github.com/Shariar-Ahamed/online-tv-streaming-platform)

---

## ⭐ Support & Feedback

If you find this project useful, please consider giving it a ⭐ on GitHub! Your support keeps the development going.

---

## 📜 License

This project is licensed under the **MIT License**. Feel free to use, modify, and build upon this project for your personal or commercial applications.
