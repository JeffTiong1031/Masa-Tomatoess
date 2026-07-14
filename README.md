<div align="center">

# 🍅 Masa Tomato
**The Premium, Local-First Pomodoro Productivity OS**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud_Sync-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Zustand](https://img.shields.io/badge/Zustand-State-orange?style=for-the-badge)](https://zustand-demo.pmnd.rs/)

*Beautiful glassmorphism. Deep focus. Cloud-synced leaderboard.*

---

</div>

## ✨ Introduction

**Masa Tomato** is a modern, gamified Pomodoro timer built for absolute focus. Designed with a premium macOS-inspired "Glassmorphism" aesthetic, it acts as a standalone Productivity OS. It features a drift-free timer engine, integrated floating music players, a comprehensive analytics dashboard, and a **2-player cloud leaderboard** — all while keeping your core data 100% private and stored locally on your machine.

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
- **🏆 2-Player Cloud Leaderboard**  
  Compete with a friend! Focus sessions sync in the background to Supabase, powering a leaderboard with **Today**, **This Week**, and **This Year** views.
- **🔐 Shared Secret Authentication**  
  A password-protected gatekeeper secures the app. No Supabase Auth needed — just a shared secret verified server-side with rate limiting and timing-safe comparison.
- **🔄 Offline-First Background Sync**  
  Sessions are always saved locally first (Dexie.js). A background sync engine pushes unsynced records to the cloud when connectivity is available. Never lose a session.
- **💻 Native Windows App Experience**  
  Launch the app completely silently with a single double-click using the custom `PomodoroOS.vbs` script. When you're done, the `StopMasaTomato.bat` cleanly shuts down the entire server process tree.

---

## 🏗️ Architecture

Masa Tomato follows a **Local-First / Cloud-Backup** architecture:

```
┌─────────────────────────────────────────┐
│              Browser (Client)           │
│                                         │
│  ┌──────────┐   ┌────────────────────┐  │
│  │  Zustand  │   │    Dexie.js        │  │
│  │  (State)  │   │  (IndexedDB)       │  │
│  │           │   │  Source of Truth    │  │
│  └──────────┘   └────────┬───────────┘  │
│                          │ Background   │
│                          │ Sync Engine  │
│                          ▼              │
│  ┌──────────────────────────────────┐   │
│  │  Supabase Client (anon key)     │   │
│  └──────────────┬───────────────────┘   │
└─────────────────┼───────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────┐
│        Supabase (PostgreSQL)            │
│  ┌──────────────────────────────────┐   │
│  │  focus_sessions (RLS enabled)   │   │
│  │  - Leaderboard reads            │   │
│  │  - Session inserts              │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Key principle:** Dexie.js is the single source of truth for the timer and local analytics. Supabase is a passive sync target that feeds the leaderboard.

---

## 🛠️ Tech Stack

### Core
- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) & React 19
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (glassmorphism, backdrop-blurs, custom radii)
- **Icons:** [Lucide React](https://lucide.dev/)

### State & Storage (Local-First)
- **Global State:** [Zustand](https://github.com/pmndrs/zustand) with `persist` middleware for timer settings.
- **Local Database:** [Dexie.js](https://dexie.org/) (IndexedDB) for session records and analytics.
- **Asset Storage:** `idb-keyval` for storing custom background images.

### Cloud & Sync
- **Backend:** [Supabase](https://supabase.com/) (PostgreSQL) for the leaderboard and cloud backup.
- **Sync Engine:** Custom Dexie → Supabase background sync (`src/lib/sync.ts`).
- **Auth:** Shared secret verified via Next.js Server Actions (no Supabase Auth).

### Specialized Libraries
- **Charts & Visualization:** [Recharts](https://recharts.org/) (Bar charts) and [react-activity-calendar](https://grubersjoe.github.io/react-activity-calendar/) (Contribution heatmap).
- **Interactive UI:** [react-rnd](https://github.com/bokuweb/react-rnd) for draggable and resizable floating music widgets.
- **Audio Engine:** HTML5 `<audio>` API for persistent, looping alarms.

---

## 🔒 Security

The app has been through a full security audit. Key hardening measures:

- **Row Level Security (RLS)** enabled on Supabase — anon key can only `SELECT` and `INSERT`.
- **Timing-safe password comparison** using `crypto.timingSafeEqual`.
- **Rate limiting** on login — 5 failed attempts triggers a 15-minute lockout.
- **Server-side data deletion** via Server Actions with user validation whitelist.
- **Input sanitization** — task names truncated/stripped, durations clamped to `[1, 120]`.
- **Security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`.

---

## ⚙️ Installation & Usage

### 1. Clone & Install
```bash
git clone https://github.com/JeffTiong1031/Masa-Tomatoess.git
cd Masa-Tomatoess
npm install
```

### 2. Set Up Environment Variables
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
APP_PASSWORD=your_shared_secret_password
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # optional, for server-side deletes
```

### 3. Set Up Supabase
Run this SQL in your **Supabase Dashboard → SQL Editor**:
```sql
-- Create the table
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 120),
  task_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON focus_sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous reads" ON focus_sessions
  FOR SELECT TO anon USING (true);
```

### 4. Run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 5. The Native Desktop Experience (Windows)
Masa Tomato includes custom scripts to run completely silently in the background, exactly like a native Windows application.

1. Locate the **`PomodoroOS.vbs`** file in the project root.
2. Right-click the file → **Send to** → **Desktop (create shortcut)**.
3. (Optional) Right-click the shortcut on your desktop, go to Properties, and change the icon to a Tomato.
4. **Double-click the shortcut.** The Next.js server will boot silently in the background and open your default browser automatically.
5. To shut down the server when you are finished, double-click the **`StopMasaTomato.bat`** shortcut.

---

## 📂 Project Structure

```
src/
├── app/
│   ├── actions/          # Server Actions (auth, clearSessions)
│   ├── dashboard/        # Analytics & Leaderboard page
│   └── page.tsx          # Main timer page
├── components/
│   ├── Gatekeeper.tsx    # Auth gate (password + identity)
│   ├── Leaderboard.tsx   # Cloud leaderboard (Today/Week/Year)
│   ├── TimerDisplay.tsx  # Main timer UI
│   ├── Controls.tsx      # Play/Pause/Skip controls
│   ├── SettingsModal.tsx # Timer settings (slider + number input)
│   ├── AudioPlayer.tsx   # Floating Spotify/YouTube player
│   └── ThemeModal.tsx    # Background theme picker
├── db/
│   └── db.ts             # Dexie.js schema & database
├── lib/
│   ├── supabase.ts       # Supabase client
│   └── sync.ts           # Background sync engine
├── store/
│   └── useTimerStore.ts  # Zustand state management
└── worker/
    └── timer.worker.ts   # Web Worker for drift-free ticking
```

---

<div align="center">
  <i>Built for focus. Hardened for production.</i>
</div>

