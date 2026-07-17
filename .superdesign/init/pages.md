# Page Dependency Trees

These trees include the route entry and the shared root layout because both are required to reproduce the rendered page. Third-party modules and Next.js internals are omitted. Dynamic local imports are included. Repeated files are shown where they enter each branch; each route's complete context-file set is summarized after its tree.

## `/` — Classic Timer

Entry: `src/app/page.tsx`

Dependencies:

```text
src/app/layout.tsx
├─ src/app/globals.css
└─ src/components/ClientProviders.tsx
   ├─ src/components/Gatekeeper.tsx
   │  ├─ src/app/actions/auth.ts
   │  └─ src/lib/sync.ts
   │     ├─ src/db/db.ts
   │     ├─ src/lib/supabase.ts
   │     └─ src/lib/sessionSync.ts
   └─ src/components/AppShell.tsx
      ├─ src/components/AppNav.tsx
      ├─ src/components/BackgroundManager.tsx
      │  └─ src/store/useTimerStore.ts
      │     ├─ src/db/db.ts
      │     ├─ src/lib/flexibleTime.ts
      │     └─ src/lib/sync.ts (dynamic)
      ├─ src/components/ThemeModal.tsx
      │  └─ src/store/useTimerStore.ts
      ├─ src/components/AudioPlayer.tsx
      │  ├─ src/store/useTimerStore.ts
      │  └─ src/utils/audioParser.ts
      ├─ src/components/AlarmPlayer.tsx
      │  ├─ src/store/useTimerStore.ts
      │  ├─ src/store/useFlexibleStore.ts
      │  │  ├─ src/db/db.ts
      │  │  ├─ src/lib/flexibleTime.ts
      │  │  ├─ src/store/useTimerStore.ts (dynamic)
      │  │  └─ src/lib/sync.ts (dynamic)
      │  └─ src/utils/alarmSounds.ts
      └─ src/components/TimerEngine.tsx
         ├─ src/store/useTimerStore.ts
         ├─ src/store/useFlexibleStore.ts
         └─ src/worker/timer.worker.ts

src/app/page.tsx
├─ src/components/TimerDisplay.tsx
│  └─ src/store/useTimerStore.ts
│     ├─ src/db/db.ts
│     ├─ src/lib/flexibleTime.ts
│     └─ src/lib/sync.ts (dynamic)
├─ src/components/Controls.tsx
│  ├─ src/store/useTimerStore.ts
│  ├─ src/components/SessionConflictDialog.tsx
│  └─ src/lib/sessionOwnership.ts
│     ├─ src/store/useTimerStore.ts
│     └─ src/store/useFlexibleStore.ts
│        ├─ src/db/db.ts
│        ├─ src/lib/flexibleTime.ts
│        ├─ src/store/useTimerStore.ts (dynamic)
│        └─ src/lib/sync.ts (dynamic)
└─ src/components/SettingsModal.tsx
   ├─ src/store/useTimerStore.ts
   └─ src/utils/alarmSounds.ts
```

Complete local context set:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/app/actions/auth.ts`
- `src/components/ClientProviders.tsx`
- `src/components/Gatekeeper.tsx`
- `src/components/AppShell.tsx`
- `src/components/AppNav.tsx`
- `src/components/BackgroundManager.tsx`
- `src/components/ThemeModal.tsx`
- `src/components/AudioPlayer.tsx`
- `src/components/AlarmPlayer.tsx`
- `src/components/TimerEngine.tsx`
- `src/components/TimerDisplay.tsx`
- `src/components/Controls.tsx`
- `src/components/SettingsModal.tsx`
- `src/components/SessionConflictDialog.tsx`
- `src/store/useTimerStore.ts`
- `src/store/useFlexibleStore.ts`
- `src/lib/flexibleTime.ts`
- `src/lib/sessionOwnership.ts`
- `src/lib/sync.ts`
- `src/lib/sessionSync.ts`
- `src/lib/supabase.ts`
- `src/db/db.ts`
- `src/utils/audioParser.ts`
- `src/utils/alarmSounds.ts`
- `src/worker/timer.worker.ts`

## `/flexible` — Flexible Timer

Entry: `src/app/flexible/page.tsx`

Dependencies:

```text
src/app/layout.tsx
├─ src/app/globals.css
└─ src/components/ClientProviders.tsx
   ├─ src/components/Gatekeeper.tsx
   │  ├─ src/app/actions/auth.ts
   │  └─ src/lib/sync.ts
   │     ├─ src/db/db.ts
   │     ├─ src/lib/supabase.ts
   │     └─ src/lib/sessionSync.ts
   └─ src/components/AppShell.tsx
      ├─ src/components/AppNav.tsx
      ├─ src/components/BackgroundManager.tsx
      │  └─ src/store/useTimerStore.ts
      ├─ src/components/ThemeModal.tsx
      │  └─ src/store/useTimerStore.ts
      ├─ src/components/AudioPlayer.tsx
      │  ├─ src/store/useTimerStore.ts
      │  └─ src/utils/audioParser.ts
      ├─ src/components/AlarmPlayer.tsx
      │  ├─ src/store/useTimerStore.ts
      │  ├─ src/store/useFlexibleStore.ts
      │  └─ src/utils/alarmSounds.ts
      └─ src/components/TimerEngine.tsx
         ├─ src/store/useTimerStore.ts
         ├─ src/store/useFlexibleStore.ts
         └─ src/worker/timer.worker.ts

