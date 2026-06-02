import { componentExists, getComponentInfo } from "../sim/ComponentInfo";
import { Component, LevelState } from "../sim/LevelState";
import { assert } from "../util/assert";
import { Point } from "../util/point";
import { Signal } from "../util/Signal";
import Phaser from 'phaser';

interface DragHandler {
	mouseDragStart(mpos: Point): void,
	/**
	 * @param mx
	 * @param my
	 * @param deltaX horizontal pixels moved since previous invocation
	 * @param deltaY vertical pixels moved since previous invocation
	 */
	mouseDragMove(mpos: Point, delta: Point): void,
	
	mouseDragRelease(mpos: Point): void,
}

export class BuildModeSwitch {

	readonly onBuildModeChange = new Signal<string>();

	currentMode = 'Connector';
	setBuildMode(value: string) {
		this.currentMode = value;
		this.onBuildModeChange.dispatch(value);
	}
}
		
export class ConnectorBuildMode implements DragHandler {
	
	graphics: Phaser.GameObjects.Graphics;
	
	constructor(public scene: Phaser.Scene, public level: LevelState, public buildModeSwitch: BuildModeSwitch) {
		this.level = level;
		this.graphics = scene.add.graphics({
			lineStyle: { width: 2, color: 0x00ff00 },
		});
	}

	redraw() {
		// draw a line from start to end...
	}

	fromPos?: Point;
	toPos?: Point;

	mouseOut() {
		this.graphics.clear();
	}

	mouseDragStart(mpos: Point): void {
		this.fromPos = mpos;

		const { currentMode } = this.buildModeSwitch;
		if (componentExists(currentMode)) {
			// try to place component at mpos
			const componentType = currentMode;
			const size = getComponentInfo(componentType).size;
			if (this.level.isAreaFree(mpos, size )) {
				const comp = new Component(componentType);
				comp.mx = mpos.x;
				comp.my = mpos.y;
				comp.fixed = false;
				this.level.addComponent(comp);
				this.scene.sound.play('component-placed');
			}
			else {
				this.scene.sound.play('denied');
			}
			this.graphics.clear();
		}
		else if (currentMode === "Delete") {
			this.graphics.clear();
			const comp = this.level.findComponentAt(mpos);
			if (comp) {
				if (comp && !comp.fixed) {
					this.level.deleteComponent(comp);
					this.scene.sound.play('component-delete');
					// connectors will be automatically deleted as well.
				}
			}
			else {
				const con = this.level.findConnectorAt(mpos);
				if (con) {
					this.scene.sound.play('component-delete');
					this.level.deleteConnector(con);
				}
			}
		}

	}

	mouseDragMove(mpos: Point, delta: Point): void {
		
		if (this.buildModeSwitch.currentMode === "Connector") {
			const fromPort = this.level.findPort(this.fromPos!);
			const toPort = this.level.findPort(mpos);
			const isValid = fromPort && toPort && fromPort.portType !== toPort.portType;
			// draw line in green
			this.graphics.clear();
			this.graphics.lineStyle(2, isValid ? 0x00cc00 : 0x0000cc, 0.5);
			this.graphics.strokeLineShape(
				new Phaser.Geom.Line(this.fromPos!.x * 16 + 8, this.fromPos!.y * 16 + 8, mpos.x * 16 + 8, mpos.y * 16 + 8),
			);
		}

		this.toPos = mpos;
	}

	mouseMove(mpos: Point): void {
		const { currentMode } = this.buildModeSwitch;
		if (componentExists(currentMode)) {
			// try to place component at mpos
			const componentType = currentMode;
			const size = getComponentInfo(componentType).size;
			const isValid = this.level.isAreaFree(mpos, size );
			this.graphics.clear();
			this.graphics.fillStyle(isValid ? 0x00cc00 : 0xcc0000, 0.5);
			this.graphics.fillRect(mpos.x * 16, mpos.y * 16, size.x * 16, size.y * 16);
		}
		else if (currentMode === "Delete") {
			this.graphics.clear();
			const comp = this.level.findComponentAt(mpos);
			if (comp) {
				if (!comp.fixed) {
					const info = getComponentInfo(comp.componentType);
					this.graphics.fillStyle(0xcc0000, 0.5);
					this.graphics.fillRect(comp.mx * 16, comp.my * 16, info.size.x * 16, info.size.y * 16);
				}
			}
			else {
				const con = this.level.findConnectorAt(mpos);
				if (con) {
					this.graphics.lineStyle(5, 0x00cccc, 0.5);
					this.graphics.strokeLineShape(
						new Phaser.Geom.Line(
							(con.from[0] + 0.5) * 16, (con.from[1] + 0.5) * 16,
							(con.to[0] + 0.5) * 16, (con.to[1] + 0.5) * 16,
						),
					);
				}
			}
				
		}
	}
	
	mouseDragRelease(mpos: Point): void {
		this.toPos = mpos;

		// Try to build a connector...
		assert(this.fromPos);

		if (this.buildModeSwitch.currentMode === "Connector") {
			this.graphics.clear();
			const fromPort = this.level.findPort(this.fromPos!);
			const toPort = this.level.findPort(mpos);
			const isValid = fromPort && toPort && fromPort.portType !== toPort.portType;
			if (isValid) {
				this.level.createConnector(this.fromPos, this.toPos);
				this.scene.sound.play('connect');
			}
			else {
				this.scene.sound.play('denied');
			}
		}
	}

}