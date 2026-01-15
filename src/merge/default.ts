import type { MergeStrategy } from "../types"

export const DefaultMergeStrategy: MergeStrategy<object, false> = {
	isAsync: false as const,

	merge<T extends object>(initialState: T, restoredState: T): T {
		return { ...initialState, ...restoredState }
	},
}
