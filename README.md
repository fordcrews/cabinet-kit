# Cabinet Kit

Phone-browser card cabinet. Short sessions, big buttons, no App Store, no accounts, no ads, no IAP. Remix by duplicating JSON.

v0.18 ships seventeen playable samples — **Run 21**, **Zip 21**, **Chug 21**, **11 Up**, **Solitaire**, **FreeCell**, **Spider**, **Yacht**, **Sudoku 6**, **Sudoku 9**, **Blast**, **Triple**, **Chime**, **Reversi**, **Hoops**, **Orbit**, and **Quiz Night** — plus an author format so another title is a file drop, not a rewrite. The cabinet list is grouped by category (Card, Puzzle, Match, Strategy, Sports, Quiz).

## Play on a phone

1. Serve the folder over **http** (not `file://` — service workers need an origin).
2. Open the page in Safari or Chrome.
3. Add to Home Screen for the standalone PWA.
4. Tap a game on the cabinet. **CABINET** returns to the menu.

GitHub Pages: https://fordcrews.github.io/cabinet-kit/

Works offline after the first load (service worker + manifest).

Arcade blips are synthesized in the browser with the Web Audio API — no MP3/WAV/OGG files, so GitHub Pages stays static and works offline. A **SOUND** / **MUTED** toggle sits in the marquee on the cabinet and in every game (saved in localStorage). iOS Safari stays silent until a tap (the mute button or any game control) unlocks audio.


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

## Solitaire (Klondike)

Standard Klondike. Original cabinet rules, not a branded clone.

- Standard **52-card** deck. Kings high.
- **7 tableau columns**, Klondike deal (1…7, only the top face-up; uncovering flips).
- One **stock** + **waste**. Tap stock to flip **1** card to waste. When the stock is empty, tap it to recycle the waste (unlimited passes in v0).
- Tableau builds **descending rank, alternating color**. Empty column: **King only** (or a face-up run that starts with a King).
- Move **whole face-up stacks**. Tap a face-up card in a packed run to select from that card to the top, then drop on a legal tableau column or (single legal card) a foundation.
- Four suit foundations climb **A→K**. Win when all **52** are home.
- Score **+foundationScore** (default 10) per card to a foundation.
- **DEAL AGAIN** reshuffles. **CABINET** returns to the menu.

## FreeCell

Public-domain FreeCell. Original cabinet UI, not a branded clone.

- **52 cards**, all face-up. **8 cascades**, **4 free cells**, **4 foundations** A→K by suit.
- Cascades build down alternating color. Empty cascade: any card or legal stack.
- Each free cell holds **one** card.
- **Supermove**: a stack move is legal only if there are enough free cells + empty cascades. Max movable = (empty free cells + 1) × 2^(empty cascades, excluding the destination if it is empty). Too big is illegal.
- Tap a cell, a cascade card in a packed run, or a cascade top, then a destination.
- Score **+foundationScore** (default 10) per foundation card. Win when all **52** are home. **DEAL AGAIN** reshuffles.

## Spider

Quick **1-suit** Spider. Original cabinet rules, not a branded clone.

- **104 cards** (two 52-card ranks, all one suit). **10 columns**. Classic deal: 6 cards in columns 0–3, 5 in 4–9; only tops face-up.
- Remaining **50** sit in the stock. Tap stock to deal **10** (one onto each column). Cannot deal while any column is empty.
- Build down in rank (one suit anyway). Empty column: any card or run.
- Move packed descending runs of any length. Tap the start of the run.
- A complete **K→A** run of 13 is removed and scores **+runScore** (default 100). Win when **8** runs are off.
- **DEAL AGAIN** reshuffles.

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

- Tap an empty cell **or** a digit first, then the other. **CLEAR** or Backspace empties the selected cell. Given cells stay locked (tap them for the locked banner).
- A duplicate in a row, column, or 2×3 box is marked. Win when the grid matches the solution (or is a valid complete fill).
- Score +1 per puzzle cleared. **NEXT PUZZLE** loads the next puzzle in the JSON bank (five shipped).

## Sudoku 9

Classic 9×9. Digits 1–9 in 3×3 boxes. Same cabinet controls as Sudoku 6.

- Tap a cell or a digit (1–9), then fill. Givens stay locked.
- Duplicates in a row, column, or 3×3 box are marked. Five puzzles in `games/sudoku9.json`.

## Blast

Original tap-to-pop cabinet. Enamel cubes, not a licensed clone.

