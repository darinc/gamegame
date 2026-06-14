// Per-level themes. Themes are BOTH cosmetic palettes AND structural recipes (KTD14, R14).
//
// Cosmetic half: recoloring the sky, ground, and scenery each level makes an endless run feel
// like it's going somewhere. The sky textures are generated in BootScene (one per `sky` key);
// the tints are multiplied onto the shared ground/scenery textures at runtime (GameScene's
// createBackground / applyTerrainTint).
//
// Structural half (U8): each theme also carries a generation RECIPE the director + realizer read
// to make a Cavern level structurally different from a Sky level — not just recolored. The recipe
// constrains chunk legality (low ceilings), biases verticality/gap/enemy selection, and supplies
// relative enemy-mix weights. These fields are pure DATA; this module stays Phaser-free so the
// Node-only generation path can import it alongside GameScene (which only reads the cosmetic
// fields). Selection stays level-locked (themeForLevel) for deterministic world progression.

import type { EnemyType } from './types';

// How strongly a theme wants low ceilings / vertical pressure. 'none' = open sky (no roofs);
// 'low' = ordinary overworld; 'high' = caves that crowd the player with ceilings.
export type CeilingPressure = 'none' | 'low' | 'high';

export interface Theme {
  // --- Cosmetic (consumed by GameScene; DO NOT remove or rename) ---------------------------
  name: string;
  sky: string;       // sky texture key (generated in BootScene)
  ground: number;    // tint for ground + platform tiles
  hill: number;      // tint for parallax hills
  bush: number;      // tint for bushes
  cloud: number;     // tint for clouds
  sunAlpha: number;  // 0 hides the sun (night/cave)

  // --- Structural recipe (consumed by the director + realizer; KTD14, R14) -----------------
  // Whether low-ceiling chunks (a roof within standing height over a walkable surface) are legal.
  // false for the open Sky theme — no roofs in the sky. The realizer REJECTS low-ceiling chunks
  // when this is false regardless of their band/verticality tags.
  allowsLowCeiling: boolean;
  // How much the theme leans on low ceilings / verticality. Biases the realizer's chunk choice
  // (high -> prefer low-ceiling candidates) and the director's verticality roll (high -> more
  // vertical beats; none -> flatter, more open).
  ceilingPressure: CeilingPressure;
  // Relative enemy-type weights (GOOMBA / KOOPA / BULL). Exposed for U7's full enemy mixing; the
  // realizer already consults them to weight enemy-type swaps. Partial: an omitted type weighs 0.
  enemyMix: Partial<Record<EnemyType, number>>;
  // Multiplier on enemy presence (1 = baseline). >1 keeps every authored enemy and may add an
  // extra near it (denser); <1 thins the roster. Cavern is denser than baseline; Sky is sparser.
  enemyDensity: number;
  // Multiplier biasing gap length/frequency. >1 prefers gap-bearing chunks (Sky's longer gaps);
  // <1 prefers solid ground (Cavern keeps pits but doesn't favor wide chasms over its corridors).
  gapBias: number;
}

