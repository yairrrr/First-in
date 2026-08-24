import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { App } from './App'
import { ProjectsPage } from './routes/ProjectsPage'
import { ProjectPage } from './routes/ProjectPage'
import { StudyPage } from './routes/StudyPage'
import { ChapterPage } from './routes/ChapterPage'
import { AppProvider } from './state/AppContext'
import { ToastProvider } from './components/Toast'
import './styles/app.css'

const root = document.getElementById('root')
if (!root) throw new Error('לא נמצא אלמנט root ב-index.html')

createRoot(root).render(
  <StrictMode>
    <AppProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<ProjectsPage />} />
            <Route path="project/:id" element={<ProjectPage />} />
            <Route path="project/:id/study" element={<StudyPage />} />
            <Route path="project/:id/study/:step" element={<ChapterPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  </StrictMode>,
)
