import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FIELDS, ICONS, SUPPORT } from '../data/mentors'
import { useMentors } from '../lib/useMentors'
import MentorCard from '../components/MentorCard'
import { Loading, ErrorBox } from '../components/Status'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const { user, isMentor } = useAuth()
  const { mentors, loading, error } = useMentors()
  const search = (e) => {
    e.preventDefault()
    navigate(`/find?q=${encodeURIComponent(q)}`)
  }
  return (
    <>
      <section className="hero">
        <div>
          <h1>당신의 배움을 연결하는 곳, 청년도감</h1>
          <p>대학생부터 다양한 분야의 전문가까지, 나에게 필요한 멘토를 만나 새로운 배움을 시작하세요.</p>
          <form className="search" onSubmit={search} role="search">
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: 코딩, 한국어, 그림" aria-label="멘토 검색" />
            <button className="btn">멘토 검색</button>
          </form>
          <div className="chips">
            <span className="muted">필요한 도움:</span>
            {SUPPORT.map((s) => (
              <Link key={s} className="chip" to={`/find?q=${encodeURIComponent(s)}`}>{s}</Link>
            ))}
          </div>
        </div>
        <div className="hero-art">
          <b>1:1 맞춤 멘토링</b>누구나 가르칠 수 있고, 누구나 배울 기회를 얻는 연결
          <ul>
            <li>🔎 관심사로 멘토 찾기</li>
            <li>📝 간단한 신청서 작성</li>
            <li>🤝 관리자 확인 후 매칭</li>
          </ul>
        </div>
      </section>

      <section className="sec">
        <h2>인기 멘토링 분야</h2>
        <div className="grid">
          {FIELDS.map((f, i) => (
            <Link key={f} className="card field" to={`/find?field=${encodeURIComponent(f)}`}>
              <div className="ic">{ICONS[i]}</div>
              <strong>{f}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="sec">
        <h2>추천 멘토</h2>
        <p className="muted">※ 시연용 가상 멘토가 포함되어 있습니다.</p>
        {loading && <Loading />}
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="grid">{mentors.slice(0, 6).map((m) => <MentorCard key={m.id} m={m} />)}</div>
        <p style={{ textAlign: 'center' }}><Link className="btn" to="/find">멘토 전체 보기</Link></p>
      </section>

            <div className="cta">
        {user && !isMentor ? (
          <>
            <h2>나에게 맞는 멘토를 찾아보세요</h2>
            <p>분야와 지원 언어로 검색하고, 마음에 드는 멘토에게 신청할 수 있어요.</p>
            <Link className="btn" to="/find">멘토 찾기</Link>
          </>
        ) : (
          <>
            <h2>나누고 싶은 재능이 있나요?</h2>
            <p>멘토로 등록하면 관리자 승인 후 멘토 목록에 공개됩니다.</p>
            <Link className="btn" to={user ? '/register' : '/signup'}>{user ? '멘토 등록하기' : '멘토로 가입하기'}</Link>
          </>
        )}
      </div>
    </>
  )
}