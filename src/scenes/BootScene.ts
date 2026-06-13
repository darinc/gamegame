import Phaser from 'phaser';
import { audio } from '../systems/AudioSynth';

// ---------------------------------------------------------------------------
// Pixel-art texture generation.
//
// The whole game draws itself in code. Characters and props are authored here as
// little pixel maps (arrays of strings, one char per pixel) and rasterized into
// Phaser textures. With `pixelArt: true` they stay crisp at any zoom. Editing a
// sprite is just editing the ASCII — no asset pipeline.
// ---------------------------------------------------------------------------

type Palette = Record<string, number | null>;

// Shared character palette. Cap (C/c) and overalls (O/o) are overridden per hero.
const BASE: Palette = {
  '.': null, ' ': null,
  K: 0x161325, // outline
  F: 0xffcf9c, // skin
  f: 0xe0a673, // skin shadow
  E: 0xffffff, // eye white
  P: 0x2a2740, // pupil
  X: 0x2a2740, // hurt eye (X)
  m: 0x9e3b2a, // mouth
  B: 0x49301c, // boot
  b: 0x3a2616, // boot shade
  G: 0xfff6e9, // glove
};

const P1_COLORS: Palette = { C: 0xe83b32, c: 0xa51f1a, O: 0x2f6fd8, o: 0x1f4aa0 };
const P2_COLORS: Palette = { C: 0x39c46a, c: 0x1f8a45, O: 0x8a4fd6, o: 0x5d2f9b };

// Hero head + body (rows 0-18). Legs are swapped per animation frame.
const HERO_HEAD = [
  '................',
  '....KKKKKKKK....',
  '...KCCCCCCCCK...',
  '..KCCCCCCCCCCK..',
  '..KCCCCCCCCCCK..',
  '..KKKKKKKKKKKK..',
  '...FFFFFFFFFF...',
  '..FFFFFFFFFFFF..',
  '..FFEEFFFFEEFF..',
  '..FFEPFFFFEPFF..',
  '..FFFFFFFFFFFF..',
  '..FFFFmmmmFFFF..',
  '...ffFFFFFFff...',
  '....KKKKKKKK....',
  '...KOOOOOOOOK...',
  '..GKOoOOOOoOKG..',
  '..GKOoOOOOoOKG..',
  '...KOOOOOOOOK...',
  '...KOOOOOOOOK...',
];

const HERO_HEAD_HURT = HERO_HEAD.map((row, i) => {
  if (i === 8) return '..FFXXFFFFXXFF..';
  if (i === 9) return '..FFXXFFFFXXFF..';
  if (i === 11) return '..FFFmmmmmmFFF..';
  return row;
});

const LEGS_IDLE = [
  '...KOOOOOOOOK...',
  '...KKBBBBBBKK...',
  '..KBBBBBBBBBBK..',
  '..KBBBK..KBBBK..',
  '...KKK....KKK...',
];
const LEGS_WALK_A = [
  '...KOOOOOOOOK...',
  '...KKBBBBBBKK...',
  '.KBBBBBBBBBBK...',
  '.KBBBK...KBBBK..',
  '..KKK......KKK..',
];
const LEGS_WALK_B = [
  '...KOOOOOOOOK...',
  '...KKBBBBBBKK...',
  '...KBBBBBBBBK...',
  '...KBBBKBBBK....',
  '....KKKKKK.....',
];
const LEGS_JUMP = [
  '...KOOOOOOOOK...',
  '..KKBBBBBBBBKK..',
  '.KBBBK....KBBBK.',
  '.KKK........KKK.',
  '...............',
];

const hero = (legs: string[]) => [...HERO_HEAD, ...legs];
const heroHurt = (legs: string[]) => [...HERO_HEAD_HURT, ...legs];

