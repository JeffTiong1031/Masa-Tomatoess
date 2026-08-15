import { isFocusRoute } from '@/components/nav/navLinks';

/** Which backdrop a route gets.
 *
 *  - `themed`  the user's chosen photo / video / live gradient, under a
 *              light veil
 *  - `plain`   the cream field with pastel accent blobs
 */
export type BackgroundField = 'themed' | 'plain';

/** Routes that paint the user's CHOSEN background: the three Focus
 *  widgets.
 *
 *  The dashboard is here by request, having previously been excluded on
 *  the theory that a wallpaper competes with cards of data. It does not,
 *  now that the veil is gone and the cards are fully opaque -- the photo
 *  reads as the surround rather than as something the cards are fighting.
 *
 *  Calendar and Timeline stay on the plain field: they are not part of a
 *  focus session, and the wallpaper is the session's furniture. */
const THEMED_ROUTES = ['/study/timer', '/study/flexible', '/study/dashboard'];

/** Kept out of BackgroundManager so it can be asserted directly -- the
 *  component pulls in next/navigation and the timer store, which is far
 *  too much machinery to stand up just to ask what colour the page is.
 *
 *  There is no dark branch any more. Every route in the app renders
 *  data-mood="light" now, Study included, so the wallpapered routes are
 *  the only ones that differ -- and they differ by carrying a photo,
 *  not by carrying a different mood. */
export function backgroundFieldFor(pathname: string): BackgroundField {
  const isThemed = THEMED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  return isThemed ? 'themed' : 'plain';
}

/** A wallpaper is only ever offered from inside Focus, so every themed
 *  route must be a Focus route. Exported so that stays an assertion
 *  rather than a comment -- moving /study/timer without moving this
 *  list would otherwise strand the theme picker on a route that has no
 *  wallpaper to pick. */
export function themedRoutesAreFocusRoutes(): boolean {
  return THEMED_ROUTES.every((route) => isFocusRoute(route));
}
