import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.error('화면 오류:', error) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main>
        <section className="sec"><div className="card">
          <h2>문제가 생겼어요</h2>
          <p className="muted">화면을 불러오는 중 오류가 발생했습니다. 새로고침해도 계속되면 운영자에게 알려 주세요.</p>
          <button className="btn" onClick={() => window.location.assign('/')}>홈으로 돌아가기</button>
        </div></section>
      </main>
    )
  }
}