// The six structural archetypes mapped onto the six themes (KTD14):
//   - Cavern    : low ceilings + above-baseline enemies + pits (ceilingPressure 'high').
//   - Sky       : open floating theme — NO low ceilings + longer gaps + sparse enemies
//                 (renamed from 'Snow' for clarity; keeps its cold/open sky + tints).
//   - Grassland : the gentle baseline opener (level 1).
//   - Sunset / Dusk / Night : overworld variants ramping enemy density + threat mix.
export const THEMES: Theme[] = [
  {
    name: 'Grassland', sky: 'sky', ground: 0xffffff, hill: 0xffffff, bush: 0xffffff, cloud: 0xffffff, sunAlpha: 0.95,
    allowsLowCeiling: true, ceilingPressure: 'low',
    enemyMix: { goomba: 3, koopa: 1, bull: 1 }, enemyDensity: 1.0, gapBias: 1.0,
  },
  {
    name: 'Sunset', sky: 'sky_sunset', ground: 0xffd2a6, hill: 0xe6b088, bush: 0xe0a878, cloud: 0xffe0c4, sunAlpha: 1.0,
    allowsLowCeiling: true, ceilingPressure: 'low',
    enemyMix: { goomba: 3, koopa: 2, bull: 1 }, enemyDensity: 1.05, gapBias: 1.1,
  },
  {
    name: 'Dusk', sky: 'sky_dusk', ground: 0xc3bce0, hill: 0xa99fce, bush: 0xa99fce, cloud: 0xd6ccec, sunAlpha: 0.6,
    allowsLowCeiling: true, ceilingPressure: 'low',
    enemyMix: { goomba: 2, koopa: 3, bull: 1 }, enemyDensity: 1.15, gapBias: 1.0,
  },
  {
    name: 'Night', sky: 'sky_night', ground: 0x9fb0d8, hill: 0x7e8fc0, bush: 0x7e8fc0, cloud: 0x9aa8cc, sunAlpha: 0.0,
    allowsLowCeiling: true, ceilingPressure: 'low',
    enemyMix: { goomba: 2, koopa: 2, bull: 2 }, enemyDensity: 1.2, gapBias: 1.0,
  },
  {
    // Sky: the open theme. No low ceilings, longer gaps, sparse enemies (R14). Keeps the cold/open
    // 'sky_snow' texture + pale tints from the former 'Snow' theme.
    name: 'Sky', sky: 'sky_snow', ground: 0xe2eeff, hill: 0xeaf4ff, bush: 0xeaf4ff, cloud: 0xffffff, sunAlpha: 0.9,
    allowsLowCeiling: false, ceilingPressure: 'none',
    enemyMix: { goomba: 3, koopa: 1 }, enemyDensity: 0.7, gapBias: 1.4,
  },
  {
    // Cavern: low ceilings + denser enemies + pits (R14).
    name: 'Cavern', sky: 'sky_cave', ground: 0x9aa0b4, hill: 0x6a7084, bush: 0x6a7084, cloud: 0x8088a0, sunAlpha: 0.0,
    allowsLowCeiling: true, ceilingPressure: 'high',
    // gapBias > 1 so a Cavern peak favors a chasm (pits) over a dry boss arena — R14's "Cavern has
    // pits" — while ceilingPressure 'high' supplies the roofs. Still below Sky's wide-open chasms.
    enemyMix: { goomba: 2, koopa: 2, bull: 1 }, enemyDensity: 1.3, gapBias: 1.15,
  },
];

// A neutral baseline recipe used when a theme name is unknown (e.g. the realizer's default
// 'overworld' placeholder before a real theme is threaded in). Keeps unknown-theme generation
// behaviour identical to the pre-U8 baseline so existing callers/tests are unaffected.
const DEFAULT_RECIPE: Theme = {
  name: 'overworld', sky: 'sky', ground: 0xffffff, hill: 0xffffff, bush: 0xffffff, cloud: 0xffffff, sunAlpha: 0.95,
  allowsLowCeiling: true, ceilingPressure: 'low',
  enemyMix: { goomba: 3, koopa: 1, bull: 1 }, enemyDensity: 1.0, gapBias: 1.0,
};

export function themeForLevel(levelNumber: number): Theme {
  const i = (Math.max(1, levelNumber) - 1) % THEMES.length;
  return THEMES[i];
}

// Look up a theme's full recipe by its name (case-insensitive). The generation path threads the
// theme as a STRING KEY (KTD14 — outline/RealizeContext keep `theme: string`); this is the single
// lookup that turns that key into the structural recipe. Unknown names fall back to the neutral
// baseline so non-theme placeholders (e.g. 'overworld') generate as before.
export function getThemeRecipe(name: string): Theme {
  const key = name.toLowerCase();
  return THEMES.find((t) => t.name.toLowerCase() === key) ?? DEFAULT_RECIPE;
}
