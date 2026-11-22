import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// 승인된 멘토 전체 목록을 DB에서 가져옵니다
export function useMentors() {
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    supabase
      .from('mentors')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) {
          console.error('멘토 목록 에러:', error)
          setError('멘토 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
        }
        else setMentors(data)
        setLoading(false)
      })
    return () => { alive = false }
  }, [])

  return { mentors, loading, error }
}

// 멘토 1명을 id로 가져옵니다
export function useMentor(id) {
  const [mentor, setMentor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    supabase
      .from('mentors')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setError('멘토 정보를 불러오지 못했습니다.')
        else setMentor(data)
        setLoading(false)
      })
    return () => { alive = false }
  }, [id])

  return { mentor, loading, error }
}