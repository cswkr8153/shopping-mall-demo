import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [devLink, setDevLink] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setDevLink(null)

    if (!email.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() })
      setMessage(data.message)
      setDevLink(data.devResetLink || null)
    } catch (err) {
      setError(err.response?.data?.message || '서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <h1>비밀번호 찾기</h1>
        <p className="subtitle">가입한 이메일로 재설정 링크를 보내드립니다</p>

        <div className="field">
          <label htmlFor="forgot-email">이메일</label>
          <div className="input-wrap">
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="message error">{error}</p>}
        {message && <p className="message success">{message}</p>}
        {devLink && (
          <p className="message success">
            [개발용] 메일 연동 전 임시 링크: <a href={devLink}>비밀번호 재설정하기</a>
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '전송 중...' : '재설정 링크 받기'}
        </button>

        <div className="divider" />

        <p className="footer-text">
          <Link to="/login">로그인으로 돌아가기</Link>
        </p>
      </form>
    </main>
  )
}

export default ForgotPasswordPage
