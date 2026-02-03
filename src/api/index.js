// const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const BASE_URL = '/api';

export async function getUpcomingIpos() {
  const res = await fetch(`${BASE_URL}/upcoming-ipo`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API 오류: ${res.status}`)
  return res.json()
}

export async function getUpcomingIpo(id) {
  const res = await fetch(`${BASE_URL}/upcoming-ipo/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API 오류: ${res.status}`)
  return res.json()
}

export async function getUpcomingIpoRiskAnalysis(id) {
  const res = await fetch(`${BASE_URL}/upcoming-ipo/${id}/risk-analysis`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API 오류: ${res.status}`)
  return res.json()
}
