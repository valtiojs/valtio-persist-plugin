import type { Snapshot } from "valtio"
import type { ValtioPlugin } from "valtio-plugin"
import type {
	PersistPluginOptions,
	PersistPlugin,
	StorageStrategy,
	SerializationStrategy,
	MergeStrategy,
} from "./types"
import { LocalStorageStrategy } from "./storage/localStorage"
import { JSONSerializationStrategy } from "./serialization/json"
import { DefaultMergeStrategy } from "./merge/default"
import { debounce, updateStore, pickPaths, pathMatchesAny } from "./utils"

/**
 * Type guard for sync storage
 */
const isSyncStorage = (
	storage: StorageStrategy<boolean>
): storage is StorageStrategy<false> => {
	return !storage.isAsync
}

/**
 * Type guard for sync serializer
 */
const isSyncSerializer = <T>(
	serializer: SerializationStrategy<T, boolean>
): serializer is SerializationStrategy<T, false> => {
	return !serializer.isAsync
}

/**
 * Type guard for sync merger
 */
const isSyncMerger = <T>(
	merger: MergeStrategy<T, boolean>
): merger is MergeStrategy<T, false> => {
	return !merger.isAsync
}

/**
 * Creates a persist plugin for use with valtio-plugin
 *
 * @param key - Unique storage key for this plugin instance
 * @param options - Configuration options
 * @returns A ValtioPlugin with persist capabilities
 *
 * @example
 * ```typescript
 * import { proxy } from 'valtio-plugin'
 * import { createPersistPlugin } from 'valtio-persist-plugin'
 *
 * const factory = proxy.createInstance()
 * factory.use(createPersistPlugin('my-store'))
 *
 * const store = factory({ count: 0, name: '' })
 * await factory['my-store'].hydrate(store)
 * ```
 *
 * @example
 * ```typescript
 * // With custom storage and path filtering
 * import { SessionStorageStrategy } from 'valtio-persist-plugin'
 *
 * factory.use(createPersistPlugin('session-data', {
 *   storage: SessionStorageStrategy,
 *   paths: ['auth', 'preferences']
 * }))
 * ```
 */
export const createPersistPlugin = <T extends object = object>(
	key: string,
	options?: PersistPluginOptions<T>
): PersistPlugin<T> => {
	const {
		storage = LocalStorageStrategy,
		serialization = JSONSerializationStrategy as SerializationStrategy<T, boolean>,
		merge = DefaultMergeStrategy as MergeStrategy<T, boolean>,
		paths,
		debounceTime = 100,
		shouldPersist,
	} = options ?? {}

	let isHydrated = false
	let boundStore: T | null = null
	let debouncedPersist: ((store: T) => void) | null = null

	const getData = async (): Promise<string | null> => {
		if (isSyncStorage(storage)) {
			return storage.get(key)
		}
		return storage.get(key)
	}

	const setData = async (data: string): Promise<void> => {
		if (isSyncStorage(storage)) {
			storage.set(key, data)
			return
		}
		await storage.set(key, data)
	}

	const removeData = async (): Promise<void> => {
		if (isSyncStorage(storage)) {
			storage.remove(key)
			return
		}
		await storage.remove(key)
	}

	const serialize = async (state: T): Promise<string> => {
		const dataToSerialize = paths ? pickPaths(state, paths) : state

		if (isSyncSerializer(serialization)) {
			return serialization.serialize(dataToSerialize as Snapshot<T>)
		}
		return serialization.serialize(dataToSerialize as Snapshot<T>)
	}

	const deserialize = async (data: string): Promise<Partial<T>> => {
		if (isSyncSerializer(serialization)) {
			return serialization.deserialize(data) as Partial<T>
		}
		return serialization.deserialize(data) as Promise<Partial<T>>
	}

	const mergeState = async (current: T, restored: Partial<T>): Promise<T> => {
		if (isSyncMerger(merge)) {
			return merge.merge(current, restored as T)
		}
		return merge.merge(current, restored as T)
	}

	const persistStore = async (store: T): Promise<void> => {
		try {
			const serialized = await serialize(store)
			await setData(serialized)
		} catch (error) {
			console.error(`[valtio-persist-plugin] Failed to persist "${key}":`, error)
		}
	}

	const plugin: PersistPlugin<T> = {
		id: key,
		name: `Persist Plugin (${key})`,

		onAttach: () => {
			debouncedPersist = debounce((store: T) => {
				persistStore(store)
			}, debounceTime)
		},

		afterChange: (path, value, state) => {
			// Only persist if we have a bound store and are hydrated
			if (!boundStore || !isHydrated || !debouncedPersist) {
				return
			}

			// Check if this path should be persisted
			if (paths && !pathMatchesAny(path, paths)) {
				return
			}

			// Check shouldPersist callback
			if (shouldPersist && !shouldPersist(path, value, state as T)) {
				return
			}

			// Trigger debounced persist
			debouncedPersist(state as T)
		},

		hydrate: async (store: T): Promise<void> => {
			boundStore = store

			try {
				const data = await getData()

				if (data) {
					const restored = await deserialize(data)
					const merged = await mergeState(store, restored)

					updateStore(store, merged)
				}

				isHydrated = true
			} catch (error) {
				console.error(`[valtio-persist-plugin] Failed to hydrate "${key}":`, error)
				isHydrated = true // Mark as hydrated even on error to allow persistence
			}
		},

		persist: async (store: T): Promise<void> => {
			await persistStore(store)
		},

		clear: async (): Promise<void> => {
			await removeData()
		},

		isHydrated: (): boolean => {
			return isHydrated
		},

		getKey: (): string => {
			return key
		},
	}

	return plugin
}