- 8×8 grid, five colors. Tap a group of **2+** orthogonally connected cubes of the same color. They pop. Score is **n×(n−1)** (`groupScore`), plus `bigBonus` when the group is at least `bigGroup` (default 5).
- Remaining cubes fall **down** in their column. Empty cells refill from the top with random colors so a sitting lasts.
- Twenty pops a sitting (`moves`). Each pop spends a move. A lone cube does nothing and does not spend a move.
- If no group of 2+ remains, the board is reshuffled so play cannot softlock.
- HUD: **MOVES** left and **SCORE**. **DEAL AGAIN** when the sitting is over.

## Triple

Original swap match-3. Not a licensed clone.

- 8×8 grid, six colors. Tap a gem, then an **adjacent** (4-dir) neighbor to swap.
- If the swap makes no line of 3+ in a row or column, it snaps back (illegal flash) and does not spend a move.
- If it does, every 3 / 4 / 5 in a row or column clears (both axes, so L and T shapes go). Gravity drops gems down, empties refill from the top, and further matches cascade with a combo multiplier (`gemScore` × combo).
- A successful swap spends a move. Twenty swaps a sitting. **DEAL AGAIN** when moves hit 0. If no legal swap remains, the board is reshuffled.

## Chime

Original marble-row slider. Not a licensed clone.

- 6×6 colored marbles. Tap a marble (gold outline), then another cell in the **same row or column**. That line **slides with wraparound** so the selection moves into the second cell.
- After a slide, every orthogonally connected **blob of 3+** same color pops (a clump counts, not only a straight line). Groups of 2 stay.
- Gravity is not used. After pops, remaining marbles in the slid line shift to close gaps **without wrap** (toward index 0), then empty cells refill at random.
- Twenty-five slides a sitting (`moves`). Score is `marbleScore` per marble popped. **DEAL AGAIN** when the sitting is over.

## Reversi

8×8 disc flip. Dark (you) moves first; light is a greedy max-flips AI. Title is **Reversi**, not a trademarked name.

- Opening: four discs in the center. Legal squares are marked. Tap one to place and flip the sandwich.
- If a side has no legal move it passes. Game ends when both cannot move. Score is disc counts. **DEAL AGAIN** resets the board.
- Legal squares are marked with a gold hint. Light (CPU) waits a short beat before it answers, so easy captures are not instant. Disc counts and whose turn stay in the HUD.

## Hoops

Timing tap. A rim slides; tap **SHOOT** when the ball sits inside the window.

- Ten shots a sitting. A make is +2, +3 when the rim is farther out.
- Miss if the aim is outside `[rimX − w, rimX + w]`. **DEAL AGAIN** after ten.

## Quiz Night

Mixed trivia and jumble rounds from JSON. Four big answer buttons.

- Trivia +10, jumble +15. One question at a time, then **NEXT**.
- Twelve questions a sitting (from a bank of 20+ trivia and 8+ jumbles). **TAKE SCORE** / **DEAL AGAIN** when the sitting is over.



## Orbit

Sports-ish canvas slot. A puck orbits a center ring on dark felt with gold accents. Tap anywhere when the puck sits inside the scoring wedge to bank points (2, or 3 near the wedge center). Twelve taps end the sitting — then DEAL AGAIN.

## Game slots (canvas / custom JS)

Richer JS games with their own graphics mount through a drop-in slot host so you do not edit the cabinet core for every title.

### How to add a slot game

1. Create `games/<id>.json` with `type: "slot"`, `id`, `title`, `tagline`, and `module` (path to the game script; default `games/<id>/game.js`).
2. Create `games/<id>/game.js` that assigns `window.CabinetSlotGames[<id>] = { mount(ctx) { … return { unmount, reset, getScore, getStatus }; } }`.
3. Add the JSON filename under a category in `games/index.json`, bump `CACHE` in `sw.js`, and add every new path to `ASSETS`.

### Mount contract

`ctx` gives `root` (`#play-slot`), a sized `canvas`, `def`, `score.set/get`, `banner.set(text, kind?)`, `hud.round/deck`, `sfx.play(name)`, `onDone(score)`, `onScore(score)`, and `requestDealAgain()`.

Canvas / WebGL is fine for slot games; SVG/CSS is still preferred for chrome and pieces overlays.

## How to add a game

