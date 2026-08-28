# Cabinet Kit

Phone-browser card cabinet. Short sessions, big buttons, no App Store, no accounts, no ads, no IAP. Remix by duplicating JSON.

v0.7 ships ten playable samples — **Run 21**, **Zip 21**, **Chug 21**, **11 Up**, **Power Solitaire**, **Yacht**, **Sudoku 6**, **Reversi**, **Hoops**, and **Quiz Night** — plus an author format so another title is a file drop, not a rewrite. The cabinet list is grouped by category (Card, Puzzle, Strategy, Sports, Quiz).

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

    node --test tests/*.test.js

GitHub Pages: enable Pages on main (root). .nojekyll is included so static files are served as-is. Relative URLs work at / or /cabinet-kit/.

## Run 21 (sample)

Original-style five-lane play, not a licensed cabinet clone.

- Standard 52-card shoe per round, shuffled. Unicode suits. Face cards = 10. Soft aces (11 unless that busts, then 1).
- Sort face-up incoming cards into **5 columns** without exceeding 21 in any column.
- Tap a lane to place the incoming card. One **SKIP** discards it and draws the next.
- Under 21: cards stay, lane stays open.
- Exact 21: lane **locks** (complete). Cards stay visible. Two-card 21 can show as a **RUN** (still worth 21 toward 105 unless JSON `runBonus` > 0; default 0).
- Over 21: that lane **locks as bust**, scores 0, incoming is consumed. Busted cards stay visible (the lane is not emptied like Zip).
- **STAY** on an open lane locks it at the current total. Cannot place onto a locked lane.
- Score = sum of the 5 column totals. Bust columns count 0. Perfect is **105** (5×21).
- Round ends when all 5 lanes are locked (21, stay, or bust) **or** the shoe is empty (remaining open lanes lock at current totals).
- **DEAL AGAIN** starts a fresh 5 empty lanes and a new shuffled shoe. Session score can accumulate round totals.

The HIT/STAY single-hand helpers remain in the engine for tests; the cabinet plays Run 21 as five lanes (`type` `runlanes`).

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


## 11 Up

Original pair-off table. Not a licensed cabinet clone.

- Standard 52-card shoe. A = 1, 2–10 pip. Jacks, Queens, Kings are faces.
- 4×4 grid. Deal 12 face-up cards (4 empty cells). The rest of the shoe is the stock.
- Tap two **open** cards (anything on the grid in v0) that make 11:
  - Number cards whose values **sum to 11** (A+10, 2+9, 3+8, 4+7, 5+6).
  - Two of the **same face** (two Jacks, two Queens, two Kings). J+Q is not a pair.
- A legal pair is removed for **+pairScore** (default 11). An illegal second tap deselects.
- **NEXT CARD** drops the next stock card into the first empty cell and subtracts **passPenalty** (default 5). Disabled when the grid is full or the stock is empty.
- **TAKE SCORE** banks the round. If the grid is fully empty, add **clearBonus** (default 50).
- **DEAL AGAIN** after a take deals a fresh 12-card grid.

## Power Solitaire

Klondike with a boost. Original rules, not a branded clone.

- Ranks **A, 2–10, J** only. No Kings or Queens. Jacks are high.
- **3 decks** at once (132 cards). Tableau is a 7-column Klondike deal from a mixed shoe (28 cards: 1…7, top face-up, rest face-down and flip when uncovered). Remainder splits into **3 stock piles**. Each stock top is face-up. Empty stocks stay empty (no recycle in v0).
- Tableau builds **descending rank, alternating color**. Empty column: **only a Jack**.
- Four suit foundations. Each well climbs A→J three times in sequence (max 33 per suit; next rank is count % 11). Win when all **132** cards are home.
- v0 moves **single cards** only (JSON `moves: "single"`). Tap a stock top or tableau top, then a destination (tableau column or foundation).
- Score **+foundationScore** (default 10) per card to a foundation.
- **DEAL AGAIN** reshuffles. **CABINET** returns to the menu.

## Yacht

Public-domain five-dice scorecard (not a licensed clone). Original felt/gold cabinet UI.

- Five dice, **3 rolls** per turn. First **ROLL** throws all five. Tap a die to **HOLD** / unhold; later rolls reroll only unheld dice.
- Thirteen turns. Each category is used once. Scratching (score 0) is allowed.
- **Upper:** Aces through Sixes = sum of that face. If the upper subtotal is **≥ 63**, add **+35** bonus.
- **Lower:** 3 of a kind = sum of all dice if at least three match; 4 of a kind = sum if at least four match; Full house **25** (three + two); Small straight **30** (four consecutive); Large straight **40** (five consecutive); **YACHT** (five of a kind) **50**; Chance = sum of all dice.
- After you tap a category, a new turn starts (rolls reset, holds clear) until all 13 boxes are filled. Then **DEAL AGAIN** starts a fresh card.
- HUD shows **TURN n/13** and **ROLLS LEFT**. Buttons: **ROLL**, **CABINET**, and **DEAL AGAIN** when the card is done.

## Sudoku 6

6×6 puzzle. Digits 1–6 in 2×3 boxes. Original cabinet rules, not a branded clone.

- Tap an empty cell, then 1–6 or **CLEAR**. Given cells stay locked.
- A duplicate in a row, column, or 2×3 box is marked. Win when the grid matches the solution (or is a valid complete fill).
- Score +1 per puzzle cleared. **DEAL AGAIN** loads the next puzzle in the JSON bank (five shipped).

## Reversi

8×8 disc flip. Dark (you) moves first; light is a greedy max-flips AI. Title is **Reversi**, not a trademarked name.

- Opening: four discs in the center. Legal squares are marked. Tap one to place and flip the sandwich.
- If a side has no legal move it passes. Game ends when both cannot move. Score is disc counts. **DEAL AGAIN** resets the board.
- Phone cells stay at least ~36px; landscape sizes the board to width.

## Hoops

Timing tap. A rim slides; tap **SHOOT** when the ball sits inside the window.

- Ten shots a sitting. A make is +2, +3 when the rim is farther out.
- Miss if the aim is outside `[rimX − w, rimX + w]`. **DEAL AGAIN** after ten.

## Quiz Night

Mixed trivia and jumble rounds from JSON. Four big answer buttons.

- Trivia +10, jumble +15. One question at a time, then **NEXT**.
- Twelve questions a sitting (from a bank of 20+ trivia and 8+ jumbles). **TAKE SCORE** / **DEAL AGAIN** when the sitting is over.

## How to add a game

1. Duplicate a JSON file under `games/` (run21, zip21, chug21, elevenup, powersol, yacht, sudoku6, reversi, hoops, or quiznight).
2. Change id, title, labels, copy, and the knobs for that type.
3. Add the filename to a category `games` array in `games/index.json` (or the flat `games` array if you are not using categories).
4. Reload. The cabinet groups rows under category headings.

Engine keys: `runlanes` (Run 21 five-lane place/stay/skip), `columns21` (Zip / Chug place/skip, columns still clear), `elevenup` (11 Up pairs), `powersol` (Power Solitaire), `yacht` (Yacht five-dice scorecard), `sudoku6`, `reversi`, `hoops`, `quiznight`, and `run21` (HIT/STAY helpers). Copy and scoring knobs stay in JSON.

## JSON fields

Unknown extra fields are ignored.

Shared:
- id (string): Hash route id. Unique. Played at `#/play/:id`.
- type (string): `runlanes`, `columns21`, `elevenup`, `powersol`, `yacht`, `sudoku6`, `reversi`, `hoops`, `quiznight`, or `run21`.
- title, tagline, blurb: Cabinet row + in-game marquee.
- target (number): Bust line (21).
- thinDeck (number): Run 21 reshuffles under this. Columns games default 0 (one shoe, then done).
- labels / copy: Button and banner strings.

Run 21 (`runlanes`) extras: columns (5), skips (1), perfect (105), runBonus (0), piece (`card`), labels.stay skip again, copy.playing bust run stay skip done complete perfect.

Run 21 HIT/STAY extras (engine `type` `run21`, not the cabinet sample): runBonus, startingCards, labels.hit stay deal again, copy.idle playing bust run stay.

Columns 21 extras:
- columns (number): Lane count. Zip 4, Chug 5.
- skips (number): Passes. Zip 3, Chug 1.
- maxCards (number): Five-under clear (5).
- bustPenalty (number): Points lost on a bust (10). Column empties.
- clearBonus (number): Extra on an exact target clear (0).
- piece (`card` | `mug`): Playing-card faces vs numbered mugs.
- labels.skip / clear / skips / incoming.
- copy.playing clear bust skip done.


11 Up (`elevenup`) extras: pairScore (11), passPenalty (5), clearBonus (50), cells (16), dealCount (12), labels.next take stock, copy.playing pair illegal next take clear done full.

Power Solitaire (`powersol`) extras: foundationScore (10), columns (7), decks (3), moves (`single`), labels.home stock again, copy.playing move foundation illegal won.

Yacht (`yacht`) extras: upperBonus (35), upperThreshold (63), fullHouse (25), smallStraight (30), largeStraight (40), yacht (50), rolls (3), labels.roll hold aces…sixes threekind fourkind fullhouse smallstraight largestraight yacht chance, copy.idle playing mustScore done.

Sudoku 6 (`sudoku6`) extras: puzzles (array of `{ puzzle, solution }` 36-char strings, 0 = empty), clearScore (1).

Reversi (`reversi`): 8×8, no extra knobs required.

Hoops (`hoops`) extras: shots (10), rimW (10), makePoints (2), longPoints (3).

Quiz Night (`quiznight`) extras: questions (`q`, `choices[4]`, `answerIndex`, `kind` trivia|jumble), sitting (12), triviaPoints (10), jumblePoints (15).

games/index.json:
- categories (array): `{ id, title, games }` groups. Heading per category on the cabinet.
- games (string array, fallback): Filenames under games/. Used if `categories` is missing.

## Tests

Engine is pure JS. Browser: window.CabinetEngine. Node: module.exports.

    node --test tests/*.test.js

Run 21 HIT/STAY engine: bust, 21, ace 1-vs-11, face cards, Run bonus, stay scoring, thin/empty deck reshuffle.

Run lanes: 5 columns from JSON, one skip then skip at 0 throws, place under 21 stays open, 21 locks with cards still showing, bust locks and scores 0, stay locks at current total, cannot place on locked, all five locked ends the round, deal again resets lanes.

Columns: exact 21 clear, five-under clear, bust penalty empties the lane, skip decrements, cannot skip at 0, soft ace in a column, Zip/Chug column counts from JSON.

11 Up: 5+6 and A+10 legal, 2+8 illegal, two Jacks legal, J+Q illegal, next fills empty and penalizes, take on a clear adds bonus, cannot next if the grid is full.

Power Solitaire: no K/Q in the 132-card shoe, Jack only on empty column, alt-color descending, foundation A then 2 of the same suit, stock tap moves to a legal tableau.

Yacht: roll yields five dice 1–6, hold keeps a face on the next roll, a fourth roll throws, aces sum ones, full house 25 / junk 0, small straight 30 / large 40, yacht 50, a category cannot be scored twice, upper bonus at 63, thirteen scores then done.

Sudoku 6: given cells are locked, a duplicate in a row is invalid, a completed correct grid wins, 2×3 boxes reject duplicates.

Reversi: opening four center discs, a known flip, occupied squares reject, AI returns a legal index.

Hoops: shoot inside the window scores, outside misses, ten shots ends the sitting.

Quiz Night: correct increments, wrong does not, jumble uses jumblePoints.
