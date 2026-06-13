// Central game settings shared across scenes (Title -> Game -> LevelComplete -> ...)
//
// The whole game flows around a single GameSettings object that is passed via
// scene data. Defaults are tuned for the core use case: two people who love the
// *easy* Mario levels, playing together, with as little setup as possible.

export type GenMode = 'hybrid' | 'procedural' | 'named';

export interface PlayerState {
  health: number;
  isPoweredUp: boolean;
}

export interface GameSettings {
  playerCount: number;       // 1 or 2
  botMask: boolean[];        // botMask[i] === true => player i is AI controlled
  genMode: GenMode;
  difficulty: number;        // generator difficulty (easy ~ 2)
  levelName?: string;        // used when genMode === 'named'
  levelNumber: number;       // 1-based, increments each completed level (endless)

  // State carried between levels
  lives: number;
  coins: number;
  score: number;
  playerStates: PlayerState[];
}

// Easy + endless + two players, by default. This is the experience we want
// someone to get the instant they open the game.
export const DEFAULT_SETTINGS: GameSettings = {
  playerCount: 2,
  botMask: [false, false],
  genMode: 'hybrid',
  difficulty: 2,
  levelNumber: 1,
  lives: 5,
  coins: 0,
  score: 0,
  playerStates: [],
};

// Presets the title screen offers. Each only overrides player/bot config.
export const MODE_PRESETS: Record<string, Partial<GameSettings>> = {
  coop:    { playerCount: 2, botMask: [false, false] }, // two humans
  buddy:   { playerCount: 2, botMask: [false, true] },  // human P1 + CPU P2
  solo:    { playerCount: 1, botMask: [false] },        // one human
  demo:    { playerCount: 2, botMask: [true, true] },   // watch the bots
};

// Parse settings overrides from the URL. Lets power users (and the automated
// playtester) launch any configuration directly, e.g.
//   ?autostart=1&mode=demo&difficulty=2
//   ?players=2&bot=2&hybrid=true
export function parseSettingsFromURL(): Partial<GameSettings> {
  const p = new URLSearchParams(window.location.search);
  const out: Partial<GameSettings> = {};

  // Named preset wins if present.
  const mode = p.get('mode');
  if (mode && MODE_PRESETS[mode]) {
    Object.assign(out, MODE_PRESETS[mode]);
  }

  const players = p.get('players');
  if (players) {
    out.playerCount = clamp(parseInt(players, 10) || 1, 1, 2);
  }

  // bot=1 | bot=2 | bot=both/all  (1-indexed player numbers)
  const bot = p.get('bot');
  if (bot) {
    const count = out.playerCount ?? DEFAULT_SETTINGS.playerCount;
    const mask = new Array(Math.max(count, 2)).fill(false);
    if (bot === 'both' || bot === 'all') {
      mask.fill(true);
    } else {
      const idx = parseInt(bot, 10) - 1;
      if (idx >= 0 && idx < mask.length) mask[idx] = true;
    }
    out.botMask = mask;
  }

  if (p.get('hybrid') === 'true') out.genMode = 'hybrid';
  if (p.get('procedural') === 'true') out.genMode = 'procedural';

  const level = p.get('level');
  if (level) {
    out.genMode = 'named';
    out.levelName = level;
  }

  const difficulty = p.get('difficulty');
  if (difficulty) out.difficulty = clamp(parseInt(difficulty, 10) || 2, 1, 10);

  const seed = p.get('seed');
  if (seed) (out as Record<string, unknown>).seed = parseInt(seed, 10);

  return out;
}

export function shouldAutostart(): boolean {
  const p = new URLSearchParams(window.location.search);
  // Explicit ?autostart=1, or any legacy gameplay param implies "skip the menu".
  return (
    p.get('autostart') === '1' ||
    p.has('mode') ||
    p.has('players') ||
    p.has('bot') ||
    p.has('hybrid') ||
    p.has('procedural') ||
    p.has('level')
  );
}

export function buildSettings(overrides: Partial<GameSettings>): GameSettings {
  const merged: GameSettings = {
    ...DEFAULT_SETTINGS,
    ...overrides,
    // Don't let a shallow merge share the default array references.
    botMask: (overrides.botMask ?? DEFAULT_SETTINGS.botMask).slice(),
    playerStates: (overrides.playerStates ?? []).slice(),
  };
  // Keep botMask length consistent with player count.
  while (merged.botMask.length < merged.playerCount) merged.botMask.push(false);
  return merged;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
