import { describe, it, expect, vi, beforeEach } from "vitest"
import { createPersistPlugin } from "../src/plugin"
import { createMemoryStorage } from "../src/storage/memoryStorage"
import type { StorageStrategy } from "../src/types"

// Mock a simple store object (simulating what valtio-plugin would provide)
const createMockStore = <T extends object>(initial: T): T => {
	return { ...initial }
}

describe("createPersistPlugin", () => {
	let storage: StorageStrategy<false>

	beforeEach(() => {
		storage = createMemoryStorage()
		vi.clearAllMocks()
	})

	describe("basic functionality", () => {
		it("should create a plugin with the given key as id", () => {
			const plugin = createPersistPlugin("test-key")

			expect(plugin.id).toBe("test-key")
			expect(plugin.name).toBe("Persist Plugin (test-key)")
		})

		it("should expose the required API methods", () => {
			const plugin = createPersistPlugin("test-key")

			expect(typeof plugin.hydrate).toBe("function")
			expect(typeof plugin.persist).toBe("function")
			expect(typeof plugin.clear).toBe("function")
			expect(typeof plugin.isHydrated).toBe("function")
			expect(typeof plugin.getKey).toBe("function")
		})

		it("should return the correct key from getKey()", () => {
			const plugin = createPersistPlugin("my-storage-key")

			expect(plugin.getKey()).toBe("my-storage-key")
		})

		it("should not be hydrated initially", () => {
			const plugin = createPersistPlugin("test-key")

			expect(plugin.isHydrated()).toBe(false)
		})
	})

	describe("hydration", () => {
		it("should mark as hydrated after hydrate() is called", async () => {
			const plugin = createPersistPlugin("test-key", { storage })
			const store = createMockStore({ count: 0 })

			await plugin.hydrate(store)

			expect(plugin.isHydrated()).toBe(true)
		})

		it("should restore state from storage on hydrate", async () => {
			// Pre-populate storage
			storage.set("test-key", JSON.stringify({ count: 42, name: "John" }))

			const plugin = createPersistPlugin("test-key", { storage })
			const store = createMockStore({ count: 0, name: "" })

			await plugin.hydrate(store)

			expect(store.count).toBe(42)
			expect(store.name).toBe("John")
		})

		it("should keep initial state if storage is empty", async () => {
			const plugin = createPersistPlugin("test-key", { storage })
			const store = createMockStore({ count: 10, name: "Initial" })

			await plugin.hydrate(store)

			expect(store.count).toBe(10)
			expect(store.name).toBe("Initial")
		})

		it("should merge stored state with initial state", async () => {
			// Storage only has partial state
			storage.set("test-key", JSON.stringify({ count: 42 }))

			const plugin = createPersistPlugin("test-key", { storage })
			const store = createMockStore({ count: 0, name: "Default", extra: true })

			await plugin.hydrate(store)

			expect(store.count).toBe(42) // From storage
			expect(store.name).toBe("Default") // Kept from initial
			expect(store.extra).toBe(true) // Kept from initial
		})
	})

	describe("persistence", () => {
		it("should persist state when persist() is called", async () => {
			const plugin = createPersistPlugin("test-key", { storage })
			const store = createMockStore({ count: 99, name: "Test" })

			await plugin.persist(store)

			const stored = storage.get("test-key")
			expect(stored).not.toBeNull()

			const parsed = JSON.parse(stored!)
			expect(parsed.count).toBe(99)
			expect(parsed.name).toBe("Test")
		})

		it("should only persist specified paths", async () => {
			const plugin = createPersistPlugin("test-key", {
				storage,
				paths: ["count"],
			})
			const store = createMockStore({ count: 99, name: "Test", secret: "hidden" })

			await plugin.persist(store)

			const stored = storage.get("test-key")
			const parsed = JSON.parse(stored!)

			expect(parsed.count).toBe(99)
			expect(parsed.name).toBeUndefined()
			expect(parsed.secret).toBeUndefined()
		})
	})

	describe("clear", () => {
		it("should remove data from storage when clear() is called", async () => {
			storage.set("test-key", JSON.stringify({ count: 42 }))

			const plugin = createPersistPlugin("test-key", { storage })

			await plugin.clear()

			expect(storage.get("test-key")).toBeNull()
		})
	})

	describe("afterChange hook", () => {
		it("should be defined", () => {
			const plugin = createPersistPlugin("test-key")

			expect(typeof plugin.afterChange).toBe("function")
		})

		it("should not persist before hydration", async () => {
			const plugin = createPersistPlugin("test-key", {
				storage,
				debounceTime: 0,
			})

			// Simulate onAttach
			plugin.onAttach?.({} as never)

			// Call afterChange before hydration
			plugin.afterChange?.(["count"], 42, { count: 42 })

			// Give time for any async operations
			await new Promise((r) => setTimeout(r, 50))

			expect(storage.get("test-key")).toBeNull()
		})

		it("should respect path filtering in afterChange", async () => {
			const plugin = createPersistPlugin("test-key", {
				storage,
				paths: ["allowed"],
				debounceTime: 0,
			})

			plugin.onAttach?.({} as never)

			const store = createMockStore({ allowed: "", notAllowed: "" })
			await plugin.hydrate(store)

			// Clear storage to test fresh persist
			storage.remove("test-key")

			// Change to non-allowed path should not trigger persist
			plugin.afterChange?.(["notAllowed"], "value", store)

			await new Promise((r) => setTimeout(r, 50))

			expect(storage.get("test-key")).toBeNull()
		})
	})

	describe("shouldPersist callback", () => {
		it("should respect shouldPersist return value", async () => {
			const shouldPersist = vi.fn().mockReturnValue(false)

			const plugin = createPersistPlugin("test-key", {
				storage,
				shouldPersist,
				debounceTime: 0,
			})

			plugin.onAttach?.({} as never)

			const store = createMockStore({ count: 0 })
			await plugin.hydrate(store)

			// Clear storage
			storage.remove("test-key")

			// Trigger afterChange
			plugin.afterChange?.(["count"], 42, { count: 42 })

			await new Promise((r) => setTimeout(r, 50))

			// Should not persist because shouldPersist returned false
			expect(storage.get("test-key")).toBeNull()
			expect(shouldPersist).toHaveBeenCalledWith(["count"], 42, { count: 42 })
		})
	})

	describe("special types serialization", () => {
		it("should handle Date objects", async () => {
			const plugin = createPersistPlugin("test-key", { storage })
			const date = new Date("2024-01-15T12:00:00Z")
			const store = createMockStore({ createdAt: date })

			await plugin.persist(store)

			// Create new store and hydrate
			const newStore = createMockStore({ createdAt: new Date(0) })
			await plugin.hydrate(newStore)

			expect(newStore.createdAt).toBeInstanceOf(Date)
			expect(newStore.createdAt.toISOString()).toBe(date.toISOString())
		})

		it("should handle Map objects", async () => {
			const plugin = createPersistPlugin("test-key", { storage })
			const map = new Map([
				["a", 1],
				["b", 2],
			])
			const store = createMockStore({ data: map })

			await plugin.persist(store)

			const newStore = createMockStore({ data: new Map() })
			await plugin.hydrate(newStore)

			expect(newStore.data).toBeInstanceOf(Map)
			expect(newStore.data.get("a")).toBe(1)
			expect(newStore.data.get("b")).toBe(2)
		})

		it("should handle Set objects", async () => {
			const plugin = createPersistPlugin("test-key", { storage })
			const set = new Set([1, 2, 3])
			const store = createMockStore({ items: set })

			await plugin.persist(store)

			const newStore = createMockStore({ items: new Set() })
			await plugin.hydrate(newStore)

			expect(newStore.items).toBeInstanceOf(Set)
			expect(newStore.items.has(1)).toBe(true)
			expect(newStore.items.has(2)).toBe(true)
			expect(newStore.items.has(3)).toBe(true)
		})
	})
})

describe("path utilities", () => {
	it("should correctly filter by paths", async () => {
		const storage = createMemoryStorage()
		const plugin = createPersistPlugin("test", {
			storage,
			paths: ["user", "settings"],
		})

		const store = createMockStore({
			user: { name: "John" },
			settings: { theme: "dark" },
			cache: { temp: "data" },
			ui: { open: true },
		})

		await plugin.persist(store)

		const stored = JSON.parse(storage.get("test")!)

		expect(stored.user).toEqual({ name: "John" })
		expect(stored.settings).toEqual({ theme: "dark" })
		expect(stored.cache).toBeUndefined()
		expect(stored.ui).toBeUndefined()
	})
})
