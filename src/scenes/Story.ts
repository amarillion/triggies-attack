import Phaser from "phaser";
import { Point } from "../util/point";

const ENSIGN = {
	name: "Ensign Boterham",
	frame: 2,
};
const CAPTAIN = {
	name: "Captain Raul",
	frame: 0,
};
const ENGINEER = {
	name: "Chief Engineer Fole",
	frame: 1,
};

type ScriptItem = {
	type: "scene", image: string,
} | {
	type: "dialog", who: { name: string, frame: number }, text: string,
} | {
	type: "sleep", time: number,
} | {
	type: "shake",
};

const script: ScriptItem[] = [
	{ type: "scene", image: "scene1" },
	{ type: "sleep", time: 2000 },
	{ type: "shake" },
	{ type: "sleep", time: 500 },
	{ type: "shake" },
	{ type: "sleep", time: 1000 },
	{ type: "dialog", who: ENSIGN, text: "Captain. The triggies have grown out of control. They are attacking the ship!" },
	{ type: "scene", image: "scene2" },
	{ type: "sleep", time: 500 },
	{ type: "dialog", who: CAPTAIN, text: "Fire forward lasers!" },
	{ type: "scene", image: "scene1" },
	{ type: "sleep", time: 500 },
	{ type: "shake" },
	{ type: "sleep", time: 500 },
	{ type: "dialog", who: ENSIGN, text: "Lasers failed to connect, Captain. The enemy is taking evasive manouvres." },
	{ type: "scene", image: "scene2" },
	{ type: "sleep", time: 500 },
	{ type: "shake" },
	{ type: "sleep", time: 500 },
	{ type: "shake" },
	{ type: "sleep", time: 500 },
	{ type: "dialog", who: ENSIGN, text: "Hull structural integrity at 45%" },
	{ type: "dialog", who: CAPTAIN, text: "Chief engineer Fole, we are powerless here. Can you do something?" },
	{ type: "scene", image: "scene3" },
	{ type: "sleep", time: 500 },
	{ type: "dialog", who: ENGINEER, text: "You're asking the impossible, captain. I cannae change the laws of physics." },
	{ type: "dialog", who: CAPTAIN, text: "Just find a loophole, damn it!" },
	{ type: "dialog", who: ENGINEER, text: "Well perhaps I can try to modulate the laser frequency by rewiring the control module." },
	{ type: "dialog", who: CAPTAIN, text: "Make it so." },
	{ type: "dialog", who: ENGINEER, text: "It will be ready in just a whiffy, captain." },
];

export default class extends Phaser.Scene {

	constructor() {
		super({ key: 'Story' });
	}

	create() {
		this.cameras.main.setBackgroundColor('rgb(68, 50, 0)');
		this.script = this.scriptRunner();

		this.input.on('pointerdown', () => this.endScene());
		this.input.keyboard?.once('keydown', () => this.endScene());
	}

	script?: Generator<void>;

	endScene() {
		this.script = undefined;
		this.scene.start('LevelSplash', { levelNo: 0 });
	}

	preload() {
	}

	update() {
		if (this.script) {
			const result = this.script.next();
			
			if (result.done) {
				this.endScene();
			}
		}
	}

	dialogText?: Phaser.GameObjects.Text;
	nameText?: Phaser.GameObjects.Text;
	portrait?: Phaser.GameObjects.Image;
	dialogFrame?: Phaser.GameObjects.Graphics;

	showDialog(who: string, text: string, portraitFrame: number) {
		const BASE = new Point(20, 260);
		const SIZE = new Point(600, 84);

		// draw a rounded rectangle behind the dialog text, to make it more readable.
		this.dialogFrame = this.add.graphics(
			{ lineStyle: { width: 2, color: 0xffffff }, fillStyle: { color: 0x3939d6, alpha: 0.8 } });
		this.dialogFrame
			.fillRoundedRect(BASE.x, BASE.y, SIZE.x, SIZE.y, 8)
			.strokeRoundedRect(BASE.x, BASE.y, SIZE.x, SIZE.y, 8);
		
		this.nameText = this.add.text(BASE.x, BASE.y, who, {
			fontSize: '16px',
			fontStyle: 'bold',
			color: '#ffffff',
			fixedWidth: SIZE.x,
			fixedHeight: SIZE.y,
			wordWrap: { width: SIZE.x - 80 },
			padding: { left: 80, top: 6 },
		});
		this.dialogText = this.add.text(BASE.x, BASE.y, text, {
			fontSize: '16px',
			color: '#ffffff',
			fixedWidth: SIZE.x,
			fixedHeight: SIZE.y,
			padding: { left: 80, top: 30 },
			wordWrap: { width: SIZE.x - 80 },
		});
		this.portrait = this.add.image(BASE.x + 40, BASE.y + 40, 'portraits', portraitFrame);
	}
	
	clearDialog() {
		this.nameText?.destroy();
		this.dialogText?.destroy();
		this.portrait?.destroy();
		this.dialogFrame?.destroy();
	}

	*waitMsec(ms: number) {
		let done = false;
		this.time.delayedCall(ms, () => done = true);
		while (!done) {
			yield;
		}
	}

	sceneImage?: Phaser.GameObjects.Image;

	setSceneImage(image: string) {
		if (this.sceneImage) {
			this.sceneImage.destroy();
		}
		this.sceneImage = this.add.image(320, 140, image);
	}
	
	*scriptRunner() {
		for (const line of script) {
			if (line.type === "scene") {
				this.setSceneImage(line.image);
			}
			else if (line.type === "dialog") {
				this.showDialog(line.who.name, line.text, line.who.frame);
				for (let i = 0; i < line.text.length; i++) {
					this.dialogText!.setText(line.text.slice(0, i + 1));
					const delay = 40;
					yield *this.waitMsec(delay);
				}
				yield *this.waitMsec(1000);
				this.clearDialog();
			}
			else if (line.type === "shake") {
				this.cameras.main.shake(500, 0.01);
				yield *this.waitMsec(500);
			}
			else if (line.type === "sleep") {
				yield *this.waitMsec(line.time);
			}
		}
	}
}
