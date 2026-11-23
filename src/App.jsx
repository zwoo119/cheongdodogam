import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Find from './pages/Find'
import MentorDetail from './pages/MentorDetail'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Register from './pages/Register'
import Apply from './pages/Apply'
import History from './pages/History'
import Admin from './pages/Admin'
import HowTo from './pages/HowTo'
import Policy from './pages/Policy'
import NotFound from './pages/NotFound'
import Rooms from './pages/Rooms'
import Room from './pages/Room'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/find" element={<Find />} />
          <Route path="/mentor/:id" element={<MentorDetail />} />
          <Route path="/how" element={<HowTo />} />
          <Route path="/privacy" element={<Policy kind="privacy" />} />
          <Route path="/terms" element={<Policy kind="terms" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/apply/:id" element={<ProtectedRoute><Apply /></ProtectedRoute>} />
          <Route path="/register" element={<ProtectedRoute mentor><Register /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                    <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
          <Route path="/room/:id" element={<ProtectedRoute><Room /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute admin><Admin /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}