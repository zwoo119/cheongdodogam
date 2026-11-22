import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Loading, ErrorBox } from '../components/Status'
import AdminReports from '../components/AdminReports'

const APP_STATUS = ['신청 접수', '확인 중', '매칭 완료', '완료', '취소']
const M_STATUS = { pending: ['승인 대기', 'w'], approved: ['공개 중', ''], rejected: ['반려', 'x'] }
const stCls = (s) => (s === '취소' ? 'x' : s === '신청 접수' || s === '확인 중' ? 'w' : '')
const fmt = (t) => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function Admin() {
  const [tab, setTab] = useState('pending')
  const [mentors, setMentors] = useState([])
  const [apps, setApps] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [tick, setTick] = useState(0)
  const [flash, setFlash] = useState('')
  const [actErr, setActErr] = useState('')
  const [filter, setFilter] = useState('')

  // 전체 데이터 불러오기 (관리자 규칙 덕분에 전체 조회 가능)
  useEffect(() => {
    let alive = true
    Promise.all([
      supabase.from('mentors').select('id, name, type, field, bio, mode, status, is_demo, created_at').order('created_at', { ascending: false }),
      supabase.from('applications').select('id, applicant_id, nick, grade, field, time, mode, req, status, created_at, mentors(name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, display_name, role, account_type, created_at').order('created_at', { ascending: false }),
    ]).then(([m, a, p]) => {
      if (!alive) return
      if (m.error || a.error || p.error) {
        console.error('관리자 조회 에러:', m.error || a.error || p.error)
        setLoadErr('데이터를 불러오지 못했습니다. 관리자 권한을 확인해 주세요.')
      } else {
        setMentors(m.data); setApps(a.data); setMembers(p.data); setLoadErr('')
      }
      setLoading(false)
    })
    return () => { alive = false }
  }, [tick])

  const reload = () => setTick((t) => t + 1)
  const done = (msg) => { setFlash(msg); setActErr(''); reload() }
  const fail = (msg) => { setActErr(msg); setFlash('') }

  // 멘토 승인·반려·공개 중지
  const setMentor = async (m, status, msg, ask) => {
    if (ask && !window.confirm(ask)) return
    const { data, error } = await supabase.from('mentors').update({ status }).eq('id', m.id).select()
    if (error || !data?.length) { console.error(error); return fail('멘토 상태를 바꾸지 못했습니다.') }
    done(`${m.name}: ${msg}`)
  }

  // 신청 상태 변경
  const setApp = async (a, status) => {
    const { data, error } = await supabase.from('applications').update({ status }).eq('id', a.id).select()
    if (error || !data?.length) { console.error(error); return fail('신청 상태를 바꾸지 못했습니다.') }
    done(`${a.nick}님의 신청 상태를 ‘${status}’(으)로 변경했습니다.`)
  }

  // 계정 유형 변경 (전용 함수 호출)
  const setType = async (p, type) => {
    if (!window.confirm(`${p.display_name || '회원'}님을 ${type === 'mentor' ? '멘토' : '멘티'} 계정으로 바꿀까요?`)) return
    const { error } = await supabase.rpc('admin_set_account_type', { target: p.id, new_type: type })
    if (error) { console.error(error); return fail('계정 유형을 바꾸지 못했습니다.') }
    done('계정 유형을 변경했습니다.')
  }

  if (loading) return <section className="sec"><Loading /></section>

  const pending = mentors.filter((m) => m.status === 'pending')
  const nameOf = Object.fromEntries(members.map((p) => [p.id, p.display_name || '회원']))
  const shownApps = filter ? apps.filter((a) => a.status === filter) : apps

  return (
    <section className="sec">
      <h2>관리자 대시보드</h2>
      <div className="notice">관리자 권한이 있는 계정에서만 볼 수 있습니다. 모든 변경은 DB 보안 규칙(RLS)으로 한 번 더 검증됩니다.</div>

      <div className="stats">
        {APP_STATUS.map((s) => (
          <div key={s} className="card stat"><b>{apps.filter((a) => a.status === s).length}</b>{s}</div>
        ))}
        <div className="card stat"><b>{pending.length}</b>승인 대기 멘토</div>
      </div>

      <div className="tabs" role="tablist">
        {[['pending', `멘토 승인 (${pending.length})`], ['apps', `신청 관리 (${apps.length})`], ['mentors', `전체 멘토 (${mentors.length})`], ['members', `회원 (${members.length})`], ['reports', '신고']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
        <button className="link" onClick={reload}>↻ 새로고침</button>
      </div>

      {flash && <div className="ok" role="status" style={{ marginBottom: 12 }}>{flash}</div>}
      {actErr && <ErrorBox>{actErr}</ErrorBox>}
      {loadErr && <ErrorBox>{loadErr}</ErrorBox>}

      {tab === 'pending' && (
        pending.length === 0 ? <div className="card muted">승인 대기 중인 멘토가 없습니다.</div> : (
          <div className="apps">
            {pending.map((m) => (
              <article key={m.id} className="card app-item">
                <div className="app-top"><strong>{m.name}</strong><span className="tag bg">{m.type}</span></div>
                <div className="muted">{m.field} · {m.mode} · {fmt(m.created_at)} 등록</div>
                <p style={{ margin: '8px 0' }}>{m.bio}</p>
                <div className="app-btns">
                  <button className="btn sm" onClick={() => setMentor(m, 'approved', '승인했습니다. 멘토 목록에 공개됩니다.')}>승인</button>
                  <button className="btn sm red" onClick={() => setMentor(m, 'rejected', '등록을 반려했습니다.', `‘${m.name}’ 등록을 반려할까요?`)}>반려</button>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {tab === 'apps' && (
        <>
          <p>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="상태 필터" style={{ maxWidth: 200 }}>
              <option value="">전체 상태</option>
              {APP_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </p>
          {shownApps.length === 0 ? <div className="card muted">해당하는 신청이 없습니다.</div> : (
            <div className="card tw">
              <table>
                <thead><tr><th>신청 시각</th><th>신청 계정</th><th>학생 별칭</th><th>멘토</th><th>분야·시간</th><th>요청 사항</th><th>상태</th></tr></thead>
                <tbody>
                  {shownApps.map((a) => (
                    <tr key={a.id}>
                      <td>{fmt(a.created_at)}</td>
                      <td>{nameOf[a.applicant_id] || '-'}</td>
                      <td>{a.nick} ({a.grade})</td>
                      <td>{a.mentors?.name || '-'}</td>
                      <td>{a.field}<br />{a.time} / {a.mode}</td>
                      <td>{a.req || '-'}</td>
                      <td>
                        <select value={a.status} onChange={(e) => setApp(a, e.target.value)} aria-label="신청 상태 변경">
                          {APP_STATUS.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'mentors' && (
        <div className="card tw">
          <table>
            <thead><tr><th>이름</th><th>유형</th><th>분야</th><th>방식</th><th>상태</th><th>처리</th></tr></thead>
            <tbody>
              {mentors.map((m) => {
                const [label, cls] = M_STATUS[m.status] || [m.status, '']
                return (
                  <tr key={m.id}>
                    <td>{m.name}{m.is_demo && <span className="muted"> (가상)</span>}</td>
                    <td>{m.type}</td><td>{m.field}</td><td>{m.mode}</td>
                    <td><span className={`st ${cls}`}>{label}</span></td>
                    <td>
                      {m.status === 'approved'
                        ? <button className="link" onClick={() => setMentor(m, 'rejected', '공개를 중지했습니다.', `‘${m.name}’ 공개를 중지할까요?`)}>공개 중지</button>
                        : <button className="link" onClick={() => setMentor(m, 'approved', '승인했습니다.')}>승인</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'members' && (
        <div className="card tw">
          <table>
            <thead><tr><th>이름</th><th>권한</th><th>계정 유형</th><th>가입일</th><th>유형 변경</th></tr></thead>
            <tbody>
              {members.map((p) => (
                <tr key={p.id}>
                  <td>{p.display_name || '-'}</td>
                  <td>{p.role === 'admin' ? '관리자' : '일반'}</td>
                  <td><span className="tag bg">{p.account_type === 'mentor' ? '멘토' : '멘티'}</span></td>
                  <td>{fmt(p.created_at)}</td>
                  <td>
                    <button className="link" onClick={() => setType(p, p.account_type === 'mentor' ? 'mentee' : 'mentor')}>
                      {p.account_type === 'mentor' ? '멘티로 변경' : '멘토로 변경'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        {tab === 'reports' && <AdminReports />}
    </section>
  )
}