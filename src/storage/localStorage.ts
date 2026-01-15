import type { StorageStrategy } from "../types"

export const LocalStorageStrategy: StorageStrategy<false> = {
	isAsync: false as const,

	has(key: string): boolean {
		return localStorage.getItem(key) !== null
	},

	get(key: string): string | null {
		return localStorage.getItem(key)
	},

	set(key: string, value: string): void {
		localStorage.setItem(key, value)
	},

	remove(key: string): void {
		localStorage.removeItem(key)
	},
}
