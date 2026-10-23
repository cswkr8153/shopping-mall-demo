import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

// userController / User 스키마 기준 필드: email, name, password, user_type
// (passwordConfirm 은 화면 검증용이며 서버로 보내지 않음)
const INITIAL_FORM = {
  email: '',
  name: '',
  password: '',
  passwordConfirm: '',
  user_type: 'customer',
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const MailIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
)
const UserIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
)
const LockIcon = () => (
  <svg {...iconProps}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)
const EyeIcon = ({ off }) => (
  <svg {...iconProps}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="m4 4 16 16" />}
  </svg>
)

function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!form.email.trim()) next.email = '이메일을 입력해주세요.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = '이메일 형식이 올바르지 않습니다.'
    if (!form.name.trim()) next.name = '이름을 입력해주세요.'
    if (!form.password) next.password = '비밀번호를 입력해주세요.'
    else if (form.password.length < 6) next.password = '비밀번호는 6자 이상이어야 합니다.'
    if (form.password !== form.passwordConfirm) next.passwordConfirm = '비밀번호가 일치하지 않습니다.'
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setLoading(true)
    try {
      await api.post('/users', {
        email: form.email.trim(),
        name: form.name.trim(),
        password: form.password,
        user_type: form.user_type,
      })
      navigate('/login', { state: { signedUp: true } })
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) setErrors(data.errors)
      setMessage(data?.message || '서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <h1>회원가입</h1>
        <p className="subtitle">계정을 만들고 쇼핑을 시작하세요</p>

        <p className="perk">
          <strong>가입하면 첫 주문 배송비 무료!</strong>
          <span>배송비 무료 쿠폰 1장을 가입 즉시 드려요 (1회 사용)</span>
        </p>

        <div className="field">
          <label htmlFor="email">이메일</label>
          <div className={`input-wrap ${errors.email ? 'invalid' : ''}`}>
            <MailIcon />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          {errors.email && <p className="error">{errors.email}</p>}
        </div>

        <div className="field">
          <label htmlFor="name">이름</label>
          <div className={`input-wrap ${errors.name ? 'invalid' : ''}`}>
            <UserIcon />
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="이름을 입력하세요"
              value={form.name}
              onChange={handleChange}
            />
          </div>
          {errors.name && <p className="error">{errors.name}</p>}
        </div>

        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <div className={`input-wrap ${errors.password ? 'invalid' : ''}`}>
            <LockIcon />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="비밀번호를 입력하세요 (6자 이상)"
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
          {errors.password && <p className="error">{errors.password}</p>}
        </div>

        <div className="field">
          <label htmlFor="passwordConfirm">비밀번호 확인</label>
          <div className={`input-wrap ${errors.passwordConfirm ? 'invalid' : ''}`}>
            <LockIcon />
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="비밀번호를 다시 입력하세요"
              value={form.passwordConfirm}
              onChange={handleChange}
            />
          </div>
          {errors.passwordConfirm && <p className="error">{errors.passwordConfirm}</p>}
        </div>

        <div className="field">
          <label htmlFor="user_type">가입 유형</label>
          <div className="input-wrap">
            <select id="user_type" name="user_type" value={form.user_type} onChange={handleChange}>
              <option value="customer">구매자</option>
              <option value="seller">판매자</option>
            </select>
          </div>
          {errors.user_type && <p className="error">{errors.user_type}</p>}
        </div>

        {message && <p className="message error">{message}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '가입 중...' : '회원가입'}
        </button>

        <div className="divider" />

        <p className="footer-text">
          <Link to="/">메인으로 돌아가기</Link>
        </p>
      </form>
    </main>
  )
}

export default SignupPage
