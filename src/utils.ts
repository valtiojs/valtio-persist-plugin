export const debounce = <TArgs extends unknown[]>(
	fn: (...args: TArgs) => void,
	ms = 100
): ((...args: TArgs) => void) => {
	let timeoutId: ReturnType<typeof setTimeout> | null = null

	return (...args: TArgs): void => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId)
		}

		timeoutId = setTimeout(() => {
			fn(...args)
			timeoutId = null
		}, ms)
	}
}

export const updateStore = <T extends object>(store: T, newState: Partial<T>): void => {
	for (const key of Object.keys(newState) as (keyof T)[]) {
		store[key] = newState[key] as T[keyof T]
	}
}

export const getByPath = <T>(obj: T, path: string[]): unknown => {
	let current: unknown = obj
	for (const key of path) {
		if (current === null || current === undefined) {
			return undefined
		}
		current = (current as Record<string, unknown>)[key]
	}
	return current
}

export const setByPath = <T extends object>(
	obj: T,
	path: string[],
	value: unknown
): void => {
	if (path.length === 0) return

	let current: Record<string, unknown> = obj as Record<string, unknown>
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i]
		if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
			current[key] = {}
		}
		current = current[key] as Record<string, unknown>
	}

	current[path[path.length - 1]] = value
}

export const pickPaths = <T extends object>(obj: T, paths: string[]): Partial<T> => {
	const result: Record<string, unknown> = {}

	for (const pathStr of paths) {
		const pathParts = pathStr.split('.')
		const value = getByPath(obj, pathParts)
		if (value !== undefined) {
			setByPath(result as T, pathParts, value)
		}
	}

	return result as Partial<T>
}

export const pathMatchesAny = (changePath: string[], filterPaths: string[]): boolean => {
	if (filterPaths.length === 0) return true

	const changePathStr = changePath.join('.')

	return filterPaths.some((filterPath) => {
		// Exact match or change is nested under the filter path
		if (changePathStr === filterPath || changePathStr.startsWith(`${filterPath}.`)) {
			return true
		}
		// Filter path is nested under the change path (parent changed)
		if (filterPath.startsWith(`${changePathStr}.`)) {
			return true
		}
		return false
	})
}
