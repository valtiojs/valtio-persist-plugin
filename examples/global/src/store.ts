import { proxy } from 'valtio-plugin'
import { createPersistPlugin } from '../../../src'

const persist = createPersistPlugin('data')
proxy.use(persist)

export const store = proxy({
  count: 0
})

persist.hydrate(store)