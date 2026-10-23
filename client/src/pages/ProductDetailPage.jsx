import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/client'
import { isLoggedIn, useCart } from '../context/CartContext'
import './MainPage.css'
import './ProductDetailPage.css'

const MAX_QUANTITY = 99

const won = (n) => `₩${n.toLocaleString('ko-KR')}`

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | notfound | error
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)
  const [notice, setNotice] = useState(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    api
      .get(`/products/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        setProduct(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus([400, 404].includes(err.response?.status) ? 'notfound' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const changeQuantity = (next) => setQuantity(Math.min(Math.max(next, 1), MAX_QUANTITY))

  const handleAdd = async () => {
    if (!isLoggedIn()) return navigate('/login')
    setNotice(null)
    try {
      await addToCart(id, quantity)
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch (err) {
      setNotice(err.message)
    }
  }

  // 이 상품만 바로 구매: 주문 페이지로 상품 id와 수량을 넘김 (장바구니는 건드리지 않음)
  const handleBuy = () => {
    if (!isLoggedIn()) return navigate('/login')
    navigate('/checkout', { state: { items: [{ productId: id, quantity }] } })
  }

  const discount =
    product?.listPrice != null && product.listPrice > product.price
      ? Math.round((1 - product.price / product.listPrice) * 100)
      : 0

  return (
    <div className="shop">
      <Navbar />

      <main className="shop-main">
        <div className="shop-inner">
          <Link to="/" className="pd-back">
            ← 목록으로
          </Link>

          {status === 'loading' && <p className="pd-state">상품을 불러오는 중...</p>}
          {status === 'notfound' && <p className="pd-state">존재하지 않거나 삭제된 상품입니다.</p>}
          {status === 'error' && <p className="pd-state">상품을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>}

          {status === 'ready' && (
            <section className="pd">
              <div className="pd-image">
                <img src={product.image} alt={product.name} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
              </div>

              <div className="pd-info">
                <span className="pd-category">{product.category}</span>
                <h1 className="pd-name">{product.name}</h1>
                <p className="pd-sku">SKU {product.sku}</p>

                <div className="pd-price-row">
                  {discount > 0 && <span className="pd-discount">{discount}%</span>}
                  <span className="pd-price">{won(product.price)}</span>
                  {discount > 0 && <span className="pd-list-price">{won(product.listPrice)}</span>}
                </div>

                <div className="pd-desc">
                  <h2>상품 설명</h2>
                  <p>{product.description || '등록된 상품 설명이 없습니다.'}</p>
                </div>

                <div className="pd-quantity-row">
                  <span className="pd-quantity-label">수량</span>
                  <div className="pd-quantity">
                    <button type="button" onClick={() => changeQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="수량 줄이기">
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={MAX_QUANTITY}
                      value={quantity}
                      onChange={(e) => changeQuantity(parseInt(e.target.value, 10) || 1)}
                      aria-label="수량"
                    />
                    <button type="button" onClick={() => changeQuantity(quantity + 1)} disabled={quantity >= MAX_QUANTITY} aria-label="수량 늘리기">
                      +
                    </button>
                  </div>
                </div>

                <div className="pd-total">
                  <span>총 상품 금액</span>
                  <strong>{won(product.price * quantity)}</strong>
                </div>

                {notice && <p className="message error pd-notice">{notice}</p>}

                <div className="pd-buttons">
                  <button type="button" className="pd-add" onClick={handleAdd}>
                    {added ? '담았습니다!' : '장바구니 담기'}
                  </button>
                  <button type="button" className="pd-buy" onClick={handleBuy}>
                    구매하기
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ProductDetailPage
