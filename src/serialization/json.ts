import type { Snapshot } from "valtio"
import type { SerializationStrategy, SerializedSpecialType, TypeMarker } from "../types"
import { TYPE_MARKER } from "../types"

const processForSerialization = (obj: unknown): unknown => {
	if (obj === null || obj === undefined) {
		return obj
	}

	if (typeof obj !== "object" && typeof obj !== "function" && typeof obj !== "symbol") {
		return obj
	}

	if (typeof obj === "symbol") {
		return {
			__type: TYPE_MARKER.Symbol,
			value: obj.description,
		} as SerializedSpecialType
	}

	if (typeof obj === "function") {
		return {
			__type: TYPE_MARKER.Function,
			value: obj.name || "anonymous",
		} as SerializedSpecialType
	}

	if (obj instanceof Date) {
		return {
			__type: TYPE_MARKER.Date,
			value: obj.toISOString(),
		} as SerializedSpecialType
	}

	if (obj instanceof Map) {
		return {
			__type: TYPE_MARKER.Map,
			value: Array.from(obj.entries()).map(([k, v]) => [
				processForSerialization(k),
				processForSerialization(v),
			]),
		} as SerializedSpecialType
	}

	if (obj instanceof Set) {
		return {
			__type: TYPE_MARKER.Set,
			value: Array.from(obj).map(processForSerialization),
		} as SerializedSpecialType
	}

	if (obj instanceof Error) {
		return {
			__type: TYPE_MARKER.Error,
			value: {
				message: obj.message,
				name: obj.name,
				stack: obj.stack,
			},
		} as SerializedSpecialType
	}

	if (typeof window !== "undefined" && obj instanceof Element) {
		let selector = obj.tagName.toLowerCase()
		if (obj.id) selector += `#${obj.id}`
		else if (obj.className) selector += `.${obj.className.replace(/\s+/g, ".")}`

		return {
			__type: TYPE_MARKER.DOMElement,
			value: selector,
		} as SerializedSpecialType
	}

	if (Array.isArray(obj)) {
		return obj.map(processForSerialization)
	}

	if (obj.constructor && obj.constructor !== Object && obj.constructor !== Array) {
		return {
			__type: TYPE_MARKER.Class,
			className: obj.constructor.name,
			value: processForSerialization({ ...obj }),
		} as SerializedSpecialType
	}

	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		result[key] = processForSerialization(value)
	}
	return result
}

const processForDeserialization = (obj: unknown): unknown => {
	if (obj === null || obj === undefined) {
		return obj
	}

	if (typeof obj !== "object") {
		return obj
	}

	const record = obj as Record<string, unknown>

	if ("__type" in record && typeof record.__type === "string") {
		const typeMarker = record.__type as TypeMarker

		switch (typeMarker) {
			case TYPE_MARKER.Date:
				if (typeof record.value === "string") {
					return new Date(record.value)
				}
				break

			case TYPE_MARKER.Map:
				if (Array.isArray(record.value)) {
					return new Map(
						(record.value as [unknown, unknown][]).map(([k, v]) => [
							processForDeserialization(k),
							processForDeserialization(v),
						])
					)
				}
				break

			case TYPE_MARKER.Set:
				if (Array.isArray(record.value)) {
					return new Set((record.value as unknown[]).map(processForDeserialization))
				}
				break

			case TYPE_MARKER.Symbol:
				if (typeof record.value === "string" || record.value === undefined) {
					return Symbol(record.value as string | undefined)
				}
				break

			case TYPE_MARKER.Function:
				return () => undefined

			case TYPE_MARKER.Error:
				if (typeof record.value === "object" && record.value !== null) {
					const errorValue = record.value as Record<string, unknown>
					const error = new Error(
						typeof errorValue.message === "string" ? errorValue.message : "Unknown error"
					)
					if (typeof errorValue.name === "string") {
						error.name = errorValue.name
					}
					if (typeof errorValue.stack === "string") {
						error.stack = errorValue.stack
					}
					return error
				}
				break

			case TYPE_MARKER.DOMElement:
				if (typeof record.value === "string" && typeof document !== "undefined") {
					return document.querySelector(record.value)
				}
				return null

			case TYPE_MARKER.Class:
				if (typeof record.value === "object" && record.value !== null) {
					return processForDeserialization(record.value)
				}
				break

			default:
				return record.value
		}

		return null
	}

	if (Array.isArray(obj)) {
		return obj.map(processForDeserialization)
	}

	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(record)) {
		result[key] = processForDeserialization(value)
	}
	return result
}

export const JSONSerializationStrategy: SerializationStrategy<object, false> = {
	isAsync: false as const,

	serialize<T>(state: Snapshot<T>): string {
		const processed = processForSerialization(state)
		return JSON.stringify(processed)
	},

	deserialize<T>(data: string): T {
		const parsed = JSON.parse(data)
		return processForDeserialization(parsed) as T
	},
}
