import type { StorageStrategy } from "../types"

export const createIndexedDBStorage = (
	dbName = "valtio-persist",
	storeName = "state"
): StorageStrategy<true> => {
	let db: IDBDatabase | null = null
	let dbPromise: Promise<IDBDatabase> | null = null

	const openDB = (): Promise<IDBDatabase> => {
		if (db) return Promise.resolve(db)
		if (dbPromise) return dbPromise

		dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
			const request = indexedDB.open(dbName, 1)

			request.onerror = () => {
				reject(new Error(`Failed to open IndexedDB: ${dbName}`))
			}

			request.onsuccess = () => {
				db = request.result
				resolve(db)
			}

			request.onupgradeneeded = (event) => {
				const database = (event.target as IDBOpenDBRequest).result
				if (!database.objectStoreNames.contains(storeName)) {
					database.createObjectStore(storeName)
				}
			}
		})

		return dbPromise
	}

	return {
		isAsync: true as const,

		async has(key: string): Promise<boolean> {
			try {
				const database = await openDB()
				return new Promise((resolve) => {
					const transaction = database.transaction(storeName, "readonly")
					const store = transaction.objectStore(storeName)
					const request = store.getKey(key)

					request.onerror = () => resolve(false)
					request.onsuccess = () => resolve(request.result !== undefined)
				})
			} catch {
				return false
			}
		},

		async get(key: string): Promise<string | null> {
			try {
				const database = await openDB()
				return new Promise((resolve) => {
					const transaction = database.transaction(storeName, "readonly")
					const store = transaction.objectStore(storeName)
					const request = store.get(key)

					request.onerror = () => resolve(null)
					request.onsuccess = () => resolve(request.result ?? null)
				})
			} catch {
				return null
			}
		},

		async set(key: string, value: string): Promise<void> {
			try {
				const database = await openDB()
				return new Promise((resolve, reject) => {
					const transaction = database.transaction(storeName, "readwrite")
					const store = transaction.objectStore(storeName)
					const request = store.put(value, key)

					request.onerror = () => reject(new Error(`Failed to set ${key}`))
					request.onsuccess = () => resolve()
				})
			} catch (error) {
				console.error("IndexedDB set error:", error)
			}
		},

		async remove(key: string): Promise<void> {
			try {
				const database = await openDB()
				return new Promise((resolve, reject) => {
					const transaction = database.transaction(storeName, "readwrite")
					const store = transaction.objectStore(storeName)
					const request = store.delete(key)

					request.onerror = () => reject(new Error(`Failed to remove ${key}`))
					request.onsuccess = () => resolve()
				})
			} catch (error) {
				console.error("IndexedDB remove error:", error)
			}
		},
	}
}

export const IndexedDBStorage = createIndexedDBStorage()
