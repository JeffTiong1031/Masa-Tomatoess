<div align="center">

# 🍅 Masa Tomato
**A Couple's Life Dashboard, Built Around a Focus Timer**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud_Sync-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Zustand](https://img.shields.io/badge/Zustand-State-orange?style=for-the-badge)](https://zustand-demo.pmnd.rs/)

*Nine sections behind one drawer. Two moods. One shared password.*

---

</div>

## ✨ Introduction

**Masa Tomato** started as a Pomodoro timer and has grown into a shared home-screen app for two people (Jeff and Rachel): a **hub** at `/` with live focus stats, a **focus timer** and **stopwatch**, an **analytics dashboard** with a cloud leaderboard, and five more life sections reachable from a drawer menu. The whole app sits behind a shared-password gatekeeper — no per-user accounts, just one secret the two of you know.

Not everything is wired up yet. The timer, stopwatch, dashboard, and hub are fully functional and store real data. The other five sections — Period, Countdown, Meals, Fitness, Finance — are fully styled but currently **inert shells**: every number on them is demonstration data marked with a `Sample` chip, and nothing you enter there is saved. Treat them as a preview of where the app is headed, not as working trackers.

---

## 🗺️ Routes

| Route | What it is | Status |
|---|---|---|
| `/` | **Home hub.** Live focus stats pulled from real session data, plus quick links into every section. | Real |
| `/timer` | The Pomodoro timer (drift-free, Web Worker–driven). This is where `/` used to live. | Real |
| `/flexible` | An open-ended stopwatch for unstructured focus sessions. | Real |
| `/dashboard` | Charts, a GitHub-style contribution heatmap, and the 2-player cloud leaderboard. | Real |
| `/cycle` | Period tracker. | Sample shell |
| `/countdown` | Countdown to shared events/dates. | Sample shell |
| `/meals` | Meal planning. | Sample shell |
| `/fitness` | Fitness tracker. | Sample shell |
| `/finance` | Shared finance tracker. | Sample shell |

**If your home-screen icon still opens the timer:** it was pointing at `/`, and `/` used to *be* the timer. `/` is now the hub — re-add the icon (or just navigate to `/timer` and re-save it) to get the timer back as a direct shortcut, or keep the hub shortcut and reach the timer from there.

---

## 🧭 Navigation

- **Drawer menu**, reachable from every route via the hamburger button (top-left). It lists all nine routes, grouped as Home / Focus (Timer, Flexible, Dashboard) / Life (Period, Countdown, Meals, Fitness, Finance). Closes on backdrop tap, the X, `Escape`, clicking a link, or swiping left; traps `Tab` while open; returns focus to the hamburger on close; locks body scroll.
- **Bottom bar** on mobile viewports (below 768px): four slots — Home, Timer, Flexible, Dashboard. The five Life sections are drawer-only by design; the bottom bar disappears above the 768px breakpoint.
- A timer left running in the background keeps ticking if you navigate elsewhere in the app and come back.

---

## 🎨 Design System: Macaron, Two Moods

One palette, applied two ways, governed by a single rule: **dark = actively focusing, light = everything else.**

- **Light / cream mood** — used by `/`, `/dashboard`, and all five Life shells. Includes `/dashboard`, deliberately, since reviewing your stats isn't "focusing."
- **Dark / plum mood** — used only by `/timer` and `/flexible`, the two routes where you're actively in a session.

Moods are carried by a `data-mood` attribute set on the App Router route-group layouts, `(life)` and `(focus)`. Each route group also sets its own `<meta name="theme-color">` so the mobile browser chrome (status bar / address bar) matches the page mood.

---

## 📲 Home-Screen Install

There's no `.apk` and no app store listing — home-screen install via the browser is the entire delivery mechanism. The app ships a web app manifest (`src/app/manifest.ts`) and a tomato icon set (192px, 512px, and a maskable 512px variant) so "Add to Home Screen" produces a proper standalone app icon on both Android and iOS.

---

## 🚀 Features

- **⏱️ Drift-Free Precision Timer**
  Powered by Web Workers, the timer never desyncs or pauses, even when your browser throttles inactive tabs.
- **⏲️ Flexible Stopwatch**
  An open-ended session mode for focus work that doesn't fit a fixed Pomodoro interval.
- **🎵 Integrated Media Players**
  Mutually exclusive, draggable, and resizable floating mini-players for both **Spotify** and **YouTube**, available on the focus routes.
- **🎨 Glassmorphic Theme Engine**
  Upload your own high-resolution background wallpapers for the focus routes. The UI adapts using frosted-glass panels (`backdrop-blur`). Backgrounds are saved locally via IndexedDB.
