# Cabinet Kit — game reference (cont.)

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
