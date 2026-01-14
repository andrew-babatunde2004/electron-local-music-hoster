
import {Route, Routes, HashRouter } from 'react-router-dom';
import Music from './pages/Music'
import Main from './pages/MainPage'
function App(): React.JSX.Element {
  
  return (
    // the router that routes the elements to the main page and music page, we should only need 2
    <HashRouter>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/music" element={<Music />} />
        
        </Routes>
    </HashRouter>
  )
}

export default App