// Cute angry critter (goomba replacement) — two walk frames + a squashed frame.
const CRIT: Palette = {
  '.': null, K: 0x161325, M: 0xb0673a, m: 0x894d28, E: 0xffffff, P: 0x2a2740, t: 0xfff4e2,
};
const CRITTER_1 = [
  '................',
  '.....KKKKKK.....',
  '...KKMMMMMMKK...',
  '..KMMMMMMMMMMK..',
  '..KMKKMMMMKKMK..',
  '..KMMEEMMEEMMK..',
  '..KMMEPMMEPMMK..',
  '..KMMMMMMMMMMK..',
  '..KMmMttttMmMK..',
  '..KMmMMMMMMmMK..',
  '...KMMMMMMMMK...',
  '...KMMMMMMMMK...',
  '..KbbMMMMMMbbK..',
  '..KBBK....KBBK..',
  '...KK......KK...',
  '................',
];
const CRITTER_2 = [
  '................',
  '.....KKKKKK.....',
  '...KKMMMMMMKK...',
  '..KMMMMMMMMMMK..',
  '..KMKKMMMMKKMK..',
  '..KMMEEMMEEMMK..',
  '..KMMEPMMEPMMK..',
  '..KMMMMMMMMMMK..',
  '..KMmMttttMmMK..',
  '..KMmMMMMMMmMK..',
  '...KMMMMMMMMK...',
  '...KMMMMMMMMK...',
  '...KbbMMMMbbK...',
  '...KBBK..KBBK...',
  '..KK........KK..',
  '................',
];
// extend CRIT palette with boot colors
CRIT.b = 0x5a3318;
CRIT.B = 0x49301c;

const MUSH: Palette = {
  '.': null, K: 0x161325, R: 0xff5a4d, r: 0xc6261d, W: 0xffffff, S: 0xfff1d6, s: 0xe6c89b, P: 0x2a2740,
};
const MUSHROOM = [
  '................',
  '....KKKKKKKK....',
  '..KKRRRRRRRRKK..',
  '.KRRWWRRRRWWRRK.',
  '.KRWWWRRRRWWWRK.',
  '.KRRRRRRRRRRRRK.',
  '.KRRRWWRRWWRRRK.',
  '.KrRRWWRRWWRRrK.',
  '..KKKKKKKKKKKK..',
  '...KSSSSSSSSK...',
  '...KSPSSSSPSK...',
  '...KSSSSSSSSK...',
  '...KSsSSSSsSK...',
  '...KSSSSSSSSK...',
  '....KKKKKKKK....',
  '................',
];

