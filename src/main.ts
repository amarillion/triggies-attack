import Phaser from 'phaser';

import BootScene from './scenes/Boot.js';
import { LevelSplash, TinsSplash, WinSplash } from './scenes/Splash.js';
import MenuScene from './scenes/MenuScene.js';
import Level from './scenes/Level.js';
import Space from './scenes/Space.js';
import Story from './scenes/Story.js';
import { CircuitBoard } from './scenes/CircuitBoard.js';

const gameConfig = {
	type: Phaser.AUTO,
	localStorageName: 'helix-triggies',
	backgroundColor: '#421a42',
	fps: { target: 60 },
	pixelArt: true,
	scale: {
		mode: Phaser.Scale.FIT,
		width: 640,
		height: 360,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		autoRound: true,
	},
	scene: [
		BootScene, TinsSplash, LevelSplash, WinSplash, MenuScene,
		Story,

		// NOTE: Order seems important. Level must come before the scenes it launches, or all will fail silently.
		Level,
		Space, CircuitBoard,
	],
};

class Game extends Phaser.Game {
	constructor() {
		super(gameConfig);
		this.input.mouse?.disableContextMenu();
		this.scale.lockOrientation('landscape'); // Doesn't seem to actually do anything?
	}
}

export const game = new Game();
