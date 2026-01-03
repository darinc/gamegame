# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `npm run dev` - Start Vite dev server with hot reload
- `npm run build` - TypeScript compile + Vite production build
- `npm run preview` - Preview production build locally
- `npx tsc --noEmit` - Type-check without emitting files

## Architecture

This is a Mario-style 2D platformer built with **Phaser 3** and **TypeScript**, using Vite as the build tool.

### Scene Flow
`BootScene` (asset loading) → `GameScene` (main gameplay) → `LevelCompleteScene` / `GameOverScene`

### Core Structure

**Entities** (`src/entities/`) - Game objects with physics:
- `Player` - Mario-like controls with variable jump height, coyote time, ground pound, and bubble mode for co-op
- `Enemy` - Patrol AI with stomp detection and ledge awareness
- `Brick`, `QuestionBlock` - Interactive blocks (break/activate from head bump or ground pound)
- `Coin` - Collectible with animation

**Systems** (`src/systems/`):
- `InputManager` - Unified keyboard + gamepad input. Maps Switch Pro Controller buttons (B=jump, A=run, X=bubble)
- `SoundManager` - Audio handling

**Levels** (`src/levels/`):
- `types.ts` - Level data format: 2D tile array + spawn points + exit
- `LevelLoader` - Parses `LevelData` into Phaser physics groups
- `ProceduralGenerator` - Random level generation (enable with `?procedural=true`)

### Key Gameplay Systems

**Block Interactions**: Both `checkHeadBump()` and `checkGroundPound()` in GameScene iterate over all bricks/question blocks to find collisions, enabling multi-block hits.

**Co-op Tethering**: Players auto-bubble if too far apart. Bubbled players float toward active player and can be freed by overlap.

**URL Parameters**:
- `?players=1` or `?players=2` - Player count
- `?procedural=true` - Use procedural generation
- `?seed=123` - Seed for procedural generation

### Physics Constants
Located at top of entity files (Player.ts, Enemy.ts). Key values: gravity 1200, jump velocity -420, ground pound velocity 800.
