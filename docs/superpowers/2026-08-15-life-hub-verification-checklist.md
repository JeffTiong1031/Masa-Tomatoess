## Human verification checklist

The app sits behind a shared-password Gatekeeper (`APP_PASSWORD`). I did not enter that password and did not attempt to bypass it, so everything below needs a human with the real password, on the real devices, on a fresh dev server.

**First: restart the dev server before doing any of this.** A long-running Turbopack process on port 3000 was observed serving stale CSS during this work — kill any existing `npm run dev` and start fresh, or the visual checks below may show outdated styling.

1. **All nine routes render.** Log in, then visit `/`, `/timer`, `/flexible`, `/dashboard`, `/cycle`, `/countdown`, `/meals`, `/fitness`, `/finance` directly by URL. Correct result: each loads without error.

2. **Two-mood check.** With all nine open, confirm `/timer` and `/flexible` render dark plum (dark background, light text) and the other seven — `/`, `/dashboard`, `/cycle`, `/countdown`, `/meals`, `/fitness`, `/finance` — render light cream. Correct result: exactly two dark routes, seven light routes, no mixing.

3. **Drawer reachability.** From each of the nine routes, tap the hamburger (top-left). Correct result: the drawer opens every time and lists links to all nine routes, grouped Home / Focus / Life.

4. **Drawer close behaviours**, tested one at a time from any route with the drawer open:
   - Tap the backdrop (outside the panel) → closes.
   - Tap the X / close button → closes.
   - Press `Escape` → closes.
   - Tap any link inside the drawer → closes and navigates.
   - Swipe left on the panel (touch device or touch emulation) → closes.
   Correct result: all five close the drawer; the link-click case also navigates to the right route.

5. **Drawer accessibility.** Open the drawer, press `Tab` repeatedly. Correct result: focus cycles only among elements inside the drawer (X button, links) and never escapes to the page behind it. Close the drawer (any method) and check focus. Correct result: focus lands back on the hamburger button. While the drawer is open, try scrolling the page behind it. Correct result: the page underneath doesn't scroll.

6. **Bottom bar breakpoint.** Resize the browser (or use device emulation) from wide down through 768px. Correct result: at widths ≥768px, no bottom bar is visible; below 768px, a four-slot bottom bar appears with Home, Timer, Flexible, Dashboard only (no Life-section slots).

7. **Timer survives navigation.** On `/timer`, start a session. Navigate to `/finance` (or any other route) via the drawer, wait a few seconds, then navigate back to `/timer`. Correct result: the countdown has kept running the whole time — it should show elapsed time consistent with continuous ticking, not a reset or a pause.

8. **Hub numbers match dashboard.** Note the stats shown on the hub (`/`). Open `/dashboard`. Correct result: the same underlying focus totals are reflected in both places (allowing for different presentation/formatting).

9. **Sample chips on all five shells.** Visit `/cycle`, `/countdown`, `/meals`, `/fitness`, `/finance`. Correct result: every block of demonstration data on each page carries a visible "Sample" chip — nothing on these five pages should look like real, saved data.

10. **Status bar colour on a real phone.** On an actual Android or iPhone (not desktop emulation), open `/` and note the browser/status-bar colour, then open `/timer` and compare. Correct result: the colour visibly differs between the two (cream vs. dark plum), confirming the `theme-color` meta tag is being picked up per-route-group.

11. **Gatekeeper readability.** Clear `localStorage.user_name` (e.g. via DevTools console: `localStorage.removeItem('user_name')`) and reload. Correct result: the login/identity screen is legible on its cream background — text has real contrast, nothing is washed out or illegible.

12. **Real-device install.** On a real Android phone, use Chrome's "Add to Home Screen" / install prompt. Correct result: a Masa Tomato icon appears on the home screen and launches the app standalone (no browser chrome). Repeat on a real iPhone using Safari's "Add to Home Screen." Correct result: same outcome — a home-screen icon that launches standalone.

13. **Tell Rachel.** Separately from the app itself: let Rachel know her existing home-screen shortcut (which points at `/`) now opens the hub instead of the timer, since `/` changed meaning during this work.
