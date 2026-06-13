# Make it Multiplayer Mario Bros — Easy, Fun, Low-Input

Goal: Open the game → immediately playable, FUN, **easy** co-op with endless
procedurally-generated levels. A human + human, human + CPU, or watch-the-bots demo.
Tuned for two people who love the *easy* Mario levels played together.

## Plan

- [ ] **Shared settings module** (`src/settings.ts`): GameSettings, defaults
      (2 players, easy, endless), URL parsing for power users / automated testing.
- [ ] **Easy generation**: make HybridGenerator the default at low difficulty;
      cap chunk difficulty, shrink/soften gaps, more coins. Bump power-up odds a touch.
- [ ] **AI Bot** (`src/systems/BotController.ts`): heuristic player that runs right,
      jumps gaps/obstacles, stomps/avoids enemies, climbs stairs. Doubles as:
        - "CPU buddy" so one person can play co-op solo (bot follows, doesn't bully)
        - "Bot demo" attract mode
        - automated playtester (verify levels are completable)
- [ ] **Title screen** (`src/scenes/TitleScene.ts`): pick 2P / 1P+CPU / 1P / Bot Demo,
      show controls. Keyboard + gamepad. `?autostart=1` bypass for testing.
- [ ] **Forgiving co-op deaths**: falling in a pit with a living partner re-bubbles you
      (no life lost) instead of game-over — classic NSMB feel, perfect for "easy".
- [ ] **Endless progression**: LevelComplete → next easy level, level counter.
- [ ] **Cheap visual charm**: parallax clouds + hills so it doesn't feel empty.
- [ ] **Wire it all into GameScene** without breaking existing features.

## Verify
- [ ] `tsc --noEmit` clean + `npm run build` clean.
- [ ] Playwright: title screen renders; each mode launches.
- [ ] Bot playthrough: bot reaches the flag (proves level completable) — screenshots.
- [ ] No new console errors.

## Review

All planned items shipped and verified with Playwright + the bot playtester.

**What changed**
- `src/settings.ts` (new): one `GameSettings` object flows Title → Game → LevelComplete/GameOver. Default = 2 players, hybrid difficulty 2, endless. URL overrides for testing.
- `src/systems/BotController.ts` (new): heuristic AI on the human input path. Runs right, jumps gaps/walls/enemies, climbs stairs, backs up for a running start when pinned, follows a human partner with a lead clamp. Used as CPU buddy, Bot Demo, and automated playtester.
- `src/scenes/TitleScene.ts` (new): mode-select menu, keyboard + gamepad, `?autostart=1` bypass.
- `GameScene`: settings plumbing, bot wiring, `isSolidAt` physics probe, forgiving co-op fall (bubble-rescue, no life lost), endless level counter, parallax background, cleaner death/life handling.
- Generators: difficulty-driven easy tuning; fixed the bridge-height wall bug; grounded/heightened the flag trigger; gated mid-bridge pits to flat sections.
- Scene transitions carry settings; Bot Demo auto-advances.

**Verification (Playwright)**
- Title renders; menu nav (↓↓ Enter) launches the right config (solo = 1 player, hybrid, diff 2).
- Bot Demo: bot traverses full levels (x 100 → flag) and completes; endless run advanced Level 1 → 2 → 3.
- Buddy: human drives P1 (walked 422px), CPU keeps a ~246px lead without bullying.
- Forgiving death: player yeeted into the void kept all lives and bubbled back on-screen.
- `tsc --noEmit` clean; `npm run build` clean; zero console errors.

**Known rough edge (non-blocking)**
- Occasional 2-tile-high step in generated terrain makes the BOT hesitate a few seconds (it backs up and retries, then clears it). A human clears these instantly with a running jump. Levels remain completable; could be smoothed later by clamping in-chunk step height.

## Lessons
- The bot doubles as a regression oracle: it surfaced the bridge-height wall and the floating-flag bug that a human tester might have written off as "bad luck". Keep a Bot Demo run in the loop when touching generation or physics.
