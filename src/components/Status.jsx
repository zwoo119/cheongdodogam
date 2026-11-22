export function Loading({ text = '불러오는 중...' }) {
  return <div className="loading"><span className="spinner" />{text}</div>
}

export function ErrorBox({ children }) {
  return <div className="errbox" role="alert">{children}</div>
}