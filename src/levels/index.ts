import type { LevelData } from './types';
import { level1 } from './level1';
import { smb1_1 } from './smb1_1';

// Level registry - maps level names to level data
export const levels: Record<string, LevelData> = {
  'level1': level1,
  'smb1_1': smb1_1,
};

// Get a level by name, with fallback to level1
export function getLevel(name: string): LevelData {
  return levels[name] || level1;
}

// Get list of available level names
export function getLevelNames(): string[] {
  return Object.keys(levels);
}

// Re-export individual levels for direct import
export { level1 } from './level1';
export { smb1_1 } from './smb1_1';
