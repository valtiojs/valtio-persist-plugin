/**
 * valtio-persist-plugin
 *
 * A persistence plugin for valtio using the valtio-plugin architecture.
 * Provides flexible storage strategies, serialization, and path-based filtering.
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
 *
 * // State changes are automatically persisted
 * store.count = 42
 * ```
 *
 * @example
 * ```typescript
 * // Multiple storage backends for different parts of state
 * import { createPersistPlugin, SessionStorageStrategy } from 'valtio-persist-plugin'
 * import { IndexedDBStorage } from 'valtio-persist-plugin/indexed-db'
 *
 * const factory = proxy.createInstance()
 *
 * factory.use(createPersistPlugin('auth', {
 *   storage: SessionStorageStrategy,
 *   paths: ['token', 'user']
 * }))
 *
 * factory.use(createPersistPlugin('data', {
 *   storage: IndexedDBStorage,
 *   paths: ['documents', 'cache']
 * }))
 *
 * const store = factory({
 *   token: '',
 *   user: null,
 *   documents: [],
 *   cache: {},
 *   ui: { sidebar: true }  // Not persisted
 * })
 *
 * await Promise.all([
 *   factory['auth'].hydrate(store),
 *   factory['data'].hydrate(store)
 * ])
 * ```
 *
 * @packageDocumentation
 */

export { createPersistPlugin } from "./plugin"

export type {
	StorageStrategy,
	SerializationStrategy,
	MergeStrategy,
	PersistPluginOptions,
	PersistPluginAPI,
	PersistPlugin,
	TypeMarker,
	SerializedSpecialType,
} from "./types"

export { TYPE_MARKER } from "./types"

// Storage strategies (core - sync only)
export {
	LocalStorageStrategy,
	SessionStorageStrategy,
	MemoryStorageStrategy,
	createMemoryStorage,
} from "./storage"

// Serialization strategies
export { JSONSerializationStrategy } from "./serialization"

// Merge strategies
export { DefaultMergeStrategy, DeepMergeStrategy } from "./merge"
