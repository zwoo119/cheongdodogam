import { Link } from 'react-router-dom'

const MENTEE = [
  ['멘토 찾기', '분야, 활동 방식, 지원 언어로 원하는 멘토를 검색해요.'],
  ['프로필 확인', '소개, 가르칠 내용, 가능한 시간을 살펴봐요.'],
  ['1:1 신청', '학생 별칭과 희망 시간을 적어 신청서를 제출해요.'],
  ['매칭 확인', '관리자 확인 후 신청 내역에서 상태가 바뀌어요.'],
]
const MENTOR = [
  ['멘토 계정 가입', '가입할 때 ‘멘토’ 유형을 선택해요.'],
  ['프로필 등록', '전문 분야와 가능한 시간을 적어 등록해요.'],
  ['관리자 승인', '신원·자격 확인 후 승인되면 멘토 목록에 공개돼요.'],
  ['멘토링 진행', '매칭된 학생과 약속한 방식으로 멘토링해요.'],
]
const STATUS = [
  ['신청 접수', '신청서가 접수되었어요. 이 단계에서는 수정·취소할 수 있어요.'],
  ['확인 중', '관리자가 내용을 확인하고 있어요.'],
  ['매칭 완료', '멘토와 연결되었어요.'],
  ['완료', '멘토링이 끝났어요.'],
  ['취소', '신청이 취소되었어요.'],
]

export default function HowTo() {
  return (
    <>
      <section className="sec">
        <h2>멘티 이용 방법</h2>
        <p className="muted">학생의 보호자, 또는 직접 배우고 싶은 성인이 이용해요.</p>
        <div className="grid steps">
          {MENTEE.map(([t, d]) => <div key={t} className="card"><h3>{t}</h3><p className="muted" style={{ margin: 0 }}>{d}</p></div>)}
        </div>
      </section>

      <section className="sec">
        <h2>멘토 이용 방법</h2>
        <p className="muted">재능을 나누고 싶은 대학생, 직장인, 전문 강사, 지역 주민이 이용해요.</p>
        <div className="grid steps">
          {MENTOR.map(([t, d]) => <div key={t} className="card"><h3>{t}</h3><p className="muted" style={{ margin: 0 }}>{d}</p></div>)}
        </div>
      </section>

      <section className="sec">
        <h2>신청 상태 안내</h2>
        <div className="card tw">
          <table>
            <thead><tr><th>상태</th><th>의미</th></tr></thead>
            <tbody>{STATUS.map(([s, d]) => <tr key={s}><td><span className="st">{s}</span></td><td>{d}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="sec">
        <h2>안전하게 이용하기</h2>
        <div className="notice">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>신청서와 프로필에는 실명, 연락처, 주소 같은 개인정보를 적지 마세요.</li>
            <li>학생은 보호자 계정으로 신청하고, 학생에게는 별칭만 사용해요.</li>
            <li>이상한 요청을 받으면 응답하지 말고 운영자에게 알려 주세요.</li>
            <li>아동 대상 멘토링은 별도의 신원 확인과 자격 검증을 거친 멘토만 진행해요.</li>
          </ul>
        </div>
        <p><Link className="btn" to="/find">멘토 찾으러 가기</Link></p>
      </section>
    </>
  )
}