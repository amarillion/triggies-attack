import allLevels from '../data/levels.json';
import { ComponentInfo, getComponentInfo } from './ComponentInfo';
import { ASTNode, evaluateExpression, evaluateScript, Parser } from '../util/parser';
import { inverseLerp } from '../util/math';
import { Signal } from '../util/Signal';
import { IPoint, Point, shortestDistanceToSegment } from '../util/point';
import { SaveData } from './SaveData';
import { getLevelData, LaserColor } from './LevelData';
import { assert } from '../util/assert';
import { DefaultMap } from '../util/DefaultMap';

export type TriggieEvent = {
	event: 'hit' | 'dead' | 'return' | 'explode',
};

export class TriggieData {
	
	constructor(public x: number, public y: number, public color: string) {
	}
	
	readonly onEvent = new Signal<TriggieEvent>();

	hit() {
		this.hits++;
		if (this.hits === 1) {
			this.onEvent.dispatch({ event: 'hit' });
		}
		else if (this.hits === 2) {
			this.onEvent.dispatch({ event: 'dead' });
		}
	}

	clear(event : 'explode' | 'return') {
		this.hits = 0;
		this.onEvent.dispatch({ event });
	}

	hits = 0;
}

type CBCreateTriggie = (t: TriggieData) => void;

const NUM_TRIGGIES = 64;
export const BUTTON_STATE_TO_VALUE = [ 0, 1/4, 1/2, 1, 2, 3, 4, 5, 6 ];

export class Component {

	info: ComponentInfo;
	componentType: string;
	fixed = false; /* whether this can be deleted or not */
	mx = 0;
	my = 0;
	rotation = 0; /* 0-3 */

	// used for dials.
	state = BUTTON_STATE_TO_VALUE.findIndex(i => i === 1);
	get value(): number {
		return BUTTON_STATE_TO_VALUE[this.state % BUTTON_STATE_TO_VALUE.length];
	}
	readonly portValues = new Map<string, number>();
	readonly connectorMap = new DefaultMap<string, Connector[]>([]);
	readonly onDeleted = new Signal<void>();

	constructor(componentType: string) {
		this.info = getComponentInfo(componentType);
		this.componentType = componentType;
	}

	connect(portName: string, connector: Connector) {
		console.log(`Connecting component ${this.componentType} port ${portName}`);
		this.connectorMap.get(portName).push(connector);
	}
}

export class Connector {
	from: [number, number] = [ 0, 0 ];
	to: [number, number] = [ 0, 0 ];
	fromComponent?: Component;
	fromPort?: string;

	toComponent?: Component;
	toPort?: string;
}

export class LevelState {

	currentLevel = 0;

	connectors: Connector[] = [];
	components: Component[] = [];

	levelInfo = allLevels.levels[3];

	loadFromSave(data: SaveData) {

		this.currentLevel = data.saveData.currentLevel;

		for (const rawComp of data.saveData.components) {
			const comp = new Component(rawComp.type);
			comp.mx = rawComp.x;
			comp.my = rawComp.y;
			comp.rotation = rawComp.rotation;
			comp.fixed = Boolean(rawComp.fixed);

			if (rawComp?.data?.state !== undefined) {
				comp.state = rawComp.data.state;
			}

			this.addComponent(comp);
		}

		for (const rawCon of data.saveData.connectors) {
			const [ x1, y1 ] = rawCon.from;
			const [ x2, y2 ] = rawCon.to;
			this.createConnector({ x: x1, y: y1 }, { x: x2, y: y2 });
		}

		this.sharedInit();
	}

	sharedInit() {
		assert(this.currentLevel !== undefined);
		this.numLasers = Object.keys(getLevelData(this.currentLevel).laser).length;
	}

	findPort(pos: IPoint, treshold = 1) {
		let minResult: { comp: Component, portName: string, portType: 'in' | 'out', pos: IPoint } | null = null;
		let minValue = treshold;
		for (const comp of this.components) {
			const ports = Object.entries(comp.info.ports);
			for (const [ portName, portInfo ] of ports) {
				const portPos = Point.plus({ x: comp.mx, y: comp.my }, portInfo.delta);
				const dist = portPos.minus(pos).manhattan();
				if (dist < minValue) {
					minValue = dist;
					minResult = { comp, portName, portType: portInfo.type, pos: portPos };
				}
				else if (dist === minValue) {
					// ambiguous result, refuse to apply.
					minResult = null;
				}
				if (minValue === 0) {
					return minResult; // no closer value possible.
				}
			}
		}
		return minResult;
	}

	//TODO: move to utility class
	static overlaps(pos1: IPoint, size1: IPoint, pos2: IPoint, size2: IPoint) {
		const end1 = Point.plus(pos1, size1);
		const end2 = Point.plus(pos2, size2);
		return !(
			(pos1.x >= end2.x) ||
			(pos2.x >= end1.x) ||
			(pos1.y >= end2.y) ||
			(pos2.y >= end1.y)
		);
	}
	
