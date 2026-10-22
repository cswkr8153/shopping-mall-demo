import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import CartIcon from '../components/CartIcon'
import { isLoggedIn, useCart } from '../context/CartContext'
import api from '../api/client'
import './MainPage.css'

const FILTERS = ['전체', '완성품', '조립제품', '기타']

const SORTS = {
  recommend: { label: '추천순', fn: () => 0 }, // 서버가 준 순서(최신 등록순) 유지
  priceAsc: { label: '낮은 가격순', fn: (a, b) => a.price - b.price },
  priceDesc: { label: '높은 가격순', fn: (a, b) => b.price - a.price },
  name: { label: '이름순', fn: (a, b) => a.name.localeCompare(b.name, 'ko') },
}

const PAGE_SIZE = 50 // 서버가 한 번에 줄 수 있는 최대 개수

const won = (n) => `₩${n.toLocaleString('ko-KR')}`

// 정가 대비 할인율(%). 정가가 없거나 판매가 이상이면 0
const discountRate = (p) => (p.listPrice != null && p.listPrice > p.price ? Math.round((1 - p.price / p.listPrice) * 100) : 0)

// 서버는 페이지 단위로 응답하므로 모든 페이지를 받아서 합침
async function fetchAllProducts() {
  const first = await api.get('/products', { params: { page: 1, limit: PAGE_SIZE } })
  const { products, totalPages } = first.data
  if (totalPages <= 1) return products

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => api.get('/products', { params: { page: i + 2, limit: PAGE_SIZE } })),
  )
  return products.concat(...rest.map((res) => res.data.products))
}

function MainPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('전체')
  const [sort, setSort] = useState('recommend')
  const { addToCart } = useCart()

  useEffect(() => {
    let cancelled = false
    fetchAllProducts()
      .then((list) => !cancelled && setProducts(list))
      .catch(() => !cancelled && setError('상품을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(() => {
    const list = products.filter((p) => filter === '전체' || p.category === filter)
    return [...list].sort(SORTS[sort].fn)
  }, [products, filter, sort])

  const handleAddToCart = async (productId) => {
    if (!isLoggedIn()) return navigate('/login')
    try {
      await addToCart(productId)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="shop">
      <Navbar filter={filter} onFilterChange={setFilter} />

      <main className="shop-main">
        <div className="shop-inner">
          <div className="shop-title-row">
            <div>
              <h1 className="shop-title">라인업</h1>
              <p className="shop-count">{visible.length}개의 상품</p>
            </div>
            <label className="shop-sort">
              정렬
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(SORTS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="shop-filters">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`shop-chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="shop-grid">
            {loading && <p className="shop-empty">상품을 불러오는 중...</p>}
            {error && <p className="shop-empty">{error}</p>}
            {!loading && !error && visible.length === 0 && <p className="shop-empty">해당하는 상품이 없습니다.</p>}

            {visible.map((p) => (
              <article
                key={p._id}
                className="shop-card"
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/products/${p._id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/products/${p._id}`)}
              >
                <div className="shop-thumb">
                  <img src={p.image} alt={p.name} loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                  <span className="shop-badge">{p.category}</span>
                </div>

                <div className="shop-info">
                  <p className="shop-series">{p.sku}</p>
                  <h3 className="shop-name">{p.name}</h3>
                  <p className="shop-price">
                    {discountRate(p) > 0 && <span className="shop-discount">{discountRate(p)}%</span>}
                    {won(p.price)}
                    {discountRate(p) > 0 && <span className="shop-price-list">{won(p.listPrice)}</span>}
                  </p>
                  <button
                    type="button"
                    className="shop-add"
                    onClick={(e) => {
                      e.stopPropagation() // 카드 클릭(상세 이동)과 구분
                      handleAddToCart(p._id)
                    }}
                    aria-label={`${p.name} 장바구니에 담기`}
                  >
                    <CartIcon size={20} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default MainPage
