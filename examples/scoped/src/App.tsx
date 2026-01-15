import { useSnapshot } from 'valtio'
import { userStore, settingsStore } from './store'

const App = () => {
  const settingsSnap = useSnapshot(settingsStore)
  const userSnap = useSnapshot(userStore)

  return (
    <div>
      <div>
        <p>{userSnap.name}</p>
        <input type='text' name='user' onChange={(e) => userStore.name = e.target.value} placeholder='name' />
      </div>
      <div>
        <label>{settingsSnap.theme}</label>
        <button onClick={() => settingsStore.theme = settingsSnap.theme === 'light' ? 'dark' : 'light'}>Toggle Theme</button>
      </div>
    </div>
  )
}

export default App