	isAreaFree(mpos: IPoint, size: IPoint) {
		for (const comp of this.components) {
			if (LevelState.overlaps(
				{ x: comp.mx, y: comp.my },
				comp.info.size,
				mpos,
				size,
			)) {
				return false;
			}
		}
		return true;
	}

	createConnector(from: IPoint, to: IPoint) {
		const con = new Connector();
		con.from[0] = from.x;
		con.from[1] = from.y;
		con.to[0] = to.x;
		con.to[1] = to.y;

		// find matching port, if any...
		const fromResult = this.findPort(from);
		if (fromResult && fromResult.portType === 'out') {
			con.fromComponent = fromResult.comp;
			con.fromPort = fromResult.portName;
			fromResult.comp.connect(fromResult.portName, con);
		}

		const toResult = this.findPort(to);
		if (toResult && toResult.portType === 'in') {
			con.toComponent = toResult.comp;
			con.toPort = toResult.portName;
			toResult.comp.connect(toResult.portName, con);
		}

		this.addConnector(con);
	}

	emptyStart(levelNo: number) {
		this.currentLevel = levelNo;

		const colorToComponents = {
			"red":  { key: "output_rxy", y: 1 },
			"blue": { key: "output_bxy", y: 3 },
			"green": { key: "output_gxy", y: 5 },
			"grey": { key: "output_xy", y: 7 },
		};

		for (const color of Object.keys(getLevelData(levelNo).laser) as LaserColor[]) {
			const { key, y } = colorToComponents[color];
			const output = new Component(key);
			output.mx = 18;
			output.my = y;
			output.fixed = true;
			this.addComponent(output);
		}

		const clock = new Component('simple_clock');
		clock.mx = 4;
		clock.my = 0;
		clock.fixed = true;
		this.addComponent(clock);

		this.sharedInit();
	}

	findComponentAt(mpos: Point) {
		for (const comp of this.components) {
			const delta = mpos.minus({ x: comp.mx, y: comp.my });
			if (delta.x >= 0 && delta.y >= 0 && delta.x < comp.info.size.x && delta.y < comp.info.size.y) {
				return comp;
			}
		}
		return null;
	}

	findConnectorAt(mpos: Point) {
		// calculate distance to line segment for each connector, return if within threshold
		const threshold = 0.6;
		for (const con of this.connectors) {
			const from = new Point(con.from[0] + 0.5, con.from[1] + 0.5);
			const to = new Point(con.to[0] + 0.5, con.to[1] + 0.5);
			const distance = shortestDistanceToSegment(mpos, from, to);
			if (distance <= threshold) {
				return con;
			}
		}
		return null;
	}

	simulate(t: number) {

		// first create empty port states
		// const portValues = new Map<Component, Map<string, number>>();
		const globalValues = new Map<string, number>();
		const visitedComponents = new Set<Component>();

		function componentReady(comp: Component): boolean {
			const ports = Object.entries(comp.info.ports);
			for (const [ portName, portInfo ] of ports) {
				if (portInfo.type === "in") {
					if (!(comp.portValues.has(portName))) {
						return false;
					};
				}
			}
			return true;
		}

		const openComponents: Component[] = this.components.filter(c => componentReady(c));

		while (openComponents.length > 0) {
			const comp = openComponents.shift()!;
			visitedComponents.add(comp);

			const data = comp.portValues;
			const ports = Object.entries(comp.info.ports);
			for (const [ portName, portInfo ] of ports) {
				if (portInfo.type === "in") {
					data.set(portName, comp.portValues.get(portName)!);
				}
			}

			data.set("t", t);
			if (comp.value !== undefined) {
				data.set("v", comp.value);
			}

			for (const [ portName, portInfo ] of ports) {
				if (portInfo.type === "out") {
					const ast = new Parser(portInfo.calc!).parse();
					const value = evaluateExpression(ast, Object.fromEntries(data));
					data.set(portName, value);

					// console.log(`Component ${comp.componentType} port ${portName} calculated value: ${value}`);
					// now propagate to connected components
					const connectors = comp.connectorMap.get(portName);
					for (const con of connectors) {
						const otherComp = con.toComponent;
						const otherPort = con.toPort;
						if (otherComp && otherPort !== undefined) {
							otherComp.portValues.set(otherPort, value);
							if (otherComp.info.ports[otherPort].global === true) {
								globalValues.set(otherPort, value);
							}
							// console.log(`Propagating value ${value} from ${comp.componentType}:${portName} to ${otherComp.componentType}:${otherPort}`);
							
						}

						if (otherComp && !visitedComponents.has(otherComp) && componentReady(otherComp) && !openComponents.includes(otherComp)) {
							openComponents.push(otherComp);
						}
					}
				}
			}

			// if (this.cbComponentUpdate) {
			// 	this.cbComponentUpdate(comp, data);
			// }
		}

		const range = getLevelData(this.currentLevel).range;
		const colors = Object.keys(getLevelData(this.currentLevel).laser) as LaserColor[];
		const colorPrefixMap: Record<string, string> = {
			grey: '',
			red: 'R',
			green: 'G',
			blue: 'B',
		};
		for (const color of colors) {
			const prefix = colorPrefixMap[color];
			const laserCo = new Point(
				inverseLerp(range[0], range[2], globalValues.get(`${prefix}X`) ?? 0),
				inverseLerp(range[1], range[3], globalValues.get(`${prefix}Y`) ?? 0),
			);
			this.onLaser.dispatch({ ...laserCo, color });

			if (this.laserKillRemain > 0) {
				this.handleLaserKill(laserCo, color);
			}
		}

	}

