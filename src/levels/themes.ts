// Per-level visual themes. Even with similar structure, recoloring the sky,
// ground, and scenery each level makes an endless run feel like it's going
// somewhere. The sky textures are generated in BootScene (one per `sky` key);
// the tints are multiplied onto the shared ground/scenery textures at runtime.

export interface Theme {
  name: string;
  sky: string;       // sky texture key (generated in BootScene)
  ground: number;    // tint for ground + platform tiles
  hill: number;      // tint for parallax hills
  bush: number;      // tint for bushes
  cloud: number;     // tint for clouds
  sunAlpha: number;  // 0 hides the sun (night/cave)
}

export const THEMES: Theme[] = [
  { name: 'Grassland', sky: 'sky',        ground: 0xffffff, hill: 0xffffff, bush: 0xffffff, cloud: 0xffffff, sunAlpha: 0.95 },
  { name: 'Sunset',    sky: 'sky_sunset', ground: 0xffd2a6, hill: 0xe6b088, bush: 0xe0a878, cloud: 0xffe0c4, sunAlpha: 1.0 },
  { name: 'Dusk',      sky: 'sky_dusk',   ground: 0xc3bce0, hill: 0xa99fce, bush: 0xa99fce, cloud: 0xd6ccec, sunAlpha: 0.6 },
  { name: 'Night',     sky: 'sky_night',  ground: 0x9fb0d8, hill: 0x7e8fc0, bush: 0x7e8fc0, cloud: 0x9aa8cc, sunAlpha: 0.0 },
  { name: 'Snow',      sky: 'sky_snow',   ground: 0xe2eeff, hill: 0xeaf4ff, bush: 0xeaf4ff, cloud: 0xffffff, sunAlpha: 0.9 },
  { name: 'Cavern',    sky: 'sky_cave',   ground: 0x9aa0b4, hill: 0x6a7084, bush: 0x6a7084, cloud: 0x8088a0, sunAlpha: 0.0 },
];

export function themeForLevel(levelNumber: number): Theme {
  const i = (Math.max(1, levelNumber) - 1) % THEMES.length;
  return THEMES[i];
}
