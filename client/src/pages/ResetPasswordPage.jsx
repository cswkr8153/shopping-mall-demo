import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'

function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [form, setForm] = useState({ password: '', passwordConfirm: '' })
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/reset-password', { token, password: form.password })
      setMessage(data.message)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message || '서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <main className="page">
        <div className="card">
          <h1>비밀번호 재설정</h1>
          <p className="message error">유효하지 않은 링크입니다.</p>
          <p className="footer-text">
            <Link to="/forgot-password">비밀번호 찾기로 이동</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <h1>비밀번호 재설정</h1>
        <p className="subtitle">새 비밀번호를 입력해주세요</p>

        {done ? (
          <>
            <p className="message success">{message}</p>
            <Link to="/" className="btn btn-primary">
              로그인하러 가기
            </Link>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="new-password">새 비밀번호</label>
              <div className="input-wrap">
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="6자 이상"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="new-password-confirm">새 비밀번호 확인</label>
              <div className="input-wrap">
                <input
                  id="new-password-confirm"
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={form.passwordConfirm}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && <p className="message error">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </>
        )}
      </form>
    </main>
  )
}

export default ResetPasswordPage