src/app/flexible/page.tsx
├─ src/components/FlexibleDisplay.tsx
│  ├─ src/store/useFlexibleStore.ts
│  │  ├─ src/db/db.ts
│  │  ├─ src/lib/flexibleTime.ts
│  │  ├─ src/store/useTimerStore.ts (dynamic)
│  │  └─ src/lib/sync.ts (dynamic)
│  └─ src/lib/flexibleTime.ts
├─ src/components/FlexibleControls.tsx
│  ├─ src/store/useFlexibleStore.ts
│  ├─ src/components/SessionConflictDialog.tsx
│  └─ src/lib/sessionOwnership.ts
│     ├─ src/store/useTimerStore.ts
│     └─ src/store/useFlexibleStore.ts
└─ src/components/FlexibleSettingsModal.tsx
   ├─ src/store/useFlexibleStore.ts
   ├─ src/store/useTimerStore.ts
   │  ├─ src/db/db.ts
   │  ├─ src/lib/flexibleTime.ts
   │  └─ src/lib/sync.ts (dynamic)
   ├─ src/utils/alarmSounds.ts
   └─ src/lib/flexibleTime.ts
```

Complete local context set:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/flexible/page.tsx`
- `src/app/actions/auth.ts`
- `src/components/ClientProviders.tsx`
- `src/components/Gatekeeper.tsx`
- `src/components/AppShell.tsx`
- `src/components/AppNav.tsx`
- `src/components/BackgroundManager.tsx`
- `src/components/ThemeModal.tsx`
- `src/components/AudioPlayer.tsx`
- `src/components/AlarmPlayer.tsx`
- `src/components/TimerEngine.tsx`
- `src/components/FlexibleDisplay.tsx`
- `src/components/FlexibleControls.tsx`
- `src/components/FlexibleSettingsModal.tsx`
- `src/components/SessionConflictDialog.tsx`
- `src/store/useTimerStore.ts`
- `src/store/useFlexibleStore.ts`
- `src/lib/flexibleTime.ts`
- `src/lib/sessionOwnership.ts`
- `src/lib/sync.ts`
- `src/lib/sessionSync.ts`
- `src/lib/supabase.ts`
- `src/db/db.ts`
- `src/utils/audioParser.ts`
- `src/utils/alarmSounds.ts`
- `src/worker/timer.worker.ts`

## `/dashboard` — Analytics Dashboard

Entry: `src/app/dashboard/page.tsx`

Dependencies:

```text
src/app/layout.tsx
├─ src/app/globals.css
└─ src/components/ClientProviders.tsx
   ├─ src/components/Gatekeeper.tsx
   │  ├─ src/app/actions/auth.ts
   │  └─ src/lib/sync.ts
   │     ├─ src/db/db.ts
   │     ├─ src/lib/supabase.ts
   │     └─ src/lib/sessionSync.ts
   └─ src/components/AppShell.tsx
      ├─ src/components/AppNav.tsx
      ├─ src/components/BackgroundManager.tsx
      │  └─ src/store/useTimerStore.ts
      │     ├─ src/db/db.ts
      │     ├─ src/lib/flexibleTime.ts
      │     └─ src/lib/sync.ts (dynamic)
      ├─ src/components/ThemeModal.tsx
      │  └─ src/store/useTimerStore.ts
      ├─ src/components/AudioPlayer.tsx
      │  ├─ src/store/useTimerStore.ts
      │  └─ src/utils/audioParser.ts
      ├─ src/components/AlarmPlayer.tsx
      │  ├─ src/store/useTimerStore.ts
      │  ├─ src/store/useFlexibleStore.ts
      │  │  ├─ src/db/db.ts
      │  │  ├─ src/lib/flexibleTime.ts
      │  │  ├─ src/store/useTimerStore.ts (dynamic)
      │  │  └─ src/lib/sync.ts (dynamic)
      │  └─ src/utils/alarmSounds.ts
      └─ src/components/TimerEngine.tsx
         ├─ src/store/useTimerStore.ts
         ├─ src/store/useFlexibleStore.ts
         └─ src/worker/timer.worker.ts

src/app/dashboard/page.tsx
├─ src/db/db.ts
├─ src/components/Leaderboard.tsx
│  └─ src/lib/supabase.ts
├─ src/app/actions/clearSessions.ts
└─ src/lib/sync.ts
   ├─ src/db/db.ts
   ├─ src/lib/supabase.ts
   └─ src/lib/sessionSync.ts
```

Complete local context set:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/dashboard/page.tsx`
- `src/app/actions/auth.ts`
- `src/app/actions/clearSessions.ts`
- `src/components/ClientProviders.tsx`
- `src/components/Gatekeeper.tsx`
- `src/components/AppShell.tsx`
- `src/components/AppNav.tsx`
- `src/components/BackgroundManager.tsx`
- `src/components/ThemeModal.tsx`
- `src/components/AudioPlayer.tsx`
- `src/components/AlarmPlayer.tsx`
- `src/components/TimerEngine.tsx`
- `src/components/Leaderboard.tsx`
- `src/store/useTimerStore.ts`
- `src/store/useFlexibleStore.ts`
- `src/lib/flexibleTime.ts`
- `src/lib/sync.ts`
- `src/lib/sessionSync.ts`
- `src/lib/supabase.ts`
- `src/db/db.ts`
- `src/utils/audioParser.ts`
- `src/utils/alarmSounds.ts`
- `src/worker/timer.worker.ts`
