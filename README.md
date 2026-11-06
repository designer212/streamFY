# streamFY 🎬✨

> Your ultimate, high-performance, installable cinematic streaming web app designed with a sleek MovieBox-style interface.

---

## 🚀 Features

* **📱 Installable Progressive Web App (PWA):** Fully installable on mobile and desktop home screens with custom app icons, standalone window mode, and offline asset caching via Service Workers.
* **🎞️ Cinematic UI & Glassmorphism:** Designed around a rich dark aesthetic (`#0a0e17`) accented with neon green (`#22c55e`) and electric cyan (`#00f2fe`) with frosted-glass overlays and smooth transitions.
* **♾️ Infinite Category Scrolling:** Seamless pagination for category browsing (Action, Sci-Fi, Trending, TV series, etc.) that automatically loads more items as you scroll down, eliminating dead ends.
* **🛡️ Smart Player Interface & Auto-Hide Controls:** Features an intelligent frosted-glass control bar that automatically fades out after 5 seconds of inactivity, leaving a clean three-dot (`...`) toggle trigger in the corner.
* **⚡ Multi-Server Architecture:** Built-in support for primary high-performance streaming hosts (`VidSrc`, `VidLink`) with quick-switch options and emergency backup integrations.
* **📺 Comprehensive TV & Movie Support:** Full multi-season and episode selector for TV shows, trailer previews, search functionality, and local storage-powered Watchlist.

---

## 📂 Project Structure

```text
streamfy/
├── index.html          # Main application shell and PWA markup
├── manifest.json       # PWA web app manifest configuration
├── sw.js               # Service worker for caching and offline support
├── icon-192.png        # Standard mobile PWA icon (192x192)
├── icon-512.png        # High-res PWA icon / splash screen (512x512)
├── css/
│   └── styles.css      # Core cinematic styling and glassmorphism rules
└── js/
    ├── config.js       # TMDb API keys and server endpoint definitions
    └── app.js          # Core application logic, routing, infinite scroll, and player controls
