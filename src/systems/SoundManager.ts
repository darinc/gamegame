// Placeholder sound manager - logs sounds for now
// Replace with actual audio when assets are available

export class SoundManager {
  private enabled: boolean = true;

  constructor(_scene: Phaser.Scene) {
    // Scene will be used when actual sounds are implemented
  }

  play(_soundName: string): void {
    if (!this.enabled) return;
    // TODO: Replace with actual sound playback
    // console.log(`[Sound] ${_soundName}`);
  }

  playJump(): void {
    this.play('jump');
  }

  playCoin(): void {
    this.play('coin');
  }

  playStomp(): void {
    this.play('stomp');
  }

  playBreakBrick(): void {
    this.play('break');
  }

  playDeath(): void {
    this.play('death');
  }

  toggle(): void {
    this.enabled = !this.enabled;
  }
}
