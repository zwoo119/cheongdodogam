import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="sec nf">
      <div className="big">404</div>
      <h2>페이지를 찾을 수 없어요</h2>
      <p className="muted">주소가 바뀌었거나 없는 페이지예요.</p>
      <Link className="btn" to="/">홈으로 가기</Link>
    </section>
  )
}