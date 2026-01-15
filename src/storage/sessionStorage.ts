import type { StorageStrategy } from "../types"

export const SessionStorageStrategy: StorageStrategy<false> = {
	isAsync: false as const,

	has(key: string): boolean {
		return sessionStorage.getItem(key) !== null
	},

	get(key: string): string | null {
		return sessionStorage.getItem(key)
	},

	set(key: string, value: string): void {
		sessionStorage.setItem(key, value)
	},

	remove(key: string): void {
		sessionStorage.removeItem(key)
	},
}
