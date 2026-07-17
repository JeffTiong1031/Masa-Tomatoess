# Theme assets

Still image presets live in this folder (`cafe.png`, `dark.png`, `nature.png`).

Curated **live** backgrounds (`live:rain-city`, `live:ocean-dusk`, `live:aurora`) are rendered as lightweight CSS motion loops in the app so phones and iPads stay performant. Users can upload their own **images or videos** (MP4/WebM); uploads are stored only in IndexedDB on the current device.

When motion is reduced, Save-Data is on, or the connection is very slow, live loops fall back to static gradient/poster frames.
