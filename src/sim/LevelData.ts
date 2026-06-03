import z from 'zod';
import levelData from '../data/levels.json';
import { assert } from '../util/assert';

const LaserColorSchema = z.enum([ "grey", "red", "blue", "green" ]);
export type LaserColor = z.infer<typeof LaserColorSchema>;
const LevelInfoSchema = z.object({
	shop: z.array(z.string()),
	title: z.string(),
	laser: z.partialRecord(LaserColorSchema, z.string()),
	range: z.tuple([ z.number(), z.number(), z.number(), z.number() ]),
});

export type LevelInfo = z.infer<typeof LevelInfoSchema>;

const LevelDataSchema = z.object({
	levels: z.array(LevelInfoSchema),
});

const parsedLevelData = LevelDataSchema.safeParse(levelData);

export function getLevelData(levelNo: number): LevelInfo {
	assert(parsedLevelData.success, `Invalid level data: ${parsedLevelData.error}`);
	const levels = parsedLevelData.data.levels;
	assert(levelNo >= 0 && levelNo < levels.length, `Invalid level number [${levelNo}]`);
	return levels[levelNo];
}
