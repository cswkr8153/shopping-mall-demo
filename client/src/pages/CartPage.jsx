import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { isLoggedIn, useCart } from '../context/CartContext'
import './MainPage.css'
import './CartPage.css'

const MAX_QUANTITY = 99
const FREE_SHIPPING_FROM = 100000

const won = (n) => `₩${n.toLocaleString('ko-KR')}`

function CartPage() {
  const navigate = useNavigate()
  const { cart, loadCart, updateItem, removeItem } = useCart()
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true })
      return
    }
    loadCart() // 상품 가격 변경 등을 반영하기 위해 열 때마다 새로 불러옴
  }, [navigate, loadCart])

  const run = async (action) => {
    setMessage(null)
    try {
      await action()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const handleBuy = () => navigate('/checkout')

  const shippingFree = cart.totalPrice >= FREE_SHIPPING_FROM

  return (
    <div className="shop">
      <Navbar />

      <main className="shop-main">
        <div className="shop-inner">
          <h1 className="shop-title">장바구니</h1>
          <p className="shop-count">{cart.totalQuantity}개의 상품</p>

          {message && <p className="message error cart-message">{message}</p>}

          {cart.items.length === 0 ? (
            <div className="cart-empty">
              <p>장바구니가 비어 있습니다.</p>
              <Link to="/" className="shop-btn">
                쇼핑하러 가기
              </Link>
            </div>
          ) : (
            <div className="cart-layout">
              <ul className="cart-list">
                {cart.items.map(({ product, quantity }) => (
                  <li key={product._id} className="cart-item">
                    <Link to={`/products/${product._id}`} className="cart-thumb">
                      <img src={product.image} alt={product.name} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                    </Link>

                    <div className="cart-info">
                      <Link to={`/products/${product._id}`} className="cart-name">
                        {product.name}
                      </Link>
                      <p className="cart-sku">{product.sku}</p>
                      <p className="cart-unit">{won(product.price)}</p>

                      <div className="pd-quantity cart-quantity">
                        <button type="button" disabled={quantity <= 1} onClick={() => run(() => updateItem(product._id, quantity - 1))} aria-label="수량 줄이기">
                          −
                        </button>
                        <input type="number" value={quantity} readOnly aria-label="수량" />
                        <button type="button" disabled={quantity >= MAX_QUANTITY} onClick={() => run(() => updateItem(product._id, quantity + 1))} aria-label="수량 늘리기">
                          +
                        </button>
                      </div>
                    </div>

                    <div className="cart-side">
                      <strong className="cart-subtotal">{won(product.price * quantity)}</strong>
                      <button type="button" className="shop-btn cart-remove" onClick={() => run(() => removeItem(product._id))}>
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <aside className="cart-summary">
                <h2>주문 예상 금액</h2>
                <dl>
                  <div>
                    <dt>상품 금액</dt>
                    <dd>{won(cart.totalPrice)}</dd>
                  </div>
                  <div>
                    <dt>배송비</dt>
                    <dd>{shippingFree ? '무료' : '배송비 별도'}</dd>
                  </div>
                </dl>
                {!shippingFree && <p className="cart-hint">{won(FREE_SHIPPING_FROM - cart.totalPrice)} 더 담으면 무료배송</p>}
                <div className="cart-total">
                  <span>총 {cart.totalQuantity}개</span>
                  <strong>{won(cart.totalPrice)}</strong>
                </div>
                <button type="button" className="pd-buy cart-buy" onClick={handleBuy}>
                  구매하기
                </button>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default CartPage
