import Phaser from "phaser";
import { getComponentInfo, TILESET_WIDTH } from "../sim/ComponentInfo";
import { Component, Connector, LevelState } from "../sim/LevelState";
import { Point } from "../util/point";
import { BuildModeSwitch, ConnectorBuildMode } from "../sprites/BuildMode";

const TILE_WIDTH = 16;
const TILE_HEIGHT = 16;

class ComponentView {

	graphics?: Phaser.GameObjects.Graphics;
	text?: Phaser.GameObjects.Text;

	constructor(public component: Component, public scene: Phaser.Scene) {
		const pos = new Point(this.component.mx * TILE_WIDTH, this.component.my * TILE_HEIGHT);
		if (component.componentType === "sincos") {
			this.graphics = scene.add.graphics({ lineStyle: { width: 1, color: 0xffffff } });
		}
		if (component.componentType === "monitor" || component.componentType === "integer") {
			const ofst = component.componentType === "monitor" ? 0 : 28;
			this.text = scene.add.text(pos.x + ofst, pos.y, "", {
				fontSize: "11px", color: "#82ff51",
				fixedWidth: 32, fixedHeight: 32,
				align: 'right',
				padding: { x: 2, y: 8 },
			});
		}
	}

	destroy() {
		this.graphics?.destroy();
		this.text?.destroy();
	}

	update() {
		const pos = new Point(this.component.mx * TILE_WIDTH, this.component.my * TILE_HEIGHT);
		switch (this.component.componentType) {
			case "sincos": {
				const cx = pos.x + 40;
				const cy = pos.y + 24;
				const a = (this.component.portValues.get('A') ?? 0) * Math.PI * 2;
				const R = 18;
				this.graphics!.clear();
				this.graphics!.lineStyle(1, 0xffffff);
				this.graphics!.strokeLineShape(
					new Phaser.Geom.Line(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R),
				);
				this.graphics!.lineStyle(1, 0xff8251);
				this.graphics!.strokeLineShape(
					new Phaser.Geom.Line(cx + Math.cos(a) * R, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R),
				);
				this.graphics!.lineStyle(1, 0x5182ff);
				this.graphics!.strokeLineShape(
					new Phaser.Geom.Line(cx, cy + Math.sin(a) * R, cx + Math.cos(a) * R, cy + Math.sin(a) * R),
				);
				break;
			}
			case "monitor": {
				this.text!.setText(`${this.component.portValues.get('A') ?? 0}`.slice(0, 4));
				break;
			}
			case "integer": {
				this.text!.setText(`${this.component.value}`.slice(0, 4));
				break;
			}
			default: // ignore
				break;
		}
	}
}

export class CircuitBoard extends Phaser.Scene {

	map: Phaser.Tilemaps.Tilemap | null = null;
	layer0: Phaser.Tilemaps.TilemapLayer | null = null;
	connectorGraphics: Phaser.GameObjects.Graphics | null = null;
	componentGfxMap = new Map<string, Phaser.GameObjects.Graphics>();

	constructor() {
		super({ key: "CircuitBoard" });
	}

	preload() {
		this.load.image("tileset", "tileset.png");
	}

	reset() {
		this.components.splice(0);

		if (this.map) this.map.destroy();
		
		const mw = 20;
		const mh = 15;
		
		this.map = this.make.tilemap({ tileWidth: TILE_WIDTH, tileHeight: TILE_HEIGHT, width: mw, height: mh });
		const tiles = this.map.addTilesetImage("tileset");
		this.layer0 = this.map.createBlankLayer("layer0", tiles!);

		this.connectorGraphics = this.add.graphics({ lineStyle: { width: 5, color: 0xaa1100, alpha: 0.5 } });
		this.connectorGraphics?.clear();
	}

