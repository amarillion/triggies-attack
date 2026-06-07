import Phaser from "phaser";
import { LevelState } from "../sim/LevelState";
import { Button, ToggleButton, ToggleButtonGroup } from "../components/Button";
import levelData from '../data/levels.json';
import { getQuickSaveData, hasSaveData, saveGameData } from "../sim/SaveData";
import { assert } from "../util/assert";
import { BuildModeSwitch } from "../sprites/BuildMode";
import { getLevelData } from "../sim/LevelData";
import { componentExists, getComponentInfo } from "../sim/ComponentInfo";
import { BooleanModel } from "../util/ValueModel";

export default class extends Phaser.Scene {

	constructor() {
		super({ key: 'Level' });
	}

	playbackMode: string = "Play";
	frameCounter = 0;
	laserStep = 0;

	level?: LevelState;
	buildModeSwitch? : BuildModeSwitch;

	create(data: { levelNo?: number, loadFromSave?: boolean }) {
		this.cameras.main.setBackgroundColor('#122222');

		const level = new LevelState();
		this.level = level;
		this.level.onLaserCycleComplete.add(isWin => {
			if (isWin) {
				this.onLevelComplete();
			}
		});

		this.buildModeSwitch = new BuildModeSwitch();
		this.buildModeSwitch.onBuildModeChange.add(mode => this.updateHint(mode));

		this.time.addEvent({
			delay: 1000 / 60,
			loop: true,
			callback: () => {
				const before = this.laserStep;
				this.frameCounter++;
				switch(this.playbackMode) {
					case "Pause": /* pause: do nothing */ break;
					case "Step": this.laserStep++; this.playbackMode = "Pause"; break;
					case "Slow": if ((this.frameCounter % 10) === 0) this.laserStep++; break;
					case "Play": if ((this.frameCounter % 2) === 0) this.laserStep++; break;
					case "Fire": this.laserStep++; if (this.level?.laserKillRemain === 0) this.playbackMode = this.oldPlaybackMode; break;
				}
				if (this.laserStep !== before) {
					level?.simulate((this.laserStep % 128) / 128);
				}
			},
		});
	
		this.scene.launch('CircuitBoard', { level, buildModeSwitch: this.buildModeSwitch });
		this.scene.launch('Space', { level });

		let loadSuccess = false;
		if (data.loadFromSave !== null) {
			try {
				level.loadFromSave(getQuickSaveData());
				loadSuccess = true;
			}
			catch(_e) {
				console.log('Could not load save data');
			}
		}
		if (!loadSuccess) {
			level.emptyStart(data.levelNo ?? 0);
		}
		
		console.log("Started level: ", level.currentLevel);
		level.initializeTriggies();

		this.createGameButtons();
		this.createBuildPalette();

		this.hintText = this.add.text(0, 64, '', {
			fontSize: '9px',
			fixedWidth: 320,
			fixedHeight: 40,
			wordWrap: {
				width: 316,
			},
			padding: {
				x: 2, y: 2,
			},
		});

	}

	oldPlaybackMode: string = 'Play';

	hintText? : Phaser.GameObjects.Text;
	setHint(hint: string) {
		this.hintText!.setText(hint);
	}

	updateHint(buildMode: string) {
		let text = "";
		if (componentExists(buildMode)) {
			const { hint, name } = getComponentInfo(buildMode);
			text = `${name}:\n${hint}`;
		}
		else if (buildMode === "Connector") {
			text = "Drag from an output to an input to connect them.";
		}
		else if (buildMode === "Delete") {
			text = "Click on a component or connector to delete it.";
		}
		this.setHint(text);
	}

	onLevelComplete() {
		this.time.addEvent({
			delay: 6000,
			callback: () => {
				assert(this.level);
				this.scene.stop('CircuitBoard');
				this.scene.stop('Space');
				if (this.level.currentLevel === levelData.levels.length - 1) {
					this.scene.start('WinSplash');
				}
				else {
					this.scene.start('LevelSplash', { levelNo: this.level.currentLevel + 1 });
				}
			},
		});
	}

	createGameButtons() {
		{
			const BUTTON_WIDTH = 80;
			const BUTTON_HEIGHT = 16;
			const saveDataInvalid = new BooleanModel(!hasSaveData());
			const actions: [string, () => void, BooleanModel|boolean][] = [
				[ "Quick Load", () => {
					// NOTE: we skip LevelSplash. It's a quick load after all.
					this.scene.start('Level', { loadFromSave: true });
				}, saveDataInvalid ],
				[ "Quick Save", () => {
					saveGameData(this.level!.asSaveData());
					saveDataInvalid.set(false);
				}, false ],
				[ "Fire Laser", () => {
					this.oldPlaybackMode = this.playbackMode;
					this.playbackMode = "Fire";
					this.sound.play('laser');
					if (this.level) this.level.fireLaser();
				}, false ],
			];

			let xco = 640 - (3 * BUTTON_WIDTH);
			for (const [ text, callback, disabled ] of actions) {
				new Button(this, xco, 0, BUTTON_WIDTH, BUTTON_HEIGHT, text, { callback, disabled });
				xco += BUTTON_WIDTH;
			}
		}
		
		{
			const group = new ToggleButtonGroup();
			const control = [
				"Pause", "Step", "Slow", "Play",
			];
			let i = 0;
			for (const text of control) {
				new ToggleButton(this,
					i * 40, 360 - 16, 40, 16, text, { group, onToggle: () => {
						this.playbackMode = text;
					} },
				);
				i++;
			}
		}
	}
	
	createBuildPalette() {
		const shopComponents = getLevelData(this.level!.currentLevel).shop;
		
		const commonComponents = [
			"monitor", "Connector", "Delete",
		];

		const group = new ToggleButtonGroup();

		let xco = 0;
		let yco = 0;
		for (const key of  [ ...shopComponents, ...commonComponents ]) {
			new ToggleButton(this,
				xco * 64, yco * 16, 64, 16, componentExists(key) ? getComponentInfo(key).shortName : key, {
					group,
					onToggle: (isPressed: boolean) => { if (isPressed) { this.buildModeSwitch?.setBuildMode(key); } },
				},
			);
			xco++;
			if (xco > 4) { xco = 0; yco++; }
		}
	}

	preload() {
	}

	update() {
	}

}


