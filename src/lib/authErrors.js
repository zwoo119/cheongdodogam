// Supabase 영어 에러를 사용자용 한국어 메시지로 바꿉니다
export function authMessage(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('invalid login')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (m.includes('already registered')) return '이미 가입된 이메일입니다.'
  if (m.includes('email not confirmed')) return '이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인해 주세요.'
  if (m.includes('rate limit') || m.includes('too many')) return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
  if (m.includes('password')) return '비밀번호 조건을 확인해 주세요. (8자 이상)'
  if (m.includes('fetch') || m.includes('network')) return '네트워크 연결을 확인해 주세요.'
  return '처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.'
}