1. Duplicate a JSON file under `games/` (run21, zip21, chug21, elevenup, solitaire, freecell, spider, yacht, sudoku6, sudoku9, blast, triple, chime, reversi, hoops, or quiznight).
2. Change id, title, labels, copy, and the knobs for that type.
3. Add the filename to a category `games` array in `games/index.json` (or the flat `games` array if you are not using categories).
4. Reload. The cabinet groups rows under category headings.

Engine keys: `slot` (canvas / custom JS via CabinetSlot), `runlanes` (Run 21 five-lane place/stay/skip), `columns21` (Zip / Chug place/skip, columns still clear), `elevenup` (11 Up pairs), `klondike` (Solitaire stacks), `freecell`, `spider`, `yacht` (Yacht five-dice scorecard), `sudoku6`, `sudoku9`, `blast` (tap-to-pop clusters), `triple` (swap match-3), `chime` (row/column wrap slide), `reversi`, `hoops`, `quiznight`, and `run21` (HIT/STAY helpers). Copy and scoring knobs stay in JSON.

## JSON fields

Unknown extra fields are ignored.

Shared:
- id (string): Hash route id. Unique. Played at `#/play/:id`.
- type (string): `runlanes`, `columns21`, `elevenup`, `klondike`, `freecell`, `spider`, `yacht`, `sudoku6`, `sudoku9`, `blast`, `triple`, `chime`, `reversi`, `hoops`, `quiznight`, or `run21`.
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

Solitaire (`klondike`) extras: foundationScore (10), columns (7), moves (`run`), labels.home stock waste empty again, copy.playing move foundation illegal won draw recycle.

FreeCell (`freecell`) extras: foundationScore (10), columns (8), cells (4), moves (`run`), labels.home cell empty again.

Spider (`spider`) extras: columns (10), runScore (100), suits (1), suit (`♠`), runs (8), moves (`run`), labels.runs stock empty again, copy.playing move complete illegal won deal.

Yacht (`yacht`) extras: upperBonus (35), upperThreshold (63), fullHouse (25), smallStraight (30), largeStraight (40), yacht (50), rolls (3), labels.roll hold aces…sixes threekind fourkind fullhouse smallstraight largestraight yacht chance, copy.idle playing mustScore done.

Sudoku 6 (`sudoku6`) extras: puzzles (array of `{ puzzle, solution }` 36-char strings, 0 = empty), clearScore (1).

Sudoku 9 (`sudoku9`) extras: size 9, puzzles (81-char `{ puzzle, solution }` strings, 0 = empty), clearScore (1).

Blast (`blast`) extras: cols (8), rows (8), colors (5), moves (20), minGroup (2), groupScore (`n*(n-1)` or `n*10`), bigGroup (5), bigBonus (20).

Triple (`triple`) extras: cols (8), rows (8), colors (6), moves (20), minLine (3), gemScore (10). Combo multiplies gemScore on each cascade wave.

Chime (`chime`) extras: cols (6), rows (6), colors (6), moves (25), minGroup (3), marbleScore (10). Slide wrap; blobs of 3+ pop; slid line packs toward index 0, then empties refill.

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

Solitaire (Klondike): 52-card shoe including K/Q, King only on empty column, alt-color descending, stack move of a packed run, foundation A then 2 of the same suit.

FreeCell: deal 52 face-up, a free cell holds one, illegal double-fill, supermove blocked with no helpers, foundation A then 2.

Spider: 104 cards, deal-row blocked if a column is empty, completing K–A removes 13, stack move of a descending run.

Yacht: roll yields five dice 1–6, hold keeps a face on the next roll, a fourth roll throws, aces sum ones, full house 25 / junk 0, small straight 30 / large 40, yacht 50, a category cannot be scored twice, upper bonus at 63, thirteen scores then done.

Sudoku 6: given cells are locked, a duplicate in a row is invalid, a completed correct grid wins, 2×3 boxes reject duplicates, a digit can be primed before tapping a cell.

Sudoku 9: 81-cell givens stay locked, 3×3 boxes reject duplicates, a completed correct grid wins.

Blast: a group of 1 does not pop; a group of 2+ pops; remaining cubes fall down; moves decrement; sitting is done at 0 moves.

Triple: an adjacent swap that makes three clears; a non-match swap reverts and does not spend a move; cascades add combo score; moves decrement on success.

Chime: a row/column slide wraps; a group of 2 stays; a group of 3 pops.

Reversi: opening four center discs, a known flip, occupied squares reject, AI returns a legal index.

Hoops: shoot inside the window scores, outside misses, ten shots ends the sitting.

Quiz Night: correct increments, wrong does not, jumble uses jumblePoints.
