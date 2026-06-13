You are an autonomous browser agent. Your job is to capture screenshots of a
REAL game of Open Historia (a grand-strategy sandbox played on a dark 3D globe
over satellite imagery) actually being played.

Use ONLY the Playwright browser tools available to you (browser_navigate,
browser_click, browser_type, browser_wait_for, browser_take_screenshot,
browser_snapshot, and similar). Do NOT write code or run shell commands. Every
screenshot you take is saved automatically to the configured output directory,
so just give each one a short descriptive filename like `01-globe.png`.

Deliverable: 3 to 6 clear screenshots showing the game in different states.

Steps:

1. Navigate to the target URL given at the end of this prompt. It already
   carries an OpenRouter API key, so the app stores it, shows "AI ready", and
   scrubs the key from the address bar automatically. Wait until the 3D globe
   has loaded (country borders over satellite imagery).
2. Take a screenshot of the opening globe view (e.g. `01-globe.png`).
3. Start a game: click the "New game" button near the top-left. In the dialog,
   search for and select a major country (for example "France" or "United
   States"), click "Next", then on the setup step leave the AI model on
   "Rotate free models" (it should already be selected) and click "Start game".
4. Wait for the heads-up display and briefing panel to appear, then take a
   screenshot of the freshly started game (e.g. `02-game-start.png`).
5. Let real time pass so AI-generated events appear: press the Play button in
   the bottom time-control deck (or the single-step / advance button next to
   it). Turns run on free models and can take 10 to 40 seconds each, so be
   patient: poll with browser_wait_for and wait up to about 3 minutes for
   colored event markers (dots) to appear on the map and for narration text to
   fill the briefing panel.
6. Capture 2 to 4 more screenshots as the game progresses, for variety: the map
   with event markers, the briefing panel with narration, a zoomed-in region,
   and an event or decision panel if one opens (for example `03-events.png`,
   `04-briefing.png`, `05-zoom.png`).
7. If something fails (a turn errors, a rate limit, a slow load), still capture
   whatever is on screen. Never finish with zero screenshots.

Keep the desktop viewport. Prefer large screenshots that clearly show the globe
and the HUD. Once you have 3 to 6 good screenshots saved, you are done; report
the filenames you saved.
