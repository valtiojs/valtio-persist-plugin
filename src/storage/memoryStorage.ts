import type { StorageStrategy } from "../types"

export const createMemoryStorage = (): StorageStrategy<false> => {
	const storage = new Map<string, string>()

	return {
		isAsync: false as const,

		has(key: string): boolean {
			return storage.has(key)
		},

		get(key: string): string | null {
			return storage.get(key) ?? null
		},

		set(key: string, value: string): void {
			storage.set(key, value)
		},

		remove(key: string): void {
			storage.delete(key)
		},
	}
}

export const MemoryStorageStrategy = createMemoryStorage()
