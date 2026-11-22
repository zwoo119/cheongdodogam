import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { FIELDS } from '../data/mentors'
import { Loading, ErrorBox } from '../components/Status'

const stCls = (s) => (s === '취소' ? 'x' : s === '신청 접수' || s === '확인 중' ? 'w' : '')
const fmt = (t) => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function History() {
  const { user } = useAuth()
  const loc = useLocation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [tick, setTick] = useState(0)
  const [flash, setFlash] = useState(loc.state?.msg || '')
  const [actErr, setActErr] = useState('')
  const [editId, setEditId] = useState(null)
  const [ef, setEf] = useState({})
  const [busy, setBusy] = useState(false)

  // 내 신청 목록 (RLS 덕분에 내 신청만 조회됨)
  useEffect(() => {
    let alive = true
    supabase
      .from('applications')
      .select('id, nick, grade, field, time, mode, req, status, created_at, mentors(name)')
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { console.error(error); setLoadErr('신청 내역을 불러오지 못했습니다.') }
        else { setItems(data); setLoadErr('') }
        setLoading(false)
      })
    return () => { alive = false }
  }, [user.id, tick])

  const reload = () => setTick((t) => t + 1)
  const startEdit = (a) => { setEditId(a.id); setActErr(''); setEf({ field: a.field, time: a.time, mode: a.mode, req: a.req || '' }) }

  const saveEdit = async (a) => {
    setActErr(''); setFlash('')
    if (!ef.time.trim()) return setActErr('희망 요일·시간을 입력해 주세요.')
    setBusy(true)
    const { data, error } = await supabase.from('applications')
      .update({ field: ef.field, time: ef.time.trim(), mode: ef.mode, req: ef.req.trim() || null })
      .eq('id', a.id).select()
    setBusy(false)
    if (error || !data?.length) return setActErr('수정하지 못했습니다. 이미 처리가 시작된 신청은 수정할 수 없습니다.')
    setEditId(null); setFlash('신청 내용을 수정했습니다.'); reload()
  }

  const cancel = async (a) => {
    if (!window.confirm('이 신청을 취소할까요?')) return
    setActErr(''); setFlash('')
    const { data, error } = await supabase.from('applications').update({ status: '취소' }).eq('id', a.id).select()
    if (error || !data?.length) return setActErr('취소하지 못했습니다. 이미 확인 중인 신청은 관리자에게 문의해 주세요.')
    setFlash('신청을 취소했습니다.'); reload()
  }

  const remove = async (a) => {
    if (!window.confirm('이 신청 기록을 삭제할까요? 되돌릴 수 없습니다.')) return
    setActErr(''); setFlash('')
    const { data, error } = await supabase.from('applications').delete().eq('id', a.id).select()
    if (error || !data?.length) return setActErr('삭제하지 못했습니다.')
    setFlash('신청 기록을 삭제했습니다.'); reload()
  }

  return (
    <section className="sec">
      <h2>내 신청 내역</h2>
      <p className="muted">상태는 관리자 확인 후 바뀝니다. 새 소식을 보려면 새로고침 버튼을 눌러 주세요.</p>
      <p><button className="btn ghost sm" onClick={reload}>↻ 새로고침</button></p>

      {flash && <div className="ok" role="status" style={{ marginBottom: 12 }}>{flash}</div>}
      {actErr && <ErrorBox>{actErr}</ErrorBox>}
      {loading && <Loading />}
      {loadErr && <ErrorBox>{loadErr}</ErrorBox>}

      {!loading && !loadErr && items.length === 0 && (
        <div className="card">아직 신청 내역이 없습니다. <Link className="link" to="/find">멘토를 찾아 신청해 보세요.</Link></div>
      )}

      <div className="apps">
        {items.map((a) => (
          <article key={a.id} className="card app-item">
            <div className="app-top">
              <strong>{a.mentors?.name || '(멘토 정보 없음)'} 멘토</strong>
              <span className={`st ${stCls(a.status)}`}>{a.status}</span>
            </div>
            <div className="muted">{fmt(a.created_at)} 신청 · {a.nick} ({a.grade})</div>

            {editId === a.id ? (
              <div className="form" style={{ marginTop: 12 }}>
                <label>희망 분야
                  <select value={ef.field} onChange={(e) => setEf({ ...ef, field: e.target.value })}>
                    {FIELDS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label>희망 요일·시간
                  <input type="text" maxLength={40} value={ef.time} onChange={(e) => setEf({ ...ef, time: e.target.value })} />
                </label>
                <label>진행 방식
                  <select value={ef.mode} onChange={(e) => setEf({ ...ef, mode: e.target.value })}>
                    <option>온라인</option><option>오프라인</option>
                  </select>
                </label>
                <label>요청 사항
                  <textarea rows={3} maxLength={200} value={ef.req} onChange={(e) => setEf({ ...ef, req: e.target.value })} />
                </label>
                <div>
                  <button className="btn sm" disabled={busy} onClick={() => saveEdit(a)}>{busy ? '저장 중...' : '저장'}</button>{' '}
                  <button className="btn ghost sm" onClick={() => setEditId(null)}>닫기</button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ margin: '10px 0 4px' }}>{a.field} · {a.time} · {a.mode}</p>
                {a.req && <p className="muted" style={{ margin: 0 }}>요청: {a.req}</p>}
                <div className="app-btns">
                  {(a.status === '매칭 완료' || a.status === '완료') && <Link className="btn sm" to={`/room/${a.id}`}>소통방 입장</Link>}
                  {(a.status === '매칭 완료' || a.status === '완료') && <Link className="btn sm" to={`/room/${a.id}`}>소통방 입장</Link>}
                  {a.status === '신청 접수' && (
                    <>
                      <button className="btn ghost sm" onClick={() => startEdit(a)}>수정</button>
                      <button className="btn ghost sm" onClick={() => cancel(a)}>신청 취소</button>
                    </>
                  )}
                  {(a.status === '취소' || a.status === '신청 접수') && (
                    <button className="link" onClick={() => remove(a)}>기록 삭제</button>
                  )}
                  {a.status === '확인 중' && <span className="muted">관리자가 확인 중이라 수정할 수 없습니다.</span>}
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}