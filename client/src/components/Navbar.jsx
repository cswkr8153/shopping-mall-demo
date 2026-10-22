import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import CartIcon from './CartIcon'
import { useCart } from '../context/CartContext'
import '../pages/MainPage.css'

// filter / onFilterChange: 메인 페이지에서만 전달. 없으면 메뉴 클릭 시 메인으로 이동
function Navbar({ filter, onFilterChange }) {
  const navigate = useNavigate()
  const { cart, clearCart } = useCart()
  const [user, setUser] = useState(null)

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
  }

  const selectFilter = (value) => {
    if (onFilterChange) onFilterChange(value)
    else navigate('/')
  }

  return (
    <>
      <div className="shop-notice">10만원 이상 구매 시 무료배송 · 예약 상품은 발매일 순차 발송</div>

      <header className="shop-header">
        <div className="shop-inner">
          <Link to="/" className="shop-logo">
            <span className="shop-logo-mark">F</span>
            피규어박스
          </Link>

          <nav className="shop-nav">
            <button type="button" className={filter === '전체' ? 'active' : ''} onClick={() => selectFilter('전체')}>
              전체 상품
            </button>
            <button type="button">이용 안내</button>
          </nav>

          <div className="shop-actions">
            {user ? (
              <>
                <span className="shop-user">{user.name}님 환영합니다</span>
                <Link to="/orders" className="shop-btn">
                  내 주문
                </Link>
                {user.user_type === 'admin' && (
                  <Link to="/admin" className="shop-btn">
                    어드민
                  </Link>
                )}
                <button type="button" className="shop-btn" onClick={handleLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <Link to="/login" className="shop-btn">
                로그인
              </Link>
            )}
            <Link to="/cart" className="shop-btn">
              <CartIcon />
              장바구니
              {cart.totalQuantity > 0 && <span className="shop-cart-count">{cart.totalQuantity}</span>}
            </Link>
          </div>
        </div>
      </header>
    </>
  )
}

export default Navbar
