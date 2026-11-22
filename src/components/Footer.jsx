import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="ft">
      <p><strong>청년도감</strong> · 누구나 가르칠 수 있고, 누구나 배울 기회를 얻는 연결</p>
      <p className="muted">시연용 가상 멘토가 포함되어 있습니다. 실명·연락처 등 개인정보는 입력하지 마세요.</p>
      <nav aria-label="하단 메뉴">
        <Link to="/how">이용 방법</Link>
        <Link to="/terms">이용약관</Link>
        <Link to="/privacy">개인정보 처리방침</Link>
      </nav>
    </footer>
  )
}