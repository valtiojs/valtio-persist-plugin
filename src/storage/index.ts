/**
 * Core storage strategies - synchronous, browser-based
 * 
 * For async strategies (IndexedDB, AsyncStorage), import from:
 * - 'valtio-persist-plugin/indexed-db'
 * - 'valtio-persist-plugin/async-storage'
 */
export { LocalStorageStrategy } from "./localStorage"
export { SessionStorageStrategy } from "./sessionStorage"
export { MemoryStorageStrategy, createMemoryStorage } from "./memoryStorage"
