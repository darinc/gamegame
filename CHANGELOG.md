# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-06-13

A "make it actually fun to play" pass: sound, characters, and game feel.

### Added

- **Synthesized audio** (`AudioSynth`) — every sound is generated at runtime with
  the WebAudio API (no asset files, matching the all-in-code texture approach):
  jump, coin, stomp, brick break, power-up/down, hurt, death, bubble/pop,
  ground-pound thud, bull charge, menu blips, a level-complete fanfare, a
  game-over sting, and a looping chiptune. Resumes safely on first input
  (autoplay policy). **M** mutes (persisted).
- **Pixel-art characters & props** — a tiny pixel-map rasterizer renders two
  distinct heroes (cap, overalls, eyes, gloves, boots) with **idle / walk / jump /
  hurt** animation frames, a cuter critter enemy (2-frame walk), a horned bull, a
  spinning coin, and redesigned mushroom, "?" block, brick, ground, pipe, and
  flag. Plus a sky gradient, glowing sun, and animated parallax scenery.
- **Score system** with floating popups, a time-window **stomp combo**, and a
  **1UP at a 5× chain**. Score carries across the endless run and shows on the
  level-complete and game-over screens.
- **Juice**: jump/landing dust, coin sparkles, stomp star-bursts, and screen
  shake on ground-pounds and stomps. Level-complete screen now rains confetti
  with the two heroes celebrating.

### Changed

- Tighter camera framing so the heroes feel present instead of tiny.
- The HUD now renders in its own parallel `HudScene` with an un-zoomed camera,
  fed via the shared registry.
- Player animation state machine composes cleanly with the existing
  squash/stretch and small/big scaling.

### Fixed

- HUD no longer distorts when the camera zooms (a latent bug: a Phaser camera's
  zoom scales `scrollFactor(0)` UI too, so the dynamic co-op zoom-out used to push
  the HUD off-screen). Moving the HUD to its own scene fixes it.
- The landing squash spawned a fresh tween *every frame* while standing still; it
  now fires once, on the air→ground transition.

## [0.5.0] - 2026-06-13

### Added

- **Title screen** with mode select: 2 Players (co-op), 1 Player + CPU Buddy, 1 Player, and Bot Demo. Keyboard + gamepad navigation.
- **AI bot** (`BotController`) that plays via the same input path as a human — runs, jumps gaps/walls/enemies, climbs stairs, backs up for a running start when pinned, and follows a human partner without bullying them forward. Powers the CPU buddy, the attract-mode Bot Demo, and serves as an automated playtester.
- **Endless easy run** by default: two players, hybrid generation at difficulty 2, fresh level every time you clear the flag, with a Level counter.
- **Forgiving co-op deaths**: falling into a pit with a living partner re-bubbles you next to them at no life cost (NSMB-style rescue).
- **Parallax background** (clouds, hills, ground bushes) so levels feel alive instead of empty.
- Shared `GameSettings` plumbed through every scene; URL overrides (`?mode=`, `?bot=`, `?difficulty=`, `?autostart=1`) for power users and testing.

### Changed

- Difficulty now drives generation: easy levels get smaller/rarer gaps, fewer enemies, more coins, and a capped chunk pool. Default difficulty lowered to 2.
- Question blocks contain power-ups slightly more often (35%).

### Fixed

- Hybrid bridges built one floor 2 tiles too tall, creating an unclimbable wall where the start zone met the first bridge — floors are now flush with their neighbours.
- The end flagpole's trigger floated overhead and could be missed entirely; it now spans the full approach height so the level completes whether you walk into it or sail off the staircase.
- Camera and bubble-rescue now ignore players frozen at the exit instead of yanking toward the finished player.
- Enemy/fall death handling no longer double-counts lives.

## [0.4.0] - 2026-01-04

### Added

- SMB World 1-1 level recreation for reference comparison
- Level selection via URL parameter (`?level=smb1_1`)
- Level registry system for managing multiple levels

## [0.3.0] - 2026-01-04

### Added

- Hybrid procedural generation with hand-crafted Mario-style chunks (stairs, pipes, coin heaven, etc.)
- Player health and power-up state now persists between levels

### Fixed

- Ground pound maintains momentum through breakable bricks
- Powered-up players shrink when health drops to half instead of at death
- Question blocks spawn items below when ground pounded from above

## [0.2.0] - 2026-01-03

### Added

- Power-up system: players start small with 2 health, mushrooms grant full size with 4 health
- 3-second countdown for second player when first player finishes level

### Fixed

- Scene transition keyboard input now works reliably
- Bubble movement speed scales with distance from active player
- Camera and player state properly reset between levels

## [0.1.0] - 2026-01-03

### Added

- Mario-style 2D platformer with Phaser 3 and TypeScript
- Player with variable jump, coyote time, ground pound, and 2-player co-op bubble mode
- Enemies with patrol AI, stomp detection, and ledge awareness
- Interactive bricks and question blocks
- Procedural level generation with seed support
- Keyboard and gamepad input (Switch Pro Controller mapped)
