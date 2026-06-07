import { assert } from '../util/assert.js';
import componentInfo from '../data/components.json';
import { z } from "zod";

const PointSchema = z.object({
	x: z.number(),
	y: z.number(),
});
const ComponentInfoSchema = z.object({
	name: z.string(),
	shortName: z.string(),
	hint: z.string(),
	size: PointSchema,
	tileIdx: z.number(),
	ports: z.record(z.string(), z.object({
		delta: PointSchema,
		type: z.enum([ "out", "in" ]),
		calc: z.string().optional(),
		global: z.boolean().optional(),
	})),
});
const ComponentInfoDataSchema = z.object({
	components: z.record(z.string(), ComponentInfoSchema),
});

export type ComponentInfo = z.infer<typeof ComponentInfoSchema>;

export const TILESET_WIDTH = 32;

const parsedComponentInfo = ComponentInfoDataSchema.safeParse(componentInfo);

export function componentExists(type: string): boolean {
	assert(parsedComponentInfo.success, `Invalid component info data, ${parsedComponentInfo.error}`);
	return type in parsedComponentInfo.data.components;
}
export function getComponentInfo(type: string): ComponentInfo {
	assert(parsedComponentInfo.success, `Invalid component info data, ${parsedComponentInfo.error}`);
	const components = parsedComponentInfo.data.components;
	assert(type in components, `Unknown component id [${type}]`);
	return components[type];
}