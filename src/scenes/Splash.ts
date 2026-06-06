import Phaser from 'phaser';

const FADE_DURATION_MSEC = 1000;
const SHOW_DURATION_MSEC = 2000;

interface SplashChild {
	preload(scene: Phaser.Scene): void,
	create(scene: Phaser.Scene, data?: unknown): void,
	next(scene: Phaser.Scene, data?: unknown): void,
}

class AbstractSplash extends Phaser.Scene {
	
	constructor(key: string, child: SplashChild) {
		super({ key });
		this.child = child;
	}

	preload() {
		this.child?.preload(this);
	}

	child?: SplashChild;
	
	myData?: unknown;

	create(data?: unknown) {
		this.fadeStarted = false;
		this.child?.create(this, data);
		this.myData = data;

		this.cameras.main.fadeIn(FADE_DURATION_MSEC, 0, 0, 0);
		this.time.delayedCall(FADE_DURATION_MSEC + SHOW_DURATION_MSEC, () => this.startFade());
		
		this.input.keyboard?.once('keydown', () => this.startFade());
		this.input.on('pointerdown', () => this.startFade());
	}

	private fadeStarted = false;
	startFade() {
		if (!this.fadeStarted) {
			this.fadeStarted = true;
			this.cameras.main.fadeOut(FADE_DURATION_MSEC, 0, 0, 0);

			this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
				this.child?.next(this, this.myData);
			});
		}
	}
}

export class TinsSplash extends AbstractSplash {
	
	constructor() {
		super('TinsSplash', {
			preload(scene: Phaser.Scene) {
				scene.load.image('tins-logo', './images/tinslogo06.png');
			},

			create(scene: Phaser.Scene) {
				scene.cameras.main.setBackgroundColor('#ffffff');

				// TODO: scale up logo.
				const image = new Phaser.GameObjects.Image(
					scene, scene.cameras.main.centerX, scene.cameras.main.centerY, 'tins-logo',
				);
				scene.add.existing(image);

			},

			next(scene: Phaser.Scene) {
				scene.scene.start('MenuScene');
			},
		});
	}

}

export class WinSplash extends AbstractSplash {
	
	constructor() {
		super('WinSplash', {
			preload() {
			},

			create(scene: Phaser.Scene) {
				scene.cameras.main.setBackgroundColor('#ffffff');

				scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, "Congratulations!\nYou win the game!", {
					fontSize: '48px',
					color: '#000000',
				}).setOrigin(0.5);

			},

			next(scene: Phaser.Scene) {
				scene.scene.start('MenuScene');
			},
		});
	}

}

export class LevelSplash extends AbstractSplash {
	
	constructor() {
		super('LevelSplash', {
			preload() {
			},

			create(scene: Phaser.Scene, data: { levelNo: number }) {
				scene.cameras.main.setBackgroundColor('#000000');

				scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, `Level ${data?.levelNo + 1}`, {
					fontSize: '48px',
					color: '#ffffff',
				}).setOrigin(0.5);

			},

			next(scene: Phaser.Scene, data?: { levelNo: number }) {
				scene.scene.start('Level', { levelNo: data?.levelNo });
			},
		});
	}

}