	create(data: { level: LevelState, buildModeSwitch: BuildModeSwitch }) {
		this.cameras.main.setBackgroundColor('#73d484');
		this.cameras.main.setViewport(0, 64, 16*20, 16*15);

		this.reset();

		this.level = data.level;

		this.level.onComponentAdded((c: Component) => this.onComponentAdded(c));
		this.level.onConnectorAdded((con: Connector) => this.drawConnector(con));
		this.level.onComponentDeleted.add((comp: Component) => {
			// clear tilemap
			for (let dx = 0; dx < comp.info.size.x; dx++) {
				for (let dy = 0; dy < comp.info.size.y; dy++) {
					this.layer0?.removeTileAt(comp.mx + dx, comp.my + dy);
				}
			}
			const view = this.components.find(c => c.component === comp);
			view?.destroy();
			this.components = this.components.filter(c => c.component !== comp);
		});
		this.level.onConnectorDeleted.add((con: Connector) => {
			this.connectorGraphics?.clear();
			this.redrawConnectors();
			
		});

		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onDown(pointer));
		this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onUp(pointer));
		this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onMove(pointer));
		this.input.on('pointerout', () => this.onOut());
		this.buildMode = new ConnectorBuildMode(this, this.level, data.buildModeSwitch);
	}

	level?: LevelState;

	components: ComponentView[] = [];

	buildMode?: ConnectorBuildMode;

	isDragging = false;
	dragStart: Point | null = null;
	prevMousePos? : Point;
	
	onOut() {
		this.buildMode?.mouseOut();
	}

	onDown(pointer : Phaser.Input.Pointer) {
		if (pointer.camera === this.cameras.main) {
			const pos = Point.minus(pointer, this.cameras.main);

			if (pointer.leftButtonDown()) {
				const mpos = pos.scale(1 / TILE_WIDTH).floor();
				const comp = this.level?.findComponentAt(mpos);

				if (comp?.componentType === "integer") {
					const delta = mpos.minus({ x: comp.mx, y: comp.my });
					// check that we are touching the dial
					if (delta.x < 2 && delta.y < 2) {
						comp.value = (comp.value + 1) % 10;
					}
				}

				this.isDragging = true;
				this.dragStart = pos;
				this.prevMousePos = pos;
				this.buildMode?.mouseDragStart(mpos);
			}
		}
	}

	onUp(pointer: Phaser.Input.Pointer) {
		const pos = Point.minus(pointer, this.cameras.main);
		if (this.isDragging && pointer.leftButtonReleased()) {
			this.isDragging = false;
			const mpos = pos.scale(1 / TILE_WIDTH).floor();
			this.buildMode?.mouseDragRelease(mpos);
		}
	}

	onMove(pointer: Phaser.Input.Pointer) {
		const pos = Point.minus(pointer, this.cameras.main);
		const mpos = pos.scale(1 / TILE_WIDTH).floor();
		
		if (this.isDragging) {
			const delta = pos.minus(this.prevMousePos!);
			this.buildMode?.mouseDragMove(mpos, delta);
			this.prevMousePos = pos;
		}
		else {
			if (pointer.camera !== this.cameras.main) {
				this.buildMode?.mouseOut();
			}
			else {
				this.buildMode?.mouseMove(mpos);
			}
		}
	}

	onComponentAdded(comp: Component) {
		this.components.push(new ComponentView(comp, this));
		
		function drawComponent(layer: Phaser.Tilemaps.TilemapLayer, x: number, y: number, type: string) {
			const info = getComponentInfo(type);
			for (let dx = 0; dx < info.size.x; dx++) {
				for (let dy = 0; dy < info.size.y; dy++) {
					layer.putTileAt(info.tileIdx + dx + TILESET_WIDTH * dy, x + dx, y + dy);
				}
			}
		}

		drawComponent(this.layer0!, comp.mx, comp.my, comp.componentType);
	}

	drawConnector(con: Connector) {
		const line = new Phaser.Geom.Line(
			(con.from[0] + 0.5) * TILE_WIDTH, (con.from[1] + 0.5) * TILE_HEIGHT,
			(con.to[0] + 0.5) * TILE_WIDTH, (con.to[1] + 0.5) * TILE_HEIGHT,
		);
		this.connectorGraphics?.strokeLineShape(line);
	}

	counter = 0;

	update() {
		this.components.forEach(c => c.update());
	}

	redrawConnectors() {
		this.connectorGraphics?.clear();
		this.level?.connectors.forEach(con => this.drawConnector(con));
	}
	
}