// ---------------------------------------------------------------------------

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    audio.install();
    this.buildTextures();
    this.buildAnims();
    this.scene.start('TitleScene');
  }

  // ---- pixel rasterizer ----------------------------------------------------

  private drawPixels(key: string, rows: string[], palette: Palette, scale = 2): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const w = rows[0].length;
    const h = rows.length;
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = palette[row[x]];
        if (col === undefined || col === null) continue;
        g.fillStyle(col, 1);
        g.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    g.generateTexture(key, w * scale, h * scale);
    g.destroy();
  }

  private buildTextures(): void {
    this.buildHeroes();
    this.buildEnemies();
    this.buildPickups();
    this.buildTiles();
    this.buildScenery();
    this.buildParticles();
  }

  private buildHeroes(): void {
    const make = (prefix: string, colors: Palette) => {
      const pal = { ...BASE, ...colors };
      this.drawPixels(prefix, hero(LEGS_IDLE), pal);          // idle == base key
      this.drawPixels(`${prefix}_walk1`, hero(LEGS_WALK_A), pal);
      this.drawPixels(`${prefix}_walk2`, hero(LEGS_WALK_B), pal);
      this.drawPixels(`${prefix}_jump`, hero(LEGS_JUMP), pal);
      this.drawPixels(`${prefix}_hurt`, heroHurt(LEGS_IDLE), pal);
    };
    make('player1', P1_COLORS);
    make('player2', P2_COLORS);
  }

  private buildEnemies(): void {
    this.drawPixels('goomba', CRITTER_1, CRIT);
    this.drawPixels('goomba_walk1', CRITTER_1, CRIT);
    this.drawPixels('goomba_walk2', CRITTER_2, CRIT);

    // Charging Bull — stocky, horned, drawn with graphics primitives (it's wide).
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x161325); g.fillRoundedRect(0, 8, 44, 26, 6);     // outline body
    g.fillStyle(0xcc5a22); g.fillRoundedRect(2, 10, 40, 22, 5);    // body
    g.fillStyle(0xa8461a); g.fillRoundedRect(2, 22, 40, 10, 5);    // belly shade
    g.fillStyle(0x161325);                                         // horns
    g.fillTriangle(2, 10, 7, -2, 12, 10);
    g.fillTriangle(42, 10, 37, -2, 32, 10);
    g.fillStyle(0xf2efe6);
    g.fillTriangle(4, 9, 7, 1, 10, 9);
    g.fillTriangle(40, 9, 37, 1, 34, 9);
    g.fillStyle(0x3a2414);                                         // legs
    g.fillRect(6, 30, 6, 6); g.fillRect(16, 30, 6, 6); g.fillRect(24, 30, 6, 6); g.fillRect(34, 30, 6, 6);
    g.fillStyle(0xffffff); g.fillCircle(9, 17, 3); g.fillCircle(17, 17, 3);   // eyes
    g.fillStyle(0xc0202a); g.fillCircle(9, 17, 1.4); g.fillCircle(17, 17, 1.4);
    g.fillStyle(0x2a2740); g.fillRect(5, 12, 6, 2); g.fillRect(15, 12, 6, 2); // angry brows
    g.fillStyle(0xffe08a); g.fillCircle(35, 24, 2); g.fillCircle(40, 22, 2);  // snort
    g.generateTexture('bull', 44, 36);
    g.destroy();
  }

  private buildPickups(): void {
    // Spinning coin — 4 frames squeezing the ellipse like a flipping disc.
    const widths = [22, 13, 4, 13];
    widths.forEach((w, i) => {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x161325); g.fillEllipse(16, 16, w + 4, 28);
      g.fillStyle(0xffd23f); g.fillEllipse(16, 16, w, 24);
      if (w > 6) {
        g.fillStyle(0xffe892); g.fillEllipse(16 - w * 0.18, 14, w * 0.4, 14);
        g.fillStyle(0xd79a17); g.fillEllipse(16, 16, w * 0.5, 16);
        g.fillStyle(0xffd23f); g.fillEllipse(16, 16, w * 0.36, 13);
      }
      g.generateTexture(i === 0 ? 'coin' : `coin${i}`, 32, 32);
      g.destroy();
    });

    this.drawPixels('mushroom', MUSHROOM, MUSH);
  }

  private buildTiles(): void {
    // Ground — earthy with a grass crown and speckles.
    let g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x7a4a23); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x96673a); g.fillRect(0, 0, 32, 10);
    g.fillStyle(0x57c54a); g.fillRect(0, 0, 32, 8);
    g.fillStyle(0x3fa238); g.fillRect(0, 6, 32, 3);
    g.fillStyle(0x6b3f1d);
    g.fillRect(6, 16, 3, 3); g.fillRect(20, 14, 3, 3); g.fillRect(14, 24, 3, 3); g.fillRect(25, 22, 2, 2);
    g.lineStyle(2, 0x3a2414); g.strokeRect(1, 1, 30, 30);
    g.generateTexture('ground', 32, 32); g.destroy();

    // Brick.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x2a1408); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0xc66a2e); g.fillRect(1, 1, 30, 14); g.fillRect(1, 17, 14, 14); g.fillRect(17, 17, 14, 14);
    g.fillStyle(0xe08a4a); g.fillRect(1, 1, 30, 3); g.fillRect(1, 17, 14, 3); g.fillRect(17, 17, 14, 3);
    g.generateTexture('brick', 32, 32); g.destroy();

    // Question block — beveled gold with a glowing "?".
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x161325); g.fillRoundedRect(0, 0, 32, 32, 4);
    g.fillStyle(0xffc01e); g.fillRoundedRect(2, 2, 28, 28, 3);
    g.fillStyle(0xffe27a); g.fillRoundedRect(2, 2, 28, 5, 2);
    g.fillStyle(0xcf8e10); g.fillRoundedRect(2, 25, 28, 5, 2);
    g.fillStyle(0xffffff);
    g.fillRect(11, 9, 10, 3); g.fillRect(18, 11, 3, 4); g.fillRect(14, 15, 5, 3); g.fillRect(14, 18, 3, 3);
    g.fillRect(14, 23, 3, 3); // dot
    g.fillStyle(0x161325); g.fillCircle(6, 6, 1.4); g.fillCircle(26, 6, 1.4); g.fillCircle(6, 26, 1.4); g.fillCircle(26, 26, 1.4);
    g.generateTexture('question', 32, 32); g.destroy();

    // Floating platform.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x161325); g.fillRoundedRect(0, 0, 32, 32, 4);
    g.fillStyle(0xcd8f4f); g.fillRoundedRect(1, 1, 30, 30, 3);
    g.fillStyle(0xe7bd86); g.fillRect(3, 3, 26, 6);
    g.generateTexture('platform', 32, 32); g.destroy();

    // Pipe body + top lip.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x0c4a16); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x29a531); g.fillRect(2, 0, 28, 32);
    g.fillStyle(0x6fe06a); g.fillRect(4, 0, 6, 32);
    g.fillStyle(0x14761d); g.fillRect(24, 0, 6, 32);
    g.generateTexture('pipe', 32, 32); g.destroy();

    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x0c4a16); g.fillRect(0, 6, 32, 26);
    g.fillStyle(0x29a531); g.fillRect(2, 8, 28, 24);
    g.fillStyle(0x6fe06a); g.fillRect(4, 8, 6, 24);
    g.fillStyle(0x14761d); g.fillRect(24, 8, 6, 24);
    g.fillStyle(0x0c4a16); g.fillRect(-2, 0, 36, 8);
    g.fillStyle(0x29a531); g.fillRect(0, 2, 32, 6);
    g.fillStyle(0x6fe06a); g.fillRect(2, 2, 8, 4);
    g.generateTexture('pipe_top', 32, 32); g.destroy();

    // Spike.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x9aa3ad); g.fillTriangle(0, 32, 8, 6, 16, 32); g.fillTriangle(16, 32, 24, 6, 32, 32);
    g.fillStyle(0xced6dd); g.fillTriangle(2, 32, 8, 10, 10, 32); g.fillTriangle(18, 32, 24, 10, 26, 32);
    g.fillStyle(0x5b636b); g.fillRect(0, 28, 32, 4);
    g.generateTexture('spike', 32, 32); g.destroy();

    // Door.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x3a2414); g.fillRoundedRect(0, 0, 32, 64, 6);
    g.fillStyle(0x7a4a23); g.fillRoundedRect(3, 3, 26, 60, 4);
    g.fillStyle(0x5e3a1c); g.fillRoundedRect(6, 8, 20, 22, 3); g.fillRoundedRect(6, 34, 20, 22, 3);
    g.fillStyle(0xffd23f); g.fillCircle(24, 36, 2.5);
    g.generateTexture('door', 32, 64); g.destroy();

    // Flagpole.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xbfc6cc); g.fillRect(13, 4, 5, 124);
    g.fillStyle(0xe7ecef); g.fillRect(13, 4, 2, 124);
    g.fillStyle(0xffd23f); g.fillCircle(15, 6, 7);
    g.fillStyle(0xffe892); g.fillCircle(13, 4, 2.5);
    g.fillStyle(0x161325); g.fillTriangle(18, 10, 18, 40, 50, 25);
    g.fillStyle(0x39c46a); g.fillTriangle(18, 12, 18, 38, 46, 25);
    g.fillStyle(0xffffff); g.fillCircle(28, 25, 4);
    g.generateTexture('flagpole', 56, 132); g.destroy();
  }

  private buildScenery(): void {
    // Vertical sky gradients, one per level theme (stretched across the world).
    const skies: Array<[string, number, number]> = [
      ['sky',        0x5aa9ff, 0xbfe6ff], // grassland day
      ['sky_sunset', 0x5b4a8a, 0xffa566], // purple -> orange
      ['sky_dusk',   0x3a3a6e, 0xb87fae], // dusky violet
      ['sky_night',  0x0b1030, 0x26407a], // deep night
      ['sky_snow',   0x8fb6e0, 0xe6f1ff], // pale cold
      ['sky_cave',   0x141021, 0x3a3450], // dark cavern
    ];
    // Draw the gradient as interpolated horizontal bands. (Graphics
    // fillGradientStyle is a vertex-tint effect that doesn't bake into
    // generateTexture, so we lerp the colors ourselves.)
    const lerpColor = (a: number, b: number, t: number): number => {
      const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
      const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
      const r = Math.round(ar + (br - ar) * t);
      const gg = Math.round(ag + (bg - ag) * t);
      const bl = Math.round(ab + (bb - ab) * t);
      return (r << 16) | (gg << 8) | bl;
    };
    for (const [key, top, bottom] of skies) {
      const sky = this.make.graphics({ x: 0, y: 0 });
      const bands = 96;
      const bandH = 720 / bands;
      for (let i = 0; i < bands; i++) {
        sky.fillStyle(lerpColor(top as number, bottom as number, i / (bands - 1)), 1);
        sky.fillRect(0, Math.floor(i * bandH), 16, Math.ceil(bandH) + 1);
      }
      sky.generateTexture(key as string, 16, 720);
      sky.destroy();
    }

    // Sun with soft glow.
    let g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xfff3b0, 0.25); g.fillCircle(60, 60, 58);
    g.fillStyle(0xfff3b0, 0.4); g.fillCircle(60, 60, 44);
    g.fillStyle(0xffe066, 1); g.fillCircle(60, 60, 32);
    g.fillStyle(0xfff4c0, 1); g.fillCircle(52, 52, 12);
    g.generateTexture('sun', 120, 120); g.destroy();

    // Cloud.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(26, 34, 20); g.fillCircle(52, 26, 27); g.fillCircle(84, 34, 22);
    g.fillCircle(40, 44, 22); g.fillCircle(70, 44, 22);
    g.fillStyle(0xe6f2ff, 1); g.fillRect(18, 44, 76, 12);
    g.generateTexture('cloud', 110, 60); g.destroy();

    // Hill.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x3fa83f, 1); g.fillEllipse(60, 72, 120, 96);
    g.fillStyle(0x349037, 1); g.fillEllipse(60, 82, 120, 70);
    g.fillStyle(0x53c150, 1); g.fillEllipse(42, 56, 30, 22);
    g.generateTexture('hill', 120, 84); g.destroy();

    // Bush.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x2f9c3e, 1);
    g.fillCircle(16, 26, 15); g.fillCircle(36, 20, 18); g.fillCircle(56, 26, 15);
    g.fillRect(2, 26, 66, 14);
    g.fillStyle(0x3fb851, 1); g.fillCircle(34, 17, 8);
    g.generateTexture('bush', 70, 42); g.destroy();
  }

  private buildParticles(): void {
    let g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1); g.fillCircle(5, 5, 5);
    g.generateTexture('dust', 10, 10); g.destroy();

    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xfff2a0, 1); g.fillRect(0, 0, 5, 5);
    g.generateTexture('spark', 5, 5); g.destroy();

    // Four-point star.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(8, 0, 6, 8, 10, 8); g.fillTriangle(8, 16, 6, 8, 10, 8);
    g.fillTriangle(0, 8, 8, 6, 8, 10); g.fillTriangle(16, 8, 8, 6, 8, 10);
    g.fillStyle(0xfff2a0, 1); g.fillCircle(8, 8, 3);
    g.generateTexture('star', 16, 16); g.destroy();

    // Bubble — soft glassy sphere.
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x9fd8ff, 0.16); g.fillCircle(28, 28, 27);
    g.lineStyle(3, 0xffffff, 0.7); g.strokeCircle(28, 28, 26);
    g.lineStyle(2, 0xbfe9ff, 0.5); g.strokeCircle(28, 28, 22);
    g.fillStyle(0xffffff, 0.85); g.fillCircle(19, 17, 5);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(36, 22, 3);
    g.generateTexture('bubble', 56, 56); g.destroy();
  }

  private buildAnims(): void {
    const def = (key: string, frames: string[], frameRate: number, repeat: number) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: frames.map(f => ({ key: f })),
        frameRate,
        repeat,
      });
    };

    for (const p of ['player1', 'player2']) {
      const n = p === 'player1' ? 'p1' : 'p2';
      def(`${n}-idle`, [p], 1, -1);
      def(`${n}-walk`, [`${p}_walk1`, p, `${p}_walk2`, p], 12, -1);
      def(`${n}-jump`, [`${p}_jump`], 1, -1);
      def(`${n}-hurt`, [`${p}_hurt`], 1, -1);
    }

    def('goomba-walk', ['goomba_walk1', 'goomba_walk2'], 6, -1);
    def('coin-spin', ['coin', 'coin1', 'coin2', 'coin3'], 10, -1);
  }
}
