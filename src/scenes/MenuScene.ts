import Phaser from 'phaser';
import { Button } from '../components/Button';
import { hasSaveData } from '../sim/SaveData';
import { ValueModel } from '../util/ValueModel';

const versionStr = `Version ${__VERSION__} - ${__BUILD_DATE__}`;

export default class extends Phaser.Scene {

	constructor() {
		super({ key: 'MenuScene' });
	}

	create() {
		this.cameras.main.setBackgroundColor('#000000');

		const buttonWidth = 240;
		const style = { fontSize: '22px' };
		let yco = this.cameras.main.centerY - 60;
		new Button(this, this.cameras.main.centerX - (buttonWidth / 2), yco, buttonWidth, 36, "Start Game", {
			callback: () => { this.scene.start('Story'); },
			style,
		});
		yco += 44;
		new Button(this, this.cameras.main.centerX - (buttonWidth / 2), yco, buttonWidth, 36, "Load Game", {
			callback: () => { this.scene.start('Level', { loadFromSave: true }); },
			disabled: !hasSaveData(),
			style,
		});
		yco += 44;
		
		const fullScreenLabel = new ValueModel("Fullscreen");
		document.addEventListener('fullscreenchange', () => {
			fullScreenLabel.set( document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen" );
		});

		new Button(this, this.cameras.main.centerX - (buttonWidth / 2), yco, buttonWidth, 36, fullScreenLabel, {
			callback: () => this.scale.toggleFullscreen(),
			style,
		});

		this.add.text(0, this.cameras.main.height - 16, versionStr, {
			fontSize: '12px', color: '#ccc',
		});

		// star emitter
		this.add.particles(0, 0, 'flares', {
			frame: { frames: [ 'white' ] },
			blendMode: 'ADD',
			lifespan: 5000,
			scale: 0.05,
			x: 0,
			y: { min: 0, max: this.cameras.main.height },
			speedX: { min: 100, max: 400 },
			speedY: 0,
			quantity: 1,
			advance: 5000,
		});
	}

	preload() {
	}

	update() {
	}

}


