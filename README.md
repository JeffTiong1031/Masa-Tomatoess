<div align="center">

<img src="public/icon-512.png" width="96" alt="Masa Tomato" />

# Masa Tomato

**A shared life dashboard for two people.**
Grew out of a Pomodoro timer. Still starts with one.

[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-sync-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/Install-home_screen-EF9A8D)](src/app/manifest.ts)

*Cream walls. One pastel per room. One password for the house.*

</div>

---

One home screen for Jeff and Rachel. You pick a name at the door, type the shared secret, and land on **today** — the weekday, what's on, how many focus minutes you've already banked, and eight coloured doors into the rest of the house.

The phone is the source of truth. Sessions and notes write locally first. The cloud catches up when it can, so a timer still finishes on a train and the leaderboard reconciles later.

---

## The house

Home is the front door. Everything else is a room.

| | Room | What you do | Status |
| :---: | --- | --- | :---: |
| 🍅 | **Study** | Drift-free Pomodoro, open stopwatch, heatmap + 2-player leaderboard | Live |
| 📅 | **Timetable** | Week grid, the day's itinerary, and a shared to-do list | Live |
| 🗓️ | **Calendar** | Shared events. Pin the ones that matter; they rotate on Home | Live |
| 💗 | **Period** | Cycle ring, calendar, symptoms — saved, not a mock | Live |
| ⏳ | **Countdown** | Dates you're counting down to, and days you're counting up | Live |
| 🍽️ | **Meals** | Snap a plate. The app guesses the dish; you confirm. A week can get a written review | Live |
| 💪 | **Fitness** | Styled preview. Nothing here saves yet | Preview |
| 💳 | **Finance** | Styled preview. Every figure is invented | Preview |

Study wears a **Timer / Flexible / Dashboard** pill. Timetable is the only room with a bottom bar — **Timetable / To-do**. A timer you leave running keeps ticking if you walk into another room.

Old bookmarks still work: `/study/calendar` → `/calendar`, `/study/timetable` → `/timetable`, `/todo` → `/timetable/todo`.

---

## Always nearby

| | |
| --- | --- |
| **Notes** | Press `N`, or open them from the Home menu. A floating pad on a wide screen, a sheet on a phone. Local first, then synced. |
| **Helper** | On Calendar and To-do, talk in plain English. It shows a plan. Nothing changes until you say yes. |
| **Music** | Spotify or YouTube, floating on Study — one at a time, drag and resize. |
| **Wallpaper** | Your photo, on Study only. If a thing has words, it sits on a panel. Never on the picture. |

---

## How it remembers

```
you type / tap  →  this phone (IndexedDB)  →  Supabase, when the network is there
```

Dexie holds focus sessions, notes, and queued meal photos. Supabase is the shared backup — leaderboard, calendar, timetable, to-dos, period, meals, countdowns.

The door is one shared password, checked on the server. Five misses and it locks for 15 minutes. There are no per-person accounts.

---

## Run it

```bash
git clone https://github.com/JeffTiong1031/Masa-Tomatoess.git
cd Masa-Tomatoess
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
APP_PASSWORD=your_shared_secret
GEMINI_API_KEY=your_gemini_key          # meals + the Calendar / To-do helper
SUPABASE_SERVICE_ROLE_KEY=optional      # only for wiping sessions from the server
```

Cloud tables live in `docs/superpowers/specs/` — run every `*-setup.sql`. Meals also need a Storage bucket named `meal-photos`. Focus sessions use this table (it isn't in that folder):

<details>
<summary>focus_sessions SQL</summary>

```sql
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL
    CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  task_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON focus_sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous reads" ON focus_sessions
  FOR SELECT TO anon USING (true);
```

</details>

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You land on Home. The timer is at `/study/timer`.

**Phone.** Chrome or Safari → Add to Home Screen. That is the whole install. No store listing.

**Windows.** Double-click `PomodoroOS.vbs` — the server starts quietly and the browser opens. `StopMasaTomato.bat` shuts it down.

---

<div align="center">

Next.js 16 · React 19 · Tailwind 4 · Zustand · Dexie · Supabase · Gemini

<br/>

*Built for two. Open on a phone. Still a tomato.*

</div>
