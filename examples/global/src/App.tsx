import { useSnapshot } from 'valtio'
import { store } from './store'

const App = () => {
  const snap = useSnapshot(store)

  return (
    <div>
      <label>{snap.count}</label>
      <button type='button' onClick={() => store.count++}>Increment</button>
    </div>
  )
}

export default App