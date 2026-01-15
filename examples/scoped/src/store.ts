import { proxy } from 'valtio-plugin'
import { createPersistPlugin, LocalStorageStrategy, SessionStorageStrategy } from '../../../src'

const persistUser = createPersistPlugin('user', {
  storage: SessionStorageStrategy
})

const persistSettings = createPersistPlugin('settings', {
  storage: LocalStorageStrategy
})

/**
 * We're going to create two different stores that will be persisted in two different places
 * 1. userStore - will be persisted in sessionStorage
 * 2. settingsStore - will be persisted in localStorage
 * 
 * You can do as many of these as is needed and they can all use different strategies. This
 * includes different serialization or merging strategies as well.
 */

// Create your different scoped stores
export const userInstance = proxy.createInstance()
export const settingsInstance = proxy.createInstance()

userInstance.use(persistUser)
settingsInstance.use(persistSettings)

export const userStore = userInstance({
  name: ''
})

export const settingsStore = settingsInstance({
  theme: 'light'
})

persistUser.hydrate(userStore)
persistSettings.hydrate(settingsStore)