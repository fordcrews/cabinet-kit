# Cabinet Kit — game reference

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

*(continued in [GAMES-2.md](GAMES-2.md))*
