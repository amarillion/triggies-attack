import { describe, it, expect } from 'vitest';
import { LevelState } from './LevelState.js';
import { parseSaveData } from './SaveData.js';
import saveData from '../testData/test-save-lev7.json';
import { assert } from '../util/assert.js';

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

describe('Simulation', () => {

	it('Pentagon simulation reset test', () => {
	
		for (let i = 0; i < 5; ++i) {
			const state = new LevelState();
			const data = parseSaveData(saveData);
			state.loadFromSave(data);
			let lastLaser: LaserDataType | undefined = undefined;
			
			state.onLaser.add(laser => lastLaser = laser);
			const frac = i / 5;
			state.simulate(frac);
			expectLaserEquals(lastLaser, {
				color: "grey",
				x: (Math.cos(frac * 2 * Math.PI) + 1) / 2,
				y: (Math.sin(frac * 2 * Math.PI) + 1) / 2,
			});
		}

	});

	it('Pentagon continuous simulation test', () => {
	
		const state = new LevelState();
		const data = parseSaveData(saveData);
		state.loadFromSave(data);
		let lastLaser: LaserDataType | undefined = undefined;
		
		state.onLaser.add(laser => {
			console.log("Laser fired! ", laser);
			lastLaser = laser;
		});

		for (let i = 0; i < 5; ++i) {
			const frac = i / 5;
			state.simulate(frac);
			expectLaserEquals(lastLaser, {
				color: "grey",
				x: (Math.cos(frac * 2 * Math.PI) + 1) / 2,
				y: (Math.sin(frac * 2 * Math.PI) + 1) / 2,
			});
		}

	});
});
