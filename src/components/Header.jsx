import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const [open, setOpen] = useState(false)
  const { user, profile, isAdmin, isMentor, signOut } = useAuth()
  const close = () => setOpen(false)

  const menu = [['/', '홈'], ['/find', '멘토 찾기']]
  if (!user || isMentor) menu.push(['/register', '멘토 등록']) // 멘티에게는 숨김
  menu.push(['/how', '이용 방법'])
  if (user && !isMentor) menu.push(['/history', '신청 내역']) // 멘토에게는 숨김
  if (user) menu.push(['/rooms', '소통방'])
  if (isAdmin) menu.push(['/admin', '관리자'])

  return (
    <header className="hd">
      <Link className="logo" to="/"><span className="logo-mark">도</span>청년도감</Link>
      <button className="burger" aria-label="메뉴 열기" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
      <nav id="nav" className={open ? 'open' : ''} aria-label="주요 메뉴">
        {menu.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')} onClick={close}>
            {label}
          </NavLink>
        ))}
        {user ? (
          <>
            <span className="who">{profile?.display_name || '회원'}님{isAdmin
              ? <span className="tag" style={{ marginLeft: 6, background: 'var(--g)', color: '#fff' }}>관리자</span>
              : profile && <span className="tag bg" style={{ marginLeft: 6 }}>{profile.account_type === 'mentor' ? '멘토' : '멘티'}</span>}</span>
            <button className="btn ghost sm" onClick={() => { close(); signOut() }}>로그아웃</button>
          </>
        ) : (
          <>
            <Link className="nav-login" to="/login" onClick={close}>로그인</Link>
            <Link className="btn sm nav-signup" to="/signup" onClick={close}>회원가입</Link>
          </>
        )}
      </nav>
    </header>
  )
}