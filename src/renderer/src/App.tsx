import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'
import Music from './pages/Music'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/music" replace />} />
        <Route path="/music" element={<Music />} />
      </Routes>
    </HashRouter>
  )
}

export default App
