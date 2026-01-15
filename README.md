# valtio-persist-plugin

A persistence plugin for [valtio](https://github.com/pmndrs/valtio) using the [valtio-plugin](https://github.com/valtiojs/valtio-plugin) architecture.

## Features

- Built on valtio-plugin architecture
- Multiple storage backends (localStorage, sessionStorage, IndexedDB, AsyncStorage)
- Path-based filtering - persist only what you need
- Pluggable serialization and merge strategies
- Debounced persistence for performance
- Tree-shakeable - only import what you use

## Installation

```bash
npm install valtio valtio-plugin valtio-persist-plugin
```

## Quick Start

```typescript
// store.ts
// IMPORTANT - import the proxy from 'valtio-plugin' instead of valtio
import { proxy } from 'valtio-plugin'
import { createPersistPlugin } from 'valtio-persist-plugin'

// initialize the plugin with the key to store the data with
const persist = createPersistPlugin('mydata')

// attach the plugin to the global valtio proxy
proxy.use(persist)

// create your state
const store = proxy({
  count: 0
})

// make sure to hydrate. You can do this at whatever point suits you best. Doing it here hydrates it immediately
persist.hydrate(store)
```

```typescript
// App.tsx
import { useSnapshot } from 'valtio'
import { store } from './store'

const App = () => {
  const snap = useSnapshot(store)

  return (
    <div>
      <label>{snap.count}</label>
      <button type='button' onClick={() => store.count++}>Increment</button>
    </div>
  )
}

export default App
```

That's it. Your data will now be stored into localStorage (that's the default). We'll get to that next.

## Storage Strategies

### Built-in (synchronous)

```typescript
import {
  LocalStorageStrategy,    // Default - browser localStorage
  SessionStorageStrategy,  // Browser sessionStorage
  MemoryStorageStrategy,   // In-memory (testing)
} from 'valtio-persist-plugin'

factory.use(createPersistPlugin('session-data', {
  storage: SessionStorageStrategy
}))
```

### IndexedDB (async, separate import)

```typescript
import { IndexedDBStorage } from 'valtio-persist-plugin/indexed-db'

factory.use(createPersistPlugin('large-data', {
  storage: IndexedDBStorage
}))
```

### AsyncStorage for React Native (async, separate import)

```typescript
import { AsyncStorage } from 'valtio-persist-plugin/async-storage'

factory.use(createPersistPlugin('mobile-state', {
  storage: AsyncStorage
}))
```

File system storage are planned. They'll be here soon.

## Path Filtering

Persist only specific parts of your state:

```typescript
factory.use(createPersistPlugin('auth', {
  paths: ['token', 'user']  // Only persist these top-level keys
}))

const store = factory({
  token: '',
  user: null,
  tempData: {},  // Not persisted
  ui: {}         // Not persisted
})
```

## Multiple Storage Backends

`valtio-plugin` gives us the ability to scope our state into different 'instances'. This allows us to have mutliple different stores that have all different types of strategies.

```typescript
import { createPersistPlugin, SessionStorageStrategy } from 'valtio-persist-plugin'
import { IndexedDBStorage } from 'valtio-persist-plugin/indexed-db'

const userProxy = proxy.createInstance()
const dataProxy = proxy.createInstance()

// Session data in sessionStorage
userProxy.use(createPersistPlugin('session', {
  storage: SessionStorageStrategy,
  paths: ['auth', 'preferences.theme']
}))

const userStore = userProxy({
  auth: { token: '', user: null},
  preferences: { 
    theme: 'dark',
    ui: {
      sidebar: 'true' // not persisted
    }
  }
})

// Large data in IndexedDB
dataProxy.use(createPersistPlugin('data', {
  storage: IndexedDBStorage,
  paths: ['documents', 'cache']
}))

const dataStore = dataProxy({
  documents: [],
  cache: {}
})

// Hydrate both
await Promise.all([
  userProxy.hydrate(userStore),
  dataProxy.hydrate(dataStore)
])
```

## Plugin API

Once registered, the plugin exposes these methods.

```typescript
const myProxyInstance = proxy.createInstance()

const myStorePlugin = myProxyInstance.use(c)
myProxyInstance.use(createPersistPlugin('my-store'))

// Hydrate from storage
myProxyInstance.hydrate(store)

// Manually trigger persistence
myProxyInstance.persist(store)

// Clear persisted data
myProxyInstance.clear()

// Check hydration status
if (myProxyInstance.isHydrated()) {
  console.log('Ready!')
}

// Get the storage key
console.log(myProxyInstance.getKey())  // 'my-store'
```

## Options

```typescript
interface PersistPluginOptions<T> {
  // Storage backend (default: LocalStorageStrategy)
  storage?: StorageStrategy

  // Serialization strategy (default: JSONSerializationStrategy)
  serialization?: SerializationStrategy<T>

  // Merge strategy (default: DefaultMergeStrategy)
  merge?: MergeStrategy<T>

  // Paths to persist (default: entire state (empty))
  paths?: string[]

  // Debounce time in ms (default: 100)
  debounceTime?: number

  // Conditional persistence
  shouldPersist?: (path: string[], value: unknown, state: T) => boolean
}
```

## Merge Strategies

### DefaultMergeStrategy (shallow)

```typescript
import { DefaultMergeStrategy } from 'valtio-persist-plugin'

// Stored: { count: 5 }
// Initial: { count: 0, name: '' }
// Result: { count: 5, name: '' }
```

### DeepMergeStrategy (recursive)

```typescript
import { DeepMergeStrategy } from 'valtio-persist-plugin'

factory.use(createPersistPlugin('nested', {
  merge: DeepMergeStrategy
}))

// Stored: { user: { name: 'John' } }
// Initial: { user: { name: '', age: 0 } }
// Result: { user: { name: 'John', age: 0 } }
```

## Custom Storage Strategy

```typescript
import type { StorageStrategy } from 'valtio-persist-plugin'

const MyCloudStorage: StorageStrategy<true> = {
  isAsync: true,

  async get(key: string): Promise<string | null> {
    // Fetch from your cloud storage
  },

  async set(key: string, value: string): Promise<void> {
    // Save to your cloud storage
  },

  async remove(key: string): Promise<void> {
    // Delete from your cloud storage
  },
}

proxy.use(createPersistPlugin('cloud', {
  storage: MyCloudStorage
}))
```

## TypeScript

Full TypeScript support with generics:

```typescript
interface AppState {
  user: { name: string; email: string } | null
  preferences: { theme: 'light' | 'dark' }
  cache: Record<string, unknown>
}

factory.use(createPersistPlugin<AppState>('app', {
  paths: ['user', 'preferences']
}))
```

## Migration from valtio-persist

If you're coming from the original `valtio-persist`:

```typescript
// Before (valtio-persist)
const { store } = await persist(
  { count: 0 },
  'my-key',
  { storageStrategy: SessionStorageStrategy }
)

// After (valtio-persist-plugin)
proxy.use(createPersistPlugin('my-key', {
  storage: SessionStorageStrategy
}))
const store = proxy({ count: 0 })
proxy.hydrate(store)
```

The plugin approach gives you:
- Composition with other valtio-plugin plugins
- Path-based filtering for multiple storage backends
- More explicit control over hydration timing

## License

MIT
