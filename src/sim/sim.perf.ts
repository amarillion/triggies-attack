/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { LevelState } from './LevelState.js';
import { parseSaveData } from './SaveData.js';
import saveData from '../testData/test-save-lev7.json';
import { assert } from '../util/assert.js';
import { lerp } from '../util/math.js';

import { appendFileSync } from 'fs';
import { execSync } from 'child_process';
import { hostname } from 'os';

type LaserDataType = {
	x: number,
	y: number,
	color: string,
};

const TRESHOLD_DIGITS = 3;
function expectLaserEquals(observed: LaserDataType | undefined, expected: LaserDataType) {
	expect(observed).toBeDefined();
	assert(observed); // for Type narrowing.
	expect.soft(observed.color).toBe(expected.color);
	expect.soft(observed.x).toBeCloseTo(expected.x, TRESHOLD_DIGITS);
	expect.soft(observed.y).toBeCloseTo(expected.y, TRESHOLD_DIGITS);
}

let hash: string, branch: string, today: string, host: string, cpu: string;
beforeAll(() => {
	today = new Date().toISOString();
	host = hostname();
	try {
		hash = (execSync("git log -1 --format='%h'") as Buffer).toString("utf8").trimEnd();
	} catch(e) { hash = "Unknown hash"; }
	try {
		branch = execSync("git rev-parse --abbrev-ref HEAD").toString("utf8").trimEnd();
	} catch(e) { branch = "Unknown branch"; }
	try {
		cpu = execSync("lscpu | grep 'Model name' | sed -r 's/Model name:\\s{1,}(.*) @ .*z\\s*/\\1/g'").toString("utf8").trimEnd();
	} catch(e) { cpu = "Unknown cpu"; }
});


let startTime: number;
beforeEach(() => {
	startTime = Date.now();
});

function logDuration(duration: number, test: string) {
	appendFileSync("performance.log", `${today}\t${test}\t${duration}\t${hash}\t${branch}\t${host}\t${cpu}\n`);
}

describe('Simulation', () => {

	it('Pentagon performance 1k cycles', () => {
		const state = new LevelState();
		const data = parseSaveData(saveData);
		state.loadFromSave(data);
		let lastLaser: LaserDataType | undefined = undefined;
		state.onLaser.add(laser => lastLaser = laser);

		for (let k = 0; k < 1_000; ++k) {
			for (let i = 0; i < 128; ++i) {
				const frac = i / 128;
				state.simulate(frac);

				const n = Math.floor(frac * 5);
				const dt = (frac * 5) - n;
				const a1 = n / 5 * 2 * Math.PI;
				const a2 = (n + 1) / 5 * 2 / Math.PI;

				expectLaserEquals(lastLaser, {
					color: "grey",
					x: (lerp(Math.cos(a1), Math.cos(a2), dt) + 1) / 2,
					y: (lerp(Math.sin(a1), Math.sin(a2), dt) + 1) / 2,
				});
			}
		}
		logDuration(Date.now() - startTime, 'pentagon');
	});

});
