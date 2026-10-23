import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import CartIcon from './CartIcon'
import LogoMark from './LogoMark'
import { useCart } from '../context/CartContext'
import { CATEGORIES } from '../constants/categories'
import '../pages/MainPage.css'
import './Navbar.css'

// 카테고리 메뉴: to는 메인 페이지(/)의 주소 파라미터와 일치해야 활성 표시가 됨
const NAV = [
  { label: '전체 상품', params: { view: 'all' } },
  ...CATEGORIES.map((c) => ({ label: c, params: { category: c } })),
  { label: '특가', params: { view: 'sale' }, hot: true },
  { label: '신상품', params: { view: 'new' } },
]

const toUrl = (params) => `/?${new URLSearchParams(params).toString()}`

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
)

function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { cart, clearCart } = useCart()
  const [user, setUser] = useState(null)

  const q = params.get('q') || ''
  const hasToken = Boolean(localStorage.getItem('token')) // 로그인 확인이 끝나기 전에도 로그인한 사람에게 가입 안내가 번쩍이지 않게

  // 저장된 토큰이 있으면 로그인 상태 복원
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('token'))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    clearCart()
    navigate('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const keyword = String(new FormData(e.currentTarget).get('q') || '').trim()
    navigate(keyword ? `/?q=${encodeURIComponent(keyword)}` : '/')
  }

  // 메인 페이지에서 현재 주소와 같은 메뉴를 활성 표시
  const isActive = (item) => pathname === '/' && Object.entries(item.params).every(([k, v]) => params.get(k) === v)

  return (
    <>
      <div className="nb-top">
        <div className="shop-inner">
          {!user && !hasToken ? (
            // 비회원에게만: 회원가입 혜택 안내 (가입하면 배송비 무료 쿠폰 1장이 자동 지급됨)
            <Link to="/signup" className="nb-promo nb-promo-join">
              회원가입하면 <b>첫 주문 배송비 무료</b> · 쿠폰 1장 지급
            </Link>
          ) : (
            <span className="nb-promo">10만원 이상 구매 시 무료배송</span>
          )}
          <div className="nb-top-links">
            {user ? (
              <>
                <span className="nb-welcome">{user.name}님 환영합니다</span>
                {user.user_type === 'admin' && <Link to="/admin">어드민</Link>}
                <button type="button" onClick={handleLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to="/signup">회원가입</Link>
                <Link to="/login" className="nb-login">
                  로그인
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="nb-sticky">
        <div className="nb-main">
          <div className="shop-inner nb-main-inner">
            <Link to="/" className="nb-logo" aria-label="피규어박스 홈">
              <LogoMark />
              <span className="nb-logo-text">
                피규어박스
                <small>GUNPLA STORE</small>
              </span>
            </Link>

            {/* q가 바뀌면(key) 입력칸이 새 검색어로 초기화됨 */}
            <form className="nb-search" onSubmit={handleSearch} role="search">
              <input key={q} name="q" defaultValue={q} placeholder="찾고 싶은 건담 모델을 검색해보세요" autoComplete="off" aria-label="상품 검색" />
              <button type="submit" aria-label="검색">
                <SearchIcon />
              </button>
            </form>

            <div className="nb-icons">
              <Link to={user ? '/orders' : '/login'} className="nb-icon">
                <UserIcon />
                <span>{user ? '내 주문' : '로그인'}</span>
              </Link>
              <Link to="/cart" className="nb-icon">
                <CartIcon size={22} />
                <span>장바구니</span>
                {cart.totalQuantity > 0 && <b className="nb-badge">{cart.totalQuantity}</b>}
              </Link>
            </div>
          </div>
        </div>

        <nav className="nb-cats" aria-label="카테고리">
          <div className="shop-inner">
            {NAV.map((item) => (
              <Link key={item.label} to={toUrl(item.params)} className={`nb-cat ${isActive(item) ? 'active' : ''} ${item.hot ? 'hot' : ''}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}

export default Navbar
