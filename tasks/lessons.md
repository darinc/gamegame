# Lessons

Patterns worth remembering so the same mistake isn't repeated.

## Phaser: camera zoom distorts `scrollFactor(0)` UI
- **Symptom:** raising the gameplay camera's zoom (or the existing dynamic
  zoom-out when co-op players spread apart) pushed the HUD off-screen. A camera's
  zoom scales *everything it renders* about its midpoint — including objects with
  `scrollFactor(0)` — so screen-anchored UI only stays put at exactly zoom 1.0.
- **Fix:** render the HUD in a separate, parallel `Scene` with its own camera
  (`scene.launch('HudScene')`). Each scene has its own display list + cameras, so
  the gameplay zoom can't touch the HUD, and there's zero camera-`ignore`
  bookkeeping for dynamically-spawned world objects (particles, popups).
- **Apply:** any time a Phaser camera zoom is non-1.0, HUD/overlays belong in
  their own scene, fed via the shared `registry`. World-space popups (score at a
  coin, etc.) stay in the gameplay scene and ride the zoom correctly.

## The bot is a regression oracle (carried from v0.5.0)
- The Bot Demo drives the real `Player.update` input path, so it exercises
  movement, jumps, landings, anims, and SFX hooks without a human. Keep a demo
  run in the loop when touching physics/generation/animation — it surfaced the
  bridge-wall and floating-flag bugs, and validated the new juice end-to-end.

## Generated-texture architecture is a superpower for visuals
- Everything (characters, tiles, FX) is rasterized in `BootScene` from pixel
  maps / graphics primitives — no asset pipeline. Authoring a sprite = editing an
  ASCII map. Audio follows the same rule (synthesized in `AudioSynth`). Prefer
  extending these over introducing binary assets.
