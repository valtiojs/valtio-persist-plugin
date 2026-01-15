import type { Snapshot } from "valtio"
import type { ValtioPlugin } from "valtio-plugin"

type StorageResult<T, Async extends boolean> = Async extends true
	? Promise<T>
	: T

export interface StorageStrategy<Async extends boolean = boolean> {
	readonly isAsync: Async
	has?(key: string): StorageResult<boolean, Async>
	get(key: string): StorageResult<string | null, Async>
	set(key: string, value: string): StorageResult<void, Async>
	remove(key: string): StorageResult<void, Async>
}

type SerializationResult<Async extends boolean> = Async extends true
	? Promise<string>
	: string

type DeserializationResult<T, Async extends boolean> = Async extends true
	? Promise<T>
	: T

export interface SerializationStrategy<T, Async extends boolean = boolean> {
	readonly isAsync: Async
	serialize(state: Snapshot<T>): SerializationResult<Async>
	deserialize(data: string): DeserializationResult<T, Async>
}

type MergeResult<T, Async extends boolean> = Async extends true ? Promise<T> : T

export interface MergeStrategy<T, Async extends boolean = boolean> {
	readonly isAsync: Async
	merge(initialState: T, restoredState: T): MergeResult<T, Async>
}



// Type markers for special type serialization
export const TYPE_MARKER = {
	Date: "__DATE__",
	Map: "__MAP__",
	Set: "__SET__",
	Symbol: "__SYMBOL__",
	Function: "__FUNCTION__",
	Class: "__CLASS__",
	Error: "__ERROR__",
	DOMElement: "__DOM_ELEMENT__",
} as const

export type TypeMarker = (typeof TYPE_MARKER)[keyof typeof TYPE_MARKER]

export interface SerializedSpecialType {
	__type: TypeMarker
	value: unknown
	[key: string]: unknown
}

export interface PersistPluginOptions<T extends object = object> {
	// Storage strategy - defaults to LocalStorageStrategy
	storage?: StorageStrategy<boolean>
	// Serialization strategy - defaults to JSONSerializationStrategy
	serialization?: SerializationStrategy<T, boolean>
	// Merge strategy - defaults to DefaultMergeStrategy
	merge?: MergeStrategy<T, boolean>
	// Paths to persist - if not provided, persists entire state
	paths?: string[]
	// Debounce time in ms for persistence operations - defaults to 100
	debounceTime?: number
	// Callback to determine if state should be persisted
	shouldPersist?: (path: string[], value: unknown, state: T) => boolean
}

export interface PersistPluginAPI<T extends object> {
	// Hydrate the store from storage
	hydrate: (store: T) => Promise<void>
	// Manually trigger persistence 
	persist: (store: T) => Promise<void>
	// Clear persisted data from storage 
	clear: () => Promise<void>
	// Check if hydration is complete 
	isHydrated: () => boolean
	// Get the storage key 
	getKey: () => string
}

export type PersistPlugin<T extends object> = ValtioPlugin & PersistPluginAPI<T>
