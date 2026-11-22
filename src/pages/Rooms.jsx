import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Loading, ErrorBox } from '../components/Status'

const fmt = (t) => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

// 내 소통방 목록: 매칭 완료·완료된 신청 중 내가 참여자인 것
export default function Rooms() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    supabase
      .from('applications')
      .select('id, nick, grade, field, mode, status, applicant_id, created_at, mentors(name, owner_id)')
      .in('status', ['매칭 완료', '완료'])
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { console.error(error); setErr('소통방 목록을 불러오지 못했습니다.') }
        else setItems(data.filter((a) => a.applicant_id === user.id || a.mentors?.owner_id === user.id))
        setLoading(false)
      })
    return () => { alive = false }
  }, [user.id])

  return (
    <section className="sec">
      <h2>내 소통방</h2>
      <p className="muted">멘토링 신청이 ‘매칭 완료’가 되면 소통방이 열려요.</p>
      {loading && <Loading />}
      {err && <ErrorBox>{err}</ErrorBox>}
      {!loading && !err && items.length === 0 && (
        <div className="card">열린 소통방이 없습니다. 관리자가 매칭을 완료하면 이곳에 나타나요.</div>
      )}
      <div className="apps">
        {items.map((a) => {
          const asApplicant = a.applicant_id === user.id
          return (
            <article key={a.id} className="card app-item">
              <div className="app-top">
                <strong>{asApplicant ? `${a.mentors?.name || '멘토'} 멘토` : `${a.nick}(${a.grade}) 학생의 보호자`}</strong>
                <span className={`st ${a.status === '완료' ? '' : 'w'}`}>{a.status === '완료' ? '수업 완료' : '진행 중'}</span>
              </div>
              <div className="muted">{a.field} · {a.mode} · {fmt(a.created_at)} 신청</div>
              <div className="app-btns"><Link className="btn sm" to={`/room/${a.id}`}>소통방 입장</Link></div>
            </article>
          )
        })}
      </div>
    </section>
  )
}