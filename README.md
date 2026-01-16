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

// hydrate from storage - you can do this at whatever point suits you best
await persist.hydrate(store)
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

That's it. Your data will now be stored into localStorage (that's the default).

## Storage Strategies

### Built-in (synchronous)

```typescript
import {
  LocalStorageStrategy,    // Default - browser localStorage
  SessionStorageStrategy,  // Browser sessionStorage
  MemoryStorageStrategy,   // In-memory (testing)
} from 'valtio-persist-plugin'

proxy.use(createPersistPlugin('session-data', {
  storage: SessionStorageStrategy
}))
```

### IndexedDB (async, separate import)

```typescript
import { IndexedDBStorage } from 'valtio-persist-plugin/indexed-db'

proxy.use(createPersistPlugin('large-data', {
  storage: IndexedDBStorage
}))
```

### AsyncStorage for React Native (async, separate import)

```typescript
import { AsyncStorage } from 'valtio-persist-plugin/async-storage'

proxy.use(createPersistPlugin('mobile-state', {
  storage: AsyncStorage
}))
```

File system storage is planned and will be here soon.

## Path Filtering

Persist only specific parts of your state:

```typescript
proxy.use(createPersistPlugin('auth', {
  paths: ['token', 'user']  // Only persist these top-level keys
}))

const store = proxy({
  token: '',
  user: null,
  tempData: {},  // Not persisted
  ui: {}         // Not persisted
})
```

## Multiple Storage Backends

`valtio-plugin` gives us the ability to scope our state into different 'instances'. This allows us to have multiple different stores that all have different types of strategies.

```typescript
import { proxy } from 'valtio-plugin'
import { createPersistPlugin, SessionStorageStrategy } from 'valtio-persist-plugin'
import { IndexedDBStorage } from 'valtio-persist-plugin/indexed-db'

const userProxy = proxy.createInstance()
const dataProxy = proxy.createInstance()

// Session data in sessionStorage
const userPersist = createPersistPlugin('session', {
  storage: SessionStorageStrategy,
  paths: ['auth', 'preferences.theme']
})
userProxy.use(userPersist)

const userStore = userProxy({
  auth: { token: '', user: null},
  preferences: { 
    theme: 'dark',
    ui: {
      sidebar: true // not persisted
    }
  }
})

// Large data in IndexedDB
const dataPersist = createPersistPlugin('data', {
  storage: IndexedDBStorage,
  paths: ['documents', 'cache']
})
dataProxy.use(dataPersist)

const dataStore = dataProxy({
  documents: [],
  cache: {}
})

// Hydrate both
await userPersist.hydrate(userStore)
await dataPersist.hydrate(dataStore)
```

## Plugin API

Once registered, the plugin exposes these methods:

```typescript
const myProxyInstance = proxy.createInstance()

const myPersist = createPersistPlugin('my-store')
myProxyInstance.use(myPersist)

const store = myProxyInstance({ count: 0 })

// Hydrate from storage
await myPersist.hydrate(store)

// Manually trigger persistence
await myPersist.persist(store)

// Clear persisted data
await myPersist.clear()

// Check hydration status
if (myPersist.isHydrated()) {
  console.log('Ready!')
}

// Get the storage key
console.log(myPersist.getKey())  // 'my-store'
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

proxy.use(createPersistPlugin('nested', {
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
    const response = await fetch(`https://api.example.com/storage/${key}`)
    if (!response.ok) return null
    return response.text()
  },

  async set(key: string, value: string): Promise<void> {
    // Save to your cloud storage
    await fetch(`https://api.example.com/storage/${key}`, {
      method: 'PUT',
      body: value
    })
  },

  async remove(key: string): Promise<void> {
    // Delete from your cloud storage
    await fetch(`https://api.example.com/storage/${key}`, {
      method: 'DELETE'
    })
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

proxy.use(createPersistPlugin<AppState>('app', {
  paths: ['user', 'preferences']
}))

const store = proxy<AppState>({
  user: null,
  preferences: { theme: 'dark' },
  cache: {}
})
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
import { proxy } from 'valtio-plugin'
import { createPersistPlugin, SessionStorageStrategy } from 'valtio-persist-plugin'

const persist = createPersistPlugin('my-key', {
  storage: SessionStorageStrategy
})
proxy.use(persist)

const store = proxy({ count: 0 })

await persist.hydrate(store)
```

The plugin approach gives you:
- Composition with other valtio-plugin plugins
- Path-based filtering for multiple storage backends
- More explicit control over hydration timing
- Scoped instances with different persistence strategies

## License

MIT