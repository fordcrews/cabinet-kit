# Cabinet Kit

Phone-browser card cabinet. Short sessions, big buttons, no App Store, no accounts, no ads, no IAP. Remix by duplicating JSON.

v0 ships one playable sample — **Run 21** — plus an author format so a second game is a file drop, not a rewrite.

## Play on a phone

1. Serve the folder over **http** (not `file://` — service workers need an origin).
2. Open the page in Safari or Chrome.
3. Add to Home Screen for the standalone PWA.
4. Tap **Run 21**. HIT / STAY. DEAL again. **CABINET** returns to the menu.

Works offline after the first load (service worker + manifest).

## How to run

From this directory:

    python3 -m http.server 8080
    # or: npx serve

Then visit http://localhost:8080 on the computer or http://<lan-ip>:8080 on a phone.

GitHub Pages later: enable Pages on main (root). .nojekyll is included so static files are served as-is. Relative URLs work at / or /cabinet-kit/.

## Run 21 (sample)

Original rules, not a licensed cabinet clone.

- Standard 52-card deck, shuffled. Unicode suits.
- Face cards = 10. Aces = 11 unless that busts the target, then 1.
- Deal two cards face up.
- HIT draws. STAY banks the hand total.
- Goal: as close as possible to 21 without going over.
- Bust (>21) scores 0 for that round.
- A two-card 21 is a Run: target + runBonus (default 21+5=26). Hitting to 21 later is just 21, not a Run.
- After STAY, bust, or a Run: result is shown, points add to the session, DEAL AGAIN.
- When the shoe has fewer than thinDeck cards (default 10), leftover + discard are shuffled back in. If both piles are empty, a fresh 52 is built.
- Player vs target 21. No dealer in v0.

Session score and round count stay on the marquee until you leave for the cabinet.

## How to add a second game

1. Duplicate games/run21.json (or write a new file).
2. Change id, title, labels, target, runBonus, copy.
3. Add the filename to games/index.json games array.
4. Reload. The cabinet lists every file in that index.

v0 engine only plays type run21. Other types need js/engine.js and js/app.js extended. Copy and scoring knobs stay in JSON.

## JSON fields

Documented from games/run21.json. Unknown extra fields are ignored.

games/run21.json:
- id (string): Hash route id. Unique.
- type (string): Engine key. v0: run21 only.
- title (string): Cabinet row + in-game marquee.
- tagline (string): Subtitle on the cabinet button.
- blurb (string): Longer description (optional).
- target (number): Bust line and Run total (21).
- runBonus (number): Extra points on a two-card target.
- thinDeck (number): Reshuffle when remaining shoe is below this.
- startingCards (number): Cards dealt to start a round (2).
- labels.hit stay deal again back: Button copy.
- labels.bust run stayOk: Banner prefixes.
- labels.score round total deck: HUD captions.
- copy.idle playing bust run stay: Status explanations.

games/index.json:
- games (string array): Filenames under games/ to list. Order is menu order.

## Tests

Engine is pure JS. Browser: window.CabinetEngine. Node: module.exports.

    node --test tests/engine.test.js

Covers bust, 21, ace 1-vs-11, face cards, Run bonus, stay scoring, thin/empty deck reshuffle.