- **📊 Analytics Dashboard**
  `/dashboard` combines a **GitHub-style contribution heatmap**, weekly focus bar charts, and hub stat tiles, all rendered in the light macaron mood.
- **🏆 2-Player Cloud Leaderboard**
  Compete with a friend! Focus sessions sync in the background to Supabase, powering a leaderboard with **Today**, **This Week**, and **This Year** views.
- **🔐 Shared Secret Authentication**
  A password-protected gatekeeper secures the whole app. No Supabase Auth needed — just a shared secret verified server-side with rate limiting and timing-safe comparison.
- **🔄 Offline-First Background Sync**
  Sessions are always saved locally first (Dexie.js). A background sync engine pushes unsynced records to the cloud when connectivity is available. Never lose a session.
- **🗂️ Five Life Sections (Preview)**
  Period, Countdown, Meals, Fitness, and Finance are fully styled and reachable from the drawer today, but store nothing — every value shown is `Sample`-tagged placeholder data.
- **📲 Installable Home-Screen App**
  A web app manifest and tomato icon set make the app installable to a phone home screen with no app store involved.
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

**Key principle:** Dexie.js is the single source of truth for the timer and local analytics. Supabase is a passive sync target that feeds the leaderboard. This applies to the timer, stopwatch, and dashboard — the five Life shells don't persist anywhere yet.

---

## 🛠️ Tech Stack

### Core
- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) & React 19, using route groups `(focus)` and `(life)` to carry the two macaron moods
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (macaron design tokens, glassmorphism, backdrop-blurs, custom radii)
- **Icons:** [Lucide React](https://lucide.dev/)

### Navigation & Install
- **Drawer + bottom bar:** `src/components/nav/NavDrawer.tsx`, `src/components/nav/AppNav.tsx`, `src/components/nav/navLinks.ts`
- **Home-screen install:** `src/app/manifest.ts` (web app manifest) + `src/components/InstallPrompt.tsx`

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
- **Input sanitization** — task names truncated/stripped, durations clamped to `[1, 1440]` (24h, for long flexible sessions).
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
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
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

If you already created the table with the old `<= 120` check (before flexible long sessions), run this migration so 200+ minute sessions can sync:

```sql
ALTER TABLE focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_duration_minutes_check;

ALTER TABLE focus_sessions
  ADD CONSTRAINT focus_sessions_duration_minutes_check
  CHECK (duration_minutes > 0 AND duration_minutes <= 1440);
```

### 4. Run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser — you'll land on the hub (`/`), not the timer. The timer is at `/timer`.

> If you've been running a long-lived `npm run dev` process from before a recent change, restart it. A stale Turbopack process on port 3000 has been observed serving outdated CSS.

### 5. Install to a Home Screen
Open the app in your phone's browser (Chrome on Android, Safari on iOS) and use **Add to Home Screen**. There's no app-store build — this is the only distribution path.

### 6. The Native Desktop Experience (Windows)
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
│   ├── (focus)/           # Dark-plum route group
│   │   ├── timer/         # Pomodoro timer (moved from /)
│   │   └── flexible/      # Stopwatch
│   ├── (life)/            # Cream route group
│   │   ├── page.tsx       # Home hub (live focus stats)
│   │   ├── dashboard/     # Charts, heatmap, leaderboard
│   │   ├── cycle/         # Sample shell
│   │   ├── countdown/     # Sample shell
│   │   ├── meals/         # Sample shell
│   │   ├── fitness/       # Sample shell
│   │   └── finance/       # Sample shell
│   ├── actions/           # Server Actions (auth, clearSessions)
│   └── manifest.ts        # Web app manifest (home-screen install)
├── components/
│   ├── nav/                # Drawer + bottom bar + link config
│   ├── Gatekeeper.tsx       # Auth gate (password + identity)
│   ├── HubGrid.tsx          # Hub tiles + live stats
│   ├── InstallPrompt.tsx    # Home-screen install prompt
│   ├── Leaderboard.tsx      # Cloud leaderboard (Today/Week/Year)
│   ├── TimerDisplay.tsx     # Timer UI
│   ├── FlexibleDisplay.tsx  # Stopwatch UI
│   ├── Controls.tsx         # Play/Pause/Skip controls
│   ├── SettingsModal.tsx    # Timer settings (slider + number input)
│   ├── AudioPlayer.tsx      # Floating Spotify/YouTube player
│   └── ThemeModal.tsx       # Background theme picker (focus routes)
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
  <i>Built for focus. Growing into a shared life dashboard.</i>
</div>
