import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import {
  buildSettings,
  parseSettingsFromURL,
  shouldAutostart,
  MODE_PRESETS,
} from '../settings';

interface MenuOption {
  label: string;
  preset: keyof typeof MODE_PRESETS;
  hint: string;
}

const OPTIONS: MenuOption[] = [
  { label: '2 PLAYERS  —  Co-op',      preset: 'coop',  hint: 'Grab a friend. Two humans, one keyboard.' },
  { label: '1 PLAYER  +  CPU BUDDY',   preset: 'buddy', hint: 'Play co-op solo — the CPU tags along.' },
  { label: '1 PLAYER',                 preset: 'solo',  hint: 'Just you.' },
  { label: 'BOT DEMO  (watch)',        preset: 'demo',  hint: 'Sit back and watch the bots play.' },
];

export class TitleScene extends Phaser.Scene {
  private selected = 0;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private hintText!: Phaser.GameObjects.Text;
  private prevPadY = 0;
  private prevPadConfirm = false;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    // Power users / automated playtester can skip straight into a configured game.
    if (shouldAutostart()) {
      this.scene.start('GameScene', buildSettings(parseSettingsFromURL()));
      return;
    }

    this.selected = 0;
    this.optionTexts = [];

    this.drawBackdrop();

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 130, 'SUPER CO-OP BROS', {
      fontSize: '72px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#7a3b00',
      strokeThickness: 10,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: title,
      y: 120,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(GAME_WIDTH / 2, 196, 'endless easy levels, made for two', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'italic',
      stroke: '#003366',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Menu options
    const startY = 290;
    OPTIONS.forEach((opt, i) => {
      const t = this.add.text(GAME_WIDTH / 2, startY + i * 56, opt.label, {
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      }).setOrigin(0.5);
      this.optionTexts.push(t);
    });

    this.hintText = this.add.text(GAME_WIDTH / 2, startY + OPTIONS.length * 56 + 24, '', {
      fontSize: '20px',
      color: '#FFE08A',
    }).setOrigin(0.5);

    // Controls footer
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 70,
      'P1: W A S D  (W jump, Shift run, Q bubble)        P2: Arrow Keys  (Up jump, Space run, / bubble)',
      { fontSize: '18px', color: '#cfe8ff' },
    ).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 38,
      '↑↓ choose      Enter / Jump to start      Gamepads supported',
      { fontSize: '18px', color: '#9fcaff' },
    ).setOrigin(0.5);

    this.bindKeys();
    this.refresh();
  }

  private drawBackdrop(): void {
    // Sky
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x5c94fc);

    // A few clouds + hills for charm (textures generated in BootScene).
    if (this.textures.exists('cloud')) {
      [[180, 110, 1.2], [1040, 90, 1.0], [620, 70, 0.8], [900, 200, 0.7]].forEach(
        ([x, y, s]) => this.add.image(x, y, 'cloud').setScale(s).setAlpha(0.95),
      );
    }
    if (this.textures.exists('hill')) {
      this.add.image(260, GAME_HEIGHT - 40, 'hill').setScale(2.2).setAlpha(0.9);
      this.add.image(1000, GAME_HEIGHT - 40, 'hill').setScale(3).setAlpha(0.9);
    }
    // Ground strip
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 16, GAME_WIDTH, 32, 0x8b4513);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 30, GAME_WIDTH, 6, 0x228b22);

    // The two heroes waving hello.
    if (this.textures.exists('player1')) {
      const p1 = this.add.image(GAME_WIDTH / 2 - 70, GAME_HEIGHT - 58, 'player1');
      const p2 = this.add.image(GAME_WIDTH / 2 + 70, GAME_HEIGHT - 58, 'player2');
      [p1, p2].forEach((p, i) => {
        this.tweens.add({
          targets: p,
          y: p.y - 14,
          duration: 520,
          yoyo: true,
          repeat: -1,
          delay: i * 260,
          ease: 'Sine.easeInOut',
        });
      });
    }
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-W', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-S', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
  }

  private move(dir: number): void {
    this.selected = (this.selected + dir + OPTIONS.length) % OPTIONS.length;
    this.refresh();
  }

  private refresh(): void {
    this.optionTexts.forEach((t, i) => {
      const on = i === this.selected;
      t.setText((on ? '▶ ' : '   ') + OPTIONS[i].label);
      t.setColor(on ? '#FFD700' : '#ffffff');
      t.setScale(on ? 1.12 : 1);
    });
    this.hintText.setText(OPTIONS[this.selected].hint);
  }

  private confirm(): void {
    const preset = OPTIONS[this.selected].preset;
    this.cameras.main.flash(180, 255, 255, 255);
    this.time.delayedCall(120, () => {
      this.scene.start('GameScene', buildSettings(MODE_PRESETS[preset]));
    });
  }

  update(): void {
    // Gamepad navigation (poll with simple edge detection).
    if (!this.input.gamepad) return;
    for (const pad of this.input.gamepad.gamepads) {
      if (!pad) continue;
      const y = (pad.axes.length > 1 ? pad.axes[1].getValue() : 0);
      const dpadUp = pad.buttons[12]?.pressed;
      const dpadDown = pad.buttons[13]?.pressed;
      const up = y < -0.5 || dpadUp;
      const down = y > 0.5 || dpadDown;
      if (up && this.prevPadY >= 0) this.move(-1);
      else if (down && this.prevPadY <= 0) this.move(1);
      this.prevPadY = up ? -1 : down ? 1 : 0;

      const confirm = pad.buttons[0]?.pressed || pad.buttons[9]?.pressed; // A/B or Start
      if (confirm && !this.prevPadConfirm) this.confirm();
      this.prevPadConfirm = !!confirm;
      return; // only first connected pad drives the menu
    }
  }
}
