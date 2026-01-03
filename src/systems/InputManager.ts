import Phaser from 'phaser';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  downJustPressed: boolean;
  jump: boolean;
  jumpJustPressed: boolean;
  run: boolean;
  bubble: boolean;
  bubbleJustPressed: boolean;
}

// Switch Pro Controller button mapping (may vary by browser/OS)
// Standard Gamepad API mapping:
// 0 = B (bottom), 1 = A (right), 2 = Y (left), 3 = X (top)
// Note: Switch layout is different from Xbox, browser sees physical positions
const BUTTON_JUMP = 0;    // B button (bottom position on Switch) - like Mario
const BUTTON_RUN = 1;     // A button (right position on Switch)
const BUTTON_BUBBLE = 3;  // X button (top position on Switch)
const AXIS_HORIZONTAL = 0; // Left stick horizontal
const AXIS_VERTICAL = 1;   // Left stick vertical
const DPAD_UP = 12;
const DPAD_DOWN = 13;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;

const DEADZONE = 0.2;

export class InputManager {
  private scene: Phaser.Scene;
  private gamepads: Map<number, Phaser.Input.Gamepad.Gamepad> = new Map();
  private previousButtonStates: Map<number, Map<number, boolean>> = new Map();

  // Keyboard fallback for player 1 and 2
  private keys1!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
    run: Phaser.Input.Keyboard.Key;
    bubble: Phaser.Input.Keyboard.Key;
  };
  private keys2!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
    run: Phaser.Input.Keyboard.Key;
    bubble: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboard();
    this.setupGamepadListeners();
  }

  private setupKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    // Player 1: WASD + Shift + Q for bubble
    this.keys1 = {
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      jump: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      run: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      bubble: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
    };

    // Player 2: Arrow keys + Space + / for bubble
    this.keys2 = {
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      jump: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      run: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      bubble: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH),
    };
  }

  private setupGamepadListeners(): void {
    if (!this.scene.input.gamepad) return;

    this.scene.input.gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      console.log(`InputManager: Gamepad ${pad.index} connected - ${pad.id}`);
      this.gamepads.set(pad.index, pad);
      this.previousButtonStates.set(pad.index, new Map());
    });

    this.scene.input.gamepad.on('disconnected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      console.log(`InputManager: Gamepad ${pad.index} disconnected`);
      this.gamepads.delete(pad.index);
      this.previousButtonStates.delete(pad.index);
    });

    // Check for already-connected gamepads
    if (this.scene.input.gamepad.total > 0) {
      this.scene.input.gamepad.gamepads.forEach((pad) => {
        if (pad) {
          this.gamepads.set(pad.index, pad);
          this.previousButtonStates.set(pad.index, new Map());
        }
      });
    }
  }

  getInput(playerIndex: number): PlayerInput {
    // Try gamepad first
    const gamepadInput = this.getGamepadInput(playerIndex);
    if (gamepadInput) {
      return gamepadInput;
    }

    // Fall back to keyboard
    return this.getKeyboardInput(playerIndex);
  }

  private getGamepadInput(playerIndex: number): PlayerInput | null {
    const pad = this.gamepads.get(playerIndex);
    if (!pad) return null;

    // Get previous button states for this gamepad
    let prevStates = this.previousButtonStates.get(playerIndex);
    if (!prevStates) {
      prevStates = new Map();
      this.previousButtonStates.set(playerIndex, prevStates);
    }

    // Check axes (left stick)
    const horizontal = pad.axes.length > AXIS_HORIZONTAL ? pad.axes[AXIS_HORIZONTAL].getValue() : 0;
    const vertical = pad.axes.length > AXIS_VERTICAL ? pad.axes[AXIS_VERTICAL].getValue() : 0;

    // Check D-pad
    const dpadUp = pad.buttons.length > DPAD_UP && pad.buttons[DPAD_UP].pressed;
    const dpadDown = pad.buttons.length > DPAD_DOWN && pad.buttons[DPAD_DOWN].pressed;
    const dpadLeft = pad.buttons.length > DPAD_LEFT && pad.buttons[DPAD_LEFT].pressed;
    const dpadRight = pad.buttons.length > DPAD_RIGHT && pad.buttons[DPAD_RIGHT].pressed;

    // Combine stick and dpad input
    const left = horizontal < -DEADZONE || dpadLeft;
    const right = horizontal > DEADZONE || dpadRight;
    const up = vertical < -DEADZONE || dpadUp;
    const down = vertical > DEADZONE || dpadDown;

    // Check buttons
    const jumpButton = pad.buttons.length > BUTTON_JUMP ? pad.buttons[BUTTON_JUMP] : null;
    const runButton = pad.buttons.length > BUTTON_RUN ? pad.buttons[BUTTON_RUN] : null;
    const bubbleButton = pad.buttons.length > BUTTON_BUBBLE ? pad.buttons[BUTTON_BUBBLE] : null;

    const jumpPressed = jumpButton?.pressed ?? false;
    const prevJumpPressed = prevStates.get(BUTTON_JUMP) ?? false;
    const jumpJustPressed = jumpPressed && !prevJumpPressed;

    const bubblePressed = bubbleButton?.pressed ?? false;
    const prevBubblePressed = prevStates.get(BUTTON_BUBBLE) ?? false;
    const bubbleJustPressed = bubblePressed && !prevBubblePressed;

    // Track down for ground pound
    const prevDown = prevStates.get(DPAD_DOWN) ?? false;
    const downJustPressed = down && !prevDown;

    // Update previous states
    prevStates.set(BUTTON_JUMP, jumpPressed);
    prevStates.set(BUTTON_BUBBLE, bubblePressed);
    prevStates.set(DPAD_DOWN, down);

    return {
      left,
      right,
      up,
      down,
      downJustPressed,
      jump: jumpPressed,
      jumpJustPressed,
      run: runButton?.pressed ?? false,
      bubble: bubblePressed,
      bubbleJustPressed,
    };
  }

  private getKeyboardInput(playerIndex: number): PlayerInput {
    const keys = playerIndex === 0 ? this.keys1 : this.keys2;

    return {
      left: keys.left.isDown,
      right: keys.right.isDown,
      up: keys.up.isDown,
      down: keys.down.isDown,
      downJustPressed: Phaser.Input.Keyboard.JustDown(keys.down),
      jump: keys.jump.isDown,
      jumpJustPressed: Phaser.Input.Keyboard.JustDown(keys.jump),
      run: keys.run.isDown,
      bubble: keys.bubble.isDown,
      bubbleJustPressed: Phaser.Input.Keyboard.JustDown(keys.bubble),
    };
  }

  getConnectedGamepadCount(): number {
    return this.gamepads.size;
  }

  getGamepadInfo(): string[] {
    const info: string[] = [];
    this.gamepads.forEach((pad, index) => {
      info.push(`P${index + 1}: ${pad.id}`);
    });
    return info;
  }
}
