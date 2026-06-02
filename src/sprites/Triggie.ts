import Phaser from 'phaser';
import { TriggieData, TriggieEvent } from '../sim/LevelState';
import { VIEWPORT_SIZE, MARGIN } from '../scenes/Space';
import { pickOne, randomInt } from '../util/random';

export class Triggie extends Phaser.GameObjects.Sprite {
	
	model: TriggieData;
	currentTween?: Phaser.Tweens.Tween;

	constructor(scene: Phaser.Scene, model: TriggieData) {
		
		super(scene, randomInt(model.x * VIEWPORT_SIZE), randomInt(-200 - model.y * VIEWPORT_SIZE), 'triggies');
		model.onEvent.add(data => this.onHit(data));
		this.model = model;

		let animationKey;
		switch (model.color) {
			case "red": animationKey = "red"; break;
			case "blue": animationKey = "blue"; break;
			case "green": animationKey = "green"; break;
			default: animationKey = pickOne([ "brown", "grey", "moss" ]); break;
		}
		this.scene.time.addEvent({
			delay: randomInt(500),
			callback: () => {
				this.play(animationKey);
				this.goBack();
			},
		});

		this.scene.tweens.add({
			targets: this,
			rotation: Math.random() * 2 * Math.PI,
			duration: Math.random() * 2000 + 1000,
			ease: 'Sine.easeInOut',
			yoyo: true,
			loop: -1,
		});
	}

	onHit({ event }: TriggieEvent) {
		if (event === 'dead') {
			this.moveToContainer();
		}
		else if (event === 'return') {
			this.goBack();
		}
		else if (event === 'explode') {
			this.explode();
		}
	}

	goBack() {
		if (this.currentTween) {
			this.currentTween.stop();
		}

		this.scene.tweens.add({
			targets: this,
			x: this.model.x * (VIEWPORT_SIZE - (MARGIN * 2)) + MARGIN,
			y: VIEWPORT_SIZE - MARGIN - (this.model.y * (VIEWPORT_SIZE - (MARGIN * 2))),
			ease: 'Power1',
			duration: 1000,
		});
	}

	explode() {
		if (this.currentTween) {
			this.currentTween.stop();
		}
		this.scene.tweens.add({
			targets: this,
			x: Math.random() * VIEWPORT_SIZE,
			y: 0 - Math.random() * VIEWPORT_SIZE,
			ease: 'Power1',
			duration: 1000,
		});
	}

	moveToContainer() {
		this.currentTween = this.scene.tweens.add({
			targets: this,
			x: Math.random() * 4,
			y: VIEWPORT_SIZE - Math.random() * 4,
			ease: 'Power1',
			duration: 1000,
			onComplete: () => this.containerMode(),
		});
	}

	containerMode() {
		this.currentTween = this.scene.tweens.add({
			targets: this,
			x: VIEWPORT_SIZE - Math.random() * 4,
			y: VIEWPORT_SIZE - Math.random() * 4,
			ease: 'Sine.easeInOut',
			duration: 1000,
			yoyo: true,
			loop: -1,
		});
	}
}
