import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import { isLoggedIn, useCart } from '../context/CartContext'
import { CATEGORIES } from '../constants/categories'
import { discountRate, formatPrice } from '../utils/product'
import api from '../api/client'
import './MainPage.css'
import './Home.css'

const PAGE_SIZE = 50 // 서버가 한 번에 줄 수 있는 최대 개수
const LIST_STEP = 15 // 목록에서 한 번에 보여주는 상품 수 ("더보기"로 늘어남)

const SORTS = {
  recommend: { label: '추천순', fn: null }, // 보기 방식에 맞는 기본 순서
  priceAsc: { label: '낮은 가격순', fn: (a, b) => a.price - b.price },
  priceDesc: { label: '높은 가격순', fn: (a, b) => b.price - a.price },
  discount: { label: '할인율순', fn: (a, b) => discountRate(b) - discountRate(a) },
  name: { label: '이름순', fn: (a, b) => a.name.localeCompare(b.name, 'ko') },
}

const QUICK = [
  { code: '01', label: '전체상품', en: 'ALL UNITS', to: '/?view=all' },
  { code: '02', label: '완성품', en: 'READY BUILT', to: `/?category=${encodeURIComponent('완성품')}` },
  { code: '03', label: '조립제품', en: 'MODEL KITS', to: `/?category=${encodeURIComponent('조립제품')}` },
  { code: '04', label: '기타', en: 'ACCESSORY', to: `/?category=${encodeURIComponent('기타')}` },
  { code: '05', label: '특가', en: 'HOT DEAL', to: '/?view=sale' },
  { code: '06', label: '신상품', en: 'NEW ARRIVAL', to: '/?view=new' },
]

// 상단 흐르는 안내 문구 (사실인 내용만)
const TICKER = ['FREE SHIPPING OVER ₩100,000', '10만원 이상 무료배송', 'MG 1/100 COLLECTION', '상품 준비 전까지 주문 취소 가능', 'GUNPLA STORE · FIGURE BOX']

// 서버는 페이지 단위로 응답하므로 모든 페이지를 받아서 합침 (서버가 최신 등록순으로 줌)
async function fetchAllProducts() {
  const first = await api.get('/products', { params: { page: 1, limit: PAGE_SIZE } })
  const { products, totalPages } = first.data
  if (totalPages <= 1) return products

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => api.get('/products', { params: { page: i + 2, limit: PAGE_SIZE } })),
  )
  return products.concat(...rest.map((res) => res.data.products))
}

// 메인 배너: 실제 상품 데이터로 만듦 (최대 할인율, 신상품, 완성품)
function buildSlides(products, joinOffer) {
  const slides = []
  // 비회원에게만 첫 번째 배너로 가입 혜택 안내 (가입하면 배송비 무료 쿠폰 1장이 자동 지급됨)
  if (joinOffer) {
    slides.push({
      id: 'join',
      tone: 'blue',
      eyebrow: 'WELCOME GIFT',
      title: '회원가입하면\n첫 주문 배송비 무료',
      sub: '가입 즉시 배송비 무료 쿠폰 1장을 드려요 (1회 사용)',
      to: '/signup',
      cta: '지금 가입하기',
      product: null,
      gift: true,
    })
  }
  const onSale = products.filter((p) => discountRate(p) > 0).sort((a, b) => discountRate(b) - discountRate(a))
  if (onSale[0]) {
    slides.push({
      id: 'sale',
      tone: 'blue',
      eyebrow: 'SPECIAL OFFER',
      title: `건담 모델 특가\n최대 ${discountRate(onSale[0])}% 할인`,
      sub: `${onSale.length}개 상품을 정가보다 저렴하게 만나보세요`,
      to: '/?view=sale',
      cta: '특가 보러가기',
      product: onSale[0],
    })
  }
  if (products[0]) {
    slides.push({
      id: 'new',
      tone: 'violet',
      eyebrow: 'NEW ARRIVAL',
      title: '새로 도착한\n건담 모델',
      sub: products[0].name,
      to: '/?view=new',
      cta: '신상품 보기',
      product: products[0],
    })
  }
  const built = products.find((p) => p.category === '완성품')
  if (built) {
    slides.push({
      id: 'built',
      tone: 'red',
      eyebrow: 'READY TO DISPLAY',
      title: '조립 없이 바로 전시\n완성품 컬렉션',
      sub: '시간이 없어도, 선물용으로도',
      to: `/?category=${encodeURIComponent('완성품')}`,
      cta: '완성품 보기',
      product: built,
    })
  }
  if (slides.length === 0) {
    slides.push({ id: 'welcome', tone: 'blue', eyebrow: 'WELCOME', title: '피규어박스에\n오신 것을 환영합니다', sub: '건담 프라모델과 완성품을 한곳에서', to: '/?view=all', cta: '상품 보러가기', product: null })
  }
  return slides
}

