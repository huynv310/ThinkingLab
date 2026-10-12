import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@fontsource/be-vietnam-pro/800.css'
import './index.css'

import { lazy, StrictMode, Suspense, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { initInteractionSound } from './lib/sound'

initInteractionSound()

// Tách chunk: landing (GSAP + Lenis) và dashboard không tải lẫn nhau
const AdminPage = lazy(() => import('./pages/dashboard/AdminPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const ChatPage = lazy(() => import('./pages/dashboard/ChatPage'))
const CourseDetail = lazy(() => import('./pages/dashboard/CourseDetail'))
const CoursesPage = lazy(() => import('./pages/dashboard/CoursesPage'))
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout'))
const Landing = lazy(() => import('./pages/landing/Landing'))

const Loading = () => <div className="grid min-h-dvh place-items-center text-ink-soft">Đang tải…</div>

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/auth?mode=login" replace state={{ from: location.pathname }} />
  return children
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <div className="aurora" aria-hidden>
          <span />
        </div>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="khoa-hoc" replace />} />
              <Route path="khoa-hoc" element={<CoursesPage />} />
              <Route path="khoa-hoc/:slug" element={<CourseDetail />} />
              <Route path="tro-chuyen" element={<ChatPage />} />
              <Route path="tro-chuyen/:id" element={<ChatPage />} />
              <Route path="quan-tri" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
