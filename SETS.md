# Game Sets

Play a random **SET 3**, **SET 4**, or **SET 5** from the cabinet strip above the game list. Each leg still records its own BEST score; the set total uses balanced **set points** so a par sitting of Sudoku ≈ 11 Up ≈ Quiz Night.

- Parity lives in `games/set-parity.json`: each game has a `par` raw score. `setPoints = clamp(round((raw / par) * scale), 0, scale)` with `scale` 1000, so a par sitting is about **1000** set points per game (soft-capped at scale — no over-par bonus).
- Tune balance by editing pars in `games/set-parity.json` (and bump the service worker `CACHE` / `ASSETS` when you change it).
- Top **3** set totals are kept **per set size** (3-game / 4-game / 5-game boards) on this device in localStorage (`cabinet-kit-set-boards`).
- Routes: `#/set/3`, `#/set/4`, `#/set/5`, and during play `#/set/3/play/<gameId>`. **CABINET** abandons a set; **NEXT LEG** advances; **SET AGAIN** starts a fresh set of the same size.
