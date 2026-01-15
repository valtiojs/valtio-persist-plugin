import type { StorageStrategy } from "../types"

interface AsyncStorageModule {
	getItem(key: string): Promise<string | null>
	setItem(key: string, value: string): Promise<void>
	removeItem(key: string): Promise<void>
}

const ASYNC_STORAGE_MODULE = "@react-native-async-storage/async-storage"

export const createAsyncStorage = (): StorageStrategy<true> => {
	let asyncStoragePromise: Promise<AsyncStorageModule> | null = null

	const getAsyncStorage = (): Promise<AsyncStorageModule> => {
		if (!asyncStoragePromise) {
			asyncStoragePromise = import(/* webpackIgnore: true */ ASYNC_STORAGE_MODULE)
				.then((module: { default: AsyncStorageModule }) => module.default)
				.catch(() => {
					throw new Error(
						"@react-native-async-storage/async-storage not found. Please install it."
					)
				})
		}
		return asyncStoragePromise
	}

	return {
		isAsync: true as const,

		async has(key: string): Promise<boolean> {
			try {
				const storage = await getAsyncStorage()
				const value = await storage.getItem(key)
				return value !== null
			} catch {
				return false
			}
		},

		async get(key: string): Promise<string | null> {
			try {
				const storage = await getAsyncStorage()
				return await storage.getItem(key)
			} catch {
				return null
			}
		},

		async set(key: string, value: string): Promise<void> {
			try {
				const storage = await getAsyncStorage()
				await storage.setItem(key, value)
			} catch (error) {
				console.error("AsyncStorage set error:", error)
			}
		},

		async remove(key: string): Promise<void> {
			try {
				const storage = await getAsyncStorage()
				await storage.removeItem(key)
			} catch (error) {
				console.error("AsyncStorage remove error:", error)
			}
		},
	}
}

export const AsyncStorage = createAsyncStorage()
