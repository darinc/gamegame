import Phaser from 'phaser';
import { gameConfig } from './config';
import './style.css';

// Initialize the game
const game = new Phaser.Game(gameConfig);

// Expose game instance for debugging
declare global {
  interface Window {
    game: Phaser.Game;
  }
}
window.game = game;

// Log gamepad connections for debugging
window.addEventListener('gamepadconnected', (e) => {
  console.log(`Gamepad connected: ${e.gamepad.id} (index: ${e.gamepad.index})`);
});

window.addEventListener('gamepaddisconnected', (e) => {
  console.log(`Gamepad disconnected: ${e.gamepad.id}`);
});