	handleLaserKill(laserCo: Point, color: string) {
		const CUTOFF_DISTANCE = 0.05;
		// find a triggie within range...
		for (const trig of this.triggies) {
			const dist = Point.length(laserCo.minus(trig));
			if (dist < CUTOFF_DISTANCE && (color === 'grey' || color === trig.color)) {
				trig.hit();
				if (trig.hits === 2) {
					this.fragCounter++;
				}
			}
		}

		if (--this.laserKillRemain === 0) {
			this.onLaserCycleComplete.dispatch(this.fragCounter === NUM_TRIGGIES * this.numLasers);
		}
	}

	laserKillRemain = 0;
	fragCounter = 0;
	numLasers = 1;

	fireLaser() {
		if (this.laserKillRemain > 0) { return; } // laser already fired!
		this.fragCounter = 0;
		this.laserKillRemain = (NUM_TRIGGIES * 2) * this.numLasers;
		console.log("Laser kill remain:", this.laserKillRemain);
	}
	
	readonly onLaserCycleComplete = new Signal<boolean>();

	cbCreateTriggie?: CBCreateTriggie;
	onCreateTriggie(cb : CBCreateTriggie) {
		this.cbCreateTriggie = cb;
		for (const triggie of this.triggies) {
			cb(triggie);
		}
	}
	
	initializeTriggies() {
		const { laser } = getLevelData(this.currentLevel);
		for (const [ color, func ] of Object.entries(laser ?? {})) {
			const ast = new Parser(func).parse();
			this.createTriggies(ast, color);
		}
	}

	triggies: TriggieData[] = [];

	private createTriggies(ast: ASTNode, color: string) {
		const range = getLevelData(this.currentLevel).range;
		for (let i = 0; i < NUM_TRIGGIES; i++) {
			const t = i / NUM_TRIGGIES;
			const result = evaluateScript(ast, { t });
			const x = inverseLerp(range[0], range[2], result.x);
			const y = inverseLerp(range[1], range[3], result.y);

			const triggie = new TriggieData(x, y, color);
			this.triggies.push(triggie);
			if (this.cbCreateTriggie) {
				this.cbCreateTriggie(triggie);
			}
		}
	}

	addComponent(comp: Component) {
		this.components.push(comp);
		if (this.cbComponentAdded) {
			this.cbComponentAdded(comp);
		}
	}

	addConnector(con: Connector) {
		this.connectors.push(con);
		if (this.cbConnectorAdded) {
			this.cbConnectorAdded(con);
		}
	}

	deleteComponent(comp: Component) {
		this.onComponentDeleted.dispatch(comp);
		this.components = this.components.filter(c => c !== comp);
	
		// also delete connectors attached to it.
		for(const con of this.connectors) {
			if (con.fromComponent === comp || con.toComponent === comp) {
				this.deleteConnector(con);
			}
		}
	}

	readonly onComponentDeleted = new Signal<Component>();
	readonly onConnectorDeleted = new Signal<Connector>();
	
	deleteConnector(con: Connector) {
		this.connectors = this.connectors.filter(c => c !== con);
		
		// delete port mappings
		if (con.fromComponent && con.fromPort !== undefined) {
			const connectors = con.fromComponent.connectorMap.get(con.fromPort);
			con.fromComponent.connectorMap.set(con.fromPort, connectors.filter(c => c !== con));
		}
		if (con.toComponent && con.toPort !== undefined) {
			const connectors = con.toComponent.connectorMap.get(con.toPort);
			con.toComponent.connectorMap.set(con.toPort, connectors.filter(c => c !== con));
		}
		
		this.onConnectorDeleted.dispatch(con);
	}

	cbComponentAdded?: (comp: Component) => void;
	onComponentAdded(cb: (comp: Component) => void) {
		this.cbComponentAdded = cb;
		// immediately call callback with existing components.
		for (const comp of this.components) {
			cb(comp);
		}
	}

	cbConnectorAdded?: (con: Connector) => void;
	onConnectorAdded(cb: (con: Connector) => void) {
		this.cbConnectorAdded = cb;
		// immediately call callback with existing components.
		for (const con of this.connectors) {
			cb(con);
		}
	}

	readonly onLaser = new Signal<IPoint & { color : LaserColor }>();

	asSaveData(): SaveData {
		return {
			saveData: {
				currentLevel: this.currentLevel,
				components: this.components.map(comp => ({
					type: comp.componentType,
					x: comp.mx,
					y: comp.my,
					rotation: comp.rotation,
					fixed: comp.fixed,
					data: {
						state: comp.state,
					},
				})),
				connectors: this.connectors.map(con => ({
					from: [ con.from[0], con.from[1] ],
					to: [ con.to[0], con.to[1] ],
				})),
			},
		};
	}
}