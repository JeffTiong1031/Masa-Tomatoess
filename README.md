<div align="center">

# 🍅 Masa Tomato
**The Premium, Local-First Pomodoro Productivity OS**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-State-orange?style=for-the-badge)](https://zustand-demo.pmnd.rs/)

*Beautiful glassmorphism. Deep focus. Zero cloud dependencies.*

---

</div>

## ✨ Introduction

**Masa Tomato** is a modern, gamified Pomodoro timer built for absolute focus. Designed with a premium macOS-inspired "Glassmorphism" aesthetic, it acts as a standalone Productivity OS. It features a drift-free timer engine, integrated floating music players, and a comprehensive analytics dashboard—all while keeping your data 100% private and stored locally on your machine.

---

## 🚀 Features

- **⏱️ Drift-Free Precision Timer**  
  Powered by Web Workers, the timer never desyncs or pauses, even when your browser throttles inactive tabs.
- **🎵 Integrated Media Players**  
  Mutually exclusive, draggable, and resizable floating mini-players for both **Spotify** and **YouTube**. Control your study jams without leaving the app.
- **🎨 Glassmorphic Theme Engine**  
  Upload your own high-resolution background wallpapers. The UI automatically adapts using beautiful frosted-glass panels (`backdrop-blur`). Backgrounds are saved locally via IndexedDB.
- **📊 The "Forest" Analytics Dashboard**  
  A dedicated `/dashboard` route featuring a **GitHub-style activity heatmap** and weekly focus charts. Watch your productivity grow day by day.
- **💻 Native Windows App Experience**  
  Launch the app completely silently with a single double-click using the custom `PomodoroOS.vbs` script. When you're done, the `StopMasaTomato.bat` cleanly shuts down the entire server process tree.

---

## 🛠️ Technical Implementation & Tech Stack

Masa Tomato is built on a cutting-edge, local-first web stack:

### Core Architecture
- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) & React
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (utilizing heavy backdrop-blurs, custom border radii, and deep drop-shadows for the macOS aesthetic)
- **Icons:** [Lucide React](https://lucide.dev/)

### State & Storage (Local-First)
- **Global State:** [Zustand](https://github.com/pmndrs/zustand) with `persist` middleware for saving timer settings to `localStorage`.
- **Database:** [Dexie.js](https://dexie.org/) (a robust wrapper for IndexedDB) to persistently store tabular session data for the analytics dashboard.
- **Asset Storage:** `idb-keyval` for storing large Base64 image blobs (custom user backgrounds) without hitting the 5MB `localStorage` limit.

### Specialized Libraries
- **Charts & Visualization:** [Recharts](https://recharts.org/) (Bar charts) and [react-activity-calendar](https://grubersjoe.github.io/react-activity-calendar/) (Contribution heatmap).
- **Interactive UI:** [react-rnd](https://github.com/bokuweb/react-rnd) for draggable and resizable floating music widgets.
- **Audio Engine:** HTML5 `<audio>` API for the persistent, looping alarm that can cut through background music.

---

## ⚙️ Installation & Usage

### 1. Standard Development
Clone the repository and install dependencies:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 2. The Native Desktop Experience (Windows)
Masa Tomato includes custom scripts to run completely silently in the background, exactly like a native Windows application.

1. Locate the **`PomodoroOS.vbs`** file in the project root.
2. Right-click the file → **Send to** → **Desktop (create shortcut)**.
3. (Optional) Right-click the shortcut on your desktop, go to Properties, and change the icon to a Tomato.
4. **Double-click the shortcut.** The Next.js server will boot silently in the background and open your default browser automatically.
5. To shut down the server when you are finished, double-click the **`Stop Masa Tomato.bat`** shortcut.

---

<div align="center">
  <i>Built for focus.</i>
</div>
