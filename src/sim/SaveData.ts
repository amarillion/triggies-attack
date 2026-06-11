import { z } from "zod";
// import saveData from '../testData/test-save-lev7.json';

const ComponentSchema = z.object({
	type: z.string(),
	data: z.object({
		state: z.number(),
	}).optional(),
	x: z.number(),
	y: z.number(),
	rotation: z.number(),
	fixed: z.boolean().optional(),
});

const ConnectorSchema = z.object({
	from: z.tuple([ z.number(), z.number() ]),
	to: z.tuple([ z.number(), z.number() ]),
});

const SaveDataSchema = z.object({
	saveData: z.object({
		currentLevel: z.string(),
		components: z.array(ComponentSchema),
		connectors: z.array(ConnectorSchema),
	}),
});

export type SaveData = z.infer<typeof SaveDataSchema>;
export type Component = z.infer<typeof ComponentSchema>;
export type Connector = z.infer<typeof ConnectorSchema>;

export function parseSaveData(jsonData: unknown): SaveData {
	const result = SaveDataSchema.parse(jsonData);
	return result;
}

const TINS_QUICK_SAVE = "tins-quick-save";

export function hasSaveData(): boolean {
	return localStorage.getItem(TINS_QUICK_SAVE) !== null;
}

export function getQuickSaveData(): SaveData {
	// uncomment this to override save with test setup.
	// return parseSaveData(saveData);
	return parseSaveData(JSON.parse(localStorage.getItem(TINS_QUICK_SAVE) ?? ''));
}

export function saveGameData(data: SaveData) {
	// save to local storage
	localStorage.setItem(TINS_QUICK_SAVE, JSON.stringify(data));
}