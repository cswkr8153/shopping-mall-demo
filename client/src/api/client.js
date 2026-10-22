import axios from 'axios'

// 개발 시 vite proxy(/api -> localhost:5001)를 사용
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// 로그인 토큰이 있으면 모든 요청에 Authorization 헤더로 전달
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
