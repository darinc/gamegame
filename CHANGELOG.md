# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
