import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Loading, ErrorBox } from './Status'

const fmt = (t) => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

// 신고 목록 (관리자 화면의 한 탭). 대화는 "신고된 건"만 열람할 수 있습니다.
export default function AdminReports() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [tick, setTick] = useState(0)
  const [flash, setFlash] = useState('')
  const [actErr, setActErr] = useState('')
  const [thread, setThread] = useState(null)

  useEffect(() => {
    let alive = true
    supabase
      .from('reports')
      .select('id, application_id, message_id, reason, status, admin_note, created_at, reporter_id, applications(nick, applicant_id, mentors(name))')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { console.error(error); setLoadErr('신고 목록을 불러오지 못했습니다.') }
        else { setItems(data); setLoadErr('') }
        setLoading(false)
      })
    return () => { alive = false }
  }, [tick])

  const who = (r, sid) => (sid === r.applications?.applicant_id
    ? `보호자(${r.applications?.nick || '-'})`
    : `멘토(${r.applications?.mentors?.name || '-'})`)

  const view = async (r) => {
    setActErr(''); setFlash('')
    const { data, error } = await supabase.rpc('admin_reported_thread', { app: r.application_id })
    if (error) { console.error(error); return setActErr('대화를 불러오지 못했습니다.') }
    setThread({ r, msgs: data })
  }

  const resolve = async (r) => {
    const note = window.prompt('처리 내용을 간단히 적어 주세요. (선택)')
    if (note === null) return
    setActErr(''); setFlash('')
    const { error } = await supabase.rpc('admin_resolve_report', { rid: r.id, note })
    if (error) { console.error(error); return setActErr('처리하지 못했습니다.') }
    setFlash('신고를 처리 완료로 표시했습니다.')
    setTick((t) => t + 1)
  }

  if (loading) return <Loading />
  return (
    <>
      <p className="muted">신고가 접수된 대화만 열람할 수 있어요. 열람은 안전 확인 목적으로만 사용하세요.</p>
      {flash && <div className="ok" role="status" style={{ marginBottom: 12 }}>{flash}</div>}
      {actErr && <ErrorBox>{actErr}</ErrorBox>}
      {loadErr && <ErrorBox>{loadErr}</ErrorBox>}
      {!loadErr && items.length === 0 && <div className="card muted">접수된 신고가 없습니다.</div>}

      {items.length > 0 && (
        <div className="card tw">
          <table>
            <thead><tr><th>신고 시각</th><th>신고자</th><th>대상 소통방</th><th>사유</th><th>상태</th><th>처리</th></tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>{fmt(r.created_at)}</td>
                  <td>{who(r, r.reporter_id)}</td>
                  <td>{r.applications?.mentors?.name || '-'} 멘토 ↔ {r.applications?.nick || '-'}</td>
                  <td>{r.reason}{r.message_id ? ' (특정 메시지)' : ''}</td>
                  <td><span className={`st ${r.status === 'open' ? 'w' : ''}`}>{r.status === 'open' ? '확인 필요' : '처리 완료'}</span></td>
                  <td>
                    <button className="link" onClick={() => view(r)}>대화 보기</button>{' '}
                    {r.status === 'open' && <button className="link" onClick={() => resolve(r)}>처리 완료</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {thread && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="app-top"><h3 style={{ margin: 0 }}>신고된 대화</h3><button className="link" onClick={() => setThread(null)}>닫기</button></div>
          <div className="chat" style={{ height: 'auto', maxHeight: 360, marginTop: 12 }}>
            {thread.msgs.map((m) => (
              <div key={m.id} className="msg">
                <small>{who(thread.r, m.sender_id)} · {fmt(m.created_at)}{m.id === thread.r.message_id ? ' · ⚠️ 신고된 메시지' : ''}</small>
                <div className="bubble" style={m.id === thread.r.message_id ? { outline: '2px solid var(--rd)' } : undefined}>{m.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}