function Hero({ products }) {
  const joinOffer = !isLoggedIn()
  const slides = useMemo(() => buildSlides(products, joinOffer), [products, joinOffer])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const current = Math.min(index, slides.length - 1)

  // 5.5초마다 다음 배너로 (마우스를 올리면 멈춤)
  useEffect(() => {
    if (paused || slides.length < 2) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5500)
    return () => clearInterval(timer)
  }, [paused, slides.length])

  const go = (i) => setIndex((i + slides.length) % slides.length)

  return (
    <section className="hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="프로모션">
      <div className="hero-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {slides.map((s) => {
          const rate = s.product ? discountRate(s.product) : 0
          return (
            <div key={s.id} className={`hero-slide ${s.tone}`}>
              <div className="hero-text">
                <span className="hero-eyebrow">{s.eyebrow}</span>
                <h2>{s.title}</h2>
                <p>{s.sub}</p>
                <Link to={s.to} className="hero-cta">
                  {s.cta} <span aria-hidden="true">▶</span>
                </Link>
              </div>

              {s.gift && (
                <div className="hero-art">
                  <div className="hero-ring" aria-hidden="true" />
                  <div className="hero-gift">
                    <span>FREE</span>
                    <b>SHIPPING</b>
                    <i>COUPON × 1</i>
                  </div>
                </div>
              )}

              {s.product && (
                <div className="hero-art">
                  <div className="hero-ring" aria-hidden="true" />
                  <div className="hero-frame">
                    <img src={s.product.image} alt="" />
                    <span className="hero-scan" aria-hidden="true" />
                    <i className="c tl" />
                    <i className="c tr" />
                    <i className="c bl" />
                    <i className="c br" />
                  </div>
                  <span className="hero-chip">UNIT {s.product.sku}</span>
                  {rate > 0 && <span className="hero-rate">-{rate}%</span>}
                  <span className="hero-price">{formatPrice(s.product.price)}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {slides.length > 1 && (
        <>
          <button type="button" className="hero-arrow prev" onClick={() => go(current - 1)} aria-label="이전 배너">
            ‹
          </button>
          <button type="button" className="hero-arrow next" onClick={() => go(current + 1)} aria-label="다음 배너">
            ›
          </button>
          <div className="hero-dots">
            {slides.map((s, i) => (
              <button key={s.id} type="button" className={i === current ? 'on' : ''} onClick={() => go(i)} aria-label={`${i + 1}번 배너`} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

// 배너 아래 상황판: 실제 상품 데이터에서 계산한 숫자
function Stats({ products }) {
  const maxRate = products.reduce((m, p) => Math.max(m, discountRate(p)), 0)
  const cells = [
    { label: 'TOTAL UNITS', value: products.length, unit: '개' },
    { label: 'MAX DISCOUNT', value: maxRate, unit: '%' },
    { label: 'FREE SHIPPING', value: '100,000', unit: '원~' },
    { label: 'CATEGORIES', value: CATEGORIES.length, unit: '종' },
  ]
  return (
    <div className="stats" aria-label="스토어 현황">
      {cells.map((c) => (
        <div key={c.label} className="stat">
          <span className="stat-label">{c.label}</span>
          <strong>
            {c.value}
            <small>{c.unit}</small>
          </strong>
        </div>
      ))}
    </div>
  )
}

function Ticker() {
  const items = [...TICKER, ...TICKER] // 끊기지 않게 두 번 이어 붙임 (CSS가 절반만큼 이동)
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {items.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  )
}

function Section({ code, title, sub, moreTo, items, onAdd }) {
  if (items.length === 0) return null
  return (
    <section className="sec">
      <div className="sec-head">
        <div>
          <span className="sec-code">{code}</span>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {moreTo && (
          <Link to={moreTo} className="sec-more">
            더보기 ›
          </Link>
        )}
      </div>
      <div className="pgrid">
        {items.map((p) => (
          <ProductCard key={p._id} product={p} onAdd={onAdd} />
        ))}
      </div>
    </section>
  )
}

function Skeleton({ count = 5 }) {
  return (
    <div className="pgrid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="sk">
          <div className="sk-img" />
          <div className="sk-line" />
          <div className="sk-line short" />
        </div>
      ))}
    </div>
  )
}

function HomeView({ products, loading, error, onAdd }) {
  const sale = useMemo(() => products.filter((p) => discountRate(p) > 0).sort((a, b) => discountRate(b) - discountRate(a)).slice(0, 5), [products])
  const fresh = useMemo(() => products.slice(0, 5), [products])
  const picks = useMemo(() => products.slice(5, 15), [products])

  return (
    <>
      <div className="shop-inner">
        <Hero products={products} />
        {!loading && products.length > 0 && <Stats products={products} />}
      </div>

      <Ticker />

      <div className="shop-inner">
        <nav className="quick" aria-label="바로가기">
          {QUICK.map((q) => (
            <Link key={q.label} to={q.to}>
              <span className="quick-code">{q.code}</span>
              <span className="quick-label">{q.label}</span>
              <span className="quick-en">{q.en}</span>
            </Link>
          ))}
        </nav>

        {loading && <Skeleton />}
        {error && <p className="empty">{error}</p>}

        {!loading && !error && (
          <>
            <Section code="SECTION 01 / HOT DEAL" title="오늘의 특가" sub="할인율이 높은 순서로 모았어요" moreTo="/?view=sale" items={sale} onAdd={onAdd} />
            <Section code="SECTION 02 / NEW ARRIVAL" title="신상품" sub="새로 등록된 상품" moreTo="/?view=new" items={fresh} onAdd={onAdd} />
            <Section code="SECTION 03 / RECOMMEND" title="추천 상품" sub="지금 많이 찾는 건담 모델" moreTo="/?view=all" items={picks} onAdd={onAdd} />
            {products.length === 0 && <p className="empty">등록된 상품이 없습니다.</p>}
            {products.length > 0 && (
              <div className="more-wrap">
                <Link to="/?view=all" className="more-btn">
                  전체 상품 {products.length}개 보기
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

// 검색/카테고리/특가/신상품/전체 보기: 필터와 정렬, "더보기"가 있는 목록
function ListView({ products, loading, error, onAdd, q, category, view }) {
  const [, setParams] = useSearchParams()
  const [sort, setSort] = useState('recommend')
  const [shown, setShown] = useState(LIST_STEP)

  const title = q ? `'${q}' 검색결과` : category || (view === 'sale' ? '특가' : view === 'new' ? '신상품' : '전체 상품')

  const items = useMemo(() => {
    let list = products
    if (q) {
      const k = q.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(k) || p.sku.toLowerCase().includes(k) || (p.description || '').toLowerCase().includes(k))
    }
    if (category) list = list.filter((p) => p.category === category)
    if (view === 'sale') list = list.filter((p) => discountRate(p) > 0)

    const sorter = SORTS[sort].fn || (view === 'sale' ? SORTS.discount.fn : null) // 추천순: 특가는 할인율순, 그 외는 서버 순서(최신 등록순)
    return sorter ? [...list].sort(sorter) : list
  }, [products, q, category, view, sort])

  // 카테고리 칩: 검색어는 유지하면서 카테고리만 바꿈
  const pickCategory = (c) => {
    const next = {}
    if (q) next.q = q
    if (c) next.category = c
    else if (!q) next.view = 'all'
    setParams(next)
    setShown(LIST_STEP)
  }

  return (
    <div className="shop-inner lv">
      <p className="crumb">
        <Link to="/">홈</Link> ›<span>{title}</span>
      </p>

      <div className="lv-head">
        <div>
          <span className="sec-code">UNIT LIST</span>
          <h1>{title}</h1>
          <p className="lv-count">{loading ? '불러오는 중...' : `${items.length}개의 상품`}</p>
        </div>
        <label className="lv-sort">
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

      {(category || view === 'all' || q) && (
        <div className="lv-chips">
          {['', ...CATEGORIES].map((c) => (
            <button key={c || 'all'} type="button" className={`shop-chip ${category === c ? 'active' : ''}`} onClick={() => pickCategory(c)}>
              {c || '전체'}
            </button>
          ))}
        </div>
      )}

      {loading && <Skeleton count={10} />}
      {error && <p className="empty">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="empty">
          <p>{q ? `'${q}'에 대한 검색 결과가 없습니다.` : '해당하는 상품이 없습니다.'}</p>
          <p className="empty-sub">{q ? '검색어의 철자를 확인하거나 다른 검색어로 찾아보세요.' : '다른 카테고리를 선택해 보세요.'}</p>
          <Link to="/?view=all" className="more-btn">
            전체 상품 보기
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="pgrid">
            {items.slice(0, shown).map((p) => (
              <ProductCard key={p._id} product={p} onAdd={onAdd} />
            ))}
          </div>
          {items.length > shown && (
            <div className="more-wrap">
              <button type="button" className="more-btn" onClick={() => setShown((n) => n + LIST_STEP)}>
                상품 더보기 ({items.length - shown}개 남음)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MainPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { addToCart } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const q = (params.get('q') || '').trim()
  const category = params.get('category') || ''
  const view = params.get('view') || ''
  const isList = Boolean(q || category || view)

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

  const handleAddToCart = async (productId) => {
    if (!isLoggedIn()) return navigate('/login')
    try {
      await addToCart(productId)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="shop home">
      <Navbar />
      <main className="home-main">
        {isList ? (
          // 검색/필터 조건이 바뀌면 목록 상태(정렬, 더보기)를 새로 시작
          <ListView key={`${q}|${category}|${view}`} products={products} loading={loading} error={error} onAdd={handleAddToCart} q={q} category={category} view={view} />
        ) : (
          <HomeView products={products} loading={loading} error={error} onAdd={handleAddToCart} />
        )}
      </main>
      <Footer />
    </div>
  )
}

export default MainPage
