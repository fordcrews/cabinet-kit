# Cabinet Kit

Phone-browser card cabinet. Short sessions, big buttons, no App Store, no accounts, no ads, no IAP. Remix by duplicating JSON.

v0.2 ships three playable samples — **Run 21**, **Zip 21**, and **Chug 21** — plus an author format so another title is a file drop, not a rewrite.

## Play on a phone

1. Serve the folder over **http** (not `file://` — service workers need an origin).
2. Open the page in Safari or Chrome.
3. Add to Home Screen for the standalone PWA.
4. Tap a game on the cabinet. **CABINET** returns to the menu.

GitHub Pages: https://fordcrews.github.io/cabinet-kit/

Works offline after the first load (service worker + manifest).

## How to run

From this directory:

    python3 -m http.server 8080
    # or: npx serve

Then visit http://localhost:8080 on the computer or http://<lan-ip>:8080 on a phone.

    node --test tests/engine.test.js tests/columns.test.js

GitHub Pages: enable Pages on main (root). .nojekyll is included so static files are served as-is. Relative URLs work at / or /cabinet-kit/.

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

## Zip 21

Four lanes. One incoming card. Tap a column to drop it.

- Same 52-card shoe and soft aces as Run 21.
- Clear a lane on exact 21 (score + target, plus optional clearBonus).
- Five cards under 21 also clear (score + that total).
- Over 21 busts the lane: penalty (default 10), lane empties, the incoming card is consumed — it does not stay.
- Three SKIPs: toss the incoming card and draw the next.
- Play through one shoe. When the last card is placed or skipped, the sitting is done.
- If skips are gone you can still tap a lane and take the bust.

## Chug 21

Same engine as Zip (`columns21`) with different JSON knobs: five wells, one spill, mug pieces.

- Values still come from a 52-card shoe (A = 11/1 soft, faces = 10) but render as gold/cream mugs with the rank.
- **Chug** a 21. **Spill** once to pass on a mug. A slosh over 21 dumps the well.

## How to add a game

1. Duplicate a JSON file under `games/` (run21, zip21, or chug21).
2. Change id, title, labels, copy, and the knobs for that type.
3. Add the filename to `games/index.json` games array.
4. Reload. The cabinet lists every file in that index.

Engine keys: `run21` (HIT/STAY) and `columns21` (place/skip). Copy and scoring knobs stay in JSON.

## JSON fields

Unknown extra fields are ignored.

Shared:
- id (string): Hash route id. Unique. Played at `#/play/:id`.
- type (string): `run21` or `columns21`.
- title, tagline, blurb: Cabinet row + in-game marquee.
- target (number): Bust line (21).
- thinDeck (number): Run 21 reshuffles under this. Columns games default 0 (one shoe, then done).
- labels / copy: Button and banner strings.

Run 21 extras: runBonus, startingCards, labels.hit stay deal again, copy.idle playing bust run stay.

Columns 21 extras:
- columns (number): Lane count. Zip 4, Chug 5.
- skips (number): Passes. Zip 3, Chug 1.
- maxCards (number): Five-under clear (5).
- bustPenalty (number): Points lost on a bust (10). Column empties.
- clearBonus (number): Extra on an exact target clear (0).
- piece (`card` | `mug`): Playing-card faces vs numbered mugs.
- labels.skip / clear / skips / incoming.
- copy.playing clear bust skip done.

games/index.json:
- games (string array): Filenames under games/. Order is menu order.

## Tests

Engine is pure JS. Browser: window.CabinetEngine. Node: module.exports.

    node --test tests/engine.test.js tests/columns.test.js

Run 21: bust, 21, ace 1-vs-11, face cards, Run bonus, stay scoring, thin/empty deck reshuffle.

Columns: exact 21 clear, five-under clear, bust penalty empties the lane, skip decrements, cannot skip at 0, soft ace in a column, Zip/Chug column counts from JSON.
