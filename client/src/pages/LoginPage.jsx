import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api/client'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useCart } from '../context/CartContext'
import './MainPage.css'

function LoginPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { loadCart } = useCart()
  const [form, setForm] = useState({ email: '', password: '' })
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!form.email.trim() || !form.password) {
      setMessage('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', {
        email: form.email.trim(),
        password: form.password,
      })
      localStorage.setItem('token', data.token)
      await loadCart()
      navigate('/')
    } catch (err) {
      setMessage(err.response?.data?.message || '서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="shop">
      <Navbar />
      <main className="page">
      <div className="card main-card">
        <h1>로그인</h1>
        <p className="subtitle">쇼핑을 시작해보세요</p>

        {state?.signedUp && (
          <p className="message success">회원가입이 완료되었습니다. 배송비 무료 쿠폰 1장이 지급되었어요. 주문할 때 사용해 보세요!</p>
        )}

        <form className="card" onSubmit={handleLogin} noValidate>
          <div className="field">
            <label htmlFor="login-email">이메일</label>
            <div className="input-wrap">
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="login-password">비밀번호</label>
            <div className="input-wrap">
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="비밀번호를 입력하세요"
                value={form.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {message && <p className="message error">{message}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="footer-text">
          <Link to="/forgot-password">비밀번호를 잊으셨나요?</Link>
        </p>
        <p className="footer-text">
          아직 계정이 없으신가요? <Link to="/signup">회원가입</Link> <span className="perk-inline">첫 주문 배송비 무료</span>
        </p>
        <p className="footer-text">
          <Link to="/">쇼핑몰로 돌아가기</Link>
        </p>
      </div>
      </main>
      <Footer />
    </div>
  )
}

export default LoginPage
