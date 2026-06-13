# Make it FUN — graphics, sound & juice glow-up (v0.6.0)

Goal: turn the easy-endless co-op base into a game that *feels* great to play
two-player tonight. Characters with personality, real sound, juicy feedback,
and a polished look — all still generated in-code (no asset pipeline).

## Plan

### Sound (game is currently 100% silent)
- [x] `AudioSynth.ts`: WebAudio-synthesized SFX + chiptune music, singleton,
      autoplay-policy safe. jump / coin / stomp / brick / powerup / hurt / die /
      bubble / pop / flag / 1up / thud / charge. Mute toggle (M).
- [x] Wire SFX into GameScene + entities. Background music loop.

### Characters & art (the "blobs are plain" ask)
- [x] Pixel-art generator (`drawPixels`) — crisp, readable, in-code.
- [x] Two distinct heroes with cap/overalls/eyes, idle + walk + jump + hurt frames.
- [x] Player animation state machine that co-exists with the squash/stretch +
      small/big scale system.
- [x] Redesign enemies, coin, mushroom, blocks, pipe, ground/brick tiles, flag.
      Sky gradient + sun + nicer parallax.

### Juice / feel
- [x] Particles: jump/land dust, coin sparkle, stomp poof, powerup burst.
- [x] Screen shake on ground-pound/thud & big stomps.
- [x] Floating score popups + score/combo system + 1UP at 5x stomp chain.
- [x] Tighter camera framing; HUD moved to its own scene (zoom-proof).
- [x] Polished title, level-complete & game-over scenes (show score).

### Edge cases & verification
- [x] Playwright: title, demo gameplay, endless advance (score carry),
      level-complete & game-over screens. Zero console errors (only favicon 404).
- [x] `tsc --noEmit` + `npm run build` clean.
- [ ] Bubble rescue + power-up persistence spot-check; bull enemy look.
- [ ] (optional) smooth 2-tile terrain steps so flow is buttery.

### Ship
- [ ] CHANGELOG 0.6.0, commit on feature branch, merge to main.

## Review

Shipped a full "make it fun" pass, verified with Playwright at each step.

**New files**
- `src/systems/AudioSynth.ts` — runtime-synthesized SFX + chiptune music (no
  assets), autoplay-safe, mutable. Replaces the no-op SoundManager.
- `src/scenes/HudScene.ts` — HUD in its own un-zoomed scene, fed via registry.

**Reworked**
- `BootScene` — pixel-map rasterizer + a full, cohesive art set (heroes with
  4 animation states, critter, bull, coin spin, mushroom, blocks, pipe, flag,
  sky/sun/scenery).
- `Player` — animation state machine + jump/land/pound juice (dust, thud, shake);
  fixed a per-frame landing-tween wart.
- `GameScene` — score + stomp combo + 1UP, score/coin/stomp/powerup/death SFX,
  floating popups, sky+sun background, tighter zoom, HUD via registry/HudScene.
- Entities (`Coin`, `Brick`, `Enemy`, `ChargingBull`) — SFX + animations.
- `TitleScene` / `LevelCompleteScene` / `GameOverScene` — music, menu SFX,
  animated heroes, score display, confetti celebration.

**Verified (Playwright, zero console errors beyond favicon 404)**
- Title renders with animated heroes; demo gameplay shows the new art + HUD.
- Endless advance Level 1→2→…→4 carries score (8600→8800) and coins.
- Level-complete (confetti + score) and game-over (score) screens render and the
  HUD scene cleanly stops on transition.
- `tsc --noEmit` + `npm run build` clean.

**Deliberately deferred**
- 2-tile terrain-step smoothing (humans clear them instantly; only the bot
  hesitates). Left for a focused generator pass.

---

# Prior milestone — v0.5.0 (co-op easy endless) — DONE

## Review

All planned items shipped and verified with Playwright + the bot playtester.

**What changed**
- `src/settings.ts` (new): one `GameSettings` object flows Title → Game → LevelComplete/GameOver. Default = 2 players, hybrid difficulty 2, endless. URL overrides for testing.
- `src/systems/BotController.ts` (new): heuristic AI on the human input path. Runs right, jumps gaps/walls/enemies, climbs stairs, backs up for a running start when pinned, follows a human partner with a lead clamp. Used as CPU buddy, Bot Demo, and automated playtester.
- `src/scenes/TitleScene.ts` (new): mode-select menu, keyboard + gamepad, `?autostart=1` bypass.
- `GameScene`: settings plumbing, bot wiring, `isSolidAt` physics probe, forgiving co-op fall (bubble-rescue, no life lost), endless level counter, parallax background, cleaner death/life handling.
- Generators: difficulty-driven easy tuning; fixed the bridge-height wall bug; grounded/heightened the flag trigger; gated mid-bridge pits to flat sections.
- Scene transitions carry settings; Bot Demo auto-advances.

**Known rough edge (non-blocking)**
- Occasional 2-tile-high step in generated terrain makes the BOT hesitate a few seconds. Humans clear these instantly. Could be smoothed by clamping in-chunk step height.

## Lessons
- The bot doubles as a regression oracle: it surfaced the bridge-height wall and the floating-flag bug. Keep a Bot Demo run in the loop when touching generation or physics.
