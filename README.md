# Cabinet Kit

Phone-browser card cabinet. Short sessions, big buttons, no App Store, no accounts, no ads, no IAP. Remix by duplicating JSON.

v0.19 ships seventeen playable samples — **Run 21**, **Zip 21**, **Chug 21**, **11 Up**, **Solitaire**, **FreeCell**, **Spider**, **Yacht**, **Sudoku 6**, **Sudoku 9**, **Blast**, **Triple**, **Chime**, **Reversi**, **Hoops**, **Orbit**, and **Quiz Night** — plus an author format so another title is a file drop, not a rewrite. The cabinet list is grouped by category (Card, Puzzle, Match, Strategy, Sports, Quiz).

## Play on a phone

1. Serve the folder over **http** (not `file://` — service workers need an origin).
2. Open the page in Safari or Chrome.
3. Add to Home Screen for the standalone PWA.
4. Tap a game on the cabinet. **CABINET** returns to the menu.

GitHub Pages: https://fordcrews.github.io/cabinet-kit/

Works offline after the first load (service worker + manifest).

Arcade blips are synthesized in the browser with the Web Audio API — no MP3/WAV/OGG files, so GitHub Pages stays static and works offline. A **SOUND** / **MUTED** toggle sits in the marquee on the cabinet and in every game (saved in localStorage). iOS Safari stays silent until a tap (the mute button or any game control) unlocks audio.



## Sets

See [SETS.md](SETS.md) for SET 3/4/5, parity scoring, and top-3 boards.

## How to run

From this directory:

    python3 -m http.server 8080
    # or: npx serve

Then visit http://localhost:8080 on the computer or http://<lan-ip>:8080 on a phone.

    node --test tests/*.test.js

GitHub Pages: enable Pages on main (root). .nojekyll is included so static files are served as-is. Relative URLs work at / or /cabinet-kit/.
