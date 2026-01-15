import type { MergeStrategy, SerializedSpecialType, TypeMarker } from "../types"
import { TYPE_MARKER } from "../types"

const isSpecialType = (obj: unknown): obj is SerializedSpecialType => {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"__type" in obj &&
		typeof (obj as Record<string, unknown>).__type === "string" &&
		Object.values(TYPE_MARKER).includes(
			(obj as Record<string, unknown>).__type as TypeMarker
		)
	)
}

const deepMerge = (target: unknown, source: unknown): unknown => {
	if (typeof source !== "object" || source === null) {
		return source
	}

	if (typeof target !== "object" || target === null) {
		return structuredClone(source)
	}

	if (Array.isArray(source)) {
		return [...source]
	}

	if (isSpecialType(source)) {
		return structuredClone(source)
	}

	const result: Record<string, unknown> = { ...(target as Record<string, unknown>) }

	for (const key in source as Record<string, unknown>) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const sourceValue = (source as Record<string, unknown>)[key]
			const targetValue = (target as Record<string, unknown>)[key]
			result[key] = deepMerge(targetValue, sourceValue)
		}
	}

	return result
}

export const DeepMergeStrategy: MergeStrategy<object, false> = {
	isAsync: false as const,

	merge<T extends object>(initialState: T, restoredState: T): T {
		return deepMerge(initialState, restoredState) as T
	},
}
