import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from './Status'

// 로그인한 사람만 (admin이면 관리자만, mentor면 멘토 계정만) 볼 수 있는 화면을 감싸는 문지기
export default function ProtectedRoute({ children, admin = false, mentor = false }) {
  const { user, isAdmin, isMentor, loading } = useAuth()
  const loc = useLocation()

  if (loading) return <section className="sec"><Loading /></section>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />

  if (admin && !isAdmin) {
    return (
      <section className="sec"><div className="card">
        <h2>접근 권한이 없습니다</h2>
        <p className="muted">관리자만 볼 수 있는 화면입니다.</p>
        <Link className="btn" to="/">홈으로</Link>
      </div></section>
    )
  }

  if (mentor && !isMentor) {
    return (
      <section className="sec"><div className="card">
        <h2>멘토 계정만 이용할 수 있어요</h2>
        <p className="muted">멘토 등록은 ‘멘토’ 유형으로 가입한 계정에서만 할 수 있습니다. 배우고 싶다면 멘토를 찾아 신청해 보세요.</p>
        <Link className="btn" to="/find">멘토 찾기</Link>
      </div></section>
    )
  }
  return children
}